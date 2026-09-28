import { useState, useRef } from 'react';
import {
  User, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2,
  BookOpen, Award, TrendingUp, CheckSquare, Layers, ShieldAlert, X
} from 'lucide-react';
import { authAPI } from '../api';
import { EdusmartLogo, Modal } from '../components';

// ============================================================
// 1. PÁGINA PRINCIPAL / WELCOME LANDING (SECTION 5)
// ============================================================
export function LandingPage({ onGoToLogin, onGoToRegister }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
      {/* Top Navbar */}
      <nav style={{
        height: 64, background: '#0B192C', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px'
      }}>
        <EdusmartLogo size={36} />

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onGoToRegister}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            Crear cuenta
          </button>
          <button className="btn btn-primary btn-sm" onClick={onGoToLogin} style={{ background: '#0284C7' }}>
            Iniciar sesión <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero Container */}
      <div style={{
        flex: 1, maxWidth: 1240, margin: '0 auto', width: '100%',
        padding: '48px 32px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr',
        gap: 48, alignItems: 'center'
      }}>
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: 6, padding: '5px 12px', marginBottom: 20
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2563EB' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Espacio Personal Docente — Estudiante
            </span>
          </div>

          {/* Titles matching Section 5 */}
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#0F172A', lineHeight: 1.15, marginBottom: 16 }}>
            Gestión y Seguimiento de Tareas Académicas
          </h1>

          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, marginBottom: 28, maxWidth: 540 }}>
            Organiza tus actividades académicas, presenta tus tareas y conoce tu progreso en una plataforma diseñada exclusivamente para la interacción directa entre docente y estudiante.
          </p>

          {/* Academic Workflow Pills */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            marginBottom: 36, padding: '14px 18px', background: '#FFFFFF',
            borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.05)'
          }}>
            {['Docente Asigna', 'Estudiante Presenta', 'Revisión y Nota', 'Retroalimentación', 'Progreso Actualizado'].map((step, i, arr) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  backgroundColor: i === arr.length - 1 ? '#ECFDF5' : '#F0F9FF',
                  color: i === arr.length - 1 ? '#059669' : '#0284C7',
                  border: `1px solid ${i === arr.length - 1 ? '#A7F3D0' : '#BAE6FD'}`,
                  borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700
                }}>
                  {step}
                </span>
                {i < arr.length - 1 && <span style={{ color: '#CBD5E1', fontSize: 12 }}>→</span>}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 14 }}>
            <button className="btn btn-primary btn-lg" onClick={onGoToLogin} style={{ background: '#1E3A8A' }}>
              Iniciar sesión <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary btn-lg" onClick={onGoToRegister}>
              Crear cuenta
            </button>
          </div>
        </div>

        {/* Hero Illustration */}
        <div>
          <div style={{
            borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -10px rgba(15,23,42,0.18)', background: '#FFFFFF'
          }}>
            <img
              src="/images/hero_banner.jpg"
              alt="EDUSMART Seguimiento de Tareas y Progreso"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Micro Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 18 }}>
            {[
              { label: 'Ciclo Completo', value: '6 Etapas', color: '#0284C7' },
              { label: 'Interacción', value: 'Directa', color: '#10B981' },
              { label: 'Retroalimentación', value: 'Formativa', color: '#6366F1' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#FFFFFF', borderRadius: 8, padding: '12px 14px',
                textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 2. INICIO DE SESIÓN / LOGIN (SECTION 6)
// ============================================================
export function LoginPage({ onLoginSuccess, onGoToRegister, onGoToLanding }) {
  const [selectedRole, setSelectedRole] = useState('ESTUDIANTE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor complete su correo electrónico y contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email: email.trim(), password });
      onLoginSuccess(res);
    } catch (err) {
      setError(err.message || 'Credenciales inválidas. Verifique sus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role) => {
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ demo_role: role });
      onLoginSuccess(res);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con usuario demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#F8FAFC' }}>
      {/* Left Banner */}
      <div style={{
        background: '#0B192C', borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', color: '#FFFFFF', textAlign: 'center'
      }}>
        <div style={{ marginBottom: 24, cursor: 'pointer' }} onClick={onGoToLanding}>
          <EdusmartLogo size={48} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>
          Espacio Personal Académico
        </h2>
        <p style={{ fontSize: 13.5, color: '#94A3B8', maxWidth: 400, lineHeight: 1.5, marginBottom: 28 }}>
          Ingresa a tu cuenta para consultar tareas asignadas, presentar entregas y revisar calificaciones con retroalimentación.
        </p>

        <div style={{
          borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)',
          maxWidth: 440, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <img
            src="/images/auth_illustration.jpg"
            alt="Revisión y retroalimentación"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: '#64748B' }}>
          Interacción exclusiva Docente ↔ Estudiante
        </div>
      </div>

      {/* Right Login Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
              Iniciar sesión
            </h2>
            <p style={{ color: '#64748B', fontSize: 13.5 }}>
              Selecciona tu rol e ingresa tus credenciales académicas.
            </p>
          </div>

          {/* Role selector tab: DOCENTE / ESTUDIANTE (Section 6) */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
            background: '#F1F5F9', padding: 4, borderRadius: 8, marginBottom: 20
          }}>
            <button
              type="button"
              onClick={() => setSelectedRole('DOCENTE')}
              style={{
                padding: '9px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                background: selectedRole === 'DOCENTE' ? '#FFFFFF' : 'transparent',
                color: selectedRole === 'DOCENTE' ? '#1E3A8A' : '#64748B',
                boxShadow: selectedRole === 'DOCENTE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <BookOpen size={15} /> Docente
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('ESTUDIANTE')}
              style={{
                padding: '9px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                background: selectedRole === 'ESTUDIANTE' ? '#FFFFFF' : 'transparent',
                color: selectedRole === 'ESTUDIANTE' ? '#0284C7' : '#64748B',
                boxShadow: selectedRole === 'ESTUDIANTE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <User size={15} /> Estudiante
            </button>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px 14px', borderRadius: 6, fontSize: 13, marginBottom: 18 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Correo electrónico:</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email-input"
                  className="form-control"
                  type="email"
                  placeholder={selectedRole === 'DOCENTE' ? 'prof_juan@edusmart.edu' : 'carlos.gomez@edusmart.edu'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" htmlFor="pass-input" style={{ margin: 0 }}>Contraseña:</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{ fontSize: 12, color: '#0284C7', fontWeight: 600 }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="pass-input"
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              style={{ marginTop: 12, background: '#1E3A8A' }}
            >
              {loading ? 'Verificando...' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Link: Crear cuenta (Section 6) */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748B' }}>
            ¿No tienes una cuenta aún?{' '}
            <button
              onClick={onGoToRegister}
              style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'underline' }}
            >
              Crear una cuenta
            </button>
          </div>

          {/* Quick Demo Access Buttons (Docente / Estudiante) */}
          <div style={{
            marginTop: 28, padding: 16, background: '#FFFFFF',
            border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, textAlign: 'center' }}>
              Acceso Rápido de Prueba (Demo)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemo('docente')}
                disabled={loading}
                style={{ justifyContent: 'space-between', padding: '9px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={15} color="#1E3A8A" />
                  <span style={{ fontWeight: 700, color: '#1E3A8A' }}>Prof. Juan Pérez</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>— Rol Docente</span>
                </div>
                <ArrowRight size={13} color="#94A3B8" />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemo('estudiante')}
                disabled={loading}
                style={{ justifyContent: 'space-between', padding: '9px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={15} color="#0284C7" />
                  <span style={{ fontWeight: 700, color: '#0284C7' }}>Carlos Gómez</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>— Rol Estudiante</span>
                </div>
                <ArrowRight size={13} color="#94A3B8" />
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
              Contraseña demo: <code>password123</code>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal open={showForgotModal} onClose={() => setShowForgotModal(false)} title="Recuperación de Contraseña">
        <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 16 }}>
          Para restablecer tu contraseña, ingresa tu correo electrónico registrado y te enviaremos las instrucciones de recuperación.
        </p>
        <div className="form-group">
          <label className="form-label">Correo registrado:</label>
          <input className="form-control" type="email" placeholder="usuario@edusmart.edu" defaultValue={email} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setShowForgotModal(false)}>Cerrar</button>
          <button className="btn btn-primary" onClick={() => { alert('Se han enviado las instrucciones a tu correo.'); setShowForgotModal(false); }}>
            Enviar enlace
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// 3. REGISTRO DE USUARIO (SECTION 7)
// Campos: Nombre completo, Correo electrónico, Contraseña, Confirmar contraseña, Rol (Docente / Estudiante)
// NO existe administrador.
// ============================================================
export function RegisterPage({ onRegisterSuccess, onGoToLogin, onGoToLanding }) {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    confirm_password: '',
    rol: 'ESTUDIANTE',
    especialidad: 'Bases de Datos y Software',
    carrera_o_area: 'Ingeniería de Sistemas e Informática',
    codigo_docente: '',
  });
  const [carnetFile, setCarnetFile] = useState(null);
  const [carnetPreview, setCarnetPreview] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleCarnetChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarnetFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCarnetPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre_completo.trim()) { setError('El nombre completo es obligatorio.'); return; }
    if (!formData.email.trim()) { setError('El correo electrónico es obligatorio.'); return; }
    if (!formData.password || formData.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (formData.password !== formData.confirm_password) { setError('Las contraseñas no coinciden.'); return; }
    if (formData.rol === 'DOCENTE' && !carnetFile) {
      setError('Debes subir o escanear una foto de tu carnet institucional o documento de identidad para registrarte como Docente.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      if (carnetFile) fd.append('carnet_imagen', carnetFile);

      const getCsrf = () => document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrf() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      onRegisterSuccess(data);
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const isDocente = formData.rol === 'DOCENTE';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: isDocente ? 580 : 520, background: '#FFFFFF',
        border: '1px solid #E2E8F0', borderRadius: 14, padding: '36px 32px',
        boxShadow: '0 12px 32px -4px rgba(15,23,42,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-block', marginBottom: 12, cursor: 'pointer' }} onClick={onGoToLogin}>
            <EdusmartLogo size={42} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
            Crear cuenta en EDUSMART
          </h2>
          <p style={{ color: '#64748B', fontSize: 13.5, marginTop: 4 }}>
            Únete a la plataforma personal de seguimiento académico.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px 14px', borderRadius: 6, fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label">Selecciona tu rol académico:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, rol: 'DOCENTE' }))}
                style={{
                  padding: '14px 12px', borderRadius: 8,
                  border: isDocente ? '2px solid #1E3A8A' : '1px solid #CBD5E1',
                  background: isDocente ? '#EFF6FF' : '#FFFFFF',
                  color: isDocente ? '#1E3A8A' : '#475569',
                  fontWeight: 700, fontSize: 13.5,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                }}
              >
                <BookOpen size={20} />
                <span>Docente</span>
                <span style={{ fontSize: 10, fontWeight: 400, color: isDocente ? '#3B82F6' : '#94A3B8' }}>Requiere escanear carnet</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, rol: 'ESTUDIANTE' }))}
                style={{
                  padding: '14px 12px', borderRadius: 8,
                  border: !isDocente ? '2px solid #0284C7' : '1px solid #CBD5E1',
                  background: !isDocente ? '#F0F9FF' : '#FFFFFF',
                  color: !isDocente ? '#0284C7' : '#475569',
                  fontWeight: 700, fontSize: 13.5,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                }}
              >
                <User size={20} />
                <span>Estudiante</span>
                <span style={{ fontSize: 10, fontWeight: 400, color: !isDocente ? '#0284C7' : '#94A3B8' }}>Registro libre</span>
              </button>
            </div>
          </div>

          {/* ── Teacher verification block ── */}
          {isDocente && (
            <div style={{
              background: 'linear-gradient(135deg, #0F1E3D 0%, #1E3A8A 100%)',
              borderRadius: 10, padding: '16px 18px', marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ShieldAlert size={18} color="#FCD34D" />
                <span style={{ color: '#FCD34D', fontWeight: 700, fontSize: 13 }}>Verificación de Identidad Docente</span>
              </div>

              {/* Carnet / ID upload */}
              <div>
                <label style={{ color: '#CBD5E1', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Foto del Carnet Institucional / Documento de Identidad <span style={{ color: '#F87171' }}>*</span>
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${carnetFile ? '#34D399' : 'rgba(255,255,255,0.25)'}`,
                    borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: carnetFile ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
                    transition: 'all 0.2s'
                  }}
                >
                  {carnetPreview ? (
                    <>
                      <img src={carnetPreview} alt="Carnet" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }} />
                      <div>
                        <div style={{ color: '#34D399', fontSize: 12, fontWeight: 700 }}>✓ Carnet cargado</div>
                        <div style={{ color: '#94A3B8', fontSize: 11 }}>{carnetFile.name}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 44, height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={22} color="#94A3B8" />
                      </div>
                      <div>
                        <div style={{ color: '#CBD5E1', fontSize: 12, fontWeight: 600 }}>Subir foto del carnet</div>
                        <div style={{ color: '#64748B', fontSize: 11 }}>JPG o PNG — clic para seleccionar</div>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleCarnetChange}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nombre completo:</label>
            <input
              className="form-control"
              placeholder="Ej. Juan Pérez o Carlos Gómez"
              value={formData.nombre_completo}
              onChange={(e) => setFormData(p => ({ ...p, nombre_completo: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Correo electrónico:</label>
            <input
              type="email"
              className="form-control"
              placeholder="usuario@edusmart.edu"
              value={formData.email}
              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          {isDocente ? (
            <div className="form-group">
              <label className="form-label">Especialidad / Título Académico:</label>
              <input
                className="form-control"
                placeholder="Ej. Bases de Datos y Algorítmica"
                value={formData.especialidad}
                onChange={(e) => setFormData(p => ({ ...p, especialidad: e.target.value }))}
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Carrera o Área de Estudio:</label>
              <input
                className="form-control"
                placeholder="Ej. Ingeniería de Sistemas e Informática"
                value={formData.carrera_o_area}
                onChange={(e) => setFormData(p => ({ ...p, carrera_o_area: e.target.value }))}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Contraseña:</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-control"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar contraseña:</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-control"
                placeholder="Repetir contraseña"
                value={formData.confirm_password}
                onChange={(e) => setFormData(p => ({ ...p, confirm_password: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input type="checkbox" id="show-pass-reg" onChange={e => setShowPass(e.target.checked)} style={{ cursor: 'pointer' }} />
            <label htmlFor="show-pass-reg" style={{ fontSize: 12.5, color: '#64748B', cursor: 'pointer' }}>Mostrar contraseñas</label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ background: isDocente ? '#0F1E3D' : '#0284C7', border: 'none' }}
          >
            {loading ? 'Creando cuenta...' : isDocente ? '🔐 Crear cuenta Docente' : 'Crear mi cuenta'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748B' }}>
          ¿Ya tienes una cuenta registrada?{' '}
          <button
            onClick={onGoToLogin}
            style={{ color: '#1E3A8A', fontWeight: 700, textDecoration: 'underline' }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrapper export that switches between Landing, Login and Register
export function AuthManager({ onAuthSuccess }) {
  const [view, setView] = useState('login'); // 'login', 'register'

  if (view === 'landing') {
    return (
      <LandingPage
        onGoToLogin={() => setView('login')}
        onGoToRegister={() => setView('register')}
      />
    );
  }

  if (view === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={onAuthSuccess}
        onGoToLogin={() => setView('login')}
        onGoToLanding={() => setView('landing')}
      />
    );
  }

  return (
    <LoginPage
      onLoginSuccess={onAuthSuccess}
      onGoToRegister={() => setView('register')}
      onGoToLanding={() => setView('landing')}
    />
  );
}
