from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Docente, Estudiante, Colegio, Curso, Materia

@admin.register(Usuario)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'rol', 'estado')
    list_filter = ('rol', 'estado')
    fieldsets = UserAdmin.fieldsets + (
        ('Información Extra', {'fields': ('rol', 'estado', 'telefono', 'avatar_url')}),
    )

admin.site.register(Docente)
admin.site.register(Estudiante)
admin.site.register(Colegio)
admin.site.register(Curso)
admin.site.register(Materia)
