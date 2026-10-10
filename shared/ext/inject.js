// Entra no topo da página de um jogo de fora (o proxy em server.js põe este <script> antes de tudo).
// Faz duas coisas:
//   1. O jogo pensa que está na raiz do próprio site: pedidos para "/algo" voltam para /ext/<id>/algo.
//   2. Cria controles de Xbox virtuais. A TV (a página pai) manda o estado dos celulares por postMessage
//      e o jogo lê esses controles por navigator.getGamepads(), como se fossem de verdade.
// Roda no Chrome do PC, mas fica em ES5 como o resto de shared/ (ver test/tv-compat.js).
(function () {
  'use strict';
  var me = document.currentScript;
  var prefix = (me && me.getAttribute('data-prefix')) || '';
  if (!prefix) return;

  // ---------- 1. endereços ----------
  function fix(u) {
    var url;
    try { url = new URL(String(u), location.href); } catch (err) { return u; }
    var same = url.host === location.host && /^(https?|wss?):$/.test(url.protocol);
    if (!same || url.pathname.indexOf(prefix + '/') === 0 || url.pathname === prefix) return u;
    url.pathname = prefix + url.pathname;
    return url.href;
  }
  var realFetch = window.fetch;
  if (realFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string' || (window.URL && input instanceof URL)) input = fix(input);
      else if (input && input.url && fix(input.url) !== input.url) input = new Request(fix(input.url), input);
      return realFetch.call(this, input, init);
    };
  }
  var realOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = fix(url);
    return realOpen.apply(this, args);
  };
  function wrap(name) {
    var Real = window[name];
    if (!Real) return;
    var Fake = function (url, opt) { return opt === undefined ? new Real(fix(url)) : new Real(fix(url), opt); };
    Fake.prototype = Real.prototype;
    for (var k in Real) if (Object.prototype.hasOwnProperty.call(Real, k)) Fake[k] = Real[k];
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (c) { if (c in Real) Fake[c] = Real[c]; });
    window[name] = Fake;
  }
  wrap('WebSocket');
  wrap('EventSource');
  wrap('Worker');

  // ---------- 2. controles virtuais ----------
  // Ordem dos botões da Gamepad API "standard": 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT,
  // 8 Back, 9 Start, 10 L3, 11 R3, 12 cima, 13 baixo, 14 esquerda, 15 direita, 16 Guia.
  var BUTTONS = 17;
  var pads = [];        // um Gamepad virtual por vaga
  var announced = [];
  var GP = window.Gamepad, GB = window.GamepadButton;
  // O motor de alguns jogos confere `instanceof Gamepad`: o objeto nasce do protótipo de verdade
  // e cada campo é próprio (os getters nativos dariam "Illegal invocation").
  function make(proto, fields) {
    var o = Object.create(proto ? proto.prototype : Object.prototype);
    for (var k in fields) Object.defineProperty(o, k, { value: fields[k], writable: true, enumerable: true });
    return o;
  }
  function button(on) { return make(GB, { pressed: on, touched: on, value: on ? 1 : 0 }); }
  function pad(i, s) {
    var buttons = [];
    for (var b = 0; b < BUTTONS; b++) buttons.push(button(!!(s.b & (1 << b))));
    return make(GP, {
      id: 'Arcade Pad ' + (i + 1) + ' (STANDARD GAMEPAD Vendor: 045e Product: 028e)',
      index: i, connected: true, mapping: 'standard', timestamp: performance.now(),
      axes: [s.a[0] || 0, s.a[1] || 0, s.a[2] || 0, s.a[3] || 0], buttons: buttons,
      vibrationActuator: null, hand: '', hapticActuators: [], pose: null,
    });
  }
  function announce(i) {
    if (announced[i]) return;
    announced[i] = true;
    var ev;
    try { ev = new Event('gamepadconnected'); Object.defineProperty(ev, 'gamepad', { value: pads[i] }); window.dispatchEvent(ev); } catch (err) {}
  }
  var realGet = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : function () { return []; };
  // Primeiro os controles do arcade (índice 0, 1…), depois os de verdade ligados no PC.
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: function () {
      var out = pads.slice();
      var real = realGet() || [];
      for (var i = 0; i < real.length; i++) if (real[i]) out.push(real[i]);
      return out;
    },
  });
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || e.origin !== location.origin) return;
    var d = e.data;
    if (!d || d.t !== 'arcade-pads' || !d.pads || !d.pads.length) return;
    for (var i = 0; i < d.pads.length; i++) {
      var s = d.pads[i] || { b: 0, a: [] };
      pads[i] = pad(i, { b: s.b >>> 0, a: s.a || [] });
      announce(i);
    }
  });
  // Avisa a TV que a página do jogo está pronta para receber os controles.
  try { window.parent.postMessage({ t: 'arcade-ext-ready' }, location.origin); } catch (err) {}
})();
