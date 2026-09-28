import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Building, GraduationCap, BookOpen, Plus,
  Users, FolderOpen, ChevronRight, ArrowRight, AlertCircle,
  Layers, Calendar, X
} from 'lucide-react';
import { Loading, EmptyState, Modal } from '../components';
import { commonAPI } from '../api';
import PanelInvitacion from '../components/PanelInvitacion';

// ─────────────────────────────────────────────────────────────
// Form: Crear Curso
// ─────────────────────────────────────────────────────────────
function FormCrearCurso({ colegioId, onClose, onSaved }) {
  const [form, setForm] = useState({ grado: '', paralelo: '', nivel: 'Bachillerato', anio_lectivo: new Date().getFullYear().toString() });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.grado || !form.paralelo) return alert('Completa los campos');
    setLoading(true);
    try {
      await commonAPI.crearCurso(colegioId, {
        ...form,
        nombre: `${form.grado} "${form.paralelo}"`,
      });
      onSaved();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Grado / Nivel *</label>
        <input className="form-control" placeholder="Ej: 3ro Bachillerato" value={form.grado} onChange={e => setForm({ ...form, grado: e.target.value })} required />
      </div>
      <div className="form-group">
        <label className="form-label">Paralelo *</label>
        <input className="form-control" placeholder="Ej: A" value={form.paralelo} onChange={e => setForm({ ...form, paralelo: e.target.value })} required />
      </div>
      <div className="form-group">
        <label className="form-label">Nivel</label>
        <select className="form-control" value={form.nivel} onChange={e => setForm({ ...form, nivel: e.target.value })}>
          <option>Básica Elemental</option>
          <option>Básica Media</option>
          <option>Básica Superior</option>
          <option>Bachillerato</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Año lectivo</label>
        <input className="form-control" value={form.anio_lectivo} onChange={e => setForm({ ...form, anio_lectivo: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear curso'}</button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Form: Crear Materia
// ─────────────────────────────────────────────────────────────
function FormCrearMateria({ cursoId, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', codigo: '', horas_semanales: 4 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) return alert('El nombre es obligatorio');
    setLoading(true);
    try {
      const res = await commonAPI.crearMateria(cursoId, form);
      onSaved(res);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nombre de la materia *</label>
        <input className="form-control" placeholder="Ej: Matemáticas" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
      </div>
      <div className="form-group">
        <label className="form-label">Código interno (opcional)</label>
        <input className="form-control" placeholder="MAT-001" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear materia'}</button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Main: ColegioDetallePage
// ─────────────────────────────────────────────────────────────
export default function ColegioDetallePage({ colegio, onBack, onNavigate }) {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCurso, setShowAddCurso] = useState(false);
  const [showAddMateria, setShowAddMateria] = useState(null);
  const [expandedCurso, setExpandedCurso] = useState(null);
  const [espacioInvitacion, setEspacioInvitacion] = useState(null);

  const loadCursos = () => {
    setLoading(true);
    setError('');
    commonAPI.cursosPorColegio(colegio.id)
      .then(data => {
        setCursos(data);
        if (data.length > 0 && expandedCurso === null) setExpandedCurso(data[0].id);
      })
      .catch(err => setError(err.message || 'Error al cargar los cursos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCursos(); }, [colegio.id]);

  const totalMaterias = cursos.reduce((acc, c) => acc + (c.materias?.length || 0), 0);

  return (
    <div className="page-container">
      {/* Back */}
      <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Volver a mis colegios
      </button>

      {/* Colegio header */}
      <div style={{
        background: 'linear-gradient(135deg, #0F1E3D 0%, #1E3A8A 100%)',
        borderRadius: 14, padding: '22px 28px',
        display: 'flex', alignItems: 'center', gap: 18,
        color: 'white', marginBottom: 24,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 12,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 800, flexShrink: 0,
        }}>
          {colegio.nombre.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>{colegio.nombre}</h2>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {[colegio.ciudad, colegio.pais].filter(Boolean).join(', ') || 'Ecuador'}
            {colegio.direccion && ` · ${colegio.direccion}`}
          </div>
        </div>
        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 24, fontSize: 13, textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{cursos.length}</div>
            <div style={{ opacity: 0.7 }}>Cursos</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{totalMaterias}</div>
            <div style={{ opacity: 0.7 }}>Materias</div>
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', flexShrink: 0 }}
          onClick={() => setShowAddCurso(true)}
        >
          <Plus size={14} /> Añadir curso
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Loading text="Cargando cursos..." />
      ) : error ? (
        <div style={{ padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626' }}>
          <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{error}
        </div>
      ) : cursos.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Sin cursos registrados"
          description="Todavía no hay cursos en este colegio. Crea el primero para comenzar."
          action={<button className="btn btn-primary" onClick={() => setShowAddCurso(true)}><Plus size={14} /> Añadir curso</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cursos.map(curso => {
            const isExpanded = expandedCurso === curso.id;
            return (
              <div key={curso.id} style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', background: '#FFF' }}>

                {/* Curso header */}
                <div
                  style={{
                    padding: '16px 20px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: isExpanded ? '#EFF6FF' : '#FFF',
                    borderBottom: isExpanded ? '1px solid #DBEAFE' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setExpandedCurso(isExpanded ? null : curso.id)}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 8,
                    background: isExpanded ? '#1E3A8A' : '#EFF6FF',
                    color: isExpanded ? 'white' : '#1E3A8A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16, flexShrink: 0,
                  }}>
                    {curso.grado?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                      {curso.grado} &ldquo;{curso.paralelo}&rdquo;
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {curso.nivel || 'Bachillerato'} · {curso.anio_lectivo}
                      &nbsp;·&nbsp;
                      <span style={{ color: '#1E3A8A', fontWeight: 600 }}>
                        {curso.materias?.length || 0} materia{curso.materias?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronRight size={18} style={{ transform: 'rotate(90deg)', color: '#1E3A8A' }} />
                              : <ChevronRight size={18} color="#94A3B8" />}
                </div>

                {/* Materias — shown when curso is expanded */}
                {isExpanded && (
                  <div>
                    {/* Toolbar */}
                    <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Materias del curso
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={() => setShowAddMateria(curso.id)}
                      >
                        <Plus size={12} /> Añadir materia
                      </button>
                    </div>

                    {!curso.materias || curso.materias.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                        Sin materias en este curso.
                        <button className="btn btn-outline btn-sm" style={{ marginLeft: 10, fontSize: 11 }} onClick={() => setShowAddMateria(curso.id)}>
                          <Plus size={11} /> Agregar materia
                        </button>
                      </div>
                    ) : (
                      <div>
                        {curso.materias.map((mat, idx) => (
                          <div
                            key={mat.id || idx}
                            style={{
                              padding: '14px 20px',
                              display: 'flex', alignItems: 'center', gap: 12,
                              borderBottom: idx < curso.materias.length - 1 ? '1px solid #F1F5F9' : 'none',
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: '#EDE9FE', color: '#6D28D9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <BookOpen size={16} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{mat.nombre}</div>
                              {mat.docente_nombre && (
                                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{mat.docente_nombre}</div>
                              )}
                            </div>

                            {/* Action buttons for each subject */}
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: 11 }}
                                onClick={() => setEspacioInvitacion(mat.espacio_id)}
                                title="Código de invitación para estudiantes"
                              >
                                <Users size={12} /> Código
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: 11, background: '#1E3A8A' }}
                                onClick={() => onNavigate('espacio-detalle', { espacioId: mat.espacio_id, colegio, fromColegio: true })}
                              >
                                <FolderOpen size={12} /> Tareas y entregas <ArrowRight size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Curso */}
      <Modal open={showAddCurso} onClose={() => setShowAddCurso(false)} title="Añadir nuevo curso">
        <FormCrearCurso
          colegioId={colegio.id}
          onClose={() => setShowAddCurso(false)}
          onSaved={loadCursos}
        />
      </Modal>

      {/* Modal: Crear Materia */}
      <Modal open={!!showAddMateria} onClose={() => setShowAddMateria(null)} title="Añadir nueva materia">
        {showAddMateria && (
          <FormCrearMateria
            cursoId={showAddMateria}
            onClose={() => setShowAddMateria(null)}
            onSaved={(res) => {
              loadCursos();
              if (res?.espacio_id) setEspacioInvitacion(res.espacio_id);
            }}
          />
        )}
      </Modal>

      {/* Modal: Código de invitación */}
      <Modal open={!!espacioInvitacion} onClose={() => setEspacioInvitacion(null)} title="Código de invitación">
        {espacioInvitacion && <PanelInvitacion espacio={{ id: espacioInvitacion }} />}
      </Modal>
    </div>
  );
}
