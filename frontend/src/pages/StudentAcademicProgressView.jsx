import { useState, useEffect } from 'react';
import {
  Award, MessageSquare, BookOpen, CheckSquare, CheckCircle,
  TrendingUp, BarChart2, Calendar, FileText, ChevronRight, User,
  Paperclip, ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';
import { studentAPI, progresoAPI } from '../api';
import { Loading, EmptyState, Modal, ProgressBar } from '../components';
import { formatDate, getNoteColor } from '../utils';

export default function StudentAcademicProgressView({ defaultTab = 'notas_retro', onNavigate }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [feedbacks, setFeedbacks] = useState([]);
  const [progreso, setProgreso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      studentAPI.feedbacks().catch(() => []),
      progresoAPI.get().catch(() => null)
    ]).then(([fbs, prog]) => {
      setFeedbacks(Array.isArray(fbs) ? fbs : []);
      setProgreso(prog);
    }).finally(() => setLoading(false));
  }, []);

  const getProgressColor = (val) => {
    if (val >= 80) return '#10B981';
    if (val >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const totalNotas = feedbacks.length;
  const promedioGeneral = totalNotas
    ? Math.round((feedbacks.reduce((acc, f) => acc + (parseFloat(f.nota) || 0), 0) / totalNotas) * 10) / 10
    : (progreso?.promedio_general || 0);
  const notaMaxima = totalNotas
    ? Math.max(...feedbacks.map(f => parseFloat(f.nota) || 0))
    : 0;
  const aprobadasCount = feedbacks.filter(f => parseFloat(f.nota) >= 60).length;

  // Agrupar por materia para la pestaña de materias
  const byMateria = {};
  feedbacks.forEach(f => {
    const m = f.materia || 'General';
    if (!byMateria[m]) {
      byMateria[m] = {
        materia: m,
        total: 0,
        count: 0,
        items: []
      };
    }
    byMateria[m].items.push(f);
    byMateria[m].total += parseFloat(f.nota) || 0;
    byMateria[m].count += 1;
  });

  const filteredFeedbacks = feedbacks.filter(f =>
    !search ||
    (f.tarea_titulo || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.materia || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.comentario || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Banner / Header Principal */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #3B82F6 100%)',
        borderRadius: 12, padding: '24px 28px', color: '#FFFFFF',
        marginBottom: 24, boxShadow: '0 8px 24px rgba(30,58,138,0.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
            <Award size={13} color="#FDE047" /> Rendimiento Escolar Oficial
          </div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Calificaciones y Progreso
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#DBEAFE', lineHeight: 1.5 }}>
            Consulta tus notas oficiales, la retroalimentación cualitativa de tus profesores y el avance por materia escolar.
          </p>
        </div>

        {/* Resumen Promedio */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10,
          padding: '14px 22px', textAlign: 'center', minWidth: 160
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E0E7FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Promedio Global
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', margin: '2px 0' }}>
            {promedioGeneral > 0 ? promedioGeneral : '—'} <span style={{ fontSize: 14, fontWeight: 600, color: '#93C5FD' }}>/ 100</span>
          </div>
          <div style={{ fontSize: 11, color: '#BFDBFE', fontWeight: 600 }}>
            {aprobadasCount} de {totalNotas} evaluadas
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#EFF6FF', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Promedio General</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: getProgressColor(promedioGeneral) }}>
              {promedioGeneral > 0 ? `${promedioGeneral}/100` : '—'}
            </div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tareas Aprobadas</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A' }}>
              {aprobadasCount} <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>/ {totalNotas}</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Nota Más Alta</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>
              {notaMaxima > 0 ? `${notaMaxima}/100` : '—'}
            </div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Retroalimentaciones</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED' }}>
              {feedbacks.length}
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas (Tabs) estilo Microsoft Teams */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0',
        marginBottom: 20, paddingBottom: 2
      }}>
        <button
          onClick={() => setActiveTab('notas_retro')}
          style={{
            background: 'none', border: 'none',
            color: activeTab === 'notas_retro' ? '#1E3A8A' : '#64748B',
            fontSize: '14px', fontWeight: activeTab === 'notas_retro' ? 700 : 500,
            cursor: 'pointer', padding: '10px 14px', position: 'relative',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 0.15s ease'
          }}
        >
          <Award size={15} /> Notas y Retroalimentación Docente ({feedbacks.length})
          {activeTab === 'notas_retro' && (
            <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 3, background: '#1E3A8A', borderRadius: '3px 3px 0 0' }} />
          )}
        </button>

        <button
          onClick={() => setActiveTab('por_materia')}
          style={{
            background: 'none', border: 'none',
            color: activeTab === 'por_materia' ? '#1E3A8A' : '#64748B',
            fontSize: '14px', fontWeight: activeTab === 'por_materia' ? 700 : 500,
            cursor: 'pointer', padding: '10px 14px', position: 'relative',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 0.15s ease'
          }}
        >
          <BarChart2 size={15} /> Promedios por Materia ({Object.keys(byMateria).length})
          {activeTab === 'por_materia' && (
            <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 3, background: '#1E3A8A', borderRadius: '3px 3px 0 0' }} />
          )}
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {loading ? (
        <Loading text="Cargando tus calificaciones oficiales..." />
      ) : activeTab === 'notas_retro' ? (
        /* PESTAÑA 1: NOTAS Y RETROALIMENTACIÓN DOCENTE */
        <div>
          {feedbacks.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Sin calificaciones registradas aún"
              description="Cuando tus profesores revisen y califiquen tus tareas escolares, aparecerán aquí con su respectiva nota y retroalimentación pedagógica."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredFeedbacks.map(f => (
                <div
                  key={f.id}
                  style={{
                    background: '#FFFFFF', border: '1px solid #E2E8F0',
                    borderRadius: 10, padding: '18px 20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
                >
                  {/* Top Bar of Card */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: `${getNoteColor(f.nota)}15`,
                        color: getNoteColor(f.nota),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 900, flexShrink: 0,
                        border: `1.5px solid ${getNoteColor(f.nota)}30`
                      }}>
                        {f.nota}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                          {f.tarea_titulo}
                        </h4>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                          <span style={{ fontWeight: 600, color: '#1E3A8A' }}>{f.materia}</span>
                          {' · '}Prof. {f.docente}
                          {f.fecha && ` · Evaluado el ${f.fecha}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px', borderRadius: 20,
                        fontSize: 11.5, fontWeight: 700,
                        background: f.nota >= 60 ? '#ECFDF5' : '#FEF2F2',
                        color: f.nota >= 60 ? '#059669' : '#DC2626',
                        border: `1px solid ${f.nota >= 60 ? '#A7F3D0' : '#FECACA'}`
                      }}>
                        {f.nota >= 60 ? '✓ Aprobado' : '✗ No Aprobado'}
                      </span>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                        {f.nota} de {f.puntaje_maximo} puntos
                      </div>
                    </div>
                  </div>

                  {/* Caja de Retroalimentación Pedagógica del Docente */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderLeft: '4px solid #1E3A8A',
                    borderRadius: 8,
                    padding: '14px 16px',
                    marginTop: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                      <MessageSquare size={13} /> Retroalimentación Pedagógica del Docente
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.55, fontStyle: 'italic' }}>
                      "{f.comentario}"
                    </p>
                  </div>

                  {/* Pie de tarjeta con archivo */}
                  {f.archivo_nombre && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                        <Paperclip size={13} color="#64748B" />
                        <span>Archivo presentado: <strong>{f.archivo_nombre}</strong></span>
                      </div>
                      {f.archivo_url && (
                        <a href={f.archivo_url} target="_blank" rel="noreferrer" style={{ color: '#0284C7', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Ver entrega <ArrowRight size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* PESTAÑA 2: PROMEDIOS POR MATERIA */
        <div>
          {Object.keys(byMateria).length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Sin promedios por materia"
              description="A medida que tus docentes califiquen tareas en cada materia, se calculará el promedio ponderado correspondiente."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {Object.entries(byMateria).map(([materia, info]) => {
                const avg = Math.round((info.total / info.count) * 10) / 10;
                const pct = Math.min(100, avg);
                return (
                  <div
                    key={materia}
                    style={{
                      background: '#FFFFFF', border: '1px solid #E2E8F0',
                      borderRadius: 12, padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      display: 'flex', flexDirection: 'column'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: 'linear-gradient(135deg, #1E3A8A, #0284C7)',
                          color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{materia}</div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>{info.count} tarea{info.count !== 1 ? 's' : ''} calificada{info.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: getProgressColor(avg) }}>{avg}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>/ 100</div>
                      </div>
                    </div>

                    <div style={{ background: '#F1F5F9', borderRadius: 8, height: 8, overflow: 'hidden', margin: '8px 0 14px 0' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 8,
                        background: getProgressColor(avg),
                        transition: 'width 0.5s ease'
                      }} />
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                      {info.items.map(t => (
                        <div
                          key={t.id}
                          style={{
                            padding: '3px 8px', borderRadius: 16,
                            fontSize: 11.5, fontWeight: 700,
                            background: `${getNoteColor(t.nota)}15`,
                            color: getNoteColor(t.nota),
                            border: `1px solid ${getNoteColor(t.nota)}30`
                          }}
                        >
                          {t.nota}/100
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
