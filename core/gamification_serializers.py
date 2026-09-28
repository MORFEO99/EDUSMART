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
    class Meta:
        model = Challenge
        fields = '__all__'

class UserChallengeSerializer(serializers.ModelSerializer):
    challenge = ChallengeSerializer(read_only=True)
    class Meta:
        model = UserChallenge
        fields = ['id', 'challenge', 'estado', 'progreso', 'meta']

class LeaderboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar_url', 'points', 'level', 'coins']
