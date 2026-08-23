/* ═══════════════════════════════════════════════════════════════
   FIREBASE — VivaGo Experience
   Firestore se usa únicamente para:
     · colección "comentarios" → reseñas que dejan los turistas
   ═══════════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, query, orderBy, limit,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKcqPbWty1BLgnwssWnqI1-1VRk5S3HF0",
  authDomain: "vivanco-s-tours-ctg.firebaseapp.com",
  projectId: "vivanco-s-tours-ctg",
  storageBucket: "vivanco-s-tours-ctg.firebasestorage.app",
  messagingSenderId: "351740244420",
  appId: "1:351740244420:web:d27424f46bfa69850d7491",
  measurementId: "G-M7JN4TBXLK"
};

const app = initializeApp(firebaseConfig);
/* Analytics solo en producción: la clave tiene restricción de referrer
   y localhost dispara errores 403 (instalaciones/webConfig). */
const esLocal =
  location.protocol === 'file:' ||
  ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

let analytics;
if (!esLocal) {
  try { analytics = getAnalytics(app); } catch (e) { /* analytics no disponible */ }
}
const db = getFirestore(app);

/* Expuesto globalmente para que lo use comments.js
   sin tener que convertir todo el sitio en módulos ES. */
window.VTC_FIREBASE = {
  db, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp
};

/* Avisa al resto de scripts que Firebase ya está listo */
window.dispatchEvent(new Event('vtc-firebase-ready'));
