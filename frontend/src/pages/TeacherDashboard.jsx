import { useState, useEffect } from 'react';
import {
  FolderGit2, CheckSquare, Inbox, Award, Plus, ArrowRight,
  Clock, CheckCircle2, AlertCircle, FileText, User
} from 'lucide-react';
import { dashboardAPI } from '../api';
import { Loading } from '../components';

export default function TeacherDashboard({ onNavigate, onOpenCreateTask }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = () => {
    dashboardAPI.teacher()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (loading) return <Loading text="Cargando panel docente..." />;
  if (!data) return null;

  const { kpis, actividad_reciente, espacios, ultimas_tareas } = data;

  return (
    <div className="page-container">
      {/* Header matching Section 17 */}
      <div className="page-header">
        <div>
          <h1>Panel docente</h1>
          <p>Supervisa tus espacios académicos, publica tareas y evalúa los trabajos de tus estudiantes.</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('espacios')}>
            <FolderGit2 size={16} /> Ver espacios
          </button>
          <button className="btn btn-primary" onClick={onOpenCreateTask} style={{ background: '#1E3A8A' }}>
            <Plus size={16} /> Publicar tarea
          </button>
        </div>
      </div>

      {/* KPI Cards matching Section 17: Mis espacios, Tareas creadas, Entregas pendientes, Tareas calificadas */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('espacios')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-blue">
            <FolderGit2 size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Mis Espacios</div>
            <div className="kpi-value">{kpis.mis_espacios}</div>
            <div className="kpi-subtext">Materias activas</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('tareas')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-purple">
            <CheckSquare size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Tareas Creadas</div>
            <div className="kpi-value">{kpis.tareas_creadas}</div>
            <div className="kpi-subtext">Actividades publicadas</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('tareas')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-box kpi-icon-yellow">
            <Inbox size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Entregas Pendientes</div>
            <div className="kpi-value">{kpis.entregas_pendientes}</div>
            <div className="kpi-subtext">Por revisar y calificar</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box kpi-icon-green">
            <Award size={22} />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Tareas Calificadas</div>
            <div className="kpi-value">{kpis.tareas_calificadas}</div>
            <div className="kpi-subtext">Con nota y retroalimentación</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Overview & Recent Submissions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
        <div>
          {/* Últimas Tareas Publicadas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Tareas publicadas recientemente
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('tareas')}>
                Gestionar tareas
              </button>
            </div>

            <div className="tasks-list">
              {ultimas_tareas.map(t => (
                <div key={t.id} className="task-item-card">
                  <div className="task-main-col">
                    <div className="task-icon-status" style={{ background: '#EFF6FF', color: '#1E3A8A' }}>
                      <FileText size={20} />
                    </div>
                    <div className="task-title-group">
                      <h4>{t.titulo}</h4>
                      <div className="task-meta-row">
                        <span style={{ fontWeight: 600, color: '#1E3A8A' }}>{t.espacio_nombre}</span>
                        <span>•</span>
                        <span>Límite: {new Date(t.fecha_limite).toLocaleDateString()}</span>
                        <span>•</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>{t.total_entregas} entregas</span>
                      </div>
                    </div>
                  </div>

                  <div className="task-action-col">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onNavigate('tareas', { taskId: t.id })}
                    >
                      Ver entregas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actividad Reciente de Estudiantes (Section 17) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
              Entregas recientes de estudiantes
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('actividad')}>
              Feed completo
            </button>
          </div>

          <div className="activity-feed">
            {actividad_reciente.length === 0 ? (
              <div style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
                padding: '24px 20px', textAlign: 'center', color: '#64748B', fontSize: 13
              }}>
                Aún no hay entregas de estudiantes pendientes.
              </div>
            ) : (
              actividad_reciente.map((act, idx) => (
                <div key={idx} className="activity-feed-item">
                  <div className="activity-icon-badge" style={{
                    background: act.calificada ? '#ECFDF5' : '#FFFBEB',
                    color: act.calificada ? '#059669' : '#D97706'
                  }}>
                    {act.calificada ? <Award size={18} /> : <Inbox size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>
                      {act.titulo}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Espacio: <strong>{act.espacio}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      <span>{new Date(act.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onNavigate('tareas', { taskId: act.tarea_id })}
                    >
                      {act.calificada ? 'Ver nota' : 'Revisar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
