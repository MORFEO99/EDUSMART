from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404

from .models import (
    Usuario, Docente, Estudiante, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion
)
from .serializers import (
    UsuarioSerializer, DocenteSerializer, EstudianteSerializer,
    EspacioSerializer, TareaSerializer, MaterialSerializer,
    EntregaSerializer, CalificacionSerializer, RetroalimentacionSerializer,
    ProgresoAcademicoSerializer, NotificacionSerializer
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
        # Ensure student profile exists for demo accounts
        if user.rol == 'ESTUDIANTE' and not hasattr(user, 'perfil_estudiante'):
            Estudiante.objects.create(usuario=user)
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
            # Ensure student profile exists for real accounts
            if user.rol == 'ESTUDIANTE' and not hasattr(user, 'perfil_estudiante'):
                Estudiante.objects.create(usuario=user)
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
    elif user.rol == 'DOCENTE' and hasattr(user, 'perfil_docente'):
        doc = user.perfil_docente
        role_info = {
            'docente_id': doc.id,
            'especialidad': doc.especialidad,
            'titulo_academico': doc.titulo_academico,
            'biografia': doc.biografia,
        }

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
        estado='ACTIVO'
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
            carrera_o_area=data.get('carrera_o_area', 'Ingeniería y Tecnología')
        )
        est.actualizar_progreso()
        role_info = {
            'estudiante_id': est.id,
            'carrera_o_area': est.carrera_o_area
        }

    login(request, user)

    return Response({
        'user': UsuarioSerializer(user).data,
        'role_info': role_info,
        'message': f'¡Cuenta creada exitosamente! Bienvenido a EDUSMART, {user.nombre_completo}.'
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def api_logout(request):
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
    elif user.rol == 'DOCENTE' and hasattr(user, 'perfil_docente'):
        doc = user.perfil_docente
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
            espacios_ids = user.perfil_estudiante.espacios_inscritos.values_list('espacio_id', flat=True)
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
        if not MiembroEspacio.objects.filter(espacio=espacio, estudiante__usuario=user).exists():
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

    return Response({
        'espacio': espacio_data,
        'tareas': tareas_data,
        'actividad': actividades[:10],
        'miembros': miembros
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
        filtro = request.query_params.get('filtro', 'todas').lower()

        if user.rol == 'ESTUDIANTE' and hasattr(user, 'perfil_estudiante'):
            estudiante = user.perfil_estudiante
            espacios_ids = estudiante.espacios_inscritos.values_list('espacio_id', flat=True)
            tareas = Tarea.objects.filter(espacio_id__in=espacios_ids, estado='PUBLICADA')

            if espacio_id:
                tareas = tareas.filter(espacio_id=espacio_id)

            # Apply filters: todas, pendientes, en_proceso, entregadas, calificadas, vencidas
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

                if filtro == 'todas':
                    filtered_tareas.append(t)
                elif filtro == 'pendientes' and estado_ciclo in ['ASIGNADA', 'EN_PROCESO']:
                    filtered_tareas.append(t)
                elif filtro == 'en_proceso' and estado_ciclo == 'EN_PROCESO':
                    filtered_tareas.append(t)
                elif filtro == 'entregadas' and estado_ciclo in ['ENTREGADA', 'EN_REVISION']:
                    filtered_tareas.append(t)
                elif filtro == 'calificadas' and estado_ciclo in ['CALIFICADA', 'RETROALIMENTADA']:
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
        espacio_id = data.get('espacio_id')
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
def api_presentar_tarea(request, pk):
    user = request.user
    if user.rol != 'ESTUDIANTE' or not hasattr(user, 'perfil_estudiante'):
        return Response({'error': 'Solo los estudiantes pueden presentar tareas.'}, status=status.HTTP_403_FORBIDDEN)

    tarea = get_object_or_404(Tarea, id=pk)
    estudiante = user.perfil_estudiante

    data = request.data
    archivo_url = data.get('archivo_url') or 'https://edusmart.cloud/storage/entregas/trabajo_practico.pdf'
    archivo_nombre = data.get('archivo_nombre') or 'trabajo_academico_edusmart.pdf'
    archivo_tamano = data.get('archivo_tamano') or '2.4 MB'
    observaciones = data.get('observaciones') or ''

    now = timezone.now()
    estado = 'ATRASADO' if now > tarea.fecha_limite else 'ENTREGADO'

    entrega, created = Entrega.objects.get_or_create(
        tarea=tarea,
        estudiante=estudiante,
        defaults={
            'archivo_url': archivo_url,
            'archivo_nombre': archivo_nombre,
            'archivo_tamano': archivo_tamano,
            'observaciones': observaciones,
            'fecha_entrega': now,
            'estado': estado
        }
    )

    if not created:
        entrega.archivo_url = archivo_url
        entrega.archivo_nombre = archivo_nombre
        entrega.archivo_tamano = archivo_tamano
        entrega.observaciones = observaciones
        entrega.fecha_entrega = now
        entrega.estado = estado
        entrega.save()

    estudiante.actualizar_progreso()

    # Create confirmation notification for student
    Notificacion.objects.create(
        usuario=user,
        tipo='ENTREGA_CONFIRMADA',
        mensaje=f"Entrega realizada correctamente para '{tarea.titulo}'. Estado: {entrega.get_estado_display()}.",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    # Notify teacher
    Notificacion.objects.create(
        usuario=tarea.docente.usuario,
        tipo='ENTREGA_CONFIRMADA',
        mensaje=f"El estudiante {user.nombre_completo} presentó la tarea '{tarea.titulo}' en '{tarea.espacio.nombre}'.",
        espacio_id=tarea.espacio.id,
        tarea_id=tarea.id
    )

    return Response({
        'message': 'Entrega realizada correctamente.',
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

    return Response({
        'message': f"Evaluación guardada con éxito ({nota}/100).",
        'calificacion': CalificacionSerializer(calificacion).data,
        'estado': entrega.estado
    })


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

    espacios_ids = estudiante.espacios_inscritos.values_list('espacio_id', flat=True)
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

        return Response({
            'resumen': {
                'promedio': progreso.promedio,
                'tareas_entregadas': progreso.tareas_entregadas,
                'tareas_pendientes': progreso.tareas_pendientes,
                'tareas_calificadas': progreso.tareas_calificadas,
                'tareas_vencidas': progreso.tareas_vencidas,
                'porcentaje_cumplimiento': progreso.porcentaje_cumplimiento
            },
            'por_espacio': espacios_data,
            'historial_notas': historial_notas
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
