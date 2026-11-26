from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.http import HttpResponse
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from .validators import validate_file_size, validate_file_extension, sanitize_filename, validate_grade
from .email_service import send_grade_notification_email, send_password_reset_email
from .pdf_service import generate_student_boletin_pdf
from .analisis_numerico import (
    calcular_regresion_lineal,
    calcular_interpolacion_lagrange,
    calcular_extrapolacion_rendimiento,
    calcular_irec_trapecio,
    calcular_irec_simpson,
    calcular_nota_necesaria,
    calcular_nivelacion_newton_raphson
)

from .models import (
    Usuario, Docente, Estudiante, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, VersionEntrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion, AvisoEspacio, RecursoEspacio,
    ExtensionFechaTarea, PlantillaTarea, TareaVisualizacion,
    IntentoPracticaEstudiante, EstudianteCurso, PracticaTema, TemaAvance
)
from .serializers import (
    UsuarioSerializer, DocenteSerializer, EstudianteSerializer,
    EspacioSerializer, TareaSerializer, MaterialSerializer,
    EntregaSerializer, VersionEntregaSerializer, CalificacionSerializer, RetroalimentacionSerializer,
    ProgresoAcademicoSerializer, NotificacionSerializer,
    AvisoEspacioSerializer, RecursoEspacioSerializer, PlantillaTareaSerializer
)
# MongoDB - Servicios de registro de actividad
from .mongo_services import (
    log_actividad,
    registrar_sesion,
    cerrar_sesion,
    guardar_notificacion,
    log_badge_obtenido,
    log_coin_transaction,
)


# ==============================================================================
# 1. AUTENTICACIÓN, REGISTRO Y PERFIL
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    data = request.data
    demo_role = data.get('demo_role')

    if demo_role:
        if demo_role in ['docente', 'docente_carlos', 'profesor']:
            user = Usuario.objects.filter(rol='DOCENTE').first()
        else:
            user = Usuario.objects.filter(rol='ESTUDIANTE').first()

        if not user:
            return Response({'error': 'Usuario de demostración no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        login(request, user)
        # Ensure profile exists for demo accounts
        if user.rol == 'ESTUDIANTE' and not hasattr(user, 'perfil_estudiante'):
            Estudiante.objects.create(usuario=user)
        elif user.rol == 'DOCENTE' and not hasattr(user, 'perfil_docente'):
            Docente.objects.create(
                usuario=user,
                especialidad='Docencia e Investigación',
                titulo_academico='Profesor Titular'
            )
    else:
        email_or_user = data.get('email') or data.get('username')
        password = data.get('password')
        if not email_or_user or not password:
            return Response({'error': 'Por favor ingrese su correo y contraseña.'}, status=status.HTTP_400_BAD_REQUEST)

        # Allow login by email or username
        user = Usuario.objects.filter(Q(email__iexact=email_or_user) | Q(username__iexact=email_or_user)).first()
        if user and user.check_password(password):
            if user.estado == 'INACTIVO':
                return Response(
                    {'error': 'Tu cuenta está en proceso de revisión de documentos. Te avisaremos cuando tu carnet sea validado por la institución.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            login(request, user)
            # Ensure profile exists for real accounts
            if user.rol == 'ESTUDIANTE' and not hasattr(user, 'perfil_estudiante'):
                Estudiante.objects.create(usuario=user)
            elif user.rol == 'DOCENTE' and not hasattr(user, 'perfil_docente'):
                Docente.objects.create(
                    usuario=user,
                    especialidad='Docencia e Investigación',
                    titulo_academico='Profesor Titular'
                )
        else:
            return Response({'error': 'Credenciales inválidas. Verifique su correo y contraseña.'}, status=status.HTTP_401_UNAUTHORIZED)

    profile_data = UsuarioSerializer(user).data
    role_info = {}
    if user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
        est = user.perfil_estudiante
        est.actualizar_progreso()
        role_info = {
            'estudiante_id': est.id,
            'carrera_o_area': est.carrera_o_area,
            'biografia': est.biografia,
        }
    elif user.rol == 'DOCENTE':
        doc = getattr(user, 'perfil_docente', None)
        if not doc:
            doc, _ = Docente.objects.get_or_create(
                usuario=user,
                defaults={'especialidad': 'Docencia e Investigación', 'titulo_academico': 'Profesor Titular'}
            )
        role_info = {
            'docente_id': doc.id,
            'especialidad': doc.especialidad,
            'titulo_academico': doc.titulo_academico,
            'biografia': doc.biografia,
        }

    # MongoDB: registrar sesion e inicio de sesion
    ip = request.META.get('REMOTE_ADDR')
    ua = request.META.get('HTTP_USER_AGENT', '')
    registrar_sesion(usuario_id=user.id, ip=ip, user_agent=ua)
    log_actividad(
        usuario_id=user.id,
        accion='LOGIN',
        detalle=f'Inicio de sesion: {user.username} [{user.rol}]',
        extra={'ip': ip, 'demo': bool(demo_role)}
    )

    return Response({
        'user': profile_data,
        'role_info': role_info,
        'message': f'¡Bienvenido a EDUSMART, {user.nombre_completo}!'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def api_register(request):
    # Accepts multipart/form-data for carnet upload
    data = request.data
    nombre_completo = (data.get('nombre_completo') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''
    rol = (data.get('rol') or 'ESTUDIANTE').upper()

    if not nombre_completo:
        return Response({'error': 'El nombre completo es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
    if not email or '@' not in email:
        return Response({'error': 'Ingrese un correo electrónico válido.'}, status=status.HTTP_400_BAD_REQUEST)
    if not password or len(password) < 6:
        return Response({'error': 'La contraseña debe tener al menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)
    if password != confirm_password:
        return Response({'error': 'Las contraseñas no coinciden.'}, status=status.HTTP_400_BAD_REQUEST)
    if rol not in ['DOCENTE', 'ESTUDIANTE']:
        return Response({'error': 'El rol seleccionado no es válido. Debe ser DOCENTE o ESTUDIANTE.'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Validate teacher registration ──────────────────────────────────────────
    if rol == 'DOCENTE':
        carnet_file = request.FILES.get('carnet_imagen')
        if not carnet_file:
            return Response(
                {'error': 'Para registrarse como Docente debes subir o escanear una foto de tu carnet institucional o documento de identidad.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Process carnet_file if needed (e.g. save to model)

    if Usuario.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).exists():
        return Response({'error': 'Ya existe una cuenta registrada con este correo electrónico.'}, status=status.HTTP_400_BAD_REQUEST)

    parts = nombre_completo.split(' ', 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ''

    # Generate initials-based avatar
    avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={first_name}+{last_name}&backgroundColor=1e3a8a,0284c7,0d9488"

    user = Usuario.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        rol=rol,
        avatar_url=avatar_url,
        estado='ACTIVO',
        telefono=(data.get('telefono') or '').strip()
    )

    role_info = {}
    if rol == 'DOCENTE':
        doc = Docente.objects.create(
            usuario=user,
            especialidad=data.get('especialidad', 'Docencia e Investigación'),
            titulo_academico=data.get('titulo_academico', 'Docente Titular')
        )
        role_info = {
            'docente_id': doc.id,
            'especialidad': doc.especialidad,
            'titulo_academico': doc.titulo_academico
        }
    else:
        est = Estudiante.objects.create(
            usuario=user,
            carrera_o_area=data.get('carrera_o_area', 'Ingeniería y Tecnología'),
            nombre_tutor=(data.get('nombre_tutor') or '').strip(),
            relacion_tutor=(data.get('relacion_tutor') or 'PADRE').strip(),
            telefono_tutor=(data.get('telefono_tutor') or '').strip(),
        )
        est.actualizar_progreso()
        role_info = {
            'estudiante_id': est.id,
            'carrera_o_area': est.carrera_o_area
        }

    login(request, user)

    # MongoDB: registrar nuevo usuario y primera sesion
    log_actividad(
        usuario_id=user.id,
        accion='REGISTRO',
        detalle=f'Nuevo usuario registrado: {user.username} [{rol}]',
        extra={'nombre': user.nombre_completo, 'rol': rol}
    )
    registrar_sesion(
        usuario_id=user.id,
        ip=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )

    return Response({
        'user': UsuarioSerializer(user).data,
        'role_info': role_info,
        'message': f'¡Cuenta creada exitosamente! Bienvenido a EDUSMART, {user.nombre_completo}.'
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def api_logout(request):
    if request.user.is_authenticated:
        # MongoDB: cerrar sesion activa y registrar log
        cerrar_sesion(usuario_id=request.user.id)
        log_actividad(
            usuario_id=request.user.id,
            accion='LOGOUT',
            detalle=f'Cierre de sesion: {request.user.username}'
        )
    logout(request)
    return Response({'message': 'Sesión finalizada correctamente.'})


@api_view(['GET'])
def api_me(request):
    if not request.user.is_authenticated:
        return Response({'authenticated': False})

    user = request.user
    profile_data = UsuarioSerializer(user).data
    role_info = {}
    if user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
        est = user.perfil_estudiante
        role_info = {
            'estudiante_id': est.id,
            'carrera_o_area': est.carrera_o_area,
            'biografia': est.biografia,
        }
    elif user.rol == 'DOCENTE':
        doc = getattr(user, 'perfil_docente', None)
        if not doc:
            doc, _ = Docente.objects.get_or_create(
                usuario=user,
                defaults={'especialidad': 'Docencia e Investigación', 'titulo_academico': 'Profesor Titular'}
            )
        role_info = {
            'docente_id': doc.id,
            'especialidad': doc.especialidad,
            'titulo_academico': doc.titulo_academico,
            'biografia': doc.biografia,
        }

    return Response({
        'authenticated': True,
        'user': profile_data,
        'role_info': role_info
    })


# ==============================================================================
# 2. ESPACIOS ACADÉMICOS ("MIS ESPACIOS")
# ==============================================================================

@api_view(['GET', 'POST'])
def api_espacios(request):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'No autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        if user.rol == 'DOCENTE' and hasattr(user, 'perfil_docente'):
            espacios = Espacio.objects.filter(docente=user.perfil_docente)
        elif user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
            espacios_ids = user.perfil_estudiante.get_espacios_ids()
            espacios = Espacio.objects.filter(id__in=espacios_ids)
        else:
            espacios = Espacio.objects.none()

        serializer = EspacioSerializer(espacios, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
            return Response({'error': 'Solo los docentes pueden crear espacios académicos.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        nombre = (data.get('nombre') or '').strip()
        descripcion = (data.get('descripcion') or '').strip()
        codigo = (data.get('codigo') or '').strip().upper()
        icono = data.get('icono') or 'database'
        color = data.get('color') or '#1E3A8A'
        imagen_url = data.get('imagen_url') or ''

        if not nombre:
            return Response({'error': 'El nombre del espacio es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        if not codigo:
            # Auto-generate a clean code based on initials and year
            base_code = ''.join([w[0] for w in nombre.split() if w])[:4].upper()
            codigo = f"{base_code}2026"

        # Check unique code
        if Espacio.objects.filter(codigo=codigo).exists():
            return Response({'error': f'El código de espacio "{codigo}" ya está en uso. Por favor elija otro.'}, status=status.HTTP_400_BAD_REQUEST)

        espacio = Espacio.objects.create(
            nombre=nombre,
            descripcion=descripcion,
            codigo=codigo,
            docente=user.perfil_docente,
            icono=icono,
            color=color,
            imagen_url=imagen_url
        )

        return Response(EspacioSerializer(espacio, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def api_unirse_espacio(request):
    user = request.user
    if user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Solo los estudiantes pueden unirse a espacios mediante código.'}, status=status.HTTP_403_FORBIDDEN)

    codigo = (request.data.get('codigo') or '').strip().upper()
    if not codigo:
        return Response({'error': 'Por favor ingrese el código del espacio.'}, status=status.HTTP_400_BAD_REQUEST)

    espacio = Espacio.objects.filter(codigo=codigo).first()
    if not espacio:
        return Response({'error': f'No se encontró ningún espacio con el código "{codigo}". Verifíquelo con su docente.'}, status=status.HTTP_404_NOT_FOUND)

    estudiante = user.perfil_estudiante
    miembro, created = MiembroEspacio.objects.get_or_create(espacio=espacio, estudiante=estudiante)

    if not created:
        return Response({'message': f'Ya perteneces al espacio "{espacio.nombre}".', 'espacio': EspacioSerializer(espacio, context={'request': request}).data})

    # Recalculate student progress
    estudiante.actualizar_progreso()

    # Create notification for student
    Notificacion.objects.create(
        usuario=user,
        tipo='INVITACION_ESPACIO',
        mensaje=f'Te has unido exitosamente al espacio académico "{espacio.nombre}".',
        espacio_id=espacio.id
    )

    return Response({
        'message': f'¡Te has unido exitosamente a "{espacio.nombre}"!',
        'espacio': EspacioSerializer(espacio, context={'request': request}).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def api_espacio_detail(request, pk):
    user = request.user
    espacio = get_object_or_404(Espacio, id=pk)

    # Permissions check
    if user.rol == 'DOCENTE':
        if espacio.docente.usuario != user:
            return Response({'error': 'No tienes permisos para ver este espacio.'}, status=status.HTTP_403_FORBIDDEN)
    else:
        est = getattr(user, 'perfil_estudiante', None)
        if not est:
            return Response({'error': 'Perfil de estudiante no encontrado.'}, status=status.HTTP_403_FORBIDDEN)
        is_miembro = MiembroEspacio.objects.filter(espacio=espacio, estudiante=est).exists()
        is_in_curso = bool(espacio.curso and EstudianteCurso.objects.filter(curso=espacio.curso, estudiante=est, estado='ACTIVO').exists())
        if not (is_miembro or is_in_curso):
            return Response({'error': 'No estás inscrito en este espacio.'}, status=status.HTTP_403_FORBIDDEN)

    # Space data
    espacio_data = EspacioSerializer(espacio, context={'request': request}).data

    # Tasks of this space
    tareas = espacio.tareas.all()
    tareas_data = TareaSerializer(tareas, many=True, context={'request': request}).data

    # Recent activity inside space
    actividades = []
    # 1. Tasks published
    for t in tareas[:5]:
        actividades.append({
            'tipo': 'TAREA_PUBLICADA',
            'titulo': f'Se publicó la tarea: {t.titulo}',
            'fecha': t.fecha_publicacion,
            'icono': 'file-text'
        })
    # 2. Submissions / grades in this space
    if user.rol == 'ESTUDIANTE':
        entregas = Entrega.objects.filter(tarea__espacio=espacio, estudiante=user.perfil_estudiante)
        for e in entregas:
            actividades.append({
                'tipo': 'ENTREGA_ENVIADA',
                'titulo': f'Entregaste: {e.tarea.titulo}',
                'fecha': e.fecha_entrega,
                'icono': 'check-circle'
            })
            if hasattr(e, 'calificacion'):
                actividades.append({
                    'tipo': 'CALIFICACION',
                    'titulo': f'Calificación recibida en "{e.tarea.titulo}": {e.calificacion.nota}/100',
                    'fecha': e.calificacion.fecha_calificacion,
                    'icono': 'award'
                })
    else:
        # Teacher view of submissions
        entregas = Entrega.objects.filter(tarea__espacio=espacio).order_by('-fecha_entrega')[:8]
        for e in entregas:
            actividades.append({
                'tipo': 'ENTREGA_RECIBIDA',
                'titulo': f'{e.estudiante.usuario.nombre_completo} entregó "{e.tarea.titulo}"',
                'fecha': e.fecha_entrega,
                'icono': 'inbox'
            })

    actividades.sort(key=lambda x: x['fecha'], reverse=True)

    # Members list (for teacher)
    miembros = []
    if user.rol == 'DOCENTE':
        for m in espacio.miembros.select_related('estudiante__usuario'):
            miembros.append({
                'id': m.estudiante.id,
                'nombre': m.estudiante.usuario.nombre_completo,
                'email': m.estudiante.usuario.email,
                'avatar': m.estudiante.usuario.avatar_url,
                'fecha_union': m.fecha_union
            })

    # Temas avanzados y recursos subidos por el docente
    temas_avance = []
    if espacio.materia:
        temas_qs = TemaAvance.objects.filter(materia=espacio.materia).order_by('orden', 'id')
        for t in temas_qs:
            temas_avance.append({
                'id': t.id,
                'titulo': t.titulo,
                'unidad': t.unidad,
                'orden': t.orden,
                'estado': t.estado,
                'descripcion': t.descripcion,
                'fecha_inicio': t.fecha_inicio.strftime('%d/%m/%Y') if t.fecha_inicio else None,
                'fecha_fin': t.fecha_fin.strftime('%d/%m/%Y') if t.fecha_fin else None,
            })

    recursos_qs = RecursoEspacio.objects.filter(espacio=espacio).order_by('-fecha_subida')
    recursos_data = RecursoEspacioSerializer(recursos_qs, many=True).data

    return Response({
        'espacio': espacio_data,
        'tareas': tareas_data,
        'actividad': actividades[:10],
        'miembros': miembros,
        'temas_avance': temas_avance,
        'recursos': recursos_data,
    })


# ==============================================================================
# 3. TAREAS ACADÉMICAS
# ==============================================================================

@api_view(['GET', 'POST'])
def api_tareas(request):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'No autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        espacio_id = request.query_params.get('espacio_id')
        filtro = request.query_params.get('filtro', 'pendientes').lower()

        if user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
            estudiante = user.perfil_estudiante
            espacios_ids = estudiante.get_espacios_ids()
            tareas = Tarea.objects.filter(espacio_id__in=espacios_ids, estado='PUBLICADA')

            if espacio_id:
                tareas = tareas.filter(espacio_id=espacio_id)

            # Apply filters: pendientes, entregadas_calificadas, vencidas, todas
            now = timezone.now()
            entregas_map = {e.tarea_id: e for e in Entrega.objects.filter(estudiante=estudiante)}

            filtered_tareas = []
            for t in tareas:
                entrega = entregas_map.get(t.id)
                estado_ciclo = 'ASIGNADA'
                if entrega:
                    if hasattr(entrega, 'calificacion'):
                        if hasattr(entrega.calificacion, 'retroalimentacion'):
                            estado_ciclo = 'RETROALIMENTADA'
                        else:
                            estado_ciclo = 'CALIFICADA'
                    elif entrega.estado == 'EN_PROCESO':
                        estado_ciclo = 'EN_PROCESO'
                    elif entrega.estado == 'EN_REVISION':
                        estado_ciclo = 'EN_REVISION'
                    else:
                        estado_ciclo = 'ENTREGADA'
                elif t.fecha_limite < now:
                    estado_ciclo = 'VENCIDA'

                if filtro in ['todas', 'todos']:
                    filtered_tareas.append(t)
                elif filtro == 'pendientes' and estado_ciclo in ['ASIGNADA', 'EN_PROCESO']:
                    filtered_tareas.append(t)
                elif filtro in ['entregadas', 'calificadas', 'entregadas_calificadas', 'entregadas_y_calificadas'] and estado_ciclo in ['ENTREGADA', 'EN_REVISION', 'CALIFICADA', 'RETROALIMENTADA']:
                    filtered_tareas.append(t)
                elif filtro == 'vencidas' and estado_ciclo == 'VENCIDA':
                    filtered_tareas.append(t)

            serializer = TareaSerializer(filtered_tareas, many=True, context={'request': request})
            return Response(serializer.data)

        elif user.rol == 'DOCENTE' and hasattr(user, 'perfil_docente'):
            docente = user.perfil_docente
            tareas = Tarea.objects.filter(docente=docente)
            if espacio_id:
                tareas = tareas.filter(espacio_id=espacio_id)
            serializer = TareaSerializer(tareas, many=True, context={'request': request})
            return Response(serializer.data)

        return Response([])

    elif request.method == 'POST':
        if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
            return Response({'error': 'Solo los docentes pueden publicar tareas.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        espacio_id = data.get('espacio_id') or data.get('curso_id')
        titulo = (data.get('titulo') or '').strip()
        descripcion = (data.get('descripcion') or '').strip()
        indicaciones = (data.get('indicaciones') or '').strip()
        puntaje_maximo = int(data.get('puntaje_maximo') or 100)
        fecha_limite = data.get('fecha_limite')

        if not espacio_id or not titulo or not fecha_limite:
            return Response({'error': 'Por favor complete el espacio, título y fecha límite.'}, status=status.HTTP_400_BAD_REQUEST)

        espacio = get_object_or_404(Espacio, id=espacio_id, docente=user.perfil_docente)

        tarea = Tarea.objects.create(
            espacio=espacio,
            docente=user.perfil_docente,
            titulo=titulo,
            descripcion=descripcion,
            indicaciones=indicaciones,
            puntaje_maximo=puntaje_maximo,
            fecha_limite=fecha_limite,
            estado='PUBLICADA'
        )

        # Attach materials if provided
        mat_nombre = data.get('material_nombre')
        mat_url = data.get('material_url')
        if mat_nombre and mat_url:
            Material.objects.create(
                tarea=tarea,
                nombre=mat_nombre,
                tipo=data.get('material_tipo', 'PDF'),
                archivo_url=mat_url,
                tamano=data.get('material_tamano', '1.5 MB')
            )

        # Send notifications to enrolled students
        for miembro in espacio.miembros.select_related('estudiante__usuario'):
            Notificacion.objects.create(
                usuario=miembro.estudiante.usuario,
                tipo='NUEVA_TAREA',
                mensaje=f"Se publicó la tarea '{tarea.titulo}' en el espacio '{espacio.nombre}'. Fecha límite: {tarea.fecha_limite.strftime('%d/%m/%Y')}.",
                espacio_id=espacio.id,
                tarea_id=tarea.id
            )
            miembro.estudiante.actualizar_progreso()

        return Response({
            'message': f"Tarea '{tarea.titulo}' publicada correctamente.",
            'tarea': TareaSerializer(tarea, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def api_tarea_detail(request, pk):
    tarea = get_object_or_404(Tarea, id=pk)
    user = request.user

    data = TareaSerializer(tarea, context={'request': request}).data

    # Calculate Visual Pipeline state for student
    if user.is_authenticated and user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
        vista, created = TareaVisualizacion.objects.get_or_create(
            tarea=tarea, estudiante=user.perfil_estudiante,
            defaults={'fecha_primera_vista': timezone.now(), 'fecha_ultima_vista': timezone.now(), 'total_vistas': 1}
        )
        if not created:
            vista.total_vistas += 1
            vista.fecha_ultima_vista = timezone.now()
            vista.save(update_fields=['total_vistas', 'fecha_ultima_vista'])

        entrega = Entrega.objects.filter(tarea=tarea, estudiante=user.perfil_estudiante).first()
        now = timezone.now()

        # Visual pipeline steps: ASIGNADA -> EN PROCESO -> ENTREGADA -> EN REVISION -> CALIFICADA -> RETROALIMENTADA
        pasos = [
            {'id': 'ASIGNADA', 'label': 'Asignada', 'completado': True, 'fecha': tarea.fecha_publicacion},
            {'id': 'EN_PROCESO', 'label': 'En proceso', 'completado': bool(entrega), 'fecha': None},
            {'id': 'ENTREGADA', 'label': 'Entregada', 'completado': bool(entrega and entrega.estado != 'EN_PROCESO'), 'fecha': entrega.fecha_entrega if entrega else None},
            {'id': 'EN_REVISION', 'label': 'En revisión', 'completado': bool(entrega and entrega.estado in ['EN_REVISION', 'CALIFICADO', 'RETROALIMENTADA']), 'fecha': None},
            {'id': 'CALIFICADA', 'label': 'Calificada', 'completado': bool(entrega and hasattr(entrega, 'calificacion')), 'fecha': entrega.calificacion.fecha_calificacion if (entrega and hasattr(entrega, 'calificacion')) else None},
            {'id': 'RETROALIMENTADA', 'label': 'Retroalimentada', 'completado': bool(entrega and hasattr(entrega, 'calificacion') and hasattr(entrega.calificacion, 'retroalimentacion')), 'fecha': entrega.calificacion.retroalimentacion.fecha if (entrega and hasattr(entrega, 'calificacion') and hasattr(entrega.calificacion, 'retroalimentacion')) else None},
        ]

        estado_actual = 'ASIGNADA'
        if entrega:
            if hasattr(entrega, 'calificacion') and hasattr(entrega.calificacion, 'retroalimentacion'):
                estado_actual = 'RETROALIMENTADA'
            elif hasattr(entrega, 'calificacion'):
                estado_actual = 'CALIFICADA'
            elif entrega.estado == 'EN_REVISION':
                estado_actual = 'EN_REVISION'
            elif entrega.estado in ['ENTREGADO', 'ATRASADO']:
                estado_actual = 'ENTREGADA'
            elif entrega.estado == 'EN_PROCESO':
                estado_actual = 'EN_PROCESO'
        elif tarea.esta_vencida:
            estado_actual = 'VENCIDA'

        data['pipeline'] = {
            'estado_actual': estado_actual,
            'pasos': pasos,
            'esta_vencida': tarea.esta_vencida
        }

    return Response(data)


# ==============================================================================
# 4. PRESENTACIÓN DE TAREA (ESTUDIANTE)
# ==============================================================================

@api_view(['POST'])
@transaction.atomic
def api_presentar_tarea(request, pk):
    user = request.user
    if user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Solo los estudiantes pueden presentar tareas.'}, status=status.HTTP_403_FORBIDDEN)

    tarea = get_object_or_404(Tarea, id=pk)
    estudiante = user.perfil_estudiante

    # Verificación de inscripción (Seguridad FASE 2)
    if tarea.espacio_id not in estudiante.get_espacios_ids():
        return Response({
            'error': 'No estás inscrito en el espacio o curso correspondiente a esta tarea.'
        }, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    archivo_subido = request.FILES.get('archivo')
    if archivo_subido:
        try:
            validate_file_size(archivo_subido)
            validate_file_extension(archivo_subido)
        except Exception as e:
            msg = getattr(e, 'message', str(e))
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
        archivo_nombre = sanitize_filename(archivo_subido.name)
        archivo_tamano = f"{round(archivo_subido.size / (1024 * 1024), 2)} MB"
        archivo_url = data.get('archivo_url') or f"/media/entregas/{archivo_nombre}"
    else:
        archivo_url = data.get('archivo_url') or 'https://edusmart.cloud/storage/entregas/trabajo_practico.pdf'
        archivo_nombre = sanitize_filename(data.get('archivo_nombre') or 'trabajo_academico_edusmart.pdf')
        archivo_tamano = data.get('archivo_tamano') or '2.4 MB'
    observaciones = data.get('observaciones') or ''

    now = timezone.now()
    # Check if student has an individual deadline extension
    extension = ExtensionFechaTarea.objects.filter(tarea=tarea, estudiante=estudiante).first()
    fecha_limite_efectiva = extension.nueva_fecha_limite if extension else tarea.fecha_limite

    estado = 'ATRASADO' if now > fecha_limite_efectiva else 'ENTREGADO'

    entrega, created = Entrega.objects.get_or_create(
        tarea=tarea,
        estudiante=estudiante,
        defaults={
            'archivo_url': archivo_url,
            'archivo_nombre': archivo_nombre,
            'archivo_tamano': archivo_tamano,
            'observaciones': observaciones,
            'fecha_entrega': now,
            'estado': estado,
            'version': 1
        }
    )

    if not created:
        entrega.version += 1
        entrega.archivo_url = archivo_url
        entrega.archivo_nombre = archivo_nombre
        entrega.archivo_tamano = archivo_tamano
        entrega.observaciones = observaciones
        entrega.fecha_entrega = now
        entrega.estado = 'REENTREGADA' if entrega.estado == 'DEVUELTA' else estado
        entrega.save()

    # Create immutable version record
    VersionEntrega.objects.create(
        entrega=entrega,
        numero_version=entrega.version,
        archivo_url=archivo_url,
        archivo_nombre=archivo_nombre,
        archivo_tamano=archivo_tamano,
        comentario=observaciones,
        fecha_envio=now,
        estado=entrega.estado
    )

    estudiante.actualizar_progreso()

    # Create confirmation notification for student
    Notificacion.objects.create(
        usuario=user,
        tipo='ENTREGA_CONFIRMADA',
        mensaje=f"Entrega v{entrega.version} realizada correctamente para '{tarea.titulo}'. Estado: {entrega.get_estado_display()}.",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    # Notify teacher
    Notificacion.objects.create(
        usuario=tarea.docente.usuario,
        tipo='ENTREGA_CONFIRMADA',
        mensaje=f"El estudiante {user.nombre_completo} entregó la tarea '{tarea.titulo}' (v{entrega.version}) en '{tarea.espacio.nombre}'.",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    # MongoDB: registrar entrega en log de actividad
    log_actividad(
        usuario_id=user.id,
        accion='ENTREGAR_TAREA',
        detalle=f"Entrega v{entrega.version} de '{tarea.titulo}'",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id,
        extra={
            'estado': entrega.estado,
            'version': entrega.version,
            'archivo': archivo_nombre,
            'a_tiempo': entrega.estado != 'ATRASADO'
        }
    )
    # MongoDB: duplicar notificacion de confirmacion
    guardar_notificacion(
        usuario_id=user.id,
        tipo='ENTREGA_CONFIRMADA',
        mensaje=f"Entrega v{entrega.version} de '{tarea.titulo}' registrada.",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    return Response({
        'message': f'Tarea entregada correctamente (Versión {entrega.version}).',
        'entrega': EntregaSerializer(entrega).data,
        'estado': entrega.estado,
        'fecha': entrega.fecha_entrega.strftime('%d/%m/%Y %H:%M')
    })


# ==============================================================================
# 5. REVISIÓN, CALIFICACIÓN Y RETROALIMENTACIÓN (DOCENTE)
# ==============================================================================

@api_view(['GET'])
def api_tarea_entregas(request, pk):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Acceso solo para docentes.'}, status=status.HTTP_403_FORBIDDEN)

    tarea = get_object_or_404(Tarea, id=pk, docente=user.perfil_docente)
    espacio = tarea.espacio

    # Get all students enrolled in this space
    miembros = espacio.miembros.select_related('estudiante__usuario')
    entregas_map = {e.estudiante_id: e for e in tarea.entregas.select_related('estudiante__usuario', 'calificacion__retroalimentacion')}

    now = timezone.now()
    resultados = []

    for m in miembros:
        est = m.estudiante
        entrega = entregas_map.get(est.id)

        if entrega:
            estado_texto = entrega.get_estado_display()
            calificacion_val = f"{entrega.calificacion.nota}/100" if hasattr(entrega, 'calificacion') else "Pendiente"
            retro_val = entrega.calificacion.retroalimentacion.comentario if hasattr(entrega, 'calificacion') and hasattr(entrega.calificacion, 'retroalimentacion') else ""
            resultados.append({
                'estudiante_id': est.id,
                'estudiante_nombre': est.usuario.nombre_completo,
                'estudiante_avatar': est.usuario.avatar_url,
                'estado': estado_texto,
                'estado_raw': entrega.estado,
                'calificacion': calificacion_val,
                'nota_num': entrega.calificacion.nota if hasattr(entrega, 'calificacion') else None,
                'retroalimentacion': retro_val,
                'entrega_id': entrega.id,
                'archivo_url': entrega.archivo_url,
                'archivo_nombre': entrega.archivo_nombre,
                'fecha_entrega': entrega.fecha_entrega,
                'observaciones': entrega.observaciones,
                'tiene_entrega': True
            })
        else:
            estado_texto = "Vencida" if tarea.fecha_limite < now else "Pendiente"
            resultados.append({
                'estudiante_id': est.id,
                'estudiante_nombre': est.usuario.nombre_completo,
                'estudiante_avatar': est.usuario.avatar_url,
                'estado': estado_texto,
                'estado_raw': 'VENCIDA' if tarea.fecha_limite < now else 'PENDIENTE',
                'calificacion': "-",
                'nota_num': None,
                'retroalimentacion': "",
                'entrega_id': None,
                'archivo_url': None,
                'archivo_nombre': None,
                'fecha_entrega': None,
                'observaciones': "",
                'tiene_entrega': False
            })

    return Response({
        'tarea': TareaSerializer(tarea, context={'request': request}).data,
        'entregas': resultados,
        'total_estudiantes': len(resultados),
        'total_entregadas': sum(1 for r in resultados if r['tiene_entrega']),
        'total_calificadas': sum(1 for r in resultados if r['nota_num'] is not None),
    })


@api_view(['POST'])
@transaction.atomic
def api_calificar_entrega(request, pk):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Acceso solo para docentes.'}, status=status.HTTP_403_FORBIDDEN)

    entrega = get_object_or_404(Entrega, id=pk, tarea__docente=user.perfil_docente)

    data = request.data
    try:
        nota = float(data.get('nota'))
    except (TypeError, ValueError):
        return Response({'error': 'La calificación debe ser un valor numérico entre 0 y 100.'}, status=status.HTTP_400_BAD_REQUEST)

    if nota < 0 or nota > 100:
        return Response({'error': 'La nota debe estar entre 0 y 100.'}, status=status.HTTP_400_BAD_REQUEST)

    retro_comentario = (data.get('retroalimentacion') or '').strip()

    # Save Calificacion
    calificacion, created = Calificacion.objects.get_or_create(
        entrega=entrega,
        defaults={'nota': nota, 'docente': user.perfil_docente}
    )
    if not created:
        calificacion.nota = nota
        calificacion.fecha_calificacion = timezone.now()
        calificacion.save()

    # Save Retroalimentacion
    if retro_comentario:
        retro, r_created = Retroalimentacion.objects.get_or_create(
            calificacion=calificacion,
            defaults={'comentario': retro_comentario}
        )
        if not r_created:
            retro.comentario = retro_comentario
            retro.fecha = timezone.now()
            retro.save()

    # Also update latest VersionEntrega
    latest_v = entrega.versiones.order_by('-numero_version').first()
    if latest_v:
        latest_v.nota = nota
        latest_v.retroalimentacion = retro_comentario
        latest_v.estado = 'CALIFICADO'
        latest_v.save()

    entrega.estado = 'CALIFICADO'
    entrega.save(update_fields=['estado'])
    entrega.estudiante.actualizar_progreso()

    try:
        send_grade_notification_email(
            estudiante=entrega.estudiante,
            tarea=entrega.tarea,
            nota=nota,
            retroalimentacion=retro_comentario
        )
    except Exception:
        pass

    # MongoDB: registrar calificacion en log de actividad
    estudiante_id = entrega.estudiante.usuario.id
    log_actividad(
        usuario_id=user.id,
        accion='CALIFICAR',
        detalle=f"Calificacion {nota}/100 para '{entrega.tarea.titulo}'",
        espacio_id=entrega.tarea.espacio.id,
        tarea_id=entrega.tarea.id,
        extra={
            'nota': nota,
            'estudiante_id': estudiante_id,
            'con_retroalimentacion': bool(retro_comentario),
            'nueva': created
        }
    )
    # MongoDB: notificar al estudiante de su calificacion
    guardar_notificacion(
        usuario_id=estudiante_id,
        tipo='CALIFICADA',
        mensaje=f"Tu tarea '{entrega.tarea.titulo}' fue calificada con {nota}/100.",
        espacio_id=entrega.tarea.espacio.id,
        tarea_id=entrega.tarea.id
    )

    return Response({
        'message': f"Evaluación guardada con éxito ({nota}/100).",
        'calificacion': CalificacionSerializer(calificacion).data,
        'estado': entrega.estado
    })


@api_view(['POST'])
def api_devolver_entrega(request, pk):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Acceso solo para docentes.'}, status=status.HTTP_403_FORBIDDEN)

    entrega = get_object_or_404(Entrega, id=pk, tarea__docente=user.perfil_docente)
    motivo = (request.data.get('motivo') or request.data.get('retroalimentacion') or 'Se solicitan correcciones en el trabajo presentado.').strip()

    entrega.estado = 'DEVUELTA'
    entrega.save()

    latest_v = entrega.versiones.order_by('-numero_version').first()
    if latest_v:
        latest_v.estado = 'DEVUELTA'
        latest_v.retroalimentacion = motivo
        latest_v.save()
    else:
        VersionEntrega.objects.create(
            entrega=entrega,
            numero_version=entrega.version,
            archivo_url=entrega.archivo_url,
            archivo_nombre=entrega.archivo_nombre,
            archivo_tamano=entrega.archivo_tamano,
            comentario=entrega.observaciones,
            fecha_envio=entrega.fecha_entrega,
            estado='DEVUELTA',
            retroalimentacion=motivo
        )

    Notificacion.objects.create(
        usuario=entrega.estudiante.usuario,
        tipo='CORRECCION_SOLICITADA',
        mensaje=f"Corrección solicitada para '{entrega.tarea.titulo}'. Observación: {motivo}",
        espacio_id=entrega.tarea.espacio.id,
        tarea_id=entrega.tarea.id
    )

    return Response({
        'message': 'Entrega devuelta para corrección.',
        'entrega': EntregaSerializer(entrega).data
    })


@api_view(['POST'])
def api_reentregar_tarea(request, pk):
    user = request.user
    if user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Solo los estudiantes pueden reentregar tareas.'}, status=status.HTTP_403_FORBIDDEN)

    tarea = get_object_or_404(Tarea, id=pk)
    estudiante = user.perfil_estudiante

    entrega = get_object_or_404(Entrega, tarea=tarea, estudiante=estudiante)
    data = request.data
    archivo_url = data.get('archivo_url') or entrega.archivo_url
    archivo_nombre = data.get('archivo_nombre') or 'trabajo_corregido.pdf'
    archivo_tamano = data.get('archivo_tamano') or '2.4 MB'
    observaciones = data.get('observaciones') or ''

    now = timezone.now()
    entrega.version += 1
    entrega.archivo_url = archivo_url
    entrega.archivo_nombre = archivo_nombre
    entrega.archivo_tamano = archivo_tamano
    entrega.observaciones = observaciones
    entrega.fecha_entrega = now
    entrega.estado = 'REENTREGADA'
    entrega.save()

    VersionEntrega.objects.create(
        entrega=entrega,
        numero_version=entrega.version,
        archivo_url=archivo_url,
        archivo_nombre=archivo_nombre,
        archivo_tamano=archivo_tamano,
        comentario=observaciones,
        fecha_envio=now,
        estado='REENTREGADA'
    )

    estudiante.actualizar_progreso()

    Notificacion.objects.create(
        usuario=user,
        tipo='ENTREGA_CONFIRMADA',
        mensaje=f"Reentrega (v{entrega.version}) enviada con éxito para '{tarea.titulo}'.",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    Notificacion.objects.create(
        usuario=tarea.docente.usuario,
        tipo='REENTREGA',
        mensaje=f"El estudiante {user.nombre_completo} ha reentregado su tarea '{tarea.titulo}' (Versión {entrega.version}).",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    return Response({
        'message': f'Reentrega v{entrega.version} realizada correctamente.',
        'entrega': EntregaSerializer(entrega).data
    })


@api_view(['GET'])
def api_entrega_historial(request, pk):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'No autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

    entrega = get_object_or_404(Entrega, id=pk)
    if user.rol == 'ESTUDIANTE' and entrega.estudiante.usuario != user:
        return Response({'error': 'No tienes permiso para ver este historial.'}, status=status.HTTP_403_FORBIDDEN)
    if user.rol == 'DOCENTE' and entrega.tarea.docente.usuario != user:
        return Response({'error': 'No tienes permiso para ver este historial.'}, status=status.HTTP_403_FORBIDDEN)

    versiones = entrega.versiones.order_by('-numero_version')
    return Response(VersionEntregaSerializer(versiones, many=True).data)


@api_view(['GET'])
def api_entregas_pendientes(request):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes pueden consultar la bandeja de revisión.'}, status=status.HTTP_403_FORBIDDEN)

    docente = user.perfil_docente
    filtro = request.query_params.get('filtro', 'todos').lower()
    espacio_id = request.query_params.get('espacio_id')
    colegio_id = request.query_params.get('colegio_id')
    curso_id = request.query_params.get('curso_id')
    materia_id = request.query_params.get('materia_id')
    tarea_id = request.query_params.get('tarea_id')
    search = request.query_params.get('search', '').strip().lower()

    entregas = Entrega.objects.filter(tarea__docente=docente).select_related(
        'tarea', 'tarea__espacio', 'tarea__espacio__colegio',
        'tarea__espacio__curso', 'tarea__espacio__curso__colegio',
        'tarea__espacio__materia', 'estudiante__usuario', 'calificacion',
        'calificacion__retroalimentacion'
    )

    if espacio_id:
        entregas = entregas.filter(tarea__espacio_id=espacio_id)
    if tarea_id:
        entregas = entregas.filter(tarea_id=tarea_id)
    if colegio_id:
        entregas = entregas.filter(
            Q(tarea__espacio__colegio_id=colegio_id) |
            Q(tarea__espacio__curso__colegio_id=colegio_id)
        )
    if curso_id:
        entregas = entregas.filter(tarea__espacio__curso_id=curso_id)
    if materia_id:
        entregas = entregas.filter(tarea__espacio__materia_id=materia_id)

    if filtro == 'pendientes':
        entregas = entregas.filter(calificacion__isnull=True)
    elif filtro == 'atrasadas':
        entregas = entregas.filter(estado='ATRASADO')
    elif filtro == 'reentregadas':
        entregas = entregas.filter(estado='REENTREGADA')
    elif filtro == 'calificadas':
        entregas = entregas.filter(calificacion__isnull=False)

    if search:
        entregas = entregas.filter(
            Q(estudiante__usuario__first_name__icontains=search) |
            Q(estudiante__usuario__last_name__icontains=search) |
            Q(tarea__titulo__icontains=search)
        )

    # Pre-cargar mapa de visualizaciones de tareas
    tarea_ids = set(entregas.values_list('tarea_id', flat=True))
    vistas_lookup = {}
    for v in TareaVisualizacion.objects.filter(tarea_id__in=tarea_ids):
        vistas_lookup[(v.tarea_id, v.estudiante_id)] = v

    result = []
    for e in entregas.order_by('-fecha_entrega'):
        esp = e.tarea.espacio
        cur = esp.curso
        col = esp.colegio or (cur.colegio if cur else None)
        mat = esp.materia

        col_id = col.id if col else None
        col_nom = col.nombre if col else 'Colegio Don Bosco'

        cur_id = cur.id if cur else None
        cur_nom = cur.nombre_completo if cur else 'Curso'

        mat_id = mat.id if mat else None
        mat_nom = mat.nombre if mat else esp.nombre

        vista = vistas_lookup.get((e.tarea_id, e.estudiante_id))
        ha_visto = bool(vista) or True
        fecha_vista = vista.fecha_ultima_vista.strftime('%d/%m/%Y %H:%M') if vista else e.fecha_entrega.strftime('%d/%m/%Y %H:%M')
        es_tardia = bool(e.tarea.fecha_limite and e.fecha_entrega > e.tarea.fecha_limite) or (e.estado == 'ATRASADO')

        result.append({
            'id': e.id,
            'entrega_id': e.id,
            'tarea_id': e.tarea.id,
            'tarea_titulo': e.tarea.titulo,
            'fecha_limite': e.tarea.fecha_limite.strftime('%d/%m/%Y %H:%M') if e.tarea.fecha_limite else None,
            'puntaje_maximo': e.tarea.puntaje_maximo,
            'colegio_id': col_id,
            'colegio_nombre': col_nom,
            'curso_id': cur_id,
            'curso_nombre': cur_nom,
            'materia_id': mat_id,
            'materia_nombre': mat_nom,
            'espacio_id': esp.id,
            'espacio_nombre': esp.nombre,
            'estudiante_id': e.estudiante.id,
            'estudiante_nombre': e.estudiante.usuario.nombre_completo,
            'estudiante_matricula': f"EST-{e.estudiante.id:04d}",
            'archivo_nombre': e.archivo_nombre,
            'archivo_url': e.archivo_url,
            'fecha_entrega': e.fecha_entrega.strftime('%d/%m/%Y %H:%M'),
            'estado': e.estado,
            'version': e.version,
            'nota': e.calificacion.nota if hasattr(e, 'calificacion') else None,
            'retroalimentacion': e.calificacion.retroalimentacion.comentario if hasattr(e, 'calificacion') and hasattr(e.calificacion, 'retroalimentacion') else '',
            'observaciones': e.observaciones,
            'ha_visto': ha_visto,
            'fecha_vista': fecha_vista,
            'es_tardia': es_tardia
        })

    return Response({
        'total': len(result),
        'pendientes_count': entregas.filter(calificacion__isnull=True).count(),
        'calificadas_count': entregas.filter(calificacion__isnull=False).count(),
        'entregas': result
    })


@api_view(['GET'])
def api_tarea_vistas(request, pk):
    """
    Seguimiento detallado de lectura y visualización de una tarea por los estudiantes del curso.
    """
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes pueden consultar las vistas.'}, status=status.HTTP_403_FORBIDDEN)

    tarea = get_object_or_404(Tarea, id=pk, docente=user.perfil_docente)
    espacio = tarea.espacio
    cur = espacio.curso
    col = espacio.colegio or (cur.colegio if cur else None)
    mat = espacio.materia

    # Estudiantes del curso/espacio
    if cur:
        estudiantes = Estudiante.objects.filter(cursos_inscritos__curso=cur, cursos_inscritos__estado='ACTIVO').select_related('usuario').distinct()
    else:
        estudiantes = Estudiante.objects.filter(espacios_inscritos__espacio=espacio).select_related('usuario').distinct()

    if not estudiantes.exists():
        est_ids = set(espacio.miembros.values_list('estudiante_id', flat=True)) | set(tarea.entregas.values_list('estudiante_id', flat=True))
        estudiantes = Estudiante.objects.filter(id__in=est_ids).select_related('usuario')

    entregas_map = {e.estudiante_id: e for e in tarea.entregas.select_related('calificacion', 'calificacion__retroalimentacion')}
    vistas_map = {v.estudiante_id: v for v in TareaVisualizacion.objects.filter(tarea=tarea)}

    listado = []
    total_vieron = 0
    total_entregaron = 0
    total_calificadas = 0

    for est in estudiantes.order_by('usuario__last_name', 'usuario__first_name'):
        entrega = entregas_map.get(est.id)
        vista = vistas_map.get(est.id)

        ha_visto = bool(vista) or bool(entrega)
        if ha_visto:
            total_vieron += 1
        if entrega:
            total_entregaron += 1
            if hasattr(entrega, 'calificacion'):
                total_calificadas += 1

        estado_entrega = 'SIN_ENTREGA'
        if entrega:
            if hasattr(entrega, 'calificacion'):
                estado_entrega = 'CALIFICADO'
            elif entrega.estado == 'ATRASADO':
                estado_entrega = 'ATRASADO'
            else:
                estado_entrega = 'PENDIENTE_REVISION'

        listado.append({
            'estudiante_id': est.id,
            'nombre_completo': est.usuario.nombre_completo,
            'matricula': f"EST-{est.id:04d}",
            'email': est.usuario.email,
            'ha_visto': ha_visto,
            'fecha_primera_vista': vista.fecha_primera_vista.strftime('%d/%m/%Y %H:%M') if vista else (entrega.fecha_entrega.strftime('%d/%m/%Y %H:%M') if entrega else None),
            'fecha_ultima_vista': vista.fecha_ultima_vista.strftime('%d/%m/%Y %H:%M') if vista else (entrega.fecha_entrega.strftime('%d/%m/%Y %H:%M') if entrega else None),
            'total_vistas': vista.total_vistas if vista else (1 if entrega else 0),
            'ha_entregado': bool(entrega),
            'entrega_id': entrega.id if entrega else None,
            'archivo_nombre': entrega.archivo_nombre if entrega else None,
            'archivo_url': entrega.archivo_url if entrega else None,
            'fecha_entrega': entrega.fecha_entrega.strftime('%d/%m/%Y %H:%M') if entrega else None,
            'estado_entrega': estado_entrega,
            'nota': entrega.calificacion.nota if entrega and hasattr(entrega, 'calificacion') else None,
            'retroalimentacion': entrega.calificacion.retroalimentacion.comentario if entrega and hasattr(entrega, 'calificacion') and hasattr(entrega.calificacion, 'retroalimentacion') else ''
        })

    total_est = len(listado)
    sin_ver = total_est - total_vieron
    porcentaje_visto = round((total_vieron / total_est * 100)) if total_est > 0 else 0

    return Response({
        'tarea': {
            'id': tarea.id,
            'titulo': tarea.titulo,
            'fecha_limite': tarea.fecha_limite.strftime('%d/%m/%Y %H:%M') if tarea.fecha_limite else None,
            'puntaje_maximo': tarea.puntaje_maximo,
            'colegio_nombre': col.nombre if col else 'Colegio Don Bosco',
            'curso_nombre': cur.nombre_completo if cur else 'Curso',
            'materia_nombre': mat.nombre if mat else espacio.nombre,
        },
        'stats': {
            'total_alumnos': total_est,
            'vieron': total_vieron,
            'sin_ver': sin_ver,
            'porcentaje_visto': porcentaje_visto,
            'entregaron': total_entregaron,
            'pendientes_entrega': total_est - total_entregaron,
            'calificadas': total_calificadas,
        },
        'estudiantes': listado
    })


@api_view(['POST'])
def api_tarea_recordatorio_vistas(request, pk):
    """
    Envía notificaciones de recordatorio a los estudiantes que no han visto la tarea o no la han entregado.
    """
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes pueden enviar recordatorios.'}, status=status.HTTP_403_FORBIDDEN)

    tarea = get_object_or_404(Tarea, id=pk, docente=user.perfil_docente)
    tipo_destinatarios = request.data.get('tipo', 'sin_ver')

    espacio = tarea.espacio
    cur = espacio.curso

    if cur:
        estudiantes = Estudiante.objects.filter(cursos_inscritos__curso=cur, cursos_inscritos__estado='ACTIVO').select_related('usuario')
    else:
        estudiantes = Estudiante.objects.filter(espacios_inscritos__espacio=espacio).select_related('usuario')

    entregas_ids = set(tarea.entregas.values_list('estudiante_id', flat=True))
    vistas_ids = set(TareaVisualizacion.objects.filter(tarea=tarea).values_list('estudiante_id', flat=True))

    enviados = 0
    for est in estudiantes:
        ha_entregado = est.id in entregas_ids
        ha_visto = est.id in vistas_ids or ha_entregado

        should_send = False
        if tipo_destinatarios == 'sin_ver' and not ha_visto:
            should_send = True
        elif tipo_destinatarios == 'sin_entregar' and not ha_entregado:
            should_send = True
        elif tipo_destinatarios == 'todos':
            should_send = True

        if should_send:
            limite_txt = tarea.fecha_limite.strftime('%d/%m/%Y %H:%M') if tarea.fecha_limite else 'pronto'
            Notificacion.objects.create(
                usuario=est.usuario,
                tipo='PROXIMA_VENCER',
                mensaje=f"Recordatorio de {user.nombre_completo}: Tienes pendiente la tarea '{tarea.titulo}'. Fecha límite: {limite_txt}.",
                espacio_id=espacio.id,
                tarea_id=tarea.id
            )
            enviados += 1

    return Response({
        'success': True,
        'enviados': enviados,
        'mensaje': f'Se enviaron {enviados} notificaciones de recordatorio.'
    })


@api_view(['GET', 'POST'])
def api_espacio_avisos(request, espacio_id):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'No autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

    espacio = get_object_or_404(Espacio, id=espacio_id)

    if request.method == 'GET':
        avisos = espacio.avisos.all()
        return Response(AvisoEspacioSerializer(avisos, many=True).data)

    elif request.method == 'POST':
        if user.rol != 'DOCENTE' or espacio.docente.usuario != user:
            return Response({'error': 'Solo el docente del espacio puede publicar avisos.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        titulo = (data.get('titulo') or '').strip()
        contenido = (data.get('contenido') or '').strip()
        fijado = bool(data.get('fijado', False))
        importante = bool(data.get('importante', False))
        fecha_expiracion = data.get('fecha_expiracion') or None

        if not titulo or not contenido:
            return Response({'error': 'El título y el contenido del aviso son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        aviso = AvisoEspacio.objects.create(
            espacio=espacio,
            docente=user.perfil_docente,
            titulo=titulo,
            contenido=contenido,
            fijado=fijado,
            importante=importante,
            fecha_expiracion=fecha_expiracion
        )

        for m in espacio.miembros.select_related('estudiante__usuario'):
            Notificacion.objects.create(
                usuario=m.estudiante.usuario,
                tipo='AVISO_NUEVO',
                mensaje=f"📢 Nuevo aviso en '{espacio.nombre}': {titulo}",
                espacio_id=espacio.id
            )

        return Response(AvisoEspacioSerializer(aviso).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
def api_eliminar_aviso(request, pk):
    user = request.user
    aviso = get_object_or_404(AvisoEspacio, id=pk)
    if user.rol != 'DOCENTE' or aviso.docente.usuario != user:
        return Response({'error': 'No tienes permiso para eliminar este aviso.'}, status=status.HTTP_403_FORBIDDEN)
    aviso.delete()
    return Response({'message': 'Aviso eliminado correctamente.'})


@api_view(['GET', 'POST'])
def api_espacio_recursos(request, espacio_id):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'No autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

    espacio = get_object_or_404(Espacio, id=espacio_id)

    if request.method == 'GET':
        recursos = espacio.recursos.all()
        return Response(RecursoEspacioSerializer(recursos, many=True).data)

    elif request.method == 'POST':
        if user.rol != 'DOCENTE' or espacio.docente.usuario != user:
            return Response({'error': 'Solo el docente del espacio puede compartir recursos.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        titulo = (data.get('titulo') or '').strip()
        descripcion = (data.get('descripcion') or '').strip()
        tipo = data.get('tipo') or 'PDF'
        archivo_url = data.get('archivo_url') or ''
        enlace_url = data.get('enlace_url') or ''
        tamano = data.get('tamano') or '1.5 MB'

        if not titulo:
            return Response({'error': 'El título del recurso es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        recurso = RecursoEspacio.objects.create(
            espacio=espacio,
            docente=user.perfil_docente,
            titulo=titulo,
            descripcion=descripcion,
            tipo=tipo,
            archivo_url=archivo_url,
            enlace_url=enlace_url,
            tamano=tamano
        )

        return Response(RecursoEspacioSerializer(recurso).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
def api_eliminar_recurso(request, pk):
    user = request.user
    recurso = get_object_or_404(RecursoEspacio, id=pk)
    if user.rol != 'DOCENTE' or recurso.docente.usuario != user:
        return Response({'error': 'No tienes permiso para eliminar este recurso.'}, status=status.HTTP_403_FORBIDDEN)
    recurso.delete()
    return Response({'message': 'Recurso eliminado correctamente.'})


@api_view(['POST'])
def api_tarea_extension(request, pk):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes pueden otorgar extensiones de fecha.'}, status=status.HTTP_403_FORBIDDEN)

    tarea = get_object_or_404(Tarea, id=pk, docente=user.perfil_docente)
    data = request.data
    estudiante_id = data.get('estudiante_id')
    nueva_fecha_limite = data.get('nueva_fecha_limite')
    motivo = data.get('motivo') or 'Prórroga académica individual'

    if not estudiante_id or not nueva_fecha_limite:
        return Response({'error': 'Debe especificar el estudiante y la nueva fecha límite.'}, status=status.HTTP_400_BAD_REQUEST)

    estudiante = get_object_or_404(Estudiante, id=estudiante_id)

    ext, created = ExtensionFechaTarea.objects.get_or_create(
        tarea=tarea,
        estudiante=estudiante,
        defaults={
            'docente': user.perfil_docente,
            'nueva_fecha_limite': nueva_fecha_limite,
            'motivo': motivo
        }
    )
    if not created:
        ext.nueva_fecha_limite = nueva_fecha_limite
        ext.motivo = motivo
        ext.save()

    Notificacion.objects.create(
        usuario=estudiante.usuario,
        tipo='NUEVA_TAREA',
        mensaje=f"Se te ha concedido una prórroga para la tarea '{tarea.titulo}' hasta el {nueva_fecha_limite}.",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    return Response({'message': f'Extensión concedida a {estudiante.usuario.nombre_completo}.'})


@api_view(['GET', 'POST'])
def api_plantillas_tarea(request):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes pueden gestionar plantillas.'}, status=status.HTTP_403_FORBIDDEN)

    docente = user.perfil_docente

    if request.method == 'GET':
        plantillas = docente.plantillas_tarea.all()
        return Response(PlantillaTareaSerializer(plantillas, many=True).data)

    elif request.method == 'POST':
        data = request.data
        titulo = (data.get('titulo') or '').strip()
        descripcion = data.get('descripcion') or ''
        indicaciones = data.get('indicaciones') or ''
        puntaje_maximo = int(data.get('puntaje_maximo') or 100)
        criterios_json = data.get('criterios_json') or '[]'

        if not titulo:
            return Response({'error': 'El título de la plantilla es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        plantilla = PlantillaTarea.objects.create(
            docente=docente,
            titulo=titulo,
            descripcion=descripcion,
            indicaciones=indicaciones,
            puntaje_maximo=puntaje_maximo,
            criterios_json=criterios_json
        )
        return Response(PlantillaTareaSerializer(plantilla).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def api_duplicar_tarea(request, pk):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes pueden duplicar tareas.'}, status=status.HTTP_403_FORBIDDEN)

    tarea_original = get_object_or_404(Tarea, id=pk, docente=user.perfil_docente)
    nuevo_espacio_id = request.data.get('nuevo_espacio_id') or tarea_original.espacio_id
    nuevo_espacio = get_object_or_404(Espacio, id=nuevo_espacio_id, docente=user.perfil_docente)

    nueva_tarea = Tarea.objects.create(
        espacio=nuevo_espacio,
        docente=user.perfil_docente,
        titulo=f"{tarea_original.titulo} (Copia)",
        descripcion=tarea_original.descripcion,
        indicaciones=tarea_original.indicaciones,
        puntaje_maximo=tarea_original.puntaje_maximo,
        fecha_publicacion=timezone.now(),
        fecha_limite=timezone.now() + timedelta(days=7),
        estado='PUBLICADA'
    )

    return Response({
        'message': f'Tarea duplicada exitosamente en "{nuevo_espacio.nombre}".',
        'tarea': TareaSerializer(nueva_tarea, context={'request': request}).data
    }, status=status.HTTP_201_CREATED)


# ==============================================================================
# 6. DASHBOARDS Y PROGRESO ACADÉMICO
# ==============================================================================

@api_view(['GET'])
def api_student_dashboard(request):
    user = request.user
    if user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Acceso exclusivo para estudiantes.'}, status=status.HTTP_403_FORBIDDEN)

    estudiante = user.perfil_estudiante
    progreso = estudiante.actualizar_progreso()

    espacios_ids = estudiante.get_espacios_ids()
    espacios = Espacio.objects.filter(id__in=espacios_ids)
    tareas = Tarea.objects.filter(espacio_id__in=espacios_ids, estado='PUBLICADA')

    entregas = Entrega.objects.filter(estudiante=estudiante)
    entregadas_ids = entregas.values_list('tarea_id', flat=True)

    # Specific cards requested:
    # TAREAS PENDIENTES, TAREAS ENTREGADAS, TAREAS POR CALIFICAR, PROMEDIO, PROGRESO
    tareas_entregadas_count = entregas.count()
    tareas_por_calificar = entregas.filter(calificacion__isnull=True).count()
    tareas_pendientes_count = tareas.exclude(id__in=entregadas_ids).filter(fecha_limite__gte=timezone.now()).count()

    # Actividad reciente
    actividades = []
    # 1. Recent grades with feedback
    for e in entregas.filter(calificacion__isnull=False).select_related('tarea', 'calificacion__retroalimentacion').order_by('-calificacion__fecha_calificacion')[:5]:
        retro_text = e.calificacion.retroalimentacion.comentario if hasattr(e.calificacion, 'retroalimentacion') else ""
        actividades.append({
            'tipo': 'CALIFICACION',
            'titulo': f'Docente calificó: "{e.tarea.titulo}"',
            'detalle': f'Calificación: {e.calificacion.nota}/100',
            'retroalimentacion': retro_text,
            'espacio': e.tarea.espacio.nombre,
            'fecha': e.calificacion.fecha_calificacion
        })

    # 2. Recent published tasks
    for t in tareas.order_by('-fecha_publicacion')[:5]:
        actividades.append({
            'tipo': 'NUEVA_TAREA',
            'titulo': f'Se publicó la tarea: "{t.titulo}"',
            'detalle': f'Espacio: {t.espacio.nombre} • Límite: {t.fecha_limite.strftime("%d/%m/%Y")}',
            'espacio': t.espacio.nombre,
            'fecha': t.fecha_publicacion
        })

    actividades.sort(key=lambda x: x['fecha'], reverse=True)

    # Next upcoming tasks to submit
    proximas_tareas = tareas.exclude(id__in=entregadas_ids).filter(fecha_limite__gte=timezone.now()).order_by('fecha_limite')[:4]

    return Response({
        'kpis': {
            'tareas_pendientes': tareas_pendientes_count,
            'tareas_entregadas': tareas_entregadas_count,
            'tareas_por_calificar': tareas_por_calificar,
            'promedio': progreso.promedio,
            'porcentaje_progreso': progreso.porcentaje_cumplimiento
        },
        'actividad_reciente': actividades[:6],
        'proximas_tareas': TareaSerializer(proximas_tareas, many=True, context={'request': request}).data,
        'notificaciones': NotificacionSerializer(Notificacion.objects.filter(usuario=user)[:25], many=True).data,
        'mis_espacios': EspacioSerializer(espacios, many=True, context={'request': request}).data
    })


@api_view(['GET'])
def api_teacher_dashboard(request):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Acceso exclusivo para docentes.'}, status=status.HTTP_403_FORBIDDEN)

    docente = user.perfil_docente
    espacios = Espacio.objects.filter(docente=docente)
    tareas = Tarea.objects.filter(docente=docente)

    entregas = Entrega.objects.filter(tarea__in=tareas)
    entregas_pendientes = entregas.filter(calificacion__isnull=True).count()
    tareas_calificadas = entregas.filter(calificacion__isnull=False).count()

    # Teacher activity feed
    actividades = []
    for e in entregas.order_by('-fecha_entrega')[:8]:
        actividades.append({
            'tipo': 'ENTREGA',
            'titulo': f'{e.estudiante.usuario.nombre_completo} presentó "{e.tarea.titulo}"',
            'espacio': e.tarea.espacio.nombre,
            'fecha': e.fecha_entrega,
            'entrega_id': e.id,
            'tarea_id': e.tarea.id,
            'calificada': hasattr(e, 'calificacion')
        })

    return Response({
        'kpis': {
            'mis_espacios': espacios.count(),
            'tareas_creadas': tareas.count(),
            'entregas_pendientes': entregas_pendientes,
            'tareas_calificadas': tareas_calificadas
        },
        'actividad_reciente': actividades,
        'espacios': EspacioSerializer(espacios, many=True, context={'request': request}).data,
        'ultimas_tareas': TareaSerializer(tareas.order_by('-fecha_publicacion')[:5], many=True, context={'request': request}).data
    })


@api_view(['GET'])
def api_progreso_academico(request):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'No autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
        estudiante = user.perfil_estudiante
        progreso = estudiante.actualizar_progreso()

        # Breakdown by workspace
        espacios_data = []
        for miembro in estudiante.espacios_inscritos.select_related('espacio'):
            esp = miembro.espacio
            tareas_esp = esp.tareas.filter(estado='PUBLICADA')
            t_total = tareas_esp.count()
            e_esp = Entrega.objects.filter(tarea__espacio=esp, estudiante=estudiante)
            e_count = e_esp.count()
            califs = Calificacion.objects.filter(entrega__in=e_esp)
            avg_calif = califs.aggregate(Avg('nota'))['nota__avg'] or 0.0

            espacios_data.append({
                'espacio_id': esp.id,
                'espacio_nombre': esp.nombre,
                'color': esp.color,
                'icono': esp.icono,
                'total_tareas': t_total,
                'tareas_entregadas': e_count,
                'cumplimiento': round((e_count / t_total * 100), 1) if t_total > 0 else 0,
                'promedio': round(float(avg_calif), 1)
            })

        # History of grades for chart
        calificaciones = Calificacion.objects.filter(entrega__estudiante=estudiante).order_by('fecha_calificacion')
        historial_notas = []
        for c in calificaciones:
            historial_notas.append({
                'tarea': c.entrega.tarea.titulo,
                'espacio': c.entrega.tarea.espacio.nombre,
                'nota': c.nota,
                'fecha': c.fecha_calificacion.strftime('%d/%m')
            })

        # =====================================================================
        # ANÁLISIS NUMÉRICO APLICADO AL RENDIMIENTO DEL ESTUDIANTE
        # =====================================================================
        puntos_notas = [(float(i + 1), float(c.nota)) for i, c in enumerate(calificaciones)]
        notas_list = [float(c.nota) for c in calificaciones]

        regresion = calcular_regresion_lineal(puntos_notas) if len(puntos_notas) >= 2 else {'valido': False, 'mensaje': 'Se requieren al menos 2 notas para calcular regresión.'}
        irec_trap = calcular_irec_trapecio(puntos_notas) if len(puntos_notas) >= 2 else {'valido': False, 'mensaje': 'Se requieren al menos 2 notas para calcular IREC.'}
        extrapolacion = calcular_extrapolacion_rendimiento(notas_list, pasos_futuros=2) if len(notas_list) >= 2 else {'valido': False, 'mensaje': 'Sin notas suficientes para extrapolar.'}

        irec_simp = None
        if len(notas_list) >= 3 and (len(notas_list) - 1) % 2 == 0:
            irec_simp = calcular_irec_simpson(notas_list)

        # Nivelación con Newton-Raphson: estimación de tiempo para alcanzar 70 pts si promedio < 70
        nivelacion_70 = None
        if 0 < progreso.promedio < 70:
            nivelacion_70 = calcular_nivelacion_newton_raphson(
                t0_inicial=1.0,
                rendimiento_inicial=progreso.promedio,
                tasa_aprendizaje=0.25,
                nota_objetivo=70.0
            )

        # Meta de aprobación: cuántos puntos requiere en pendientes si tiene tareas por entregar
        simulacion_meta = None
        if progreso.tareas_pendientes > 0 and len(notas_list) > 0:
            # Estimar peso equivalente por tarea
            total_evals = len(notas_list) + progreso.tareas_pendientes
            peso_por_tarea = 100.0 / total_evals if total_evals > 0 else 20.0
            completadas = [{'nota': n, 'peso': peso_por_tarea} for n in notas_list]
            peso_restante = peso_por_tarea * progreso.tareas_pendientes
            # Normalizar para que completadas + restante = 100
            factor_norm = 100.0 / ((len(notas_list) * peso_por_tarea) + peso_restante)
            completadas_norm = [{'nota': n, 'peso': peso_por_tarea * factor_norm} for n in notas_list]
            simulacion_meta = calcular_nota_necesaria(completadas_norm, peso_pendiente=peso_restante * factor_norm, nota_objetivo=51.0)

        # Materias adaptadas para StudentProgress.jsx
        materias_list = []
        for e in espacios_data:
            materias_list.append({
                'materia': e['espacio_nombre'],
                'codigo': f"ESP-{e['espacio_id']}",
                'tareas_entregadas': e['tareas_entregadas'],
                'tareas_totales': e['total_tareas'],
                'promedio': e['promedio'],
                'porcentaje_cumplimiento': e['cumplimiento'],
                'tareas_pendientes': max(0, e['total_tareas'] - e['tareas_entregadas'])
            })

        # Resumen explicativo generado a partir de métodos numéricos
        if regresion.get('valido'):
            resumen_texto = (
                f"Promedio general de {progreso.promedio} pts. "
                f"Tendencia {regresion.get('tendencia')}: {regresion.get('diagnostico')} "
                f"(Ecuación de ajuste: {regresion.get('ecuacion_recta')}, R² = {regresion.get('coeficiente_determinacion_r2')}). "
                f"Proyección próxima evaluación: {regresion.get('proyeccion_estimada')} pts."
            )
        else:
            resumen_texto = (
                f"Promedio general de {progreso.promedio} pts con {progreso.porcentaje_cumplimiento}% de cumplimiento. "
                f"Registra más entregas para desbloquear el análisis de tendencia numérica."
            )

        return Response({
            'estudiante_id': estudiante.id,
            'resumen': {
                'promedio': progreso.promedio,
                'tareas_entregadas': progreso.tareas_entregadas,
                'tareas_pendientes': progreso.tareas_pendientes,
                'tareas_calificadas': progreso.tareas_calificadas,
                'tareas_vencidas': progreso.tareas_vencidas,
                'porcentaje_cumplimiento': progreso.porcentaje_cumplimiento
            },
            'metricas_generales': {
                'promedio_general': progreso.promedio,
                'tareas_completadas': progreso.tareas_entregadas,
                'tareas_pendientes': progreso.tareas_pendientes,
                'tareas_vencidas': progreso.tareas_vencidas,
                'porcentaje_entregadas': progreso.porcentaje_cumplimiento
            },
            'materias': materias_list,
            'evolucion_calificaciones': historial_notas,
            'resumen_texto': resumen_texto,
            'por_espacio': espacios_data,
            'historial_notas': historial_notas,
            'analisis_numerico': {
                'regresion': regresion,
                'irec_trapecio': irec_trap,
                'irec_simpson': irec_simp,
                'extrapolacion': extrapolacion,
                'nivelacion_newton': nivelacion_70,
                'simulacion_meta': simulacion_meta
            }
        })

    elif user.rol == 'DOCENTE' and hasattr(user, 'perfil_docente'):
        docente = user.perfil_docente
        espacios = Espacio.objects.filter(docente=docente)

        resumen_espacios = []
        for esp in espacios:
            miembros_count = esp.miembros.count()
            tareas_esp = esp.tareas.all()
            entregas_esp = Entrega.objects.filter(tarea__espacio=esp)
            califs = Calificacion.objects.filter(entrega__in=entregas_esp)
            avg_esp = califs.aggregate(Avg('nota'))['nota__avg'] or 0.0

            resumen_espacios.append({
                'espacio_id': esp.id,
                'espacio_nombre': esp.nombre,
                'color': esp.color,
                'total_estudiantes': miembros_count,
                'total_tareas': tareas_esp.count(),
                'total_entregas': entregas_esp.count(),
                'promedio_general': round(float(avg_esp), 1)
            })

        return Response({
            'docente': docente.usuario.nombre_completo,
            'espacios_resumen': resumen_espacios
        })


# ==============================================================================
# 7. ACTIVIDAD ACADÉMICA Y NOTIFICACIONES
# ==============================================================================

@api_view(['GET'])
def api_actividad_academica(request):
    user = request.user
    if not user.is_authenticated:
        return Response([])

    actividades = []

    if user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
        est = user.perfil_estudiante
        # Submissions made
        for e in Entrega.objects.filter(estudiante=est).select_related('tarea__espacio').order_by('-fecha_entrega')[:10]:
            actividades.append({
                'id': f'entrega-{e.id}',
                'tipo': 'ENTREGA',
                'texto': f'Presentaste la tarea "{e.tarea.titulo}"',
                'espacio': e.tarea.espacio.nombre,
                'fecha': e.fecha_entrega,
                'icono': 'check-circle',
                'color': '#10B981'
            })
            if hasattr(e, 'calificacion'):
                c = e.calificacion
                actividades.append({
                    'id': f'calif-{c.id}',
                    'tipo': 'CALIFICACION',
                    'texto': f'El docente calificó "{e.tarea.titulo}" con {c.nota}/100',
                    'espacio': e.tarea.espacio.nombre,
                    'fecha': c.fecha_calificacion,
                    'icono': 'award',
                    'color': '#0284C7'
                })
                if hasattr(c, 'retroalimentacion'):
                    actividades.append({
                        'id': f'retro-{c.retroalimentacion.id}',
                        'tipo': 'RETROALIMENTACION',
                        'texto': f'Recibiste retroalimentación: "{c.retroalimentacion.comentario[:70]}..."',
                        'espacio': e.tarea.espacio.nombre,
                        'fecha': c.retroalimentacion.fecha,
                        'icono': 'message-square',
                        'color': '#6366F1'
                    })

        # Tasks published in student's spaces
        espacios_ids = est.espacios_inscritos.values_list('espacio_id', flat=True)
        for t in Tarea.objects.filter(espacio_id__in=espacios_ids, estado='PUBLICADA').order_by('-fecha_publicacion')[:8]:
            actividades.append({
                'id': f'tarea-{t.id}',
                'tipo': 'NUEVA_TAREA',
                'texto': f'Se publicó la tarea "{t.titulo}" en {t.espacio.nombre}',
                'espacio': t.espacio.nombre,
                'fecha': t.fecha_publicacion,
                'icono': 'file-plus',
                'color': '#2563EB'
            })

    elif user.rol == 'DOCENTE' and hasattr(user, 'perfil_docente'):
        doc = user.perfil_docente
        tareas = Tarea.objects.filter(docente=doc)
        for e in Entrega.objects.filter(tarea__in=tareas).select_related('estudiante__usuario', 'tarea__espacio').order_by('-fecha_entrega')[:15]:
            actividades.append({
                'id': f'entrega-doc-{e.id}',
                'tipo': 'ENTREGA_ESTUDIANTE',
                'texto': f'{e.estudiante.usuario.nombre_completo} presentó "{e.tarea.titulo}"',
                'espacio': e.tarea.espacio.nombre,
                'fecha': e.fecha_entrega,
                'icono': 'inbox',
                'color': '#10B981'
            })

    actividades.sort(key=lambda x: x['fecha'], reverse=True)
    return Response(actividades[:25])


@api_view(['GET'])
def api_notificaciones(request):
    user = request.user
    if not user.is_authenticated:
        return Response([])

    notifs = Notificacion.objects.filter(usuario=user)[:20]
    serializer = NotificacionSerializer(notifs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def api_marcar_notificaciones_leidas(request):
    user = request.user
    if user.is_authenticated:
        Notificacion.objects.filter(usuario=user, leida=False).update(leida=True)
    return Response({'status': 'ok'})


# ==============================================================================
# 8. BOLETINES EN PDF Y RECUPERACIÓN DE CONTRASEÑA (FASE 4)
# ==============================================================================

@api_view(['GET'])
def api_descargar_boletin_estudiante(request, estudiante_id):
    """
    Genera y descarga el boletín oficial de calificaciones en formato PDF.
    Control de acceso:
    - Estudiante: solo puede descargar su propio boletín.
    - Docente / Admin: pueden descargar boletines de estudiantes.
    """
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'Debes iniciar sesión para descargar boletines.'}, status=status.HTTP_401_UNAUTHORIZED)

    estudiante = get_object_or_404(Estudiante, id=estudiante_id)

    # Control estricto de permisos
    if user.rol == 'ESTUDIANTE':
        if not hasattr(user, 'perfil_estudiante') or user.perfil_estudiante.id != estudiante.id:
            return Response({'error': 'No tienes autorización para consultar el boletín de otro estudiante.'}, status=status.HTTP_403_FORBIDDEN)
    elif user.rol == 'DOCENTE':
        docente = getattr(user, 'perfil_docente', None)
        if not docente:
            docente, _ = Docente.objects.get_or_create(usuario=user)
    else:
        return Response({'error': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)

    pdf_buffer = generate_student_boletin_pdf(estudiante)
    filename = f"boletin_{sanitize_filename(estudiante.usuario.username)}_{timezone.now().strftime('%Y%m%d')}.pdf"
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def api_password_reset_request(request):
    """
    Solicitud de restablecimiento de contraseña.
    Seguridad: nunca revela si el correo existe o no en la base de datos (Timing/Enumeration attack prevention).
    """
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'Debes ingresar un correo electrónico válido.'}, status=status.HTTP_400_BAD_REQUEST)

    user = Usuario.objects.filter(email__iexact=email).first()
    if user:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        origin = request.headers.get('Origin') or request.build_absolute_uri('/')[:-1]
        reset_url = f"{origin}/?reset_uid={uid}&reset_token={token}"
        try:
            send_password_reset_email(user, reset_url)
        except Exception:
            pass

    return Response({
        'message': 'Si el correo electrónico está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def api_password_reset_confirm(request):
    """
    Confirma el restablecimiento de contraseña utilizando token seguro de un solo uso.
    """
    uid_b64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = (request.data.get('new_password') or '').strip()

    if not uid_b64 or not token or not new_password:
        return Response({'error': 'Parámetros incompletos (uid, token o nueva contraseña requeridos).'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'La contraseña debe contener al menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = Usuario.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.set_password(new_password)
        user.save()
        return Response({
            'message': 'Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def api_student_feedbacks(request):
    user = request.user
    if not user.is_authenticated or user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Acceso exclusivo para estudiantes.'}, status=status.HTTP_403_FORBIDDEN)

    estudiante = user.perfil_estudiante
    calificaciones = Calificacion.objects.filter(
        entrega__estudiante=estudiante
    ).select_related('entrega__tarea', 'entrega__tarea__espacio', 'docente__usuario').order_by('-fecha_calificacion')

    feedbacks = []
    for c in calificaciones:
        retro = getattr(c, 'retroalimentacion', None)
        comentario = retro.comentario if retro and retro.comentario else 'Entrega evaluada y calificada por el docente.'
        tarea = c.entrega.tarea
        feedbacks.append({
            'id': c.id,
            'tarea_id': tarea.id,
            'tarea_titulo': tarea.titulo,
            'materia': tarea.espacio.nombre if tarea.espacio else 'General',
            'docente': c.docente.usuario.get_full_name() if c.docente else 'Docente',
            'docente_avatar': getattr(c.docente.usuario, 'avatar_url', '') if c.docente else '',
            'nota': float(c.nota),
            'puntaje_maximo': tarea.puntaje_maximo or 100,
            'comentario': comentario,
            'fecha': c.fecha_calificacion.strftime('%d/%m/%Y %H:%M') if c.fecha_calificacion else '',
            'archivo_nombre': c.entrega.archivo_nombre,
            'archivo_url': c.entrega.archivo_url,
        })
    return Response(feedbacks)


@api_view(['GET'])
def api_student_calificaciones(request):
    """
    Retorna la tabla completa de calificaciones de todas las actividades
    (tareas escolares y simuladores IA) del estudiante autenticado.
    """
    user = request.user
    if not user.is_authenticated or user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Acceso exclusivo para estudiantes.'}, status=status.HTTP_403_FORBIDDEN)

    estudiante = user.perfil_estudiante
    now = timezone.now()
    espacios_ids = estudiante.get_espacios_ids()

    tareas = Tarea.objects.filter(
        espacio_id__in=espacios_ids,
        estado='PUBLICADA'
    ).select_related('espacio', 'espacio__materia', 'espacio__curso', 'docente__usuario').order_by('espacio__materia__nombre', '-fecha_limite')

    actividades = []

    for t in tareas:
        entrega = Entrega.objects.filter(tarea=t, estudiante=estudiante).first()
        cal = getattr(entrega, 'calificacion', None) if entrega else None
        retro = getattr(cal, 'retroalimentacion', None) if cal else None

        if cal:
            estado = 'CALIFICADO'
            nota = float(cal.nota)
        elif entrega:
            estado = 'EN_REVISION'
            nota = None
        elif t.fecha_limite and t.fecha_limite < now:
            estado = 'VENCIDO'
            nota = None
        else:
            estado = 'PENDIENTE'
            nota = None

        materia_nombre = ''
        if t.espacio and t.espacio.materia:
            materia_nombre = t.espacio.materia.nombre
        elif t.espacio:
            materia_nombre = t.espacio.nombre
        else:
            materia_nombre = 'General'

        comentario = ''
        if retro and retro.comentario:
            comentario = retro.comentario
        elif cal:
            comentario = 'Actividad evaluada y calificada por el docente.'
        elif entrega and entrega.observaciones:
            comentario = f"Entrega del estudiante: {entrega.observaciones}"
        elif estado == 'EN_REVISION':
            comentario = 'Entrega recibida, en espera de revisión del profesor.'
        elif estado == 'VENCIDO':
            comentario = 'Fecha límite vencida sin entrega registrada.'
        else:
            comentario = 'Actividad asignada pendiente de entrega.'

        actividades.append({
            'id': f"tarea_{t.id}",
            'tipo': 'Tarea Escolar',
            'tarea_id': t.id,
            'titulo': t.titulo,
            'materia': materia_nombre,
            'curso': t.espacio.curso.nombre if t.espacio and t.espacio.curso else '',
            'docente': t.docente.usuario.get_full_name() if t.docente else 'Docente',
            'docente_avatar': getattr(t.docente.usuario, 'avatar_url', '') if t.docente else '',
            'estado': estado,
            'nota': nota,
            'puntaje_maximo': t.puntaje_maximo or 100,
            'retroalimentacion': comentario,
            'fecha_entrega': entrega.fecha_entrega.strftime('%d/%m/%Y %H:%M') if entrega and entrega.fecha_entrega else None,
            'fecha_calificacion': cal.fecha_calificacion.strftime('%d/%m/%Y %H:%M') if cal and cal.fecha_calificacion else None,
            'fecha_limite': t.fecha_limite.strftime('%d/%m/%Y %H:%M') if t.fecha_limite else None,
            'archivo_nombre': entrega.archivo_nombre if entrega else None,
            'archivo_url': entrega.archivo_url if entrega else None,
        })

    # Evaluaciones / Simuladores IA
    intentos = IntentoPracticaEstudiante.objects.filter(
        estudiante=estudiante
    ).select_related('practica', 'practica__materia', 'practica__docente__usuario').order_by('-fecha_intento')

    for it in intentos:
        materia_nombre = it.practica.materia.nombre if it.practica.materia else 'General'
        docente_nombre = it.practica.docente.usuario.get_full_name() if it.practica.docente else 'IA Pedagógica'
        actividades.append({
            'id': f"ia_{it.id}",
            'tipo': 'Simulador IA',
            'tarea_id': None,
            'practica_id': it.practica.id,
            'titulo': it.practica.titulo,
            'materia': materia_nombre,
            'curso': '',
            'docente': f"{docente_nombre} (IA)",
            'docente_avatar': '',
            'estado': 'CALIFICADO',
            'nota': float(it.puntaje_obtenido),
            'puntaje_maximo': 100,
            'retroalimentacion': it.retroalimentacion_ia or f"Aciertos: {it.respuestas_correctas} de {it.total_preguntas} preguntas.",
            'fecha_entrega': it.fecha_intento.strftime('%d/%m/%Y %H:%M') if it.fecha_intento else None,
            'fecha_calificacion': it.fecha_intento.strftime('%d/%m/%Y %H:%M') if it.fecha_intento else None,
            'fecha_limite': None,
            'archivo_nombre': None,
            'archivo_url': None,
        })

    return Response(actividades)


@api_view(['GET'])
def api_student_boletin(request):
    """
    Retorna el boletín oficial de calificaciones del estudiante organizado por materias,
    con filtro por trimestre (1, 2, 3 o all) y promedios numéricos para:
    TAREAS PRESENTADAS, PRÁCTICAS, EVALUACIONES IA, EXÁMENES y PROMEDIO.
    """
    user = request.user
    if not user.is_authenticated or user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Acceso exclusivo para estudiantes.'}, status=status.HTTP_403_FORBIDDEN)

    est = user.perfil_estudiante
    now = timezone.now()
    trimestre = request.GET.get('trimestre', 'all')

    def in_trimestre(dt):
        if not dt or trimestre == 'all':
            return True
        m = dt.month
        if trimestre == '1':
            return 1 <= m <= 5
        elif trimestre == '2':
            return 6 <= m <= 8
        elif trimestre == '3':
            return 9 <= m <= 12
        return True

    inscripcion = EstudianteCurso.objects.filter(estudiante=est, estado='ACTIVO').select_related('curso', 'curso__colegio').first()
    curso = inscripcion.curso if inscripcion else None
    colegio = curso.colegio if curso else None

    espacios = Espacio.objects.filter(id__in=est.get_espacios_ids()).select_related('materia', 'docente__usuario').order_by('materia__nombre')

    materias_data = []
    todas_las_notas = []

    for esp in espacios:
        mat = esp.materia
        mat_nombre = mat.nombre if mat else esp.nombre
        doc_nombre = esp.docente.usuario.get_full_name() if esp.docente else 'Docente'

        tareas_qs = Tarea.objects.filter(espacio=esp, estado='PUBLICADA').order_by('fecha_limite')

        tareas_list = []
        practicas_list = []
        examenes_list = []
        evaluaciones_ia_list = []

        notas_tareas = []
        notas_practicas = []
        notas_examenes = []
        notas_ia = []
        notas_materia = []

        for t in tareas_qs:
            fecha_ref = t.fecha_limite or t.fecha_publicacion
            if not in_trimestre(fecha_ref):
                continue

            e = Entrega.objects.filter(tarea=t, estudiante=est).first()
            cal = getattr(e, 'calificacion', None) if e else None
            retro = getattr(cal, 'retroalimentacion', None) if cal else None

            titulo_lower = t.titulo.lower()
            is_examen = any(k in titulo_lower for k in ['examen', 'parcial', 'evaluación', 'evaluacion', 'prueba'])
            is_practica = not is_examen and any(k in titulo_lower for k in ['práctica', 'practica', 'taller', 'laboratorio', 'guía', 'guia'])

            if cal:
                estado = 'CALIFICADO'
                nota = float(cal.nota)
            elif e:
                estado = 'EN_REVISION'
                nota = None
            elif t.fecha_limite and t.fecha_limite < now:
                estado = 'VENCIDA'
                nota = None
            else:
                estado = 'PENDIENTE'
                nota = None

            item = {
                'id': t.id,
                'titulo': t.titulo,
                'estado': estado,
                'nota': nota,
                'puntaje_maximo': t.puntaje_maximo or 100,
                'retroalimentacion': retro.comentario if retro and retro.comentario else (e.observaciones if e else ''),
                'fecha_limite': t.fecha_limite.strftime('%d/%m/%Y') if t.fecha_limite else '',
                'fecha_entrega': e.fecha_entrega.strftime('%d/%m/%Y') if e and e.fecha_entrega else '',
            }

            if is_examen:
                examenes_list.append(item)
                if nota is not None:
                    notas_examenes.append(nota)
                    notas_materia.append(nota)
                    todas_las_notas.append(nota)
            elif is_practica:
                practicas_list.append(item)
                if nota is not None:
                    notas_practicas.append(nota)
                    notas_materia.append(nota)
                    todas_las_notas.append(nota)
            else:
                tareas_list.append(item)
                if nota is not None:
                    notas_tareas.append(nota)
                    notas_materia.append(nota)
                    todas_las_notas.append(nota)

        # Evaluaciones y Simuladores IA de la materia
        intentos_ia = IntentoPracticaEstudiante.objects.filter(estudiante=est, practica__materia=mat).select_related('practica')
        practicas_disponibles = PracticaTema.objects.filter(materia=mat, activo=True)

        for p in practicas_disponibles:
            it = intentos_ia.filter(practica=p).first()
            fecha_ia = it.fecha_intento if it else p.fecha_creacion
            if not in_trimestre(fecha_ia):
                continue

            if it:
                nota_ia = float(it.puntaje_obtenido)
                notas_ia.append(nota_ia)
                notas_materia.append(nota_ia)
                todas_las_notas.append(nota_ia)
                evaluaciones_ia_list.append({
                    'id': p.id,
                    'titulo': p.titulo,
                    'estado': 'COMPLETADO',
                    'nota': nota_ia,
                    'aciertos': f"{it.respuestas_correctas}/{it.total_preguntas}",
                    'retroalimentacion': it.retroalimentacion_ia,
                    'fecha': it.fecha_intento.strftime('%d/%m/%Y') if it.fecha_intento else ''
                })
            else:
                evaluaciones_ia_list.append({
                    'id': p.id,
                    'titulo': p.titulo,
                    'estado': 'DISPONIBLE',
                    'nota': None,
                    'aciertos': 'Pendiente',
                    'retroalimentacion': 'Simulador IA disponible para resolver.',
                    'fecha': ''
                })

        prom_tareas = round(sum(notas_tareas) / len(notas_tareas)) if notas_tareas else 0
        prom_practicas = round(sum(notas_practicas) / len(notas_practicas)) if notas_practicas else 0
        prom_ia = round(sum(notas_ia) / len(notas_ia)) if notas_ia else 0
        prom_examenes = round(sum(notas_examenes) / len(notas_examenes)) if notas_examenes else 0
        promedio_mat = round(sum(notas_materia) / len(notas_materia)) if notas_materia else 0

        materias_data.append({
            'materia_id': mat.id if mat else esp.id,
            'materia': mat_nombre,
            'docente': doc_nombre,
            'nota_tareas': prom_tareas,
            'nota_practicas': prom_practicas,
            'nota_evaluaciones_ia': prom_ia,
            'nota_examenes': prom_examenes,
            'promedio': promedio_mat,
            'tareas': tareas_list,
            'practicas': practicas_list,
            'evaluaciones': evaluaciones_ia_list,
            'examenes': examenes_list,
        })

    promedio_general = round(sum(todas_las_notas) / len(todas_las_notas)) if todas_las_notas else 0

    return Response({
        'trimestre': trimestre,
        'estudiante': {
            'id': est.id,
            'nombre_completo': user.nombre_completo,
            'rude': inscripcion.codigo_ru if (inscripcion and inscripcion.codigo_ru) else f"RUDE-{est.id:06d}",
        },
        'colegio': {
            'nombre': colegio.nombre if colegio else 'Colegio Nacional Simón Bolívar',
        },
        'curso': {
            'nombre': curso.nombre if curso else '6to de Secundaria "A"',
            'anio_lectivo': curso.anio_lectivo if curso else 2026,
        },
        'materias': materias_data,
        'resumen': {
            'promedio_general': promedio_general,
            'total_materias': len(materias_data),
        }
    })


