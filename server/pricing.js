/* ═══════════════════════════════════════════════════════════════
   PRECIOS Y RECOMENDACIÓN — VivaGo AI
   Convierte los precios del catálogo (texto: "$60.000 COP",
   "Consultar precio", opciones múltiples) a números reales,
   calcula presupuestos en el SERVIDOR (el modelo nunca inventa
   ni calcula precios) y ordena recomendaciones por relevancia.
   ═══════════════════════════════════════════════════════════════ */

/* Casos donde el precio del catálogo es TOTAL (no por persona):
   se documentan a mano porque son excepciones del negocio. */
const PRECIO_TOTAL_TOURS = new Set(['Tour Cuatrimotos']);

/* En ALQUILERES casi todo se cobra por embarcación/día, pero algunos
   productos compartidos se cobran por persona (excepciones). */
const ALQUILER_POR_PERSONA = new Set(['Catamarán Bona Vida']);

/** "$1.800.000 COP" → 1800000. Soporta formato colombiano
 *  (punto = miles) y normaliza comas decimales. */
function parseMonto(texto) {
  if (!texto) return null;
  const limpio = String(texto).replace(/[^\d.,]/g, '');
  if (!limpio || !/\d/.test(limpio)) return null;
  // Si hay puntos de miles (1.800.000) o solo dígitos → quitar puntos
  let n = limpio;
  if (n.includes('.')) {
    // "600.000" o "1.600.000" → miles; "600.50" → decimal (raro en COP)
    const partes = n.split('.');
    const ultima = partes[partes.length - 1];
    n = ultima.length === 3 && partes.length >= 2 ? partes.join('') : partes.slice(0, -1).join('') + '.' + ultima;
  }
  n = n.replace(/,/g, '.');
  const val = parseFloat(n);
  return Number.isFinite(val) ? Math.round(val) : null;
}

/** Extrae todos los montos de un string de precio, con su etiqueta.
 *  "$230.000 COP Estándar · $310.000 COP VIP"
 *    → [{monto:230000, etiqueta:'Estándar'}, {monto:310000, etiqueta:'VIP'}]
 */
function extraerMontos(precioTexto) {
  if (!precioTexto) return [];
  const str = String(precioTexto);
  const out = [];
  const re = /\$\s*([\d.,]+)\s*(?:COP)?/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const monto = parseMonto(m[1]);
    if (!monto) continue;
    // Etiqueta = texto después del monto hasta el próximo $ / · / ( / fin
    const desde = m.index + m[0].length;
    const hasta = str.indexOf('$', desde);
    const seg = str.slice(desde, hasta === -1 ? str.length : hasta);
    const etiqueta = seg.split(/[·(]/)[0].replace(/^[\s:–—-]+|[\s,]+$/g, '').trim() || 'Base';
    out.push({ monto, etiqueta });
  }
  return out;
}

/** Normaliza un tour/alquiler a una ficha numérica lista para la IA.
 *  Devuelve { consultable, precioDesde, precioPorPersona, precioTipo,
             montos[], textoPrecio } */
function fichaPrecio(item, esTour) {
  const res = {
    textoPrecio: item.precio || null,
    consultable: false,
    precioDesde: null,      // menor monto adulto encontrado
    precioPorPersona: null, // null si el precio es total (embarcaciones)
    precioTipo: esTour && !PRECIO_TOTAL_TOURS.has(item.nombre) ? 'por_persona' : 'total',
    montos: [],
    opciones: [],
  };

  if (Array.isArray(item.opciones) && item.opciones.length) {
    for (const op of item.opciones) {
      const montos = extraerMontos(op.precio);
      if (!montos.length) res.consultable = true;
      for (const mo of montos) res.opciones.push({ nombre: op.nombre, ...mo, nota: op.nota || null });
    }
    res.montos = res.opciones.map(o => ({ monto: o.monto, etiqueta: o.nombre }));
    if (res.montos.length) {
      // Precio base = primera opción publicada (la más representativa),
      // NO el mínimo (evita usar tarifas infantiles como precio base)
      res.precioDesde = res.opciones[0].monto;
      if (res.precioTipo === 'por_persona') res.precioPorPersona = res.precioDesde;
    }
    return res;
  }

  if (!item.precio || /consultar/i.test(item.precio)) {
    res.consultable = true;
    return res;
  }

  res.montos = extraerMontos(item.precio);
  if (!res.montos.length) {
    res.consultable = true;
  } else {
    // Primer monto = tarifa adulto/base; los demás van en desglose
    res.precioDesde = res.montos[0].monto;
  }
  if (res.precioTipo === 'por_persona') res.precioPorPersona = res.precioDesde;
  return res;
}

/** Capacidad máxima de personas de un alquiler ("Hasta 8" en specs). */
function capacidadAlquiler(r) {
  if (Array.isArray(r.specs)) {
    const s = r.specs.find(s => /personas/i.test(s.label || ''));
    if (s) {
      const m = /(\d+)/.exec(String(s.val));
      if (m) return parseInt(m[1], 10);
      if (/max/i.test(String(s.val))) return null; // "Hasta el Max" sin dato real
    }
  }
  const d = /(?:hasta|para)\s+(\d+)\s+personas/i.exec(String(r.desc || ''));
  return d ? parseInt(d[1], 10) : null;
}

/** Formatea pesos colombianos: 100000 → "$100.000" */
const cop = (n) => '$' + Math.round(n).toLocaleString('es-CO');

/* ── Herramientas de negocio (las llama el modelo vía function calling,
      pero TODO cálculo ocurre aquí, con datos reales) ─────────────── */

/** calcularPresupuesto({ presupuesto, personas }) */
function calcularPresupuesto({ presupuesto, personas }) {
  const p = Number(personas), b = parseMonto(presupuesto) ?? Number(presupuesto);
  if (!Number.isFinite(b) || b <= 0 || !Number.isInteger(p) || p <= 0 || p > 100) {
    return { error: 'Datos inválidos: necesita presupuesto (>0) y personas (entero 1–100).' };
  }
  return {
    presupuesto: b,
    personas: p,
    presupuestoPorPersona: Math.floor(b / p),
    presupuestoTotalTexto: cop(b),
    presupuestoPorPersonaTexto: cop(Math.floor(b / p)),
  };
}

/** Ficha compacta de un tour para que el modelo la presente al cliente. */
function resumenTour(t) {
  const f = fichaPrecio(t, true);
  return {
    tipo: 'tour',
    nombre: t.nombre,
    categoria: t.eyebrow || '',
    etiquetas: t.tags || [],
    rating: t.rating ?? null,
    destacado: !!t.featured,
    precio: {
      consultable: f.consultable,
      desde: f.precioDesde,
      desdeTexto: f.precioDesde != null ? cop(f.precioDesde) + ' COP' + (f.precioTipo === 'por_persona' ? ' por persona' : ' en total') : null,
      tipo: f.precioTipo,
      desglose: f.montos.length > 1 ? f.montos.map(m => `${m.etiqueta}: ${cop(m.monto)} COP`) : undefined,
      opciones: f.opciones.length ? f.opciones.map(o => ({ nombre: o.nombre, precio: cop(o.monto) + ' COP', nota: o.nota || undefined })) : undefined,
      textoOriginal: t.precio || (f.consultable ? 'Consultar precio' : undefined),
    },
    descripcionCorta: (t.desc || '').slice(0, 220),
    incluyeResumen: (t.incluye || []).slice(0, 6),
    ubicacion: t.ubicacion?.nombre || null,
    disponibilidad: 'El catálogo no publica cupos en tiempo real: confirmar fecha por WhatsApp.',
  };
}

/** Ficha compacta de un alquiler. */
function resumenAlquiler(r) {
  const f = fichaPrecio(r, false);
  const porPersona = ALQUILER_POR_PERSONA.has(r.nombre);
  return {
    tipo: 'alquiler',
    nombre: r.nombre,
    categoria: r.tipo || '',
    capacidadPersonas: capacidadAlquiler(r),
    rating: r.rating ?? null,
    precio: {
      consultable: f.consultable,
      desde: f.precioDesde,
      desdeTexto: f.precioDesde != null
        ? cop(f.precioDesde) + ' COP' + (porPersona ? ' por persona' : ' por día · embarcación completa')
        : null,
      tipoPrecio: porPersona ? 'por_persona' : 'total',
      desglose: f.montos.length > 1 ? f.montos.map(m => `${m.etiqueta}: ${cop(m.monto)} COP`) : undefined,
      textoOriginal: r.precio || (f.consultable ? 'Consultar precio' : undefined),
    },
    descripcionCorta: (r.desc || '').slice(0, 220),
    especificaciones: Array.isArray(r.specs) ? r.specs.map(s => `${s.label}: ${s.val}`) : [],
    incluye: (r.incluye || []).slice(0, 6),
    disponibilidadPublicada: r.disponible || null,
    disponibilidadReal: 'Sin calendario en tiempo real: confirmar fecha por WhatsApp.',
  };
}

const norm = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** buscarTours({ personas?, presupuestoTotal?, destino?, etiqueta?, texto? }) */
function buscarTours(catalogo, args = {}) {
  const { personas, presupuestoTotal, destino, etiqueta, texto } = args;
  let lista = catalogo.tours.map(t => resumenTour(t));

  const perPersonMax = (presupuestoTotal != null && Number.isInteger(Number(personas)))
    ? calcularPresupuesto({ presupuesto: presupuestoTotal, personas }).presupuestoPorPersona
    : null;

  if (perPersonMax != null) {
    const caben = lista.filter(x => x.precio.desde != null && x.precio.tipo === 'por_persona' && x.precio.desde <= perPersonMax);
    if (caben.length) lista = caben;
    else return {
      filtroAplicado: `presupuesto ${cop(Number(presupuestoTotal))} para ${personas} (${cop(perPersonMax)}/persona)`,
      resultados: [], mensaje: 'Ningún tour publicado cabe completo en ese presupuesto por persona.',
      sugerencia: 'Mostrar el tour más económico real y ser honesto sobre el ajuste.',
      masEconomicos: ordenarPorPrecio(lista).slice(0, 2),
    };
  }

  if (destino) {
    const d = norm(destino);
    const filtra = lista.filter(x =>
      norm(x.nombre).includes(d) ||
      norm(x.categoria).includes(d) ||
      norm(x.ubicacion || '').includes(d));
    if (filtra.length) lista = filtra;
  }
  if (etiqueta) {
    const e = norm(etiqueta);
    const filtra = lista.filter(x => (x.etiquetas || []).some(t => norm(t) === e));
    if (filtra.length) lista = filtra;
  }
  if (texto) {
    const q = norm(texto);
    const scored = lista.map(x => ({
      x,
      s: [x.nombre, x.categoria, x.descripcionCorta, ...(x.etiquetas || [])].some(c => norm(c).includes(q)) ? 1 : 0,
    })).filter(o => o.s).map(o => o.x);
    if (scored.length) lista = scored;
  }

  lista = ordenarRelevancia(lista);
  return { total: lista.length, resultados: lista.slice(0, 8).map(compactarTour) };
}

/** buscarAlquileres({ personas?, presupuestoTotal? }) */
function buscarAlquileres(catalogo, args = {}) {
  const { personas, presupuestoTotal } = args;
  const p = Number(personas);
  let lista = catalogo.rentals.map(resumenAlquiler);

  // Coste efectivo para comparar con presupuesto total:
  // por embarcación/día → precio directo · por persona → precio × personas
  const costeEfectivo = (x) =>
    (x.precio.tipoPrecio === 'por_persona' && Number.isInteger(p) && p > 0)
      ? x.precio.desde * p
      : x.precio.desde;

  if (Number.isInteger(p) && p > 0) {
    const caben = lista.filter(x => x.capacidadPersonas == null || x.capacidadPersonas >= p);
    // Prioriza: capacidad justa primero, luego coste efectivo
    caben.sort((a, b) => {
      const da = (a.capacidadPersonas ?? 999) - p, db_ = (b.capacidadPersonas ?? 999) - p;
      if (da !== db_) return da - db_;
      return (costeEfectivo(a) ?? Infinity) - (costeEfectivo(b) ?? Infinity);
    });
    lista = caben;
  }

  if (presupuestoTotal != null && Number(presupuestoTotal) > 0) {
    const b = Number(presupuestoTotal);
    const dentro = lista.filter(x => costeEfectivo(x) != null && costeEfectivo(x) <= b);
    if (dentro.length) {
      dentro.sort((a, b2) => (costeEfectivo(b2) ?? 0) - (costeEfectivo(a) ?? 0));
      lista = dentro;
    } else {
      return {
        filtroAplicado: `presupuesto ${cop(b)} para ${personas || '?'} personas`,
        resultados: [], mensaje: 'Las embarcaciones publicadas superan ese presupuesto total.',
        sugerencia: 'Ofrecer tours compartidos como alternativa más económica.',
        masEconomicos: ordenarPorPrecio(lista).slice(0, 2),
      };
    }
  } else if (Number.isInteger(p) && p > 0 && lista.length) {
    // Sin presupuesto: deja los más baratos primero para no abrumar
    lista.sort((a, b2) => (costeEfectivo(a) ?? Infinity) - (costeEfectivo(b2) ?? Infinity));
  }

  return { total: lista.length, resultados: lista.slice(0, 6).map(compactarAlquiler) };
}

/** consultarPrecio({ nombre }) — busca tour O alquiler por nombre. */
function consultarPrecio(catalogo, { nombre }) {
  if (!nombre) return { error: 'Indica el nombre de la opción.' };
  const q = norm(nombre);
  const t = catalogo.tours.find(x => norm(x.nombre) === q)
    || catalogo.tours.find(x => norm(x.nombre).includes(q));
  if (t) return { encontrado: true, opcion: resumenTour(t) };
  const r = catalogo.rentals.find(x => norm(x.nombre) === q)
    || catalogo.rentals.find(x => norm(x.nombre).includes(q));
  if (r) return { encontrado: true, opcion: resumenAlquiler(r) };
  return { encontrado: false, mensaje: `"${nombre}" no está en el catálogo actual. Nunca inventes datos: ofrece alternativas reales.`, similares: sugerirSimilares(catalogo, q) };
}

/** compararOpciones({ nombres: [] }) */
function compararOpciones(catalogo, { nombres }) {
  if (!Array.isArray(nombres) || nombres.length < 2) {
    return { error: 'Entrega un arreglo "nombres" con al menos 2 opciones.' };
  }
  const fichas = nombres.slice(0, 4).map(n => consultarPrecio(catalogo, { nombre: n }));
  return {
    opciones: fichas.map((f, i) => f.encontrado
      ? compactarFicha(f.opcion)
      : { nombre: nombres[i], noEncontrado: true }),
    criteriosSugeridos: ['precio por persona', 'qué incluye', 'duración', 'tipo de experiencia'],
  };
}

/* ── Utilidades internas ───────────────────────────────────────── */

function compactarTour(x) {
  return {
    nombre: x.nombre,
    categoria: x.categoria,
    etiquetas: x.etiquetas,
    rating: x.rating,
    precio: x.precio,
    descripcion: x.descripcionCorta,
    incluyeTop: x.incluyeResumen,
    ubicacion: x.ubicacion,
  };
}
function compactarAlquiler(x) {
  return {
    nombre: x.nombre,
    categoria: x.categoria,
    capacidadPersonas: x.capacidadPersonas,
    precio: x.precio,
    descripcion: x.descripcionCorta,
    especificaciones: x.especificaciones,
  };
}
function compactarFicha(f) { return f.tipo === 'tour' ? compactarTour(f) : compactarAlquiler(f); }

function ordenarPorPrecio(lista) {
  return [...lista].sort((a, b) => (a.precio.desde ?? Infinity) - (b.precio.desde ?? Infinity));
}

/** Orden comercial: usa mejor el presupuesto (precio alto pero cabiendo),
 *  premia rating alto y destacados. */
function ordenarRelevancia(lista) {
  return [...lista].sort((a, b) => {
    const pa = a.precio.desde ?? -1, pb = b.precio.desde ?? -1;
    const ra = (a.rating || 0) + (a.destacado ? 0.3 : 0);
    const rb = (b.rating || 0) + (b.destacado ? 0.3 : 0);
    if (Math.abs(pb - pa) > 20000) return pb - pa; // aprovecha mejor el presupuesto
    return rb - ra;
  });
}

function sugerirSimilares(catalogo, q) {
  const palabras = q.split(/\s+/).filter(w => w.length > 3);
  const pool = [
    ...catalogo.tours.map(t => ({ nombre: t.nombre, tipo: 'tour' })),
    ...catalogo.rentals.map(r => ({ nombre: r.nombre, tipo: 'alquiler' })),
  ];
  return pool.filter(o => palabras.some(w => norm(o.nombre).includes(w))).slice(0, 4).map(o => o.nombre);
}

module.exports = {
  parseMonto, extraerMontos, fichaPrecio, capacidadAlquiler, cop,
  calcularPresupuesto, buscarTours, buscarAlquileres, consultarPrecio, compararOpciones,
};
