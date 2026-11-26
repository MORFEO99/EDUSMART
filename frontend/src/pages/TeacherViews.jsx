import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList, Plus, InboxIcon, Award, Users, BarChart2,
  Clock, CheckCircle, Search, Filter, Eye, Download, ChevronRight,
  Send, AlertTriangle, Paperclip, Calendar, FileSpreadsheet,
  BookOpen, CheckSquare, Square, Layers, Trash2, Edit3, X, TrendingUp,
  ChevronDown, ChevronUp, RefreshCw, EyeOff, Bell, ExternalLink, RotateCcw,
  Check, FileText, School, GraduationCap, Sparkles, Calculator, Target, Activity,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import apiFetch, { teacherAPI, commonAPI, topicTrackerAPI, aiPracticeAPI, analisisNumericoAPI } from '../api';
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
      setError('La calificacion debe ser un valor numerico entre 0 y 100.');
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
      setError(err.message || 'Error al guardar la calificacion.');
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
          Calificacion guardada
        </h3>
        <p style={{ color: '#616161', fontSize: '12.5px' }}>
          La nota y retroalimentacion se registraron en el expediente de {entrega.estudiante_nombre}.
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
          Matricula: {entrega.estudiante_matricula} - Entregado el {entrega.fecha_entrega}
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
          Calificacion (Escala 0 a 100) <span className="required">*</span>
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
          Retroalimentacion formativa y observaciones pedagogicas
        </label>
        <textarea
          className="form-control"
          rows={4}
          placeholder="Escribe comentarios especificos, fortalezas del trabajo y aspectos a mejorar para el estudiante..."
          value={retro}
          onChange={(e) => setRetro(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Award size={14} />
          {loading ? 'Guardando...' : 'Asignar calificacion'}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// MODAL: DEVOLVER ENTREGA PARA CORRECCION
// ============================================================
export function DevolverEntregaModal({ entrega, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Por favor indica las observaciones o motivo de la devolucion.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await teacherAPI.devolverSubmission(entrega.entrega_id || entrega.id, motivo);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al devolver la entrega.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Devolver Entrega para Correccion">
      <form onSubmit={handleSubmit}>
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E' }}>
            {entrega.estudiante_nombre} &bull; {entrega.tarea_titulo}
          </div>
          <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>
            Al devolver la entrega, el estudiante recibira una notificacion en su plataforma y podra enviar una nueva version corregida.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Motivo o instrucciones de correccion <span className="required">*</span>
          </label>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Indica que aspectos debe corregir o completar el estudiante antes de volver a presentar..."
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#D97706', borderColor: '#D97706' }}>
            <RotateCcw size={14} /> {loading ? 'Devolviendo...' : 'Confirmar y Devolver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// MODAL: SEGUIMIENTO DE LECTURA Y QUIEN VIO LA TAREA
// ============================================================
export function TareaVistasModal({ tareaId, tareaTitulo, onClose, onGrading }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todos');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    teacherAPI.taskViews(tareaId)
      .then(res => {
        setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tareaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReminder = async (tipo) => {
    setSendingReminder(true);
    setReminderMsg('');
    try {
      const res = await teacherAPI.sendViewsReminder(tareaId, { tipo });
      setReminderMsg(res.mensaje || 'Recordatorio enviado exitosamente a los estudiantes.');
      setTimeout(() => setReminderMsg(''), 4000);
    } catch (err) {
      setReminderMsg('Error al enviar recordatorio: ' + (err.message || 'Error'));
    } finally {
      setSendingReminder(false);
    }
  };

  const estudiantes = data?.estudiantes || [];
  const stats = data?.stats || {};
  const tarea = data?.tarea || {};

  const filteredEstudiantes = estudiantes.filter(est => {
    if (search && !est.nombre_completo.toLowerCase().includes(search.toLowerCase()) &&
        !est.matricula.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (tab === 'vieron') return est.ha_visto;
    if (tab === 'sin_ver') return !est.ha_visto;
    if (tab === 'entregaron') return est.ha_entregado;
    if (tab === 'pendientes') return !est.ha_entregado;
    return true;
  });

  return (
    <Modal open={true} onClose={onClose} title={`Seguimiento de Lectura: ${tarea.titulo || tareaTitulo || 'Tarea'}`}>
      {loading ? (
        <Loading text="Consultando visualizaciones y entregas de los estudiantes..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header Info */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
            borderRadius: 10, padding: '14px 18px', color: '#FFFFFF'
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93C5FD', fontWeight: 700 }}>
              {tarea.colegio_nombre} &bull; {tarea.curso_nombre} &bull; {tarea.materia_nombre}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
              {tarea.titulo}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#E2E8F0', marginTop: 8, flexWrap: 'wrap' }}>
              <span>Fecha limite: <strong>{tarea.fecha_limite || 'Sin limite'}</strong></span>
              <span>Puntaje maximo: <strong>{tarea.puntaje_maximo || 100} pts</strong></span>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1E293B' }}>{stats.total_alumnos || 0}</div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Total Alumnos</div>
            </div>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>
                {stats.vieron || 0} <span style={{ fontSize: 12, fontWeight: 600 }}>({stats.porcentaje_visto || 0}%)</span>
              </div>
              <div style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>Vieron la tarea</div>
            </div>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{stats.sin_ver || 0}</div>
              <div style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>No han visto</div>
            </div>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2563EB' }}>{stats.entregaron || 0}</div>
              <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600 }}>Han entregado</div>
            </div>
          </div>

          {/* Quick Reminder Action Bar */}
          <div style={{
            background: '#F1F5F9', borderRadius: 8, padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={14} style={{ color: '#F59E0B' }} /> Recordatorios de tarea:
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm"
                style={{ background: '#DC2626', color: '#FFFFFF', fontSize: 11, padding: '4px 10px' }}
                disabled={sendingReminder || stats.sin_ver === 0}
                onClick={() => handleSendReminder('sin_ver')}
                title="Enviar notificacion a quienes aun no han abierto la tarea"
              >
                <EyeOff size={12} /> Notificar a quienes no la han visto ({stats.sin_ver || 0})
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#2563EB', color: '#FFFFFF', fontSize: 11, padding: '4px 10px' }}
                disabled={sendingReminder || stats.pendientes_entrega === 0}
                onClick={() => handleSendReminder('sin_entregar')}
                title="Enviar notificacion a quienes aun no han presentado su tarea"
              >
                <Clock size={12} /> Recordar pendientes de entrega ({stats.pendientes_entrega || 0})
              </button>
            </div>
          </div>

          {reminderMsg && (
            <Alert type={reminderMsg.includes('Error') ? 'error' : 'success'} onClose={() => setReminderMsg('')}>
              {reminderMsg}
            </Alert>
          )}

          {/* Filter Tabs and Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'todos', label: `Todos (${estudiantes.length})` },
                { id: 'vieron', label: `Vieron (${stats.vieron || 0})` },
                { id: 'sin_ver', label: `No vieron (${stats.sin_ver || 0})` },
                { id: 'entregaron', label: `Entregaron (${stats.entregaron || 0})` },
                { id: 'pendientes', label: `Sin entrega (${stats.pendientes_entrega || 0})` },
              ].map(t => (
                <button
                  key={t.id}
                  className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: 11.5, padding: '4px 9px' }}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: 200 }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 28, height: 30, fontSize: 12 }}
                placeholder="Filtrar alumno..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Students List */}
          <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            {filteredEstudiantes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B', fontSize: 13 }}>
                No se encontraron estudiantes con este filtro.
              </div>
            ) : (
              <table className="table" style={{ margin: 0, fontSize: 12.5 }}>
                <thead style={{ background: '#F8FAFC', position: 'sticky', top: 0 }}>
                  <tr>
                    <th>Estudiante</th>
                    <th>Estado de Lectura</th>
                    <th>Estado de Entrega</th>
                    <th>Nota</th>
                    <th style={{ textAlign: 'center' }}>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstudiantes.map(est => {
                    const initials = (est.nombre_completo || 'ES').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                    return (
                      <tr key={est.estudiante_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: '#3B82F6', color: '#FFFFFF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{est.nombre_completo}</div>
                              <div style={{ fontSize: 10.5, color: '#64748B' }}>{est.matricula}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {est.ha_visto ? (
                            <div>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0'
                              }}>
                                <Eye size={12} /> Visto
                              </span>
                              <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                                {est.fecha_primera_vista ? `1ra vista: ${est.fecha_primera_vista}` : ''}
                                {est.total_vistas > 1 ? ` (${est.total_vistas} veces)` : ''}
                              </div>
                            </div>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA'
                            }}>
                              <EyeOff size={12} /> No ha visto la tarea
                            </span>
                          )}
                        </td>
                        <td>
                          {est.ha_entregado ? (
                            <div>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: est.estado_entrega === 'CALIFICADO' ? '#ECFDF5' : est.estado_entrega === 'ATRASADO' ? '#FEF3C7' : '#EFF6FF',
                                color: est.estado_entrega === 'CALIFICADO' ? '#059669' : est.estado_entrega === 'ATRASADO' ? '#D97706' : '#2563EB',
                              }}>
                                <CheckCircle size={12} /> {est.estado_entrega === 'CALIFICADO' ? 'Calificada' : est.estado_entrega === 'ATRASADO' ? 'Entregada con retraso' : 'Entregada'}
                              </span>
                              {est.archivo_nombre && (
                                <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Paperclip size={10} /> {est.archivo_nombre}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: '#F1F5F9', color: '#64748B'
                            }}>
                              <Clock size={11} /> Sin entrega
                            </span>
                          )}
                        </td>
                        <td>
                          {est.nota !== null && est.nota !== undefined ? (
                            <span style={{ fontWeight: 800, fontSize: 13, color: getNoteColor(est.nota) }}>
                              {est.nota}/100
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {est.ha_entregado ? (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => {
                                onClose();
                                onGrading?.(est);
                              }}
                            >
                              <Award size={12} /> {est.nota !== null ? 'Editar nota' : 'Calificar'}
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                              onClick={() => handleSendReminder('sin_entregar')}
                              title="Enviar recordatorio a este alumno"
                            >
                              <Send size={11} /> Recordar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============================================================
// 1. GESTOR DE AVANCE DE TEMAS (TOPIC PROGRESS TRACKER)
// ============================================================

const ESTADO_CONFIG = {
  PENDIENTE:   { label: 'Pendiente',    color: '#64748B', bg: '#F1F5F9', dot: 'O', btn: 'Iniciar' },
  EN_PROGRESO: { label: 'En Progreso', color: '#D97706', bg: '#FEF3C7', dot: '~', btn: 'Completar' },
  COMPLETADO:  { label: 'Completado',  color: '#059669', bg: '#D1FAE5', dot: 'V', btn: 'Reabrir' },
};

const NEXT_STATE = {

  PENDIENTE: 'EN_PROGRESO',
  EN_PROGRESO: 'COMPLETADO',
  COMPLETADO: 'PENDIENTE',
};

function AddTemaModal({ materiaId, onClose, onCreated }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', unidad: '', orden: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) { setError('El Título es obligatorio.'); return; }
    setLoading(true); setError('');
    try {
      const created = await topicTrackerAPI.crearTema(materiaId, form);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear el tema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Subir Contenido / Tema y Generar Evaluación IA">
      <form onSubmit={handleSubmit}>
        <div style={{
          background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8,
          padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#3730A3',
          display: 'flex', alignItems: 'flex-start', gap: 8
        }}>
          <Sparkles size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Al guardar este tema o contenido, la <strong>IA generará y publicará automáticamente</strong> un cuestionario de evaluación en el perfil de tus estudiantes.
          </span>
        </div>
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <div className="form-group">
          <label className="form-label">Título del Tema <span className="required">*</span></label>
          <input
            className="form-control" autoFocus
            placeholder="Ej: Algebra Lineal - Matrices y Determinantes"
            value={form.titulo}
            onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Unidad / Bimestre</label>
            <input
              className="form-control"
              placeholder="Ej: Unidad 1"
              value={form.unidad}
              onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Orden / N° de tema</label>
            <input
              className="form-control" type="number" min="0"
              value={form.orden}
              onChange={e => setForm(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Descripción / Objetivos (opcional)</label>
          <textarea
            className="form-control" rows={3}
            placeholder="Describe qué abarca este tema, competencias esperadas..."
            value={form.descripcion}
            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Plus size={14} /> {loading ? 'Guardando...' : 'Agregar Tema'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function TeacherTasksView({ onNavigate, onOpenCreate }) {
  // Main Tab State: 'tareas' (por defecto) vs 'avance' (IA & Temas)
  const [activeTab, setActiveTab] = useState('tareas');

  // Tasks Data state (Gestión de Tareas Docentes)
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('todas'); // Por defecto 'todas'

  // Filtros de jerarquía académica para Tareas
  const [filterColegioId, setFilterColegioId] = useState('TODOS');
  const [filterCursoId, setFilterCursoId]     = useState('TODOS');
  const [filterMateriaId, setFilterMateriaId] = useState('TODOS');

  const loadTasks = () => {
    setLoadingTasks(true);
    teacherAPI.tasks()
      .then(res => setTasks(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoadingTasks(false));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // 
  // Data state
  // 
  const [estructura, setEstructura] = useState([]);  // [{colegio_id, colegio_nombre, cursos:[...]}]
  const [temas, setTemas] = useState([]);
  const [stats, setStats] = useState({ total: 0, completados: 0, en_progreso: 0, pendientes: 0, porcentaje_avance: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingTemas, setLoadingTemas] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [toggling, setToggling] = useState(null);  // tema id being toggled
  const [deleting, setDeleting] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(null); // tema id generating AI practice
  const [aiSuccessMsg, setAiSuccessMsg] = useState(null);

  // 
  // Cascade selectors
  // 
  const [selectedColegioId, setSelectedColegioId] = useState(null);
  const [selectedCursoId, setSelectedCursoId]     = useState(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState(null);

  // 
  // Load the materia structure (colegios + cursos + materias)
  // 
  const loadEstructura = useCallback(async () => {
    setLoading(true);
    try {
      const data = await topicTrackerAPI.materiasConTemas();
      setEstructura(data || []);
      // Auto-select first items
      if (data && data.length > 0) {
        const firstColegio = data[0];
        setSelectedColegioId(firstColegio.colegio_id);
        if (firstColegio.cursos && firstColegio.cursos.length > 0) {
          const firstCurso = firstColegio.cursos[0];
          setSelectedCursoId(firstCurso.curso_id);
          if (firstCurso.materias && firstCurso.materias.length > 0) {
            setSelectedMateriaId(firstCurso.materias[0].materia_id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading estructura:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEstructura(); }, [loadEstructura]);

  // 
  // Derived selectors
  // 
  const colegios = estructura;
  const cursos = useMemo(() => {
    const c = colegios.find(x => x.colegio_id === selectedColegioId);
    return c ? c.cursos : [];
  }, [colegios, selectedColegioId]);

  const materias = useMemo(() => {
    const c = cursos.find(x => x.curso_id === selectedCursoId);
    return c ? c.materias : [];
  }, [cursos, selectedCursoId]);

  const selectedColegio = colegios.find(x => x.colegio_id === selectedColegioId);
  const selectedCurso   = cursos.find(x => x.curso_id === selectedCursoId);
  const selectedMateria = materias.find(x => x.materia_id === selectedMateriaId);

  // 
  // Load topics when materia changes
  // 
  useEffect(() => {
    if (!selectedMateriaId) { setTemas([]); return; }
    setLoadingTemas(true);
    topicTrackerAPI.temas(selectedMateriaId)
      .then(res => {
        setTemas(res.temas || []);
        setStats(res.stats || {});
      })
      .catch(console.error)
      .finally(() => setLoadingTemas(false));
  }, [selectedMateriaId]);

  // 
  // Handlers
  // 
  const handleToggleEstado = async (tema) => {
    const nextState = NEXT_STATE[tema.estado];
    setToggling(tema.id);
    try {
      const updated = await topicTrackerAPI.actualizarTema(selectedMateriaId, tema.id, { estado: nextState });
      setTemas(prev => prev.map(t => t.id === tema.id ? {
        ...t, ...updated,
        tiene_practica: updated.tiene_simulador_examen !== undefined ? updated.tiene_simulador_examen : t.tiene_practica,
        practica_id: updated.practica_id || t.practica_id
      } : t));

      if (updated.tiene_simulador_examen) {
        setAiSuccessMsg(`✨ ¡Tema completado! Se ha generado automáticamente el simulador de examen con IA para los estudiantes.`);
        setTimeout(() => setAiSuccessMsg(null), 5000);
      }

      // Recalc stats
      setTemas(prev => {
        const all = prev;
        const total = all.length;
        const completados = all.filter(t => t.estado === 'COMPLETADO').length;
        const en_progreso = all.filter(t => t.estado === 'EN_PROGRESO').length;
        const pendientes  = all.filter(t => t.estado === 'PENDIENTE').length;
        setStats({ total, completados, en_progreso, pendientes, porcentaje_avance: total > 0 ? Math.round(completados / total * 100) : 0 });
        return all;
      });
    } catch (err) {
      console.error('Error toggling tema:', err);
    } finally {
      setToggling(null);
    }
  };

  const handleGenerarPractica = async (tema) => {
    setGeneratingAi(tema.id);
    try {
      const res = await aiPracticeAPI.generarPracticaTema(tema.id, { cantidad: 5, dificultad: 'INTERMEDIO' });
      setTemas(prev => prev.map(t => t.id === tema.id ? { ...t, tiene_practica: true, practica_id: res.practica_id } : t));
      setAiSuccessMsg(`✨ ¡Simulador con IA generado con éxito para "${tema.titulo}" (${res.total_preguntas} ejercicios)! Notificaciones enviadas.`);
      setTimeout(() => setAiSuccessMsg(null), 5000);
    } catch (err) {
      alert('Error generando simulador con IA: ' + (err.message || 'Error del servidor'));
    } finally {
      setGeneratingAi(null);
    }
  };

  const handleDelete = async (tema) => {
    if (!window.confirm(`Eliminar el tema "${tema.titulo}"? Esta accion no se puede deshacer.`)) return;
    setDeleting(tema.id);
    try {
      await topicTrackerAPI.eliminarTema(selectedMateriaId, tema.id);
      setTemas(prev => {
        const all = prev.filter(t => t.id !== tema.id);
        const total = all.length;
        const completados = all.filter(t => t.estado === 'COMPLETADO').length;
        const en_progreso = all.filter(t => t.estado === 'EN_PROGRESO').length;
        const pendientes  = all.filter(t => t.estado === 'PENDIENTE').length;
        setStats({ total, completados, en_progreso, pendientes, porcentaje_avance: total > 0 ? Math.round(completados / total * 100) : 0 });
        return all;
      });
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  const handleTemaCreated = (newTema) => {
    setTemas(prev => {
      const all = [...prev, newTema];
      const total = all.length;
      const completados = all.filter(t => t.estado === 'COMPLETADO').length;
      const en_progreso = all.filter(t => t.estado === 'EN_PROGRESO').length;
      const pendientes  = all.filter(t => t.estado === 'PENDIENTE').length;
      setStats({ total, completados, en_progreso, pendientes, porcentaje_avance: total > 0 ? Math.round(completados / total * 100) : 0 });
      return all;
    });
    if (newTema?.tiene_practica) {
      setAiSuccessMsg(`✨ ¡Contenido "${newTema.titulo}" publicado y evaluación con IA generada automáticamente para tus estudiantes!`);
      setTimeout(() => setAiSuccessMsg(null), 6000);
    }
  };

  // 
  // Filtered topics
  // 
  const filteredTemas = temas.filter(t => {
    if (filterEstado !== 'TODOS' && t.estado !== filterEstado) return false;
    if (search && !t.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !(t.descripcion || '').toLowerCase().includes(search.toLowerCase()) &&
        !(t.unidad || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // 
  // Cascade change handlers
  // 
  const onSelectColegio = (id) => {
    setSelectedColegioId(id);
    const c = colegios.find(x => x.colegio_id === id);
    const firstCurso = c && c.cursos && c.cursos[0];
    setSelectedCursoId(firstCurso ? firstCurso.curso_id : null);
    const firstMateria = firstCurso && firstCurso.materias && firstCurso.materias[0];
    setSelectedMateriaId(firstMateria ? firstMateria.materia_id : null);
  };
  const onSelectCurso = (id) => {
    setSelectedCursoId(id);
    const c = cursos.find(x => x.curso_id === id);
    const firstMateria = c && c.materias && c.materias[0];
    setSelectedMateriaId(firstMateria ? firstMateria.materia_id : null);
  };

  // Filtered tasks — including hierarchy filters
  const filteredTasks = tasks.filter(t => {
    // Status filter
    if (taskFilter === 'activas' && t.esta_vencida) return false;
    if (taskFilter === 'pendientes_calificar' && (t.pendientes_calificacion || 0) === 0) return false;
    if (taskFilter === 'vencidas' && !t.esta_vencida) return false;

    // Hierarchy filters
    if (filterColegioId !== 'TODOS' && t.colegio_id && String(t.colegio_id) !== String(filterColegioId)) return false;
    if (filterCursoId !== 'TODOS' && t.curso_id && String(t.curso_id) !== String(filterCursoId)) return false;
    if (filterMateriaId !== 'TODOS' && t.materia_id && String(t.materia_id) !== String(filterMateriaId)) return false;

    // Text search
    const matchSearch = !taskSearch ||
      t.titulo?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.materia?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.curso_nombre?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.colegio_nombre?.toLowerCase().includes(taskSearch.toLowerCase());
    return matchSearch;
  });

  // Derived selectors for filter bar (from estructura)
  const filterColegios = estructura;
  const filterCursos = useMemo(() => {
    if (filterColegioId === 'TODOS') return [];
    const c = filterColegios.find(x => String(x.colegio_id) === String(filterColegioId));
    return c ? c.cursos : [];
  }, [filterColegios, filterColegioId]);
  const filterMaterias = useMemo(() => {
    if (filterCursoId === 'TODOS') return [];
    const c = filterCursos.find(x => String(x.curso_id) === String(filterCursoId));
    return c ? c.materias : [];
  }, [filterCursos, filterCursoId]);

  // 
  // Render
  // 
  if (loading) return <Loading text="Cargando estructura académica..." />;

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#F8FAFC', flexWrap: 'wrap' }}>
      <TeamsHierarchyLeftRail
        colegios={estructura}
        selectedMateriaId={filterMateriaId === 'TODOS' ? 'TODAS' : filterMateriaId}
        allowAll={true}
        onSelectAll={() => {
          setFilterColegioId('TODOS');
          setFilterCursoId('TODOS');
          setFilterMateriaId('TODOS');
        }}
        selectCombo={(colId, curId, matId) => {
          setFilterColegioId(String(colId));
          setFilterCursoId(String(curId));
          setFilterMateriaId(String(matId));
          setSelectedColegioId(colId);
          setSelectedCursoId(curId);
          setSelectedMateriaId(matId);
        }}
      />
      <div className="page-container" style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Pestañas Principales: Gestión de Tareas vs Avance Curricular / IA */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('tareas')}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 7,
            background: activeTab === 'tareas' ? '#1E3A8A' : '#F1F5F9',
            color: activeTab === 'tareas' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'tareas' ? '0 2px 6px rgba(30,58,138,0.2)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <CheckSquare size={16} /> Tareas Asignadas ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('avance')}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 7,
            background: activeTab === 'avance' ? '#4338CA' : '#F1F5F9',
            color: activeTab === 'avance' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'avance' ? '0 2px 6px rgba(67,56,202,0.2)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <Sparkles size={16} /> Avance Curricular y Simuladores IA
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PESTAÑA 1: GESTIÓN DE TAREAS DOCENTES
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tareas' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                Gestión de Tareas Docentes
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                Supervisa las actividades publicadas, revisa entregas de estudiantes y califica trabajos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
                <input
                  className="form-control"
                  style={{ paddingLeft: 30, height: 34, fontSize: '12.5px' }}
                  placeholder="Buscar tarea..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadTasks} style={{ height: 34, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={13} /> Actualizar
              </button>
              <button className="btn btn-primary btn-sm" onClick={onOpenCreate} style={{ height: 34, background: '#1E3A8A', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={15} /> Nueva Tarea
              </button>
            </div>
          </div>

          {/* Filtros de estado de tarea */}
          <div className="teams-tabs" style={{ marginBottom: 14 }}>
            {[
              { id: 'todas', label: `Todas (${tasks.length})` },
              { id: 'activas', label: `Activas (${tasks.filter(t => !t.esta_vencida).length})` },
              { id: 'pendientes_calificar', label: `Por calificar (${tasks.filter(t => (t.pendientes_calificacion || 0) > 0).length})` },
              { id: 'vencidas', label: `Vencidas (${tasks.filter(t => t.esta_vencida).length})` },
            ].map(tab => (
              <button key={tab.id} className={`teams-tab ${taskFilter === tab.id ? 'active' : ''}`} onClick={() => setTaskFilter(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {loadingTasks ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <RefreshCw size={24} style={{ color: '#94A3B8', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>Cargando tareas...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={taskSearch ? 'Sin coincidencias' : 'Sin tareas en esta vista'}
              description={taskSearch ? `No se encontraron tareas para "${taskSearch}".` : 'Publica una tarea para comenzar el ciclo académico con tus estudiantes.'}
              action={<button className="btn btn-primary" onClick={onOpenCreate} style={{ background: '#1E3A8A' }}><Plus size={14} /> Publicar primera tarea</button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(() => {
                const groups = {};
                filteredTasks.forEach(t => {
                  const key = `${t.colegio_nombre || 'Colegio'}|||${t.curso_nombre || 'Curso'}|||${t.materia || 'Materia'}`;
                  if (!groups[key]) {
                    groups[key] = {
                      colegio: t.colegio_nombre || 'Colegio',
                      curso: t.curso_nombre || 'Curso',
                      materia: t.materia || 'Materia',
                      items: []
                    };
                  }
                  groups[key].items.push(t);
                });
                return Object.entries(groups).map(([gKey, grp]) => (
                  <div key={gKey} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                      padding: '8px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                      borderLeft: '4px solid #1E3A8A', borderRadius: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1E3A8A', fontWeight: 700 }}>
                          <School size={14} /> {grp.colegio}
                        </span>
                        <span style={{ color: '#94A3B8' }}>›</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0369A1', fontWeight: 700 }}>
                          <GraduationCap size={14} /> {grp.curso}
                        </span>
                        <span style={{ color: '#94A3B8' }}>›</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 700 }}>
                          <BookOpen size={14} /> {grp.materia}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: 12 }}>
                        {grp.items.length} {grp.items.length === 1 ? 'tarea' : 'tareas'}
                      </span>
                    </div>

                    {grp.items.map(t => {
                      const priBadge = getPriorityBadge(t.prioridad);
                      return (
                        <div key={t.id} className="task-card" style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 16 }}>
                          {/* Header: título + badges */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#0F172A' }}>{t.titulo}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span className={`badge ${priBadge.cls}`}>{priBadge.label}</span>
                              <span className={`badge ${t.esta_vencida ? 'badge-vencida' : 'badge-calificada'}`}>
                                {t.esta_vencida ? 'Vencida' : 'Activa'}
                              </span>
                            </div>
                          </div>

                          {/* Detalles: fecha + puntaje */}
                          <div style={{ display: 'flex', gap: 16, fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
                            <span><strong>Fecha límite:</strong> {formatDate(t.fecha_limite)}</span>
                            <span><strong>Puntaje:</strong> {t.puntaje_maximo} pts</span>
                          </div>

                          {/* Footer: stats + acción */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 16, fontSize: '12.5px', flexWrap: 'wrap' }}>
                              <span style={{ color: '#0F172A', fontWeight: 600 }}>
                                Entregadas: <strong>{t.entregadas || t.total_entregas || 0}</strong>
                              </span>
                              <span style={{ color: (t.pendientes_calificacion || 0) > 0 ? '#D97706' : '#059669', fontWeight: 700 }}>
                                Por calificar: {t.pendientes_calificacion || 0}
                              </span>
                              <span style={{ color: '#64748B' }}>
                                Calificadas: {t.calificadas || 0}
                              </span>
                            </div>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => onNavigate('entregas', { filterTaskId: t.id })}
                              style={{ height: 32, fontSize: 12, background: '#1E3A8A' }}
                            >
                              Ver entregas
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PESTAÑA 2: AVANCE CURRICULAR Y SIMULADORES IA
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'avance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/*  HEADER  */}
          <div style={{
            background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0',
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={19} style={{ color: '#4338CA' }} /> Generador Automático de Evaluaciones con IA
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                Sube el contenido de un tema y la IA creará y publicará automáticamente el cuestionario en el perfil de tus estudiantes.
              </p>
              {selectedMateriaId && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#1E3A8A', background: '#EFF6FF', padding: '2px 8px', borderRadius: 6 }}>{selectedColegio?.colegio_nombre}</span>
                  <span style={{ color: '#94A3B8' }}>›</span>
                  <span style={{ fontWeight: 700, color: '#0369A1', background: '#E0F2FE', padding: '2px 8px', borderRadius: 6 }}>{selectedCurso?.curso_nombre}</span>
                  <span style={{ color: '#94A3B8' }}>›</span>
                  <span style={{ fontWeight: 700, color: '#3730A3', background: '#EEF2FF', padding: '2px 8px', borderRadius: 6 }}>{selectedMateria?.materia_nombre}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={loadEstructura}
                style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} /> Actualizar
              </button>
              {selectedMateriaId && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddModal(true)}
                  style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#4338CA', fontWeight: 700 }}
                >
                  <Plus size={15} /> Subir Tema y Generar IA
                </button>
              )}
            </div>
          </div>

      {/*  STATS CARDS + PROGRESS BAR  */}
      {selectedMateriaId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Progress bar */}
          <div style={{
            background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0',
            padding: '14px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} style={{ color: '#4338CA' }} /> Progreso curricular de la materia
              </span>
              <span style={{
                fontSize: 18, fontWeight: 900,
                color: stats.porcentaje_avance >= 80 ? '#059669' : stats.porcentaje_avance >= 40 ? '#D97706' : '#DC2626'
              }}>
                {stats.porcentaje_avance}%
              </span>
            </div>
            <div style={{ background: '#F1F5F9', borderRadius: 999, height: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
                width: `${stats.porcentaje_avance}%`,
                background: stats.porcentaje_avance >= 80 ? 'linear-gradient(90deg,#059669,#34D399)'
                          : stats.porcentaje_avance >= 40 ? 'linear-gradient(90deg,#D97706,#FBBF24)'
                          : 'linear-gradient(90deg,#DC2626,#F87171)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94A3B8' }}>
              <span>{stats.completados} temas completados</span>
              <span>{stats.total} temas en total</span>
            </div>
          </div>

          {/* Stat mini-cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Total Temas', value: stats.total, color: '#4338CA', bg: '#EEF2FF', icon: '' },
              { label: 'Completados', value: stats.completados, color: '#059669', bg: '#D1FAE5', icon: '\u2705' },
              { label: 'En Progreso', value: stats.en_progreso, color: '#D97706', bg: '#FEF3C7', icon: '' },
              { label: 'Pendientes',  value: stats.pendientes,  color: '#64748B', bg: '#F1F5F9', icon: '' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, borderRadius: 10, padding: '12px 14px',
                border: `1.5px solid ${s.color}22`, textAlign: 'center'
              }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/*  TOPIC LIST  */}
      {selectedMateriaId && (
        <div style={{
          background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden'
        }}>
          {/* AI Success Alert */}
          {aiSuccessMsg && (
            <div style={{
              background: '#F0FDF4', borderBottom: '1.5px solid #BBF7D0', color: '#166534',
              padding: '10px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <Sparkles size={16} color="#16A34A" /> {aiSuccessMsg}
            </div>
          )}

          {/* Toolbar */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 30, height: 34, fontSize: '12.5px' }}
                placeholder="Buscar tema, unidad..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Estado filter tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['TODOS', 'PENDIENTE', 'EN_PROGRESO', 'COMPLETADO'].map(est => {
                const cfg = est === 'TODOS' ? { label: 'Todos', color: '#4338CA', bg: '#EEF2FF' } : ESTADO_CONFIG[est];
                const isActive = filterEstado === est;
                return (
                  <button
                    key={est}
                    onClick={() => setFilterEstado(est)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: isActive ? 700 : 500,
                      border: isActive ? `1.5px solid ${cfg.color}` : '1px solid #E2E8F0',
                      background: isActive ? cfg.bg : '#F8FAFC', color: isActive ? cfg.color : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic rows */}
          {loadingTemas ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <RefreshCw size={24} style={{ color: '#94A3B8', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>Cargando temas...</p>
            </div>
          ) : filteredTemas.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <BookOpen size={40} style={{ color: '#CBD5E1', marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                {temas.length === 0 ? 'Aún no hay temas registrados' : 'Sin temas que coincidan con el filtro'}
              </p>
              <p style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 16 }}>
                {temas.length === 0
                  ? 'Agrega los temas del programa para hacer seguimiento de tu avance curricular.'
                  : 'Prueba cambiando el filtro de estado o la Búsqueda.'}
              </p>
              {temas.length === 0 && (
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ background: '#4338CA' }}>
                  <Plus size={14} /> Agregar primer tema
                </button>
              )}
            </div>
          ) : (
            <div>
              {filteredTemas.map((tema, idx) => {
                const cfg = ESTADO_CONFIG[tema.estado] || ESTADO_CONFIG.PENDIENTE;
                const isToggling = toggling === tema.id;
                const isDeleting = deleting === tema.id;
                return (
                  <div
                    key={tema.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      borderBottom: idx < filteredTemas.length - 1 ? '1px solid #F1F5F9' : 'none',
                      transition: 'background 0.15s',
                      background: tema.estado === 'COMPLETADO' ? '#FAFFFE' : '#FFFFFF',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = tema.estado === 'COMPLETADO' ? '#FAFFFE' : '#FFFFFF'}
                  >
                    {/* Status icon */}
                    <button
                      onClick={() => handleToggleEstado(tema)}
                      disabled={isToggling}
                      title={`Cambiar estado (${ESTADO_CONFIG[NEXT_STATE[tema.estado]].label})`}
                      style={{
                        flexShrink: 0, width: 34, height: 34,
                        border: `1.5px solid ${cfg.color}55`,
                        background: cfg.bg, color: cfg.color,
                        borderRadius: 8, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s', opacity: isToggling ? 0.5 : 1
                      }}
                    >
                      {isToggling ? '...' : (tema.estado === 'COMPLETADO' ? <CheckCircle size={17} /> : <Clock size={17} />)}
                    </button>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: 700, fontSize: '14px', color: '#0F172A'
                        }}>
                          {tema.orden > 0 && <span style={{ color: '#94A3B8', fontSize: 12, marginRight: 4 }}>#{tema.orden}</span>}
                          {tema.titulo}
                        </span>
                        {tema.unidad && (
                          <span style={{
                            fontSize: 11, background: '#EEF2FF', color: '#4338CA',
                            padding: '1px 7px', borderRadius: 6, fontWeight: 600
                          }}>{tema.unidad}</span>
                        )}
                        <span style={{
                          fontSize: 11, background: cfg.bg, color: cfg.color,
                          padding: '1px 7px', borderRadius: 6, fontWeight: 700, border: `1px solid ${cfg.color}44`
                        }}>{cfg.label}</span>
                      </div>
                      {tema.descripcion && (
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0', lineHeight: 1.4 }}>
                          {tema.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* AI Exam Practice Action */}
                      {tema.tiene_practica ? (
                        <button
                          onClick={() => handleGenerarPractica(tema)}
                          disabled={generatingAi === tema.id}
                          title="Evaluación IA publicada en el perfil del estudiante. Clic para regenerar preguntas."
                          style={{
                            padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                            background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Sparkles size={12} color="#059669" />
                          {generatingAi === tema.id ? 'Regenerando...' : '✓ Evaluación IA Publicada'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGenerarPractica(tema)}
                          disabled={generatingAi === tema.id}
                          title="Genera un simulador de examen con ejercicios didácticos para que practiquen tus alumnos."
                          style={{
                            padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: '#FFFFFF',
                            border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                            whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)'
                          }}
                        >
                          <Sparkles size={11} />
                          {generatingAi === tema.id ? 'Generando...' : 'Generar Simulador IA'}
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleEstado(tema)}
                        disabled={isToggling}
                        style={{
                          padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                          border: `1.5px solid ${cfg.color}`, background: cfg.bg, color: cfg.color,
                          cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                      >
                        {cfg.btn}
                      </button>
                      <button
                        onClick={() => handleDelete(tema)}
                        disabled={isDeleting}
                        style={{
                          padding: '5px 8px', borderRadius: 6, fontSize: 11.5,
                          border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#DC2626',
                          cursor: 'pointer'
                        }}
                        title="Eliminar tema"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/*  NO MATERIA SELECTED  */}
      {!selectedMateriaId && !loading && (
        <div style={{
          background: '#FFFFFF', borderRadius: 12, border: '1px dashed #CBD5E1',
          padding: '48px 20px', textAlign: 'center'
        }}>
          <BookOpen size={44} style={{ color: '#CBD5E1', marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Selecciona un Colegio, Curso y Materia</p>
          <p style={{ fontSize: 12.5, color: '#94A3B8' }}>Usa los selectores de arriba para ver y gestionar los temas curriculares.</p>
        </div>
      )}

      {/*  ADD TEMA MODAL  */}
      {showAddModal && selectedMateriaId && (
        <AddTemaModal
          materiaId={selectedMateriaId}
          onClose={() => setShowAddModal(false)}
          onCreated={handleTemaCreated}
        />
      )}
        </div>
      )}
      </div>
    </div>
  );
}

export function CreateTaskForm({ onSuccess, onCancel }) {
  const [courses, setCourses] = useState([]);
  const [selectedColegio, setSelectedColegio] = useState('');
  const [selectedCurso, setSelectedCurso] = useState('');
  const [form, setForm] = useState({
    curso_id: '',
    espacio_id: '',
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
    commonAPI.courses().then(data => {
      const list = data || [];
      setCourses(list);
      const cols = Array.from(new Set(list.map(c => c.colegio_nombre).filter(Boolean)));
      if (cols.length === 1) {
        setSelectedColegio(cols[0]);
      }
    }).catch(console.error);
  }, []);

  const colegiosList = useMemo(() => {
    return Array.from(new Set(courses.map(c => c.colegio_nombre).filter(Boolean)));
  }, [courses]);

  const cursosList = useMemo(() => {
    const filtered = selectedColegio ? courses.filter(c => c.colegio_nombre === selectedColegio) : courses;
    return Array.from(new Set(filtered.map(c => c.curso_nombre).filter(Boolean)));
  }, [courses, selectedColegio]);

  const espaciosDisponibles = useMemo(() => {
    return courses.filter(c => {
      if (selectedColegio && c.colegio_nombre && c.colegio_nombre !== selectedColegio) return false;
      if (selectedCurso && c.curso_nombre && c.curso_nombre !== selectedCurso) return false;
      return true;
    });
  }, [courses, selectedColegio, selectedCurso]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.fecha_limite || !form.curso_id) {
      setError('Completa los campos obligatorios: Colegio/Curso/Materia, Título y Fecha límite.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await teacherAPI.createTask({
        ...form,
        espacio_id: form.curso_id,
        rubrica: rubricaData
      });
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
            placeholder="Ej: Informe de Laboratorio N° 2 - Dinamica y Leyes de Newton"
            value={form.titulo}
            onChange={e => setF('titulo', e.target.value)}
            required
          />
        </div>

        {/* Jerarquía: Colegio -> Curso -> Materia / Espacio */}
        <div className="form-group">
          <label className="form-label">Colegio</label>
          <select
            className="form-control"
            value={selectedColegio}
            onChange={e => {
              setSelectedColegio(e.target.value);
              setSelectedCurso('');
              setF('curso_id', '');
              setF('espacio_id', '');
            }}
          >
            <option value="">Todos los colegios...</option>
            {colegiosList.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Curso / Grado</label>
          <select
            className="form-control"
            value={selectedCurso}
            onChange={e => {
              setSelectedCurso(e.target.value);
              setF('curso_id', '');
              setF('espacio_id', '');
            }}
          >
            <option value="">Todos los cursos...</option>
            {cursosList.map(cur => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Materia / Espacio Académico <span className="required">*</span></label>
          <select
            className="form-control"
            value={form.curso_id}
            onChange={e => {
              const val = e.target.value;
              const c = courses.find(x => x.id === parseInt(val));
              setF('curso_id', val);
              setF('espacio_id', val);
              if (c) {
                setF('materia', c.materia_nombre || c.nombre);
                if (c.colegio_nombre && !selectedColegio) setSelectedColegio(c.colegio_nombre);
                if (c.curso_nombre && !selectedCurso) setSelectedCurso(c.curso_nombre);
              }
            }}
            required
          >
            <option value="">Selecciona la materia o espacio donde publicar la tarea...</option>
            {espaciosDisponibles.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.curso_nombre ? `— ${c.curso_nombre}` : ''} {c.colegio_nombre ? `(${c.colegio_nombre})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Fecha y hora limite <span className="required">*</span></label>
          <input
            className="form-control"
            type="datetime-local"
            value={form.fecha_limite}
            onChange={e => setF('fecha_limite', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Puntaje maximo (0 - 100)</label>
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
          <label className="form-label">Indicaciones especificas para el estudiante</label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Formato requerido, normas de presentacion, criterios de evaluacion..."
            value={form.indicaciones}
            onChange={e => setF('indicaciones', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Nombre del material adjunto (opcional)</label>
          <input
            className="form-control"
            placeholder="Guia_Practica_02.pdf"
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
            <Plus size={14} /> Anadir Rubrica
          </button>
          {rubricaData && <span style={{ marginLeft: 10, fontSize: '12px', color: '#107C41' }}><CheckCircle size={14} style={{ verticalAlign: 'middle' }} /> Rubrica configurada</span>}
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
// 3. TEACHER SUBMISSIONS VIEW (REVISION Y CALIFICACION DE ENTREGAS)
// ============================================================
export function TeacherSubmissionsView({ initialTaskId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas'); // 'todas' | 'pendientes' | 'calificadas' | 'atrasadas'
  const [search, setSearch] = useState('');
  const [gradingEntrega, setGradingEntrega] = useState(null);
  const [viewsModalTask, setViewsModalTask] = useState(null);
  const [devolverEntrega, setDevolverEntrega] = useState(null);

  // Jerarquia academica
  const [estructura, setEstructura] = useState([]);
  const [selectedColegioId, setSelectedColegioId] = useState('TODOS');
  const [selectedCursoId, setSelectedCursoId] = useState('TODOS');
  const [selectedMateriaId, setSelectedMateriaId] = useState('TODOS');
  const [selectedTareaId, setSelectedTareaId] = useState(initialTaskId || 'TODAS');

  const loadSubmissions = useCallback(() => {
    setLoading(true);
    teacherAPI.allSubmissions()
      .then(res => setSubmissions(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadEstructura = useCallback(async () => {
    try {
      const data = await topicTrackerAPI.materiasConTemas();
      setEstructura(data || []);
    } catch (err) {
      console.error('Error cargando estructura:', err);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
    loadEstructura();
  }, [loadSubmissions, loadEstructura]);

  // Derivados de la estructura
  const colegios = estructura;

  const cursosDisponibles = useMemo(() => {
    if (selectedColegioId === 'TODOS') {
      return colegios.flatMap(c => c.cursos || []);
    }
    const c = colegios.find(x => x.colegio_id === selectedColegioId);
    return c ? c.cursos : [];
  }, [colegios, selectedColegioId]);

  const materiasDisponibles = useMemo(() => {
    if (selectedCursoId === 'TODOS') {
      return cursosDisponibles.flatMap(cr => cr.materias || []);
    }
    const cr = cursosDisponibles.find(x => x.curso_id === selectedCursoId);
    return cr ? cr.materias : [];
  }, [cursosDisponibles, selectedCursoId]);

  const selectedColegio = colegios.find(x => x.colegio_id === selectedColegioId);
  const selectedCurso   = cursosDisponibles.find(x => x.curso_id === selectedCursoId);
  const selectedMateria = materiasDisponibles.find(x => x.materia_id === selectedMateriaId);

  // Tareas unicas disponibles segun el filtro
  const tareasDisponibles = useMemo(() => {
    const map = new Map();
    submissions.forEach(s => {
      if (selectedColegioId !== 'TODOS' && s.colegio_id !== selectedColegioId) return;
      if (selectedCursoId !== 'TODOS' && s.curso_id !== selectedCursoId) return;
      if (selectedMateriaId !== 'TODOS' && s.materia_id !== selectedMateriaId) return;
      if (!map.has(s.tarea_id)) {
        map.set(s.tarea_id, { id: s.tarea_id, titulo: s.tarea_titulo });
      }
    });
    return Array.from(map.values());
  }, [submissions, selectedColegioId, selectedCursoId, selectedMateriaId]);

  // Manejadores de cascada
  const onSelectColegio = (val) => {
    const id = val === 'TODOS' ? 'TODOS' : parseInt(val);
    setSelectedColegioId(id);
    setSelectedCursoId('TODOS');
    setSelectedMateriaId('TODOS');
    setSelectedTareaId('TODAS');
  };

  const onSelectCurso = (val) => {
    const id = val === 'TODOS' ? 'TODOS' : parseInt(val);
    setSelectedCursoId(id);
    setSelectedMateriaId('TODOS');
    setSelectedTareaId('TODAS');
  };

  const onSelectMateria = (val) => {
    const id = val === 'TODOS' ? 'TODOS' : parseInt(val);
    setSelectedMateriaId(id);
    setSelectedTareaId('TODAS');
  };

  const resetFilters = () => {
    setSelectedColegioId('TODOS');
    setSelectedCursoId('TODOS');
    setSelectedMateriaId('TODOS');
    setSelectedTareaId('TODAS');
    setFilter('todas');
    setSearch('');
  };

  // Filtrado final
  const filtered = useMemo(() => {
    return submissions.filter(s => {
      if (selectedColegioId !== 'TODOS' && s.colegio_id !== selectedColegioId) return false;
      if (selectedCursoId !== 'TODOS' && s.curso_id !== selectedCursoId) return false;
      if (selectedMateriaId !== 'TODOS' && s.materia_id !== selectedMateriaId) return false;
      if (selectedTareaId !== 'TODAS' && s.tarea_id !== parseInt(selectedTareaId)) return false;
      if (initialTaskId && s.tarea_id !== initialTaskId) return false;

      // Filtro de busqueda
      if (search) {
        const q = search.toLowerCase();
        const matches = (s.estudiante_nombre || '').toLowerCase().includes(q) ||
          (s.tarea_titulo || '').toLowerCase().includes(q) ||
          (s.estudiante_matricula || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Filtro de estado
      if (filter === 'pendientes') return !s.calificacion && s.estado !== 'DEVUELTA';
      if (filter === 'calificadas') return !!s.calificacion;
      if (filter === 'atrasadas') return s.es_tardia || s.estado === 'ATRASADO';

      return true;
    });
  }, [submissions, selectedColegioId, selectedCursoId, selectedMateriaId, selectedTareaId, initialTaskId, search, filter]);

  // Metricas para la seleccion actual
  const stats = useMemo(() => {
    const base = submissions.filter(s => {
      if (selectedColegioId !== 'TODOS' && s.colegio_id !== selectedColegioId) return false;
      if (selectedCursoId !== 'TODOS' && s.curso_id !== selectedCursoId) return false;
      if (selectedMateriaId !== 'TODOS' && s.materia_id !== selectedMateriaId) return false;
      if (selectedTareaId !== 'TODAS' && s.tarea_id !== parseInt(selectedTareaId)) return false;
      return true;
    });

    return {
      total: base.length,
      pendientes: base.filter(s => !s.calificacion && s.estado !== 'DEVUELTA').length,
      calificadas: base.filter(s => !!s.calificacion).length,
      atrasadas: base.filter(s => s.es_tardia || s.estado === 'ATRASADO').length,
    };
  }, [submissions, selectedColegioId, selectedCursoId, selectedMateriaId, selectedTareaId]);

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#F8FAFC', flexWrap: 'wrap' }}>
      <TeamsHierarchyLeftRail
        colegios={colegios}
        selectedMateriaId={selectedMateriaId === 'TODOS' ? 'TODAS' : selectedMateriaId}
        allowAll={true}
        onSelectAll={resetFilters}
        selectCombo={(colId, curId, matId) => {
          setSelectedColegioId(colId);
          setSelectedCursoId(curId);
          setSelectedMateriaId(matId);
          setSelectedTareaId('TODAS');
        }}
      />
      <div className="page-container" style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* HEADER PRINCIPAL */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <InboxIcon size={22} style={{ color: '#2563EB' }} /> Gestion y Revision de Entregas
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Centro de revision, calificacion, retroalimentacion y seguimiento de visualizacion academica por colegio, curso y materia.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32, height: 36, fontSize: '12.5px', borderRadius: 8 }}
              placeholder="Buscar por estudiante, tarea o matricula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={loadSubmissions}
            disabled={loading}
            title="Recargar entregas"
            style={{ height: 36, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* FILTRO POR TAREA ESPECÍFICA + ALCANCE ACTIVO */}
      <div style={{
        background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0',
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220 }}>
          <ClipboardList size={15} style={{ color: '#1E3A8A', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>Tarea:</span>
          <select
            className="form-control"
            value={selectedTareaId}
            onChange={e => setSelectedTareaId(e.target.value)}
            style={{ height: 34, fontSize: 12.5, fontWeight: 600, maxWidth: 420 }}
          >
            <option value="TODAS">— Todas las tareas ({tareasDisponibles.length}) —</option>
            {tareasDisponibles.map(t => (
              <option key={t.id} value={t.id}>{t.titulo}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#475569', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#1E3A8A', background: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>
            {selectedColegio ? selectedColegio.colegio_nombre : 'Todos los Colegios'}
          </span>
          {selectedMateria && (
            <span style={{ fontWeight: 700, color: '#3730A3', background: '#EEF2FF', padding: '2px 8px', borderRadius: 4 }}>
              {selectedMateria.materia_nombre}
            </span>
          )}
          <span style={{ fontWeight: 600, color: '#0F172A', background: '#F1F5F9', padding: '2px 10px', borderRadius: 4 }}>
            {filtered.length} entrega{filtered.length !== 1 ? 's' : ''}
          </span>
          {(selectedColegioId !== 'TODOS' || selectedTareaId !== 'TODAS' || search) && (
            <button
              onClick={resetFilters}
              style={{
                fontSize: 11.5, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE',
                padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4
              }}
            >
              <RotateCcw size={11} /> Ver todo
            </button>
          )}
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 6, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InboxIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{stats.total}</div>
            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Total Entregas</div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 6, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#D97706' }}>{stats.pendientes}</div>
            <div style={{ fontSize: 11.5, color: '#92400E', fontWeight: 600 }}>Por Calificar</div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 6, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{stats.calificadas}</div>
            <div style={{ fontSize: 11.5, color: '#065F46', fontWeight: 600 }}>Calificadas</div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 6, background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>{stats.atrasadas}</div>
            <div style={{ fontSize: 11.5, color: '#991B1B', fontWeight: 600 }}>Con Retraso</div>
          </div>
        </div>
      </div>

      {/* TABS DE ESTADO */}
      <div className="teams-tabs" style={{ marginBottom: 4 }}>
        {[
          { id: 'todas', label: 'Todas las entregas', count: stats.total },
          { id: 'pendientes', label: 'Por calificar', count: stats.pendientes },
          { id: 'calificadas', label: 'Calificadas', count: stats.calificadas },
          { id: 'atrasadas', label: 'Con retraso', count: stats.atrasadas },
        ].map(t => (
          <button
            key={t.id}
            className={`teams-tab ${filter === t.id ? 'active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            <span>{t.label}</span>
            <span className="teams-tab-badge">{t.count}</span>
          </button>
        ))}
      </div>

      {/* LISTADO DE ENTREGAS */}
      {loading ? (
        <Loading text="Cargando entregas de los estudiantes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Sin entregas para mostrar"
          description={search ? `No se encontraron resultados para "${search}".` : 'No hay entregas registradas en los filtros seleccionados.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {Object.entries(
            filtered.reduce((acc, ent) => {
              const key = `${ent.colegio_nombre || 'Colegio'}|||${ent.curso_nombre || 'Curso'}|||${ent.materia_nombre || 'Materia'}`;
              if (!acc[key]) acc[key] = { colegio: ent.colegio_nombre || 'Colegio', curso: ent.curso_nombre || 'Curso', materia: ent.materia_nombre || 'Materia', items: [] };
              acc[key].items.push(ent);
              return acc;
            }, {})
          ).map(([gKey, grp]) => (
            <div key={gKey} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                padding: '8px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderLeft: '4px solid #1E3A8A', borderRadius: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1E3A8A', fontWeight: 700 }}><School size={14} /> {grp.colegio}</span>
                  <span style={{ color: '#94A3B8' }}>›</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0369A1', fontWeight: 700 }}><GraduationCap size={14} /> {grp.curso}</span>
                  <span style={{ color: '#94A3B8' }}>›</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#3730A3', fontWeight: 700 }}><BookOpen size={14} /> {grp.materia}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: 12 }}>
                  {grp.items.length} {grp.items.length === 1 ? 'entrega' : 'entregas'}
                </span>
              </div>
              {grp.items.map(ent => {
            const isLate = ent.es_tardia || ent.estado === 'ATRASADO';
            const isGraded = !!ent.calificacion || (ent.nota !== null && ent.nota !== undefined);
            const notaVal = ent.calificacion?.nota !== undefined ? ent.calificacion.nota : ent.nota;
            const initials = (ent.estudiante_nombre || 'ES').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

            return (
              <div
                key={ent.id || ent.entrega_id || Math.random()}
                className="card"
                style={{
                  padding: '16px 20px',
                  borderRadius: 8,
                  border: isLate ? '1px solid #FECACA' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Cabecera de la tarjeta: Estudiante + Contexto + Estado */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: '#1E3A8A',
                      color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {ent.estudiante_nombre}
                        {ent.ha_visto && (
                          <span style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Eye size={11} /> Vio la tarea
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: '#64748B', marginTop: 3, flexWrap: 'wrap' }}>
                        <span>Matrícula: <strong>{ent.estudiante_matricula}</strong></span>
                        <span>&bull;</span>
                        <span style={{ background: '#EFF6FF', color: '#1E3A8A', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <School size={11} /> {ent.colegio_nombre}
                        </span>
                        <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <GraduationCap size={11} /> {ent.curso_nombre}
                        </span>
                        <span style={{ background: '#EEF2FF', color: '#3730A3', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <BookOpen size={11} /> {ent.materia_nombre}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estado / Nota */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isLate && (
                      <span style={{
                        background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                        padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 4
                      }}>
                        <Clock size={12} /> Fuera de plazo
                      </span>
                    )}

                    <span className={`badge ${isGraded ? 'badge-calificada' : 'badge-en_revision'}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                      {isGraded ? 'Calificada' : 'Pendiente revision'}
                    </span>

                    {isGraded && (
                      <span style={{ fontWeight: 800, fontSize: '16px', color: getNoteColor(notaVal), marginLeft: 4 }}>
                        {notaVal}/100
                      </span>
                    )}
                  </div>
                </div>

                {/* Info de la tarea y entrega */}
                <div style={{
                  background: '#F8FAFC', padding: '12px 14px', borderRadius: 8,
                  border: '1px solid #E2E8F0', marginBottom: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ClipboardList size={15} style={{ color: '#2563EB' }} /> {ent.tarea_titulo}
                    </div>
                    {ent.fecha_limite && (
                      <span style={{ fontSize: 11.5, color: '#64748B' }}>
                        Fecha limite: <strong>{ent.fecha_limite}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: '12px', color: '#475569', marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Paperclip size={13} style={{ color: '#64748B' }} />
                      Archivo: <strong>{ent.archivo_nombre || 'documento_entrega.pdf'}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>Fecha entrega: <strong>{ent.fecha_entrega}</strong></span>
                    {ent.version > 1 && (
                      <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                        Version {ent.version} (Reentregada)
                      </span>
                    )}
                  </div>

                  {ent.observaciones && (
                    <div style={{ marginTop: 8, fontSize: '12px', color: '#475569', fontStyle: 'italic', borderLeft: '3px solid #94A3B8', paddingLeft: 8 }}>
                      Nota del alumno: "{ent.observaciones}"
                    </div>
                  )}

                  {/* Retroalimentacion docente previa */}
                  {(ent.calificacion?.retroalimentacion || ent.retroalimentacion) && (
                    <div style={{
                      marginTop: 8, padding: '6px 10px', background: '#ECFDF5',
                      border: '1px solid #A7F3D0', borderRadius: 6, fontSize: '12px', color: '#065F46'
                    }}>
                      <strong>Retroalimentacion:</strong> "{ent.calificacion?.retroalimentacion || ent.retroalimentacion}"
                    </div>
                  )}
                </div>

                {/* BARRA DE ACCIONES Y BOTONES */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                  {/* Botones secundarios (Quien vio la tarea + Ver archivo) */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 12, padding: '5px 11px', display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#3B82F6', color: '#1D4ED8', background: '#EFF6FF' }}
                      onClick={() => setViewsModalTask({ id: ent.tarea_id, titulo: ent.tarea_titulo })}
                      title="Ver que estudiantes del curso abrieron y leyeron esta tarea"
                    >
                      <Eye size={13} /> Quien vio la tarea
                    </button>

                    {ent.archivo_url ? (
                      <a
                        href={ent.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12, padding: '5px 11px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        title="Ver o descargar el archivo entregado"
                      >
                        <Download size={13} /> Ver archivo
                      </a>
                    ) : (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12, padding: '5px 11px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => alert(`Archivo de la entrega: ${ent.archivo_nombre || 'documento.pdf'}`)}
                        title="Ver detalles del archivo"
                      >
                        <Download size={13} /> Archivo adjunto
                      </button>
                    )}
                  </div>

                  {/* Botones principales de revision y calificacion */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm"
                      style={{
                        fontSize: 12, padding: '5px 11px',
                        background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A',
                        display: 'inline-flex', alignItems: 'center', gap: 5
                      }}
                      onClick={() => setDevolverEntrega(ent)}
                      title="Devolver la tarea para que el estudiante la corrija"
                    >
                      <RotateCcw size={13} /> Devolver para correccion
                    </button>

                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 12, padding: '5px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => setGradingEntrega(ent)}
                    >
                      <Award size={14} />
                      {isGraded ? 'Editar calificacion' : 'Revisar y calificar'}
                    </button>
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: SEGUIMIENTO DE LECTURA (QUIEN VIO LA TAREA) */}
      {viewsModalTask && (
        <TareaVistasModal
          tareaId={viewsModalTask.id}
          tareaTitulo={viewsModalTask.titulo}
          onClose={() => setViewsModalTask(null)}
          onGrading={(est) => {
            const ent = submissions.find(s => s.tarea_id === viewsModalTask.id && s.estudiante_id === est.estudiante_id);
            if (ent) setGradingEntrega(ent);
          }}
        />
      )}

      {/* MODAL: CALIFICAR Y RETROALIMENTAR */}
      <Modal
        open={!!gradingEntrega}
        onClose={() => setGradingEntrega(null)}
        title="Evaluacion y Retroalimentacion Pedagogica"
      >
        {gradingEntrega && (
          <GradeSubmissionModal
            entrega={gradingEntrega}
            onClose={() => setGradingEntrega(null)}
            onSuccess={() => loadSubmissions()}
          />
        )}
      </Modal>

      {/* MODAL: DEVOLVER ENTREGA */}
      {devolverEntrega && (
        <DevolverEntregaModal
          entrega={devolverEntrega}
          onClose={() => setDevolverEntrega(null)}
          onSuccess={() => loadSubmissions()}
        />
      )}
      </div>
    </div>
  );
}

// ============================================================
// 4. TEACHER GRADEBOOK VIEW (LIBRO DE CALIFICACIONES)
// ============================================================
// ============================================================
// MODAL: ANALÍTICA NUMÉRICA AVANZADA DEL ESTUDIANTE
// ============================================================
function ModalAnaliticaEstudiante({ student, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [xEval, setXEval] = useState('');

  const loadData = (evalParam = null) => {
    setLoading(true);
    const params = evalParam !== null ? { x_eval: evalParam } : {};
    analisisNumericoAPI.estudianteAnalisis(student.id, params)
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Error al obtener análisis numérico'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (student?.id) loadData();
  }, [student?.id]);

  const a = data?.analisis_numerico || {};
  const reg = a.regresion_lineal;
  const lag = a.lagrange;
  const extrap = a.extrapolacion;
  const irecTrap = a.irec_trapecio;
  const irecSimp = a.irec_simpson;
  const newton = a.newton_raphson;

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'auto', padding: '4px 2px' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #E2E8F0', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{student.nombre_completo}</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {student.matricula} · {student.grado} "{student.paralelo}"
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#64748B' }}>Promedio Oficial</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: getNoteColor(student.promedio) }}>
            {student.promedio}/100
          </div>
        </div>
      </div>

      {loading ? (
        <Loading text="Calculando métodos de análisis numérico (Mínimos Cuadrados, Lagrange, Trapecio, Newton-Raphson)..." />
      ) : error ? (
        <div style={{ padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>
          {error}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 1. Mínimos Cuadrados (Regresión Lineal) */}
          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={15} /> 1. Regresión Lineal por Mínimos Cuadrados
              </div>
              {reg?.valido && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: reg.pendiente_b >= 0 ? '#DCFCE7' : '#FEE2E2',
                  color: reg.pendiente_b >= 0 ? '#15803D' : '#B91C1C'
                }}>
                  {reg.tendencia}
                </span>
              )}
            </div>

            {reg?.valido ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 8 }}>
                  <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>ECUACIÓN DE AJUSTE</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0F172A', marginTop: 2 }}>{reg.ecuacion_recta}</div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>COEFICIENTE R²</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{reg.coeficiente_determinacion_r2} (r={reg.coeficiente_correlacion_r})</div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>PENDIENTE (TASA)</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: reg.pendiente_b >= 0 ? '#16A34A' : '#DC2626', marginTop: 2 }}>
                      {reg.pendiente_b > 0 ? `+${reg.pendiente_b}` : reg.pendiente_b} pts/tarea
                    </div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>PROYECCIÓN PRÓXIMA</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', marginTop: 2 }}>~ {reg.proyeccion_estimada} pts</div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', background: '#FFFFFF', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                  💬 <strong>Diagnóstico:</strong> {reg.diagnostico}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#64748B' }}>{reg?.mensaje || 'Insuficientes datos para regresión.'}</div>
            )}
          </div>

          {/* 2. Interpolación de Lagrange */}
          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4338CA', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Compass size={15} /> 2. Interpolación Polinomial de Lagrange (Estimación Intermedia)
            </div>

            {lag?.valido ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#334155' }}>
                    Punto evaluado: <strong>x = {lag.x_evaluado}</strong> · Grado del polinomio: <strong>{lag.grado_polinomio}</strong>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#4338CA', marginLeft: 'auto' }}>
                    Valor interpolado estimado: {lag.valor_interpolado} pts
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    style={{ width: 140, height: 30, fontSize: 12 }}
                    placeholder="Evaluar en x..."
                    value={xEval}
                    onChange={(e) => setXEval(e.target.value)}
                  />
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, height: 30 }}
                    onClick={() => { if (xEval) loadData(Number(xEval)); }}
                  >
                    Recalcular Lagrange
                  </button>
                  <span style={{ fontSize: 10.5, color: '#94A3B8' }}>
                    * Estimación pedagógica continua, no constituye nota oficial.
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#64748B' }}>{lag?.mensaje || 'Insuficientes notas para interpolar.'}</div>
            )}
          </div>

          {/* 3. Extrapolación Acotada */}
          {extrap?.valido && (
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={15} /> 3. Extrapolación de Rendimiento Acotada [0, 100]
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {extrap.proyecciones.map((p, i) => (
                  <div key={i} style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Periodo Futuro (x = {p.periodo_evaluacion})</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: getNoteColor(p.calificacion_proyectada), marginTop: 2 }}>
                      {p.calificacion_proyectada} / 100
                    </div>
                    {p.limite_alcanzado && (
                      <div style={{ fontSize: 10, color: '#DC2626' }}>Cota física aplicada</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Integración Numérica (IREC) & Newton-Raphson */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {/* Trapecio IREC */}
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Activity size={15} /> 4. Índice IREC (Trapecio Compuesto)
              </div>
              {irecTrap?.valido ? (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F766E' }}>
                    {irecTrap.rendimiento_medio_continuo} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>pts continuos</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                    Área bajo la curva: <strong>{irecTrap.area_total_acumulada}</strong> en {irecTrap.tiempo_total_semanas} etapas.
                  </div>
                  <div style={{ fontSize: 11, color: '#0F766E', marginTop: 2 }}>
                    ✓ {irecTrap.interpretacion}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748B' }}>{irecTrap?.mensaje || 'Insuficientes etapas para integrar.'}</div>
              )}
            </div>

            {/* Newton-Raphson Nivelación */}
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7E22CE', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Target size={15} /> 5. Nivelación con Newton-Raphson
              </div>
              {newton?.valido ? (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#7E22CE' }}>
                    Semana ~ {newton.semana_nivelacion}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                    Estimación para alcanzar {newton.nota_objetivo} pts con modelo logístico de aprendizaje ({newton.total_iteraciones} iteraciones).
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {student.promedio >= 70 ? 'El estudiante ya supera la cota de 70 pts.' : 'Modelo no requerido o datos limitados.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHARED HIERARCHY HOOK & BAR: COLEGIO -> CURSO -> MATERIA
// ============================================================
function useDocenteEstructura({ allowAllMaterias = false } = {}) {
  const [colegios, setColegios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColegioId, setSelectedColegioId] = useState('');
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedMateriaId, setSelectedMateriaId] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/v2/docente/lista-excel/')
      .then(res => {
        const cols = res?.colegios || [];
        setColegios(cols);
        if (cols.length > 0) {
          const pref = cols.find(c => (c.colegio_nombre || '').includes('Simón Bolívar')) || cols[0];
          setSelectedColegioId(String(pref.colegio_id));
          if (pref.cursos?.length > 0) {
            const firstCur = pref.cursos[0];
            setSelectedCursoId(String(firstCur.curso_id));
            if (allowAllMaterias) {
              setSelectedMateriaId('TODAS');
            } else if (firstCur.materias?.length > 0) {
              setSelectedMateriaId(String(firstCur.materias[0].materia_id));
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [allowAllMaterias]);

  const colegioActual = useMemo(
    () => colegios.find(c => String(c.colegio_id) === String(selectedColegioId)) || colegios[0] || null,
    [colegios, selectedColegioId]
  );

  const cursosDisponibles = useMemo(() => colegioActual?.cursos || [], [colegioActual]);

  const cursoActual = useMemo(
    () => cursosDisponibles.find(c => String(c.curso_id) === String(selectedCursoId)) || cursosDisponibles[0] || null,
    [cursosDisponibles, selectedCursoId]
  );

  const materiasDisponibles = useMemo(() => cursoActual?.materias || [], [cursoActual]);

  const materiaActual = useMemo(() => {
    if (allowAllMaterias && selectedMateriaId === 'TODAS') return null;
    return materiasDisponibles.find(m => String(m.materia_id) === String(selectedMateriaId)) || materiasDisponibles[0] || null;
  }, [materiasDisponibles, selectedMateriaId, allowAllMaterias]);

  const onSelectColegio = (val) => {
    setSelectedColegioId(val);
    const col = colegios.find(c => String(c.colegio_id) === String(val));
    const firstCur = col?.cursos?.[0];
    setSelectedCursoId(firstCur ? String(firstCur.curso_id) : '');
    if (allowAllMaterias) {
      setSelectedMateriaId('TODAS');
    } else {
      const firstMat = firstCur?.materias?.[0];
      setSelectedMateriaId(firstMat ? String(firstMat.materia_id) : '');
    }
  };

  const onSelectCurso = (val) => {
    setSelectedCursoId(val);
    const cur = cursosDisponibles.find(c => String(c.curso_id) === String(val));
    if (allowAllMaterias) {
      setSelectedMateriaId('TODAS');
    } else {
      const firstMat = cur?.materias?.[0];
      setSelectedMateriaId(firstMat ? String(firstMat.materia_id) : '');
    }
  };

  const onSelectMateria = (val) => {
    setSelectedMateriaId(val);
  };

  const selectCombo = (colId, curId, matId) => {
    setSelectedColegioId(String(colId));
    setSelectedCursoId(String(curId));
    setSelectedMateriaId(String(matId));
  };

  const mapStudent = useCallback((est, cur, matNombre = '') => ({
    id: est.estudiante_id,
    nombre_completo: est.nombre || 'Estudiante',
    matricula: est.ru || `RU-${est.estudiante_id}`,
    email: est.email || '',
    grado: cur?.grado || cur?.curso_nombre || '',
    paralelo: cur?.paralelo || '',
    materia_nombre: matNombre,
    tareas_entregadas: est.tareas_entregadas || 0,
    tareas_asignadas: est.total_tareas || 0,
    tareas_pendientes: est.tareas_pendientes || 0,
    porcentaje_cumplimiento: est.porcentaje_cumplimiento || 0,
    promedio: est.promedio ?? 0,
    estado_academico: est.estado_academico || 'En Curso',
    riesgo_academico: Boolean(est.en_riesgo),
    nivel_riesgo: est.nivel_riesgo,
    factores_riesgo: est.factores_riesgo || [],
    calificaciones: est.calificaciones || []
  }), []);

  const students = useMemo(() => {
    if (!cursoActual) return [];
    if (materiaActual) {
      return (materiaActual.estudiantes || []).map(est => mapStudent(est, cursoActual, materiaActual.materia_nombre));
    }
    if (allowAllMaterias && selectedMateriaId === 'TODAS') {
      return materiasDisponibles.flatMap(mat =>
        (mat.estudiantes || []).map(est => mapStudent(est, cursoActual, mat.materia_nombre))
      );
    }
    return [];
  }, [cursoActual, materiaActual, materiasDisponibles, selectedMateriaId, allowAllMaterias, mapStudent]);

  return {
    colegios,
    cursosDisponibles,
    materiasDisponibles,
    colegioActual,
    cursoActual,
    materiaActual,
    selectedColegioId,
    selectedCursoId,
    selectedMateriaId,
    onSelectColegio,
    onSelectCurso,
    onSelectMateria,
    selectCombo,
    students,
    loading
  };
}

function getTeacherSubjectBadge(materia) {
  const m = (materia || '').toLowerCase();
  if (m.includes('matemática') || m.includes('algebra') || m.includes('calculo')) return { initials: 'MAT', bg: '#D83B01' };
  if (m.includes('física') || m.includes('fisica')) return { initials: 'FIS', bg: '#4F46E5' };
  if (m.includes('química') || m.includes('quimica')) return { initials: 'QMC', bg: '#059669' };
  if (m.includes('biología') || m.includes('biologia')) return { initials: 'BIO', bg: '#0D9488' };
  if (m.includes('lenguaje') || m.includes('literatura')) return { initials: 'LIT', bg: '#7C3AED' };
  if (m.includes('social') || m.includes('historia')) return { initials: 'SOC', bg: '#D97706' };
  const words = (materia || 'M').trim().split(/\s+/);
  const initials = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 3).toUpperCase();
  return { initials, bg: '#1E3A8A' };
}

function TeamsHierarchyLeftRail({ colegios, selectedMateriaId, selectCombo, allowAll = false, onSelectAll }) {
  if (!colegios || colegios.length === 0) return null;
  const isAll = allowAll && (!selectedMateriaId || selectedMateriaId === 'TODAS' || selectedMateriaId === 'TODOS');
  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
          Colegios y Materias
        </div>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
          Selecciona una materia
        </div>
      </div>

      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        {allowAll && onSelectAll && (
          <button
            onClick={onSelectAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
              borderRadius: 8, border: 'none',
              borderLeft: isAll ? '3px solid #1E3A8A' : '3px solid transparent',
              background: isAll ? '#EFF6FF' : 'transparent',
              cursor: 'pointer', textAlign: 'left', width: '100%'
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 6, background: '#1E3A8A',
              color: '#FFFFFF', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              ALL
            </div>
            <div style={{ fontSize: 12.5, fontWeight: isAll ? 700 : 600, color: isAll ? '#1E3A8A' : '#1E293B' }}>
              Todas las materias
            </div>
          </button>
        )}
        {colegios.map(col => (
          <div key={col.colegio_id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 8px', fontSize: 10.5, fontWeight: 800,
              color: '#1E3A8A', textTransform: 'uppercase'
            }}>
              <School size={12} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={col.colegio_nombre}>
                {col.colegio_nombre}
              </span>
            </div>

            {(col.cursos || []).flatMap(cur =>
              (cur.materias || []).map(mat => {
                const isSelected = String(mat.materia_id) === String(selectedMateriaId);
                const badge = getTeacherSubjectBadge(mat.materia_nombre);
                return (
                  <button
                    key={`${cur.curso_id}-${mat.materia_id}`}
                    onClick={() => selectCombo(col.colegio_id, cur.curso_id, mat.materia_id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px',
                      borderRadius: 8, border: 'none',
                      borderLeft: isSelected ? '3px solid #1E3A8A' : '3px solid transparent',
                      background: isSelected ? '#EFF6FF' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 6, background: badge.bg,
                      color: '#FFFFFF', fontSize: 10, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {badge.initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? '#1E3A8A' : '#1E293B',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {mat.materia_nombre}
                      </div>
                      <div style={{
                        fontSize: 10.5, color: '#64748B',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {cur.curso_nombre} · {mat.total_estudiantes || 0} est.
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocenteHierarchySelectorBar({
  colegios, cursosDisponibles, materiasDisponibles,
  selectedColegioId, selectedCursoId, selectedMateriaId,
  onSelectColegio, onSelectCurso, onSelectMateria,
  allowAllMaterias = false
}) {
  if (!colegios || colegios.length === 0) return null;
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, border: '1.5px solid #E2E8F0',
      padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12
    }}>
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#1E3A8A', marginBottom: 5 }}>
          <School size={13} /> Colegio
        </label>
        <select
          className="form-control"
          style={{ height: 36, fontSize: 12.5, fontWeight: 600, background: '#F8FAFC', border: '1px solid #CBD5E1' }}
          value={selectedColegioId}
          onChange={e => onSelectColegio(e.target.value)}
        >
          {colegios.map(c => (
            <option key={c.colegio_id} value={String(c.colegio_id)}>{c.colegio_nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#0369A1', marginBottom: 5 }}>
          <GraduationCap size={13} /> Curso / Paralelo
        </label>
        <select
          className="form-control"
          style={{ height: 36, fontSize: 12.5, fontWeight: 600, background: '#F8FAFC', border: '1px solid #CBD5E1' }}
          value={selectedCursoId}
          onChange={e => onSelectCurso(e.target.value)}
        >
          {cursosDisponibles.map(cur => (
            <option key={cur.curso_id} value={String(cur.curso_id)}>{cur.curso_nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#059669', marginBottom: 5 }}>
          <BookOpen size={13} /> Materia
        </label>
        <select
          className="form-control"
          style={{ height: 36, fontSize: 12.5, fontWeight: 600, background: '#F8FAFC', border: '1px solid #CBD5E1' }}
          value={selectedMateriaId}
          onChange={e => onSelectMateria(e.target.value)}
        >
          {allowAllMaterias && <option value="TODAS">— Todas las materias del curso —</option>}
          {materiasDisponibles.map(m => (
            <option key={m.materia_id} value={String(m.materia_id)}>{m.materia_nombre}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function TeacherGradebookView({ onNavigate }) {
  const {
    colegios, colegioActual, cursoActual, materiaActual,
    selectedMateriaId, selectCombo,
    students, loading
  } = useDocenteEstructura();

  const [search, setSearch] = useState('');
  const [reportStudent, setReportStudent] = useState(null);
  const [analisisStudent, setAnalisisStudent] = useState(null);

  const exportToCSV = () => {
    if (!students || students.length === 0) return;
    const headers = ['Estudiante', 'RUDE / Matricula', 'Colegio', 'Curso', 'Materia', 'Tareas Entregadas', 'Tareas Asignadas', 'Tareas Pendientes', 'Cumplimiento %', 'Promedio', 'Estado'];
    const rows = students.map(s => [
      `"${s.nombre_completo || ''}"`,
      `"${s.matricula || ''}"`,
      `"${colegioActual?.colegio_nombre || ''}"`,
      `"${cursoActual?.curso_nombre || ''}"`,
      `"${materiaActual?.materia_nombre || ''}"`,
      s.tareas_entregadas || 0,
      s.tareas_asignadas || 0,
      s.tareas_pendientes || 0,
      s.porcentaje_cumplimiento || 0,
      s.promedio || 0,
      `"${s.estado_academico || ''}"`
    ]);
    const csvContent = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const matSlug = (materiaActual?.materia_nombre || 'Materia').replace(/\s+/g, '_');
    link.setAttribute('download', `Notas_${matSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = students.filter(s =>
    !search ||
    s.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    s.matricula.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#F8FAFC', flexWrap: 'wrap' }}>
      <TeamsHierarchyLeftRail
        colegios={colegios}
        selectedMateriaId={selectedMateriaId}
        selectCombo={selectCombo}
      />
      <div className="page-container" style={{ flex: 1, minWidth: 320 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 3px' }}>
              {materiaActual ? `${materiaActual.materia_nombre} — Notas` : 'Resultados y Notas'}
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
              {colegioActual?.colegio_nombre} · {cursoActual?.curso_nombre}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 30, height: 34, fontSize: '12.5px' }}
                placeholder="Buscar estudiante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={exportToCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34 }}
              title="Descargar tabla de esta materia en formato CSV compatible con Excel"
            >
              <Download size={13} /> Excel
            </button>

            {cursoActual?.curso_id && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(`/api/v2/cursos/${cursoActual.curso_id}/boletin-pdf/`, '_blank')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34, color: '#059669', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                title="Descargar cuadro oficial del curso en PDF"
              >
                <FileText size={13} /> PDF Curso
              </button>
            )}

            {onNavigate && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('lista-excel')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34, background: '#1E3A8A' }}
              >
                <FileSpreadsheet size={13} /> Lista Excel
              </button>
            )}
          </div>
        </div>

        {loading ? (
        <Loading text="Cargando calificaciones de la materia..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Sin estudiantes en esta materia"
          description="Selecciona otro colegio, curso o materia para visualizar los resultados."
        />
      ) : (
        <div className="teams-table-container">
          <table className="teams-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Matricula</th>
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
                    <td>{s.paralelo ? `${s.grado} "${s.paralelo}"` : s.grado}</td>
                    <td>{s.tareas_entregadas} de {s.tareas_asignadas}</td>
                    <td style={{ color: s.tareas_pendientes > 0 ? '#CA5010' : '#616161' }}>
                      {s.tareas_pendientes}
                    </td>
                    <td style={{ width: 140 }}>
                      <ProgressBar value={s.porcentaje_cumplimiento} color={s.porcentaje_cumplimiento >= 80 ? 'success' : 'warning'} height={6} showLabel />
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: noteColor }}>
                        {s.promedio > 0 ? `${s.promedio}/100` : '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.estado_academico === 'Excelente' || s.estado_academico === 'Aprobado' ? 'badge-calificada' : s.estado_academico === 'Regular' || s.estado_academico === 'Sin notas' ? 'badge-pendiente' : 'badge-vencida'}`}>
                        {s.estado_academico}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0284C7', borderColor: '#BAE6FD' }}
                          onClick={() => setAnalisisStudent(s)}
                          title="Ver análisis numérico de tendencias, regresión e IREC"
                        >
                          <Calculator size={11} /> Analítica
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => setReportStudent(s)}
                          title="Enviar reporte de desempeno academico"
                        >
                          <Send size={11} /> Reporte
                        </button>
                      </div>
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
          title={`Reporte Académico — ${reportStudent.nombre_completo}`}
        >
          <SendReportModal
            student={reportStudent}
            onClose={() => setReportStudent(null)}
          />
        </Modal>
      )}

      {/* Modal: Analítica Numérica del Estudiante */}
      {analisisStudent && (
        <Modal
          open={true}
          onClose={() => setAnalisisStudent(null)}
          title={`📐 Analítica Numérica y Proyección — ${analisisStudent.nombre_completo}`}
        >
          <ModalAnaliticaEstudiante
            student={analisisStudent}
            onClose={() => setAnalisisStudent(null)}
          />
        </Modal>
      )}
      </div>
    </div>
  );
}

// ============================================================
// MODAL: SEND ACADEMIC REPORT TO STUDENT
// ============================================================
function SendReportModal({ student, onClose }) {
  const [asunto, setAsunto] = useState(`Reporte de Desempeno Academico - ${student.nombre_completo}`);
  const [mensaje, setMensaje] = useState(
    `Estimado/a ${student.nombre_completo},\n\n` +
    `Le informamos su situacion académica actual:\n\n` +
    `"¢ Tareas entregadas: ${student.tareas_entregadas} de ${student.tareas_asignadas}\n` +
    `"¢ Tareas pendientes: ${student.tareas_pendientes}\n` +
    `"¢ Porcentaje de cumplimiento: ${student.porcentaje_cumplimiento}%\n` +
    `"¢ Promedio actual: ${student.promedio > 0 ? student.promedio + '/100' : 'Sin calificaciones Aún'}\n` +
    `"¢ Estado academico: ${student.estado_academico}\n\n` +
    `${student.riesgo_academico ? ' ATENCIN: El estudiante presenta indicadores de riesgo academico. Se recomienda atencion adicional.\n\n' : ''}` +
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
        }}>[COMPLETADO]</div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#065F46', marginBottom: 6 }}>
          Reporte enviado exitosamente!
        </h3>
        <p style={{ color: '#616161', fontSize: '12.5px', marginBottom: 4 }}>
          Se envio el informe de desempeno a:
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
             {student.email} - {student.matricula}
          </div>
        </div>
        {student.riesgo_academico && (
          <span style={{
            marginLeft: 'auto', background: '#FEF2F2', color: '#B91C1C',
            border: '1px solid #FECACA', borderRadius: 6,
            padding: '3px 8px', fontSize: '11px', fontWeight: 600
          }}>
             Riesgo
          </span>
        )}
      </div>

      {/* Metrics summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Promedio', value: student.promedio > 0 ? `${student.promedio}/100` : '-', color: getNoteColor(student.promedio) },
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
          Incluir grafico de progreso
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
// 5. TEACHER STUDENTS VIEW (SEGUIMIENTO ACADEMICO POR MATERIA)
// ============================================================
export function TeacherStudentsView() {
  const {
    colegios, colegioActual, cursoActual, materiaActual,
    selectedMateriaId, selectCombo,
    students, loading
  } = useDocenteEstructura();

  const [reportStudent, setReportStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('TODOS'); // TODOS | RIESGO | AL_DIA

  const filtered = students.filter(s => {
    if (estadoFiltro === 'RIESGO' && !s.riesgo_academico) return false;
    if (estadoFiltro === 'AL_DIA' && s.riesgo_academico) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.nombre_completo.toLowerCase().includes(q) || s.matricula.toLowerCase().includes(q);
    }
    return true;
  });

  const enRiesgoCount = students.filter(s => s.riesgo_academico).length;
  const alDiaCount = students.length - enRiesgoCount;

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#F8FAFC', flexWrap: 'wrap' }}>
      <TeamsHierarchyLeftRail
        colegios={colegios}
        selectedMateriaId={selectedMateriaId}
        selectCombo={selectCombo}
      />
      <div className="page-container" style={{ flex: 1, minWidth: 320 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              {materiaActual ? `${materiaActual.materia_nombre} — Seguimiento` : 'Seguimiento Académico'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '12.5px', margin: 0 }}>
              {colegioActual?.colegio_nombre} · {cursoActual?.curso_nombre}
            </p>
          </div>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 28, height: 34, fontSize: '12.5px' }}
              placeholder="Buscar estudiante..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

      {/* Filtros rápidos de seguimiento */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'TODOS', label: `Todos (${students.length})`, color: '#1E3A8A', bg: '#EFF6FF' },
          { id: 'RIESGO', label: `En Riesgo (${enRiesgoCount})`, color: '#B91C1C', bg: '#FEF2F2' },
          { id: 'AL_DIA', label: `Sin Riesgo (${alDiaCount})`, color: '#065F46', bg: '#ECFDF5' },
        ].map(f => {
          const active = estadoFiltro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setEstadoFiltro(f.id)}
              style={{
                background: active ? f.bg : '#FFFFFF',
                color: active ? f.color : '#64748B',
                border: `1px solid ${active ? f.color : '#E2E8F0'}`,
                borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loading text="Cargando expedientes de estudiantes..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin resultados" description="No se encontró ningún estudiante con ese criterio en esta materia." />
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
                    : 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
                  color: est.riesgo_academico ? '#B91C1C' : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '14px', flexShrink: 0
                }}>
                  {est.nombre_completo.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {est.nombre_completo}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {est.matricula} · {est.materia_nombre || materiaActual?.materia_nombre}
                  </div>
                </div>
                <span className={`badge ${est.estado_academico === 'Aprobado' || est.estado_academico === 'Excelente' ? 'badge-calificada' : est.estado_academico === 'Regular' ? 'badge-pendiente' : 'badge-vencida'}`}>
                  {est.estado_academico}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: 4 }}>
                  <span>Entregas en la materia</span>
                  <span style={{ fontWeight: 600 }}>{est.tareas_entregadas}/{est.tareas_asignadas} ({est.porcentaje_cumplimiento}%)</span>
                </div>
                <ProgressBar value={est.porcentaje_cumplimiento} color={est.porcentaje_cumplimiento >= 80 ? 'success' : est.porcentaje_cumplimiento >= 50 ? 'warning' : 'danger'} height={6} />
              </div>

              {/* Average + risk flag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F1F5F9', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Promedio:</span>
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
                style={{ width: '100%', justifyContent: 'center', fontSize: '12.5px', background: '#1E3A8A' }}
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
        title={`Reporte Académico — ${reportStudent?.nombre_completo || ''}`}
      >
        {reportStudent && (
          <SendReportModal
            student={reportStudent}
            onClose={() => setReportStudent(null)}
          />
        )}
      </Modal>
      </div>
    </div>
  );
}

// ============================================================
// 6. TEACHER REPORTS VIEW (REPORTES REALES POR COLEGIO/CURSO/MATERIA)
// ============================================================
export function TeacherReportsView() {
  const {
    colegios, cursosDisponibles, materiasDisponibles,
    colegioActual, cursoActual, materiaActual,
    selectedColegioId, selectedCursoId, selectedMateriaId,
    onSelectColegio, onSelectCurso, onSelectMateria,
    students, loading
  } = useDocenteEstructura({ allowAllMaterias: true });

  const stats = useMemo(() => {
    const totalEst = students.length;
    const conNota = students.filter(s => s.promedio > 0);
    const promGen = conNota.length > 0
      ? Math.round((conNota.reduce((acc, s) => acc + s.promedio, 0) / conNota.length) * 10) / 10
      : 0;
    const totalEntregas = students.reduce((acc, s) => acc + (s.tareas_entregadas || 0), 0);
    const totalAsignadas = students.reduce((acc, s) => acc + (s.tareas_asignadas || 0), 0);
    const totalPendientes = students.reduce((acc, s) => acc + (s.tareas_pendientes || 0), 0);
    const enRiesgo = students.filter(s => s.riesgo_academico).length;

    const dp = conNota.filter(s => s.promedio >= 85).length;
    const dOpt = conNota.filter(s => s.promedio >= 69 && s.promedio < 85).length;
    const da = conNota.filter(s => s.promedio >= 51 && s.promedio < 69).length;
    const ed = conNota.filter(s => s.promedio < 51).length;
    const sinNotas = totalEst - conNota.length;

    return {
      totalEst,
      promGen,
      totalEntregas,
      totalAsignadas,
      totalPendientes,
      enRiesgo,
      distribucion: [
        { rango: 'Desarrollo Pleno / Excelente (85 - 100 pts)', cantidad: dp, color: '#10B981' },
        { rango: 'Desarrollo Óptimo / Bueno (69 - 84 pts)', cantidad: dOpt, color: '#2563EB' },
        { rango: 'Desarrollo Aceptable / Regular (51 - 68 pts)', cantidad: da, color: '#F59E0B' },
        { rango: 'En Desarrollo / Riesgo (0 - 50 pts)', cantidad: ed, color: '#EF4444' },
        { rango: 'Sin calificaciones registradas', cantidad: sinNotas, color: '#94A3B8' },
      ]
    };
  }, [students]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
            Reportes y Estadísticas Académicas
          </h2>
          <p style={{ color: '#64748B', fontSize: '12.5px', margin: 0 }}>
            Indicadores reales, distribución de notas y cumplimiento por colegio, curso y materia.
          </p>
        </div>

        {cursoActual?.curso_id && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => window.open(`/api/v2/cursos/${cursoActual.curso_id}/boletin-pdf/`, '_blank')}
            style={{ background: '#059669', display: 'inline-flex', alignItems: 'center', gap: 6, height: 34 }}
          >
            <Download size={14} /> Descargar Cuadro PDF del Curso
          </button>
        )}
      </div>

      <DocenteHierarchySelectorBar
        colegios={colegios}
        cursosDisponibles={cursosDisponibles}
        materiasDisponibles={materiasDisponibles}
        selectedColegioId={selectedColegioId}
        selectedCursoId={selectedCursoId}
        selectedMateriaId={selectedMateriaId}
        onSelectColegio={onSelectColegio}
        onSelectCurso={onSelectCurso}
        onSelectMateria={onSelectMateria}
        allowAllMaterias={true}
      />

      {loading ? (
        <Loading text="Generando estadísticas reales del grupo..." />
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-card-icon blue"><Award size={20} /></div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.promGen > 0 ? `${stats.promGen} / 100` : '—'}</div>
                <div className="stat-card-label">Promedio {materiaActual ? materiaActual.materia_nombre : 'del Curso'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon green"><InboxIcon size={20} /></div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.totalEntregas} / {stats.totalAsignadas}</div>
                <div className="stat-card-label">Entregas Registradas</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon yellow"><AlertTriangle size={20} /></div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.enRiesgo}</div>
                <div className="stat-card-label">Registros en Riesgo</div>
              </div>
            </div>
          </div>

          {/* Tabla resumen por materia cuando se seleccionan todas las materias del curso */}
          {!materiaActual && materiasDisponibles.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <span className="card-title"><BookOpen size={16} /> Comparativa por Materias — {cursoActual?.curso_nombre}</span>
              </div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <table className="teams-table">
                  <thead>
                    <tr>
                      <th>Materia</th>
                      <th>Estudiantes</th>
                      <th>Promedio</th>
                      <th>Entregas</th>
                      <th>Pendientes</th>
                      <th>En Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiasDisponibles.map(m => {
                      const ests = m.estudiantes || [];
                      const notas = ests.map(e => e.promedio).filter(p => p != null && p > 0);
                      const promM = notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null;
                      const entM = ests.reduce((a, e) => a + (e.tareas_entregadas || 0), 0);
                      const pendM = ests.reduce((a, e) => a + (e.tareas_pendientes || 0), 0);
                      const riskM = ests.filter(e => e.en_riesgo).length;
                      return (
                        <tr key={m.materia_id}>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{m.materia_nombre}</td>
                          <td>{ests.length}</td>
                          <td style={{ fontWeight: 700, color: getNoteColor(promM || 0) }}>{promM ? `${promM}/100` : '—'}</td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>{entM}</td>
                          <td style={{ color: pendM > 0 ? '#D97706' : '#64748B', fontWeight: 600 }}>{pendM}</td>
                          <td style={{ color: riskM > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>{riskM}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <BarChart2 size={16} /> Distribución de Calificaciones — {colegioActual?.colegio_nombre} ({cursoActual?.curso_nombre})
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stats.distribucion.map((d, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{d.rango}</span>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>{d.cantidad} registro(s)</span>
                    </div>
                    <div style={{ background: '#E2E8F0', borderRadius: '4px', height: 8, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (d.cantidad / Math.max(stats.totalEst, 1)) * 100)}%`,
                        backgroundColor: d.color, height: '100%', borderRadius: '4px', transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
