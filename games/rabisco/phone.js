// Rabisco — tela do celular. O quadro (shared/rabisco/draw.js) e a tela (shared/rabisco/phone-ui.js)
// moram em shared/ e são carregados aqui, na hora; até chegarem, aparece "Carregando…".
'use strict';
(() => {
  let ready = false;
  const files = ['/shared/rabisco/draw.js', '/shared/rabisco/phone-ui.js'];
  const next = i => {
    if (i >= files.length) { ready = true; ARCADE.redraw(); return; }
    const sc = document.createElement('script');
    sc.src = files[i]; sc.onload = () => next(i + 1); sc.onerror = () => next(i + 1);
    document.head.appendChild(sc);
  };
  next(0);
  const UI = () => (ready && ARCADE.rabiscoPhone) || null;

  ARCADE.register('rabisco', {
    phone: {
      key(c) { return UI() ? UI().key(c) : 'loading'; },
      html(c) { return UI() ? UI().html(c) : '<div class="box center"><p class="sub">Carregando…</p></div>'; },
      after(c) { if (UI()) UI().after(c); },
      frame(c) { if (UI()) UI().frame(c); },
      act(a, el, c) { if (UI()) UI().act(a, el, c); },
      destroy() { if (UI()) UI().leave(); },
    },
  });
})();
