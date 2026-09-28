import { ArrowLeft } from 'lucide-react';
import { EdusmartLogo, Modal } from '../components';
import { useNavigate } from 'react-router-dom';

// ============================================================
// 2. PÁGINA BENEFICIO SALESIANO
// ============================================================
export default function BeneficioSalesiano() {
  const navigate = useNavigate();

  const goBack = () => navigate(-1);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: 800, background: '#FFFFFF', borderRadius: 14, padding: '48px 32px', boxShadow: '0 12px 32px -4px rgba(15,23,42,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <EdusmartLogo size={48} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 16 }}>Beneficio Salesiano</h1>
        </div>
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E3A8A', marginBottom: 12 }}>Razón y Pedagogía del Éxito</h2>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            Don Bosco buscaba que cada joven descubriera sus capacidades. En EDUSMART le mostramos al alumno exactamente cuántas tareas ha presentado y cuáles vencieron, enseñándole responsabilidad y auto‑evaluación sin juzgarlo.
          </p>
        </section>
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E3A8A', marginBottom: 12 }}>El Profesor como Guía Providente</h2>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            El docente, apoyado por la IA, envía material de refuerzo específico a quien lo necesita, representando el pilar del Amor/Amabilidad. La plataforma detecta la dificultad del estudiante y le brinda, al instante, contenido exclusivo para él.
          </p>
        </section>
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E3A8A', marginBottom: 12 }}>Ventajas para el alumno</h2>
          <ul style={{ paddingLeft: 20, color: '#475569', fontSize: 15, lineHeight: 1.6 }}>
            <li>Visibilidad clara de su progreso y tareas vencidas.</li>
            <li>Intervención temprana y personalizada del docente.</li>
            <li>Sentirse acompañado, no como un número más.</li>
            <li>Incremento del compromiso y la motivación.</li>
          </ul>
        </section>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={goBack}
            style={{ background: '#1E3A8A', color: '#FFFFFF', padding: '12px 24px', borderRadius: 8, border: 'none', fontSize: 15, fontWeight: 600 }}
          >
            <ArrowLeft size={16} style={{ marginRight: 6 }} /> Volver
          </button>
        </div>
      </div>
    </div>
  );
}
