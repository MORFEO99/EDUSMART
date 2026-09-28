import { useState, useEffect } from 'react';
import { TrendingUp, Award, Clock, AlertTriangle, BookOpen, CheckCircle, BarChart2 } from 'lucide-react';
import { studentAPI } from '../api';
import { Loading, DonutChart, MiniBarChart, LineChart, ProgressBar } from '../components';
import { getNoteColor } from '../utils';

export default function StudentProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.progress().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Calculando indicadores de progreso académico..." />;
  if (!data) return null;

  const { metricas_generales: m, materias, evolucion_calificaciones, resumen_texto } = data;

  const donutData = [
    { label: 'Entregadas', value: m.tareas_completadas, color: '#107C41' },
    { label: 'Pendientes', value: m.tareas_pendientes, color: '#CA5010' },
    { label: 'Vencidas', value: m.tareas_vencidas, color: '#A80000' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
          Mi Progreso Académico
        </h2>
        <p style={{ color: '#616161', fontSize: '12.5px' }}>{resumen_texto}</p>
      </div>

      {/* Overview stat cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-icon blue"><TrendingUp size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.promedio_general}</div>
            <div className="stat-card-label">Promedio General</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><CheckCircle size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.porcentaje_entregadas}%</div>
            <div className="stat-card-label">Tareas Entregadas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon yellow"><Clock size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.tareas_pendientes}</div>
            <div className="stat-card-label">Tareas Pendientes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><AlertTriangle size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.tareas_vencidas}</div>
            <div className="stat-card-label">Tareas Vencidas</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart2 size={16} /> Distribución de tareas</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <DonutChart
              value={m.tareas_completadas}
              max={Math.max(m.tareas_completadas + m.tareas_pendientes + m.tareas_vencidas, 1)}
              color="#107C41"
              size={110}
              strokeWidth={12}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {donutData.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '2px', background: d.color }} />
                  <div>
                    <div style={{ fontSize: '11.5px', color: '#616161' }}>{d.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#242424' }}>{d.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grade Evolution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><TrendingUp size={16} /> Histórico de calificaciones</span>
          </div>
          <div className="card-body">
            {evolucion_calificaciones?.length > 0 ? (
              <div>
                <LineChart
                  data={evolucion_calificaciones.map(c => ({ value: c.nota, label: c.fecha }))}
                  width={340}
                  height={90}
                  color="#5B5FC7"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  {evolucion_calificaciones.slice(-5).map((c, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: getNoteColor(c.nota), fontSize: '13px' }}>{c.nota}</div>
                      <div style={{ fontSize: '10.5px', color: '#8A8886' }}>{c.fecha}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#8A8886', textAlign: 'center', padding: '24px 0', fontSize: '12.5px' }}>
                Aún no tienes calificaciones registradas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress by subject */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><BookOpen size={16} /> Avance por Asignatura</span>
        </div>
        <div className="card-body">
          {materias?.length === 0 ? (
            <p style={{ color: '#8A8886', textAlign: 'center', padding: '24px 0', fontSize: '12.5px' }}>
              Sin asignaturas registradas.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {materias?.map((mat, i) => (
                <div key={i} style={{ borderBottom: i < materias.length - 1 ? '1px solid #EDEBE9' : 'none', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#242424', fontSize: '13.5px' }}>{mat.materia}</span>
                      <span style={{ marginLeft: 8, fontSize: '11.5px', color: '#8A8886' }}>({mat.codigo})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: '12px', color: '#616161' }}>{mat.tareas_entregadas} de {mat.tareas_totales} entregadas</span>
                      {mat.promedio > 0 && (
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: getNoteColor(mat.promedio) }}>
                          {mat.promedio}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <ProgressBar value={mat.porcentaje_cumplimiento} color={mat.promedio >= 85 ? 'success' : mat.promedio >= 60 ? 'primary' : 'warning'} height={8} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '11px', color: '#8A8886' }}>
                    <span>Cumplimiento: {mat.porcentaje_cumplimiento}%</span>
                    <span style={{ color: mat.tareas_pendientes > 0 ? '#CA5010' : '#107C41', fontWeight: 600 }}>
                      {mat.tareas_pendientes} pendiente(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
