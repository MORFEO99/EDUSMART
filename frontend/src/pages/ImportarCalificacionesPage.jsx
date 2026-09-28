import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { Loading } from '../components';

export default function ImportarCalificacionesPage({ onNavigate, cursoId, tareaId }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [mapping, setMapping] = useState({ ru: 'RU', nota: 'NOTA', observacion: 'OBSERVACION' });
  const [columns, setColumns] = useState([]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.xlsx')) {
      setFile(dropped);
      simulateParse();
    }
  };

  const simulateParse = () => {
    setLoading(true);
    setTimeout(() => {
      setColumns(['RU', 'NOTA', 'OBSERVACION', 'ESTUDIANTE']);
      setPreview([
        { ESTUDIANTE: 'Carlos Gómez', RU: 'EST-2023-001', NOTA: 95, OBSERVACION: 'Buen trabajo' },
        { ESTUDIANTE: 'Ana Martínez', RU: 'EST-2023-002', NOTA: 92, OBSERVACION: 'Excelente' },
        { ESTUDIANTE: 'Luis Herrera', RU: 'EST-2023-003', NOTA: 105, OBSERVACION: 'Fuera de rango' }, // intentional error
      ]);
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleImport = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResults({ validadas: 28, errores: 2 });
      setStep(3);
    }, 1500);
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#242424' }}>Importar Calificaciones</h2>
        <p style={{ color: '#616161', fontSize: '13px' }}>Sube un Excel con las notas para esta tarea. El sistema verificará los datos.</p>
      </div>

      {step === 1 && (
        <div 
          style={{ border: '2px dashed #C8C6C4', borderRadius: 8, padding: 60, textAlign: 'center', background: '#FAF9F8', cursor: 'pointer' }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <FileSpreadsheet size={48} color="#107C41" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#242424', marginBottom: 8 }}>Arrastra el Excel de notas</h3>
          <p style={{ color: '#616161', fontSize: '13px', marginBottom: 20 }}>Debe contener una columna con RU y otra con Nota (0-100)</p>
          <label className="btn btn-primary">
            Examinar equipo
            <input type="file" hidden accept=".xlsx, .xls" onChange={e => {
              if(e.target.files[0]) {
                setFile(e.target.files[0]);
                simulateParse();
              }
            }} />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>Validación de Notas</h3>
          
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, padding: 16, background: '#F0F1FA', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle size={24} color="#10B981" />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#242424' }}>28</div>
                <div style={{ fontSize: '12px', color: '#616161' }}>Calificaciones Válidas</div>
              </div>
            </div>
            <div style={{ flex: 1, padding: 16, background: '#FEF0F0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertCircle size={24} color="#EF4444" />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#242424' }}>2</div>
                <div style={{ fontSize: '12px', color: '#616161' }}>Requieren Revisión</div>
              </div>
            </div>
          </div>

          <table className="teams-table" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>RU Estudiante</th>
                <th>Nota</th>
                <th>Observación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} style={{ background: r.NOTA > 100 ? '#FEF0F0' : 'transparent' }}>
                  <td style={{ fontWeight: 600 }}>{r[mapping.ru]}</td>
                  <td>{r[mapping.nota]}</td>
                  <td>{r[mapping.observacion]}</td>
                  <td>
                    {r.NOTA > 100 ? (
                      <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: 600 }}>Nota fuera de rango (0-100)</span>
                    ) : (
                      <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 600 }}>Válido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? 'Importando...' : 'Confirmar e Importar'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && results && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <CheckCircle size={64} color="#10B981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#242424', marginBottom: 8 }}>Importación Finalizada</h2>
          <p style={{ color: '#616161', marginBottom: 24 }}>Las calificaciones han sido registradas y el historial de progreso de los estudiantes ha sido actualizado.</p>
          <button className="btn btn-primary" onClick={() => onNavigate('teacher_views')}>
            Ver Libro de Calificaciones
          </button>
        </div>
      )}
    </div>
  );
}
