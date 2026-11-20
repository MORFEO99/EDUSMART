import React, { useState, useEffect } from 'react';
import { X, Phone, User, ChevronDown } from 'lucide-react';
import { alertasAPI } from '../api';

/**
 * Modal para ver y actualizar el contacto del tutor de un estudiante.
 * Usado desde la lista de estudiantes del docente.
 *
 * Props:
 *   estudianteId  - ID del estudiante
 *   nombreEstudiante - nombre para mostrar en el título
 *   onClose       - callback al cerrar
 */
export default function ContactoTutorModal({ estudianteId, nombreEstudiante, onClose }) {
  const [form, setForm] = useState({
    nombre_tutor: '',
    telefono_tutor: '',
    relacion_tutor: 'PADRE',
    telefono_estudiante: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    alertasAPI.getContactoTutor(estudianteId)
      .then(data => {
        setForm({
          nombre_tutor: data.nombre_tutor || '',
          telefono_tutor: data.telefono_tutor || '',
          relacion_tutor: data.relacion_tutor || 'PADRE',
          telefono_estudiante: data.telefono_estudiante || '',
        });
      })
      .catch(() => setMsg('No se pudieron cargar los datos del tutor.'))
      .finally(() => setLoading(false));
  }, [estudianteId]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await alertasAPI.updateContactoTutor(estudianteId, form);
      setMsg('✅ Contacto actualizado correctamente.');
    } catch (err) {
      setMsg('❌ Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 7,
    border: '1.5px solid #E2E8F0',
    fontSize: 13,
    color: '#1E293B',
    background: '#F8FAFC',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11.5,
    fontWeight: 700,
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 14, padding: 28, width: '100%',
        maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>
              📱 Contacto del Tutor
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Alumno: <strong>{nombreEstudiante}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748B', padding: '20px 0' }}>Cargando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Teléfono del estudiante */}
            <div>
              <label style={labelStyle}>📱 Teléfono del Estudiante (WhatsApp)</label>
              <input
                style={inputStyle}
                type="tel"
                placeholder="Ej: 59178901234"
                value={form.telefono_estudiante}
                onChange={e => setForm(f => ({ ...f, telefono_estudiante: e.target.value }))}
              />
              <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 3 }}>
                Formato internacional (591 = Bolivia). Se actualiza en su perfil.
              </div>
            </div>

            {/* Relación */}
            <div>
              <label style={labelStyle}>Relación con el Estudiante</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.relacion_tutor}
                onChange={e => setForm(f => ({ ...f, relacion_tutor: e.target.value }))}
              >
                <option value="PADRE">Padre</option>
                <option value="MADRE">Madre</option>
                <option value="TUTOR">Tutor Legal</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            {/* Nombre tutor */}
            <div>
              <label style={labelStyle}>Nombre del {form.relacion_tutor === 'TUTOR' ? 'Tutor' : form.relacion_tutor === 'OTRO' ? 'Contacto' : form.relacion_tutor}</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Ej: Juan Pérez Mamani"
                value={form.nombre_tutor}
                onChange={e => setForm(f => ({ ...f, nombre_tutor: e.target.value }))}
              />
            </div>

            {/* Teléfono tutor */}
            <div>
              <label style={labelStyle}>📲 WhatsApp del Tutor / Padre</label>
              <input
                style={inputStyle}
                type="tel"
                placeholder="Ej: 59172345678"
                value={form.telefono_tutor}
                onChange={e => setForm(f => ({ ...f, telefono_tutor: e.target.value }))}
              />
              <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 3 }}>
                Las alertas de bajo rendimiento y tareas vencidas se enviarán a este número.
              </div>
            </div>

            {/* Mensaje de feedback */}
            {msg && (
              <div style={{
                padding: '8px 12px', borderRadius: 7,
                background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2',
                color: msg.startsWith('✅') ? '#15803D' : '#B91C1C',
                fontSize: 12.5, fontWeight: 600
              }}>
                {msg}
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '9px 18px', borderRadius: 7, border: '1.5px solid #E2E8F0',
                  background: '#F8FAFC', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 20px', borderRadius: 7, border: 'none',
                  background: saving ? '#94A3B8' : '#1E3A8A', color: '#FFFFFF',
                  fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Guardando...' : '💾 Guardar Contacto'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
