/* ═══════════════════════════════════════════════════════════════
   MOTION — VivaGo Experience
   Capa de microinteracciones:
     · Nav con estado "scrolled"
     · Reveal on scroll (IntersectionObserver + stagger)
     · Contadores animados del hero
     · Botón "volver arriba" (se inyecta solo)
   Todo respeta prefers-reduced-motion y falla silenciosamente
   si algún elemento no existe en la página actual.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1 · Nav: sombra/solidez al hacer scroll ─────────────── */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 2 · Volver arriba (inyectado) ────────────────────────── */
  const top = document.createElement('button');
  top.className = 'back-to-top';
  top.type = 'button';
  top.setAttribute('aria-label', 'Volver arriba');
  top.innerHTML = '↑';
  document.body.appendChild(top);
  const toggleTop = () => top.classList.toggle('visible', window.scrollY > 640);
  toggleTop();
  window.addEventListener('scroll', toggleTop, { passive: true });
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  /* ── 3 · Reveal on scroll ─────────────────────────────────── */
  const REVEAL_SELECTORS = [
    '.section-head',
    '.toolbar',
    '.ticket',
    '.ticket-more',
    '.review-form',
    '.review-card',
    '.social-preview-card',
    '.footer-grid > div',
    '.promo-note',
  ];

  function prepareReveal() {
    let delayIdx = 0;
    let lastParent = null;

    document.querySelectorAll(REVEAL_SELECTORS.join(',')).forEach((el) => {
      if (el.hasAttribute('data-reveal')) return;
      el.setAttribute('data-reveal', '');

      /* stagger: los hijos de un mismo contenedor entran escalonados */
      const parent = el.parentElement;
      if (parent !== lastParent) { delayIdx = 0; lastParent = parent; }
      else { delayIdx++; }
      const base = ['.review-card'].includes('.' + el.className.split(' ')[0]) ? 90 : 70;
      el.style.transitionDelay = Math.min(delayIdx * base, 420) + 'ms';

      observer.observe(el);
    });
  }

  let observer;
  if (!reduced && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
        /* libera el delay para hover/interacciones posteriores */
        entry.target.addEventListener('transitionend', function clear() {
          entry.target.style.transitionDelay = '';
          entry.target.removeEventListener('transitionend', clear);
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    prepareReveal();

    /* contenido dinámico (cards/reseñas renderizadas por JS):
       se re-escanea cuando cambia la altura de la página */
    let scanTimer;
    const rescan = () => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(prepareReveal, 180);
    };
    window.addEventListener('load', rescan);
    const heightWatcher = setInterval(() => {
      const h = document.body.scrollHeight;
      if (h !== heightWatcher.last) { heightWatcher.last = h; rescan(); }
    }, 900);
  }

  /* ── 4 · Contadores del hero ──────────────────────────────── */
  function animateCounter(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/^([\d.,]+)(.*)$/);
    if (!match) return;
    const targetStr = match[1].replace(',', '.');
    const suffix = match[2];
    const target = parseFloat(targetStr);
    if (isNaN(target)) return;
    const decimals = targetStr.includes('.') ? 1 : 0;
    const dur = 1400;
    const start = performance.now();

    function frame(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const val = (target * eased).toFixed(decimals);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    if (reduced) return;
    const stats = document.querySelectorAll('.hero-stats b');
    if (!stats.length || !('IntersectionObserver' in window)) return;
    const seen = new WeakSet();
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !seen.has(e.target)) {
          seen.add(e.target);
          animateCounter(e.target);
          co.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    stats.forEach((s) => co.observe(s));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounters);
  } else {
    setTimeout(initCounters, 300);
  }
})();
