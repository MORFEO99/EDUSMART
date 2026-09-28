import { useState } from 'react';
import { User, Mail, Shield, BookOpen, Award, LogOut, CheckCircle, Calendar, GraduationCap } from 'lucide-react';
import { getInitials } from '../utils';

export default function UserProfileView({ user, roleInfo, onLogout }) {
  if (!user) return null;

  const roleLabels = {
    'ESTUDIANTE': 'Estudiante',
    'DOCENTE': 'Docente'
  };

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#242424', marginBottom: 4 }}>
          Mi Perfil de Usuario
        </h2>
        <p style={{ color: '#616161', fontSize: '12.5px' }}>
          Información personal, credenciales institucionales y rol asignado en la plataforma.
        </p>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 20, borderBottom: '1px solid #EDEBE9' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              backgroundColor: '#5B5FC7', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 600, overflow: 'hidden'
            }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={e => { e.target.style.display = 'none'; }} />
              ) : getInitials(user.nombre_completo)}
            </div>
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 14, height: 14, borderRadius: '50%',
              backgroundColor: '#107C41', border: '2.5px solid #FFFFFF'
            }} title="Disponible" />
          </div>

          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#242424' }}>{user.nombre_completo}</h3>
            <p style={{ fontSize: '12.5px', color: '#616161', marginTop: 2 }}>{user.email || `${user.username}@edusmart.edu`}</p>
            <span className="badge badge-en_proceso" style={{ marginTop: 6 }}>
              {roleLabels[user.rol] || user.rol}
            </span>
          </div>
        </div>

        {/* Detailed Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          <div style={{ background: '#FAF9F8', padding: '12px 14px', borderRadius: '4px', border: '1px solid #EDEBE9' }}>
            <span style={{ fontSize: '11px', color: '#8A8886', textTransform: 'uppercase', fontWeight: 600 }}>Usuario</span>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#242424', marginTop: 2 }}>{user.username}</div>
          </div>

          <div style={{ background: '#FAF9F8', padding: '12px 14px', borderRadius: '4px', border: '1px solid #EDEBE9' }}>
            <span style={{ fontSize: '11px', color: '#8A8886', textTransform: 'uppercase', fontWeight: 600 }}>Estado de la Cuenta</span>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#107C41', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} /> Activo / Verificado
            </div>
          </div>

          {user.rol === 'ESTUDIANTE' && (
            <>
              <div style={{ background: '#FAF9F8', padding: '12px 14px', borderRadius: '4px', border: '1px solid #EDEBE9' }}>
                <span style={{ fontSize: '11px', color: '#8A8886', textTransform: 'uppercase', fontWeight: 600 }}>Matrícula</span>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#242424', marginTop: 2 }}>
                  {roleInfo?.matricula || user.matricula || 'EST-2026-001'}
                </div>
              </div>

              <div style={{ background: '#FAF9F8', padding: '12px 14px', borderRadius: '4px', border: '1px solid #EDEBE9' }}>
                <span style={{ fontSize: '11px', color: '#8A8886', textTransform: 'uppercase', fontWeight: 600 }}>Grado y Paralelo</span>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#242424', marginTop: 2 }}>
                  {roleInfo?.grado ? `${roleInfo.grado} "${roleInfo.paralelo}"` : 'Tercer Año "A"'}
                </div>
              </div>
            </>
          )}

          {user.rol === 'DOCENTE' && (
            <>
              <div style={{ background: '#FAF9F8', padding: '12px 14px', borderRadius: '4px', border: '1px solid #EDEBE9' }}>
                <span style={{ fontSize: '11px', color: '#8A8886', textTransform: 'uppercase', fontWeight: 600 }}>Especialidad</span>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#242424', marginTop: 2 }}>
                  {roleInfo?.especialidad || 'Ciencias Exactas e Informática'}
                </div>
              </div>

              <div style={{ background: '#FAF9F8', padding: '12px 14px', borderRadius: '4px', border: '1px solid #EDEBE9' }}>
                <span style={{ fontSize: '11px', color: '#8A8886', textTransform: 'uppercase', fontWeight: 600 }}>Departamento</span>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#242424', marginTop: 2 }}>
                  {roleInfo?.departamento || 'Facultad de Ingeniería'}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #EDEBE9', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-danger btn-sm" onClick={onLogout}>
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
