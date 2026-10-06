import { useState, useEffect } from 'react';
import {
  ClipboardList, Plus, InboxIcon, Award, Users, BarChart2,
  Clock, CheckCircle, Search, Filter, Eye, Download, ChevronRight,
  Send, AlertTriangle, Paperclip, Calendar
} from 'lucide-react';
import { teacherAPI, commonAPI } from '../api';
import { Loading, EmptyState, Modal, Alert, ProgressBar, StatCard, MiniBarChart } from '../components';
import { formatDate, formatDateTime, getNoteColor, getPriorityBadge, getTaskBadge } from '../utils';
import RubricaEditor from '../components/RubricaEditor';

// ============================================================
// MODAL: GRADE SUBMISSION (CALIFICAR ENTREGA)
// ============================================================
export function GradeSubmissionModal({ entrega, onClose, onSuccess }) {
  const [nota, setNota] = useState(entrega?.calificacion?.nota !== undefined ? entrega.calificacion.nota : '');
  const [retro, setRetro] = useState(entrega?.calificacion?.retroalimentacion || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(nota);
    if (isNaN(val) || val < 0 || val > 100) {
      setError('La calificación debe ser un valor numérico entre 0 y 100.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await teacherAPI.gradeSubmission(entrega.entrega_id, {
        nota: val,
        retroalimentacion: retro
      });
      setSaved(true);
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Error al guardar la calificación.');
    } finally {
      setLoading(false);
    }
  };

  if (saved) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 10px' }}>
        <div style={{
          width: 50, height: 50, backgroundColor: '#DFF6DD',
          borderRadius: '50%', color: '#107C41', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
        }}>
          <CheckCircle size={26} />
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#107C41', marginBottom: 4 }}>
          Calificación guardada
        </h3>
        <p style={{ color: '#616161', fontSize: '12.5px' }}>
          La nota y retroalimentación se registraron en el expediente de {entrega.estudiante_nombre}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Student & Submission summary */}
      <div style={{ background: '#FAF9F8', border: '1px solid #EDEBE9', borderRadius: '4px', padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#242424' }}>{entrega.estudiante_nombre}</div>
        <div style={{ fontSize: '11.5px', color: '#616161', marginTop: 2 }}>
          Matrícula: {entrega.estudiante_matricula} · Entregado el {entrega.fecha_entrega}
        </div>
        <div style={{ fontSize: '12px', color: '#5B5FC7', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Paperclip size={13} /> {entrega.archivo_nombre}
        </div>
        {entrega.observaciones && (
          <p style={{ fontSize: '11.5px', color: '#616161', marginTop: 8, fontStyle: 'italic', borderLeft: '2px solid #5B5FC7', paddingLeft: 8 }}>
            Nota del alumno: "{entrega.observaciones}"
          </p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">
          Calificación (Escala 0 a 100) <span className="required">*</span>
        </label>
        <input
          className="form-control"
          type="number"
          min="0"
          max="100"
          step="0.5"
          placeholder="Ej: 90"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Retroalimentación formativa y observaciones pedagógicas
        </label>
        <textarea
          className="form-control"
          rows={4}
          placeholder="Escribe comentarios específicos, fortalezas del trabajo y aspectos a mejorar para el estudiante..."
          value={retro}
          onChange={(e) => setRetro(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Award size={14} />
          {loading ? 'Guardando...' : 'Asignar calificación'}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// MODAL REPORTE DE ESTUDIANTES
// ============================================================
function ReporteEstudiantesModal({ tareaId, onClose }) {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('presentaron');

  useEffect(() => {
    teacherAPI.allSubmissions()
      .then(res => {
        setEntregas(res.filter(e => e.tarea_id === tareaId));
      })
      .finally(() => setLoading(false));
  }, [tareaId]);

  // Clasificar entregas (simulado según estado)
  const presentaron = entregas.filter(e => e.calificacion || e.archivo_nombre || (e.estado && e.estado !== 'ASIGNADA' && e.estado !== 'PENDIENTE'));
  const noPresentaron = entregas.filter(e => !presentaron.includes(e));
  
  // Simulacion de vistas: Asumimos que si presentaron, vieron. Si tienen archivo, vieron. 
  // En un entorno real tendrías un modelo VistasTarea en el backend.
  const vieron = entregas.filter(e => presentaron.includes(e) || (e.estado && e.estado !== 'ASIGNADA'));
  const noVieron = entregas.filter(e => !vieron.includes(e));

  const listToShow = tab === 'presentaron' ? presentaron : 
                     tab === 'no_presentaron' ? noPresentaron :
                     tab === 'vieron' ? vieron : noVieron;

  return (
    <Modal open={true} onClose={onClose} title="Reporte de Estudiantes">
      {loading ? (
        <Loading text="Cargando reporte..." />
      ) : (
        <div style={{ padding: '0 10px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #EDEBE9', paddingBottom: 10, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${tab === 'presentaron' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('presentaron')}>
              Presentaron ({presentaron.length})
            </button>
            <button className={`btn btn-sm ${tab === 'no_presentaron' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('no_presentaron')}>
              Faltan ({noPresentaron.length})
            </button>
            <button className={`btn btn-sm ${tab === 'vieron' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('vieron')}>
              <Eye size={12}/> Vieron ({vieron.length})
            </button>
            <button className={`btn btn-sm ${tab === 'no_vieron' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('no_vieron')}>
              <EyeOff size={12}/> No vieron ({noVieron.length})
            </button>
          </div>

          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {listToShow.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#616161', fontSize: 13, padding: '30px 0' }}>No hay estudiantes en esta lista.</p>
            ) : (
              listToShow.map(e => (
                <div key={e.id || Math.random()} style={{ padding: '10px 12px', borderBottom: '1px solid #F3F2F1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold' }}>
                      {e.estudiante_nombre?.slice(0, 2).toUpperCase() || 'ES'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#242424' }}>{e.estudiante_nombre}</div>
                      <div style={{ fontSize: 11, color: '#616161' }}>{e.estudiante_matricula}</div>
                    </div>
                  </div>
                  {tab === 'presentaron' && e.calificacion && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: getNoteColor(e.calificacion.nota) }}>{e.calificacion.nota}/100</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============================================================
// 1. TEACHER TASKS VIEW (MIS TAREAS - DOCENTE)
// ============================================================
export function TeacherTasksView({ onNavigate, onOpenCreate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todas');

  const loadTasks = () => {
    setLoading(true);
    teacherAPI.tasks()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, []);

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.titulo.toLowerCase().includes(search.toLowerCase()) || t.materia.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'activas') return !t.esta_vencida;
    if (filter === 'pendientes_calificar') return t.pendientes_calificacion > 0;
    if (filter === 'vencidas') return t.esta_vencida;
    return true;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424' }}>Gestión de Tareas Docentes</h2>
          <p style={{ fontSize: '12.5px', color: '#616161' }}>
            Tareas académicas asignadas a tus cursos con seguimiento en tiempo real.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 30, height: 32, fontSize: '12.5px' }}
              placeholder="Buscar tarea o asignatura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={onOpenCreate}>
            <Plus size={14} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="teams-tabs">
        {[
          { id: 'todas', label: 'Todas las tareas' },
          { id: 'activas', label: 'Activas' },
          { id: 'pendientes_calificar', label: 'Por calificar' },
          { id: 'vencidas', label: 'Vencidas' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`teams-tab ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading text="Cargando tareas docentes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin tareas encontradas"
          description="Crea una nueva tarea para tus estudiantes para iniciar el ciclo académico."
          action={<button className="btn btn-primary" onClick={onOpenCreate}><Plus size={14} /> Crear tarea</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => {
            const priBadge = getPriorityBadge(t.prioridad);
            return (
              <div key={t.id} className="task-card" onClick={() => onNavigate('entregas', { filterTaskId: t.id })}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#242424' }}>{t.titulo}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge ${priBadge.cls}`}>{priBadge.label}</span>
                    <span className={`badge ${t.esta_vencida ? 'badge-vencida' : 'badge-calificada'}`}>
                      {t.esta_vencida ? 'Vencida' : 'Activa'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 18, fontSize: '12px', color: '#616161', marginTop: 4, flexWrap: 'wrap' }}>
                  <span>Curso: {t.curso_nombre}</span>
                  <span>Asignatura: {t.materia}</span>
                  <span>Fecha límite: {formatDate(t.fecha_limite)}</span>
                  <span>Puntaje: {t.puntaje_maximo} pts</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '1px solid #EDEBE9' }}>
                  <div style={{ display: 'flex', gap: 16, fontSize: '12px' }}>
                    <span style={{ color: '#242424', fontWeight: 600 }}>
                      Entregadas: {t.entregadas} de {t.total_alumnos} alumnos
                    </span>
                    <span style={{ color: t.pendientes_calificacion > 0 ? '#CA5010' : '#107C41', fontWeight: 600 }}>
                      Por calificar: {t.pendientes_calificacion}
                    </span>
                    <span style={{ color: '#616161' }}>
                      Calificadas: {t.calificadas}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#8A8886', fontStyle: 'italic' }}>
                    Gestiona las entregas desde Mis Colegios → Materia
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 2. CREATE TASK FORM (CREAR TAREA - DOCENTE)
// ============================================================
export function CreateTaskForm({ onSuccess, onCancel }) {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    curso_id: '',
    titulo: '',
    descripcion: '',
    materia: '',
    fecha_limite: '',
    puntaje_maximo: 100,
    indicaciones: '',
    prioridad: 'MEDIA',
    material_nombre: '',
    material_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRubrica, setShowRubrica] = useState(false);
  const [rubricaData, setRubricaData] = useState(null);

  useEffect(() => {
    commonAPI.courses().then(setCourses).catch(console.error);
  }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.fecha_limite || !form.curso_id) {
      setError('Completa los campos obligatorios: Título, Curso y Fecha límite.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await teacherAPI.createTask({ ...form, rubrica: rubricaData });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Error al crear la tarea.');
    } finally {
      setLoading(false);
    }
  };

  if (showRubrica) {
    return (
      <RubricaEditor 
        rubrica={rubricaData}
        onSave={(data) => {
          setRubricaData(data);
          setShowRubrica(false);
        }}
        onCancel={() => setShowRubrica(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Título de la tarea <span className="required">*</span></label>
          <input
            className="form-control"
            placeholder="Ej: Informe de Laboratorio N° 2 — Dinámica y Leyes de Newton"
            value={form.titulo}
            onChange={e => setF('titulo', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Curso y Asignatura <span className="required">*</span></label>
          <select
            className="form-control"
            value={form.curso_id}
            onChange={e => {
              const c = courses.find(x => x.id === parseInt(e.target.value));
              setF('curso_id', e.target.value);
              if (c) setF('materia', c.materia_nombre || c.nombre);
            }}
            required
          >
            <option value="">Selecciona un curso...</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.materia_nombre})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Fecha y hora límite <span className="required">*</span></label>
          <input
            className="form-control"
            type="datetime-local"
            value={form.fecha_limite}
            onChange={e => setF('fecha_limite', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Puntaje máximo (0 — 100)</label>
          <input
            className="form-control"
            type="number"
            min="1"
            max="100"
            value={form.puntaje_maximo}
            onChange={e => setF('puntaje_maximo', parseInt(e.target.value) || 100)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Nivel de Prioridad</label>
          <select className="form-control" value={form.prioridad} onChange={e => setF('prioridad', e.target.value)}>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>

        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Descripción general de la tarea</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Detalla en qué consiste la actividad a realizar..."
            value={form.descripcion}
            onChange={e => setF('descripcion', e.target.value)}
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Indicaciones específicas para el estudiante</label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Formato requerido, normas de presentación, criterios de evaluación..."
            value={form.indicaciones}
            onChange={e => setF('indicaciones', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Nombre del material adjunto (opcional)</label>
          <input
            className="form-control"
            placeholder="Guía_Practica_02.pdf"
            value={form.material_nombre}
            onChange={e => setF('material_nombre', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">URL del material adjunto (opcional)</label>
          <input
            className="form-control"
            placeholder="https://edusmart.edu/recursos/guia.pdf"
            value={form.material_url}
            onChange={e => setF('material_url', e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div>
          <button type="button" className="btn btn-secondary" onClick={() => setShowRubrica(true)}>
            <Plus size={14} /> Añadir Rúbrica
          </button>
          {rubricaData && <span style={{ marginLeft: 10, fontSize: '12px', color: '#107C41' }}><CheckCircle size={14} style={{ verticalAlign: 'middle' }} /> Rúbrica configurada</span>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Plus size={14} /> {loading ? 'Publicando...' : 'Publicar tarea'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ============================================================
// 3. TEACHER SUBMISSIONS VIEW (REVISIÓN Y CALIFICACIÓN DE ENTREGAS)
// ============================================================
export function TeacherSubmissionsView({ initialTaskId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas');
  const [search, setSearch] = useState('');
  const [gradingEntrega, setGradingEntrega] = useState(null);

  const loadSubmissions = () => {
    setLoading(true);
    teacherAPI.allSubmissions()
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSubmissions(); }, []);

  const filtered = submissions.filter(s => {
    if (initialTaskId && s.tarea_id !== initialTaskId) return false;
    const matchSearch = !search ||
      s.estudiante_nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.tarea_titulo.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'pendientes') return !s.calificacion;
    if (filter === 'calificadas') return !!s.calificacion;
    return true;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424' }}>Entregas de Estudiantes</h2>
          <p style={{ fontSize: '12.5px', color: '#616161' }}>
            Centro de revisión, evaluación y retroalimentación de tareas presentadas.
          </p>
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
          <input
            className="form-control"
            style={{ paddingLeft: 30, height: 32, fontSize: '12.5px' }}
            placeholder="Buscar por estudiante o tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="teams-tabs">
        {[
          { id: 'todas', label: 'Todas las entregas' },
          { id: 'pendientes', label: 'Por calificar' },
          { id: 'calificadas', label: 'Calificadas' },
        ].map(t => (
          <button
            key={t.id}
            className={`teams-tab ${filter === t.id ? 'active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading text="Cargando entregas de los estudiantes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Sin entregas para mostrar"
          description={search ? `No se encontraron resultados para "${search}".` : 'No hay entregas registradas en esta vista.'}
        />
      ) : (() => {
        // Group by Colegio → Curso
        const grouped = {};
        filtered.forEach(ent => {
          const colegio = ent.colegio_nombre || 'Sin colegio';
          const curso = ent.curso_nombre || 'Sin curso';
          if (!grouped[colegio]) grouped[colegio] = {};
          if (!grouped[colegio][curso]) grouped[colegio][curso] = [];
          grouped[colegio][curso].push(ent);
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(grouped).map(([colegio, cursos]) => (
              <div key={colegio}>
                {/* Colegio header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', marginBottom: 10,
                  background: 'linear-gradient(90deg, #0F1E3D 0%, #1E3A8A 100%)',
                  borderRadius: 8, color: 'white',
                }}>
                  <Users size={15} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{colegio}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>
                    {Object.values(cursos).flat().length} entregas
                  </span>
                </div>

                {/* Cursos dentro del colegio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 12 }}>
                  {Object.entries(cursos).map(([curso, entregas]) => (
                    <div key={curso}>
                      {/* Curso sub-header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 12px', marginBottom: 8,
                        background: '#F3F2F1', borderRadius: 6,
                        borderLeft: '3px solid #1E3A8A',
                      }}>
                        <ChevronRight size={13} style={{ color: '#1E3A8A' }} />
                        <span style={{ fontWeight: 600, fontSize: 12.5, color: '#242424' }}>{curso}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#616161' }}>
                          {entregas.length} alumno{entregas.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Entregas del curso */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
                        {entregas.map(ent => (
                          <div key={ent.id || ent.entrega_id || Math.random()} className="card" style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 34, height: 34, borderRadius: '50%',
                                  backgroundColor: '#5B5FC7', color: '#FFFFFF',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 600, fontSize: '12px', flexShrink: 0
                                }}>
                                  {ent.estudiante_nombre?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#242424' }}>
                                    {ent.estudiante_nombre}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#616161' }}>
                                    Matrícula: {ent.estudiante_matricula}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span className={`badge ${ent.calificacion ? 'badge-calificada' : 'badge-en_revision'}`}>
                                  {ent.calificacion ? 'Calificada' : 'Pendiente revisión'}
                                </span>
                                {ent.calificacion && (
                                  <span style={{ fontWeight: 700, fontSize: '14px', color: getNoteColor(ent.calificacion.nota) }}>
                                    {ent.calificacion.nota}/100
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ margin: '8px 0', background: '#FAF9F8', padding: '8px 12px', borderRadius: '4px', border: '1px solid #EDEBE9' }}>
                              <div style={{ fontWeight: 600, fontSize: '12px', color: '#242424' }}>{ent.tarea_titulo}</div>
                              <div style={{ display: 'flex', gap: 16, fontSize: '11px', color: '#616161', marginTop: 4 }}>
                                <span>Archivo: {ent.archivo_nombre}</span>
                                <span>Fecha: {ent.fecha_entrega}</span>
                              </div>
                              {ent.calificacion?.retroalimentacion && (
                                <div style={{ marginTop: 5, fontSize: '11px', color: '#107C41', fontWeight: 500 }}>
                                  Retroalimentación: "{ent.calificacion.retroalimentacion}"
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setGradingEntrega(ent)}
                              >
                                <Award size={13} /> {ent.calificacion ? 'Editar calificación' : 'Calificar entrega'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Modal for Grading */}
      <Modal
        open={!!gradingEntrega}
        onClose={() => setGradingEntrega(null)}
        title="Evaluación y Retroalimentación"
      >
        {gradingEntrega && (
          <GradeSubmissionModal
            entrega={gradingEntrega}
            onClose={() => setGradingEntrega(null)}
            onSuccess={() => loadSubmissions()}
          />
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// 4. TEACHER GRADEBOOK VIEW (LIBRO DE CALIFICACIONES)
// ============================================================
export function TeacherGradebookView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reportStudent, setReportStudent] = useState(null);

  useEffect(() => {
    teacherAPI.studentsList()
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    !search || s.nombre_completo.toLowerCase().includes(search.toLowerCase()) || s.matricula.includes(search)
  );

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424' }}>Libro de Calificaciones</h2>
          <p style={{ fontSize: '12.5px', color: '#616161' }}>
            Consolidado académico general por estudiante y rendimiento ponderado.
          </p>
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
          <input
            className="form-control"
            style={{ paddingLeft: 30, height: 32, fontSize: '12.5px' }}
            placeholder="Buscar por estudiante o matrícula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loading text="Cargando libro de calificaciones..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Sin datos disponibles"
          description="Los datos se reflejarán cuando se registren calificaciones."
        />
      ) : (
        <div className="teams-table-container">
          <table className="teams-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Matrícula</th>
                <th>Grado / Paralelo</th>
                <th>Tareas Entregadas</th>
                <th>Tareas Pendientes</th>
                <th>Cumplimiento</th>
                <th>Promedio Actual</th>
                <th>Rendimiento</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const noteColor = getNoteColor(s.promedio);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: '#242424' }}>{s.nombre_completo}</td>
                    <td>{s.matricula}</td>
                    <td>{s.grado} "{s.paralelo}"</td>
                    <td>{s.tareas_entregadas} de {s.tareas_asignadas}</td>
                    <td style={{ color: s.tareas_pendientes > 0 ? '#CA5010' : '#616161' }}>
                      {s.tareas_pendientes}
                    </td>
                    <td style={{ width: 140 }}>
                      <ProgressBar value={s.porcentaje_cumplimiento} color={s.porcentaje_cumplimiento >= 80 ? 'success' : 'warning'} height={6} showLabel />
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: noteColor }}>
                        {s.promedio > 0 ? `${s.promedio}/100` : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.estado_academico === 'Excelente' ? 'badge-calificada' : s.estado_academico === 'Regular' ? 'badge-pendiente' : 'badge-vencida'}`}>
                        {s.estado_academico}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => setReportStudent(s)}
                        title="Enviar reporte de desempeño académico"
                      >
                        <Send size={11} /> Reporte
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Send report */}
      {reportStudent && (
        <Modal
          open={true}
          onClose={() => setReportStudent(null)}
          title={`📊 Reporte Académico — ${reportStudent.nombre_completo}`}
        >
          <SendReportModal
            student={reportStudent}
            onClose={() => setReportStudent(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// MODAL: SEND ACADEMIC REPORT TO STUDENT
// ============================================================
function SendReportModal({ student, onClose }) {
  const [asunto, setAsunto] = useState(`Reporte de Desempeño Académico - ${student.nombre_completo}`);
  const [mensaje, setMensaje] = useState(
    `Estimado/a ${student.nombre_completo},\n\n` +
    `Le informamos su situación académica actual:\n\n` +
    `• Tareas entregadas: ${student.tareas_entregadas} de ${student.tareas_asignadas}\n` +
    `• Tareas pendientes: ${student.tareas_pendientes}\n` +
    `• Porcentaje de cumplimiento: ${student.porcentaje_cumplimiento}%\n` +
    `• Promedio actual: ${student.promedio > 0 ? student.promedio + '/100' : 'Sin calificaciones aún'}\n` +
    `• Estado académico: ${student.estado_academico}\n\n` +
    `${student.riesgo_academico ? '⚠️ ATENCIÓN: El estudiante presenta indicadores de riesgo académico. Se recomienda atención adicional.\n\n' : ''}` +
    `Saludos,\nEquipo Docente EduSmart`
  );
  const [incluirCalif, setIncluirCalif] = useState(true);
  const [incluirProgreso, setIncluirProgreso] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      await teacherAPI.sendReport(student.id, {
        email: student.email,
        asunto,
        mensaje,
        incluir_calificaciones: incluirCalif,
        incluir_progreso: incluirProgreso,
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Error al enviar el reporte.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 16px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28
        }}>✅</div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#065F46', marginBottom: 6 }}>
          ¡Reporte enviado exitosamente!
        </h3>
        <p style={{ color: '#616161', fontSize: '12.5px', marginBottom: 4 }}>
          Se envió el informe de desempeño a:
        </p>
        <p style={{ color: '#5B5FC7', fontWeight: 600, fontSize: '13px' }}>{student.email}</p>
        <button className="btn btn-secondary" style={{ marginTop: 18 }} onClick={onClose}>
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Student header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#F0F4FF', borderRadius: 8, padding: '12px 14px', marginBottom: 18,
        border: '1px solid #C7D2FE'
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          backgroundColor: '#5B5FC7', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '14px', flexShrink: 0
        }}>
          {student.nombre_completo.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1E3A8A' }}>{student.nombre_completo}</div>
          <div style={{ fontSize: '11.5px', color: '#4B5563' }}>
            📧 {student.email} · {student.matricula}
          </div>
        </div>
        {student.riesgo_academico && (
          <span style={{
            marginLeft: 'auto', background: '#FEF2F2', color: '#B91C1C',
            border: '1px solid #FECACA', borderRadius: 6,
            padding: '3px 8px', fontSize: '11px', fontWeight: 600
          }}>
            ⚠️ Riesgo
          </span>
        )}
      </div>

      {/* Metrics summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Promedio', value: student.promedio > 0 ? `${student.promedio}/100` : '—', color: getNoteColor(student.promedio) },
          { label: 'Cumplimiento', value: `${student.porcentaje_cumplimiento}%`, color: student.porcentaje_cumplimiento >= 80 ? '#107C41' : '#CA5010' },
          { label: 'Pendientes', value: student.tareas_pendientes, color: student.tareas_pendientes > 0 ? '#CA5010' : '#616161' },
        ].map((m, i) => (
          <div key={i} style={{
            background: '#FAF9F8', border: '1px solid #EDEBE9',
            borderRadius: 6, padding: '10px', textAlign: 'center'
          }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: m.color }}>{m.value}</div>
            <div style={{ fontSize: '10.5px', color: '#8A8886', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Options */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: '#242424', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirCalif} onChange={e => setIncluirCalif(e.target.checked)} />
          Incluir calificaciones detalladas
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: '#242424', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirProgreso} onChange={e => setIncluirProgreso(e.target.checked)} />
          Incluir gráfico de progreso
        </label>
      </div>

      {/* Subject */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Asunto del correo</label>
        <input
          className="form-control"
          value={asunto}
          onChange={e => setAsunto(e.target.value)}
          placeholder="Asunto..."
        />
      </div>

      {/* Message body */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Mensaje personalizado</label>
        <textarea
          className="form-control"
          rows={8}
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6 }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={sending}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={sending || !asunto.trim()}
        >
          <Send size={14} /> {sending ? 'Enviando...' : 'Enviar reporte'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 5. TEACHER STUDENTS VIEW (SEGUIMIENTO ACADÉMICO)
// ============================================================
export function TeacherStudentsView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportStudent, setReportStudent] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    teacherAPI.studentsList()
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    !search ||
    s.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    s.matricula.includes(search)
  );

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
            Seguimiento Académico de Estudiantes
          </h2>
          <p style={{ color: '#616161', fontSize: '12.5px' }}>
            Monitoreo del desempeño, ritmo de entrega y estado de riesgo académico. Envía reportes personalizados directamente al correo del estudiante.
          </p>
        </div>
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
          <input
            className="form-control"
            style={{ paddingLeft: 28, height: 32, fontSize: '12.5px' }}
            placeholder="Buscar estudiante..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loading text="Cargando expedientes de estudiantes..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin resultados" description="No se encontró ningún estudiante con ese criterio." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
          {filtered.map(est => (
            <div key={est.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: est.riesgo_academico
                    ? 'linear-gradient(135deg, #FEE2E2, #FECACA)'
                    : 'linear-gradient(135deg, #5B5FC7, #4338CA)',
                  color: est.riesgo_academico ? '#B91C1C' : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '14px', flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                }}>
                  {est.nombre_completo.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#242424', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {est.nombre_completo}
                  </div>
                  <div style={{ fontSize: '11px', color: '#616161' }}>
                    {est.matricula} · {est.grado} "{est.paralelo}"
                  </div>
                </div>
                <span className={`badge ${est.estado_academico === 'Excelente' ? 'badge-calificada' : est.estado_academico === 'Regular' ? 'badge-pendiente' : 'badge-vencida'}`}>
                  {est.estado_academico}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#616161', marginBottom: 4 }}>
                  <span>Progreso de tareas</span>
                  <span style={{ fontWeight: 600 }}>{est.tareas_entregadas}/{est.tareas_asignadas} ({est.porcentaje_cumplimiento}%)</span>
                </div>
                <ProgressBar value={est.porcentaje_cumplimiento} color={est.porcentaje_cumplimiento >= 80 ? 'success' : est.porcentaje_cumplimiento >= 50 ? 'warning' : 'danger'} height={6} />
              </div>

              {/* Average + risk flag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #EDEBE9', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '11px', color: '#8A8886' }}>Promedio:</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: getNoteColor(est.promedio) }}>
                    {est.promedio > 0 ? `${est.promedio}/100` : '—'}
                  </span>
                </div>
                {est.riesgo_academico && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#B91C1C', fontSize: '11px', fontWeight: 600 }}>
                    <AlertTriangle size={12} />
                    Riesgo académico
                  </div>
                )}
              </div>

              {/* Send report button */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '12.5px' }}
                onClick={() => setReportStudent(est)}
              >
                <Send size={13} />
                Enviar reporte de desempeño
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Send Report Modal */}
      <Modal
        open={!!reportStudent}
        onClose={() => setReportStudent(null)}
        title={`📊 Reporte Académico — ${reportStudent?.nombre_completo || ''}`}
      >
        {reportStudent && (
          <SendReportModal
            student={reportStudent}
            onClose={() => setReportStudent(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// 6. TEACHER REPORTS VIEW (REPORTES Y ANÁLISIS)
// ============================================================
export function TeacherReportsView() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherAPI.reports()
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Generando reportes analíticos..." />;
  if (!reports) return null;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
          Reportes y Estadísticas Académicas
        </h2>
        <p style={{ color: '#616161', fontSize: '12.5px' }}>
          Distribución de notas, cumplimiento institucional e indicadores globales de tus cursos.
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Award size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{reports.promedio_general} / 100</div>
            <div className="stat-card-label">Promedio General</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><ClipboardList size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{reports.total_tareas}</div>
            <div className="stat-card-label">Tareas Asignadas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon yellow"><InboxIcon size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{reports.total_entregas}</div>
            <div className="stat-card-label">Entregas Recibidas</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title"><BarChart2 size={16} /> Distribución de Calificaciones</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reports.distribucion_notas.map((d, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#242424' }}>{d.rango}</span>
                  <span style={{ color: '#616161', fontWeight: 600 }}>{d.cantidad} estudiante(s)</span>
                </div>
                <div style={{ background: '#EDEBE9', borderRadius: '4px', height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (d.cantidad / Math.max(reports.total_entregas, 1)) * 100)}%`,
                    backgroundColor: d.color, height: '100%', borderRadius: '4px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
