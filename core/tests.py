import io
from django.test import TestCase, Client
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

from core.models import (
    Usuario, Docente, Estudiante, Espacio, MiembroEspacio,
    Tarea, Entrega, Calificacion, Colegio, Curso
)
from core.validators import (
    validate_grade, validate_file_size, validate_file_extension, sanitize_filename
)
from core.pdf_service import generate_student_boletin_pdf, generate_course_gradebook_pdf


class GradeAndFileValidatorTestCase(TestCase):
    """Pruebas de validadores numéricos y de archivos (FASE 2)."""

    def test_grade_valid_range(self):
        # 0 y 100 deben ser válidos
        try:
            validate_grade(0)
            validate_grade(50.5)
            validate_grade(100)
        except ValidationError:
            self.fail("validate_grade lanzó ValidationError en un rango válido [0, 100].")

    def test_grade_invalid_range(self):
        with self.assertRaises(ValidationError):
            validate_grade(-1)
        with self.assertRaises(ValidationError):
            validate_grade(101)
        with self.assertRaises(ValidationError):
            validate_grade("nota_invalida")

    def test_sanitize_filename(self):
        self.assertEqual(sanitize_filename("../../etc/passwd"), "passwd")
        self.assertEqual(sanitize_filename("mi archivo (final).pdf"), "mi_archivo__final_.pdf")


class TaskEnrollmentAndPermissionsTestCase(TestCase):
    """Pruebas de permisos de inscripción y entrega de tareas (FASE 2)."""

    def setUp(self):
        self.client = Client()
        # Crear Docente
        self.user_doc = Usuario.objects.create_user(
            username='docente_test', email='docente@test.edu', password='password123',
            rol='DOCENTE', first_name='Docente', last_name='Prueba'
        )
        self.docente = Docente.objects.create(usuario=self.user_doc, especialidad='Sistemas')

        # Crear Estudiante 1 (inscrito)
        self.user_est1 = Usuario.objects.create_user(
            username='estudiante1', email='est1@test.edu', password='password123',
            rol='ESTUDIANTE', first_name='Estudiante', last_name='Uno'
        )
        self.estudiante1 = Estudiante.objects.create(usuario=self.user_est1)

        # Crear Estudiante 2 (no inscrito)
        self.user_est2 = Usuario.objects.create_user(
            username='estudiante2', email='est2@test.edu', password='password123',
            rol='ESTUDIANTE', first_name='Estudiante', last_name='Dos'
        )
        self.estudiante2 = Estudiante.objects.create(usuario=self.user_est2)

        # Crear Espacio y Tarea
        self.espacio = Espacio.objects.create(
            nombre='Programación I', docente=self.docente, codigo='PROG101'
        )
        # Inscribir estudiante 1 al espacio
        MiembroEspacio.objects.create(espacio=self.espacio, estudiante=self.estudiante1)

        self.tarea = Tarea.objects.create(
            espacio=self.espacio,
            docente=self.docente,
            titulo='Laboratorio 1',
            descripcion='Resolver ejercicios',
            fecha_limite=timezone.now() + timedelta(days=5),
            puntaje_maximo=100
        )

    def test_unauthorized_student_cannot_submit_task(self):
        """Estudiante no inscrito debe recibir 403 al intentar presentar tarea."""
        self.client.force_login(self.user_est2)
        response = self.client.post(f'/api/tareas/{self.tarea.id}/presentar/', {
            'observaciones': 'Intento de entrega no autorizada'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 403)
        self.assertIn('No estás inscrito', response.json().get('error', ''))

    def test_authorized_student_can_submit_task(self):
        """Estudiante inscrito debe poder presentar la tarea con éxito."""
        self.client.force_login(self.user_est1)
        response = self.client.post(f'/api/tareas/{self.tarea.id}/presentar/', {
            'observaciones': 'Mi entrega oficial',
            'archivo_nombre': 'lab1.pdf'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Entrega.objects.filter(tarea=self.tarea, estudiante=self.estudiante1).exists())


class GradingAndAtomicTransactionsTestCase(TestCase):
    """Pruebas de calificación y transacciones atómicas (FASE 2)."""

    def setUp(self):
        self.client = Client()
        self.user_doc = Usuario.objects.create_user(
            username='docente_calif', email='doc_calif@test.edu', password='password123',
            rol='DOCENTE'
        )
        self.docente = Docente.objects.create(usuario=self.user_doc)

        self.user_est = Usuario.objects.create_user(
            username='est_calif', email='est_calif@test.edu', password='password123',
            rol='ESTUDIANTE'
        )
        self.estudiante = Estudiante.objects.create(usuario=self.user_est)

        self.espacio = Espacio.objects.create(nombre='Algoritmos', docente=self.docente, codigo='ALGO101')
        MiembroEspacio.objects.create(espacio=self.espacio, estudiante=self.estudiante)

        self.tarea = Tarea.objects.create(
            espacio=self.espacio, docente=self.docente, titulo='T1',
            fecha_limite=timezone.now() + timedelta(days=2), puntaje_maximo=100
        )
        self.entrega = Entrega.objects.create(
            tarea=self.tarea, estudiante=self.estudiante, estado='ENTREGADO'
        )

    def test_valid_grade_grading(self):
        self.client.force_login(self.user_doc)
        response = self.client.post(f'/api/entregas/{self.entrega.id}/calificar/', {
            'nota': 95.5,
            'retroalimentacion': 'Excelente trabajo'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        calif = Calificacion.objects.get(entrega=self.entrega)
        self.assertEqual(calif.nota, 95.5)

    def test_invalid_grade_rejected(self):
        self.client.force_login(self.user_doc)
        # Nota mayor a 100
        response = self.client.post(f'/api/entregas/{self.entrega.id}/calificar/', {
            'nota': 105
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)

        # Nota negativa
        response = self.client.post(f'/api/entregas/{self.entrega.id}/calificar/', {
            'nota': -5
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)


class BoletinPDFGenerationTestCase(TestCase):
    """Pruebas de generación y descarga de boletines en PDF (FASE 4)."""

    def setUp(self):
        self.client = Client()
        self.user_doc = Usuario.objects.create_user(
            username='prof_pdf', email='prof_pdf@test.edu', password='password123',
            rol='DOCENTE'
        )
        self.docente = Docente.objects.create(usuario=self.user_doc)

        self.user_est = Usuario.objects.create_user(
            username='alumno_pdf', email='alumno_pdf@test.edu', password='password123',
            rol='ESTUDIANTE', first_name='Juan', last_name='Pérez'
        )
        self.estudiante = Estudiante.objects.create(usuario=self.user_est)

        self.colegio = Colegio.objects.create(nombre='Colegio Nacional EduSmart')
        self.curso = Curso.objects.create(colegio=self.colegio, nombre='6to A Secundaria', grado='6to Secundaria', paralelo='A')

    def test_generate_student_boletin_pdf(self):
        pdf_buffer = generate_student_boletin_pdf(self.estudiante)
        content = pdf_buffer.getvalue()
        self.assertTrue(content.startswith(b'%PDF'))
        self.assertGreater(len(content), 1000)

    def test_generate_course_gradebook_pdf(self):
        pdf_buffer = generate_course_gradebook_pdf(self.curso)
        content = pdf_buffer.getvalue()
        self.assertTrue(content.startswith(b'%PDF'))
        self.assertGreater(len(content), 1000)

    def test_student_boletin_endpoint_security(self):
        # Otro estudiante intentando descargar el boletín de alumno_pdf
        user_hacker = Usuario.objects.create_user(
            username='hacker', email='hacker@test.edu', password='password123', rol='ESTUDIANTE'
        )
        Estudiante.objects.create(usuario=user_hacker)
        self.client.force_login(user_hacker)

        response = self.client.get(f'/api/v2/estudiantes/{self.estudiante.id}/boletin-pdf/')
        self.assertEqual(response.status_code, 403)

        # El estudiante legítimo descargando su propio boletín
        self.client.force_login(self.user_est)
        response_ok = self.client.get(f'/api/v2/estudiantes/{self.estudiante.id}/boletin-pdf/')
        self.assertEqual(response_ok.status_code, 200)
        self.assertEqual(response_ok['Content-Type'], 'application/pdf')


class PasswordResetTestCase(TestCase):
    """Pruebas del flujo seguro de recuperación de contraseñas (FASE 4)."""

    def setUp(self):
        self.client = Client()
        self.user = Usuario.objects.create_user(
            username='user_reset', email='user_reset@edusmart.edu', password='oldpassword123'
        )

    def test_password_reset_request_timing_protection(self):
        # Correo existente
        res1 = self.client.post('/api/auth/password-reset-request/', {'email': 'user_reset@edusmart.edu'}, content_type='application/json')
        self.assertEqual(res1.status_code, 200)

        # Correo inexistente (debe responder con mensaje neutral sin revelar existencia)
        res2 = self.client.post('/api/auth/password-reset-request/', {'email': 'noexiste@edusmart.edu'}, content_type='application/json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res1.json()['message'], res2.json()['message'])

    def test_password_reset_confirm_successful(self):
        token = default_token_generator.make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        res = self.client.post('/api/auth/password-reset-confirm/', {
            'uid': uid,
            'token': token,
            'new_password': 'newpassword456'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)

        # Verificar que la contraseña cambió
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpassword456'))


class SwaggerOpenAPITestCase(TestCase):
    """Pruebas de disponibilidad de la documentación Swagger / OpenAPI (FASE 6)."""

    def setUp(self):
        self.client = Client()

    def test_swagger_endpoints_accessible(self):
        res_schema = self.client.get('/api/schema/')
        self.assertEqual(res_schema.status_code, 200)

        res_docs = self.client.get('/api/docs/')
        self.assertEqual(res_docs.status_code, 200)
