// Rabisco — tela da TV. O quadro (shared/rabisco/draw.js) e a tela (shared/rabisco/tv-ui.js)
// moram em shared/ e são carregados aqui, na hora. A TV da casa é um Chrome 47 (docs/TV-ANTIGA.md).
'use strict';
(() => {
  let ready = false, mounted = false;
  const files = ['/shared/rabisco/draw.js', '/shared/rabisco/tv-ui.js'];
  const next = i => {
    if (i >= files.length) { ready = true; if (ARCADE.redraw) ARCADE.redraw(); return; }
    const sc = document.createElement('script');
    sc.src = files[i]; sc.onload = () => next(i + 1); sc.onerror = () => next(i + 1);
    document.head.appendChild(sc);
  };
  next(0);
  const UI = () => (ready && ARCADE.rabiscoTv) || null;

  ARCADE.register('rabisco', {
    tv: {
      // o palco é montado uma vez; se a tela ainda não carregou, html() monta quando chegar
      mount() { mounted = false; return '<div id="rb-host" style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center"><div class="box center"><p class="sub">Carregando…</p></div></div>'; },
      html(c) {
        const host = document.getElementById('rb-host');
        if (!UI() || !host) return { side: '' };
        if (!mounted) { host.innerHTML = UI().mount(c); mounted = true; }
        return UI().html(c) || {};
      },
      frame(c) { if (UI() && mounted) UI().frame(c); },
      after(c) { if (UI() && mounted) UI().after(c); },
      destroy() { if (UI()) UI().leave(); mounted = false; },
    },
  });
})();
