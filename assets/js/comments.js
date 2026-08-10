/* ═══════════════════════════════════════════════════════════════
   COMENTARIOS — VivaGo Experience
   Lee y escribe en la colección Firestore "comentarios"
   ═══════════════════════════════════════════════════════════════ */

let selectedStars = 5;

function initComments() {
  const form = document.getElementById('reviewForm');
  const list = document.getElementById('reviewList');
  const starPicker = document.getElementById('starPicker');
  if (!form || !list) return;

  /* estrellas seleccionables */
  if (starPicker) {
    starPicker.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedStars = Number(btn.dataset.val);
        [...starPicker.children].forEach((b) => b.classList.toggle('on', Number(b.dataset.val) <= selectedStars));
      });
    });
  }

  function startListening() {
    const { db, collection, query, orderBy, limit, onSnapshot } = window.VTC_FIREBASE;
    const q = query(collection(db, 'comentarios'), orderBy('createdAt', 'desc'), limit(40));
    onSnapshot(q, (snap) => {
      if (snap.empty) {
        list.innerHTML = `<div class="review-empty">Sé el primero en dejar tu experiencia con nosotros 🌊</div>`;
        return;
      }
      list.innerHTML = snap.docs.map((doc) => {
        const d = doc.data();
        const initial = (d.nombre || '?').trim()[0]?.toUpperCase() || '?';
        return `
        <div class="review-card">
          <div class="review-top">
            <div class="review-avatar">
              <div class="circle">${initial}</div>
              <div>
                <b>${escapeHtml(d.nombre || 'Viajero')}</b>
                <span>${d.tour ? escapeHtml(d.tour) : 'Experiencia Vivanco\'s'}</span>
              </div>
            </div>
            <div class="review-stars">${starRow(d.rating || 5)}</div>
          </div>
          <p>${escapeHtml(d.mensaje || '')}</p>
        </div>`;
      }).join('');
    }, (err) => {
      list.innerHTML = `<div class="review-empty">No se pudieron cargar los comentarios (${err.message})</div>`;
    });
  }

  if (window.VTC_FIREBASE) startListening();
  else window.addEventListener('vtc-firebase-ready', startListening, { once: true });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reviewNombre').value.trim();
    const tour = document.getElementById('reviewTour').value.trim();
    const mensaje = document.getElementById('reviewMensaje').value.trim();
    if (!nombre || !mensaje) return;

    if (!window.VTC_FIREBASE) { showToast('⚠️ Firebase aún no está listo, intenta de nuevo.'); return; }
    const { db, collection, addDoc, serverTimestamp } = window.VTC_FIREBASE;
    addDoc(collection(db, 'comentarios'), {
      nombre, tour, mensaje, rating: selectedStars, createdAt: serverTimestamp(),
    }).then(() => {
      form.reset();
      selectedStars = 5;
      if (starPicker) [...starPicker.children].forEach((b) => b.classList.toggle('on', true));
      showToast('✅ ¡Gracias por tu comentario!');
    }).catch((err) => showToast('⚠️ No se pudo enviar: ' + err.message));
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', initComments);
