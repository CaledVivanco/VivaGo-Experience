const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync('../assets/js/catalog-data.js', 'utf8');
const sb = {};
vm.createContext(sb);
const probe = code + '\n;({ n: (typeof allTours !== "undefined") ? allTours.length : -1, r: (typeof rentals !== "undefined") ? rentals.length : -1 });';
try {
  const r = vm.runInContext(probe, sb, { filename: 'catalog-data.js' });
  console.log('resultado:', JSON.stringify(r));
} catch (e) {
  console.log('ERROR:', e.message.slice(0, 400));
}
