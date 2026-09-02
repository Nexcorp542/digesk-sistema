import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatFechaCorta(key) {
  if (!key || key === 'sin-fecha') return 'Sin fecha';
  const [y, m, d] = key.split('-');
  return `${d}-${m}-${y.slice(2)}`;
}

function Card({ label, value, tone = 'default' }) {
  const toneClass = { default: 'text-white', good: 'text-emerald-400', bad: 'text-red-400' }[tone];
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
      <p className="text-neutral-500 text-xs uppercase">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneClass}`}>S/. {value.toFixed(2)}</p>
    </div>
  );
}

export default function Dashboard() {
  const [fecha, setFecha] = useState(todayISO());
  const [verTodo, setVerTodo] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    const url = verTodo
      ? `${API_URL}/api/dashboard/resumen`
      : `${API_URL}/api/dashboard/resumen?fecha=${fecha}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [fecha, verTodo]);

  const grupos = data
    ? data.porModulo.reduce((acc, m) => {
        (acc[m.fecha] ||= []).push(m);
        return acc;
      }, {})
    : {};
  const fechasOrdenadas = Object.keys(grupos).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setVerTodo(true)}
          className={`px-3 py-1.5 rounded-lg text-sm ${verTodo ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}
        >
          Todos los días
        </button>
        <button
          onClick={() => setVerTodo(false)}
          className={`px-3 py-1.5 rounded-lg text-sm ${!verTodo ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}
        >
          Filtrar por día
        </button>
        {!verTodo && (
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm"
          />
        )}
      </div>

      {error && (
        <p className="text-red-400">
          No se pudo cargar el resumen: {error}. ¿Está corriendo el backend en el puerto 4000?
        </p>
      )}

      {!error && !data && <p className="text-neutral-500">Cargando resumen...</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card label="Ventas totales" value={data.totales.ventas} />
            <Card label="Gastos totales" value={data.totales.gastos} tone="bad" />
            <Card label="Utilidad neta" value={data.totales.utilidadNeta} tone="good" />
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h2 className="text-white font-medium mb-3">Por módulo</h2>
            {data.porModulo.length === 0 ? (
              <p className="text-neutral-500 text-sm">No hay ventas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-neutral-500 text-left text-xs uppercase">
                    <tr>
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Módulo</th>
                      <th className="py-2">Registros</th>
                      <th className="py-2">Ventas</th>
                      <th className="py-2">Inversión</th>
                      <th className="py-2">Utilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fechasOrdenadas.map((key) => {
                      const filas = grupos[key];
                      const subVentas = filas.reduce((s, m) => s + m.ventas, 0);
                      const subInversion = filas.reduce((s, m) => s + (m.inversion || 0), 0);
                      const subUtilidad = filas.reduce((s, m) => s + m.utilidad, 0);
                      return (
                        <>
                          {filas.map((m) => (
                            <tr key={`${m.collection}-${m.fecha}`} className="border-t border-neutral-800 text-neutral-200">
                              <td className="py-2 text-neutral-400">{formatFechaCorta(m.fecha)}</td>
                              <td className="py-2">{m.modulo}</td>
                              <td className="py-2">{m.registros}</td>
                              <td className="py-2">S/. {m.ventas.toFixed(2)}</td>
                              <td className="py-2 text-red-400">S/. {(m.inversion || 0).toFixed(2)}</td>
                              <td className="py-2 text-emerald-400">S/. {m.utilidad.toFixed(2)}</td>
                            </tr>
                          ))}
                          {filas.length > 1 && (
                            <tr key={`subtotal-${key}`} className="border-t border-neutral-700 bg-neutral-800/40 text-white font-medium">
                              <td className="py-2" colSpan={3}>Subtotal {formatFechaCorta(key)}</td>
                              <td className="py-2">S/. {subVentas.toFixed(2)}</td>
                              <td className="py-2 text-red-300">S/. {subInversion.toFixed(2)}</td>
                              <td className="py-2 text-emerald-300">S/. {subUtilidad.toFixed(2)}</td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}