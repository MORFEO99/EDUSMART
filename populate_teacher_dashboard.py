import os
import django
import random
import string
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edusmart_config.settings')
django.setup()

from core.models import (
    Usuario, Docente, Estudiante, DocenteColegio,
    Colegio, Curso, Materia, Espacio, MiembroEspacio,
    EstudianteCurso, Tarea, Entrega, Calificacion, Retroalimentacion
)

# ── Datos realistas de colegio ──────────────────────────────────────
COLEGIOS = [
    {
        'nombre': 'Unidad Educativa Simón Bolívar',
        'ciudad': 'Quito', 'pais': 'Ecuador',
        'color': '#1E3A8A'
    },
    {
        'nombre': 'Colegio Nacional Juan de Salinas',
        'ciudad': 'Sangolquí', 'pais': 'Ecuador',
        'color': '#065F46'
    },
]

MATERIAS_POR_NIVEL = {
    '10mo de Básica': [
        'Matemática', 'Ciencias Naturales', 'Lengua y Literatura', 'Estudios Sociales', 'Inglés'
    ],
    '1ro de Bachillerato': [
        'Matemática', 'Física', 'Química', 'Lengua y Literatura', 'Historia del Ecuador'
    ],
    '2do de Bachillerato': [
        'Matemática', 'Física', 'Química', 'Biología', 'Filosofía'
    ],
    '3ro de Bachillerato': [
        'Matemática', 'Física', 'Química', 'Lengua y Literatura', 'Emprendimiento y Gestión'
    ],
}

PARALELOS = ['A', 'B']

NOMBRES = [
    ('Carlos', 'Mendoza'), ('María', 'García'), ('Luis', 'Torres'), ('Ana', 'Rodríguez'),
    ('Pedro', 'Sánchez'), ('Sofía', 'López'), ('Diego', 'Martínez'), ('Valentina', 'Pérez'),
    ('Andrés', 'González'), ('Isabella', 'Herrera'), ('Sebastián', 'Díaz'), ('Camila', 'Vargas'),
    ('Miguel', 'Castro'), ('Lucía', 'Morales'), ('David', 'Jiménez'), ('Paula', 'Núñez'),
    ('Felipe', 'Romero'), ('Gabriela', 'Silva'), ('Juan', 'Pinto'), ('Daniela', 'Ramos'),
    ('Emilio', 'Guerrero'), ('Valeria', 'Cortés'), ('Marco', 'Reyes'), ('Paola', 'Vega'),
    ('Roberto', 'Mendez'), ('Elena', 'Cruz'), ('Francisco', 'Leal'), ('Natalia', 'Salazar'),
]

TAREAS_POR_MATERIA = {
    'Matemática': [
        ('Ejercicios de Álgebra - Unidad 3', 'Resolver los ejercicios del libro de texto págs. 45-52 sobre factorización y productos notables.'),
        ('Prueba de Trigonometría', 'Resolver los problemas de razones trigonométricas y ley de senos y cosenos.'),
    ],
    'Física': [
        ('Informe de Laboratorio - Caída Libre', 'Presentar el informe del experimento de caída libre con análisis de datos y conclusiones.'),
        ('Ejercicios de Cinemática', 'Resolver los problemas del capítulo 3 sobre movimiento uniformemente acelerado.'),
    ],
    'Química': [
        ('Tabla Periódica y Propiedades', 'Investigar y presentar las propiedades de los elementos del grupo A de la tabla periódica.'),
        ('Informe de Reacciones Químicas', 'Documentar los tipos de reacciones observadas en el laboratorio y escribir las ecuaciones balanceadas.'),
    ],
    'Lengua y Literatura': [
        ('Ensayo Argumentativo', 'Escribir un ensayo de 3 páginas sobre los valores en la literatura ecuatoriana contemporánea.'),
        ('Análisis de obra literaria', 'Presentar el análisis completo de la obra asignada con estructura, personajes y contexto histórico.'),
    ],
    'Ciencias Naturales': [
        ('Maqueta del Sistema Solar', 'Construir una maqueta a escala del sistema solar con materiales reciclables.'),
        ('Informe de Ecosistemas', 'Investigar los ecosistemas del Ecuador y presentar en 2 páginas.'),
    ],
    'Estudios Sociales': [
        ('Línea de Tiempo Histórica', 'Elaborar una línea de tiempo ilustrada de los hechos históricos del siglo XX en América Latina.'),
        ('Mapa de División Política', 'Identificar y nombrar todas las provincias del Ecuador en un mapa mudo.'),
    ],
    'Inglés': [
        ('Writing: My Daily Routine', 'Write a 1-page composition about your daily routine using present simple tense.'),
        ('Reading Comprehension Test', 'Answer the comprehension questions about the assigned reading text.'),
    ],
    'Historia del Ecuador': [
        ('Investigación Independencia del Ecuador', 'Investigar los eventos que llevaron a la independencia de Ecuador y presentar en exposición.'),
        ('Personajes Históricos Destacados', 'Elaborar fichas biográficas de 5 próceres de la independencia ecuatoriana.'),
    ],
    'Biología': [
        ('Informe de Microscopia', 'Presentar el informe de la práctica de observación de células vegetales y animales.'),
        ('Mapa Conceptual: Genética', 'Elaborar un mapa conceptual sobre los principios de la herencia genética de Mendel.'),
    ],
    'Filosofía': [
        ('Ensayo: Corrientes Filosóficas', 'Analizar las diferencias entre el empirismo y el racionalismo en un ensayo de 2 páginas.'),
        ('Exposición Ética y Moral', 'Preparar y exponer sobre la diferencia entre ética y moral con ejemplos contemporáneos.'),
    ],
    'Emprendimiento y Gestión': [
        ('Plan de Negocios', 'Elaborar un plan de negocios básico para una microempresa juvenil con análisis de mercado.'),
        ('Presentación de Proyecto Productivo', 'Presentar su proyecto productivo ante el tribunal con proyección financiera a 1 año.'),
    ],
}

def get_random_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def populate():
    print("Buscando al docente principal...")
    docente_user = Usuario.objects.filter(rol='DOCENTE').first()
    if not docente_user:
        print("No se encontró docente. Regístrate como docente en la aplicación primero.")
        return

    if not hasattr(docente_user, 'perfil_docente'):
        docente = Docente.objects.create(
            usuario=docente_user,
            especialidad='Ciencias Exactas',
            titulo_academico='Licenciado en Educación'
        )
    else:
        docente = docente_user.perfil_docente
    print(f"Docente: {docente_user.nombre_completo}")

    now = timezone.now()
    nombre_index = 0

    for col_data in COLEGIOS:
        # Crear/obtener colegio
        colegio, _ = Colegio.objects.get_or_create(
            nombre=col_data['nombre'],
            defaults={
                'ciudad': col_data['ciudad'],
                'pais': col_data['pais'],
                'color': col_data['color']
            }
        )
        # Asociar docente al colegio
        DocenteColegio.objects.get_or_create(
            docente=docente, colegio=colegio,
            defaults={'cargo': 'Docente Titular'}
        )
        print(f"\nColegio: {colegio.nombre}")

        for grado, materias in MATERIAS_POR_NIVEL.items():
            for paralelo in PARALELOS:
                # Crear/obtener curso
                curso, _ = Curso.objects.get_or_create(
                    colegio=colegio, grado=grado, paralelo=paralelo,
                    defaults={'nivel': 'Bachillerato General Unificado', 'anio_lectivo': '2026-2027'}
                )

                # Crear 12 estudiantes por curso
                estudiantes_curso = []
                for _ in range(12):
                    fn, ln = NOMBRES[nombre_index % len(NOMBRES)]
                    suffix = nombre_index
                    username = f"{fn.lower()}.{ln.lower()}{suffix}@edusmart.edu"
                    nombre_index += 1

                    user, created = Usuario.objects.get_or_create(
                        username=username,
                        defaults={
                            'email': username,
                            'first_name': fn,
                            'last_name': ln,
                            'rol': 'ESTUDIANTE',
                            'estado': 'ACTIVO'
                        }
                    )
                    if created:
                        user.set_password('password123')
                        user.save()

                    est, _ = Estudiante.objects.get_or_create(usuario=user)
                    ec, _ = EstudianteCurso.objects.get_or_create(
                        estudiante=est, curso=curso,
                        defaults={'codigo_ru': f"RU-{colegio.id:02d}-{suffix:04d}"}
                    )
                    estudiantes_curso.append(est)

                print(f"  Curso {grado} '{paralelo}': {len(estudiantes_curso)} estudiantes")

                # Crear materias y tareas para el docente
                for materia_nombre in materias[:2]:  # solo 2 materias por nivel para no saturar
                    materia, _ = Materia.objects.get_or_create(
                        curso=curso, nombre=materia_nombre,
                        defaults={'docente': docente, 'horas_semanales': 4}
                    )

                    # Crear/obtener espacio para la materia
                    codigo = get_random_code(6)
                    espacio, created_esp = Espacio.objects.get_or_create(
                        materia=materia,
                        defaults={
                            'nombre': f"{materia_nombre} - {grado} '{paralelo}'",
                            'codigo': codigo,
                            'docente': docente,
                            'colegio': colegio,
                            'curso': curso,
                            'color': col_data['color'],
                        }
                    )

                    # Inscribir estudiantes en el espacio
                    for est in estudiantes_curso:
                        MiembroEspacio.objects.get_or_create(espacio=espacio, estudiante=est)

                    # Crear tareas de ejemplo
                    tareas_data = TAREAS_POR_MATERIA.get(materia_nombre, [])
                    for i, (titulo, descripcion) in enumerate(tareas_data):
                        tarea, created_t = Tarea.objects.get_or_create(
                            titulo=titulo, espacio=espacio,
                            defaults={
                                'docente': docente,
                                'descripcion': descripcion,
                                'indicaciones': 'Presentar en formato PDF o Word. Letra Arial 12, interlineado 1.5. Incluir portada con datos del estudiante.',
                                'fecha_publicacion': now - timedelta(days=15 - i * 5),
                                'fecha_limite': now + timedelta(days=7 + i * 7),
                                'puntaje_maximo': 10,
                                'estado': 'PUBLICADA'
                            }
                        )

                        if created_t:
                            # Simular entregas: 8 de 12 estudiantes entregaron la tarea 1, 5 la tarea 2
                            n_entregas = 8 if i == 0 else 5
                            for est in random.sample(estudiantes_curso, min(n_entregas, len(estudiantes_curso))):
                                nota_val = round(random.uniform(6.5, 10.0), 2)
                                entrega, created_e = Entrega.objects.get_or_create(
                                    tarea=tarea, estudiante=est,
                                    defaults={
                                        'fecha_entrega': now - timedelta(days=random.randint(1, 10)),
                                        'archivo_url': 'https://example.com/tarea.pdf',
                                        'archivo_nombre': f'tarea_{est.usuario.username.split("@")[0]}.pdf',
                                        'estado': 'CALIFICADO',
                                        'observaciones': 'Adjunto el trabajo requerido.'
                                    }
                                )
                                if created_e:
                                    Calificacion.objects.get_or_create(
                                        entrega=entrega,
                                        defaults={'nota': nota_val, 'docente': docente}
                                    )

    # Actualizar progreso de todos los estudiantes
    print("\nActualizando progreso académico de estudiantes...")
    for est in Estudiante.objects.all():
        try:
            est.actualizar_progreso()
        except Exception:
            pass

    print("\n✅ ¡Datos de colegio real generados exitosamente!")
    print(f"   - {Colegio.objects.count()} colegios")
    print(f"   - {Curso.objects.count()} cursos")
    print(f"   - {Materia.objects.count()} materias")
    print(f"   - {Espacio.objects.count()} espacios académicos")
    print(f"   - {Estudiante.objects.count()} estudiantes registrados")
    print(f"   - {Tarea.objects.count()} tareas publicadas")
    print(f"   - {Entrega.objects.count()} entregas simuladas")

if __name__ == '__main__':
    populate()
