const express = require('express');
const router = express.Router();
const db = require('../../shared/firebaseAdmin');

const COLLECTION = 'ventas_comprobantes';

function fechaValor(raw) {
  if (!raw) return 0;
  if (typeof raw.toDate === 'function') return raw.toDate().getTime();
  if (typeof raw === 'string') {
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

router.get('/', async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION).get();
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const va = fechaValor(a.creadoEn) || fechaValor(a.fecha);
      const vb = fechaValor(b.creadoEn) || fechaValor(b.fecha);
      return vb - va;
    });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo comprobantes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = { ...req.body, creadoEn: new Date() };
    const ref = await db.collection(COLLECTION).add(body);
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando comprobante' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.fecha) body.fecha = new Date(body.fecha);
    if (body.fechaPago) body.fechaPago = new Date(body.fechaPago);
    await db.collection(COLLECTION).doc(req.params.id).update(body);
    res.json({ id: req.params.id, ...body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando comprobante' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando comprobante' });
  }
});

module.exports = router;