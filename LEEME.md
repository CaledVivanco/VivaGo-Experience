# Vivanco's Tours CTG — Instrucciones

## 1. Estructura
```
index.html          → página de inicio (hero + destacados + comentarios)
tours.html           → catálogo completo de tours (independiente)
alquiler.html         → catálogo completo de alquiler náutico (independiente)
assets/css/styles.css → estilos de todo el sitio
assets/js/            → toda la lógica (catálogo, tarjetas, detalles, comentarios, firebase)
index_files/           → AQUÍ van tus fotos
```

> **Nota:** cada card abre, al hacer clic, un modal con el detalle
> completo del tour o embarcación (foto grande, descripción, tags/specs
> y disponibilidad) y un botón **"Reservar por WhatsApp"** que abre un
> chat con el número del negocio y ya trae el mensaje escrito con el
> nombre del tour/embarcación. Además hay un botón flotante de WhatsApp
> fijo en la esquina inferior derecha, visible en las 3 páginas, para
> que cualquier visitante escriba directo sin buscar el tour primero.
> No hay formulario de reserva propio: todo el contacto pasa por
> WhatsApp, y no se guarda nada en la colección `reservas`.

## 2. Agrega tus imágenes
Copia tus fotos dentro de la carpeta `index_files/` con **el mismo nombre**
que aparece en `assets/js/catalog-data.js` (ej: `isla-sol.jpg`, `pao-pao.png`, `makarela.png`...).
Mientras no subas una foto, esa tarjeta muestra automáticamente un
placeholder de marca (no un ícono de imagen rota), así que puedes publicar
el sitio ya mismo y ir agregando fotos poco a poco.

Para la imagen del hero (la bandera), guárdala como:
```
index_files/bandera.png
```
Ya tiene el efecto de "subir desde abajo" al cargar la página y un
ondeo continuo tipo tela (filtro SVG `flagWave`), como una bandera real.

## 2.1 Fotos pendientes de los tours nuevos
Estos 3 tours nuevos todavía no tienen foto propia (mientras tanto se ve
el placeholder de marca automático). Cuando tengas las fotos, guárdalas
en `index_files/` con estos nombres exactos:
```
index_files/traslado-aeropuerto.jpg   → Traslado Aeropuerto ↔ Hotel
index_files/barrios-populares.jpg     → Tour Barrios Populares
index_files/shopping-tour.jpg         → Shopping Tour
```
Los demás tours nuevos (Bora Bora, Walking Tour, Aviario, Eco Tour,
Manglares + Volcán del Totumo) ya están usando fotos que tenías subidas
en `index_files/` que encajaban con el tema.

## 3. Tu número de WhatsApp
Abre `assets/js/utils.js` y reemplaza el número de ejemplo:
```js
const WHATSAPP_NUMBER = '573000000000';
```
Debe ir en formato internacional, solo dígitos, sin `+` ni espacios
(ej: `57` = Colombia + tu número a 10 dígitos). Ese número recibe
tanto el botón "Reservar por WhatsApp" del modal como el botón
flotante fijo en la esquina inferior derecha.

## 4. Activa Firestore (comentarios)
Tu proyecto de Firebase (`vivanco-s-tours-ctg`) ya está conectado en
`assets/js/firebase-init.js`. Solo falta habilitar Firestore:

1. Ve a [Firebase Console](https://console.firebase.google.com/) → tu proyecto → **Firestore Database** → **Crear base de datos**.
2. En **Reglas**, usa algo como esto para permitir que los turistas
   lean y dejen comentarios (ajústalo si luego quieres restringirlo más):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /comentarios/{doc} {
      allow read: if true;
      allow create: if request.resource.data.nombre is string
                    && request.resource.data.mensaje is string
                    && request.resource.data.mensaje.size() < 600;
    }
  }
}
```

Los comentarios se ven en vivo en la sección "Reseñas" del `index.html`.
Es la **única** colección que usa el sitio: no se guarda nada de las
reservas en Firestore, esas van directo a WhatsApp.

## 5. Redes sociales ("Pase de abordaje social")
En `index.html` (sección `#redes`, visible también desde el botón
"Redes" del menú y del footer en las 3 páginas) hay un panel con 3
pestañas — Facebook, Instagram y TikTok — conectado a tus **cuentas
reales**, ya configuradas:

- `assets/js/utils.js` → `SOCIAL_LINKS` tiene tus 3 URLs reales
  (Facebook, Instagram, TikTok). Esto alimenta el botón "Seguir" del
  panel y los 3 íconos del footer en las 3 páginas.
- **Instagram** y **TikTok** se muestran con los widgets oficiales
  `embed.js` de cada red (los mismos scripts que usa Meta/TikTok
  para insertar contenido, sin token ni API de desarrollador). Los
  `<script>` están cargados una sola vez en el `<head>` de
  `index.html`, y los 3 paneles (Facebook/Instagram/TikTok) ya están
  en el HTML desde que carga la página — solo se ocultan/muestran
  con CSS al cambiar de pestaña. Esto es clave: si el bloque de
  Instagram/TikTok se insertara recién al hacer clic (como se hacía
  antes), el script podía no alcanzar a procesarlo.
  - Instagram: como el widget está pensado para publicaciones
    puntuales, apuntarlo al perfil a veces muestra la grilla completa
    de tus últimas fotos (como te pasó) y a veces solo una tarjeta
    con tu foto de perfil — depende de cómo Meta decida renderizarlo
    ese día, no es algo que se pueda forzar desde el código.
  - TikTok: muestra tu perfil real con tus videos.
- **Facebook**: usa el *Page Plugin* oficial de Meta (widget `fb-page`
  en `index.html`, dentro de `#redes`), con la misma lógica que
  Instagram y TikTok: apunta solo a tu perfil real, sin token ni
  links de publicaciones puntuales. Importante: a diferencia de
  Instagram/TikTok, este widget **siempre** trae su propia cabecera
  ("Seguir página" / "Compartir") — es contenido real cargado desde
  facebook.com dentro de un iframe, así que no se puede ocultar ni
  restylear con CSS. Si alguna vez ves esa tarjeta en blanco o con la
  publicación cortada, normalmente es un bloqueador de rastreadores
  del navegador del visitante (adblock, modo incógnito con
  protecciones extra, etc.) — no es un error del sitio.
- `assets/js/social-data.js` solo guarda el `handle` de cada cuenta
  (usado en las pestañas). El campo `followers` es opcional: déjalo
  en `null` para ocultarlo o escribe un texto como `'5.1k seguidores'`
  si quieres mostrarlo (no se actualiza solo, hay que editarlo a mano).
- `assets/js/social-data.js` solo guarda el `handle` de cada cuenta
  (usado en las pestañas). El campo `followers` es opcional: déjalo
  en `null` para ocultarlo o escribe un texto como `'5.1k seguidores'`
  si quieres mostrarlo (no se actualiza solo, hay que editarlo a mano).

## 6. Publicar el sitio
Puedes subir la carpeta completa a **Firebase Hosting**, Netlify, Vercel
o cualquier hosting estático — son solo archivos HTML/CSS/JS, no
requieren servidor ni build.

## 7. Cómo funcionan las cards ahora
1. El turista da clic (o Enter/Espacio con teclado) en cualquier card,
   tanto en los carruseles de `index.html` como en las grillas de
   `tours.html` y `alquiler.html`.
2. Se abre un modal (`assets/js/details.js`) con la foto grande, el
   nombre, la calificación o disponibilidad, los tags o specs, la
   descripción completa y el botón **"Reservar por WhatsApp"**.
3. Ese botón abre WhatsApp con tu número (`WHATSAPP_NUMBER`) y un
   mensaje ya redactado con el nombre del tour o embarcación, listo
   para que el turista solo dé "Enviar". No hay formulario propio ni
   recibo en el sitio: toda la conversación de reserva pasa por
   WhatsApp.

## 8. VivaGo AI (asesor turístico con IA)

Chat flotante "VivaGo AI" disponible en las 3 páginas. Es un asesor
comercial que recomienda tours y alquileres REALES del catálogo,
calcula presupuestos por persona en el servidor y lleva al cliente a
reservar por WhatsApp (mismo número de `utils.js`).

**Cómo funciona:**
```
server/                    → backend Node.js/Express (NUEVO, opcional para el resto del sitio)
  server.js                → sirve el sitio + endpoint POST /api/ai/chat (streaming SSE)
  vivago-ai.js             → instrucciones del agente + cliente OpenRouter (con fallback)
  tools.js / pricing.js    → herramientas: buscarTours, buscarAlquileres, calcularPresupuesto,
                             consultarPrecio, compararOpciones (todo sobre datos reales)
  catalog-loader.js        → lee assets/js/catalog-data.js (UNA sola fuente de verdad)
assets/js/vivago-chat.js   → widget del chat (frontend)
assets/css/vivago-chat.css → estilos del chat (misma identidad visual)
```

**Para activarlo:**
1. `cd server && npm install`
2. Copia `.env.example` como `.env` (en la raíz) y pon tu
   `OPENROUTER_API_KEY` de https://openrouter.ai/keys
3. `npm start` → abre http://localhost:3000

La API key vive SOLO en el backend (.env). Nunca aparece en el HTML/JS
del navegador. El endpoint tiene rate limit (30 consultas / 10 min por
IP) y validación de entrada.

Si publicas el sitio en un hosting estático sin Node, el chat muestra
un mensaje amable y el resto del sitio sigue funcionando igual que
siempre (WhatsApp + catálogo no dependen del backend).
