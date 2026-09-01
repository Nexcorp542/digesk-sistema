import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';
import RecordList from '../components/RecordList';
import { money, fechaInputValue, round2, todayISO } from '../utils/format';

const emptyForm = {
  fecha: todayISO(),
  cliente: '',
  categoriaId: '',
  cantidad: 1,
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

// Reconstruye el formulario a partir de un registro guardado. Igual que en
// Sellos, categoriaId solo se puede recuperar si el nombre guardado sigue
// existiendo en la tabla de precios.
function docToForm(d, precios) {
  const cat = precios.find((p) => p.categoria === d.categoria);
  return {
    fecha: fechaInputValue(d.fecha),
    cliente: d.cliente || '',
    categoriaId: cat?.id || '',
    cantidad: d.cantidad ?? 1,
    precioVenta: d.precioUnitario ?? '',
    costo: d.cantidad ? round2((d.inversion ?? 0) / d.cantidad) : '',
    abono: d.abono ?? '',
  };
}

export default function Impresiones() {
  const [docs, setDocs] = useState([]);
  const [precios, setPrecios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showNueva, setShowNueva] = useState(false);
  const [nueva, setNueva] = useState({ categoria: '', precioVenta: '', precioInversion: '' });

  const loadDocs = () => apiGet('/api/impresiones').then(setDocs);
  const loadPrecios = () => apiGet('/api/precios-impresiones').then(setPrecios);

  useEffect(() => {
    Promise.all([loadDocs(), loadPrecios()]).finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleCategoria = (categoriaId) => {
    const p = precios.find((x) => x.id === categoriaId);
    setForm((f) => ({
      ...f,
      categoriaId,
      precioVenta: p?.precioVenta ?? '',
      costo: p?.precioInversion ?? '',
    }));
  };

  const handleAgregarCategoria = async () => {
    if (!nueva.categoria.trim()) return;
    const body = { categoria: nueva.categoria.trim() };
    if (nueva.precioVenta !== '') body.precioVenta = Number(nueva.precioVenta);
    if (nueva.precioInversion !== '') body.precioInversion = Number(nueva.precioInversion);
    const creada = await apiPost('/api/precios-impresiones', body);
    setPrecios((p) => [...p, creada]);
    handleCategoria(creada.id);
    setNueva({ categoria: '', precioVenta: '', precioInversion: '' });
    setShowNueva(false);
  };

  const cantidad = Number(form.cantidad) || 0;
  const precioVenta = Number(form.precioVenta) || 0;
  const costo = Number(form.costo) || 0;
  const abono = Number(form.abono) || 0;
  const total = round2(cantidad * precioVenta);
  const inversion = round2(cantidad * costo);
  const totalNeto = round2(total - inversion);
  const saldo = round2(total - abono);

  const buildPayload = () => {
    const categoriaNombre = precios.find((p) => p.id === form.categoriaId)?.categoria || '';
    return {
      fecha: form.fecha, cliente: form.cliente, categoria: categoriaNombre,
      cantidad, precioUnitario: precioVenta, inversion, total, totalNeto, abono, saldo,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoriaId) return alert('Elige o crea una categoría.');
    setSaving(true);
    if (editingId) {
      await apiPatch(`/api/impresiones/${editingId}`, buildPayload());
    } else {
      await apiPost('/api/impresiones', buildPayload());
    }
    setSaving(false);
    cancelarEdicion();
    loadDocs();
  };

  const handleEdit = (doc) => {
    setForm(docToForm(doc, precios));
    setEditingId(doc.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setForm({ ...emptyForm, categoriaId: form.categoriaId, precioVenta: form.precioVenta, costo: form.costo });
    setEditingId(null);
  };

  const handleMarkPaid = async (doc) => {
    await apiPatch(`/api/impresiones/${doc.id}`, {
      abono: Number(doc.total || 0),
      saldo: 0,
      fechaPago: new Date().toISOString(),
    });
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await apiDelete(`/api/impresiones/${id}`);
    if (editingId === id) cancelarEdicion();
    loadDocs();
  };

  if (loading) return <p className="p-6 text-neutral-500">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-white text-xl font-semibold mb-6">Impresiones</h1>

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

          <Field label="Categoría">
            {!showNueva ? (
              <div className="flex gap-2">
                <select value={form.categoriaId} onChange={(e) => handleCategoria(e.target.value)} className={inputClass + ' flex-1'}>
                  <option value="">Elige una categoría...</option>
                  {precios.map((p) => <option key={p.id} value={p.id}>{p.categoria}</option>)}
                </select>
                <button type="button" onClick={() => setShowNueva(true)}
                  className="px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm whitespace-nowrap">
                  + Nueva
                </button>
              </div>
            ) : (
              <div className="space-y-2 bg-neutral-800/60 rounded-lg p-3">
                <input autoFocus value={nueva.categoria} onChange={(e) => setNueva((n) => ({ ...n, categoria: e.target.value }))}
                  placeholder="Nombre (ej. Oficio)" className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.01" value={nueva.precioVenta} onChange={(e) => setNueva((n) => ({ ...n, precioVenta: e.target.value }))}
                    placeholder="Precio venta" className={inputClass} />
                  <input type="number" step="0.01" value={nueva.precioInversion} onChange={(e) => setNueva((n) => ({ ...n, precioInversion: e.target.value }))}
                    placeholder="Precio inversión" className={inputClass} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleAgregarCategoria} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm">Guardar categoría</button>
                  <button type="button" onClick={() => setShowNueva(false)} className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 text-sm">Cancelar</button>
                </div>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad (hojas)">
              <input type="number" min="1" value={form.cantidad} onChange={(e) => handleChange('cantidad', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Abono">
              <input type="number" step="0.01" value={form.abono} onChange={(e) => handleChange('abono', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio venta (c/u)">
              <input type="number" step="0.01" value={form.precioVenta} onChange={(e) => handleChange('precioVenta', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
            <Field label="Costo real (c/u)">
              <input type="number" step="0.01" value={form.costo} onChange={(e) => handleChange('costo', e.target.value)} placeholder="S/. (0 si ya tenías el material)" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-neutral-800/60 rounded-xl py-3">
            <Resumen label="Total" value={total} />
            <Resumen label="Utilidad" value={totalNeto} color="text-emerald-400" />
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
            { key: 'totalNeto', label: 'Utilidad' },
            { key: 'saldo', label: 'Saldo' },
          ]}
          titleFn={(d) => `${d.categoria}${d.cliente ? ` · ${d.cliente}` : ''}`}
          subtitleFn={(d) => `${d.cantidad} hoja${d.cantidad === 1 ? '' : 's'} · Ver detalles`}
          onEdit={handleEdit}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}