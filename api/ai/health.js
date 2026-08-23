/* ═══════════════════════════════════════════════════════════════
   Estado del servicio en Vercel — GET /api/ai/health
   ═══════════════════════════════════════════════════════════════ */

const vivago = require('../../server/vivago-ai');
const { loadCatalog } = require('../../server/catalog-loader');

const CATALOGO = loadCatalog();

module.exports = async (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    servicio: 'VivaGo AI',
    estado: process.env.OPENROUTER_API_KEY ? 'listo' : 'falta OPENROUTER_API_KEY',
    modelo: vivago.MODELO_PRINCIPAL,
    catalogo: { tours: CATALOGO.tours.length, alquileres: CATALOGO.rentals.length },
  }));
};
