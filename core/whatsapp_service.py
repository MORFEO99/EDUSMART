"""
Servicio de envío de mensajes WhatsApp/SMS para EduSmart.

Los mensajes están redactados como CITACIÓN OFICIAL del docente
dirigida al padre/madre/tutor y al propio estudiante.

Prioridad de canales:
  1. Twilio WhatsApp (si TWILIO_ACCOUNT_SID está configurado)
  2. Fallback: registra en log interno (sin coste, sin fallo silencioso)

Variables de entorno requeridas para Twilio:
  TWILIO_ACCOUNT_SID   → SID de cuenta Twilio
  TWILIO_AUTH_TOKEN    → Token de autenticación
  TWILIO_WHATSAPP_FROM → Número origen (ej: whatsapp:+14155238886 para sandbox)
"""
import os
import re
import logging
from datetime import date

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades internas
# ─────────────────────────────────────────────────────────────────────────────

def _limpiar_numero(numero: str) -> str:
    """
    Normaliza un número telefónico.
    - Elimina espacios, guiones, paréntesis, '+'
    - Si tiene 8 dígitos → prefijo Bolivia +591
    - Retorna solo dígitos (sin '+')
    """
    if not numero:
        return ''
    clean = re.sub(r'[^\d]', '', numero)
    if len(clean) == 8:
        clean = '591' + clean  # Bolivia default
    return clean


def _fecha_hoy() -> str:
    hoy = date.today()
    dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return f"{dias[hoy.weekday()]} {hoy.day} de {meses[hoy.month - 1]} de {hoy.year}"


# ─────────────────────────────────────────────────────────────────────────────
# Envío base
# ─────────────────────────────────────────────────────────────────────────────

def enviar_whatsapp(numero_destino: str, mensaje: str) -> dict:
    """
    Envía un mensaje WhatsApp vía Twilio.

    Returns:
        dict { enviado: bool, canal: str, sid: str, error: str }
    """
    sid_env = os.environ.get('TWILIO_ACCOUNT_SID', '').strip()
    token_env = os.environ.get('TWILIO_AUTH_TOKEN', '').strip()
    from_num = os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886').strip()

    numero_limpio = _limpiar_numero(numero_destino)
    if not numero_limpio:
        return {'enviado': False, 'canal': None, 'error': 'Número de destino vacío o inválido'}

    # --- Canal 1: Twilio ---
    if sid_env and token_env:
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(sid_env, token_env)
            msg = client.messages.create(
                body=mensaje,
                from_=from_num,
                to=f'whatsapp:+{numero_limpio}'
            )
            logger.info(f'[WhatsApp] Enviado a +{numero_limpio}  SID={msg.sid}')
            return {'enviado': True, 'canal': 'twilio_whatsapp', 'sid': msg.sid}
        except Exception as exc:
            logger.error(f'[WhatsApp] Error Twilio al enviar a +{numero_limpio}: {exc}')
            return {'enviado': False, 'canal': 'twilio_whatsapp', 'error': str(exc)}

    # --- Canal 2: Fallback log ---
    logger.warning(
        f'[WhatsApp FALLBACK] Twilio no configurado. '
        f'Destino: +{numero_limpio} | Mensaje: {mensaje[:100]}...'
    )
    return {
        'enviado': False,
        'canal': 'fallback_log',
        'error': 'Twilio no configurado. Configure TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.'
    }


# ─────────────────────────────────────────────────────────────────────────────
# Plantillas de mensajes — tono de citación oficial del docente
# ─────────────────────────────────────────────────────────────────────────────

def _msg_citacion_tutor(
    nombre_tutor: str,
    relacion: str,
    nombre_estudiante: str,
    nombre_docente: str,
    materia: str,
    motivos: list,
    tipo: str = 'RENDIMIENTO'   # 'RENDIMIENTO' | 'TAREA_VENCIDA'
) -> str:
    """
    Redacta el mensaje de citación formal del docente hacia el padre/tutor.
    """
    fecha = _fecha_hoy()
    motivos_txt = '\n'.join(f'   • {m}' for m in motivos)

    relacion_map = {
        'PADRE': 'Sr.', 'MADRE': 'Sra.', 'TUTOR': 'Sr./Sra.', 'OTRO': 'Sr./Sra.'
    }
    tratamiento = relacion_map.get(relacion, 'Sr./Sra.')

    if tipo == 'TAREA_VENCIDA':
        asunto = 'incumplimiento de entrega de tarea'
        cierre = (
            f'Le solicito amablemente comunicarse conmigo o acercarse a la institución '
            f'para tratar este asunto y regularizar la situación académica de su hijo/a '
            f'a la brevedad posible.'
        )
    else:
        asunto = 'bajo rendimiento académico'
        cierre = (
            f'Le solicito amablemente que sostenga una conversación con su hijo/a '
            f'sobre sus responsabilidades académicas, y si lo considera necesario, '
            f'coordinemos una reunión de seguimiento.'
        )

    return (
        f'📋 *CITACIÓN ACADÉMICA — EduSmart*\n'
        f'━━━━━━━━━━━━━━━━━━━━━━\n\n'
        f'{tratamiento} *{nombre_tutor}*,\n\n'
        f'Por medio del presente mensaje, yo, *{nombre_docente}*, '
        f'docente de la materia *{materia}*, me dirijo a usted '
        f'en calidad de {relacion.lower()} del/la estudiante '
        f'*{nombre_estudiante}*, para informarle sobre la siguiente situación:\n\n'
        f'*📌 Motivo de la citación ({asunto}):*\n'
        f'{motivos_txt}\n\n'
        f'{cierre}\n\n'
        f'🗓 Fecha de notificación: {fecha}\n'
        f'📚 Materia: {materia}\n\n'
        f'Atentamente,\n'
        f'*{nombre_docente}*\n'
        f'_Docente — Plataforma EduSmart_'
    )


def _msg_aviso_estudiante(
    nombre_estudiante: str,
    nombre_docente: str,
    materia: str,
    motivos: list,
    tipo: str = 'RENDIMIENTO'
) -> str:
    """
    Redacta el aviso directo al estudiante, firmado por el docente.
    """
    fecha = _fecha_hoy()
    motivos_txt = '\n'.join(f'   • {m}' for m in motivos)

    if tipo == 'TAREA_VENCIDA':
        encabezado = '⚠️ AVISO DE TAREA VENCIDA'
        cuerpo = (
            f'Te notifico que tienes una o más tareas vencidas sin entregar '
            f'en la materia *{materia}*. Esto afecta directamente tu calificación final.'
        )
        accion = (
            f'📲 Ingresa a EduSmart de inmediato, '
            f'comunícate conmigo o justifica tu situación a la brevedad.'
        )
    else:
        encabezado = '⚠️ AVISO DE BAJO RENDIMIENTO'
        cuerpo = (
            f'He detectado que tu rendimiento académico en *{materia}* '
            f'se encuentra por debajo del nivel mínimo requerido.'
        )
        accion = (
            f'📲 Te pido que ingreses a EduSmart, revises tu situación '
            f'y te acerques a consultarme en horas de atención.'
        )

    return (
        f'📋 *{encabezado} — EduSmart*\n'
        f'━━━━━━━━━━━━━━━━━━━━━━\n\n'
        f'Estimado/a *{nombre_estudiante}*:\n\n'
        f'{cuerpo}\n\n'
        f'*📌 Detalle:*\n'
        f'{motivos_txt}\n\n'
        f'{accion}\n\n'
        f'🗓 Fecha: {fecha}\n\n'
        f'Tu docente,\n'
        f'*{nombre_docente}*\n'
        f'_Plataforma EduSmart_'
    )


# ─────────────────────────────────────────────────────────────────────────────
# Funciones públicas
# ─────────────────────────────────────────────────────────────────────────────

def enviar_alerta_rendimiento(
    estudiante,
    motivos: list,
    docente=None,
    materia: str = 'EduSmart'
) -> dict:
    """
    Envía citación/aviso de bajo rendimiento a estudiante Y tutor,
    firmada por el docente.

    Args:
        estudiante: instancia de models.Estudiante
        motivos:    lista de strings con los problemas detectados
        docente:    instancia de models.Docente (opcional, para firmar el mensaje)
        materia:    nombre de la materia o espacio (str)

    Returns:
        dict { 'estudiante': {...}, 'tutor': {...} }
    """
    nombre_est = estudiante.usuario.get_full_name() or estudiante.usuario.username

    # Nombre del docente para la firma
    if docente and hasattr(docente, 'usuario'):
        nombre_docente = docente.usuario.get_full_name() or docente.usuario.username
    else:
        nombre_docente = 'Su Docente'

    nombre_tutor = getattr(estudiante, 'nombre_tutor', '') or 'Padre/Madre/Tutor'
    relacion = getattr(estudiante, 'relacion_tutor', 'TUTOR')

    # Redactar mensajes
    msg_tutor = _msg_citacion_tutor(
        nombre_tutor=nombre_tutor,
        relacion=relacion,
        nombre_estudiante=nombre_est,
        nombre_docente=nombre_docente,
        materia=materia,
        motivos=motivos,
        tipo='RENDIMIENTO'
    )

    msg_est = _msg_aviso_estudiante(
        nombre_estudiante=nombre_est,
        nombre_docente=nombre_docente,
        materia=materia,
        motivos=motivos,
        tipo='RENDIMIENTO'
    )

    resultados = {}

    # Enviar al estudiante
    tel_est = getattr(estudiante.usuario, 'telefono', '')
    resultados['estudiante'] = (
        enviar_whatsapp(tel_est, msg_est)
        if tel_est
        else {'enviado': False, 'error': 'Sin número de teléfono registrado'}
    )

    # Enviar al tutor
    tel_tutor = getattr(estudiante, 'telefono_tutor', '')
    resultados['tutor'] = (
        enviar_whatsapp(tel_tutor, msg_tutor)
        if tel_tutor
        else {'enviado': False, 'error': 'Sin número de tutor registrado'}
    )

    return resultados


def enviar_alerta_tarea_vencida(
    estudiante,
    tarea,
    docente=None
) -> dict:
    """
    Citación específica cuando una tarea venció sin entrega.

    Args:
        estudiante: instancia de models.Estudiante
        tarea:      instancia de models.Tarea
        docente:    instancia de models.Docente (opcional)
    """
    nombre_est = estudiante.usuario.get_full_name() or estudiante.usuario.username

    if docente and hasattr(docente, 'usuario'):
        nombre_docente = docente.usuario.get_full_name() or docente.usuario.username
    else:
        nombre_docente = 'Su Docente'

    nombre_tutor = getattr(estudiante, 'nombre_tutor', '') or 'Padre/Madre/Tutor'
    relacion = getattr(estudiante, 'relacion_tutor', 'TUTOR')
    materia = tarea.espacio.nombre if tarea.espacio else 'la materia'

    fecha_limite = (
        tarea.fecha_limite.strftime('%d/%m/%Y a las %H:%M')
        if tarea.fecha_limite else 'sin fecha establecida'
    )

    motivos = [
        f'Tarea: *{tarea.titulo}*',
        f'Fecha límite: {fecha_limite}',
        f'Estado: No entregada',
    ]

    msg_tutor = _msg_citacion_tutor(
        nombre_tutor=nombre_tutor,
        relacion=relacion,
        nombre_estudiante=nombre_est,
        nombre_docente=nombre_docente,
        materia=materia,
        motivos=motivos,
        tipo='TAREA_VENCIDA'
    )

    msg_est = _msg_aviso_estudiante(
        nombre_estudiante=nombre_est,
        nombre_docente=nombre_docente,
        materia=materia,
        motivos=motivos,
        tipo='TAREA_VENCIDA'
    )

    resultados = {}

    tel_est = getattr(estudiante.usuario, 'telefono', '')
    resultados['estudiante'] = (
        enviar_whatsapp(tel_est, msg_est)
        if tel_est
        else {'enviado': False, 'error': 'Sin número de teléfono registrado'}
    )

    tel_tutor = getattr(estudiante, 'telefono_tutor', '')
    resultados['tutor'] = (
        enviar_whatsapp(tel_tutor, msg_tutor)
        if tel_tutor
        else {'enviado': False, 'error': 'Sin número de tutor registrado'}
    )

    return resultados
