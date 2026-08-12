/* ═══════════════════════════════════════════════════════════════
   ANUNCIO EMERGENTE — Tour "Punta Arena"
   Apenas el visitante entra al sitio (index.html), se muestra un
   anuncio en el centro de la pantalla promocionando el tour Punta
   Arena como la opción de isla más económica de Cartagena. Reutiliza
   los datos del tour desde allTours (catalog-data.js) y abre el
   mismo modal de detalles (details.js) o WhatsApp al reservar.
   Se muestra una sola vez por sesión de navegación.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const NOMBRE_TOUR = 'Punta Arena';
  const SESSION_KEY = 'vgPromoPuntaArenaShown';

  function buildPromoOverlay(tour) {
    if (document.getElementById('vgPromoOverlay')) return;

    /* Si el tour tiene varias opciones (paquetes), se arma una mini
       comparación de precios en el anuncio; si no, se listan los
       ítems de "incluye" tal cual. */
    const opcionesHTML = (tour.opciones || [])
      .map((op) => `
        <div class="promo-opcion">
          <span class="promo-opcion-nombre">${escapeAttr(op.nombre)}</span>
          ${op.precio ? `<span class="promo-opcion-precio">${escapeAttr(op.precio)}</span>` : ''}
        </div>`)
      .join('');

    const incluyeBase = tour.opciones ? tour.opciones[0].incluye : (tour.incluye || []);
    const incluyeHTML = incluyeBase
      .map((i) => `<li>${escapeAttr(i)}</li>`)
      .join('');

    const mensaje = `¡Hola! Vi el anuncio del tour "${tour.nombre}" y quiero reservar. ¿Me confirmas disponibilidad y precio?`;
    const mensajeInfo = `¡Hola! Vi el anuncio del tour "${tour.nombre}" y quiero más información.`;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="promo-overlay" id="vgPromoOverlay">
      <div class="promo-card" role="dialog" aria-modal="true" aria-label="Anuncio: tour ${escapeAttr(tour.nombre)}">
        <button class="promo-close" id="vgPromoClose" aria-label="Cerrar anuncio">✕</button>
        <div class="promo-top">
          <img class="promo-top-img" data-name="${escapeAttr(tour.nombre)}" src="${tour.img}" alt="${escapeAttr(tour.nombre)}">
          <div class="promo-top-content">
            <span class="promo-ribbon">🌴 Tour nuevo</span>
            <span class="eyebrow">${escapeAttr(tour.eyebrow || '')}</span>
            <h3>${escapeAttr(tour.nombre)}</h3>
          </div>
        </div>
        <div class="promo-price-tag">
          <span class="promo-price-icon">🏝️</span>
          <span class="sparkle-text">¡Gran Oferta! Tu escape a la isla al mejor precio. ¡Reserva ya!</span>
          <i class="gold-dust d1"></i><i class="gold-dust d2"></i><i class="gold-dust d3"></i><i class="gold-dust d4"></i><i class="gold-dust d5"></i>
        </div>
        <div class="promo-body">
          <p class="promo-desc">${escapeAttr(tour.desc)}</p>
          ${opcionesHTML ? `<div class="promo-opciones">${opcionesHTML}</div>` : ''}
          ${tour.precioVariable ? `<div class="temporada-note"><span class="temporada-note-icon">📅</span>Precio sujeto a variación según temporada</div>` : ''}
          <div class="detail-incluye">
            <h4>Incluye</h4>
            <ul>${incluyeHTML}</ul>
          </div>
          <div class="promo-actions">
            <a class="btn btn-outline" id="vgPromoDetails" href="javascript:void(0)">Ver detalles</a>
            <a class="btn btn-primary" href="${whatsappLink(mensaje)}" target="_blank" rel="noopener">
              Reservar por WhatsApp
            </a>
          </div>
          <a class="promo-contacto-link" href="${whatsappLink(mensajeInfo)}" target="_blank" rel="noopener">
            Contáctanos para más información
          </a>
          <p class="promo-note">No incluye: gastos no especificados</p>
        </div>
      </div>
    </div>`;
    document.body.appendChild(wrap);

    const overlay = document.getElementById('vgPromoOverlay');
    document.getElementById('vgPromoClose').addEventListener('click', closePromoOverlay);
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'vgPromoOverlay') closePromoOverlay();
    });
    document.getElementById('vgPromoDetails').addEventListener('click', () => {
      closePromoOverlay();
      openDetailsModal(tour, 'tour');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePromoOverlay();
    });
    overlay.querySelectorAll('img[data-name]').forEach((img) => withImageFallback(img, img.dataset.name));
  }

  function closePromoOverlay() {
    document.getElementById('vgPromoOverlay')?.classList.remove('open');
  }

  function openPromoOverlay(tour) {
    buildPromoOverlay(tour);
    document.getElementById('vgPromoOverlay').classList.add('open');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof allTours === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    const tour = allTours.find((t) => t.nombre === NOMBRE_TOUR);
    if (!tour) return;

    setTimeout(() => {
      openPromoOverlay(tour);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, 900);
  });
})();
