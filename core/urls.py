from django.urls import path, re_path
from . import views
from . import api_views
from . import api_v2
from . import api_gamification
from . import api_ai_practice
from . import mongo_panel_views

urlpatterns = [
    # Rutas auxiliares
    path('demo/', views.demo_view, name='demo_view'),
    path('portal/', views.root_portal, name='root_portal'),

    # 1. Auth & Me (strictly DOCENTE & ESTUDIANTE)
    path('api/auth/login/', api_views.api_login, name='api_login'),
    path('api/auth/register/', api_views.api_register, name='api_register'),
    path('api/auth/logout/', api_views.api_logout, name='api_logout'),
    path('api/auth/me/', api_views.api_me, name='api_me'),
    path('api/auth/password-reset-request/', api_views.api_password_reset_request, name='api_password_reset_request'),
    path('api/auth/password-reset-confirm/', api_views.api_password_reset_confirm, name='api_password_reset_confirm'),

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
    path('api/tareas/<int:pk>/vistas/', api_views.api_tarea_vistas, name='api_tarea_vistas'),
    path('api/tareas/<int:pk>/recordatorio-vistas/', api_views.api_tarea_recordatorio_vistas, name='api_tarea_recordatorio_vistas'),
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
    path('api/v2/cursos/<int:curso_id>/boletin-pdf/', api_v2.api_descargar_boletin_curso, name='api_boletin_curso'),
    path('api/v2/cursos/<int:curso_id>/enviar-reportes/', api_v2.api_enviar_reportes_curso, name='api_v2_enviar_reportes_curso'),
    path('api/v2/estudiantes/<int:estudiante_id>/boletin-pdf/', api_views.api_descargar_boletin_estudiante, name='api_boletin_estudiante'),
    path('api/v2/estudiantes/<int:estudiante_id>/enviar-reporte/', api_v2.api_enviar_reporte_estudiante, name='api_v2_enviar_reporte_estudiante'),
    path('api/v2/docente/lista-excel/', api_v2.api_lista_excel_docente, name='api_v2_lista_excel_docente'),
    path('api/v2/docente/materias-con-temas/', api_v2.api_materias_con_temas, name='api_v2_materias_con_temas'),
    path('api/v2/materias/<int:materia_id>/temas/', api_v2.api_temas_avance, name='api_v2_temas_avance'),
    path('api/v2/materias/<int:materia_id>/temas/<int:tema_id>/', api_v2.api_tema_avance_detail, name='api_v2_tema_avance_detail'),

    # Invitaciones a Espacios (V2)
    path('api/espacios/<int:espacio_id>/invitacion/', api_v2.api_consultar_invitacion, name='api_consultar_invitacion'),
    path('api/espacios/<int:espacio_id>/invitacion/regenerar/', api_v2.api_regenerar_invitacion, name='api_regenerar_invitacion'),
    path('api/espacios/<int:espacio_id>/invitacion/desactivar/', api_v2.api_desactivar_invitacion, name='api_desactivar_invitacion'),
    path('api/invitaciones/validar/', api_v2.api_validar_invitacion, name='api_validar_invitacion'),
    path('api/invitaciones/unirse/', api_v2.api_unirse_espacio, name='api_unirse_espacio'),
    path('api/v2/espacios/<int:espacio_id>/tareas/', api_v2.api_tareas_espacio, name='api_v2_tareas_espacio'),
    path('api/v2/espacios/<int:espacio_id>/crear-tarea/', api_v2.api_crear_tarea_espacio, name='api_v2_crear_tarea_espacio'),

    # Muro de Avisos y Consultas por Materia
    path('api/v2/espacios/<int:espacio_id>/muro/', api_v2.api_muro_list_create, name='api_v2_muro_list_create'),
    path('api/v2/muro/<int:publicacion_id>/comentar/', api_v2.api_muro_comentar, name='api_v2_muro_comentar'),
    path('api/v2/muro/<int:publicacion_id>/toggle-fijar/', api_v2.api_muro_toggle_fijar, name='api_v2_muro_toggle_fijar'),
    path('api/v2/muro/<int:publicacion_id>/toggle-resolver/', api_v2.api_muro_toggle_resolver, name='api_v2_muro_toggle_resolver'),

    # Automatizaciones Proactivas (Recordatorios y Reporte Semanal)
    path('api/v2/tareas/ejecutar-recordatorios/', api_v2.api_ejecutar_recordatorios_tareas, name='api_v2_ejecutar_recordatorios'),
    path('api/v2/cursos/<int:curso_id>/reporte-semanal/', api_v2.api_curso_reporte_semanal, name='api_v2_curso_reporte_semanal'),

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
    # SIMULADORES DE EXAMEN Y EJERCICIOS DIDÁCTICOS CON IA (AVANCE TEMÁTICO)
    # =======================================================
    path('api/v2/temas/<int:tema_id>/generar-practica/', api_ai_practice.api_generar_practica_tema, name='api_generar_practica_tema'),
    path('api/v2/estudiante/practicas/', api_ai_practice.api_estudiante_practicas_list, name='api_estudiante_practicas_list'),
    path('api/v2/practicas/<int:practica_id>/', api_ai_practice.api_practica_detail, name='api_practica_detail'),
    path('api/v2/practicas/<int:practica_id>/enviar/', api_ai_practice.api_practica_submit, name='api_practica_submit'),
    path('api/v2/docente/materias/<int:materia_id>/practicas-resumen/', api_ai_practice.api_docente_materia_practicas_resumen, name='api_docente_materia_practicas_resumen'),

    # =======================================================
    # PANEL VISUAL MONGODB (Solo desarrollo)
    # =======================================================
    path('mongo/panel/', mongo_panel_views.mongo_panel_html,           name='mongo_panel'),
    path('mongo/api/colecciones/', mongo_panel_views.api_mongo_colecciones, name='mongo_api_colecciones'),
    path('mongo/api/colecciones/<str:coleccion>/', mongo_panel_views.api_mongo_documentos, name='mongo_api_documentos'),

    # =======================================================
    # ALERTAS AUTOMÁTICAS A PADRES Y ESTUDIANTES
    # =======================================================
    path('api/v2/alertas/enviar-rendimiento/', api_v2.api_enviar_alertas_rendimiento, name='api_v2_alertas_rendimiento'),
    path('api/v2/alertas/tarea-vencida/<int:tarea_id>/', api_v2.api_alertar_tarea_vencida, name='api_v2_alertar_tarea_vencida'),
    path('api/v2/alertas/estudiante/<int:estudiante_id>/contacto/', api_v2.api_actualizar_contacto_tutor, name='api_v2_contacto_tutor'),

    # =======================================================
    # LABORATORIO Y ANÁLISIS NUMÉRICO APLICADO
    # =======================================================
    # path('api/v2/analisis-numerico/calcular/', api_v2.api_analisis_numerico_calcular, name='api_analisis_numerico_calcular'), # removed numeric lab
    path('api/v2/estudiantes/<int:estudiante_id>/analisis-rendimiento/', api_v2.api_estudiante_analisis_rendimiento, name='api_estudiante_analisis_rendimiento'),
    path('api/v2/analisis-numerico/calibrar-pesos/', api_v2.api_calibrar_ponderaciones_gauss, name='api_calibrar_ponderaciones_gauss'),
    path('api/v2/analisis-numerico/simular-meta/', api_v2.api_simular_nota_meta, name='api_simular_nota_meta'),

    # SPA React Catch-all (sirve index.html en / y en cualquier ruta del frontend)
    re_path(r'^.*$', views.serve_react_app, name='react_spa'),
]
