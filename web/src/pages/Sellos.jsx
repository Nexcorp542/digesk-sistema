import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';
import RecordList from '../components/RecordList';
import { money, fechaInputValue, round2 } from '../utils/format';

const emptyForm = {
  fecha: new Date().toISOString().slice(0, 10),
  cliente: '',
  categoriaId: '',
  cantidad: 1,
  precioVenta: '',
  jebe: '5',
  maquina: '',
  abono: '',
};

const inputClass = "w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm";
function Field({ label, children }) {
  return <div><label className="text-xs text-neutral-400">{label}</label>{children}</div>;
}
function Resumen({ label, value, color = 'text-white' }) {
  return <div><p className="text-neutral-500 text-xs">{label}</p><p className={`font-medium ${color}`}>{money(value)}</p></div>;
}

// Reconstruye el formulario a partir de un registro guardado (para editar).
// Nota: categoriaId no se puede reconstruir 100% porque el registro solo
// guarda el nombre (tipoSello), no el id — se deja vacío y se puede
// re-seleccionar la misma categoría del combo si hace falta.
function docToForm(d, categorias) {
  const cat = categorias.find((c) => c.nombre === d.tipoSello);
  return {
    fecha: fechaInputValue(d.fecha),
    cliente: d.cliente || '',
    categoriaId: cat?.id || '',
    cantidad: d.cantidad ?? 1,
    precioVenta: d.precioUnitario ?? '',
    jebe: d.jebe ?? '5',
    maquina: d.maquina ?? '',
    abono: d.abono ?? '',
  };
}

export default function Sellos() {
  const [docs, setDocs] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [showNuevaCategoria, setShowNuevaCategoria] = useState(false);

  const loadDocs = () => apiGet('/api/sellos').then(setDocs);
  const loadCategorias = () => apiGet('/api/categorias-sellos').then(setCategorias);

  useEffect(() => {
    Promise.all([loadDocs(), loadCategorias()]).finally(() => setLoading(false));
  }, []);

  const cantidad = Number(form.cantidad) || 0;
  const precioVenta = Number(form.precioVenta) || 0;
  const jebe = Number(form.jebe) || 0;
  const maquina = Number(form.maquina) || 0;
  const abono = Number(form.abono) || 0;

  const costo = round2(jebe + maquina);
  const total = round2(cantidad * precioVenta);
  const inversion = round2(cantidad * costo);
  const utilidad = round2(total - inversion);
  const saldo = round2(total - abono);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleAgregarCategoria = async () => {
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    const nueva = await apiPost('/api/categorias-sellos', { nombre });
    setCategorias((c) => [...c, nueva]);
    setForm((f) => ({ ...f, categoriaId: nueva.id }));
    setNuevaCategoria('');
    setShowNuevaCategoria(false);
  };

  const buildPayload = () => {
    const categoriaNombre = categorias.find((c) => c.id === form.categoriaId)?.nombre || '';
    return {
      fecha: form.fecha,
      cliente: form.cliente,
      tipoSello: categoriaNombre,
      cantidad, precioUnitario: precioVenta,
      jebe, maquina, costoUnitario: costo,
      total, inversion, utilidad, saldo, abono,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoriaId) return alert('Elige o crea una categoría de sello.');
    setSaving(true);
    if (editingId) {
      await apiPatch(`/api/sellos/${editingId}`, buildPayload());
    } else {
      await apiPost('/api/sellos', buildPayload());
    }
    setSaving(false);
    cancelarEdicion();
    loadDocs();
  };

  const handleEdit = (doc) => {
    setForm(docToForm(doc, categorias));
    setEditingId(doc.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setForm({ ...emptyForm, categoriaId: form.categoriaId, jebe: form.jebe });
    setEditingId(null);
  };

  const handleMarkPaid = async (doc) => {
    await apiPatch(`/api/sellos/${doc.id}`, {
      abono: Number(doc.total || 0),
      saldo: 0,
      fechaPago: new Date().toISOString(),
    });
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await apiDelete(`/api/sellos/${id}`);
    if (editingId === id) cancelarEdicion();
    loadDocs();
  };

  if (loading) return <p className="p-6 text-neutral-500">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-white text-xl font-semibold mb-6">Sellos</h1>

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
            {!showNuevaCategoria ? (
              <div className="flex gap-2">
                <select value={form.categoriaId} onChange={(e) => handleChange('categoriaId', e.target.value)} className={inputClass + ' flex-1'}>
                  <option value="">Elige una categoría...</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button type="button" onClick={() => setShowNuevaCategoria(true)}
                  className="px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm whitespace-nowrap">
                  + Nueva
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input autoFocus value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Ej: Sello redondo" className={inputClass + ' flex-1'} />
                <button type="button" onClick={handleAgregarCategoria}
                  className="px-3 rounded-lg bg-emerald-600 text-white text-sm">Guardar</button>
                <button type="button" onClick={() => setShowNuevaCategoria(false)}
                  className="px-3 rounded-lg bg-neutral-800 text-neutral-400 text-sm">Cancelar</button>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad">
              <input type="number" min="1" value={form.cantidad} onChange={(e) => handleChange('cantidad', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Abono / pagado">
              <input type="number" step="0.01" value={form.abono} onChange={(e) => handleChange('abono', e.target.value)} placeholder="S/. 0.00" className={inputClass} />
            </Field>
          </div>

          <Field label="Precio venta (c/u)">
            <input type="number" step="0.01" value={form.precioVenta} onChange={(e) => handleChange('precioVenta', e.target.value)} placeholder="S/." className={inputClass} />
          </Field>

          <div className="border-t border-neutral-800 pt-3 space-y-3">
            <p className="text-xs text-neutral-500 uppercase">Costo del sello</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jebe (fijo)">
                <input type="number" step="0.01" value={form.jebe} onChange={(e) => handleChange('jebe', e.target.value)} placeholder="S/." className={inputClass} />
              </Field>
              <Field label="Máquina">
                <input type="number" step="0.01" value={form.maquina} onChange={(e) => handleChange('maquina', e.target.value)} placeholder="S/." className={inputClass} />
              </Field>
            </div>
            <p className="text-xs text-neutral-500">Costo real (c/u): <span className="text-white">{money(costo)}</span></p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-neutral-800/60 rounded-xl py-3">
            <Resumen label="Total" value={total} />
            <Resumen label="Inversión" value={inversion} />
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
          titleFn={(d) => `${d.tipoSello}${d.cliente ? ` · ${d.cliente}` : ''}`}
          subtitleFn={(d) => `${d.cantidad} unidad${d.cantidad === 1 ? '' : 'es'} · Ver detalles`}
          onEdit={handleEdit}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}