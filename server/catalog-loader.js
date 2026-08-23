/* ═══════════════════════════════════════════════════════════════
   CATÁLOGO — cargador para el backend de VivaGo AI
   Lee assets/js/catalog-data.js (la MISMA fuente que usa el
   frontend) y extrae allTours / rentals / toursPopularesOrden
   ejecutándolo en un contexto aislado. Así los datos del negocio
   se mantienen en UN solo lugar: si el dueño edita el catálogo,
   la IA lo ve al instante, sin duplicar información.
   ═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCatalog() {
  const catalogPath = path.join(__dirname, '..', 'assets', 'js', 'catalog-data.js');
  const code = fs.readFileSync(catalogPath, 'utf8');

  // Contexto sin require/fetch/console: solo datos planos.
  // Nota: los `const` de nivel superior viven en el entorno léxico del
  // script (no en el sandbox), así que se extraen como VALOR DE RETORNO
  // de la misma ejecución.
  const sandbox = {};
  vm.createContext(sandbox);
  const datos = vm.runInContext(
    code + '\n;({ allTours: (typeof allTours !== "undefined") ? allTours : [], rentals: (typeof rentals !== "undefined") ? rentals : [], toursPopularesOrden: (typeof toursPopularesOrden !== "undefined") ? toursPopularesOrden : [] });',
    sandbox,
    { filename: 'catalog-data.js' }
  );

  return {
    tours: datos.allTours || [],
    rentals: datos.rentals || [],
    popularesOrden: datos.toursPopularesOrden || [],
    cargadoEn: new Date().toISOString(),
  };
}

module.exports = { loadCatalog };
