// Fecha de HOY en horario local (no UTC) — evita que pasada cierta hora
// "hoy" se convierta en "mañana" al convertir a UTC.
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Igual que todayISO pero para una fecha cualquiera (usa componentes
// locales, nunca UTC, para no correr el día).
function localISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatFecha(fecha) {
  if (!fecha) return '-';
  if (fecha._seconds) return new Date(fecha._seconds * 1000).toLocaleDateString('es-PE', { timeZone: 'UTC' });
  if (typeof fecha === 'string') {
    const [y, m, d] = fecha.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return '-';
}

export function formatFechaHora(fecha) {
  if (!fecha) return '-';
  const d = fecha._seconds ? new Date(fecha._seconds * 1000) : new Date(fecha);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fechaInputValue(fecha) {
  if (!fecha) return todayISO();
  if (fecha._seconds) {
    // El backend guarda la fecha como medianoche UTC del día elegido,
    // así que la leemos en UTC (no local) para no correr el día.
    const d = new Date(fecha._seconds * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof fecha === 'string') return fecha;
  return todayISO();
}

// Redondea a 2 decimales de verdad, evitando el ruido de coma flotante
// de JS (ej. 0.1 + 0.2 = 0.30000000000000004).
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function money(v) {
  return `S/. ${Number(v || 0).toFixed(2)}`;
}