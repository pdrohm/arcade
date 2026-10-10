'use strict';
// TV de um jogo de fora (ver shared/ext/game.js). O servidor entrega este arquivo como
// /games/<id>/tv.js para todo jogo de fora; o id sai do endereço do próprio script.
// O jogo abre num iframe em tela cheia (/ext/<id>/, pelo proxy). Cada estado dos controles
// que chega do servidor vai para dentro do iframe por postMessage (shared/ext/inject.js).
// Fica em ES5: a TV antiga carrega este arquivo também, mesmo que só mostre o aviso.
(function () {
  var A = window.ARCADE;
  var src = document.currentScript ? document.currentScript.src : '';
  var m = src.match(/\/games\/([a-z0-9_-]+)\/tv\.js/i);
  if (!A || !m) return;
  var id = m[1];
  var last = null, hudKey = '', hudT = null;

  var CSS = 'body.ext-tv #side,body.ext-tv #tvqr{display:none}' +
    '#ext-stage{position:fixed;top:0;left:0;right:0;bottom:0;z-index:40;background:#000}' +
    '#ext-frame{display:block;width:100%;height:100%;border:0}' +
    '#ext-hud{position:fixed;top:14px;left:14px;z-index:41;display:flex;pointer-events:none;font:900 18px/1 Archivo,sans-serif;opacity:.95;-webkit-transition:opacity .8s;transition:opacity .8s}' +
    '#ext-hud.fade{opacity:0}' +
    '#ext-hud>span{display:flex;align-items:center;margin-right:10px;padding:4px 12px 4px 4px;background:#fff;color:#0f0f14;border:3px solid #0f0f14;box-shadow:4px 4px 0 #0f0f14;text-transform:uppercase}' +
    '#ext-hud>span b{margin:0 8px 0 6px;padding:4px 6px;background:#ff9a3c;border:2px solid #0f0f14;font:700 13px/1 "JetBrains Mono",monospace;letter-spacing:.06em}' +
    '#ext-hud>span.free{padding-left:4px;background:#f1f0ea;color:#55555e}' +
    '#ext-hud .avatar{display:inline-block}' +
    '#ext-fail{width:52rem;max-width:92%;margin:12vh auto 0;background:#fff;color:#0f0f14;border:4px solid #0f0f14;box-shadow:12px 12px 0 #0f0f14;font:600 1.35rem/1.45 Archivo,sans-serif;text-align:left}' +
    '#ext-fail .xf-head{padding:1.8rem 2.2rem 1.6rem;border-bottom:4px solid #0f0f14;background-color:#ff9a3c;background-image:radial-gradient(rgba(15,15,20,.18) 2px,transparent 2.1px);background-size:16px 16px}' +
    '#ext-fail .xf-tag{display:inline-block;padding:.4rem .8rem;background:#0f0f14;color:#f1f0ea;font:700 .95rem/1 "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase}' +
    '#ext-fail h2{margin:.9rem 0 0;font-family:Archivo,sans-serif;font-weight:900;font-stretch:125%;text-transform:uppercase;font-size:3rem;line-height:.95;letter-spacing:-.01em}' +
    '#ext-fail .xf-body{padding:1.6rem 2.2rem 2rem}' +
    '#ext-fail p{margin:0 0 1rem}' +
    '#ext-fail .xf-link{display:inline-block;padding:.6rem 1rem;background:#ffce1f;color:#0f0f14;border:3px solid #0f0f14;box-shadow:5px 5px 0 #0f0f14;font:700 1.5rem/1 "Pixelify Sans",monospace;text-decoration:none;word-break:break-all}' +
    '#ext-fail .xf-note{margin:1.4rem 0 0;color:#55555e;font:700 1rem/1.3 "JetBrains Mono",monospace;letter-spacing:.06em;text-transform:uppercase}';

  function supported(G) {
    if (G.needs === 'webgpu') return !!navigator.gpu;
    if (G.needs === 'wasm') return typeof WebAssembly === 'object';
    return true;
  }
  function frameEl() { return document.getElementById('ext-frame'); }
  function post(G) {
    var f = frameEl();
    if (!G || !G.state || !f || !f.contentWindow) return;
    try { f.contentWindow.postMessage({ t: 'arcade-pads', pads: G.state }, location.origin); } catch (err) {}
  }
  // A página do jogo avisou que está pronta: recebe o estado atual dos controles na hora.
  function onMessage(e) { if (e.data && e.data.t === 'arcade-ext-ready' && last) post(last); }

  function hud(c) {
    var el = document.getElementById('ext-hud');
    if (!el) return;
    var G = c.G, parts = [], key = '';
    for (var i = 0; i < G.seats.length; i++) {
      var p = G.seats[i];
      key += (p ? p.pid + p.name + p.color + JSON.stringify(p.av) : '-') + '|';
      var label = G.pads > 1 ? '<b>P' + (i + 1) + '</b>' : '<b>P1</b>';
      parts.push(p ? '<span>' + c.avatar(p, 30) + label + c.esc(p.name) + '</span>' : '<span class="free">' + label + 'livre · pegue no celular</span>');
    }
    if (key === hudKey) return;
    hudKey = key;
    el.innerHTML = parts.join('');
    // Aparece quando muda quem joga e some depois de uns segundos, para não cobrir o jogo.
    el.className = '';
    clearTimeout(hudT);
    hudT = setTimeout(function () { el.className = 'fade'; }, 6000);
  }

  function mount(c) {
    document.body.classList.add('ext-tv');
    if (!document.getElementById('ext-tv-css')) {
      var st = document.createElement('style');
      st.id = 'ext-tv-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    window.addEventListener('message', onMessage);
    hudKey = '';
    var name = c.game().name || id;
    // WebGPU só existe em página segura (https ou localhost). No Mac, a TV aberta por
    // http://192.168.x.x não é segura: o mesmo endereço com "localhost" resolve.
    if (!supported(c.G) && !window.isSecureContext) {
      var safe = 'http://localhost:' + (location.port || '80') + location.pathname;
      return '<div id="ext-fail"><div class="xf-head"><span class="xf-tag">' + c.esc(name) + ' · aviso</span><h2>Abra a TV pelo localhost</h2></div><div class="xf-body">' +
        '<p>O Chrome só liga o WebGPU em endereço seguro. Este computador abriu a TV pelo IP do Wi-Fi.</p>' +
        '<p><a class="xf-link" href="' + c.esc(safe) + '">' + c.esc(safe) + '</a></p>' +
        '<p class="xf-note">Os celulares continuam no endereço de sempre</p></div></div>';
    }
    if (!supported(c.G)) {
      return '<div id="ext-fail"><div class="xf-head"><span class="xf-tag">' + c.esc(name) + ' · aviso</span><h2>Não roda nesta tela</h2></div><div class="xf-body">' +
        '<p>Este jogo precisa de um computador com o Chrome atualizado' + (c.G.needs === 'webgpu' ? ' (WebGPU)' : '') + '.</p>' +
        '<p class="xf-note">Abra esta mesma sala no computador ligado na TV e escolha o jogo de novo</p></div></div>';
    }
    return '<div id="ext-stage"><iframe id="ext-frame" src="' + c.esc(c.G.path) + '" allow="fullscreen; gamepad; autoplay" allowfullscreen></iframe><div id="ext-hud"></div></div>';
  }
  function after(c) { last = c.G; hud(c); post(c.G); }
  function frame(c) { last = c.G; post(c.G); }
  function destroy() {
    window.removeEventListener('message', onMessage);
    document.body.classList.remove('ext-tv');
    clearTimeout(hudT);
    last = null; hudKey = '';
  }

  A.register(id, { tv: { mount: mount, html: function () { return { side: '' }; }, after: after, frame: frame, destroy: destroy } });
})();
