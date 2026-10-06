from rest_framework import serializers
from .models import Badge, UserBadge, Challenge, UserChallenge, Usuario, CoinTransaction

class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = '__all__'

class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    class Meta:
        model = UserBadge
        fields = ['id', 'badge', 'fecha_obtencion']

class ChallengeSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = ['id', 'titulo', 'descripcion', 'tipo', 'espacio', 'espacio_nombre',
                  'creado_por', 'recompensa_puntos', 'recompensa_coins', 'meta',
                  'activo', 'fecha_inicio', 'fecha_limite', 'fecha_creacion']

    def get_espacio_nombre(self, obj):
        if not obj.espacio:
            return None
        materia = getattr(obj.espacio.materia, 'nombre', None) if obj.espacio.materia else None
        curso = getattr(obj.espacio.curso, 'nombre_completo', None) if obj.espacio.curso else None
        if materia and curso:
            return f"{materia} · {curso}"
        return materia or obj.espacio.nombre

class UserChallengeSerializer(serializers.ModelSerializer):
    challenge = ChallengeSerializer(read_only=True)
    class Meta:
        model = UserChallenge
        fields = ['id', 'challenge', 'estado', 'progreso', 'meta']

class LeaderboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar_url', 'points', 'level', 'coins']
