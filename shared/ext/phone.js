// Celular de um jogo de fora (ver shared/ext/game.js): um controle de Xbox na tela.
// O servidor entrega este arquivo como /games/<id>/phone.js para todo jogo de fora.
// Quem está num controle vê o controle em tela cheia; quem não está vê quem joga e pode trocar.
(() => {
  const A = window.ARCADE;
  const m = (document.currentScript ? document.currentScript.src : '').match(/\/games\/([a-z0-9_-]+)\/phone\.js/i);
  if (!A || !m) return;
  const id = m[1];

  // Botões na ordem da Gamepad API "standard" (shared/ext/inject.js usa a mesma ordem).
  const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const SEND_MS = 33, HEARTBEAT_MS = 250, DEADZONE = .12;
  let pad = null, picking = false;

  // O controle é sempre deitado, como um controle de verdade. Com o celular em pé, ele gira 90°
  // sozinho (a pessoa só vira o celular de lado). Em pé, os toques são convertidos de volta (local()).
  const CSS = `
  body.ext-pad{overflow:hidden;overscroll-behavior:none}
  #xp{--pc:#a855f7;position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;z-index:1000;color:#e8eaf2;
    background:radial-gradient(80% 120% at 0 100%,rgba(255,255,255,.05),transparent 60%),radial-gradient(80% 120% at 100% 100%,rgba(255,255,255,.05),transparent 60%),linear-gradient(180deg,#22242c 0,#121318 100%);
    display:grid;grid-template-rows:auto 1fr;gap:6px;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
    padding:max(6px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box;
    font-family:system-ui,-apple-system,sans-serif}
  @media (orientation:portrait){#xp{width:100vh;width:100dvh;height:100vw;left:100vw;transform-origin:0 0;transform:rotate(90deg)}}
  #xp *{box-sizing:border-box}
  #xp button{font:800 15px/1 inherit;color:#e8eaf2;border:0;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:pointer}
  /* ombros: gatilho (LT/RT) por fora, botão (LB/RB) por dentro */
  #xp .xp-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:10px}
  #xp .sh{display:flex;gap:8px}#xp .sh.r{flex-direction:row-reverse}
  #xp .trig,#xp .bump{background:linear-gradient(180deg,#3a3d48,#2a2c35);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 4px 0 #0b0c10;color:#aeb3c2;letter-spacing:.06em}
  #xp .trig{width:78px;height:48px;border-radius:22px 22px 12px 12px}
  #xp .bump{width:96px;height:36px;border-radius:12px 12px 18px 18px;margin-top:6px}
  #xp .trig.on,#xp .bump.on{transform:translateY(3px);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 0 #0b0c10;background:#4a4e5c;color:#fff}
  #xp .mid{display:flex;align-items:center;gap:8px;padding-top:4px}
  #xp .sys{width:42px;height:30px;border-radius:15px;background:#2a2c35;box-shadow:inset 0 0 0 2px #3a3d48;font-size:14px;color:#aeb3c2}
  #xp .sys.on{background:#e8eaf2;color:#121318}
  #xp .me{display:flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 4px;border-radius:15px;background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 2px var(--pc);font:800 13px/1 inherit;white-space:nowrap;max-width:150px;overflow:hidden}
  /* corpo: analógico esquerdo | setas | analógico direito + ABXY */
  #xp .body{display:grid;grid-template-columns:1fr minmax(120px,.55fr) 1fr minmax(150px,.75fr);gap:10px;min-height:0}
  #xp .zone{position:relative;min-height:0;border-radius:28px;background:radial-gradient(closest-side,rgba(255,255,255,.04),transparent)}
  #xp .zone small{position:absolute;left:0;right:0;bottom:6px;text-align:center;color:#6b7080;font:800 10px/1 inherit;letter-spacing:.14em}
  #xp .base,#xp .knob{position:absolute;left:50%;top:50%;border-radius:50%;pointer-events:none}
  #xp .base{width:var(--d);height:var(--d);margin:calc(var(--d)/-2) 0 0 calc(var(--d)/-2);background:radial-gradient(circle,#15161b 0,#1c1d24 62%,#2a2c35 63%,#202229 100%);box-shadow:inset 0 6px 14px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.06)}
  #xp .knob{width:74px;height:74px;margin:-37px 0 0 -37px;background:radial-gradient(circle at 50% 40%,#4a4e5c 0,#33363f 55%,#25272e 100%);box-shadow:0 6px 12px rgba(0,0,0,.55),inset 0 2px 0 rgba(255,255,255,.12),inset 0 0 0 7px rgba(0,0,0,.18)}
  #xp .knob:after{content:"";position:absolute;inset:22px;border-radius:50%;box-shadow:inset 0 2px 4px rgba(0,0,0,.5)}
  #xp .zone:not(.idle) .knob{box-shadow:0 0 0 3px var(--pc),0 6px 14px rgba(0,0,0,.6),inset 0 2px 0 rgba(255,255,255,.12)}
  #xp .zone.idle .base{opacity:.9}
  #xp .dp{align-self:center;justify-self:center;width:100%;max-width:150px;aspect-ratio:1;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr;position:relative}
  #xp .dp:before{content:"";position:absolute;inset:0;background:radial-gradient(circle,#1a1b21 0,#1a1b21 65%,transparent 66%);border-radius:50%}
  #xp .dp button{position:relative;background:linear-gradient(180deg,#3a3d48,#2a2c35);box-shadow:0 3px 0 #0b0c10;font-size:15px;color:#aeb3c2}
  #xp .dp .u{grid-area:1/2;border-radius:8px 8px 0 0}#xp .dp .d{grid-area:3/2;border-radius:0 0 8px 8px}
  #xp .dp .l{grid-area:2/1;border-radius:8px 0 0 8px}#xp .dp .r{grid-area:2/3;border-radius:0 8px 8px 0}
  #xp .dp .c{grid-area:2/2;background:#2a2c35;box-shadow:none;border-radius:0;font-size:10px;color:#6b7080}
  #xp .dp button.on{background:#e8eaf2;color:#121318;transform:translateY(2px);box-shadow:0 1px 0 #0b0c10}
  #xp .ab{align-self:center;justify-self:center;width:100%;max-width:190px;aspect-ratio:1;position:relative}
  #xp .ab button{position:absolute;width:38%;height:38%;border-radius:50%;font-size:22px;background:radial-gradient(circle at 50% 35%,#3a3d48,#22242b);box-shadow:inset 0 2px 0 rgba(255,255,255,.1),0 4px 0 #0b0c10;color:var(--c);text-shadow:0 0 10px var(--c)}
  #xp .ab .y{left:31%;top:0;--c:#facc15}#xp .ab .a{left:31%;bottom:0;--c:#22c55e}
  #xp .ab .x{left:0;top:31%;--c:#3b82f6}#xp .ab .b{right:0;top:31%;--c:#ef4444}
  #xp .ab .r3{left:37%;top:37%;width:26%;height:26%;font-size:10px;--c:#6b7080;text-shadow:none}
  #xp .ab button.on{background:var(--c);color:#121318;text-shadow:none;transform:translateY(3px);box-shadow:0 1px 0 #0b0c10,0 0 18px var(--c)}
  #xp-pick{position:fixed;inset:0;z-index:1001;background:rgba(5,7,12,.94);overflow:auto;padding:16px}
  .xp-seat{margin-bottom:14px}.xp-seat h3{margin:0 0 8px;font-size:16px}
  .xp-chips{display:flex;flex-wrap:wrap;gap:8px}
  .xp-chips button{display:flex;align-items:center;gap:6px;padding:6px 12px 6px 6px;border-radius:999px;border:2px solid #323b5c;background:#161b2c;color:#e5e7eb;font:700 14px/1 system-ui}
  .xp-chips button.sel{border-color:#22c55e;background:#14301f}`;

  function css() {
    if (document.getElementById('ext-phone-css')) return;
    const st = document.createElement('style');
    st.id = 'ext-phone-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ---------- controle ----------
  class Pad {
    constructor(root) {
      this.root = root; this.b = 0; this.a = [0, 0, 0, 0]; this.sent = ''; this.lastSend = 0; this.timer = null;
      this.held = new Map();   // pointerId -> bit do botão
      this.sticks = [null, null];
      this.abort = new AbortController();
      const opt = { signal: this.abort.signal };
      const capture = (el, pid) => { try { el.setPointerCapture(pid); } catch (err) { /* toque sintético */ } };

      for (const btn of root.querySelectorAll('[data-btn]')) {
        const bit = 1 << Number(btn.dataset.btn);
        btn.addEventListener('pointerdown', e => {
          e.preventDefault(); capture(btn, e.pointerId);
          this.held.set(e.pointerId, bit); btn.classList.add('on');
          if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* sem vibração */ } }
          this.update();
        }, opt);
        const up = e => { if (this.held.get(e.pointerId) === bit) { this.held.delete(e.pointerId); btn.classList.remove('on'); this.update(); } };
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(t, up, opt);
      }
      // Celular em pé = controle girado 90°: o ponto da tela vira coordenada de dentro do controle.
      const turned = window.matchMedia('(orientation: portrait)');
      const local = (e, r) => (turned.matches ? [e.clientY - r.top, r.right - e.clientX] : [e.clientX - r.left, e.clientY - r.top]);
      // Analógico flutuante: o centro é onde o dedo encostou (não precisa acertar o meio).
      root.querySelectorAll('[data-stick]').forEach(zone => {
        const s = Number(zone.dataset.stick), knob = zone.querySelector('.knob'), base = zone.querySelector('.base');
        const D = () => Math.max(110, Math.min(zone.clientWidth, zone.clientHeight, 230) * .92);
        const R = () => D() * .36;
        const put = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
        const center = () => {
          zone.style.setProperty('--d', D() + 'px');
          put(base, zone.clientWidth / 2, zone.clientHeight / 2); put(knob, zone.clientWidth / 2, zone.clientHeight / 2);
          zone.classList.add('idle');
        };
        zone.addEventListener('pointerdown', e => {
          if (this.sticks[s]) return;
          e.preventDefault(); capture(zone, e.pointerId);
          const [x, y] = local(e, zone.getBoundingClientRect());
          this.sticks[s] = { id: e.pointerId, x, y };
          zone.classList.remove('idle'); put(base, x, y); put(knob, x, y);
        }, opt);
        zone.addEventListener('pointermove', e => {
          const st = this.sticks[s];
          if (!st || st.id !== e.pointerId) return;
          e.preventDefault();
          const rad = R(), [px, py] = local(e, zone.getBoundingClientRect());
          let dx = px - st.x, dy = py - st.y;
          const len = Math.hypot(dx, dy);
          if (len > rad) { dx *= rad / len; dy *= rad / len; }
          put(knob, st.x + dx, st.y + dy);
          let x = dx / rad, y = dy / rad;
          if (Math.hypot(x, y) < DEADZONE) x = y = 0;
          this.a[s * 2] = Math.round(x * 1000) / 1000; this.a[s * 2 + 1] = Math.round(y * 1000) / 1000;   // y para baixo é positivo (padrão da Gamepad API)
          this.update();
        }, opt);
        const release = e => {
          const st = this.sticks[s];
          if (!st || st.id !== e.pointerId) return;
          this.sticks[s] = null; this.a[s * 2] = 0; this.a[s * 2 + 1] = 0; center(); this.update();
        };
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(t, release, opt);
        window.addEventListener('resize', () => { if (!this.sticks[s]) center(); }, opt);
        center();
      });
      root.addEventListener('contextmenu', e => e.preventDefault(), opt);
      root.addEventListener('touchmove', e => e.preventDefault(), { signal: this.abort.signal, passive: false });
      // Tela apagou ou trocou de app: solta tudo (o jogo não fica com o botão preso).
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); }, opt);
      window.addEventListener('blur', () => this.reset(), opt);
      this.beat = setInterval(() => this.flush(true), HEARTBEAT_MS);
    }
    reset() {
      this.held.clear(); this.sticks = [null, null]; this.a = [0, 0, 0, 0];
      this.root.querySelectorAll('.on').forEach(el => el.classList.remove('on'));
      this.update();
    }
    update() {
      let b = 0;
      for (const bit of this.held.values()) b |= bit;
      this.b = b;
      this.flush(false);
    }
    // Manda na hora quando muda (no máximo ~30 vezes por segundo) e repete de tempos em tempos
    // para o servidor saber que o celular ainda está aqui.
    flush(beat) {
      const now = Date.now(), body = this.b + ':' + this.a.join(',');
      if (!beat && body === this.sent) return;
      if (now - this.lastSend < SEND_MS) {
        if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(false); }, SEND_MS - (now - this.lastSend));
        return;
      }
      this.sent = body; this.lastSend = now;
      A.send({ t: 'input', b: this.b, a: this.a });
    }
    destroy() {
      this.reset();
      clearInterval(this.beat); clearTimeout(this.timer);
      this.abort.abort();
    }
  }

  function stop() {
    if (pad) pad.destroy();
    pad = null;
    document.body.classList.remove('ext-pad');
  }

  // ---------- telas ----------
  const btn = (bit, label, cls) => `<button data-btn="${bit}" class="${cls || ''}">${label}</button>`;
  function controller(c) {
    const G = c.G, slot = G.mine, me = c.C.players.find(p => c.you && p.pid === c.you.pid);
    const label = G.pads > 1 ? `P${slot + 1} · ` : '';
    return `<div id="xp" style="--pc:${me ? c.ci(me.color).hex : '#a855f7'}">
      <div class="xp-top">
        <div class="sh">${btn(B.LT, 'LT', 'trig')}${btn(B.LB, 'LB', 'bump')}</div>
        <div class="mid">${btn(B.BACK, '⧉', 'sys')}<span class="me">${me ? c.avatar(me, 22) : ''}${label}${c.esc(me ? me.name : '')}</span><button class="sys" data-a="ext-pick">👥</button><button class="sys" data-a="ext-full">⛶</button>${btn(B.START, '☰', 'sys')}</div>
        <div class="sh r">${btn(B.RT, 'RT', 'trig')}${btn(B.RB, 'RB', 'bump')}</div>
      </div>
      <div class="body">
        <div class="zone" data-stick="0"><div class="base"></div><div class="knob"></div><small>ANALÓGICO</small></div>
        <div class="dp">${btn(B.UP, '▲', 'u')}${btn(B.LEFT, '◀', 'l')}${btn(B.L3, 'L3', 'c')}${btn(B.RIGHT, '▶', 'r')}${btn(B.DOWN, '▼', 'd')}</div>
        <div class="zone" data-stick="1"><div class="base"></div><div class="knob"></div><small>ANALÓGICO</small></div>
        <div class="ab">${btn(B.Y, 'Y', 'y')}${btn(B.X, 'X', 'x')}${btn(B.R3, 'R3', 'r3')}${btn(B.B, 'B', 'b')}${btn(B.A, 'A', 'a')}</div>
      </div>
    </div>${picking ? picker(c) : ''}`;
  }
  // Quem joga em cada controle. Qualquer pessoa da sala pode trocar.
  function picker(c) {
    const G = c.G, ps = c.C.players;
    const seats = G.seats.map((p, i) => `<div class="xp-seat">
      <h3>🎮 ${G.pads > 1 ? 'Controle ' + (i + 1) + ': ' : ''}${p ? c.nm(p) : '<span class="sub">ninguém</span>'}</h3>
      <div class="xp-chips">${ps.map(q => `<button data-a="ext-seat" data-slot="${i}" data-pid="${c.esc(q.pid)}" class="${p && p.pid === q.pid ? 'sel' : ''}">${c.avatar(q, 24)}${c.esc(q.name)}${c.you && q.pid === c.you.pid ? ' (você)' : ''}</button>`).join('')}
      ${p ? `<button data-a="ext-unseat" data-slot="${i}">✕ ninguém</button>` : ''}</div></div>`).join('');
    return `<div id="xp-pick"><h2>Quem joga?</h2>${seats}<button class="btn" data-a="ext-pick">✔️ Pronto</button></div>`;
  }
  function waiting(c) {
    const G = c.G;
    const who = G.seats.filter(Boolean);
    return `<div class="box center">
      <h2>${c.esc(c.game().emoji || '🎮')} ${c.esc(c.game().name || id)}</h2>
      <p>${who.length ? who.map(p => c.nm(p)).join(' e ') + (who.length > 1 ? ' estão jogando.' : ' está jogando.') : 'Ninguém está no controle agora.'}</p>
      <p class="sub">O jogo aparece na TV. Escolha abaixo quem fica com o controle.</p>
    </div><div class="box">${picker(c).replace('<div id="xp-pick">', '<div>').replace('<button class="btn" data-a="ext-pick">✔️ Pronto</button>', '')}</div>`;
  }

  function act(a, el) {
    if (a === 'ext-pick') { picking = !picking; A.redraw(); }
    else if (a === 'ext-seat') { A.send({ t: 'seat', slot: Number(el.dataset.slot), pid: el.dataset.pid }); picking = false; }
    else if (a === 'ext-unseat') { A.send({ t: 'unseat', slot: Number(el.dataset.slot) }); picking = false; }
    else if (a === 'ext-full') {
      const root = document.documentElement;
      Promise.resolve(document.fullscreenElement ? null : root.requestFullscreen && root.requestFullscreen())
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
        .catch(() => { /* sem tela cheia ou sem trava de rotação: o controle funciona igual */ });
    }
  }

  A.register(id, {
    phone: {
      // Com o controle na mão, a tela só é refeita quando muda quem joga (os toques não piscam).
      key(c) { const G = c.G; return [G.mine, picking, JSON.stringify(G.seats.map(p => p && [p.pid, p.name, p.color])), c.C.players.length].join('|'); },
      html(c) {
        css();
        stop();
        if (c.G.mine >= 0) { document.body.classList.add('ext-pad'); return controller(c); }
        return waiting(c);
      },
      act,   // index.html liga os [data-a] e repassa ao jogo o que não é do núcleo
      after() {
        const root = document.getElementById('xp');
        if (root && !pad) pad = new Pad(root);
      },
      destroy() { stop(); picking = false; },
    },
  });
})();
