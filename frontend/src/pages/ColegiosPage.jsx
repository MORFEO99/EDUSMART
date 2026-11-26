import React, { useState, useEffect } from 'react';
import {
  Building, Plus, Users, BookOpen, Search, ArrowRight,
  ArrowLeft, ChevronRight, X, Layers, Calendar, User,
  GraduationCap, FolderOpen, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { Loading, EmptyState, Modal } from '../components';
import apiFetch, { commonAPI, espaciosAPI } from '../api';
import PanelInvitacion from '../components/PanelInvitacion';
import ListaExcelDocente from './ListaExcelDocente';
import EspacioDetallePage from './EspacioDetallePage';

function getTeamsSubjectBadge(materia) {
  const m = (materia || '').toLowerCase();
  if (m.includes('matemática') || m.includes('algebra') || m.includes('calculo')) return { initials: 'MAT', bg: '#D83B01' };
  if (m.includes('física') || m.includes('fisica')) return { initials: 'FIS', bg: '#4F46E5' };
  if (m.includes('química') || m.includes('quimica')) return { initials: 'QMC', bg: '#059669' };
  if (m.includes('biología') || m.includes('biologia')) return { initials: 'BIO', bg: '#0D9488' };
  if (m.includes('lenguaje') || m.includes('literatura')) return { initials: 'LIT', bg: '#7C3AED' };
  if (m.includes('social') || m.includes('historia')) return { initials: 'SOC', bg: '#D97706' };
  const words = (materia || 'M').trim().split(/\s+/);
  const initials = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 3).toUpperCase();
  return { initials, bg: '#1E3A8A' };
}

// ─────────────────────────────────────────────────────────────
// Sub-panel: cursos de un colegio específico
// ─────────────────────────────────────────────────────────────
function CursosPanel({ colegio, onClose, onNavigate, onOpenExcel }) {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddCurso, setShowAddCurso] = useState(false);
  const [formCurso, setFormCurso] = useState({ grado: '1ro de Secundaria', paralelo: '', nivel: 'Secundaria', anio_lectivo: new Date().getFullYear().toString() });
  
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
      setFormCurso({ grado: '1ro de Secundaria', paralelo: '', nivel: 'Secundaria', anio_lectivo: new Date().getFullYear().toString() });
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
                        {curso.nivel || 'Secundaria'} · {curso.anio_lectivo || '2026'}
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
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#1E3A8A' }}
                      onClick={() => {
                        onClose();
                        if (onOpenExcel) onOpenExcel();
                        else onNavigate('espacios', { tab: 'excel' });
                      }}
                      title="Ver lista de calificaciones y estados en formato Excel"
                    >
                      <FileSpreadsheet size={12} /> Lista de Estudiantes (Excel)
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        onClose();
                        onNavigate('teacher_courses', { colegioId: colegio.id, cursoId: curso.id });
                      }}
                    >
                      <Users size={12} /> Administrar curso
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
            <label className="form-label">Nivel Educativo (Bolivia)</label>
            <select
              className="form-control"
              value={formCurso.nivel}
              onChange={e => {
                const nivel = e.target.value;
                const primerGrado = nivel === 'Primaria' ? '1ro de Primaria' : '1ro de Secundaria';
                setFormCurso({ ...formCurso, nivel, grado: primerGrado });
              }}
            >
              <option value="Secundaria">Educación Secundaria Comunitaria Productiva (1ro a 6to)</option>
              <option value="Primaria">Educación Primaria Comunitaria Vocacional (1ro a 6to)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Año de Escolaridad (Grado)</label>
            <select
              className="form-control"
              value={formCurso.grado}
              onChange={e => setFormCurso({ ...formCurso, grado: e.target.value })}
              required
            >
              {formCurso.nivel === 'Primaria' ? (
                <>
                  <option value="1ro de Primaria">1ro de Primaria</option>
                  <option value="2do de Primaria">2do de Primaria</option>
                  <option value="3ro de Primaria">3ro de Primaria</option>
                  <option value="4to de Primaria">4to de Primaria</option>
                  <option value="5to de Primaria">5to de Primaria</option>
                  <option value="6to de Primaria">6to de Primaria</option>
                </>
              ) : (
                <>
                  <option value="1ro de Secundaria">1ro de Secundaria</option>
                  <option value="2do de Secundaria">2do de Secundaria</option>
                  <option value="3ro de Secundaria">3ro de Secundaria</option>
                  <option value="4to de Secundaria">4to de Secundaria</option>
                  <option value="5to de Secundaria">5to de Secundaria</option>
                  <option value="6to de Secundaria">6to de Secundaria</option>
                </>
              )}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Paralelo</label>
            <input
              className="form-control"
              placeholder="Ej: A, B, C"
              value={formCurso.paralelo}
              onChange={e => setFormCurso({ ...formCurso, paralelo: e.target.value.toUpperCase() })}
              required
            />
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
  const [form, setForm] = useState({ nombre: '', ciudad: '', pais: 'Bolivia', direccion: '', telefono: '' });
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
          <input className="form-control" placeholder="Bolivia" value={form.pais} onChange={e => setF('pais', e.target.value)} />
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
// ─────────────────────────────────────────────────────────────
// Main: ColegiosPage con Tabs integrados (Mis Colegios + Reportes)
// ─────────────────────────────────────────────────────────────
export default function ColegiosPage({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState('colegios');
  const [colegios, setColegios] = useState([]);
  const [estructura, setEstructura] = useState([]);
  const [selectedEspacioId, setSelectedEspacioId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [colegioSeleccionado, setColegioSeleccionado] = useState(null);

  const loadColegios = () => {
    setLoading(true);
    Promise.all([
      commonAPI.colegios().catch(() => []),
      apiFetch('/api/v2/docente/lista-excel/').catch(() => ({ colegios: [] }))
    ]).then(([colsList, excelData]) => {
      setColegios(Array.isArray(colsList) ? colsList : []);
      const tree = excelData?.colegios || [];
      setEstructura(tree);
      if (tree.length > 0 && !selectedEspacioId) {
        const prefCol = tree.find(c => (c.colegio_nombre || '').includes('Simón Bolívar')) || tree[0];
        const firstMat = prefCol?.cursos?.[0]?.materias?.find(m => m.espacio_id);
        if (firstMat?.espacio_id) {
          setSelectedEspacioId(firstMat.espacio_id);
        } else {
          for (const col of tree) {
            for (const cur of (col.cursos || [])) {
              const m = (cur.materias || []).find(x => x.espacio_id);
              if (m) { setSelectedEspacioId(m.espacio_id); break; }
            }
          }
        }
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadColegios(); }, []);

  const TABS = [
    { id: 'colegios', label: 'Mis Colegios y Materias (Teams)', icon: BookOpen },
    { id: 'reportes', label: 'Lista de Estudiantes y Reportes', icon: FileSpreadsheet },
  ];

  // Buscar colegio original completo para abrir CursosPanel
  const openCursosOf = (colegioId, nombreFallback) => {
    const found = colegios.find(c => c.id === colegioId) || { id: colegioId, nombre: nombreFallback };
    setColegioSeleccionado(found);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', background: '#F8FAFC' }}>
      {/* Barra superior compacta */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Mis Colegios y Cursos
          </h2>
          <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12,
                    fontWeight: active ? 700 : 500, cursor: 'pointer',
                    background: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#1E3A8A' : '#64748B',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'colegios' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ background: '#1E3A8A', height: 32 }}>
            <Plus size={14} /> Añadir colegio
          </button>
        )}
      </div>

      {/* ══ TAB 1: VISTA ESTILO MICROSOFT TEAMS (PANEL IZQUIERDO COLEGIOS/MATERIAS + PANEL DERECHO ESPACIO) ══ */}
      {activeTab === 'colegios' && (
        loading ? (
          <div className="page-container"><Loading text="Cargando tus colegios y materias..." /></div>
        ) : estructura.length === 0 && colegios.length === 0 ? (
          <div className="page-container">
            <EmptyState
              icon={Building}
              title="No se encontraron colegios"
              description="Aún no estás asignado a ningún colegio. Agrega uno para comenzar."
              action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={14} /> Añadir colegio</button>}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap' }}>
            {/* Panel Izquierdo Teams: Colegios -> Materias */}
            <div style={{
              width: 290, flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E2E8F0',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    className="form-control"
                    placeholder="Buscar colegio o materia..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 30, height: 32, fontSize: 12, background: '#F8FAFC' }}
                  />
                </div>
              </div>

              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                {estructura.map(col => {
                  const q = search.trim().toLowerCase();
                  const colMatches = !q || (col.colegio_nombre || '').toLowerCase().includes(q);
                  const allMats = [];
                  (col.cursos || []).forEach(cur => {
                    (cur.materias || []).forEach(mat => {
                      if (colMatches || (mat.materia_nombre || '').toLowerCase().includes(q) || (cur.curso_nombre || '').toLowerCase().includes(q)) {
                        allMats.push({ ...mat, curso_nombre: cur.curso_nombre, curso_id: cur.curso_id });
                      }
                    });
                  });

                  if (q && !colMatches && allMats.length === 0) return null;

                  return (
                    <div key={col.colegio_id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {/* Header del Colegio */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '4px 8px', gap: 6
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                          <Building size={12} color="#1E3A8A" style={{ flexShrink: 0 }} />
                          <span style={{
                            fontSize: 11, fontWeight: 800, color: '#1E3A8A', textTransform: 'uppercase',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }} title={col.colegio_nombre}>
                            {col.colegio_nombre}
                          </span>
                        </div>
                        <button
                          onClick={() => openCursosOf(col.colegio_id, col.colegio_nombre)}
                          title="Gestionar cursos y materias de este colegio"
                          style={{
                            border: 'none', background: '#EFF6FF', color: '#1E3A8A',
                            borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          + Cursos
                        </button>
                      </div>

                      {/* Lista de Materias estilo Teams */}
                      {allMats.length === 0 ? (
                        <div style={{ fontSize: 11, color: '#94A3B8', padding: '4px 10px', fontStyle: 'italic' }}>
                          Sin materias asignadas aún
                        </div>
                      ) : (
                        allMats.map((mat, idx) => {
                          const isSelected = mat.espacio_id && mat.espacio_id === selectedEspacioId;
                          const badge = getTeamsSubjectBadge(mat.materia_nombre);
                          return (
                            <button
                              key={`${mat.materia_id}-${idx}`}
                              onClick={() => mat.espacio_id && setSelectedEspacioId(mat.espacio_id)}
                              disabled={!mat.espacio_id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                                borderRadius: 8, border: 'none',
                                borderLeft: isSelected ? '3px solid #1E3A8A' : '3px solid transparent',
                                background: isSelected ? '#EFF6FF' : 'transparent',
                                cursor: mat.espacio_id ? 'pointer' : 'not-allowed',
                                textAlign: 'left', width: '100%', transition: 'all 0.12s ease',
                                opacity: mat.espacio_id ? 1 : 0.6
                              }}
                              onMouseEnter={e => { if (!isSelected && mat.espacio_id) e.currentTarget.style.background = '#F8FAFC'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <div style={{
                                width: 32, height: 32, borderRadius: 6, background: badge.bg,
                                color: '#FFFFFF', fontSize: 10.5, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                {badge.initials}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{
                                  fontSize: 12.5, fontWeight: isSelected ? 700 : 600,
                                  color: isSelected ? '#1E3A8A' : '#1E293B',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                  {mat.materia_nombre}
                                </div>
                                <div style={{
                                  fontSize: 10.5, color: '#64748B',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                  {mat.curso_nombre} · {mat.total_estudiantes || 0} est.
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel Derecho Teams: Detalle completo del Espacio seleccionado */}
            <div style={{ flex: 1, minWidth: 320, background: '#F8FAFC' }}>
              {selectedEspacioId ? (
                <EspacioDetallePage
                  key={selectedEspacioId}
                  espacioId={selectedEspacioId}
                  user={user}
                  defaultTab="contenidos"
                  embedded={true}
                  onBack={() => {}}
                />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                  <BookOpen size={36} color="#94A3B8" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Selecciona una materia</div>
                  <p style={{ fontSize: 12.5 }}>Haz clic en cualquier materia del panel izquierdo para gestionar contenidos, temas avanzados, tareas y alumnos.</p>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ══ TAB 2: Lista de Estudiantes y Reportes ══ */}
      {activeTab === 'reportes' && (
        <div className="page-container">
          <div style={{
            padding: '12px 16px', marginBottom: 16,
            background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F4FF 100%)',
            borderRadius: 10, border: '1px solid #BFDBFE',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13
          }}>
            <FileSpreadsheet size={20} color="#1E3A8A" />
            <div>
              <div style={{ fontWeight: 700, color: '#1E3A8A' }}>Lista de Estudiantes por Colegio, Curso y Materia</div>
              <div style={{ color: '#475569', fontSize: 12 }}>
                Selecciona el colegio, luego el curso y la materia para ver las calificaciones y enviar reportes individuales o grupales.
              </div>
            </div>
          </div>
          <ListaExcelDocente onNavigate={onNavigate} />
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

      {/* Panel lateral: cursos del colegio seleccionado */}
      {colegioSeleccionado && (
        <CursosPanel
          colegio={colegioSeleccionado}
          onClose={() => setColegioSeleccionado(null)}
          onNavigate={onNavigate}
          onOpenExcel={() => setActiveTab('reportes')}
        />
      )}
    </div>
  );
}
