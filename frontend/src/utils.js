import { BookCheck, TrendingUp, ClipboardList, ChevronDown, LayoutDashboard } from 'lucide-react';

// Obtener iniciales del nombre
export const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
};

// Formatear fecha en español
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

// Formatear fecha con hora
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

// Calcular tiempo relativo
export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Ayer';
  return `Hace ${Math.floor(diff / 86400)} días`;
};

// Calcular días restantes
export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  return diff;
};

// Badge por estado de tarea (estudiante)
export const getTaskBadge = (estado_codigo) => {
  const map = {
    'PENDIENTE': { cls: 'badge-pendiente', label: 'Pendiente' },
    'EN_PROCESO': { cls: 'badge-en_proceso', label: 'En proceso' },
    'ENTREGADO': { cls: 'badge-entregada', label: 'Entregada' },
    'EN_REVISION': { cls: 'badge-en_revision', label: 'En revisión' },
    'CALIFICADO': { cls: 'badge-calificada', label: 'Calificada' },
    'VENCIDA': { cls: 'badge-vencida', label: 'Vencida' },
    'ATRASADO': { cls: 'badge-vencida', label: 'Entregada tarde' },
    'Pendiente': { cls: 'badge-pendiente', label: 'Pendiente' },
    'En proceso': { cls: 'badge-en_proceso', label: 'En proceso' },
    'Entregada': { cls: 'badge-entregada', label: 'Entregada' },
    'En revisión': { cls: 'badge-en_revision', label: 'En revisión' },
    'Calificada': { cls: 'badge-calificada', label: 'Calificada' },
    'Vencida': { cls: 'badge-vencida', label: 'Vencida' },
  };
  return map[estado_codigo] || { cls: 'badge-default', label: estado_codigo };
};

// Badge de prioridad
export const getPriorityBadge = (prioridad) => {
  const map = {
    'ALTA': { cls: 'badge-alta', label: 'Alta' },
    'MEDIA': { cls: 'badge-media', label: 'Media' },
    'BAJA': { cls: 'badge-baja', label: 'Baja' },
  };
  return map[prioridad] || { cls: 'badge-default', label: prioridad };
};

// Color de icono por materia (paleta Teams / Fluent)
export const getSubjectColor = (materia = '') => {
  const m = materia.toLowerCase();
  if (m.includes('matemát') || m.includes('álgebra')) return { bg: '#EDEBE9', color: '#5B5FC7' };
  if (m.includes('física')) return { bg: '#E8EBFA', color: '#4F52B2' };
  if (m.includes('programa') || m.includes('informática')) return { bg: '#E6F4EA', color: '#137333' };
  if (m.includes('estadística') || m.includes('probabilidad')) return { bg: '#F3E8FD', color: '#7B1FA2' };
  if (m.includes('química')) return { bg: '#FEF7E0', color: '#B06000' };
  if (m.includes('biología')) return { bg: '#E6F4EA', color: '#0F9D58' };
  if (m.includes('historia')) return { bg: '#FCE8E6', color: '#C5221F' };
  if (m.includes('lenguaje') || m.includes('literatura')) return { bg: '#FDF2E9', color: '#D97706' };
  return { bg: '#F3F2F1', color: '#424242' };
};

// Formato de nota con color
export const getNoteColor = (nota) => {
  if (nota >= 90) return '#107C41'; // Fluent Green
  if (nota >= 75) return '#5B5FC7'; // Teams Purple
  if (nota >= 60) return '#CA5010'; // Fluent Orange
  return '#A80000'; // Fluent Red
};

// Tipo de archivo textual
export const getFileLabel = (ext = '') => {
  const e = ext.toUpperCase().replace('.', '');
  if (!e) return 'Archivo';
  return e;
};
