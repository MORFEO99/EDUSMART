import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ClipboardList, Plus, Settings, MoreVertical, ArrowLeft } from 'lucide-react';
import { Loading, EmptyState, ProgressBar, Modal } from '../components';
import { commonAPI } from '../api';

export default function CursoPage({ onNavigate, colegioId, cursoId }) {
  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock curso detail
    setCurso({
      id: cursoId || 1,
      grado: '3ro',
      paralelo: 'A',
      nivel: 'Bachillerato',
      estudiantes: [
        { id: 1, nombre: 'Carlos Gómez', ru: 'EST-2023-001', progreso: 85, estado: 'Activo' },
        { id: 2, nombre: 'Ana Martínez', ru: 'EST-2023-002', progreso: 92, estado: 'Activo' },
        { id: 3, nombre: 'Luis Herrera', ru: 'EST-2023-003', progreso: 45, estado: 'Activo' }
      ],
      materias: [
        { id: 1, nombre: 'Bases de Datos I', docente: 'Prof. Carlos Pérez', total_tareas: 5 },
        { id: 2, nombre: 'Programación Web', docente: 'Prof. Carlos Pérez', total_tareas: 3 }
      ]
    });
    setLoading(false);
  }, [cursoId]);

  if (loading) return <Loading text="Cargando curso..." />;
  if (!curso) return <EmptyState title="Curso no encontrado" />;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => onNavigate('colegios')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
            {curso.grado} "{curso.paralelo}"
          </h2>
          <p style={{ color: '#616161', fontSize: '13px' }}>{curso.nivel}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* ESTUDIANTES SECTION */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDEBE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} /> Estudiantes ({curso.estudiantes.length})
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('import_students', { cursoId: curso.id })}>
                Importar Excel
              </button>
              <button className="btn btn-primary btn-sm">
                <Plus size={14} /> Añadir
              </button>
            </div>
          </div>
          <div className="teams-table-container">
            <table className="teams-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>RU / Matrícula</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {curso.estudiantes.map(est => (
                  <tr key={est.id}>
                    <td style={{ fontWeight: 600 }}>{est.nombre}</td>
                    <td>{est.ru}</td>
                    <td style={{ width: 150 }}>
                      <ProgressBar value={est.progreso} color={est.progreso >= 80 ? 'success' : 'warning'} height={6} showLabel />
                    </td>
                    <td><span className="badge badge-calificada">{est.estado}</span></td>
                    <td><button className="btn" style={{ padding: 4, background: 'transparent' }}><MoreVertical size={16} color="#616161" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MATERIAS SECTION */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDEBE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} /> Mis Materias
            </h3>
            <button className="btn btn-secondary btn-sm"><Plus size={14} /></button>
          </div>
          <div style={{ padding: '12px 20px' }}>
            {curso.materias.map(mat => (
              <div key={mat.id} style={{ padding: '12px 0', borderBottom: '1px solid #F3F2F1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#242424' }}>{mat.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#616161', marginTop: 4 }}>{mat.total_tareas} tareas publicadas</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('teacher_dashboard')}>
                  Ver Espacio
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
