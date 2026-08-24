/* ═══════════════════════════════════════════════════════════════
   TOOLS — herramientas que VivaGo AI puede invocar (function calling)
   Cada herramienta ejecuta cálculos REALES sobre el catálogo en el
   servidor. El modelo nunca inventa precios: los consulta aquí.
   convertirMoneda consulta tasas de cambio EN VIVO (open.er-api.com,
   respaldo frankfurter.dev) con caché de 1 hora — el modelo nunca
   inventa la tasa.
   ═══════════════════════════════════════════════════════════════ */

const pricing = require('./pricing');

/* ── tasas de cambio en vivo (sin API key) ────────────────────── */
const CACHE_TASAS_MS = 60 * 60 * 1000;          // 1 hora
let cacheTasas = { ts: 0, tasas: null, fuente: '' };

async function obtenerTasas() {
  if (cacheTasas.tasas && (Date.now() - cacheTasas.ts) < CACHE_TASAS_MS) {
    return cacheTasas;
  }
  /* Fuente principal: open.er-api.com (todas las monedas vs USD) */
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      if (json && json.rates && typeof json.rates.COP === 'number') {
        cacheTasas = {
          ts: Date.now(),
          tasas: json.rates,
          fuente: `open.er-api.com · actualizada: ${json.time_last_update_utc || 'hoy'}`,
        };
        return cacheTasas;
      }
    }
  } catch (_) { /* pasa al respaldo */ }

  /* Respaldo: frankfurter.dev (BCE) */
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=COP', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      if (json && json.rates && typeof json.rates.COP === 'number') {
        cacheTasas = { ts: Date.now(), tasas: { USD: 1, COP: json.rates.COP }, fuente: 'frankfurter.dev (solo USD/EUR soportados en respaldo)' };
        return cacheTasas;
      }
    }
  } catch (_) { /* ambas cayeron */ }

  return { ts: 0, tasas: null, fuente: '' };
}

async function convertirMoneda(args) {
  const monto = Number(args && args.monto);
  const moneda = String((args && args.moneda) || 'USD').trim().toUpperCase();

  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: 'Monto inválido. Pide al cliente el monto exacto.' };
  }

  const { tasas, fuente } = await obtenerTasas();
  if (!tasas) {
    return {
      error: 'No pude consultar la tasa de cambio en este momento. Di al cliente que la conversión exacta depende de la TRM del día y cotízasela por WhatsApp.',
    };
  }

  let tasaCOP;
  if (moneda === 'COP') {
    return { monto, moneda: 'COP', resultadoCOP: monto, nota: 'Ya está en pesos colombianos.', fuente };
  }
  if (!tasas[moneda] || typeof tasas[moneda] !== 'number' || tasas[moneda] <= 0) {
    return { error: `Moneda no soportada: ${moneda}. Soportadas habitualmente: USD, EUR, CAD, GBP, CHF, AUD, MXN, BRL, PEN, CLP, ARS, JPY, entre otras.` };
  }
  /* tasas vienen relativas a USD: tasa(moneda→COP) = COP_por_USD / unidades_moneda_por_USD */
  tasaCOP = tasas.COP / tasas[moneda];
  const resultado = Math.round(monto * tasaCOP);

  return {
    monto,
    moneda,
    tasaAplicada: Number(tasaCOP.toFixed(2)),
    resultadoCOP: resultado,
    formatoSugerido: `$${resultado.toLocaleString('es-CO')} COP`,
    fuenteTasa: fuente,
    vigencia: 'Tasa del día (referencia); la TRM oficial puede variar levemente.',
  };
}

const DEFINICIONES = [
  {
    type: 'function',
    function: {
      name: 'calcularPresupuesto',
      description: 'Calcula el presupuesto por persona a partir del presupuesto TOTAL y la cantidad de personas. Úsala SIEMPRE antes de recomendar cuando el cliente mencione presupuesto y número de personas.',
      parameters: {
        type: 'object',
        properties: {
          presupuesto: { type: 'number', description: 'Presupuesto total en pesos colombianos (solo el número).' },
          personas: { type: 'integer', description: 'Cantidad de personas.' },
        },
        required: ['presupuesto', 'personas'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscarTours',
      description: 'Busca tours y experiencias REALES del catálogo de VivaGo. Opcionalmente filtra por presupuesto total + personas (calcula precio por persona), destino o tipo. Devuelve máximo 8 resultados ordenados por relevancia comercial.',
      parameters: {
        type: 'object',
        properties: {
          personas: { type: 'integer', description: 'Cantidad de personas (si se conoce).' },
          presupuestoTotal: { type: 'number', description: 'Presupuesto total del grupo en COP (si lo mencionó).' },
          destino: { type: 'string', description: 'Destino mencionado: Barú, Islas del Rosario, Tierra Bomba, etc.' },
          etiqueta: { type: 'string', description: 'Tipo de experiencia: Playa, Mar, VIP, Cultura, Aventura, Naturaleza, Nocturno, Gastronomía, Historia...' },
          texto: { type: 'string', description: 'Texto libre para buscar por nombre o descripción (ej: "catamaran", "atardecer", "economica").' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscarAlquileres',
      description: 'Busca embarcaciones en alquiler REALES del catálogo (lanchas, yates, catamaranes, jet ski). Filtra por capacidad mínima de personas y presupuesto total por día.',
      parameters: {
        type: 'object',
        properties: {
          personas: { type: 'integer', description: 'Cantidad de personas que necesitan cupo.' },
          presupuestoTotal: { type: 'number', description: 'Presupuesto total disponible por día en COP.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultarPrecio',
      description: 'Consulta el precio real y detalles exactos de UNA opción por su nombre (tour o alquiler). Úsala cuando el cliente pregunte cuánto cuesta algo específico.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre de la opción tal como aparece en el catálogo.' },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convertirMoneda',
      description: 'Convierte un monto en moneda extranjera (USD, EUR, CAD, GBP, etc.) a pesos colombianos usando la TASA DE CAMBIO REAL DEL DÍA. Úsala SIEMPRE que el cliente mencione dinero en otra moneda. Nunca calcules conversiones por tu cuenta.',
      parameters: {
        type: 'object',
        properties: {
          monto: { type: 'number', description: 'Cantidad de dinero a convertir (solo el número).' },
          moneda: { type: 'string', description: 'Código ISO de la moneda origen: USD, EUR, CAD, GBP, CHF, AUD, MXN, BRL, PEN, etc.' },
        },
        required: ['monto', 'moneda'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compararOpciones',
      description: 'Compara entre 2 y 4 opciones del catálogo lado a lado (precios reales, qué incluye, capacidad).',
      parameters: {
        type: 'object',
        properties: {
          nombres: { type: 'array', items: { type: 'string' }, description: 'Nombres exactos de las opciones a comparar.' },
        },
        required: ['nombres'],
      },
    },
  },
];

/** Ejecuta una tool-call del modelo contra datos reales.
 *  Devuelve siempre un objeto JSON pequeño (ahorra tokens).
 *  convertirMoneda es asíncrona (consulta la red) — vivago-ai.js
 *  hace await del resultado. */
function ejecutar(catalogo, nombre, args) {
  try {
    switch (nombre) {
      case 'calcularPresupuesto':
        return pricing.calcularPresupuesto(args || {});
      case 'buscarTours':
        return pricing.buscarTours(catalogo, args || {});
      case 'buscarAlquileres':
        return pricing.buscarAlquileres(catalogo, args || {});
      case 'consultarPrecio':
        return pricing.consultarPrecio(catalogo, args || {});
      case 'compararOpciones':
        return pricing.compararOpciones(catalogo, args || {});
      case 'convertirMoneda':
        return convertirMoneda(args || {});
      default:
        return { error: `Herramienta desconocida: ${nombre}` };
    }
  } catch (e) {
    return { error: 'La consulta falló internamente. Responde con honestidad sin inventar datos.' };
  }
}

module.exports = { DEFINICIONES, ejecutar };
