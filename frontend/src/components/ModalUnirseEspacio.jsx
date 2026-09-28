import React, { useState } from 'react';
import { X, KeyRound, CheckCircle, ArrowRight, Building, BookOpen, Users, User } from 'lucide-react';
import { invitacionAPI } from '../api';

/**
 * ModalUnirseEspacio - Componente para Estudiantes.
 * Permite introducir un codigo de invitacion, validarlo y confirmar la union.
 */
export default function ModalUnirseEspacio({ onClose, onSuccess }) {
  const [step, setStep] = useState('ingresar'); // 'ingresar' | 'confirmar' | 'exito'
  const [codigo, setCodigo] = useState('');
  const [espacioInfo, setEspacioInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleValidar = async (e) => {
    e.preventDefault();
    const codigoLimpio = codigo.trim().toUpperCase();
    if (!codigoLimpio) {
      setError('Ingresa el codigo de invitacion.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await invitacionAPI.validar(codigoLimpio);
      setEspacioInfo(data.espacio);
      setCodigo(codigoLimpio);
      setStep('confirmar');
    } catch (err) {
      setError(err.message || 'El codigo de invitacion no es valido.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async () => {
    setLoading(true);
    setError('');
    try {
      await invitacionAPI.unirse(codigo);
      setStep('exito');
      setTimeout(() => {
        onSuccess?.(espacioInfo);
      }, 2000);
    } catch (err) {
      setError(err.message || 'No fue posible procesar la invitacion. Intenta nuevamente.');
      setStep('confirmar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16,
        width: '100%', maxWidth: 460,
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #5B5FC7 100%)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <KeyRound size={22} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Unirme a un Espacio</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Ingresa el codigo que te compartio tu docente</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'white' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 28 }}>
          {/* ERROR */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '10px 14px',
              color: '#991B1B', fontSize: 13, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* STEP 1: INGRESAR CODIGO */}
          {step === 'ingresar' && (
            <form onSubmit={handleValidar}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Codigo de invitacion
                </label>
                <input
                  style={{
                    width: '100%', padding: '14px 16px',
                    border: '2px solid #E5E7EB', borderRadius: 10,
                    fontSize: 20, fontFamily: 'monospace', fontWeight: 700,
                    textAlign: 'center', letterSpacing: 4,
                    textTransform: 'uppercase',
                    outline: 'none', boxSizing: 'border-box',
                    color: '#1E3A8A',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#5B5FC7'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  placeholder="EDU-XXXX-YYYY"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                  Ejemplo: BD1-A82K-F3N7
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: 'linear-gradient(135deg, #1E3A8A 0%, #5B5FC7 100%)',
                  color: 'white', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Validando...' : (<><ArrowRight size={16} /> Validar codigo</>)}
              </button>
            </form>
          )}

          {/* STEP 2: CONFIRMAR */}
          {step === 'confirmar' && espacioInfo && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16, textAlign: 'center' }}>
                Confirmar ingreso al espacio
              </h3>

              <div style={{ background: '#F8FAFF', border: '2px solid #E0E7FF', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                {[
                  { icon: Building, label: 'Colegio', value: espacioInfo.colegio },
                  { icon: Users, label: 'Curso', value: espacioInfo.curso },
                  { icon: BookOpen, label: 'Materia', value: espacioInfo.materia },
                  { icon: User, label: 'Docente', value: espacioInfo.docente },
                ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #E0E7FF' }}>
                    <div style={{ width: 32, height: 32, background: '#EEF2FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color="#5B5FC7" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
                Deseas unirte a este espacio academico?
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setStep('ingresar'); setError(''); }}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 10,
                    border: '2px solid #E5E7EB', background: 'white',
                    color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={loading}
                  style={{
                    flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #1E3A8A 0%, #5B5FC7 100%)',
                    color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Procesando...' : (<><CheckCircle size={16} /> Confirmar y unirme</>)}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: EXITO */}
          {step === 'exito' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 72, height: 72,
                background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle size={36} color="#059669" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#059669', marginBottom: 8 }}>
                Te has unido correctamente
              </h2>
              {espacioInfo && (
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                  <strong>{espacioInfo.materia || espacioInfo.nombre}</strong>
                  {espacioInfo.curso && <><br />{espacioInfo.curso}</>}
                  {espacioInfo.colegio && <><br />{espacioInfo.colegio}</>}
                </div>
              )}
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
                El espacio ya aparece en "Mis Espacios"...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
