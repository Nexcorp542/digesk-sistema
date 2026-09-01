import { useState } from 'react';
import { money, formatFecha, formatFechaHora } from '../utils/format';
import Modal from './Modal';

// Campos técnicos que no se muestran en el detalle (o se muestran aparte).
const OCULTOS = new Set(['id', 'creadoEn', 'fechaPago']);

function labelize(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

function DetalleModal({ doc, onClose }) {
  const entradas = Object.entries(doc).filter(([k, v]) => !OCULTOS.has(k) && v !== undefined && v !== '');

  return (
    <Modal title={doc.cliente || doc.tipoSello || doc.tipoTrabajo || doc.categoria || 'Detalle'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3 bg-neutral-800/60 rounded-lg p-3">
          <div>
            <p className="text-neutral-500 text-xs">Fecha de registro (en el sistema)</p>
            <p className="text-white">{formatFechaHora(doc.creadoEn)}</p>
          </div>
          {doc.fechaPago && (
            <div>
              <p className="text-neutral-500 text-xs">Marcado como pagado el</p>
              <p className="text-emerald-400">{formatFechaHora(doc.fechaPago)}</p>
            </div>
          )}
        </div>

        {doc.items && doc.items.length > 0 && (
          <div>
            <p className="text-neutral-500 text-xs uppercase mb-1">Ítems</p>
            <table className="w-full text-xs">
              <tbody>
                {doc.items.filter((it) => it.total > 0).map((it) => (
                  <tr key={it.key} className="border-t border-neutral-800">
                    <td className="py-1 text-neutral-300">{it.label}</td>
                    <td className="py-1 text-neutral-400">{it.cantidad} × {money(it.precio)}</td>
                    <td className="py-1 text-white text-right">{money(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <p className="text-neutral-500 text-xs uppercase mb-1">Datos</p>
          <table className="w-full text-xs">
            <tbody>
              {entradas.filter(([k]) => k !== 'items').map(([k, v]) => (
                <tr key={k} className="border-t border-neutral-800">
                  <td className="py-1.5 text-neutral-500 pr-3">{labelize(k)}</td>
                  <td className="py-1.5 text-white text-right">
                    {k === 'fecha'
                        ? formatFecha(v)
                        : typeof v === 'boolean'
                        ? (v ? 'Sí' : 'No')
                        : typeof v === 'number'
                        ? (Number.isInteger(v) ? v : money(v).replace('S/. ', ''))
                        : String(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

export default function RecordList({ docs, summaryFields, titleFn, subtitleFn, onEdit, onMarkPaid, onDelete, editingId }) {
  const [detalleDoc, setDetalleDoc] = useState(null);

  if (docs.length === 0) return <p className="text-neutral-500 text-sm">Sin registros todavía.</p>;

  return (
    <div className="space-y-2">
      {docs.map((d) => {
        const tieneSaldo = Number(d.saldo) > 0;
        const enEdicion = editingId === d.id;

        return (
          <div
            key={d.id}
            className={`bg-neutral-900 border rounded-xl p-4 flex items-center justify-between gap-4 ${
              enEdicion ? 'border-emerald-600' : 'border-neutral-800'
            }`}
          >
            <button onClick={() => setDetalleDoc(d)} className="text-left min-w-0">
              <p className="text-white font-medium truncate">{titleFn(d)}</p>
              <p className="text-neutral-500 text-xs">{subtitleFn ? subtitleFn(d) : formatFecha(d.fecha)} · Ver detalles</p>
            </button>

            <div className="flex items-center gap-5 text-sm shrink-0">
              {summaryFields.map((f) => (
                <div key={f.key} className="text-right">
                  <p className="text-neutral-500 text-xs">{f.label}</p>
                  <p className={f.key === 'saldo' && tieneSaldo ? 'text-amber-400' : 'text-white'}>
                    {money(d[f.key])}
                  </p>
                </div>
              ))}
              <div className="flex gap-3">
                {tieneSaldo && onMarkPaid && (
                  <button onClick={() => onMarkPaid(d)} className="text-emerald-400 text-xs whitespace-nowrap">Marcar pagado</button>
                )}
                <button onClick={() => onEdit(d)} className="text-neutral-300 text-xs">
                  {enEdicion ? 'Editando...' : 'Editar'}
                </button>
                <button onClick={() => onDelete(d.id)} className="text-red-400 text-xs">Eliminar</button>
              </div>
            </div>
          </div>
        );
      })}

      {detalleDoc && <DetalleModal doc={detalleDoc} onClose={() => setDetalleDoc(null)} />}
    </div>
  );
}