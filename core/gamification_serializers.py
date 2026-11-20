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
    colegio_id = serializers.SerializerMethodField()
    colegio_nombre = serializers.SerializerMethodField()
    curso_id = serializers.SerializerMethodField()
    curso_nombre = serializers.SerializerMethodField()
    materia_id = serializers.SerializerMethodField()
    materia_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            'id', 'titulo', 'descripcion', 'tipo', 'espacio', 'espacio_nombre',
            'colegio_id', 'colegio_nombre', 'curso_id', 'curso_nombre', 'materia_id', 'materia_nombre',
            'creado_por', 'recompensa_puntos', 'recompensa_coins', 'meta',
            'activo', 'fecha_inicio', 'fecha_limite', 'fecha_creacion'
        ]

    def get_espacio_nombre(self, obj):
        if not obj.espacio:
            return None
        materia = getattr(obj.espacio.materia, 'nombre', None) if obj.espacio.materia else None
        curso = getattr(obj.espacio.curso, 'nombre_completo', None) if obj.espacio.curso else None
        if materia and curso:
            return f"{materia} · {curso}"
        return materia or obj.espacio.nombre

    def get_colegio_id(self, obj):
        esp = obj.espacio
        if not esp:
            return None
        if esp.colegio_id:
            return esp.colegio_id
        if esp.curso and esp.curso.colegio_id:
            return esp.curso.colegio_id
        if esp.materia and esp.materia.curso and esp.materia.curso.colegio_id:
            return esp.materia.curso.colegio_id
        return None

    def get_colegio_nombre(self, obj):
        esp = obj.espacio
        if not esp:
            return ''
        if esp.colegio:
            return esp.colegio.nombre
        if esp.curso and esp.curso.colegio:
            return esp.curso.colegio.nombre
        if esp.materia and esp.materia.curso and esp.materia.curso.colegio:
            return esp.materia.curso.colegio.nombre
        return ''

    def get_curso_id(self, obj):
        esp = obj.espacio
        if not esp:
            return None
        if esp.curso_id:
            return esp.curso_id
        if esp.materia and esp.materia.curso_id:
            return esp.materia.curso_id
        return None

    def get_curso_nombre(self, obj):
        esp = obj.espacio
        if not esp:
            return ''
        if esp.curso:
            return esp.curso.nombre_completo
        if esp.materia and esp.materia.curso:
            return esp.materia.curso.nombre_completo
        return ''

    def get_materia_id(self, obj):
        esp = obj.espacio
        if not esp:
            return None
        return esp.materia_id or None

    def get_materia_nombre(self, obj):
        esp = obj.espacio
        if not esp:
            return ''
        if esp.materia:
            return esp.materia.nombre
        return esp.nombre or ''

class UserChallengeSerializer(serializers.ModelSerializer):
    challenge = ChallengeSerializer(read_only=True)
    class Meta:
        model = UserChallenge
        fields = ['id', 'challenge', 'estado', 'progreso', 'meta']

class LeaderboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar_url', 'points', 'level', 'coins']
