import React, { useState, useEffect } from 'react';
import {
  Building, Plus, Users, BookOpen, Search, ArrowRight,
  ArrowLeft, ChevronRight, X, Layers, Calendar, User,
  GraduationCap, FolderOpen, AlertCircle
} from 'lucide-react';
import { Loading, EmptyState, Modal } from '../components';
import { commonAPI, espaciosAPI } from '../api';
import PanelInvitacion from '../components/PanelInvitacion';

// ─────────────────────────────────────────────────────────────
// Sub-panel: cursos de un colegio específico
// ─────────────────────────────────────────────────────────────
function CursosPanel({ colegio, onClose, onNavigate }) {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddCurso, setShowAddCurso] = useState(false);
  const [formCurso, setFormCurso] = useState({ grado: '', paralelo: '', nivel: 'Bachillerato', anio_lectivo: new Date().getFullYear().toString() });
  
  const [showAddMateria, setShowAddMateria] = useState(null); // courseId
  const [formMateria, setFormMateria] = useState({ nombre: '', codigo: '', horas_semanales: 4 });

  const [espacioParaInvitacion, setEspacioParaInvitacion] = useState(null);

  const loadCursos = () => {
    setLoading(true);
    setError('');
    commonAPI.cursosPorColegio(colegio.id)
      .then(setCursos)
      .catch(err => setError(err.message || 'No se pudieron cargar los cursos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCursos();
  }, [colegio.id]);

  const handleCrearCurso = async (e) => {
    e.preventDefault();
    if (!formCurso.grado || !formCurso.paralelo) return alert('Completa los campos');
    try {
      const dataToSend = {
        ...formCurso,
        nombre: `${formCurso.grado} "${formCurso.paralelo}"`
      };
      await commonAPI.crearCurso(colegio.id, dataToSend);
      setShowAddCurso(false);
      setFormCurso({ grado: '', paralelo: '', nivel: 'Bachillerato', anio_lectivo: new Date().getFullYear().toString() });
      loadCursos();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCrearMateria = async (e) => {
    e.preventDefault();
    if (!formMateria.nombre) return alert('Nombre obligatorio');
    try {
      const res = await commonAPI.crearMateria(showAddMateria, formMateria);
      setShowAddMateria(null);
      setFormMateria({ nombre: '', codigo: '', horas_semanales: 4 });
      loadCursos();
      
      // Auto-open invitation panel for the new subject
      if (res && res.espacio_id) {
        setEspacioParaInvitacion(res.espacio_id);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', justifyContent: 'flex-end'
    }}>
      {/* Side panel */}
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#FFFFFF', height: '100%', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', gap: 14,
          background: '#1E3A8A', color: 'white'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, flexShrink: 0
          }}>
            {colegio.nombre.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>
              {colegio.nombre}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              Cursos y paralelos disponibles
            </div>
          </div>
          <button
            onClick={() => setShowAddCurso(true)}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'white', fontSize: 13, fontWeight: 600
            }}
          >
            <Plus size={14} /> Añadir curso
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 6, width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B' }}>
              <Loading text="Cargando cursos..." />
            </div>
          ) : error ? (
            <div style={{
              padding: 16, background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start', color: '#DC2626'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          ) : cursos.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <GraduationCap size={40} color="#CBD5E1" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                Sin cursos registrados
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                No hay cursos asignados en este colegio todavía.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4
              }}>
                {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'} encontrados
              </div>

              {cursos.map(curso => (
                <div
                  key={curso.id}
                  style={{
                    border: '1px solid #E2E8F0', borderRadius: 10,
                    overflow: 'hidden', background: '#FFFFFF',
                    transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1E3A8A'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                >
                  {/* Course header */}
                  <div style={{
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: '#EFF6FF', color: '#1E3A8A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontWeight: 700, fontSize: 15
                    }}>
                      {curso.grado?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                        {curso.grado} &ldquo;{curso.paralelo}&rdquo;
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {curso.nivel || 'Bachillerato'} · {curso.anio_lectivo || '2026-2027'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: '#F1F5F9', color: '#475569',
                      padding: '3px 8px', borderRadius: 12
                    }}>
                      {curso.nombre}
                    </span>
                  </div>

                  {/* Materias list */}
                  <div style={{ padding: '8px 16px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Materias del curso</span>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setShowAddMateria(curso.id)}>
                      <Plus size={12} /> Añadir materia
                    </button>
                  </div>
                  {curso.materias && curso.materias.length > 0 ? (
                    <div style={{ borderTop: '1px solid #F1F5F9' }}>
                      {curso.materias.map((mat, idx) => (
                        <div
                          key={mat.id || idx}
                          style={{
                            padding: '10px 16px',
                            display: 'flex', alignItems: 'center', gap: 10,
                            borderBottom: idx < curso.materias.length - 1 ? '1px solid #F8FAFC' : 'none',
                            background: '#FAFAFA'
                          }}
                        >
                          <FolderOpen size={15} color="#6366F1" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                              {mat.nombre}
                            </div>
                            {mat.docente_nombre && (
                              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                                {mat.docente_nombre}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px', marginRight: 4 }}
                            onClick={() => setEspacioParaInvitacion(mat.espacio_id)}
                            title="Código de invitación"
                          >
                            <Users size={12} /> Invitar
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => {
                              onClose();
                              onNavigate('espacio-detalle', { espacioId: mat.espacio_id });
                            }}
                          >
                            Ver tareas <ArrowRight size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      borderTop: '1px solid #F1F5F9',
                      padding: '10px 16px', background: '#FAFAFA',
                      fontSize: 12, color: '#94A3B8', textAlign: 'center'
                    }}>
                      Sin materias asignadas en este curso
                    </div>
                  )}

                  {/* Footer actions */}
                  <div style={{
                    padding: '10px 16px', borderTop: '1px solid #E2E8F0',
                    display: 'flex', gap: 8, justifyContent: 'flex-end',
                    background: '#F8FAFC'
                  }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        onClose();
                        onNavigate('teacher_courses', { colegioId: colegio.id, cursoId: curso.id });
                      }}
                    >
                      <Users size={12} /> Ver estudiantes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showAddCurso} onClose={() => setShowAddCurso(false)} title="Añadir nuevo curso">
        <form onSubmit={handleCrearCurso}>
          <div className="form-group">
            <label className="form-label">Grado / Nivel</label>
            <input className="form-control" placeholder="Ej: 3ro Bachillerato" value={formCurso.grado} onChange={e => setFormCurso({...formCurso, grado: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Paralelo</label>
            <input className="form-control" placeholder="Ej: A" value={formCurso.paralelo} onChange={e => setFormCurso({...formCurso, paralelo: e.target.value})} required />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddCurso(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Crear curso</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!showAddMateria} onClose={() => setShowAddMateria(null)} title="Añadir nueva materia">
        <form onSubmit={handleCrearMateria}>
          <div className="form-group">
            <label className="form-label">Nombre de la materia</label>
            <input className="form-control" placeholder="Ej: Matemáticas" value={formMateria.nombre} onChange={e => setFormMateria({...formMateria, nombre: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Código interno (opcional)</label>
            <input className="form-control" placeholder="MAT-101" value={formMateria.codigo} onChange={e => setFormMateria({...formMateria, codigo: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddMateria(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Crear materia</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!espacioParaInvitacion} onClose={() => setEspacioParaInvitacion(null)} title="Invitación a Espacio">
        {espacioParaInvitacion && <PanelInvitacion espacio={{ id: espacioParaInvitacion }} />}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal: Agregar nuevo colegio
// ─────────────────────────────────────────────────────────────
function AddColegioModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', ciudad: '', pais: 'Ecuador', direccion: '', telefono: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre del colegio es obligatorio.'); return; }
    setLoading(true);
    setError('');
    try {
      await commonAPI.crearColegio(form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el colegio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 6, marginBottom: 16, fontSize: 13, color: '#DC2626'
        }}>
          {error}
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Nombre del colegio <span className="required">*</span></label>
        <input className="form-control" placeholder="Ej: Colegio Nacional San Marcos" value={form.nombre} onChange={e => setF('nombre', e.target.value)} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Ciudad</label>
          <input className="form-control" placeholder="Quito" value={form.ciudad} onChange={e => setF('ciudad', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">País</label>
          <input className="form-control" placeholder="Ecuador" value={form.pais} onChange={e => setF('pais', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Dirección</label>
        <input className="form-control" placeholder="Av. Principal 123" value={form.direccion} onChange={e => setF('direccion', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Teléfono</label>
        <input className="form-control" placeholder="022-345678" value={form.telefono} onChange={e => setF('telefono', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#1E3A8A' }}>
          {loading ? 'Guardando...' : 'Agregar colegio'}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Main: ColegiosPage
// ─────────────────────────────────────────────────────────────
export default function ColegiosPage({ onNavigate }) {
  const [colegios, setColegios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [colegioSeleccionado, setColegioSeleccionado] = useState(null);

  const loadColegios = () => {
    setLoading(true);
    commonAPI.colegios()
      .then(setColegios)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadColegios(); }, []);

  const filtered = colegios.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
            Mis Colegios
          </h2>
          <p style={{ color: '#64748B', fontSize: 13 }}>
            Instituciones educativas donde impartes clases. Selecciona un colegio para ver sus cursos.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ background: '#1E3A8A', flexShrink: 0 }}>
          <Plus size={16} /> Añadir colegio
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative', width: 320 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
        <input
          className="form-control"
          placeholder="Buscar colegio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* List */}
      {loading ? (
        <Loading text="Cargando tus colegios..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No se encontraron colegios"
          description={search ? `No hay resultados para "${search}".` : 'Aún no estás asignado a ningún colegio. Agrega uno para comenzar.'}
          action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={14} /> Añadir colegio</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
          {filtered.map(colegio => (
            <div
              key={colegio.id}
              style={{
                border: '1px solid #E2E8F0', borderRadius: 12,
                background: '#FFFFFF', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                transition: 'box-shadow 0.15s, border-color 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(30,58,138,0.12)';
                e.currentTarget.style.borderColor = '#BFDBFE';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              {/* Card Header */}
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 10,
                  background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                  color: 'white', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0
                }}>
                  {colegio.nombre.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                    {colegio.nombre}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {[colegio.ciudad, colegio.pais].filter(Boolean).join(', ') || 'Ecuador'}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                padding: '10px 20px', borderTop: '1px solid #F1F5F9',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex', gap: 20, background: '#F8FAFC'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <Layers size={14} color="#6366F1" />
                  <strong style={{ color: '#1E293B' }}>{colegio.total_cursos ?? '—'}</strong> cursos
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <Users size={14} color="#10B981" />
                  <strong style={{ color: '#1E293B' }}>{colegio.total_estudiantes ?? '—'}</strong> estudiantes
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <BookOpen size={14} color="#F59E0B" />
                  <strong style={{ color: '#1E293B' }}>{colegio.total_materias ?? '—'}</strong> materias
                </span>
              </div>

              {/* Actions */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#1E3A8A', fontSize: 13 }}
                  onClick={() => onNavigate('colegio-detalle', { colegio })}
                >
                  <GraduationCap size={15} /> Entrar al colegio
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Agregar colegio */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Agregar nuevo colegio"
      >
        <AddColegioModal
          onClose={() => setShowAddModal(false)}
          onSaved={loadColegios}
        />
      </Modal>

      {/* Side panel: cursos del colegio */}
      {colegioSeleccionado && (
        <CursosPanel
          colegio={colegioSeleccionado}
          onClose={() => setColegioSeleccionado(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
