from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q, Max, Count, Avg, F
from django.utils import timezone

from .models import (
    TemaAvance, Materia, Docente, Estudiante, Usuario,
    PracticaTema, IntentoPracticaEstudiante,
    Notificacion, Espacio, MiembroEspacio, EstudianteCurso,
    Challenge, UserChallenge, CoinTransaction
)
from .ai_practice_service import generate_exam_practice, evaluate_student_answers


# ==============================================================================
# DOCENTE: GENERAR O REGENERAR SIMULADOR DE EXAMEN / PRÁCTICA CON IA
# ==============================================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_generar_practica_tema(request, tema_id):
    """
    POST /api/v2/temas/<tema_id>/generar-practica/
    El docente genera o regenera una batería de ejercicios didácticos con IA
    para preparar a los estudiantes hacia el examen de ese tema.
    """
    try:
        docente = request.user.perfil_docente
    except Exception:
        return Response({'error': 'Solo los docentes pueden generar prácticas con IA.'}, status=status.HTTP_403_FORBIDDEN)

    tema = get_object_or_404(TemaAvance, id=tema_id, docente=docente)
    materia = tema.materia

    cantidad = int(request.data.get('cantidad', 5))
    dificultad = request.data.get('dificultad', 'INTERMEDIO')
    enfoque = request.data.get('enfoque', '')

    # Generar ejercicios usando el servicio de IA (Gemini / Motor Pedagógico)
    descripcion_completa = f"{tema.descripcion}. {enfoque}".strip()
    ai_data = generate_exam_practice(
        materia_nombre=materia.nombre,
        tema_titulo=tema.titulo,
        tema_descripcion=descripcion_completa,
        nivel_educativo=getattr(materia.curso, 'nombre', ''),
        cantidad=cantidad,
        dificultad=dificultad
    )

    # Crear o actualizar la práctica asociada al tema
    practica, created = PracticaTema.objects.get_or_create(
        tema=tema,
        defaults={
            'materia': materia,
            'docente': docente,
            'titulo': ai_data.get('titulo', f"Simulador de Examen: {tema.titulo}"),
            'descripcion': ai_data.get('descripcion', ''),
            'preguntas': ai_data.get('preguntas', []),
            'dificultad': dificultad,
            'tiempo_limite_minutos': ai_data.get('tiempo_limite_minutos', 15),
            'motor_ia': ai_data.get('motor_ia', 'EduSmart AI Engine'),
            'recompensa_xp': 40 + (cantidad * 5),
            'recompensa_coins': 20 + (cantidad * 2),
            'activo': True
        }
    )

    if not created:
        practica.titulo = ai_data.get('titulo', practica.titulo)
        practica.descripcion = ai_data.get('descripcion', practica.descripcion)
        practica.preguntas = ai_data.get('preguntas', [])
        practica.dificultad = dificultad
        practica.tiempo_limite_minutos = ai_data.get('tiempo_limite_minutos', practica.tiempo_limite_minutos)
        practica.motor_ia = ai_data.get('motor_ia', practica.motor_ia)
        practica.activo = True
        practica.save()

    # Notificar a los estudiantes del curso y materia sobre el nuevo simulador
    estudiantes_ids = set()
    # Estudiantes por Curso
    if materia.curso:
        estudiantes_ids.update(
            EstudianteCurso.objects.filter(curso=materia.curso).values_list('estudiante_id', flat=True)
        )
    # Estudiantes por Espacio/Aula Virtual
    espacios = Espacio.objects.filter(materia=materia)
    if espacios.exists():
        estudiantes_ids.update(
            MiembroEspacio.objects.filter(espacio__in=espacios).values_list('estudiante_id', flat=True)
        )

    # Crear notificaciones para los estudiantes
    for est_id in estudiantes_ids:
        try:
            est = Estudiante.objects.get(id=est_id)
            Notificacion.objects.create(
                usuario=est.usuario,
                titulo=f"✨ Simulador de Examen Disponible: {tema.titulo}",
                mensaje=f"Tu docente de {materia.nombre} completó el tema '{tema.titulo}'. Ingresa ahora para practicar los ejercicios didácticos con IA y prepararte para tu examen.",
                tipo='SISTEMA',
                leida=False
            )
        except Exception:
            pass

    return Response({
        'ok': True,
        'practica_id': practica.id,
        'titulo': practica.titulo,
        'descripcion': practica.descripcion,
        'total_preguntas': len(practica.preguntas),
        'tiempo_limite_minutos': practica.tiempo_limite_minutos,
        'motor_ia': practica.motor_ia,
        'dificultad': practica.dificultad,
        'notificados': len(estudiantes_ids),
        'mensaje': f'Simulador de examen con IA generado con éxito ({len(practica.preguntas)} ejercicios).'
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ==============================================================================
# ESTUDIANTE: LISTADO DE PRÁCTICAS DISPONIBLES POR AVANCE DOCENTE
# ==============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_estudiante_practicas_list(request):
    """
    GET /api/v2/estudiante/practicas/
    Lista todos los simuladores de examen y ejercicios de práctica disponibles
    para el estudiante autenticado, generados a partir de los temas avanzados
    por sus docentes en sus materias inscritas.
    """
    try:
        estudiante = request.user.perfil_estudiante
    except Exception:
        return Response({'error': 'Solo los estudiantes pueden acceder a sus prácticas.'}, status=status.HTTP_403_FORBIDDEN)

    # Obtener IDs de materias donde el estudiante está inscrito
    materias_ids = set()
    
    # 1. Por inscripción oficial en Curso
    cursos_ids = EstudianteCurso.objects.filter(estudiante=estudiante).values_list('curso_id', flat=True)
    if cursos_ids:
        materias_ids.update(Materia.objects.filter(curso_id__in=cursos_ids, activa=True).values_list('id', flat=True))

    # 2. Por pertenencia a Espacios / Aulas virtuales
    espacios_ids = MiembroEspacio.objects.filter(estudiante=estudiante).values_list('espacio_id', flat=True)
    if espacios_ids:
        materias_ids.update(Espacio.objects.filter(id__in=espacios_ids, materia__isnull=False).values_list('materia_id', flat=True))

    # Filtrar prácticas activas de esas materias
    practicas = PracticaTema.objects.filter(
        materia_id__in=materias_ids,
        activo=True
    ).select_related('tema', 'materia', 'docente__usuario').order_by('-fecha_creacion')

    # Obtener historial de intentos del estudiante en estas prácticas
    intentos_por_practica = {}
    for intento in IntentoPracticaEstudiante.objects.filter(estudiante=estudiante, practica__in=practicas):
        pid = intento.practica_id
        if pid not in intentos_por_practica:
            intentos_por_practica[pid] = {
                'total_intentos': 0,
                'mejor_puntaje': 0.0,
                'aprobado': False,
                'ultimo_intento': None,
            }
        intentos_por_practica[pid]['total_intentos'] += 1
        if intento.puntaje_obtenido > intentos_por_practica[pid]['mejor_puntaje']:
            intentos_por_practica[pid]['mejor_puntaje'] = intento.puntaje_obtenido
        if intento.aprobado:
            intentos_por_practica[pid]['aprobado'] = True
        if not intentos_por_practica[pid]['ultimo_intento'] or intento.fecha_intento > intentos_por_practica[pid]['ultimo_intento']:
            intentos_por_practica[pid]['ultimo_intento'] = intento.fecha_intento

    resultado = []
    for p in practicas:
        stats = intentos_por_practica.get(p.id, {
            'total_intentos': 0,
            'mejor_puntaje': None,
            'aprobado': False,
            'ultimo_intento': None,
        })
        resultado.append({
            'id': p.id,
            'titulo': p.titulo,
            'descripcion': p.descripcion,
            'tema_id': p.tema_id,
            'tema_titulo': p.tema.titulo,
            'tema_unidad': p.tema.unidad,
            'tema_estado': p.tema.estado,
            'materia_id': p.materia_id,
            'materia_nombre': p.materia.nombre,
            'docente_nombre': p.docente.usuario.nombre_completo,
            'dificultad': p.dificultad,
            'total_preguntas': len(p.preguntas) if isinstance(p.preguntas, list) else 0,
            'tiempo_limite_minutos': p.tiempo_limite_minutos,
            'recompensa_xp': p.recompensa_xp,
            'recompensa_coins': p.recompensa_coins,
            'motor_ia': p.motor_ia,
            'fecha_creacion': p.fecha_creacion.isoformat(),
            'total_intentos': stats['total_intentos'],
            'mejor_puntaje': stats['mejor_puntaje'],
            'aprobado': stats['aprobado'],
            'ultimo_intento': stats['ultimo_intento'].isoformat() if stats['ultimo_intento'] else None,
        })

    return Response({
        'total': len(resultado),
        'practicas': resultado
    })


# ==============================================================================
# ESTUDIANTE: OBTENER PREGUNTAS DEL SIMULADOR (SIN RESPUESTAS CORRECTAS)
# ==============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_practica_detail(request, practica_id):
    """
    GET /api/v2/practicas/<practica_id>/
    Entrega el simulador al estudiante.
    Omite deliberadamente la 'respuesta_correcta' y la 'explicacion' para evitar trampas.
    """
    practica = get_object_or_404(
        PracticaTema.objects.select_related('tema', 'materia', 'docente__usuario'),
        id=practica_id,
        activo=True
    )

    preguntas_sanitizadas = []
    for p in (practica.preguntas or []):
        preguntas_sanitizadas.append({
            'id': p.get('id'),
            'pregunta': p.get('pregunta'),
            'tipo': p.get('tipo', 'OPCION_MULTIPLE'),
            'opciones': p.get('opciones', []),
            'dificultad': p.get('dificultad', practica.dificultad),
            'puntos': p.get('puntos', 20),
        })

    return Response({
        'id': practica.id,
        'titulo': practica.titulo,
        'descripcion': practica.descripcion,
        'tema_titulo': practica.tema.titulo,
        'tema_unidad': practica.tema.unidad,
        'materia_nombre': practica.materia.nombre,
        'docente_nombre': practica.docente.usuario.nombre_completo,
        'dificultad': practica.dificultad,
        'tiempo_limite_minutos': practica.tiempo_limite_minutos,
        'total_preguntas': len(preguntas_sanitizadas),
        'recompensa_xp': practica.recompensa_xp,
        'recompensa_coins': practica.recompensa_coins,
        'motor_ia': practica.motor_ia,
        'preguntas': preguntas_sanitizadas
    })


# ==============================================================================
# ESTUDIANTE: ENVIAR RESPUESTAS Y OBTENER EVALUACIÓN DIDÁCTICA CON IA
# ==============================================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_practica_submit(request, practica_id):
    """
    POST /api/v2/practicas/<practica_id>/enviar/
    El estudiante envía sus respuestas seleccionadas.
    La API evalúa instantáneamente, otorga XP y monedas si aprobó,
    y devuelve la revisión completa con soluciones paso a paso y explicaciones didácticas.
    """
    try:
        estudiante = request.user.perfil_estudiante
    except Exception:
        return Response({'error': 'Solo los estudiantes pueden enviar prácticas.'}, status=status.HTTP_403_FORBIDDEN)

    practica = get_object_or_404(PracticaTema, id=practica_id, activo=True)

    respuestas_alumno = request.data.get('respuestas', {})
    tiempo_empleado = int(request.data.get('tiempo_empleado_segundos', 0))

    # Evaluar con el motor pedagógico
    eval_result = evaluate_student_answers(
        preguntas=practica.preguntas or [],
        respuestas_estudiante=respuestas_alumno,
        tiempo_empleado=tiempo_empleado
    )

    # Registrar el intento en base de datos
    intento = IntentoPracticaEstudiante.objects.create(
        practica=practica,
        estudiante=estudiante,
        puntaje_obtenido=eval_result['puntaje'],
        total_preguntas=eval_result['total_preguntas'],
        respuestas_correctas=eval_result['respuestas_correctas'],
        respuestas_alumno=respuestas_alumno,
        revision_detallada=eval_result['revision'],
        retroalimentacion_ia=eval_result['retroalimentacion_ia'],
        aprobado=eval_result['aprobado'],
        tiempo_empleado_segundos=tiempo_empleado
    )

    # Recompensar con XP y EduCoins si aprobó
    xp_ganado = 0
    coins_ganados = 0
    if eval_result['aprobado']:
        # Solo recompensar si es un buen intento (>= 51)
        xp_ganado = practica.recompensa_xp
        coins_ganados = practica.recompensa_coins

        usuario = request.user
        usuario.points = F('points') + xp_ganado
        usuario.coins = F('coins') + coins_ganados
        usuario.save(update_fields=['points', 'coins'])
        usuario.refresh_from_db()

        # Registrar transacción de monedas
        try:
            CoinTransaction.objects.create(
                usuario=usuario,
                cantidad=coins_ganados,
                tipo='GANADA',
                razon=f"Aprobó simulador de examen: {practica.titulo} ({eval_result['puntaje']} pts)"
            )
        except Exception:
            pass

        # Si hay retos (Challenges) de tipo 'TAREAS' o 'PUNTAJE' en la materia, avanzar el progreso
        try:
            user_challenges = UserChallenge.objects.filter(
                usuario=usuario,
                challenge__espacio__materia=practica.materia,
                estado='ACTIVO'
            )
            for uc in user_challenges:
                uc.progreso = F('progreso') + 1
                uc.save(update_fields=['progreso'])
        except Exception:
            pass

    return Response({
        'intento_id': intento.id,
        'puntaje': eval_result['puntaje'],
        'aprobado': eval_result['aprobado'],
        'total_preguntas': eval_result['total_preguntas'],
        'respuestas_correctas': eval_result['respuestas_correctas'],
        'respuestas_incorrectas': eval_result['respuestas_incorrectas'],
        'retroalimentacion_ia': eval_result['retroalimentacion_ia'],
        'revision': eval_result['revision'],
        'tiempo_empleado_segundos': tiempo_empleado,
        'xp_ganado': xp_ganado,
        'coins_ganados': coins_ganados,
        'nuevo_total_xp': request.user.points,
        'nuevo_total_coins': request.user.coins,
    })


# ==============================================================================
# DOCENTE: RESUMEN DE PRÁCTICAS Y DESEMPEÑO DE ESTUDIANTES PARA EL EXAMEN
# ==============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_docente_materia_practicas_resumen(request, materia_id):
    """
    GET /api/v2/docente/materias/<materia_id>/practicas-resumen/
    Permite al docente ver cómo van practicando sus estudiantes para el examen
    en cada tema completado de su materia.
    """
    try:
        docente = request.user.perfil_docente
    except Exception:
        return Response({'error': 'Solo los docentes pueden consultar este resumen.'}, status=status.HTTP_403_FORBIDDEN)

    materia = get_object_or_404(Materia, id=materia_id, docente=docente)
    temas = TemaAvance.objects.filter(materia=materia).order_by('orden', 'fecha_creacion')

    resumen_temas = []
    for t in temas:
        practica = PracticaTema.objects.filter(tema=t).first()
        if practica:
            intentos = IntentoPracticaEstudiante.objects.filter(practica=practica)
            total_intentos = intentos.count()
            alumnos_unicos = intentos.values('estudiante').distinct().count()
            promedio = intentos.aggregate(Avg('puntaje_obtenido'))['puntaje_obtenido__avg'] or 0.0
            aprobados_count = intentos.filter(aprobado=True).values('estudiante').distinct().count()
            
            resumen_temas.append({
                'tema_id': t.id,
                'tema_titulo': t.titulo,
                'tema_unidad': t.unidad,
                'tema_estado': t.estado,
                'tiene_practica': True,
                'practica_id': practica.id,
                'practica_titulo': practica.titulo,
                'dificultad': practica.dificultad,
                'total_preguntas': len(practica.preguntas),
                'total_intentos': total_intentos,
                'alumnos_practicando': alumnos_unicos,
                'alumnos_aprobados': aprobados_count,
                'promedio_puntaje': round(promedio, 1),
                'motor_ia': practica.motor_ia,
            })
        else:
            resumen_temas.append({
                'tema_id': t.id,
                'tema_titulo': t.titulo,
                'tema_unidad': t.unidad,
                'tema_estado': t.estado,
                'tiene_practica': False,
                'practica_id': None,
                'practica_titulo': None,
                'total_preguntas': 0,
                'total_intentos': 0,
                'alumnos_practicando': 0,
                'alumnos_aprobados': 0,
                'promedio_puntaje': 0.0,
                'motor_ia': None,
            })

    return Response({
        'materia_id': materia.id,
        'materia_nombre': materia.nombre,
        'curso_nombre': materia.curso.nombre if materia.curso else '',
        'temas': resumen_temas
    })
