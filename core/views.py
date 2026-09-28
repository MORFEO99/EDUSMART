from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Avg, Count, Q
from django.http import JsonResponse, HttpResponseForbidden, HttpResponse

from .models import (
    Usuario, Docente, Estudiante, Espacio, MiembroEspacio,
    Tarea, Material, Entrega, Calificacion, Retroalimentacion,
    ProgresoAcademico, Notificacion
)

def root_portal(request):
    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="1;url=http://localhost:3000/">
    <title>EDUSMART - Redirigiendo...</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; margin-top: 0; font-size: 1.75rem; }
        p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
        .btn { display: inline-block; margin: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .spinner { width: 32px; height: 32px; border: 3px solid #334155; border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s infinite linear; margin: 1.5rem auto 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card">
        <h1>EDUSMART</h1>
        <p>Sistema de Gestión y Seguimiento de Tareas Académicas</p>
        <p>Redirigiendo a la aplicación web principal en <strong>http://localhost:3000</strong>...</p>
        <div class="spinner"></div>
        <div style="margin-top: 1.5rem;">
            <a href="http://localhost:3000/" class="btn btn-primary">Abrir EDUSMART Web</a>
        </div>
    </div>
</body>
</html>"""
    return HttpResponse(html)
