import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, ChevronRight, Download, Search, AlertTriangle,
  Building2, BookOpen, GraduationCap, FileSpreadsheet, X, Send,
  CheckCircle2, Filter, AlertCircle, ShieldAlert, Sparkles, TrendingUp,
  Award, Check, Layers, SlidersHorizontal, ArrowRight, FileText,
  Clock, MessageSquare
} from 'lucide-react';
import { commonAPI, automationsAPI, alertasAPI } from '../api';
import { Loading, EmptyState, Modal } from '../components';
import SendReportModal from '../components/SendReportModal';
import ContactoTutorModal from '../components/ContactoTutorModal';

// ── Badge de estado académico oficial Bolivia ─────────────────
function estadoBadge(estado) {
  const map = {
    'Excelente': { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
    'Aprobado': { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
    'En riesgo': { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
    'Sin notas': { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
    'CALIFICADO': { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
    'ENTREGADO': { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
    'PENDIENTE': { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
    'ATRASADO': { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  };
  const s = map[estado] || map['Sin notas'];
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
    }}>
      {estado === 'En riesgo' && <AlertTriangle size={11} color="#DC2626" />}
      {estado === 'Excelente' && <Sparkles size={11} color="#059669" />}
      {estado}
    </span>
  );
}

// ── Exportación CSV compatible con Excel ──────────────────────
function downloadCSV(rows, filename = 'calificaciones_bolivia.csv') {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ListaExcelDocente({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 3 Selectores jerárquicos separados: Colegio -> Curso -> Materia
  const [selectedColegioId, setSelectedColegioId] = useState(null);
  const [selectedCursoId, setSelectedCursoId] = useState(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState(null);

  // Filtros de búsqueda
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'riesgo' | 'aprobado' | 'excelente'

  // Modales de reportes
  const [reportStudentTarget, setReportStudentTarget] = useState(null);
  const [reportCourseTarget, setReportCourseTarget] = useState(null);
  const [reportRiskTarget, setReportRiskTarget] = useState(null);
  const [reportSuccessMsg, setReportSuccessMsg] = useState('');

  // Automatizaciones Proactivas
  const [ejecutandoRecordatorios, setEjecutandoRecordatorios] = useState(false);
  const [recordatoriosMsg, setRecordatoriosMsg] = useState('');
  const [reporteSemanalData, setReporteSemanalData] = useState(null);
  const [cargandoSemanal, setCargandoSemanal] = useState(false);

  // Alertas a padres y estudiantes
  const [enviandoAlertas, setEnviandoAlertas] = useState(false);
  const [alertasResultado, setAlertasResultado] = useState(null);
  const [contactoTutorTarget, setContactoTutorTarget] = useState(null); // { estudianteId, nombre }

  const handleEjecutarRecordatorios = async () => {
    setEjecutandoRecordatorios(true);
    setRecordatoriosMsg('');
    try {
      const res = await automationsAPI.ejecutarRecordatorios();
      setRecordatoriosMsg(`✓ Proceso completado: se revisaron ${res.tareas_analizadas} tareas, emitiendo ${res.recordatorios_24h_generados} recordatorios T-24h y ${res.recordatorios_urgentes_2h_generados} alertas urgentes T-2h.`);
    } catch (err) {
      alert(err.message || 'Error al ejecutar recordatorios automáticos.');
    } finally {
      setEjecutandoRecordatorios(false);
    }
  };

  const handleEnviarAlertasMasivas = async () => {
    setEnviandoAlertas(true);
    setAlertasResultado(null);
    try {
      const payload = {};
      if (cursoActual?.curso_id) payload.curso_id = cursoActual.curso_id;
      const res = await alertasAPI.enviarAlertasRendimiento(payload);
      setAlertasResultado(res);
    } catch (err) {
      alert(err.message || 'Error al enviar alertas.');
    } finally {
      setEnviandoAlertas(false);
    }
  };

  const handleCargarReporteSemanal = async () => {
    if (!cursoActual?.curso_id) return;
    setCargandoSemanal(true);
    try {
      const res = await automationsAPI.reporteSemanalCurso(cursoActual.curso_id);
      setReporteSemanalData(res);
    } catch (err) {
      alert(err.message || 'Error al generar reporte semanal.');
    } finally {
      setCargandoSemanal(false);
    }
  };

  const loadData = () => {
    setLoading(true);
    setError('');
    commonAPI.listaExcel()
      .then(res => {
        setData(res);
        if (res.colegios && res.colegios.length > 0) {
          const primerCol = res.colegios[0];
          setSelectedColegioId(primerCol.colegio_id);
          if (primerCol.cursos && primerCol.cursos.length > 0) {
            const primerCur = primerCol.cursos[0];
            setSelectedCursoId(primerCur.curso_id);
            if (primerCur.materias && primerCur.materias.length > 0) {
              setSelectedMateriaId(primerCur.materias[0].materia_id);
            }
          }
        }
      })
      .catch(err => setError(err.message || 'Error al cargar lista de estudiantes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Objetos seleccionados
  const colegios = useMemo(() => data?.colegios || [], [data]);

  const colegioActual = useMemo(() => {
    if (!colegios.length) return null;
    return colegios.find(c => c.colegio_id === selectedColegioId) || colegios[0];
  }, [colegios, selectedColegioId]);

  const cursosDelColegio = useMemo(() => {
    return colegioActual?.cursos || [];
  }, [colegioActual]);

  const cursoActual = useMemo(() => {
    if (!cursosDelColegio.length) return null;
    return cursosDelColegio.find(c => c.curso_id === selectedCursoId) || cursosDelColegio[0];
  }, [cursosDelColegio, selectedCursoId]);

  const materiasDelCurso = useMemo(() => {
    return cursoActual?.materias || [];
  }, [cursoActual]);

  const materiaActual = useMemo(() => {
    if (!materiasDelCurso.length) return null;
    return materiasDelCurso.find(m => m.materia_id === selectedMateriaId) || materiasDelCurso[0];
  }, [materiasDelCurso, selectedMateriaId]);

  // Manejo de cambio de Colegio
  const handleColegioChange = (e) => {
    const colId = parseInt(e.target.value, 10);
    setSelectedColegioId(colId);
    const col = colegios.find(c => c.colegio_id === colId);
    if (col && col.cursos?.length > 0) {
      const primerCur = col.cursos[0];
      setSelectedCursoId(primerCur.curso_id);
      if (primerCur.materias?.length > 0) {
        setSelectedMateriaId(primerCur.materias[0].materia_id);
      } else {
        setSelectedMateriaId(null);
      }
    } else {
      setSelectedCursoId(null);
      setSelectedMateriaId(null);
    }
  };

  // Manejo de cambio de Curso
  const handleCursoChange = (e) => {
    const curId = parseInt(e.target.value, 10);
    setSelectedCursoId(curId);
    const cur = cursosDelColegio.find(c => c.curso_id === curId);
    if (cur && cur.materias?.length > 0) {
      setSelectedMateriaId(cur.materias[0].materia_id);
    } else {
      setSelectedMateriaId(null);
    }
  };

  // Manejo de cambio de Materia
  const handleMateriaChange = (e) => {
    const matId = parseInt(e.target.value, 10);
    setSelectedMateriaId(matId);
  };

  // Estudiantes y Métricas
  const estudiantesMateria = useMemo(() => {
    return materiaActual?.estudiantes || [];
  }, [materiaActual]);

  const estudiantesFiltrados = useMemo(() => {
    return estudiantesMateria.filter(est => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        est.nombre.toLowerCase().includes(q) ||
        (est.ru && est.ru.toLowerCase().includes(q)) ||
        (est.email && est.email.toLowerCase().includes(q));

      const matchEstado = filtroEstado === 'todos' ||
        (filtroEstado === 'riesgo' && est.en_riesgo) ||
        (filtroEstado === 'excelente' && est.estado_academico === 'Excelente') ||
        (filtroEstado === 'aprobado' && est.estado_academico === 'Aprobado');

      return matchSearch && matchEstado;
    });
  }, [estudiantesMateria, search, filtroEstado]);

  // Estadísticas del grupo actual
  const stats = useMemo(() => {
    const total = estudiantesMateria.length;
    if (total === 0) return { total: 0, enRiesgo: [], aprobados: 0, excelentes: 0, promedio: '—', cumplimiento: 0 };
    
    const enRiesgoList = estudiantesMateria.filter(e => e.en_riesgo);
    const aprobadosList = estudiantesMateria.filter(e => e.estado_academico === 'Aprobado' || e.estado_academico === 'Excelente');
    const excelentesList = estudiantesMateria.filter(e => e.estado_academico === 'Excelente');
    
    const notasValidas = estudiantesMateria.map(e => e.promedio).filter(n => n != null);
    const prom = notasValidas.length > 0
      ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1)
      : '—';
    
    const cumpProm = Math.round(estudiantesMateria.reduce((a, e) => a + (e.porcentaje_cumplimiento || 0), 0) / total);

    return {
      total,
      enRiesgo: enRiesgoList,
      aprobados: aprobadosList.length,
      excelentes: excelentesList.length,
      promedio: prom,
      cumplimiento: cumpProm
    };
  }, [estudiantesMateria]);

  // Agrupación de cursos por Nivel para el select
  const cursosPrimaria = useMemo(() => {
    return cursosDelColegio.filter(c => {
      const g = (c.grado || '').toLowerCase();
      const n = (c.nivel || '').toLowerCase();
      return g.includes('primaria') || n.includes('primaria');
    });
  }, [cursosDelColegio]);

  const cursosSecundaria = useMemo(() => {
    return cursosDelColegio.filter(c => {
      const g = (c.grado || '').toLowerCase();
      const n = (c.nivel || '').toLowerCase();
      return !g.includes('primaria') && !n.includes('primaria');
    });
  }, [cursosDelColegio]);

  // Exportar Excel CSV
  const handleExportCSV = () => {
    if (!materiaActual || !cursoActual || !colegioActual) return;
    const rows = estudiantesMateria.map(est => {
      const base = {
        'Colegio': colegioActual.colegio_nombre,
        'Curso': cursoActual.curso_nombre,
        'Materia': materiaActual.materia_nombre,
        'Estudiante': est.nombre,
        'Código RUDE': est.ru,
        'Email': est.email,
        'Tareas Entregadas': est.tareas_entregadas,
        'Tareas Pendientes': est.tareas_pendientes,
        'Total Tareas': est.total_tareas,
        'Cumplimiento %': est.porcentaje_cumplimiento + '%',
        'Promedio (sobre 100 pts)': est.promedio ?? 'Sin notas',
        'Estado Académico': est.estado_academico,
        'Alerta de Riesgo': est.en_riesgo ? 'SÍ' : 'NO',
      };
      (est.calificaciones || []).forEach(cal => {
        base[`Tarea: ${cal.tarea_titulo}`] = cal.nota != null ? `${cal.nota}/100` : cal.estado;
      });
      return base;
    });
    const filename = `Calificaciones_${colegioActual.colegio_nombre}_${cursoActual.curso_nombre}_${materiaActual.materia_nombre}.csv`.replace(/\s+/g, '_');
    downloadCSV(rows, filename);
  };

  if (loading) return <Loading text="Cargando listas y notas de estudiantes..." />;
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#B91C1C' }}>
      <AlertTriangle size={36} style={{ margin: '0 auto 12px', display: 'block' }} />
      <p style={{ fontWeight: 600 }}>{error}</p>
      <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ marginTop: 12 }}>
        Reintentar
      </button>
    </div>
  );

  if (!colegios.length) {
    return (
      <EmptyState
        icon={Users}
        title="Sin colegios asignados"
        description="No se encontraron colegios con cursos y materias asignadas."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Banner de confirmación */}
      {reportSuccessMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', background: '#ECFDF5', border: '1px solid #A7F3D0',
          borderRadius: 8, color: '#065F46', fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 2px 8px rgba(6,95,70,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{reportSuccessMsg}</span>
          </div>
          <button onClick={() => setReportSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#065F46', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BARRA DE SELECCIÓN SEPARADA: COLEGIO ➔ CURSO ➔ MATERIA
          (Diseño en 3 selectores limpios sin confusión)
          ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#FFFFFF', padding: '18px 22px', borderRadius: 12,
        border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
          paddingBottom: 10, borderBottom: '1px solid #F1F5F9'
        }}>
          <SlidersHorizontal size={17} color="#1E3A8A" />
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Filtro de Consulta: Selecciona Colegio, Curso y Materia
          </span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16
        }}>

          {/* 1. SELECTOR DE COLEGIO */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1E3A8A', marginBottom: 6 }}>
              <Building2 size={15} color="#1E3A8A" />
              Colegio:
            </label>
            <select
              className="form-control"
              value={selectedColegioId || ''}
              onChange={handleColegioChange}
              style={{
                height: 44, fontSize: 13.5, fontWeight: 600, color: '#0F172A',
                border: '1.5px solid #BFDBFE', background: '#F8FAFC', borderRadius: 8
              }}
            >
              {colegios.map(c => (
                <option key={c.colegio_id} value={c.colegio_id}>
                  🏫 {c.colegio_nombre} ({c.ciudad || 'Bolivia'} - {c.cursos?.length || 0} cursos)
                </option>
              ))}
            </select>
          </div>

          {/* 2. SELECTOR DE CURSO */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0369A1', marginBottom: 6 }}>
              <GraduationCap size={15} color="#0284C7" />
              Curso:
            </label>
            <select
              className="form-control"
              value={selectedCursoId || ''}
              onChange={handleCursoChange}
              disabled={cursosDelColegio.length === 0}
              style={{
                height: 44, fontSize: 13.5, fontWeight: 600, color: '#0F172A',
                border: '1.5px solid #BAE6FD', background: '#F8FAFC', borderRadius: 8
              }}
            >
              {cursosDelColegio.length === 0 && <option value="">Sin cursos registrados</option>}
              
              {cursosPrimaria.length > 0 && (
                <optgroup label="🎒 NIVEL PRIMARIO (BOLIVIA)">
                  {cursosPrimaria.map(cur => (
                    <option key={cur.curso_id} value={cur.curso_id}>
                      {cur.curso_nombre} ({cur.materias?.length || 0} materias)
                    </option>
                  ))}
                </optgroup>
              )}

              {cursosSecundaria.length > 0 && (
                <optgroup label="🎓 NIVEL SECUNDARIO (BOLIVIA)">
                  {cursosSecundaria.map(cur => (
                    <option key={cur.curso_id} value={cur.curso_id}>
                      {cur.curso_nombre} ({cur.materias?.length || 0} materias)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* 3. SELECTOR DE MATERIA */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4338CA', marginBottom: 6 }}>
              <BookOpen size={15} color="#4338CA" />
              Materia:
            </label>
            <select
              className="form-control"
              value={selectedMateriaId || ''}
              onChange={handleMateriaChange}
              disabled={materiasDelCurso.length === 0}
              style={{
                height: 44, fontSize: 13.5, fontWeight: 600, color: '#0F172A',
                border: '1.5px solid #C7D2FE', background: '#F8FAFC', borderRadius: 8
              }}
            >
              {materiasDelCurso.length === 0 && <option value="">Sin materias en este curso</option>}
              {materiasDelCurso.map(mat => (
                <option key={mat.materia_id} value={mat.materia_id}>
                  📖 {mat.materia_nombre} ({mat.total_estudiantes} estudiantes)
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* BREADCRUMB DE CONFIRMACIÓN DE ESPACIO ACTIVO */}
        {colegioActual && cursoActual && materiaActual && (
          <div style={{
            marginTop: 14, paddingTop: 10, borderTop: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
            color: '#475569', flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 600, color: '#64748B' }}>Espacio Activo:</span>
            <span style={{ fontWeight: 800, color: '#1E3A8A', background: '#EFF6FF', padding: '3px 8px', borderRadius: 6 }}>
              🏫 {colegioActual.colegio_nombre}
            </span>
            <ArrowRight size={13} color="#94A3B8" />
            <span style={{ fontWeight: 800, color: '#0369A1', background: '#E0F2FE', padding: '3px 8px', borderRadius: 6 }}>
              🎓 {cursoActual.curso_nombre}
            </span>
            <ArrowRight size={13} color="#94A3B8" />
            <span style={{ fontWeight: 800, color: '#3730A3', background: '#EEF2FF', padding: '3px 8px', borderRadius: 6 }}>
              📖 {materiaActual.materia_nombre}
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          CENTRO DE EMISIÓN DE REPORTES ACADÉMICOS
          (Separado y con acción prioritaria para estudiantes en riesgo)
          ══════════════════════════════════════════════════════════ */}
      {materiaActual && (
        <div style={{
          background: '#FFFFFF', padding: '18px 20px', borderRadius: 12,
          border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {/* Header del Centro de Reportes */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Centro de Emisión de Reportes Académicos</span>
                <span style={{ fontSize: 11.5, background: '#DC2626', color: '#FFF', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>
                  {stats.enRiesgo.length} en riesgo
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                Envía reportes oficiales a los estudiantes de <strong>{materiaActual.materia_nombre}</strong> ({cursoActual?.curso_nombre}).
              </div>
            </div>

            {/* BOTONES DE ACCIÓN PARA REPORTES */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* 1. Mandar Reporte a Estudiantes en Riesgo */}
              <button
                className="btn btn-sm"
                onClick={() => {
                  if (stats.enRiesgo.length === 0) {
                    alert('Actualmente no hay estudiantes en riesgo académico en esta materia.');
                    return;
                  }
                  setReportRiskTarget({
                    curso: cursoActual,
                    atRiskStudents: stats.enRiesgo
                  });
                }}
                style={{
                  background: stats.enRiesgo.length > 0 ? '#DC2626' : '#94A3B8',
                  color: '#FFFFFF', border: 'none', padding: '9px 16px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8,
                  cursor: stats.enRiesgo.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: stats.enRiesgo.length > 0 ? '0 2px 8px rgba(220,38,38,0.25)' : 'none'
                }}
                title="Mandar alerta pedagógica preventiva exclusivamente a estudiantes con promedio < 51 o tareas pendientes"
              >
                <ShieldAlert size={16} />
                <span>Mandar Reporte a Estudiantes en Riesgo ({stats.enRiesgo.length})</span>
              </button>

              {/* 2. Mandar Reporte a Todo el Curso */}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setReportCourseTarget(cursoActual)}
                style={{
                  background: '#1E3A8A', padding: '9px 16px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8
                }}
                title="Emitir reporte periódico general a todos los alumnos del curso"
              >
                <Send size={15} />
                <span>Mandar Reporte a Todo el Curso</span>
              </button>

              {/* 3. Descargar Boletín PDF del Curso */}
              <button
                className="btn btn-sm"
                onClick={() => {
                  if (!cursoActual?.curso_id) return;
                  window.open(`/api/v2/cursos/${cursoActual.curso_id}/boletin-pdf/`, '_blank');
                }}
                style={{
                  background: '#059669', color: '#FFFFFF', padding: '9px 14px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(5,150,105,0.2)'
                }}
                title="Generar y descargar cuadro oficial de calificaciones de todo el curso en PDF"
              >
                <FileText size={15} />
                <span>Boletín Oficial (PDF)</span>
              </button>

              {/* 4. Recordatorios Escalonados T-24h y T-2h */}
              <button
                className="btn btn-sm"
                onClick={handleEjecutarRecordatorios}
                disabled={ejecutandoRecordatorios}
                style={{
                  background: '#4F46E5', color: '#FFFFFF', padding: '9px 14px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(79,70,229,0.25)'
                }}
                title="Escanear y enviar automáticamente recordatorios preventivos T-24h y T-2h a alumnos con tareas por vencer"
              >
                <Clock size={15} />
                <span>{ejecutandoRecordatorios ? 'Enviando...' : 'Recordatorios T-24h'}</span>
              </button>

              {/* 5. Reporte Semanal a Padres */}
              <button
                className="btn btn-sm"
                onClick={handleCargarReporteSemanal}
                disabled={cargandoSemanal}
                style={{
                  background: '#0D9488', color: '#FFFFFF', padding: '9px 14px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(13,148,136,0.25)'
                }}
                title="Generar consolidado semanal de actividades y asistencia para enviar a padres de familia"
              >
                <MessageSquare size={15} />
                <span>{cargandoSemanal ? 'Generando...' : 'Reporte Semanal'}</span>
              </button>

              {/* 6. Alertas automáticas a padres y estudiantes en riesgo */}
              <button
                className="btn btn-sm"
                onClick={handleEnviarAlertasMasivas}
                disabled={enviandoAlertas}
                style={{
                  background: enviandoAlertas ? '#6B7280' : '#DC2626',
                  color: '#FFFFFF', padding: '9px 14px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(220,38,38,0.25)'
                }}
                title="Detectar y alertar automáticamente a padres y estudiantes con bajo rendimiento o tareas vencidas"
              >
                <AlertTriangle size={15} />
                <span>{enviandoAlertas ? 'Enviando alertas...' : '📱 Alertar Padres & Estudiantes'}</span>
              </button>

              {/* 4. Exportar Excel */}
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportCSV}
                style={{
                  padding: '9px 14px', borderRadius: 8, fontSize: 12.5,
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}
                title="Descargar lista de notas en formato Excel (CSV)"
              >
                <Download size={15} />
                <span>Exportar Excel</span>
              </button>
            </div>

            {/* Banner de resultado de recordatorios automáticos */}
            {recordatoriosMsg && (
              <div style={{
                marginTop: 12, padding: '10px 14px', background: '#EEF2FF',
                border: '1px solid #C7D2FE', borderRadius: 8, color: '#3730A3',
                fontSize: 12.5, fontWeight: 600, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="#4F46E5" />
                  <span>{recordatoriosMsg}</span>
                </div>
                <button
                  onClick={() => setRecordatoriosMsg('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1' }}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Banner de resultado de alertas masivas */}
            {alertasResultado && (
              <div style={{
                marginTop: 12, padding: '12px 16px', background: '#FFF7ED',
                border: '1px solid #FED7AA', borderRadius: 8, color: '#92400E',
                fontSize: 12.5
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={15} color="#DC2626" />
                      Alertas enviadas: <span style={{ color: '#DC2626' }}>{alertasResultado.alertas_enviadas}</span> estudiante(s) en riesgo
                    </div>
                    {alertasResultado.detalle?.slice(0, 4).map((d, i) => (
                      <div key={i} style={{ marginBottom: 4, fontSize: 11.5, padding: '4px 8px', background: '#FEF3C7', borderRadius: 5 }}>
                        <strong>{d.estudiante}</strong>: {d.motivos?.[0]}
                        {' '}
                        <span style={{ color: d.whatsapp_estudiante?.enviado ? '#16A34A' : '#DC2626', fontSize: 10 }}>
                          {d.whatsapp_estudiante?.enviado ? '✓ Est.' : '✗ Est.'}
                        </span>
                        {' '}
                        <span style={{ color: d.whatsapp_tutor?.enviado ? '#16A34A' : '#DC2626', fontSize: 10 }}>
                          {d.whatsapp_tutor?.enviado ? '✓ Tutor' : '✗ Tutor'}
                        </span>
                      </div>
                    ))}
                    {alertasResultado.alertas_enviadas === 0 && (
                      <span style={{ color: '#059669', fontWeight: 700 }}>✅ ¡Todos los estudiantes están al día!</span>
                    )}
                  </div>
                  <button
                    onClick={() => setAlertasResultado(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B45309' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TARJETAS RESUMEN DE RENDIMIENTO ACADÉMICO */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9'
          }}>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Total Estudiantes</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{stats.total}</div>
            </div>

            <div style={{ background: '#ECFDF5', padding: '10px 14px', borderRadius: 8, border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: 11, color: '#065F46', fontWeight: 600 }}>Aprobados (&ge;51 pts)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', marginTop: 2 }}>
                {stats.aprobados} <span style={{ fontSize: 12, fontWeight: 600 }}>({stats.total > 0 ? Math.round((stats.aprobados / stats.total) * 100) : 0}%)</span>
              </div>
            </div>

            <div style={{
              background: stats.enRiesgo.length > 0 ? '#FEF2F2' : '#F8FAFC',
              padding: '10px 14px', borderRadius: 8,
              border: stats.enRiesgo.length > 0 ? '1px solid #FCA5A5' : '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: 11, color: stats.enRiesgo.length > 0 ? '#B91C1C' : '#64748B', fontWeight: 700 }}>
                ⚠️ En Riesgo (&lt;51 pts)
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: stats.enRiesgo.length > 0 ? '#B91C1C' : '#475569', marginTop: 2 }}>
                {stats.enRiesgo.length}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Promedio / 100 pts</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginTop: 2 }}>{stats.promedio}</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Cumplimiento Tareas</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#6D28D9', marginTop: 2 }}>{stats.cumplimiento}%</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TABLA TIPO EXCEL: LISTA DE ESTUDIANTES Y CALIFICACIONES
          ══════════════════════════════════════════════════════════ */}
      {materiaActual && (
        <div style={{
          background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden'
        }}>
          {/* Sub-toolbar con Buscador y Filtros Rápidos */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid #E2E8F0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 10, background: '#FAFAFA'
          }}>
            {/* Buscador */}
            <div style={{ position: 'relative', width: 280 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                className="form-control"
                placeholder="Buscar estudiante o RUDE..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 12.5, height: 35, borderRadius: 6 }}
              />
            </div>

            {/* Filtros rápidos con contadores */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'todos', label: 'Todos', count: stats.total, color: '#64748B' },
                { id: 'riesgo', label: '⚠️ En Riesgo', count: stats.enRiesgo.length, color: '#DC2626' },
                { id: 'aprobado', label: '✅ Aprobados', count: stats.aprobados, color: '#059669' },
                { id: 'excelente', label: '⭐ Excelentes', count: stats.excelentes, color: '#D97706' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltroEstado(f.id)}
                  style={{
                    padding: '5px 10px', borderRadius: 6,
                    border: filtroEstado === f.id ? `1.5px solid ${f.color}` : '1px solid #CBD5E1',
                    background: filtroEstado === f.id ? '#FFFFFF' : '#F1F5F9',
                    color: filtroEstado === f.id ? f.color : '#475569',
                    fontSize: 12, fontWeight: filtroEstado === f.id ? 700 : 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{f.label}</span>
                  <span style={{
                    background: filtroEstado === f.id ? f.color : '#E2E8F0',
                    color: filtroEstado === f.id ? '#FFFFFF' : '#475569',
                    fontSize: 10.5, fontWeight: 700, padding: '1px 5px', borderRadius: 8
                  }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Calificaciones */}
          <div style={{ overflowX: 'auto', maxHeight: '650px', position: 'relative' }}>
            {estudiantesFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                <Search size={32} style={{ margin: '0 auto 8px', color: '#CBD5E1', display: 'block' }} />
                <p style={{ fontWeight: 600, fontSize: 14 }}>No se encontraron estudiantes para este filtro.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFiltroEstado('todos'); }} style={{ marginTop: 8 }}>
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 880 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ ...thStyle, width: 44 }}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left', minWidth: 200 }}>Estudiante</th>
                    <th style={{ ...thStyle, minWidth: 130 }}>Código RUDE</th>
                    <th style={{ ...thStyle, minWidth: 95 }}>Entregadas</th>
                    <th style={{ ...thStyle, minWidth: 95 }}>Pendientes</th>
                    <th style={{ ...thStyle, minWidth: 110 }}>Cumplimiento</th>
                    <th style={{ ...thStyle, minWidth: 115, background: '#EFF6FF', color: '#1E3A8A' }}>
                      Promedio (/100)
                    </th>
                    <th style={{ ...thStyle, minWidth: 105 }}>Estado</th>
                    
                    {/* Tareas del curso */}
                    {(estudiantesFiltrados[0]?.calificaciones || []).map((cal, idx) => (
                      <th
                        key={cal.tarea_id || idx}
                        style={{ ...thStyle, minWidth: 95, maxWidth: 130 }}
                        title={cal.tarea_titulo}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          T{idx + 1}: {cal.tarea_titulo}
                        </div>
                      </th>
                    ))}

                    <th style={{ ...thStyle, minWidth: 140, background: '#F1F5F9', textAlign: 'center' }}>
                      Reporte Académico
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {estudiantesFiltrados.map((est, idx) => {
                    const esRiesgo = est.en_riesgo;
                    const notaColor = est.promedio == null ? '#64748B' : (est.promedio >= 90 ? '#059669' : (est.promedio >= 51 ? '#1D4ED8' : '#DC2626'));
                    return (
                      <tr
                        key={est.estudiante_id}
                        style={{
                          background: esRiesgo ? '#FEF2F2' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                          borderBottom: '1px solid #E2E8F0',
                          transition: 'background 0.12s'
                        }}
                      >
                        {/* # */}
                        <td style={{ ...tdStyle, color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>

                        {/* Estudiante */}
                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: esRiesgo ? '#FCA5A5' : '#DBEAFE',
                              color: esRiesgo ? '#991B1B' : '#1E40AF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, flexShrink: 0
                            }}>
                              {est.nombre.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: esRiesgo ? '#991B1B' : '#0F172A' }}>
                                  {est.nombre}
                                </span>
                                {est.nivel_riesgo && est.nivel_riesgo !== 'BAJO' && (
                                  <span
                                    style={{
                                      fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                                      background: est.nivel_riesgo === 'ALTO' ? '#FEE2E2' : '#FEF3C7',
                                      color: est.nivel_riesgo === 'ALTO' ? '#991B1B' : '#92400E',
                                      border: `1px solid ${est.nivel_riesgo === 'ALTO' ? '#FCA5A5' : '#FDE68A'}`
                                    }}
                                    title={est.factores_riesgo?.join(' · ')}
                                  >
                                    {est.nivel_riesgo === 'ALTO' ? '🔴 ALTO RIESGO' : '🟠 RIESGO MEDIO'}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>
                                {est.email}
                              </div>
                              {est.factores_riesgo && est.factores_riesgo.length > 0 && (
                                <div style={{ fontSize: 10, color: '#B91C1C', fontWeight: 600, marginTop: 1 }}>
                                  ⚠️ {est.factores_riesgo[0]}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* RUDE */}
                        <td style={tdStyle}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 11.5, background: '#F1F5F9',
                            padding: '2px 7px', borderRadius: 4, color: '#334155', fontWeight: 600
                          }}>
                            {est.ru}
                          </span>
                        </td>

                        {/* Entregadas */}
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#059669' }}>
                          {est.tareas_entregadas}
                        </td>

                        {/* Pendientes */}
                        <td style={{ ...tdStyle, fontWeight: 700, color: est.tareas_pendientes > 0 ? '#DC2626' : '#059669' }}>
                          {est.tareas_pendientes}
                        </td>

                        {/* Cumplimiento */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <div style={{ width: 40, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                width: `${est.porcentaje_cumplimiento}%`, height: '100%',
                                background: est.porcentaje_cumplimiento >= 80 ? '#10B981' : (est.porcentaje_cumplimiento >= 50 ? '#3B82F6' : '#EF4444')
                              }} />
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                              {est.porcentaje_cumplimiento}%
                            </span>
                          </div>
                        </td>

                        {/* Promedio sobre 100 pts */}
                        <td style={{ ...tdStyle, background: '#F8FAFC' }}>
                          <span style={{
                            fontSize: 13.5, fontWeight: 800, color: notaColor,
                            display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            {est.promedio != null ? est.promedio : '—'}
                          </span>
                        </td>

                        {/* Estado */}
                        <td style={tdStyle}>
                          {estadoBadge(est.estado_academico)}
                        </td>

                        {/* Tareas evaluadas */}
                        {(est.calificaciones || []).map((cal, i) => (
                          <td key={i} style={tdStyle}>
                            {cal.nota != null ? (
                              <span style={{
                                fontWeight: 700, fontSize: 12,
                                color: cal.nota >= 90 ? '#059669' : (cal.nota >= 51 ? '#1D4ED8' : '#DC2626')
                              }}>
                                {cal.nota}
                              </span>
                            ) : (
                              estadoBadge(cal.estado)
                            )}
                          </td>
                        ))}

                        {/* Botón Mandar Reporte individual */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: 11, padding: '4px 10px',
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              borderRadius: 6,
                              borderColor: esRiesgo ? '#FCA5A5' : '#BFDBFE',
                              color: esRiesgo ? '#991B1B' : '#1E40AF',
                              background: esRiesgo ? '#FEE2E2' : '#EFF6FF',
                              fontWeight: 700
                            }}
                            onClick={() => setReportStudentTarget({
                              id: est.estudiante_id,
                              nombre_completo: est.nombre,
                              email: est.email,
                              matricula: est.ru,
                              tareas_entregadas: est.tareas_entregadas,
                              tareas_asignadas: est.total_tareas,
                              tareas_pendientes: est.tareas_pendientes,
                              porcentaje_cumplimiento: est.porcentaje_cumplimiento,
                              promedio: est.promedio || 0,
                              estado_academico: est.estado_academico,
                              riesgo_academico: esRiesgo
                            })}
                            title={esRiesgo ? 'Enviar notificación de alerta pedagógica y recuperación' : 'Enviar reporte de calificaciones'}
                          >
                            {esRiesgo ? <AlertTriangle size={11} color="#DC2626" /> : <Send size={11} />}
                            <span>{esRiesgo ? 'Notificar Riesgo' : 'Mandar Reporte'}</span>
                          </button>

                          {est.whatsapp_url && (
                            <button
                              className="btn btn-sm"
                              style={{
                                fontSize: 11, padding: '4px 8px', color: '#15803D',
                                background: '#DCFCE7', border: '1px solid #86EFAC',
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                marginLeft: 4, fontWeight: 700
                              }}
                              onClick={() => window.open(est.whatsapp_url, '_blank')}
                              title="Abrir WhatsApp con mensaje prearmado para el padre o tutor"
                            >
                              <span>💬 WA</span>
                            </button>
                          )}

                          {/* Botón para registrar/editar contacto del tutor */}
                          {(est.estudiante_id || est.id) && (
                            <button
                              className="btn btn-sm"
                              style={{
                                fontSize: 11, padding: '4px 8px', color: '#7C3AED',
                                background: '#F5F3FF', border: '1px solid #DDD6FE',
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                marginLeft: 4, fontWeight: 700
                              }}
                              onClick={() => setContactoTutorTarget({
                                estudianteId: est.estudiante_id || est.id,
                                nombre: est.nombre
                              })}
                              title="Registrar o editar número de tutor/padre para alertas automáticas"
                            >
                              <span>👨‍👧 Tutor</span>
                            </button>
                          )}

                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: 11, padding: '4px 8px', color: '#0284C7',
                              background: '#F0F9FF', border: '1px solid #BAE6FD',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              marginLeft: 4
                            }}
                            onClick={() => {
                              const stId = est.estudiante_id || est.id;
                              if (stId) window.open(`/api/v2/estudiantes/${stId}/boletin-pdf/`, '_blank');
                            }}
                            title="Descargar boletín individual del estudiante en PDF"
                          >
                            <FileText size={11} />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totales y Promedios del grupo */}
                <tfoot>
                  <tr style={{ background: '#EFF6FF', borderTop: '2px solid #BFDBFE' }}>
                    <td colSpan={2} style={{ ...tdStyle, textAlign: 'left', fontWeight: 800, color: '#1E40AF', fontSize: 12 }}>
                      PROMEDIO GENERAL DEL CURSO
                    </td>
                    <td style={tdStyle}></td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: '#059669' }}>
                      {Math.round(estudiantesFiltrados.reduce((a, e) => a + e.tareas_entregadas, 0) / estudiantesFiltrados.length || 0)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: '#DC2626' }}>
                      {Math.round(estudiantesFiltrados.reduce((a, e) => a + e.tareas_pendientes, 0) / estudiantesFiltrados.length || 0)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>
                      {Math.round(estudiantesFiltrados.reduce((a, e) => a + e.porcentaje_cumplimiento, 0) / estudiantesFiltrados.length || 0)}%
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, fontSize: 14, color: '#1E3A8A' }}>
                      {(() => {
                        const proms = estudiantesFiltrados.filter(e => e.promedio != null).map(e => e.promedio);
                        return proms.length > 0 ? (proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(1) : '—';
                      })()}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                        {estudiantesFiltrados.filter(e => e.en_riesgo).length} en riesgo
                      </span>
                    </td>
                    {(estudiantesFiltrados[0]?.calificaciones || []).map(cal => {
                      const notas = estudiantesFiltrados.map(e => e.calificaciones.find(c => c.tarea_id === cal.tarea_id)?.nota).filter(n => n != null);
                      const prom = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';
                      return (
                        <td key={cal.tarea_id} style={{ ...tdStyle, fontWeight: 700 }}>
                          {prom}
                        </td>
                      );
                    })}
                    <td style={tdStyle}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODALES DE ENVÍO DE REPORTES
          ══════════════════════════════════════════════════════════ */}

      {/* Modal 1: Reporte Individual a un Estudiante */}
      {reportStudentTarget && (
        <Modal
          open={true}
          onClose={() => setReportStudentTarget(null)}
          title={`📊 Reporte Académico — ${reportStudentTarget.nombre_completo}`}
        >
          <SendReportModal
            student={reportStudentTarget}
            course={cursoActual}
            onClose={() => setReportStudentTarget(null)}
            onSent={() => {
              setReportStudentTarget(null);
              setReportSuccessMsg(`Reporte académico emitido y notificado a ${reportStudentTarget.nombre_completo}.`);
            }}
          />
        </Modal>
      )}

      {/* Modal 2: Reporte Masivo a Todo el Curso */}
      {reportCourseTarget && (
        <Modal
          open={true}
          onClose={() => setReportCourseTarget(null)}
          title={`📢 Reporte General del Curso — ${reportCourseTarget.curso_nombre}`}
        >
          <SendReportModal
            course={{ id: reportCourseTarget.curso_id, grado: reportCourseTarget.grado, paralelo: reportCourseTarget.paralelo }}
            onClose={() => setReportCourseTarget(null)}
            onSent={() => {
              setReportCourseTarget(null);
              setReportSuccessMsg(`Reporte general emitido a todos los estudiantes de ${reportCourseTarget.curso_nombre}.`);
            }}
          />
        </Modal>
      )}

      {/* Modal 3: Reporte Específico a Estudiantes en Riesgo */}
      {reportRiskTarget && (
        <Modal
          open={true}
          onClose={() => setReportRiskTarget(null)}
          title={`🚨 Notificación de Riesgo Académico — ${reportRiskTarget.curso.curso_nombre}`}
        >
          <SendReportModal
            course={{ id: reportRiskTarget.curso.curso_id, grado: reportRiskTarget.curso.grado, paralelo: reportRiskTarget.curso.paralelo }}
            isRiskOnly={true}
            atRiskStudents={reportRiskTarget.atRiskStudents}
            onClose={() => setReportRiskTarget(null)}
            onSent={() => {
              setReportRiskTarget(null);
              setReportSuccessMsg(`Alerta pedagógica y plan de refuerzo enviado a los ${reportRiskTarget.atRiskStudents.length} estudiantes en riesgo de ${reportRiskTarget.curso.curso_nombre}.`);
            }}
          />
        </Modal>
      )}

      {/* Modal 4: Reporte Semanal Oficial a Padres */}
      {reporteSemanalData && (
        <Modal
          open={true}
          onClose={() => setReporteSemanalData(null)}
          title={`📊 Reporte Semanal Oficial — ${reporteSemanalData.curso?.nombre}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0F766E' }}>
                Período: {reporteSemanalData.periodo?.inicio} al {reporteSemanalData.periodo?.fin}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: '#134E4A', flexWrap: 'wrap' }}>
                <span>👥 <strong>{reporteSemanalData.estadisticas?.total_estudiantes}</strong> Estudiantes</span>
                <span>📋 <strong>{reporteSemanalData.estadisticas?.tareas_semana}</strong> Tareas en la semana</span>
                <span>📥 <strong>{reporteSemanalData.estadisticas?.entregas_semana}</strong> Entregas recibidas</span>
                <span>⚠️ <strong>{reporteSemanalData.estadisticas?.estudiantes_atencion_count}</strong> En alerta preventiva</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Mensaje Consolidado para Padres de Familia / Grupo Escolar:
              </label>
              <textarea
                readOnly
                rows={8}
                value={reporteSemanalData.resumen_texto}
                style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, lineHeight: 1.5, background: '#F8FAFC', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(reporteSemanalData.resumen_texto);
                  alert('¡Mensaje semanal copiado al portapapeles!');
                }}
              >
                📋 Copiar Texto
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setReporteSemanalData(null)}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => window.open(reporteSemanalData.whatsapp_url, '_blank')}
                  style={{ background: '#16A34A', color: '#FFFFFF', fontWeight: 700, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
                >
                  💬 Enviar por WhatsApp
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 5: Contacto del Tutor */}
      {contactoTutorTarget && (
        <ContactoTutorModal
          estudianteId={contactoTutorTarget.estudianteId}
          nombreEstudiante={contactoTutorTarget.nombre}
          onClose={() => setContactoTutorTarget(null)}
        />
      )}

    </div>
  );
}

const thStyle = {
  padding: '11px 12px', textAlign: 'center', fontWeight: 800,
  fontSize: 11, color: '#1E40AF', textTransform: 'uppercase',
  letterSpacing: '0.05em', whiteSpace: 'nowrap', borderRight: '1px solid #E2E8F0'
};

const tdStyle = {
  padding: '9px 12px', textAlign: 'center', verticalAlign: 'middle',
  borderRight: '1px solid #E2E8F0', fontSize: 12.5
};
