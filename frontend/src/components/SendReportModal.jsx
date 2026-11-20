import React, { useState } from 'react';
import { Send, CheckCircle, AlertTriangle, Users, Mail, BookOpen, UserX, ShieldAlert } from 'lucide-react';
import { commonAPI } from '../api';

const getNoteColor = (nota) => {
  if (!nota && nota !== 0) return '#616161';
  if (nota >= 90) return '#107C41';
  if (nota >= 51) return '#0078D4';
  return '#B91C1C';
};

export default function SendReportModal({ student, course, isRiskOnly = false, atRiskStudents = [], onClose, onSent }) {
  const isBulk = !student && !!course;

  // Single student initial state vs risk group vs entire course
  let initialSubject = '';
  let initialMessage = '';

  if (isRiskOnly) {
    initialSubject = `📋 CITACIÓN ACADÉMICA URGENTE: Riesgo de Deserción y Reprobación - ${course?.grado} "${course?.paralelo}"`;
    initialMessage = 
      `Estimados Padres de Familia y Tutores Legales:\n\n` +
      `Por medio del presente comunicado, como profesor(a) del curso ${course?.grado} "${course?.paralelo}", les hago llegar formalmente esta CITACIÓN URGENTE por motivos de rendimiento escolar.\n\n` +
      `Se ha detectado que sus hijos/as presentan calificaciones reprobatorias (inferiores a 51/100 pts) y/o acumulación reiterada de tareas sin presentar en la materia.\n\n` +
      `Les solicito encarecidamente ponerse en contacto conmigo o presentarse en la institución a la brevedad posible para coordinar un plan de nivelación y entrega extraordinaria de actividades antes del cierre del periodo evaluativo.\n\n` +
      `Atentamente,\nProfesor(a) de la Asignatura\nPlataforma Educativa EduSmart`;
  } else if (isBulk) {
    initialSubject = `📊 Informe Académico Periódico - Curso ${course?.grado} "${course?.paralelo}"`;
    initialMessage = 
      `Estimados Padres de Familia, Tutores y Estudiantes del curso ${course?.grado} "${course?.paralelo}":\n\n` +
      `Les saluda cordialmente el/la profesor(a) de la materia. Les comparto la actualización oficial del registro de tareas, calificaciones y cumplimiento académico registrado en la plataforma EduSmart.\n\n` +
      `Agradezco el continuo acompañamiento desde el hogar y les invito a revisar el detalle individual de sus evaluaciones.\n\n` +
      `Atentamente,\nProfesor(a) de la Asignatura\nPlataforma Educativa EduSmart`;
  } else {
    const studentName = student?.nombre || student?.nombre_completo || '';
    const tutorLabel = student?.nombre_tutor ? `${student.nombre_tutor} (${student.relacion_tutor || 'Tutor'})` : 'Padre / Madre de Familia / Tutor';
    const enRiesgo = student?.riesgo_academico || (student?.promedio != null && student.promedio < 51) || (student?.tareas_pendientes > 0);

    initialSubject = enRiesgo
      ? `📋 CITACIÓN ACADÉMICA URGENTE: Incumplimiento y Bajo Rendimiento - ${studentName}`
      : `📊 Reporte Periódico de Desempeño - ${studentName}`;

    initialMessage = enRiesgo
      ? `Estimado/a ${tutorLabel} del estudiante ${studentName}:\n\n` +
        `Por medio de la presente, como docente de la asignatura, me dirijo a usted con carácter de URGENCIA para hacerle llegar formalmente esta CITACIÓN ACADÉMICA por bajo rendimiento y tareas sin presentar:\n\n` +
        `• Estudiante: ${studentName}\n` +
        `• Tareas entregadas: ${student?.tareas_entregadas || 0} de ${student?.tareas_asignadas || student?.total_tareas || 0}\n` +
        `• Tareas pendientes sin entregar: ${student?.tareas_pendientes || 0}\n` +
        `• Promedio acumulado: ${student?.promedio > 0 ? student.promedio + '/100 pts' : 'Sin notas suficientes'}\n` +
        `• Cumplimiento: ${student?.porcentaje_cumplimiento || 0}%\n` +
        `• Situación actual: EN RIESGO ACADÉMICO\n\n` +
        `Le solicito muy amablemente comunicarse conmigo o presentarse a la brevedad posible para tratar esta situación, regularizar los trabajos pendientes y evitar la reprobación del periodo.\n\n` +
        `Atentamente,\nProfesor(a) de la Asignatura\nPlataforma Educativa EduSmart`
      : `Estimado/a ${tutorLabel} del estudiante ${studentName}:\n\n` +
        `Le saluda cordialmente su profesor(a). Le comparto el estado académico actualizado de su hijo/a en la plataforma EduSmart:\n\n` +
        `• Estudiante: ${studentName}\n` +
        `• Tareas completadas: ${student?.tareas_entregadas || 0} de ${student?.tareas_asignadas || student?.total_tareas || 0}\n` +
        `• Tareas pendientes: ${student?.tareas_pendientes || 0}\n` +
        `• Promedio acumulado: ${student?.promedio > 0 ? student.promedio + '/100 pts' : 'Sin notas registradas'}\n` +
        `• Porcentaje de cumplimiento: ${student?.porcentaje_cumplimiento || 0}%\n` +
        `• Estado: ${student?.estado_academico || 'Regular'}\n\n` +
        `¡Agradezco su compromiso y constante respaldo en su formación!\n\n` +
        `Atentamente,\nProfesor(a) de la Asignatura\nPlataforma Educativa EduSmart`;
  }

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
      if (isRiskOnly) {
        // Send bulk to at-risk students only
        const ids = (atRiskStudents || []).map(e => e.id || e.estudiante_id);
        const res = await commonAPI.enviarReportesCurso(course.id, {
          asunto,
          mensaje,
          estudiante_ids: ids,
          solo_riesgo: true,
          incluir_calificaciones: incluirCalif,
          incluir_progreso: incluirProgreso,
        });
        setResultData(res);
        setSent(true);
        if (onSent) onSent(res);
      } else if (isBulk) {
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
      <div style={{ textAlign: 'center', padding: '28px 16px' }}>
        <div style={{
          width: 58, height: 58, borderRadius: '50%',
          background: isRiskOnly
            ? 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)'
            : 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: isRiskOnly ? '#B91C1C' : '#065F46'
        }}>
          <CheckCircle size={34} />
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: isRiskOnly ? '#991B1B' : '#065F46', marginBottom: 6 }}>
          {isRiskOnly ? '¡Alertas de Riesgo Enviadas Exitosamente!' : '¡Reporte Académico Enviado!'}
        </h3>
        <p style={{ color: '#4B5563', fontSize: '13.5px', marginBottom: 12 }}>
          {isRiskOnly
            ? `Se notificó individualmente a los ${atRiskStudents.length} estudiantes en riesgo de ${course?.grado} "${course?.paralelo}".`
            : isBulk
            ? `Se emitió el reporte general a todos los estudiantes de ${course?.grado} "${course?.paralelo}".`
            : `El informe fue registrado y notificado al estudiante:`}
        </p>
        {!isBulk && (
          <div style={{
            background: '#F0F4FF', border: '1px solid #C7D2FE',
            borderRadius: 6, padding: '8px 16px', display: 'inline-block',
            fontWeight: 600, fontSize: '13px', color: '#1E3A8A', marginBottom: 18
          }}>
            📧 {student?.email} (RUDE: {student?.matricula || 'Registrado'})
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={onClose} style={{ background: '#1E3A8A' }}>
            Aceptar y Volver a la Lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '12.5px', marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Target Info Header */}
      {isRiskOnly ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: '#FEF2F2', borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          border: '1px solid #FECACA'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8,
            backgroundColor: '#DC2626', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px', flexShrink: 0
          }}>
            <ShieldAlert size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
              Envío Masivo a Estudiantes en Riesgo Académico
              <span style={{ background: '#F87171', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: '11px', fontWeight: 700 }}>
                {atRiskStudents.length} estudiantes
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: 3 }}>
              Curso: <strong>{course?.grado} "{course?.paralelo}"</strong> · Nota &lt; 51 pts o tareas pendientes.
            </div>
          </div>
        </div>
      ) : isBulk ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: '#EFF6FF', borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          border: '1px solid #BFDBFE'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8,
            backgroundColor: '#1E3A8A', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px', flexShrink: 0
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E3A8A' }}>
              Reporte General para: {course?.grado} "{course?.paralelo}"
            </div>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: 2 }}>
              Se emitirá el reporte a todos los estudiantes inscritos en el curso.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: student.riesgo_academico ? '#FEF2F2' : '#F0F4FF',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          border: student.riesgo_academico ? '1px solid #FECACA' : '1px solid #C7D2FE'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: student.riesgo_academico ? '#DC2626' : '#1E3A8A',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '14px', flexShrink: 0
          }}>
            {student.nombre_completo ? student.nombre_completo.slice(0, 2).toUpperCase() : 'ES'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: student.riesgo_academico ? '#991B1B' : '#1E3A8A', display: 'flex', alignItems: 'center', gap: 6 }}>
              {student.nombre_completo}
              {student.riesgo_academico && (
                <span style={{
                  background: '#DC2626', color: '#FFF',
                  borderRadius: 4, padding: '2px 7px', fontSize: '10.5px', fontWeight: 800
                }}>
                  ⚠️ EN RIESGO ACADÉMICO
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: 2 }}>
              📧 {student.email} · Código RUDE: <strong>{student.matricula}</strong>
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
              <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#242424', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirCalif} onChange={e => setIncluirCalif(e.target.checked)} />
          Incluir desglose de notas y tareas calificadas
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#242424', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirProgreso} onChange={e => setIncluirProgreso(e.target.checked)} />
          Incluir porcentaje de cumplimiento y asistencia
        </label>
      </div>

      {/* Subject */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Asunto de la Notificación</label>
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
        <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Mensaje Oficial / Recomendaciones Pedagógicas</label>
        <textarea
          className="form-control"
          rows={7}
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          style={{ fontSize: '12px', lineHeight: 1.5, fontFamily: 'inherit' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {!isBulk && !isRiskOnly && (
          <button
            type="button"
            onClick={() => {
              const fullMsg = `*${asunto}*\n\n${mensaje}`;
              const targetPhone = student?.telefono_tutor || student?.telefono || '';
              const phone = targetPhone.replace(/\D/g, '');
              const cleanPhone = phone.length === 8 ? '591' + phone : phone;
              const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMsg)}` : `https://wa.me/?text=${encodeURIComponent(fullMsg)}`;
              window.open(url, '_blank');
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#16A34A', color: '#FFFFFF', border: 'none',
              borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 2px 4px rgba(22,163,74,0.25)'
            }}
            title="Abrir WhatsApp con la citación oficial para el padre o tutor"
          >
            <span>💬 Notificar por WhatsApp</span>
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSend}
            disabled={sending || !asunto.trim() || !mensaje.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: isRiskOnly ? '#DC2626' : '#1E3A8A',
              border: isRiskOnly ? '1px solid #B91C1C' : 'none'
            }}
          >
            <Send size={13} /> {sending ? 'Enviando...' : isRiskOnly ? `Notificar a los ${atRiskStudents.length} en riesgo` : isBulk ? 'Emitir a todo el curso' : 'Enviar por Correo'}
          </button>
        </div>
      </div>
    </div>
  );
}
