import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger('edusmart.email')


def send_system_email(to_email, subject, text_content, html_content=None):
    """
    Envía un correo electrónico transaccional de manera segura.
    Retorna True si el envío fue exitoso o se procesó correctamente, False si hubo error.
    """
    if not to_email or '@' not in to_email:
        logger.warning(f"[Email] Destinatario inválido omitido: {to_email}")
        return False

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'EduSmart <noreply@edusmart.edu>')

    try:
        send_mail(
            subject=f"[EduSmart] {subject}",
            message=text_content,
            from_email=from_email,
            recipient_list=[to_email],
            html_message=html_content,
            fail_silently=False,
        )
        logger.info(f"[Email] Correo enviado exitosamente a {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"[Email] Error al enviar correo a {to_email}: {e}")
        return False


def send_task_notification_email(estudiante, tarea):
    """Notifica al estudiante sobre una nueva tarea asignada."""
    user = getattr(estudiante, 'usuario', None)
    if not user or not user.email:
        return False

    subject = f"Nueva Tarea Asignada: {tarea.titulo}"
    msg = (
        f"Hola {user.first_name or user.username},\n\n"
        f"Se ha publicado una nueva tarea en tu espacio académico '{tarea.espacio.nombre}':\n"
        f"Título: {tarea.titulo}\n"
        f"Fecha límite: {tarea.fecha_limite.strftime('%d/%m/%Y %H:%M')}\n"
        f"Puntaje máximo: {tarea.puntaje_maximo} pts.\n\n"
        f"Ingresa a tu cuenta en EduSmart para consultar los materiales y presentar tu entrega.\n\n"
        f"Saludos cordiales,\nEquipo EduSmart"
    )
    return send_system_email(user.email, subject, msg)


def send_grade_notification_email(estudiante, tarea, nota, retroalimentacion=''):
    """Notifica al estudiante cuando su tarea ha sido calificada."""
    user = getattr(estudiante, 'usuario', None)
    if not user or not user.email:
        return False

    subject = f"Calificación Publicada: {tarea.titulo}"
    msg = (
        f"Hola {user.first_name or user.username},\n\n"
        f"Tu entrega para la tarea '{tarea.titulo}' en el espacio '{tarea.espacio.nombre}' ha sido calificada.\n\n"
        f"Calificación: {nota}/100 pts.\n"
    )
    if retroalimentacion:
        msg += f"Retroalimentación del docente: {retroalimentacion}\n\n"
    msg += (
        f"Puedes revisar el detalle completo ingresando a tu espacio académico en EduSmart.\n\n"
        f"Saludos cordiales,\nEquipo EduSmart"
    )
    return send_system_email(user.email, subject, msg)


def send_password_reset_email(user, reset_url):
    """Envía el enlace seguro para restablecer contraseña."""
    if not user.email:
        return False

    subject = "Restablecimiento de Contraseña"
    msg = (
        f"Hola {user.first_name or user.username},\n\n"
        f"Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en EduSmart.\n\n"
        f"Para continuar, haz clic en el siguiente enlace seguro (válido por tiempo limitado):\n"
        f"{reset_url}\n\n"
        f"Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\n"
        f"Equipo de Seguridad EduSmart"
    )
    return send_system_email(user.email, subject, msg)


def send_course_report_email(estudiante, curso_nombre, report_summary):
    """Envía boletín o reporte periódico de rendimiento a un estudiante/apoderado."""
    user = getattr(estudiante, 'usuario', None)
    if not user or not user.email:
        return False

    subject = f"Boletín Académico Periódico - {curso_nombre}"
    msg = (
        f"Estimado/a estudiante y familia de {user.nombre_completo},\n\n"
        f"Se remite el reporte de seguimiento académico oficial para el curso '{curso_nombre}':\n\n"
        f"{report_summary}\n\n"
        f"Recuerde que puede consultar las calificaciones detalladas y tareas en la plataforma EduSmart.\n\n"
        f"Dirección Académica · EduSmart"
    )
    return send_system_email(user.email, subject, msg)
