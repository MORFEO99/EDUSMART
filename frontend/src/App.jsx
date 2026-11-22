import { useState, useEffect } from 'react';
import './index.css';
import { authAPI, commonAPI } from './api';
import { Sidebar, Topbar, Loading, NotificationPanel, Modal } from './components';
import { AuthManager } from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import MyTasks from './pages/MyTasks';
import StudentProgress from './pages/StudentProgress';
import { StudentGradesView, StudentFeedbackView, StudentEspaciosView } from './pages/StudentViews';
import TeacherDashboard from './pages/TeacherDashboard';
import {
  TeacherTasksView,
  CreateTaskForm,
  TeacherSubmissionsView,
  TeacherGradebookView,
  TeacherStudentsView,
  TeacherReportsView
} from './pages/TeacherViews';
import { StudentResultsView } from './pages/StudentViews';
import UserProfileView from './pages/UserProfileView';
import ColegiosPage from './pages/ColegiosPage';
import ColegioDetallePage from './pages/ColegioDetallePage';
import CursoPage from './pages/CursoPage';
import ImportStudentsPage from './pages/ImportStudentsPage';
import ImportarCalificacionesPage from './pages/ImportarCalificacionesPage';
import EspacioDetallePage from './pages/EspacioDetallePage';
import ListaExcelDocente from './pages/ListaExcelDocente';
import StudentPracticeView from './pages/StudentPracticeView';
import ChallengeBoard from './components/ChallengeBoard';
import LaboratorioNumerico from './components/LaboratorioNumerico';

// ============================================================
// PAGE TITLES
// ============================================================
const PAGE_TITLES = {
  // ── COMUNES ─────────────────────────────────────────────
  'dashboard':              ['Inicio',                     'Resumen de actividad académica'],
  'mi-perfil':              ['Mi Perfil',                  'Datos personales y configuración de cuenta'],

  // ── DOCENTE ─────────────────────────────────────────────
  'colegios':               ['Mis Colegios y Cursos',      'Instituciones educativas y estructura académica'],
  'colegio-detalle':        ['Detalle del Colegio',        'Cursos, materias y estudiantes de la institución'],
  'espacios':               ['Mis Espacios',               'Espacios académicos y materias asignadas'],
  'espacio-detalle':        ['Espacio Académico',          'Tareas, recursos y seguimiento del espacio'],
  'tareas':                 ['Tareas',                     'Supervisión y publicación de actividades académicas'],
  'mis-tareas':             ['Tareas',                     'Supervisión y publicación de actividades académicas'],
  'crear-tarea':            ['Nueva Tarea',                'Publicación de actividades para cursos'],
  'entregas':               ['Entregas',                   'Revisión y calificación de trabajos recibidos'],
  'resultados':             ['Resultados y Notas',         'Libro oficial de notas y evaluaciones'],
  'calificaciones':         ['Calificaciones',             'Libro oficial de notas y evaluaciones'],
  'seguimiento':            ['Seguimiento de Alumnos',     'Monitoreo integral del desempeño estudiantil'],
  'reportes':               ['Reportes',                   'Análisis institucional de rendimiento académico'],
  'lista-excel':            ['Lista de Estudiantes',       'Registro académico por colegio, curso y materia'],
  'retos':                  ['Retos Gamificados',          'Desafíos de aprendizaje y recompensas con IA'],

  // ── ESTUDIANTE ───────────────────────────────────────────
  'espacios-est':           ['Mis Espacios',               'Espacios académicos en los que participo'],
  'practicas':              ['Simuladores de Examen IA',   'Ejercicios didácticos generados con inteligencia artificial'],
  'simuladores':            ['Simuladores de Examen IA',   'Ejercicios didácticos y práctica por avance docente'],
  'retroalimentacion':      ['Retroalimentación',          'Observaciones y comentarios formativos del docente'],
  'mi-progreso':            ['Mi Progreso',                'Indicadores de avance y desempeño académico'],
  'presentar-tarea':        ['Presentar Tarea',            'Envío de trabajos y archivos adjuntos'],
  'laboratorio-numerico':   ['Laboratorio de Análisis Numérico', 'Resolución paso a paso de métodos matemáticos y computacionales'],

  // ── SUBPÁGINAS (sin ítem en sidebar) ────────────────────
  'teacher_courses':        ['Administración del Curso',   'Gestión de estudiantes y asignaturas'],
  'import_students':        ['Importar Estudiantes',       'Carga masiva desde archivo Excel'],
  'importar_calificaciones':['Importar Calificaciones',    'Carga de notas desde archivo Excel'],
};

export default function App() {
  const [authState, setAuthState] = useState({ loading: true, user: null, roleInfo: {} });
  const [section, setSection] = useState('dashboard');
  const [extraData, setExtraData] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showTeacherCreate, setShowTeacherCreate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check auth session on load
  useEffect(() => {
    authAPI.me()
      .then(res => {
        if (res.authenticated && res.user) {
          setAuthState({ loading: false, user: res.user, roleInfo: res.role_info || {} });
          loadNotifications(res.user);
        } else {
          setAuthState({ loading: false, user: null, roleInfo: {} });
        }
      })
      .catch(() => setAuthState({ loading: false, user: null, roleInfo: {} }));
  }, []);

  const loadNotifications = () => {
    commonAPI.notifications()
      .then(setNotifications)
      .catch(console.error);
  };

  const handleLoginSuccess = (res) => {
    setAuthState({ loading: false, user: res.user, roleInfo: res.role_info || {} });
    setSection('dashboard');
    loadNotifications();
  };

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    setAuthState({ loading: false, user: null, roleInfo: {} });
    setSection('dashboard');
  };

  const handleNavigate = (newSection, data = {}) => {
    setSidebarOpen(false);
    if (newSection === 'crear-tarea' && authState.user?.rol === 'DOCENTE') {
      setShowTeacherCreate(true);
      return;
    }
    setSection(newSection);
    setExtraData(data);
    setShowNotifs(false);
  };

  const handleMarkRead = async () => {
    await commonAPI.markNotificationsRead().catch(console.error);
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
  };

  if (authState.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9F8' }}>
        <Loading text="Iniciando entorno EDUSMART..." />
      </div>
    );
  }

  if (!authState.user) {
    return <AuthManager onAuthSuccess={handleLoginSuccess} />;
  }

  const { user } = authState;
  const unreadCount = notifications.filter(n => !n.leida).length;
  const pageInfo = PAGE_TITLES[section] || ['EDUSMART', ''];

  // Router by role and section
  const renderCurrentView = () => {
    const role = user.rol;

    if (role === 'ESTUDIANTE') {
      switch (section) {
        case 'dashboard':
          return <StudentDashboard user={user} onNavigate={handleNavigate} />;
        case 'practicas':
        case 'simuladores':
        case 'practicas-ia':
          return <StudentPracticeView onNavigate={handleNavigate} />;
        case 'retos':
          return (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
              <ChallengeBoard userRole="ESTUDIANTE" />
            </div>
          );
        case 'laboratorio-numerico':
          return (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
              <LaboratorioNumerico userRole="ESTUDIANTE" />
            </div>
          );
        case 'mis-tareas':
        case 'tareas':
          return <MyTasks initialTaskId={extraData?.taskId} initialFilter={extraData?.filtro || 'todos'} onNavigate={handleNavigate} />;
        case 'presentar-tarea':
          return <MyTasks initialTaskId={extraData?.taskId} initialFilter="pendientes" onNavigate={handleNavigate} />;
        case 'entregas':
          return <MyTasks initialTaskId={extraData?.taskId} initialFilter="entregadas" onNavigate={handleNavigate} />;
        case 'resultados':
        case 'calificaciones':
          return <StudentResultsView onNavigate={handleNavigate} />;
        case 'retroalimentacion':
          return <StudentFeedbackView onNavigate={handleNavigate} />;
        case 'espacios':
        case 'mis-espacios':
          return <StudentEspaciosView onNavigate={handleNavigate} />;
        case 'espacio_detail':
        case 'espacio-detalle':
          return <EspacioDetallePage user={user} espacioId={extraData?.espacioId} defaultTab={extraData?.defaultTab} onBack={() => handleNavigate('mis-espacios')} />;
        case 'mi-progreso':
        case 'progreso':
          return <StudentProgress />;
        case 'mi-perfil':
          return <UserProfileView user={user} roleInfo={authState.roleInfo} onLogout={handleLogout} />;
        default:
          return <StudentDashboard user={user} onNavigate={handleNavigate} />;
      }
    }

    if (role === 'DOCENTE') {
      switch (section) {
        // ── MENÚ PRINCIPAL ──────────────────────────────────
        case 'dashboard':
          return <TeacherDashboard user={user} onNavigate={handleNavigate} onOpenCreateTask={() => setShowTeacherCreate(true)} />;

        case 'colegios':
          return <ColegiosPage onNavigate={handleNavigate} />;

        case 'espacios':
          return <ColegiosPage onNavigate={handleNavigate} />; // Mis Espacios muestra lista de colegios → espacios

        // ── SUBPÁGINAS de Colegios/Espacios (no en sidebar) ─
        case 'colegio-detalle':
          return <ColegioDetallePage colegio={extraData?.colegio} onBack={() => handleNavigate('colegios')} onNavigate={handleNavigate} />;

        case 'espacio-detalle':
          return <EspacioDetallePage user={user} espacioId={extraData?.espacioId} defaultTab={extraData?.defaultTab} onBack={() => handleNavigate(extraData?.fromColegio ? 'colegio-detalle' : 'colegios', extraData)} />;

        case 'teacher_courses':
          return <CursoPage onNavigate={handleNavigate} colegioId={extraData?.colegioId} cursoId={extraData?.cursoId} />;

        case 'import_students':
          return <ImportStudentsPage onNavigate={handleNavigate} cursoId={extraData?.cursoId} />;

        case 'importar_calificaciones':
          return <ImportarCalificacionesPage onNavigate={handleNavigate} cursoId={extraData?.cursoId} tareaId={extraData?.tareaId} />;

        // ── GESTIÓN ACADÉMICA ────────────────────────────────
        case 'tareas':
        case 'mis-tareas':  // alias para compatibilidad con navegación interna
          return <TeacherTasksView onNavigate={handleNavigate} onOpenCreate={() => setShowTeacherCreate(true)} />;

        case 'entregas':
          return <TeacherSubmissionsView initialTaskId={extraData?.filterTaskId} onNavigate={handleNavigate} />;

        case 'resultados':
        case 'calificaciones':
          return <TeacherGradebookView onNavigate={handleNavigate} />;

        case 'seguimiento':
          return <TeacherStudentsView onNavigate={handleNavigate} />;

        case 'reportes':
          return <TeacherReportsView onNavigate={handleNavigate} />;

        case 'lista-excel':
          return <ListaExcelDocente onNavigate={handleNavigate} />;

        // ── EXTRAS ───────────────────────────────────────────
        case 'retos':
          return (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
              <ChallengeBoard userRole="DOCENTE" />
            </div>
          );

        case 'laboratorio-numerico':
          return (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
              <LaboratorioNumerico userRole="DOCENTE" />
            </div>
          );

        // ── PERFIL ───────────────────────────────────────────
        case 'mi-perfil':
          return <UserProfileView user={user} roleInfo={authState.roleInfo} onLogout={handleLogout} />;

        default:
          return <TeacherDashboard user={user} onNavigate={handleNavigate} onOpenCreateTask={() => setShowTeacherCreate(true)} />;
      }
    }

    return <StudentDashboard user={user} onNavigate={handleNavigate} />;
  };

  return (
    <div className="app-layout">
      {/* Sidebar EduSmart */}
      <Sidebar
        user={user}
        roleInfo={authState.roleInfo}
        activeSection={section}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        notifCount={unreadCount}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="app-content">
        {/* Topbar EduSmart */}
        <Topbar
          title={pageInfo[0]}
          subtitle={pageInfo[1]}
          user={user}
          notifCount={unreadCount}
          onOpenNotifications={() => setShowNotifs(!showNotifs)}
          onNavigate={handleNavigate}
          onToggleMobileMenu={() => setSidebarOpen(prev => !prev)}
        />

        {showNotifs && (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onClose={() => setShowNotifs(false)}
          />
        )}

        <main className="main-view-wrapper" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {renderCurrentView()}
        </main>
      </div>

      {/* Modal: Create Task (Accessible from anywhere by Docente) */}
      <Modal
        open={showTeacherCreate}
        onClose={() => setShowTeacherCreate(false)}
        title="Crear Nueva Tarea Académica"
      >
        <CreateTaskForm
          onSuccess={() => {
            setShowTeacherCreate(false);
            setSection('mis-tareas');
          }}
          onCancel={() => setShowTeacherCreate(false)}
        />
      </Modal>
    </div>
  );
}
