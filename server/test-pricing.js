/* Prueba rápida del loader de catálogo y de los cálculos reales.
   Uso: node test-pricing.js */
const { loadCatalog } = require('./catalog-loader');
const pricing = require('./pricing');

const cat = loadCatalog();
console.log(`Tours: ${cat.tours.length} · Alquileres: ${cat.rentals.length} · Populares: ${cat.popularesOrden.length}`);

let fallos = 0;
function check(nombre, cond, extra) {
  console.log(`${cond ? 'OK ' : 'FALLA'} · ${nombre}${extra ? ' → ' + JSON.stringify(extra).slice(0, 220) : ''}`);
  if (!cond) fallos++;
}

/* 1. Presupuesto exacto del requerimiento: 500000 / 5 = 100000 */
const p1 = pricing.calcularPresupuesto({ presupuesto: 500000, personas: 5 });
check('calcularPresupuesto(500000,5) → 100000/persona',
  p1.presupuestoPorPersona === 100000 && p1.personas === 5, p1);

/* 2. Parser de precios variados */
const casos = [
  ['$60.000 COP', 60000],
  ['$390.000 COP (niños 4–10 años: $240.000)', 240000], // min adulto/niño
  ['$1.800.000 COP', 1800000],
  ['$230.000 COP Estándar (niños 4–10 años: $180.000) · $310.000 COP VIP, solo adultos', 180000],
];
for (const [txt, esperado] of casos) {
  const montos = pricing.extraerMontos(txt);
  check(`extraerMontos("${txt.slice(0, 40)}…")`, montos.some(m => m.monto === esperado), montos.map(m => m.monto));
}

/* 3. Ficha de precio por tour conocido (Punta Arena opciones) */
const puntaArena = cat.tours.find(t => t.nombre === 'Punta Arena');
const fPA = pricing.fichaPrecio(puntaArena, true);
check('Punta Arena desde $60.000 por persona', fPA.precioDesde === 60000 && fPA.precioPorPersona === 60000, fPA.opciones?.map(o => o.monto));

/* 4. Cuatrimotos es precio TOTAL (excepción documentada) */
const cuatri = pricing.fichaPrecio(cat.tours.find(t => t.nombre === 'Tour Cuatrimotos'), true);
check('Tour Cuatrimotos marcado como total', cuatri.precioTipo === 'total' && cuatri.precioDesde === 515000, { tipo: cuatri.precioTipo });

/* 5. "Consultar precio" no inventa números */
const city = pricing.fichaPrecio(cat.tours.find(t => t.nombre === 'City Tour Histórico'), true);
check('City Tour → consultable (sin monto inventado)', city.consultable && city.precioDesde == null);

/* 6. Escenario: 800.000 para 4 → isla (por persona ≤ 200.000) */
const p6 = pricing.calcularPresupuesto({ presupuesto: 800000, personas: 4 });
const islas = pricing.buscarTours(cat, { personas: 4, presupuestoTotal: 800000, etiqueta: 'Mar' });
check('Escenario 2: presupuesto/persona = 200000', p6.presupuestoPorPersona === 200000);
check('Escenario 2: hay tours de isla dentro del presupuesto', islas.resultados.length > 0,
  islas.resultados.map(r => `${r.nombre}:${r.precio.desdeTexto}`));

/* 7. Alquiler para 8 personas con capacidad real */
const alq8 = pricing.buscarAlquileres(cat, { personas: 8 });
check('Alquiler para 8: todos con capacidad ≥ 8', alq8.resultados.length > 0 &&
  alq8.resultados.every(r => r.capacidadPersonas == null || r.capacidadPersonas >= 8),
  alq8.resultados.map(r => `${r.nombre}(cap ${r.capacidadPersonas})`));

/* 8. consultarPrecio encuentra tour Y alquiler */
const c1 = pricing.consultarPrecio(cat, { nombre: 'Barú + Islas del Rosario' });
const c2 = pricing.consultarPrecio(cat, { nombre: 'Makarela' });
const c3 = pricing.consultarPrecio(cat, { nombre: 'Tour Inexistente XYZ' });
check('consultarPrecio tour', c1.encontrado && c1.opcion.precio.desde === 200000);
check('consultarPrecio alquiler', c2.encontrado && c2.opcion.precio.desde === 1800000);
check('consultarPrecio inexistente NO inventa', !c3.encontrado);

/* 9. compararOpciones con 2 tours */
const cmp = pricing.compararOpciones(cat, { nombres: ['Playa Tranquila', 'Barú + Islas del Rosario'] });
check('compararOpciones 2 fichas reales', cmp.opciones.length === 2 && !cmp.opciones.some(o => o.noEncontrado));

/* 10. Presupuesto ajustado en alquileres → solo opciones que de verdad caben
       (500.000 para 2: cabe el catamarán por persona 134k×2=268k,
        NO caben las embarcaciones privadas de +1,6M) */
const ajustado = pricing.buscarAlquileres(cat, { personas: 2, presupuestoTotal: 500000 });
check('Alquiler presupuesto ajustado: sin resultados falsos', ajustado.resultados.every(r =>
  r.precio.desde != null &&
  (r.precio.tipoPrecio === 'por_persona' ? r.precio.desde * 2 : r.precio.desde) <= 500000),
  ajustado.resultados.map(r => `${r.nombre}(${r.precio.desdeTexto})`));
const imposible = pricing.buscarAlquileres(cat, { personas: 2, presupuestoTotal: 100000 });
check('Alquiler imposible → mensaje honesto', imposible.resultados.length === 0 && !!imposible.mensaje);

console.log(fallos ? `\n${fallos} PRUEBAS FALLARON` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
