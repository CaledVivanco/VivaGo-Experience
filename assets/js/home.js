document.addEventListener('DOMContentLoaded', () => {
  /* ── carrusel de tours destacados (tours más pedidos, en este orden) ── */
  const toursFeatured = toursPopularesOrden
    .map(nombre => allTours.find(t => t.nombre === nombre))
    .filter(Boolean);
  const tourRail = document.getElementById('tourRail');
  if (tourRail) {
    tourRail.innerHTML = toursFeatured.map((t) => tourTicketHTML(t, allTours.indexOf(t))).join('') + `
      <a href="tours.html" class="ticket ticket-more">
        <div class="circle">→</div>
        <div><b>Ver los ${allTours.length} tours</b><br><span style="font-size:.78rem;color:var(--ink-45)">Catálogo completo</span></div>
      </a>`;
    wireCards(tourRail, allTours, rentals);
  }

  /* ── carrusel de alquiler destacado ── */
  const rentalsFeatured = [...rentals].sort((a, b) => (b.tipoClass === 'premium') - (a.tipoClass === 'premium')).slice(0, 8);
  const rentalRail = document.getElementById('rentalRail');
  if (rentalRail) {
    rentalRail.innerHTML = rentalsFeatured.map((r) => rentalTicketHTML(r, rentals.indexOf(r))).join('') + `
      <a href="alquiler.html" class="ticket ticket-more">
        <div class="circle">→</div>
        <div><b>Ver los ${rentals.length} alquileres</b><br><span style="font-size:.78rem;color:var(--ink-45)">Lanchas, yates y más</span></div>
      </a>`;
    wireCards(rentalRail, allTours, rentals);
  }

  /* ── marquee de destinos ── */
  const marquee = document.getElementById('marqueeTrack');
  if (marquee) {
    const names = allTours.map(t => t.nombre);
    const set = [...names, ...names].map((n, i) => `<span><b>${String(i % names.length + 1).padStart(2, '0')}</b> ${n}</span>`).join('');
    marquee.innerHTML = set;
  }

  /* ── stat counters ── */
  const statTours = document.getElementById('statTours');
  const statRentals = document.getElementById('statRentals');
  if (statTours) statTours.textContent = allTours.length + '+';
  if (statRentals) statRentals.textContent = rentals.length;
});
