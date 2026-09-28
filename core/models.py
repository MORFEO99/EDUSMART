from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models import Avg, Count, Q


class Usuario(AbstractUser):
    ROLES = (('DOCENTE', 'Docente'), ('ESTUDIANTE', 'Estudiante'))
    ESTADOS = (('ACTIVO', 'Activo'), ('INACTIVO', 'Inactivo'))
    rol = models.CharField(max_length=20, choices=ROLES, default='ESTUDIANTE')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ACTIVO')
    telefono = models.CharField(max_length=30, blank=True)
    avatar_url = models.CharField(max_length=500, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    # Gamificación
    points = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    coins = models.IntegerField(default=0)

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        full = f"{self.first_name} {self.last_name}".strip()
        return full if full else self.username

    @property
    def nombre_completo(self):
        full = f"{self.first_name} {self.last_name}".strip()
        return full if full else self.username


class Docente(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_docente')
    especialidad = models.CharField(max_length=150, blank=True, default='Ciencias de la Computacion')
    titulo_academico = models.CharField(max_length=150, default='Profesor Titular')
    biografia = models.TextField(blank=True, default='Docente de materias de computacion.')

    def __str__(self):
        return f"Prof. {self.usuario.nombre_completo}"


class Colegio(models.Model):
    nombre = models.CharField(max_length=200)
    ciudad = models.CharField(max_length=100, blank=True)
    pais = models.CharField(max_length=100, blank=True, default='Ecuador')
    direccion = models.CharField(max_length=300, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    logo_url = models.CharField(max_length=500, blank=True)
    color = models.CharField(max_length=30, default='#1E3A8A')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'colegios'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class DocenteColegio(models.Model):
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='colegios')
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='docentes')
    cargo = models.CharField(max_length=100, blank=True, default='Docente')
    fecha_incorporacion = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'docente_colegio'
        unique_together = ('docente', 'colegio')

    def __str__(self):
        return f"{self.docente.usuario.nombre_completo} -> {self.colegio.nombre}"


class Curso(models.Model):
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='cursos')
    nombre = models.CharField(max_length=100)
    grado = models.CharField(max_length=50)
    paralelo = models.CharField(max_length=10)
    nivel = models.CharField(max_length=100, blank=True)
    anio_lectivo = models.CharField(max_length=20, default='2026-2027')
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cursos'
        ordering = ['grado', 'paralelo']
        unique_together = ('colegio', 'grado', 'paralelo', 'anio_lectivo')

    def __str__(self):
        return f"{self.grado} '{self.paralelo}' - {self.colegio.nombre}"

    @property
    def nombre_completo(self):
        return f"{self.grado} \"{self.paralelo}\""

    @property
    def total_estudiantes(self):
        return self.estudiantes.count()


class Materia(models.Model):
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='materias')
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='materias')
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=30, blank=True)
    descripcion = models.TextField(blank=True)
    horas_semanales = models.IntegerField(default=2)
    color = models.CharField(max_length=30, default='#0284C7')
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'materias'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.curso})"


class Estudiante(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_estudiante')
    carrera_o_area = models.CharField(max_length=150, default='Ingenieria de Sistemas')
    biografia = models.TextField(blank=True, default='Estudiante de sistemas.')

    def __str__(self):
        return f"Est. {self.usuario.nombre_completo}"

    def actualizar_progreso(self):
        progreso, _ = ProgresoAcademico.objects.get_or_create(estudiante=self)
        progreso.recalcular()
        return progreso


class EstudianteCurso(models.Model):
    ESTADOS = (('ACTIVO', 'Activo'), ('RETIRADO', 'Retirado'), ('SUSPENDIDO', 'Suspendido'))
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='cursos_inscritos')
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='estudiantes')
    codigo_ru = models.CharField(max_length=50, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ACTIVO')
    fecha_inscripcion = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'estudiante_curso'
        unique_together = ('estudiante', 'curso')

    def __str__(self):
        return f"{self.estudiante.usuario.nombre_completo} -> {self.curso}"


class Invitacion(models.Model):
    ESTADOS = (('PENDIENTE', 'Pendiente'), ('ACEPTADA', 'Aceptada'), ('EXPIRADA', 'Expirada'))
    email = models.EmailField()
    nombre_completo = models.CharField(max_length=200)
    codigo_ru = models.CharField(max_length=50, blank=True)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='invitaciones', null=True, blank=True)
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='invitaciones')
    codigo_invitacion = models.CharField(max_length=50, unique=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_expiracion = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'invitaciones'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Inv. {self.email} ({self.estado})"


class InvitacionEspacio(models.Model):
    """Invitacion mediante codigo generado para unirse a un espacio."""
    ESTADOS = (('ACTIVO', 'Activo'), ('DESACTIVADO', 'Desactivado'))
    espacio = models.ForeignKey('Espacio', on_delete=models.CASCADE, related_name='invitaciones_codigo')
    codigo = models.CharField(max_length=20, unique=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ACTIVO')
    creado_por = models.ForeignKey('Docente', on_delete=models.CASCADE)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_expiracion = models.DateTimeField(null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invitaciones_espacio'

    def __str__(self):
        return f"Codigo {self.codigo} para {self.espacio.nombre}"


class Espacio(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    codigo = models.CharField(max_length=20, unique=True)
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='espacios')
    colegio = models.ForeignKey(Colegio, on_delete=models.SET_NULL, null=True, blank=True, related_name='espacios')
    curso = models.ForeignKey(Curso, on_delete=models.SET_NULL, null=True, blank=True, related_name='espacios')
    materia = models.ForeignKey(Materia, on_delete=models.SET_NULL, null=True, blank=True, related_name='espacios')
    color = models.CharField(max_length=30, default='#1E3A8A')
    icono = models.CharField(max_length=50, default='database')
    imagen_url = models.CharField(max_length=500, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'espacios'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} [{self.codigo}]"

    @property
    def total_estudiantes(self):
        return self.miembros.count()

    @property
    def total_tareas(self):
        return self.tareas.filter(estado='PUBLICADA').count()


class MiembroEspacio(models.Model):
    espacio = models.ForeignKey(Espacio, on_delete=models.CASCADE, related_name='miembros')
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='espacios_inscritos')
    fecha_union = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'miembros_espacio'
        unique_together = ('espacio', 'estudiante')
        ordering = ['-fecha_union']

    def __str__(self):
        return f"{self.estudiante.usuario.nombre_completo} en {self.espacio.nombre}"


class Rubrica(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='rubricas')
    puntaje_total = models.IntegerField(default=100)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rubricas'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Rubrica: {self.nombre}"


class CriterioRubrica(models.Model):
    rubrica = models.ForeignKey(Rubrica, on_delete=models.CASCADE, related_name='criterios')
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    puntaje_maximo = models.IntegerField(default=20)
    orden = models.IntegerField(default=0)

    class Meta:
        db_table = 'criterios_rubrica'
        ordering = ['orden']

    def __str__(self):
        return f"{self.nombre} ({self.puntaje_maximo} pts)"


class Tarea(models.Model):
    ESTADOS = (('BORRADOR', 'Borrador'), ('PUBLICADA', 'Publicada'), ('FINALIZADA', 'Finalizada'))
    espacio = models.ForeignKey(Espacio, on_delete=models.CASCADE, related_name='tareas')
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='tareas')
    rubrica = models.ForeignKey(Rubrica, on_delete=models.SET_NULL, null=True, blank=True, related_name='tareas')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    indicaciones = models.TextField(blank=True)
    puntaje_maximo = models.IntegerField(default=100)
    fecha_publicacion = models.DateTimeField(default=timezone.now)
    fecha_limite = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PUBLICADA')

    class Meta:
        db_table = 'tareas'
        ordering = ['fecha_limite']

    def __str__(self):
        return f"{self.titulo} ({self.espacio.nombre})"

    @property
    def esta_vencida(self):
        return timezone.now() > self.fecha_limite


class Material(models.Model):
    TIPOS = (('PDF', 'PDF'), ('DOCUMENTO', 'Word'), ('PRESENTACION', 'PPT'),
             ('HOJA_CALCULO', 'Excel'), ('ENLACE', 'Enlace'), ('IMAGEN', 'Imagen'), ('ZIP', 'ZIP'))
    tarea = models.ForeignKey(Tarea, on_delete=models.CASCADE, related_name='materiales')
    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=30, choices=TIPOS, default='PDF')
    archivo = models.FileField(upload_to='materiales/', null=True, blank=True)
    archivo_url = models.CharField(max_length=500, blank=True)
    tamano = models.CharField(max_length=30, default='1.2 MB')

    class Meta:
        db_table = 'materiales'

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"


class Entrega(models.Model):
    ESTADOS = (('ASIGNADA', 'Asignada'), ('EN_PROCESO', 'En proceso'), ('ENTREGADO', 'Entregada'),
               ('EN_REVISION', 'En revision'), ('CALIFICADO', 'Calificada'),
               ('RETROALIMENTADA', 'Retroalimentada'), ('VENCIDA', 'Vencida'), ('ATRASADO', 'Atrasado'))
    tarea = models.ForeignKey(Tarea, on_delete=models.CASCADE, related_name='entregas')
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='entregas')
    fecha_entrega = models.DateTimeField(default=timezone.now)
    archivo = models.FileField(upload_to='entregas/', null=True, blank=True)
    archivo_url = models.CharField(max_length=500, blank=True)
    archivo_nombre = models.CharField(max_length=255, blank=True)
    archivo_tamano = models.CharField(max_length=30, blank=True, default='1.8 MB')
    observaciones = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ENTREGADO')

    class Meta:
        db_table = 'entregas'
        unique_together = ('tarea', 'estudiante')
        ordering = ['-fecha_entrega']

    def __str__(self):
        return f"Entrega de {self.estudiante.usuario.nombre_completo} - {self.tarea.titulo}"

    def save(self, *args, **kwargs):
        if self.fecha_entrega > self.tarea.fecha_limite and self.estado in ['ENTREGADO', 'EN_PROCESO']:
            self.estado = 'ATRASADO'
        super().save(*args, **kwargs)
        self.estudiante.actualizar_progreso()


class Calificacion(models.Model):
    entrega = models.OneToOneField(Entrega, on_delete=models.CASCADE, related_name='calificacion')
    nota = models.FloatField()
    fecha_calificacion = models.DateTimeField(default=timezone.now)
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='calificaciones')

    class Meta:
        db_table = 'calificaciones'
        ordering = ['-fecha_calificacion']

    def __str__(self):
        return f"{self.nota}/100"

    def save(self, *args, **kwargs):
        nota_anterior = None
        if self.pk:
            try:
                nota_anterior = Calificacion.objects.get(pk=self.pk).nota
            except Calificacion.DoesNotExist:
                pass
        super().save(*args, **kwargs)
        if nota_anterior is not None and nota_anterior != self.nota:
            HistorialCalificacion.objects.create(
                calificacion=self, nota_anterior=nota_anterior,
                nota_nueva=self.nota, docente=self.docente
            )
        if hasattr(self, 'retroalimentacion'):
            self.entrega.estado = 'RETROALIMENTADA'
        else:
            self.entrega.estado = 'CALIFICADO'
        self.entrega.save(update_fields=['estado'])
        self.entrega.estudiante.actualizar_progreso()
        Notificacion.objects.create(
            usuario=self.entrega.estudiante.usuario, tipo='CALIFICADA',
            mensaje=f"Tu tarea '{self.entrega.tarea.titulo}' fue calificada con {self.nota}/100.",
            espacio_id=self.entrega.tarea.espacio.id, tarea_id=self.entrega.tarea.id
        )


class HistorialCalificacion(models.Model):
    calificacion = models.ForeignKey(Calificacion, on_delete=models.CASCADE, related_name='historial')
    nota_anterior = models.FloatField()
    nota_nueva = models.FloatField()
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='historial_calificaciones')
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    motivo = models.TextField(blank=True)

    class Meta:
        db_table = 'historial_calificaciones'
        ordering = ['-fecha_cambio']

    def __str__(self):
        return f"Cambio {self.nota_anterior}->{self.nota_nueva}"


class Retroalimentacion(models.Model):
    calificacion = models.OneToOneField(Calificacion, on_delete=models.CASCADE, related_name='retroalimentacion')
    comentario = models.TextField()
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'retroalimentaciones'
        ordering = ['-fecha']

    def __str__(self):
        return f"Retro: {self.calificacion.entrega.tarea.titulo}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.calificacion.entrega.estado = 'RETROALIMENTADA'
        self.calificacion.entrega.save(update_fields=['estado'])
        Notificacion.objects.create(
            usuario=self.calificacion.entrega.estudiante.usuario, tipo='RETROALIMENTACION',
            mensaje=f"Retroalimentacion recibida para '{self.calificacion.entrega.tarea.titulo}'.",
            espacio_id=self.calificacion.entrega.tarea.espacio.id,
            tarea_id=self.calificacion.entrega.tarea.id
        )


class ProgresoAcademico(models.Model):
    estudiante = models.OneToOneField(Estudiante, on_delete=models.CASCADE, related_name='progreso')
    promedio = models.FloatField(default=0.0)
    tareas_entregadas = models.IntegerField(default=0)
    tareas_pendientes = models.IntegerField(default=0)
    tareas_calificadas = models.IntegerField(default=0)
    tareas_vencidas = models.IntegerField(default=0)
    porcentaje_cumplimiento = models.FloatField(default=0.0)

    class Meta:
        db_table = 'progreso_academico'

    def __str__(self):
        return f"Progreso {self.estudiante.usuario.nombre_completo}: {self.porcentaje_cumplimiento}%"

    def recalcular(self):
        espacios_ids = self.estudiante.espacios_inscritos.values_list('espacio_id', flat=True)
        tareas_totales = Tarea.objects.filter(espacio_id__in=espacios_ids, estado='PUBLICADA')
        total_count = tareas_totales.count()
        entregas = Entrega.objects.filter(estudiante=self.estudiante, tarea__in=tareas_totales)
        entregadas_count = entregas.filter(estado__in=['ENTREGADO', 'CALIFICADO', 'RETROALIMENTADA', 'ATRASADO']).count()
        calificadas_count = entregas.filter(estado__in=['CALIFICADO', 'RETROALIMENTADA']).count()
        entregadas_ids = entregas.values_list('tarea_id', flat=True)
        vencidas_count = tareas_totales.exclude(id__in=entregadas_ids).filter(fecha_limite__lt=timezone.now()).count()
        calificaciones = Calificacion.objects.filter(entrega__estudiante=self.estudiante)
        avg_nota = calificaciones.aggregate(Avg('nota'))['nota__avg'] or 0.0
        self.tareas_entregadas = entregadas_count
        self.tareas_calificadas = calificadas_count
        self.tareas_vencidas = vencidas_count
        self.tareas_pendientes = max(0, total_count - entregadas_count)
        self.porcentaje_cumplimiento = round((entregadas_count / total_count * 100.0), 1) if total_count > 0 else 0.0
        self.promedio = round(float(avg_nota), 1)
        self.save()


class Notificacion(models.Model):
    TIPOS = (('NUEVA_TAREA', 'Nueva Tarea'), ('PROXIMA_VENCER', 'Proxima a Vencer'),
             ('VENCIDA', 'Vencida'), ('CALIFICADA', 'Calificada'), ('RETROALIMENTACION', 'Retroalimentacion'),
             ('INVITACION_ESPACIO', 'Espacio'), ('ENTREGA_CONFIRMADA', 'Entrega'), ('INVITACION_COLEGIO', 'Colegio'))
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=30, choices=TIPOS, default='NUEVA_TAREA')
    mensaje = models.TextField()
    fecha = models.DateTimeField(default=timezone.now)
    leida = models.BooleanField(default=False)
    espacio_id = models.IntegerField(null=True, blank=True)
    tarea_id = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'notificaciones'
        ordering = ['-fecha']

    def __str__(self):
        return f"Notif [{self.tipo}] -> {self.usuario.username}"

# ==============================================================================
# GAMIFICACIÓN PREMIUM
# ==============================================================================

class Badge(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    icono_url = models.CharField(max_length=500, blank=True)
    puntos_requeridos = models.IntegerField(default=0)
    codigo = models.CharField(max_length=50, unique=True, default='badge')

    class Meta:
        db_table = 'badges'

    def __str__(self):
        return self.nombre

class UserBadge(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    fecha_obtencion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_badges'
        unique_together = ('usuario', 'badge')

class Challenge(models.Model):
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField()
    recompensa_puntos = models.IntegerField(default=10)
    recompensa_coins = models.IntegerField(default=5)
    activo = models.BooleanField(default=True)
    fecha_limite = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'challenges'

    def __str__(self):
        return self.titulo

class UserChallenge(models.Model):
    ESTADOS = (('ACTIVO', 'Activo'), ('COMPLETADO', 'Completado'))
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='retos')
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ACTIVO')
    progreso = models.IntegerField(default=0)
    meta = models.IntegerField(default=1)

    class Meta:
        db_table = 'user_challenges'
        unique_together = ('usuario', 'challenge')

class Event(models.Model):
    nombre = models.CharField(max_length=150)
    multiplicador = models.FloatField(default=1.0)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()

    class Meta:
        db_table = 'events'

class CoinTransaction(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='transacciones_coins')
    cantidad = models.IntegerField()
    razon = models.CharField(max_length=200)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coin_transactions'
