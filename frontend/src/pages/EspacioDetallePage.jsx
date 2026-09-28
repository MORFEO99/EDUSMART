import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, BookOpen, ClipboardList, Users, Award,
  CheckCircle, AlertCircle, ChevronDown, ChevronRight,
  Calendar, FileText, Eye, EyeOff, BarChart2, Plus, X,
  Upload, Send, Check
} from 'lucide-react';
import { Loading, EmptyState, Modal } from '../components';
import { getNoteColor } from '../utils';
import { GradeSubmissionModal } from './TeacherViews';
import { SubmitTaskForm } from './MyTasks';
import apiFetch from '../api';

function getBadgeStyle(estado, vencida) {
  if (estado === 'CALIFICADO' || estado === 'CALIFICADA') return { background: '#DCFCE7', color: '#166534' };
  if (vencida) return { background: '#FEE2E2', color: '#991B1B' };
  return { background: '#FEF3C7', color: '#92400E' };
}

// ─────────────────────────────────────────────────────────────
// Form: Crear Tarea dentro del Espacio
// ─────────────────────────────────────────────────────────────
function FormCrearTarea({ espacioId, onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: '', descripcion: '', fecha_limite: '', puntaje_maximo: 100, indicaciones: ''
  });
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files) {
      setArchivos(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.fecha_limite) return setError('Título y fecha límite son obligatorios');
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('titulo', form.titulo);
      formData.append('descripcion', form.descripcion);
      formData.append('indicaciones', form.indicaciones);
      formData.append('fecha_limite', form.fecha_limite);
      formData.append('puntaje_maximo', form.puntaje_maximo);
      
      archivos.forEach(file => {
        formData.append('archivos', file);
      });

      await apiFetch(`/api/v2/espacios/${espacioId}/crear-tarea/`, {
        method: 'POST',
        body: formData
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <div className="form-group">
        <label className="form-label">Título de la tarea *</label>
        <input className="form-control" placeholder="Ej: Informe de Laboratorio N°1" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="form-control" rows={3} placeholder="Describe la actividad..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Indicaciones específicas</label>
        <textarea className="form-control" rows={2} placeholder="Formato, criterios, normas..." value={form.indicaciones} onChange={e => setForm({ ...form, indicaciones: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Adjuntar archivos (opcional)</label>
        <input 
          type="file" 
          multiple 
          className="form-control" 
          onChange={handleFileChange} 
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
          style={{ padding: '8px' }}
        />
        {archivos.length > 0 && (
          <div style={{ fontSize: 12, color: '#1E3A8A', marginTop: 6 }}>
            {archivos.length} archivo(s) seleccionado(s)
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Fecha y hora límite *</label>
          <input className="form-control" type="datetime-local" value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="form-label">Puntaje máximo</label>
          <input className="form-control" type="number" min={1} max={100} value={form.puntaje_maximo} onChange={e => setForm({ ...form, puntaje_maximo: parseInt(e.target.value) || 100 })} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Publicando...' : 'Publicar tarea'}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-component: Reporte de alumnos por tarea
// ─────────────────────────────────────────────────────────────
function ReporteTarea({ tarea }) {
  const [tab, setTab] = useState('presentaron');

  const presentaron = tarea.entregas.filter(e => e.calificacion || (e.archivo_nombre && e.archivo_nombre !== 'Sin archivo'));
  const noPresentaron = tarea.entregas.filter(e => !presentaron.includes(e));
  const vieron = tarea.entregas.filter(e => presentaron.includes(e) || (e.estado && e.estado !== 'ASIGNADA'));
  const noVieron = tarea.entregas.filter(e => !vieron.includes(e));

  const listToShow = tab === 'presentaron' ? presentaron
    : tab === 'no_presentaron' ? noPresentaron
    : tab === 'vieron' ? vieron
    : noVieron;

  const tabs = [
    { id: 'presentaron', label: `Entregaron (${presentaron.length})`, color: '#166534', bg: '#DCFCE7' },
    { id: 'no_presentaron', label: `Faltan (${noPresentaron.length})`, color: '#991B1B', bg: '#FEE2E2' },
    { id: 'vieron', label: `Vieron (${vieron.length})`, color: '#1E3A8A', bg: '#DBEAFE' },
    { id: 'no_vieron', label: `No vieron (${noVieron.length})`, color: '#92400E', bg: '#FEF3C7' },
  ];

  return (
    <div style={{ padding: '12px 18px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: tab === t.id ? t.bg : '#F1F5F9',
              color: tab === t.id ? t.color : '#64748B',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {listToShow.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: '10px 0' }}>
          Ningún estudiante en esta lista.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {listToShow.map((ent, idx) => (
            <div key={ent.id || idx} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: '#FFFFFF',
              borderRadius: 8, border: '1px solid #E2E8F0',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#1E3A8A', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {ent.estudiante_nombre?.slice(0, 2).toUpperCase() || 'ES'}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0F172A' }}>
                {ent.estudiante_nombre}
              </span>
              {tab === 'presentaron' && ent.calificacion && (
                <span style={{ fontSize: 13, fontWeight: 700, color: getNoteColor(ent.calificacion.nota) }}>
                  {ent.calificacion.nota}/100
                </span>
              )}
              {tab === 'presentaron' && !ent.calificacion && (
                <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>Sin calificar</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-component: Lista de entregas de una tarea
// ─────────────────────────────────────────────────────────────
function EntregasTarea({ tarea, onCalificar }) {
  return (
    <div style={{ borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
      {tarea.entregas.length === 0 ? (
        <div style={{ padding: '16px 18px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
          Ningún estudiante ha entregado esta tarea aún.
        </div>
      ) : (
        <div>
          <div style={{
            padding: '8px 18px', fontSize: 11, fontWeight: 700,
            color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px',
            borderBottom: '1px solid #E2E8F0',
          }}>
            {tarea.entregas.length} entrega{tarea.entregas.length !== 1 ? 's' : ''} recibida{tarea.entregas.length !== 1 ? 's' : ''}
          </div>

          {tarea.entregas.map((ent, idx) => (
            <div key={ent.id || idx} style={{
              padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: idx < tarea.entregas.length - 1 ? '1px solid #F1F5F9' : 'none',
              background: '#FFFFFF',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#5B5FC7', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {ent.estudiante_nombre?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{ent.estudiante_nombre}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                  {ent.archivo_nombre} · {ent.fecha_entrega}
                </div>
                {ent.calificacion?.retroalimentacion && (
                  <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                    💬 {ent.calificacion.retroalimentacion}
                  </div>
                )}
              </div>

              {ent.calificacion ? (
                <span style={{ fontWeight: 700, fontSize: 15, color: getNoteColor(ent.calificacion.nota), minWidth: 50, textAlign: 'right' }}>
                  {ent.calificacion.nota}/100
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>Sin calificar</span>
              )}

              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 11, flexShrink: 0 }}
                onClick={() => onCalificar({ ...ent, tarea_titulo: tarea.titulo, tarea_id: tarea.id })}
              >
                <Award size={12} /> {ent.calificacion ? 'Editar' : 'Calificar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Student task badge helper
// ─────────────────────────────────────────────────────────────
function getEstadoBadge(estado, esta_vencida) {
  if (estado === 'CALIFICADA') return { label: 'Calificada', bg: '#DCFCE7', color: '#166534' };
  if (estado === 'ENTREGADA' || estado === 'EN_REVISION') return { label: 'Entregada', bg: '#DBEAFE', color: '#1E3A8A' };
  if (esta_vencida || estado === 'VENCIDA') return { label: 'Vencida', bg: '#FEE2E2', color: '#991B1B' };
  return { label: 'Pendiente', bg: '#FEF3C7', color: '#92400E' };
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function EspacioDetallePage({ espacioId, onBack, user }) {
  const isEstudiante = user?.rol === 'ESTUDIANTE';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openTarea, setOpenTarea] = useState(null);
  const [vistaExpandida, setVistaExpandida] = useState({});
  const [gradingEntrega, setGradingEntrega] = useState(null);
  const [showCrearTarea, setShowCrearTarea] = useState(false);
  const [activeTab, setActiveTab] = useState('tareas');
  const [submitTarea, setSubmitTarea] = useState(null);  // tarea to submit for student

  const loadData = () => {
    setLoading(true);
    const url = isEstudiante
      ? `/api/tareas/?espacio_id=${espacioId}&filtro=todas`
      : `/api/v2/espacios/${espacioId}/tareas/`;
    apiFetch(url)
      .then(res => {
        if (isEstudiante) {
          // For students, api returns a flat array of tasks
          // We need espacio info too, fetch from /api/espacios/
          apiFetch(`/api/espacios/${espacioId}/`)
            .then(espInfo => setData({ espacio: espInfo, tareas: res, estudiantes: [] }))
            .catch(() => setData({ espacio: { nombre: 'Espacio' }, tareas: res, estudiantes: [] }));
        } else {
          setData(res);
        }
      })
      .catch(err => setError(err.message || 'Error cargando el espacio'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (espacioId) loadData();
  }, [espacioId]);

  const toggleVista = (tareaId, vista) => {
    setVistaExpandida(prev => {
      if (prev[tareaId] === vista) return { ...prev, [tareaId]: null };
      return { ...prev, [tareaId]: vista };
    });
  };

  if (loading) return <div className="page-container"><Loading text="Cargando espacio académico..." /></div>;

  if (error) return (
    <div className="page-container">
      <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Volver
      </button>
      <div style={{ padding: 20, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626' }}>
        <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {error}
      </div>
    </div>
  );

  const espacio = data?.espacio;
  const tareas = data?.tareas || [];
  const estudiantes = data?.estudiantes || [];
  const totalEntregas = tareas.reduce((acc, t) => acc + t.total_entregas, 0);
  const pendientesCalificar = tareas.reduce((acc, t) => acc + t.entregas.filter(e => !e.calificacion).length, 0);

  return (
    <div className="page-container">
      {/* Back + Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: 14 }}>
          <ArrowLeft size={14} /> Volver a mis colegios
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>{espacio?.colegio}</span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 600 }}>{espacio?.curso}</span>
          <ChevronRight size={12} />
          <span style={{ color: '#1E3A8A', fontWeight: 700 }}>{espacio?.materia}</span>
        </div>

        {/* Header card */}
        <div style={{
          background: 'linear-gradient(135deg, #0F1E3D 0%, #1E3A8A 100%)',
          borderRadius: 12, padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 16, color: 'white',
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BookOpen size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{espacio?.materia || espacio?.nombre}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
              {espacio?.colegio} · {espacio?.curso}
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, fontSize: 13, textAlign: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{tareas.length}</div>
              <div style={{ opacity: 0.7 }}>Tareas</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{totalEntregas}</div>
              <div style={{ opacity: 0.7 }}>Entregas</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22, color: pendientesCalificar > 0 ? '#FCD34D' : '#6EE7B7' }}>
                {pendientesCalificar}
              </div>
              <div style={{ opacity: 0.7 }}>Por calificar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main tab navigation */}
      <div className="teams-tabs" style={{ marginBottom: 16 }}>
        <button className={`teams-tab ${activeTab === 'tareas' ? 'active' : ''}`} onClick={() => setActiveTab('tareas')}>
          <ClipboardList size={13} /> Tareas ({tareas.length})
        </button>
        {!isEstudiante && (
          <button className={`teams-tab ${activeTab === 'estudiantes' ? 'active' : ''}`} onClick={() => setActiveTab('estudiantes')}>
            <Users size={13} /> Estudiantes ({estudiantes.length})
          </button>
        )}
        {!isEstudiante && (
          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowCrearTarea(true)}
          >
            <Plus size={13} /> Nueva tarea
          </button>
        )}
      </div>

      {/* ── Tareas tab: ESTUDIANTE VIEW ── */}
      {activeTab === 'tareas' && isEstudiante && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tareas.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Sin tareas publicadas" description="El docente aún no ha publicado tareas en este espacio." />
          ) : (
            tareas.map(tarea => {
              const badge = getEstadoBadge(tarea.estado_estudiante, tarea.esta_vencida);
              const miEntrega = tarea.mi_entrega;
              const cal = miEntrega?.calificacion;
              const yaEntrego = !!miEntrega;

              return (
                <div key={tarea.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFF' }}>
                  <div style={{ padding: '16px 18px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{tarea.titulo}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B', flexWrap: 'wrap' }}>
                          <span><Calendar size={11} style={{ verticalAlign: 'middle' }} /> Límite: {new Date(tarea.fecha_limite).toLocaleDateString()}</span>
                          <span><FileText size={11} style={{ verticalAlign: 'middle' }} /> {tarea.puntaje_maximo} pts</span>
                        </div>
                      </div>

                      {/* Action button */}
                      <div style={{ flexShrink: 0 }}>
                        {tarea.esta_vencida && !yaEntrego ? (
                          <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 600 }}>Vencida</span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setSubmitTarea(tarea)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {yaEntrego ? <><Check size={13} /> Actualizar</> : <><Upload size={13} /> Entregar</>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {tarea.descripcion && (
                      <p style={{ fontSize: 12.5, color: '#475569', background: '#F8FAFC', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                        {tarea.descripcion}
                      </p>
                    )}

                    {/* Materials */}
                    {tarea.materiales?.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        {tarea.materiales.map(mat => (
                          <a
                            key={mat.id}
                            href={mat.archivo_url?.startsWith('http') ? mat.archivo_url : `http://localhost:8000${mat.archivo_url}`}
                            target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 20, fontSize: 11, color: '#1E3A8A', textDecoration: 'none', fontWeight: 600 }}
                          >
                            <FileText size={12} />{mat.nombre}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* My submission info */}
                    {miEntrega && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '10px 14px', marginBottom: 10 }}>
                        <div style={{ fontWeight: 600, color: '#16A34A', fontSize: 12, marginBottom: 4 }}>✓ Entrega registrada</div>
                        <div style={{ fontSize: 11.5, color: '#475569' }}>
                          Archivo: <strong>{miEntrega.archivo_nombre}</strong> · {new Date(miEntrega.fecha_entrega).toLocaleString()}
                        </div>
                        {miEntrega.observaciones && (
                          <div style={{ fontSize: 11.5, color: '#64748B', fontStyle: 'italic', marginTop: 4 }}>"{miEntrega.observaciones}"</div>
                        )}
                      </div>
                    )}

                    {/* Grade */}
                    {cal && (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: 12.5, color: '#0F172A' }}>Calificación</span>
                          <span style={{ fontSize: 20, fontWeight: 800, color: getNoteColor(cal.nota) }}>
                            {cal.nota}<span style={{ fontSize: 12, fontWeight: 400, color: '#64748B' }}>/{tarea.puntaje_maximo}</span>
                          </span>
                        </div>
                        {cal.retroalimentacion && (
                          <div style={{ borderLeft: '3px solid #1E3A8A', paddingLeft: 10, fontSize: 12, color: '#475569', marginTop: 8 }}>
                            💬 {cal.retroalimentacion?.comentario || cal.retroalimentacion}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tareas tab: DOCENTE VIEW ── */}
      {activeTab === 'tareas' && !isEstudiante && (
        <>
      {tareas.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin tareas en este espacio"
          description="Crea la primera tarea con el botón 'Nueva tarea' de arriba."
          action={<button className="btn btn-primary" onClick={() => setShowCrearTarea(true)}><Plus size={14} /> Nueva tarea</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tareas.map(tarea => {
            const badgeStyle = getBadgeStyle(tarea.estado, tarea.esta_vencida);
            const pendientes = tarea.entregas.filter(e => !e.calificacion).length;
            const vistaActiva = vistaExpandida[tarea.id];

            return (
              <div key={tarea.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFF' }}>
                {/* Task header */}
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{tarea.titulo}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, ...badgeStyle }}>
                          {tarea.esta_vencida ? 'Vencida' : tarea.estado}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B', flexWrap: 'wrap' }}>
                        <span><Calendar size={11} style={{ verticalAlign: 'middle' }} /> Límite: {tarea.fecha_limite}</span>
                        <span><FileText size={11} style={{ verticalAlign: 'middle' }} /> {tarea.puntaje_maximo} pts</span>
                        <span style={{ color: '#1E3A8A', fontWeight: 600 }}>
                          {tarea.total_entregas} entregaron
                        </span>
                        {pendientes > 0 && (
                          <span style={{ color: '#D97706', fontWeight: 600 }}>
                            {pendientes} por calificar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attached Materials */}
                  {tarea.materiales && tarea.materiales.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                      {tarea.materiales.map(mat => (
                        <a
                          key={mat.id}
                          href={mat.url.startsWith('http') ? mat.url : `http://localhost:8000${mat.url}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', background: '#EFF6FF',
                            border: '1px solid #BFDBFE', borderRadius: 20,
                            fontSize: 11, color: '#1E3A8A', textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          <FileText size={12} />
                          {mat.nombre} ({mat.tamano})
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Action buttons — always visible inside the task */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className={`btn btn-sm ${vistaActiva === 'entregas' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => toggleVista(tarea.id, 'entregas')}
                    >
                      <ClipboardList size={13} />
                      Ver entregas ({tarea.total_entregas})
                      {vistaActiva === 'entregas' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <button
                      className={`btn btn-sm ${vistaActiva === 'reporte' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleVista(tarea.id, 'reporte')}
                    >
                      <BarChart2 size={13} />
                      Reporte alumnos
                      {vistaActiva === 'reporte' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  </div>
                </div>

                {/* Expandable: entregas */}
                {vistaActiva === 'entregas' && (
                  <EntregasTarea tarea={tarea} onCalificar={setGradingEntrega} />
                )}

                {/* Expandable: reporte */}
                {vistaActiva === 'reporte' && (
                  <ReporteTarea tarea={tarea} />
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* ── Estudiantes tab ── */}
      {activeTab === 'estudiantes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {estudiantes.length === 0 ? (
            <EmptyState icon={Users} title="Sin estudiantes" description="Comparte el código de invitación para que los estudiantes se unan." />
          ) : (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ background: '#0F1E3D', color: 'white', padding: '10px 18px', display: 'grid', gridTemplateColumns: '2fr ' + tareas.map(() => '1fr').join(' '), gap: 8, fontSize: 11, fontWeight: 700 }}>
                <span>ESTUDIANTE</span>
                {tareas.map(t => (
                  <span key={t.id} style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.titulo}>
                    {t.titulo.slice(0, 12)}{t.titulo.length > 12 ? '…' : ''}
                  </span>
                ))}
              </div>

              {/* Student rows */}
              {estudiantes.map((est, idx) => (
                <div key={est.id} style={{
                  padding: '12px 18px',
                  display: 'grid',
                  gridTemplateColumns: '2fr ' + tareas.map(() => '1fr').join(' '),
                  gap: 8,
                  alignItems: 'center',
                  borderBottom: idx < estudiantes.length - 1 ? '1px solid #F1F5F9' : 'none',
                  background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                }}>
                  {/* Student info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#5B5FC7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {est.nombre?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{est.nombre}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>RU: {est.ru}</div>
                    </div>
                  </div>

                  {/* Participation per task */}
                  {tareas.map(tarea => {
                    const part = tarea.participacion?.find(p => p.estudiante_id === est.id);
                    const entrego = part?.entrego;
                    const cal = part?.calificacion;
                    return (
                      <div key={tarea.id} style={{ textAlign: 'center' }}>
                        {entrego ? (
                          <div>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534' }}>✓ Entregó</span>
                            {cal && <div style={{ fontSize: 10, color: '#166534', marginTop: 2, fontWeight: 700 }}>{cal.nota}/100</div>}
                          </div>
                        ) : (
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#FEE2E2', color: '#991B1B' }}>✗ Falta</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grade modal */}
      {gradingEntrega && (
        <Modal open={true} onClose={() => setGradingEntrega(null)} title="Calificar entrega">
          <GradeSubmissionModal
            entrega={gradingEntrega}
            onClose={() => setGradingEntrega(null)}
            onSuccess={() => { setGradingEntrega(null); loadData(); }}
          />
        </Modal>
      )}

      {/* Crear tarea modal */}
      <Modal open={showCrearTarea} onClose={() => setShowCrearTarea(false)} title="Nueva tarea en este espacio">
        <FormCrearTarea
          espacioId={espacioId}
          onClose={() => setShowCrearTarea(false)}
          onSaved={loadData}
        />
      </Modal>

      {/* Student: Submit task modal */}
      {submitTarea && (
        <Modal open={true} onClose={() => setSubmitTarea(null)} title={submitTarea.mi_entrega ? 'Actualizar entrega' : 'Entregar tarea'}>
          <SubmitTaskForm
            tarea={{
              ...submitTarea,
              materia: submitTarea.espacio_nombre,
              docente: submitTarea.docente_nombre,
            }}
            existingEntrega={submitTarea.mi_entrega}
            onSuccess={() => { setSubmitTarea(null); loadData(); }}
            onCancel={() => setSubmitTarea(null)}
          />
        </Modal>
      )}
    </div>
  );
}
