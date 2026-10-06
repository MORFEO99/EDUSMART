"""
mongo_db.py - Gestor de conexion a MongoDB para EduSmart
Uso: from core.mongo_db import mongo
     mongo.logs.insert_one({...})
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from django.conf import settings


class MongoManager:
    """Singleton para manejar la conexion a MongoDB."""
    _instance = None
    _client = None
    _db = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def connect(self):
        """Establece la conexion con MongoDB si no existe."""
        if self._client is None:
            mongo_uri = getattr(settings, 'MONGODB_URI', 'mongodb://localhost:27017/')
            mongo_db_name = getattr(settings, 'MONGODB_NAME', 'BD_EDUESMART')
            try:
                self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
                self._client.admin.command('ping')
                self._db = self._client[mongo_db_name]
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                self._client = None
                self._db = None
                print(f"[MongoDB] No se pudo conectar: {e}")
        return self._db

    @property
    def db(self):
        return self.connect()

    def is_connected(self):
        """Verifica si MongoDB esta disponible."""
        try:
            if self._client:
                self._client.admin.command('ping')
                return True
        except Exception:
            pass
        return False

    # ------------------------------------------------------------------ #
    # Colecciones de la base de datos (acceso directo)                     #
    # ------------------------------------------------------------------ #

    @property
    def logs_actividad(self):
        """Logs de acciones del usuario (login, ver tarea, entregar, etc.)"""
        db = self.db
        if db is not None:
            return db['logs_actividad']
        return None

    @property
    def notificaciones(self):
        """Notificaciones en tiempo real / historial."""
        db = self.db
        if db is not None:
            return db['notificaciones']
        return None

    @property
    def badges_log(self):
        """Historial de badges obtenidos."""
        db = self.db
        if db is not None:
            return db['badges_log']
        return None

    @property
    def coins_log(self):
        """Historial de transacciones de monedas."""
        db = self.db
        if db is not None:
            return db['coins_log']
        return None

    @property
    def analiticas(self):
        """Datos analiticos agregados por espacio/tarea."""
        db = self.db
        if db is not None:
            return db['analiticas']
        return None

    @property
    def sesiones(self):
        """Sesiones de usuario activas."""
        db = self.db
        if db is not None:
            return db['sesiones']
        return None

    @property
    def chat_mensajes(self):
        """Mensajes de chat en espacios (futuro)."""
        db = self.db
        if db is not None:
            return db['chat_mensajes']
        return None

    def close(self):
        """Cierra la conexion."""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None


# Instancia global - importar desde aqui
mongo = MongoManager()
