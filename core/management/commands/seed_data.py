from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import (
    Usuario, Docente, Estudiante, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion, Rubrica, CriterioRubrica
)

class Command(BaseCommand):
    help = 'Poblar la base de datos de EDUSMART con datos académicos representativos'

    def add_arguments(self, parser):
        parser.add_argument('--if-empty', action='store_true', help='Only seed if database has no users')

    def handle(self, *args, **options):
        if options.get('if_empty') and Usuario.objects.exists():
            self.stdout.write(self.style.SUCCESS("La base de datos ya contiene datos. Omitiendo seed."))
            return

        self.stdout.write("Poblando datos de EDUSMART (Docente y Estudiante)...")

        # Clear existing data safely
        Usuario.objects.all().delete()
        Espacio.objects.all().delete()
        Rubrica.objects.all().delete()

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

        # Espacio Oficial: Análisis Numérico 2026 (Sección 9.8 del informe académico)
        espacio_an = Espacio.objects.create(
            nombre='Análisis Numérico 2026',
            descripcion='Cálculo de raíces no lineales, sistemas de ecuaciones lineales, interpolación, integración numérica y resolución de EDOs.',
            codigo='AN2026',
            docente=docente_juan,
            color='#0284C7',
            icono='sigma',
            imagen_url='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'
        )

        # Inscribir estudiantes en los espacios
        for est in [estudiante_carlos, estudiante_ana, estudiante_david]:
            MiembroEspacio.objects.create(espacio=espacio_bd, estudiante=est)
            MiembroEspacio.objects.create(espacio=espacio_prog, estudiante=est)
            MiembroEspacio.objects.create(espacio=espacio_ads, estudiante=est)
            MiembroEspacio.objects.create(espacio=espacio_an, estudiante=est)

        # Inscribir a Carlos y Ana en Investigación Operativa
        MiembroEspacio.objects.create(espacio=espacio_io, estudiante=estudiante_carlos)
        MiembroEspacio.objects.create(espacio=espacio_io, estudiante=estudiante_ana)

        # Rúbrica oficial de Análisis Numérico (4 criterios: 30, 30, 20, 20 = 100 pts)
        rubrica_an = Rubrica.objects.create(
            nombre='Rúbrica de Evaluación de Métodos Numéricos',
            descripcion='Rúbrica estándar de cuatro criterios pedagógicos para evaluación de problemas numéricos.',
            docente=docente_juan,
            puntaje_total=100
        )
        CriterioRubrica.objects.create(
            rubrica=rubrica_an,
            nombre='Planteamiento y fórmula',
            descripcion='Definición correcta de la función, intervalo de búsqueda, condiciones iniciales y fórmulas matemáticas aplicadas.',
            puntaje_maximo=30,
            orden=1
        )
        CriterioRubrica.objects.create(
            rubrica=rubrica_an,
            nombre='Desarrollo y procedimiento',
            descripcion='Iteraciones sucesivas paso a paso, cálculos aritméticos correctos y control tabular del procedimiento.',
            puntaje_maximo=30,
            orden=2
        )
        CriterioRubrica.objects.create(
            rubrica=rubrica_an,
            nombre='Resultado y error',
            descripcion='Valor numérico aproximado final y cálculo del error absoluto, relativo o estimación de cota.',
            puntaje_maximo=20,
            orden=3
        )
        CriterioRubrica.objects.create(
            rubrica=rubrica_an,
            nombre='Interpretación',
            descripcion='Análisis de la convergencia del método, comparación con el valor analítico y comportamiento del error.',
            puntaje_maximo=20,
            orden=4
        )

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

        # ---------------------------------------------------------------------
        # TAREAS DE ANÁLISIS NUMÉRICO 2026 (Sección 9.8 del informe académico)
        # ---------------------------------------------------------------------
        # T1: Raíces de Ecuaciones No Lineales
        t_an1 = Tarea.objects.create(
            espacio=espacio_an,
            docente=docente_juan,
            rubrica=rubrica_an,
            titulo='T1: Raíces - Bisección y Newton-Raphson',
            descripcion='Hallar la raíz de f(x) = x³ - x - 2 en [1, 2] con 4 iteraciones de Bisección, y con Newton-Raphson (x₀=1.5, 3 iteraciones).',
            indicaciones='1. Método de Bisección: aplicar la fórmula c=(a+b)/2 y cota de error Emax=(b-a)/2^n.\n2. Método de Newton-Raphson: calcular x_(n+1) = x_n - f(x_n)/f\'(x_n).\n3. Presentar tablas de iteraciones y cálculo del error.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=15),
            fecha_limite=now - timedelta(days=7),
            estado='PUBLICADA'
        )
        Material.objects.create(
            tarea=t_an1,
            nombre='Guia_Raices_No_Lineales.pdf',
            tipo='PDF',
            archivo_url='https://edusmart.cloud/resources/an/guia_raices.pdf',
            tamano='1.5 MB'
        )

        # T2: Sistemas de Ecuaciones Lineales
        t_an2 = Tarea.objects.create(
            espacio=espacio_an,
            docente=docente_juan,
            rubrica=rubrica_an,
            titulo='T2: Sistemas Lineales - Eliminación de Gauss',
            descripcion='Resolver el sistema 3x3: 2x + y + z = 7; x + 3y + 2z = 13; 3x + y + 4z = 17 mediante matriz escalonada y sustitución regresiva.',
            indicaciones='1. Multiplicadores m_ij = a_ij / a_jj.\n2. Operaciones entre filas F_i <- F_i - m_ij * F_j.\n3. Obtener el vector solución (x, y, z) exacto.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=11),
            fecha_limite=now - timedelta(days=4),
            estado='PUBLICADA'
        )

        # T3: Interpolación y Ajuste de Curvas
        t_an3 = Tarea.objects.create(
            espacio=espacio_an,
            docente=docente_juan,
            rubrica=rubrica_an,
            titulo='T3: Interpolación - Lagrange y Extrapolación Lineal',
            descripcion='Estimar f(1.5) con puntos (0, 1), (1, 3) y (2, 7) mediante Polinomio de Lagrange, y aproximar ln(8) por extrapolación lineal.',
            indicaciones='1. Construir las bases L_i(x) y el polinomio interpolador P(x).\n2. Calcular f(1.5) y contrastar con P(x)=x²+x+1.\n3. Analizar la sobreestimación de la extrapolación.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=7),
            fecha_limite=now - timedelta(days=2),
            estado='PUBLICADA'
        )

        # T4: Integración Numérica
        t_an4 = Tarea.objects.create(
            espacio=espacio_an,
            docente=docente_juan,
            rubrica=rubrica_an,
            titulo='T4: Integración - Regla del Trapecio y Simpson 1/3',
            descripcion='Calcular la integral definida de f(x)=x² dx en [0, 2] con n=4 y paso h=0.5. Comparar con el valor exacto (8/3 ≈ 2.6667).',
            indicaciones='1. Regla del Trapecio compuesta con n=4 y cálculo del error.\n2. Regla de Simpson 1/3 compuesta.\n3. Comparar exactitud de ambos métodos.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=3),
            fecha_limite=now + timedelta(days=4),
            estado='PUBLICADA'
        )

        # T5: Ecuaciones Diferenciales Ordinarias
        t_an5 = Tarea.objects.create(
            espacio=espacio_an,
            docente=docente_juan,
            rubrica=rubrica_an,
            titulo='T5: EDO - Método de Euler',
            descripcion='Resolver y\' = x + y, con y(0) = 1 y paso h = 0.1 hasta x = 0.3 mediante Método de Euler. Contrastar con y = 2e^x - x - 1.',
            indicaciones='1. Iteración y_(n+1) = y_n + h * f(x_n, y_n).\n2. Tabla con x_n, y_n (Euler), y exacta y error absoluto.\n3. Explicar el crecimiento del error por paso.',
            puntaje_maximo=100,
            fecha_publicacion=now - timedelta(days=1),
            fecha_limite=now + timedelta(days=7),
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

        # ---------------------------------------------------------------------
        # ENTREGAS ANÁLISIS NUMÉRICO (Tabla 14 y Sección 9.9 del informe)
        # Carlos Gómez: 5 publicadas, 4 entregadas, 3 calificadas (85, 70, 90) -> Promedio 81.7
        # ---------------------------------------------------------------------
        # T1: Calificada con 85/100
        e_an1 = Entrega.objects.create(
            tarea=t_an1,
            estudiante=estudiante_carlos,
            fecha_entrega=now - timedelta(days=8),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_an_t1.pdf',
            archivo_nombre='CarlosGomez_T1_Raices_Biseccion_Newton.pdf',
            archivo_tamano='1.8 MB',
            observaciones='Entrego 4 iteraciones de Bisección (c4=1.5625) y 3 iteraciones de Newton-Raphson (x3≈1.52138).',
            estado='RETROALIMENTADA'
        )
        c_an1 = Calificacion.objects.create(
            entrega=e_an1,
            nota=85.0,
            fecha_calificacion=now - timedelta(days=7),
            docente=docente_juan
        )
        Retroalimentacion.objects.create(
            calificacion=c_an1,
            comentario='Excelente desarrollo de Bisección y Newton-Raphson. La convergencia cuadrática está muy bien ilustrada. Cuidar el redondeo en la cota de error.',
            fecha=now - timedelta(days=7)
        )

        # T2: Calificada con 70/100
        e_an2 = Entrega.objects.create(
            tarea=t_an2,
            estudiante=estudiante_carlos,
            fecha_entrega=now - timedelta(days=5),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_an_t2.pdf',
            archivo_nombre='CarlosGomez_T2_Eliminacion_Gauss.pdf',
            archivo_tamano='1.5 MB',
            observaciones='Matriz escalonada y sustitución regresiva paso a paso.',
            estado='RETROALIMENTADA'
        )
        c_an2 = Calificacion.objects.create(
            entrega=e_an2,
            nota=70.0,
            fecha_calificacion=now - timedelta(days=4),
            docente=docente_juan
        )
        Retroalimentacion.objects.create(
            calificacion=c_an2,
            comentario='El escalonamiento de la matriz es correcto. Sin embargo, hubo un desliz de signo en el cálculo de z en la sustitución regresiva que afectó el resultado intermedio. El vector solución es (1, 2, 3).',
            fecha=now - timedelta(days=4)
        )

        # T3: Calificada con 90/100
        e_an3 = Entrega.objects.create(
            tarea=t_an3,
            estudiante=estudiante_carlos,
            fecha_entrega=now - timedelta(days=3),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_an_t3.pdf',
            archivo_nombre='CarlosGomez_T3_Lagrange_Extrapolacion.pdf',
            archivo_tamano='2.1 MB',
            observaciones='Polinomio de Lagrange P(x)=x²+x+1 y cálculo de ln(8) con análisis del error.',
            estado='RETROALIMENTADA'
        )
        c_an3 = Calificacion.objects.create(
            entrega=e_an3,
            nota=90.0,
            fecha_calificacion=now - timedelta(days=2),
            docente=docente_juan
        )
        Retroalimentacion.objects.create(
            calificacion=c_an3,
            comentario='Trabajo impecable. Muy buena justificación de por qué la extrapolación lineal sobreestima el valor exacto de ln(8).',
            fecha=now - timedelta(days=2)
        )

        # T4: Entregada por Carlos (En revisión)
        Entrega.objects.create(
            tarea=t_an4,
            estudiante=estudiante_carlos,
            fecha_entrega=now - timedelta(hours=6),
            archivo_url='https://edusmart.cloud/storage/entregas/carlos_an_t4.pdf',
            archivo_nombre='CarlosGomez_T4_Trapecio_Simpson.pdf',
            archivo_tamano='1.7 MB',
            observaciones='Se adjuntan los cálculos de Trapecio (2.75) y Simpson 1/3 (2.6667) con sus respectivos errores.',
            estado='ENTREGADO'
        )

        # Ana Flores también entrega T1 y T2
        e_an1_ana = Entrega.objects.create(
            tarea=t_an1,
            estudiante=estudiante_ana,
            fecha_entrega=now - timedelta(days=8),
            archivo_url='https://edusmart.cloud/storage/entregas/ana_an_t1.pdf',
            archivo_nombre='AnaFlores_T1_Raices.pdf',
            archivo_tamano='2.0 MB',
            observaciones='Entrega completa con gráficas.',
            estado='RETROALIMENTADA'
        )
        c_an1_ana = Calificacion.objects.create(
            entrega=e_an1_ana,
            nota=95.0,
            fecha_calificacion=now - timedelta(days=7),
            docente=docente_juan
        )
        Retroalimentacion.objects.create(
            calificacion=c_an1_ana,
            comentario='Excelente desarrollo analítico y numérico.',
            fecha=now - timedelta(days=7)
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

        # Crear superusuario para acceso a Django Admin
        if not Usuario.objects.filter(username='admin').exists():
            Usuario.objects.create_superuser(
                username='admin',
                email='admin@edusmart.edu',
                password='adminpassword123',
                first_name='Admin',
                last_name='EduSmart',
                rol='DOCENTE'
            )
            self.stdout.write(self.style.SUCCESS("Superusuario creado: admin / adminpassword123"))

        self.stdout.write(self.style.SUCCESS("¡Base de datos EDUSMART inicializada exitosamente!"))
        self.stdout.write("Superusuario: admin / adminpassword123")
        self.stdout.write("Docente: prof_juan@edusmart.edu / password123")
        self.stdout.write("Estudiante: carlos.gomez@edusmart.edu / password123")
