import { useState, useEffect } from 'react';
import {
  Award, MessageSquare, BookOpen, CheckSquare, CheckCircle,
  Clock, AlertCircle, Search, Filter, Sparkles, FileText,
  Paperclip, ExternalLink, ChevronRight, X
} from 'lucide-react';
import { studentAPI } from '../api';
import { Loading, EmptyState, Modal } from '../components';

export default function StudentGradesView({ onNavigate }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMateria, setSelectedMateria] = useState('ALL');
  const [selectedEstado, setSelectedEstado] = useState('ALL');
  const [search, setSearch] = useState('');
  const [modalItem, setModalItem] = useState(null);

  useEffect(() => {
    setLoading(true);
    studentAPI.calificaciones()
      .then(res => {
        setActividades(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        // Fallback a feedbacks si existiese contingencia
        studentAPI.feedbacks()
          .then(res => setActividades(Array.isArray(res) ? res : []))
          .catch(() => setActividades([]));
      })
      .finally(() => setLoading(false));
  }, []);

  // Extraer lista única de materias para el selector
  const materias = Array.from(new Set(actividades.map(a => a.materia).filter(Boolean)));

  // Conteo rápido para los filtros
  const totalCount = actividades.length;
  const calificadasCount = actividades.filter(a => a.estado === 'CALIFICADO' || a.nota !== null).length;
  const enRevisionCount = actividades.filter(a => a.estado === 'EN_REVISION').length;
  const pendientesCount = actividades.filter(a => a.estado === 'PENDIENTE' || a.estado === 'VENCIDO').length;

  // Filtrado de actividades
  const filtered = actividades.filter(a => {
    // Filtro por materia
    if (selectedMateria !== 'ALL' && a.materia !== selectedMateria) return false;

    // Filtro por estado
    if (selectedEstado === 'CALIFICADO' && a.estado !== 'CALIFICADO' && a.nota === null) return false;
    if (selectedEstado === 'EN_REVISION' && a.estado !== 'EN_REVISION') return false;
    if (selectedEstado === 'PENDIENTE' && (a.estado === 'CALIFICADO' || a.estado === 'EN_REVISION')) return false;

    // Búsqueda por texto
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitulo = (a.titulo || a.tarea_titulo || '').toLowerCase().includes(q);
      const matchMateria = (a.materia || '').toLowerCase().includes(q);
      const matchDocente = (a.docente || '').toLowerCase().includes(q);
      return matchTitulo || matchMateria || matchDocente;
    }

    return true;
  });

  const getBadgeStyle = (estado, nota) => {
    if (estado === 'CALIFICADO' || nota !== null) {
      const num = parseFloat(nota);
      if (num >= 80) return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: 'Aprobado' };
      if (num >= 60) return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', label: 'Regular' };
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'En recuperación' };
    }
    if (estado === 'EN_REVISION') {
      return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', label: 'En revisión' };
    }
    if (estado === 'VENCIDO') {
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Vencida' };
    }
    return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', label: 'Pendiente' };
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Encabezado Principal */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 8,
              background: '#EFF6FF', color: '#1E3A8A',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Award size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Calificaciones
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: '3px 0 0' }}>
                Registro oficial de notas y retroalimentación de todas tus actividades escolares
              </p>
            </div>
          </div>
        </div>

        {/* Resumen Discreto de Contadores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20,
            padding: '6px 14px', fontSize: 12, color: '#475569', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span>Total:</span>
            <strong style={{ color: '#0F172A' }}>{totalCount}</strong>
          </div>
          <div style={{
            background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 20,
            padding: '6px 14px', fontSize: 12, color: '#065F46', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <CheckCircle size={13} />
            <span>Calificadas:</span>
            <strong>{calificadasCount}</strong>
          </div>
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 20,
            padding: '6px 14px', fontSize: 12, color: '#1E40AF', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Clock size={13} />
            <span>En revisión:</span>
            <strong>{enRevisionCount}</strong>
          </div>
          <div style={{
            background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 20,
            padding: '6px 14px', fontSize: 12, color: '#64748B', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span>Pendientes:</span>
            <strong>{pendientesCount}</strong>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        {/* Selector de Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `Todas (${totalCount})` },
            { id: 'CALIFICADO', label: `Calificadas (${calificadasCount})` },
            { id: 'EN_REVISION', label: `En revisión (${enRevisionCount})` },
            { id: 'PENDIENTE', label: `Pendientes (${pendientesCount})` },
          ].map(tab => {
            const active = selectedEstado === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedEstado(tab.id)}
                style={{
                  background: active ? '#1E3A8A' : '#F8FAFC',
                  color: active ? '#FFFFFF' : '#475569',
                  border: `1px solid ${active ? '#1E3A8A' : '#CBD5E1'}`,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filtro por Materia y Barra de Búsqueda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 320px', justifyContent: 'flex-end' }}>
          <select
            value={selectedMateria}
            onChange={(e) => setSelectedMateria(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: 12,
              color: '#334155',
              background: '#FFFFFF',
              fontWeight: 500,
              cursor: 'pointer',
              minWidth: 160
            }}
          >
            <option value="ALL">Todas las materias</option>
            {materias.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div style={{ position: 'relative', minWidth: 200, flex: 1, maxWidth: 300 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Buscar actividad o docente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 30px',
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

      {/* Contenido: Tabla de Calificaciones */}
      {loading ? (
        <Loading text="Cargando tus calificaciones oficiales..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Sin actividades registradas"
          description={
            search || selectedMateria !== 'ALL' || selectedEstado !== 'ALL'
              ? "No se encontraron actividades con los filtros seleccionados."
              : "Aún no tienes actividades asignadas en tus materias."
          }
        />
      ) : (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              minWidth: 900
            }}>
              <thead>
                <tr style={{
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0'
                }}>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Materia
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actividad / Tarea
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Docente
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fecha
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nota
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Retroalimentación Docente
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const titulo = item.titulo || item.tarea_titulo || 'Actividad Escolar';
                  const isSimulador = item.tipo === 'Simulador IA';
                  const badge = getBadgeStyle(item.estado, item.nota);
                  const fechaStr = item.fecha_entrega || item.fecha || item.fecha_limite || '—';

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      {/* Materia */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-block',
                          background: '#EFF6FF',
                          color: '#1E3A8A',
                          border: '1px solid #DBEAFE',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          {item.materia || 'General'}
                        </span>
                      </td>

                      {/* Título de la Actividad */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: 260 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
                          {titulo}
                        </div>
                        {item.archivo_nombre && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: '#64748B', marginTop: 4
                          }}>
                            <Paperclip size={11} />
                            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.archivo_nombre}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Tipo */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {isSimulador ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#FAF5FF', color: '#7C3AED', border: '1px solid #E9D5FF',
                            borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600
                          }}>
                            <Sparkles size={11} /> Simulador IA
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0',
                            borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600
                          }}>
                            <FileText size={11} /> Tarea
                          </span>
                        )}
                      </td>

                      {/* Docente */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 12, color: '#334155', whiteSpace: 'nowrap' }}>
                        {item.docente || 'Docente'}
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
                        {fechaStr}
                      </td>

                      {/* Nota Oficial */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {item.nota !== null ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: badge.text,
                              background: badge.bg,
                              border: `1px solid ${badge.border}`,
                              borderRadius: 6,
                              padding: '2px 8px'
                            }}>
                              {item.nota} <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>/ {item.puntaje_maximo || 100}</span>
                            </span>
                          </div>
                        ) : (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: badge.text,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            borderRadius: 6,
                            padding: '3px 8px'
                          }}>
                            {badge.label}
                          </span>
                        )}
                      </td>

                      {/* Retroalimentación Docente */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: 300 }}>
                        {item.retroalimentacion || item.comentario ? (
                          <div
                            onClick={() => setModalItem(item)}
                            title="Haz clic para ver detalle completo"
                            style={{
                              fontSize: 12,
                              color: '#334155',
                              background: '#F8FAFC',
                              borderLeft: '3px solid #1E3A8A',
                              padding: '6px 10px',
                              borderRadius: '0 6px 6px 0',
                              lineHeight: 1.35,
                              cursor: 'pointer',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            “{item.retroalimentacion || item.comentario}”
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                            Sin observaciones
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => {
                            if (isSimulador) {
                              if (onNavigate) onNavigate('practicas');
                            } else if (item.tarea_id) {
                              if (onNavigate) onNavigate('tarea-detalle', { taskId: item.tarea_id });
                            } else {
                              setModalItem(item);
                            }
                          }}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1E3A8A',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>Ver</span>
                          <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Retroalimentación */}
      {modalItem && (
        <Modal
          isOpen={!!modalItem}
          onClose={() => setModalItem(null)}
          title="Detalle de Calificación y Retroalimentación"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span style={{
                background: '#EFF6FF', color: '#1E3A8A',
                border: '1px solid #DBEAFE', borderRadius: 4,
                padding: '2px 8px', fontSize: 11, fontWeight: 700
              }}>
                {modalItem.materia || 'General'}
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '8px 0 4px' }}>
                {modalItem.titulo || modalItem.tarea_titulo}
              </h3>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Docente: <strong style={{ color: '#334155' }}>{modalItem.docente || 'Docente'}</strong>
              </div>
            </div>

            {/* Cuadro de Calificación */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px'
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Nota Obtenida
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: modalItem.nota >= 60 ? '#10B981' : '#EF4444' }}>
                  {modalItem.nota !== null ? modalItem.nota : '—'}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}> / {modalItem.puntaje_maximo || 100}</span>
                </div>
              </div>
              <div>
                <span style={{
                  background: modalItem.nota >= 60 ? '#ECFDF5' : '#EFF6FF',
                  color: modalItem.nota >= 60 ? '#065F46' : '#1E40AF',
                  border: `1px solid ${modalItem.nota >= 60 ? '#A7F3D0' : '#BFDBFE'}`,
                  borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700
                }}>
                  {modalItem.estado === 'CALIFICADO' ? (modalItem.nota >= 60 ? 'Aprobado' : 'En recuperación') : modalItem.estado}
                </span>
              </div>
            </div>

            {/* Retroalimentación Cualitativa del Docente */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={14} /> Retroalimentación Pedagógica del Docente:
              </div>
              <div style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '4px solid #1E3A8A',
                borderRadius: '0 8px 8px 0', padding: 14, fontSize: 13, color: '#1E293B',
                lineHeight: 1.5, fontStyle: 'italic'
              }}>
                “{modalItem.retroalimentacion || modalItem.comentario || 'Sin observaciones registradas.'}”
              </div>
            </div>

            {/* Archivo adjunto si existe */}
            {modalItem.archivo_nombre && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#F1F5F9', borderRadius: 8, fontSize: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                  <Paperclip size={14} color="#64748B" />
                  <span style={{ fontWeight: 600 }}>{modalItem.archivo_nombre}</span>
                </div>
                {modalItem.archivo_url && (
                  <a
                    href={modalItem.archivo_url}
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
                onClick={() => setModalItem(null)}
                style={{
                  background: '#1E3A8A', color: '#FFFFFF', border: 'none',
                  borderRadius: 6, padding: '8px 18px', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer'
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
