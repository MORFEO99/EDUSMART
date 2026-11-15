import os
from pathlib import Path
from django.conf import settings
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

def demo_view(request):
    """Sirve la maqueta y simulador interactivo completo de EduSmart"""
    demo_file = Path(settings.BASE_DIR) / 'demo_edusmart.html'
    if demo_file.exists():
        with open(demo_file, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse("Demo interactivo no encontrado.", status=404)

def root_portal(request):
    """Portal de bienvenida principal para Render / Producción"""
    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EduSmart - Sistema Académico en Render</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0f172a 60%, #020617 100%);
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        .container {
            max-width: 860px;
            width: 100%;
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1.5rem;
            padding: 2.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            font-size: 0.8rem;
            font-weight: 700;
            padding: 0.35rem 0.9rem;
            border-radius: 9999px;
            margin-bottom: 1rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        p.subtitle {
            color: #94a3b8;
            font-size: 1.05rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.25rem;
            margin-bottom: 2rem;
        }
        .card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 1rem;
            padding: 1.5rem;
            text-decoration: none;
            color: inherit;
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .card:hover {
            transform: translateY(-4px);
            border-color: rgba(99, 102, 241, 0.5);
            background: rgba(30, 41, 59, 0.9);
            box-shadow: 0 12px 24px -8px rgba(99, 102, 241, 0.3);
        }
        .card-icon {
            font-size: 1.75rem;
            margin-bottom: 0.75rem;
        }
        .card-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: 0.4rem;
        }
        .card-desc {
            font-size: 0.88rem;
            color: #94a3b8;
            line-height: 1.4;
            margin-bottom: 1rem;
        }
        .card-action {
            font-size: 0.85rem;
            font-weight: 600;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        .creds-box {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 1rem;
            padding: 1.25rem 1.5rem;
        }
        .creds-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: #cbd5e1;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .creds-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 0.75rem;
            font-size: 0.85rem;
        }
        .cred-item {
            background: rgba(30, 41, 59, 0.6);
            padding: 0.6rem 0.9rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .cred-role {
            color: #a78bfa;
            font-weight: 700;
            font-size: 0.75rem;
            text-transform: uppercase;
            margin-bottom: 0.2rem;
        }
        .cred-val {
            color: #e2e8f0;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="badge">🚀 En Línea en Render</span>
            <h1>EduSmart</h1>
            <p class="subtitle">Plataforma Educativa Inteligente con IA, PostgreSQL y MongoDB</p>
        </div>

        <div class="grid">
            <a href="/demo/" class="card">
                <div>
                    <div class="card-icon">✨</div>
                    <div class="card-title">Demo Interactiva</div>
                    <div class="card-desc">Simulador completo en vivo con rol Docente y Estudiante, IA para simuladores de examen y gamificación.</div>
                </div>
                <div class="card-action">Abrir Demo &rarr;</div>
            </a>

            <a href="/admin/" class="card">
                <div>
                    <div class="card-icon">🔐</div>
                    <div class="card-title">Panel Administrativo</div>
                    <div class="card-desc">Django Admin para gestionar usuarios, colegios, cursos, materias y calificaciones en PostgreSQL.</div>
                </div>
                <div class="card-action">Ingresar al Admin &rarr;</div>
            </a>

            <a href="/mongo/panel/" class="card">
                <div>
                    <div class="card-icon">🍃</div>
                    <div class="card-title">Panel MongoDB</div>
                    <div class="card-desc">Inspección visual de bitácoras, eventos de auditoría y logs de gamificación en tiempo real.</div>
                </div>
                <div class="card-action">Ver Colecciones &rarr;</div>
            </a>
        </div>

        <div class="creds-box">
            <div class="creds-title">🔑 Credenciales de Acceso Rápidas</div>
            <div class="creds-list">
                <div class="cred-item">
                    <div class="cred-role">Administrador Django</div>
                    <div class="cred-val">Usuario: <strong>admin</strong><br>Clave: <strong>adminpassword123</strong></div>
                </div>
                <div class="cred-item">
                    <div class="cred-role">Docente Titular</div>
                    <div class="cred-val">prof_juan@edusmart.edu<br>Clave: <strong>password123</strong></div>
                </div>
                <div class="cred-item">
                    <div class="cred-role">Estudiante</div>
                    <div class="cred-val">carlos.gomez@edusmart.edu<br>Clave: <strong>password123</strong></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>"""
    return HttpResponse(html)
