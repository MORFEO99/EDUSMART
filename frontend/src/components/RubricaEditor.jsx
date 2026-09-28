import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Check, AlertCircle } from 'lucide-react';

export default function RubricaEditor({ rubrica, onChange, onSave, onCancel }) {
  const [nombre, setNombre] = useState(rubrica?.nombre || '');
  const [descripcion, setDescripcion] = useState(rubrica?.descripcion || '');
  const [criterios, setCriterios] = useState(rubrica?.criterios || [
    { id: 1, nombre: 'Presentación', descripcion: 'El formato es el correcto.', puntaje_maximo: 20 },
    { id: 2, nombre: 'Desarrollo', descripcion: 'Resuelve el problema.', puntaje_maximo: 50 },
  ]);

  const addCriterio = () => {
    setCriterios([...criterios, { id: Date.now(), nombre: '', descripcion: '', puntaje_maximo: 10 }]);
  };

  const removeCriterio = (id) => {
    setCriterios(criterios.filter(c => c.id !== id));
  };

  const updateCriterio = (id, field, value) => {
    setCriterios(criterios.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const total = criterios.reduce((sum, c) => sum + (Number(c.puntaje_maximo) || 0), 0);

  return (
    <div className="card" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 16 }}>Editor de Rúbrica</h2>
      
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label>Nombre de la rúbrica</label>
        <input 
          className="form-control" 
          value={nombre} 
          onChange={e => setNombre(e.target.value)} 
          placeholder="Ej: Rúbrica para Ensayo Final" 
        />
      </div>

      <div className="form-group" style={{ marginBottom: 24 }}>
        <label>Descripción</label>
        <textarea 
          className="form-control" 
          value={descripcion} 
          onChange={e => setDescripcion(e.target.value)} 
          rows={2} 
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Criterios de Evaluación</h3>
        <button className="btn btn-secondary btn-sm" onClick={addCriterio}>
          <Plus size={14} /> Añadir Criterio
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {criterios.map((c, index) => (
          <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#FAF9F8', padding: 12, borderRadius: 8, border: '1px solid #EDEBE9' }}>
            <div style={{ padding: '8px 4px', cursor: 'grab', color: '#8A8886' }}>
              <GripVertical size={16} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <input 
                  className="form-control" 
                  placeholder="Nombre del criterio (Ej: Ortografía)" 
                  value={c.nombre}
                  onChange={e => updateCriterio(c.id, 'nombre', e.target.value)}
                  style={{ flex: 2 }}
                />
                <input 
                  type="number"
                  className="form-control" 
                  placeholder="Pts." 
                  value={c.puntaje_maximo}
                  onChange={e => updateCriterio(c.id, 'puntaje_maximo', e.target.value)}
                  style={{ width: 80, textAlign: 'center' }}
                />
              </div>
              <textarea 
                className="form-control" 
                placeholder="Descripción detallada de lo que se evalúa en este criterio" 
                value={c.descripcion}
                onChange={e => updateCriterio(c.id, 'descripcion', e.target.value)}
                rows={1}
                style={{ fontSize: '13px' }}
              />
            </div>
            <button 
              className="btn-icon" 
              style={{ color: '#EF4444' }} 
              onClick={() => removeCriterio(c.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid #EDEBE9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: total !== 100 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
          {total !== 100 ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>Puntaje Total: {total} / 100</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ nombre, descripcion, criterios })}>
            Guardar Rúbrica
          </button>
        </div>
      </div>
    </div>
  );
}
