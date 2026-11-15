import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edusmart_config.settings')
django.setup()

from core.models import (
    Usuario, Docente, Estudiante, DocenteColegio,
    Colegio, Curso, Materia, Espacio, MiembroEspacio,
    EstudianteCurso, Tarea, Entrega, Calificacion
)

# ── Colegios en Bolivia ──────────────────────────────────────────
COLEGIOS_BOLIVIA = [
    {
        'nombre': 'Colegio Don Bosco',
        'ciudad': 'La Paz', 'pais': 'Bolivia',
        'direccion': 'Av. 16 de Julio (El Prado) N° 1890',
        'color': '#1E3A8A'
    },
    {
        'nombre': 'Unidad Educativa San Calixto',
        'ciudad': 'La Paz', 'pais': 'Bolivia',
        'direccion': 'Calle Pichincha esq. Indaburo',
        'color': '#065F46'
    },
    {
        'nombre': 'Colegio Nacional Simón Bolívar',
        'ciudad': 'Oruro', 'pais': 'Bolivia',
        'direccion': 'Calle Murguía y Presidente Montes',
        'color': '#7C2D12'
    },
    {
        'nombre': 'Unidad Educativa República de Francia',
        'ciudad': 'La Paz', 'pais': 'Bolivia',
        'direccion': 'Zona Central, Calle Potosí',
        'color': '#4338CA'
    },
]

# ── Cursos Sistema Educativo Plurinacional de Bolivia ────────────
GRADOS_BOLIVIA = {
    'Primaria': [
        '1ro de Primaria',
        '2do de Primaria',
        '3ro de Primaria',
        '4to de Primaria',
        '5to de Primaria',
        '6to de Primaria',
    ],
    'Secundaria': [
        '1ro de Secundaria',
        '2do de Secundaria',
        '3ro de Secundaria',
        '4to de Secundaria',
        '5to de Secundaria',
        '6to de Secundaria',
    ],
}

MATERIAS_BOLIVIA = {
    'Primaria': [
        ('Lenguaje y Comunicación', 4),
        ('Matemática', 5),
        ('Ciencias Naturales', 3),
        ('Ciencias Sociales', 3),
        ('Artes Plásticas y Visuales', 2),
    ],
    'Secundaria': [
        ('Matemática', 5),
        ('Lengua Castellana y Originaria', 4),
        ('Física - Química', 4),
        ('Biología - Geografía', 3),
        ('Ciencias Sociales', 3),
        ('Filosofía y Psicología', 2),
    ],
}

TAREAS_EJEMPLO = {
    'Matemática': [
        ('Práctica de Factorización y Productos Notables', 'Resolver los ejercicios del texto oficial de secundaria págs. 54-62.'),
        ('Evaluación de Trigonometría y Teorema de Pitágoras', 'Aplicar funciones trigonométricas a problemas reales de medición.'),
    ],
    'Lengua Castellana y Originaria': [
        ('Análisis Literario: Raza de Bronce', 'Elaborar un ensayo sobre el contexto sociopolítico e indigenista de la obra.'),
        ('Composición y Redacción de Ensayos Argumentativos', 'Redactar un ensayo de 3 páginas con normas APA sobre la diversidad lingüística.'),
    ],
    'Física - Química': [
        ('Informe Experimental: Leyes de Newton y Dinámica', 'Presentar el informe de laboratorio con datos, gráficos y conclusiones.'),
        ('Nomenclatura Química Inorgánica y Reacciones', 'Resolver la guía de óxidos, hidróxidos y sales oxisales balanceadas.'),
    ],
    'Biología - Geografía': [
        ('Informe: Biodiversidad en los Pisos Ecológicos de Bolivia', 'Investigar flora y fauna de Altiplano, Valles y Llanos orientales.'),
        ('Mapa Conceptual: La Célula y la Genética Mendeliana', 'Elaborar un mapa conceptual detallando la estructura celular y ADN.'),
    ],
    'Ciencias Sociales': [
        ('Línea de Tiempo: La Guerra del Chaco y del Pacífico', 'Identificar los hechos históricos, causas, tratados y consecuencias.'),
        ('Ensayo: Constitución Política del Estado Plurinacional', 'Analizar los derechos y deberes fundamentales establecidos en la CPE.'),
    ],
    'Filosofía y Psicología': [
        ('Ensayo: Corrientes del Pensamiento Filosófico', 'Diferenciar entre racionalismo, empirismo y pensamiento andino.'),
        ('Exposición de Procesos Cognitivos y Memoria', 'Elaborar resumen sobre atención, percepción y memoria humana.'),
    ],
    'Lenguaje y Comunicación': [
        ('Lectura Comprensiva y Fichas de Resumen', 'Leer el cuento asignado y completar la ficha de vocabulario y resumen.'),
        ('Taller de Ortografía y Signos de Puntuación', 'Resolver las actividades de acentuación diacrítica y uso de la coma.'),
    ],
    'Ciencias Naturales': [
        ('Álbum de Animales Vertebrados e Invertebrados', 'Presentar un álbum ilustrado con clasificación de especies autóctonas.'),
        ('Experimento: Estados de la Materia y el Ciclo del Agua', 'Documentar con fotografías los cambios de estado observados.'),
    ],
    'Artes Plásticas y Visuales': [
        ('Dibujo Técnico: Proyecciones y Geometría Básica', 'Trazar polígonos regulares utilizando compás, escuadra y regla.'),
        ('Lámina de Teoría del Color y Círculo Cromático', 'Pintar el círculo cromático con témperas mostrando colores primarios y secundarios.'),
    ],
}

APELLIDOS_BOLIVIA = [
    'Mamani', 'Quispe', 'Condori', 'Choque', 'Flores', 'Vargas', 'Rojas', 'Gutiérrez',
    'Morales', 'Fernández', 'López', 'Rodríguez', 'Pérez', 'García', 'Mendoza', 'Sánchez',
    'Cruz', 'Aruquipa', 'Huanca', 'Torrico', 'Camacho', 'Suárez', 'Paredes', 'Villavicencio',
]

NOMBRES_BOLIVIA = [
    'Alejandro', 'Valentina', 'Mateo', 'Camila', 'Joaquín', 'Lucía', 'Gabriel', 'Martina',
    'Santiago', 'Valeria', 'Sebastián', 'Renata', 'Diego', 'Isabella', 'Rodrigo', 'Daniela',
    'Nicolás', 'Mariana', 'Carlos', 'Sofía', 'Felipe', 'Elena', 'Andrés', 'Gabriela',
]

def run():
    print("=== ADAPTANDO SISTEMA A FORMACIÓN ACADÉMICA DE BOLIVIA ===")
    
    docente_user = Usuario.objects.filter(rol='DOCENTE').first()
    if not docente_user:
        print("ERROR: No se encontró docente principal.")
        return

    docente = docente_user.perfil_docente if hasattr(docente_user, 'perfil_docente') else Docente.objects.create(
        usuario=docente_user, especialidad='Educación Secundaria y Primaria', titulo_academico='Licenciado en Ciencias de la Educación'
    )

    now = timezone.now()
    student_index = 0

    # 1. Limpiar cursos y materias antiguas que no corresponden al modelo boliviano
    print("Sincronizando colegios de Bolivia...")
    colegios_creados = []
    for col_info in COLEGIOS_BOLIVIA:
        col, _ = Colegio.objects.get_or_create(
            nombre=col_info['nombre'],
            defaults={
                'ciudad': col_info['ciudad'],
                'pais': 'Bolivia',
                'direccion': col_info['direccion'],
                'color': col_info['color']
            }
        )
        col.pais = 'Bolivia'
        col.ciudad = col_info['ciudad']
        col.direccion = col_info['direccion']
        col.color = col_info['color']
        col.save()
        DocenteColegio.objects.get_or_create(docente=docente, colegio=col, defaults={'cargo': 'Docente Titular'})
        colegios_creados.append(col)

    # También actualizar los colegios ya existentes para que el país sea Bolivia
    for c in Colegio.objects.all():
        if c.pais != 'Bolivia':
            c.pais = 'Bolivia'
            if not c.ciudad:
                c.ciudad = 'La Paz'
            c.save()

    print(f"Colegios configurados: {[c.nombre for c in colegios_creados]}")

    # 2. Configurar cursos de Primaria (1ro a 6to) y Secundaria (1ro a 6to)
    for col in colegios_creados:
        print(f"\nGenerando estructura boliviana para: {col.nombre}")

        # Crear Secundaria: 1ro a 6to de Secundaria (Paralelo A)
        for grado_sec in GRADOS_BOLIVIA['Secundaria']:
            curso_sec, _ = Curso.objects.get_or_create(
                colegio=col, grado=grado_sec, paralelo='A',
                defaults={
                    'nombre': f"{grado_sec} \"A\"",
                    'nivel': 'Educación Secundaria Comunitaria Productiva',
                    'anio_lectivo': '2026'
                }
            )
            curso_sec.nombre = f"{grado_sec} \"A\""
            curso_sec.nivel = 'Educación Secundaria Comunitaria Productiva'
            curso_sec.anio_lectivo = '2026'
            curso_sec.save()

            # Asegurar 12 estudiantes por curso con código RUDE boliviano
            estudiantes_curso = []
            for i in range(12):
                fn = NOMBRES_BOLIVIA[student_index % len(NOMBRES_BOLIVIA)]
                ln1 = APELLIDOS_BOLIVIA[student_index % len(APELLIDOS_BOLIVIA)]
                ln2 = APELLIDOS_BOLIVIA[(student_index + 3) % len(APELLIDOS_BOLIVIA)]
                rude = f"RUDE-{col.id:02d}{curso_sec.id:02d}-{student_index:04d}"
                uname = f"{fn.lower()}.{ln1.lower()}{student_index}@edusmart.bo"
                student_index += 1

                user, created_u = Usuario.objects.get_or_create(
                    username=uname,
                    defaults={
                        'email': uname,
                        'first_name': fn,
                        'last_name': f"{ln1} {ln2}",
                        'rol': 'ESTUDIANTE',
                        'estado': 'ACTIVO'
                    }
                )
                if created_u:
                    user.set_password('password123')
                    user.save()

                est, _ = Estudiante.objects.get_or_create(usuario=user)
                EstudianteCurso.objects.get_or_create(
                    estudiante=est, curso=curso_sec,
                    defaults={'codigo_ru': rude}
                )
                estudiantes_curso.append(est)

            # Materias de secundaria
            materias_sec = MATERIAS_BOLIVIA['Secundaria'][:3] # 3 materias por curso
            for mat_nombre, horas in materias_sec:
                materia, _ = Materia.objects.get_or_create(
                    curso=curso_sec, nombre=mat_nombre,
                    defaults={'docente': docente, 'horas_semanales': horas}
                )
                codigo_esp = f"{col.id}{curso_sec.id}{materia.id}"
                espacio, _ = Espacio.objects.get_or_create(
                    materia=materia,
                    defaults={
                        'nombre': f"{mat_nombre} - {grado_sec} \"A\"",
                        'codigo': f"BOL-{codigo_esp}",
                        'docente': docente,
                        'colegio': col,
                        'curso': curso_sec,
                        'color': col.color
                    }
                )

                for est in estudiantes_curso:
                    MiembroEspacio.objects.get_or_create(espacio=espacio, estudiante=est)

                # Tareas de ejemplo sobre 100 puntos
                tareas_data = TAREAS_EJEMPLO.get(mat_nombre, [])
                for idx_t, (titulo, desc) in enumerate(tareas_data):
                    tarea, created_t = Tarea.objects.get_or_create(
                        titulo=titulo, espacio=espacio,
                        defaults={
                            'docente': docente,
                            'descripcion': desc,
                            'indicaciones': 'Presentar en hoja tamaño carta con carátula oficial y desarrollo claro.',
                            'puntaje_maximo': 100,
                            'fecha_publicacion': now - timedelta(days=12 - idx_t * 6),
                            'fecha_limite': now + timedelta(days=5 + idx_t * 5),
                            'estado': 'PUBLICADA'
                        }
                    )
                    if created_t:
                        # Calificaciones sobre 100
                        for est in random.sample(estudiantes_curso, 8):
                            nota_bolivia = random.choice([65, 70, 75, 80, 85, 90, 95, 100])
                            entrega, created_e = Entrega.objects.get_or_create(
                                tarea=tarea, estudiante=est,
                                defaults={
                                    'fecha_entrega': now - timedelta(days=random.randint(1, 8)),
                                    'estado': 'CALIFICADO',
                                    'archivo_url': 'https://edusmart.bo/archivos/tarea.pdf',
                                    'archivo_nombre': f"trabajo_{est.usuario.first_name.lower()}.pdf",
                                    'observaciones': 'Trabajo revisado en base al currículo boliviano.'
                                }
                            )
                            if created_e:
                                Calificacion.objects.get_or_create(
                                    entrega=entrega,
                                    defaults={'nota': nota_bolivia, 'docente': docente}
                                )

        # Crear Primaria: 1ro a 6to de Primaria (Paralelo A)
        for grado_prim in GRADOS_BOLIVIA['Primaria'][:4]:  # 1ro a 4to en Don Bosco y San Calixto
            curso_prim, _ = Curso.objects.get_or_create(
                colegio=col, grado=grado_prim, paralelo='A',
                defaults={
                    'nombre': f"{grado_prim} \"A\"",
                    'nivel': 'Educación Primaria Comunitaria Vocacional',
                    'anio_lectivo': '2026'
                }
            )
            curso_prim.nombre = f"{grado_prim} \"A\""
            curso_prim.nivel = 'Educación Primaria Comunitaria Vocacional'
            curso_prim.anio_lectivo = '2026'
            curso_prim.save()

            estudiantes_prim = []
            for i in range(10):
                fn = NOMBRES_BOLIVIA[student_index % len(NOMBRES_BOLIVIA)]
                ln1 = APELLIDOS_BOLIVIA[student_index % len(APELLIDOS_BOLIVIA)]
                ln2 = APELLIDOS_BOLIVIA[(student_index + 2) % len(APELLIDOS_BOLIVIA)]
                rude = f"RUDE-{col.id:02d}{curso_prim.id:02d}-{student_index:04d}"
                uname = f"{fn.lower()}.{ln1.lower()}{student_index}@edusmart.bo"
                student_index += 1

                user, created_u = Usuario.objects.get_or_create(
                    username=uname,
                    defaults={
                        'email': uname,
                        'first_name': fn,
                        'last_name': f"{ln1} {ln2}",
                        'rol': 'ESTUDIANTE',
                        'estado': 'ACTIVO'
                    }
                )
                if created_u:
                    user.set_password('password123')
                    user.save()

                est, _ = Estudiante.objects.get_or_create(usuario=user)
                EstudianteCurso.objects.get_or_create(
                    estudiante=est, curso=curso_prim,
                    defaults={'codigo_ru': rude}
                )
                estudiantes_prim.append(est)

            # Materias de primaria
            materias_prim = MATERIAS_BOLIVIA['Primaria'][:2]
            for mat_nombre, horas in materias_prim:
                materia, _ = Materia.objects.get_or_create(
                    curso=curso_prim, nombre=mat_nombre,
                    defaults={'docente': docente, 'horas_semanales': horas}
                )
                codigo_esp = f"{col.id}{curso_prim.id}{materia.id}"
                espacio, _ = Espacio.objects.get_or_create(
                    materia=materia,
                    defaults={
                        'nombre': f"{mat_nombre} - {grado_prim} \"A\"",
                        'codigo': f"PRIM-{codigo_esp}",
                        'docente': docente,
                        'colegio': col,
                        'curso': curso_prim,
                        'color': col.color
                    }
                )
                for est in estudiantes_prim:
                    MiembroEspacio.objects.get_or_create(espacio=espacio, estudiante=est)

    # Actualizar nombres de cursos antiguos para que no queden como '10mo' o 'Bachillerato'
    for old_curso in Curso.objects.all():
        if 'Bachillerato' in old_curso.grado or '10mo' in old_curso.grado:
            # Reasignar a grados de secundaria boliviana
            if '10mo' in old_curso.grado:
                old_curso.grado = '4to de Secundaria'
            elif '1ro de Bachillerato' in old_curso.grado:
                old_curso.grado = '4to de Secundaria'
            elif '2do de Bachillerato' in old_curso.grado:
                old_curso.grado = '5to de Secundaria'
            elif '3ro de Bachillerato' in old_curso.grado or 'Tercero' in old_curso.grado:
                old_curso.grado = '6to de Secundaria'
            old_curso.nivel = 'Educación Secundaria Comunitaria Productiva'
            old_curso.nombre = f"{old_curso.grado} \"{old_curso.paralelo}\""
            old_curso.anio_lectivo = '2026'
            try:
                old_curso.save()
            except Exception:
                pass

    print("\nActualizando progreso de todos los estudiantes...")
    for est in Estudiante.objects.all():
        try:
            est.actualizar_progreso()
        except Exception:
            pass

    print("\nFinalizado exitosamente:")
    print(f"  - Colegios: {Colegio.objects.count()}")
    print(f"  - Cursos: {Curso.objects.count()}")
    print(f"  - Materias / Espacios: {Espacio.objects.count()}")
    print(f"  - Estudiantes: {Estudiante.objects.count()}")

if __name__ == '__main__':
    run()
