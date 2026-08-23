/* ═══════════════════════════════════════════════════════════════
   VIVAGO AI — widget de chat (frontend)
   · Se inyecta solo en las 3 páginas, junto al resto de scripts.
   · Streaming de respuestas vía fetch + ReadableStream (SSE).
   · Historial en sessionStorage: sobrevive la navegación entre
     index/tours/alquiler mientras dure la sesión.
   · El botón "Reservar por WhatsApp" reutiliza whatsappLink() de
     utils.js (mismo número configurado del negocio).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const API_CHAT = '/api/ai/chat';
  const STORAGE_KEY = 'vgai-historial';
  const MAX_HISTORIAL = 40;

  /* ── Estado ─────────────────────────────────────────────────── */
  const SALUDO_INICIAL = {
    role: 'assistant',
    content: '¡Hola! 👋 Soy VivaGo AI, tu asesor de VivaGo Experience. Cuéntame: ¿cuántas personas son, qué presupuesto tienen y qué les antoja — islas, cultura, aventura o alquiler de embarcación?',
    soloUI: true,
  };

  let historial = cargarHistorial();
  let enviando = false;
  let ui = null;

  function cargarHistorial() {
    try {
      const guardado = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(guardado) && guardado.length) return guardado;
    } catch (_) { /* storage bloqueado */ }
    return [SALUDO_INICIAL];
  }

  function guardarHistorial() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(historial.slice(-MAX_HISTORIAL))); } catch (_) {}
  }

  /* ── Construcción de la UI ──────────────────────────────────── */
  const ICON_BOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2v3M7 5h10a2 2 0 0 1 2 2v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7a2 2 0 0 1 2-2z"/><path d="M9 10h.01M15 10h.01M9 14h6"/></svg>';
  const ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.6 21.8 12 3.4 3.4l-.01 6.53L15 12 3.39 14.07z"/></svg>';
  const ICON_WA = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.01 3C9.38 3 4 8.36 4 14.98c0 2.38.68 4.6 1.86 6.5L4 29l7.72-1.8a12.9 12.9 0 0 0 4.29.75h.01c6.63 0 12-5.36 12-11.98C28.02 8.36 22.66 3 16.01 3zm5.44 14.48c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.48.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/></svg>';

  function construirUI() {
    if (document.getElementById('vgaiPanel')) return;

    const fab = document.createElement('button');
    fab.className = 'vgai-fab';
    fab.id = 'vgaiFab';
    fab.setAttribute('aria-label', 'Abrir VivaGo AI, asesor virtual');
    fab.innerHTML = `${ICON_BOT}<span>VivaGo AI</span><span class="vgai-dot"></span>`;

    const panel = document.createElement('div');
    panel.className = 'vgai-panel';
    panel.id = 'vgaiPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat con VivaGo AI');
    panel.innerHTML = `
      <div class="vgai-head">
        <div class="vgai-avatar">${ICON_BOT}</div>
        <div class="vgai-title"><b>VivaGo AI</b><span>Asesor virtual</span></div>
        <button class="vgai-close" id="vgaiClose" aria-label="Cerrar chat">✕</button>
      </div>
      <div class="vgai-msgs" id="vgaiMsgs" aria-live="polite"></div>
      <div class="vgai-chips" id="vgaiChips"></div>
      <div class="vgai-composer">
        <textarea class="vgai-input" id="vgaiInput" rows="1"
          placeholder="Escríbenos… ej: Somos 5 con $500.000"
          maxlength="2000" aria-label="Mensaje para VivaGo AI"></textarea>
        <button class="vgai-send" id="vgaiSend" aria-label="Enviar mensaje">${ICON_SEND}</button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    ui = {
      fab,
      panel,
      msgs: panel.querySelector('#vgaiMsgs'),
      chips: panel.querySelector('#vgaiChips'),
      input: panel.querySelector('#vgaiInput'),
      send: panel.querySelector('#vgaiSend'),
      close: panel.querySelector('#vgaiClose'),
    };

    wireEventos();
    conectarBotonesEstaticos();
    pintarTodo();
  }

  /** Conecta cualquier botón marcado con data-vgai-abrir que exista
   *  en el HTML de la página (ej: el "Asesor IA" del menú). */
  function conectarBotonesEstaticos() {
    document.querySelectorAll('[data-vgai-abrir]').forEach((b) => {
      b.addEventListener('click', (e) => { e.preventDefault(); abrir(); });
    });
  }

  function wireEventos() {
    ui.fab.addEventListener('click', abrir);
    ui.close.addEventListener('click', cerrar);

    // Enter envía · Shift+Enter salto de línea
    ui.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
    ui.send.addEventListener('click', enviar);
    ui.input.addEventListener('input', autoAltura);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ui.panel.classList.contains('open')) cerrar();
    });
  }

  function abrir() {
    ui.panel.classList.add('open');
    ui.fab.style.display = 'none';
    setTimeout(() => ui.input.focus(), 120);
  }
  function cerrar() {
    ui.panel.classList.remove('open');
    ui.fab.style.display = '';
  }

  function autoAltura() {
    ui.input.style.height = 'auto';
    ui.input.style.height = Math.min(ui.input.scrollHeight, 110) + 'px';
  }

  /* ── Render de mensajes ─────────────────────────────────────── */
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Markdown mínimo seguro: primero escapa todo el texto, luego
   *  aplica negritas y listas cortas. Los marcadores [[RESERVAR:…]]
   *  se convierten en botón de WhatsApp (config real del negocio). */
  function renderIA(texto) {
    let html = escapeHTML(texto);
    html = html.replace(/\[\[RESERVAR:\s*([^\]]+?)\s*\]\]/g, (_, opcion) =>
      `<a class="vgai-reservar" href="${escapeHTML(whatsappLink(`¡Hola VivaGo Experience! 🌴 Quiero reservar: ${opcion}. ¿Me confirman disponibilidad?`))}" target="_blank" rel="noopener">${ICON_WA} Reservar por WhatsApp</a>`
    );
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/(^|\n)((?:[-•]\s.+?(?:\n|$))+)/g, (m, pre, bloque) =>
      pre + '<ul>' + bloque.trim().split(/\n/).map(l => `<li>${l.replace(/^[-•]\s/, '')}</li>`).join('') + '</ul>'
    );
    return html.trim();
  }

  function burbuja(clase, contenidoHTML) {
    const div = document.createElement('div');
    div.className = `vgai-msg ${clase}`;
    div.innerHTML = contenidoHTML;
    ui.msgs.appendChild(div);
    scrollAbajo();
    return div;
  }

  function scrollAbajo() { ui.msgs.scrollTop = ui.msgs.scrollHeight; }

  function pintarTodo() {
    ui.msgs.innerHTML = '';
    for (const m of historial) {
      burbuja(m.role === 'user' ? 'user' : 'ai',
        m.role === 'user' ? escapeHTML(m.content) : renderIA(m.content));
    }
    pintarChips();
  }

  const SUGERENCIAS = [
    '¿Qué tours tienen?',
    'Somos 5 y tenemos $500.000',
    'Quiero alquilar algo para 8 personas',
    '¿Cuál es la opción más económica?',
  ];

  function pintarChips() {
    // Chips solo al inicio de la conversación real
    const hayConversacion = historial.some(m => !m.soloUI);
    ui.chips.innerHTML = '';
    if (hayConversacion || enviando) return;
    for (const s of SUGERENCIAS) {
      const b = document.createElement('button');
      b.className = 'vgai-chip';
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', () => { ui.input.value = s; enviar(); });
      ui.chips.appendChild(b);
    }
  }

  /* ── Envío + streaming SSE ──────────────────────────────────── */
  async function enviar() {
    const texto = ui.input.value.trim();
    if (!texto || enviando) return;

    ui.input.value = ''; autoAltura();
    ui.chips.innerHTML = '';

    historial.push({ role: 'user', content: texto });
    guardarHistorial();
    burbuja('user', escapeHTML(texto));

    enviando = true;
    ui.send.disabled = true;

    // Indicadores: "consultando catálogo…" y luego puntos de escritura
    const estado = document.createElement('div');
    estado.className = 'vgai-consultando';
    estado.textContent = '⚓ Consultando el catálogo de VivaGo…';
    ui.msgs.appendChild(estado);
    scrollAbajo();

    const typing = document.createElement('div');
    typing.className = 'vgai-typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    typing.style.display = 'none';
    ui.msgs.appendChild(typing);

    let burbujaAI = null;
    let textoRecibido = '';
    let huboError = false;
    let timerTyping = setTimeout(() => { typing.style.display = ''; scrollAbajo(); }, 2500);

    try {
      const res = await fetch(API_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historial.filter(m => !m.soloUI).slice(-MAX_HISTORIAL).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error(res.status === 429 ? 'rate' : 'red');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const eventos = buffer.split('\n\n');
        buffer = eventos.pop() || '';
        for (const ev of eventos) procesarEvento(ev);
      }

      function procesarEvento(ev) {
        const lineas = ev.split('\n');
        const evento = (lineas.find(l => l.startsWith('event:')) || '').slice(6).trim();
        const dataLinea = lineas.find(l => l.startsWith('data:'));
        if (!dataLinea) return;
        let datos;
        try { datos = JSON.parse(dataLinea.slice(5).trim()); } catch (_) { return; }

        if (evento === 'estado') {
          clearTimeout(timerTyping);
          estado.textContent = datos.paso === 'consultando'
            ? '⚓ Consultando el catálogo de VivaGo…' : '';
        } else if (evento === 'delta') {
          clearTimeout(timerTyping);
          typing.style.display = 'none';
          estado.remove();
          if (!burbujaAI) { burbujaAI = burbuja('ai', ''); textoRecibido = ''; }
          textoRecibido += datos.texto || '';
          burbujaAI.innerHTML = renderIA(textoRecibido);
          scrollAbajo();
        } else if (evento === 'error') {
          huboError = true;
          estado.remove(); typing.remove();
          mostrarError(datos.mensaje);
        }
      }
    } catch (e) {
      huboError = true;
      estado.remove(); typing.remove();
      mostrarError(e.message === 'rate'
        ? 'Has enviado muchos mensajes seguidos. Espera un momento e inténtalo otra vez 🌴'
        : undefined);
    } finally {
      clearTimeout(timerTyping);
      enviando = false;
      ui.send.disabled = false;
      if (textoRecibido.trim()) {
        historial.push({ role: 'assistant', content: textoRecibido });
        guardarHistorial();
      }
      pintarChips();
    }

    function mostrarError(mensajeAmigable) {
      const div = document.createElement('div');
      div.className = 'vgai-error';
      div.innerHTML = `
        <span>${escapeHTML(mensajeAmigable || 'No pude responder ahora mismo. Revisa tu conexión e inténtalo de nuevo.')}</span><br>
        <button class="vgai-reintentar" type="button">Reintentar</button>`;
      ui.msgs.appendChild(div);
      div.querySelector('.vgai-reintentar').addEventListener('click', () => { div.remove(); reintentar(texto); });
      scrollAbajo();
    }

    /** Reintenta reenviando el último mensaje del usuario que falló */
    function reintentar(textoFallido) {
      // Quita el user message que quedó sin respuesta
      const idx = historial.map(m => m.content).lastIndexOf(textoFallido);
      if (idx !== -1 && historial[idx].role === 'user') historial.splice(idx, 1);
      ui.input.value = textoFallido;
      enviar();
    }
  }

  /* Aviso amable si el sitio se abre sin servidor (file://) */
  if (location.protocol === 'file:') {
    console.warn('[VivaGo AI] El chat necesita el backend activo: ejecuta "npm start" dentro de server/ y abre http://localhost:3000');
  }

  /* API pública por si otro script quiere abrir/cerrar el chat */
  window.VivaGoAI = { abrir: () => ui && abrir(), cerrar: () => ui && cerrar() };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', construirUI);
  } else {
    construirUI();
  }
})();
