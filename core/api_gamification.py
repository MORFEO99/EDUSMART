from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import F, Q
from django.utils import timezone

from .models import Challenge, UserChallenge, Badge, UserBadge, Usuario, Espacio, MiembroEspacio
from .gamification_serializers import ChallengeSerializer, UserChallengeSerializer, BadgeSerializer, UserBadgeSerializer, LeaderboardSerializer
# MongoDB - Servicios de gamificacion
from .mongo_services import log_actividad, log_coin_transaction, log_badge_obtenido


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_challenges(request):
    user = request.user
    espacio_id = request.query_params.get('espacio_id')

    if user.rol == 'ESTUDIANTE':
        try:
            estudiante = user.perfil_estudiante
            espacios_ids = estudiante.get_espacios_ids() if hasattr(estudiante, 'get_espacios_ids') else []
        except Exception:
            espacios_ids = []

        if espacio_id:
            # Retos de esta materia específica o retos globales
            retos_activos = Challenge.objects.filter(
                activo=True
            ).filter(
                Q(espacio_id=espacio_id) | Q(espacio__isnull=True)
            )
        else:
            # Retos globales (sin espacio) + retos de sus materias
            retos_activos = Challenge.objects.filter(
                activo=True
            ).filter(
                Q(espacio__isnull=True) | Q(espacio_id__in=espacios_ids)
            )
    else:
        # Docentes
        try:
            docente = user.perfil_docente
            if espacio_id:
                retos_activos = Challenge.objects.filter(creado_por=docente, espacio_id=espacio_id)
            else:
                retos_activos = Challenge.objects.filter(creado_por=docente)
        except Exception:
            retos_activos = Challenge.objects.none()

    # Inicializar progreso del estudiante en cada reto
    user_challenges = []
    for reto in retos_activos:
        uc, created = UserChallenge.objects.get_or_create(
            usuario=user,
            challenge=reto,
            defaults={'estado': 'ACTIVO', 'progreso': 0, 'meta': reto.meta}
        )
        user_challenges.append(uc)

    serializer = UserChallengeSerializer(user_challenges, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_crear_reto(request):
    """Permite a un docente crear un reto vinculado a un espacio/materia."""
    user = request.user
    if user.rol != 'DOCENTE':
        return Response({'error': 'Solo los docentes pueden crear retos.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        docente = user.perfil_docente
    except Exception:
        return Response({'error': 'Perfil de docente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    espacio_id = data.get('espacio_id')
    espacio = None

    if espacio_id:
        try:
            espacio = Espacio.objects.get(id=espacio_id, docente=docente)
        except Espacio.DoesNotExist:
            return Response({'error': 'Espacio no encontrado o no te pertenece.'}, status=status.HTTP_404_NOT_FOUND)

    reto = Challenge.objects.create(
        titulo=data.get('titulo', 'Nuevo Reto'),
        descripcion=data.get('descripcion', ''),
        tipo=data.get('tipo', 'GENERAL'),
        espacio=espacio,
        creado_por=docente,
        recompensa_puntos=int(data.get('recompensa_puntos', 15)),
        recompensa_coins=int(data.get('recompensa_coins', 10)),
        meta=int(data.get('meta', 1)),
        activo=True,
        fecha_limite=data.get('fecha_limite', None),
    )

    return Response(ChallengeSerializer(reto).data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_gestionar_reto(request, reto_id):
    """Permite al docente activar/desactivar o eliminar un reto."""
    user = request.user
    if user.rol != 'DOCENTE':
        return Response({'error': 'Solo los docentes pueden gestionar retos.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        docente = user.perfil_docente
        reto = Challenge.objects.get(id=reto_id, creado_por=docente)
    except (Challenge.DoesNotExist, Exception):
        return Response({'error': 'Reto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        reto.delete()
        return Response({'mensaje': 'Reto eliminado.'}, status=status.HTTP_204_NO_CONTENT)

    # PUT: Actualizar estado activo/inactivo
    reto.activo = request.data.get('activo', reto.activo)
    reto.titulo = request.data.get('titulo', reto.titulo)
    reto.descripcion = request.data.get('descripcion', reto.descripcion)
    reto.save()
    return Response(ChallengeSerializer(reto).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_participar_reto(request, reto_id):
    user = request.user
    try:
        uc = UserChallenge.objects.get(usuario=user, challenge__id=reto_id)
    except UserChallenge.DoesNotExist:
        return Response({'error': 'Reto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if uc.estado == 'COMPLETADO':
        return Response({'error': 'Ya completaste este reto'}, status=status.HTTP_400_BAD_REQUEST)

    uc.progreso += 1
    if uc.progreso >= uc.meta:
        uc.estado = 'COMPLETADO'
        uc.progreso = uc.meta
        # Otorgar recompensas
        user.points = F('points') + uc.challenge.recompensa_puntos
        user.coins = F('coins') + uc.challenge.recompensa_coins
        user.save(update_fields=['points', 'coins'])

    uc.save()
    user.refresh_from_db()

    # MongoDB: registrar progreso y recompensas del reto
    if uc.estado == 'COMPLETADO':
        log_actividad(
            usuario_id=user.id,
            accion='COMPLETAR_RETO',
            detalle=f"Reto completado: '{uc.challenge.titulo}'",
            extra={
                'reto_id': uc.challenge.id,
                'puntos_ganados': uc.challenge.recompensa_puntos,
                'coins_ganados': uc.challenge.recompensa_coins
            }
        )
        log_coin_transaction(
            usuario_id=user.id,
            cantidad=uc.challenge.recompensa_coins,
            razon=f"Reto completado: {uc.challenge.titulo}",
            nuevo_total=user.coins
        )
    else:
        log_actividad(
            usuario_id=user.id,
            accion='PROGRESO_RETO',
            detalle=f"Progreso en reto '{uc.challenge.titulo}': {uc.progreso}/{uc.meta}",
            extra={'reto_id': uc.challenge.id, 'progreso': uc.progreso}
        )

    return Response({
        'reto': UserChallengeSerializer(uc).data,
        'user_stats': {
            'points': user.points,
            'coins': user.coins,
            'level': user.level
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_leaderboard(request):
    top_users = Usuario.objects.filter(rol='ESTUDIANTE', estado='ACTIVO').order_by('-points')[:10]
    serializer = LeaderboardSerializer(top_users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_badges(request):
    user = request.user
    user_badges = UserBadge.objects.filter(usuario=user)
    serializer = UserBadgeSerializer(user_badges, many=True)
    return Response(serializer.data)
