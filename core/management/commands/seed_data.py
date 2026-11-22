from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
import random

from core.models import (
    Usuario, Docente, Colegio, DocenteColegio, Curso, Materia,
    Estudiante, EstudianteCurso, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion, Rubrica, CriterioRubrica
)


class Command(BaseCommand):
    help = 'Poblar EDUSMART con datos completos: 4 colegios, 6 materias principales, 20 alumnos por materia/curso'

    def add_arguments(self, parser):
        parser.add_argument('--if-empty', action='store_true', help='Solo ejecutar si la base está vacía')
        parser.add_argument('--reset', action='store_true', help='Limpiar todo antes de poblar')

    def handle(self, *args, **options):
        if options.get('if_empty') and Usuario.objects.exists():
            self.stdout.write(self.style.WARNING("Ya hay datos. Usa --reset para limpiar primero."))
            return

        self.stdout.write(self.style.SUCCESS("Limpiando y regenerando datos de prueba EDUSMART..."))
        # Limpieza segura para recrear datos de pruebas completos
        Usuario.objects.exclude(is_superuser=True).delete()
        Espacio.objects.all().delete()
        Rubrica.objects.all().delete()
        Colegio.objects.all().delete()
        Curso.objects.all().delete()

        now = timezone.now()

        # =====================================================================
        # 1. DOCENTES (3 docentes)
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
            'Bases de Datos, Ingeniería de Software y Métodos Numéricos',
            'Ph.D. en Sistemas de Información',
            'Docente titular de Bases de Datos I, Análisis y Diseño de Sistemas y Análisis Numérico.',
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
            'Matemáticas Aplicadas y Ciencias Exactas',
            'Magíster en Matemáticas Aplicadas',
            'Especialista en cálculo avanzado, estadística y álgebra lineal.',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        )
        self.stdout.write("✓ Docentes creados (3)")

        # =====================================================================
        # 2. CUATRO (4) COLEGIOS
        # =====================================================================
        colegio_1 = Colegio.objects.create(
            nombre='Colegio Nacional Simón Bolívar',
            ciudad='La Paz', pais='Bolivia',
            direccion='Av. Mcal. Santa Cruz N° 1234, Centro, La Paz',
            telefono='+591 2 2441234',
            color='#1E3A8A',
            logo_url='https://images.unsplash.com/photo-1562774053-701939374585?w=150'
        )
        colegio_2 = Colegio.objects.create(
            nombre='Unidad Educativa Santa Cruz de la Sierra',
            ciudad='Santa Cruz', pais='Bolivia',
            direccion='Calle Warnes N° 456, Casco Viejo, Santa Cruz',
            telefono='+591 3 3321456',
            color='#0D9488',
            logo_url='https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150'
        )
        colegio_3 = Colegio.objects.create(
            nombre='Instituto Tecnológico Cochabamba',
            ciudad='Cochabamba', pais='Bolivia',
            direccion='Av. Blanco Galindo Km 5, Quillacollo, Cochabamba',
            telefono='+591 4 4567890',
            color='#7C3AED',
            logo_url='https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150'
        )
        colegio_4 = Colegio.objects.create(
            nombre='Colegio San Agustín',
            ciudad='Cochabamba', pais='Bolivia',
            direccion='Av. América Este N° 789, Cala Cala, Cochabamba',
            telefono='+591 4 4291122',
            color='#EA580C',
            logo_url='https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=150'
        )
        self.stdout.write("✓ Colegios creados (4)")

        # Docente Juan vinculado a los 4 colegios para pruebas totales
        for col in [colegio_1, colegio_2, colegio_3, colegio_4]:
            DocenteColegio.objects.create(docente=docente_juan, colegio=col, cargo='Docente Titular', fecha_incorporacion=date(2024, 2, 1))

        # Docentes secundarios vinculados
        DocenteColegio.objects.create(docente=docente_maria,   colegio=colegio_2, cargo='Docente Titular', fecha_incorporacion=date(2024, 1, 15))
        DocenteColegio.objects.create(docente=docente_maria,   colegio=colegio_3, cargo='Docente Invitado', fecha_incorporacion=date(2025, 2, 1))
        DocenteColegio.objects.create(docente=docente_roberto, colegio=colegio_1, cargo='Docente Titular', fecha_incorporacion=date(2024, 3, 1))
        DocenteColegio.objects.create(docente=docente_roberto, colegio=colegio_4, cargo='Docente Titular', fecha_incorporacion=date(2024, 2, 10))
        self.stdout.write("✓ Docentes vinculados a los 4 colegios")

        # =====================================================================
        # 3. CURSOS POR COLEGIO
        # =====================================================================
        curso_col1 = Curso.objects.create(colegio=colegio_1, nombre='6to de Secundaria A', grado='6to de Secundaria', paralelo='A', nivel='Secundaria', anio_lectivo='2026-2027')
        curso_col2 = Curso.objects.create(colegio=colegio_2, nombre='5to de Secundaria B', grado='5to de Secundaria', paralelo='B', nivel='Secundaria', anio_lectivo='2026-2027')
        curso_col3 = Curso.objects.create(colegio=colegio_3, nombre='Ingeniería 3er Semestre A', grado='3er Semestre', paralelo='A', nivel='Superior', anio_lectivo='2026-2027')
        curso_col4 = Curso.objects.create(colegio=colegio_4, nombre='6to de Secundaria Ciencias B', grado='6to de Secundaria', paralelo='B', nivel='Secundaria', anio_lectivo='2026-2027')
        self.stdout.write("✓ Cursos creados (4)")

        # =====================================================================
        # 4. SEIS (6) MATERIAS Y SUS ESPACIOS ACADÉMICOS
        # =====================================================================
        # Materias en los modelos
        mat_1 = Materia.objects.create(curso=curso_col3, docente=docente_juan,    nombre='Base de Datos I',              codigo='BD-101',  horas_semanales=4, color='#1E3A8A')
        mat_2 = Materia.objects.create(curso=curso_col2, docente=docente_maria,   nombre='Programación y Algoritmos',    codigo='PRG-102', horas_semanales=5, color='#0284C7')
        mat_3 = Materia.objects.create(curso=curso_col3, docente=docente_juan,    nombre='Análisis y Diseño de Sistemas',codigo='ADS-103', horas_semanales=4, color='#4338CA')
        mat_4 = Materia.objects.create(curso=curso_col1, docente=docente_maria,   nombre='Investigación Operativa',      codigo='IO-104',  horas_semanales=4, color='#0D9488')
        mat_5 = Materia.objects.create(curso=curso_col4, docente=docente_roberto, nombre='Matemáticas Aplicadas',       codigo='MAT-105', horas_semanales=5, color='#7C3AED')
        mat_6 = Materia.objects.create(curso=curso_col3, docente=docente_juan,    nombre='Análisis Numérico 2026',       codigo='AN-106',  horas_semanales=4, color='#0284C7')

        # Espacios vinculados directamente a Colegios, Cursos y Materias
        espacio_bd = Espacio.objects.create(
            nombre='Base de Datos I',
            descripcion='Modelado relacional, diseño físico, SQL interactivo y normalización de bases de datos.',
            codigo='BD2026', docente=docente_juan, colegio=colegio_3, curso=curso_col3, materia=mat_1,
            color='#1E3A8A', icono='database', imagen_url='https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400'
        )
        espacio_prog = Espacio.objects.create(
            nombre='Programación y Algoritmos',
            descripcion='Programación orientada a objetos, estructuras de datos, recursividad y patrones de diseño.',
            codigo='PROG2026', docente=docente_maria, colegio=colegio_2, curso=curso_col2, materia=mat_2,
            color='#0284C7', icono='code', imagen_url='https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400'
        )
        espacio_ads = Espacio.objects.create(
            nombre='Análisis y Diseño de Sistemas',
            descripcion='Ingeniería de software, diagramas UML, especificación de requerimientos y metodologías ágiles.',
            codigo='ADS2026', docente=docente_juan, colegio=colegio_3, curso=curso_col3, materia=mat_3,
            color='#4338CA', icono='layers', imagen_url='https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400'
        )
        espacio_io = Espacio.objects.create(
            nombre='Investigación Operativa',
            descripcion='Modelos de programación lineal, método simplex, transporte, asignación y teoría de colas.',
            codigo='IO2026', docente=docente_maria, colegio=colegio_1, curso=curso_col1, materia=mat_4,
            color='#0D9488', icono='cpu', imagen_url='https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400'
        )
        espacio_mat = Espacio.objects.create(
            nombre='Matemáticas Aplicadas',
            descripcion='Cálculo diferencial e integral, vectores, matrices y resolución de modelos analíticos.',
            codigo='MAT2026', docente=docente_roberto, colegio=colegio_4, curso=curso_col4, materia=mat_5,
            color='#7C3AED', icono='sigma', imagen_url='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
        )
        espacio_an = Espacio.objects.create(
            nombre='Análisis Numérico 2026',
            descripcion='Cálculo de raíces no lineales, sistemas de ecuaciones lineales, interpolación polinomial, integración numérica y resolución numérica de EDOs.',
            codigo='AN2026', docente=docente_juan, colegio=colegio_3, curso=curso_col3, materia=mat_6,
            color='#0284C7', icono='sigma', imagen_url='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
        )
        self.stdout.write("✓ 6 Materias y 6 Espacios vinculados creados")

        # =====================================================================
        # 5. VEINTE (20) ESTUDIANTES COMPLETOS
        # =====================================================================
        estudiantes_data = [
            ("Carlos", "Gómez", "carlos.gomez@edusmart.edu", "RU-2026-001", "Roberto Gómez", "59171234501", "PADRE", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"),
            ("Ana", "Flores", "ana.flores@edusmart.edu", "RU-2026-002", "Elena Flores", "59171234502", "MADRE", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"),
            ("David", "Morales", "david.morales@edusmart.edu", "RU-2026-003", "Victor Morales", "59171234503", "PADRE", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"),
            ("Sofía", "Quispe", "sofia.quispe@edusmart.edu", "RU-2026-004", "Carmen Quispe", "59171234504", "MADRE", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"),
            ("Luis", "Mamani", "luis.mamani@edusmart.edu", "RU-2026-005", "Jorge Mamani", "59171234505", "PADRE", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"),
            ("Valeria", "Ramos", "valeria.ramos@edusmart.edu", "RU-2026-006", "Patricia Ramos", "59171234506", "MADRE", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"),
            ("Diego", "Condori", "diego.condori@edusmart.edu", "RU-2026-007", "Ramiro Condori", "59171234507", "PADRE", ""),
            ("Camila", "Vega", "camila.vega@edusmart.edu", "RU-2026-008", "Lucía Vega", "59171234508", "MADRE", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"),
            ("Andrés", "Medina", "andres.medina@edusmart.edu", "RU-2026-009", "Fernando Medina", "59171234509", "PADRE", ""),
            ("Paula", "Torrez", "paula.torrez@edusmart.edu", "RU-2026-010", "Silvia Torrez", "59171234510", "MADRE", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"),
            ("Gabriel", "Suárez", "gabriel.suarez@edusmart.edu", "RU-2026-011", "Manuel Suárez", "59171234511", "PADRE", ""),
            ("Natalia", "Alba", "natalia.alba@edusmart.edu", "RU-2026-012", "Rosario Alba", "59171234512", "MADRE", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150"),
            ("José", "Nina", "jose.nina@edusmart.edu", "RU-2026-013", "Félix Nina", "59171234513", "PADRE", ""),
            ("Lucía", "Calle", "lucia.calle@edusmart.edu", "RU-2026-014", "Verónica Calle", "59171234514", "MADRE", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"),
            ("Mateo", "Salazar", "mateo.salazar@edusmart.edu", "RU-2026-015", "Gonzalo Salazar", "59171234515", "PADRE", ""),
            ("Valentina", "Castro", "valentina.castro@edusmart.edu", "RU-2026-016", "Miriam Castro", "59171234516", "MADRE", ""),
            ("Sebastián", "Fernández", "sebastian.fernandez@edusmart.edu", "RU-2026-017", "Álvaro Fernández", "59171234517", "PADRE", ""),
            ("Mariana", "Rojas", "mariana.rojas@edusmart.edu", "RU-2026-018", "Gabriela Rojas", "59171234518", "MADRE", ""),
            ("Rodrigo", "Choque", "rodrigo.choque@edusmart.edu", "RU-2026-019", "César Choque", "59171234519", "PADRE", ""),
            ("Elena", "Gutiérrez", "elena.gutierrez@edusmart.edu", "RU-2026-020", "Adriana Gutiérrez", "59171234520", "MADRE", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150")
        ]

        estudiantes_objs = []
        for first, last, email, ru, tutor, tel_tutor, rel_tutor, avatar in estudiantes_data:
            user = Usuario.objects.create_user(
                username=email, email=email,
                password='password123',
                first_name=first, last_name=last,
                rol='ESTUDIANTE',
                avatar_url=avatar
            )
            est = Estudiante.objects.create(
                usuario=user,
                carrera_o_area='Ingeniería y Ciencias',
                nombre_tutor=tutor,
                telefono_tutor=tel_tutor,
                relacion_tutor=rel_tutor
            )
            # Inscribir formalmente en el curso principal (curso_col3 de Cochabamba / o distribuido)
            EstudianteCurso.objects.create(estudiante=est, curso=curso_col3, codigo_ru=ru)
            estudiantes_objs.append(est)

        self.stdout.write("✓ 20 Estudiantes creados con datos de tutor y RU")

        # Inscribir a los 20 estudiantes en las 6 materias/espacios para que cada materia tenga 20 alumnos
        todos_los_espacios = [espacio_bd, espacio_prog, espacio_ads, espacio_io, espacio_mat, espacio_an]
        for espacio in todos_los_espacios:
            for est in estudiantes_objs:
                MiembroEspacio.objects.create(espacio=espacio, estudiante=est)

        self.stdout.write("✓ Los 20 estudiantes inscritos en las 6 materias/espacios (20 alumnos por materia)")

        # =====================================================================
        # 6. RÚBRICA Y TAREAS
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

        # Tareas en Análisis Numérico
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

        # Tareas en Base de Datos I
        t_bd1 = Tarea.objects.create(espacio=espacio_bd, docente=docente_juan,
            titulo='Modelo Entidad-Relación Caso Clínica Médica',
            descripcion='Elaborar el diagrama ER completo para el caso de estudio de la clínica médica.',
            indicaciones='1. Identificar entidades y atributos.\n2. Establecer cardinalidades.\n3. Especificar claves en PDF.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=12),
            fecha_limite=now - timedelta(days=4), estado='PUBLICADA')

        t_bd2 = Tarea.objects.create(espacio=espacio_bd, docente=docente_juan,
            titulo='Diseño de Base de Datos y Normalización 3FN',
            descripcion='Normalización hasta 3FN y script DDL con claves foráneas.',
            indicaciones='Aplicar 1FN, 2FN y 3FN al modelo ER aprobado.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=5),
            fecha_limite=now + timedelta(days=4), estado='PUBLICADA')

        # Tareas en Programación
        t_prg1 = Tarea.objects.create(espacio=espacio_prog, docente=docente_maria,
            titulo='POO — Sistema de Cuentas Bancarias con Herencia',
            descripcion='Implementar el sistema aplicando herencia, encapsulamiento y polimorfismo.',
            indicaciones='Crear jerarquía de clases con suite de tests.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=10),
            fecha_limite=now - timedelta(days=2), estado='PUBLICADA')

        # Tareas en ADS, IO y Matemáticas
        t_ads1 = Tarea.objects.create(espacio=espacio_ads, docente=docente_juan,
            titulo='Diagramas de Casos de Uso UML y Especificaciones',
            descripcion='Modelar casos de uso para facturación electrónica.',
            indicaciones='Incluir flujos principales y alternativos.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=6),
            fecha_limite=now + timedelta(days=3), estado='PUBLICADA')

        t_io1 = Tarea.objects.create(espacio=espacio_io, docente=docente_maria,
            titulo='Optimización con Método Simplex y Sensibilidad',
            descripcion='Resolver el problema de mezcla de producción óptima.',
            indicaciones='Presentar la tabla simplex paso a paso.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=4),
            fecha_limite=now + timedelta(days=8), estado='PUBLICADA')

        t_mat1 = Tarea.objects.create(espacio=espacio_mat, docente=docente_roberto,
            titulo='Cálculo Integral y Aplicaciones Geométricas',
            descripcion='Calcular áreas entre curvas y volúmenes de revolución.',
            indicaciones='Resolver las 5 integrales propuestas con procedimiento.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=8),
            fecha_limite=now + timedelta(days=5), estado='PUBLICADA')

        self.stdout.write("✓ Tareas creadas para todas las materias")

        # =====================================================================
        # 7. ENTREGAS Y CALIFICACIONES PARA LOS 20 ALUMNOS
        # =====================================================================
        # Calificaciones realistas para los alumnos en T1 y BD1
        notas_base = [85, 90, 78, 92, 88, 74, 95, 82, 70, 89, 76, 91, 84, 87, 72, 93, 80, 86, 77, 94]

        for i, est in enumerate(estudiantes_objs):
            nota = float(notas_base[i])
            # Entrega en Base de Datos T1
            e_bd = Entrega.objects.create(
                tarea=t_bd1, estudiante=est,
                fecha_entrega=now - timedelta(days=5, hours=i),
                archivo_url=f'https://edusmart.cloud/storage/entregas/{est.usuario.username.split("@")[0]}_bd1.pdf',
                archivo_nombre=f'{est.usuario.first_name}_{est.usuario.last_name}_ModeloER.pdf',
                archivo_tamano='2.4 MB',
                observaciones='Adjunto modelo entidad-relación y diccionario de datos completo.',
                estado='RETROALIMENTADA'
            )
            c_bd = Calificacion.objects.create(entrega=e_bd, nota=nota, fecha_calificacion=now - timedelta(days=4), docente=docente_juan)
            Retroalimentacion.objects.create(calificacion=c_bd, comentario='Buen trabajo con la estructura y las relaciones planteadas.', fecha=now - timedelta(days=4))

            # Entrega en Análisis Numérico T1
            nota_an = max(55.0, min(100.0, nota + (5 if i % 2 == 0 else -5)))
            e_an = Entrega.objects.create(
                tarea=t_an1, estudiante=est,
                fecha_entrega=now - timedelta(days=8, hours=i),
                archivo_url=f'https://edusmart.cloud/storage/entregas/{est.usuario.username.split("@")[0]}_an1.pdf',
                archivo_nombre=f'{est.usuario.first_name}_{est.usuario.last_name}_T1_Raices.pdf',
                archivo_tamano='1.9 MB',
                observaciones='Procedimiento paso a paso con cálculo de errores.',
                estado='RETROALIMENTADA'
            )
            c_an = Calificacion.objects.create(entrega=e_an, nota=nota_an, fecha_calificacion=now - timedelta(days=7), docente=docente_juan)
            Retroalimentacion.objects.create(calificacion=c_an, comentario='Procedimiento iterativo correcto y adecuada comprobación de convergencia.', fecha=now - timedelta(days=7))

        # Entregas pendientes de revisión en T4 de Análisis Numérico para los primeros 3
        for est in estudiantes_objs[:3]:
            Entrega.objects.create(
                tarea=t_an4, estudiante=est,
                fecha_entrega=now - timedelta(hours=6),
                archivo_url=f'https://edusmart.cloud/storage/entregas/{est.usuario.username.split("@")[0]}_an4.pdf',
                archivo_nombre=f'{est.usuario.first_name}_{est.usuario.last_name}_T4_Trapecio_Simpson.pdf',
                archivo_tamano='1.8 MB',
                observaciones='Cálculos de Trapecio y Simpson 1/3 adjuntos.',
                estado='ENTREGADO'
            )

        self.stdout.write("✓ Entregas, notas y retroalimentaciones generadas para los 20 alumnos")

        # =====================================================================
        # 8. RECALCULAR PROGRESOS Y NOTIFICACIONES
        # =====================================================================
        for est in estudiantes_objs:
            try:
                est.actualizar_progreso()
            except Exception:
                pass

        Notificacion.objects.create(
            usuario=docente_juan.usuario, tipo='ENTREGA_CONFIRMADA',
            mensaje='3 nuevas entregas pendientes de revisión en "T4: Integración — Trapecio y Simpson 1/3".',
            espacio_id=espacio_an.id, tarea_id=t_an4.id, fecha=now - timedelta(hours=6)
        )
        Notificacion.objects.create(
            usuario=estudiantes_objs[0].usuario, tipo='CALIFICADA',
            mensaje='Tu entrega de "T1: Raíces — Bisección y Newton-Raphson" fue calificada con 85/100.',
            espacio_id=espacio_an.id, tarea_id=t_an1.id, fecha=now - timedelta(days=7)
        )

        # Crear superusuario si no existe
        if not Usuario.objects.filter(username='admin').exists():
            Usuario.objects.create_superuser(
                username='admin', email='admin@edusmart.edu',
                password='adminpassword123', first_name='Admin', last_name='EduSmart', rol='DOCENTE'
            )

        self.stdout.write(self.style.SUCCESS("\n" + "="*65))
        self.stdout.write(self.style.SUCCESS("✅ EDUSMART SEED COMPLETADO SATISFACTORIAMENTE"))
        self.stdout.write(self.style.SUCCESS("="*65))
        self.stdout.write("📌 Colegios:    4 (La Paz, Santa Cruz, 2 en Cochabamba)")
        self.stdout.write("📌 Materias:    6 (BD, Prog, ADS, IO, Mat, Análisis Numérico)")
        self.stdout.write("📌 Alumnos:     20 alumnos completos inscritos por materia y curso")
        self.stdout.write("📌 Tareas:      10 tareas con entregas, calificaciones y retroalimentaciones")
        self.stdout.write("\n🔑 Credenciales principales de prueba:")
        self.stdout.write("   Docente:    prof_juan@edusmart.edu / password123 (supervisa las materias y colegios)")
        self.stdout.write("   Docente:    prof_maria@edusmart.edu / password123")
        self.stdout.write("   Docente:    prof_roberto@edusmart.edu / password123")
        self.stdout.write("   Estudiante: carlos.gomez@edusmart.edu / password123")
        self.stdout.write("   Estudiante: ana.flores@edusmart.edu / password123")
        self.stdout.write("   Estudiante: elena.gutierrez@edusmart.edu / password123")
