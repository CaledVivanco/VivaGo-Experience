/* ═══════════════════════════════════════════════════════════════
   SOCIAL DATA — VivaGo Experience
   El panel "Pase de abordaje social" ya no usa publicaciones de
   ejemplo: Facebook y TikTok se muestran con los widgets OFICIALES
   de cada red (feed en vivo, real), e Instagram con una tarjeta de
   "Seguir" que enlaza directo al perfil real (Meta no permite
   embeber el feed completo sin token de desarrollador). Ver
   assets/js/social.js y LEEME.md, sección 5.

   Aquí solo queda la info de cada cuenta (handle) que se usa en las
   pestañas. "followers" es un texto libre; ponlo en null para
   ocultarlo, o actualízalo a mano de vez en cuando si quieres
   mostrar un número aproximado de seguidores.
   ═══════════════════════════════════════════════════════════════ */

const socialProfiles = {
  facebook: { handle: '@vivagoexperience', followers: null, gate: 'FB' },
  instagram: { handle: '@vivagoexperience', followers: null, gate: 'IG' },
  tiktok: { handle: '@vivagoexperience', followers: null, gate: 'TT' },
};
