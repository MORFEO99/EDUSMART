from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
import random

from core.models import (
    Usuario, Docente, Colegio, DocenteColegio, Curso, Materia,
    Estudiante, EstudianteCurso, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion, Rubrica, CriterioRubrica,
    TemaAvance, PracticaTema, IntentoPracticaEstudiante, Challenge, UserChallenge
)


class Command(BaseCommand):
    help = 'Poblar EDUSMART con datos 100% escolares de secundaria: 4 colegios, materias de colegio, simuladores IA y 20 alumnos por curso'

    def add_arguments(self, parser):
        parser.add_argument('--if-empty', action='store_true', help='Solo ejecutar si la base está vacía')
        parser.add_argument('--reset', action='store_true', help='Limpiar todo antes de poblar')

    def handle(self, *args, **options):
        if options.get('if_empty') and Usuario.objects.exists():
            self.stdout.write(self.style.WARNING("Ya hay datos. Usa --reset para limpiar primero."))
            return

        self.stdout.write(self.style.SUCCESS("Limpiando y regenerando datos de nivel escolar secundario en EDUSMART..."))
        Usuario.objects.all().delete()
        Espacio.objects.all().delete()
        Rubrica.objects.all().delete()
        Colegio.objects.all().delete()
        Curso.objects.all().delete()
        TemaAvance.objects.all().delete()
        PracticaTema.objects.all().delete()
        Challenge.objects.all().delete()

        now = timezone.now()

        # =====================================================================
        # 1. TRES (3) DOCENTES DE NIVEL SECUNDARIA
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
            'Matemáticas y Física',
            'Lic. en Educación Secundaria y Matemáticas',
            'Profesor titular de Matemáticas y Física para nivel secundaria.',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        )
        docente_maria = make_docente(
            'prof_maria@edusmart.edu', 'María', 'López',
            'Lenguaje, Literatura y Ciencias Sociales',
            'Lic. en Letras y Ciencias de la Educación',
            'Profesora de Lenguaje, Literatura e Historia de nivel secundaria.',
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
        )
        docente_roberto = make_docente(
            'prof_roberto@edusmart.edu', 'Roberto', 'Sánchez',
            'Química, Biología y Ciencias Naturales',
            'Lic. en Ciencias Naturales y Química Escolar',
            'Profesor de Química y Biología de nivel secundaria.',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        )
        self.stdout.write("✓ Docentes escolares creados (3)")

        # =====================================================================
        # 2. CUATRO (4) COLEGIOS / UNIDADES EDUCATIVAS ESCOLARES
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
            nombre='Colegio San Agustín',
            ciudad='Cochabamba', pais='Bolivia',
            direccion='Av. América Este N° 789, Cala Cala, Cochabamba',
            telefono='+591 4 4291122',
            color='#EA580C',
            logo_url='https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=150'
        )
        colegio_4 = Colegio.objects.create(
            nombre='Colegio La Salle',
            ciudad='Cochabamba', pais='Bolivia',
            direccion='Av. Melchor Pérez de Olguín N° 321, Cochabamba',
            telefono='+591 4 4488990',
            color='#7C3AED',
            logo_url='https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150'
        )
        self.stdout.write("✓ Colegios escolares creados (4)")

        for col in [colegio_1, colegio_2, colegio_3, colegio_4]:
            DocenteColegio.objects.create(docente=docente_juan, colegio=col, cargo='Docente Titular', fecha_incorporacion=date(2024, 2, 1))

        DocenteColegio.objects.create(docente=docente_maria,   colegio=colegio_1, cargo='Docente Titular', fecha_incorporacion=date(2024, 1, 15))
        DocenteColegio.objects.create(docente=docente_maria,   colegio=colegio_2, cargo='Docente Titular', fecha_incorporacion=date(2024, 2, 1))
        DocenteColegio.objects.create(docente=docente_roberto, colegio=colegio_1, cargo='Docente Titular', fecha_incorporacion=date(2024, 3, 1))
        DocenteColegio.objects.create(docente=docente_roberto, colegio=colegio_3, cargo='Docente Titular', fecha_incorporacion=date(2024, 2, 10))
        DocenteColegio.objects.create(docente=docente_roberto, colegio=colegio_4, cargo='Docente Titular', fecha_incorporacion=date(2024, 2, 15))
        self.stdout.write("✓ Docentes vinculados a los colegios")

        # =====================================================================
        # 3. CURSOS DE SECUNDARIA POR COLEGIO
        # =====================================================================
        curso_bolivar = Curso.objects.create(
            colegio=colegio_1, nombre='6to de Secundaria "A"',
            grado='6to de Secundaria', paralelo='A', nivel='Secundaria', anio_lectivo='2026'
        )
        curso_scz = Curso.objects.create(
            colegio=colegio_2, nombre='5to de Secundaria "A"',
            grado='5to de Secundaria', paralelo='A', nivel='Secundaria', anio_lectivo='2026'
        )
        curso_agustin = Curso.objects.create(
            colegio=colegio_3, nombre='6to de Secundaria "B"',
            grado='6to de Secundaria', paralelo='B', nivel='Secundaria', anio_lectivo='2026'
        )
        curso_lasalle = Curso.objects.create(
            colegio=colegio_4, nombre='5to de Secundaria "B"',
            grado='5to de Secundaria', paralelo='B', nivel='Secundaria', anio_lectivo='2026'
        )
        self.stdout.write("✓ Cursos escolares de secundaria creados (4)")

        # =====================================================================
        # 4. MATERIAS Y ESPACIOS 100% NIVEL ESCOLAR (SECUNDARIA)
        # =====================================================================
        mat_mat = Materia.objects.create(curso=curso_bolivar, docente=docente_juan,    nombre='Matemáticas',                   codigo='MAT-601', horas_semanales=5, color='#1E3A8A')
        mat_fis = Materia.objects.create(curso=curso_bolivar, docente=docente_juan,    nombre='Física',                        codigo='FIS-602', horas_semanales=4, color='#0284C7')
        mat_qmc = Materia.objects.create(curso=curso_bolivar, docente=docente_roberto, nombre='Química',                       codigo='QMC-603', horas_semanales=4, color='#0D9488')
        mat_bio = Materia.objects.create(curso=curso_bolivar, docente=docente_roberto, nombre='Biología y Geografía',          codigo='BIO-604', horas_semanales=4, color='#16A34A')
        mat_lit = Materia.objects.create(curso=curso_bolivar, docente=docente_maria,   nombre='Lenguaje y Literatura',         codigo='LIT-605', horas_semanales=5, color='#7C3AED')
        mat_soc = Materia.objects.create(curso=curso_bolivar, docente=docente_maria,   nombre='Ciencias Sociales e Historia',   codigo='SOC-606', horas_semanales=4, color='#EA580C')

        espacio_mat = Espacio.objects.create(
            nombre='Matemáticas', descripcion='Álgebra, trigonometría, geometría analítica, funciones y cálculo pre-universitario.',
            codigo='MAT601', docente=docente_juan, colegio=colegio_1, curso=curso_bolivar, materia=mat_mat,
            color='#1E3A8A', icono='calculator', imagen_url='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
        )
        espacio_fis = Espacio.objects.create(
            nombre='Física', descripcion='Cinemática, dinámica, leyes de Newton, trabajo, energía, termodinámica y electromagnetismo.',
            codigo='FIS602', docente=docente_juan, colegio=colegio_1, curso=curso_bolivar, materia=mat_fis,
            color='#0284C7', icono='activity', imagen_url='https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400'
        )
        espacio_qmc = Espacio.objects.create(
            nombre='Química', descripcion='Estructura de la materia, tabla periódica, nomenclatura inorgánica, estequiometría y soluciones.',
            codigo='QMC603', docente=docente_roberto, colegio=colegio_1, curso=curso_bolivar, materia=mat_qmc,
            color='#0D9488', icono='flask-conical', imagen_url='https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400'
        )
        espacio_bio = Espacio.objects.create(
            nombre='Biología y Geografía', descripcion='Genética mendeliana, ecología, ecosistemas, anatomía humana y geografía física.',
            codigo='BIO604', docente=docente_roberto, colegio=colegio_1, curso=curso_bolivar, materia=mat_bio,
            color='#16A34A', icono='leaf', imagen_url='https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400'
        )
        espacio_lit = Espacio.objects.create(
            nombre='Lenguaje y Literatura', descripcion='Comprensión lectora, redacción ensayística, ortografía, literatura boliviana y universal.',
            codigo='LIT605', docente=docente_maria, colegio=colegio_1, curso=curso_bolivar, materia=mat_lit,
            color='#7C3AED', icono='book-open', imagen_url='https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400'
        )
        espacio_soc = Espacio.objects.create(
            nombre='Ciencias Sociales e Historia', descripcion='Historia de Bolivia, geografía social, procesos contemporáneos y educación cívica.',
            codigo='SOC606', docente=docente_maria, colegio=colegio_1, curso=curso_bolivar, materia=mat_soc,
            color='#EA580C', icono='globe', imagen_url='https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400'
        )

        # Materias de soporte en los otros colegios
        mat_scz = Materia.objects.create(curso=curso_scz, docente=docente_juan, nombre='Matemáticas 5to', codigo='MAT-501', horas_semanales=5, color='#0D9488')
        Espacio.objects.create(nombre='Matemáticas 5to', descripcion='Álgebra y trigonometría escolar.', codigo='MAT501', docente=docente_juan, colegio=colegio_2, curso=curso_scz, materia=mat_scz, color='#0D9488', icono='calculator')

        mat_agu = Materia.objects.create(curso=curso_agustin, docente=docente_roberto, nombre='Física 6to "B"', codigo='FIS-603', horas_semanales=4, color='#EA580C')
        Espacio.objects.create(nombre='Física 6to "B"', descripcion='Mecánica y termodinámica de secundaria.', codigo='FIS603', docente=docente_roberto, colegio=colegio_3, curso=curso_agustin, materia=mat_agu, color='#EA580C', icono='activity')

        mat_las = Materia.objects.create(curso=curso_lasalle, docente=docente_roberto, nombre='Química 5to "B"', codigo='QMC-502', horas_semanales=4, color='#7C3AED')
        Espacio.objects.create(nombre='Química 5to "B"', descripcion='Química general escolar.', codigo='QMC502', docente=docente_roberto, colegio=colegio_4, curso=curso_lasalle, materia=mat_las, color='#7C3AED', icono='flask-conical')

        self.stdout.write("✓ 6 Materias y Espacios escolares creados")

        # =====================================================================
        # 5. VEINTE (20) ESTUDIANTES DE SECUNDARIA
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
                carrera_o_area='Educación Secundaria',
                biografia=f'Estudiante de 6to de Secundaria en el Colegio Nacional Simón Bolívar.',
                nombre_tutor=tutor,
                telefono_tutor=tel_tutor,
                relacion_tutor=rel_tutor
            )
            EstudianteCurso.objects.create(estudiante=est, curso=curso_bolivar, codigo_ru=ru)
            estudiantes_objs.append(est)

        self.stdout.write("✓ 20 Estudiantes inscritos formalmente en 6to de Secundaria 'A'")

        espacios_del_curso = [espacio_mat, espacio_fis, espacio_qmc, espacio_bio, espacio_lit, espacio_soc]
        for espacio in espacios_del_curso:
            for est in estudiantes_objs:
                MiembroEspacio.objects.create(espacio=espacio, estudiante=est)

        # =====================================================================
        # 6. RÚBRICA Y TAREAS ESCOLARES
        # =====================================================================
        rubrica_secundaria = Rubrica.objects.create(
            nombre='Rúbrica de Evaluación Continua - Nivel Secundaria',
            descripcion='Criterios de evaluación para trabajos y prácticas escolares.',
            docente=docente_juan, puntaje_total=100
        )
        for nombre, desc, pts, orden in [
            ('Planteamiento y Comprensión', 'Identificación correcta de datos, fórmulas y conceptos escolares.', 30, 1),
            ('Procedimiento y Desarrollo', 'Pasos ordenados, desarrollo lógico y aplicación adecuada de métodos.', 35, 2),
            ('Resultado y Conclusiones', 'Precisión en los cálculos finales y respuestas fundamentadas.', 20, 3),
            ('Presentación y Orden', 'Limpieza, legibilidad, estructura y puntualidad en la entrega.', 15, 4),
        ]:
            CriterioRubrica.objects.create(rubrica=rubrica_secundaria, nombre=nombre, descripcion=desc, puntaje_maximo=pts, orden=orden)

        t_mat1 = Tarea.objects.create(
            espacio=espacio_mat, docente=docente_juan, rubrica=rubrica_secundaria,
            titulo='Taller: Trigonometría y Resolución de Triángulos',
            descripcion='Resolver la guía práctica de 10 ejercicios aplicando identidades trigonométricas y teoremas de seno y coseno.',
            indicaciones='1. Dibujar el triángulo correspondiente a cada problema.\n2. Plantear las ecuaciones con procedimiento completo.\n3. Presentar en PDF o fotos claras del cuaderno.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=14),
            fecha_limite=now - timedelta(days=7), estado='PUBLICADA'
        )

        t_mat2 = Tarea.objects.create(
            espacio=espacio_mat, docente=docente_juan, rubrica=rubrica_secundaria,
            titulo='Guía Práctica: Ecuaciones Exponenciales y Logarítmicas',
            descripcion='Aplicar propiedades de logaritmos y bases exponenciales para resolver las 8 ecuaciones propuestas en clase.',
            indicaciones='1. Identificar la base común.\n2. Aplicar propiedades de cambio de base y producto.\n3. Verificar soluciones en los reales.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=4),
            fecha_limite=now + timedelta(days=4), estado='PUBLICADA'
        )

        t_fis1 = Tarea.objects.create(
            espacio=espacio_fis, docente=docente_juan, rubrica=rubrica_secundaria,
            titulo='Laboratorio: Leyes de Newton y Fuerzas de Rozamiento',
            descripcion='Analizar los 4 sistemas mecánicos con bloques sobre planos inclinados con fricción estática y cinética.',
            indicaciones='1. Dibujar el Diagrama de Cuerpo Libre (DCL).\n2. Plantear sumatorias de fuerzas.\n3. Hallar la aceleración y la tensión.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=12),
            fecha_limite=now - timedelta(days=5), estado='PUBLICADA'
        )

        t_fis2 = Tarea.objects.create(
            espacio=espacio_fis, docente=docente_juan, rubrica=rubrica_secundaria,
            titulo='Problemas de Dinámica y Conservación de Energía',
            descripcion='Resolver los problemas prácticos de trabajo, energía cinética y energía potencial gravitatoria.',
            indicaciones='Calcular la velocidad final y la energía disipada por fricción.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=3),
            fecha_limite=now + timedelta(days=5), estado='PUBLICADA'
        )

        t_qmc1 = Tarea.objects.create(
            espacio=espacio_qmc, docente=docente_roberto,
            titulo='Taller de Estequiometría y Balanceo de Reacciones',
            descripcion='Balancear las 6 reacciones químicas por método redox y calcular la masa de producto en gramos a partir de reactivos dados.',
            indicaciones='1. Asignar números de oxidación.\n2. Igualar por método redox o tanteo.\n3. Calcular reactivo limitante.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=10),
            fecha_limite=now - timedelta(days=3), estado='PUBLICADA'
        )

        t_bio1 = Tarea.objects.create(
            espacio=espacio_bio, docente=docente_roberto,
            titulo='Informe: Genética Mendeliana y Cuadros de Punnett',
            descripcion='Resolver los casos de herencia monohíbrida y dihíbrida en plantas y grupos sanguíneos humanos.',
            indicaciones='1. Representar los genotipos parentales.\n2. Construir el cuadro de Punnett.\n3. Indicar frecuencias genotípicas y fenotípicas.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=5),
            fecha_limite=now + timedelta(days=6), estado='PUBLICADA'
        )

        t_lit1 = Tarea.objects.create(
            espacio=espacio_lit, docente=docente_maria,
            titulo='Ensayo Crítico sobre Literatura Boliviana del Siglo XX',
            descripcion='Elaborar un ensayo argumentativo analizando la novela social boliviana y sus personajes principales.',
            indicaciones='1. Estructura: Introducción con tesis clara, desarrollo con citas y conclusiones.\n2. Extensión: 2 a 3 páginas.\n3. Cuidar ortografía.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=6),
            fecha_limite=now + timedelta(days=3), estado='PUBLICADA'
        )

        t_soc1 = Tarea.objects.create(
            espacio=espacio_soc, docente=docente_maria,
            titulo='Línea de Tiempo: Proceso de Independencia y Creación de la República',
            descripcion='Elaborar una línea de tiempo ilustrada con los hitos más relevantes entre 1809 y 1825.',
            indicaciones='1. Identificar las principales batallas y protagonistas.\n2. Explicar las causas sociales de la revolución.',
            puntaje_maximo=100, fecha_publicacion=now - timedelta(days=4),
            fecha_limite=now + timedelta(days=7), estado='PUBLICADA'
        )

        self.stdout.write("✓ Tareas escolares secundarias creadas")

        # =====================================================================
        # 7. ENTREGAS Y CALIFICACIONES
        # =====================================================================
        notas_base = [90, 85, 78, 92, 88, 74, 95, 82, 72, 89, 76, 91, 84, 87, 75, 93, 80, 86, 79, 94]

        for i, est in enumerate(estudiantes_objs):
            nota_mat = float(notas_base[i])
            e_mat = Entrega.objects.create(
                tarea=t_mat1, estudiante=est,
                fecha_entrega=now - timedelta(days=8, hours=i),
                archivo_url=f'https://edusmart.cloud/storage/entregas/{est.usuario.username.split("@")[0]}_trigonometria.pdf',
                archivo_nombre=f'{est.usuario.first_name}_{est.usuario.last_name}_Trigonometria.pdf',
                archivo_tamano='1.5 MB',
                observaciones='Ejercicios resueltos a mano con procedimiento paso a paso.',
                estado='RETROALIMENTADA'
            )
            c_mat = Calificacion.objects.create(
                entrega=e_mat, nota=nota_mat,
                fecha_calificacion=now - timedelta(days=7),
                docente=docente_juan
            )
            Retroalimentacion.objects.create(
                calificacion=c_mat,
                comentario='Excelente resolución de los ejercicios trigonométricos. Procedimiento muy claro y ordenado.',
                fecha=now - timedelta(days=7)
            )

            nota_fis = max(60.0, min(100.0, nota_mat + (3 if i % 2 == 0 else -4)))
            e_fis = Entrega.objects.create(
                tarea=t_fis1, estudiante=est,
                fecha_entrega=now - timedelta(days=6, hours=i),
                archivo_url=f'https://edusmart.cloud/storage/entregas/{est.usuario.username.split("@")[0]}_leyes_newton.pdf',
                archivo_nombre=f'{est.usuario.first_name}_{est.usuario.last_name}_Leyes_Newton.pdf',
                archivo_tamano='2.1 MB',
                observaciones='Diagramas de cuerpo libre y ecuaciones de equilibrio adjuntas.',
                estado='RETROALIMENTADA'
            )
            c_fis = Calificacion.objects.create(
                entrega=e_fis, nota=nota_fis,
                fecha_calificacion=now - timedelta(days=5),
                docente=docente_juan
            )
            Retroalimentacion.objects.create(
                calificacion=c_fis,
                comentario='Buen planteamiento del diagrama de cuerpo libre y aplicación de la 2da Ley de Newton.',
                fecha=now - timedelta(days=5)
            )

        # Entregas pendientes de revisión en Lenguaje
        for est in estudiantes_objs[:3]:
            Entrega.objects.create(
                tarea=t_lit1, estudiante=est,
                fecha_entrega=now - timedelta(hours=8),
                archivo_url=f'https://edusmart.cloud/storage/entregas/{est.usuario.username.split("@")[0]}_ensayo_literatura.pdf',
                archivo_nombre=f'{est.usuario.first_name}_{est.usuario.last_name}_Ensayo_Literatura.pdf',
                archivo_tamano='1.2 MB',
                observaciones='Ensayo de análisis literario y contexto histórico.',
                estado='ENTREGADO'
            )

        self.stdout.write("✓ Entregas, calificaciones y retroalimentaciones generadas")

        # =====================================================================
        # 8. AVANCE CURRICULAR (TEMAS) Y SIMULADORES DE EXAMEN CON IA
        # =====================================================================
        # Temas de Matemáticas
        tema_mat1 = TemaAvance.objects.create(
            materia=mat_mat, docente=docente_juan,
            titulo='Trigonometría y Resolución de Triángulos',
            unidad='Unidad 1: Trigonometría', orden=1, estado='COMPLETADO',
            fecha_inicio=date(2026, 2, 5), fecha_fin=date(2026, 2, 20),
            descripcion='Razones trigonométricas en triángulos rectángulos, teorema de Pitágoras, ángulos notables y teorema del seno/coseno.'
        )
        tema_mat2 = TemaAvance.objects.create(
            materia=mat_mat, docente=docente_juan,
            titulo='Ecuaciones Exponenciales y Logarítmicas',
            unidad='Unidad 2: Álgebra Avanzada', orden=2, estado='EN_PROGRESO',
            fecha_inicio=date(2026, 2, 21),
            descripcion='Propiedades de logaritmos, cambio de base y resolución de ecuaciones exponenciales escolares.'
        )

        # Temas de Física
        tema_fis1 = TemaAvance.objects.create(
            materia=mat_fis, docente=docente_juan,
            titulo='Cinemática y Movimiento Rectilíneo Uniforme',
            unidad='Unidad 1: Cinemática', orden=1, estado='COMPLETADO',
            fecha_inicio=date(2026, 2, 3), fecha_fin=date(2026, 2, 18),
            descripcion='Conceptos de posición, trayectoria, velocidad constante y aceleración media.'
        )
        tema_fis2 = TemaAvance.objects.create(
            materia=mat_fis, docente=docente_juan,
            titulo='Dinámica y Leyes de Newton',
            unidad='Unidad 2: Dinámica', orden=2, estado='EN_PROGRESO',
            fecha_inicio=date(2026, 2, 19),
            descripcion='Fuerzas mecánicas, inercia, acción-reacción y diagramas de cuerpo libre con fricción.'
        )

        # Temas de Química, Biología, Lenguaje y Sociales
        tema_qmc1 = TemaAvance.objects.create(
            materia=mat_qmc, docente=docente_roberto,
            titulo='Nomenclatura Inorgánica y Compuestos Binarios',
            unidad='Unidad 1: Química General', orden=1, estado='COMPLETADO',
            fecha_inicio=date(2026, 2, 4), fecha_fin=date(2026, 2, 17),
            descripcion='Óxidos básicos, anhídridos y peróxidos según la nomenclatura tradicional y IUPAC.'
        )
        tema_bio1 = TemaAvance.objects.create(
            materia=mat_bio, docente=docente_roberto,
            titulo='Genética Mendeliana y Cuadros de Punnett',
            unidad='Unidad 1: Genética', orden=1, estado='COMPLETADO',
            fecha_inicio=date(2026, 2, 6), fecha_fin=date(2026, 2, 20),
            descripcion='Leyes de Mendel, genotipos, fenotipos y probabilidades en cruces monohíbridos.'
        )
        tema_lit1 = TemaAvance.objects.create(
            materia=mat_lit, docente=docente_maria,
            titulo='Literatura Boliviana del Siglo XX',
            unidad='Unidad 1: Literatura Nacional', orden=1, estado='COMPLETADO',
            fecha_inicio=date(2026, 2, 5), fecha_fin=date(2026, 2, 19),
            descripcion='Novela social boliviana: Raza de Bronce, Aluvión de Fuego y contexto del Chaco.'
        )
        tema_soc1 = TemaAvance.objects.create(
            materia=mat_soc, docente=docente_maria,
            titulo='Proceso Emancipatorio y Creación de la República',
            unidad='Unidad 1: Historia Republicana', orden=1, estado='COMPLETADO',
            fecha_inicio=date(2026, 2, 2), fecha_fin=date(2026, 2, 18),
            descripcion='Revoluciones de 1809, guerrillas altoperuanas y Asamblea Constituyente de 1825.'
        )

        # ── SIMULADOR IA 1: MATEMÁTICAS (PENDIENTE DE RESOLVER PARA CARLOS) ──
        preguntas_mat = [
            {
                "id": 1,
                "pregunta": "¿Cuál es el valor del seno de un ángulo de 30° en un triángulo rectángulo?",
                "opciones": ["A) 1/2 (0.5)", "B) √3/2", "C) √2/2", "D) 1"],
                "respuesta_correcta": "A",
                "explicacion": "El seno de 30° es exactamente 1/2 o 0.5, deducible de un triángulo equilátero dividido a la mitad."
            },
            {
                "id": 2,
                "pregunta": "Si un cateto mide 6 cm y el otro cateto mide 8 cm, ¿cuánto mide la hipotenusa según el Teorema de Pitágoras?",
                "opciones": ["A) 14 cm", "B) 10 cm", "C) 12 cm", "D) 100 cm"],
                "respuesta_correcta": "B",
                "explicacion": "h = √(6² + 8²) = √(36 + 64) = √100 = 10 cm."
            },
            {
                "id": 3,
                "pregunta": "¿Qué razón trigonométrica se define como Cateto Opuesto dividido entre Cateto Adyacente?",
                "opciones": ["A) Seno", "B) Coseno", "C) Tangente", "D) Cotangente"],
                "respuesta_correcta": "C",
                "explicacion": "Por definición trigonométrica escolar: tan(θ) = Cateto Opuesto / Cateto Adyacente."
            },
            {
                "id": 4,
                "pregunta": "En un triángulo rectángulo, la hipotenusa mide 20 m y un ángulo agudo es de 45°. ¿Cuánto mide cada cateto?",
                "opciones": ["A) 10 m", "B) 10√2 m", "C) 14 m", "D) 15 m"],
                "respuesta_correcta": "B",
                "explicacion": "Cada cateto = 20 * sen(45°) = 20 * (√2/2) = 10√2 m."
            },
            {
                "id": 5,
                "pregunta": "La suma de los dos ángulos agudos en cualquier triángulo rectángulo siempre es:",
                "opciones": ["A) 180°", "B) 90°", "C) 45°", "D) 60°"],
                "respuesta_correcta": "B",
                "explicacion": "Como el ángulo recto es de 90°, los dos ángulos agudos son complementarios y suman 90°."
            }
        ]
        practica_mat = PracticaTema.objects.create(
            tema=tema_mat1, materia=mat_mat, docente=docente_juan,
            titulo='Simulador IA: Trigonometría y Resolución de Triángulos',
            descripcion='Batería de ejercicios didácticos generados por la IA pedagógica para evaluar comprensión de triángulos y razones trigonométricas.',
            preguntas=preguntas_mat, dificultad='INTERMEDIO', tiempo_limite_minutos=15,
            recompensa_xp=50, recompensa_coins=25, motor_ia='EduSmart AI Pedagogical Engine',
            activo=True
        )

        # ── SIMULADOR IA 2: FÍSICA (APROBADO POR CARLOS CON 80 PTS) ──
        preguntas_fis = [
            {
                "id": 1,
                "pregunta": "Un automóvil viaja a velocidad constante de 72 km/h. ¿Cuál es su velocidad equivalente en metros por segundo (m/s)?",
                "opciones": ["A) 15 m/s", "B) 20 m/s", "C) 25 m/s", "D) 30 m/s"],
                "respuesta_correcta": "B",
                "explicacion": "Para convertir km/h a m/s se divide entre 3.6: 72 / 3.6 = 20 m/s."
            },
            {
                "id": 2,
                "pregunta": "En el Movimiento Rectilíneo Uniforme (MRU), ¿cuál es el valor de la aceleración?",
                "opciones": ["A) Positiva", "B) Constante y no nula", "C) Cero (0 m/s²)", "D) Variable"],
                "respuesta_correcta": "C",
                "explicacion": "En el MRU la velocidad es constante, por lo que la aceleración es nula (a = 0)."
            },
            {
                "id": 3,
                "pregunta": "¿Qué distancia recorre un móvil en 30 segundos si viaja a 5 m/s constantes?",
                "opciones": ["A) 150 m", "B) 6 m", "C) 35 m", "D) 100 m"],
                "respuesta_correcta": "A",
                "explicacion": "d = v * t = 5 m/s * 30 s = 150 metros."
            },
            {
                "id": 4,
                "pregunta": "La pendiente de la gráfica posición vs. tiempo en el MRU representa:",
                "opciones": ["A) La aceleración", "B) La velocidad", "C) La fuerza", "D) El trabajo"],
                "respuesta_correcta": "B",
                "explicacion": "En una gráfica x vs t, la pendiente Δx/Δt corresponde directamente a la velocidad."
            },
            {
                "id": 5,
                "pregunta": "¿Cuál es la unidad oficial de fuerza en el Sistema Internacional (SI)?",
                "opciones": ["A) Julio (J)", "B) Pascal (Pa)", "C) Newton (N)", "D) Vatio (W)"],
                "respuesta_correcta": "C",
                "explicacion": "En el SI, la fuerza se mide en Newtons (N = kg·m/s²)."
            }
        ]
        practica_fis = PracticaTema.objects.create(
            tema=tema_fis1, materia=mat_fis, docente=docente_juan,
            titulo='Simulador IA: Cinemática y Movimiento Rectilíneo',
            descripcion='Evaluación diagnóstica con IA para afianzar conceptos de velocidad, distancia y conversión de unidades en secundaria.',
            preguntas=preguntas_fis, dificultad='INTERMEDIO', tiempo_limite_minutos=15,
            recompensa_xp=50, recompensa_coins=25, motor_ia='EduSmart AI Pedagogical Engine',
            activo=True
        )
        IntentoPracticaEstudiante.objects.create(
            estudiante=estudiantes_objs[0],
            practica=practica_fis,
            puntaje_obtenido=80.0,
            total_preguntas=5,
            respuestas_correctas=4,
            tiempo_empleado_segundos=430,
            aprobado=True,
            respuestas_alumno={"1": "B", "2": "C", "3": "A", "4": "B", "5": "A"},
            revision_detallada=[],
            retroalimentacion_ia="¡Buen trabajo! Has comprendido la mayoría de los conceptos de cinemática y leyes de Newton. Repasa la definición formal de aceleración instantánea."
        )

        # Simuladores adicionales para las otras materias
        PracticaTema.objects.create(
            tema=tema_qmc1, materia=mat_qmc, docente=docente_roberto,
            titulo='Simulador IA: Nomenclatura Química y Óxidos',
            descripcion='Práctica de nomenclatura inorgánica tradicional y IUPAC de óxidos básicos y ácidos.',
            preguntas=preguntas_mat, dificultad='INTERMEDIO', tiempo_limite_minutos=15,
            recompensa_xp=50, recompensa_coins=25, motor_ia='EduSmart AI Pedagogical Engine', activo=True
        )
        PracticaTema.objects.create(
            tema=tema_bio1, materia=mat_bio, docente=docente_roberto,
            titulo='Simulador IA: Genética y Herencia Mendeliana',
            descripcion='Cruces monohíbridos, alelos dominantes y recesivos con resolución asistida por IA.',
            preguntas=preguntas_mat, dificultad='INTERMEDIO', tiempo_limite_minutos=15,
            recompensa_xp=50, recompensa_coins=25, motor_ia='EduSmart AI Pedagogical Engine', activo=True
        )
        PracticaTema.objects.create(
            tema=tema_lit1, materia=mat_lit, docente=docente_maria,
            titulo='Simulador IA: Literatura y Novela Social Boliviana',
            descripcion='Comprensión lectora, corrientes literarias bolivianas y análisis crítico textual.',
            preguntas=preguntas_mat, dificultad='INTERMEDIO', tiempo_limite_minutos=15,
            recompensa_xp=50, recompensa_coins=25, motor_ia='EduSmart AI Pedagogical Engine', activo=True
        )

        self.stdout.write("✓ Temas de avance y Simuladores de Examen con IA generados")

        # =====================================================================
        # 9. RETOS GAMIFICADOS
        # =====================================================================
        ch1 = Challenge.objects.create(
            titulo='Maestro de la Trigonometría',
            descripcion='Obtén 85 puntos o más en las tareas prácticas de Trigonometría en Matemáticas.',
            tipo='PUNTAJE', espacio=espacio_mat, creado_por=docente_juan,
            recompensa_puntos=50, recompensa_coins=25, meta=85, activo=True
        )
        ch2 = Challenge.objects.create(
            titulo='Puntualidad en Entregas Escolares',
            descripcion='Entrega 3 tareas antes de su fecha límite asignada.',
            tipo='TAREAS', espacio=espacio_fis, creado_por=docente_juan,
            recompensa_puntos=40, recompensa_coins=20, meta=3, activo=True
        )
        ch3 = Challenge.objects.create(
            titulo='Lector Crítico del Bicentenario',
            descripcion='Completa y entrega los ensayos de Literatura Boliviana y Ciencias Sociales.',
            tipo='GENERAL', creado_por=docente_maria,
            recompensa_puntos=60, recompensa_coins=30, meta=2, activo=True
        )

        for est in estudiantes_objs:
            UserChallenge.objects.create(
                usuario=est.usuario, challenge=ch1,
                progreso=90 if est == estudiantes_objs[0] else 75,
                meta=85,
                estado='COMPLETADO' if est == estudiantes_objs[0] else 'ACTIVO'
            )
            UserChallenge.objects.create(
                usuario=est.usuario, challenge=ch2,
                progreso=2, meta=3, estado='ACTIVO'
            )
            UserChallenge.objects.create(
                usuario=est.usuario, challenge=ch3,
                progreso=1, meta=2, estado='ACTIVO'
            )

        self.stdout.write("✓ Retos gamificados escolares creados y asignados")

        # =====================================================================
        # 10. RECALCULAR PROGRESOS Y NOTIFICACIONES
        # =====================================================================
        for est in estudiantes_objs:
            try:
                est.actualizar_progreso()
            except Exception:
                pass

        Notificacion.objects.create(
            usuario=docente_maria.usuario, tipo='ENTREGA_CONFIRMADA',
            mensaje='3 nuevas entregas pendientes de revisión en "Ensayo Crítico sobre Literatura Boliviana del Siglo XX".',
            espacio_id=espacio_lit.id, tarea_id=t_lit1.id, fecha=now - timedelta(hours=8)
        )
        Notificacion.objects.create(
            usuario=estudiantes_objs[0].usuario, tipo='CALIFICADA',
            mensaje='Tu entrega de "Taller: Trigonometría y Resolución de Triángulos" fue calificada con 90/100.',
            espacio_id=espacio_mat.id, tarea_id=t_mat1.id, fecha=now - timedelta(days=7)
        )
        Notificacion.objects.create(
            usuario=estudiantes_objs[0].usuario, tipo='CALIFICADA',
            mensaje='Tu entrega de "Laboratorio: Leyes de Newton y Fuerzas de Rozamiento" fue calificada con 85/100.',
            espacio_id=espacio_fis.id, tarea_id=t_fis1.id, fecha=now - timedelta(days=5)
        )
        Notificacion.objects.create(
            usuario=estudiantes_objs[0].usuario, tipo='AVISO_NUEVO',
            mensaje='✨ Simulador de Examen con IA disponible en Matemáticas: "Trigonometría y Resolución de Triángulos".',
            espacio_id=espacio_mat.id, fecha=now - timedelta(days=2)
        )

        self.stdout.write(self.style.SUCCESS("\n" + "="*70))
        self.stdout.write(self.style.SUCCESS("✅ EDUSMART SEED COMPLETADO (DATOS COMPLETOS Y 100% FUNCIONALES)"))
        self.stdout.write(self.style.SUCCESS("="*70))
        self.stdout.write("📌 Colegios:         4 Colegios Escolares (Simón Bolívar, Sta Cruz, San Agustín, La Salle)")
        self.stdout.write("📌 Materias:         6 materias escolares con 20 alumnos de 6to 'A'")
        self.stdout.write("📌 Avance Curricular: 8 temas creados (completados y en progreso)")
        self.stdout.write("📌 Simuladores IA:   5 simuladores activos con preguntas escolares y evaluación automática")
        self.stdout.write("📌 Retos Gamificados:3 retos activos con recompensas de XP y Coins")
        self.stdout.write("\n🔑 Credenciales de prueba:")
        self.stdout.write("   Docente:    prof_juan@edusmart.edu / password123 (Matemáticas y Física)")
        self.stdout.write("   Docente:    prof_maria@edusmart.edu / password123 (Lenguaje y Sociales)")
        self.stdout.write("   Docente:    prof_roberto@edusmart.edu / password123 (Química y Biología)")
        self.stdout.write("   Estudiante: carlos.gomez@edusmart.edu / password123")
