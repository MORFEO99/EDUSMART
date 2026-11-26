import { useState, useEffect } from 'react';
import {
  Inbox, Award, TrendingUp, Clock, AlertCircle,
  ArrowRight, FileText, CheckCircle2, KeyRound,
  BookOpen, Bell, Check, MessageSquare, Sparkles, Filter
} from 'lucide-react';
import { dashboardAPI, notificacionesAPI } from '../api';
import { Loading } from '../components';
import ModalUnirseEspacio from '../components/ModalUnirseEspacio';

function getNotifConfig(tipo) {
  switch (tipo) {
    case 'CALIFICADA':
      return {
        icon: <Award size={18} />,
        bg: '#ECFDF5',
        color: '#059669',
        badge: 'Calificación',
        border: '#A7F3D0',
        actionLabel: 'Ver nota'
      };
    case 'RETROALIMENTACION':
      return {
        icon: <MessageSquare size={18} />,
        bg: '#EFF6FF',
        color: '#2563EB',
        badge: 'Retroalimentación',
        border: '#BFDBFE',
        actionLabel: 'Ver comentarios'
      };
    case 'NUEVA_TAREA':
      return {
        icon: <FileText size={18} />,
        bg: '#EEF2FF',
        color: '#4F46E5',
        badge: 'Nueva tarea',
        border: '#C7D2FE',
        actionLabel: 'Ver tarea'
      };
    case 'PROXIMA_VENCER':
      return {
        icon: <Clock size={18} />,
        bg: '#FFFBEB',
        color: '#D97706',
        badge: 'Por vencer',
        border: '#FDE68A',
        actionLabel: 'Entregar tarea'
      };
    case 'VENCIDA':
      return {
        icon: <AlertCircle size={18} />,
        bg: '#FEF2F2',
        color: '#DC2626',
        badge: 'Vencida',
        border: '#FECACA',
        actionLabel: 'Ver detalle'
      };
    case 'AVISO_NUEVO':
    case 'INVITACION_ESPACIO':
      return {
        icon: <Bell size={18} />,
        bg: '#F5F3FF',
        color: '#7C3AED',
        badge: 'Aviso',
        border: '#DDD6FE',
        actionLabel: 'Ver espacio'
      };
    default:
      return {
        icon: <Bell size={18} />,
        bg: '#F1F5F9',
        color: '#1E3A8A',
        badge: 'Notificación',
        border: '#E2E8F0',
        actionLabel: 'Ver detalle'
      };
  }
}

function formatNotifTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHrs < 24) return `Hace ${diffHrs} h`;
  if (diffDays === 1) return `Ayer, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function StudentDashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('todas');
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = () => {
    setLoading(true);
    dashboardAPI.student()
      .then(res => {
        setData(res);
        if (res.notificaciones) {
          setNotifications(res.notificaciones);
        } else {
          notificacionesAPI.list().then(setNotifications).catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await notificacionesAPI.markRead();
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (err) {
      console.error('Error al marcar notificaciones como leídas', err);
    } finally {
      setMarkingRead(false);
    }
  };

  if (loading) return <Loading text="Cargando panel del estudiante..." />;
  if (!data) return null;

  const { kpis, mis_espacios } = data;
  const firstName = user?.first_name || user?.nombre_completo?.split(' ')[0] || 'Estudiante';

  const unreadCount = notifications.filter(n => !n.leida).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'no_leidas') return !n.leida;
    if (filterType === 'calificaciones') return n.tipo === 'CALIFICADA' || n.tipo === 'RETROALIMENTACION';
    if (filterType === 'tareas') return n.tipo === 'NUEVA_TAREA' || n.tipo === 'PROXIMA_VENCER' || n.tipo === 'VENCIDA' || n.tipo === 'AVISO_NUEVO';
    return true;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Buenos días, {firstName}</h1>
          <p>Aquí puedes consultar tus actividades, notificaciones y progreso académico.</p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ background: '#1E3A8A', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowJoinModal(true)}
          >
            <KeyRound size={14} /> Unirme a un espacio
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: '#059669', color: '#FFFFFF', border: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600
            }}
            onClick={() => {
              const stId = user?.estudiante_id || user?.perfil_estudiante?.id;
              if (stId) {
                window.open(`/api/v2/estudiantes/${stId}/boletin-pdf/`, '_blank');
              } else {
                alert('Descargando tu boletín académico oficial...');
                window.open(`/api/v2/estudiantes/1/boletin-pdf/`, '_blank');
              }
            }}
            title="Descargar boletín oficial de calificaciones en formato PDF"
          >
            <FileText size={14} /> <span>Descargar Boletín (PDF)</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('tareas')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Ver mis tareas</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards: TAREAS PENDIENTES, TAREAS ENTREGADAS, POR CALIFICAR, PROMEDIO, PROGRESO */}
      <div className="kpi-grid">
        {/* 1. Tareas Pendientes */}
        <div className="kpi-card" onClick={() => onNavigate('tareas', { filtro: 'pendientes' })} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-yellow">
            <Clock size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Tareas Pendientes</div>
            <div className="kpi-value">{kpis.tareas_pendientes}</div>
            <div className="kpi-subtext">Por entregar</div>
          </div>
        </div>

        {/* 2. Tareas Entregadas */}
        <div className="kpi-card" onClick={() => onNavigate('tareas', { filtro: 'entregadas_calificadas' })} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-blue">
            <Inbox size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Tareas Entregadas</div>
            <div className="kpi-value">{kpis.tareas_entregadas}</div>
            <div className="kpi-subtext">Enviadas al docente</div>
          </div>
        </div>

        {/* 3. Tareas por Calificar */}
        <div className="kpi-card" onClick={() => onNavigate('tareas', { filtro: 'entregadas_calificadas' })} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-cyan">
            <AlertCircle size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Por Calificar</div>
            <div className="kpi-value">{kpis.tareas_por_calificar}</div>
            <div className="kpi-subtext">En revisión docente</div>
          </div>
        </div>

        {/* 4. Promedio */}
        <div className="kpi-card" onClick={() => onNavigate('progreso')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-purple">
            <Award size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Promedio</div>
            <div className="kpi-value">{kpis.promedio > 0 ? `${kpis.promedio}/100` : 'Sin nota'}</div>
            <div className="kpi-subtext">Rendimiento global</div>
          </div>
        </div>

        {/* 5. Progreso */}
        <div className="kpi-card" onClick={() => onNavigate('progreso')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-green">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Progreso</div>
            <div className="kpi-value">{kpis.porcentaje_progreso}%</div>
            <div className="kpi-subtext">Cumplimiento total</div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Notificaciones Académicas y Mis Materias */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 24, alignItems: 'start' }}>
        {/* Columna Izquierda: Centro de Notificaciones Académicas */}
        <div>
          {/* Header de Notificaciones */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14, flexWrap: 'wrap', gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #1E3A8A 0%, #0284C7 100%)',
                color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
              }}>
                <Bell size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Notificaciones Académicas
                  {unreadCount > 0 && (
                    <span style={{
                      background: '#EF4444', color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 12
                    }}>
                      {unreadCount} nuevas
                    </span>
                  )}
                </h3>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllRead}
                disabled={markingRead}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Check size={13} color="#059669" />
                <span>{markingRead ? 'Actualizando...' : 'Marcar todas leídas'}</span>
              </button>
            )}
          </div>

          {/* Filtros de Notificaciones */}
          <div style={{
            display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4
          }}>
            {[
              { id: 'todas', label: 'Todas', count: notifications.length },
              { id: 'no_leidas', label: 'No leídas', count: unreadCount },
              { id: 'calificaciones', label: 'Calificaciones', count: notifications.filter(n => n.tipo === 'CALIFICADA' || n.tipo === 'RETROALIMENTACION').length },
              { id: 'tareas', label: 'Tareas y Avisos', count: notifications.filter(n => n.tipo === 'NUEVA_TAREA' || n.tipo === 'PROXIMA_VENCER' || n.tipo === 'VENCIDA' || n.tipo === 'AVISO_NUEVO').length },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: filterType === f.id ? '1px solid #1E3A8A' : '1px solid #E2E8F0',
                  background: filterType === f.id ? '#1E3A8A' : '#FFFFFF',
                  color: filterType === f.id ? '#FFFFFF' : '#475569',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                }}
              >
                <span>{f.label}</span>
                <span style={{
                  fontSize: 10.5, padding: '1px 5px', borderRadius: 6,
                  background: filterType === f.id ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                  color: filterType === f.id ? '#FFFFFF' : '#64748B'
                }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Lista de Notificaciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredNotifications.length === 0 ? (
              <div style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
                padding: '36px 24px', textAlign: 'center', color: '#64748B'
              }}>
                <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>¡Estás al día!</div>
                <div style={{ fontSize: 12.5, marginTop: 4, color: '#64748B' }}>
                  {filterType === 'no_leidas'
                    ? 'No tienes notificaciones pendientes sin leer.'
                    : 'No hay notificaciones en esta categoría.'}
                </div>
              </div>
            ) : (
              filteredNotifications.map(n => {
                const conf = getNotifConfig(n.tipo);
                return (
                  <div
                    key={n.id}
                    style={{
                      background: n.leida ? '#FFFFFF' : '#F0F9FF',
                      border: n.leida ? '1px solid #E2E8F0' : '1px solid #BAE6FD',
                      borderLeft: n.leida ? '1px solid #E2E8F0' : '4px solid #0284C7',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: conf.bg, color: conf.color,
                        border: `1px solid ${conf.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {conf.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: 4,
                            background: conf.bg, color: conf.color,
                            border: `1px solid ${conf.border}`
                          }}>
                            {conf.badge}
                          </span>
                          {!n.leida && (
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%',
                              backgroundColor: '#0284C7', display: 'inline-block'
                            }} />
                          )}
                          <span style={{ fontSize: 11, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />
                            {formatNotifTime(n.fecha)}
                          </span>
                        </div>

                        <div style={{
                          fontWeight: n.leida ? 500 : 700,
                          fontSize: 13.5,
                          color: '#0F172A',
                          lineHeight: 1.4,
                          wordBreak: 'break-word'
                        }}>
                          {n.mensaje}
                        </div>
                      </div>
                    </div>

                    {/* Botón de acción contextual */}
                    <div style={{ flexShrink: 0 }}>
                      {n.tarea_id ? (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                          onClick={() => onNavigate('tareas', { taskId: n.tarea_id })}
                        >
                          {conf.actionLabel}
                        </button>
                      ) : n.espacio_id ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                          onClick={() => onNavigate('espacio_detail', { espacioId: n.espacio_id })}
                        >
                          Ver espacio
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Mis Materias Activas */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: '#EEF2FF',
                color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BookOpen size={18} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Mis Materias Activas
              </h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('espacios')}
              style={{ fontSize: 12 }}
            >
              Ver todas ({mis_espacios?.length || 0})
            </button>
          </div>

          {(!mis_espacios || mis_espacios.length === 0) ? (
            <div style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
              padding: '24px 20px', textAlign: 'center', color: '#64748B', fontSize: 13
            }}>
              No estás inscrito en materias actualmente.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mis_espacios.map(esp => (
                <div
                  key={esp.id}
                  onClick={() => onNavigate('espacio_detail', { espacioId: esp.id })}
                  style={{
                    background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
                    padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#1E3A8A';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 58, 138, 0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: '#F0F9FF', color: '#0284C7',
                      border: '1px solid #BAE6FD',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <BookOpen size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, color: '#1E3A8A',
                          background: '#EFF6FF', padding: '1px 6px', borderRadius: 4,
                          border: '1px solid #BFDBFE'
                        }}>
                          {esp.codigo || 'MAT'}
                        </span>
                      </div>
                      <div style={{
                        fontWeight: 700, fontSize: 13.5, color: '#0F172A',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {esp.nombre}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                        Docente: {esp.docente_nombre || 'Docente titular'}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Unirme a un espacio */}
      {showJoinModal && (
        <ModalUnirseEspacio
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}
