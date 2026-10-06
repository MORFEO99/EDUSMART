from rest_framework import serializers
from .models import (
    Usuario, Docente, Estudiante, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, VersionEntrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion, AvisoEspacio, RecursoEspacio,
    ExtensionFechaTarea, PlantillaTarea
)

class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nombre_completo', 'rol', 'estado', 'telefono',
            'avatar_url', 'fecha_creacion'
        ]


class DocenteSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)

    class Meta:
        model = Docente
        fields = ['id', 'usuario', 'especialidad', 'titulo_academico', 'biografia']


class EstudianteSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)

    class Meta:
        model = Estudiante
        fields = ['id', 'usuario', 'carrera_o_area', 'biografia']


class EspacioSerializer(serializers.ModelSerializer):
    docente_nombre = serializers.SerializerMethodField()
    total_estudiantes = serializers.ReadOnlyField()
    total_tareas = serializers.ReadOnlyField()
    tareas_pendientes_estudiante = serializers.SerializerMethodField()
    colegio_nombre = serializers.SerializerMethodField()
    curso_nombre = serializers.SerializerMethodField()
    materia_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Espacio
        fields = [
            'id', 'nombre', 'descripcion', 'codigo', 'color', 'icono',
            'imagen_url', 'docente', 'docente_nombre', 'total_estudiantes',
            'total_tareas', 'tareas_pendientes_estudiante', 'fecha_creacion',
            'colegio_nombre', 'curso_nombre', 'materia_nombre'
        ]

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'

    def get_colegio_nombre(self, obj):
        return obj.colegio.nombre if obj.colegio else ''

    def get_curso_nombre(self, obj):
        return obj.curso.nombre_completo if obj.curso else ''

    def get_materia_nombre(self, obj):
        return obj.materia.nombre if obj.materia else ''

    def get_tareas_pendientes_estudiante(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.rol == 'ESTUDIANTE' and hasattr(request.user, 'perfil_estudiante'):
            estudiante = request.user.perfil_estudiante
            entregadas_ids = Entrega.objects.filter(
                estudiante=estudiante, tarea__espacio=obj
            ).values_list('tarea_id', flat=True)
            return obj.tareas.filter(estado='PUBLICADA').exclude(id__in=entregadas_ids).count()
        return 0


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ['id', 'nombre', 'tipo', 'archivo_url', 'tamano']


class RetroalimentacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Retroalimentacion
        fields = ['id', 'comentario', 'fecha']


class CalificacionSerializer(serializers.ModelSerializer):
    docente_nombre = serializers.SerializerMethodField()
    retroalimentacion = RetroalimentacionSerializer(read_only=True)

    class Meta:
        model = Calificacion
        fields = ['id', 'nota', 'fecha_calificacion', 'docente_nombre', 'retroalimentacion']

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'


class VersionEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VersionEntrega
        fields = [
            'id', 'numero_version', 'archivo_url', 'archivo_nombre',
            'archivo_tamano', 'comentario', 'fecha_envio', 'estado',
            'nota', 'retroalimentacion'
        ]


class EntregaSerializer(serializers.ModelSerializer):
    estudiante_nombre = serializers.SerializerMethodField()
    estudiante_avatar = serializers.SerializerMethodField()
    estudiante_matricula = serializers.SerializerMethodField()
    tarea_titulo = serializers.SerializerMethodField()
    espacio_nombre = serializers.SerializerMethodField()
    calificacion = CalificacionSerializer(read_only=True)
    versiones = VersionEntregaSerializer(many=True, read_only=True)

    class Meta:
        model = Entrega
        fields = [
            'id', 'tarea', 'tarea_titulo', 'espacio_nombre',
            'estudiante', 'estudiante_nombre', 'estudiante_avatar', 'estudiante_matricula',
            'fecha_entrega', 'archivo_url', 'archivo_nombre',
            'archivo_tamano', 'observaciones', 'estado', 'version',
            'calificacion', 'versiones'
        ]

    def get_estudiante_nombre(self, obj):
        return obj.estudiante.usuario.nombre_completo

    def get_estudiante_avatar(self, obj):
        return obj.estudiante.usuario.avatar_url

    def get_estudiante_matricula(self, obj):
        return f"EST-{obj.estudiante.id:04d}"

    def get_tarea_titulo(self, obj):
        return obj.tarea.titulo

    def get_espacio_nombre(self, obj):
        return obj.tarea.espacio.nombre


class TareaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.SerializerMethodField()
    espacio_color = serializers.SerializerMethodField()
    docente_nombre = serializers.SerializerMethodField()
    materiales = MaterialSerializer(many=True, read_only=True)
    esta_vencida = serializers.ReadOnlyField()
    mi_entrega = serializers.SerializerMethodField()
    total_entregas = serializers.SerializerMethodField()
    estado_estudiante = serializers.SerializerMethodField()

    class Meta:
        model = Tarea
        fields = [
            'id', 'espacio', 'espacio_nombre', 'espacio_color',
            'docente', 'docente_nombre', 'titulo', 'descripcion',
            'indicaciones', 'puntaje_maximo', 'fecha_publicacion',
            'fecha_limite', 'esta_vencida', 'estado', 'estado_estudiante', 'materiales',
            'mi_entrega', 'total_entregas'
        ]

    def get_espacio_nombre(self, obj):
        return obj.espacio.nombre

    def get_espacio_color(self, obj):
        return obj.espacio.color

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'

    def get_mi_entrega(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.rol == 'ESTUDIANTE' and hasattr(request.user, 'perfil_estudiante'):
            entrega = Entrega.objects.filter(tarea=obj, estudiante=request.user.perfil_estudiante).first()
            if entrega:
                return EntregaSerializer(entrega).data
        return None

    def get_estado_estudiante(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.rol == 'ESTUDIANTE' and hasattr(request.user, 'perfil_estudiante'):
            from django.utils import timezone
            entrega = Entrega.objects.filter(tarea=obj, estudiante=request.user.perfil_estudiante).first()
            if entrega:
                if entrega.estado == 'DEVUELTA':
                    return 'DEVUELTA'
                elif entrega.estado == 'REENTREGADA':
                    return 'REENTREGADA'
                elif hasattr(entrega, 'calificacion'):
                    return 'CALIFICADA'
                elif entrega.estado == 'EN_PROCESO':
                    return 'EN_PROCESO'
                elif entrega.estado == 'EN_REVISION':
                    return 'EN_REVISION'
                else:
                    return 'ENTREGADA'
            elif obj.fecha_limite and obj.fecha_limite < timezone.now():
                return 'VENCIDA'
        return 'ASIGNADA'

    def get_total_entregas(self, obj):
        return obj.entregas.count()


class ProgresoAcademicoSerializer(serializers.ModelSerializer):
    estudiante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ProgresoAcademico
        fields = [
            'id', 'estudiante_nombre', 'promedio', 'tareas_entregadas',
            'tareas_pendientes', 'tareas_calificadas', 'tareas_vencidas',
            'porcentaje_cumplimiento'
        ]

    def get_estudiante_nombre(self, obj):
        return obj.estudiante.usuario.nombre_completo


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'tipo', 'mensaje', 'fecha', 'leida', 'espacio_id', 'tarea_id']


class AvisoEspacioSerializer(serializers.ModelSerializer):
    docente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AvisoEspacio
        fields = [
            'id', 'espacio', 'docente', 'docente_nombre', 'titulo',
            'contenido', 'fijado', 'importante', 'fecha_creacion', 'fecha_expiracion'
        ]

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'


class RecursoEspacioSerializer(serializers.ModelSerializer):
    docente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = RecursoEspacio
        fields = [
            'id', 'espacio', 'docente', 'docente_nombre', 'titulo',
            'descripcion', 'tipo', 'archivo_url', 'enlace_url', 'tamano', 'fecha_subida'
        ]

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'


class PlantillaTareaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantillaTarea
        fields = ['id', 'docente', 'titulo', 'descripcion', 'indicaciones', 'puntaje_maximo', 'criterios_json', 'fecha_creacion']
