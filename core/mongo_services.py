"""
mongo_services.py - Servicios para guardar datos en MongoDB desde EduSmart.
Cada funcion guarda un tipo especifico de evento/documento en MongoDB.
"""
from datetime import datetime, timezone
from .mongo_db import mongo


def _now():
    return datetime.now(timezone.utc)


# ============================================================
# LOGS DE ACTIVIDAD
# ============================================================

def log_actividad(usuario_id, accion, detalle=None, espacio_id=None, tarea_id=None, extra=None):
    """
    Registra una accion del usuario en MongoDB.

    Acciones comunes:
      - 'LOGIN', 'LOGOUT'
      - 'VER_TAREA', 'ENTREGAR_TAREA', 'VER_ESPACIO'
      - 'CALIFICAR', 'RETROALIMENTAR'
      - 'OBTENER_BADGE', 'COMPLETAR_RETO'
    """
    if mongo.logs_actividad is None:
        return None

    doc = {
        'usuario_id': usuario_id,
        'accion': accion,
        'detalle': detalle or '',
        'espacio_id': espacio_id,
        'tarea_id': tarea_id,
        'fecha': _now(),
        'extra': extra or {}
    }
    try:
        return mongo.logs_actividad.insert_one(doc)
    except Exception as e:
        print(f"[MongoDB] Error al guardar log: {e}")
        return None


# ============================================================
# NOTIFICACIONES
# ============================================================

def guardar_notificacion(usuario_id, tipo, mensaje, espacio_id=None, tarea_id=None):
    """
    Guarda una notificacion en MongoDB (adicionalmente al modelo Django).
    Los tipos son los mismos que en el modelo Notificacion de Django.
    """
    if mongo.notificaciones is None:
        return None

    doc = {
        'usuario_id': usuario_id,
        'tipo': tipo,
        'mensaje': mensaje,
        'espacio_id': espacio_id,
        'tarea_id': tarea_id,
        'leida': False,
        'fecha': _now()
    }
    try:
        return mongo.notificaciones.insert_one(doc)
    except Exception as e:
        print(f"[MongoDB] Error al guardar notificacion: {e}")
        return None


def obtener_notificaciones(usuario_id, solo_no_leidas=False, limite=20):
    """Obtiene las notificaciones de un usuario desde MongoDB."""
    if mongo.notificaciones is None:
        return []
    filtro = {'usuario_id': usuario_id}
    if solo_no_leidas:
        filtro['leida'] = False
    try:
        return list(
            mongo.notificaciones
            .find(filtro)
            .sort('fecha', -1)
            .limit(limite)
        )
    except Exception as e:
        print(f"[MongoDB] Error al obtener notificaciones: {e}")
        return []


def marcar_notificacion_leida(notif_id):
    """Marca una notificacion como leida por su _id."""
    if mongo.notificaciones is None:
        return
    from bson import ObjectId
    try:
        mongo.notificaciones.update_one(
            {'_id': ObjectId(notif_id)},
            {'$set': {'leida': True}}
        )
    except Exception as e:
        print(f"[MongoDB] Error al marcar notificacion: {e}")


# ============================================================
# GAMIFICACION - BADGES
# ============================================================

def log_badge_obtenido(usuario_id, badge_codigo, badge_nombre, puntos_otorgados=0):
    """Registra cuando un usuario obtiene un badge."""
    if mongo.badges_log is None:
        return None
    doc = {
        'usuario_id': usuario_id,
        'badge_codigo': badge_codigo,
        'badge_nombre': badge_nombre,
        'puntos_otorgados': puntos_otorgados,
        'fecha': _now()
    }
    try:
        return mongo.badges_log.insert_one(doc)
    except Exception as e:
        print(f"[MongoDB] Error al guardar badge log: {e}")
        return None


# ============================================================
# GAMIFICACION - COINS
# ============================================================

def log_coin_transaction(usuario_id, cantidad, razon, nuevo_total=None):
    """Registra una transaccion de monedas (coins)."""
    if mongo.coins_log is None:
        return None
    doc = {
        'usuario_id': usuario_id,
        'cantidad': cantidad,
        'razon': razon,
        'nuevo_total': nuevo_total,
        'fecha': _now()
    }
    try:
        return mongo.coins_log.insert_one(doc)
    except Exception as e:
        print(f"[MongoDB] Error al guardar coin transaction: {e}")
        return None


# ============================================================
# ANALITICAS
# ============================================================

def guardar_analitica_espacio(espacio_id, datos: dict):
    """
    Guarda un snapshot de analiticas de un espacio.
    datos puede incluir: total_tareas, promedio_notas, tasa_entrega, etc.
    """
    if mongo.analiticas is None:
        return None
    doc = {
        'espacio_id': espacio_id,
        'tipo': 'ESPACIO',
        'datos': datos,
        'fecha': _now()
    }
    try:
        return mongo.analiticas.insert_one(doc)
    except Exception as e:
        print(f"[MongoDB] Error al guardar analitica: {e}")
        return None


def obtener_analiticas_espacio(espacio_id, limite=10):
    """Obtiene los ultimos snapshots de analiticas de un espacio."""
    if mongo.analiticas is None:
        return []
    try:
        return list(
            mongo.analiticas
            .find({'espacio_id': espacio_id, 'tipo': 'ESPACIO'})
            .sort('fecha', -1)
            .limit(limite)
        )
    except Exception as e:
        print(f"[MongoDB] Error al obtener analiticas: {e}")
        return []


# ============================================================
# SESIONES
# ============================================================

def registrar_sesion(usuario_id, ip=None, user_agent=None):
    """Registra una sesion de inicio de sesion."""
    if mongo.sesiones is None:
        return None
    doc = {
        'usuario_id': usuario_id,
        'ip': ip,
        'user_agent': user_agent,
        'fecha_inicio': _now(),
        'activa': True
    }
    try:
        return mongo.sesiones.insert_one(doc)
    except Exception as e:
        print(f"[MongoDB] Error al registrar sesion: {e}")
        return None


def cerrar_sesion(usuario_id):
    """Marca la ultima sesion activa del usuario como cerrada."""
    if mongo.sesiones is None:
        return
    try:
        mongo.sesiones.update_one(
            {'usuario_id': usuario_id, 'activa': True},
            {'$set': {'activa': False, 'fecha_fin': _now()}}
        )
    except Exception as e:
        print(f"[MongoDB] Error al cerrar sesion: {e}")
