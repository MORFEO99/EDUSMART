import { useState, useEffect } from 'react';
import { Download, FileText, ArrowUpDown, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { studentAPI } from '../api';
import { Loading, EmptyState, Modal } from '../components';

export default function StudentGradesView() {
  const [trimestre, setTrimestre] = useState('3');
  const [boletinData, setBoletinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('materia');
  const [sortAsc, setSortAsc] = useState(true);
  const [modalDetail, setModalDetail] = useState(null);

  useEffect(() => {
    setLoading(true);
    studentAPI.boletin(trimestre)
      .then(res => setBoletinData(res))
      .catch(err => console.error('Error cargando boletín:', err))
      .finally(() => setLoading(false));
  }, [trimestre]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(col === 'materia');
    }
  };

  const descargarBoletinPDF = () => {
    if (!boletinData?.estudiante?.id) return;
    window.open(`/api/v2/estudiantes/${boletinData.estudiante.id}/boletin-pdf/`, '_blank');
  };

  const materias = boletinData?.materias || [];
  const sortedMaterias = [...materias].sort((a, b) => {
    let valA = a[sortCol];
    let valB = b[sortCol];
    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    valA = valA ?? 0;
    valB = valB ?? 0;
    return sortAsc ? valA - valB : valB - valA;
  });

  const openCellDetail = (mat, categoriaLabel, items) => {
    setModalDetail({
      materia: mat.materia,
      docente: mat.docente,
      categoria: categoriaLabel,
      items: items || []
    });
  };

  const thStyle = {
    padding: '11px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    borderRight: '1px solid #E2E8F0',
    borderBottom: '1px solid #CBD5E1',
    background: '#F8FAFC',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '11px 14px',
    fontSize: 13,
    borderRight: '1px solid #E2E8F0',
    borderBottom: '1px solid #E2E8F0',
    whiteSpace: 'nowrap'
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 40 }}>
      {/* Cabecera compacta y selector de Trimestre */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Boletín de Calificaciones
          </h1>
          {boletinData && (
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {boletinData.colegio?.nombre} · {boletinData.curso?.nombre} · Gestión {boletinData.curso?.anio_lectivo || 2026}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Selector de Trimestre */}
          <div style={{
            display: 'inline-flex',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: 3,
            gap: 2
          }}>
            {[
              { id: '1', label: '1er Trimestre' },
              { id: '2', label: '2do Trimestre' },
              { id: '3', label: '3er Trimestre' },
              { id: 'all', label: 'Anual' },
            ].map(t => {
              const active = trimestre === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTrimestre(t.id)}
                  style={{
                    background: active ? '#1E3A8A' : 'transparent',
                    color: active ? '#FFFFFF' : '#475569',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={descargarBoletinPDF}
            disabled={!boletinData?.estudiante?.id}
            style={{
              background: '#059669',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Download size={14} />
            <span>Boletín PDF</span>
          </button>
        </div>
      </div>

      {/* Tabla Minimalista estilo Cuadro de Notas */}
      {loading ? (
        <Loading text="Cargando calificaciones del trimestre..." />
      ) : sortedMaterias.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin materias registradas"
          description="No se encontraron materias asignadas para este período."
        />
      ) : (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 780 }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort('materia')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span>MATERIA</span>
                      <ArrowUpDown size={12} color="#94A3B8" />
                    </div>
                  </th>
                  <th style={thStyle} onClick={() => handleSort('nota_tareas')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span>TAREAS PRESENTADAS</span>
                      <ArrowUpDown size={12} color="#94A3B8" />
                    </div>
                  </th>
                  <th style={thStyle} onClick={() => handleSort('nota_practicas')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span>PRÁCTICAS</span>
                      <ArrowUpDown size={12} color="#94A3B8" />
                    </div>
                  </th>
                  <th style={thStyle} onClick={() => handleSort('nota_evaluaciones_ia')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span>EVALUACIONES IA</span>
                      <ArrowUpDown size={12} color="#94A3B8" />
                    </div>
                  </th>
                  <th style={thStyle} onClick={() => handleSort('nota_examenes')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span>EXÁMENES</span>
                      <ArrowUpDown size={12} color="#94A3B8" />
                    </div>
                  </th>
                  <th style={{ ...thStyle, borderRight: 'none' }} onClick={() => handleSort('promedio')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span>PROMEDIO</span>
                      <ArrowUpDown size={12} color="#94A3B8" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMaterias.map((mat, idx) => (
                  <tr
                    key={mat.materia_id || idx}
                    style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}
                  >
                    <td style={{ ...tdStyle, color: '#334155', fontWeight: 500 }}>
                      {mat.materia}
                    </td>
                    <td style={tdStyle}>
                      <span
                        onClick={() => openCellDetail(mat, 'Tareas Presentadas', mat.tareas)}
                        style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
                        title="Ver detalle de tareas"
                      >
                        {mat.nota_tareas ?? 0}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        onClick={() => openCellDetail(mat, 'Prácticas', mat.practicas)}
                        style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
                        title="Ver detalle de prácticas"
                      >
                        {mat.nota_practicas ?? 0}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        onClick={() => openCellDetail(mat, 'Evaluaciones IA', mat.evaluaciones)}
                        style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
                        title="Ver detalle de evaluaciones IA"
                      >
                        {mat.nota_evaluaciones_ia ?? 0}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        onClick={() => openCellDetail(mat, 'Exámenes', mat.examenes)}
                        style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
                        title="Ver detalle de exámenes"
                      >
                        {mat.nota_examenes ?? 0}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, borderRight: 'none', color: '#0F172A', fontWeight: 700 }}>
                      {mat.promedio ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal limpio de detalle al hacer clic en una nota */}
      {modalDetail && (
        <Modal
          isOpen={!!modalDetail}
          onClose={() => setModalDetail(null)}
          title={`${modalDetail.materia} — ${modalDetail.categoria}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Docente: <strong style={{ color: '#0F172A' }}>{modalDetail.docente}</strong>
            </div>

            {modalDetail.items.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 13, background: '#F8FAFC', borderRadius: 8 }}>
                No hay registros en {modalDetail.categoria.toLowerCase()} para este trimestre.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {modalDetail.items.map((item, i) => (
                  <div key={item.id || i} style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    background: '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.titulo}</span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: item.nota !== null ? '#1E3A8A' : '#64748B'
                      }}>
                        {item.nota !== null ? `${item.nota} / 100` : item.estado}
                      </span>
                    </div>
                    {item.retroalimentacion && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#475569', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <MessageSquare size={12} style={{ marginTop: 2, flexShrink: 0, color: '#1E3A8A' }} />
                        <span>{item.retroalimentacion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setModalDetail(null)}
                style={{
                  background: '#1E3A8A', color: '#FFFFFF', border: 'none',
                  borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
