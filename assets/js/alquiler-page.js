document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('rentalGrid');
  const countEl = document.getElementById('resultsCount');
  const pillsWrap = document.getElementById('filterPills');
  const searchInput = document.getElementById('searchInput');
  if (!grid) return;

  const allTipos = [...new Set(rentals.map(r => r.tipo))].sort();
  pillsWrap.innerHTML = `<button class="filter-pill active" data-tipo="all">Todos</button>` +
    allTipos.map(tipo => `<button class="filter-pill" data-tipo="${tipo}">${tipo}</button>`).join('');

  let activeTipo = 'all';
  let searchTerm = '';

  function render() {
    let list = rentals.filter(r => activeTipo === 'all' || r.tipo === activeTipo);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(r => r.nombre.toLowerCase().includes(s) || r.tipo.toLowerCase().includes(s));
    }
    countEl.textContent = `${list.length} embarcación${list.length === 1 ? '' : 'es'} encontrada${list.length === 1 ? '' : 's'}`;

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Sin resultados</h3><p>Prueba con otro filtro o término de búsqueda.</p></div>`;
      return;
    }
    grid.innerHTML = list.map(r => rentalTicketHTML(r, rentals.indexOf(r))).join('');
    wireCards(grid, allTours, rentals);
  }

  pillsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    activeTipo = btn.dataset.tipo;
    [...pillsWrap.children].forEach(b => b.classList.toggle('active', b === btn));
    render();
  });

  searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; render(); });

  render();
});
