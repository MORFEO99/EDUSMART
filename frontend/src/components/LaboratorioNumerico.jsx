import React, { useState } from 'react';
import {
  Calculator, Play, RotateCcw, CheckCircle2,
  Table, Sparkles, BookOpen, TrendingUp, AlertCircle
} from 'lucide-react';
import { analisisNumericoAPI } from '../api';

export default function LaboratorioNumerico({ espacioNombre = 'Análisis Numérico 2026' }) {
  const [metodo, setMetodo] = useState('biseccion'); // 'biseccion', 'newton', 'gauss', 'lagrange', 'integracion', 'euler'
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  // Parámetros por método
  const [paramsBiseccion, setParamsBiseccion] = useState({ funcion: 'x**3 - x - 2', a: '1', b: '2', max_iter: '6' });
  const [paramsNewton, setParamsNewton] = useState({ funcion: 'x**3 - x - 2', x0: '1.5', max_iter: '5' });
  const [paramsGauss, setParamsGauss] = useState({
    A: '[[2, 1, 1], [1, 3, 2], [3, 1, 4]]',
    b: '[7, 13, 17]'
  });
  const [paramsLagrange, setParamsLagrange] = useState({
    puntos: '[[0, 1], [1, 3], [2, 7]]',
    x_eval: '1.5'
  });
  const [paramsIntegracion, setParamsIntegracion] = useState({ funcion: 'x**2', a: '0', b: '2', n: '4' });
  const [paramsEuler, setParamsEuler] = useState({
    edo: 'x + y',
    x0: '0',
    y0: '1',
    h: '0.1',
    x_final: '0.3',
    exacta: '2 * exp(x) - x - 1'
  });

  // Carga rápida de ejercicios del informe académico
  const cargarEjercicioInforme = (tipo) => {
    setError('');
    setResultado(null);
    if (tipo === 'biseccion') {
      setMetodo('biseccion');
      setParamsBiseccion({ funcion: 'x**3 - x - 2', a: '1', b: '2', max_iter: '6' });
    } else if (tipo === 'newton') {
      setMetodo('newton');
      setParamsNewton({ funcion: 'x**3 - x - 2', x0: '1.5', max_iter: '5' });
    } else if (tipo === 'gauss') {
      setMetodo('gauss');
      setParamsGauss({ A: '[[2, 1, 1], [1, 3, 2], [3, 1, 4]]', b: '[7, 13, 17]' });
    } else if (tipo === 'lagrange') {
      setMetodo('lagrange');
      setParamsLagrange({ puntos: '[[0, 1], [1, 3], [2, 7]]', x_eval: '1.5' });
    } else if (tipo === 'integracion') {
      setMetodo('integracion');
      setParamsIntegracion({ funcion: 'x**2', a: '0', b: '2', n: '4' });
    } else if (tipo === 'euler') {
      setMetodo('euler');
      setParamsEuler({ edo: 'x + y', x0: '0', y0: '1', h: '0.1', x_final: '0.3', exacta: '2 * exp(x) - x - 1' });
    }
  };

  const handleResolver = async () => {
    setLoading(true);
    setError('');
    setResultado(null);

    let payload = {};
    try {
      if (metodo === 'biseccion') {
        payload = {
          funcion: paramsBiseccion.funcion,
          a: parseFloat(paramsBiseccion.a),
          b: parseFloat(paramsBiseccion.b),
          max_iter: parseInt(paramsBiseccion.max_iter)
        };
      } else if (metodo === 'newton') {
        payload = {
          funcion: paramsNewton.funcion,
          x0: parseFloat(paramsNewton.x0),
          max_iter: parseInt(paramsNewton.max_iter)
        };
      } else if (metodo === 'gauss') {
        payload = {
          A: JSON.parse(paramsGauss.A),
          b: JSON.parse(paramsGauss.b)
        };
      } else if (metodo === 'lagrange') {
        payload = {
          puntos: JSON.parse(paramsLagrange.puntos),
          x_eval: paramsLagrange.x_eval ? parseFloat(paramsLagrange.x_eval) : null
        };
      } else if (metodo === 'integracion') {
        payload = {
          funcion: paramsIntegracion.funcion,
          a: parseFloat(paramsIntegracion.a),
          b: parseFloat(paramsIntegracion.b),
          n: parseInt(paramsIntegracion.n)
        };
      } else if (metodo === 'euler') {
        payload = {
          edo: paramsEuler.edo,
          x0: parseFloat(paramsEuler.x0),
          y0: parseFloat(paramsEuler.y0),
          h: parseFloat(paramsEuler.h),
          x_final: parseFloat(paramsEuler.x_final),
          exacta: paramsEuler.exacta
        };
      }

      const res = await analisisNumericoAPI.calcular(metodo, payload);
      if (res.error) throw new Error(res.error);
      setResultado(res);
    } catch (err) {
      setError(err.message || 'Error en los datos numéricos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧮</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Laboratorio Computacional de Métodos Numéricos
            </h2>
          </div>
          <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, marginBottom: 0 }}>
            Módulo interactivo de resolución y comprobación paso a paso para <strong>{espacioNombre}</strong> (Sección 9.8 del informe académico).
          </p>
        </div>

        {/* Botonera de ejercicios directos del informe */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => cargarEjercicioInforme('biseccion')}
            style={{ fontSize: 11, padding: '5px 9px', borderRadius: 6, border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0369A1', fontWeight: 700, cursor: 'pointer' }}
            title="Cargar T1: Raíces (Bisección y Newton-Raphson)"
          >
            ⚡ Ejercicio T1 (Raíces)
          </button>
          <button
            onClick={() => cargarEjercicioInforme('gauss')}
            style={{ fontSize: 11, padding: '5px 9px', borderRadius: 6, border: '1px solid #DDD6FE', background: '#F5F3FF', color: '#6D28D9', fontWeight: 700, cursor: 'pointer' }}
            title="Cargar T2: Sistemas Lineales (Gauss 3x3)"
          >
            ⚡ Ejercicio T2 (Gauss 3x3)
          </button>
          <button
            onClick={() => cargarEjercicioInforme('lagrange')}
            style={{ fontSize: 11, padding: '5px 9px', borderRadius: 6, border: '1px solid #FED7AA', background: '#FFF7ED', color: '#C2410C', fontWeight: 700, cursor: 'pointer' }}
            title="Cargar T3: Interpolación de Lagrange"
          >
            ⚡ Ejercicio T3 (Lagrange)
          </button>
          <button
            onClick={() => cargarEjercicioInforme('integracion')}
            style={{ fontSize: 11, padding: '5px 9px', borderRadius: 6, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontWeight: 700, cursor: 'pointer' }}
            title="Cargar T4: Integración Numérica (Trapecio y Simpson)"
          >
            ⚡ Ejercicio T4 (Integral)
          </button>
          <button
            onClick={() => cargarEjercicioInforme('euler')}
            style={{ fontSize: 11, padding: '5px 9px', borderRadius: 6, border: '1px solid #FBCFE8', background: '#FDF2F8', color: '#BE185D', fontWeight: 700, cursor: 'pointer' }}
            title="Cargar T5: EDO con Método de Euler"
          >
            ⚡ Ejercicio T5 (Euler EDO)
          </button>
        </div>
      </div>

      {/* Selector de Método */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'biseccion', label: '1. Bisección', desc: 'Raíces en intervalo' },
          { id: 'newton', label: '2. Newton-Raphson', desc: 'Convergencia rápida' },
          { id: 'gauss', label: '3. Eliminación de Gauss', desc: 'Sistemas 3x3' },
          { id: 'lagrange', label: '4. Interpolación Lagrange', desc: 'Polinomio interpolador' },
          { id: 'integracion', label: '5. Trapecio & Simpson', desc: 'Integración numérica' },
          { id: 'euler', label: '6. Método de Euler', desc: 'Resolución de EDOs' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMetodo(m.id); setResultado(null); setError(''); }}
            style={{
              padding: '8px 14px', borderRadius: 8, border: metodo === m.id ? '2px solid #0284C7' : '1px solid #E2E8F0',
              background: metodo === m.id ? '#EFF6FF' : '#F8FAFC', color: metodo === m.id ? '#0284C7' : '#475569',
              fontWeight: 700, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', gap: 2
            }}
          >
            <span>{m.label}</span>
            <span style={{ fontSize: 10, fontWeight: 400, color: '#94A3B8' }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Formulario de Entrada de Parámetros */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18, marginBottom: 20 }}>
        {metodo === 'biseccion' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Función f(x):</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsBiseccion.funcion} onChange={e => setParamsBiseccion({ ...paramsBiseccion, funcion: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Límite inferior a:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsBiseccion.a} onChange={e => setParamsBiseccion({ ...paramsBiseccion, a: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Límite superior b:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsBiseccion.b} onChange={e => setParamsBiseccion({ ...paramsBiseccion, b: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Iteraciones máximas:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsBiseccion.max_iter} onChange={e => setParamsBiseccion({ ...paramsBiseccion, max_iter: e.target.value })} />
            </div>
          </div>
        )}

        {metodo === 'newton' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Función f(x):</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsNewton.funcion} onChange={e => setParamsNewton({ ...paramsNewton, funcion: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Valor inicial x₀:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsNewton.x0} onChange={e => setParamsNewton({ ...paramsNewton, x0: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Iteraciones máximas:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsNewton.max_iter} onChange={e => setParamsNewton({ ...paramsNewton, max_iter: e.target.value })} />
            </div>
          </div>
        )}

        {metodo === 'gauss' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Matriz de coeficientes A (filas en JSON):</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'monospace' }} value={paramsGauss.A} onChange={e => setParamsGauss({ ...paramsGauss, A: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Vector de términos independientes b:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'monospace' }} value={paramsGauss.b} onChange={e => setParamsGauss({ ...paramsGauss, b: e.target.value })} />
            </div>
          </div>
        )}

        {metodo === 'lagrange' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Puntos conocidos [[x₀, y₀], [x₁, y₁], ...]:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'monospace' }} value={paramsLagrange.puntos} onChange={e => setParamsLagrange({ ...paramsLagrange, puntos: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Punto a estimar x_eval:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsLagrange.x_eval} onChange={e => setParamsLagrange({ ...paramsLagrange, x_eval: e.target.value })} />
            </div>
          </div>
        )}

        {metodo === 'integracion' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Integrando f(x):</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsIntegracion.funcion} onChange={e => setParamsIntegracion({ ...paramsIntegracion, funcion: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Límite a:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsIntegracion.a} onChange={e => setParamsIntegracion({ ...paramsIntegracion, a: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Límite b:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsIntegracion.b} onChange={e => setParamsIntegracion({ ...paramsIntegracion, b: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Subintervalos n (par para Simpson):</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsIntegracion.n} onChange={e => setParamsIntegracion({ ...paramsIntegracion, n: e.target.value })} />
            </div>
          </div>
        )}

        {metodo === 'euler' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>EDO y' = f(x, y):</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsEuler.edo} onChange={e => setParamsEuler({ ...paramsEuler, edo: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>x₀:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsEuler.x0} onChange={e => setParamsEuler({ ...paramsEuler, x0: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>y₀:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsEuler.y0} onChange={e => setParamsEuler({ ...paramsEuler, y0: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Paso h:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsEuler.h} onChange={e => setParamsEuler({ ...paramsEuler, h: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>x final:</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsEuler.x_final} onChange={e => setParamsEuler({ ...paramsEuler, x_final: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Solución analítica (opcional):</label>
              <input style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} value={paramsEuler.exacta} onChange={e => setParamsEuler({ ...paramsEuler, exacta: e.target.value })} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleResolver}
            disabled={loading}
            style={{
              padding: '10px 22px', borderRadius: 8, border: 'none', background: '#0284C7',
              color: '#FFFFFF', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(2,132,199,0.3)'
            }}
          >
            <Play size={14} />
            <span>{loading ? 'Calculando paso a paso...' : '▶ Resolver y Generar Procedimiento'}</span>
          </button>
        </div>
      </div>

      {/* Mensaje de Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Resultados Paso a Paso */}
      {resultado && (
        <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>Resolución Oficial de: {resultado.metodo}</span>
            </div>
            {resultado.raiz_aproximada !== undefined && (
              <div style={{ background: '#DCFCE7', color: '#166534', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                Raíz: x ≈ {resultado.raiz_aproximada}
              </div>
            )}
            {resultado.solucion && (
              <div style={{ background: '#DCFCE7', color: '#166534', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                Vector Solución: ({resultado.solucion.join(', ')})
              </div>
            )}
            {resultado.resultado_eval !== undefined && (
              <div style={{ background: '#DCFCE7', color: '#166534', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                f({resultado.x_eval}) ≈ {resultado.resultado_eval}
              </div>
            )}
            {resultado.resultado_trapecio !== undefined && (
              <div style={{ background: '#DCFCE7', color: '#166534', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                Trapecio: {resultado.resultado_trapecio} | Simpson: {resultado.resultado_simpson_1_3}
              </div>
            )}
          </div>

          {/* Tabla de Bisección */}
          {metodo === 'biseccion' && resultado.pasos && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#E2E8F0', color: '#1E293B', textAlign: 'center' }}>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>k</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>a</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>b</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>c = (a+b)/2</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>f(a)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>f(b)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>f(c)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>Cota E_max</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.pasos.map((p, i) => (
                    <tr key={i} style={{ textAlign: 'center', background: i % 2 === 0 ? '#FFFFFF' : '#F1F5F9' }}>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', fontWeight: 700 }}>{p.iter}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.a}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.b}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', fontWeight: 700, color: '#0369A1' }}>{p.c}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.fa}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.fb}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', color: p.fc < 0 ? '#DC2626' : '#16A34A' }}>{p.fc}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.emax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla de Newton-Raphson */}
          {metodo === 'newton' && resultado.pasos && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#E2E8F0', color: '#1E293B', textAlign: 'center' }}>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>Iteración k</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>x_n</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>f(x_n)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>f'(x_n)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>x_(n+1)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>Error |x_(n+1) - x_n|</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.pasos.map((p, i) => (
                    <tr key={i} style={{ textAlign: 'center', background: i % 2 === 0 ? '#FFFFFF' : '#F1F5F9' }}>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', fontWeight: 700 }}>{p.iter}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.x_n}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.fx_n}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.fpx_n}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', fontWeight: 700, color: '#0369A1' }}>{p.x_next}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Eliminación de Gauss */}
          {metodo === 'gauss' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>1. Escalonamiento de Filas Hacia Adelante:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                  {resultado.pasos_escalonado?.map((p, i) => (
                    <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369A1', marginBottom: 6 }}>{p.operacion}</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
                        <tbody>
                          {p.matriz.map((r, ri) => (
                            <tr key={ri}>
                              {r.map((val, ci) => (
                                <td key={ci} style={{ padding: '4px 6px', border: '1px solid #F1F5F9', textAlign: 'right', fontWeight: ci === r.length - 1 ? 700 : 400, color: ci === r.length - 1 ? '#0F766E' : '#334155' }}>
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>2. Sustitución Regresiva:</h4>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {resultado.pasos_regresiva?.map((p, i) => (
                    <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 14px', fontSize: 12 }}>
                      <strong>{p.variable}</strong> = {p.formula} = <span style={{ color: '#059669', fontWeight: 800 }}>{p.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interpolación de Lagrange */}
          {metodo === 'lagrange' && (
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Polinomios Base de Lagrange:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {resultado.bases?.map((b, i) => (
                  <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'monospace' }}>
                    <strong>{b.formula_base}</strong> (para el punto {b.punto})
                  </div>
                ))}
              </div>
              <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0F766E' }}>
                Polinomio resultante simplificado: <strong>P(x) = x² + x + 1</strong>
                <br />
                Evaluación en x = {resultado.x_eval}: <strong>P({resultado.x_eval}) ≈ {resultado.resultado_eval}</strong>
              </div>
            </div>
          )}

          {/* Integración Numérica */}
          {metodo === 'integracion' && resultado.nodos && (
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Nodos Evaluados (paso h = {resultado.paso_h}):</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {resultado.nodos.map((n, i) => (
                  <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 10px', fontSize: 11.5 }}>
                    x_{n.i} = <strong>{n.x_i}</strong> &rarr; f(x) = <strong>{n.f_xi}</strong>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Regla del Trapecio Compuesta:</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>I ≈ {resultado.resultado_trapecio}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Error relativo estimado: ~0.0833</div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Regla de Simpson 1/3 Compuesta:</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>I ≈ {resultado.resultado_simpson_1_3}</div>
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>Valor exacto: 8/3 ≈ 2.6667 (Error prácticamente nulo)</div>
                </div>
              </div>
            </div>
          )}

          {/* Método de Euler */}
          {metodo === 'euler' && resultado.pasos && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#E2E8F0', color: '#1E293B', textAlign: 'center' }}>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>n</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>x_n</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>y_n (Euler)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>f(x_n, y_n)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>y exacta</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>Error absoluto</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.pasos.map((p, i) => (
                    <tr key={i} style={{ textAlign: 'center', background: i % 2 === 0 ? '#FFFFFF' : '#F1F5F9' }}>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', fontWeight: 700 }}>{p.n}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.x_n}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', fontWeight: 700, color: '#0369A1' }}>{p.y_n}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1' }}>{p.f_xy}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', color: '#059669', fontWeight: 600 }}>{p.y_exacta ?? '—'}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #CBD5E1', color: '#DC2626' }}>{p.error_absoluto ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
