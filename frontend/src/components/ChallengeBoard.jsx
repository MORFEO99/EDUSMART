import { useState, useEffect, useRef } from 'react';
import {
  Target, Star, Gift, CheckCircle, Plus, Trash2, BookOpen, X,
  Upload, Sparkles, FileText, AlertCircle, RefreshCw, Zap,
  TrendingUp, Award, Layers, Clock, Check, ChevronRight
} from 'lucide-react';
import { gamificationAPI, espaciosAPI } from '../api';

// ─────────────────────────────────────────────────────────────
// MOTOR DE IA — GENERA RETOS SEGÚN AVANCE DE LA MATERIA
// ─────────────────────────────────────────────────────────────
function generateAIRetosFromCurriculum(materiaNombre, cursoNombre, topicName, tareas = []) {
  const materia = (materiaNombre || 'la Asignatura').trim();
  const curso = (cursoNombre || 'el Curso').trim();
  const rawTopic = (topicName || (tareas.length > 0 ? tareas[0].titulo : '') || 'Contenido de la Unidad').trim();
  const cleanTopic = rawTopic.replace(/[_-]/g, ' ');
  const mLower = materia.toLowerCase();

  // Generador contextual especializado por área del conocimiento
  if (mLower.includes('matemát') || mLower.includes('algebra') || mLower.includes('cálculo') || mLower.includes('geometría') || mLower.includes('estadística')) {
    return [
      {
        titulo: `➗ Maratón de Ejercicios: "${cleanTopic}"`,
        descripcion: `Resuelve y documenta el desarrollo paso a paso de 5 ejercicios prácticos sobre "${cleanTopic}". Demuestra el dominio de los métodos y fórmulas explicados en clase.`,
        tipo: 'TAREAS',
        recompensa_puntos: 35,
        recompensa_coins: 20,
        meta: 5,
      },
      {
        titulo: `🧠 Razonamiento y Demostración en ${materia}`,
        descripcion: `Elabora una demostración o resolución de un problema de aplicación real fundamentado en "${cleanTopic}". Incluye verificación de resultados y conclusión lógica.`,
        tipo: 'TAREAS',
        recompensa_puntos: 30,
        recompensa_coins: 15,
        meta: 1,
      },
      {
        titulo: `⚡ Racha de Calificaciones: "${cleanTopic}"`,
        descripcion: `Entrega con puntualidad y obtén una calificación de 85 o superior en las tareas evaluadas de la unidad de "${cleanTopic}".`,
        tipo: 'PUNTAJE',
        recompensa_puntos: 45,
        recompensa_coins: 25,
        meta: 2,
      },
      {
        titulo: `🤝 Tutoría Matemática Entre Pares`,
        descripcion: `Participa colaborativamente en la clase de ${materia} explicando la resolución de un ejercicio complejo de "${cleanTopic}" a tus compañeros.`,
        tipo: 'ASISTENCIA',
        recompensa_puntos: 25,
        recompensa_coins: 15,
        meta: 1,
      },
    ];
  }

  if (mLower.includes('física') || mLower.includes('química') || mLower.includes('biología') || mLower.includes('ciencias') || mLower.includes('natural')) {
    return [
      {
        titulo: `🔬 Práctica Experimental: "${cleanTopic}"`,
        descripcion: `Diseña y reporta un experimento o simulación práctica para comprobar los principios de "${cleanTopic}". Presenta hipótesis, variables, datos y conclusiones analíticas.`,
        tipo: 'TAREAS',
        recompensa_puntos: 40,
        recompensa_coins: 25,
        meta: 1,
      },
      {
        titulo: `🌍 Caso de Aplicación Real en ${materia}`,
        descripcion: `Investiga y redacta un informe de 2 páginas sobre cómo se aplica "${cleanTopic}" en la tecnología moderna, la industria o la conservación ambiental.`,
        tipo: 'TAREAS',
        recompensa_puntos: 30,
        recompensa_coins: 18,
        meta: 1,
      },
      {
        titulo: `📊 Análisis de Modelos y Gráficos`,
        descripcion: `Construye y analiza los gráficos representativos del fenómeno estudiado en "${cleanTopic}". Explica el comportamiento de las magnitudes físicas/químicas.`,
        tipo: 'TAREAS',
        recompensa_puntos: 25,
        recompensa_coins: 15,
        meta: 2,
      },
      {
        titulo: `🏆 Medalla de Excelencia Científica: ${materia}`,
        descripcion: `Completa todas las actividades de laboratorio y evaluaciones de "${cleanTopic}" con rendimiento sobresaliente.`,
        tipo: 'PUNTAJE',
        recompensa_puntos: 50,
        recompensa_coins: 30,
        meta: 2,
      },
    ];
  }

  if (mLower.includes('lengua') || mLower.includes('literatura') || mLower.includes('español') || mLower.includes('inglés') || mLower.includes('idioma') || mLower.includes('comunicación')) {
    return [
      {
        titulo: `📖 Análisis Crítico y Textual: "${cleanTopic}"`,
        descripcion: `Realiza una lectura analítica profunda del texto o tema asignado en "${cleanTopic}". Redacta un ensayo argumentativo de 400 palabras justificando tu postura con citas.`,
        tipo: 'TAREAS',
        recompensa_puntos: 35,
        recompensa_coins: 20,
        meta: 1,
      },
      {
        titulo: `🗣️ Oratoria y Debate Argumentativo`,
        descripcion: `Participa activamente en el debate o exposición oral sobre "${cleanTopic}". Defiende 3 argumentos fundamentados respetando el turno de palabra de tus compañeros.`,
        tipo: 'ASISTENCIA',
        recompensa_puntos: 25,
        recompensa_coins: 15,
        meta: 2,
      },
      {
        titulo: `✍️ Taller de Producción Escrita Creativa`,
        descripcion: `Escribe una composición inédita (crónica, relato o artículo de opinión) aplicando la estructura gramatical y figuras retóricas de "${cleanTopic}".`,
        tipo: 'TAREAS',
        recompensa_puntos: 30,
        recompensa_coins: 18,
        meta: 1,
      },
      {
        titulo: `📚 Lector Destacado de ${materia}`,
        descripcion: `Completa las lecturas complementarias y cuestionarios de comprensión sobre "${cleanTopic}" con puntaje perfecto.`,
        tipo: 'PUNTAJE',
        recompensa_puntos: 40,
        recompensa_coins: 25,
        meta: 3,
      },
    ];
  }

  if (mLower.includes('historia') || mLower.includes('social') || mLower.includes('filosofía') || mLower.includes('ciudadanía') || mLower.includes('geografía')) {
    return [
      {
        titulo: `🕰️ Cronología Crítica: "${cleanTopic}"`,
        descripcion: `Construye una línea de tiempo analítica destacando causas, acontecimientos centrales y repercusiones históricas/sociales vinculadas a "${cleanTopic}".`,
        tipo: 'TAREAS',
        recompensa_puntos: 30,
        recompensa_coins: 18,
        meta: 1,
      },
      {
        titulo: `🏛️ Contrastación de Fuentes Históricas`,
        descripcion: `Examina 2 fuentes primarias o documentos históricos sobre "${cleanTopic}", identificando puntos de vista contrastantes, contexto social y vigencia actual.`,
        tipo: 'TAREAS',
        recompensa_puntos: 35,
        recompensa_coins: 20,
        meta: 1,
      },
      {
        titulo: `🗣️ Plenaria y Mesa Redonda en ${materia}`,
        descripcion: `Participa en la simulación o mesa redonda del aula asumiendo una postura informada y fundamentada sobre el período de "${cleanTopic}".`,
        tipo: 'ASISTENCIA',
        recompensa_puntos: 25,
        recompensa_coins: 15,
        meta: 1,
      },
      {
        titulo: `🏅 Investigador Histórico Destacado`,
        descripcion: `Entrega el informe de investigación final de "${cleanTopic}" con bibliografía en formato académico formal y redacción impecable.`,
        tipo: 'PUNTAJE',
        recompensa_puntos: 45,
        recompensa_coins: 28,
        meta: 1,
      },
    ];
  }

  if (mLower.includes('informát') || mLower.includes('program') || mLower.includes('sistema') || mLower.includes('comput') || mLower.includes('tecnolog') || mLower.includes('web') || mLower.includes('dato')) {
    return [
      {
        titulo: `💻 Desafío de Código y Algoritmos: "${cleanTopic}"`,
        descripcion: `Implementa y sube la solución funcional en código para resolver el problema de "${cleanTopic}". Tu código debe estar limpio, modular y documentado.`,
        tipo: 'TAREAS',
        recompensa_puntos: 40,
        recompensa_coins: 25,
        meta: 1,
      },
      {
        titulo: `🚀 Mini-Proyecto Práctico de ${materia}`,
        descripcion: `Desarrolla un prototipo funcional que aplique los conceptos de "${cleanTopic}" en una solución informática real para el aula o comunidad.`,
        tipo: 'TAREAS',
        recompensa_puntos: 50,
        recompensa_coins: 35,
        meta: 1,
      },
      {
        titulo: `🐛 Caza de Bugs y Optimización`,
        descripcion: `Depura, optimiza y realiza pruebas unitarias sobre los ejercicios de "${cleanTopic}" demostrando eficiencia en memoria y ejecución.`,
        tipo: 'TAREAS',
        recompensa_puntos: 30,
        recompensa_coins: 20,
        meta: 3,
      },
      {
        titulo: `⚡ Master Developer de ${curso}`,
        descripcion: `Completa todas las entregas de código del tema "${cleanTopic}" antes del plazo límite con 100% de cumplimiento.`,
        tipo: 'PUNTAJE',
        recompensa_puntos: 45,
        recompensa_coins: 30,
        meta: 2,
      },
    ];
  }

  // Plantilla general para cualquier otra materia
  return [
    {
      titulo: `🎯 Dominio Temático: "${cleanTopic}"`,
      descripcion: `Demuestra comprensión total de "${cleanTopic}" en ${materia} entregando puntualmente las actividades planificadas con calidad sobresaliente.`,
      tipo: 'TAREAS',
      recompensa_puntos: 30,
      recompensa_coins: 20,
      meta: 2,
    },
    {
      titulo: `🗺️ Síntesis Conceptual de "${cleanTopic}"`,
      descripcion: `Diseña un mapa mental o infografía explicativa que sintetice las ideas centrales y aplicaciones prácticas aprendidas en esta etapa de ${materia}.`,
      tipo: 'TAREAS',
      recompensa_puntos: 25,
      recompensa_coins: 15,
      meta: 1,
    },
    {
      titulo: `💡 Proyecto Aplicado de Aprendizaje`,
      descripcion: `Elabora una propuesta creativa o resolución de caso que ponga en práctica el avance curricular de "${cleanTopic}".`,
      tipo: 'TAREAS',
      recompensa_puntos: 35,
      recompensa_coins: 22,
      meta: 1,
    },
    {
      titulo: `🏅 Insignia de Excelencia en ${materia}`,
      descripcion: `Alcanza un promedio de 90 o superior en las actividades correspondientes al tema "${cleanTopic}".`,
      tipo: 'PUNTAJE',
      recompensa_puntos: 45,
      recompensa_coins: 30,
      meta: 1,
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// MOTOR DE IA — GENERA RETOS SEGÚN DOCUMENTO SUBIDO
// ─────────────────────────────────────────────────────────────
function generateAIRetosFromDoc(fileName, fileContent, materiaNombre = '') {
  const topic = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const materia = materiaNombre ? ` de ${materiaNombre}` : '';

  return [
    {
      titulo: `📚 Comprensión del Documento: "${topic}"`,
      descripcion: `Estudia en detalle el documento adjunto "${fileName}"${materia} y responde el cuestionario de comprensión lectora, demostrando dominio de los conceptos clave.`,
      tipo: 'TAREAS',
      recompensa_puntos: 25,
      recompensa_coins: 15,
      meta: 1,
    },
    {
      titulo: `🧠 Análisis Crítico e Ideas Clave: "${topic}"`,
      descripcion: `Basándote en el material "${fileName}", elabora un informe analítico identificando argumentos principales, metodología y tu posición fundamentada.`,
      tipo: 'TAREAS',
      recompensa_puntos: 30,
      recompensa_coins: 20,
      meta: 1,
    },
    {
      titulo: `✍️ Mapa Conceptual Estructurado de "${topic}"`,
      descripcion: `Construye un esquema o mapa conceptual con al menos 12 conceptos interconectados extraídos de la lectura del documento.`,
      tipo: 'TAREAS',
      recompensa_puntos: 25,
      recompensa_coins: 15,
      meta: 1,
    },
    {
      titulo: `🏆 Experto en "${topic}"`,
      descripcion: `Completa las actividades derivadas del documento con calificación máxima para desbloquear la insignia de especialista temático.`,
      tipo: 'PUNTAJE',
      recompensa_puntos: 50,
      recompensa_coins: 30,
      meta: 2,
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// FORMULARIO PARA CREAR RETO (MODAL PARA EL DOCENTE)
// ─────────────────────────────────────────────────────────────
function FormCrearReto({
  espacios = [],
  onCreated,
  onClose,
  defaultEspacioId = null,
  defaultEspacioNombre = '',
  defaultCursoNombre = '',
  tareas = []
}) {
  const [tab, setTab] = useState(defaultEspacioId ? 'ia_avance' : 'manual'); // 'ia_avance' | 'ia_doc' | 'manual'
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'TAREAS',
    espacio_id: defaultEspacioId ? String(defaultEspacioId) : '',
    recompensa_puntos: 30,
    recompensa_coins: 15,
    meta: 2,
    fecha_limite: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // IA Avance states
  const [temaAvance, setTemaAvance] = useState(tareas.length > 0 ? tareas[0].titulo : '');
  const [aiAvanceLoading, setAiAvanceLoading] = useState(false);
  const [aiAvanceDone, setAiAvanceDone] = useState(false);
  const [aiAvanceRetos, setAiAvanceRetos] = useState([]);
  const [selectedAvanceReto, setSelectedAvanceReto] = useState(null);

  // IA Doc states
  const [docFile, setDocFile] = useState(null);
  const [docText, setDocText] = useState('');
  const [aiDocLoading, setAiDocLoading] = useState(false);
  const [aiDocRetos, setAiDocRetos] = useState([]);
  const [aiDocDone, setAiDocDone] = useState(false);
  const [selectedDocReto, setSelectedDocReto] = useState(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStep, setAiStep] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const materiaDisplay = defaultEspacioNombre || espacios.find(e => String(e.id) === String(form.espacio_id))?.nombre || '';

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descripcion.trim()) {
      setError('El título y la descripción del reto son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      espacio_id: form.espacio_id ? parseInt(form.espacio_id) : (defaultEspacioId || null),
      recompensa_puntos: parseInt(form.recompensa_puntos) || 20,
      recompensa_coins: parseInt(form.recompensa_coins) || 10,
      meta: parseInt(form.meta) || 1,
      fecha_limite: form.fecha_limite || null,
    };

    gamificationAPI.createChallenge(payload)
      .then((reto) => { onCreated(reto); onClose(); })
      .catch(err => setError(err.message || 'Error al guardar el reto.'))
      .finally(() => setSaving(false));
  };

  // Run AI analysis for subject progress
  const runAIAvance = () => {
    const topic = temaAvance.trim() || materiaDisplay || 'Avance Curricular';
    setAiAvanceLoading(true);
    setAiAvanceDone(false);
    setSelectedAvanceReto(null);

    setTimeout(() => {
      const generated = generateAIRetosFromCurriculum(materiaDisplay, defaultCursoNombre, topic, tareas);
      setAiAvanceRetos(generated);
      setAiAvanceDone(true);
      setAiAvanceLoading(false);
    }, 700);
  };

  const applyAvanceReto = (r) => {
    setForm(f => ({
      ...f,
      titulo: r.titulo,
      descripcion: r.descripcion,
      tipo: r.tipo,
      recompensa_puntos: r.recompensa_puntos,
      recompensa_coins: r.recompensa_coins,
      meta: r.meta,
      espacio_id: defaultEspacioId ? String(defaultEspacioId) : f.espacio_id,
    }));
    setSelectedAvanceReto(r);
    setTab('manual');
  };

  // File handling for Doc AI
  const processFile = (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/markdown'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(file.type) && !['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      setError('Formato no permitido. Sube PDF, Word (.docx) o TXT.');
      return;
    }
    setDocFile(file);
    setAiDocDone(false);
    setAiDocRetos([]);
    setSelectedDocReto(null);
    const reader = new FileReader();
    reader.onload = (ev) => setDocText(ev.target.result || file.name);
    reader.readAsText(file);
  };

  const runAIDocAnalysis = () => {
    if (!docFile) { setError('Primero sube un documento.'); return; }
    setAiDocLoading(true);
    setAiDocDone(false);
    setAiProgress(0);
    setError(null);

    const steps = [
      { pct: 20, msg: `📄 Leyendo "${docFile.name}"...` },
      { pct: 45, msg: `🔍 Identificando conceptos clave de ${materiaDisplay || 'la materia'}...` },
      { pct: 75, msg: '🧠 Formulando retos de aprendizaje adaptativos con IA...' },
      { pct: 100, msg: '✨ ¡Retos listos para publicar!' },
    ];

    let i = 0;
    const tick = setInterval(() => {
      if (i < steps.length) {
        setAiProgress(steps[i].pct);
        setAiStep(steps[i].msg);
        i++;
      } else {
        clearInterval(tick);
        const generated = generateAIRetosFromDoc(docFile.name, docText, materiaDisplay);
        setAiDocRetos(generated);
        setAiDocDone(true);
        setAiDocLoading(false);
      }
    }, 550);
  };

  const applyDocReto = (r) => {
    setForm(f => ({
      ...f,
      titulo: r.titulo,
      descripcion: r.descripcion,
      tipo: r.tipo,
      recompensa_puntos: r.recompensa_puntos,
      recompensa_coins: r.recompensa_coins,
      meta: r.meta,
      espacio_id: defaultEspacioId ? String(defaultEspacioId) : f.espacio_id,
    }));
    setSelectedDocReto(r);
    setTab('manual');
  };

  const INPUT_STYLE = {
    width: '100%', padding: '0.6rem 0.8rem',
    border: '1.5px solid #E2E8F0', borderRadius: '0.5rem',
    fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF',
    color: '#0F172A',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(3px)' }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '1rem', width: '100%',
        maxWidth: '620px', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid #E2E8F0'
      }}>

        {/* ── Modal Header ── */}
        <div style={{ padding: '1.25rem 1.6rem 0.8rem', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: '0.45rem', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', borderRadius: '0.5rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  Crear Reto Educativo con IA
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                  {defaultEspacioNombre
                    ? `Vinculado a: ${defaultEspacioNombre} ${defaultCursoNombre ? `(${defaultCursoNombre})` : ''}`
                    : 'Vincula retos a tus cursos y materias para motivar a tus estudiantes'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '0.2rem' }}>
              <X size={20} />
            </button>
          </div>

          {/* Context Badge if inside a specific space */}
          {defaultEspacioNombre && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#1E3A8A', marginBottom: 10
            }}>
              <BookOpen size={12} />
              <span>Materia: {defaultEspacioNombre}</span>
              {defaultCursoNombre && <span style={{ color: '#64748B', fontWeight: 400 }}>· {defaultCursoNombre}</span>}
            </div>
          )}

          {/* ── Tabs Navigation ── */}
          <div style={{ display: 'flex', gap: 6, background: '#F1F5F9', borderRadius: '0.6rem', padding: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setTab('ia_avance')}
              style={{
                flex: 1, padding: '0.45rem 0.6rem', border: 'none', borderRadius: '0.45rem',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: tab === 'ia_avance' ? '#FFFFFF' : 'transparent',
                color: tab === 'ia_avance' ? '#4F46E5' : '#64748B',
                boxShadow: tab === 'ia_avance' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Sparkles size={13} color="#4F46E5" /> Avance Materia (IA)
            </button>
            <button
              type="button"
              onClick={() => setTab('ia_doc')}
              style={{
                flex: 1, padding: '0.45rem 0.6rem', border: 'none', borderRadius: '0.45rem',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: tab === 'ia_doc' ? '#FFFFFF' : 'transparent',
                color: tab === 'ia_doc' ? '#4F46E5' : '#64748B',
                boxShadow: tab === 'ia_doc' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Upload size={13} color="#0284C7" /> Subir Documento
            </button>
            <button
              type="button"
              onClick={() => setTab('manual')}
              style={{
                flex: 1, padding: '0.45rem 0.6rem', border: 'none', borderRadius: '0.45rem',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: tab === 'manual' ? '#FFFFFF' : 'transparent',
                color: tab === 'manual' ? '#0F172A' : '#64748B',
                boxShadow: tab === 'manual' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              ✏️ Personalizado
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div style={{ padding: '1.2rem 1.6rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* ════════════════ TAB: IA AVANCE CURRICULAR ════════════════ */}
          {tab === 'ia_avance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: 10, background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', border: '1px solid #C7D2FE', borderRadius: '0.75rem', padding: '0.85rem 1rem' }}>
                <Sparkles size={20} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#4338CA' }}>
                    Generador de Retos según el Avance de la Materia
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2, lineHeight: 1.4 }}>
                    La IA analiza los temas actuales y las tareas de esta materia ({materiaDisplay || 'General'}) para crear retos de motivación y práctica pedagógica.
                  </div>
                </div>
              </div>

              {/* Tareas rápidas para seleccionar */}
              {tareas.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Sugerencias de tareas actuales en esta materia:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tareas.slice(0, 4).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemaAvance(t.titulo)}
                        style={{
                          fontSize: '0.75rem', padding: '4px 9px', borderRadius: 16,
                          border: temaAvance === t.titulo ? '1px solid #4F46E5' : '1px solid #E2E8F0',
                          background: temaAvance === t.titulo ? '#EEF2FF' : '#F8FAFC',
                          color: temaAvance === t.titulo ? '#4F46E5' : '#475569',
                          cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <BookOpen size={11} /> {t.titulo.slice(0, 26)}{t.titulo.length > 26 ? '…' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input de tema */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Tema, Unidad o Avance Curricular actual:
                </label>
                <input
                  type="text"
                  value={temaAvance}
                  onChange={e => setTemaAvance(e.target.value)}
                  placeholder="Ej: Ecuaciones de 2do Grado, Leyes de Newton, Célula y ADN..."
                  style={INPUT_STYLE}
                />
              </div>

              {/* Botón de análisis */}
              <button
                type="button"
                onClick={runAIAvance}
                disabled={aiAvanceLoading}
                style={{
                  padding: '0.7rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#FFFFFF',
                  boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
                }}
              >
                {aiAvanceLoading ? (
                  <>Analizando avance curricular con IA...</>
                ) : (
                  <><Sparkles size={16} /> Generar 4 Retos con IA para este Avance</>
                )}
              </button>

              {/* Resultados generados */}
              {aiAvanceDone && aiAvanceRetos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle size={14} color="#16A34A" /> Retos sugeridos por la IA para "{temaAvance || materiaDisplay}":
                  </div>
                  {aiAvanceRetos.map((r, idx) => (
                    <div
                      key={idx}
                      onClick={() => applyAvanceReto(r)}
                      style={{
                        border: '1.5px solid #E0E7FF', borderRadius: 8, padding: '10px 12px',
                        background: '#FAF5FF', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0E7FF'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>{r.titulo}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 10 }}>
                          +{r.recompensa_puntos} pts · +{r.recompensa_coins} coins
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.35 }}>{r.descripcion}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#4F46E5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                          Seleccionar y Configurar <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ TAB: IA POR DOCUMENTO ════════════════ */}
          {tab === 'ia_doc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: 10, background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border: '1px solid #A7F3D0', borderRadius: '0.75rem', padding: '0.85rem 1rem' }}>
                <FileText size={20} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#065F46' }}>
                    Generación de Retos a partir de Guía o Temario
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 2, lineHeight: 1.4 }}>
                    Sube el documento del tema (guía de estudio, PDF, temario o apuntes) y la IA extraerá retos pedagógicos alineados al contenido.
                  </div>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#0284C7' : docFile ? '#10B981' : '#CBD5E1'}`,
                  borderRadius: '0.75rem', padding: '1.4rem 1rem', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: dragOver ? '#F0F9FF' : docFile ? '#F0FDF4' : '#F8FAFC',
                }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={e => processFile(e.target.files[0])}
                />
                {docFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <FileText size={26} style={{ color: '#10B981' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#065F46' }}>{docFile.name}</p>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B' }}>
                      {(docFile.size / 1024).toFixed(1)} KB · Haz clic para cambiar documento
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <Upload size={26} style={{ color: '#0284C7' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
                      Arrastra la guía o temario aquí o haz clic para subir
                    </p>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B' }}>
                      Formatos compatibles: PDF, Word (.docx), TXT
                    </p>
                  </div>
                )}
              </div>

              {/* Botón de análisis */}
              {!aiDocLoading && !aiDocDone && (
                <button
                  type="button"
                  onClick={runAIDocAnalysis}
                  disabled={!docFile}
                  style={{
                    padding: '0.7rem', borderRadius: '0.6rem', border: 'none',
                    cursor: docFile ? 'pointer' : 'not-allowed',
                    fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: docFile ? 'linear-gradient(135deg, #0284C7, #2563EB)' : '#E2E8F0',
                    color: docFile ? '#FFFFFF' : '#94A3B8',
                  }}
                >
                  <Sparkles size={16} /> Analizar Documento con IA y Extraer Retos
                </button>
              )}

              {/* Loading progress */}
              {aiDocLoading && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>{aiStep}</div>
                  <div style={{ background: '#E2E8F0', borderRadius: 9999, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #0284C7, #2563EB)', width: `${aiProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              {/* Retos generados por documento */}
              {aiDocDone && aiDocRetos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle size={14} color="#16A34A" /> Retos generados a partir de "{docFile?.name}":
                  </div>
                  {aiDocRetos.map((r, idx) => (
                    <div
                      key={idx}
                      onClick={() => applyDocReto(r)}
                      style={{
                        border: '1.5px solid #E0E7FF', borderRadius: 8, padding: '10px 12px',
                        background: '#F0FDF4', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0E7FF'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>{r.titulo}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 10 }}>
                          +{r.recompensa_puntos} pts · +{r.recompensa_coins} coins
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.35 }}>{r.descripcion}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                          Seleccionar y Configurar <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ TAB: MANUAL / DETALLE ════════════════ */}
          {tab === 'manual' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Título del Reto *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  placeholder="Ej: ➗ Maestría en Ecuaciones Cuadráticas"
                  style={INPUT_STYLE}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Instrucciones y Descripción Pedagógica *
                </label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Detalla lo que deben realizar los estudiantes para superar este desafío..."
                  style={{ ...INPUT_STYLE, resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Tipo de Reto
                  </label>
                  <select name="tipo" value={form.tipo} onChange={handleChange} style={INPUT_STYLE}>
                    <option value="TAREAS">📋 Entregar Tareas</option>
                    <option value="PUNTAJE">⭐ Obtener Puntaje Alto</option>
                    <option value="ASISTENCIA">✅ Participación / Asistencia</option>
                    <option value="GENERAL">🎯 Reto General</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Materia Asignada
                  </label>
                  {defaultEspacioId ? (
                    <div style={{ ...INPUT_STYLE, background: '#F8FAFC', fontWeight: 600, color: '#1E3A8A' }}>
                      {defaultEspacioNombre || 'Materia actual'}
                    </div>
                  ) : (
                    <select name="espacio_id" value={form.espacio_id} onChange={handleChange} style={INPUT_STYLE}>
                      <option value="">🌐 Global (todas las materias)</option>
                      {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    ⭐ Puntos
                  </label>
                  <input type="number" name="recompensa_puntos" value={form.recompensa_puntos} onChange={handleChange} min={1} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    🪙 Monedas
                  </label>
                  <input type="number" name="recompensa_coins" value={form.recompensa_coins} onChange={handleChange} min={1} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    🎯 Meta
                  </label>
                  <input type="number" name="meta" value={form.meta} onChange={handleChange} min={1} style={INPUT_STYLE} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Fecha Límite (Opcional)
                </label>
                <input type="datetime-local" name="fecha_limite" value={form.fecha_limite} onChange={handleChange} style={INPUT_STYLE} />
              </div>

              {error && (
                <div style={{ padding: '0.7rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '0.6rem 1.2rem', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.6rem 1.4rem', background: 'linear-gradient(135deg, #1E3A8A, #0284C7)',
                    color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem'
                  }}
                >
                  {saving ? 'Publicando...' : '✓ Publicar Reto'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL CHALLENGEBOARD
// ─────────────────────────────────────────────────────────────
export default function ChallengeBoard({
  onUpdateStats,
  userRole,
  espacioId = null,
  espacioNombre = '',
  cursoNombre = '',
  tareas = []
}) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [espacios, setEspacios] = useState([]);
  const isDocente = userRole === 'DOCENTE';

  const loadChallenges = () => {
    setLoading(true);
    setError(null);
    gamificationAPI.getChallenges(espacioId)
      .then(res => setChallenges(Array.isArray(res) ? res : []))
      .catch(err => setError(err.message || 'Error cargando retos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChallenges();
    if (isDocente && !espacioId) {
      espaciosAPI.list()
        .then(data => setEspacios(Array.isArray(data) ? data : data.results || []))
        .catch(() => {});
    }
  }, [espacioId, isDocente]);

  const handleParticipate = (challengeId) => {
    gamificationAPI.participateChallenge(challengeId)
      .then(res => {
        setChallenges(prev => prev.map(c => c.challenge?.id === challengeId ? res.reto : c));
        if (onUpdateStats && res.user_stats) onUpdateStats(res.user_stats);
      })
      .catch(console.error);
  };

  const handleDelete = (retoId) => {
    if (!window.confirm('¿Deseas eliminar este reto educativo?')) return;
    gamificationAPI.deleteChallenge(retoId)
      .then(() => loadChallenges())
      .catch(console.error);
  };

  const handleToggleActive = (retoId, currentActive) => {
    gamificationAPI.updateChallenge(retoId, { activo: !currentActive })
      .then(() => loadChallenges())
      .catch(console.error);
  };

  const titleText = espacioNombre
    ? `Retos de Aprendizaje — ${espacioNombre}`
    : 'Retos Educativos y Gamificación';

  const subtitleText = espacioNombre
    ? `Desafíos pedagógicos creados con IA según el avance temático de esta materia ${cursoNombre ? `(${cursoNombre})` : ''}`
    : 'Supera retos de tus materias para obtener puntos de experiencia, monedas y subir de nivel.';

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
      <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
      Cargando retos educativos...
    </div>
  );

  // ═════════════════════════════════════════════════════════════
  // VISTA DOCENTE
  // ═════════════════════════════════════════════════════════════
  if (isDocente) {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: '1rem', border: '1px solid #E2E8F0', padding: '1.4rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
        {/* Header toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: '0.6rem', background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', borderRadius: '0.75rem', color: '#4F46E5' }}>
              <Target size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  {titleText}
                </h3>
                {espacioNombre && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' }}>
                    Esta Materia
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                {subtitleText}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.55rem 1rem', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#FFFFFF', border: 'none', borderRadius: '0.6rem', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
              }}
            >
              <Sparkles size={14} /> Nuevo Reto con IA
            </button>
          </div>
        </div>

        {/* Retos Grid */}
        {challenges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: '#64748B', background: '#F8FAFC', borderRadius: '0.75rem', border: '2px dashed #CBD5E1' }}>
            <Target size={38} style={{ margin: '0 auto 8px', opacity: 0.35, color: '#4F46E5' }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' }}>
              No hay retos creados {espacioNombre ? `para ${espacioNombre}` : 'todavía'}.
            </p>
            <p style={{ margin: '4px 0 16px', fontSize: '0.82rem', color: '#64748B' }}>
              Utiliza la IA para generar retos según el avance del curso o subiendo una guía de estudio.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '0.55rem 1.2rem', background: '#4F46E5', color: '#FFFFFF',
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem'
              }}
            >
              ✨ Crear Reto con IA para este Avance
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
            {challenges.map(uc => {
              const c = uc.challenge || uc;
              const activo = c.activo !== undefined ? c.activo : true;
              return (
                <div
                  key={c.id}
                  style={{
                    border: `1.5px solid ${activo ? '#E0E7FF' : '#E2E8F0'}`,
                    borderRadius: '0.75rem', padding: '1.1rem',
                    background: activo ? '#FAF5FF' : '#F8FAFC',
                    opacity: activo ? 1 : 0.7, transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                      {c.titulo}
                    </h4>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleToggleActive(c.id, activo)}
                        title={activo ? 'Desactivar' : 'Activar'}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: activo ? '#10B981' : '#94A3B8', fontSize: '0.75rem', fontWeight: 700
                        }}
                      >
                        {activo ? '● Activo' : '○ Inactivo'}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 2 }}
                        title="Eliminar reto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {c.espacio_nombre && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                      <BookOpen size={11} color="#4F46E5" />
                      <span style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: 700 }}>
                        {c.espacio_nombre}
                      </span>
                    </div>
                  )}

                  <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, flex: 1 }}>
                    {c.descripcion}
                  </p>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #EDE9FE', paddingTop: 8, marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.74rem', background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Star size={11} /> {c.recompensa_puntos} pts
                    </span>
                    <span style={{ fontSize: '0.74rem', background: '#FEF9C3', color: '#854D0E', padding: '2px 7px', borderRadius: 4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Gift size={11} /> {c.recompensa_coins} coins
                    </span>
                    <span style={{ fontSize: '0.74rem', background: '#EDE9FE', color: '#5B21B6', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                      🎯 Meta: {c.meta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Crear Reto */}
        {showForm && (
          <FormCrearReto
            espacios={espacios}
            defaultEspacioId={espacioId}
            defaultEspacioNombre={espacioNombre}
            defaultCursoNombre={cursoNombre}
            tareas={tareas}
            onCreated={loadChallenges}
            onClose={() => setShowForm(false)}
          />
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // VISTA ESTUDIANTE
  // ═════════════════════════════════════════════════════════════
  return (
    <div style={{ background: '#FFFFFF', borderRadius: '1rem', border: '1px solid #E2E8F0', padding: '1.4rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: '0.6rem', background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', borderRadius: '0.75rem', color: '#4F46E5' }}>
            <Target size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                {titleText}
              </h3>
              {espacioNombre && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' }}>
                  {espacioNombre}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              {subtitleText}
            </p>
          </div>
        </div>
      </div>

      {challenges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B', background: '#F8FAFC', borderRadius: '0.75rem' }}>
          <Target size={34} style={{ margin: '0 auto 8px', opacity: 0.35, color: '#4F46E5' }} />
          <p style={{ margin: 0, fontWeight: 700, color: '#1E293B' }}>
            No hay retos activos en este momento {espacioNombre ? `para ${espacioNombre}` : ''}.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
            Tu docente publicará retos gamificados según el avance de cada tema.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {challenges.map(uc => {
            const c = uc.challenge || uc;
            const isCompleted = uc.estado === 'COMPLETADO';
            const progressPercent = Math.min(100, Math.round(((uc.progreso || 0) / (uc.meta || c.meta || 1)) * 100));

            return (
              <div
                key={c.id}
                style={{
                  border: `1.5px solid ${isCompleted ? '#BBF7D0' : '#E0E7FF'}`,
                  borderRadius: '0.75rem', padding: '1.1rem',
                  background: isCompleted ? '#F0FDF4' : '#FAF5FF',
                  transition: 'all 0.2s', display: 'flex', flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                    {c.titulo}
                  </h4>
                  {isCompleted ? (
                    <CheckCircle size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                  ) : (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <Star size={10} /> {c.recompensa_puntos}
                      </span>
                      <span style={{ fontSize: '0.7rem', background: '#FEF9C3', color: '#854D0E', padding: '2px 6px', borderRadius: 4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <Gift size={10} /> {c.recompensa_coins}
                      </span>
                    </div>
                  )}
                </div>

                {c.espacio_nombre && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                    <BookOpen size={11} color="#4F46E5" />
                    <span style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: 700 }}>
                      {c.espacio_nombre}
                    </span>
                  </div>
                )}

                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, flex: 1 }}>
                  {c.descripcion}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginBottom: 4, fontWeight: 600 }}>
                    <span>Progreso del reto</span>
                    <span>{uc.progreso || 0} / {uc.meta || c.meta || 1}</span>
                  </div>
                  <div style={{ background: '#E2E8F0', borderRadius: 9999, height: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: 6, borderRadius: 9999,
                        background: isCompleted ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                        width: `${progressPercent}%`, transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>

                {!isCompleted ? (
                  <button
                    onClick={() => handleParticipate(c.id)}
                    style={{
                      width: '100%', padding: '0.5rem', background: '#EEF2FF',
                      color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: '0.5rem',
                      cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#E0E7FF'}
                    onMouseOut={e => e.currentTarget.style.background = '#EEF2FF'}
                  >
                    Registrar avance (+1)
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.4rem', background: '#DCFCE7', borderRadius: '0.5rem', color: '#166534', fontSize: '0.78rem', fontWeight: 800 }}>
                    ✓ ¡Reto completado con éxito!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
