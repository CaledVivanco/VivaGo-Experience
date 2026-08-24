document.addEventListener('DOMContentLoaded', () => {
  /* ── helpers de filtro por tags reales del catálogo ── */
  const CATEGORIAS = {
    islas:    { label: 'Islas',     tags: ['Mar', 'Playa'],                        cta: 'Ver experiencias de islas' },
    aventura: { label: 'Aventura',  tags: ['Aventura', 'Naturaleza'],              cta: 'Ver experiencias de aventura' },
    cultura:  { label: 'Cultura',   tags: ['Cultura', 'Historia', 'Gastronomía'],  cta: 'Ver experiencias culturales' },
    privado:  { label: 'Privado',   tags: ['Privado', 'VIP'],                      cta: 'Ver experiencias privadas' },
  };
  const MOODS = {
    desconectar: { label: 'Desconectar', tags: ['Playa', 'Mar', 'Naturaleza'] },
    vivir:       { label: 'Vivir',       tags: ['Aventura', 'Nocturno'] },
    compartir:   { label: 'Compartir',   tags: ['Mar', 'Playa', 'Historia'] },
    celebrar:    { label: 'Celebrar',    tags: ['VIP', 'Privado', 'Gastronomía'] },
  };

  const expCount = document.getElementById('expCount');
  const filterState = document.getElementById('filterState');
  let filtroActual = null; // null = populares

  /* helpers de presentación reutilizados por la carta de navegación */
  function precioCorto(item) {
    const full = item.opciones ? item.opciones[0].precio : item.precio;
    if (!full) return '—';
    if (full.toLowerCase().includes('consultar')) return 'Consultar';
    return full.split(/\s*[·(]/)[0].trim();
  }
  function duracionDe(item) {
    const parts = String(item.eyebrow || '').split('·');
    return (parts.length > 1 ? parts.slice(1).join('·') : parts[0] || '').trim();
  }

  function filtrar(key) {
    const def = CATEGORIAS[key] || MOODS[key];
    if (!def) return toursPopularesOrden.map(n => allTours.find(t => t.nombre === n)).filter(Boolean);
    return allTours.filter(t => t.tags.some(tag => def.tags.includes(tag)));
  }

  /* ── carrusel/grid de experiencias destacadas ── */
  const tourRail = document.getElementById('tourRail');
  function renderTourRail(list) {
    if (!tourRail) return;
    tourRail.innerHTML = list.map((t) => tourTicketHTML(t, allTours.indexOf(t))).join('') + `
      <a href="tours.html" class="ticket ticket-more">
        <div class="circle">→</div>
        <div><b>Ver los ${allTours.length} tours</b><br><span style="font-size:.78rem;color:var(--ink-45)">Catálogo completo</span></div>
      </a>`;
    wireCards(tourRail, allTours, rentals);
  }

  function aplicarFiltro(key) {
    filtroActual = key || null;
    const def = CATEGORIAS[key] || MOODS[key];
    const list = filtrar(key);
    renderTourRail(list);

    if (def && filterState) {
      filterState.classList.add('on');
      filterState.querySelector('b').textContent = def.label;
    } else if (filterState) {
      filterState.classList.remove('on');
    }
    if (expCount) {
      expCount.textContent = def
        ? `${list.length} experiencia${list.length === 1 ? '' : 's'} · ${def.label}`
        : `${Math.min(8, list.length)} salidas más pedidas esta temporada`;
    }
    /* CTA contextual hacia el catálogo con el tag pre-filtrado */
    const cta = document.getElementById('expCta');
    if (cta && def) {
      cta.setAttribute('href', 'tours.html?tag=' + encodeURIComponent(def.tags[0]));
      cta.textContent = def.cta + ' ';
    }
    /* etiqueta del rumbo activo en el selector */
    const rumbo = document.getElementById('rumboActivo');
    if (rumbo) rumbo.textContent = def ? def.label : 'Todos los Caribes';
    const selCta = document.getElementById('selCta');
    if (selCta) selCta.setAttribute('href', def ? 'tours.html?tag=' + encodeURIComponent(def.tags[0]) : 'tours.html');
  }

  renderTourRail(filtrar(null));
  if (expCount) expCount.textContent = `${Math.min(8, allTours.length)} salidas más pedidas esta temporada`;

  /* eventos de filtros (chips del journey, tiles selector, moods) */
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function irAExperiencias() {
    const dest = document.getElementById('experiencias');
    if (!dest) return;
    const top = dest.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
  }

  document.addEventListener('vg:filtro', (e) => {
    const key = e.detail?.key || null;
    document.querySelectorAll('[data-caribe], [data-mood]').forEach(el => {
      const on = !!key && el.dataset.caribe === key || el.dataset.mood === key;
      el.classList.toggle('active', on);
      if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', String(on));
    });
    aplicarFiltro(key);
    /* que el usuario VEA el resultado del filtro */
    if (e.detail?.scroll !== false) irAExperiencias();
  });

  document.querySelectorAll('[data-caribe]').forEach(tile => {
    tile.addEventListener('click', () => {
      const yaActivo = tile.classList.contains('active');
      const key = yaActivo ? null : tile.dataset.caribe; /* segundo clic desactiva */
      document.dispatchEvent(new CustomEvent('vg:filtro', { detail: { key } }));
    });
  });
  document.querySelectorAll('[data-mood]').forEach(card => {
    card.addEventListener('click', () => {
      const yaActivo = card.classList.contains('active');
      const key = yaActivo ? null : card.dataset.mood;
      document.dispatchEvent(new CustomEvent('vg:filtro', { detail: { key } }));
    });
  });
  const clearBtn = document.getElementById('filterClear');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vg:filtro', { detail: { key: null } }));
  });

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

  /* ── CARTA DE NAVEGACIÓN — el marquee convertido en navegador real ── */
  const cartaTrack = document.getElementById('cartaTrack');
  if (cartaTrack) {
    const itemHTML = (t, i) => `
      <button type="button" class="carta-item" data-nombre="${escapeAttr(t.nombre)}" aria-label="${escapeAttr(t.nombre)} — explorar">
        <b>${String(i + 1).padStart(2, '0')}</b>
        <span>${escapeAttr(t.nombre)}</span>
        <span class="carta-pop" aria-hidden="true">
          <img src="${t.img}" alt="" loading="lazy">
          <span class="carta-pop-body">
            <span class="eyebrow">${escapeAttr(duracionDe(t))}</span>
            <span class="carta-pop-row"><span>Precio</span><b>${escapeAttr(precioCorto(t))}</b></span>
            <span class="carta-pop-cta">Explorar</span>
          </span>
        </span>
      </button>`;
    const names = allTours;
    const set = names.map((t, i) => itemHTML(t, i)).join('');
    cartaTrack.innerHTML = set + set; /* duplicado para loop continuo */
    /* fallback de marca para fotos aún no cargadas en index_files/ */
    cartaTrack.querySelectorAll('img').forEach(img =>
      withImageFallback(img, img.closest('.carta-item')?.dataset.nombre || 'VivaGo Experience'));

    cartaTrack.addEventListener('click', (e) => {
      const btn = e.target.closest('.carta-item');
      if (!btn) return;
      const tour = allTours.find(t => t.nombre === btn.dataset.nombre);
      if (tour && typeof openDetailsModal === 'function') openDetailsModal(tour, 'tour');
    });

    /* contador dinámico: tours + embarcaciones del catálogo */
    const cartaCount = document.getElementById('cartaCount');
    if (cartaCount) cartaCount.textContent = `${allTours.length + rentals.length} destinos · pasa el cursor o toca para explorar`;
  }

  /* ── stat counters ── */
  const statTours = document.getElementById('statTours');
  const statRentals = document.getElementById('statRentals');
  if (statTours) statTours.textContent = allTours.length + '+';
  if (statRentals) statRentals.textContent = rentals.length;

  /* rating medio real del catálogo para la banda de testimonios */
  const avgEl = document.getElementById('avgRating');
  if (avgEl) {
    const conRating = allTours.filter(t => typeof t.rating === 'number');
    const avg = conRating.reduce((s, t) => s + t.rating, 0) / conRating.length;
    avgEl.textContent = avg.toFixed(1);
  }
});
