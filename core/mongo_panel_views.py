"""
mongo_panel_views.py - Vista web para visualizar las colecciones de MongoDB
Acceso: http://localhost:8000/mongo/panel/
"""
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from bson import ObjectId
import json

from .mongo_db import mongo


def _serialize_doc(doc):
    """Convierte un documento MongoDB a JSON serializable."""
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif hasattr(v, 'isoformat'):
            result[k] = v.strftime('%d/%m/%Y %H:%M:%S')
        elif isinstance(v, dict):
            result[k] = _serialize_doc(v)
        else:
            result[k] = v
    return result


# ─────────────────────────────────────────────────────────────
# API endpoints JSON
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def api_mongo_colecciones(request):
    """Devuelve la lista de colecciones con conteo de documentos."""
    db = mongo.db
    if db is None:
        return Response({'error': 'MongoDB no disponible'}, status=503)

    colecciones = []
    for nombre in sorted(db.list_collection_names()):
        count = db[nombre].count_documents({})
        # Obtener un documento de muestra para mostrar los campos
        sample = db[nombre].find_one({})
        campos = list(sample.keys()) if sample else []
        if '_id' in campos:
            campos.remove('_id')
        colecciones.append({
            'nombre': nombre,
            'total': count,
            'campos': campos
        })

    return Response({
        'base_datos': db.name,
        'total_colecciones': len(colecciones),
        'colecciones': colecciones,
        'mongodb_ok': mongo.is_connected()
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_mongo_documentos(request, coleccion):
    """Devuelve los documentos de una coleccion con paginacion."""
    db = mongo.db
    if db is None:
        return Response({'error': 'MongoDB no disponible'}, status=503)

    if coleccion not in db.list_collection_names():
        return Response({'error': f'Coleccion "{coleccion}" no existe'}, status=404)

    limite = int(request.query_params.get('limite', 20))
    pagina = int(request.query_params.get('pagina', 1))
    skip = (pagina - 1) * limite

    # Filtro opcional por campo
    filtro_campo = request.query_params.get('campo')
    filtro_valor = request.query_params.get('valor')
    query = {}
    if filtro_campo and filtro_valor:
        # Intentar castear a int si es numerico
        try:
            query[filtro_campo] = int(filtro_valor)
        except ValueError:
            query[filtro_campo] = filtro_valor

    total = db[coleccion].count_documents(query)
    docs_raw = list(db[coleccion].find(query).sort('_id', -1).skip(skip).limit(limite))
    docs = [_serialize_doc(d) for d in docs_raw]

    return Response({
        'coleccion': coleccion,
        'total': total,
        'pagina': pagina,
        'limite': limite,
        'total_paginas': max(1, (total + limite - 1) // limite),
        'documentos': docs
    })


# ─────────────────────────────────────────────────────────────
# Panel HTML visual
# ─────────────────────────────────────────────────────────────

def mongo_panel_html(request):
    """Panel web visual para explorar MongoDB desde el navegador."""
    html = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EduSmart — Panel MongoDB</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d2e;
    --surface2: #242740;
    --border: #2e3250;
    --accent: #00d97e;
    --accent2: #7c3aed;
    --mongo: #13aa52;
    --mysql: #f59e0b;
    --text: #e2e8f0;
    --muted: #64748b;
    --danger: #ef4444;
    --info: #3b82f6;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; }

  /* HEADER */
  .header {
    background: linear-gradient(135deg, #13aa52 0%, #1a3a6c 50%, #7c3aed 100%);
    padding: 0 2rem;
    height: 64px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .header-left { display:flex; align-items:center; gap:1rem; }
  .logo { font-size:1.3rem; font-weight:700; letter-spacing:-0.5px; }
  .logo span { color:#00d97e; }
  .badge-db {
    padding:.3rem .8rem; border-radius:999px; font-size:.72rem; font-weight:600;
    display:inline-flex; align-items:center; gap:.4rem;
  }
  .badge-mongo { background:rgba(19,170,82,.25); color:#00d97e; border:1px solid rgba(19,170,82,.4); }
  .badge-mysql { background:rgba(245,158,11,.2); color:#f59e0b; border:1px solid rgba(245,158,11,.35); }
  .dot { width:7px; height:7px; border-radius:50%; animation:pulse 2s infinite; }
  .dot-green { background:#00d97e; box-shadow:0 0 6px #00d97e; }
  .dot-yellow { background:#f59e0b; box-shadow:0 0 6px #f59e0b; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* LAYOUT */
  .layout { display:grid; grid-template-columns:280px 1fr; min-height:calc(100vh - 64px); }

  /* SIDEBAR */
  .sidebar { background:var(--surface); border-right:1px solid var(--border); padding:1.5rem 1rem; }
  .sidebar-title { font-size:.7rem; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.1em; margin-bottom:.75rem; padding:0 .5rem; }
  .col-item {
    padding:.65rem .9rem; border-radius:.6rem; cursor:pointer; margin-bottom:.3rem;
    display:flex; align-items:center; justify-content:space-between;
    transition:all .15s ease; border:1px solid transparent;
  }
  .col-item:hover { background:var(--surface2); border-color:var(--border); }
  .col-item.active { background:rgba(0,217,126,.1); border-color:rgba(0,217,126,.3); }
  .col-name { font-size:.88rem; font-weight:500; display:flex; align-items:center; gap:.5rem; }
  .col-icon { font-size:1rem; }
  .col-count {
    font-size:.75rem; font-weight:600; padding:.15rem .5rem; border-radius:999px;
    background:rgba(124,58,237,.25); color:#a78bfa; min-width:2rem; text-align:center;
  }
  .col-count.has-data { background:rgba(0,217,126,.15); color:#00d97e; }

  /* MAIN */
  .main { padding:2rem; overflow-x:auto; }
  .main-header { margin-bottom:1.5rem; }
  .main-header h2 { font-size:1.3rem; font-weight:600; margin-bottom:.4rem; }
  .main-header p { color:var(--muted); font-size:.85rem; }

  /* STATS STRIP */
  .stats-strip { display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
  .stat-card {
    background:var(--surface); border:1px solid var(--border); border-radius:.75rem;
    padding:.9rem 1.3rem; min-width:130px; flex:1;
    transition:transform .2s;
  }
  .stat-card:hover { transform:translateY(-2px); }
  .stat-val { font-size:1.8rem; font-weight:700; line-height:1; }
  .stat-val.green { color:var(--mongo); }
  .stat-val.yellow { color:var(--mysql); }
  .stat-val.purple { color:#a78bfa; }
  .stat-val.blue { color:var(--info); }
  .stat-label { font-size:.75rem; color:var(--muted); margin-top:.3rem; }

  /* TOOLBAR */
  .toolbar { display:flex; gap:.75rem; margin-bottom:1rem; align-items:center; flex-wrap:wrap; }
  .toolbar input, .toolbar select {
    background:var(--surface); border:1px solid var(--border); color:var(--text);
    padding:.55rem 1rem; border-radius:.5rem; font-size:.85rem; font-family:inherit;
    outline:none; transition:border .2s;
  }
  .toolbar input:focus, .toolbar select:focus { border-color:var(--accent); }
  .toolbar input { flex:1; min-width:200px; }
  .btn {
    padding:.55rem 1.2rem; border-radius:.5rem; border:none; cursor:pointer;
    font-size:.85rem; font-weight:600; font-family:inherit; transition:all .15s;
    display:inline-flex; align-items:center; gap:.4rem;
  }
  .btn-primary { background:var(--mongo); color:#000; }
  .btn-primary:hover { background:#00b86b; transform:translateY(-1px); }
  .btn-secondary { background:var(--surface2); color:var(--text); border:1px solid var(--border); }
  .btn-secondary:hover { border-color:var(--accent); }

  /* TABLE */
  .table-wrap { background:var(--surface); border:1px solid var(--border); border-radius:.9rem; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:var(--surface2); }
  th { padding:.75rem 1rem; text-align:left; font-size:.75rem; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
  td { padding:.7rem 1rem; font-size:.83rem; border-bottom:1px solid var(--border); vertical-align:top; max-width:250px; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:rgba(255,255,255,.025); }
  .td-id { font-family:'JetBrains Mono',monospace; font-size:.75rem; color:var(--muted); }
  .td-action {
    display:inline-block; padding:.2rem .6rem; border-radius:999px; font-size:.72rem; font-weight:600;
    background:rgba(0,217,126,.15); color:#00d97e;
  }
  .td-val { word-break:break-all; }
  .td-extra { font-family:'JetBrains Mono',monospace; font-size:.72rem; color:#94a3b8; white-space:pre; }

  /* PAGINATION */
  .pagination { display:flex; gap:.5rem; align-items:center; justify-content:center; margin-top:1rem; }
  .page-btn {
    padding:.4rem .8rem; border-radius:.4rem; border:1px solid var(--border);
    background:var(--surface); color:var(--text); cursor:pointer; font-size:.82rem;
    transition:all .15s;
  }
  .page-btn:hover { border-color:var(--accent); color:var(--accent); }
  .page-btn.active { background:var(--accent); color:#000; border-color:var(--accent); font-weight:600; }
  .page-info { color:var(--muted); font-size:.82rem; }

  /* EMPTY / LOADING */
  .empty { text-align:center; padding:4rem; color:var(--muted); }
  .empty-icon { font-size:3rem; margin-bottom:.5rem; }
  .loading { text-align:center; padding:3rem; }
  .spinner { width:36px; height:36px; border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .6s linear infinite; margin:0 auto 1rem; }
  @keyframes spin { to{transform:rotate(360deg)} }

  /* SCHEMA */
  .schema-pills { display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.5rem; }
  .pill { padding:.2rem .6rem; border-radius:999px; font-size:.72rem; background:var(--surface2); border:1px solid var(--border); color:var(--muted); font-family:'JetBrains Mono',monospace; }

  /* TOAST */
  #toast { position:fixed; bottom:1.5rem; right:1.5rem; background:var(--surface2); border:1px solid var(--accent); color:var(--text); padding:.75rem 1.25rem; border-radius:.6rem; font-size:.85rem; transform:translateY(100px); opacity:0; transition:all .3s; z-index:999; }
  #toast.show { transform:translateY(0); opacity:1; }

  .refresh-icon { display:inline-block; }
  .refresh-icon.spinning { animation:spin .8s linear infinite; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="logo">Edu<span>Smart</span></div>
    <div class="badge-db badge-mongo"><div class="dot dot-green"></div>MongoDB · BD_EDUESMART</div>
    <div class="badge-db badge-mysql"><div class="dot dot-yellow"></div>MySQL · edusmart_db</div>
  </div>
  <div style="color:rgba(255,255,255,.7);font-size:.82rem;">Panel de Base de Datos</div>
</div>

<div class="layout">
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-title">Colecciones MongoDB</div>
    <div id="col-list"><div class="loading"><div class="spinner"></div></div></div>
  </div>

  <!-- MAIN -->
  <div class="main">
    <div id="main-content">
      <div class="empty">
        <div class="empty-icon">🍃</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:.4rem;">Selecciona una colección</div>
        <div style="font-size:.85rem;">Haz clic en una colección del panel izquierdo para ver sus documentos</div>
      </div>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
const API = '/mongo/api';
let currentCol = null;
let currentPage = 1;
let totalPages = 1;
let stats = {};

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Cargar colecciones en sidebar ──────────────────────────
async function loadCollections() {
  const res = await fetch(API + '/colecciones/');
  const data = await res.json();
  stats = {};
  let total_docs = 0;

  const icons = {
    logs_actividad: '📋', notificaciones: '🔔', coins_log: '🪙',
    sesiones: '🔐', badges_log: '🏅', analiticas: '📊', usuarios: '👤', chat_mensajes: '💬'
  };

  let html = '';
  data.colecciones.forEach(col => {
    stats[col.nombre] = col;
    total_docs += col.total;
    const icon = icons[col.nombre] || '📁';
    const hasData = col.total > 0;
    html += `<div class="col-item" id="col-${col.nombre}" onclick="selectCollection('${col.nombre}')">
      <div class="col-name"><span class="col-icon">${icon}</span>${col.nombre}</div>
      <span class="col-count ${hasData ? 'has-data' : ''}">${col.total}</span>
    </div>`;
  });
  document.getElementById('col-list').innerHTML = html;

  // Stats strip update
  if (document.getElementById('stat-collections')) {
    document.getElementById('stat-collections').textContent = data.total_colecciones;
    document.getElementById('stat-docs').textContent = total_docs;
  }
}

// ── Seleccionar colección ──────────────────────────────────
function selectCollection(nombre, page = 1) {
  currentCol = nombre;
  currentPage = page;
  document.querySelectorAll('.col-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('col-' + nombre);
  if (el) el.classList.add('active');
  loadDocuments(nombre, page);
}

// ── Cargar documentos ──────────────────────────────────────
async function loadDocuments(coleccion, page = 1, campo = '', valor = '') {
  const content = document.getElementById('main-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div><div style="color:#64748b">Cargando documentos...</div></div>';

  let url = `${API}/colecciones/${coleccion}/?pagina=${page}&limite=15`;
  if (campo && valor) url += `&campo=${campo}&valor=${valor}`;

  const res = await fetch(url);
  const data = await res.json();
  totalPages = data.total_paginas;

  const colInfo = stats[coleccion] || {};
  const campos = colInfo.campos || [];

  // Detectar todas las claves de los documentos para columnas
  const allKeys = new Set();
  data.documentos.forEach(doc => Object.keys(doc).forEach(k => allKeys.add(k)));
  const keys = [...allKeys].filter(k => k !== '_id');

  let html = `
  <div class="main-header">
    <h2>${getIcon(coleccion)} ${coleccion}</h2>
    <p>${data.total} documentos en total · Página ${data.pagina} de ${data.total_paginas}</p>
    <div class="schema-pills">${campos.map(c => `<span class="pill">${c}</span>`).join('')}</div>
  </div>

  <div class="stats-strip">
    <div class="stat-card"><div class="stat-val green" id="stat-collections">—</div><div class="stat-label">Colecciones totales</div></div>
    <div class="stat-card"><div class="stat-val purple" id="stat-docs">—</div><div class="stat-label">Documentos totales</div></div>
    <div class="stat-card"><div class="stat-val blue">${data.total}</div><div class="stat-label">En "${coleccion}"</div></div>
    <div class="stat-card"><div class="stat-val yellow">${data.total_paginas}</div><div class="stat-label">Páginas</div></div>
  </div>

  <div class="toolbar">
    <input type="text" id="filter-campo" placeholder="Campo (ej: usuario_id)" value="${campo}">
    <input type="text" id="filter-valor" placeholder="Valor (ej: 1)" value="${valor}">
    <button class="btn btn-primary" onclick="aplicarFiltro()">🔍 Filtrar</button>
    <button class="btn btn-secondary" onclick="limpiarFiltro()">✕ Limpiar</button>
    <button class="btn btn-secondary" onclick="refreshCol()"><span class="refresh-icon" id="refresh-icon">🔄</span> Actualizar</button>
  </div>`;

  if (data.documentos.length === 0) {
    html += `<div class="empty"><div class="empty-icon">📭</div><div>Sin documentos en esta colección</div></div>`;
  } else {
    html += `<div class="table-wrap"><table><thead><tr>
      <th>#</th><th>_id</th>`;
    keys.forEach(k => { html += `<th>${k}</th>`; });
    html += `</tr></thead><tbody>`;

    data.documentos.forEach((doc, i) => {
      const rowNum = (data.pagina - 1) * 15 + i + 1;
      html += `<tr><td class="td-id">${rowNum}</td><td class="td-id">${doc._id || '—'}</td>`;
      keys.forEach(k => {
        let val = doc[k];
        if (val === undefined || val === null) {
          html += `<td style="color:var(--muted)">—</td>`;
        } else if (k === 'accion') {
          html += `<td><span class="td-action">${val}</span></td>`;
        } else if (typeof val === 'object') {
          html += `<td><span class="td-extra">${JSON.stringify(val, null, 2)}</span></td>`;
        } else if (typeof val === 'boolean') {
          html += `<td><span style="color:${val ? '#00d97e' : '#ef4444'}">${val ? '✓ true' : '✗ false'}</span></td>`;
        } else {
          html += `<td class="td-val">${String(val).substring(0,120)}</td>`;
        }
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;

    // Paginación
    if (data.total_paginas > 1) {
      html += `<div class="pagination">`;
      if (data.pagina > 1) html += `<button class="page-btn" onclick="selectCollection('${coleccion}', ${data.pagina - 1})">← Anterior</button>`;
      for (let p = Math.max(1, data.pagina-2); p <= Math.min(data.total_paginas, data.pagina+2); p++) {
        html += `<button class="page-btn ${p===data.pagina?'active':''}" onclick="selectCollection('${coleccion}', ${p})">${p}</button>`;
      }
      if (data.pagina < data.total_paginas) html += `<button class="page-btn" onclick="selectCollection('${coleccion}', ${data.pagina + 1})">Siguiente →</button>`;
      html += `<span class="page-info">${data.total} documentos</span></div>`;
    }
  }

  content.innerHTML = html;

  // Re-cargar stats
  const res2 = await fetch(API + '/colecciones/');
  const d2 = await res2.json();
  let td = 0; d2.colecciones.forEach(c => td += c.total);
  document.getElementById('stat-collections').textContent = d2.total_colecciones;
  document.getElementById('stat-docs').textContent = td;
}

function getIcon(col) {
  const icons = { logs_actividad:'📋', notificaciones:'🔔', coins_log:'🪙', sesiones:'🔐', badges_log:'🏅', analiticas:'📊', usuarios:'👤' };
  return icons[col] || '📁';
}

function aplicarFiltro() {
  const campo = document.getElementById('filter-campo').value.trim();
  const valor = document.getElementById('filter-valor').value.trim();
  loadDocuments(currentCol, 1, campo, valor);
}

function limpiarFiltro() {
  loadDocuments(currentCol, 1);
}

function refreshCol() {
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.classList.add('spinning');
  loadCollections().then(() => {
    if (currentCol) selectCollection(currentCol, currentPage);
    toast('Datos actualizados');
    if (icon) setTimeout(() => icon.classList.remove('spinning'), 800);
  });
}

// Iniciar
loadCollections();
</script>
</body>
</html>"""
    return HttpResponse(html)
