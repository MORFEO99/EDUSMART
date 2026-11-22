from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
from core.models import (
    Usuario, Docente, Colegio, DocenteColegio, Curso, Materia,
    Estudiante, EstudianteCurso, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion, Rubrica, CriterioRubrica
)


class Command(BaseCommand):
    help = 'Poblar EDUSMART con datos de prueba: 3 colegios, 6 cursos, 3 docentes, 15 estudiantes'

    def add_arguments(self, parser):
        parser.add_argument('--if-empty', action='store_true', help='Solo ejecutar si la base está vacía')
        parser.add_argument('--reset', action='store_true', help='Limpiar todo antes de poblar')

    def handle(self, *args, **options):
        if options.get('if_empty') and Usuario.objects.exists():
            self.stdout.write(self.style.WARNING("Ya hay datos. Usa --reset para limpiar primero."))
            return

        if options.get('reset'):
            self.stdout.write("Limpiando base de datos...")
            Usuario.objects.exclude(is_superuser=True).delete()
            Espacio.objects.all().delete()
            Rubrica.objects.all().delete()
            Colegio.objects.all().delete()
            Curso.objects.all().delete()

        now = timezone.now()
        self.stdout.write(self.style.SUCCESS("Iniciando seed de EDUSMART..."))

        # =====================================================================
        # 1. DOCENTES (3)
        # =====================================================================
        def make_docente(username, first, last, especialidad, titulo, bio, avatar):
            u = Usuario.objects.create_user(
                username=username, email=username,
                password='password123',
                first_name=first, last_name=last,
                rol='DOCENTE', avatar_url=avatar
            )
            return Docente.objects.create(
                usuario=u, especialidad=especialidad,
                titulo_academico=titulo, biografia=bio
            )

        docente_juan = make_docente(
            'prof_juan@edusmart.edu', 'Juan', 'Pérez',
            'Bases de Datos y Arquitectura de Software',
            'Ph.D. en Sistemas de Información',
            'Docente titular de Bases de Datos I y Análisis y Diseño de Sistemas.',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        )
        docente_maria = make_docente(
            'prof_maria@edusmart.edu', 'María', 'López',
            'Ingeniería de Software y Algorítmica',
            'Magíster en Ciencias de la Computación',
            'Especialista en Programación, Optimización e Investigación Operativa.',
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
        )
        docente_roberto = make_docente(
            'prof_roberto@edusmart.edu', 'Roberto', 'Sánchez',
            'Matemáticas Aplicadas y Análisis Numérico',
            'Magíster en Matemáticas Aplicadas',
            'Especialista en métodos numéricos, cálculo y estadística aplicada.',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        )
        self.stdout.write("✓ Docentes creados (3)")

        # =====================================================================
        # 2. COLEGIOS (3)
        # =====================================================================
        colegio_a = Colegio.objects.create(
            nombre='Colegio Nacional Simón Bolívar',
            ciudad='La Paz', pais='Bolivia',
            direccion='Av. Mcal. Santa Cruz N° 1234, La Paz',
            telefono='+591 2 2441234',
            color='#1E3A8A',
            logo_url='https://images.unsplash.com/photo-1562774053-701939374585?w=150'
        )
        colegio_b = Colegio.objects.create(
            nombre='Unidad Educativa Santa Cruz de la Sierra',
            ciudad='Santa Cruz', pais='Bolivia',
            direccion='Calle Warnes N° 456, Santa Cruz',
            telefono='+591 3 3321456',
            color='#0D9488',
            logo_url='https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150'
        )
        colegio_c = Colegio.objects.create(
            nombre='Instituto Tecnológico Cochabamba',
            ciudad='Cochabamba', pais='Bolivia',
            direccion='Av. Blanco Galindo Km 5, Cochabamba',
            telefono='+591 4 4567890',
            color='#7C3AED',
            logo_url='https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150'
        )
        self.stdout.write("✓ Colegios creados (3)")

        # =====================================================================
        # 3. VINCULAR DOCENTES A COLEGIOS
        # =====================================================================
        DocenteColegio.objects.create(docente=docente_juan,    colegio=colegio_a, cargo='Docente Titular',  fecha_incorporacion=date(2024, 2, 1))
        DocenteColegio.objects.create(docente=docente_juan,    colegio=colegio_b, cargo='Docente Invitado', fecha_incorporacion=date(2025, 3, 15))
        DocenteColegio.objects.create(docente=docente_maria,   colegio=colegio_b, cargo='Docente Titular',  fecha_incorporacion=date(2024, 1, 10))
        DocenteColegio.objects.create(docente=docente_maria,   colegio=colegio_c, cargo='Docente Titular',  fecha_incorporacion=date(2025, 2, 20))
        DocenteColegio.objects.create(docente=docente_roberto, colegio=colegio_a, cargo='Docente Invitado', fecha_incorporacion=date(2025, 3, 1))
        DocenteColegio.objects.create(docente=docente_roberto, colegio=colegio_c, cargo='Docente Titular',  fecha_incorporacion=date(2024, 2, 15))
        self.stdout.write("✓ Docentes vinculados a colegios")

        # =====================================================================
        # 4. CURSOS (6 — 2 por colegio)
        # =====================================================================
        curso_a1 = Curso.objects.create(colegio=colegio_a, nombre='Tercero de Secundaria A', grado='3ro de Secundaria', paralelo='A', nivel='Secundaria', anio_lectivo='2026-2027')
        curso_a2 = Curso.objects.create(colegio=colegio_a, nombre='Cuarto de Secundaria B',  grado='4to de Secundaria', paralelo='B', nivel='Secundaria', anio_lectivo='2026-2027')
        curso_b1 = Curso.objects.create(colegio=colegio_b, nombre='Primero de Bachillerato A', grado='1ro Bachillerato', paralelo='A', nivel='Bachillerato', anio_lectivo='2026-2027')
        curso_b2 = Curso.objects.create(colegio=colegio_b, nombre='Segundo de Bachillerato B', grado='2do Bachillerato', paralelo='B', nivel='Bachillerato', anio_lectivo='2026-2027')
        curso_c1 = Curso.objects.create(colegio=colegio_c, nombre='Ingeniería 3er Semestre', grado='3er Semestre', paralelo='A', nivel='Superior', anio_lectivo='2026-2027')
        curso_c2 = Curso.objects.create(colegio=colegio_c, nombre='Ingeniería 5to Semestre', grado='5to Semestre', paralelo='B', nivel='Superior', anio_lectivo='2026-2027')
        self.stdout.write("✓ Cursos creados (6)")

        # =====================================================================
        # 5. MATERIAS POR CURSO
        # =====================================================================
        Materia.objects.create(curso=curso_a1, docente=docente_juan,    nombre='Informática Básica',       codigo='INF-A1', horas_semanales=4, color='#1E3A8A')
        Materia.objects.create(curso=curso_a1, docente=docente_roberto,  nombre='Matemáticas',              codigo='MAT-A1', horas_semanales=5, color='#7C3AED')
        Materia.objects.create(curso=curso_a2, docente=docente_juan,    nombre='Programación Web',         codigo='WEB-A2', horas_semanales=4, color='#0284C7')
        Materia.objects.create(curso=curso_a2, docente=docente_roberto,  nombre='Estadística',              codigo='EST-A2', horas_semanales=3, color='#0D9488')
        Materia.objects.create(curso=curso_b1, docente=docente_maria,   nombre='Programación I',           codigo='PRG-B1', horas_semanales=5, color='#0284C7')
        Materia.objects.create(curso=curso_b1, docente=docente_roberto,  nombre='Cálculo',                  codigo='CAL-B1', horas_semanales=4, color='#7C3AED')
        Materia.objects.create(curso=curso_b2, docente=docente_maria,   nombre='Programación II',          codigo='PRG-B2', horas_semanales=5, color='#1E3A8A')
        Materia.objects.create(curso=curso_b2, docente=docente_roberto,  nombre='Álgebra Lineal',           codigo='ALG-B2', horas_semanales=4, color='#0D9488')
        Materia.objects.create(curso=curso_c1, docente=docente_juan,    nombre='Bases de Datos I',         codigo='BD-C1',  horas_semanales=4, color='#1E3A8A')
        Materia.objects.create(curso=curso_c1, docente=docente_roberto,  nombre='Análisis Numérico',        codigo='AN-C1',  horas_semanales=4, color='#7C3AED')
        Materia.objects.create(curso=curso_c2, docente=docente_juan,    nombre='Análisis y Diseño de Sistemas', codigo='ADS-C2', horas_semanales=4, color='#4338CA')
        Materia.objects.create(curso=curso_c2, docente=docente_maria,   nombre='Investigación Operativa',  codigo='IO-C2',  horas_semanales=3, color='#0D9488')
        self.stdout.write("✓ Materias creadas (12)")

        # =====================================================================
        # 6. ESTUDIANTES (15 — distribuidos en los 6 cursos)
        # =====================================================================
        def make_estudiante(username, first, last, carrera, curso_obj, ru, avatar=None):
            u = Usuario.objects.create_user(
                username=username, email=username,
                password='password123',
                first_name=first, last_name=last,
                rol='ESTUDIANTE',
                avatar_url=avatar or ''
            )
            est = Estudiante.objects.create(usuario=u, carrera_o_area=carrera)
            EstudianteCurso.objects.create(estudiante=est, curso=curso_obj, codigo_ru=ru)
            return est

        # Curso A1 — Colegio Simón Bolívar (3ro Sec A) — 3 estudiantes
        est_1  = make_estudiante('luis.mamani@edusmart.edu',    'Luis',    'Mamani',    'Secundaria', curso_a1, 'RU-A1-001', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150')
        est_2  = make_estudiante('sofia.quispe@edusmart.edu',   'Sofía',   'Quispe',    'Secundaria', curso_a1, 'RU-A1-002', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150')
        est_3  = make_estudiante('marco.condori@edusmart.edu',  'Marco',   'Condori',   'Secundaria', curso_a1, 'RU-A1-003')

        # Curso A2 — Colegio Simón Bolívar (4to Sec B) — 3 estudiantes
        est_4  = make_estudiante('valeria.ramos@edusmart.edu',  'Valeria', 'Ramos',     'Secundaria', curso_a2, 'RU-A2-001', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150')
        est_5  = make_estudiante('diego.flores@edusmart.edu',   'Diego',   'Flores',    'Secundaria', curso_a2, 'RU-A2-002')
        est_6  = make_estudiante('camila.vega@edusmart.edu',    'Camila',  'Vega',      'Secundaria', curso_a2, 'RU-A2-003')

        # Curso B1 — Colegio Santa Cruz (1ro Bach A) — 2 estudiantes
        est_7  = make_estudiante('andres.medina@edusmart.edu',  'Andrés',  'Medina',    'Bachillerato', curso_b1, 'RU-B1-001')
        est_8  = make_estudiante('paula.torrez@edusmart.edu',   'Paula',   'Torrez',    'Bachillerato', curso_b1, 'RU-B1-002', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150')

        # Curso B2 — Colegio Santa Cruz (2do Bach B) — 2 estudiantes
        est_9  = make_estudiante('gabriel.suarez@edusmart.edu', 'Gabriel', 'Suárez',   'Bachillerato', curso_b2, 'RU-B2-001')
        est_10 = make_estudiante('natalia.alba@edusmart.edu',   'Natalia', 'Alba',      'Bachillerato', curso_b2, 'RU-B2-002', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')

        # Curso C1 — Instituto Cochabamba (3er Sem A) — 3 estudiantes (principales, igual que antes)
        est_carlos = make_estudiante('carlos.gomez@edusmart.edu', 'Carlos', 'Gómez', 'Ingeniería de Sistemas', curso_c1, 'RU-C1-001', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150')
        est_ana    = make_estudiante('ana.flores@edusmart.edu',   'Ana',    'Flores', 'Ingeniería de Sistemas', curso_c1, 'RU-C1-002', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150')
        est_david  = make_estudiante('david.morales@edusmart.edu','David',  'Morales','Ingeniería de Software',  curso_c1, 'RU-C1-003', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')

        # Curso C2 — Instituto Cochabamba (5to Sem B) — 2 estudiantes
        est_14 = make_estudiante('jose.nina@edusmart.edu',      'José',    'Nina',      'Ingeniería de Sistemas', curso_c2, 'RU-C2-001')
        est_15 = make_estudiante('lucia.calle@edusmart.edu',    'Lucía',   'Calle',     'Ingeniería de Software',  curso_c2, 'RU-C2-002', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150')

        self.stdout.write("✓ Estudiantes creados (15)")

        # =====================================================================
        # 7. ESPACIOS ACADÉMICOS
        # =====================================================================
        espacio_bd = Espacio.objects.create(
            nombre='Base de Datos I', descripcion='Modelado relacional, diseño y desarrollo de bases de datos.',
            codigo='BD2026', docente=docente_juan, color='#1E3A8A', icono='database',
            imagen_url='https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400'
        )
        espacio_prog = Espacio.objects.create(
            nombre='Programación', descripcion='Fundamentos y desarrollo avanzado con POO y patrones de diseño.',
            codigo='PROG2026', docente=docente_maria, color='#0284C7', icono='code',
            imagen_url='https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400'
        )
        espacio_ads = Espacio.objects.create(
            nombre='Análisis y Diseño de Sistemas', descripcion='Ingeniería de requisitos, UML y metodologías ágiles.',
            codigo='ADS2026', docente=docente_juan, color='#4338CA', icono='layers',
            imagen_url='https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400'
        )
        espacio_io = Espacio.objects.create(
            nombre='Investigación Operativa', descripcion='Programación lineal, simplex, teoría de colas.',
            codigo='IO2026', docente=docente_maria, color='#0D9488', icono='cpu',
            imagen_url='https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400'
        )
        espacio_mat = Espacio.objects.create(
            nombre='Matemáticas Avanzadas', descripcion='Cálculo diferencial e integral, álgebra lineal y estadística.',
            codigo='MAT2026', docente=docente_roberto, color='#7C3AED', icono='sigma',
            imagen_url='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
        )
        espacio_an = Espacio.objects.create(
            nombre='Análisis Numérico 2026',
            descripcion='Cálculo de raíces no lineales, sistemas de ecuaciones, interpolación, integración numérica y EDOs.',
            codigo='AN2026', docente=docente_juan, color='#0284C7', icono='sigma',
            imagen_url='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
        )
        self.stdout.write("✓ Espacios creados (6)")

        # Inscripciones
        for est in [est_carlos, est_ana, est_david]:
            MiembroEspacio.objects.get_or_create(espacio=espacio_bd,   estudiante=est)
            MiembroEspacio.objects.get_or_create(espacio=espacio_prog, estudiante=est)
            MiembroEspacio.objects.get_or_create(espacio=espacio_ads,  estudiante=est)
            MiembroEspacio.objects.get_or_create(espacio=espacio_an,   estudiante=est)
        for est in [est_carlos, est_ana]:
            MiembroEspacio.objects.get_or_create(espacio=espacio_io, estudiante=est)
        for est in [est_14, est_15]:
            MiembroEspacio.objects.get_or_create(espacio=espacio_ads, estudiante=est)
            MiembroEspacio.objects.get_or_create(espacio=espacio_io,  estudiante=est)
        for est in [est_1, est_2, est_3]:
            MiembroEspacio.objects.get_or_create(espacio=espacio_mat, estudiante=est)
        for est in [est_7, est_8, est_9, est_10]:
            MiembroEspacio.objects.get_or_create(espacio=espacio_prog, estudiante=est)
            MiembroEspacio.objects.get_or_create(espacio=espacio_mat,  estudiante=est)

        # =====================================================================
        # 8. RÚBRICA DE ANÁLISIS NUMÉRICO
        # =====================================================================
        rubrica_an = Rubrica.objects.create(
            nombre='Rúbrica de Evaluación de Métodos Numéricos',
            descripcion='Rúbrica estándar de cuatro criterios pedagógicos.',
            docente=docente_juan, puntaje_total=100
        )
        for nombre, desc, pts, orden in [
            ('Planteamiento y fórmula', 'Definición correcta de la función, intervalo y fórmulas matemáticas.', 30, 1),
            ('Desarrollo y procedimiento', 'Iteraciones paso a paso y control tabular del procedimiento.', 30, 2),
            ('Resultado y error', 'Valor aproximado final y cálculo del error absoluto o relativo.', 20, 3),
            ('Interpretación', 'Análisis de convergencia y comparación con el valor analítico.', 20, 4),
        ]:
            CriterioRubrica.objects.create(rubrica=rubrica_an, nombre=nombre, descripcion=desc, puntaje_maximo=pts, orden=orden)

        # =====================================================================
        # 9. TAREAS
        # =====================================================================
        # Espacio BD
        t1 = Tarea.objects.create(espacio=espacio_bd, docente=docente_juan,
            titulo='Modelo Entidad-Relación', descripcion='Elaborar el diagrama ER para el caso de estudio de la clínica médica.',
            indicaciones='1. Identificar entidades y atributos.\n2. Establecer cardinalidades.\n3. Especificar claves. 4. Entregar en PDF.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=12),
            fecha_limite=now - timedelta(days=4), estado='PUBLICADA')
        t2 = Tarea.objects.create(espacio=espacio_bd, docente=docente_juan,
            titulo='Diseño de Base de Datos — Normalización 3FN', descripcion='Normalización hasta 3FN y script DDL.',
            indicaciones='Aplicar 1FN, 2FN y 3FN al modelo ER aprobado. Generar script SQL DDL con restricciones.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=5),
            fecha_limite=now + timedelta(days=4), estado='PUBLICADA')
        t3 = Tarea.objects.create(espacio=espacio_bd, docente=docente_juan,
            titulo='Consultas SQL y Optimización de Índices', descripcion='JOINs múltiples, subconsultas y funciones de ventana.',
            indicaciones='Resolver 10 consultas del documento adjunto con EXPLAIN ANALYZE.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=2),
            fecha_limite=now + timedelta(days=10), estado='PUBLICADA')

        # Espacio Programación
        t4 = Tarea.objects.create(espacio=espacio_prog, docente=docente_maria,
            titulo='POO — Polimorfismo y Herencia', descripcion='Sistema de cuentas bancarias con POO.',
            indicaciones='Crear jerarquía Cuenta, CuentaAhorros, CuentaCorriente con cálculo de comisiones.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=10),
            fecha_limite=now - timedelta(days=2), estado='PUBLICADA')
        t5 = Tarea.objects.create(espacio=espacio_prog, docente=docente_maria,
            titulo='Patrón Factory y Singleton', descripcion='Generador de conexiones de bases de datos.',
            indicaciones='Suministrar tests unitarios para verificar instanciación única.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=3),
            fecha_limite=now + timedelta(days=6), estado='PUBLICADA')

        # Espacio ADS
        t6 = Tarea.objects.create(espacio=espacio_ads, docente=docente_juan,
            titulo='Diagramas de Casos de Uso UML', descripcion='Modelar casos de uso para sistema de facturación.',
            indicaciones='Incluir diagrama general y especificaciones detalladas de "Emitir Factura".',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=7),
            fecha_limite=now + timedelta(days=2), estado='PUBLICADA')

        # Espacio IO
        t7 = Tarea.objects.create(espacio=espacio_io, docente=docente_maria,
            titulo='Método Simplex y Análisis de Sensibilidad', descripcion='Resolver problema de mezcla de producción.',
            indicaciones='Presentar tabla simplex paso a paso e interpretar precios sombra.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=4),
            fecha_limite=now + timedelta(days=8), estado='PUBLICADA')

        # Espacio Matemáticas
        t8 = Tarea.objects.create(espacio=espacio_mat, docente=docente_roberto,
            titulo='Integrales Definidas y Aplicaciones', descripcion='Calcular áreas, volúmenes y longitudes de arco.',
            indicaciones='Resolver 5 integrales definidas y aplicar al cálculo de área entre curvas.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=8),
            fecha_limite=now + timedelta(days=5), estado='PUBLICADA')

        # Tareas Análisis Numérico (5 tareas oficiales)
        t_an1 = Tarea.objects.create(espacio=espacio_an, docente=docente_juan, rubrica=rubrica_an,
            titulo='T1: Raíces — Bisección y Newton-Raphson',
            descripcion='Hallar la raíz de f(x)=x³-x-2 en [1,2] con 4 iteraciones de Bisección y Newton-Raphson (x₀=1.5).',
            indicaciones='1. Bisección: c=(a+b)/2, cota Emax=(b-a)/2^n.\n2. Newton: x_(n+1)=x_n-f(x_n)/f\'(x_n).\n3. Tablas de iteraciones.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=15),
            fecha_limite=now - timedelta(days=7), estado='PUBLICADA')
        t_an2 = Tarea.objects.create(espacio=espacio_an, docente=docente_juan, rubrica=rubrica_an,
            titulo='T2: Sistemas Lineales — Eliminación de Gauss',
            descripcion='Resolver sistema 3x3: 2x+y+z=7; x+3y+2z=13; 3x+y+4z=17.',
            indicaciones='1. Multiplicadores m_ij=a_ij/a_jj.\n2. F_i←F_i-m_ij*F_j.\n3. Sustitución regresiva.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=11),
            fecha_limite=now - timedelta(days=4), estado='PUBLICADA')
        t_an3 = Tarea.objects.create(espacio=espacio_an, docente=docente_juan, rubrica=rubrica_an,
            titulo='T3: Interpolación — Lagrange y Extrapolación',
            descripcion='Estimar f(1.5) con puntos (0,1),(1,3),(2,7) mediante Polinomio de Lagrange.',
            indicaciones='1. Bases L_i(x) y polinomio P(x).\n2. Calcular f(1.5).\n3. Analizar sobreestimación.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=7),
            fecha_limite=now - timedelta(days=2), estado='PUBLICADA')
        t_an4 = Tarea.objects.create(espacio=espacio_an, docente=docente_juan, rubrica=rubrica_an,
            titulo='T4: Integración — Trapecio y Simpson 1/3',
            descripcion='Calcular ∫x²dx en [0,2] con n=4. Comparar con valor exacto (8/3≈2.6667).',
            indicaciones='1. Trapecio compuesta n=4.\n2. Simpson 1/3 compuesta.\n3. Comparar exactitud.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=3),
            fecha_limite=now + timedelta(days=4), estado='PUBLICADA')
        t_an5 = Tarea.objects.create(espacio=espacio_an, docente=docente_juan, rubrica=rubrica_an,
            titulo="T5: EDO — Método de Euler",
            descripcion="Resolver y'=x+y, y(0)=1, h=0.1 hasta x=0.3. Contrastar con y=2eˣ-x-1.",
            indicaciones="1. y_(n+1)=y_n+h*f(x_n,y_n).\n2. Tabla x_n, y_n (Euler), exacta, error.\n3. Explicar crecimiento del error.",
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=1),
            fecha_limite=now + timedelta(days=7), estado='PUBLICADA')

        self.stdout.write("✓ Tareas creadas (13)")

        # =====================================================================
        # 10. ENTREGAS Y CALIFICACIONES
        # =====================================================================
        def entregar_y_calificar(tarea, estudiante, docente, nota, obs, retro, dias_entrega=5, dias_calif=4):
            e = Entrega.objects.create(
                tarea=tarea, estudiante=estudiante,
                fecha_entrega=now - timedelta(days=dias_entrega),
                archivo_url=f'https://edusmart.cloud/storage/entregas/{estudiante.usuario.username.split("@")[0]}_t{tarea.id}.pdf',
                archivo_nombre=f'{estudiante.usuario.first_name}_{tarea.titulo[:20].replace(" ","_")}.pdf',
                archivo_tamano='2.1 MB', observaciones=obs, estado='RETROALIMENTADA'
            )
            c = Calificacion.objects.create(entrega=e, nota=nota, fecha_calificacion=now - timedelta(days=dias_calif), docente=docente)
            Retroalimentacion.objects.create(calificacion=c, comentario=retro, fecha=now - timedelta(days=dias_calif))
            return e, c

        # Carlos — BD T1
        entregar_y_calificar(t1, est_carlos, docente_juan, 85.0,
            'Diagrama ER con todas las entidades normalizadas.',
            'Buen trabajo. Mejorar normalización de tabla estudiantes.')
        # Ana — BD T1
        entregar_y_calificar(t1, est_ana, docente_juan, 90.0,
            'Entrega completa con documentación.',
            'Excelente análisis relacional y definición de claves foráneas.')
        # David — BD T1
        entregar_y_calificar(t1, est_david, docente_juan, 78.0,
            'Diagrama ER básico con relaciones principales.',
            'Falta especificar las cardinalidades N:M correctamente. Revisar claves foráneas.')
        # Carlos — Prog T4
        entregar_y_calificar(t4, est_carlos, docente_maria, 92.0,
            'Código Java con tests JUnit.',
            'Excelente diseño OO. Muy buena separación de responsabilidades.')
        # Ana — Prog T4
        entregar_y_calificar(t4, est_ana, docente_maria, 88.0,
            'Código Python con unittest.',
            'Buen diseño. Revisar el cálculo de comisiones en CuentaCorriente.')

        # Análisis Numérico — Carlos
        entregar_y_calificar(t_an1, est_carlos, docente_juan, 85.0,
            '4 iteraciones de Bisección y 3 de Newton-Raphson.',
            'Excelente desarrollo. Cuidar el redondeo en la cota de error.', 8, 7)
        entregar_y_calificar(t_an2, est_carlos, docente_juan, 70.0,
            'Matriz escalonada y sustitución regresiva.',
            'Escalonamiento correcto. Desliz de signo en z. Vector solución: (1,2,3).', 5, 4)
        entregar_y_calificar(t_an3, est_carlos, docente_juan, 90.0,
            'P(x)=x²+x+1 y cálculo de ln(8) con análisis del error.',
            'Trabajo impecable. Muy buena justificación de la sobreestimación de ln(8).', 3, 2)

        # Análisis Numérico — Ana
        entregar_y_calificar(t_an1, est_ana, docente_juan, 95.0,
            'Desarrollo completo con gráficas de convergencia.',
            'Excelente desarrollo analítico y numérico. Gráficas muy claras.', 8, 7)
        entregar_y_calificar(t_an2, est_ana, docente_juan, 88.0,
            'Sistema resuelto con pivoteo parcial.',
            'Excelente. El uso de pivoteo parcial muestra dominio del método.', 5, 4)

        # Análisis Numérico — David
        entregar_y_calificar(t_an1, est_david, docente_juan, 72.0,
            'Bisección con 3 iteraciones y Newton-Raphson básico.',
            'Falta la 4ta iteración de Bisección. Newton-Raphson correcto.', 8, 7)

        # Entregas en revisión (sin calificar aún)
        Entrega.objects.create(
            tarea=t_an4, estudiante=est_carlos,
            fecha_entrega=now - timedelta(hours=6),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_an_t4.pdf',
            archivo_nombre='CarlosGomez_T4_Trapecio_Simpson.pdf',
            archivo_tamano='1.7 MB',
            observaciones='Trapecio (2.75) y Simpson 1/3 (2.6667) con errores calculados.',
            estado='ENTREGADO'
        )
        Entrega.objects.create(
            tarea=t6, estudiante=est_carlos,
            fecha_entrega=now - timedelta(hours=14),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_casos_uso.pdf',
            archivo_nombre='CarlosGomez_CasosUso_UML.pdf',
            archivo_tamano='1.9 MB',
            observaciones='Flujos alternativos y extensiones incluidas.',
            estado='ENTREGADO'
        )

        # Matemáticas — estudiantes colegio A
        entregar_y_calificar(t8, est_1, docente_roberto, 82.0,
            'Resolución de 5 integrales definidas.',
            'Buen trabajo. Revisar el método de sustitución en la integral 3.', 6, 5)
        entregar_y_calificar(t8, est_2, docente_roberto, 91.0,
            'Integrales con aplicación a áreas entre curvas.',
            'Excelente. Muy buena aplicación geométrica de las integrales.', 6, 5)

        self.stdout.write("✓ Entregas y calificaciones creadas")

        # =====================================================================
        # 11. RECALCULAR PROGRESOS
        # =====================================================================
        for est in [est_carlos, est_ana, est_david, est_1, est_2, est_14, est_15]:
            try:
                est.actualizar_progreso()
            except Exception:
                pass
        self.stdout.write("✓ Progresos académicos recalculados")

        # =====================================================================
        # 12. NOTIFICACIONES
        # =====================================================================
        Notificacion.objects.create(usuario=est_carlos.usuario, tipo='CALIFICADA',
            mensaje="Tu tarea 'T1: Raíces — Bisección y Newton-Raphson' fue calificada con 85/100.",
            espacio_id=espacio_an.id, tarea_id=t_an1.id, fecha=now - timedelta(days=7))
        Notificacion.objects.create(usuario=est_carlos.usuario, tipo='PROXIMA_VENCER',
            mensaje="Recordatorio: 'T4: Integración' vence en 4 días.",
            espacio_id=espacio_an.id, tarea_id=t_an4.id, fecha=now - timedelta(hours=5))
        Notificacion.objects.create(usuario=est_carlos.usuario, tipo='NUEVA_TAREA',
            mensaje="Nueva tarea publicada: 'T5: EDO — Método de Euler' en Análisis Numérico.",
            espacio_id=espacio_an.id, tarea_id=t_an5.id, fecha=now - timedelta(days=1))
        Notificacion.objects.create(usuario=docente_juan.usuario, tipo='ENTREGA_CONFIRMADA',
            mensaje="Carlos Gómez entregó 'T4: Integración — Trapecio y Simpson 1/3'.",
            espacio_id=espacio_an.id, tarea_id=t_an4.id, fecha=now - timedelta(hours=6))
        self.stdout.write("✓ Notificaciones creadas")

        # =====================================================================
        # 13. SUPERUSUARIO ADMIN
        # =====================================================================
        if not Usuario.objects.filter(username='admin').exists():
            Usuario.objects.create_superuser(
                username='admin', email='admin@edusmart.edu',
                password='adminpassword123', first_name='Admin', last_name='EduSmart', rol='DOCENTE'
            )

        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("✅ EDUSMART SEED COMPLETADO"))
        self.stdout.write(self.style.SUCCESS("="*60))
        self.stdout.write("📌 Colegios:    3 (Simón Bolívar, Santa Cruz, Cochabamba)")
        self.stdout.write("📌 Cursos:      6 (2 por colegio)")
        self.stdout.write("📌 Materias:   12 (2 por curso)")
        self.stdout.write("📌 Docentes:    3")
        self.stdout.write("📌 Estudiantes: 15")
        self.stdout.write("📌 Espacios:    6")
        self.stdout.write("📌 Tareas:     13")
        self.stdout.write("\n🔑 Credenciales:")
        self.stdout.write("   Admin:      admin / adminpassword123")
        self.stdout.write("   Docente:    prof_juan@edusmart.edu / password123")
        self.stdout.write("   Docente:    prof_maria@edusmart.edu / password123")
        self.stdout.write("   Docente:    prof_roberto@edusmart.edu / password123")
        self.stdout.write("   Estudiante: carlos.gomez@edusmart.edu / password123")
        self.stdout.write("   Estudiante: ana.flores@edusmart.edu / password123")
        self.stdout.write("   Estudiante: luis.mamani@edusmart.edu / password123")
