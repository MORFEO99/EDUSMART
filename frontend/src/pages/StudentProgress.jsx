import { useState, useEffect } from 'react';
import {
  TrendingUp, Award, Clock, AlertTriangle, BookOpen, CheckCircle, BarChart2,
  Calculator, Sparkles, Target, Compass, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { studentAPI, analisisNumericoAPI } from '../api';
import { Loading, DonutChart, MiniBarChart, LineChart, ProgressBar } from '../components';
import { getNoteColor } from '../utils';

export default function StudentProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simuladorObjetivo, setSimuladorObjetivo] = useState(70);
  const [simResultado, setSimResultado] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    studentAPI.progress().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Calculando indicadores de progreso académico..." />;
  if (!data) return null;

  const { metricas_generales: m, materias, evolucion_calificaciones, resumen_texto, analisis_numerico } = data;
  const reg = analisis_numerico?.regresion;
  const irec = analisis_numerico?.irec_trapecio;
  const meta = analisis_numerico?.simulacion_meta;
  const newton = analisis_numerico?.nivelacion_newton;
  const extrapolacion = analisis_numerico?.extrapolacion;

  const handleSimularMeta = async (notaObj) => {
    setSimuladorObjetivo(notaObj);
    if (!evolucion_calificaciones || evolucion_calificaciones.length === 0) return;
    setSimLoading(true);
    try {
      const notasList = evolucion_calificaciones.map(c => Number(c.nota));
      const pesoPorTarea = 100 / (notasList.length + Math.max(1, m.tareas_pendientes));
      const factorNorm = 100 / ((notasList.length * pesoPorTarea) + (m.tareas_pendientes * pesoPorTarea));
      const payload = {
        evaluaciones_completadas: notasList.map(n => ({ nota: n, peso: pesoPorTarea * factorNorm })),
        peso_pendiente: m.tareas_pendientes * pesoPorTarea * factorNorm,
        nota_objetivo: notaObj
      };
      const res = await analisisNumericoAPI.simularMeta(payload);
      setSimResultado(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  const donutData = [
    { label: 'Entregadas', value: m.tareas_completadas, color: '#107C41' },
    { label: 'Pendientes', value: m.tareas_pendientes, color: '#CA5010' },
    { label: 'Vencidas', value: m.tareas_vencidas, color: '#A80000' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
          Mi Progreso Académico
        </h2>
        <p style={{ color: '#616161', fontSize: '12.5px' }}>{resumen_texto}</p>
      </div>

      {/* Overview stat cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-icon blue"><TrendingUp size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.promedio_general}</div>
            <div className="stat-card-label">Promedio General</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><CheckCircle size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.porcentaje_entregadas}%</div>
            <div className="stat-card-label">Tareas Entregadas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon yellow"><Clock size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.tareas_pendientes}</div>
            <div className="stat-card-label">Tareas Pendientes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><AlertTriangle size={20} /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{m.tareas_vencidas}</div>
            <div className="stat-card-label">Tareas Vencidas</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart2 size={16} /> Distribución de tareas</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <DonutChart
              value={m.tareas_completadas}
              max={Math.max(m.tareas_completadas + m.tareas_pendientes + m.tareas_vencidas, 1)}
              color="#107C41"
              size={110}
              strokeWidth={12}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {donutData.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '2px', background: d.color }} />
                  <div>
                    <div style={{ fontSize: '11.5px', color: '#616161' }}>{d.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#242424' }}>{d.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grade Evolution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><TrendingUp size={16} /> Histórico de calificaciones</span>
          </div>
          <div className="card-body">
            {evolucion_calificaciones?.length > 0 ? (
              <div>
                <LineChart
                  data={evolucion_calificaciones.map(c => ({ value: c.nota, label: c.fecha }))}
                  width={340}
                  height={90}
                  color="#5B5FC7"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  {evolucion_calificaciones.slice(-5).map((c, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: getNoteColor(c.nota), fontSize: '13px' }}>{c.nota}</div>
                      <div style={{ fontSize: '10.5px', color: '#8A8886' }}>{c.fecha}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#8A8886', textAlign: 'center', padding: '24px 0', fontSize: '12.5px' }}>
                Aún no tienes calificaciones registradas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── SECCIÓN DE ANÁLISIS NUMÉRICO Y PROYECCIÓN MATEMÁTICA ── */}
      {reg?.valido && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #BAE6FD', background: '#F8FAFC' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0369A1' }}>
              <Calculator size={16} /> Análisis Numérico del Rendimiento Académico
            </span>
            <span style={{ fontSize: 11, background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              Mínimos Cuadrados & Trapecio IREC
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
              {/* Recta de regresión */}
              <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <TrendingUp size={13} color="#0284C7" /> MODELO DE AJUSTE LINEAL
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 4, fontFamily: 'monospace' }}>
                  {reg.ecuacion_recta}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  Coeficiente de determinación: <strong>R² = {reg.coeficiente_determinacion_r2}</strong>
                </div>
              </div>

              {/* Tendencia y Diagnóstico */}
              <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {reg.pendiente_b >= 0 ? <ArrowUpRight size={13} color="#16A34A" /> : <ArrowDownRight size={13} color="#DC2626" />}
                  TENDENCIA ACADÉMICA
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4,
                  fontSize: 13, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  background: reg.pendiente_b >= 0 ? '#DCFCE7' : '#FEE2E2',
                  color: reg.pendiente_b >= 0 ? '#15803D' : '#B91C1C'
                }}>
                  {reg.tendencia} (Pendiente: {reg.pendiente_b > 0 ? `+${reg.pendiente_b}` : reg.pendiente_b} pts/tarea)
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                  {reg.diagnostico}
                </div>
              </div>

              {/* Proyección Próxima Evaluación */}
              <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={13} color="#7C3AED" /> PROYECCIÓN PRÓXIMA TAREA
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: getNoteColor(reg.proyeccion_estimada), marginTop: 2 }}>
                  ~ {reg.proyeccion_estimada} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>/ 100</span>
                </div>
                <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2 }}>
                  * Estimación matemática basada en la dinámica observada.
                </div>
              </div>

              {/* IREC - Área bajo la curva de rendimiento */}
              {irec?.valido && (
                <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Activity size={13} color="#D97706" /> ESFUERZO CONTINUO (IREC)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#D97706', marginTop: 2 }}>
                    {irec.rendimiento_medio_continuo} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>pts continuos</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    Área bajo la curva: <strong>{irec.area_total_acumulada}</strong> ({irec.tiempo_total_semanas} etapas integradas con Trapecio)
                  </div>
                </div>
              )}
            </div>

            {/* Simulador Interactivo de Metas */}
            <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} color="#0284C7" /> Simulador de Nota Requerida en Tareas Pendientes
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[51, 70, 85].map(target => (
                    <button
                      key={target}
                      className="btn btn-outline btn-sm"
                      style={{
                        fontSize: 11, padding: '3px 9px',
                        background: simuladorObjetivo === target ? '#0284C7' : 'transparent',
                        color: simuladorObjetivo === target ? '#FFFFFF' : '#0284C7',
                        borderColor: '#0284C7'
                      }}
                      onClick={() => handleSimularMeta(target)}
                      disabled={simLoading}
                    >
                      Objetivo {target} pts
                    </button>
                  ))}
                </div>
              </div>

              {simResultado ? (
                <div style={{
                  padding: '8px 12px', borderRadius: 6, fontSize: 12,
                  background: simResultado.es_alcanzable ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${simResultado.es_alcanzable ? '#BBF7D0' : '#FECACA'}`,
                  color: simResultado.es_alcanzable ? '#166534' : '#991B1B'
                }}>
                  {simResultado.mensaje}
                  {simResultado.es_alcanzable && !simResultado.ya_aprobado && (
                    <span style={{ marginLeft: 8, fontWeight: 700 }}>
                      (Nota requerida en pendientes: {simResultado.nota_necesaria}/100)
                    </span>
                  )}
                </div>
              ) : meta ? (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155' }}>
                  {meta.mensaje}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Progress by subject */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><BookOpen size={16} /> Avance por Asignatura</span>
        </div>
        <div className="card-body">
          {materias?.length === 0 ? (
            <p style={{ color: '#8A8886', textAlign: 'center', padding: '24px 0', fontSize: '12.5px' }}>
              Sin asignaturas registradas.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {materias?.map((mat, i) => (
                <div key={i} style={{ borderBottom: i < materias.length - 1 ? '1px solid #EDEBE9' : 'none', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#242424', fontSize: '13.5px' }}>{mat.materia}</span>
                      <span style={{ marginLeft: 8, fontSize: '11.5px', color: '#8A8886' }}>({mat.codigo})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: '12px', color: '#616161' }}>{mat.tareas_entregadas} de {mat.tareas_totales} entregadas</span>
                      {mat.promedio > 0 && (
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: getNoteColor(mat.promedio) }}>
                          {mat.promedio}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <ProgressBar value={mat.porcentaje_cumplimiento} color={mat.promedio >= 85 ? 'success' : mat.promedio >= 60 ? 'primary' : 'warning'} height={8} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '11px', color: '#8A8886' }}>
                    <span>Cumplimiento: {mat.porcentaje_cumplimiento}%</span>
                    <span style={{ color: mat.tareas_pendientes > 0 ? '#CA5010' : '#107C41', fontWeight: 600 }}>
                      {mat.tareas_pendientes} pendiente(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
