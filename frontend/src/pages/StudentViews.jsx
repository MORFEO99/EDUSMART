import { useState, useEffect } from 'react';
import { Award, MessageSquare, BookOpen, Clock, Calendar, CheckCircle, ChevronRight, User, Filter, Search, Building } from 'lucide-react';
import { studentAPI, dashboardAPI } from '../api';
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
              onClick={() => onNavigate('espacio_detail', { espacioId: esp.id })}
              style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
                padding: 16, cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: '#1E3A8A', background: '#EFF6FF',
                  padding: '4px 8px', borderRadius: 4
                }}>
                  {esp.codigo}
                </span>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                  {esp.total_tareas} tareas
                </span>
              </div>
              
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                {esp.nombre}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                {(esp.colegio_nombre || esp.curso_nombre) && (
                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building size={14} color="#64748B" />
                    <span>
                      <span style={{ fontWeight: 600 }}>{esp.colegio_nombre}</span>
                      {esp.colegio_nombre && esp.curso_nombre ? ' - ' : ''}
                      <span>{esp.curso_nombre}</span>
                    </span>
                  </div>
                )}
                
                {esp.materia_nombre && (
                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={14} color="#64748B" />
                    <span>Materia: <span style={{ fontWeight: 600 }}>{esp.materia_nombre}</span></span>
                  </div>
                )}
                
                <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} color="#64748B" />
                  <span>Docente: {esp.docente_nombre}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
