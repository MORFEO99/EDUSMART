import { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, Search, BookOpen, Clock, FileText, CheckCircle,
  AlertTriangle, ChevronRight, X, Upload, Send, Download, Eye,
  Paperclip, Calendar, User, Award, Check, Filter, Lightbulb, Info
} from 'lucide-react';
import { studentAPI } from '../api';
import { Loading, EmptyState, Modal, Alert, ProgressBar } from '../components';
import { formatDate, formatDateTime, getTaskBadge, getPriorityBadge, getSubjectColor, getNoteColor, daysUntil, getFileLabel } from '../utils';

// Helper for Teams Timeline date grouping (e.g. "22 nov domingo")
function formatTimelineDate(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${day} ${months[d.getMonth()]} ${daysOfWeek[d.getDay()]}`;
}

function formatHour(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getSubjectBadgeInfo(materia) {
  const m = (materia || '').toLowerCase();
  if (m.includes('matemática') || m.includes('algebra') || m.includes('calculo')) {
    return { initials: 'MAT', bg: '#D83B01' }; // Coral / Red
  }
  if (m.includes('física')) {
    return { initials: 'FIS', bg: '#0078D4' }; // Blue
  }
  if (m.includes('química')) {
    return { initials: 'QMC', bg: '#CA5010' }; // Orange
  }
  if (m.includes('biología') || m.includes('geografía')) {
    return { initials: 'BIO', bg: '#107C41' }; // Green
  }
  if (m.includes('lenguaje') || m.includes('literatura')) {
    return { initials: 'LIT', bg: '#8764B8' }; // Purple
  }
  if (m.includes('sociales') || m.includes('historia')) {
    return { initials: 'SOC', bg: '#D13438' }; // Crimson
  }
  if (m.includes('sistema') || m.includes('operativo')) {
    return { initials: 'SO', bg: '#CA5010' };
  }
  if (m.includes('numérico')) {
    return { initials: 'AN', bg: '#D83B01' };
  }
  const words = (materia || 'Tarea').trim().split(/\s+/);
  const initials = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2).toUpperCase();
  return { initials, bg: '#5B5FC7' };
}

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
  const entregaRegistrada = tarea.entrega || tarea.mi_entrega;
  const cal = entregaRegistrada?.calificacion;

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
          {entregaRegistrada && (
            <div style={{ background: '#DFF6DD', border: '1px solid rgba(16,124,65,0.25)', borderRadius: '4px', padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: '#107C41', marginBottom: 6, fontSize: '12.5px' }}>Entrega registrada</div>
              <div style={{ fontSize: '12px', color: '#242424', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Paperclip size={12} /> {entregaRegistrada.archivo_nombre || 'Archivo adjunto'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {formatDateTime(entregaRegistrada.fecha_entrega)}</span>
              </div>
              {entregaRegistrada.observaciones && (
                <p style={{ fontSize: '12px', color: '#616161', marginTop: 6, fontStyle: 'italic' }}>
                  Nota del estudiante: "{entregaRegistrada.observaciones}"
                </p>
              )}
            </div>
          )}

          {/* Calificación and feedback */}
          {cal && (() => {
            const rText = typeof cal.retroalimentacion === 'object' ? (cal.retroalimentacion?.comentario || '') : (cal.retroalimentacion || '');
            return (
              <div style={{ background: '#FAF9F8', border: '1px solid #EDEBE9', borderRadius: '4px', padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: '#242424', fontSize: '12.5px' }}>Calificación obtenida</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: getNoteColor(cal.nota) }}>
                    {cal.nota} <span style={{ fontSize: '12px', color: '#616161', fontWeight: 400 }}>/ {tarea.puntaje_maximo}</span>
                  </span>
                </div>
                {rText && (
                  <div style={{ borderLeft: '3px solid #5B5FC7', paddingLeft: 10, fontSize: '12px', color: '#242424', lineHeight: 1.5, marginTop: 6 }}>
                    Retroalimentación: "{rText}"
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#8A8886', marginTop: 8 }}>
                  Evaluado el {formatDate(cal.fecha_calificacion)} por {cal.docente || 'Docente'}
                </div>
              </div>
            );
          })()}

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
export default function MyTasks({ initialTaskId, initialFilter = 'pendientes' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId || null);

  const normalizeFilter = (f) => {
    if (!f || f === 'todos' || f === 'en_proceso' || f === 'proximamente' || f === 'pendientes') return 'pendientes';
    if (f === 'vencida' || f === 'vencidas') return 'vencidas';
    if (f === 'completado' || f === 'entregadas' || f === 'calificadas' || f === 'entregadas_calificadas') return 'entregadas_calificadas';
    return f;
  };

  const [filter, setFilter] = useState(normalizeFilter(initialFilter));

  const FILTERS = [
    { id: 'pendientes', label: 'Próximamente' },
    { id: 'vencidas', label: 'Vencida' },
    { id: 'entregadas_calificadas', label: 'Completado' },
  ];

  useEffect(() => {
    if (initialFilter) {
      setFilter(normalizeFilter(initialFilter));
    }
  }, [initialFilter]);

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
    (t.materia || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group tasks by date
  const groupsMap = {};
  filtered.forEach(task => {
    let dateToUse;
    if (filter === 'entregadas_calificadas') {
      dateToUse = task.mi_entrega?.fecha_entrega || task.mi_entrega?.calificacion?.fecha_calificacion || task.fecha_limite;
    } else {
      dateToUse = task.fecha_limite;
    }
    const label = formatTimelineDate(dateToUse);
    if (!groupsMap[label]) {
      groupsMap[label] = {
        label,
        rawDate: dateToUse ? new Date(dateToUse).getTime() : 0,
        tasks: []
      };
    }
    groupsMap[label].tasks.push(task);
  });

  const sortedGroups = Object.keys(groupsMap).map(k => groupsMap[k]).sort((a, b) => {
    if (filter === 'pendientes') {
      return a.rawDate - b.rawDate; // Closest deadline first
    }
    return b.rawDate - a.rawDate; // Most recent first for completed & overdue
  });

  return (
    <div style={{
      background: '#FFFFFF',
      minHeight: '85vh',
      borderRadius: 10,
      padding: '22px 26px',
      color: '#0F172A',
      border: '1px solid #E2E8F0',
      fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      {/* Top Header / Tabs (Microsoft Teams Clean Light Layout) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E2E8F0',
        marginBottom: 16,
        paddingBottom: 2
      }}>
        {/* Left Tabs */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {FILTERS.map(f => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#1E3A8A' : '#64748B',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  padding: '8px 2px 12px 2px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#1E3A8A'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#64748B'; }}
              >
                {f.label}
                {f.id === 'vencidas' && (
                  <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '14px', lineHeight: 1 }}>*</span>
                )}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: '#1E3A8A',
                    borderRadius: '3px 3px 0 0'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {showSearch ? (
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                autoFocus
                className="form-control"
                style={{
                  height: 28,
                  paddingLeft: 28,
                  paddingRight: 24,
                  fontSize: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  borderRadius: 4
                }}
                placeholder="Filtrar por tarea..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <X
                size={13}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748B', cursor: 'pointer' }}
                onClick={() => { setSearch(''); setShowSearch(false); }}
              />
            </div>
          ) : (
            <Search
              size={17}
              color="#64748B"
              style={{ cursor: 'pointer' }}
              title="Buscar tarea"
              onClick={() => setShowSearch(true)}
            />
          )}
          <Filter size={17} color="#64748B" style={{ cursor: 'pointer' }} title="Filtrar" />
          <Lightbulb size={17} color="#64748B" style={{ cursor: 'pointer' }} title="Ideas" />
        </div>
      </div>

      {/* Body / List Content */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Loading text="Cargando tareas..." />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
          <CheckCircle size={32} style={{ margin: '0 auto 10px', color: '#94A3B8' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
            {search ? 'Sin coincidencias' : 'Todo al día'}
          </div>
          <div style={{ fontSize: '12px', marginTop: 4 }}>
            {search ? `No se encontraron resultados para "${search}".` : 'No tienes tareas en esta sección.'}
          </div>
        </div>
      ) : (
        <div>
          {sortedGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 18 }}>
              {/* Timeline date header */}
              <div style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
                marginTop: 14,
                paddingLeft: 2,
                letterSpacing: '0.2px'
              }}>
                {group.label}
              </div>

              {/* Task Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.tasks.map(t => {
                  const badgeInfo = getSubjectBadgeInfo(t.materia);
                  const hasCalificacion = t.mi_entrega?.calificacion?.nota !== undefined && t.mi_entrega?.calificacion?.nota !== null;
                  const isSubmitted = !!t.mi_entrega;

                  let subline1 = '';
                  let subline1Color = '#64748B';

                  if (filter === 'entregadas_calificadas') {
                    if (isSubmitted && !hasCalificacion) {
                      subline1 = `Enviado a las ${formatHour(t.mi_entrega?.fecha_entrega)}`;
                    } else if (hasCalificacion) {
                      subline1 = `Evaluado por Prof. ${t.docente_nombre || 'Docente'}`;
                    }
                  } else if (filter === 'vencidas') {
                    subline1 = `Venció el ${formatTimelineDate(t.fecha_limite)}`;
                    subline1Color = '#DC2626';
                  } else {
                    subline1 = `Vence a las ${formatHour(t.fecha_limite)}`;
                  }

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 6,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                      }}
                    >
                      {/* Left: Badge + Titles */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                        {/* Squircle Badge */}
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          background: badgeInfo.bg,
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          letterSpacing: '0.5px'
                        }}>
                          {badgeInfo.initials}
                        </div>

                        {/* Title & Subtitles */}
                        <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#0F172A',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2px',
                            marginBottom: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {t.titulo}
                          </div>

                          {subline1 && (
                            <div style={{
                              fontSize: '11.5px',
                              color: subline1Color,
                              fontWeight: subline1Color === '#DC2626' ? 600 : 400,
                              marginBottom: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {subline1}
                            </div>
                          )}

                          <div style={{
                            fontSize: '11px',
                            color: '#64748B',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {t.materia} · {t.curso_nombre || t.espacio_nombre || 'Secundaria'}
                          </div>
                        </div>
                      </div>

                      {/* Right: Score, Status pill or Points + Info icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                        {filter === 'entregadas_calificadas' && (
                          hasCalificacion ? (
                            <span style={{ fontSize: '12.5px', color: '#0F172A', fontWeight: 700 }}>
                              {Math.round(t.mi_entrega.calificacion.nota)}/{t.puntaje_maximo || 100} puntos
                            </span>
                          ) : (
                            <span style={{
                              background: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                              padding: '3px 10px',
                              borderRadius: 4,
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              ✓ Entregado
                            </span>
                          )
                        )}

                        {filter === 'pendientes' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              {t.puntaje_maximo || 100} puntos
                            </span>
                            <span style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              padding: '3px 9px',
                              borderRadius: 4,
                              fontSize: '11px',
                              fontWeight: 600
                            }}>
                              Presentar
                            </span>
                          </div>
                        )}

                        {filter === 'vencidas' && (
                          <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                            Sin entregar · {t.puntaje_maximo || 100} pts
                          </span>
                        )}

                        <Info size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
