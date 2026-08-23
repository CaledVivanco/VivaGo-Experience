/* ═══════════════════════════════════════════════════════════════
   TOOLS — herramientas que VivaGo AI puede invocar (function calling)
   Cada herramienta ejecuta cálculos REALES sobre el catálogo en el
   servidor. El modelo nunca inventa precios: los consulta aquí.
   ═══════════════════════════════════════════════════════════════ */

const pricing = require('./pricing');

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
 *  Devuelve siempre un objeto JSON pequeño (ahorra tokens). */
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
      default:
        return { error: `Herramienta desconocida: ${nombre}` };
    }
  } catch (e) {
    return { error: 'La consulta falló internamente. Responde con honestidad sin inventar datos.' };
  }
}

module.exports = { DEFINICIONES, ejecutar };
