from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import F

from .models import Challenge, UserChallenge, Badge, UserBadge, Usuario
from .gamification_serializers import ChallengeSerializer, UserChallengeSerializer, BadgeSerializer, UserBadgeSerializer, LeaderboardSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_challenges(request):
    user = request.user
    
    # 1. Obtener todos los retos activos
    retos_activos = Challenge.objects.filter(activo=True)
    
    # 2. Obtener o inicializar el progreso del usuario en estos retos
    user_challenges = []
    for reto in retos_activos:
        uc, created = UserChallenge.objects.get_or_create(
            usuario=user,
            challenge=reto,
            defaults={'estado': 'ACTIVO', 'progreso': 0, 'meta': 1}
        )
        user_challenges.append(uc)
        
    serializer = UserChallengeSerializer(user_challenges, many=True)
    return Response(serializer.data)

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
        
    # Aumentar progreso simulado (para la demo)
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
