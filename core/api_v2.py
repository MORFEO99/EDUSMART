import random

import string

import pandas as pd

from rest_framework.decorators import api_view, permission_classes

from rest_framework.permissions import IsAuthenticated

from rest_framework.response import Response

from rest_framework import status

from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .pdf_service import generate_course_gradebook_pdf

from django.db import transaction

from django.utils import timezone



from django.db.models import Avg, Q



from .models import (

    Colegio, DocenteColegio, Curso, Materia, EstudianteCurso,

    Estudiante, Usuario, Invitacion, Espacio, MiembroEspacio,

    InvitacionEspacio, Notificacion, Tarea, Entrega, Calificacion, Docente,
    TemaAvance

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



    # ── Estudiantes inscritos via EstudianteCurso (del curso del espacio) o via MiembroEspacio

    estudiantes_data = []

    seen_est_ids = set()

    if espacio.curso:

        from .models import EstudianteCurso

        inscripciones = EstudianteCurso.objects.filter(

            curso=espacio.curso, estado='ACTIVO'

        ).select_related('estudiante__usuario')

        for inscripcion in inscripciones:

            est = inscripcion.estudiante

            if est.id not in seen_est_ids:

                seen_est_ids.add(est.id)

                estudiantes_data.append({

                    'id': est.id,

                    'nombre': est.usuario.nombre_completo,

                    'email': est.usuario.email,

                    'ru': inscripcion.codigo_ru or f"RU-{espacio.id}-{est.id:03d}",

                })



    from .models import MiembroEspacio

    miembros = MiembroEspacio.objects.filter(espacio=espacio).select_related('estudiante__usuario')

    for m in miembros:

        est = m.estudiante

        if est.id not in seen_est_ids:

            seen_est_ids.add(est.id)

            estudiantes_data.append({

                'id': est.id,

                'nombre': est.usuario.nombre_completo,

                'email': est.usuario.email,

                'ru': f"RU-{espacio.id}-{est.id:03d}",

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





# ==============================================================================

# GESTION DE ESTUDIANTES POR CURSO Y REPORTES DE DESEMPEÑO

# ==============================================================================



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def api_estudiantes_por_curso(request, curso_id):

    """

    Retorna la lista detallada de estudiantes matriculados en un curso especifico,

    con sus metricas academicas en tiempo real para emision de reportes.

    """

    user = request.user

    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):

        return Response({'error': 'Solo docentes pueden consultar la lista de estudiantes'}, status=status.HTTP_403_FORBIDDEN)



    curso = get_object_or_404(Curso, id=curso_id)



    # Si aún no hay estudiantes inscritos en la tabla EstudianteCurso para este curso,

    # auto-vincular estudiantes activos del sistema para asegurar disponibilidad inmediata

    if not EstudianteCurso.objects.filter(curso=curso).exists():

        for idx, est in enumerate(Estudiante.objects.all(), start=1):

            EstudianteCurso.objects.get_or_create(

                curso=curso,

                estudiante=est,

                defaults={'codigo_ru': f"RU-{curso.id}-{idx:03d}"}

            )



    espacios = Espacio.objects.filter(curso=curso)

    tareas = Tarea.objects.filter(espacio__in=espacios, estado='PUBLICADA')

    total_tareas = tareas.count()



    inscripciones = EstudianteCurso.objects.filter(curso=curso).select_related('estudiante__usuario').order_by('estudiante__usuario__last_name', 'estudiante__usuario__first_name')



    estudiantes_list = []

    for insc in inscripciones:

        est = insc.estudiante

        u = est.usuario



        entregas = Entrega.objects.filter(estudiante=est, tarea__in=tareas)

        entregadas_count = entregas.count()

        calificaciones = Calificacion.objects.filter(entrega__in=entregas)

        promedio_aggr = calificaciones.aggregate(Avg('nota'))['nota__avg']



        if promedio_aggr is not None:

            promedio_val = round(float(promedio_aggr), 1)

        else:

            progreso = getattr(est, 'progreso', None)

            promedio_val = round(progreso.promedio, 1) if progreso else 0.0



        pendientes = max(0, total_tareas - entregadas_count)

        cumplimiento = round((entregadas_count / total_tareas * 100.0), 1) if total_tareas > 0 else 100.0



        if promedio_val >= 85:

            estado_academico = 'Excelente'

        elif promedio_val >= 70:

            estado_academico = 'Bueno'

        elif promedio_val >= 51:

            estado_academico = 'Regular'

        else:

            estado_academico = 'Riesgo' if total_tareas > 0 else 'Activo'



        riesgo = (promedio_val < 51 and total_tareas > 0) or (cumplimiento < 50 and total_tareas >= 2)



        estudiantes_list.append({

            'id': est.id,

            'estudiante_id': est.id,

            'inscripcion_id': insc.id,

            'nombre_completo': u.nombre_completo,

            'email': u.email or f"{u.username}@estudiante.com",

            'matricula': insc.codigo_ru or f"EST-{curso.id}-{est.id:03d}",

            'grado': curso.grado,

            'paralelo': curso.paralelo,

            'curso_id': curso.id,

            'curso_nombre': curso.nombre_completo,

            'estado_inscripcion': insc.estado,

            'tareas_asignadas': total_tareas,

            'tareas_entregadas': entregadas_count,

            'tareas_pendientes': pendientes,

            'porcentaje_cumplimiento': int(cumplimiento),

            'promedio': promedio_val,

            'riesgo_academico': riesgo,

            'estado_academico': estado_academico

        })



    return Response({

        'curso': {

            'id': curso.id,

            'nombre': curso.nombre,

            'grado': curso.grado,

            'paralelo': curso.paralelo,

            'nivel': curso.nivel,

            'anio_lectivo': curso.anio_lectivo,

            'colegio': curso.colegio.nombre if curso.colegio else '',

            'total_materias': curso.materias.count(),

            'total_tareas': total_tareas

        },

        'total_estudiantes': len(estudiantes_list),

        'estudiantes': estudiantes_list

    })





@api_view(['POST'])

@permission_classes([IsAuthenticated])

def api_enviar_reporte_estudiante(request, estudiante_id):

    """

    Envia un reporte individual de desempeno academico al estudiante

    generando una notificacion directa en el sistema y confirmacion.

    """

    user = request.user

    if user.rol != 'DOCENTE':

        return Response({'error': 'Solo docentes pueden emitir reportes academicos'}, status=status.HTTP_403_FORBIDDEN)



    estudiante = get_object_or_404(Estudiante, id=estudiante_id)

    asunto = request.data.get('asunto', f"Reporte de Desempeño - {estudiante.usuario.nombre_completo}")

    mensaje = request.data.get('mensaje', '').strip()

    email = request.data.get('email', estudiante.usuario.email)



    if not mensaje:

        return Response({'error': 'El contenido del reporte no puede estar vacío.'}, status=status.HTTP_400_BAD_REQUEST)



    # Registrar notificacion en la cuenta del estudiante

    Notificacion.objects.create(

        usuario=estudiante.usuario,

        tipo='CALIFICADA',

        mensaje=f"📊 REPORTE DE DESEMPEÑO ACADÉMICO ({asunto})\n\n{mensaje}"

    )



    return Response({

        'ok': True,

        'mensaje': f'Reporte enviado correctamente a {estudiante.usuario.nombre_completo}',

        'destinatario': {

            'id': estudiante.id,

            'nombre': estudiante.usuario.nombre_completo,

            'email': email

        },

        'asunto': asunto,

        'fecha_envio': timezone.now().isoformat()

    })





@api_view(['POST'])

@permission_classes([IsAuthenticated])

def api_enviar_reportes_curso(request, curso_id):

    """

    Envia un reporte de desempeno academico a todos los estudiantes de un curso.

    """

    user = request.user

    if user.rol != 'DOCENTE':

        return Response({'error': 'Solo docentes pueden emitir reportes academicos'}, status=status.HTTP_403_FORBIDDEN)



    curso = get_object_or_404(Curso, id=curso_id)

    inscripciones = EstudianteCurso.objects.filter(curso=curso).select_related('estudiante__usuario')
    estudiante_ids = request.data.get('estudiante_ids')
    if estudiante_ids and isinstance(estudiante_ids, list):
        inscripciones = inscripciones.filter(estudiante_id__in=estudiante_ids)



    asunto_base = request.data.get('asunto', f"Reporte General de Curso - {curso.nombre_completo}")

    mensaje_personalizado = request.data.get('mensaje', '').strip()



    total_enviados = 0

    with transaction.atomic():

        for insc in inscripciones:

            est = insc.estudiante

            msg = mensaje_personalizado or (

                f"Estimado/a {est.usuario.nombre_completo},\n\n"

                f"Se ha emitido el reporte periódico de desempeño para el curso {curso.nombre_completo}.\n"

                f"Por favor revisa tus tareas pendientes y calificaciones en la plataforma EduSmart.\n\n"

                f"Atentamente,\nProf. {user.nombre_completo}"

            )

            Notificacion.objects.create(

                usuario=est.usuario,

                tipo='CALIFICADA',

                mensaje=f"📊 REPORTE DE DESEMPEÑO ({asunto_base})\n\n{msg}"

            )

            total_enviados += 1



    return Response({

        'ok': True,

        'mensaje': f'Se enviaron con éxito {total_enviados} reportes a los estudiantes de {curso.nombre_completo}.',

        'total_enviados': total_enviados

    })







# ==============================================================================

# LISTA DE ESTUDIANTES TIPO EXCEL (POR COLEGIO / CURSO / MATERIA)

# ==============================================================================



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def api_lista_excel_docente(request):
    user = request.user
    if user.rol != 'DOCENTE' or not hasattr(user, 'perfil_docente'):
        return Response({'error': 'Solo docentes'}, status=403)
    docente = user.perfil_docente

    def _sort_curso_key(c):
        g = (c.grado or '').lower()
        is_pri = ('primaria' in g) or ('primaria' in (c.nivel or '').lower())
        digit = 99
        for d, w in [(1, '1ro'), (2, '2do'), (3, '3ro'), (4, '4to'), (5, '5to'), (6, '6to')]:
            if w in g:
                digit = d
                break
        return (0 if is_pri else 1, digit, c.paralelo or '')

    colegios_data = []
    colegios = Colegio.objects.filter(docentes__docente=docente)
    for colegio in colegios:
        cursos_data = []
        cursos_list = sorted(Curso.objects.filter(colegio=colegio), key=_sort_curso_key)
        seen_cursos = set()
        for curso in cursos_list:
            c_key = f"{curso.grado}_{curso.paralelo}"
            if c_key in seen_cursos:
                continue
            seen_cursos.add(c_key)
            materias_data = []
            materias = Materia.objects.filter(curso=curso, docente=docente)
            if not materias.exists():
                for espacio in Espacio.objects.filter(curso=curso, docente=docente):
                    tareas = list(Tarea.objects.filter(espacio=espacio, estado='PUBLICADA'))
                    estudiantes_list = _build_student_list_excel(espacio, tareas)
                    materias_data.append({
                        'materia_id': espacio.id,
                        'espacio_id': espacio.id,
                        'materia_nombre': espacio.nombre,
                        'total_tareas': len(tareas),
                        'total_estudiantes': len(estudiantes_list),
                        'estudiantes': estudiantes_list
                    })
            else:
                for materia in materias:
                    espacio = Espacio.objects.filter(materia=materia, docente=docente).first()
                    tareas = list(Tarea.objects.filter(espacio=espacio, estado='PUBLICADA')) if espacio else []
                    estudiantes_list = _build_student_list_excel(espacio, tareas) if espacio else []
                    materias_data.append({
                        'materia_id': materia.id,
                        'espacio_id': espacio.id if espacio else None,
                        'materia_nombre': materia.nombre,
                        'horas_semanales': materia.horas_semanales,
                        'total_tareas': len(tareas),
                        'total_estudiantes': len(estudiantes_list),
                        'estudiantes': estudiantes_list
                    })
            if materias_data:
                is_primaria = 'primaria' in (curso.grado or '').lower() or 'primaria' in (curso.nivel or '').lower()
                nivel_label = 'Primaria' if is_primaria else 'Secundaria'
                cursos_data.append({
                    'curso_id': curso.id,
                    'curso_nombre': curso.grado + ' "' + curso.paralelo + '"',
                    'grado': curso.grado,
                    'paralelo': curso.paralelo,
                    'nivel': nivel_label,
                    'anio_lectivo': curso.anio_lectivo,
                    'materias': materias_data
                })
        if cursos_data:
            colegios_data.append({
                'colegio_id': colegio.id,
                'colegio_nombre': colegio.nombre,
                'ciudad': colegio.ciudad,
                'color': colegio.color,
                'cursos': cursos_data
            })
    return Response({'docente': docente.usuario.nombre_completo, 'colegios': colegios_data})


def _build_student_list_excel(espacio, tareas):

    if not espacio:

        return []

    estudiantes_data = []

    seen = set()

    miembros = MiembroEspacio.objects.filter(espacio=espacio).select_related('estudiante__usuario')

    all_entregas = {}

    for e in Entrega.objects.filter(tarea__espacio=espacio).select_related('calificacion'):

        all_entregas[(e.estudiante_id, e.tarea_id)] = e

    for m in miembros:

        est = m.estudiante

        if est.id in seen:

            continue

        seen.add(est.id)

        calificaciones_por_tarea = []

        notas = []

        entregas_count = 0

        for t in tareas:

            entrega = all_entregas.get((est.id, t.id))

            if entrega:

                entregas_count += 1

                nota = entrega.calificacion.nota if hasattr(entrega, 'calificacion') else None

                notas.append(nota)

                calificaciones_por_tarea.append({'tarea_id': t.id, 'tarea_titulo': t.titulo, 'estado': entrega.estado, 'nota': nota, 'fecha_entrega': entrega.fecha_entrega.strftime('%d/%m/%Y') if entrega.fecha_entrega else None})

            else:

                calificaciones_por_tarea.append({'tarea_id': t.id, 'tarea_titulo': t.titulo, 'estado': 'PENDIENTE', 'nota': None, 'fecha_entrega': None})

        notas_validas = [n for n in notas if n is not None]

        promedio = round(sum(notas_validas) / len(notas_validas), 2) if notas_validas else None

        total_t = len(tareas)

        cumplimiento = round((entregas_count / total_t) * 100) if total_t > 0 else 0

        if promedio is not None:

            estado_ac = 'Excelente' if promedio >= 90 else ('Aprobado' if promedio >= 51 else 'En riesgo')

        else:

            estado_ac = 'Sin notas'

        try:

            ec = EstudianteCurso.objects.filter(estudiante=est, curso=espacio.curso).first() if espacio.curso else None

            ru = ec.codigo_ru if ec and ec.codigo_ru else ('RUDE-' + str(est.id).zfill(6))

        except Exception:

            ru = 'RUDE-' + str(est.id).zfill(6)

        estudiantes_data.append({'estudiante_id': est.id, 'nombre': est.usuario.nombre_completo, 'email': est.usuario.email, 'ru': ru, 'tareas_entregadas': entregas_count, 'tareas_pendientes': total_t - entregas_count, 'total_tareas': total_t, 'porcentaje_cumplimiento': cumplimiento, 'promedio': promedio, 'estado_academico': estado_ac, 'en_riesgo': cumplimiento < 50 or (promedio is not None and promedio < 51), 'calificaciones': calificaciones_por_tarea})

    return sorted(estudiantes_data, key=lambda x: x['nombre'])


# ==============================================================================
# GESTOR DE AVANCE DE TEMAS — ENDPOINTS
# ==============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_temas_avance(request, materia_id):
    """
    GET  /api/v2/materias/<materia_id>/temas/   -> list topics for a materia
    POST /api/v2/materias/<materia_id>/temas/   -> create a new topic
    """
    try:
        docente = request.user.perfil_docente
    except Exception:
        return Response({'error': 'Solo los docentes pueden acceder.'}, status=403)

    materia = get_object_or_404(Materia, id=materia_id, docente=docente)

    if request.method == 'GET':
        temas = TemaAvance.objects.filter(materia=materia, docente=docente)
        from .models import PracticaTema
        practicas_map = {p.tema_id: p for p in PracticaTema.objects.filter(tema__in=temas)}

        data = [
            {
                'id': t.id,
                'titulo': t.titulo,
                'descripcion': t.descripcion,
                'unidad': t.unidad,
                'orden': t.orden,
                'estado': t.estado,
                'fecha_inicio': t.fecha_inicio.isoformat() if t.fecha_inicio else None,
                'fecha_fin': t.fecha_fin.isoformat() if t.fecha_fin else None,
                'observaciones': t.observaciones,
                'fecha_creacion': t.fecha_creacion.isoformat(),
                'tiene_practica': t.id in practicas_map,
                'practica_id': practicas_map[t.id].id if t.id in practicas_map else None,
                'practica_total_preguntas': len(practicas_map[t.id].preguntas) if t.id in practicas_map else 0,
            }
            for t in temas
        ]
        total = len(data)
        completados = sum(1 for t in data if t['estado'] == 'COMPLETADO')
        en_progreso = sum(1 for t in data if t['estado'] == 'EN_PROGRESO')
        pendientes = sum(1 for t in data if t['estado'] == 'PENDIENTE')
        porcentaje = round(completados / total * 100) if total > 0 else 0
        return Response({
            'temas': data,
            'stats': {
                'total': total,
                'completados': completados,
                'en_progreso': en_progreso,
                'pendientes': pendientes,
                'porcentaje_avance': porcentaje,
            }
        })

    titulo = request.data.get('titulo', '').strip()
    if not titulo:
        return Response({'error': 'El titulo del tema es obligatorio.'}, status=400)
    if TemaAvance.objects.filter(materia=materia, docente=docente, titulo__iexact=titulo).exists():
        return Response({'error': 'Ya existe un tema con ese titulo en esta materia.'}, status=400)
    t = TemaAvance.objects.create(
        materia=materia,
        docente=docente,
        titulo=titulo,
        descripcion=request.data.get('descripcion', ''),
        unidad=request.data.get('unidad', ''),
        orden=request.data.get('orden', 0),
        estado=request.data.get('estado', 'PENDIENTE'),
        fecha_inicio=request.data.get('fecha_inicio') or None,
        fecha_fin=request.data.get('fecha_fin') or None,
        observaciones=request.data.get('observaciones', ''),
    )
    return Response({
        'id': t.id, 'titulo': t.titulo, 'estado': t.estado, 'unidad': t.unidad,
        'orden': t.orden, 'descripcion': t.descripcion,
        'fecha_inicio': t.fecha_inicio.isoformat() if t.fecha_inicio else None,
        'fecha_fin': t.fecha_fin.isoformat() if t.fecha_fin else None,
        'observaciones': t.observaciones,
        'fecha_creacion': t.fecha_creacion.isoformat(),
    }, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_tema_avance_detail(request, materia_id, tema_id):
    """
    PATCH  /api/v2/materias/<materia_id>/temas/<tema_id>/  -> update / toggle state
    DELETE /api/v2/materias/<materia_id>/temas/<tema_id>/  -> delete
    """
    try:
        docente = request.user.perfil_docente
    except Exception:
        return Response({'error': 'Solo los docentes pueden acceder.'}, status=403)

    tema = get_object_or_404(TemaAvance, id=tema_id, materia_id=materia_id, docente=docente)

    if request.method == 'DELETE':
        tema.delete()
        return Response({'ok': True})

    for field in ['titulo', 'descripcion', 'unidad', 'orden', 'estado', 'fecha_inicio', 'fecha_fin', 'observaciones']:
        if field in request.data:
            val = request.data[field]
            if field in ('fecha_inicio', 'fecha_fin') and val == '':
                val = None
            setattr(tema, field, val)
    tema.save()

    # Si el tema fue marcado como COMPLETADO, generar automáticamente simulador de examen con IA si aún no existe
    practica_id = None
    if tema.estado == 'COMPLETADO':
        from .models import PracticaTema
        from .ai_practice_service import generate_exam_practice
        practica = PracticaTema.objects.filter(tema=tema).first()
        if not practica:
            try:
                ai_data = generate_exam_practice(
                    materia_nombre=tema.materia.nombre,
                    tema_titulo=tema.titulo,
                    tema_descripcion=tema.descripcion,
                    nivel_educativo=getattr(tema.materia.curso, 'nombre', ''),
                    cantidad=5,
                    dificultad='INTERMEDIO'
                )
                practica = PracticaTema.objects.create(
                    tema=tema,
                    materia=tema.materia,
                    docente=docente,
                    titulo=ai_data.get('titulo', f"Simulador de Examen: {tema.titulo}"),
                    descripcion=ai_data.get('descripcion', ''),
                    preguntas=ai_data.get('preguntas', []),
                    dificultad='INTERMEDIO',
                    tiempo_limite_minutos=ai_data.get('tiempo_limite_minutos', 15),
                    motor_ia=ai_data.get('motor_ia', 'EduSmart AI'),
                    activo=True
                )
            except Exception as e:
                print(f"[Auto Practice] Error: {e}")
        if practica:
            practica_id = practica.id

    return Response({
        'id': tema.id, 'titulo': tema.titulo, 'descripcion': tema.descripcion,
        'unidad': tema.unidad, 'orden': tema.orden, 'estado': tema.estado,
        'fecha_inicio': tema.fecha_inicio.isoformat() if tema.fecha_inicio else None,
        'fecha_fin': tema.fecha_fin.isoformat() if tema.fecha_fin else None,
        'observaciones': tema.observaciones,
        'practica_id': practica_id,
        'tiene_simulador_examen': practica_id is not None
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_materias_con_temas(request):
    """
    GET /api/v2/docente/materias-con-temas/
    Returns all materias the docente teaches organised by Colegio -> Curso,
    each with their topic progress stats.
    """
    try:
        docente = request.user.perfil_docente
    except Exception:
        return Response({'error': 'Solo los docentes pueden acceder.'}, status=403)

    materias = Materia.objects.filter(docente=docente, activa=True).select_related(
        'curso', 'curso__colegio'
    )

    result = {}
    for m in materias:
        colegio = m.curso.colegio
        ck = colegio.id
        if ck not in result:
            result[ck] = {'colegio_id': colegio.id, 'colegio_nombre': colegio.nombre, 'cursos': {}}
        curso = m.curso
        crk = curso.id
        if crk not in result[ck]['cursos']:
            result[ck]['cursos'][crk] = {
                'curso_id': curso.id,
                'curso_nombre': f"{curso.grado} \"{curso.paralelo}\"",
                'materias': []
            }
        temas = TemaAvance.objects.filter(materia=m, docente=docente)
        total = temas.count()
        completados = temas.filter(estado='COMPLETADO').count()
        en_progreso = temas.filter(estado='EN_PROGRESO').count()
        pendientes = temas.filter(estado='PENDIENTE').count()
        porcentaje = round(completados / total * 100) if total > 0 else 0
        result[ck]['cursos'][crk]['materias'].append({
            'materia_id': m.id,
            'materia_nombre': m.nombre,
            'color': m.color,
            'stats': {
                'total': total, 'completados': completados,
                'en_progreso': en_progreso, 'pendientes': pendientes,
                'porcentaje_avance': porcentaje,
            }
        })

    output = []
    for cd in result.values():
        output.append({
            'colegio_id': cd['colegio_id'],
            'colegio_nombre': cd['colegio_nombre'],
            'cursos': list(cd['cursos'].values()),
        })
    return Response(output)


@api_view(['GET'])
def api_descargar_boletin_curso(request, curso_id):
    """
    Genera y descarga el cuadro de calificaciones oficial de un curso en PDF.
    Acceso restringido a docentes de la institución y administradores.
    """
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.rol not in ['DOCENTE', 'ADMIN']:
        return Response({'error': 'Solo docentes y directores tienen permiso para descargar el boletín general del curso.'}, status=status.HTTP_403_FORBIDDEN)

    curso = get_object_or_404(Curso, id=curso_id)
    pdf_buffer = generate_course_gradebook_pdf(curso)
    safe_name = f"cuadro_calificaciones_{curso.grado}_{curso.seccion}_{timezone.now().strftime('%Y%m%d')}.pdf".replace(' ', '_')
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{safe_name}"'
    return response
