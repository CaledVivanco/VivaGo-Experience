/* ═══════════════════════════════════════════════════════════════
   UTILIDADES COMPARTIDAS — VivaGo Experience
   ═══════════════════════════════════════════════════════════════ */

/* Paleta usada para generar los placeholders de imagen (marca VivaGo Experience) */
const PLACEHOLDER_PALETTE = [
  ['#14A0A5', '#1E5864'], ['#1E5864', '#123842'], ['#2FB9BE', '#164652'],
  ['#ECDABE', '#123842'], ['#14A0A5', '#123842'], ['#ECDABE', '#1E5864'],
];

/* Número de WhatsApp del negocio, formato internacional sin '+' ni espacios
   (ej: 57 = Colombia + número). Reemplázalo por el número real. */
const WHATSAPP_NUMBER = '573122207263';

/* Enlaces a las redes sociales del negocio. Reemplaza cada URL por la
   página/perfil real cuando la tengas lista (ver LEEME.md, sección 7). */
const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/profile.php?id=61553201123223',
  instagram: 'https://www.instagram.com/vivagoexperience?igsh=MTdnZTBoancwcDA2Mg%3D%3D&utm_source=qr',
  tiktok: 'https://www.tiktok.com/@vivagoexperience',
};

/** Genera un data-URI SVG de respaldo cuando la foto real aún no existe
 *  en index_files/. Así el sitio nunca muestra un ícono de imagen rota. */
function placeholderFor(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  const [c1, c2] = PLACEHOLDER_PALETTE[hash % PLACEHOLDER_PALETTE.length];
  const initials = nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/>
          <stop offset="1" stop-color="${c2}"/>
        </linearGradient>
        <pattern id="p" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <path d="M0 17 H34 M17 0 V34" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="600" height="400" fill="url(#g)"/>
      <rect width="600" height="400" fill="url(#p)"/>
      <text x="300" y="222" font-family="Fraunces, serif" font-size="120" font-weight="600"
        fill="#ffffff" fill-opacity="0.9" text-anchor="middle">${initials}</text>
      <text x="300" y="270" font-family="'JetBrains Mono', monospace" font-size="16" letter-spacing="4"
        fill="#ffffff" fill-opacity="0.55" text-anchor="middle">FOTO PENDIENTE</text>
    </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

/** Aplica onerror a un <img> para que use el placeholder de marca */
function withImageFallback(imgEl, nombre) {
  imgEl.addEventListener('error', () => {
    imgEl.onerror = null;
    imgEl.src = placeholderFor(nombre);
  }, { once: true });
}

/** Devuelve HTML de estrellas (llenas / media / vacías) para un rating 0–5 */
function starRow(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let out = '';
  for (let i = 0; i < full; i++) out += '★';
  if (half) out += '⯨';
  for (let i = full + (half ? 1 : 0); i < 5; i++) out += '☆';
  return out;
}

/** Arma un link de WhatsApp con mensaje pre-escrito */
function whatsappLink(mensaje) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

/** Inserta el botón flotante de WhatsApp en la esquina inferior derecha
 *  (una sola vez, sirve para las 3 páginas del sitio). */
function injectWhatsappFloat() {
  if (document.getElementById('vtcWhatsappFloat')) return;
  const a = document.createElement('a');
  a.id = 'vtcWhatsappFloat';
  a.className = 'whatsapp-float';
  a.href = whatsappLink('¡Hola! Quiero más información sobre los tours y alquileres de VivaGo Experience.');
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
  a.innerHTML = `<svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true">
    <path d="M16.01 3C9.38 3 4 8.36 4 14.98c0 2.38.68 4.6 1.86 6.5L4 29l7.72-1.8a12.9 12.9 0 0 0 4.29.75h.01c6.63 0 12-5.36 12-11.98C28.02 8.36 22.66 3 16.01 3zm0 21.9h-.01a10.9 10.9 0 0 1-3.9-.72l-.42-.17-4.58 1.07 1.09-4.46-.19-.44a9.9 9.9 0 0 1-1.6-5.2c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.9 6.99c0 5.47-4.45 9.95-9.93 9.95zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.48.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
  </svg>`;
  document.body.appendChild(a);
}
document.addEventListener('DOMContentLoaded', injectWhatsappFloat);

/* Íconos de redes sociales, compartidos entre el footer (3 páginas)
   y el panel "Pase de abordaje social" de la página de inicio. */
const SOCIAL_ICONS = {
  facebook: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.97.24 2.43.4a4.4 4.4 0 0 1 1.68 1.09c.5.5.85 1.03 1.09 1.68.16.46.35 1.26.4 2.43.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.97-.4 2.43a4.4 4.4 0 0 1-1.09 1.68 4.4 4.4 0 0 1-1.68 1.09c-.46.16-1.26.35-2.43.4-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.97-.24-2.43-.4a4.4 4.4 0 0 1-1.68-1.09 4.4 4.4 0 0 1-1.09-1.68c-.16-.46-.35-1.26-.4-2.43-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.24-1.97.4-2.43a4.4 4.4 0 0 1 1.09-1.68A4.4 4.4 0 0 1 4.72 2.63c.46-.16 1.26-.35 2.43-.4 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 5.78.14 4.9.34 4.14.63a6.56 6.56 0 0 0-2.37 1.54A6.56 6.56 0 0 0 .23 4.54c-.29.76-.49 1.64-.56 2.91C-.4 8.74.01 9.14 0 12s.01 3.26.07 4.55c.07 1.27.27 2.15.56 2.9.3.79.7 1.46 1.54 2.3.83.83 1.5 1.24 2.3 1.53.75.29 1.63.49 2.9.56C8.34 23.99 8.74 24 12 24s3.66-.01 4.95-.07c1.27-.07 2.15-.27 2.9-.56a6.56 6.56 0 0 0 2.3-1.54 6.56 6.56 0 0 0 1.54-2.3c.29-.75.49-1.63.56-2.9.06-1.29.07-1.7.07-4.95s-.01-3.66-.07-4.95c-.07-1.27-.27-2.15-.56-2.9a6.56 6.56 0 0 0-1.54-2.3A6.56 6.56 0 0 0 19.85.63c-.75-.29-1.63-.49-2.9-.56C15.66.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.2v13.9a3.3 3.3 0 1 1-2.34-3.16V9.4a6.5 6.5 0 1 0 5.54 6.43V8.1a8.2 8.2 0 0 0 4.8 1.54V6.44A5 5 0 0 1 16.6 2z"/></svg>`,
};

/** Inserta los 3 íconos de redes sociales en el footer (presente en
 *  las 3 páginas) apuntando a SOCIAL_LINKS. */
function injectFooterSocialIcons() {
  const wrap = document.getElementById('footerSocial');
  if (!wrap) return;
  wrap.innerHTML = Object.entries(SOCIAL_LINKS).map(([platform, url]) => `
    <a href="${url}" target="_blank" rel="noopener" aria-label="${platform}">${SOCIAL_ICONS[platform]}</a>
  `).join('');
}
document.addEventListener('DOMContentLoaded', injectFooterSocialIcons);

/* ═══════════════════════════════════════════════════════════════
   SONIDO DEL CARIBE — audio real del sitio (index_files/),
   compartido por TODAS las páginas.
   · Botón de pausa/reanudar en la barra de navegación.
   · AUTOPROGRAMADO: al cargar cada página se intenta reproducir
     sin clic. Chrome/Edge lo permiten en sitios con historial de
     audio del usuario; Safari/Firefox exigen un primer gesto por
     política interna (imposible evitar), y el respaldo lo cubre.
   · sessionStorage "vgAmbiente": '1' sonando · '0' pausado.
     La preferencia se respeta al navegar entre páginas.
   · Al cambiar de pestaña o minimizar, el audio se pausa solo
     (Page Visibility API) y se reanuda al regresar.
   · La posición de la canción se recuerda entre páginas
     (sessionStorage): al navegar sigue por donde iba.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  /* Nombre con espacios/paréntesis → URL codificada.
     Versión SOLO MELODÍA por separación con IA real (Demucs/htdemucs):
     la voz se extrajo como stem independiente — cero residuo vocal.
     El original con voz sigue intacto en disco. */
  const SRC = 'index_files/' + encodeURIComponent('La Pollera Colora Solo Melodia IA.wav');
  const VOLUMEN = 0.26;
  const FLAG = 'vgAmbiente';
  let audio = null;
  let sonando = false;

  function estadoGuardado() {
    try { return sessionStorage.getItem(FLAG); } catch (_) { return null; }
  }

  function asegurarAudio() {
    if (audio) return;
    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = VOLUMEN;
    audio.addEventListener('error', () => { /* archivo ausente: silencio elegante */ }, { once: true });

    /* ── continuidad entre páginas ─────────────────────────────
       La posición se guarda en sessionStorage cada segundo; al
       abrir otra página del sitio el audio se reanuda por donde
       iba (los navegadores obligan a esperar el primer gesto,
       pero ya NO empieza desde el inicio). */
    let ultimoGuardado = 0;
    audio.addEventListener('timeupdate', () => {
      const t = audio.currentTime;
      if (t - ultimoGuardado >= 1) {
        ultimoGuardado = t;
        try { sessionStorage.setItem('vgAudioT', String(t)); } catch (_) {}
      }
    });
    const posicionGuardada = Number(sessionStorage.getItem('vgAudioT')) || 0;
    if (posicionGuardada > 0) {
      audio.addEventListener('loadedmetadata', () => {
        try {
          /* loop: si guardó cerca del final, recoloca dentro de la duración */
          const dur = audio.duration || 0;
          audio.currentTime = dur > 0 ? posicionGuardada % dur : 0;
        } catch (_) {}
      }, { once: true });
    }
  }

  function pausar() {
    sonando = false;
    try { sessionStorage.setItem(FLAG, '0'); } catch (_) {}
    if (audio) audio.pause();
    actualizarBoton();
  }

  function reanudar() {
    try { sessionStorage.setItem(FLAG, '1'); } catch (_) {}
    reproducir();
  }

  /** Intenta reproducir y sincroniza el estado del botón con el
      resultado real (el navegador permite o no el autoplay). */
  function reproducir() {
    asegurarAudio();
    const p = audio.play();
    if (p && p.then) {
      p.then(() => { sonando = true; actualizarBoton(); })
       .catch(() => { sonando = false; actualizarBoton(); });
    } else {
      sonando = true;
      actualizarBoton();
    }
  }

  /* ── arranque AUTOMÁTICO en cada página, sin clic ───────────
     Al cargar se intenta reproducir de inmediato: Chrome/Edge lo
     permiten en sitios donde ya se escuchó audio antes (y al
     llegar desde un enlace interno). Si el navegador aún lo
     bloquea, queda armado y arranca con el primer gesto — la
     canción continúa por donde iba de todos modos. */
  function arranqueAutomatico() {
    if (estadoGuardado() === '0') return;                        // usuario lo pausó antes
    reproducir();
  }

  /* ── pausa automática al salir de la pestaña/minimizar ──────
      No hace falta cerrar la página: con solo cambiar de pestaña o
      app (Page Visibility API) la música se detiene y se reanuda
      sola al volver — siempre que el usuario no la haya pausado. */
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) {
      if (sonando) audio.pause();
    } else if (sonando && estadoGuardado() !== '0') {
      const p = audio.play();
      if (p && p.catch) p.catch(() => { /* requiere nuevo gesto */ });
    }
  });

  /* ── botón en la navegación (todas las páginas) ───────────── */
  const ICONO_ON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const ICONO_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M17 9l5 6"/><path d="M22 9l-5 6"/></svg>';

  function actualizarBoton() {
    const b = document.getElementById('vgSoundBtn');
    if (!b) return;
    b.innerHTML = sonando ? ICONO_ON : ICONO_OFF;
    b.setAttribute('aria-pressed', String(sonando));
    b.setAttribute('aria-label', sonando ? 'Pausar música del Caribe' : 'Activar música del Caribe');
    b.title = sonando ? 'Pausar música del Caribe' : 'Activar música del Caribe';
  }

  function inyectarBoton() {
    if (document.getElementById('vgSoundBtn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vgSoundBtn';
    btn.className = 'nav-sound-btn notranslate';
    btn.setAttribute('translate', 'no');

    const cluster = document.querySelector('.nav-inner > div');
    if (cluster) cluster.insertBefore(btn, cluster.firstChild);
    else {
      btn.classList.add('is-float');
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', () => (sonando ? pausar() : reanudar()));
    actualizarBoton();
  }

  document.addEventListener('DOMContentLoaded', () => {
    inyectarBoton();
    arranqueAutomatico();
  });

  /* respaldo: si el autoplay fue bloqueado al cargar, el primer
     gesto del usuario lo levanta sin necesidad de tocar el botón */
  const eventos = ['pointerdown', 'keydown', 'touchstart'];
  function kick() {
    eventos.forEach(ev => window.removeEventListener(ev, kick, true));
    if (estadoGuardado() === '0' || sonando) return;
    reanudar();
  }
  eventos.forEach(ev => window.addEventListener(ev, kick, { capture: true }));
})();
