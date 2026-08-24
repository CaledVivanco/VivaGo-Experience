/* ═══════════════════════════════════════════════════════════════
   SERVIDOR — VivaGo Experience
   · Sirve el sitio estático (index/tours/alquiler) tal cual es.
   · Expone VivaGo AI en POST /api/ai/chat (SSE con streaming).
   · La API key de OpenRouter NUNCA sale del backend.
   Arranque:  npm start   →  http://localhost:3000
   ═══════════════════════════════════════════════════════════════ */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const { loadCatalog } = require('./catalog-loader');
const vivago = require('./vivago-ai');

const app = express();
const PUERTO = process.env.PORT || 3000;
const RAIZ = path.join(__dirname, '..');

/* Catálogo real del negocio (misma fuente que el frontend) */
const CATALOGO = loadCatalog();
console.log(`[catalogo] ${CATALOGO.tours.length} tours · ${CATALOGO.rentals.length} alquileres cargados`);

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

/* ── Rate limit simple en memoria para /api/ai/* ──────────────── */
const VENTANA_MS = 10 * 60 * 1000;          // 10 minutos
const MAX_PETICIONES = 30;                  // por IP por ventana
const hits = new Map();
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, lista] of hits) {
    const vivos = lista.filter(t => ahora - t < VENTANA_MS);
    if (vivos.length) hits.set(ip, vivos); else hits.delete(ip);
  }
}, 60 * 1000).unref();

function rateLimitIA(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || '?';
  const ahora = Date.now();
  const lista = (hits.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  if (lista.length >= MAX_PETICIONES) {
    return res.status(429).json({ error: 'Demasiadas consultas seguidas. Espera unos minutos e inténtalo de nuevo.' });
  }
  lista.push(ahora);
  hits.set(ip, lista);
  next();
}

/* ── Validación de entrada ────────────────────────────────────── */
const MAX_MENSAJES = 40;
const MAX_CHARS = 2000;
const IDIOMAS_UI = new Set(['es', 'en', 'pt', 'fr', 'de', 'it', 'nl', 'zh-CN']);

function validarCuerpo(req, res, next) {
  const { messages } = req.body || {};
  const idioma = IDIOMAS_UI.has(req.body?.idioma) ? req.body.idioma : undefined;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'Cuerpo inválido.' });
  }
  if (messages.length > MAX_MENSAJES) {
    return res.status(400).json({ error: 'Historial demasiado largo. Recarga la conversación.' });
  }
  const limpio = [];
  for (const m of messages.slice(-MAX_MENSAJES)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const contenido = String(m.content ?? '').slice(0, MAX_CHARS).trim();
    if (!contenido) continue;
    limpio.push({ role: m.role, content: contenido });
  }
  if (!limpio.length || limpio[limpio.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Falta el mensaje del cliente.' });
  }
  req.historialValido = [
    { role: 'system', content: vivago.systemPrompt(idioma) },
    ...limpio,
  ];
  next();
}

/* ── Endpoint de VivaGo AI (SSE) ──────────────────────────────── */
const SSE = { delta: 'delta', estado: 'estado', error: 'error', fin: 'fin' };
function sse(res, evento, datos) {
  res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
}

app.post('/api/ai/chat', rateLimitIA, validarCuerpo, async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    /* Fase A — herramientas contra datos reales (silenciosa) */
    sse(res, SSE.estado, { paso: 'consultando' });
    const faseA = await vivago.faseHerramientas(req.historialValido, CATALOGO);

    let historialFinal = faseA.mensajesUsados;
    if (!faseA.completo) {
      // Agotó rondas de tools: pide el cierre final
      historialFinal = [...historialFinal, { role: 'user', content: '(Sistema: entrega ya tu respuesta final al cliente usando los datos consultados.)' }];
    }

    /* Fase B — respuesta final con streaming token a token */
    let emitido = false;
    await vivago.conFallback(async (modelo) => {
      const upstream = await vivago.llamarOpenRouter({ modelo, mensajes: historialFinal, stream: true });
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lineas = buffer.split('\n');
        buffer = lineas.pop() || '';
        for (const linea of lineas) {
          const l = linea.trim();
          if (!l.startsWith('data:')) continue;
          const data = l.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const trozo = JSON.parse(data);
            const texto = trozo.choices?.[0]?.delta?.content;
            if (texto) { emitido = true; sse(res, SSE.delta, { texto }); }
          } catch (_) { /* fragmento parcial */ }
        }
      }
      return null; // el consumo del stream ES el resultado
    });

    if (!emitido) sse(res, SSE.error, { mensaje: 'VivaGo AI no pudo responder en este momento. Toca “Reintentar” o escríbenos directo por WhatsApp 🌴' });
    sse(res, SSE.fin, { ok: true });
  } catch (e) {
    console.error('[vivago-ai]', e.code || e.status || '', e.message);
    if (!res.writableEnded) {
      sse(res, SSE.error, {
        mensaje: e.code === 'NO_API_KEY'
          ? 'El asesor está en mantenimiento. Escríbenos por WhatsApp y te atendemos al instante 🌴'
          : 'No pude conectarme en este momento. Toca “Reintentar” o escríbenos por WhatsApp 🌴',
      });
      sse(res, SSE.fin, { ok: false });
    }
  } finally {
    res.end();
  }
});

/* ── Estado del servicio ─────────────────────────────────────── */
app.get('/api/ai/health', (req, res) => {
  res.json({
    servicio: 'VivaGo AI',
    estado: process.env.OPENROUTER_API_KEY ? 'listo' : 'falta OPENROUTER_API_KEY',
    modelo: vivago.MODELO_PRINCIPAL,
    catalogo: { tours: CATALOGO.tours.length, alquileres: CATALOGO.rentals.length },
  });
});

/* ── Sitio estático (intacto: index, tours, alquiler…) ───────── */
app.use(express.static(RAIZ, { extensions: ['html'] }));

app.listen(PUERTO, () => {
  console.log(`[vivago] Servidor arriba en http://localhost:${PUERTO}`);
  console.log(`[vivago] Modelo principal: ${vivago.MODELO_PRINCIPAL}`);
  if (vivago.MODELOS_FALLBACK.length) console.log(`[vivago] Fallbacks: ${vivago.MODELOS_FALLBACK.join(', ')}`);
});
