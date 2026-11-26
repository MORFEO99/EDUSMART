import { useState, useEffect } from 'react';
import {
  FileText, Download, CheckCircle, Clock, AlertCircle, ChevronDown,
  ChevronUp, ExternalLink, Award, Sparkles, BookOpen, User, Calendar,
  Paperclip, MessageSquare, CheckSquare, Search, RefreshCw
} from 'lucide-react';
import { studentAPI } from '../api';
import { Loading, EmptyState, Modal } from '../components';

export default function StudentGradesView({ onNavigate }) {
  const [boletinData, setBoletinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedMateria, setExpandedMateria] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [search, setSearch] = useState('');

  const cargarBoletin = () => {
    setLoading(true);
    studentAPI.boletin()
      .then(res => {
        setBoletinData(res);
        // Expandir por defecto la primera materia que tenga notas o tareas
        if (res?.materias?.length > 0) {
          const matConNota = res.materias.find(m => m.promedio !== null) || res.materias[0];
          setExpandedMateria(matConNota.materia_id);
        }
      })
      .catch(err => {
        console.error('Error cargando boletín:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarBoletin();
  }, []);

  const toggleExpand = (matId) => {
    setExpandedMateria(prev => prev === matId ? null : matId);
  };

  const getValoracionColor = (prom) => {
    if (prom === null || prom === undefined) return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', label: 'Sin notas' };
    if (prom >= 85) return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: 'Desarrollo Pleno (DP)' };
    if (prom >= 69) return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', label: 'Desarrollo Óptimo (DO)' };
    if (prom >= 51) return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', label: 'Desarrollo Aceptable (DA)' };
    return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'En Desarrollo (ED)' };
  };

  const descargarBoletinPDF = () => {
    if (!boletinData?.estudiante?.id) return;
    const url = `/api/v2/estudiantes/${boletinData.estudiante.id}/boletin-pdf/`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <Loading text="Generando tu boletín oficial de calificaciones..." />;
  }

  if (!boletinData) {
    return (
      <EmptyState
        icon={FileText}
        title="No se pudo cargar el boletín"
        description="Hubo un problema al conectar con el registro académico escolar. Intenta nuevamente."
        action={cargarBoletin}
        actionLabel="Reintentar"
      />
    );
  }

  const { estudiante, colegio, curso, materias = [], resumen = {} } = boletinData;

  const materiasFiltradas = materias.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (m.materia || '').toLowerCase().includes(q) || (m.docente || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 50 }}>
      {/* ── 1. ENCABEZADO INSTITUCIONAL TIPO BOLETÍN ── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        position: 'relative'
      }}>
        {/* Franja superior institucional */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #1E3A8A',
          paddingBottom: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Plataforma Educativa Escolar · EDUSMART
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
              BOLETÍN OFICIAL DE CALIFICACIONES
            </h1>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Cuadro oficial de notas por materias, tareas prácticas, evaluaciones y tareas pendientes
            </div>
          </div>

          <button
            onClick={descargarBoletinPDF}
            style={{
              background: '#059669',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
              transition: 'background 0.15s ease'
            }}
          >
            <Download size={15} />
            <span>Descargar Boletín Oficial (PDF)</span>
          </button>
        </div>

        {/* Ficha de Información del Estudiante y Colegio */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          background: '#F8FAFC',
          borderRadius: 8,
          padding: '12px 16px',
          border: '1px solid #E2E8F0'
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Unidad Educativa / Colegio</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{colegio?.nombre || 'Colegio Simón Bolívar'}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{colegio?.ciudad || 'Bolivia'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Estudiante</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{estudiante?.nombre_completo}</div>
            <div style={{ fontSize: 11, color: '#1E3A8A', fontWeight: 600 }}>RUDE: {estudiante?.rude}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Curso y Paralelo</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{curso?.nombre}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Gestión Académica {curso?.anio_lectivo || 2026}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Rendimiento Global</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: resumen.promedio_general >= 51 ? '#10B981' : '#EF4444' }}>
              {resumen.promedio_general ? `${resumen.promedio_general} / 100` : 'En evaluación'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Estado: <strong style={{ color: '#0F172A' }}>{resumen.estado_general || 'En Curso'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. BARRA DE HERRAMIENTAS Y BÚSQUEDA ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
          Registro por Materias Escolares ({materias.length} asignaturas)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 280px', maxWidth: 360 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Filtrar por materia o docente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                outline: 'none',
                background: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 3. TABLA OFICIAL DEL BOLETÍN (TIPO LIBRETA ESCOLAR) ── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        marginBottom: 20
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            minWidth: 920
          }}>
            <thead>
              <tr style={{
                background: '#1E3A8A',
                color: '#FFFFFF',
                borderBottom: '2px solid #172554'
              }}>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Materia / Asignatura
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tareas Escolares
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Prácticas / Talleres
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Evaluaciones (IA)
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tareas Pendientes
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                  Promedio (100 pts)
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                  Valoración
                </th>
                <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {materiasFiltradas.map((mat, idx) => {
                const valStyle = getValoracionColor(mat.promedio);
                const isExpanded = expandedMateria === mat.materia_id;
                const tienePendientes = mat.total_pendientes > 0;

                return (
                  <tr
                    key={mat.materia_id || idx}
                    style={{
                      borderBottom: '1px solid #E2E8F0',
                      background: isExpanded ? '#F8FAFC' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Materia y Docente */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        {mat.materia}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <User size={11} />
                        <span>Prof. {mat.docente}</span>
                      </div>
                    </td>

                    {/* Tareas Escolares */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      {mat.tareas.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {mat.tareas.map(t => (
                            <div key={t.id} style={{ fontSize: 11, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: t.nota !== null ? '#10B981' : (t.estado === 'EN_REVISION' ? '#3B82F6' : '#F59E0B')
                              }} />
                              <span style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.titulo}>
                                {t.titulo}
                              </span>
                              {t.nota !== null && (
                                <strong style={{ color: '#059669', fontSize: 11 }}>[{t.nota}]</strong>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Sin tareas</span>
                      )}
                    </td>

                    {/* Prácticas / Talleres */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      {mat.practicas.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {mat.practicas.map(p => (
                            <div key={p.id} style={{ fontSize: 11, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: p.nota !== null ? '#10B981' : '#F59E0B'
                              }} />
                              <span style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.titulo}>
                                {p.titulo}
                              </span>
                              {p.nota !== null && (
                                <strong style={{ color: '#059669', fontSize: 11 }}>[{p.nota}]</strong>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Sin prácticas</span>
                      )}
                    </td>

                    {/* Evaluaciones / Simuladores IA */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      {mat.evaluaciones.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {mat.evaluaciones.map((ev, i) => (
                            <div key={i} style={{ fontSize: 11, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Sparkles size={11} color="#7C3AED" />
                              <span style={{ fontWeight: 500, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.titulo}>
                                {ev.titulo}
                              </span>
                              {ev.nota !== null ? (
                                <span style={{
                                  background: '#FAF5FF', color: '#7C3AED', border: '1px solid #E9D5FF',
                                  borderRadius: 4, padding: '1px 5px', fontWeight: 700, fontSize: 10
                                }}>
                                  {ev.nota} pts
                                </span>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: 10 }}>[Disponible]</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* Tareas Pendientes */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      {tienePendientes ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, width: 'fit-content'
                          }}>
                            <AlertCircle size={11} /> {mat.total_pendientes} pendiente{mat.total_pendientes > 1 ? 's' : ''}
                          </span>
                          {mat.pendientes.slice(0, 1).map(p => (
                            <span key={p.id} style={{ fontSize: 10, color: '#64748B', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.titulo}>
                              • {p.titulo}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
                          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600
                        }}>
                          <CheckCircle size={11} /> Al día (0)
                        </span>
                      )}
                    </td>

                    {/* Promedio (sobre 100) */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {mat.promedio !== null ? (
                        <span style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: valStyle.text,
                          background: valStyle.bg,
                          border: `1px solid ${valStyle.border}`,
                          borderRadius: 6,
                          padding: '3px 10px',
                          display: 'inline-block'
                        }}>
                          {mat.promedio}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>—</span>
                      )}
                    </td>

                    {/* Valoración Cualitativa Oficial */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: valStyle.text,
                        background: valStyle.bg,
                        border: `1px solid ${valStyle.border}`,
                        borderRadius: 6,
                        padding: '3px 8px',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {valStyle.label}
                      </span>
                    </td>

                    {/* Botón Desplegar / Desglose */}
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleExpand(mat.materia_id)}
                        style={{
                          background: isExpanded ? '#1E3A8A' : '#EFF6FF',
                          color: isExpanded ? '#FFFFFF' : '#1E3A8A',
                          border: `1px solid ${isExpanded ? '#1E3A8A' : '#BFDBFE'}`,
                          borderRadius: 6,
                          padding: '5px 9px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{isExpanded ? 'Ocultar' : 'Ver'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Fila de Totales del Boletín */}
            <tfoot>
              <tr style={{ background: '#EFF6FF', borderTop: '2px solid #BFDBFE' }}>
                <td style={{ padding: '14px 14px', fontWeight: 800, color: '#1E3A8A', fontSize: 12 }}>
                  PROMEDIO GENERAL DEL BOLETÍN
                </td>
                <td colSpan={3} style={{ padding: '14px 14px', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                  Evaluación continua de las {materias.length} materias del plan de estudios escolar
                </td>
                <td style={{ padding: '14px 14px', fontWeight: 800, color: resumen.total_pendientes > 0 ? '#DC2626' : '#059669', fontSize: 12 }}>
                  {resumen.total_pendientes} {resumen.total_pendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'}
                </td>
                <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: resumen.promedio_general >= 51 ? '#047857' : '#DC2626',
                    background: '#FFFFFF',
                    border: '1.5px solid #1E3A8A',
                    borderRadius: 6,
                    padding: '3px 12px',
                    display: 'inline-block'
                  }}>
                    {resumen.promedio_general ? `${resumen.promedio_general} / 100` : '—'}
                  </span>
                </td>
                <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 800, color: '#1E3A8A', fontSize: 11 }}>
                  {resumen.estado_general || 'Aprobado'}
                </td>
                <td style={{ padding: '14px 14px' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── 4. DETALLE DESPLEGADO DE LA MATERIA SELECCIONADA ── */}
      {expandedMateria && (() => {
        const mat = materias.find(m => m.materia_id === expandedMateria);
        if (!mat) return null;

        return (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 10,
            padding: '20px 22px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            marginTop: 10
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #E2E8F0',
              paddingBottom: 12,
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div>
                <span style={{
                  background: '#EFF6FF', color: '#1E3A8A', border: '1px solid #DBEAFE',
                  borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700
                }}>
                  DESGLOSE DETALLADO
                </span>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '4px 0 2px' }}>
                  {mat.materia}
                </h2>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Docente titular: <strong style={{ color: '#334155' }}>Prof. {mat.docente}</strong> · Promedio actual: <strong style={{ color: '#1E3A8A' }}>{mat.promedio !== null ? `${mat.promedio}/100` : 'Sin notas registradas'}</strong>
                </div>
              </div>

              <button
                onClick={() => setExpandedMateria(null)}
                style={{
                  background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6,
                  padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer'
                }}
              >
                Cerrar Desglose
              </button>
            </div>

            {/* Listado de Actividades y Tareas de esta materia */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {/* Bloque Tareas y Prácticas */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckSquare size={14} /> Tareas y Prácticas Escolares ({mat.tareas.length + mat.practicas.length})
                </div>

                {[...mat.tareas, ...mat.practicas].length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', padding: 8 }}>
                    No hay tareas asignadas en esta materia.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[...mat.tareas, ...mat.practicas].map(act => (
                      <div
                        key={act.id}
                        onClick={() => setSelectedActivity(act)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 6,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          transition: 'border 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                            {act.titulo}
                          </span>
                          {act.nota !== null ? (
                            <span style={{
                              background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                              borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 800
                            }}>
                              {act.nota}/100
                            </span>
                          ) : (
                            <span style={{
                              background: act.estado === 'EN_REVISION' ? '#EFF6FF' : '#FEF2F2',
                              color: act.estado === 'EN_REVISION' ? '#1E40AF' : '#991B1B',
                              borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700
                            }}>
                              {act.estado}
                            </span>
                          )}
                        </div>

                        {act.retroalimentacion && (
                          <div style={{
                            marginTop: 6, fontSize: 11, color: '#475569', background: '#F8FAFC',
                            padding: '4px 8px', borderRadius: 4, borderLeft: '3px solid #1E3A8A', fontStyle: 'italic'
                          }}>
                            “{act.retroalimentacion}”
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#94A3B8' }}>
                          <span>Límite: {act.fecha_limite || '—'}</span>
                          {act.archivo_nombre && (
                            <span style={{ color: '#1E3A8A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Paperclip size={10} /> Adjunto
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloque Evaluaciones y Simuladores IA */}
              <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} /> Evaluaciones y Simuladores IA ({mat.evaluaciones.length})
                </div>

                {mat.evaluaciones.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', padding: 8 }}>
                    Sin simuladores disponibles aún.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mat.evaluaciones.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E9D5FF',
                          borderRadius: 6,
                          padding: '10px 12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                            {ev.titulo}
                          </span>
                          {ev.nota !== null ? (
                            <span style={{
                              background: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE',
                              borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 800
                            }}>
                              {ev.nota} pts
                            </span>
                          ) : (
                            <button
                              onClick={() => onNavigate && onNavigate('practicas')}
                              style={{
                                background: '#7C3AED', color: '#FFFFFF', border: 'none',
                                borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer'
                              }}
                            >
                              Resolver
                            </button>
                          )}
                        </div>

                        {ev.retroalimentacion && (
                          <div style={{
                            marginTop: 6, fontSize: 11, color: '#475569', background: '#FAF5FF',
                            padding: '4px 8px', borderRadius: 4, borderLeft: '3px solid #7C3AED'
                          }}>
                            {ev.retroalimentacion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Detalle de Actividad */}
      {selectedActivity && (
        <Modal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          title="Detalle de Tarea y Calificación"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase' }}>
                {selectedActivity.tipo_categoria || 'Tarea'}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '4px 0 2px' }}>
                {selectedActivity.titulo}
              </h3>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px'
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Calificación</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: selectedActivity.nota >= 60 ? '#10B981' : '#EF4444' }}>
                  {selectedActivity.nota !== null ? `${selectedActivity.nota} / 100` : selectedActivity.estado}
                </div>
              </div>
              <div>
                <span style={{
                  background: selectedActivity.nota >= 60 ? '#ECFDF5' : '#EFF6FF',
                  color: selectedActivity.nota >= 60 ? '#065F46' : '#1E40AF',
                  border: `1px solid ${selectedActivity.nota >= 60 ? '#A7F3D0' : '#BFDBFE'}`,
                  borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700
                }}>
                  {selectedActivity.estado}
                </span>
              </div>
            </div>

            {selectedActivity.retroalimentacion && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={13} /> Observación / Retroalimentación del Docente:
                </div>
                <div style={{
                  background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '4px solid #1E3A8A',
                  padding: 12, borderRadius: '0 8px 8px 0', fontSize: 12.5, color: '#1E293B', fontStyle: 'italic'
                }}>
                  “{selectedActivity.retroalimentacion}”
                </div>
              </div>
            )}

            {selectedActivity.archivo_nombre && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#F1F5F9', borderRadius: 6, fontSize: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                  <Paperclip size={14} color="#64748B" />
                  <span style={{ fontWeight: 600 }}>{selectedActivity.archivo_nombre}</span>
                </div>
                {selectedActivity.archivo_url && (
                  <a
                    href={selectedActivity.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#1E3A8A', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>Descargar</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => setSelectedActivity(null)}
                style={{
                  background: '#1E3A8A', color: '#FFFFFF', border: 'none',
                  borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
