import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';
import RecordList from '../components/RecordList';
import { money, fechaInputValue, round2, todayISO } from '../utils/format';

const emptyItem = () => ({
  tipoTrabajo: 'Banner',
  ancho: '',
  alto: '',
  precioM2: '',
  ojalillosCantidad: '',
  ojalillosPrecio: '',
  foam: '',
  seltex: '',
  laminado: false,
  precioLaminado: '',
  descuento: '',
});

const emptyForm = {
  fecha: todayISO(),
  cliente: '',
  items: [emptyItem()],
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

function calcularItem(it) {
  const ancho = Number(it.ancho) || 0;
  const alto = Number(it.alto) || 0;
  const area = round2(ancho * alto);
  const precioM2 = Number(it.precioM2) || 0;
  const ojalillosCantidad = Number(it.ojalillosCantidad) || 0;
  const ojalillosPrecio = Number(it.ojalillosPrecio) || 0;
  const foam = Number(it.foam) || 0;
  const seltex = Number(it.seltex) || 0;
  const precioLaminado = Number(it.precioLaminado) || 0;
  const descuento = Number(it.descuento) || 0;
  const totalTela = round2(area * precioM2);
  const totalExtras = round2(ojalillosCantidad * ojalillosPrecio + foam + seltex + (it.laminado ? precioLaminado : 0));
  const total = round2(totalTela + totalExtras - descuento);
  return { ...it, area, total };
}

function docToForm(d) {
  return {
    fecha: fechaInputValue(d.fecha),
    cliente: d.cliente || '',
    items: (d.items && d.items.length > 0) ? d.items.map((it) => ({ ...emptyItem(), ...it })) : [emptyItem()],
    costo: d.inversion ?? '',
    abono: d.abono ?? '',
  };
}

export default function BannerVinil() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadDocs = () => apiGet('/api/banner-vinil').then(setDocs);
  useEffect(() => { loadDocs().finally(() => setLoading(false)); }, []);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleItemChange = (index, key, val) => {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [key]: val };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const itemsCalculados = form.items.map(calcularItem);
  const total = round2(itemsCalculados.reduce((s, it) => s + it.total, 0));
  const costo = Number(form.costo) || 0;
  const abono = Number(form.abono) || 0;
  const utilidad = round2(total - costo);
  const saldo = round2(total - abono);

  const buildPayload = () => ({
    fecha: form.fecha, cliente: form.cliente,
    items: itemsCalculados,
    inversion: costo, total, utilidad, saldo, abono,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await apiPatch(`/api/banner-vinil/${editingId}`, buildPayload());
    } else {
      await apiPost('/api/banner-vinil', buildPayload());
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
    await apiPatch(`/api/banner-vinil/${doc.id}`, {
      abono: Number(doc.total || 0),
      saldo: 0,
      fechaPago: new Date().toISOString(),
    });
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await apiDelete(`/api/banner-vinil/${id}`);
    if (editingId === id) cancelarEdicion();
    loadDocs();
  };

  if (loading) return <p className="p-6 text-neutral-500">Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-white text-xl font-semibold mb-6">Banner / Vinil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6 items-start">
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

          <div className="border-t border-neutral-800 pt-3 space-y-4">
            <p className="text-xs text-neutral-500 uppercase">Banners / trabajos de esta venta</p>
            {form.items.map((it, i) => {
              const calc = calcularItem(it);
              return (
                <div key={i} className="bg-neutral-800/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">Banner {i + 1}</p>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 text-xs">Quitar</button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select value={it.tipoTrabajo} onChange={(e) => handleItemChange(i, 'tipoTrabajo', e.target.value)} className={inputClass}>
                      <option>Banner</option>
                      <option>Vinil</option>
                    </select>
                    <input type="number" step="0.01" value={it.precioM2} onChange={(e) => handleItemChange(i, 'precioM2', e.target.value)}
                      placeholder="Precio x m²" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" value={it.ancho} onChange={(e) => handleItemChange(i, 'ancho', e.target.value)}
                      placeholder="Ancho (m)" className={inputClass} />
                    <input type="number" step="0.01" value={it.alto} onChange={(e) => handleItemChange(i, 'alto', e.target.value)}
                      placeholder="Alto (m)" className={inputClass} />
                  </div>

                  <details className="text-xs">
                    <summary className="text-neutral-500 cursor-pointer">Extras (ojalillos, foam, seltex, laminado)</summary>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input type="number" value={it.ojalillosCantidad} onChange={(e) => handleItemChange(i, 'ojalillosCantidad', e.target.value)}
                        placeholder="Ojalillos (cant.)" className={inputClass} />
                      <input type="number" step="0.01" value={it.ojalillosPrecio} onChange={(e) => handleItemChange(i, 'ojalillosPrecio', e.target.value)}
                        placeholder="Precio x ojalillo" className={inputClass} />
                      <input type="number" step="0.01" value={it.foam} onChange={(e) => handleItemChange(i, 'foam', e.target.value)}
                        placeholder="Foam (S/.)" className={inputClass} />
                      <input type="number" step="0.01" value={it.seltex} onChange={(e) => handleItemChange(i, 'seltex', e.target.value)}
                        placeholder="Seltex (S/.)" className={inputClass} />
                      <input type="number" step="0.01" value={it.descuento} onChange={(e) => handleItemChange(i, 'descuento', e.target.value)}
                        placeholder="Descuento" className={inputClass} />
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={it.laminado} onChange={(e) => handleItemChange(i, 'laminado', e.target.checked)} className="h-4 w-4" />
                        <span className="text-neutral-300">Laminado</span>
                        {it.laminado && (
                          <input type="number" step="0.01" value={it.precioLaminado} onChange={(e) => handleItemChange(i, 'precioLaminado', e.target.value)}
                            placeholder="S/." className={inputClass + ' w-20'} />
                        )}
                      </div>
                    </div>
                  </details>

                  <p className="text-xs text-neutral-400">Área: {calc.area.toFixed(2)} m² · Subtotal: <span className="text-white">{money(calc.total)}</span></p>
                </div>
              );
            })}
            <button type="button" onClick={addItem}
              className="w-full text-sm rounded-lg border border-dashed border-neutral-700 text-neutral-400 py-2 hover:border-emerald-600 hover:text-emerald-400">
              + Agregar otro banner
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-neutral-800 pt-3">
            <Field label="Costo real (inversión total)">
              <input type="number" step="0.01" value={form.costo} onChange={(e) => handleChange('costo', e.target.value)} placeholder="S/." className={inputClass} />
            </Field>
            <Field label="Abono">
              <input type="number" step="0.01" value={form.abono} onChange={(e) => handleChange('abono', e.target.value)} placeholder="S/." className={inputClass} />
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
          titleFn={(d) => `${d.items?.length > 1 ? `${d.items.length} banners` : (d.items?.[0]?.tipoTrabajo || 'Banner')}${d.cliente ? ` · ${d.cliente}` : ''}`}
          subtitleFn={() => 'Ver detalles'}
          onEdit={handleEdit}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}