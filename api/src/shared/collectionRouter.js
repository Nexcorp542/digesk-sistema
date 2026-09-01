const express = require('express');
const db = require('./firebaseAdmin');

function timestampValor(raw) {
  if (!raw) return 0;
  if (typeof raw.toDate === 'function') return raw.toDate().getTime();
  if (typeof raw === 'string') {
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

// Ordena por fecha/hora real de registro (creadoEn). Si un documento viejo
// no tiene ese campo (los que cargamos manualmente), usa "fecha" como
// respaldo para no dejarlo fuera del orden.
function ordenarPorRegistro(docs) {
  return [...docs].sort((a, b) => {
    const va = timestampValor(a.creadoEn) || timestampValor(a.fecha);
    const vb = timestampValor(b.creadoEn) || timestampValor(b.fecha);
    return vb - va;
  });
}

function createCollectionRouter(collectionName, options = {}) {
  const { orderByFecha = true } = options;
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const snap = await db.collection(collectionName).get();
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (orderByFecha) docs = ordenarPorRegistro(docs);
      res.json(docs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error leyendo la colección' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.fecha) body.fecha = new Date(body.fecha);
      body.creadoEn = new Date();
      const ref = await db.collection(collectionName).add(body);
      res.status(201).json({ id: ref.id, ...body });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error guardando el registro' });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.fecha) body.fecha = new Date(body.fecha);
      if (body.fechaPago) body.fechaPago = new Date(body.fechaPago);
      await db.collection(collectionName).doc(req.params.id).update(body);
      res.json({ id: req.params.id, ...body });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error actualizando el registro' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.collection(collectionName).doc(req.params.id).delete();
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error eliminando el registro' });
    }
  });

  return router;
}

module.exports = createCollectionRouter;