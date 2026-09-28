import React, { useState, useEffect } from 'react';
import { Copy, Share2, RefreshCw, XCircle, CheckCircle, Link2, Users, Loader } from 'lucide-react';
import { invitacionAPI } from '../api';

/**
 * PanelInvitacion - Componente para Docentes.
 * Muestra el codigo de invitacion activo para un espacio y permite regenerarlo/desactivarlo.
 */
export default function PanelInvitacion({ espacio }) {
  const [invitacion, setInvitacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accionando, setAccionando] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState('');
  const [duracion, setDuracion] = useState('0'); // 0 = sin limite, 24 = 1 dia, 168 = 7 dias

  const cargar = () => {
    setLoading(true);
    invitacionAPI.consultar(espacio.id)
      .then(setInvitacion)
      .catch(() => setError('Error al cargar el codigo de invitacion.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (espacio?.id) cargar();
  }, [espacio?.id]);

  const copiarCodigo = () => {
    if (!invitacion) return;
    const texto = `EDUSMART\n${invitacion.colegio || ''}\n${invitacion.curso || ''}\n${invitacion.materia || espacio.nombre}\n\nCodigo de acceso: ${invitacion.codigo}`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const compartir = () => {
    if (!invitacion) return;
    const texto = `Unete a mi espacio en EDUSMART.\n\nColegio: ${invitacion.colegio || ''}\nCurso: ${invitacion.curso || ''}\nMateria: ${invitacion.materia || espacio.nombre}\n\nCodigo de acceso:\n${invitacion.codigo}\n\nIngresa a EDUSMART y usa este codigo para unirte.`;
    if (navigator.share) {
      navigator.share({ title: 'EDUSMART - Invitacion', text: texto }).catch(() => {});
    } else {
      navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  const regenerar = async () => {
    if (!window.confirm('El codigo anterior quedara invalidado. Los estudiantes que ya estan inscritos permanecen. Continuar?')) return;
    setAccionando('regenerar');
    try {
      const data = await invitacionAPI.regenerar(espacio.id, duracion !== '0' ? duracion : null);
      setInvitacion(prev => ({ ...prev, ...data }));
    } catch {
      setError('Error al regenerar el codigo.');
    } finally {
      setAccionando('');
    }
  };

  const desactivar = async () => {
    if (!window.confirm('Desactivar este codigo hara que ningun estudiante pueda usarlo. Continuar?')) return;
    setAccionando('desactivar');
    try {
      await invitacionAPI.desactivar(espacio.id);
      setInvitacion(prev => ({ ...prev, estado: 'DESACTIVADO' }));
    } catch {
      setError('Error al desactivar el codigo.');
    } finally {
      setAccionando('');
    }
  };

  const esActivo = invitacion?.estado === 'ACTIVO';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0F1E3D 0%, #1E3A8A 100%)',
      borderRadius: 12,
      padding: 24,
      color: 'white',
      maxWidth: 480,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Link2 size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Invitar Estudiantes</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Codigo de acceso al espacio</div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.7 }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : invitacion ? (
        <>
          {/* Codigo */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            border: `2px solid ${esActivo ? 'rgba(52,211,153,0.5)' : 'rgba(239,68,68,0.5)'}`,
            borderRadius: 10,
            padding: '20px 24px',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Codigo de acceso
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 6,
              fontFamily: 'monospace',
              color: esActivo ? '#34D399' : '#9CA3AF',
              textDecoration: esActivo ? 'none' : 'line-through',
            }}>
              {invitacion.codigo}
            </div>
            {!esActivo && (
              <div style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>
                Codigo desactivado
              </div>
            )}
          </div>

          {/* Botones de accion */}
          {esActivo && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={copiarCodigo}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                  background: copiado ? '#10B981' : 'rgba(255,255,255,0.15)',
                  color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.2s',
                }}
              >
                {copiado ? <CheckCircle size={15} /> : <Copy size={15} />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={compartir}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Share2 size={15} /> Compartir
              </button>
            </div>
          )}

          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px 16px', borderRadius: 10, marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
              Expiración del nuevo código
            </label>
            <select
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              style={{
                width: '100%', padding: '8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', fontSize: 13, cursor: 'pointer'
              }}
            >
              <option value="0" style={{ color: '#000' }}>Sin límite (Siempre activo)</option>
              <option value="1" style={{ color: '#000' }}>1 Hora (Clase en vivo)</option>
              <option value="24" style={{ color: '#000' }}>24 Horas</option>
              <option value="168" style={{ color: '#000' }}>7 Días</option>
              <option value="720" style={{ color: '#000' }}>30 Días</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={regenerar}
              disabled={accionando === 'regenerar'}
              style={{
                flex: 1, padding: '9px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent', color: 'white',
                fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <RefreshCw size={13} /> {accionando === 'regenerar' ? '...' : 'Regenerar codigo'}
            </button>
            {esActivo && (
              <button
                onClick={desactivar}
                disabled={accionando === 'desactivar'}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.1)', color: '#FCA5A5',
                  fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <XCircle size={13} /> {accionando === 'desactivar' ? '...' : 'Desactivar'}
              </button>
            )}
          </div>

          <p style={{ fontSize: 11, opacity: 0.55, textAlign: 'center', marginTop: 14 }}>
            Comparte este codigo con tus estudiantes para que puedan unirse a este espacio.
          </p>
        </>
      ) : (
        <div style={{ textAlign: 'center', opacity: 0.7, fontSize: 13 }}>No hay codigo generado.</div>
      )}
    </div>
  );
}
