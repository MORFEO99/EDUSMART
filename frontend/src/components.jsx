import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, FolderGit2, CheckSquare, Activity, TrendingUp,
  User, LogOut, Plus, Bell, X, Check, ChevronRight, FileText,
  Clock, Award, MessageSquare, AlertCircle, AlertTriangle, UploadCloud,
  Download, Eye, Share2, Layers, BookOpen, Code, Database, Cpu, Menu,
  CheckCircle2, ArrowRight, Building, Inbox, BarChart2, Search, Sparkles, Target
} from 'lucide-react';

// ============================================================
// 1. EDUSMART LOGO (DOCUMENT + CHECK + PROGRESS)
// ============================================================
export function EdusmartLogo({ size = 34, showText = true, subtitle = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: 'linear-gradient(135deg, #0F1E3D 0%, #1E3A8A 50%, #0284C7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
        flexShrink: 0
      }}>
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none">
          {/* Document shape with folded corner */}
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="rgba(255,255,255,0.15)" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Checkmark */}
          <path d="M8 12.5L10.5 15L16 9.5" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Progress ascending lines */}
          <path d="M8 19H16" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

      {showText && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'inherit', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            EDUSMART
          </div>
          {subtitle && (
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Plataforma Educativa
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 2. SIDEBAR EDUSMART (NAVEGACIÓN DIRECTA Y LIMPIA)
// ============================================================
export function Sidebar({ user, activeSection, onNavigate, onLogout, notifCount = 0, isOpen = false, onCloseMobile }) {
  const role = user?.rol || 'ESTUDIANTE';

  // Navegación canónica según requerimiento oficial
  const NAV_ITEMS = role === 'DOCENTE' ? [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'espacios', label: 'Mis espacios', icon: BookOpen },
    { id: 'tareas', label: 'Tareas', icon: CheckSquare },
    { id: 'entregas', label: 'Entregas', icon: Inbox },
    { id: 'resultados', label: 'Resultados', icon: BarChart2 },
    { id: 'reportes', label: 'Reportes', icon: FileText },
  ] : [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'espacios', label: 'Mis espacios', icon: BookOpen },
    { id: 'mis-tareas', label: 'Mis tareas', icon: CheckSquare },
    { id: 'resultados', label: 'Resultados', icon: TrendingUp },
    { id: 'dashboard', label: 'Retos IA', icon: Target, highlight: true },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-header" style={{ cursor: 'pointer' }} onClick={() => onNavigate('dashboard')}>
          <EdusmartLogo size={36} />
        </div>

        {/* User Card */}
        <div className="sidebar-user" onClick={() => onNavigate('mi-perfil')} style={{ cursor: 'pointer' }}>
          <div className="sidebar-avatar">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.nombre_completo} />
            ) : (
              <span>{user?.nombre_completo?.charAt(0) || 'U'}</span>
            )}
            <div className="presence-status" title="En línea" />
          </div>
          <div className="sidebar-user-details">
            <div className="sidebar-user-name" title={user?.nombre_completo}>
              {user?.nombre_completo || 'Usuario'}
            </div>
            <span className={`sidebar-user-role ${role === 'DOCENTE' ? 'role-badge-docente' : 'role-badge-estudiante'}`}>
              {role === 'DOCENTE' ? 'Docente' : 'Estudiante'}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Menu: Perfil y Logout */}
        <div className="sidebar-footer">
          <button
            className={`btn-logout ${activeSection === 'mi-perfil' ? 'active' : ''}`}
            onClick={() => onNavigate('mi-perfil')}
            style={{ marginBottom: 6 }}
          >
            <User size={16} />
            <span>Mi perfil</span>
          </button>
          <button className="btn-logout" onClick={onLogout}>
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ============================================================
// 3. TOPBAR EDUSMART CON BÚSQUEDA GLOBAL Y ACCIONES RÁPIDAS
// ============================================================
export function Topbar({
  title,
  subtitle,
  user,
  notifCount = 0,
  onOpenNotifications,
  onOpenQuickAction,
  onToggleMobileMenu,
  onNavigate,
  onSearch
}) {
  const isDocente = user?.rol === 'DOCENTE';
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch?.(val);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="btn-icon mobile-only"
          onClick={onToggleMobileMenu}
          aria-label="Abrir menú"
          style={{ display: 'none' }}
        >
          <Menu size={18} />
        </button>

        <div className="topbar-title">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {/* Global Search Bar */}
      <div style={{ flex: 1, maxWidth: 360, margin: '0 20px', position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Buscar espacios, tareas, notas..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            paddingLeft: 34,
            paddingRight: 12,
            height: 36,
            borderRadius: 20,
            fontSize: 12.5,
            border: '1px solid #E2E8F0',
            background: '#F8FAFC'
          }}
        />
      </div>

      <div className="topbar-right">
        {/* Quick action button depending on role */}
        {isDocente ? (
          <button
            className="topbar-action-btn"
            onClick={onOpenQuickAction}
            style={{ background: '#1E3A8A', color: 'white', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} />
            <span>Nueva tarea</span>
          </button>
        ) : (
          <button
            className="topbar-action-btn"
            onClick={onOpenQuickAction}
            style={{ background: '#0284C7', color: 'white', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} />
            <span>Unirme a espacio</span>
          </button>
        )}

        {/* Notification Bell */}
        <button
          className="btn-icon"
          onClick={onOpenNotifications}
          aria-label="Notificaciones"
          title="Centro de Notificaciones"
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
          {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
        </button>

        {/* User Mini Avatar Link */}
        <div
          onClick={() => onNavigate?.('mi-perfil')}
          title="Ver mi perfil"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
            background: '#F1F5F9', border: '1px solid #E2E8F0'
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            overflow: 'hidden', background: '#1E3A8A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 700
          }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.nombre_completo?.charAt(0) || 'U'
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
            {user?.first_name || user?.nombre_completo?.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// 4. SIGNATURE TASK PROGRESS PIPELINE (SECTION 16 & 35)
// ASIGNADA -> EN PROCESO -> ENTREGADA -> EN REVISIÓN -> CALIFICADA -> RETROALIMENTADA
// ============================================================
export function TaskPipeline({ pipelineData, status = 'ASIGNADA', grade = null, hasFeedback = false }) {
  const PIPELINE_STEPS = [
    { id: 'ASIGNADA', label: 'Asignada', desc: 'Tarea publicada por el docente' },
    { id: 'EN_PROCESO', label: 'En proceso', desc: 'Estudiante trabajando en la tarea' },
    { id: 'ENTREGADA', label: 'Entregada', desc: 'Documento enviado con éxito' },
    { id: 'EN_REVISION', label: 'En revisión', desc: 'Docente evaluando el trabajo' },
    { id: 'CALIFICADA', label: 'Calificada', desc: 'Nota asignada' },
    { id: 'RETROALIMENTADA', label: 'Retroalimentada', desc: 'Observaciones y mejoras recibidas' },
  ];

  // Determine current active step index
  const getStepIndex = (st) => {
    switch (st) {
      case 'ASIGNADA': return 0;
      case 'EN_PROCESO': return 1;
      case 'ENTREGADO':
      case 'ENTREGADA':
      case 'ATRASADO': return 2;
      case 'EN_REVISION': return 3;
      case 'CALIFICADO':
      case 'CALIFICADA': return hasFeedback ? 5 : 4;
      case 'RETROALIMENTADA': return 5;
      case 'VENCIDA': return 0;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const fillWidth = `${(currentIndex / (PIPELINE_STEPS.length - 1)) * 100}%`;

  return (
    <div className="pipeline-container">
      <div className="pipeline-header">
        <h3>
          <Activity size={18} color="#0284C7" />
          <span>Ciclo de Vida de la Tarea</span>
        </h3>
        <span className={`pipeline-status-badge ${
          status === 'RETROALIMENTADA' || status === 'CALIFICADA'
            ? 'role-badge-estudiante'
            : status === 'VENCIDA'
            ? 'badge-danger'
            : 'role-badge-docente'
        }`}>
          Estado: {status}
        </span>
      </div>

      <div className="pipeline-track">
        <div className="pipeline-track-fill" style={{ width: fillWidth }} />

        {PIPELINE_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div
              key={step.id}
              className={`pipeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="pipeline-step-node">
                {isCompleted ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className="pipeline-step-title">{step.label}</span>
              <span className="pipeline-step-date">
                {idx === 4 && grade !== null ? `${grade}/100` : idx === 0 ? 'Publicada' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 5. NOTIFICATION DROPDOWN PANEL
// ============================================================
export function NotificationPanel({ notifications = [], onMarkRead, onClose }) {
  return (
    <div className="dropdown-notifications">
      <div className="dropdown-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} color="#1E3A8A" />
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>Notificaciones Académicas</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={onMarkRead} style={{ fontSize: 11 }}>
            Marcar leídas
          </button>
          <button className="btn-icon" onClick={onClose} style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="dropdown-list">
        {notifications.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No tienes notificaciones pendientes.
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`dropdown-item ${!n.leida ? 'unread' : ''}`}>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>{n.mensaje}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} />
                <span>{new Date(n.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// 6. REUSABLE MODAL
// ============================================================
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// 7. MODAL: UNIRSE A ESPACIO (ESTUDIANTE)
// ============================================================
export function JoinSpaceModal({ open, onClose, onSuccess }) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) {
      setError('Por favor ingrese el código del espacio (ej. BD2026).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await onSuccess(codigo.trim().toUpperCase());
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo unir al espacio. Verifique el código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Unirme a un Espacio Académico">
      <form onSubmit={handleSubmit}>
        <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 16 }}>
          Introduce el código único proporcionado por tu docente (por ejemplo: <strong>BD2026</strong> o <strong>PROG2026</strong>) para incorporarte al espacio y acceder a todas sus tareas.
        </p>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="space-code">Código del espacio:</label>
          <input
            id="space-code"
            className="form-control"
            placeholder="Ej. BD2026"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Verificando...' : 'Unirme al espacio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// 8. MODAL: CREAR ESPACIO (DOCENTE)
// ============================================================
export function CreateSpaceModal({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigo: '',
    color: '#1E3A8A',
    icono: 'database'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre del espacio es obligatorio (ej. Base de Datos I).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear el espacio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Crear Espacio Académico">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Nombre de la materia / espacio:</label>
          <input
            className="form-control"
            placeholder="Ej. Base de Datos I"
            value={formData.nombre}
            onChange={(e) => setFormData(p => ({ ...p, nombre: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descripción:</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Materia correspondiente al modelado relacional y bases de datos..."
            value={formData.descripcion}
            onChange={(e) => setFormData(p => ({ ...p, descripcion: e.target.value }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Código del espacio:</label>
            <input
              className="form-control"
              placeholder="Ej. BD2026 (opcional)"
              value={formData.codigo}
              onChange={(e) => setFormData(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
              style={{ textTransform: 'uppercase' }}
            />
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Si se deja vacío, se genera automáticamente.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Color distintivo:</label>
            <select
              className="form-control"
              value={formData.color}
              onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))}
            >
              <option value="#1E3A8A">Azul Académico (#1E3A8A)</option>
              <option value="#0284C7">Cyan Académico (#0284C7)</option>
              <option value="#4338CA">Índigo (#4338CA)</option>
              <option value="#0D9488">Verde Azulado (#0D9488)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear espacio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// 9. MODAL: CREAR TAREA (DOCENTE)
// ============================================================
export function CreateTaskModal({ open, onClose, espacios = [], onSubmit }) {
  const [formData, setFormData] = useState({
    espacio_id: espacios[0]?.id || '',
    titulo: '',
    descripcion: '',
    indicaciones: '',
    puntaje_maximo: 100,
    fecha_limite: '',
    material_nombre: '',
    material_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (espacios.length > 0 && !formData.espacio_id) {
      setFormData(p => ({ ...p, espacio_id: espacios[0].id }));
    }
  }, [espacios]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.fecha_limite) {
      setError('Por favor complete el título y la fecha límite.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al publicar la tarea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Publicar Nueva Tarea Académica">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Espacio Académico:</label>
          <select
            className="form-control"
            value={formData.espacio_id}
            onChange={(e) => setFormData(p => ({ ...p, espacio_id: e.target.value }))}
            required
          >
            {espacios.map(esp => (
              <option key={esp.id} value={esp.id}>{esp.nombre} ({esp.codigo})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Título de la tarea:</label>
          <input
            className="form-control"
            placeholder="Ej. Diseño de Base de Datos"
            value={formData.titulo}
            onChange={(e) => setFormData(p => ({ ...p, titulo: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descripción general:</label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Breve resumen del objetivo de la tarea..."
            value={formData.descripcion}
            onChange={(e) => setFormData(p => ({ ...p, descripcion: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Indicaciones detalladas:</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="1. Requisitos técnicos&#10;2. Formato de entrega&#10;3. Criterios de evaluación"
            value={formData.indicaciones}
            onChange={(e) => setFormData(p => ({ ...p, indicaciones: e.target.value }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Fecha límite:</label>
            <input
              type="datetime-local"
              className="form-control"
              value={formData.fecha_limite}
              onChange={(e) => setFormData(p => ({ ...p, fecha_limite: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Puntaje máximo:</label>
            <input
              type="number"
              className="form-control"
              value={formData.puntaje_maximo}
              onChange={(e) => setFormData(p => ({ ...p, puntaje_maximo: e.target.value }))}
              min={1}
              max={100}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Archivo adjunto / Guía docente (opcional):</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input
              className="form-control"
              placeholder="Nombre del archivo (ej. Guia_Practica.pdf)"
              value={formData.material_nombre}
              onChange={(e) => setFormData(p => ({ ...p, material_nombre: e.target.value }))}
            />
            <input
              className="form-control"
              placeholder="URL del archivo adjunto"
              value={formData.material_url}
              onChange={(e) => setFormData(p => ({ ...p, material_url: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Publicando...' : 'Publicar tarea'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// 10. MODAL: REVISAR, CALIFICAR Y RETROALIMENTAR (DOCENTE)
// ============================================================
export function GradeSubmissionModal({ open, onClose, submission, onSave }) {
  const [nota, setNota] = useState('');
  const [retroalimentacion, setRetroalimentacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (submission) {
      setNota(submission.nota_num !== null && submission.nota_num !== undefined ? String(submission.nota_num) : '');
      setRetroalimentacion(submission.retroalimentacion || '');
    }
  }, [submission]);

  if (!submission) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nota === '' || isNaN(nota) || Number(nota) < 0 || Number(nota) > 100) {
      setError('Por favor ingrese una calificación válida entre 0 y 100.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSave(submission.entrega_id, {
        nota: Number(nota),
        retroalimentacion: retroalimentacion.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la evaluación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Revisión y Calificación Académica">
      <form onSubmit={handleSubmit}>
        {/* Student & Submission Details */}
        <div style={{
          background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
          padding: 16, marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: '#1E3A8A',
              color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, overflow: 'hidden'
            }}>
              {submission.estudiante_avatar ? (
                <img src={submission.estudiante_avatar} alt={submission.estudiante_nombre} style={{ width: '100%', height: '100%' }} />
              ) : (
                submission.estudiante_nombre?.charAt(0) || 'E'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{submission.estudiante_nombre}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Entregado el: {submission.fecha_entrega ? new Date(submission.fecha_entrega).toLocaleString() : 'Fecha no registrada'}
              </div>
            </div>
          </div>

          {submission.archivo_url && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: 6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#2563EB" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{submission.archivo_nombre || 'archivo_entregado.pdf'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={submission.archivo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Eye size={13} /> Ver archivo
                </a>
              </div>
            </div>
          )}

          {submission.observaciones && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: '#475569' }}>
              <strong>Comentario del estudiante:</strong> "{submission.observaciones}"
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Calificación (0 - 100):</label>
          <input
            type="number"
            className="form-control"
            placeholder="Ej. 85"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            min={0}
            max={100}
            style={{ fontSize: 16, fontWeight: 700, width: 140 }}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Retroalimentación cualitativa:</label>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Ej. Buen trabajo. La estructura de la base de datos está correctamente planteada. Se recomienda mejorar la normalización de la tabla de estudiantes..."
            value={retroalimentacion}
            onChange={(e) => setRetroalimentacion(e.target.value)}
          />
          <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, display: 'block' }}>
            La retroalimentación formativa será visible de inmediato para el estudiante en su dashboard y ciclo de vida de la tarea.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar evaluación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// 11. MODAL: PRESENTAR TAREA (ESTUDIANTE)
// ============================================================
export function SubmitTaskModal({ open, onClose, tarea, onSubmit }) {
  const [fileName, setFileName] = useState('');
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setSubmittedSuccess(false);
      setFileName('');
      setComentario('');
      setError('');
    }
  }, [open]);

  if (!tarea) return null;

  const handleSimulatedFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalFile = fileName || `${tarea.titulo.replace(/\s+/g, '_')}_Entrega.pdf`;
    setLoading(true);
    setError('');
    try {
      await onSubmit(tarea.id, {
        archivo_nombre: finalFile,
        archivo_url: `https://edusmart.cloud/storage/entregas/${finalFile}`,
        archivo_tamano: '2.4 MB',
        observaciones: comentario.trim()
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Error al presentar la tarea.');
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Presentar Tarea: ${tarea.titulo}`}>
      {submittedSuccess ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5',
            color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h3 style={{ fontSize: 18, color: '#065F46', marginBottom: 6 }}>
            Entrega realizada correctamente.
          </h3>
          <p style={{ fontSize: 13, color: '#475569' }}>
            Tu docente ha sido notificado y la tarea avanzó en tu progreso académico.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, marginBottom: 18, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>{tarea.espacio_nombre}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Fecha límite: {new Date(tarea.fecha_limite).toLocaleString()}
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Drag & drop or select file */}
          <div className="form-group">
            <label className="form-label">Archivo de la tarea (PDF, DOCX, ZIP):</label>
            <div style={{
              border: '2px dashed #CBD5E1', borderRadius: 8, padding: '24px 16px',
              textAlign: 'center', background: '#F8FAFC', cursor: 'pointer', position: 'relative'
            }}>
              <UploadCloud size={32} color="#0284C7" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>
                {fileName ? fileName : 'Seleccionar archivo o arrastrarlo aquí'}
              </div>
              <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>
                Formatos permitidos: PDF, Word, Presentación, Código (Hasta 25MB)
              </div>
              <input
                type="file"
                onChange={handleSimulatedFile}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Comentarios u observaciones para el docente:</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Escribe alguna aclaración o detalle sobre tu trabajo..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando trabajo...' : 'Presentar tarea'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ============================================================
// 12. LOADING SPINNER
// ============================================================
export function Loading({ text = 'Cargando información académica...' }) {
  return (
    <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{
        width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#0284C7',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#64748B' }}>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ============================================================
// 13. ALERT COMPONENT
// ============================================================
export function Alert({ children, type = 'info', onClose }) {
  const colors = {
    info: { bg: '#E0F2FE', border: '#BAE6FD', text: '#0369A1', icon: '#0EA5E9' },
    success: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', icon: '#10B981' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '#F59E0B' },
    error: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: '#EF4444' }
  };
  
  const style = colors[type] || colors.info;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      padding: '12px 16px',
      backgroundColor: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: '6px',
      marginBottom: '16px'
    }}>
      <div style={{ color: style.icon, marginRight: '12px', marginTop: '2px' }}>
        {type === 'error' ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
      </div>
      <div style={{ flex: 1, color: style.text, fontSize: '13.5px', lineHeight: '1.5' }}>
        {children}
      </div>
      {onClose && (
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: style.text,
          cursor: 'pointer',
          padding: '2px',
          marginLeft: '8px',
          opacity: 0.7
        }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// 14. EMPTY STATE
// ============================================================
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center', backgroundColor: '#FFFFFF',
      border: '1px dashed #CBD5E1', borderRadius: '12px'
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B',
        marginBottom: '16px'
      }}>
        {Icon ? <Icon size={32} /> : <AlertCircle size={32} />}
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '300px', marginBottom: action ? '24px' : '0' }}>
        {description}
      </p>
      {action && action}
    </div>
  );
}

// ============================================================
// 15. PROGRESS BAR
// ============================================================
export function ProgressBar({ progress, value, color = '#0284C7', height = 8, showLabel = false }) {
  const pct = Math.max(0, Math.min(100, progress ?? value ?? 0));
  const colorMap = { success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#0284C7' };
  const resolvedColor = colorMap[color] || color;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, backgroundColor: '#E2E8F0', borderRadius: height / 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          backgroundColor: resolvedColor,
          width: `${pct}%`,
          transition: 'width 0.5s ease'
        }} />
      </div>
      {showLabel && <span style={{ fontSize: '11px', fontWeight: 600, color: '#616161', minWidth: 30 }}>{pct}%</span>}
    </div>
  );
}

// ============================================================
// 16. STAT CARD
// ============================================================
export function StatCard({ title, value, icon: Icon, trend, trendLabel, color = '#0284C7' }) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px',
      border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#64748B' }}>{title}</div>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          backgroundColor: `${color}15`, color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}>
          <span style={{ color: trend > 0 ? '#10B981' : (trend < 0 ? '#EF4444' : '#64748B') }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span style={{ color: '#94A3B8' }}>{trendLabel || 'vs mes anterior'}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 17. MINI BAR CHART (PLACEHOLDER)
// ============================================================
export function MiniBarChart({ data = [] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px' }}>
      {data.map((val, i) => (
        <div key={i} style={{
          flex: 1, backgroundColor: '#BAE6FD', borderRadius: '2px', minWidth: '4px',
          height: `${Math.max(10, Math.min(100, val))}%`
        }} />
      ))}
    </div>
  );
}

// ============================================================
// 18. DONUT CHART (PLACEHOLDER)
// ============================================================
export function DonutChart({ value, label, color = '#0284C7' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '120px', height: '120px', borderRadius: '50%',
        background: `conic-gradient(${color} ${value}%, #E2E8F0 ${value}%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: '90px', height: '90px', backgroundColor: '#FFFFFF', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>{value}%</span>
        </div>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>{label}</span>
    </div>
  );
}

// ============================================================
// 19. LINE CHART (PLACEHOLDER)
// ============================================================
export function LineChart({ data = [] }) {
  return (
    <div style={{ height: '200px', width: '100%', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '13px', color: '#94A3B8' }}>Gráfico de Rendimiento (Simulado)</span>
    </div>
  );
}
