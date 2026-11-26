import random
import string
import pandas as pd
from urllib.parse import quote

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
    TemaAvance, MuroPublicacion, MuroComentario
)
from . import whatsapp_service
from . import analisis_numerico
from . import analisis_numerico_service

from .serializers_v2 import (

    ColegioSerializer, DocenteColegioSerializer, CursoSerializer,

    MateriaSerializer, EstudianteCursoSerializer
)


def obtener_docente_seguro(user):
    """Obtiene o crea de forma segura el perfil docente si el usuario tiene rol DOCENTE"""
    if not user or not user.is_authenticated:
        return None
    if getattr(user, 'rol', None) != 'DOCENTE':
        return None
    docente = getattr(user, 'perfil_docente', None)
    if not docente:
        docente, _ = Docente.objects.get_or_create(
            usuario=user,
            defaults={
                'especialidad': 'Docencia e Investigación',
                'titulo_academico': 'Profesor Titular'
            }
        )
    return docente


# ==============================================================================
# COLEGIOS
# ==============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_colegios(request):
    docente = obtener_docente_seguro(request.user)
    if not docente:
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        colegios = Colegio.objects.filter(docentes__docente=docente).distinct()
        if not colegios.exists():
            colegios = Colegio.objects.all().distinct()
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
    docente = obtener_docente_seguro(request.user)
    if not docente:
        return Response({'error': 'Solo docentes'}, status=status.HTTP_403_FORBIDDEN)

    colegio = get_object_or_404(Colegio, id=colegio_id)
    if request.method == 'GET':
        cursos = Curso.objects.filter(colegio=colegio)
        return Response(CursoSerializer(cursos, many=True).data)
    elif request.method == 'POST':
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
    docente = obtener_docente_seguro(request.user)
    if not docente:
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
    docente = obtener_docente_seguro(request.user)
    if not docente:
        return Response({'error': 'Solo docentes'}, status=403)

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
    colegios = Colegio.objects.filter(docentes__docente=docente).distinct()
    if not colegios.exists():
        colegios = Colegio.objects.all().distinct()

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
                materias = Materia.objects.filter(curso=curso)

            if not materias.exists():
                espacios = Espacio.objects.filter(curso=curso)
                for espacio in espacios:
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
                    espacio = Espacio.objects.filter(materia=materia).first()
                    if not espacio:
                        espacio = Espacio.objects.filter(curso=curso).first()
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
    miembros = list(MiembroEspacio.objects.filter(espacio=espacio).select_related('estudiante__usuario'))
    estudiantes = [m.estudiante for m in miembros]
    if espacio.curso:
        curso_ests = Estudiante.objects.filter(cursos_inscritos__curso=espacio.curso).select_related('usuario')
        for ce in curso_ests:
            if ce.id not in [e.id for e in estudiantes]:
                estudiantes.append(ce)
    if not estudiantes:
        estudiantes = list(Estudiante.objects.all().select_related('usuario'))

    all_entregas = {}
    for e in Entrega.objects.filter(tarea__espacio=espacio).select_related('calificacion'):
        all_entregas[(e.estudiante_id, e.tarea_id)] = e

    for est in estudiantes:
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

        # ── Algoritmo Silencioso de Detección de Deserción y Riesgo ──
        # Factor 1: Inactividad en la plataforma (>= 5 días)
        now_dt = timezone.now()
        if est.usuario.last_login:
            dias_inactivo = (now_dt - est.usuario.last_login).days
        else:
            dias_inactivo = (now_dt - est.usuario.date_joined).days

        # Factor 2: Tareas consecutivas sin entregar (últimas 2 tareas vencidas)
        tareas_vencidas_ordenadas = sorted(
            [t for t in tareas if t.fecha_limite and t.fecha_limite < now_dt],
            key=lambda t: t.fecha_limite,
            reverse=True
        )[:3]
        pendientes_seguidas = 0
        for tv in tareas_vencidas_ordenadas:
            ent = all_entregas.get((est.id, tv.id))
            if not ent or ent.estado in ['VENCIDA', 'NO_ENTREGADO']:
                pendientes_seguidas += 1
            else:
                break

        # Factor 3: Promedio reprobatorio (< 51)
        promedio_bajo = promedio is not None and promedio < 51

        factores_riesgo = []
        if dias_inactivo is not None and dias_inactivo >= 5:
            factores_riesgo.append(f"Inactivo en plataforma ({dias_inactivo} días)")
        if pendientes_seguidas >= 2:
            factores_riesgo.append(f"{pendientes_seguidas} tareas consecutivas sin entregar")
        if promedio_bajo:
            factores_riesgo.append(f"Promedio reprobatorio ({promedio}/100 pts)")
        elif cumplimiento < 50 and total_t >= 2:
            factores_riesgo.append(f"Bajo cumplimiento de actividades ({cumplimiento}%)")

        if len(factores_riesgo) >= 2 or (promedio is not None and promedio < 40):
            nivel_riesgo = 'ALTO'       # 🔴 Semáforo Rojo
        elif len(factores_riesgo) == 1:
            nivel_riesgo = 'MEDIO'      # 🟠 Semáforo Naranja
        else:
            nivel_riesgo = 'BAJO'       # 🟢 Semáforo Verde

        en_riesgo = len(factores_riesgo) > 0

        # Plantilla prearmada para WhatsApp a Padre de Familia / Tutor (con tono de Citación Formal del Docente)
        materia_label = espacio.nombre or (espacio.materia.nombre if espacio.materia else 'Materia')
        docente_nombre = (
            espacio.docente.usuario.nombre_completo
            if (espacio.docente and hasattr(espacio.docente, 'usuario') and espacio.docente.usuario.nombre_completo)
            else (request.user.nombre_completo if hasattr(request.user, 'nombre_completo') and request.user.nombre_completo else 'Profesor(a)')
        )
        tutor_nombre = getattr(est, 'nombre_tutor', '') or 'Padre / Madre de Familia / Tutor'
        relacion_tutor = getattr(est, 'relacion_tutor', 'TUTOR')
        tratamiento = 'Sra.' if relacion_tutor == 'MADRE' else ('Sr.' if relacion_tutor == 'PADRE' else 'Estimado/a')

        telefono_destino = (getattr(est, 'telefono_tutor', None) or est.usuario.telefono or '').strip()
        motivos_str = "\n".join([f"   • {f}" for f in factores_riesgo]) if factores_riesgo else "   • Ninguna observación de riesgo"

        if en_riesgo:
            whatsapp_msg = (
                f"📋 *CITACIÓN ACADÉMICA — EduSmart*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"{tratamiento} *{tutor_nombre}*:\n\n"
                f"Le saluda cordialmente el/la profesor(a) *{docente_nombre}*, docente de la materia *{materia_label}*.\n\n"
                f"Me dirijo a usted como responsable del/la estudiante *{est.usuario.nombre_completo}* para hacerle llegar formalmente una *CITACIÓN URGENTE* por motivos académicos:\n\n"
                f"*📌 Observaciones detectadas:*\n"
                f"{motivos_str}\n\n"
                f"*📊 Resumen del Estudiante:*\n"
                f"• Tareas entregadas: {entregas_count} de {total_t}\n"
                f"• Tareas pendientes / sin entregar: {total_t - entregas_count}\n"
                f"• Promedio acumulado: {promedio if promedio is not None else 'Sin notas'} / 100 pts\n"
                f"• Nivel de alerta: {'🔴 RIESGO ALTO (Reprobación inminente)' if nivel_riesgo == 'ALTO' else '🟠 RIESGO MEDIO'}\n\n"
                f"⚠️ *Solicitud del Docente:*\n"
                f"Le solicito amablemente comunicarse conmigo o acercarse a la institución a la brevedad posible para coordinar un plan de regularización, entrega de tareas y nivelación antes del cierre de calificaciones.\n\n"
                f"Atentamente,\n"
                f"*{docente_nombre}*\n"
                f"_Docente de {materia_label} — Plataforma EduSmart_"
            )
        else:
            whatsapp_msg = (
                f"📊 *REPORTE ACADÉMICO — EduSmart*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"{tratamiento} *{tutor_nombre}*:\n\n"
                f"Le saluda el/la profesor(a) *{docente_nombre}*, docente de la materia *{materia_label}*.\n\n"
                f"Le comparto el informe de seguimiento de su hijo/a *{est.usuario.nombre_completo}*:\n"
                f"• Tareas entregadas: {entregas_count} de {total_t}\n"
                f"• Promedio actual: {promedio if promedio is not None else 'Sin notas'} / 100 pts\n"
                f"• Cumplimiento: {cumplimiento}%\n"
                f"• Desempeño: {estado_ac}\n\n"
                f"Agradezco su constante apoyo y acompañamiento en su proceso formativo.\n\n"
                f"Atentamente,\n"
                f"*{docente_nombre}*\n"
                f"_Docente de {materia_label} — Plataforma EduSmart_"
            )

        clean_phone = ''.join(filter(str.isdigit, telefono_destino))
        if clean_phone.startswith('0'):
            clean_phone = clean_phone[1:]
        if len(clean_phone) == 8 and not clean_phone.startswith('591'):
            clean_phone = '591' + clean_phone
        whatsapp_url = f"https://wa.me/{clean_phone}?text={quote(whatsapp_msg)}" if clean_phone else f"https://wa.me/?text={quote(whatsapp_msg)}"

        estudiantes_data.append({
            'estudiante_id': est.id,
            'nombre': est.usuario.nombre_completo,
            'email': est.usuario.email,
            'ru': ru,
            'telefono': est.usuario.telefono or '',
            'telefono_tutor': getattr(est, 'telefono_tutor', '') or '',
            'nombre_tutor': getattr(est, 'nombre_tutor', '') or '',
            'relacion_tutor': getattr(est, 'relacion_tutor', '') or 'PADRE',
            'tareas_entregadas': entregas_count,
            'tareas_pendientes': total_t - entregas_count,
            'total_tareas': total_t,
            'porcentaje_cumplimiento': cumplimiento,
            'promedio': promedio,
            'estado_academico': estado_ac,
            'en_riesgo': en_riesgo,
            'nivel_riesgo': nivel_riesgo,
            'dias_inactivo': dias_inactivo,
            'tareas_sin_entregar_seguidas': pendientes_seguidas,
            'factores_riesgo': factores_riesgo,
            'whatsapp_url': whatsapp_url,
            'whatsapp_mensaje': whatsapp_msg,
            'calificaciones': calificaciones_por_tarea
        })

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
            try:
                from .models import EstudianteCurso, Notificacion
                if tema.materia.curso:
                    uids = EstudianteCurso.objects.filter(curso=tema.materia.curso).values_list('estudiante__usuario_id', flat=True)
                    for uid in uids:
                        Notificacion.objects.create(
                            usuario_id=uid,
                            mensaje=f"✨ Tu profesor completó '{tema.titulo}' en {tema.materia.nombre}. Se ha publicado el Simulador con IA para preparar tu examen.",
                            tipo='AVISO_NUEVO',
                            leida=False
                        )
            except Exception:
                pass

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

    if user.rol != 'DOCENTE':
        return Response({'error': 'Solo docentes tienen permiso para descargar el boletín general del curso.'}, status=status.HTTP_403_FORBIDDEN)

    curso = get_object_or_404(Curso, id=curso_id)
    pdf_buffer = generate_course_gradebook_pdf(curso)
    paralelo = getattr(curso, 'paralelo', '') or getattr(curso, 'seccion', '')
    safe_name = f"cuadro_calificaciones_{curso.grado}_{paralelo}_{timezone.now().strftime('%Y%m%d')}.pdf".replace(' ', '_')
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{safe_name}"'
    return response


# ==============================================================================
# MURO DE AVISOS Y CONSULTAS POR MATERIA (Muro & Q&A)
# ==============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_muro_list_create(request, espacio_id):
    """
    GET  /api/v2/espacios/<espacio_id>/muro/ -> Lista publicaciones con comentarios
    POST /api/v2/espacios/<espacio_id>/muro/ -> Crea publicación (Aviso o Consulta)
    """
    espacio = get_object_or_404(Espacio, id=espacio_id)
    es_docente = hasattr(request.user, 'perfil_docente') and espacio.docente.usuario_id == request.user.id

    if not es_docente:
        if not hasattr(request.user, 'perfil_estudiante'):
            return Response({'error': 'No autorizado.'}, status=403)
        est = request.user.perfil_estudiante
        if not MiembroEspacio.objects.filter(espacio=espacio, estudiante=est).exists():
            if not (espacio.curso and EstudianteCurso.objects.filter(curso=espacio.curso, estudiante=est, estado='ACTIVO').exists()):
                return Response({'error': 'No eres miembro de esta materia.'}, status=403)

    if request.method == 'GET':
        pubs = MuroPublicacion.objects.filter(espacio=espacio).select_related('autor').prefetch_related('comentarios__autor')
        tipo_filter = request.query_params.get('tipo')
        if tipo_filter:
            pubs = pubs.filter(tipo=tipo_filter)

        data = []
        for p in pubs:
            comentarios_data = []
            for c in p.comentarios.all():
                comentarios_data.append({
                    'id': c.id,
                    'autor_id': c.autor.id,
                    'autor_nombre': c.autor.nombre_completo,
                    'autor_rol': c.autor.rol,
                    'autor_avatar': c.autor.avatar_url,
                    'contenido': c.contenido,
                    'es_docente': c.es_docente,
                    'es_solucion': c.es_solucion,
                    'fecha_creacion': c.fecha_creacion.isoformat(),
                })

            data.append({
                'id': p.id,
                'espacio_id': p.espacio_id,
                'autor_id': p.autor.id,
                'autor_nombre': p.autor.nombre_completo,
                'autor_rol': p.autor.rol,
                'autor_avatar': p.autor.avatar_url,
                'tipo': p.tipo,
                'titulo': p.titulo,
                'contenido': p.contenido,
                'fijado': p.fijado,
                'resuelto': p.resuelto,
                'total_comentarios': len(comentarios_data),
                'comentarios': comentarios_data,
                'fecha_creacion': p.fecha_creacion.isoformat(),
                'puede_editar': es_docente or p.autor_id == request.user.id,
            })

        return Response({
            'publicaciones': data,
            'horario_atencion': {
                'inicio': '08:00',
                'fin': '18:00',
                'dias': 'Lunes a Viernes',
                'mensaje': 'Horario de consultas del docente: 08:00 a 18:00 (Lunes a Viernes). Consultas fuera de este rango se atenderán al iniciar la siguiente jornada escolar.'
            }
        })

    elif request.method == 'POST':
        tipo = request.data.get('tipo', 'CONSULTA')
        if tipo == 'AVISO' and not es_docente:
            tipo = 'CONSULTA'

        titulo = request.data.get('titulo', '').strip()
        contenido = request.data.get('contenido', '').strip()
        fijado = bool(request.data.get('fijado', False)) if es_docente else False

        if not titulo or not contenido:
            return Response({'error': 'El título y el contenido son obligatorios.'}, status=400)

        pub = MuroPublicacion.objects.create(
            espacio=espacio,
            autor=request.user,
            tipo=tipo,
            titulo=titulo,
            contenido=contenido,
            fijado=fijado
        )

        # Notificar a los estudiantes si es un aviso oficial
        if tipo == 'AVISO':
            miembros_usuarios = Usuario.objects.filter(perfil_estudiante__espacios_inscritos__espacio=espacio)
            for u in miembros_usuarios:
                if u.id != request.user.id:
                    Notificacion.objects.create(
                        usuario=u,
                        tipo='AVISO_NUEVO',
                        mensaje=f"Nuevo aviso en {espacio.nombre}: {titulo}",
                        espacio_id=espacio.id
                    )

        return Response({
            'id': pub.id,
            'mensaje': 'Publicación creada exitosamente.',
            'titulo': pub.titulo,
            'tipo': pub.tipo,
        }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_muro_comentar(request, publicacion_id):
    pub = get_object_or_404(MuroPublicacion, id=publicacion_id)
    contenido = request.data.get('contenido', '').strip()
    if not contenido:
        return Response({'error': 'El comentario no puede estar vacío.'}, status=400)

    es_docente = hasattr(request.user, 'perfil_docente') and pub.espacio.docente.usuario_id == request.user.id

    comentario = MuroComentario.objects.create(
        publicacion=pub,
        autor=request.user,
        contenido=contenido,
        es_docente=es_docente,
        es_solucion=bool(request.data.get('es_solucion', False)) and es_docente
    )

    if es_docente and pub.autor_id != request.user.id:
        Notificacion.objects.create(
            usuario=pub.autor,
            tipo='AVISO_NUEVO',
            mensaje=f"El profesor respondió a tu consulta: '{pub.titulo}'",
            espacio_id=pub.espacio_id
        )

    return Response({
        'id': comentario.id,
        'autor_nombre': comentario.autor.nombre_completo,
        'autor_rol': comentario.autor.rol,
        'contenido': comentario.contenido,
        'es_docente': comentario.es_docente,
        'es_solucion': comentario.es_solucion,
        'fecha_creacion': comentario.fecha_creacion.isoformat(),
    }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_muro_toggle_fijar(request, publicacion_id):
    pub = get_object_or_404(MuroPublicacion, id=publicacion_id)
    es_docente = hasattr(request.user, 'perfil_docente') and pub.espacio.docente.usuario_id == request.user.id
    if not es_docente:
        return Response({'error': 'Solo el docente puede fijar publicaciones.'}, status=403)
    pub.fijado = not pub.fijado
    pub.save(update_fields=['fijado'])
    return Response({'fijado': pub.fijado})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_muro_toggle_resolver(request, publicacion_id):
    pub = get_object_or_404(MuroPublicacion, id=publicacion_id)
    es_docente = hasattr(request.user, 'perfil_docente') and pub.espacio.docente.usuario_id == request.user.id
    if not es_docente and pub.autor_id != request.user.id:
        return Response({'error': 'No autorizado.'}, status=403)
    pub.resuelto = not pub.resuelto
    pub.save(update_fields=['resuelto'])
    return Response({'resuelto': pub.resuelto})


# ==============================================================================
# AUTOMATIZACIONES: RECORDATORIOS ESCALONADOS Y REPORTE SEMANAL
# ==============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ejecutar_recordatorios_tareas(request):
    """
    Escanea tareas activas y genera recordatorios escalonados preventivos:
    - T-24h: Tareas que vencen en menos de 24 horas.
    - T-2h: Alertas urgentes de última hora que vencen en menos de 2 horas.
    """
    now = timezone.now()
    limite_24h = now + timezone.timedelta(hours=24)
    limite_2h = now + timezone.timedelta(hours=2)

    tareas_24h = Tarea.objects.filter(estado='PUBLICADA', fecha_limite__gt=now, fecha_limite__lte=limite_24h)

    enviados_24h = 0
    enviados_2h = 0

    for tarea in tareas_24h:
        estudiantes_ids = tarea.espacio.miembros.values_list('estudiante_id', flat=True)
        entregados_ids = Entrega.objects.filter(tarea=tarea, estudiante_id__in=estudiantes_ids).values_list('estudiante_id', flat=True)
        pendientes_est = Estudiante.objects.filter(id__in=estudiantes_ids).exclude(id__in=entregados_ids).select_related('usuario')

        is_urgente = tarea.fecha_limite <= limite_2h
        horas_restantes = max(1, int((tarea.fecha_limite - now).total_seconds() // 3600))

        for est in pendientes_est:
            hace_6h = now - timezone.timedelta(hours=6)
            ya_notificado = Notificacion.objects.filter(
                usuario=est.usuario,
                tarea_id=tarea.id,
                tipo='PROXIMA_VENCER',
                fecha__gte=hace_6h
            ).exists()

            if not ya_notificado:
                if is_urgente:
                    msg = f"⏰ ¡ÚLTIMA HORA! Te quedan menos de 2 horas para entregar '{tarea.titulo}' en {tarea.espacio.nombre}."
                    enviados_2h += 1
                else:
                    msg = f"📌 Recordatorio: Te quedan {horas_restantes} horas para entregar '{tarea.titulo}' en {tarea.espacio.nombre}."
                    enviados_24h += 1

                Notificacion.objects.create(
                    usuario=est.usuario,
                    tipo='PROXIMA_VENCER',
                    mensaje=msg,
                    espacio_id=tarea.espacio_id,
                    tarea_id=tarea.id
                )

    return Response({
        'status': 'OK',
        'tareas_analizadas': tareas_24h.count(),
        'recordatorios_24h_generados': enviados_24h,
        'recordatorios_urgentes_2h_generados': enviados_2h,
        'fecha_ejecucion': now.isoformat()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_curso_reporte_semanal(request, curso_id):
    """
    Genera el consolidado semanal para un curso (últimos 7 días):
    - Tareas entregadas y pendientes en la semana
    - Calificaciones emitidas
    - Estudiantes con alertas preventivas
    - Texto listo para envío por WhatsApp / Correo
    """
    curso = get_object_or_404(Curso, id=curso_id)
    now = timezone.now()
    hace_7dias = now - timezone.timedelta(days=7)

    espacios = Espacio.objects.filter(curso=curso)
    espacios_ids = list(espacios.values_list('id', flat=True))

    tareas_semana = Tarea.objects.filter(espacio_id__in=espacios_ids, fecha_publicacion__gte=hace_7dias)
    entregas_semana = Entrega.objects.filter(tarea__espacio_id__in=espacios_ids, fecha_entrega__gte=hace_7dias)

    estudiantes = Estudiante.objects.filter(cursos_inscritos__curso=curso, cursos_inscritos__estado='ACTIVO').select_related('usuario')
    total_alumnos = estudiantes.count()

    alumnos_atencion = []
    for est in estudiantes:
        entregadas = entregas_semana.filter(estudiante=est).count()
        califs = Calificacion.objects.filter(entrega__estudiante=est, fecha_calificacion__gte=hace_7dias)
        avg = califs.aggregate(Avg('nota'))['nota__avg']
        if (tareas_semana.count() > 0 and entregadas == 0) or (avg is not None and avg < 51):
            alumnos_atencion.append({
                'nombre': est.usuario.nombre_completo,
                'entregadas': entregadas,
                'promedio_semana': round(avg, 1) if avg else None,
                'telefono': est.usuario.telefono or ''
            })

    colegio_nombre = curso.colegio.nombre if curso.colegio else 'EduSmart Bolivia'
    resumen_texto = (
        f"📊 *REPORTE SEMANAL DE ACTIVIDADES — {curso.grado} \"{curso.paralelo}\"*\n"
        f"Colegio: {colegio_nombre}\n"
        f"Semana: {hace_7dias.strftime('%d/%m')} al {now.strftime('%d/%m/%Y')}\n\n"
        f"• Total Estudiantes: {total_alumnos}\n"
        f"• Tareas Asignadas esta semana: {tareas_semana.count()}\n"
        f"• Entregas registradas: {entregas_semana.count()}\n"
        f"• Estudiantes en alerta preventiva: {len(alumnos_atencion)}\n\n"
        f"Acceda a EduSmart para revisar calificaciones y retroalimentaciones detalladas."
    )

    return Response({
        'curso': {
            'id': curso.id,
            'nombre': curso.nombre_completo,
            'colegio': colegio_nombre
        },
        'periodo': {
            'inicio': hace_7dias.date().isoformat(),
            'fin': now.date().isoformat(),
        },
        'estadisticas': {
            'total_estudiantes': total_alumnos,
            'tareas_semana': tareas_semana.count(),
            'entregas_semana': entregas_semana.count(),
            'estudiantes_atencion_count': len(alumnos_atencion),
        },
        'estudiantes_atencion': alumnos_atencion,
        'resumen_texto': resumen_texto,
        'whatsapp_url': f"https://wa.me/?text={quote(resumen_texto)}"
    })


# ==============================================================================
# ALERTAS AUTOMÁTICAS: BAJO RENDIMIENTO Y TAREAS VENCIDAS
# ==============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_enviar_alertas_rendimiento(request):
    """
    POST /api/v2/alertas/enviar-rendimiento/
    Body (opcional): { "espacio_id": int, "curso_id": int, "umbral_promedio": int }

    Detecta estudiantes con:
      - Promedio < umbral_promedio (default 51)
      - O tarea vencida sin entregar

    Envía WhatsApp al estudiante Y a su tutor (si tienen número registrado).
    Registra Notificacion interna independientemente del canal.
    """
    umbral = int(request.data.get('umbral_promedio', 51))
    espacio_id = request.data.get('espacio_id')
    curso_id = request.data.get('curso_id')
    now = timezone.now()

    # Obtener docente que ejecuta la acción (para firmar los mensajes)
    docente_obj = None
    materia_nombre = 'EduSmart'
    try:
        docente_obj = request.user.perfil_docente
    except Exception:
        pass

    # Construir queryset base de estudiantes
    if espacio_id:
        espacio = get_object_or_404(Espacio, id=espacio_id)
        materia_nombre = espacio.nombre
        estudiantes_ids = espacio.miembros.values_list('estudiante_id', flat=True)
        estudiantes_qs = Estudiante.objects.filter(id__in=estudiantes_ids)
    elif curso_id:
        curso = get_object_or_404(Curso, id=curso_id)
        materia_nombre = curso.nombre_completo if hasattr(curso, 'nombre_completo') else str(curso)
        estudiantes_ids = curso.estudiantes.filter(estado='ACTIVO').values_list('estudiante_id', flat=True)
        estudiantes_qs = Estudiante.objects.filter(id__in=estudiantes_ids)
    else:
        if not docente_obj:
            return Response({'error': 'Solo docentes pueden enviar alertas masivas'}, status=403)
        colegios_ids = DocenteColegio.objects.filter(docente=docente_obj).values_list('colegio_id', flat=True)
        cursos_ids = Curso.objects.filter(colegio_id__in=colegios_ids).values_list('id', flat=True)
        estudiantes_ids = EstudianteCurso.objects.filter(
            curso_id__in=cursos_ids, estado='ACTIVO'
        ).values_list('estudiante_id', flat=True)
        estudiantes_qs = Estudiante.objects.filter(id__in=estudiantes_ids)

    estudiantes_qs = estudiantes_qs.select_related('usuario', 'progreso')
    resultados = []

    for est in estudiantes_qs:
        motivos = []

        # Verificar promedio
        try:
            progreso = est.progreso
            if 0 < progreso.promedio < umbral:
                motivos.append(f'Promedio académico: {progreso.promedio:.1f}/100 (límite: {umbral})')
        except Exception:
            pass

        # Verificar tareas vencidas sin entregar
        try:
            espacios_ids_est = list(est.espacios_inscritos.values_list('espacio_id', flat=True))
            tareas_vencidas = Tarea.objects.filter(
                espacio_id__in=espacios_ids_est,
                estado='PUBLICADA',
                fecha_limite__lt=now
            ).exclude(entregas__estudiante=est)
            for tarea in tareas_vencidas[:3]:
                motivos.append(
                    f'Tarea vencida: *{tarea.titulo}* '
                    f'(venció {tarea.fecha_limite.strftime("%d/%m/%Y")})'
                )
        except Exception:
            pass

        if not motivos:
            continue

        # Enviar alertas con firma del docente
        resultado_ws = whatsapp_service.enviar_alerta_rendimiento(
            est, motivos, docente=docente_obj, materia=materia_nombre
        )

        # Notificacion interna
        Notificacion.objects.create(
            usuario=est.usuario,
            tipo='ALERTA',
            mensaje=f'⚠️ Alerta académica: {"; ".join(motivos[:2])}'
        )

        nombre_completo = est.usuario.get_full_name() or est.usuario.username
        resultados.append({
            'estudiante': nombre_completo,
            'motivos': motivos,
            'whatsapp_estudiante': resultado_ws.get('estudiante', {}),
            'whatsapp_tutor': resultado_ws.get('tutor', {}),
        })

    return Response({
        'alertas_enviadas': len(resultados),
        'umbral_promedio': umbral,
        'detalle': resultados
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_alertar_tarea_vencida(request, tarea_id):
    """
    POST /api/v2/alertas/tarea-vencida/<tarea_id>/

    Envía alerta específica a todos los estudiantes que NO entregaron
    una tarea particular (ya vencida).
    """
    tarea = get_object_or_404(Tarea, id=tarea_id)
    espacio = tarea.espacio

    # Obtener docente que ejecuta la acción
    docente_obj = None
    try:
        docente_obj = request.user.perfil_docente
    except Exception:
        pass

    estudiantes_ids = espacio.miembros.values_list('estudiante_id', flat=True)
    estudiantes_sin_entrega = Estudiante.objects.filter(
        id__in=estudiantes_ids
    ).exclude(
        entregas__tarea=tarea
    ).select_related('usuario')

    resultados = []
    for est in estudiantes_sin_entrega:
        resultado_ws = whatsapp_service.enviar_alerta_tarea_vencida(
            est, tarea, docente=docente_obj
        )

        Notificacion.objects.create(
            usuario=est.usuario,
            tipo='ALERTA',
            mensaje=f'⚠️ Tienes una tarea vencida sin entregar: {tarea.titulo}',
            tarea_id=tarea.id,
            espacio_id=espacio.id
        )

        nombre_completo = est.usuario.get_full_name() or est.usuario.username
        resultados.append({
            'estudiante': nombre_completo,
            'whatsapp_estudiante': resultado_ws.get('estudiante', {}),
            'whatsapp_tutor': resultado_ws.get('tutor', {}),
        })

    return Response({
        'tarea': tarea.titulo,
        'alertas_enviadas': len(resultados),
        'detalle': resultados
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def api_actualizar_contacto_tutor(request, estudiante_id):
    """
    GET  /api/v2/alertas/estudiante/<id>/contacto/ → ver datos del tutor
    PATCH /api/v2/alertas/estudiante/<id>/contacto/ → actualizar contacto del tutor

    Permitido para: el propio estudiante o un docente.
    """
    est = get_object_or_404(Estudiante, id=estudiante_id)

    es_propio = (request.user == est.usuario)
    es_docente = hasattr(request.user, 'perfil_docente')
    if not (es_propio or es_docente):
        return Response({'error': 'Sin permiso'}, status=403)

    if request.method == 'GET':
        return Response({
            'nombre_tutor': est.nombre_tutor,
            'telefono_tutor': est.telefono_tutor,
            'relacion_tutor': est.relacion_tutor,
            'telefono_estudiante': est.usuario.telefono,
        })

    # PATCH
    for campo in ['nombre_tutor', 'telefono_tutor', 'relacion_tutor']:
        if campo in request.data:
            setattr(est, campo, request.data[campo])

    if 'telefono_estudiante' in request.data and es_propio:
        est.usuario.telefono = request.data['telefono_estudiante']
        est.usuario.save(update_fields=['telefono'])

    est.save(update_fields=['nombre_tutor', 'telefono_tutor', 'relacion_tutor'])

    return Response({
        'ok': True,
        'nombre_tutor': est.nombre_tutor,
        'telefono_tutor': est.telefono_tutor,
        'relacion_tutor': est.relacion_tutor,
    })


# ==============================================================================
# LABORATORIO COMPUTACIONAL DE ANÁLISIS NUMÉRICO
# ==============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_analisis_numerico_calcular(request):
    """
    POST /api/v2/analisis-numerico/calcular/
    Permite a docentes y estudiantes resolver, comprobar y simular paso a paso
    ejercicios de Métodos Numéricos (Sección 9.8 del informe académico).
    """
    metodo = request.data.get('metodo', '').lower().strip()
    params = request.data.get('parametros', {})

    try:
        if metodo == 'biseccion':
            expr = params.get('funcion', 'x**3 - x - 2')
            a = float(params.get('a', 1.0))
            b = float(params.get('b', 2.0))
            max_iter = int(params.get('max_iter', 6))
            res = analisis_numerico_service.resolver_biseccion(expr, a, b, max_iter=max_iter)
            return Response(res)

        elif metodo == 'newton':
            expr = params.get('funcion', 'x**3 - x - 2')
            x0 = float(params.get('x0', 1.5))
            max_iter = int(params.get('max_iter', 5))
            res = analisis_numerico_service.resolver_newton_raphson(expr, x0, max_iter=max_iter)
            return Response(res)

        elif metodo == 'gauss':
            A = params.get('A', [[2, 1, 1], [1, 3, 2], [3, 1, 4]])
            b = params.get('b', [7, 13, 17])
            res = analisis_numerico_service.resolver_eliminacion_gauss(A, b)
            return Response(res)

        elif metodo == 'lagrange':
            puntos = params.get('puntos', [[0, 1], [1, 3], [2, 7]])
            x_eval = float(params.get('x_eval', 1.5)) if params.get('x_eval') is not None else None
            res = analisis_numerico_service.resolver_lagrange(puntos, x_eval=x_eval)
            return Response(res)

        elif metodo == 'integracion':
            expr = params.get('funcion', 'x**2')
            a = float(params.get('a', 0.0))
            b = float(params.get('b', 2.0))
            n = int(params.get('n', 4))
            res = analisis_numerico_service.resolver_integracion(expr, a, b, n=n)
            return Response(res)

        elif metodo == 'euler':
            expr_fxy = params.get('edo', 'x + y')
            x0 = float(params.get('x0', 0.0))
            y0 = float(params.get('y0', 1.0))
            h = float(params.get('h', 0.1))
            x_final = float(params.get('x_final', 0.3))
            expr_exacta = params.get('exacta', '2 * exp(x) - x - 1')
            res = analisis_numerico_service.resolver_euler(expr_fxy, x0, y0, h, x_final, expr_exacta=expr_exacta)
            return Response(res)

        else:
            return Response({
                'error': f'Método "{metodo}" no soportado. Métodos disponibles: biseccion, newton, gauss, lagrange, integracion, euler'
            }, status=400)

    except Exception as e:
        return Response({'error': f'Error al calcular: {str(e)}'}, status=400)


# ==============================================================================
# ANÁLISIS NUMÉRICO APLICADO: RENDIMIENTO, GAUSS Y METAS
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_estudiante_analisis_rendimiento(request, estudiante_id):
    """
    Retorna el informe analítico completo del rendimiento académico de un estudiante
    mediante Métodos de Análisis Numérico:
      - Regresión lineal (Mínimos Cuadrados) y tendencia
      - Interpolación de Lagrange
      - Extrapolación acotada
      - Índice de Rendimiento y Esfuerzo Continuo (IREC Trapecio y Simpson)
      - Modelo logístico de nivelación (Newton-Raphson)
    """
    estudiante = get_object_or_404(Estudiante, id=estudiante_id)

    # Filtrar por espacio si se especifica
    espacio_id = request.query_params.get('espacio_id')
    califs_query = Calificacion.objects.filter(entrega__estudiante=estudiante)
    if espacio_id:
        califs_query = califs_query.filter(entrega__tarea__espacio_id=espacio_id)
    califs_query = califs_query.select_related('entrega__tarea__espacio').order_by('fecha_calificacion')

    historial = []
    for idx, c in enumerate(califs_query, start=1):
        historial.append({
            'indice': idx,
            'tarea': c.entrega.tarea.titulo,
            'espacio': c.entrega.tarea.espacio.nombre,
            'nota': float(c.nota),
            'fecha': c.fecha_calificacion.strftime('%d/%m/%Y')
        })

    puntos = [(float(h['indice']), float(h['nota'])) for h in historial]
    notas = [float(h['nota']) for h in historial]

    # 1. Regresión Lineal
    regresion = analisis_numerico.calcular_regresion_lineal(puntos) if len(puntos) >= 2 else {'valido': False, 'mensaje': 'Mínimo 2 notas requeridas.'}

    # 2. Extrapolación
    extrapolacion = analisis_numerico.calcular_extrapolacion_rendimiento(notas, pasos_futuros=2) if len(notas) >= 2 else {'valido': False, 'mensaje': 'Mínimo 2 notas requeridas.'}

    # 3. IREC (Trapecio y Simpson)
    irec_trapecio = analisis_numerico.calcular_irec_trapecio(puntos) if len(puntos) >= 2 else {'valido': False, 'mensaje': 'Mínimo 2 notas requeridas.'}
    irec_simpson = None
    if len(notas) >= 3 and (len(notas) - 1) % 2 == 0:
        irec_simpson = analisis_numerico.calcular_irec_simpson(notas)

    # 4. Interpolación de Lagrange en punto intermedio
    x_eval_param = request.query_params.get('x_eval')
    if x_eval_param is not None and len(puntos) >= 2:
        try:
            x_eval = float(x_eval_param)
            lagrange = analisis_numerico.calcular_interpolacion_lagrange(puntos, x_evaluar=x_eval)
        except ValueError:
            lagrange = {'valido': False, 'mensaje': 'Parámetro x_eval inválido.'}
    elif len(puntos) >= 2:
        # Evaluar en el punto medio entre la penúltima y última evaluación
        punto_medio = (puntos[-2][0] + puntos[-1][0]) / 2.0
        lagrange = analisis_numerico.calcular_interpolacion_lagrange(puntos, x_evaluar=punto_medio)
    else:
        lagrange = {'valido': False, 'mensaje': 'Se requieren al menos 2 evaluaciones para interpolar.'}

    # 5. Nivelación con Newton-Raphson
    promedio_actual = (sum(notas) / len(notas)) if notas else 0.0
    newton_nivelacion = None
    if 0 < promedio_actual < 70:
        newton_nivelacion = analisis_numerico.calcular_nivelacion_newton_raphson(
            t0_inicial=1.0,
            rendimiento_inicial=promedio_actual,
            tasa_aprendizaje=0.25,
            nota_objetivo=70.0
        )

    return Response({
        'estudiante': {
            'id': estudiante.id,
            'nombre_completo': estudiante.usuario.nombre_completo,
            'matricula': estudiante.carrera_o_area,
            'promedio_actual': round(promedio_actual, 1),
            'total_evaluaciones': len(historial)
        },
        'historial_evaluaciones': historial,
        'analisis_numerico': {
            'regresion_lineal': regresion,
            'extrapolacion': extrapolacion,
            'lagrange': lagrange,
            'irec_trapecio': irec_trapecio,
            'irec_simpson': irec_simpson,
            'newton_raphson': newton_nivelacion
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_calibrar_ponderaciones_gauss(request):
    """
    Aplica el método de Eliminación de Gauss con pivoteo parcial para calibrar
    las ponderaciones de dimensiones curriculares (Saber, Hacer, Decidir)
    a partir de 3 evaluaciones compuestas.
    """
    evaluaciones = request.data.get('evaluaciones', [])
    if not isinstance(evaluaciones, list) or len(evaluaciones) != 3:
        return Response({
            'error': 'Se requieren exactamente 3 registros de evaluaciones con los campos saber, hacer, decidir y nota_final.'
        }, status=status.HTTP_400_BAD_REQUEST)

    resultado = analisis_numerico.calibrar_ponderaciones_competencias(evaluaciones)
    if not resultado.get('valido'):
        return Response(resultado, status=status.HTTP_400_BAD_REQUEST)

    return Response(resultado)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_simular_nota_meta(request):
    """
    Determina la calificación requerida en una evaluación futura para alcanzar
    una nota objetivo mediante cálculo analítico de ponderaciones.
    """
    completadas = request.data.get('evaluaciones_completadas', [])
    peso_pendiente = float(request.data.get('peso_pendiente', 30.0))
    nota_objetivo = float(request.data.get('nota_objetivo', 51.0))

    resultado = analisis_numerico.calcular_nota_necesaria(
        evaluaciones_completadas=completadas,
        peso_pendiente=peso_pendiente,
        nota_objetivo=nota_objetivo
    )
    if not resultado.get('valido'):
        return Response(resultado, status=status.HTTP_400_BAD_REQUEST)

    return Response(resultado)


