import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Pin, CheckCircle2, Clock, Send, Plus, Filter,
  AlertCircle, ShieldCheck, ChevronDown, ChevronUp, User, Sparkles, X, MessageCircle
} from 'lucide-react';
import apiFetch from '../api';

export default function MuroMateria({ espacioId, userRole, currentUserId }) {
  const isDocente = userRole === 'DOCENTE';
  const [publicaciones, setPublicaciones] = useState([]);
  const [horario, setHorario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('TODOS'); // 'TODOS' | 'AVISO' | 'CONSULTA' | 'PENDIENTES'
  
  // Modal / Form state
  const [showForm, setShowForm] = useState(false);
  const [formTipo, setFormTipo] = useState(isDocente ? 'AVISO' : 'CONSULTA');
  const [formTitulo, setFormTitulo] = useState('');
  const [formContenido, setFormContenido] = useState('');
  const [formFijado, setFormFijado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New comment input per post
  const [comentarioInputs, setComentarioInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [sendingComment, setSendingComment] = useState({});

  const loadMuro = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/v2/espacios/${espacioId}/muro/`);
      setPublicaciones(res.publicaciones || []);
      setHorario(res.horario_atencion || null);
    } catch (err) {
      setError(err.message || 'Error al cargar el muro de la materia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (espacioId) loadMuro();
  }, [espacioId]);

  const handleCrearPublicacion = async (e) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formContenido.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/v2/espacios/${espacioId}/muro/`, {
        method: 'POST',
        body: JSON.stringify({
          tipo: formTipo,
          titulo: formTitulo,
          contenido: formContenido,
          fijado: formFijado
        })
      });
      setShowForm(false);
      setFormTitulo('');
      setFormContenido('');
      setFormFijado(false);
      loadMuro();
    } catch (err) {
      alert(err.message || 'Error al publicar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnviarComentario = async (pubId) => {
    const texto = (comentarioInputs[pubId] || '').trim();
    if (!texto) return;
    setSendingComment(prev => ({ ...prev, [pubId]: true }));
    try {
      await apiFetch(`/api/v2/muro/${pubId}/comentar/`, {
        method: 'POST',
        body: JSON.stringify({ contenido: texto })
      });
      setComentarioInputs(prev => ({ ...prev, [pubId]: '' }));
      // Ensure comments are expanded
      setExpandedComments(prev => ({ ...prev, [pubId]: true }));
      loadMuro();
    } catch (err) {
      alert(err.message || 'Error al responder.');
    } finally {
      setSendingComment(prev => ({ ...prev, [pubId]: false }));
    }
  };

  const handleToggleFijar = async (pubId) => {
    try {
      await apiFetch(`/api/v2/muro/${pubId}/toggle-fijar/`, { method: 'POST' });
      loadMuro();
    } catch (err) {
      alert(err.message || 'Error al fijar aviso.');
    }
  };

  const handleToggleResolver = async (pubId) => {
    try {
      await apiFetch(`/api/v2/muro/${pubId}/toggle-resolver/`, { method: 'POST' });
      loadMuro();
    } catch (err) {
      alert(err.message || 'Error al actualizar estado.');
    }
  };

  // Filter logic
  const filteredPubs = publicaciones.filter(p => {
    if (filtro === 'AVISO') return p.tipo === 'AVISO';
    if (filtro === 'CONSULTA') return p.tipo === 'CONSULTA';
    if (filtro === 'PENDIENTES') return !p.resuelto && p.tipo === 'CONSULTA';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Banner de Horario de Atención y Descongestión de WhatsApp ── */}
      <div style={{
        background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)',
        border: '1px solid #A7F3D0',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 8, background: '#DCFCE7', borderRadius: 8, color: '#166534' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Muro Académico y Consultas Centralizadas</span>
              <span style={{ fontSize: 10, background: '#D1FAE5', color: '#047857', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                Horario: 08:00 - 18:00
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
              Este espacio oficial reemplaza los grupos informales de WhatsApp para mantener tus consultas ordenadas, transparentes y en horario pedagógico.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormTipo(isDocente ? 'AVISO' : 'CONSULTA');
            setShowForm(true);
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: '#059669', color: '#FFFFFF',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
            fontSize: 12, boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
          }}
        >
          <Plus size={14} /> {isDocente ? 'Publicar Aviso Oficial' : 'Hacer una Consulta'}
        </button>
      </div>

      {/* ── Modal de Creación ── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 12, width: '100%', maxWidth: 540,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="#059669" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                  {formTipo === 'AVISO' ? 'Publicar Aviso Oficial del Docente' : 'Nueva Consulta sobre la Materia'}
                </h4>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearPublicacion} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isDocente && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setFormTipo('AVISO')}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      border: formTipo === 'AVISO' ? '1.5px solid #059669' : '1px solid #E2E8F0',
                      background: formTipo === 'AVISO' ? '#ECFDF5' : '#F8FAFC',
                      color: formTipo === 'AVISO' ? '#065F46' : '#64748B', cursor: 'pointer'
                    }}
                  >
                    📢 Aviso Oficial
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipo('CONSULTA')}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      border: formTipo === 'CONSULTA' ? '1.5px solid #4F46E5' : '1px solid #E2E8F0',
                      background: formTipo === 'CONSULTA' ? '#EEF2FF' : '#F8FAFC',
                      color: formTipo === 'CONSULTA' ? '#4338CA' : '#64748B', cursor: 'pointer'
                    }}
                  >
                    ❓ Pregunta / Discusión
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Título del tema o pregunta *
                </label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={e => setFormTitulo(e.target.value)}
                  placeholder="Ej: Duda sobre el ejercicio 3 del práctico de física..."
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Detalle del mensaje *
                </label>
                <textarea
                  value={formContenido}
                  onChange={e => setFormContenido(e.target.value)}
                  rows={4}
                  placeholder="Escribe de manera clara y detallada para que el docente o compañeros puedan responderte..."
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {isDocente && formTipo === 'AVISO' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={formFijado}
                    onChange={e => setFormFijado(e.target.checked)}
                  />
                  <span>Fijar este aviso en la parte superior del muro 📌</span>
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ padding: '7px 14px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '7px 16px', background: '#059669', color: '#FFFFFF',
                    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Publicando...' : 'Publicar en el Muro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toolbar de Filtros ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'AVISO', label: '📢 Avisos Oficiales' },
            { id: 'CONSULTA', label: '❓ Consultas' },
            { id: 'PENDIENTES', label: '⏳ Sin Resolver' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: filtro === f.id ? '1px solid #059669' : '1px solid #E2E8F0',
                background: filtro === f.id ? '#ECFDF5' : '#FFFFFF',
                color: filtro === f.id ? '#065F46' : '#64748B',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
          {filteredPubs.length} {filteredPubs.length === 1 ? 'publicación' : 'publicaciones'}
        </span>
      </div>

      {/* ── Lista de Publicaciones ── */}
      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
          Cargando publicaciones del muro...
        </div>
      ) : filteredPubs.length === 0 ? (
        <div style={{
          padding: '36px 20px', textAlign: 'center', background: '#F8FAFC',
          borderRadius: 12, border: '2px dashed #E2E8F0', color: '#64748B'
        }}>
          <MessageCircle size={32} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1E293B' }}>
            No hay mensajes en el muro en este momento.
          </p>
          <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#64748B' }}>
            Sé el primero en compartir un aviso oficial o realizar una consulta pedagógica.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '6px 14px', background: '#059669', color: '#FFFFFF',
              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            + Escribir en el Muro
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPubs.map(pub => {
            const isAuthor = pub.autor_id === currentUserId;
            const commentsOpen = expandedComments[pub.id] || false;
            return (
              <div
                key={pub.id}
                style={{
                  background: pub.fijado ? '#F0FDF4' : '#FFFFFF',
                  border: `1.5px solid ${pub.fijado ? '#A7F3D0' : '#E2E8F0'}`,
                  borderRadius: 12, padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
                }}
              >
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: pub.autor_rol === 'DOCENTE' ? '#DCFCE7' : '#EFF6FF',
                      color: pub.autor_rol === 'DOCENTE' ? '#166534' : '#1E40AF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12
                    }}>
                      {pub.autor_nombre ? pub.autor_nombre.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>
                          {pub.autor_nombre}
                        </span>
                        {pub.autor_rol === 'DOCENTE' && (
                          <span style={{ fontSize: 9, fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: 8 }}>
                            DOCENTE
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>
                          · {new Date(pub.fecha_creacion).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges and Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {pub.fijado && (
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Pin size={10} /> FIJADO
                      </span>
                    )}
                    {pub.tipo === 'AVISO' ? (
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '2px 7px', borderRadius: 10 }}>
                        📢 AVISO OFICIAL
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 800,
                        background: pub.resuelto ? '#E0E7FF' : '#FEF3C7',
                        color: pub.resuelto ? '#3730A3' : '#92400E',
                        padding: '2px 7px', borderRadius: 10
                      }}>
                        {pub.resuelto ? '✓ RESUELTO' : '⏳ CONSULTA'}
                      </span>
                    )}

                    {isDocente && (
                      <button
                        onClick={() => handleToggleFijar(pub.id)}
                        title={pub.fijado ? 'Desfijar aviso' : 'Fijar arriba'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: pub.fijado ? '#D97706' : '#94A3B8', padding: 2 }}
                      >
                        <Pin size={14} />
                      </button>
                    )}

                    {(isDocente || isAuthor) && pub.tipo === 'CONSULTA' && (
                      <button
                        onClick={() => handleToggleResolver(pub.id)}
                        title={pub.resuelto ? 'Reabrir consulta' : 'Marcar como resuelta'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: pub.resuelto ? '#10B981' : '#94A3B8', padding: 2 }}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                  {pub.titulo}
                </h4>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {pub.contenido}
                </p>

                {/* Footer and Comments Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                  <button
                    onClick={() => setExpandedComments(prev => ({ ...prev, [pub.id]: !commentsOpen }))}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, color: '#059669',
                      display: 'flex', alignItems: 'center', gap: 4, padding: 0
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>{pub.total_comentarios} {pub.total_comentarios === 1 ? 'respuesta' : 'respuestas'}</span>
                    {commentsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* ── Thread / Comments Section ── */}
                {commentsOpen && (
                  <div style={{ marginTop: 10, background: '#F8FAFC', borderRadius: 8, padding: 10, border: '1px solid #E2E8F0' }}>
                    {pub.comentarios && pub.comentarios.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                        {pub.comentarios.map(c => (
                          <div
                            key={c.id}
                            style={{
                              background: c.es_docente ? '#F0FDF4' : '#FFFFFF',
                              border: `1px solid ${c.es_docente ? '#BBF7D0' : '#E2E8F0'}`,
                              borderRadius: 6, padding: '8px 10px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontWeight: 700, fontSize: 11, color: c.es_docente ? '#166534' : '#0F172A' }}>
                                  {c.autor_nombre}
                                </span>
                                {c.es_docente && (
                                  <span style={{ fontSize: 9, fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '0 4px', borderRadius: 4 }}>
                                    PROFESOR
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 10, color: '#94A3B8' }}>
                                {new Date(c.fecha_creacion).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                              {c.contenido}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, fontStyle: 'italic' }}>
                        Aún no hay respuestas en este tema. Escribe tu respuesta abajo:
                      </div>
                    )}

                    {/* Input response */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={comentarioInputs[pub.id] || ''}
                        onChange={e => setComentarioInputs(prev => ({ ...prev, [pub.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleEnviarComentario(pub.id); }}
                        placeholder="Escribe una respuesta pedagógica o aclaración..."
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 6,
                          border: '1px solid #CBD5E1', fontSize: 12, background: '#FFFFFF'
                        }}
                      />
                      <button
                        onClick={() => handleEnviarComentario(pub.id)}
                        disabled={sendingComment[pub.id]}
                        style={{
                          padding: '6px 12px', background: '#059669', color: '#FFFFFF',
                          border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
                          fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
