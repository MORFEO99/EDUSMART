import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, ChevronRight, Save } from 'lucide-react';

export default function ImportStudentsPage({ onNavigate, cursoId }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({ nombre: '', correo: '', ru: '' });
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.xlsx')) {
      setFile(dropped);
      simulateParse(dropped);
    }
  };

  const simulateParse = (f) => {
    setLoading(true);
    setTimeout(() => {
      // Mocked columns and preview
      setColumns(['ESTUDIANTE', 'REGISTRO', 'GRADO', 'SECCION', 'EMAIL']);
      setMapping({ nombre: 'ESTUDIANTE', correo: 'EMAIL', ru: 'REGISTRO' });
      setPreview([
        { ESTUDIANTE: 'Juan Pérez', REGISTRO: '12345', EMAIL: 'juan@est.com' },
        { ESTUDIANTE: 'María López', REGISTRO: '12346', EMAIL: 'maria@est.com' },
        { ESTUDIANTE: 'Carlos Gómez', REGISTRO: '12347', EMAIL: 'carlos@est.com' },
      ]);
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleImport = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResults({ nuevos: 32, duplicados: 3, errores: 0 });
      setStep(3);
    }, 1500);
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#242424' }}>Importar Estudiantes (Excel)</h2>
        <p style={{ color: '#616161', fontSize: '13px' }}>Añade estudiantes a tus cursos masivamente usando archivos .xlsx</p>
      </div>

      {step === 1 && (
        <div 
          style={{ border: '2px dashed #C8C6C4', borderRadius: 8, padding: 60, textAlign: 'center', background: '#FAF9F8', cursor: 'pointer' }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <FileSpreadsheet size={48} color="#107C41" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#242424', marginBottom: 8 }}>Arrastra tu archivo Excel aquí</h3>
          <p style={{ color: '#616161', fontSize: '13px', marginBottom: 20 }}>Formatos soportados: .xlsx, .xls</p>
          <label className="btn btn-primary">
            Examinar equipo
            <input type="file" hidden accept=".xlsx, .xls" onChange={e => {
              if(e.target.files[0]) {
                setFile(e.target.files[0]);
                simulateParse(e.target.files[0]);
              }
            }} />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 16 }}>Relacionar Columnas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: 8 }}>Nombre Completo *</label>
              <select className="form-control" value={mapping.nombre} onChange={e => setMapping({...mapping, nombre: e.target.value})}>
                <option value="">Seleccionar columna...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: 8 }}>RU / Código *</label>
              <select className="form-control" value={mapping.ru} onChange={e => setMapping({...mapping, ru: e.target.value})}>
                <option value="">Seleccionar columna...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: 8 }}>Correo Electrónico</label>
              <select className="form-control" value={mapping.correo} onChange={e => setMapping({...mapping, correo: e.target.value})}>
                <option value="">Seleccionar columna...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12 }}>Vista Previa (Primeras filas)</h3>
          <table className="teams-table" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>Nombre Extraído</th>
                <th>RU Extraído</th>
                <th>Correo Extraído</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i}>
                  <td>{r[mapping.nombre] || '---'}</td>
                  <td>{r[mapping.ru] || '---'}</td>
                  <td>{r[mapping.correo] || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? 'Importando...' : 'Confirmar Importación'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && results && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <CheckCircle size={64} color="#10B981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#242424', marginBottom: 8 }}>¡Importación Completada!</h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, margin: '24px 0', background: '#F0F1FA', padding: 24, borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#10B981' }}>{results.nuevos}</div>
              <div style={{ fontSize: '13px', color: '#616161' }}>Estudiantes nuevos</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#F59E0B' }}>{results.duplicados}</div>
              <div style={{ fontSize: '13px', color: '#616161' }}>Duplicados (omitidos)</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#EF4444' }}>{results.errores}</div>
              <div style={{ fontSize: '13px', color: '#616161' }}>Errores</div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => onNavigate('teacher_dashboard')}>
            Volver al Inicio
          </button>
        </div>
      )}
    </div>
  );
}
