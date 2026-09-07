'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function harness({ coarse = true, landscape = true } = {}) {
  let now = 0, id = 0, hooks;
  const timers = new Map(), sent = [];
  class Element {
    constructor() { this.listeners = {}; this.dataset = {}; this.isConnected = true; this.hidden = false; this.style = { setProperty() {} }; this.classList = { toggle() {}, add() {}, remove() {} }; }
    addEventListener(type, callback, options = {}) { (this.listeners[type] ||= []).push(callback); options.signal?.addEventListener('abort', () => { this.listeners[type] = this.listeners[type].filter(f => f !== callback); }); }
    emit(type, values = {}) { for (const callback of this.listeners[type] || []) callback({ pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100, preventDefault() {}, ...values }); }
    setPointerCapture() {}
    setAttribute(key, value) { this[key] = value; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 200 }; }
  }
  const root = new Element(), stick = new Element(), knob = new Element();
  const actions = ['drift', 'item', 'boost'].map(name => { const e = new Element(); e.dataset.control = name; return e; });
  const els = { '[data-stick]': stick, '.kart-stick-knob': knob, '[data-fullscreen]': new Element(), '.kart-gamepad': new Element(), '.kart-rotate': new Element(), '.kart-item': actions[1], '.kart-boost': actions[2], '.kart-drift': actions[0] };
  root.querySelector = key => els[key]; root.querySelectorAll = () => actions;
  const window = new Element(), document = new Element(); document.body = new Element(); document.hidden = false;
  document.getElementById = key => key === 'kart-controller' ? root : null;
  const coarseQuery = new Element(), landscapeQuery = new Element(); coarseQuery.matches = coarse; landscapeQuery.matches = landscape;
  window.matchMedia = q => q.includes('coarse') ? coarseQuery : landscapeQuery;
  const schedule = (fn, wait, interval) => { timers.set(++id, { fn, at: now + Math.max(1, wait), interval }); return id; };
  const sandbox = { window, document, screen: {}, navigator: {}, AbortController, performance: { now: () => now },
    setTimeout: (fn, wait) => schedule(fn, wait), clearTimeout: n => timers.delete(n), setInterval: (fn, wait) => schedule(fn, wait, wait), clearInterval: n => timers.delete(n),
    ARCADE: { register: (_, game) => { hooks = game.phone; }, send: state => sent.push({ ...state, at: now }) } };
  vm.runInNewContext(fs.readFileSync('games/kart/phone.js', 'utf8'), sandbox);
  const context = { you: { pid: 'p1' }, G: { matchId: 'match1', phase: 'playing', roster: [{ pid: 'p1' }], private: {} } };
  hooks.after(context);
  const tick = amount => {
    const end = now + amount;
    while (true) { const next = [...timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0]; if (!next) break; const [key, t] = next; now = t.at; timers.delete(key); if (t.interval) timers.set(key, { ...t, at: now + t.interval }); t.fn(); }
    now = end;
  };
  const steer = (x, type = 'pointermove') => stick.emit(type, { clientX: 100 + x * 62 });
  return { hooks, context, root, window, document, stick, knob, actions, sent, tick, steer, landscapeQuery, els };
}

test('signed analog deadzone, partial steering, clamp and return to center use real phone input', () => {
  const h = harness(); h.steer(0, 'pointerdown'); h.tick(60);
  h.steer(.04); h.tick(60); assert.equal(h.sent.at(-1).steer, 0);
  // Half of the travel past the deadzone gives .4: the curve is gentle near center (.6t + .4t²).
  h.steer(-.54); h.tick(60); assert.ok(Math.abs(h.sent.at(-1).steer + .4) < 1e-8);
  h.steer(.54); h.tick(60); assert.ok(Math.abs(h.sent.at(-1).steer - .4) < 1e-8);
  h.steer(.85); h.tick(60); assert.ok(h.sent.at(-1).steer > .7 && h.sent.at(-1).steer < .9);
  h.steer(2); h.tick(60); assert.equal(h.sent.at(-1).steer, 1);
  h.steer(-2); h.tick(60); assert.equal(h.sent.at(-1).steer, -1);
  h.stick.emit('pointerup'); h.tick(60); assert.equal(h.sent.at(-1).steer, 0); assert.equal(h.knob.style.transform, 'translate(0px,0px)'); h.hooks.destroy();
});
test('independent captured touches preserve steering with drift, item and boost; cancellation clears each', () => {
  const h = harness(); h.steer(-.54, 'pointerdown'); h.tick(60);
  h.actions[0].emit('pointerdown', { pointerId: 2 }); h.tick(60); assert.equal(h.sent.at(-1).drift, true); assert.ok(h.sent.at(-1).steer < 0);
  h.actions[1].emit('pointerdown', { pointerId: 3 }); h.actions[1].emit('pointerup', { pointerId: 3 }); h.tick(120);
  assert.ok(h.sent.some(s => s.item && s.drift && s.steer < 0)); assert.equal(h.sent.at(-1).item, false);
  h.actions[2].emit('pointerdown', { pointerId: 4 }); h.tick(60); assert.equal(h.sent.at(-1).boost, true);
  h.stick.emit('pointercancel'); h.tick(60); assert.equal(h.sent.at(-1).steer, 0); assert.equal(h.sent.at(-1).drift, true);
  h.actions[0].emit('lostpointercapture', { pointerId: 2 }); h.actions[2].emit('pointercancel', { pointerId: 4 }); h.tick(150);
  assert.equal(h.sent.at(-1).drift, false); assert.equal(h.sent.at(-1).boost, false); h.hooks.destroy();
});
test('pointer moves update knob immediately but sustained steering packets stay at or below 30 Hz', () => {
  const h = harness(); h.steer(0, 'pointerdown');
  for (let i = 0; i < 400; i++) { h.steer(Math.sin(i)); h.tick(5); }
  for (let i = 1; i < h.sent.length; i++) assert.ok(h.sent[i].at - h.sent[i - 1].at >= 33 - 1e-8);
  assert.ok(h.sent.length <= 62); assert.ok(h.sent.length >= 25); h.hooks.destroy();
});
test('button edges go out within one frame; an idle controller only heartbeats at 10 Hz', () => {
  const h = harness(); h.steer(.5, 'pointerdown'); h.tick(200);
  const idle = h.sent.length; h.tick(1000); const beats = h.sent.length - idle;
  assert.ok(beats >= 9 && beats <= 11, 'heartbeat ' + beats);
  h.tick(40); const before = h.sent.length; h.actions[0].emit('pointerdown', { pointerId: 2 }); h.tick(17);
  assert.equal(h.sent.length, before + 1); assert.equal(h.sent.at(-1).drift, true);
  h.actions[0].emit('pointerup', { pointerId: 2 }); h.tick(17); assert.equal(h.sent.at(-1).drift, false); h.hooks.destroy();
});
test('portrait rotation, blur and disconnect stay neutral until recovery, with no stale held input', () => {
  const h = harness(); h.steer(1, 'pointerdown'); h.actions[0].emit('pointerdown', { pointerId: 2 }); h.tick(120);
  h.landscapeQuery.matches = false; h.landscapeQuery.emit('change'); h.tick(300);
  assert.equal(h.els['.kart-gamepad'].hidden, true); assert.equal(h.sent.at(-1).active, false);
  h.landscapeQuery.matches = true; h.landscapeQuery.emit('change'); h.tick(120); assert.equal(h.sent.at(-1).active, true); assert.equal(h.sent.at(-1).steer, 0); assert.equal(h.sent.at(-1).drift, false);
  h.window.emit('blur'); h.tick(400); assert.equal(h.sent.at(-1).active, false);
  h.window.emit('focus'); h.tick(100); assert.equal(h.sent.at(-1).active, true);
  h.hooks.disconnect(); h.tick(400); assert.equal(h.sent.at(-1).active, false);
  h.hooks.after(h.context); h.tick(100); assert.equal(h.sent.at(-1).active, true); assert.equal(h.sent.at(-1).steer, 0);
  h.hooks.destroy(); const count = h.sent.length; h.tick(1000); h.steer(1, 'pointerdown'); assert.equal(h.sent.length, count);
});
test('fine-pointer desktop remains playable in portrait and a new match does not receive old input', () => {
  const h = harness({ coarse: false, landscape: false }); assert.equal(h.els['.kart-gamepad'].hidden, false);
  h.steer(1, 'pointerdown'); h.tick(100); assert.equal(h.sent.at(-1).steer, 1);
  h.context.G = { ...h.context.G, matchId: 'match2' }; h.hooks.frame(h.context); const count = h.sent.length; h.tick(300); assert.equal(h.sent.length, count); h.hooks.destroy();
});
