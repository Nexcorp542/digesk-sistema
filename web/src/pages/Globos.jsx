import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';
import RecordList from '../components/RecordList';
import { money, fechaInputValue, round2, todayISO } from '../utils/format';

const emptyForm = {
  fecha: todayISO(),
  cliente: '',
  cantidad: '',
  colores: 1,
  precio: '',
  costo: '',
  abono: '',
  nota: '',
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
    cantidad: d.cantidad ?? '',
    colores: d.colores ?? 1,
    precio: d.precio ?? '',
    costo: d.inversion ?? '',
    abono: d.abono ?? '',
    nota: d.nota || '',
  };
}

export default function Globos() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadDocs = () => apiGet('/api/globos').then(setDocs);
  useEffect(() => { loadDocs().finally(() => setLoading(false)); }, []);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const precio = Number(form.precio) || 0;
  const costo = Number(form.costo) || 0; // aquí "costo" ya es la inversión total, no por unidad
  const abono = Number(form.abono) || 0;
  const utilidad = round2(precio - costo);
  const saldo = round2(precio - abono);

  const buildPayload = () => ({
    fecha: form.fecha, cliente: form.cliente,
    cantidad: Number(form.cantidad) || 0, colores: Number(form.colores) || 0,
    inversion: costo, precio, utilidad, saldo, abono, nota: form.nota,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await apiPatch(`/api/globos/${editingId}`, buildPayload());
    } else {
      await apiPost('/api/globos', buildPayload());
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
    await apiPatch(`/api/globos/${doc.id}`, {
      abono: Number(doc.precio || 0),
      saldo: 0,
      fechaPago: new Date().toISOString(),
    });
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await apiDelete(`/api/globos/${id}`);
    if (editingId === id) cancelarEdicion();
    loadDocs();
  };

  if (loading) return <p className="p-6 text-neutral-500">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-white text-xl font-semibold mb-6">Globos</h1>

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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad">
              <input type="number" value={form.cantidad} onChange={(e) => handleChange('cantidad', e.target.value)} className={inputClass} />
            </Field>
            <Field label="N° de colores">
              <input type="number" value={form.colores} onChange={(e) => handleChange('colores', e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio de venta">
              <input type="number" step="0.01" value={form.precio} onChange={(e) => handleChange('precio', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
            <Field label="Abono">
              <input type="number" step="0.01" value={form.abono} onChange={(e) => handleChange('abono', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
          </div>
          <Field label="Inversión total (costo real)">
            <input type="number" step="0.01" value={form.costo} onChange={(e) => handleChange('costo', e.target.value)} placeholder="S/." className={inputClass} />
          </Field>
          <Field label="Nota">
            <input value={form.nota} onChange={(e) => handleChange('nota', e.target.value)} placeholder="Opcional" className={inputClass} />
          </Field>

          <div className="grid grid-cols-3 gap-2 text-center bg-neutral-800/60 rounded-xl py-3">
            <Resumen label="Venta" value={precio} />
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
            { key: 'precio', label: 'Venta' },
            { key: 'utilidad', label: 'Utilidad' },
            { key: 'saldo', label: 'Saldo' },
          ]}
          titleFn={(d) => `Globos${d.cliente ? ` · ${d.cliente}` : ''}`}
          subtitleFn={(d) => `${d.cantidad || 0} unidades, ${d.colores || 0} colores · Ver detalles`}
          onEdit={handleEdit}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}