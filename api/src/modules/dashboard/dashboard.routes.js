const express = require('express');
const router = express.Router();
const db = require('../../shared/firebaseAdmin');

const MODULOS = [
  { id: 'ventas_sellos', label: 'Sellos' },
  { id: 'ventas_impresiones', label: 'Impresiones' },
  { id: 'ventas_banner_vinil', label: 'Banner / Vinil' },
  { id: 'ventas_tazas', label: 'Tazas' },
  { id: 'ventas_tarjetas', label: 'Tarjetas' },
  { id: 'ventas_volantes', label: 'Volantes' },
  { id: 'ventas_comprobantes', label: 'Comprobantes' },
  { id: 'ventas_globos', label: 'Globos' },
];

function pickTotal(doc) {
  if ('total' in doc) return Number(doc.total) || 0;
  if ('totalVenta' in doc) return Number(doc.totalVenta) || 0;
  if ('precio' in doc) return Number(doc.precio) || 0;
  return 0;
}

function pickUtilidad(doc, total) {
  if ('utilidad' in doc) return Number(doc.utilidad) || 0;
  if ('totalNeto' in doc) return Number(doc.totalNeto) || 0;
  if ('inversion' in doc) return total - (Number(doc.inversion) || 0);
  return total;
}

// La inversión/costo de una venta: usa el campo directo si existe,
// o la calcula como total - utilidad cuando el módulo no lo guarda aparte.
function pickInversion(doc, total, utilidad) {
  if ('inversion' in doc) return Number(doc.inversion) || 0;
  if ('totalInversion' in doc) return Number(doc.totalInversion) || 0;
  return Math.max(0, total - utilidad);
}

function fechaKey(rawFecha) {
  if (!rawFecha) return null;
  if (typeof rawFecha.toDate === 'function') return rawFecha.toDate().toISOString().slice(0, 10);
  if (typeof rawFecha === 'string') return rawFecha.slice(0, 10);
  return null;
}

router.get('/resumen', async (req, res) => {
  try {
    const { fecha } = req.query;
    const porModulo = [];
    let totalVentas = 0;
    let totalUtilidad = 0;
    let totalGastos = 0; // ahora: inversión de cada venta + colección "gastos"

    for (const m of MODULOS) {
      const snap = await db.collection(m.id).get();
      const porFecha = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const key = fechaKey(data.fecha) || 'sin-fecha';
        if (fecha && key !== fecha) return;

        const t = pickTotal(data);
        const u = pickUtilidad(data, t);
        const inv = pickInversion(data, t, u);

        if (!porFecha[key]) porFecha[key] = { registros: 0, ventas: 0, utilidad: 0, inversion: 0 };
        porFecha[key].registros += 1;
        porFecha[key].ventas += t;
        porFecha[key].utilidad += u;
        porFecha[key].inversion += inv;

        totalVentas += t;
        totalUtilidad += u;
        totalGastos += inv;
      });

      Object.entries(porFecha).forEach(([key, val]) => {
        porModulo.push({
          modulo: m.label,
          collection: m.id,
          fecha: key,
          registros: val.registros,
          ventas: val.ventas,
          utilidad: val.utilidad,
          inversion: val.inversion,
        });
      });
    }
    
    // Colección "gastos" (deudas/gastos sueltos, no atados a una venta):
    // se suma a "Gastos totales" (informativo) y aparece como filas propias,
    // pero NO se resta de nuevo en "Utilidad neta" (eso ya pasó por módulo).
    const gastosSnap = await db.collection('gastos').get();
    const gastosPorFecha = {};
    let totalGastosSueltos = 0;
    gastosSnap.forEach((d) => {
      const data = d.data();
      const key = fechaKey(data.fecha) || 'sin-fecha';
      if (fecha && key !== fecha) return;
      const monto = Number(data.monto) || 0;
      if (!gastosPorFecha[key]) gastosPorFecha[key] = { registros: 0, monto: 0 };
      gastosPorFecha[key].registros += 1;
      gastosPorFecha[key].monto += monto;
      totalGastosSueltos += monto;
      totalGastos += monto;
    });
    Object.entries(gastosPorFecha).forEach(([key, val]) => {
      porModulo.push({
        modulo: 'Gastos (sueltos)',
        collection: 'gastos',
        fecha: key,
        registros: val.registros,
        ventas: 0,
        utilidad: -val.monto,
        inversion: val.monto,
      });
    });

    porModulo.sort((a, b) => {
      if (a.fecha === b.fecha) return a.modulo.localeCompare(b.modulo);
      return a.fecha < b.fecha ? 1 : -1;
    });

    res.json({
      fecha: fecha || null,
      porModulo,
      totales: {
        ventas: totalVentas,
        utilidad: totalUtilidad,
        gastos: totalGastos, // inversión de ventas + gastos sueltos (informativo)
        // Utilidad neta = utilidad por venta (ya sin su propia inversión) menos SOLO los gastos sueltos.
        // Restar totalGastos aquí sería descontar la inversión de cada venta dos veces.
        utilidadNeta: totalUtilidad - totalGastosSueltos,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error calculando el resumen' });
  }
});

module.exports = router;