import { useState, useEffect } from 'react';
import { Award, MessageSquare, BookOpen, Clock, Calendar, CheckCircle, ChevronRight, User, Filter, Search, Building, TrendingUp, BarChart2, CheckSquare, AlertCircle, Target, Zap } from 'lucide-react';
import { studentAPI, dashboardAPI, progresoAPI } from '../api';
import { Loading, EmptyState, Modal, ProgressBar } from '../components';
import { formatDate, formatDateTime, getNoteColor } from '../utils';

// ============================================================
// STUDENT GRADES VIEW (LIBRO DE CALIFICACIONES DEL ESTUDIANTE)
// ============================================================
export function StudentGradesView({ onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    studentAPI.tasks('calificadas')
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const gradedTasks = tasks.filter(t => t.nota !== null && t.nota !== undefined);
  const filtered = gradedTasks.filter(t =>
    !search ||
    t.titulo.toLowerCase().includes(search.toLowerCase()) ||
    t.materia.toLowerCase().includes(search.toLowerCase())
  );

  const average = gradedTasks.length
    ? Math.round((gradedTasks.reduce((acc, t) => acc + (parseFloat(t.nota) || 0), 0) / gradedTasks.length) * 10) / 10
    : 0;

  const highest = gradedTasks.length
    ? Math.max(...gradedTasks.map(t => parseFloat(t.nota) || 0))
    : 0;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424' }}>Registro de Calificaciones</h2>
          <p style={{ fontSize: '12.5px', color: '#616161' }}>
            Listado oficial de calificaciones obtenidas en tus tareas evaluadas.
          </p>
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
          <input
            className="form-control"
            style={{ paddingLeft: 30, height: 32, fontSize: '12.5px' }}
            placeholder="Buscar por materia o tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loading text="Cargando tus calificaciones..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Sin calificaciones disponibles"
          description={search ? `No se encontraron registros para "${search}".` : 'Aún no se han publicado calificaciones para tus entregas.'}
        />
      ) : (
        <div className="teams-table-container">
          <table className="teams-table">
            <thead>
              <tr>
                <th>Tarea / Actividad</th>
                <th>Asignatura</th>
                <th>Docente</th>
                <th>Fecha de Calificación</th>
                <th>Puntaje</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const noteColor = getNoteColor(t.nota);
                const isPassed = t.nota >= 60;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: '#242424' }}>{t.titulo}</td>
                    <td>{t.materia}</td>
                    <td>{t.docente}</td>
                    <td>{t.entrega?.calificacion?.fecha_calificacion ? formatDate(t.entrega.calificacion.fecha_calificacion) : formatDate(t.fecha_limite)}</td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: noteColor }}>
                        {t.nota} <span style={{ fontSize: '11px', color: '#8A8886', fontWeight: 400 }}>/ {t.puntaje_maximo}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isPassed ? 'badge-calificada' : 'badge-vencida'}`}>
                        {isPassed ? 'Aprobado' : 'Requiere mejora'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedTask(t)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Task feedback modal */}
      <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title="Detalle de Calificación y Retroalimentación">
        {selectedTask && (
          <div>
            <div style={{ background: '#FAF9F8', padding: '14px 16px', borderRadius: '4px', border: '1px solid #EDEBE9', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#242424', marginBottom: 2 }}>{selectedTask.titulo}</div>
              <div style={{ fontSize: '12px', color: '#616161' }}>Asignatura: {selectedTask.materia} · Docente: {selectedTask.docente}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F0F1FA', borderRadius: '4px', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#242424' }}>Calificación final</span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: getNoteColor(selectedTask.nota) }}>
                {selectedTask.nota} <span style={{ fontSize: '13px', color: '#616161' }}>/ {selectedTask.puntaje_maximo}</span>
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#242424', marginBottom: 6 }}>
                Comentario de retroalimentación del docente:
              </div>
              <div style={{
                background: '#FFFFFF', border: '1px solid #EDEBE9', borderRadius: '4px',
                padding: '12px 14px', fontSize: '12.5px', color: '#242424', lineHeight: 1.5,
                borderLeft: '3px solid #5B5FC7'
              }}>
                {selectedTask.entrega?.calificacion?.retroalimentacion || 'El docente no ha adjuntado comentarios escritos adicionales.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedTask(null)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// STUDENT FEEDBACK VIEW (CENTRO DE RETROALIMENTACIÓN)
// ============================================================
export function StudentFeedbackView({ onNavigate }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.feedbacks()
      .then(setFeedbacks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
          Centro de Retroalimentación
        </h2>
        <p style={{ fontSize: '12.5px', color: '#616161' }}>
          Observaciones y sugerencias pedagógicas emitidas por tus docentes para potenciar tu aprendizaje.
        </p>
      </div>

      {loading ? (
        <Loading text="Cargando retroalimentaciones..." />
      ) : feedbacks.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Sin retroalimentaciones registradas"
          description="Cuando tus docentes califiquen tus tareas con comentarios, aparecerán aquí cronológicamente."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedbacks.map(f => (
            <div key={f.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    backgroundColor: '#5B5FC7', color: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: '12px', flexShrink: 0
                  }}>
                    {f.docente?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#242424' }}>{f.tarea_titulo}</div>
                    <div style={{ fontSize: '11.5px', color: '#616161' }}>{f.materia} · Docente: {f.docente}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: getNoteColor(f.nota) }}>
                    {f.nota} <span style={{ fontSize: '11px', color: '#8A8886', fontWeight: 400 }}>/ {f.puntaje_maximo}</span>
                  </span>
                  <div style={{ fontSize: '11px', color: '#8A8886' }}>{f.fecha}</div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#FAF9F8', border: '1px solid #EDEBE9',
                borderLeft: '3px solid #5B5FC7', borderRadius: '4px',
                padding: '12px 14px', fontSize: '12.5px', color: '#242424', lineHeight: 1.5
              }}>
                {f.comentario}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STUDENT ESPACIOS VIEW (CURSOS Y MATERIAS)
// ============================================================
export function StudentEspaciosView({ onNavigate }) {
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.student()
      .then(res => setEspacios(res.mis_espacios || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
          Mis Cursos y Materias
        </h2>
        <p style={{ fontSize: '12.5px', color: '#616161' }}>
          Listado de los colegios, cursos y materias en las que estás inscrito.
        </p>
      </div>

      {loading ? (
        <Loading text="Cargando tus espacios académicos..." />
      ) : espacios.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin espacios académicos"
          description="No estás inscrito en ningún curso o materia actualmente."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {espacios.map(esp => (
            <div
              key={esp.id}
              style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
                padding: 0, transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(30,58,138,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {/* Card header accent */}
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1E3A8A, #4F46E5, #7C3AED)' }} />

              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: '#1E3A8A', background: '#EFF6FF',
                    padding: '4px 8px', borderRadius: 4, letterSpacing: '0.03em'
                  }}>
                    {esp.codigo}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    📋 {esp.total_tareas} tareas
                  </span>
                </div>

                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 10, lineHeight: 1.3 }}>
                  {esp.nombre}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  {(esp.colegio_nombre || esp.curso_nombre) && (
                    <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building size={13} color="#64748B" />
                      <span>
                        <span style={{ fontWeight: 600 }}>{esp.colegio_nombre}</span>
                        {esp.colegio_nombre && esp.curso_nombre ? ' · ' : ''}
                        <span>{esp.curso_nombre}</span>
                      </span>
                    </div>
                  )}

                  {esp.materia_nombre && (
                    <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BookOpen size={13} color="#64748B" />
                      <span>Materia: <span style={{ fontWeight: 600 }}>{esp.materia_nombre}</span></span>
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} color="#64748B" />
                    <span>Docente: {esp.docente_nombre}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate('espacio_detail', { espacioId: esp.id }); }}
                    style={{
                      flex: 1, padding: '7px 0', background: '#EFF6FF', color: '#1E3A8A',
                      border: '1px solid #BFDBFE', borderRadius: 6, cursor: 'pointer',
                      fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                    }}
                  >
                    <BookOpen size={12} /> Ver Tareas
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate('espacio_detail', { espacioId: esp.id, defaultTab: 'retos' }); }}
                    style={{
                      flex: 1, padding: '7px 0',
                      background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
                      color: '#4F46E5',
                      border: '1px solid #C7D2FE', borderRadius: 6, cursor: 'pointer',
                      fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#E0E7FF'}
                    onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg, #EEF2FF, #F5F3FF)'}
                  >
                    <Target size={12} /> Retos IA
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STUDENT RESULTS VIEW (RESULTADOS ACADÉMICOS — VISTA PRINCIPAL)
// ============================================================
export function StudentResultsView({ onNavigate }) {
  const [progreso, setProgreso] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');

  useEffect(() => {
    Promise.all([
      progresoAPI.get().catch(() => null),
      studentAPI.tasks('calificadas').catch(() => [])
    ]).then(([prog, tasks]) => {
      setProgreso(prog);
      setTareas(Array.isArray(tasks) ? tasks : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Cargando tus resultados académicos..." />;

  const gradedTasks = tareas.filter(t => t.nota !== null && t.nota !== undefined);
  const average = gradedTasks.length
    ? Math.round((gradedTasks.reduce((acc, t) => acc + (parseFloat(t.nota) || 0), 0) / gradedTasks.length) * 10) / 10
    : 0;
  const highest = gradedTasks.length ? Math.max(...gradedTasks.map(t => parseFloat(t.nota) || 0)) : 0;
  const approved = gradedTasks.filter(t => parseFloat(t.nota) >= 60).length;

  // Group by materia
  const byMateria = {};
  gradedTasks.forEach(t => {
    const m = t.materia || 'General';
    if (!byMateria[m]) byMateria[m] = { tasks: [], total: 0, count: 0 };
    byMateria[m].tasks.push(t);
    byMateria[m].total += parseFloat(t.nota) || 0;
    byMateria[m].count += 1;
  });

  const getProgressColor = (val) => {
    if (val >= 80) return '#10B981';
    if (val >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Mis Resultados</h1>
          <p>Resumen de calificaciones, promedios y rendimiento académico general.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate?.('mi-progreso')}>
          <TrendingUp size={15} /> Ver progreso completo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-icon-purple"><Award size={22} /></div>
          <div className="kpi-info">
            <div className="kpi-label">Promedio General</div>
            <div className="kpi-value" style={{ color: getProgressColor(average) }}>{average > 0 ? `${average}/100` : '—'}</div>
            <div className="kpi-subtext">Sobre todas las materias</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-icon-blue"><CheckSquare size={22} /></div>
          <div className="kpi-info">
            <div className="kpi-label">Tareas Calificadas</div>
            <div className="kpi-value">{gradedTasks.length}</div>
            <div className="kpi-subtext">Con nota registrada</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-icon-green"><CheckCircle size={22} /></div>
          <div className="kpi-info">
            <div className="kpi-label">Aprobadas</div>
            <div className="kpi-value">{approved}</div>
            <div className="kpi-subtext">60 o más puntos</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-icon-yellow"><TrendingUp size={22} /></div>
          <div className="kpi-info">
            <div className="kpi-label">Nota Más Alta</div>
            <div className="kpi-value" style={{ color: '#10B981' }}>{highest > 0 ? `${highest}/100` : '—'}</div>
            <div className="kpi-subtext">Mejor desempeño</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="teams-tabs" style={{ marginBottom: 20 }}>
        <button className={`teams-tab ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => setActiveTab('resumen')}>
          <BarChart2 size={13} /> Por Materia
        </button>
        <button className={`teams-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
          <Award size={13} /> Todas las Notas
        </button>
      </div>

      {activeTab === 'resumen' && (
        <div>
          {Object.keys(byMateria).length === 0 ? (
            <EmptyState icon={Award} title="Sin calificaciones aún" description="Cuando el docente califique tus entregas, aparecerán aquí." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(byMateria).map(([materia, info]) => {
                const avg = Math.round((info.total / info.count) * 10) / 10;
                const pct = Math.min(100, avg);
                return (
                  <div key={materia} style={{
                    background: '#FFFFFF', border: '1px solid #E2E8F0',
                    borderRadius: 12, padding: '18px 20px',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 8,
                          background: 'linear-gradient(135deg, #1E3A8A, #0284C7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{materia}</div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>{info.count} tarea{info.count !== 1 ? 's' : ''} calificada{info.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: getProgressColor(avg) }}>{avg}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>/ 100</div>
                      </div>
                    </div>
                    <div style={{ background: '#F1F5F9', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 8,
                        background: `linear-gradient(90deg, ${getProgressColor(avg)}, ${getProgressColor(avg)}bb)`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {info.tasks.slice(0, 5).map(t => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          style={{
                            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                            background: `${getNoteColor(t.nota)}15`,
                            color: getNoteColor(t.nota),
                            border: `1px solid ${getNoteColor(t.nota)}30`
                          }}
                        >
                          {t.nota}/100
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'historial' && (
        <div>
          {gradedTasks.length === 0 ? (
            <EmptyState icon={Award} title="Sin calificaciones" description="Aún no tienes tareas calificadas." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gradedTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  style={{
                    background: '#FFFFFF', border: '1px solid #E2E8F0',
                    borderRadius: 10, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.05)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: `${getNoteColor(t.nota)}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: getNoteColor(t.nota)
                  }}>
                    {t.nota}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', marginBottom: 3 }}>{t.titulo}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {t.materia} · {t.docente} · {formatDate(t.fecha_limite)}
                    </div>
                  </div>
                  {t.entrega?.calificacion?.retroalimentacion && (
                    <div style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11,
                      background: '#F0F9FF', color: '#0284C7', fontWeight: 600
                    }}>
                      <MessageSquare size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                      Feedback
                    </div>
                  )}
                  <ChevronRight size={16} color="#94A3B8" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task detail modal */}
      <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title="Detalle de Calificación">
        {selectedTask && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '14px 16px', background: '#F8FAFC', borderRadius: 8 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: `${getNoteColor(selectedTask.nota)}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: getNoteColor(selectedTask.nota)
              }}>
                {selectedTask.nota}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{selectedTask.titulo}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{selectedTask.materia} · {selectedTask.docente}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  <span style={{ fontWeight: 600, color: selectedTask.nota >= 60 ? '#10B981' : '#EF4444' }}>
                    {selectedTask.nota >= 60 ? '✓ Aprobado' : '✗ No aprobado'}
                  </span>
                  {' · '}{selectedTask.nota}/{selectedTask.puntaje_maximo} puntos
                </div>
              </div>
            </div>
            {selectedTask.entrega?.calificacion?.retroalimentacion ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Retroalimentación del Docente
                </div>
                <div style={{
                  background: '#F0FDF4', border: '1px solid #BBF7D0',
                  borderLeft: '3px solid #10B981', borderRadius: 8,
                  padding: '12px 14px', fontSize: 13, color: '#14532D', lineHeight: 1.6
                }}>
                  {selectedTask.entrega.calificacion.retroalimentacion}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: 13 }}>
                <MessageSquare size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                El docente no dejó comentarios adicionales.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
