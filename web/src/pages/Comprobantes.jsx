import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';
import RecordList from '../components/RecordList';
import { money, fechaInputValue } from '../utils/format';

const ITEMS = [
  { key: 'pasada', label: 'Pasada' },
  { key: 'numeracion', label: 'Numeración' },
  { key: 'placa', label: 'Placa' },
  { key: 'hojas', label: 'Hojas' },
];

const emptyForm = {
  fecha: new Date().toISOString().slice(0, 10),
  cliente: '',
  numeroCliente: '',
  pasadaPrecio: '', pasadaCantidad: '',
  numeracionPrecio: '', numeracionCantidad: '',
  placaPrecio: '', placaCantidad: '',
  hojasPrecio: '', hojasCantidad: '',
  totalVenta: '',
  abono: '',
};

const inputClass = "w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm";
function Field({ label, children }) {
  return <div><label className="text-xs text-neutral-400">{label}</label>{children}</div>;
}
function Resumen({ label, value, color = 'text-white' }) {
  return <div><p className="text-neutral-500 text-xs">{label}</p><p className={`font-medium ${color}`}>{money(value)}</p></div>;
}

function calcularItems(form) {
  return ITEMS.map((it) => {
    const precio = Number(form[`${it.key}Precio`]) || 0;
    const cantidad = Number(form[`${it.key}Cantidad`]) || 0;
    return { ...it, precio, cantidad, total: precio * cantidad };
  });
}

// Reconstruye los campos del formulario a partir del array `items` guardado.
function docToForm(d) {
  const base = {
    fecha: fechaInputValue(d.fecha),
    cliente: d.cliente || '',
    numeroCliente: d.numeroCliente || '',
    totalVenta: d.total ?? '',
    abono: d.abono ?? '',
  };
  ITEMS.forEach((it) => {
    const item = (d.items || []).find((x) => x.key === it.key);
    base[`${it.key}Precio`] = item?.precio ?? '';
    base[`${it.key}Cantidad`] = item?.cantidad ?? '';
  });
  return base;
}

export default function Comprobantes() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creando uno nuevo

  const loadDocs = () => apiGet('/api/comprobantes').then(setDocs);
  useEffect(() => { loadDocs().finally(() => setLoading(false)); }, []);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const items = calcularItems(form);
  const inversion = items.reduce((sum, it) => sum + it.total, 0);
  const totalVenta = Number(form.totalVenta) || 0;
  const abono = Number(form.abono) || 0;
  const saldo = totalVenta - abono;
  const utilidad = totalVenta - inversion;

  const buildPayload = () => ({
    fecha: form.fecha,
    cliente: form.cliente,
    numeroCliente: form.numeroCliente,
    items: items.map(({ key, label, precio, cantidad, total }) => ({ key, label, precio, cantidad, total })),
    inversion, total: totalVenta, abono, saldo, utilidad,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await apiPatch(`/api/comprobantes/${editingId}`, buildPayload());
    } else {
      await apiPost('/api/comprobantes', buildPayload());
    }
    setSaving(false);
    cancelarEdicion();
    loadDocs();
  };

  const handleEdit = (doc) => {
    setForm(docToForm(doc));
    setEditingId(doc.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleMarkPaid = async (doc) => {
    await apiPatch(`/api/comprobantes/${doc.id}`, {
      abono: Number(doc.total || 0),
      saldo: 0,
      fechaPago: new Date().toISOString(),
    });
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await apiDelete(`/api/comprobantes/${id}`);
    if (editingId === id) cancelarEdicion();
    loadDocs();
  };

  if (loading) return <p className="p-6 text-neutral-500">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-white text-xl font-semibold mb-6">Comprobantes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 lg:sticky lg:top-6">
          {editingId && (
            <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800 rounded-lg px-3 py-2">
              <p className="text-emerald-400 text-xs">Editando registro existente</p>
              <button type="button" onClick={cancelarEdicion} className="text-neutral-400 text-xs">Cancelar</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" value={form.fecha} onChange={(e) => handleChange('fecha', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Cliente / Trabajo">
              <input value={form.cliente} onChange={(e) => handleChange('cliente', e.target.value)} placeholder="Nombre o trabajo" className={inputClass} />
            </Field>
          </div>

          <Field label="Número del cliente">
            <input value={form.numeroCliente} onChange={(e) => handleChange('numeroCliente', e.target.value)} placeholder="999 999 999" className={inputClass} />
          </Field>

          <div className="border-t border-neutral-800 pt-3 space-y-3">
            <p className="text-xs text-neutral-500 uppercase">Ítems (costo / inversión)</p>
            {ITEMS.map((it) => {
              const precio = Number(form[`${it.key}Precio`]) || 0;
              const cantidad = Number(form[`${it.key}Cantidad`]) || 0;
              return (
                <div key={it.key} className="grid grid-cols-3 gap-2 items-end">
                  <Field label={`${it.label} · precio`}>
                    <input type="number" step="0.01" value={form[`${it.key}Precio`]}
                      onChange={(e) => handleChange(`${it.key}Precio`, e.target.value)} placeholder="S/." className={inputClass} />
                  </Field>
                  <Field label="Cantidad">
                    <input type="number" step="1" value={form[`${it.key}Cantidad`]}
                      onChange={(e) => handleChange(`${it.key}Cantidad`, e.target.value)} className={inputClass} />
                  </Field>
                  <p className="text-xs text-neutral-500 pb-2">Total: <span className="text-white">{money(precio * cantidad)}</span></p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-neutral-800 pt-3">
            <Field label="Total venta">
              <input type="number" step="0.01" value={form.totalVenta} onChange={(e) => handleChange('totalVenta', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
            <Field label="Abono / pagado">
              <input type="number" step="0.01" value={form.abono} onChange={(e) => handleChange('abono', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-neutral-800/60 rounded-xl py-3">
            <Resumen label="Inversión" value={inversion} />
            <Resumen label="Venta" value={totalVenta} />
            <Resumen label="Utilidad" value={utilidad} color="text-emerald-400" />
            <Resumen label="Saldo" value={saldo} color={saldo > 0 ? 'text-amber-400' : 'text-white'} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5">
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar venta'}
          </button>
        </form>

        <RecordList
          docs={docs}
          editingId={editingId}
          summaryFields={[
            { key: 'total', label: 'Venta' },
            { key: 'utilidad', label: 'Utilidad' },
            { key: 'saldo', label: 'Saldo' },
          ]}
          titleFn={(d) => `${d.cliente || '(sin nombre)'}${d.numeroCliente ? ` · ${d.numeroCliente}` : ''}`}
          onEdit={handleEdit}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}