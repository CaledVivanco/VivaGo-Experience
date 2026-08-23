/* Mock mínimo de OpenRouter para pruebas end-to-end del backend
   VivaGo AI SIN usar la API real. Simula: 1ª ronda con tool_calls,
   2ª ronda con contenido, y modo streaming SSE.
   Uso: node mock-openrouter.js  (puerto 4599) */
const http = require('http');

const body = (req) => new Promise((res) => {
  let d = '';
  req.on('data', c => d += c);
  req.on('end', () => res(JSON.parse(d || '{}')));
});

http.createServer(async (req, res) => {
  const payload = await body(req);
  const toolsRequested = Array.isArray(payload.tools);
  const hayToolResults = payload.messages.some(m => m.role === 'tool');
  console.log('[mock] peticion → tools:', toolsRequested, '| toolResults:', hayToolResults, '| stream:', !!payload.stream);

  if (!/^Bearer .+/.test(req.headers.authorization || '')) {
    res.writeHead(401); return res.end('{}');
  }

  /* Streaming de la respuesta final */
  if (payload.stream) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const partes = ['Para 5 personas con ', '**$500.000**, tu presupuesto es **$100.000 por persona**.\n- Punta Arena (desde $60.000/persona): isla económica con almuerzo\n- Playa Tranquila ($150.000): el secreto de Barú\nTe recomiendo Punta Arena por encajar holgado en tu presupuesto. ¿Quieres que te ayude a reservar?\n[[RESERVAR:Punta Arena]]'];
    for (const p of partes) {
      for (const trozo of p.match(/.{1,18}/gs)) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: trozo } }] })}\n\n`);
      }
      await new Promise(r => setTimeout(r, 30));
    }
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  /* Fase de herramientas */
  if (toolsRequested && !hayToolResults) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant', content: null,
          tool_calls: [{
            id: 'call_1', type: 'function',
            function: { name: 'calcularPresupuesto', arguments: '{"presupuesto":500000,"personas":5}' },
          }],
        },
      }],
    }));
  }
  if (toolsRequested && hayToolResults) {
    // Segunda ronda: pide buscar tours (prueba multi-ronda)
    const yaBusco = payload.messages.some(m => m.role === 'tool' && m.content.includes('"nombre"'));
    if (!yaBusco) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        choices: [{
          message: {
            role: 'assistant', content: null,
            tool_calls: [{
              id: 'call_2', type: 'function',
              function: { name: 'buscarTours', arguments: '{"personas":5,"presupuestoTotal":500000}' },
            }],
          },
        }],
      }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '' } }] }));
  }

  /* Sin herramientas (saludo directo) */
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '¡Hola! Soy VivaGo AI 🌴' } }] }));
}).listen(4599, () => console.log('[mock] OpenRouter falso en http://localhost:4599'));
