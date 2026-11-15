import { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle, XCircle, ArrowLeft, ArrowRight,
  Clock, Award, Star, Gift, RefreshCw, BookOpen, AlertTriangle, ChevronRight, X
} from 'lucide-react';
import { aiPracticeAPI } from '../api';

export default function ExamSimulatorRunner({ practicaId, onClose, onCompleted }) {
  const [loading, setLoading] = useState(true);
  const [practica, setPractica] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    aiPracticeAPI.getPracticaDetail(practicaId)
      .then(data => {
        setPractica(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Error al cargar el simulador de examen.');
        setLoading(false);
      });
  }, [practicaId]);

  // Cronómetro del examen
  useEffect(() => {
    if (loading || resultado) return;
    const timer = setInterval(() => {
      setSegundosTranscurridos(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, resultado]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (preguntaId, opcionText) => {
    // Extraer la letra inicial: "A) ..." -> "A"
    const letra = opcionText.trim()[0].toUpperCase();
    setRespuestas(prev => ({ ...prev, [String(preguntaId)]: letra }));
  };

  const handleSubmit = () => {
    const totalP = practica?.preguntas?.length || 0;
    const respondidas = Object.keys(respuestas).length;

    if (respondidas < totalP) {
      const confirmar = window.confirm(
        `Has respondido ${respondidas} de ${totalP} ejercicios. ¿Deseas enviar el examen de todas formas?`
      );
      if (!confirmar) return;
    }

    setSubmitting(true);
    setError(null);
    aiPracticeAPI.submitPractica(practicaId, respuestas, segundosTranscurridos)
      .then(res => {
        setResultado(res);
        if (onCompleted) onCompleted(res);
      })
      .catch(err => {
        setError(err.message || 'Error al enviar las respuestas.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handleRetry = () => {
    setResultado(null);
    setRespuestas({});
    setCurrentIndex(0);
    setSegundosTranscurridos(0);
  };

  if (loading) {
    return (
      <div style={MODAL_BACKDROP}>
        <div style={{ ...MODAL_CONTAINER, textAlign: 'center', padding: '3rem 2rem' }}>
          <RefreshCw size={36} color="#4F46E5" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <h3 style={{ margin: 0, color: '#0F172A', fontWeight: 800 }}>Cargando Simulador de Examen con IA...</h3>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '0.85rem' }}>Preparando preguntas del avance temático...</p>
        </div>
      </div>
    );
  }

  if (error && !practica) {
    return (
      <div style={MODAL_BACKDROP}>
        <div style={{ ...MODAL_CONTAINER, padding: '2rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ margin: 0, color: '#991B1B' }}>No se pudo abrir el simulador</h3>
          <p style={{ margin: '8px 0 16px', color: '#64748B', fontSize: '0.88rem' }}>{error}</p>
          <button onClick={onClose} style={BTN_SECONDARY}>Cerrar</button>
        </div>
      </div>
    );
  }

  const preguntas = practica?.preguntas || [];
  const currentQ = preguntas[currentIndex];
  const total = preguntas.length;
  const progresoPorcentaje = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  // ============================================================================
  // PANTALLA DE RESULTADOS Y DIAGNÓSTICO DIDÁCTICO
  // ============================================================================
  if (resultado) {
    const aprobado = resultado.aprobado;
    const nota = resultado.puntaje;

    return (
      <div style={MODAL_BACKDROP}>
        <div style={{ ...MODAL_CONTAINER, maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}>
          {/* Header de Resultados */}
          <div style={{
            background: aprobado ? 'linear-gradient(135deg, #065F46, #059669)' : 'linear-gradient(135deg, #991B1B, #DC2626)',
            color: '#FFFFFF', padding: '1.6rem 2rem', borderRadius: '1rem 1rem 0 0', position: 'relative'
          }}>
            <button
              onClick={onClose}
              style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 9999, color: '#FFFFFF', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              <BookOpen size={12} /> {practica.materia_nombre} · {practica.tema_titulo}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
              {aprobado ? '🎉 ¡Felicidades! Simulador Aprobado' : '📚 Oportunidad de Aprendizaje'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', opacity: 0.9 }}>
              Resultados de tu práctica para el examen del tema avanzado por tu docente.
            </p>

            {/* Score pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              <div style={{ background: '#FFFFFF', color: aprobado ? '#065F46' : '#991B1B', padding: '8px 16px', borderRadius: 10, fontWeight: 900, fontSize: '1.35rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {nota} / 100 <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>pts</span>
              </div>
              <div style={{ fontSize: '0.86rem', lineHeight: 1.3 }}>
                <div><strong>Aciertos:</strong> {resultado.respuestas_correctas} de {resultado.total_preguntas} ejercicios</div>
                <div><strong>Tiempo de resolución:</strong> {formatTime(resultado.tiempo_empleado_segundos)}</div>
              </div>
              {aprobado && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <span style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={13} /> +{resultado.xp_ganado} XP
                  </span>
                  <span style={{ background: '#FEF9C3', color: '#854D0E', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Gift size={13} /> +{resultado.coins_ganados} Coins
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '1.8rem' }}>
            {/* Diagnóstico Pedagógico de IA */}
            <div style={{
              background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '0.85rem',
              padding: '1.1rem 1.3rem', marginBottom: '1.6rem', display: 'flex', gap: 12
            }}>
              <div style={{
                padding: '0.5rem', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                borderRadius: '0.6rem', color: '#FFFFFF', height: 'fit-content'
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1E293B' }}>
                  Diagnóstico y Consejo de IA para tu Examen
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                  {resultado.retroalimentacion_ia}
                </div>
              </div>
            </div>

            {/* Revisión paso a paso de cada ejercicio */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
              Revisión Detallada y Explicaciones Didácticas
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {resultado.revision?.map((item, idx) => {
                const acerto = item.es_correcta;
                return (
                  <div
                    key={idx}
                    style={{
                      border: `1.5px solid ${acerto ? '#BBF7D0' : '#FECACA'}`,
                      background: acerto ? '#F0FDF4' : '#FEF2F2',
                      borderRadius: '0.75rem', padding: '1rem 1.2rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>
                        Ejercicio {idx + 1}
                      </span>
                      {acerto ? (
                        <span style={{ background: '#DCFCE7', color: '#166534', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Correcto (+{item.puntos_ganados} pts)
                        </span>
                      ) : (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={12} /> Incorrecto (0 pts)
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.4 }}>
                      {item.pregunta}
                    </p>

                    <div style={{ fontSize: '0.82rem', marginBottom: 8 }}>
                      <div style={{ color: acerto ? '#166534' : '#991B1B', fontWeight: 700 }}>
                        Tu respuesta: {item.respuesta_alumno ? `${item.letra_alumno}` : '(No respondida)'}
                      </div>
                      {!acerto && (
                        <div style={{ color: '#15803D', fontWeight: 700, marginTop: 2 }}>
                          Respuesta correcta: Opción {item.letra_correcta}
                        </div>
                      )}
                    </div>

                    {/* Explicación didáctica paso a paso de IA */}
                    <div style={{
                      background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                      padding: '0.7rem 0.9rem', fontSize: '0.82rem', color: '#334155', lineHeight: 1.45
                    }}>
                      <strong style={{ color: '#4F46E5', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <BookOpen size={12} /> ¿Cómo se resuelve y por qué?
                      </strong>
                      {item.explicacion}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer de resultados */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.8rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
              <button onClick={handleRetry} style={BTN_SECONDARY}>
                <RefreshCw size={14} /> Intentar Nuevamente
              </button>
              <button onClick={onClose} style={BTN_PRIMARY}>
                Terminar y Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PANTALLA DE RESOLUCIÓN DEL EXAMEN (PREGUNTA POR PREGUNTA)
  // ============================================================================
  const seleccionActual = respuestas[String(currentQ?.id)] || '';

  return (
    <div style={MODAL_BACKDROP}>
      <div style={{ ...MODAL_CONTAINER, maxWidth: '720px' }}>
        {/* Header con Materia, Tema y Tiempo */}
        <div style={{ padding: '1.2rem 1.6rem 0.8rem', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#EEF2FF', color: '#4F46E5', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                {practica.materia_nombre}
              </span>
              <span style={{ color: '#64748B', fontSize: 12 }}>· {practica.tema_titulo}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                <Clock size={12} color="#0284C7" /> {formatTime(segundosTranscurridos)}
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
              Pregunta {currentIndex + 1} de {total}
            </span>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              {Object.keys(respuestas).length} de {total} respondidas
            </span>
          </div>

          {/* Barra de progreso */}
          <div style={{ background: '#E2E8F0', borderRadius: 9999, height: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #4F46E5, #7C3AED)', width: `${progresoPorcentaje}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Cuerpo de la pregunta actual */}
        <div style={{ padding: '1.6rem 1.8rem', minHeight: '260px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 6 }}>
              Dificultad: {currentQ?.dificultad || 'Intermedio'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5' }}>
              Valor: {currentQ?.puntos || 20} pts
            </span>
          </div>

          <h3 style={{ margin: '0 0 1.2rem', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.45 }}>
            {currentQ?.pregunta}
          </h3>

          {/* Opciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentQ?.opciones?.map((opcion, idx) => {
              const letra = opcion.trim()[0].toUpperCase();
              const isSelected = seleccionActual === letra;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectOption(currentQ.id, opcion)}
                  style={{
                    border: `2px solid ${isSelected ? '#4F46E5' : '#E2E8F0'}`,
                    background: isSelected ? '#EEF2FF' : '#FFFFFF',
                    borderRadius: '0.65rem', padding: '0.8rem 1rem',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#CBD5E1'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#E2E8F0'; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 9999, flexShrink: 0,
                    background: isSelected ? '#4F46E5' : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {letra}
                  </div>
                  <span style={{ fontSize: '0.88rem', color: isSelected ? '#1E1B4B' : '#334155', fontWeight: isSelected ? 700 : 500, lineHeight: 1.4 }}>
                    {opcion.replace(/^[A-D]\)\s*/, '')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer con controles */}
        <div style={{ padding: '1rem 1.6rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', borderRadius: '0 0 1rem 1rem' }}>
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            style={{ ...BTN_SECONDARY, opacity: currentIndex === 0 ? 0.4 : 1, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
          >
            <ArrowLeft size={14} /> Anterior
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {currentIndex < total - 1 ? (
              <button
                onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
                style={BTN_PRIMARY}
              >
                Siguiente <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ ...BTN_PRIMARY, background: 'linear-gradient(135deg, #059669, #10B981)' }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Evaluando con IA...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} /> Finalizar y Calificar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Estilos modales en línea
const MODAL_BACKDROP = {
  position: 'fixed', inset: 0,
  background: 'rgba(15, 23, 42, 0.65)',
  zIndex: 99999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '1rem', backdropFilter: 'blur(4px)'
};

const MODAL_CONTAINER = {
  background: '#FFFFFF',
  borderRadius: '1rem',
  width: '100%',
  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
  overflow: 'hidden',
  border: '1px solid #E2E8F0',
  animation: 'scaleIn 0.2s ease-out'
};

const BTN_PRIMARY = {
  padding: '0.6rem 1.1rem',
  background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '0.55rem',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
};

const BTN_SECONDARY = {
  padding: '0.6rem 1rem',
  background: '#FFFFFF',
  color: '#475569',
  border: '1.5px solid #CBD5E1',
  borderRadius: '0.55rem',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6
};

