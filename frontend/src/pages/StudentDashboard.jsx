import { useState, useEffect } from 'react';
import {
  CheckSquare, Inbox, Award, TrendingUp, Clock, AlertCircle,
  FolderGit2, ArrowRight, FileText, CheckCircle2, ChevronRight, KeyRound
} from 'lucide-react';
import { dashboardAPI } from '../api';
import { Loading } from '../components';
import ModalUnirseEspacio from '../components/ModalUnirseEspacio';
import ChallengeBoard from '../components/ChallengeBoard';

export default function StudentDashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = () => {
    dashboardAPI.student()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (loading) return <Loading text="Cargando panel del estudiante..." />;
  if (!data) return null;

  const { kpis, actividad_reciente, proximas_tareas, mis_espacios } = data;
  const firstName = user?.first_name || user?.nombre_completo?.split(' ')[0] || 'Estudiante';

  return (
    <div className="page-container">
      {/* Header matching Section 9 */}
      <div className="page-header">
        <div>
          <h1>Buenos días, {firstName}</h1>
          <p>Aquí puedes consultar tus actividades y progreso académico.</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ background: '#1E3A8A', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowJoinModal(true)}
          >
            <KeyRound size={14} /> Unirme a un espacio
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

      {/* KPI Cards matching Section 9: TAREAS PENDIENTES, TAREAS ENTREGADAS, TAREAS POR CALIFICAR, PROMEDIO, PROGRESO */}
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
        <div className="kpi-card" onClick={() => onNavigate('tareas', { filtro: 'entregadas' })} style={{ cursor: 'pointer' }}>
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
        <div className="kpi-card">
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Left Column: Próximas Tareas */}
        <div>
          {/* Retos Educativos */}
          <ChallengeBoard userRole={user?.rol} />

          {/* Próximas Tareas */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Próximas tareas a entregar
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('tareas', { filtro: 'pendientes' })}
              >
                Ver pendientes
              </button>
            </div>

            {proximas_tareas?.length === 0 ? (
              <div style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
                padding: '24px 20px', textAlign: 'center', color: '#64748B'
              }}>
                <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontWeight: 600 }}>¡Estás al día con tus tareas!</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>No tienes entregas pendientes próximas a vencer.</div>
              </div>
            ) : (
              <div className="tasks-list">
                {proximas_tareas.map(t => (
                  <div key={t.id} className="task-item-card">
                    <div className="task-main-col">
                      <div className="task-icon-status" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                        <FileText size={20} />
                      </div>
                      <div className="task-title-group">
                        <h4>{t.titulo}</h4>
                        <div className="task-meta-row">
                          <span style={{ fontWeight: 600, color: '#1E3A8A' }}>{t.espacio_nombre}</span>
                          <span>•</span>
                          <span>Límite: {new Date(t.fecha_limite).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="task-action-col">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onNavigate('tareas', { taskId: t.id })}
                      >
                        Ver tarea
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Unirme a un espacio */}
      {showJoinModal && (
        <ModalUnirseEspacio
          onClose={() => setShowJoinModal(false)}
          onSuccess={(espacio) => {
            setShowJoinModal(false);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}
