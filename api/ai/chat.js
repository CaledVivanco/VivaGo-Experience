/* ═══════════════════════════════════════════════════════════════
   VIVAGO AI — función serverless para Vercel (POST /api/ai/chat)
   Reutiliza la misma lógica que server/server.js:
     · Fase A: herramientas contra el catálogo real (function calling)
     · Fase B: respuesta final en streaming (SSE)
   La API key vive SOLO en las variables de entorno de Vercel.
   ═══════════════════════════════════════════════════════════════ */

const vivago = require('../../server/vivago-ai');
const { loadCatalog } = require('../../server/catalog-loader');

/* Catálogo cargado una vez por instancia fría */
const CATALOGO = loadCatalog();

/* ── Rate limit simple en memoria (por instancia) ─────────────── */
const VENTANA_MS = 10 * 60 * 1000;          // 10 minutos
const MAX_PETICIONES = 30;                  // por IP por ventana
const hits = new Map();

function permitir(ip) {
  const ahora = Date.now();
  const lista = (hits.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  if (lista.length >= MAX_PETICIONES) return false;
  lista.push(ahora);
  hits.set(ip, lista);
  return true;
}

/* ── Validación de entrada ────────────────────────────────────── */
const MAX_MENSAJES = 40;
const MAX_CHARS = 2000;

function validarHistorial(messages) {
  if (!Array.isArray(messages) || !messages.length) return null;
  const limpio = [];
  for (const m of messages.slice(-MAX_MENSAJES)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const contenido = String(m.content ?? '').slice(0, MAX_CHARS).trim();
    if (!contenido) continue;
    limpio.push({ role: m.role, content: contenido });
  }
  if (!limpio.length || limpio[limpio.length - 1].role !== 'user') return null;
  return [{ role: 'system', content: vivago.systemPrompt() }, ...limpio];
}

function sse(res, evento, datos) {
  res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
}

/* ── Handler ──────────────────────────────────────────────────── */
module.exports = async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || '?';

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Método no permitido.' }));
  }

  if (!permitir(ip)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ error: 'Demasiadas consultas seguidas. Espera unos minutos e inténtalo de nuevo.' }));
  }

  /* Cuerpo: @vercel/node puede traerlo en req.body o hay que leerlo a mano */
  let cuerpo = req.body;
  if (!cuerpo) {
    cuerpo = await new Promise((resolve) => {
      let data = '';
      req.on('data', c => { data += c; });
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
  }
  let messages;
  try {
    messages = typeof cuerpo === 'string' ? JSON.parse(cuerpo || '{}').messages : cuerpo.messages;
  } catch (_) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Cuerpo inválido.' }));
  }

  const historialValido = validarHistorial(messages);
  if (!historialValido) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Falta el mensaje del cliente.' }));
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    /* Fase A — herramientas contra datos reales (silenciosa) */
    sse(res, 'estado', { paso: 'consultando' });
    const faseA = await vivago.faseHerramientas(historialValido, CATALOGO);

    let historialFinal = faseA.mensajesUsados;
    if (!faseA.completo) {
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
            if (texto) { emitido = true; sse(res, 'delta', { texto }); }
          } catch (_) { /* fragmento parcial */ }
        }
      }
      return null;
    });

    if (!emitido) sse(res, 'error', { mensaje: 'VivaGo AI no pudo responder en este momento. Toca “Reintentar” o escríbenos directo por WhatsApp 🌴' });
    sse(res, 'fin', { ok: true });
  } catch (e) {
    console.error('[vivago-ai]', e.code || e.status || '', e.message);
    sse(res, 'error', {
      mensaje: e.code === 'NO_API_KEY'
        ? 'El asesor está en mantenimiento. Escríbenos por WhatsApp y te atendemos al instante 🌴'
        : 'No pude conectarme en este momento. Toca “Reintentar” o escríbenos por WhatsApp 🌴',
    });
    sse(res, 'fin', { ok: false });
  } finally {
    res.end();
  }
};
