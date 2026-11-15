import { useState, useEffect } from 'react';
import {
  Sparkles, BookOpen, Target, CheckCircle, Clock, Star, Gift,
  AlertCircle, RefreshCw, ChevronRight, Award, Play, Filter, Check
} from 'lucide-react';
import { aiPracticeAPI } from '../api';
import ExamSimulatorRunner from '../components/ExamSimulatorRunner';

export default function StudentPracticeView({ onNavigate }) {
  const [practicas, setPracticas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMateria, setFilterMateria] = useState('todas');
  const [selectedPracticaId, setSelectedPracticaId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = () => {
    setLoading(true);
    aiPracticeAPI.estudiantePracticas()
      .then(res => {
        setPracticas(res.practicas || []);
      })
      .catch(err => {
        console.error('Error cargando simuladores:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Extraer lista única de materias para el filtro
  const materias = Array.from(new Set(practicas.map(p => p.materia_nombre)));

  const filteredPracticas = filterMateria === 'todas'
    ? practicas
    : practicas.filter(p => p.materia_nombre === filterMateria);

  const completadas = practicas.filter(p => p.aprobado).length;
  const total = practicas.length;
  const progresoPct = total > 0 ? Math.round((completadas / total) * 100) : 0;

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999999,
          background: '#0F172A', color: '#FFFFFF', padding: '12px 20px',
          borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13
        }}>
          <CheckCircle size={16} color="#10B981" /> {toastMessage}
        </div>
      )}

      {/* Banner Principal */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        borderRadius: '1rem', padding: '1.8rem 2rem', color: '#FFFFFF',
        marginBottom: '1.8rem', boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, marginBottom: 10 }}>
            <Sparkles size={13} color="#FDE047" /> Inteligencia Artificial Educativa
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Simuladores de Examen por Avance Docente
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#C7D2FE', lineHeight: 1.5 }}>
            Cada vez que tu profesor completa un tema en el aula, la IA genera un simulador con ejercicios didácticos paso a paso para que practiques y asegures la máxima nota en tus exámenes formales.
          </p>
        </div>

        {/* KPI de Rendimiento */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.85rem',
          padding: '1.2rem 1.6rem', minWidth: 200, textAlign: 'center'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E0E7FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Simuladores Superados
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', margin: '4px 0' }}>
            {completadas} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#A5B4FC' }}>/ {total}</span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 9999, height: 6, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', background: '#34D399', width: `${progresoPct}%`, transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#A5B4FC', marginTop: 4, fontWeight: 600 }}>
            {progresoPct}% de preparación completada
          </div>
        </div>
      </div>

      {/* Toolbar y Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} /> Filtrar por Asignatura:
          </span>
          <button
            onClick={() => setFilterMateria('todas')}
            style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, transition: 'all 0.15s',
              background: filterMateria === 'todas' ? '#4F46E5' : '#F1F5F9',
              color: filterMateria === 'todas' ? '#FFFFFF' : '#475569'
            }}
          >
            Todas ({practicas.length})
          </button>
          {materias.map(m => (
            <button
              key={m}
              onClick={() => setFilterMateria(m)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, transition: 'all 0.15s',
                background: filterMateria === m ? '#4F46E5' : '#F1F5F9',
                color: filterMateria === m ? '#FFFFFF' : '#475569'
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={loadData}
          style={{
            background: 'none', border: '1px solid #E2E8F0', borderRadius: 8,
            padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#475569',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {/* Grid de Simuladores */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748B' }}>
          <RefreshCw size={28} color="#4F46E5" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Cargando simuladores de tus materias...</p>
        </div>
      ) : filteredPracticas.length === 0 ? (
        <div style={{
          background: '#FFFFFF', border: '2px dashed #E2E8F0', borderRadius: '1rem',
          padding: '3rem 2rem', textAlign: 'center', color: '#64748B'
        }}>
          <BookOpen size={42} style={{ color: '#94A3B8', margin: '0 auto 10px', opacity: 0.6 }} />
          <h3 style={{ margin: 0, color: '#1E293B', fontWeight: 800 }}>No hay simuladores disponibles todavía</h3>
          <p style={{ margin: '6px auto 0', maxWidth: 480, fontSize: '0.86rem', color: '#64748B' }}>
            A medida que tus docentes marquen como <strong>"Completado"</strong> los temas en el aula, aparecerán aquí automáticamente los simuladores de examen con IA para que practiques.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.2rem' }}>
          {filteredPracticas.map(p => {
            const aprobado = p.aprobado;
            const tieneIntentos = p.total_intentos > 0;

            return (
              <div
                key={p.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '1rem',
                  border: `1.5px solid ${aprobado ? '#BBF7D0' : '#E2E8F0'}`,
                  boxShadow: '0 2px 5px rgba(15,23,42,0.04)',
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(15,23,42,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(15,23,42,0.04)'; }}
              >
                {/* Header de la tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{
                      background: '#EFF6FF', color: '#1E3A8A', border: '1px solid #BFDBFE',
                      fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6
                    }}>
                      {p.materia_nombre}
                    </span>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      Docente: {p.docente_nombre}
                    </div>
                  </div>

                  {aprobado ? (
                    <span style={{
                      background: '#DCFCE7', color: '#166534', fontSize: 11, fontWeight: 800,
                      padding: '3px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      <CheckCircle size={12} /> Aprobado ({p.mejor_puntaje} pts)
                    </span>
                  ) : tieneIntentos ? (
                    <span style={{
                      background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 800,
                      padding: '3px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      Por mejorar ({p.mejor_puntaje} pts)
                    </span>
                  ) : (
                    <span style={{
                      background: '#F1F5F9', color: '#475569', fontSize: 11, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 12
                    }}>
                      Nuevo Reto
                    </span>
                  )}
                </div>

                {/* Título del tema y práctica */}
                <h3 style={{ margin: '0 0 6px', fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.35 }}>
                  {p.titulo}
                </h3>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#4F46E5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BookOpen size={12} /> Tema: {p.tema_titulo}
                </div>

                <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, flex: 1 }}>
                  {p.descripcion}
                </p>

                {/* Badges de meta y premios */}
                <div style={{
                  display: 'flex', gap: 8, flexWrap: 'wrap',
                  background: '#F8FAFC', padding: '8px 10px', borderRadius: 8, marginBottom: 14
                }}>
                  <span style={{ fontSize: 11, color: '#334155', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Target size={12} color="#4F46E5" /> {p.total_preguntas} ejercicios
                  </span>
                  <span style={{ fontSize: 11, color: '#334155', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color="#0284C7" /> ~{p.tiempo_limite_minutos} min
                  </span>
                  <span style={{ fontSize: 11, color: '#92400E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Star size={11} color="#D97706" /> +{p.recompensa_xp} XP
                  </span>
                  <span style={{ fontSize: 11, color: '#854D0E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Gift size={11} color="#CA8A04" /> +{p.recompensa_coins} Coins
                  </span>
                </div>

                {/* Botón de Acción */}
                <button
                  onClick={() => setSelectedPracticaId(p.id)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    background: aprobado ? '#F0FDF4' : 'linear-gradient(135deg, #4F46E5, #6366F1)',
                    color: aprobado ? '#166534' : '#FFFFFF',
                    border: aprobado ? '1.5px solid #BBF7D0' : 'none',
                    borderRadius: '0.6rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: aprobado ? 'none' : '0 2px 4px rgba(79, 70, 229, 0.25)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (aprobado) e.currentTarget.style.background = '#DCFCE7';
                  }}
                  onMouseLeave={e => {
                    if (aprobado) e.currentTarget.style.background = '#F0FDF4';
                  }}
                >
                  <Play size={13} fill={aprobado ? '#166534' : '#FFFFFF'} />
                  {aprobado ? 'Repasar / Volver a Practicar' : tieneIntentos ? 'Reintentar Simulador' : '🎯 Practicar para el Examen'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Runner del Examen */}
      {selectedPracticaId && (
        <ExamSimulatorRunner
          practicaId={selectedPracticaId}
          onClose={() => {
            setSelectedPracticaId(null);
            loadData();
          }}
          onCompleted={(res) => {
            showToast(`¡Simulador completado con nota de ${res.puntaje}/100!`);
          }}
        />
      )}
    </div>
  );
}

