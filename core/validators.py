import os
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

ALLOWED_DOCUMENT_EXTENSIONS = [
    '.pdf', '.docx', '.doc', '.xlsx', '.xls',
    '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.zip', '.txt'
]

ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']


def validate_grade(value):
    """Valida que una calificación esté estrictamente entre 0 y 100."""
    try:
        val = float(value)
    except (TypeError, ValueError):
        raise ValidationError(_('La calificación debe ser un valor numérico válido.'))
    if val < 0.0 or val > 100.0:
        raise ValidationError(_('La calificación debe ser un valor entre 0 y 100.'))


def validate_file_size(file_obj):
    """Valida que el archivo no supere el tamaño máximo permitido (10 MB)."""
    if file_obj and hasattr(file_obj, 'size'):
        if file_obj.size > MAX_FILE_SIZE_BYTES:
            raise ValidationError(
                _('El archivo excede el tamaño máximo permitido de 10 MB (%(size).1f MB subidos).')
                % {'size': file_obj.size / (1024 * 1024)}
            )


def validate_image_size(file_obj):
    """Valida que la imagen no supere los 5 MB."""
    if file_obj and hasattr(file_obj, 'size'):
        if file_obj.size > MAX_IMAGE_SIZE_BYTES:
            raise ValidationError(
                _('La imagen excede el tamaño máximo permitido de 5 MB (%(size).1f MB subidos).')
                % {'size': file_obj.size / (1024 * 1024)}
            )


def validate_file_extension(file_obj):
    """Valida que la extensión del archivo esté en la lista permitida."""
    if file_obj:
        name = getattr(file_obj, 'name', '')
        ext = os.path.splitext(name)[1].lower()
        if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            raise ValidationError(
                _('Extensión de archivo "%(ext)s" no permitida. Formatos válidos: %(allowed)s')
                % {'ext': ext, 'allowed': ', '.join(ALLOWED_DOCUMENT_EXTENSIONS)}
            )


def validate_image_extension(file_obj):
    """Valida que la extensión sea de una imagen permitida."""
    if file_obj:
        name = getattr(file_obj, 'name', '')
        ext = os.path.splitext(name)[1].lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValidationError(
                _('Formato de imagen "%(ext)s" no permitido. Formatos válidos: %(allowed)s')
                % {'ext': ext, 'allowed': ', '.join(ALLOWED_IMAGE_EXTENSIONS)}
            )


def sanitize_filename(filename):
    """Sanitiza el nombre de archivo eliminando caracteres peligrosos y path traversal."""
    if not filename:
        return 'archivo_sin_nombre'
    clean = os.path.basename(filename)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean)
    return clean[:120]
