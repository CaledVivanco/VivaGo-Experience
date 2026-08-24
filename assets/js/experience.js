/* ═══════════════════════════════════════════════════════════════
   EXPERIENCE — VivaGo Experience (solo index.html)
   Capa cinematográfica y funcional:
     · Parallax + fade del hero
     · JOURNEY: el scroll se convierte en el viaje (tierra → mar)
     · Palabras vivas "A TU MANERA"
     · Mapa interactivo estilizado (SVG + datos reales del catálogo)
     · Trip Builder "Construye tu día en Cartagena"
     · VivaGo Passport (localStorage, sin cuentas)
     · VivaGo Concierge → abre el chat con contexto pre-cargado
     · Sonido del Caribe (Web Audio, sintetizado — nunca autoplay)
     · Cursor orgánico + tilt sutil de cards (solo puntero fino)
   Todo respeta prefers-reduced-motion y falla en silencio si un
   elemento no existe. Sin dependencias externas.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ─────────────────────────────────────────────────────────────
     1 · HERO — parallax suave + rotación de postales (slider)
     ───────────────────────────────────────────────────────────── */
  function initHero() {
    const hero = document.querySelector('.c-hero');
    const bg = document.querySelector('.c-hero-bg');
    if (!hero || !bg) return;

    /* slider de fondo: crossfade entre las postales del Caribe */
    const slides = [...bg.querySelectorAll('.hero-slide')];
    if (slides.length > 1 && !REDUCED) {
      let idx = 0;
      setInterval(() => {
        idx = (idx + 1) % slides.length;
        slides.forEach((s, i) => s.classList.toggle('is-on', i === idx));
      }, 6500);
    }

    if (REDUCED) return; /* sin parallax con movimiento reducido */

    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY;
      if (y > window.innerHeight * 1.2) return;
      bg.style.setProperty('--py', String(y));
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ─────────────────────────────────────────────────────────────
     2 · PALABRAS VIVAS — A TU MANERA (hover rota alternativa,
         clic aplica el filtro de experiencias real)
     ───────────────────────────────────────────────────────────── */
  const SWAP_DATA = [
    { el: null, alts: ['Aventura', 'Tu ritmo'], i: 0 },
    { el: null, alts: ['Tu ritmo', 'Aventura'], i: 0 },
    { el: null, alts: ['Manera', 'Experiencia'], i: 0 },
  ];

  function initSwaps() {
    document.querySelectorAll('.swap[data-swap]').forEach((el, idx) => {
      const slot = SWAP_DATA[idx] || SWAP_DATA[0];
      slot.el = el;
      let timer = null;
      const flip = () => {
        if (REDUCED) return;
        slot.i = (slot.i + 1) % slot.alts.length;
        el.classList.add('is-flipping');
        setTimeout(() => {
          const word = el.querySelector('.swap-word');
          if (word) word.textContent = slot.alts[slot.i];
          el.classList.remove('is-flipping');
        }, 300);
      };
      el.addEventListener('mouseenter', flip);
      el.addEventListener('click', () => {
        // La tercera palabra ("A tu MANERA") también filtra experiencias
        const destino = document.getElementById('experiencias');
        if (destino) destino.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
      });
      if (!REDUCED) timer = setInterval(flip, 4200);
      el.addEventListener('pointerdown', () => timer && clearInterval(timer), { once: true });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     3 · JOURNEY — el scroll es la travesía
         Escenas por % de progreso (0 / 20 / 35 / 50 / 70 / 88)
     ───────────────────────────────────────────────────────────── */
  function initJourney() {
    const section = document.getElementById('journey');
    if (!section) return;
    const stage = section.querySelector('.journey-stage');
    const layers = [...section.querySelectorAll('.journey-layer')];
    const stagesEls = [...section.querySelectorAll('.j-stage')];
    const rail = section.querySelector('.journey-rail .track i');
    const boat = section.querySelector('.journey-rail .boat');
    const seaVeil = section.querySelector('.journey-sea');

    /* Móvil, reduced-motion o sin escena: secuencia estática donde
       CADA etapa lleva su propia foto de fondo (así las imágenes
       sí se ven al deslizar en pantallas pequeñas). */
    const esPantallaChica = window.matchMedia('(max-width: 960px)').matches;
    if (REDUCED || esPantallaChica || !stage) {
      layers.forEach((l, i) => l.classList.toggle('is-first', i === 0));
      const srcs = layers.map(l => {
        const im = l.querySelector('img');
        return im ? im.getAttribute('src') : '';
      });
      /* etapa → foto: 0 zarpe·L0 · 1 coords·L0 · 2 tierra·L1 · 3 mar·L2 · 4 islas·L3 */
      const mapaEtapa = [0, 0, 1, 2, 3];
      stagesEls.forEach((st, i) => {
        st.classList.add('is-on');
        const src = srcs[mapaEtapa[i] ?? 0];
        if (src) {
          st.classList.add('has-foto');
          st.style.backgroundImage =
            `linear-gradient(rgba(6,24,31,.6), rgba(6,24,31,.74)), url('${src}')`;
        }
      });
      return;
    }

    /* rangos [inicio, fin] en progreso para capas y textos */
    const layerRanges = [[-0.02, 0.30], [0.22, 0.52], [0.46, 0.76], [0.70, 1.02]];
    const stageRanges = [[0.00, 0.16], [0.14, 0.28], [0.30, 0.44], [0.47, 0.62], [0.66, 1.0]];

    let ticking = false;
    function frame() {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      if (rect.bottom < -200 || rect.top > vh + 200) return; // fuera de vista
      const p = clamp01(-rect.top / total);

      layers.forEach((layer, i) => {
        const [a, b] = layerRanges[i] || [0, 1];
        const localIn = smooth(a, a + 0.09, p);
        const localOut = 1 - smooth(b - 0.07, b, p);
        const alpha = Math.min(localIn, localOut);
        layer.style.opacity = alpha.toFixed(3);
        layer.style.visibility = alpha <= 0.005 ? 'hidden' : 'visible';
        layer.style.setProperty('--lp', p.toFixed(4));
      });

      stagesEls.forEach((st, i) => {
        const [a, b] = stageRanges[i] || [0, 1];
        st.classList.toggle('is-on', p >= a && p <= b);
      });

      if (seaVeil) seaVeil.style.setProperty('--seaVeil', smooth(0.42, 0.62, p).toFixed(3));
      section.style.setProperty('--routeLeft', (1 - p).toFixed(4));
      if (rail) rail.parentElement.parentElement.style.setProperty('--jp', p.toFixed(4));
      if (boat) boat.textContent = p > 0.5 ? '⚓' : '⛵';
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    window.addEventListener('resize', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    frame();
  }

  /* chips del journey que aplican filtros reales */
  function initJourneyChips() {
    document.querySelectorAll('[data-filtro]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const key = chip.dataset.filtro;
        document.dispatchEvent(new CustomEvent('vg:filtro', { detail: { key } }));
        const dest = document.getElementById('experiencias');
        if (dest) dest.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     4 · MAPA INTERACTIVO — ¿DÓNDE QUIERES PERDERTE?
         Puntos derivados del catálogo real (ubicacion.lat/lng).
     ───────────────────────────────────────────────────────────── */
  const ZONAS = [
    { id: 'cartagena', nombre: 'Cartagena', match: ['City Tour Histórico'], x: 62, y: 18 },
    { id: 'tierrabomba', nombre: 'Tierra Bomba', match: ['Palmarito', 'Ancestral Tierra Bomba', 'Fénix Beach'], x: 55, y: 26 },
    { id: 'bocagrande', nombre: 'Bahía', match: ['Catamarán Bona Vida'], x: 58, y: 34 },
    { id: 'baru', nombre: 'Barú', match: ['Playa Blanca Barú', 'Playa Tranquila', 'Sunset en Barú', 'Aviario'], x: 40, y: 40 },
    { id: 'rosario', nombre: 'Islas del Rosario', match: ['Isla del Sol', 'Bora Bora', 'Pao Pao', 'Top 3 Islas', 'Tour 5 Islas'], x: 33, y: 47 },
    { id: 'islapalma', nombre: 'Isla Palma', match: ['Isla Palma'], x: 22, y: 78 },
    { id: 'sanbernardo', nombre: 'Múcura · Tintipán', match: ['Múcura y Tintipán'], x: 15, y: 86 },
    { id: 'totumo', nombre: 'Volcán del Totumo', match: ['Volcán del Totumo', 'Manglares + Volcán'], x: 90, y: 8 },
    { id: 'palenque', nombre: 'San Basilio de Palenque', match: ['Palenque'], x: 92, y: 60 },
  ];

  function precioCorto(item) {
    const full = item.opciones ? item.opciones[0].precio : item.precio;
    if (!full) return '';
    if (full.toLowerCase().includes('consultar')) return 'Consultar precio';
    return 'Desde ' + full.split(/\s*[·(]/)[0].trim();
  }

  function duracionDe(item) {
    const parts = String(item.eyebrow || '').split('·');
    return (parts.length > 1 ? parts.slice(1).join('·') : parts[0] || '').trim();
  }

  function initMapa() {
    const board = document.getElementById('mapaBoard');
    const panel = document.getElementById('mapaPanel');
    if (!board || typeof allTours === 'undefined') return;

    board.querySelectorAll('.mapa-point').forEach(p => p.remove());

    ZONAS.forEach((zona, zi) => {
      const tour =
        zona.match.map(n => allTours.find(t => t.nombre === n)).find(Boolean) ||
        allTours.find(t => zona.match.some(m => (t.nombre + ' ' + (t.ubicacion?.nombre || '')).toLowerCase().includes(m.toLowerCase())));
      if (!tour) return;

      const pt = document.createElement('button');
      pt.type = 'button';
      pt.className = 'mapa-point';
      pt.style.left = zona.x + '%';
      pt.style.top = zona.y + '%';
      pt.dataset.zona = zona.id;
      pt.setAttribute('aria-label', zona.nombre + ' — ver experiencia');
      pt.innerHTML = `<i></i><span>${zona.nombre}</span>`;
      board.appendChild(pt);

      const select = () => {
        board.querySelectorAll('.mapa-point').forEach(b => b.classList.toggle('active', b === pt));
        renderPanel(tour, zona);
      };
      pt.addEventListener('click', select);
      if (zi === 4) { pt.classList.add('active'); renderPanel(tour, zona); }
    });

    function renderPanel(tour, zona) {
      if (!panel) return;
      const tags = tour.tags || [];
      panel.innerHTML = `
        <span class="eyebrow">Destino ${zi(zona)} · Cartagena</span>
        <h3>${zona.nombre}</h3>
        <p class="mp-desc">${escapeAttr(tour.desc)}</p>
        <div class="mp-facts">
          ${tour.precio || tour.opciones ? `<div class="mp-fact"><span>Tarifa</span><b>${escapeAttr(precioCorto(tour))}</b></div>` : ''}
          <div class="mp-fact"><span>Duración</span><b>${escapeAttr(duracionDe(tour))}</b></div>
          <div class="mp-fact"><span>Rating</span><b>★ ${tour.rating.toFixed(1)}</b></div>
        </div>
        <div class="mp-tags">${tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>
        <button type="button" class="btn btn-primary" id="mpExplorar">Explorar experiencia</button>
        <p class="mp-hint">Ruta marítima desde la bahía de Cartagena</p>`;
      const btn = panel.querySelector('#mpExplorar');
      if (btn) btn.addEventListener('click', () => openDetailsModal(tour, 'tour'));
    }

    function zi(zona) {
      return String(ZONAS.indexOf(zona) + 1).padStart(2, '0');
    }
  }

  /* ─────────────────────────────────────────────────────────────
     5 · TRIP BUILDER — Construye tu día en Cartagena
         Itinerario generado con una experiencia REAL del catálogo.
     ───────────────────────────────────────────────────────────── */
  const TB = {
    hora: { q: '¿A qué hora?', opts: [['manana', 'Mañana'], ['tarde', 'Tarde'], ['noche', 'Noche']] },
    vive: {
      q: '¿Qué quieres vivir?',
      opts: [['isla', 'Isla'], ['cultura', 'Cultura'], ['mar', 'Mar'], ['aventura', 'Aventura']],
      tags: {
        isla: ['Mar', 'Playa'],
        cultura: ['Cultura', 'Historia', 'Gastronomía'],
        mar: ['Mar', 'VIP'],
        aventura: ['Aventura', 'Naturaleza'],
      },
      label: { isla: 'una isla', cultura: 'cultura', mar: 'el mar', aventura: 'aventura' },
    },
    quien: { q: '¿Con quién viajas?', opts: [['solo', 'Solo'], ['pareja', 'Pareja'], ['familia', 'Familia'], ['amigos', 'Amigos']] },
  };

  function initTripBuilder() {
    const rootEl = document.getElementById('tripBuilder');
    if (!rootEl) return;
    const state = { hora: '', vive: '', quien: '' };

    Object.entries(TB).forEach(([key, def]) => {
      const wrap = rootEl.querySelector(`[data-step="${key}"]`);
      if (!wrap) return;
      def.opts.forEach(([val, label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'b-opt'; b.textContent = label;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => {
          state[key] = val;
          wrap.querySelectorAll('.b-opt').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          check();
        });
        wrap.querySelector('.b-opts').appendChild(b);
      });
    });

    function check() {
      if (state.hora && state.vive && state.quien) build();
    }

    /* Pools por horario: las islas son de día completo con salida
       matutina, así que en tarde/noche solo se ofrecen planes que
       realmente operan a esas horas. */
    const POOLS = {
      tarde: ['City Tour Histórico', 'Walking Tour', 'Tour Gastronómico', 'Tour a Getsemaní', 'Volcán del Totumo', 'Manglares + Jardín Botánico', 'Tour Cuatrimotos', 'Sunset Catamarán'],
      noche: ['Noche Blanca', 'Cena en Yate', 'Cena Fénix Beach', 'Sunset Catamarán', 'Chiva Rumbera'],
    };

    function recomendar() {
      const tags = TB.vive.tags[state.vive];
      const poolNombres = POOLS[state.hora];

      if (!poolNombres) {
        /* Mañana: catálogo completo filtrado por lo que quieres vivir */
        let pool = allTours.filter(t => t.tags.some(g => tags.includes(g)));
        pool.sort((a, b) => (b.featured - a.featured) || (b.rating - a.rating));
        return pool[0] || allTours[0];
      }

      let pool = allTours.filter(t => poolNombres.includes(t.nombre));
      const matches = pool.filter(t => t.tags.some(g => tags.includes(g)));
      matches.sort((a, b) => (b.featured - a.featured) || (b.rating - a.rating));
      return matches[0] || pool[0];
    }

    function primerPrecio(item) {
      const raw = (item.opciones && item.opciones[0] && item.opciones[0].precio) || item.precio || '';
      const m = String(raw).match(/\$[\d.,]+/);
      return m ? m[0] : '';
    }

    function build() {
      const exp = recomendar();
      const nombreExp = exp.nombre;
      const planes = {
        manana: [
          ['08:00', 'Recogida en tu hotel'],
          [`09:00`, `Salida hacia ${nombreExp}`],
          ['12:30', 'Almuerzo incluido en la experiencia'],
          ['14:30', 'Tiempo libre: playa, fotos y brisa'],
          ['16:30', 'Regreso a Cartagena'],
          ['19:00', 'Cena libre en el Centro Histórico'],
        ],
        tarde: [
          ['13:00', 'Almuerzo por tu cuenta en la ciudad'],
          ['14:30', `Inicio de ${nombreExp}`],
          ['17:30', 'Paseo por las murallas al atardecer'],
          ['19:00', 'Traslado de regreso al hotel'],
          ['20:30', 'Opcional: noche de rumba o cena frente al mar'],
        ],
        noche: [
          ['17:00', 'Puesta a punto: ducha ligera y cambio de ropa'],
          ['18:30', `Encuentro para ${nombreExp}`],
          ['21:30', 'Fin de la experiencia nocturna'],
          ['22:00', 'Cocktail de cierre con vista a la bahía'],
        ],
      };
      const timeline = planes[state.hora].map(([t, w]) =>
        `<li><span class="dp-time">${t}</span><span class="dp-what">${w}</span></li>`).join('');

      const precio = primerPrecio(exp);
      const presupuesto = precio
        ? `<p class="dp-budget">Presupuesto estimado por persona: <b>${precio} COP</b> · tarifa publicada, confirmamos por WhatsApp</p>`
        : '';

      const msg = `¡Hola! Construí mi día ideal en el Trip Builder de VivaGo Experience:\n` +
        `• Momento: ${state.hora}\n• Quiero vivir: ${TB.vive.label[state.vive]}\n• Viajo: ${state.quien}\n` +
        `• Experiencia recomendada: "${nombreExp}"\n¿Me confirman disponibilidad?`;

      const reco = document.getElementById('tbReco');
      reco.innerHTML = `
        <img src="${exp.img}" alt="${escapeAttr(nombreExp)}" loading="lazy">
        <div class="br-body">
          <span class="eyebrow">Recomendación real del catálogo</span>
          <h4>${escapeAttr(nombreExp)}</h4>
          <p>${escapeAttr(exp.desc)}</p>
          ${precio ? `<span class="br-price">${escapeAttr(primerPrecio(exp))}${exp.opciones ? ' (desde)' : ''}</span>` : ''}
          <a class="btn btn-primary btn-block" target="_blank" rel="noopener" href="${whatsappLink(msg)}">Reservar por WhatsApp</a>
        </div>`;

      const result = document.getElementById('tbResult');
      const notaIslas = (state.hora !== 'manana' && state.vive === 'isla')
        ? `<p class="dp-budget" style="border-color:rgba(255,217,142,.45)">Las islas operan solo de día completo con salida matutina: para hoy te proponemos un plan ${state.hora === 'tarde' ? 'de tarde' : 'nocturno'} y dejamos tu isla lista para mañana.</p>`
        : '';
      result.innerHTML = `
        <div class="day-plan">
          <span class="dp-date">TU DÍA IDEAL · CARTAGENA</span>
          <h3>Tu día, navegado a tu manera</h3>
          ${notaIslas}
          <ul class="dp-timeline">${timeline}</ul>
          ${presupuesto}
          <button type="button" class="builder-reset" id="tbReset">Empezar de nuevo</button>
        </div>`;
      result.appendChild(reco);
      result.classList.add('open');
      result.querySelector('#tbReset').addEventListener('click', reset);
      reco.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.onerror = null; img.src = placeholderFor(nombreExp); }, { once: true }));

      if (!REDUCED) result.scrollIntoView({ behavior: 'smooth', block: 'center' });

      function reset() {
        state.hora = state.vive = state.quien = '';
        rootEl.querySelectorAll('.b-opt').forEach(b => b.setAttribute('aria-pressed', 'false'));
        result.classList.remove('open');
        result.innerHTML = ''; reco.innerHTML = ''; result.appendChild(reco);
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
     6 · VIVA PASSPORT — sellos locales (localStorage)
     ───────────────────────────────────────────────────────────── */
  const PP_ZONES = [
    { id: 'cartagena', nombre: 'Cartagena', test: (u) => /cartagena|centro histórico|manga|bocagrande/i.test(u) && !/tierra bomba|barú|rosario/i.test(u) },
    { id: 'baru', nombre: 'Barú', test: (u) => /barú|baru/i.test(u) },
    { id: 'tierrabomba', nombre: 'Tierra Bomba', test: (u) => /tierra bomba/i.test(u) },
    { id: 'rosario', nombre: 'Islas del Rosario', test: (u) => /rosario/i.test(u) },
    { id: 'sanbernardo', nombre: 'San Bernardo', test: (u) => /tintipán|múcura|san bernardo/i.test(u) },
    { id: 'totumo', nombre: 'Volcán del Totumo', test: (u) => /totumo/i.test(u) },
    { id: 'palenque', nombre: 'Palenque', test: (u) => /palenque/i.test(u) },
    { id: 'boquilla', nombre: 'La Boquilla', test: (u) => /boquilla/i.test(u) },
  ];
  const PP_KEY = 'vgPassportSellos';

  function ppLoad() {
    try { return JSON.parse(localStorage.getItem(PP_KEY) || '{}'); } catch (_) { return {}; }
  }
  function ppSave(data) {
    try { localStorage.setItem(PP_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function renderPassport() {
    const book = document.getElementById('passportBook');
    const bar = document.getElementById('ppBarFill');
    const count = document.getElementById('ppCount');
    if (!book) return;
    const data = ppLoad();
    const total = PP_ZONES.length;
    const got = PP_ZONES.filter(z => data[z.id]).length;

    book.innerHTML = PP_ZONES.map(z => `
      <article class="pp-page ${data[z.id] ? 'stamped' : ''}">
        <span class="pp-seal">VIVA<br>GO<br>CTG</span>
        <span class="pp-zone">Sello ${String(PP_ZONES.indexOf(z) + 1).padStart(2, '0')}</span>
        <h3 class="pp-name">${z.nombre}</h3>
        <span class="pp-status ${data[z.id] ? 'ok' : 'wait'}">
          ${data[z.id]
            ? `✓ Navegado${data[z.id].fecha ? ' · ' + data[z.id].fecha : ''}`
            : '○ Próxima aventura'}
        </span>
      </article>`).join('');

    if (bar) bar.style.setProperty('--pp', Math.round((got / total) * 100));
    if (count) count.textContent = `${got} de ${total} sellos`;
  }

  function initPassport() {
    renderPassport();
    document.addEventListener('vg:details', (e) => {
      const item = e.detail?.item;
      if (!item) return;
      const lugar = `${item.nombre} ${(item.ubicacion && item.ubicacion.nombre) || ''}`;
      const zona = PP_ZONES.find(z => z.test(lugar));
      if (!zona) return;
      const data = ppLoad();
      const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      if (!data[zona.id]) {
        data[zona.id] = { fecha };
        ppSave(data);
        renderPassport();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     7 · CONCIERGE — opciones rápidas con contexto pre-cargado
     ───────────────────────────────────────────────────────────── */
  function initConcierge() {
    document.querySelectorAll('.qopt[data-msg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.msg;
        if (window.VivaGoAI && typeof window.VivaGoAI.enviar === 'function') {
          window.VivaGoAI.abrir();
          setTimeout(() => window.VivaGoAI.enviar(msg), 260);
        } else if (window.VivaGoAI) {
          window.VivaGoAI.abrir();
        }
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     9 · MICROINTERACCIONES — cursor orgánico + tilt de cards
     ───────────────────────────────────────────────────────────── */
  function initCursor() {
    if (!FINE_POINTER || REDUCED) return;
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot'; ring.className = 'cursor-ring';
    document.body.append(dot, ring);

    let rx = innerWidth / 2, ry = innerHeight / 2, mx = rx, my = ry, rafOn = false;
    function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px,${my}px)`;
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      if (rafOn) requestAnimationFrame(loop);
    }
    document.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      const hot = e.target.closest('a, button, [role="button"], input, textarea, select, .ticket, .sel-tile');
      ring.classList.toggle('hot', !!hot);
      if (!rafOn) { rafOn = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { dot.style.opacity = ring.style.opacity = '0'; });
    document.addEventListener('pointerenter', () => { dot.style.opacity = ring.style.opacity = '1'; });
  }

  function initTilt() {
    if (!FINE_POINTER || REDUCED) return;
    let current = null;
    document.addEventListener('pointerover', (e) => {
      current = e.target.closest('.ticket');
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      if (current && !e.relatedTarget?.closest?.('.ticket')) {
        current.removeAttribute('data-tilt');
        current.style.transform = ''; current = null;
      }
    }, { passive: true });
    document.addEventListener('pointermove', (e) => {
      if (!current) return;
      const r = current.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      current.setAttribute('data-tilt', '');
      current.style.transform = `perspective(900px) rotateX(${(-py * 2.6).toFixed(2)}deg) rotateY(${(px * 2.6).toFixed(2)}deg) translateY(-6px)`;
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────────────────────
     10b · NAV UX — progreso de lectura + scrollspy
          Buenas prácticas: el usuario siempre sabe dónde está y
          cuánto le falta; la sección visible se marca en el menú.
     ───────────────────────────────────────────────────────────── */
  function initNavUX() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    /* barra de progreso */
    const bar = document.createElement('span');
    bar.className = 'nav-progress';
    bar.setAttribute('aria-hidden', 'true');
    nav.appendChild(bar);
    let ticking = false;
    function updBar() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp01(window.scrollY / max) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updBar); }
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updBar); }
    }, { passive: true });
    updBar();

    /* scrollspy: resalta en el menú la sección actualmente visible */
    const links = [...nav.querySelectorAll('.nav-links a[href^="#"]')];
    if (!links.length || !('IntersectionObserver' in window)) return;
    const porId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entradas) => {
      entradas.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => { l.classList.remove('active'); l.removeAttribute('aria-current'); });
        const link = porId.get(e.target.id);
        if (link) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    porId.forEach((link, id) => {
      const sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     11 · CTA FINAL — parallax leve
     ───────────────────────────────────────────────────────────── */
  function initFinalCta() {
    const bg = document.querySelector('.final-cta .fc-bg');
    if (!bg || REDUCED) return;
    let ticking = false;
    function update() {
      ticking = false;
      const r = bg.closest('.final-cta').getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      bg.style.transform = `translateY(${(p * 42).toFixed(1)}px)`;
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ─────────────────────────────────────────────────────────────
     BOOT
     ───────────────────────────────────────────────────────────── */
  function boot() {
    initHero();
    initSwaps();
    initJourney();
    initJourneyChips();
    initMapa();
    initTripBuilder();
    initPassport();
    initConcierge();
    initCursor();
    initTilt();
    initFinalCta();
    initNavUX();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
