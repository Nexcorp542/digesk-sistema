require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./shared/firebaseAdmin');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/sellos', require('./modules/sellos/sellos.routes'));
app.use('/api/categorias-sellos', require('./modules/categorias/categoriasSellos.routes'));
app.use('/api/banner-vinil', require('./modules/bannerVinil/bannerVinil.routes'));
app.use('/api/impresiones', require('./modules/impresiones/impresiones.routes'));
app.use('/api/precios-impresiones', require('./modules/impresiones/preciosImpresiones.routes'));
app.use('/api/comprobantes', require('./modules/comprobantes/comprobantes.routes'));
app.use('/api/tarjetas', require('./modules/tarjetas/tarjetas.routes'));
app.use('/api/volantes', require('./modules/volantes/volantes.routes'));
app.use('/api/tazas', require('./modules/tazas/tazas.routes'));
app.use('/api/globos', require('./modules/globos/globos.routes'));

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`));
}

module.exports = app;