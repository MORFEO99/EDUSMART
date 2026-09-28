import { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, Search, BookOpen, Clock, FileText, CheckCircle,
  AlertTriangle, ChevronRight, X, Upload, Send, Download, Eye,
  Paperclip, Calendar, User, Award, Check
} from 'lucide-react';
import { studentAPI } from '../api';
import { Loading, EmptyState, Modal, Alert, ProgressBar } from '../components';
import { formatDate, formatDateTime, getTaskBadge, getPriorityBadge, getSubjectColor, getNoteColor, daysUntil, getFileLabel } from '../utils';

// ============================================================
// SUBMIT TASK FORM (MICROSOFT TEAMS STYLE)
// ============================================================
export function SubmitTaskForm({ tarea, existingEntrega, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    archivo_nombre: existingEntrega?.archivo_nombre || '',
    archivo_formato: existingEntrega?.archivo_formato || 'PDF',
    archivo_tamano: existingEntrega?.archivo_tamano || '2.4 MB',
    observaciones: existingEntrega?.observaciones || '',
  });
  const [simFile, setSimFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const ALLOWED = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.jpg', '.png'];

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED.includes(`.${ext}`)) {
      setError(`Formato no permitido. Formatos aceptados: ${ALLOWED.join(', ')}`);
      return;
    }
    setSimFile(file);
    setForm(p => ({
      ...p,
      archivo_nombre: file.name,
      archivo_formato: ext.toUpperCase(),
      archivo_tamano: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.archivo_nombre) {
      setError('Por favor adjunta un archivo antes de enviar la presentación.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await studentAPI.submitTask(tarea.id, form);
      setSuccess(res);
      onSuccess?.(res);
    } catch (err) {
      setError(err.message || 'Error al presentar la tarea.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 10px' }}>
        <div style={{
          width: 54, height: 54, backgroundColor: '#DFF6DD',
          borderRadius: '50%', color: '#107C41', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
        }}>
          <CheckCircle size={28} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#107C41', marginBottom: 6 }}>
          Tarea presentada correctamente
        </h3>
        <p style={{ color: '#616161', fontSize: '13px', marginBottom: 18 }}>
          Tu trabajo ha sido registrado y enviado al docente para su revisión.
        </p>

        <div style={{
          background: '#FAF9F8', border: '1px solid #EDEBE9', borderRadius: '4px',
          padding: '12px 16px', textAlign: 'left', marginBottom: 18
        }}>
          {[
            ['Fecha de entrega', success.entrega?.fecha_entrega],
            ['Hora de registro', success.entrega?.hora_entrega],
            ['Archivo entregado', success.entrega?.archivo_enviado],
            ['Formato', success.entrega?.archivo_formato],
            ['Estado de revisión', success.entrega?.estado],
          ].map(([k, v]) => v && (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #EDEBE9', fontSize: '12px' }}>
              <span style={{ color: '#616161' }}>{k}</span>
              <span style={{ fontWeight: 600, color: '#242424' }}>{v}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-block" onClick={onCancel}>
          Entendido
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Task Summary Banner */}
      <div style={{
        background: '#F0F1FA', border: '1px solid #C4C6F4',
        borderRadius: '4px', padding: '12px 16px', marginBottom: 16
      }}>
        <div style={{ fontWeight: 600, color: '#242424', fontSize: '13.5px', marginBottom: 4 }}>
          {tarea.titulo}
        </div>
        <div style={{ fontSize: '12px', color: '#616161', display: 'flex', gap: 16 }}>
          <span>Asignatura: {tarea.materia}</span>
          <span>Puntaje: {tarea.puntaje_maximo} pts</span>
          <span style={{ color: daysUntil(tarea.fecha_limite) <= 0 ? '#A80000' : '#CA5010', fontWeight: 600 }}>
            Límite: {formatDate(tarea.fecha_limite)}
          </span>
        </div>
      </div>

      {/* Drag & Drop File Upload */}
      <div className="form-group">
        <label className="form-label">
          Archivo de trabajo <span className="required">*</span>
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#5B5FC7' : form.archivo_nombre ? '#107C41' : '#D1D1D1'}`,
            borderRadius: '4px', padding: '24px 16px', textAlign: 'center',
            cursor: 'pointer', backgroundColor: dragging ? '#F0F1FA' : '#FAF9F8',
            transition: 'all 0.15s'
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: form.archivo_nombre ? '#DFF6DD' : '#ECECF8',
            color: form.archivo_nombre ? '#107C41' : '#5B5FC7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
          }}>
            {form.archivo_nombre ? <Check size={20} /> : <Upload size={18} />}
          </div>

          {form.archivo_nombre ? (
            <div>
              <p style={{ fontWeight: 600, color: '#107C41', fontSize: '13px' }}>{form.archivo_nombre}</p>
              <p style={{ color: '#616161', fontSize: '11.5px', marginTop: 2 }}>{form.archivo_tamano} · Formato {form.archivo_formato}</p>
              <span style={{ fontSize: '11px', color: '#5B5FC7', textDecoration: 'underline', marginTop: 6, display: 'inline-block' }}>
                Clic para cambiar archivo
              </span>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, color: '#242424', fontSize: '13px', marginBottom: 2 }}>
                Arrastra tu archivo aquí
              </p>
              <p style={{ color: '#616161', fontSize: '12px' }}>
                o <span style={{ color: '#5B5FC7', fontWeight: 600 }}>haz clic para examinar</span>
              </p>
              <p style={{ color: '#8A8886', fontSize: '11px', marginTop: 6 }}>
                Formatos compatibles: PDF, DOC, DOCX, PPT, XLS, ZIP, JPG, PNG
              </p>
            </div>
          )}
          <input ref={fileRef} type="file" accept={ALLOWED.join(',')} style={{ display: 'none' }} onChange={handleFileDrop} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="observaciones">
          Comentario o aclaración para el docente
        </label>
        <textarea
          id="observaciones"
          className="form-control"
          rows={3}
          placeholder="Escribe comentarios, dudas o notas pertinentes sobre el desarrollo de tu entrega..."
          value={form.observaciones}
          onChange={(e) => setForm(p => ({ ...p, observaciones: e.target.value }))}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Send size={14} />
          {loading ? 'Enviando...' : existingEntrega ? 'Actualizar entrega' : 'Enviar entrega'}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// TASK DETAIL MODAL
// ============================================================
export function TaskDetailModal({ taskId, onClose, defaultMode = 'detail' }) {
  const [tarea, setTarea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(defaultMode);

  useEffect(() => {
    studentAPI.taskDetail(taskId)
      .then(setTarea)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <div style={{ padding: 40 }}><Loading text="Cargando detalles de la tarea..." /></div>;
  if (!tarea) return null;

  const badge = getTaskBadge(tarea.estado_actual);
  const priBadge = getPriorityBadge(tarea.prioridad);
  const cal = tarea.entrega?.calificacion;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 14, borderBottom: '1px solid #EDEBE9', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
            <span className={`badge ${priBadge.cls}`}>{priBadge.label}</span>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#242424', lineHeight: 1.3 }}>{tarea.titulo}</h3>
          <p style={{ color: '#616161', fontSize: '12px', marginTop: 4 }}>
            Asignatura: {tarea.materia} · Docente: {tarea.docente}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#5B5FC7' }}>{tarea.puntaje_maximo}</div>
          <div style={{ fontSize: '10.5px', color: '#8A8886', textTransform: 'uppercase' }}>Puntos máx</div>
        </div>
      </div>

      {mode === 'detail' ? (
        <div>
          {/* Dates grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#FAF9F8', borderRadius: '4px', padding: '10px 12px', border: '1px solid #EDEBE9' }}>
              <div style={{ fontSize: '11px', color: '#8A8886', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Publicación</div>
              <div style={{ fontWeight: 600, color: '#242424', fontSize: '12.5px' }}>{formatDate(tarea.fecha_publicacion)}</div>
            </div>
            <div style={{
              background: tarea.esta_vencida ? '#FDE7E9' : '#DFF6DD',
              borderRadius: '4px', padding: '10px 12px',
              border: `1px solid ${tarea.esta_vencida ? 'rgba(168,0,0,0.2)' : 'rgba(16,124,65,0.2)'}`
            }}>
              <div style={{ fontSize: '11px', color: '#8A8886', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Fecha límite</div>
              <div style={{ fontWeight: 600, color: tarea.esta_vencida ? '#A80000' : '#107C41', fontSize: '12.5px' }}>
                {formatDate(tarea.fecha_limite)}
              </div>
            </div>
          </div>

          {/* Description */}
          {tarea.descripcion && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: '#242424', fontSize: '12.5px', marginBottom: 6 }}>Descripción</div>
              <p style={{ color: '#616161', fontSize: '12.5px', lineHeight: 1.5, background: '#FAF9F8', borderRadius: '4px', padding: '10px 12px', border: '1px solid #EDEBE9' }}>
                {tarea.descripcion}
              </p>
            </div>
          )}

          {/* Indicaciones */}
          {tarea.indicaciones && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: '#242424', fontSize: '12.5px', marginBottom: 6 }}>Indicaciones de presentación</div>
              <p style={{ color: '#242424', fontSize: '12.5px', lineHeight: 1.5, background: '#FFF4CE', borderRadius: '4px', padding: '10px 12px', border: '1px solid rgba(202,80,16,0.25)' }}>
                {tarea.indicaciones}
              </p>
            </div>
          )}

          {/* Materials */}
          {tarea.materiales?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: '#242424', fontSize: '12.5px', marginBottom: 6 }}>Materiales adjuntos por el docente</div>
              {tarea.materiales.map(m => (
                <a
                  key={m.id} href={m.archivo_url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#F0F1FA', border: '1px solid #C4C6F4',
                    borderRadius: '4px', padding: '8px 12px', marginBottom: 6,
                    color: '#5B5FC7', fontSize: '12.5px', fontWeight: 600
                  }}
                >
                  <Download size={14} />
                  <span>{m.nombre}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#616161' }}>{m.tamano}</span>
                </a>
              ))}
            </div>
          )}

          {/* My submission */}
          {tarea.entrega && (
            <div style={{ background: '#DFF6DD', border: '1px solid rgba(16,124,65,0.25)', borderRadius: '4px', padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: '#107C41', marginBottom: 6, fontSize: '12.5px' }}>Entrega registrada</div>
              <div style={{ fontSize: '12px', color: '#242424', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Paperclip size={12} /> {tarea.entrega.archivo_nombre}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {formatDateTime(tarea.entrega.fecha_entrega)}</span>
              </div>
              {tarea.entrega.observaciones && (
                <p style={{ fontSize: '12px', color: '#616161', marginTop: 6, fontStyle: 'italic' }}>
                  Nota del estudiante: "{tarea.entrega.observaciones}"
                </p>
              )}
            </div>
          )}

          {/* Calificación and feedback */}
          {cal && (
            <div style={{ background: '#FAF9F8', border: '1px solid #EDEBE9', borderRadius: '4px', padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: '#242424', fontSize: '12.5px' }}>Calificación obtenida</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: getNoteColor(cal.nota) }}>
                  {cal.nota} <span style={{ fontSize: '12px', color: '#616161', fontWeight: 400 }}>/ {tarea.puntaje_maximo}</span>
                </span>
              </div>
              {cal.retroalimentacion && (
                <div style={{ borderLeft: '3px solid #5B5FC7', paddingLeft: 10, fontSize: '12px', color: '#242424', lineHeight: 1.5, marginTop: 6 }}>
                  Retroalimentación: "{cal.retroalimentacion}"
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#8A8886', marginTop: 8 }}>
                Evaluado el {formatDate(cal.fecha_calificacion)} por {cal.docente}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            {!tarea.esta_vencida && (
              <button className="btn btn-primary" onClick={() => setMode('submit')}>
                <Upload size={14} />
                {tarea.entrega ? 'Modificar entrega' : 'Presentar tarea'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <SubmitTaskForm
          tarea={tarea}
          existingEntrega={tarea.entrega}
          onSuccess={() => {
            setTimeout(() => {
              onClose();
              window.location.reload();
            }, 1200);
          }}
          onCancel={() => setMode('detail')}
        />
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE: MY TASKS (MICROSOFT TEAMS STYLE)
// ============================================================
export default function MyTasks({ initialTaskId, initialFilter = 'todos' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId || null);
  const [submitDirectTaskId, setSubmitDirectTaskId] = useState(null);

  const FILTERS = [
    { id: 'todos', label: 'Todas las tareas' },
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'en_proceso', label: 'En proceso' },
    { id: 'entregadas', label: 'Entregadas' },
    { id: 'calificadas', label: 'Calificadas' },
    { id: 'vencidas', label: 'Vencidas' },
  ];

  useEffect(() => {
    setLoading(true);
    studentAPI.tasks(filter)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = tasks.filter(t =>
    !search ||
    t.titulo.toLowerCase().includes(search.toLowerCase()) ||
    t.materia.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424' }}>Mis Tareas Académicas</h2>
          <p style={{ fontSize: '12.5px', color: '#616161' }}>
            Consulta, presenta y revisa el estado de tus tareas asignadas.
          </p>
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
          <input
            className="form-control"
            style={{ paddingLeft: 30, height: 32, fontSize: '12.5px' }}
            placeholder="Filtrar por tarea o materia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Fluent Tabs */}
      <div className="teams-tabs">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`teams-tab ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading text="Cargando listado de tareas..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={search ? 'Sin coincidencias' : 'Sin tareas en esta vista'}
          description={search ? `No se encontraron resultados para "${search}".` : 'No tienes tareas registradas en esta sección.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((t) => {
            const badge = getTaskBadge(t.codigo || t.estado);
            const priBadge = getPriorityBadge(t.prioridad);
            const dias = daysUntil(t.fecha_limite);
            const urgent = dias !== null && dias <= 1 && !['Calificada', 'Entregada', 'Vencida'].includes(t.estado);

            return (
              <div
                key={t.id}
                className="task-card"
                style={{ borderLeft: urgent ? '3px solid #A80000' : '1px solid #EDEBE9' }}
                onClick={() => setSelectedTaskId(t.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#242424' }}>{t.titulo}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge ${priBadge.cls}`}>{priBadge.label}</span>
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 18, fontSize: '12px', color: '#616161', marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BookOpen size={12} /> {t.materia}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={12} /> Prof. {t.docente}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> Fecha límite: {formatDate(t.fecha_limite)}
                  </span>
                  {dias !== null && (
                    <span style={{ color: dias < 0 ? '#A80000' : dias <= 1 ? '#CA5010' : '#616161', fontWeight: 600 }}>
                      {dias < 0 ? `Vencida (${Math.abs(dias)}d)` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '1px solid #EDEBE9' }}>
                  <div style={{ fontSize: '11.5px', color: '#616161' }}>
                    {t.entrega?.archivo_nombre ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#107C41', fontWeight: 600 }}>
                        <Paperclip size={12} /> Entregado: {t.entrega.archivo_nombre}
                      </span>
                    ) : (
                      <span>Puntaje asignado: {t.puntaje_maximo} pts</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {t.nota && (
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: getNoteColor(t.nota) }}>
                        {t.nota}/100
                      </span>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); }}
                    >
                      Ver detalle <ChevronRight size={12} />
                    </button>
                    {!t.esta_vencida && !['Calificada', 'Entregada'].includes(t.estado) && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskId(t.id);
                        }}
                      >
                        <Upload size={12} /> Presentar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      <Modal open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} title="Detalle de Tarea">
        {selectedTaskId && (
          <TaskDetailModal
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
