from rest_framework import serializers
from .models import (
    Colegio, DocenteColegio, Curso, Materia, EstudianteCurso,
    Rubrica, CriterioRubrica, HistorialCalificacion, Invitacion,
    Estudiante
)
from .serializers import DocenteSerializer, EstudianteSerializer


class ColegioSerializer(serializers.ModelSerializer):
    total_cursos = serializers.SerializerMethodField()
    total_estudiantes = serializers.SerializerMethodField()
    total_materias = serializers.SerializerMethodField()

    class Meta:
        model = Colegio
        fields = '__all__'

    def get_total_cursos(self, obj):
        return obj.cursos.count()

    def get_total_estudiantes(self, obj):
        from .models import EstudianteCurso
        return EstudianteCurso.objects.filter(curso__colegio=obj).values('estudiante').distinct().count()

    def get_total_materias(self, obj):
        from .models import Materia
        return Materia.objects.filter(curso__colegio=obj).count()


class DocenteColegioSerializer(serializers.ModelSerializer):
    colegio = ColegioSerializer(read_only=True)
    colegio_id = serializers.PrimaryKeyRelatedField(
        queryset=Colegio.objects.all(), source='colegio', write_only=True
    )

    class Meta:
        model = DocenteColegio
        fields = '__all__'


class MateriaBasicSerializer(serializers.ModelSerializer):
    docente_nombre = serializers.CharField(source='docente.usuario.nombre_completo', read_only=True)
    espacio_id = serializers.SerializerMethodField()

    class Meta:
        model = Materia
        fields = ['id', 'nombre', 'codigo', 'docente_nombre', 'horas_semanales', 'activa', 'espacio_id']

    def get_espacio_id(self, obj):
        from .models import Espacio
        espacio = Espacio.objects.filter(materia=obj).first()
        return espacio.id if espacio else None


class CursoSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    total_estudiantes = serializers.ReadOnlyField()
    materias = MateriaBasicSerializer(many=True, read_only=True)

    class Meta:
        model = Curso
        fields = '__all__'


class MateriaSerializer(serializers.ModelSerializer):
    curso_nombre = serializers.CharField(source='curso.nombre_completo', read_only=True)

    class Meta:
        model = Materia
        fields = '__all__'


class EstudianteCursoSerializer(serializers.ModelSerializer):
    estudiante = EstudianteSerializer(read_only=True)
    nombre_completo = serializers.CharField(source='estudiante.usuario.nombre_completo', read_only=True)
    email = serializers.CharField(source='estudiante.usuario.email', read_only=True)

    class Meta:
        model = EstudianteCurso
        fields = '__all__'


class CriterioRubricaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriterioRubrica
        fields = '__all__'


class RubricaSerializer(serializers.ModelSerializer):
    criterios = CriterioRubricaSerializer(many=True, read_only=True)
    calcular_total = serializers.ReadOnlyField()

    class Meta:
        model = Rubrica
        fields = '__all__'


class HistorialCalificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialCalificacion
        fields = '__all__'


class InvitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitacion
        fields = '__all__'
