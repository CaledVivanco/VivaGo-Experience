/* ═══════════════════════════════════════════════════════════════
   NAV — menú móvil accesible
   · Toggle con aria-expanded e ícono animado ☰ / ✕
   · Cierra con: link clickeado, click fuera o tecla Escape
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  function setOpen(open) {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '✕' : '☰';
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  toggle.addEventListener('click', () => {
    setOpen(!links.classList.contains('open'));
  });

  links.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => setOpen(false))
  );

  document.addEventListener('click', (e) => {
    if (!links.classList.contains('open')) return;
    if (!links.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
});
