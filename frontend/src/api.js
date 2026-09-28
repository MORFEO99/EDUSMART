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

// ==========================================
// ALIASES FOR COMPONENT COMPATIBILITY
// ==========================================

export const studentAPI = {
  tasks: (filter = '') => {
    const allTasks = [
      { id: 1, titulo: 'Modelado Entidad-Relación', materia: 'Bases de Datos I', docente: 'Prof. Juan Pérez', fecha_limite: '2026-10-01T23:59:00Z', puntaje_maximo: 100, nota: 95, estado: 'CALIFICADA', prioridad: 'ALTA', entrega: { calificacion: { fecha_calificacion: '2026-09-20', retroalimentacion: 'Excelente trabajo, muy bien estructurado.' } } },
      { id: 2, titulo: 'Diagrama de Clases UML', materia: 'Ingeniería de Software', docente: 'Prof. María López', fecha_limite: '2026-09-30T23:59:00Z', puntaje_maximo: 100, nota: 88, estado: 'CALIFICADA', prioridad: 'MEDIA', entrega: { calificacion: { fecha_calificacion: '2026-09-22', retroalimentacion: 'Buen trabajo, mejorar la nomenclatura.' } } },
      { id: 3, titulo: 'Consultas SQL Avanzadas', materia: 'Bases de Datos I', docente: 'Prof. Juan Pérez', fecha_limite: '2026-10-05T23:59:00Z', puntaje_maximo: 100, nota: null, estado: 'ENTREGADA', prioridad: 'ALTA', entrega: null },
      { id: 4, titulo: 'Algoritmos de Ordenamiento', materia: 'Algoritmos', docente: 'Prof. María López', fecha_limite: '2026-10-10T23:59:00Z', puntaje_maximo: 100, nota: null, estado: 'PENDIENTE', prioridad: 'MEDIA', entrega: null },
      { id: 5, titulo: 'Normalización de Bases de Datos', materia: 'Bases de Datos I', docente: 'Prof. Juan Pérez', fecha_limite: '2026-10-15T23:59:00Z', puntaje_maximo: 100, nota: null, estado: 'ASIGNADA', prioridad: 'BAJA', entrega: null },
    ];
    if (filter === 'calificadas') return Promise.resolve(allTasks.filter(t => t.nota !== null));
    if (filter === 'pendientes') return Promise.resolve(allTasks.filter(t => t.estado === 'PENDIENTE' || t.estado === 'ASIGNADA'));
    if (filter === 'entregadas') return Promise.resolve(allTasks.filter(t => t.estado === 'ENTREGADA'));
    return Promise.resolve(allTasks);
  },
  taskDetail: (id) => apiFetch(`/api/tareas/${id}/`),
  submitTask: (id, data) => apiFetch(`/api/tareas/${id}/presentar/`, { method: 'POST', body: JSON.stringify(data) }),
  progress: () => Promise.resolve({
    metricas_generales: { tareas_completadas: 15, tareas_pendientes: 4, tareas_vencidas: 1, progreso_porcentaje: 85, promedio_actual: 92 },
    materias: [
      { id: 1, nombre: 'Bases de Datos I', promedio: 95, estado: 'EXCELENTE' },
      { id: 2, nombre: 'Ingeniería de Software', promedio: 88, estado: 'BUENO' },
      { id: 3, nombre: 'Algoritmos', promedio: 72, estado: 'REGULAR' }
    ],
    evolucion_calificaciones: [ { mes: 'Sem 1', nota: 80 }, { mes: 'Sem 2', nota: 85 }, { mes: 'Sem 3', nota: 92 } ],
    resumen_texto: 'Tienes un desempeño académico sobresaliente en este periodo.'
  }),
  feedbacks: () => Promise.resolve([
    { id: 1, tarea_titulo: 'Modelado Entidad-Relación', materia: 'Bases de Datos I', docente: 'Prof. Juan Pérez', comentario: 'Excelente trabajo. La normalización está perfectamente aplicada. Sigue así.', nota: 95, fecha: '2026-09-20' },
    { id: 2, tarea_titulo: 'Diagrama de Clases UML', materia: 'Ingeniería de Software', docente: 'Prof. María López', comentario: 'Buen trabajo. Mejorar la nomenclatura de los métodos según el estándar camelCase.', nota: 88, fecha: '2026-09-22' },
  ])
};

export const teacherAPI = {
  tasks: () => apiFetch('/api/tareas/'),
  createTask: (data) => apiFetch('/api/tareas/', { method: 'POST', body: JSON.stringify(data) }),
  gradeSubmission: (id, data) => apiFetch(`/api/entregas/${id}/calificar/`, { method: 'POST', body: JSON.stringify(data) }),
  allSubmissions: () => Promise.resolve([
    { id: 1, tarea_id: 1, tarea_titulo: 'Modelado Entidad-Relación', estudiante_nombre: 'Carlos Gómez', estudiante_email: 'carlos@estudiante.com', fecha_entrega: '2026-09-18T14:30:00Z', comentario: 'Adjunto el diagrama ER completo con todas las relaciones.', calificacion: { nota: 95, comentario: 'Excelente trabajo.' } },
    { id: 2, tarea_id: 1, tarea_titulo: 'Modelado Entidad-Relación', estudiante_nombre: 'Ana Martínez', estudiante_email: 'ana@estudiante.com', fecha_entrega: '2026-09-19T10:00:00Z', comentario: 'Diagrama ER con normalización 3FN aplicada.', calificacion: { nota: 92, comentario: 'Muy buena presentación.' } },
    { id: 3, tarea_id: 2, tarea_titulo: 'Diagrama de Clases UML', estudiante_nombre: 'Luis Herrera', estudiante_email: 'luis@estudiante.com', fecha_entrega: '2026-09-29T23:00:00Z', comentario: 'Entrego el diagrama UML de mi sistema de biblioteca.', calificacion: null },
    { id: 4, tarea_id: 2, tarea_titulo: 'Diagrama de Clases UML', estudiante_nombre: 'Carlos Gómez', estudiante_email: 'carlos@estudiante.com', fecha_entrega: '2026-09-28T18:45:00Z', comentario: 'Sistema de gestión escolar con patrón MVC.', calificacion: null },
  ]),
  studentsList: () => Promise.resolve([
    { id: 1, nombre_completo: 'Carlos Gómez', email: 'carlos@estudiante.com', matricula: 'EST-2023-001', grado: '3er Año', paralelo: 'A', tareas_entregadas: 12, tareas_asignadas: 14, tareas_pendientes: 2, porcentaje_cumplimiento: 86, promedio: 91, riesgo_academico: false, estado_academico: 'Excelente' },
    { id: 2, nombre_completo: 'Ana Martínez', email: 'ana@estudiante.com', matricula: 'EST-2023-002', grado: '3er Año', paralelo: 'A', tareas_entregadas: 14, tareas_asignadas: 14, tareas_pendientes: 0, porcentaje_cumplimiento: 100, promedio: 95, riesgo_academico: false, estado_academico: 'Excelente' },
    { id: 3, nombre_completo: 'Luis Herrera', email: 'luis@estudiante.com', matricula: 'EST-2023-003', grado: '3er Año', paralelo: 'B', tareas_entregadas: 5, tareas_asignadas: 14, tareas_pendientes: 9, porcentaje_cumplimiento: 36, promedio: 58, riesgo_academico: true, estado_academico: 'Riesgo' },
  ]),
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
  getChallenges: () => apiFetch('/api/v2/gamificacion/challenges/'),
  participateChallenge: (id) => apiFetch(`/api/v2/gamificacion/challenges/${id}/participar/`, { method: 'POST' }),
  getLeaderboard: () => apiFetch('/api/v2/gamificacion/leaderboard/'),
  getBadges: () => apiFetch('/api/v2/gamificacion/badges/')
};

export default apiFetch;
