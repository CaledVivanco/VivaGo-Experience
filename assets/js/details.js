/* ═══════════════════════════════════════════════════════════════
   DETALLES — VivaGo Experience
   Al hacer clic en una card (tour o alquiler) se abre un modal
   con toda la información del ítem, más un botón para reservar
   directo por WhatsApp con el nombre del tour/embarcación ya
   incluido en el mensaje.
   ═══════════════════════════════════════════════════════════════ */

function buildModalShell() {
  if (document.getElementById('vtcModalOverlay')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay" id="vtcModalOverlay">
    <div class="modal" id="vtcModal">
      <button class="modal-close" id="vtcModalClose" aria-label="Cerrar">✕</button>
      <div id="vtcModalContent"></div>
    </div>
  </div>
  <div class="toast" id="vtcToast"></div>`;
  document.body.appendChild(wrap);
  document.getElementById('vtcModalClose').addEventListener('click', closeDetailsModal);
  document.getElementById('vtcModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'vtcModalOverlay') closeDetailsModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetailsModal(); });
}

function closeDetailsModal() {
  document.getElementById('vtcModalOverlay')?.classList.remove('open');
}

/** Convierte el string de precio (uno o varios, separados por " · ") en
    tarjetitas de precio limpias, resaltando el monto en cada una. */
function renderPrecioChips(precioStr) {
  if (!precioStr) return '';

  if (precioStr.toLowerCase().includes('consultar')) {
    return `<div class="detail-precio-wrap">
      <div class="precio-chip is-consultar">Consultar precio</div>
    </div>`;
  }

  const partes = precioStr.split(' · ');
  const chipsHTML = partes.map((parte) => {
    const m = parte.trim().match(/^(\$[\d.,]+\s*COP)(.*)$/);
    if (m) {
      return `<div class="precio-chip"><b>${escapeAttr(m[1])}</b>${escapeAttr(m[2])}</div>`;
    }
    return `<div class="precio-chip">${escapeAttr(parte)}</div>`;
  }).join('');

  return `<div class="detail-precio-wrap">${chipsHTML}</div>`;
}

/** Aviso discreto de que el precio puede variar según temporada —
    una sola vez por ítem, nunca repetido dentro de cada chip de precio. */
function renderTemporadaNote(item) {
  if (!item.precioVariable) return '';
  return `<div class="temporada-note">
    <span class="temporada-note-icon">📅</span>
    Precio sujeto a variación según temporada
  </div>`;
}

function showToast(msg) {
  const t = document.getElementById('vtcToast');
  if (!t) return;
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3600);
}

/** Punto de entrada: se llama al hacer clic sobre cualquier card */
function openDetailsModal(item, tipo) {
  buildModalShell();
  const content = document.getElementById('vtcModalContent');

  const metaRow = tipo === 'tour'
    ? `<div class="ticket-rating detail-rating">★ <b>${item.rating.toFixed(1)}</b></div>`
    : `<div class="avail-pill ${item.disponible.toLowerCase().includes('hoy') ? 'hoy' : 'consultar'}">${escapeAttr(item.disponible)}</div>`;

  const extraRow = tipo === 'tour'
    ? `<div class="tag-row">${item.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>`
    : `<div class="spec-row">${item.specs.map(s => `<div class="spec-chip">${s.icon} <b>${s.val}</b><span>${s.label}</span></div>`).join('')}</div>`;

  const mensaje = tipo === 'tour'
    ? `¡Hola! Quiero reservar el tour "${item.nombre}". ¿Me confirmas disponibilidad y precio?`
    : `¡Hola! Quiero reservar "${item.nombre}". ¿Me confirmas disponibilidad y precio?`;
  const mensajeInfo = tipo === 'tour'
    ? `¡Hola! Quiero más información sobre el tour "${item.nombre}".`
    : `¡Hola! Quiero más información sobre "${item.nombre}".`;

  const accionesRow = `
    <div class="detail-actions">
      <a class="btn btn-primary reservar-btn" href="${whatsappLink(mensaje)}" target="_blank" rel="noopener">
        ¡Reservar Ahora!
        <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16.01 3C9.38 3 4 8.36 4 14.98c0 2.38.68 4.6 1.86 6.5L4 29l7.72-1.8a12.9 12.9 0 0 0 4.29.75h.01c6.63 0 12-5.36 12-11.98C28.02 8.36 22.66 3 16.01 3zm5.44 13.48c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.48.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/></svg>
      </a>
      <a class="btn btn-outline contacto-btn" href="${whatsappLink(mensajeInfo)}" target="_blank" rel="noopener">
        Contáctanos para más información
      </a>
    </div>`;

  const precioRow = (tipo === 'tour' && item.precio && !item.opciones)
    ? renderPrecioChips(item.precio)
    : '';

  const disponibilidadRow = item.disponibilidad
    ? `<div class="detail-disponibilidad">📅 Disponible: <b>${escapeAttr(item.disponibilidad)}</b></div>`
    : '';

  const opcionesRow = item.opciones
    ? `<div class="detail-opciones">
        <h4>Opciones disponibles</h4>
        <div class="opciones-grid">
          ${item.opciones.map(op => `
            <div class="opcion-card">
              <div class="opcion-head">
                <span class="opcion-nombre">${escapeAttr(op.nombre)}</span>
                ${op.precio ? `<span class="opcion-precio">${escapeAttr(op.precio)}</span>` : ''}
              </div>
              <ul>${op.incluye.map(i => `<li>${escapeAttr(i)}</li>`).join('')}</ul>
              ${op.nota ? `<span class="opcion-nota">🔞 ${escapeAttr(op.nota)}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>`
    : '';

  const temporadaRow = renderTemporadaNote(item);

  const incluyeRow = (item.incluye && !item.opciones)
    ? `<div class="detail-incluye">
        <h4>Incluye</h4>
        <ul>${item.incluye.map(i => `<li>${escapeAttr(i)}</li>`).join('')}</ul>
      </div>`
    : '';

  const noIncluyeRow = item.noIncluye
    ? `<div class="detail-incluye detail-no-incluye">
        <h4>No incluye</h4>
        <ul>${item.noIncluye.map(i => `<li>${escapeAttr(i)}</li>`).join('')}</ul>
      </div>`
    : '';

  const itinerarioRow = item.itinerario
    ? `<div class="detail-incluye">
        <h4>Itinerario</h4>
        <p class="detail-itinerario">${escapeAttr(item.itinerario)}</p>
      </div>`
    : '';

  const ubicacionRow = item.ubicacion
    ? `<div class="detail-incluye">
        <h4>Ubicación</h4>
        <div class="detail-map">
          <iframe
            src="https://www.google.com/maps?q=${item.ubicacion.lat},${item.ubicacion.lng}&output=embed"
            width="100%" height="220" style="border:0" loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            title="Mapa de ${escapeAttr(item.ubicacion.nombre)}"></iframe>
        </div>
        <a class="detail-map-link" href="${item.ubicacion.mapsUrl}" target="_blank" rel="noopener">
          📍 ${escapeAttr(item.ubicacion.nombre)} · Ver en Google Maps
        </a>
      </div>`
    : '';

  content.innerHTML = `
    <div class="detail-photo">
      <img data-name="${escapeAttr(item.nombre)}" src="${item.img}" alt="${escapeAttr(item.nombre)}">
      ${tipo === 'tour' ? metaRow : ''}
    </div>
    <div class="modal-head">
      <span class="eyebrow">${escapeAttr(item.eyebrow || item.tipo || '')}</span>
      <h3>${escapeAttr(item.nombre)}</h3>
    </div>
    <div class="modal-body">
      ${tipo === 'alquiler' ? metaRow : ''}
      ${extraRow}
      ${precioRow}
      <p class="detail-desc">${escapeAttr(item.desc)}</p>
      ${disponibilidadRow}
      ${opcionesRow}
      ${temporadaRow}
      ${incluyeRow}
      ${noIncluyeRow}
      ${itinerarioRow}
      ${ubicacionRow}
      ${accionesRow}
    </div>`;

  document.getElementById('vtcModalOverlay').classList.add('open');
  content.querySelectorAll('img[data-name]').forEach((img) => withImageFallback(img, img.dataset.name));
}
