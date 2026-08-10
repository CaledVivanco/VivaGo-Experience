/* ═══════════════════════════════════════════════════════════════
   SELECTOR DE IDIOMA — bandera + traducción automática
   Pinta un botón "pase de abordaje" con la bandera del idioma
   activo; al elegir otra bandera, activa Google Website Translator
   (silencioso, sin su barra por defecto) y recuerda la elección
   entre las 3 páginas del sitio vía cookie + localStorage.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const LANGS = [
    { code: 'es',    flag: '🇪🇸', label: 'Español' },
    { code: 'en',    flag: '🇺🇸', label: 'English' },
    { code: 'pt',    flag: '🇧🇷', label: 'Português' },
    { code: 'fr',    flag: '🇫🇷', label: 'Français' },
    { code: 'de',    flag: '🇩🇪', label: 'Deutsch' },
    { code: 'it',    flag: '🇮🇹', label: 'Italiano' },
    { code: 'nl',    flag: '🇳🇱', label: 'Nederlands' },
    { code: 'zh-CN', flag: '🇨🇳', label: '中文' },
  ];

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function setCookie(name, value) {
    document.cookie = name + '=' + value + '; path=/';
    const host = location.hostname;
    if (host && host.indexOf('.') !== -1) {
      document.cookie = name + '=' + value + '; path=/; domain=.' + host;
    }
  }
  function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    const host = location.hostname;
    if (host && host.indexOf('.') !== -1) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + host + ';';
    }
  }

  function currentLang() {
    const saved = localStorage.getItem('vg_lang');
    if (saved) return saved;
    const raw = getCookie('googtrans'); // formato /es/en
    if (raw) {
      const parts = raw.split('/').filter(Boolean);
      if (parts[1]) return parts[1];
    }
    return 'es';
  }

  function applyLang(code) {
    localStorage.setItem('vg_lang', code);
    if (code === 'es') deleteCookie('googtrans');
    else setCookie('googtrans', '/es/' + code);
    location.reload();
  }

  function buildSwitcher() {
    const mounts = document.querySelectorAll('[data-lang-mount]');
    if (!mounts.length) return;
    const active = LANGS.find((l) => l.code === currentLang()) || LANGS[0];

    mounts.forEach((el, i) => {
      const uid = 'langPanel' + i;
      el.innerHTML =
        '<div class="lang-switch">' +
          '<button type="button" class="lang-btn notranslate" aria-haspopup="true" aria-expanded="false" aria-controls="' + uid + '">' +
            '<span class="lang-flag">' + active.flag + '</span>' +
            '<span class="lang-code">' + active.code.split('-')[0].toUpperCase() + '</span>' +
            '<span class="lang-caret">▾</span>' +
          '</button>' +
          '<div class="lang-panel notranslate" id="' + uid + '" role="menu">' +
            '<span class="lang-panel-eyebrow">✈ Elige tu idioma</span>' +
            '<div class="lang-list">' +
              LANGS.map((l) =>
                '<button type="button" class="lang-row' + (l.code === active.code ? ' is-active' : '') + '" data-lang="' + l.code + '" role="menuitem">' +
                  '<span class="lang-row-flag">' + l.flag + '</span>' +
                  '<span class="lang-row-name">' + l.label + '</span>' +
                  (l.code === active.code ? '<span class="lang-row-check">✓</span>' : '') +
                '</button>'
              ).join('') +
            '</div>' +
          '</div>' +
        '</div>';
    });

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = btn.closest('.lang-switch');
        document.querySelectorAll('.lang-switch.open').forEach((s) => {
          if (s !== wrap) { s.classList.remove('open'); s.querySelector('.lang-btn').setAttribute('aria-expanded', 'false'); }
        });
        const open = wrap.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    document.querySelectorAll('.lang-row').forEach((row) => {
      row.addEventListener('click', () => {
        const code = row.getAttribute('data-lang');
        if (code === active.code) { row.closest('.lang-switch').classList.remove('open'); return; }
        row.closest('.lang-panel').innerHTML = '<span class="lang-panel-eyebrow lang-loading">✈ Traduciendo…</span>';
        applyLang(code);
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.lang-switch.open').forEach((s) => {
        s.classList.remove('open');
        s.querySelector('.lang-btn').setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Callback global que dispara el script oficial de Google al cargar.
  window.vgTranslateInit = function () {
    try {
      /* global google */
      new google.translate.TranslateElement(
        {
          pageLanguage: 'es',
          includedLanguages: LANGS.filter((l) => l.code !== 'es').map((l) => l.code).join(','),
          autoDisplay: false,
        },
        'google_translate_element'
      );
    } catch (e) { /* si Google Translate no carga, el sitio sigue en español */ }
  };

  document.addEventListener('DOMContentLoaded', buildSwitcher);
})();
