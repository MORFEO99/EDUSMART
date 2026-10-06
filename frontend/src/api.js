// API base URL - uses Vite proxy when running dev server (/api → http://localhost:8000)
const API_BASE = '';

// Helper to get CSRF token from cookie
function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1] || '';
}

const apiFetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers };

  // Set default JSON content-type if not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRFToken'] = csrf;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Error de comunicación con el servidor (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.detail || `Error ${res.status}`);
  }

  return data;
};

// 1. Autenticación y Cuentas (Únicamente DOCENTE y ESTUDIANTE)
export const authAPI = {
  login: (credentials) => apiFetch('/api/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => apiFetch('/api/auth/register/', { method: 'POST', body: JSON.stringify(userData) }),
  logout: () => apiFetch('/api/auth/logout/', { method: 'POST' }),
  me: () => apiFetch('/api/auth/me/'),
};

// 2. Espacios Académicos ("Mis Espacios")
export const espaciosAPI = {
  list: () => apiFetch('/api/espacios/'),
  create: (data) => apiFetch('/api/espacios/', { method: 'POST', body: JSON.stringify(data) }),
  join: (codigo) => apiFetch('/api/espacios/unirse/', { method: 'POST', body: JSON.stringify({ codigo }) }),
  detail: (id) => apiFetch(`/api/espacios/${id}/`),
};

// 3. Tareas Académicas
export const tareasAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/tareas/${query ? `?${query}` : ''}`);
  },
  detail: (id) => apiFetch(`/api/tareas/${id}/`),
  create: (data) => apiFetch('/api/tareas/', { method: 'POST', body: JSON.stringify(data) }),
  submit: (id, data) => apiFetch(`/api/tareas/${id}/presentar/`, { method: 'POST', body: JSON.stringify(data) }),
  submissions: (id) => apiFetch(`/api/tareas/${id}/entregas/`),
  grade: (entregaId, data) => apiFetch(`/api/entregas/${entregaId}/calificar/`, { method: 'POST', body: JSON.stringify(data) }),
};

// 4. Dashboards Académicos
export const dashboardAPI = {
  student: () => apiFetch('/api/dashboard/estudiante/'),
  teacher: () => apiFetch('/api/dashboard/docente/'),
};

// 5. Progreso Académico
export const progresoAPI = {
  get: () => apiFetch('/api/progreso/'),
};

// 6. Actividad Académica
export const actividadAPI = {
  list: () => apiFetch('/api/actividad/'),
};

// 7. Notificaciones
export const notificacionesAPI = {
  list: () => apiFetch('/api/notificaciones/'),
  markRead: () => apiFetch('/api/notificaciones/marcar-leidas/', { method: 'POST' }),
};

export const avisosAPI = {
  list: (espacioId) => apiFetch(`/api/espacios/${espacioId}/avisos/`),
  create: (espacioId, data) => apiFetch(`/api/espacios/${espacioId}/avisos/`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/avisos/${id}/`, { method: 'DELETE' }),
};

export const recursosAPI = {
  list: (espacioId) => apiFetch(`/api/espacios/${espacioId}/recursos/`),
  create: (espacioId, data) => apiFetch(`/api/espacios/${espacioId}/recursos/`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/recursos/${id}/`, { method: 'DELETE' }),
};

export const entregasAPI = {
  pendientes: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/api/entregas/pendientes/${q ? '?' + q : ''}`);
  },
  devolver: (id, motivo) => apiFetch(`/api/entregas/${id}/devolver/`, { method: 'POST', body: JSON.stringify({ motivo }) }),
  reentregar: (tareaId, data) => apiFetch(`/api/tareas/${tareaId}/reentregar/`, { method: 'POST', body: JSON.stringify(data) }),
  historial: (id) => apiFetch(`/api/entregas/${id}/historial/`),
  calificar: (id, data) => apiFetch(`/api/entregas/${id}/calificar/`, { method: 'POST', body: JSON.stringify(data) }),
};

export const plantillasAPI = {
  list: () => apiFetch('/api/plantillas/'),
  create: (data) => apiFetch('/api/plantillas/', { method: 'POST', body: JSON.stringify(data) }),
  duplicar: (tareaId, nuevoEspacioId) => apiFetch(`/api/tareas/${tareaId}/duplicar/`, { method: 'POST', body: JSON.stringify({ nuevo_espacio_id: nuevoEspacioId }) }),
};

export const extensionAPI = {
  conceder: (tareaId, data) => apiFetch(`/api/tareas/${tareaId}/extension/`, { method: 'POST', body: JSON.stringify(data) }),
};

// ==========================================
// ALIASES FOR COMPONENT COMPATIBILITY
// ==========================================

export const studentAPI = {
  tasks: (filter = '') => apiFetch(`/api/tareas/${filter ? `?filtro=${filter}` : ''}`),
  taskDetail: (id) => apiFetch(`/api/tareas/${id}/`),
  submitTask: (id, data) => apiFetch(`/api/tareas/${id}/presentar/`, { method: 'POST', body: JSON.stringify(data) }),
  resubmitTask: (id, data) => apiFetch(`/api/tareas/${id}/reentregar/`, { method: 'POST', body: JSON.stringify(data) }),
  progress: () => apiFetch('/api/progreso/'),
  feedbacks: () => apiFetch('/api/progreso/'),
};

export const teacherAPI = {
  tasks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/tareas/${query ? `?${query}` : ''}`);
  },
  createTask: (data) => apiFetch('/api/tareas/', { method: 'POST', body: JSON.stringify(data) }),
  gradeSubmission: (id, data) => apiFetch(`/api/entregas/${id}/calificar/`, { method: 'POST', body: JSON.stringify(data) }),
  devolverSubmission: (id, motivo) => apiFetch(`/api/entregas/${id}/devolver/`, { method: 'POST', body: JSON.stringify({ motivo }) }),
  allSubmissions: async (params = {}) => {
    const res = await entregasAPI.pendientes(params);
    return res.entregas || [];
  },
  studentsList: async (cursoId = null) => {
    try {
      if (cursoId) {
        const res = await apiFetch(`/api/v2/cursos/${cursoId}/estudiantes/`);
        return res.estudiantes || [];
      }
      const colegios = await apiFetch('/api/v2/colegios/');
      if (colegios && colegios.length > 0) {
        const cursos = await apiFetch(`/api/v2/colegios/${colegios[0].id}/cursos/`);
        if (cursos && cursos.length > 0) {
          const res = await apiFetch(`/api/v2/cursos/${cursos[0].id}/estudiantes/`);
          if (res.estudiantes && res.estudiantes.length > 0) return res.estudiantes;
        }
      }
    } catch (e) {
      console.warn('Fallback to local student records:', e);
    }
    return [
      { id: 1, nombre_completo: 'Carlos Gómez', email: 'carlos.gomez@edusmart.edu', matricula: 'EST-2023-001', grado: '5to', paralelo: 'B', tareas_entregadas: 12, tareas_asignadas: 14, tareas_pendientes: 2, porcentaje_cumplimiento: 86, promedio: 91, riesgo_academico: false, estado_academico: 'Excelente' },
      { id: 2, nombre_completo: 'Ana Flores', email: 'ana.flores@edusmart.edu', matricula: 'EST-2023-002', grado: '5to', paralelo: 'B', tareas_entregadas: 14, tareas_asignadas: 14, tareas_pendientes: 0, porcentaje_cumplimiento: 100, promedio: 95, riesgo_academico: false, estado_academico: 'Excelente' },
      { id: 3, nombre_completo: 'David Morales', email: 'david.morales@edusmart.edu', matricula: 'EST-2023-003', grado: '5to', paralelo: 'B', tareas_entregadas: 5, tareas_asignadas: 14, tareas_pendientes: 9, porcentaje_cumplimiento: 36, promedio: 58, riesgo_academico: true, estado_academico: 'Riesgo' },
    ];
  },
  sendReport: (studentId, data) => apiFetch(`/api/v2/estudiantes/${studentId}/enviar-reporte/`, { method: 'POST', body: JSON.stringify(data) }),
  reports: () => Promise.resolve({
    promedio_general: 82.5,
    total_tareas: 24,
    total_entregas: 156,
    distribucion_notas: [
      { rango: 'Excelente (90-100)', cantidad: 45, color: '#10B981' },
      { rango: 'Bueno (70-89)', cantidad: 75, color: '#3B82F6' },
      { rango: 'Regular (50-69)', cantidad: 25, color: '#F59E0B' },
      { rango: 'Deficiente (0-49)', cantidad: 11, color: '#EF4444' }
    ]
  })
};

export const commonAPI = {
  notifications: () => apiFetch('/api/notificaciones/'),
  markNotificationsRead: () => apiFetch('/api/notificaciones/marcar-leidas/', { method: 'POST' }),
  courses: () => apiFetch('/api/espacios/'),
  colegios: () => apiFetch('/api/v2/colegios/'),
  crearColegio: (data) => apiFetch('/api/v2/colegios/', { method: 'POST', body: JSON.stringify(data) }),
  cursosPorColegio: (colegioId) => apiFetch(`/api/v2/colegios/${colegioId}/cursos/`),
  crearCurso: (colegioId, data) => apiFetch(`/api/v2/colegios/${colegioId}/cursos/`, { method: 'POST', body: JSON.stringify(data) }),
  crearMateria: (cursoId, data) => apiFetch(`/api/v2/cursos/${cursoId}/materias/`, { method: 'POST', body: JSON.stringify(data) }),
  estudiantesPorCurso: (cursoId) => apiFetch(`/api/v2/cursos/${cursoId}/estudiantes/`),
  enviarReporteEstudiante: (estudianteId, data) => apiFetch(`/api/v2/estudiantes/${estudianteId}/enviar-reporte/`, { method: 'POST', body: JSON.stringify(data) }),
  enviarReportesCurso: (cursoId, data) => apiFetch(`/api/v2/cursos/${cursoId}/enviar-reportes/`, { method: 'POST', body: JSON.stringify(data) }),
};

// ==============================================================================
// INVITACIONES A ESPACIOS
// ==============================================================================
export const invitacionAPI = {
  // Docente: obtener o generar código activo para un espacio
  consultar: (espacioId) => apiFetch(`/api/espacios/${espacioId}/invitacion/`),
  // Docente: regenerar código (invalida el anterior)
  regenerar: (espacioId, horas_duracion) => apiFetch(`/api/espacios/${espacioId}/invitacion/regenerar/`, { method: 'POST', body: JSON.stringify({ horas_duracion }) }),
  // Docente: desactivar código
  desactivar: (espacioId) => apiFetch(`/api/espacios/${espacioId}/invitacion/desactivar/`, { method: 'POST' }),
  // Estudiante: validar un código (devuelve info del espacio)
  validar: (codigo) => apiFetch('/api/invitaciones/validar/', { method: 'POST', body: JSON.stringify({ codigo }) }),
  // Estudiante: unirse al espacio usando el código
  unirse: (codigo) => apiFetch('/api/invitaciones/unirse/', { method: 'POST', body: JSON.stringify({ codigo }) }),
};

export const gamificationAPI = {
  getChallenges: (espacioId = null) => apiFetch(espacioId ? `/api/v2/gamificacion/challenges/?espacio_id=${espacioId}` : '/api/v2/gamificacion/challenges/'),
  participateChallenge: (id) => apiFetch(`/api/v2/gamificacion/challenges/${id}/participar/`, { method: 'POST' }),
  createChallenge: (data) => apiFetch('/api/v2/gamificacion/challenges/crear/', { method: 'POST', body: JSON.stringify(data) }),
  updateChallenge: (id, data) => apiFetch(`/api/v2/gamificacion/challenges/${id}/gestionar/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChallenge: (id) => apiFetch(`/api/v2/gamificacion/challenges/${id}/gestionar/`, { method: 'DELETE' }),
  getLeaderboard: () => apiFetch('/api/v2/gamificacion/leaderboard/'),
  getBadges: () => apiFetch('/api/v2/gamificacion/badges/'),
};

export default apiFetch;
