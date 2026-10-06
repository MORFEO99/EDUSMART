from django.urls import path
from . import views
from . import api_views
from . import api_v2
from . import api_gamification
from . import mongo_panel_views

urlpatterns = [
    # Root portal - automatically redirects to React frontend
    path('', views.root_portal, name='root_portal'),

    # 1. Auth & Me (strictly DOCENTE & ESTUDIANTE)
    path('api/auth/login/', api_views.api_login, name='api_login'),
    path('api/auth/register/', api_views.api_register, name='api_register'),
    path('api/auth/logout/', api_views.api_logout, name='api_logout'),
    path('api/auth/me/', api_views.api_me, name='api_me'),

    # 2. Espacios Académicos ("Mis Espacios")
    path('api/espacios/', api_views.api_espacios, name='api_espacios'),
    path('api/espacios/unirse/', api_views.api_unirse_espacio, name='api_unirse_espacio'),
    path('api/espacios/<int:pk>/', api_views.api_espacio_detail, name='api_espacio_detail'),

    # 3. Tareas Académicas
    path('api/tareas/', api_views.api_tareas, name='api_tareas'),
    path('api/tareas/<int:pk>/', api_views.api_tarea_detail, name='api_tarea_detail'),
    path('api/tareas/<int:pk>/presentar/', api_views.api_presentar_tarea, name='api_presentar_tarea'),

    # 4. Entregas y Calificaciones
    path('api/tareas/<int:pk>/entregas/', api_views.api_tarea_entregas, name='api_tarea_entregas'),
    path('api/entregas/<int:pk>/calificar/', api_views.api_calificar_entrega, name='api_calificar_entrega'),
    path('api/entregas/<int:pk>/devolver/', api_views.api_devolver_entrega, name='api_devolver_entrega'),
    path('api/tareas/<int:pk>/reentregar/', api_views.api_reentregar_tarea, name='api_reentregar_tarea'),
    path('api/entregas/<int:pk>/historial/', api_views.api_entrega_historial, name='api_entrega_historial'),
    path('api/entregas/pendientes/', api_views.api_entregas_pendientes, name='api_entregas_pendientes'),

    # Avisos, Recursos, Extensiones y Plantillas
    path('api/espacios/<int:espacio_id>/avisos/', api_views.api_espacio_avisos, name='api_espacio_avisos'),
    path('api/avisos/<int:pk>/', api_views.api_eliminar_aviso, name='api_eliminar_aviso'),
    path('api/espacios/<int:espacio_id>/recursos/', api_views.api_espacio_recursos, name='api_espacio_recursos'),
    path('api/recursos/<int:pk>/', api_views.api_eliminar_recurso, name='api_eliminar_recurso'),
    path('api/tareas/<int:pk>/extension/', api_views.api_tarea_extension, name='api_tarea_extension'),
    path('api/plantillas/', api_views.api_plantillas_tarea, name='api_plantillas_tarea'),
    path('api/tareas/<int:pk>/duplicar/', api_views.api_duplicar_tarea, name='api_duplicar_tarea'),

    # 5. Dashboards
    path('api/dashboard/estudiante/', api_views.api_student_dashboard, name='api_student_dashboard'),
    path('api/dashboard/docente/', api_views.api_teacher_dashboard, name='api_teacher_dashboard'),

    # 6. Progreso Académico
    path('api/progreso/', api_views.api_progreso_academico, name='api_progreso'),

    # 7. Actividad y Notificaciones
    path('api/actividad/', api_views.api_actividad_academica, name='api_actividad'),
    path('api/notificaciones/', api_views.api_notificaciones, name='api_notificaciones'),
    path('api/notificaciones/marcar-leidas/', api_views.api_marcar_notificaciones_leidas, name='api_marcar_notificaciones_leidas'),

    # =======================================================
    # V2 API ENDPOINTS (Colegios, Cursos, Importaciones)
    # =======================================================
    path('api/v2/colegios/', api_v2.api_colegios, name='api_v2_colegios'),
    path('api/v2/colegios/<int:colegio_id>/cursos/', api_v2.api_cursos_por_colegio, name='api_v2_cursos_colegio'),
    path('api/v2/cursos/<int:curso_id>/materias/', api_v2.api_materias_por_curso, name='api_v2_materias_curso'),
    path('api/v2/cursos/<int:curso_id>/importar/', api_v2.api_importar_estudiantes, name='api_v2_importar_estudiantes'),
    path('api/v2/cursos/<int:curso_id>/estudiantes/', api_v2.api_estudiantes_por_curso, name='api_v2_estudiantes_curso'),
    path('api/v2/cursos/<int:curso_id>/enviar-reportes/', api_v2.api_enviar_reportes_curso, name='api_v2_enviar_reportes_curso'),
    path('api/v2/estudiantes/<int:estudiante_id>/enviar-reporte/', api_v2.api_enviar_reporte_estudiante, name='api_v2_enviar_reporte_estudiante'),

    # Invitaciones a Espacios (V2)
    path('api/espacios/<int:espacio_id>/invitacion/', api_v2.api_consultar_invitacion, name='api_consultar_invitacion'),
    path('api/espacios/<int:espacio_id>/invitacion/regenerar/', api_v2.api_regenerar_invitacion, name='api_regenerar_invitacion'),
    path('api/espacios/<int:espacio_id>/invitacion/desactivar/', api_v2.api_desactivar_invitacion, name='api_desactivar_invitacion'),
    path('api/invitaciones/validar/', api_v2.api_validar_invitacion, name='api_validar_invitacion'),
    path('api/invitaciones/unirse/', api_v2.api_unirse_espacio, name='api_unirse_espacio'),
    path('api/v2/espacios/<int:espacio_id>/tareas/', api_v2.api_tareas_espacio, name='api_v2_tareas_espacio'),
    path('api/v2/espacios/<int:espacio_id>/crear-tarea/', api_v2.api_crear_tarea_espacio, name='api_v2_crear_tarea_espacio'),

    # =======================================================
    # V2 API GAMIFICACIÓN
    # =======================================================
    path('api/v2/gamificacion/challenges/', api_gamification.api_challenges, name='api_challenges'),
    path('api/v2/gamificacion/challenges/crear/', api_gamification.api_crear_reto, name='api_crear_reto'),
    path('api/v2/gamificacion/challenges/<int:reto_id>/participar/', api_gamification.api_participar_reto, name='api_participar_reto'),
    path('api/v2/gamificacion/challenges/<int:reto_id>/gestionar/', api_gamification.api_gestionar_reto, name='api_gestionar_reto'),
    path('api/v2/gamificacion/leaderboard/', api_gamification.api_leaderboard, name='api_leaderboard'),
    path('api/v2/gamificacion/badges/', api_gamification.api_badges, name='api_badges'),

    # =======================================================
    # PANEL VISUAL MONGODB (Solo desarrollo)
    # =======================================================
    path('mongo/panel/', mongo_panel_views.mongo_panel_html,           name='mongo_panel'),
    path('mongo/api/colecciones/', mongo_panel_views.api_mongo_colecciones, name='mongo_api_colecciones'),
    path('mongo/api/colecciones/<str:coleccion>/', mongo_panel_views.api_mongo_documentos, name='mongo_api_documentos'),
]
