document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('toursGrid');
  const countEl = document.getElementById('resultsCount');
  const pillsWrap = document.getElementById('filterPills');
  const searchInput = document.getElementById('searchInput');
  if (!grid) return;

  const allTags = [...new Set(allTours.flatMap(t => t.tags))].sort();
  pillsWrap.innerHTML = `<button class="filter-pill active" data-tag="all">Todos</button>` +
    allTags.map(tag => `<button class="filter-pill" data-tag="${tag}">${tag}</button>`).join('');

  let activeTag = 'all';
  let searchTerm = '';

  function render() {
    let list = allTours.filter(t => activeTag === 'all' || t.tags.includes(activeTag));
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(t => t.nombre.toLowerCase().includes(s) || t.eyebrow.toLowerCase().includes(s) || t.tags.some(tg => tg.toLowerCase().includes(s)));
    }
    countEl.textContent = `${list.length} tour${list.length === 1 ? '' : 's'} encontrado${list.length === 1 ? '' : 's'}`;

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Sin resultados</h3><p>Prueba con otro filtro o término de búsqueda.</p></div>`;
      return;
    }
    grid.innerHTML = list.map(t => tourTicketHTML(t, allTours.indexOf(t))).join('');
    wireCards(grid, allTours, rentals);
  }

  pillsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    activeTag = btn.dataset.tag;
    [...pillsWrap.children].forEach(b => b.classList.toggle('active', b === btn));
    render();
  });

  searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; render(); });

  render();
});
