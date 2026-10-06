import React, { useState } from 'react';
import { Send, CheckCircle, AlertTriangle, Users, Mail, BookOpen } from 'lucide-react';
import { commonAPI } from '../api';

const getNoteColor = (nota) => {
  if (!nota && nota !== 0) return '#616161';
  if (nota >= 90) return '#107C41';
  if (nota >= 70) return '#0078D4';
  if (nota >= 50) return '#CA5010';
  return '#A80000';
};

export default function SendReportModal({ student, course, onClose, onSent }) {
  const isBulk = !student && !!course;

  // Single student initial state
  const initialSubject = isBulk
    ? `Reporte General de Desempeño - Curso ${course.grado} "${course.paralelo}"`
    : `Reporte de Desempeño Académico - ${student?.nombre_completo || ''}`;

  const initialMessage = isBulk
    ? `Estimados estudiantes y representantes del curso ${course?.grado} "${course?.paralelo}":\n\n` +
      `Se ha actualizado el registro de calificaciones y entregas en la plataforma EduSmart.\n` +
      `Les recordamos la importancia de mantener al día las entregas de tareas y revisar la retroalimentación de los docentes.\n\n` +
      `Saludos cordiales,\nEquipo Docente EduSmart`
    : `Estimado/a ${student?.nombre_completo || ''},\n\n` +
      `Le informamos sobre su estado de desempeño académico actual:\n\n` +
      `• Tareas entregadas: ${student?.tareas_entregadas || 0} de ${student?.tareas_asignadas || 0}\n` +
      `• Tareas pendientes: ${student?.tareas_pendientes || 0}\n` +
      `• Porcentaje de cumplimiento: ${student?.porcentaje_cumplimiento || 0}%\n` +
      `• Promedio acumulado: ${student?.promedio > 0 ? student.promedio + '/100' : 'Sin notas registradas'}\n` +
      `• Estado académico: ${student?.estado_academico || 'En curso'}\n\n` +
      `${student?.riesgo_academico ? '⚠️ ATENCIÓN: Se detectan alertas de riesgo académico debido a tareas pendientes o promedio inferior al mínimo. Se sugiere contacto inmediato con el docente para tutoría.\n\n' : 'Continúa con el excelente compromiso en tus actividades académicas.\n\n'}` +
      `Atentamente,\nEquipo Docente EduSmart`;

  const [asunto, setAsunto] = useState(initialSubject);
  const [mensaje, setMensaje] = useState(initialMessage);
  const [incluirCalif, setIncluirCalif] = useState(true);
  const [incluirProgreso, setIncluirProgreso] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null);

  const handleSend = async () => {
    if (!asunto.trim() || !mensaje.trim()) {
      setError('Por favor completa el asunto y el mensaje.');
      return;
    }
    setSending(true);
    setError('');

    try {
      if (isBulk) {
        const res = await commonAPI.enviarReportesCurso(course.id, {
          asunto,
          mensaje,
          incluir_calificaciones: incluirCalif,
          incluir_progreso: incluirProgreso,
        });
        setResultData(res);
        setSent(true);
        if (onSent) onSent(res);
      } else {
        const res = await commonAPI.enviarReporteEstudiante(student.id, {
          email: student.email,
          asunto,
          mensaje,
          incluir_calificaciones: incluirCalif,
          incluir_progreso: incluirProgreso,
        });
        setResultData(res);
        setSent(true);
        if (onSent) onSent(res);
      }
    } catch (err) {
      setError(err.message || 'Error al enviar el reporte.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: '#065F46'
        }}>
          <CheckCircle size={32} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#065F46', marginBottom: 6 }}>
          ¡Reporte Académico Emitido con Éxito!
        </h3>
        <p style={{ color: '#4B5563', fontSize: '13px', marginBottom: 12 }}>
          {isBulk
            ? `Se notificó a todos los estudiantes matriculados en ${course?.grado} "${course?.paralelo}".`
            : `El informe fue registrado y notificado al estudiante:`}
        </p>
        {!isBulk && (
          <div style={{
            background: '#F0F4FF', border: '1px solid #C7D2FE',
            borderRadius: 6, padding: '8px 14px', display: 'inline-block',
            fontWeight: 600, fontSize: '13px', color: '#1E3A8A', marginBottom: 18
          }}>
            📧 {student?.email}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={onClose}>
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: '12.5px', marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Target Info Header */}
      {!isBulk ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#F0F4FF', borderRadius: 8, padding: '12px 14px', marginBottom: 16,
          border: '1px solid #C7D2FE'
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            backgroundColor: student.riesgo_academico ? '#EF4444' : '#1E3A8A',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '14px', flexShrink: 0
          }}>
            {student.nombre_completo ? student.nombre_completo.slice(0, 2).toUpperCase() : 'ES'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 6 }}>
              {student.nombre_completo}
              {student.riesgo_academico && (
                <span style={{
                  background: '#FEF2F2', color: '#B91C1C',
                  border: '1px solid #FECACA', borderRadius: 4,
                  padding: '2px 6px', fontSize: '10.5px', fontWeight: 700
                }}>
                  ⚠️ Riesgo
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: 2 }}>
              📧 {student.email} · RU: {student.matricula}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#F0FDF4', borderRadius: 8, padding: '12px 14px', marginBottom: 16,
          border: '1px solid #BBF7D0'
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 8,
            backgroundColor: '#16A34A', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px', flexShrink: 0
          }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#14532D' }}>
              Reporte General para: {course?.grado} "{course?.paralelo}"
            </div>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: 2 }}>
              Se emitirá el reporte a todos los estudiantes inscritos en este curso.
            </div>
          </div>
        </div>
      )}

      {/* Metrics summary for single student */}
      {!isBulk && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Promedio', value: student.promedio > 0 ? `${student.promedio}/100` : '—', color: getNoteColor(student.promedio) },
            { label: 'Cumplimiento', value: `${student.porcentaje_cumplimiento || 0}%`, color: (student.porcentaje_cumplimiento || 0) >= 80 ? '#107C41' : '#CA5010' },
            { label: 'Entregadas', value: `${student.tareas_entregadas || 0}/${student.tareas_asignadas || 0}`, color: '#1E3A8A' },
            { label: 'Pendientes', value: student.tareas_pendientes || 0, color: (student.tareas_pendientes || 0) > 0 ? '#CA5010' : '#107C41' },
          ].map((m, i) => (
            <div key={i} style={{
              background: '#FAF9F8', border: '1px solid #EDEBE9',
              borderRadius: 6, padding: '8px 4px', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '10px', color: '#8A8886', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#242424', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirCalif} onChange={e => setIncluirCalif(e.target.checked)} />
          Incluir desglose de notas y tareas
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#242424', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirProgreso} onChange={e => setIncluirProgreso(e.target.checked)} />
          Incluir indicador de cumplimiento
        </label>
      </div>

      {/* Subject */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Asunto del reporte</label>
        <input
          className="form-control"
          value={asunto}
          onChange={e => setAsunto(e.target.value)}
          placeholder="Asunto..."
          style={{ fontSize: '13px' }}
        />
      </div>

      {/* Message body */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Contenido del reporte</label>
        <textarea
          className="form-control"
          rows={7}
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: '11.5px', lineHeight: 1.5 }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={sending}>
          Cancelar
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSend}
          disabled={sending || !asunto.trim() || !mensaje.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Send size={13} /> {sending ? 'Enviando reporte...' : isBulk ? 'Emitir a todo el curso' : 'Enviar reporte'}
        </button>
      </div>
    </div>
  );
}
