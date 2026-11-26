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
    colegio_id = serializers.SerializerMethodField()
    colegio_nombre = serializers.SerializerMethodField()
    curso_id = serializers.SerializerMethodField()
    curso_nombre = serializers.SerializerMethodField()
    materia_id = serializers.SerializerMethodField()
    materia_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Espacio
        fields = [
            'id', 'nombre', 'descripcion', 'codigo', 'color', 'icono',
            'imagen_url', 'docente', 'docente_nombre', 'total_estudiantes',
            'total_tareas', 'tareas_pendientes_estudiante', 'fecha_creacion',
            'colegio_id', 'colegio_nombre', 'curso_id', 'curso_nombre', 'materia_id', 'materia_nombre'
        ]

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'

    def get_colegio_id(self, obj):
        if obj.colegio_id:
            return obj.colegio_id
        if obj.curso and obj.curso.colegio_id:
            return obj.curso.colegio_id
        if obj.materia and obj.materia.curso and obj.materia.curso.colegio_id:
            return obj.materia.curso.colegio_id
        return None

    def get_colegio_nombre(self, obj):
        if obj.colegio:
            return obj.colegio.nombre
        if obj.curso and obj.curso.colegio:
            return obj.curso.colegio.nombre
        if obj.materia and obj.materia.curso and obj.materia.curso.colegio:
            return obj.materia.curso.colegio.nombre
        return ''

    def get_curso_id(self, obj):
        if obj.curso_id:
            return obj.curso_id
        if obj.materia and obj.materia.curso_id:
            return obj.materia.curso_id
        return None

    def get_curso_nombre(self, obj):
        if obj.curso:
            return obj.curso.nombre_completo
        if obj.materia and obj.materia.curso:
            return obj.materia.curso.nombre_completo
        return ''

    def get_materia_id(self, obj):
        if obj.materia_id:
            return obj.materia_id
        return None

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
    retroalimentacion = serializers.SerializerMethodField()

    class Meta:
        model = Calificacion
        fields = ['id', 'nota', 'fecha_calificacion', 'docente_nombre', 'retroalimentacion']

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'

    def get_retroalimentacion(self, obj):
        try:
            if hasattr(obj, 'retroalimentacion') and obj.retroalimentacion:
                return obj.retroalimentacion.comentario
        except Exception:
            pass
        return ''


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
    colegio_id = serializers.SerializerMethodField()
    colegio_nombre = serializers.SerializerMethodField()
    curso_id = serializers.SerializerMethodField()
    curso_nombre = serializers.SerializerMethodField()
    materia_id = serializers.SerializerMethodField()
    materia_nombre = serializers.SerializerMethodField()
    materia = serializers.SerializerMethodField()
    entregadas = serializers.SerializerMethodField()
    pendientes_calificacion = serializers.SerializerMethodField()
    calificadas = serializers.SerializerMethodField()
    total_alumnos = serializers.SerializerMethodField()
    materiales = MaterialSerializer(many=True, read_only=True)
    esta_vencida = serializers.ReadOnlyField()
    mi_entrega = serializers.SerializerMethodField()
    entrega = serializers.SerializerMethodField()
    nota = serializers.SerializerMethodField()
    retroalimentacion = serializers.SerializerMethodField()
    total_entregas = serializers.SerializerMethodField()
    estado_estudiante = serializers.SerializerMethodField()

    class Meta:
        model = Tarea
        fields = [
            'id', 'espacio', 'espacio_nombre', 'espacio_color',
            'colegio_id', 'colegio_nombre', 'curso_id', 'curso_nombre',
            'materia_id', 'materia_nombre', 'materia',
            'entregadas', 'pendientes_calificacion', 'calificadas', 'total_alumnos',
            'docente', 'docente_nombre', 'titulo', 'descripcion',
            'indicaciones', 'puntaje_maximo', 'fecha_publicacion',
            'fecha_limite', 'esta_vencida', 'estado', 'estado_estudiante', 'materiales',
            'mi_entrega', 'entrega', 'nota', 'retroalimentacion', 'total_entregas'
        ]

    def get_espacio_nombre(self, obj):
        return obj.espacio.nombre if obj.espacio else ''

    def get_espacio_color(self, obj):
        return obj.espacio.color if obj.espacio else '#1E3A8A'

    def get_docente_nombre(self, obj):
        return obj.docente.usuario.nombre_completo if obj.docente else 'Docente'

    def get_colegio_id(self, obj):
        if not obj.espacio:
            return None
        if obj.espacio.colegio_id:
            return obj.espacio.colegio_id
        if obj.espacio.curso and obj.espacio.curso.colegio_id:
            return obj.espacio.curso.colegio_id
        if obj.espacio.materia and obj.espacio.materia.curso and obj.espacio.materia.curso.colegio_id:
            return obj.espacio.materia.curso.colegio_id
        return None

    def get_colegio_nombre(self, obj):
        if not obj.espacio:
            return ''
        if obj.espacio.colegio:
            return obj.espacio.colegio.nombre
        if obj.espacio.curso and obj.espacio.curso.colegio:
            return obj.espacio.curso.colegio.nombre
        if obj.espacio.materia and obj.espacio.materia.curso and obj.espacio.materia.curso.colegio:
            return obj.espacio.materia.curso.colegio.nombre
        return ''

    def get_curso_id(self, obj):
        if not obj.espacio:
            return None
        if obj.espacio.curso_id:
            return obj.espacio.curso_id
        if obj.espacio.materia and obj.espacio.materia.curso_id:
            return obj.espacio.materia.curso_id
        return None

    def get_curso_nombre(self, obj):
        if not obj.espacio:
            return ''
        if obj.espacio.curso:
            return obj.espacio.curso.nombre_completo
        if obj.espacio.materia and obj.espacio.materia.curso:
            return obj.espacio.materia.curso.nombre_completo
        return ''

    def get_materia_id(self, obj):
        if not obj.espacio:
            return None
        return obj.espacio.materia_id

    def get_materia_nombre(self, obj):
        if obj.espacio and obj.espacio.materia:
            return obj.espacio.materia.nombre
        return obj.espacio.nombre if obj.espacio else ''

    def get_materia(self, obj):
        return self.get_materia_nombre(obj)

    def get_entregadas(self, obj):
        return obj.entregas.count()

    def get_pendientes_calificacion(self, obj):
        return obj.entregas.filter(calificacion__isnull=True).count()

    def get_calificadas(self, obj):
        return obj.entregas.filter(calificacion__isnull=False).count()

    def get_total_alumnos(self, obj):
        return obj.espacio.miembros.count() if obj.espacio else 0

    def get_mi_entrega(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.rol == 'ESTUDIANTE' and hasattr(request.user, 'perfil_estudiante'):
            entrega = Entrega.objects.filter(tarea=obj, estudiante=request.user.perfil_estudiante).first()
            if entrega:
                return EntregaSerializer(entrega).data
        return None

    def get_entrega(self, obj):
        return self.get_mi_entrega(obj)

    def get_nota(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.rol == 'ESTUDIANTE' and hasattr(request.user, 'perfil_estudiante'):
            entrega = Entrega.objects.filter(tarea=obj, estudiante=request.user.perfil_estudiante).first()
            if entrega and hasattr(entrega, 'calificacion'):
                return entrega.calificacion.nota
        return None

    def get_retroalimentacion(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.rol == 'ESTUDIANTE' and hasattr(request.user, 'perfil_estudiante'):
            entrega = Entrega.objects.filter(tarea=obj, estudiante=request.user.perfil_estudiante).first()
            if entrega and hasattr(entrega, 'calificacion'):
                try:
                    if hasattr(entrega.calificacion, 'retroalimentacion') and entrega.calificacion.retroalimentacion:
                        return entrega.calificacion.retroalimentacion.comentario
                except Exception:
                    pass
        return ''

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
