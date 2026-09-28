from django.urls import path
from . import views
from . import api_views
from . import api_v2
from . import api_gamification

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

    # 4. Entregas y Calificaciones (Docente)
    path('api/tareas/<int:pk>/entregas/', api_views.api_tarea_entregas, name='api_tarea_entregas'),
    path('api/entregas/<int:pk>/calificar/', api_views.api_calificar_entrega, name='api_calificar_entrega'),

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
    path('api/v2/gamificacion/challenges/<int:reto_id>/participar/', api_gamification.api_participar_reto, name='api_participar_reto'),
    path('api/v2/gamificacion/leaderboard/', api_gamification.api_leaderboard, name='api_leaderboard'),
    path('api/v2/gamificacion/badges/', api_gamification.api_badges, name='api_badges'),
]
