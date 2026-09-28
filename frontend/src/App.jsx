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
import UserProfileView from './pages/UserProfileView';
import ColegiosPage from './pages/ColegiosPage';
import ColegioDetallePage from './pages/ColegioDetallePage';
import CursoPage from './pages/CursoPage';
import ImportStudentsPage from './pages/ImportStudentsPage';
import ImportarCalificacionesPage from './pages/ImportarCalificacionesPage';
import EspacioDetallePage from './pages/EspacioDetallePage';

// ============================================================
// PAGE TITLES
// ============================================================
const PAGE_TITLES = {
  'dashboard': ['Dashboard', 'Resumen de actividad académica'],
  'mis-tareas': ['Mis Tareas', 'Consulta, seguimiento y entrega de tareas'],
  'presentar-tarea': ['Presentar Tarea', 'Envío de trabajos y archivos adjuntos'],
  'entregas': ['Mis Entregas', 'Historial de entregas y estado de revisión'],
  'calificaciones': ['Calificaciones', 'Libro oficial de notas y evaluaciones'],
  'retroalimentacion': ['Retroalimentación', 'Observaciones y comentarios formativos'],
  'mi-progreso': ['Mi Progreso Académico', 'Indicadores de avance y desempeño'],
  'mi-perfil': ['Mi Perfil', 'Datos personales y configuración de cuenta'],
  'crear-tarea': ['Crear Tarea', 'Publicación de actividades para cursos'],
  'seguimiento': ['Seguimiento Académico', 'Monitoreo integral de estudiantes'],
  'reportes': ['Reportes y Estadísticas', 'Análisis institucional de rendimiento'],
  'usuarios': ['Usuarios del Sistema', 'Directorio institucional'],
  'materias': ['Asignaturas', 'Gestión de materias académicas'],
  'cursos': ['Cursos Habilitados', 'Cursos y paralelos por período'],
  'tareas': ['Tareas Académicas', 'Supervisión de actividades'],
  'colegios': ['Mis Colegios', 'Instituciones educativas y entornos de trabajo'],
  'espacios': ['Mis Espacios', 'Espacios académicos y materias'],
  'teacher_courses': ['Administración del Curso', 'Gestión de estudiantes y asignaturas'],
  'import_students': ['Importar Estudiantes', 'Carga masiva desde archivo Excel'],
  'importar_calificaciones': ['Importar Calificaciones', 'Carga de notas desde archivo Excel'],
};

export default function App() {
  const [authState, setAuthState] = useState({ loading: true, user: null, roleInfo: {} });
  const [section, setSection] = useState('dashboard');
  const [extraData, setExtraData] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showTeacherCreate, setShowTeacherCreate] = useState(false);

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
        case 'mis-tareas':
          return <MyTasks initialTaskId={extraData?.taskId} initialFilter="todos" />;
        case 'presentar-tarea':
          return <MyTasks initialTaskId={extraData?.taskId} initialFilter="pendientes" />;
        case 'entregas':
          return <MyTasks initialTaskId={extraData?.taskId} initialFilter="entregadas" />;
        case 'calificaciones':
          return <StudentGradesView onNavigate={handleNavigate} />;
        case 'retroalimentacion':
          return <StudentFeedbackView onNavigate={handleNavigate} />;
        case 'espacios':
        case 'mis-espacios':
          return <StudentEspaciosView onNavigate={handleNavigate} />;
        case 'espacio_detail':
        case 'espacio-detalle':
          return <EspacioDetallePage user={user} espacioId={extraData?.espacioId} onBack={() => handleNavigate('mis-espacios')} />;
        case 'mi-progreso':
          return <StudentProgress />;
        case 'mi-perfil':
          return <UserProfileView user={user} roleInfo={authState.roleInfo} onLogout={handleLogout} />;
        default:
          return <StudentDashboard user={user} onNavigate={handleNavigate} />;
      }
    }

    if (role === 'DOCENTE') {
      switch (section) {
        case 'colegios':
          return <ColegiosPage onNavigate={handleNavigate} />;
        case 'espacios':
          return <ColegiosPage onNavigate={handleNavigate} />;
        case 'colegio-detalle':
          return <ColegioDetallePage colegio={extraData?.colegio} onBack={() => handleNavigate('colegios')} onNavigate={handleNavigate} />;
        case 'espacio-detalle':
          return <EspacioDetallePage user={user} espacioId={extraData?.espacioId} onBack={() => handleNavigate(extraData?.fromColegio ? 'colegio-detalle' : 'colegios', extraData)} />;
        case 'teacher_courses':
          return <CursoPage onNavigate={handleNavigate} colegioId={extraData?.colegioId} cursoId={extraData?.cursoId} />;
        case 'import_students':
          return <ImportStudentsPage onNavigate={handleNavigate} cursoId={extraData?.cursoId} />;
        case 'importar_calificaciones':
          return <ImportarCalificacionesPage onNavigate={handleNavigate} cursoId={extraData?.cursoId} tareaId={extraData?.tareaId} />;
        case 'dashboard':
          return <TeacherDashboard onNavigate={handleNavigate} onOpenCreateTask={() => setShowTeacherCreate(true)} />;
        case 'mis-tareas':
        case 'tareas':
        case 'crear-tarea':
          return <TeacherTasksView onNavigate={handleNavigate} onOpenCreate={() => setShowTeacherCreate(true)} />;
        case 'entregas':
          return <TeacherSubmissionsView initialTaskId={extraData?.filterTaskId} />;
        case 'calificaciones':
          return <TeacherGradebookView />;
        case 'seguimiento':
          return <TeacherStudentsView />;
        case 'reportes':
          return <TeacherReportsView />;
        case 'mi-perfil':
          return <UserProfileView user={user} roleInfo={authState.roleInfo} onLogout={handleLogout} />;
        default:
          return <TeacherDashboard onNavigate={handleNavigate} onOpenCreateTask={() => setShowTeacherCreate(true)} />;
      }
    }

    return <StudentDashboard user={user} onNavigate={handleNavigate} />;
  };

  return (
    <div className="app-layout">
      {/* Microsoft Teams Sidebar */}
      <Sidebar
        user={user}
        roleInfo={authState.roleInfo}
        activeSection={section}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        notifCount={unreadCount}
      />

      <div className="app-content">
        {/* Microsoft Teams Topbar */}
        <Topbar
          title={pageInfo[0]}
          subtitle={pageInfo[1]}
          user={user}
          notifCount={unreadCount}
          onOpenNotifications={() => setShowNotifs(!showNotifs)}
          onNavigate={handleNavigate}
        />

        {showNotifs && (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onClose={() => setShowNotifs(false)}
          />
        )}

        <main style={{ flex: 1 }}>
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
