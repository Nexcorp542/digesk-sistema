import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';
import RecordList from '../components/RecordList';
import { money, fechaInputValue, round2, todayISO } from '../utils/format';

const emptyForm = {
  fecha: todayISO(),
  cliente: '',
  material: 'Mate',
  millares: 1,
  precioVenta: '',
  costo: '',
  abono: '',
};

const inputClass = "w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm";
function Field({ label, children }) {
  return <div><label className="text-xs text-neutral-400">{label}</label>{children}</div>;
}
function Resumen({ label, value, color = 'text-white' }) {
  return <div><p className="text-neutral-500 text-xs">{label}</p><p className={`font-medium ${color}`}>{money(value)}</p></div>;
}

function docToForm(d) {
  return {
    fecha: fechaInputValue(d.fecha),
    cliente: d.cliente || '',
    material: d.material || 'Mate',
    millares: d.millares ?? 1,
    precioVenta: d.precioUnit ?? '',
    costo: d.millares ? round2((d.inversion ?? 0) / d.millares) : '',
    abono: d.abono ?? '',
  };
}

export default function Tarjetas() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadDocs = () => apiGet('/api/tarjetas').then(setDocs);
  useEffect(() => { loadDocs().finally(() => setLoading(false)); }, []);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const millares = Number(form.millares) || 0;
  const precioVenta = Number(form.precioVenta) || 0;
  const costo = Number(form.costo) || 0;
  const abono = Number(form.abono) || 0;
  const total = round2(millares * precioVenta);
  const inversion = round2(millares * costo);
  const utilidad = round2(total - inversion);
  const saldo = round2(total - abono);

  const buildPayload = () => ({
    fecha: form.fecha, cliente: form.cliente, material: form.material,
    millares, precioUnit: precioVenta, inversion, total, utilidad, saldo, abono,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await apiPatch(`/api/tarjetas/${editingId}`, buildPayload());
    } else {
      await apiPost('/api/tarjetas', buildPayload());
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
    await apiPatch(`/api/tarjetas/${doc.id}`, {
      abono: Number(doc.total || 0),
      saldo: 0,
      fechaPago: new Date().toISOString(),
    });
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await apiDelete(`/api/tarjetas/${id}`);
    if (editingId === id) cancelarEdicion();
    loadDocs();
  };

  if (loading) return <p className="p-6 text-neutral-500">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-white text-xl font-semibold mb-6">Tarjetas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
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
            <Field label="Cliente">
              <input value={form.cliente} onChange={(e) => handleChange('cliente', e.target.value)} placeholder="Nombre o celular" className={inputClass} />
            </Field>
          </div>

          <Field label="Material">
            <select value={form.material} onChange={(e) => handleChange('material', e.target.value)} className={inputClass}>
              <option>Mate</option>
              <option>Brillante</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Millares">
              <input type="number" min="1" value={form.millares} onChange={(e) => handleChange('millares', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Abono">
              <input type="number" step="0.01" value={form.abono} onChange={(e) => handleChange('abono', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio venta (x millar)">
              <input type="number" step="0.01" value={form.precioVenta} onChange={(e) => handleChange('precioVenta', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
            <Field label="Costo real (x millar)">
              <input type="number" step="0.01" value={form.costo} onChange={(e) => handleChange('costo', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-neutral-800/60 rounded-xl py-3">
            <Resumen label="Total" value={total} />
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
            { key: 'total', label: 'Total' },
            { key: 'utilidad', label: 'Utilidad' },
            { key: 'saldo', label: 'Saldo' },
          ]}
          titleFn={(d) => `${d.material}${d.cliente ? ` · ${d.cliente}` : ''}`}
          subtitleFn={(d) => `${d.millares} millar${d.millares === 1 ? '' : 'es'} · Ver detalles`}
          onEdit={handleEdit}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}