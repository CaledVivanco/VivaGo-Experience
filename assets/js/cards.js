/* ═══════════════════════════════════════════════════════════════
   CARDS — genera el HTML de cada "ticket" (tour o alquiler)
   y engancha el clic (abre el modal de detalles) + el fallback
   de imagen
   ═══════════════════════════════════════════════════════════════ */

function tourTicketHTML(item, idx) {
  return `
  <article class="ticket" data-idx="${idx}" data-tipo="tour" tabindex="0" role="button" aria-label="Ver detalles de ${escapeAttr(item.nombre)}">
    <div class="ticket-photo">
      <img data-name="${escapeAttr(item.nombre)}" src="${item.img}" alt="${escapeAttr(item.nombre)}" loading="lazy" decoding="async">
      <div class="ticket-rating">★ <b>${item.rating.toFixed(1)}</b></div>
      ${item.featured ? `<div class="ticket-badge">Popular</div>` : ''}
      ${item.sello ? `<div class="ticket-stamp"><span>${escapeAttr(item.sello)}</span></div>` : ''}
    </div>
    <div class="ticket-body">
      <span class="eyebrow">${escapeAttr(item.eyebrow)}</span>
      <h3>${escapeAttr(item.nombre)}</h3>
      <p>${escapeAttr(item.desc)}</p>
      <div class="tag-row">${item.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>
      <div class="ticket-perf">
        ${tourPriceHTML(item)}
        <span class="ticket-cta">Ver detalles</span>
      </div>
    </div>
  </article>`;
}

/** Muestra el precio del tour en la card, de forma corta (solo la cifra principal) */
function tourPriceHTML(item) {
  const precioFull = item.opciones ? item.opciones[0].precio : item.precio;
  if (!precioFull) return '';
  const esConsultar = precioFull.toLowerCase().includes('consultar');
  const corto = precioFull.split(/\s*[·(]/)[0].trim();
  const prefijo = (!esConsultar && item.opciones) ? 'Desde ' : '';
  return `<span class="ticket-precio ${esConsultar ? 'is-consultar' : ''}">${prefijo}${escapeAttr(corto)}</span>`;
}

function rentalTicketHTML(item, idx) {
  const availClass = item.disponible.toLowerCase().includes('hoy') ? 'hoy' : 'consultar';
  return `
  <article class="ticket rental" data-idx="${idx}" data-tipo="alquiler" tabindex="0" role="button" aria-label="Ver detalles de ${escapeAttr(item.nombre)}">
    <div class="ticket-photo">
      <img data-name="${escapeAttr(item.nombre)}" src="${item.img}" alt="${escapeAttr(item.nombre)}" loading="lazy" decoding="async">
      ${item.tipoClass === 'premium' ? `<div class="ticket-badge">Premium</div>` : ''}
      ${item.tipoClass === 'extreme' ? `<div class="ticket-badge">Extremo</div>` : ''}
    </div>
    <div class="ticket-body">
      <span class="eyebrow">${escapeAttr(item.tipo)}</span>
      <h3>${escapeAttr(item.nombre)}</h3>
      <div class="avail-pill ${availClass}">${escapeAttr(item.disponible)}</div>
      <p>${escapeAttr(item.desc)}</p>
      <div class="spec-row">
        ${item.specs.map(s => `<div class="spec-chip">${s.icon} <b>${s.val}</b><span>${s.label}</span></div>`).join('')}
      </div>
      <div class="ticket-perf">
        <span class="ticket-cta">Ver detalles</span>
      </div>
    </div>
  </article>`;
}

function escapeAttr(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

/** Engancha imágenes con fallback + clic en toda la card para abrir el modal de detalles */
function wireCards(container, tourList, rentalList) {
  container.querySelectorAll('img[data-name]').forEach((img) => {
    withImageFallback(img, img.dataset.name);
    if (img.complete) img.classList.add('is-loaded');
    else img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  });
  container.querySelectorAll('.ticket[data-idx]').forEach((card) => {
    const tipo = card.dataset.tipo;
    const idx = Number(card.dataset.idx);
    const item = tipo === 'tour' ? tourList[idx] : rentalList[idx];
    if (!item) return;
    card.addEventListener('click', () => openDetailsModal(item, tipo));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailsModal(item, tipo); }
    });
  });
}
