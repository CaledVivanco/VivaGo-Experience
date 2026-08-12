/* ═══════════════════════════════════════════════════════════════
   SOCIAL — VivaGo Experience
   Los embeds de Instagram y TikTok están escritos directamente en
   index.html, igual que en el sitio de referencia. Esto evita que
   los scripts oficiales se carguen antes de que existan los
   blockquotes en el DOM.
   ═══════════════════════════════════════════════════════════════ */

function reprocessSocialEmbeds() {
  if (window.instgrm && window.instgrm.Embeds) {
    try {
      window.instgrm.Embeds.process();
    } catch (error) {
      console.warn('No se pudo reprocesar Instagram:', error);
    }
  }

  // Facebook Page Plugin is parsed by the Facebook SDK.
  if (window.FB && typeof window.FB.XFBML === 'object' && typeof window.FB.XFBML.parse === 'function') {
    try {
      window.FB.XFBML.parse();
    } catch (error) {
      console.warn('No se pudo reprocesar Facebook:', error);
    }
  }

  if (
    window.tiktokEmbed &&
    window.tiktokEmbed.lib &&
    typeof window.tiktokEmbed.lib.render === 'function'
  ) {
    try {
      window.tiktokEmbed.lib.render();
    } catch (error) {
      console.warn('No se pudo reprocesar TikTok:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Los embeds ya están en el HTML cuando llega DOMContentLoaded.
  reprocessSocialEmbeds();

  // Si los scripts oficiales terminaron de cargar después,
  // intentamos nuevamente unos instantes más tarde.
  [500, 1500, 3000].forEach((delay) => {
    setTimeout(reprocessSocialEmbeds, delay);
  });
});
