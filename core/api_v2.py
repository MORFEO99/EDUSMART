import random
import string
import pandas as pd
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone

from .models import (
    Colegio, DocenteColegio, Curso, Materia, EstudianteCurso,
    Estudiante, Usuario, Invitacion, Espacio, MiembroEspacio,
    InvitacionEspacio, Notificacion
)
from .serializers_v2 import (
    ColegioSerializer, DocenteColegioSerializer, CursoSerializer,
    MateriaSerializer, EstudianteCursoSerializer
)


# ==============================================================================
# COLEGIOS
# ==============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_colegios(request):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)

    docente = user.perfil_docente

    if request.method == 'GET':
        colegios = Colegio.objects.filter(docentes__docente=docente)
        return Response(ColegioSerializer(colegios, many=True).data)

    elif request.method == 'POST':
        serializer = ColegioSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                colegio = serializer.save()
                DocenteColegio.objects.create(docente=docente, colegio=colegio, cargo='Docente Principal')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_cursos_por_colegio(request, colegio_id):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)

    colegio = get_object_or_404(Colegio, id=colegio_id)
    
    if request.method == 'GET':
        cursos = Curso.objects.filter(colegio=colegio)
        return Response(CursoSerializer(cursos, many=True).data)
        
    elif request.method == 'POST':
        # Create a new course
        data = request.data.copy()
        data['colegio'] = colegio.id
        serializer = CursoSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_materias_por_curso(request, curso_id):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)

    curso = get_object_or_404(Curso, id=curso_id)
    docente = user.perfil_docente
    
    data = request.data.copy()
    data['curso'] = curso.id
    data['docente'] = docente.id
    
    from .serializers_v2 import MateriaBasicSerializer
    serializer = MateriaBasicSerializer(data=data)
    if serializer.is_valid():
        with transaction.atomic():
            materia = serializer.save(curso=curso, docente=docente)
            import uuid
            import string
            import random
            def get_random_code():
                return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                
            codigo_espacio = get_random_code()
            espacio = Espacio.objects.create(
                materia=materia, 
                docente=docente,
                nombre=materia.nombre,
                codigo=codigo_espacio,
                colegio=curso.colegio,
                curso=curso
            )
            
            # Retrieve the created serializer data to return it
            return_data = serializer.data
            return_data['espacio_id'] = espacio.id
            
        return Response(return_data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==============================================================================
# IMPORTACION EXCEL DE ESTUDIANTES
# ==============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_importar_estudiantes(request, curso_id):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)

    curso = get_object_or_404(Curso, id=curso_id)
    archivo = request.FILES.get('archivo')

    if not archivo:
        return Response({'error': 'No se proporciono archivo'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        df = pd.read_excel(archivo)
    except Exception as e:
        return Response({'error': f'Error al leer el archivo Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    records = df.to_dict('records')
    is_preview = request.POST.get('preview', 'true').lower() == 'true'

    if is_preview:
        columnas = list(df.columns)
        return Response({
            'columnas_encontradas': columnas,
            'total_filas': len(records),
            'vista_previa': records[:5]
        })

    col_nombre = request.POST.get('col_nombre', 'NOMBRE')
    col_correo = request.POST.get('col_correo', 'CORREO')
    col_ru = request.POST.get('col_ru', 'RU')

    resultados = {'nuevos': 0, 'duplicados': 0, 'errores': 0, 'detalle_errores': []}
    docente = user.perfil_docente

    with transaction.atomic():
        for i, row in enumerate(records):
            nombre = str(row.get(col_nombre, '')).strip()
            correo = str(row.get(col_correo, '')).strip()
            ru = str(row.get(col_ru, '')).strip()

            if not nombre:
                resultados['errores'] += 1
                resultados['detalle_errores'].append(f"Fila {i+2}: Nombre vacio")
                continue

            if EstudianteCurso.objects.filter(curso=curso, codigo_ru=ru).exists():
                resultados['duplicados'] += 1
                continue

            if correo and '@' in correo:
                usuario, created = Usuario.objects.get_or_create(
                    username=correo,
                    defaults={'email': correo, 'first_name': nombre, 'rol': 'ESTUDIANTE'}
                )
            else:
                base_user = nombre.lower().replace(' ', '')
                username = f"{base_user}_{ru}" if ru else base_user
                usuario, created = Usuario.objects.get_or_create(
                    username=username,
                    defaults={'first_name': nombre, 'rol': 'ESTUDIANTE'}
                )

            if created:
                usuario.set_password(ru if ru else '123456')
                usuario.save()

            estudiante, _ = Estudiante.objects.get_or_create(usuario=usuario)
            EstudianteCurso.objects.get_or_create(
                estudiante=estudiante, curso=curso,
                defaults={'codigo_ru': ru}
            )
            resultados['nuevos'] += 1

    return Response({'mensaje': 'Importacion completada', 'resultados': resultados})


# ==============================================================================
# INVITACIONES A ESPACIOS
# ==============================================================================

def generar_codigo_unico(espacio):
    """Genera un codigo unico del tipo: PREFIJO-XXXX-YYYY."""
    prefijo = ''
    if espacio.materia:
        prefijo = ''.join([w[0] for w in espacio.materia.nombre.split() if w]).upper()[:3]
    if not prefijo:
        prefijo = 'EDU'

    for _ in range(20):
        rand1 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        rand2 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        codigo = f"{prefijo}-{rand1}-{rand2}"
        if not InvitacionEspacio.objects.filter(codigo=codigo).exists():
            return codigo
    return None


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_consultar_invitacion(request, espacio_id):
    """GET: consultar codigo activo. POST: generar codigo si no existe."""
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

    espacio = get_object_or_404(Espacio, id=espacio_id, docente=user.perfil_docente)
    inv = InvitacionEspacio.objects.filter(espacio=espacio, estado='ACTIVO').first()

    if not inv:
        codigo = generar_codigo_unico(espacio)
        if not codigo:
            return Response({'error': 'No se pudo generar un codigo unico'}, status=500)
            
        horas_duracion = request.data.get('horas_duracion')
        fecha_exp = None
        if horas_duracion:
            try:
                from datetime import timedelta
                fecha_exp = timezone.now() + timedelta(hours=int(horas_duracion))
            except ValueError:
                pass
                
        inv = InvitacionEspacio.objects.create(
            espacio=espacio, codigo=codigo, estado='ACTIVO', creado_por=user.perfil_docente,
            fecha_expiracion=fecha_exp
        )

    return Response({
        'codigo': inv.codigo,
        'estado': inv.estado,
        'espacio_id': espacio.id,
        'espacio_nombre': espacio.nombre,
        'colegio': espacio.colegio.nombre if espacio.colegio else 'Sin Colegio',
        'curso': espacio.curso.nombre_completo if espacio.curso else 'Sin Curso',
        'materia': espacio.materia.nombre if espacio.materia else 'Sin Materia',
        'docente': espacio.docente.usuario.nombre_completo,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_regenerar_invitacion(request, espacio_id):
    """Desactiva el codigo anterior y genera uno nuevo."""
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

    espacio = get_object_or_404(Espacio, id=espacio_id, docente=user.perfil_docente)
    InvitacionEspacio.objects.filter(espacio=espacio, estado='ACTIVO').update(estado='DESACTIVADO')

    codigo = generar_codigo_unico(espacio)
    if not codigo:
        return Response({'error': 'No se pudo generar un codigo unico'}, status=500)

    horas_duracion = request.data.get('horas_duracion')
    fecha_exp = None
    if horas_duracion:
        try:
            from datetime import timedelta
            fecha_exp = timezone.now() + timedelta(hours=int(horas_duracion))
        except ValueError:
            pass

    inv = InvitacionEspacio.objects.create(
        espacio=espacio, codigo=codigo, estado='ACTIVO', creado_por=user.perfil_docente,
        fecha_expiracion=fecha_exp
    )
    return Response({'codigo': inv.codigo, 'estado': inv.estado, 'mensaje': 'Codigo regenerado exitosamente'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_desactivar_invitacion(request, espacio_id):
    """Desactiva el codigo activo del espacio."""
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

    espacio = get_object_or_404(Espacio, id=espacio_id, docente=user.perfil_docente)
    updated = InvitacionEspacio.objects.filter(espacio=espacio, estado='ACTIVO').update(estado='DESACTIVADO')

    if updated == 0:
        return Response({'mensaje': 'No habia codigo activo'})
    return Response({'mensaje': 'Codigo desactivado exitosamente'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_validar_invitacion(request):
    """Valida un codigo de invitacion y devuelve info del espacio (sin unirse aun)."""
    codigo = request.data.get('codigo', '').strip().upper()

    if not codigo:
        return Response({'error': 'Codigo no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

    inv = InvitacionEspacio.objects.filter(codigo=codigo).first()

    if not inv:
        return Response({'error': 'El codigo de invitacion no existe.'}, status=status.HTTP_404_NOT_FOUND)

    if inv.estado != 'ACTIVO':
        return Response({'error': 'Este codigo de invitacion ya no esta activo.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if inv.fecha_expiracion and timezone.now() > inv.fecha_expiracion:
        inv.estado = 'DESACTIVADO'
        inv.save()
        return Response({'error': 'El código de invitación ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)

    espacio = inv.espacio

    # Check if student already belongs
    if request.user.rol == 'ESTUDIANTE' and hasattr(request.user, 'perfil_estudiante'):
        if MiembroEspacio.objects.filter(espacio=espacio, estudiante=request.user.perfil_estudiante).exists():
            return Response({'error': 'Ya perteneces a este espacio academico.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'valido': True,
        'codigo': codigo,
        'espacio': {
            'id': espacio.id,
            'nombre': espacio.nombre,
            'colegio': espacio.colegio.nombre if espacio.colegio else '',
            'curso': espacio.curso.nombre_completo if espacio.curso else '',
            'materia': espacio.materia.nombre if espacio.materia else espacio.nombre,
            'docente': espacio.docente.usuario.nombre_completo,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_unirse_espacio(request):
    """Une al estudiante al espacio usando el codigo validado."""
    if request.user.rol != 'ESTUDIANTE' or not hasattr(request.user, 'perfil_estudiante'):
        return Response({'error': 'No se pudo identificar tu cuenta de estudiante.'}, status=status.HTTP_403_FORBIDDEN)

    codigo = request.data.get('codigo', '').strip().upper()
    if not codigo:
        return Response({'error': 'Codigo no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

    inv = InvitacionEspacio.objects.filter(codigo=codigo, estado='ACTIVO').first()
    if not inv:
        return Response({'error': 'El codigo es invalido o esta desactivado.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if inv.fecha_expiracion and timezone.now() > inv.fecha_expiracion:
        inv.estado = 'DESACTIVADO'
        inv.save()
        return Response({'error': 'El código de invitación ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)

    estudiante = request.user.perfil_estudiante
    espacio = inv.espacio

    if MiembroEspacio.objects.filter(espacio=espacio, estudiante=estudiante).exists():
        return Response({'error': 'Ya perteneces a este espacio academico.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        MiembroEspacio.objects.create(espacio=espacio, estudiante=estudiante)

        if espacio.curso:
            EstudianteCurso.objects.get_or_create(estudiante=estudiante, curso=espacio.curso)

        Notificacion.objects.create(
            usuario=request.user,
            tipo='INVITACION_ESPACIO',
            mensaje=f"Te has unido a {espacio.materia.nombre if espacio.materia else espacio.nombre}.",
            espacio_id=espacio.id
        )

    return Response({
        'mensaje': 'Te has unido correctamente al espacio.',
        'espacio': {
            'id': espacio.id,
            'nombre': espacio.nombre,
            'materia': espacio.materia.nombre if espacio.materia else espacio.nombre,
            'colegio': espacio.colegio.nombre if espacio.colegio else '',
            'curso': espacio.curso.nombre_completo if espacio.curso else '',
            'docente': espacio.docente.usuario.nombre_completo,
        }
    })


# ==============================================================================
# TAREAS Y ENTREGAS POR ESPACIO
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_tareas_espacio(request, espacio_id):
    from .models import Tarea, Entrega
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)

    espacio = get_object_or_404(Espacio, id=espacio_id, docente=user.perfil_docente)

    # ── Estudiantes inscritos via EstudianteCurso (del curso del espacio)
    estudiantes_data = []
    if espacio.curso:
        from .models import EstudianteCurso
        inscripciones = EstudianteCurso.objects.filter(
            curso=espacio.curso, estado='ACTIVO'
        ).select_related('estudiante__usuario')
        for inscripcion in inscripciones:
            est = inscripcion.estudiante
            estudiantes_data.append({
                'id': est.id,
                'nombre': est.usuario.nombre_completo,
                'email': est.usuario.email,
                'ru': inscripcion.codigo_ru or '-',
            })

    # ── Tareas del espacio con entregas y materiales
    tareas = Tarea.objects.filter(espacio=espacio).prefetch_related('entregas__estudiante__usuario', 'materiales')
    result = []
    for tarea in tareas:
        entregas_data = []
        estudiantes_entregaron = set()
        for entrega in tarea.entregas.all():
            cal = None
            try:
                if hasattr(entrega, 'calificacion'):
                    cal = {
                        'nota': entrega.calificacion.nota,
                        'retroalimentacion': entrega.calificacion.retroalimentacion,
                    }
            except Exception:
                pass
            estudiantes_entregaron.add(entrega.estudiante.id)
            entregas_data.append({
                'id': entrega.id,
                'estado': entrega.estado,
                'estudiante_id': entrega.estudiante.id,
                'estudiante_nombre': entrega.estudiante.usuario.nombre_completo,
                'fecha_entrega': str(entrega.fecha_entrega)[:16].replace('T', ' '),
                'archivo_nombre': entrega.archivo_nombre or 'Sin archivo',
                'calificacion': cal,
            })

        # Build participation map for this task
        participacion = []
        for est in estudiantes_data:
            entrego = est['id'] in estudiantes_entregaron
            entrega_det = next((e for e in entregas_data if e['estudiante_id'] == est['id']), None)
            participacion.append({
                'estudiante_id': est['id'],
                'nombre': est['nombre'],
                'entrego': entrego,
                'calificacion': entrega_det['calificacion'] if entrega_det else None,
            })

        materiales_data = []
        for mat in tarea.materiales.all():
            materiales_data.append({
                'id': mat.id,
                'nombre': mat.nombre,
                'tipo': mat.tipo,
                'url': mat.archivo.url if mat.archivo else mat.archivo_url,
                'tamano': mat.tamano,
            })

        result.append({
            'id': tarea.id,
            'titulo': tarea.titulo,
            'fecha_limite': str(tarea.fecha_limite)[:16].replace('T', ' '),
            'puntaje_maximo': tarea.puntaje_maximo,
            'estado': tarea.estado,
            'esta_vencida': tarea.esta_vencida,
            'total_entregas': len(entregas_data),
            'entregas': entregas_data,
            'participacion': participacion,
            'materiales': materiales_data,
        })

    return Response({
        'espacio': {
            'id': espacio.id,
            'nombre': espacio.nombre,
            'materia': espacio.materia.nombre if espacio.materia else espacio.nombre,
            'colegio': espacio.colegio.nombre if espacio.colegio else '-',
            'curso': espacio.curso.nombre_completo if espacio.curso else '-',
        },
        'estudiantes': estudiantes_data,
        'tareas': result,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_crear_tarea_espacio(request, espacio_id):
    from .models import Tarea, Docente, Material
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)
    docente = user.perfil_docente
    espacio = get_object_or_404(Espacio, id=espacio_id, docente=docente)
    
    # Handle both multipart/form-data and application/json
    data = request.data
    titulo = data.get('titulo','').strip()
    fecha_limite = data.get('fecha_limite','')
    if not titulo or not fecha_limite:
        return Response({'error': 'titulo y fecha_limite son obligatorios'}, status=400)
    
    tarea = Tarea.objects.create(
        espacio=espacio, docente=docente,
        titulo=titulo, descripcion=data.get('descripcion',''),
        indicaciones=data.get('indicaciones',''),
        puntaje_maximo=int(data.get('puntaje_maximo',100)),
        fecha_limite=fecha_limite, estado='PUBLICADA'
    )

    archivos = request.FILES.getlist('archivos')
    for f in archivos:
        # Determine basic type based on extension or mime
        tipo = 'DOCUMENTO'
        if f.name.lower().endswith('.pdf'):
            tipo = 'PDF'
        elif f.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            tipo = 'IMAGEN'
        elif f.name.lower().endswith(('.ppt', '.pptx')):
            tipo = 'PRESENTACION'
        elif f.name.lower().endswith(('.xls', '.xlsx')):
            tipo = 'HOJA_CALCULO'
        elif f.name.lower().endswith('.zip'):
            tipo = 'ZIP'
            
        Material.objects.create(
            tarea=tarea,
            nombre=f.name,
            tipo=tipo,
            archivo=f,
            tamano=f"{f.size / (1024*1024):.1f} MB" if f.size > 1024*1024 else f"{f.size / 1024:.0f} KB"
        )

    return Response({'id': tarea.id, 'titulo': tarea.titulo}, status=201)
