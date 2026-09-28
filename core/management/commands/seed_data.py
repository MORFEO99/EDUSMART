from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import (
    Usuario, Docente, Estudiante, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion
)

class Command(BaseCommand):
    help = 'Poblar la base de datos de EDUSMART con datos académicos representativos'

    def handle(self, *args, **options):
        self.stdout.write("Poblando datos de EDUSMART (Docente y Estudiante)...")

        # Clear existing data safely
        Usuario.objects.all().delete()
        Espacio.objects.all().delete()

        # =====================================================================
        # 1. DOCENTES
        # =====================================================================
        # Docente 1: Prof. Juan Pérez
        user_juan = Usuario.objects.create_user(
            username='prof_juan@edusmart.edu',
            email='prof_juan@edusmart.edu',
            password='password123',
            first_name='Juan',
            last_name='Pérez',
            rol='DOCENTE',
            avatar_url='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        )
        docente_juan = Docente.objects.create(
            usuario=user_juan,
            especialidad='Bases de Datos y Arquitectura de Software',
            titulo_academico='Ph.D. en Sistemas de Información',
            biografia='Docente titular de Bases de Datos I y Análisis y Diseño de Sistemas.'
        )

        # Docente 2: Prof. María López
        user_maria_doc = Usuario.objects.create_user(
            username='prof_maria@edusmart.edu',
            email='prof_maria@edusmart.edu',
            password='password123',
            first_name='María',
            last_name='López',
            rol='DOCENTE',
            avatar_url='https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
        )
        docente_maria = Docente.objects.create(
            usuario=user_maria_doc,
            especialidad='Ingeniería de Software y Algorítmica',
            titulo_academico='Magíster en Ciencias de la Computación',
            biografia='Especialista en Programación, Optimización e Investigación Operativa.'
        )

        # =====================================================================
        # 2. ESTUDIANTES
        # =====================================================================
        # Estudiante Principal: Carlos Gómez
        user_carlos = Usuario.objects.create_user(
            username='carlos.gomez@edusmart.edu',
            email='carlos.gomez@edusmart.edu',
            password='password123',
            first_name='Carlos',
            last_name='Gómez',
            rol='ESTUDIANTE',
            avatar_url='https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
        )
        estudiante_carlos = Estudiante.objects.create(
            usuario=user_carlos,
            carrera_o_area='Ingeniería de Sistemas e Informática'
        )

        # Estudiante 2: Ana Flores
        user_ana = Usuario.objects.create_user(
            username='ana.flores@edusmart.edu',
            email='ana.flores@edusmart.edu',
            password='password123',
            first_name='Ana',
            last_name='Flores',
            rol='ESTUDIANTE',
            avatar_url='https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
        )
        estudiante_ana = Estudiante.objects.create(
            usuario=user_ana,
            carrera_o_area='Ingeniería de Sistemas e Informática'
        )

        # Estudiante 3: David Morales
        user_david = Usuario.objects.create_user(
            username='david.morales@edusmart.edu',
            email='david.morales@edusmart.edu',
            password='password123',
            first_name='David',
            last_name='Morales',
            rol='ESTUDIANTE',
            avatar_url='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        )
        estudiante_david = Estudiante.objects.create(
            usuario=user_david,
            carrera_o_area='Ingeniería de Software'
        )

        # =====================================================================
        # 3. ESPACIOS ACADÉMICOS
        # =====================================================================
        espacio_bd = Espacio.objects.create(
            nombre='Base de Datos I',
            descripcion='Materia correspondiente al modelado relacional, diseño y desarrollo de bases de datos.',
            codigo='BD2026',
            docente=docente_juan,
            color='#1E3A8A',
            icono='database',
            imagen_url='https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400'
        )

        espacio_prog = Espacio.objects.create(
            nombre='Programación',
            descripcion='Fundamentos y desarrollo avanzado con POO, patrones de diseño y estructuras eficientes.',
            codigo='PROG2026',
            docente=docente_maria,
            color='#0284C7',
            icono='code',
            imagen_url='https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400'
        )

        espacio_ads = Espacio.objects.create(
            nombre='Análisis y Diseño de Sistemas',
            descripcion='Ingeniería de requisitos, modelado conceptual UML, arquitectura de software y metodologías ágiles.',
            codigo='ADS2026',
            docente=docente_juan,
            color='#4338CA',
            icono='layers',
            imagen_url='https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400'
        )

        espacio_io = Espacio.objects.create(
            nombre='Investigación Operativa',
            descripcion='Modelos de programación lineal, método simplex, teoría de colas y optimización matemática.',
            codigo='IO2026',
            docente=docente_maria,
            color='#0D9488',
            icono='cpu',
            imagen_url='https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400'
        )

        # Inscribir estudiantes en los espacios
        for est in [estudiante_carlos, estudiante_ana, estudiante_david]:
            MiembroEspacio.objects.create(espacio=espacio_bd, estudiante=est)
            MiembroEspacio.objects.create(espacio=espacio_prog, estudiante=est)
            MiembroEspacio.objects.create(espacio=espacio_ads, estudiante=est)

        # Inscribir a Carlos y Ana en Investigación Operativa
        MiembroEspacio.objects.create(espacio=espacio_io, estudiante=estudiante_carlos)
        MiembroEspacio.objects.create(espacio=espacio_io, estudiante=estudiante_ana)

        # =====================================================================
        # 4. TAREAS ACADÉMICAS
        # =====================================================================
        now = timezone.now()

        # Tarea 1: Base de Datos I - Modelo Entidad-Relación (Ya calificada para Carlos)
        t1 = Tarea.objects.create(
            espacio=espacio_bd,
            docente=docente_juan,
            titulo='Modelo entidad-relación',
            descripcion='Elaborar el diagrama entidad-relación para el caso de estudio de la clínica médica.',
            indicaciones='1. Identificar entidades principales y atributos clave.\n2. Establecer cardinalidades (1:1, 1:N, N:M).\n3. Especificar claves primarias y foráneas.\n4. Formato de entrega: PDF formal.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=12),
            fecha_limite=now - timedelta(days=4),
            estado='PUBLICADA'
        )
        Material.objects.create(
            tarea=t1,
            nombre='Guia_Caso_Clinica_ER.pdf',
            tipo='PDF',
            archivo_url='https://edusmart.cloud/resources/bd/guia_er.pdf',
            tamano='1.8 MB'
        )

        # Tarea 2: Base de Datos I - Diseño de Base de Datos (Pendiente / En proceso)
        t2 = Tarea.objects.create(
            espacio=espacio_bd,
            docente=docente_juan,
            titulo='Diseño de Base de Datos',
            descripcion='Normalización hasta 3ra Forma Normal (3FN) y script DDL de creación de tablas.',
            indicaciones='Aplicar las reglas de 1FN, 2FN y 3FN al modelo ER aprobado. Generar el script SQL DDL con restricciones de integridad referencial.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=5),
            fecha_limite=now + timedelta(days=4),
            estado='PUBLICADA'
        )
        Material.objects.create(
            tarea=t2,
            nombre='Plantilla_Normalizacion_SQL.pdf',
            tipo='PDF',
            archivo_url='https://edusmart.cloud/resources/bd/plantilla_ddl.pdf',
            tamano='2.1 MB'
        )

        # Tarea 3: Base de Datos I - Consultas SQL Avanzadas
        t3 = Tarea.objects.create(
            espacio=espacio_bd,
            docente=docente_juan,
            titulo='Consultas SQL y Optimización de Índices',
            descripcion='Redacción de consultas complejas con JOINs múltiples, subconsultas y funciones de ventana.',
            indicaciones='Resolver las 10 consultas del documento adjunto y medir el plan de ejecución con EXPLAIN ANALYZE.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=2),
            fecha_limite=now + timedelta(days=10),
            estado='PUBLICADA'
        )

        # Tarea 4: Programación - Programación Orientada a Objetos
        t4 = Tarea.objects.create(
            espacio=espacio_prog,
            docente=docente_maria,
            titulo='Diseño de Clases con Polimorfismo y Herencia',
            descripcion='Implementar el sistema de gestión de cuentas bancarias aplicando encapsulamiento y polimorfismo.',
            indicaciones='Crear jerarquía de clases Cuenta, CuentaAhorros, CuentaCorriente con cálculo de comisiones e interfaces de auditoría.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=10),
            fecha_limite=now - timedelta(days=2),
            estado='PUBLICADA'
        )
        Material.objects.create(
            tarea=t4,
            nombre='Especificacion_Cuentas_Bancarias.pdf',
            tipo='PDF',
            archivo_url='https://edusmart.cloud/resources/prog/cuentas_bancarias.pdf',
            tamano='1.4 MB'
        )

        # Tarea 5: Programación - Patrones de Diseño de Software
        t5 = Tarea.objects.create(
            espacio=espacio_prog,
            docente=docente_maria,
            titulo='Implementación del Patrón Factory y Singleton',
            descripcion='Desarrollar un generador de conexiones de bases de datos multiplataforma aplicando Factory Method.',
            indicaciones='Suministrar tests unitarios para verificar la instanciación única y la correcta creación de drivers.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=3),
            fecha_limite=now + timedelta(days=6),
            estado='PUBLICADA'
        )

        # Tarea 6: Análisis y Diseño de Sistemas - Diagramas de Casos de Uso UML
        t6 = Tarea.objects.create(
            espacio=espacio_ads,
            docente=docente_juan,
            titulo='Diagramas de Casos de Uso y Especificación Narrativa',
            descripcion='Modelar los casos de uso principales para el sistema de facturación electrónica.',
            indicaciones='Incluir diagrama de casos de uso general y especificaciones detalladas para "Emitir Factura" y "Consultar Stock".',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=7),
            fecha_limite=now + timedelta(days=2),
            estado='PUBLICADA'
        )

        # Tarea 7: Investigación Operativa - Método Simplex Dual
        t7 = Tarea.objects.create(
            espacio=espacio_io,
            docente=docente_maria,
            titulo='Optimización con Método Simplex y Análisis de Sensibilidad',
            descripcion='Resolver el problema de mezcla de producción óptima minimizando costos de transporte.',
            indicaciones='Presentar la tabla simplex paso a paso e interpretar los precios sombra y rango de viabilidad.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=4),
            fecha_limite=now + timedelta(days=8),
            estado='PUBLICADA'
        )

        # =====================================================================
        # 5. ENTREGAS, CALIFICACIONES Y RETROALIMENTACIONES
        # =====================================================================
        # Carlos Gómez - Entrega Tarea 1 (Modelo ER) -> CALIFICADA CON 85/100 y RETROALIMENTADA
        e1_carlos = Entrega.objects.create(
            tarea=t1,
            estudiante=estudiante_carlos,
            fecha_entrega=now - timedelta(days=5, hours=3),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_gomez_modelo_er.pdf',
            archivo_nombre='CarlosGomez_Modelo_ER_Clinica.pdf',
            archivo_tamano='2.8 MB',
            observaciones='Profesor, adjunto el diagrama con todas las entidades normalizadas y cardinalidades explicadas en el informe.',
            estado='RETROALIMENTADA'
        )
        c1 = Calificacion.objects.create(
            entrega=e1_carlos,
            nota=85.0,
            fecha_calificacion=now - timedelta(minutes=25),
            docente=docente_juan
        )
        Retroalimentacion.objects.create(
            calificacion=c1,
            comentario='Buen trabajo. La estructura de la base de datos está correctamente planteada. Se recomienda mejorar la normalización de la tabla de estudiantes.',
            fecha=now - timedelta(minutes=25)
        )

        # Ana Flores - Entrega Tarea 1 -> CALIFICADA CON 90/100
        e1_ana = Entrega.objects.create(
            tarea=t1,
            estudiante=estudiante_ana,
            fecha_entrega=now - timedelta(days=5, hours=6),
            archivo_url='https://edusmart.cloud/storage/entregas/ana_flores_modelo_er.pdf',
            archivo_nombre='AnaFlores_Modelo_ER.pdf',
            archivo_tamano='3.1 MB',
            observaciones='Entrega completa con documentación.',
            estado='RETROALIMENTADA'
        )
        c_ana = Calificacion.objects.create(
            entrega=e1_ana,
            nota=90.0,
            fecha_calificacion=now - timedelta(hours=2),
            docente=docente_juan
        )
        Retroalimentacion.objects.create(
            calificacion=c_ana,
            comentario='Excelente análisis relacional y excelente definición de claves foráneas compuestas.',
            fecha=now - timedelta(hours=2)
        )

        # Carlos Gómez - Entrega Tarea 4 (POO) -> CALIFICADA CON 92/100
        e4_carlos = Entrega.objects.create(
            tarea=t4,
            estudiante=estudiante_carlos,
            fecha_entrega=now - timedelta(days=3),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_gomez_cuentas.zip',
            archivo_nombre='CarlosGomez_CuentasBancarias_POO.zip',
            archivo_tamano='4.2 MB',
            observaciones='Código fuente en Java con suite de tests JUnit.',
            estado='RETROALIMENTADA'
        )
        c4 = Calificacion.objects.create(
            entrega=e4_carlos,
            nota=92.0,
            fecha_calificacion=now - timedelta(days=1),
            docente=docente_maria
        )
        Retroalimentacion.objects.create(
            calificacion=c4,
            comentario='Excelente diseño orientado a objetos. Muy buena separación de responsabilidades y tests exhaustivos.',
            fecha=now - timedelta(days=1)
        )

        # Carlos Gómez - Entrega Tarea 6 (ADS Casos de Uso) -> ENTREGADA (En revisión)
        Entrega.objects.create(
            tarea=t6,
            estudiante=estudiante_carlos,
            fecha_entrega=now - timedelta(hours=14),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_gomez_casos_uso.pdf',
            archivo_nombre='CarlosGomez_CasosUso_UML.pdf',
            archivo_tamano='1.9 MB',
            observaciones='Se incluyeron los flujos alternativos y extensiones de casos de uso.',
            estado='ENTREGADO'
        )

        # =====================================================================
        # 6. RECALCULAR PROGRESOS
        # =====================================================================
        for est in [estudiante_carlos, estudiante_ana, estudiante_david]:
            est.actualizar_progreso()

        # =====================================================================
        # 7. NOTIFICACIONES ACADÉMICAS
        # =====================================================================
        # Para Carlos (Estudiante)
        Notificacion.objects.create(
            usuario=user_carlos,
            tipo='CALIFICADA',
            mensaje="Tu tarea 'Modelo entidad-relación' en 'Base de Datos I' fue calificada con 85/100.",
            espacio_id=espacio_bd.id,
            tarea_id=t1.id,
            fecha=now - timedelta(minutes=25)
        )
        Notificacion.objects.create(
            usuario=user_carlos,
            tipo='RETROALIMENTACION',
            mensaje='El docente agregó retroalimentación a "Modelo entidad-relación": "Buen trabajo. La estructura de la base de datos está correctamente planteada..."',
            espacio_id=espacio_bd.id,
            tarea_id=t1.id,
            fecha=now - timedelta(minutes=25)
        )
        Notificacion.objects.create(
            usuario=user_carlos,
            tipo='PROXIMA_VENCER',
            mensaje="Recordatorio académico: La tarea 'Diseño de Base de Datos' vence el 28/09/2026.",
            espacio_id=espacio_bd.id,
            tarea_id=t2.id,
            fecha=now - timedelta(hours=5)
        )
        Notificacion.objects.create(
            usuario=user_carlos,
            tipo='NUEVA_TAREA',
            mensaje="Se publicó una nueva tarea: 'Optimización con Método Simplex' en Investigación Operativa.",
            espacio_id=espacio_io.id,
            tarea_id=t7.id,
            fecha=now - timedelta(days=1)
        )

        # Para Juan Pérez (Docente)
        Notificacion.objects.create(
            usuario=user_juan,
            tipo='ENTREGA_CONFIRMADA',
            mensaje="Carlos Gómez presentó la tarea 'Diagramas de Casos de Uso y Especificación Narrativa'.",
            espacio_id=espacio_ads.id,
            tarea_id=t6.id,
            fecha=now - timedelta(hours=14)
        )

        self.stdout.write(self.style.SUCCESS("¡Base de datos EDUSMART inicializada exitosamente!"))
        self.stdout.write("Docente: prof_juan@edusmart.edu / password123")
        self.stdout.write("Estudiante: carlos.gomez@edusmart.edu / password123")
