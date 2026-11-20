"""
Servicio de envío de mensajes WhatsApp/SMS para EduSmart.

Prioridad de canales:
  1. Twilio WhatsApp (si TWILIO_ACCOUNT_SID está configurado)
  2. Fallback: registra Notificacion interna + log (sin coste, sin fallo silencioso)

Variables de entorno requeridas para Twilio:
  TWILIO_ACCOUNT_SID   → SID de cuenta Twilio
  TWILIO_AUTH_TOKEN    → Token de autenticación
  TWILIO_WHATSAPP_FROM → Número origen (ej: whatsapp:+14155238886 para sandbox)
"""
import os
import re
import logging

logger = logging.getLogger(__name__)


def _limpiar_numero(numero: str) -> str:
    """
    Limpia y normaliza un número telefónico.
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


def enviar_whatsapp(numero_destino: str, mensaje: str) -> dict:
    """
    Envía un mensaje WhatsApp vía Twilio.

    Args:
        numero_destino: Número en cualquier formato (ej: '+591-7890-1234', '78901234', '59178901234')
        mensaje:        Texto del mensaje a enviar.

    Returns:
        dict con claves:
          - enviado (bool)
          - canal   ('twilio_whatsapp' | 'fallback_log')
          - sid     (str, solo si Twilio OK)
          - error   (str, solo si hubo error)
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

    # --- Canal 2: Fallback log (sin API configurada) ---
    logger.warning(
        f'[WhatsApp FALLBACK] Twilio no configurado. '
        f'Destino: +{numero_limpio} | Mensaje: {mensaje[:80]}...'
    )
    return {
        'enviado': False,
        'canal': 'fallback_log',
        'error': 'Twilio no configurado. Configure TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.'
    }


def enviar_alerta_rendimiento(estudiante, motivos: list) -> dict:
    """
    Envía alerta de bajo rendimiento a:
      - El número del estudiante (usuario.telefono)
      - El número del tutor (estudiante.telefono_tutor)

    Args:
        estudiante: instancia de models.Estudiante
        motivos:    lista de strings describiendo el problema (ej: ['Promedio: 42/100', 'Tarea vencida: Física'])

    Returns:
        dict con resultados por destinatario
    """
    nombre = estudiante.usuario.get_full_name() or estudiante.usuario.username
    motivos_txt = '\n'.join(f'  • {m}' for m in motivos)

    # Mensaje para el ESTUDIANTE
    msg_estudiante = (
        f'📚 *EduSmart – Alerta Académica*\n\n'
        f'Hola {nombre},\n'
        f'Tu docente ha detectado situaciones que requieren tu atención:\n\n'
        f'{motivos_txt}\n\n'
        f'Ingresa a EduSmart para ponerte al día y mejorar tu rendimiento.\n'
        f'¡Tú puedes! 💪'
    )

    # Mensaje para el TUTOR
    nombre_tutor = getattr(estudiante, 'nombre_tutor', '') or 'Padre/Tutor'
    relacion = getattr(estudiante, 'relacion_tutor', 'TUTOR')
    msg_tutor = (
        f'📢 *EduSmart – Alerta Académica*\n\n'
        f'Estimado/a {nombre_tutor} ({relacion}):\n\n'
        f'Su hijo/a *{nombre}* presenta las siguientes situaciones académicas:\n\n'
        f'{motivos_txt}\n\n'
        f'Le recomendamos comunicarse con el docente a la brevedad posible.\n'
        f'– Sistema EduSmart'
    )

    resultados = {}

    # Enviar al estudiante
    tel_estudiante = getattr(estudiante.usuario, 'telefono', '')
    if tel_estudiante:
        resultados['estudiante'] = enviar_whatsapp(tel_estudiante, msg_estudiante)
    else:
        resultados['estudiante'] = {'enviado': False, 'error': 'Sin número de teléfono registrado'}

    # Enviar al tutor
    tel_tutor = getattr(estudiante, 'telefono_tutor', '')
    if tel_tutor:
        resultados['tutor'] = enviar_whatsapp(tel_tutor, msg_tutor)
    else:
        resultados['tutor'] = {'enviado': False, 'error': 'Sin número de tutor registrado'}

    return resultados


def enviar_alerta_tarea_vencida(estudiante, tarea) -> dict:
    """
    Alerta específica cuando una tarea venció sin entrega.

    Args:
        estudiante: instancia de models.Estudiante
        tarea:      instancia de models.Tarea
    """
    motivos = [
        f'Tarea vencida sin entregar: *{tarea.titulo}*',
        f'Fecha límite: {tarea.fecha_limite.strftime("%d/%m/%Y %H:%M") if tarea.fecha_limite else "Sin fecha"}',
        f'Materia: {tarea.espacio.nombre if tarea.espacio else "Desconocida"}'
    ]
    return enviar_alerta_rendimiento(estudiante, motivos)
