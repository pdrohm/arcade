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
    '#ext-hud{position:fixed;top:10px;left:10px;z-index:41;display:flex;gap:8px;pointer-events:none;font:700 15px/1 system-ui,sans-serif;opacity:.85;-webkit-transition:opacity .8s;transition:opacity .8s}' +
    '#ext-hud.fade{opacity:0}' +
    '#ext-hud span{display:flex;align-items:center;gap:6px;padding:5px 10px 5px 5px;border-radius:999px;background:rgba(0,0,0,.65);color:#fff}' +
    '#ext-hud .avatar{display:inline-block}' +
    '#ext-fail{max-width:720px;margin:12vh auto;padding:28px;border-radius:18px;background:#161b2c;color:#e5e7eb;text-align:center;font:18px/1.5 system-ui,sans-serif}' +
    '#ext-fail h2{margin:0 0 10px;font-size:28px}';

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
      var label = G.pads > 1 ? '🎮 ' + (i + 1) + ' ' : '🎮 ';
      parts.push('<span>' + (p ? c.avatar(p, 24) + label + c.esc(p.name) : label + 'livre: pegue no celular') + '</span>');
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
      return '<div id="ext-fail"><h2>' + c.esc(name) + ': abra a TV pelo localhost</h2>' +
        '<p>O Chrome só liga o WebGPU em endereço seguro. Este computador abriu a TV pelo IP do Wi-Fi.</p>' +
        '<p><a href="' + c.esc(safe) + '" style="color:#facc15;font-weight:800">' + c.esc(safe) + '</a></p>' +
        '<p>Os celulares continuam no endereço de sempre.</p></div>';
    }
    if (!supported(c.G)) {
      return '<div id="ext-fail"><h2>' + c.esc(name) + ' não roda nesta tela</h2>' +
        '<p>Este jogo precisa de um computador com o Chrome atualizado' + (c.G.needs === 'webgpu' ? ' (WebGPU)' : '') + '.</p>' +
        '<p>Abra esta mesma sala no computador ligado na TV e escolha o jogo de novo.</p></div>';
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
