// Celular dos jogos de arena (shared/bash/engine.js). Celular moderno: fica fora do test/tv-compat.js.
// Cada jogo chama BashPhone.register(id, { title, color }) no seu games/<id>/phone.js.
// Telas: preparação (arena, CPU, troféu, quem joga), controle em tela cheia durante a partida
// (analógico flutuante à esquerda, até 3 botões à direita, sempre deitado) e pódio.
(() => {
  const A = window.ARCADE;
  const SEND_GAP = 33, HEARTBEAT = 100, DEADZONE = .14;
  const CSS = `
  .bp-hero{padding:18px 16px 16px;border:3px solid #0f0f14;box-shadow:5px 5px 0 #0f0f14;background-image:radial-gradient(rgba(15,15,20,.16) 1.2px,transparent 1.3px);background-size:9px 9px;margin-bottom:16px}
  .bp-hero .tag{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.12em}
  .bp-hero h1{margin:10px 0 0;font-weight:900;font-stretch:125%;text-transform:uppercase;font-size:40px;line-height:.92}
  .bp-hero p{margin:10px 0 0;font-size:16px;font-weight:700;line-height:1.3}
  .bp-block{margin-bottom:16px;padding:14px;background:#fff;border:3px solid #0f0f14;box-shadow:5px 5px 0 #0f0f14}
  .bp-block h3{margin:0 0 10px;font-size:15px;font-weight:900;font-stretch:125%;text-transform:uppercase;display:flex;justify-content:space-between;align-items:baseline}
  .bp-block h3 small{font:700 11px 'JetBrains Mono',monospace;letter-spacing:.06em;color:#55555e}
  .bp-levels{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .bp-lv{text-align:left;padding:10px;border:3px solid #0f0f14;background:#fff;box-shadow:3px 3px 0 #0f0f14;font-family:inherit;color:#0f0f14;border-radius:0}
  .bp-lv b{display:block;font-size:15px;font-weight:900;text-transform:uppercase;font-stretch:115%}
  .bp-lv small{display:block;margin-top:4px;font-size:12px;font-weight:600;line-height:1.25;color:#3a3a42}
  .bp-lv.sel{background:#ffce1f;transform:translate(2px,2px);box-shadow:1px 1px 0 #0f0f14}
  .bp-lv:disabled{opacity:1}
  .bp-seg{display:flex;gap:8px}
  .bp-seg button{flex:1;padding:12px 6px;border:3px solid #0f0f14;background:#fff;font:900 15px 'Archivo',sans-serif;text-transform:uppercase;box-shadow:3px 3px 0 #0f0f14;color:#0f0f14;border-radius:0}
  .bp-seg button.sel{background:#3db4f2;transform:translate(2px,2px);box-shadow:1px 1px 0 #0f0f14}
  .bp-seg + .bp-seg{margin-top:10px}
  .bp-how{margin:0;padding-left:20px}.bp-how li{font-size:15px;font-weight:600;line-height:1.4;margin-bottom:4px}
  .bp-keys{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:10px;font-size:14px;font-weight:800}
  .bp-keys span{display:inline-flex;align-items:center;gap:6px}
  .bp-k{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:2px solid #0f0f14;font-weight:900}
  .bp-k.a{background:#35d07f}.bp-k.b{background:#3db4f2}.bp-k.c{background:#ffce1f}.bp-k.s{background:#e4e2d9}
  .bp-seat{display:flex;align-items:center;gap:8px;padding:6px 0;font-weight:800}
  .bp-seat .nm{flex:1}
  .bp-seat .bp-cpu{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#e4e2d9;border:2px solid #0f0f14;font:700 10px 'JetBrains Mono',monospace}
  .bp-start{position:sticky;bottom:10px;z-index:5}
  .bp-note{margin:10px 0;font-size:14px;font-weight:600;color:#55555e;text-align:center}
  .bp-err{margin:0 0 14px;padding:12px;background:#f0443a;border:3px solid #0f0f14;font-weight:800}
  .bp-pod{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:8px;border:3px solid #0f0f14;font-weight:900}
  .bp-pod .n{font:700 22px 'Pixelify Sans',monospace;width:34px}
  .bp-pod b{flex:1;font-size:18px;text-transform:uppercase}
  .bp-pod.me{box-shadow:4px 4px 0 #0f0f14}
  body.bash-pad{overflow:hidden;overscroll-behavior:none}
  #bp-pad,#bp-pad *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;box-sizing:border-box}
  #bp-pad{position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;z-index:1000;touch-action:none;color:#0f0f14;font-family:'Archivo',sans-serif;
    background:#f1f0ea;background-image:radial-gradient(rgba(15,15,20,.12) 1.2px,transparent 1.3px);background-size:11px 11px;
    display:flex;flex-direction:column;padding:max(8px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}
  @media (orientation:portrait){#bp-pad{width:100vh;width:100dvh;height:100vw;left:100vw;transform-origin:0 0;transform:rotate(90deg)}}
  #bp-pad .top{display:flex;align-items:center;gap:8px}
  #bp-pad .me{display:flex;align-items:center;gap:6px;height:38px;padding:0 12px 0 4px;background:#fff;border:3px solid #0f0f14;box-shadow:3px 3px 0 #0f0f14;font-weight:900;max-width:44%;overflow:hidden;white-space:nowrap}
  #bp-pad .me i{width:14px;height:14px;border:2px solid #0f0f14;flex:none}
  #bp-pad .st{flex:1;text-align:center;font:900 19px 'Archivo',sans-serif;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #bp-pad .sys{height:38px;min-width:42px;padding:0 10px;border:3px solid #0f0f14;background:#fff;font:900 16px 'Archivo',sans-serif;box-shadow:3px 3px 0 #0f0f14;color:#0f0f14;border-radius:0}
  #bp-pad .sys.stop{background:#f0443a}
  #bp-pad .body{flex:1;display:flex;min-height:0;margin-top:8px;gap:12px}
  #bp-pad .zone{flex:1.2;position:relative;border:3px dashed rgba(15,15,20,.25);background:rgba(255,255,255,.35)}
  #bp-pad .zone small{position:absolute;left:0;right:0;bottom:8px;text-align:center;font:700 11px 'JetBrains Mono',monospace;letter-spacing:.12em;color:#55555e}
  #bp-pad .base,#bp-pad .knob{position:absolute;border-radius:50%;pointer-events:none}
  #bp-pad .base{width:150px;height:150px;margin:-75px 0 0 -75px;border:4px solid #0f0f14;background:#fff;box-shadow:5px 5px 0 #0f0f14}
  #bp-pad .knob{width:70px;height:70px;margin:-35px 0 0 -35px;border:4px solid #0f0f14;background:var(--pc,#ffce1f)}
  #bp-pad .zone.axis-h .base{height:80px;margin-top:-40px;border-radius:40px;width:190px;margin-left:-95px}
  #bp-pad .zone.axis-v .base{width:80px;margin-left:-40px;border-radius:40px;height:190px;margin-top:-95px}
  #bp-pad .btns{flex:1;position:relative}
  #bp-pad .btn-b{position:absolute;border-radius:50%;border:4px solid #0f0f14;box-shadow:6px 6px 0 #0f0f14;font:900 30px 'Archivo',sans-serif;color:#0f0f14;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;touch-action:none}
  #bp-pad .btn-b small{font:700 11px 'JetBrains Mono',monospace;letter-spacing:.06em;margin-top:2px}
  #bp-pad .btn-b.on{transform:translate(5px,5px);box-shadow:1px 1px 0 #0f0f14;filter:brightness(1.1)}
  #bp-pad .btn-b.a{background:#35d07f}#bp-pad .btn-b.b{background:#3db4f2}#bp-pad .btn-b.c{background:#ffce1f}
  #bp-pad .btn-b.off{opacity:.35}
  #bp-pad .msg{position:absolute;left:0;right:0;top:42%;text-align:center;pointer-events:none}
  #bp-pad .msg b{display:inline-block;padding:10px 22px;background:#ffce1f;border:4px solid #0f0f14;box-shadow:6px 6px 0 #0f0f14;font:900 30px 'Archivo',sans-serif;text-transform:uppercase;font-stretch:115%}
  #bp-pad .msg b:empty{display:none}
  #bp-pad.offline .msg b{background:#f0443a}
  #bp-pad .bar{height:10px;margin-top:6px;border:2px solid #0f0f14;background:#fff;display:none}
  #bp-pad .bar i{display:block;height:100%;background:#35d07f}`;

  function css() {
    if (document.getElementById('bash-phone-css')) return;
    const st = document.createElement('style'); st.id = 'bash-phone-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const vib = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (err) { /* opcional */ } };

  // ---------- controle ----------
  class Pad {
    constructor(root, ctx) {
      this.root = root; this.ctx = ctx; this.matchId = ctx.G.matchId; this.dead = false;
      this.x = 0; this.y = 0; this.btn = { a: false, b: false, c: false }; this.held = new Map(); this.keys = new Set();
      this.stickId = null; this.queue = []; this.lastSent = 0; this.last = null; this.timer = null; this.focused = !document.hidden; this.connected = true;
      this.abort = new AbortController(); const o = { signal: this.abort.signal };
      const cap = (el, id) => { try { el.setPointerCapture(id); } catch (err) { /* toque sintético */ } };
      const turned = window.matchMedia('(orientation: portrait)');
      // celular em pé = controle girado 90°: converte o ponto da tela para dentro do controle
      const local = (e, r) => (turned.matches ? [e.clientY - r.top, r.right - e.clientX] : [e.clientX - r.left, e.clientY - r.top]);
      const zone = root.querySelector('.zone'), base = zone.querySelector('.base'), knob = zone.querySelector('.knob');
      this.zone = zone; this.base = base; this.knob = knob;
      const R = 58;
      const put = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
      this.home = () => { const w = turned.matches ? zone.clientWidth : zone.clientWidth, h = zone.clientHeight; put(base, w / 2, h / 2); put(knob, w / 2, h / 2); this.cx = null; };
      this.home();
      zone.addEventListener('pointerdown', e => {
        if (this.stickId !== null) return;
        e.preventDefault(); this.stickId = e.pointerId; cap(zone, e.pointerId);
        const r = zone.getBoundingClientRect(), p = local(e, r);
        this.cx = p[0]; this.cy = p[1]; put(base, p[0], p[1]); put(knob, p[0], p[1]); this.request();
      }, o);
      zone.addEventListener('pointermove', e => {
        if (e.pointerId !== this.stickId) return;
        e.preventDefault();
        const r = zone.getBoundingClientRect(), p = local(e, r);
        let dx = (p[0] - this.cx) / R, dy = (p[1] - this.cy) / R;
        const m = Math.hypot(dx, dy);
        // o centro acompanha o dedo quando ele passa muito da borda (analógico que "anda junto")
        if (m > 1.6) { this.cx += (dx / m) * (m - 1.6) * R; this.cy += (dy / m) * (m - 1.6) * R; put(base, this.cx, this.cy); dx = (p[0] - this.cx) / R; dy = (p[1] - this.cy) / R; }
        const mm = Math.hypot(dx, dy), k = mm > 1 ? 1 / mm : 1;
        dx *= k; dy *= k;
        put(knob, this.cx + dx * R, this.cy + dy * R);
        const mag = Math.hypot(dx, dy);
        if (mag < DEADZONE) { this.x = 0; this.y = 0; } else { const s = (mag - DEADZONE) / (1 - DEADZONE) / mag; this.x = Math.round(dx * s * 100) / 100; this.y = Math.round(dy * s * 100) / 100; }
        this.request();
      }, o);
      const release = e => { if (e.pointerId !== this.stickId) return; this.stickId = null; this.x = 0; this.y = 0; this.home(); this.request(); };
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(t, release, o);
      for (const b of root.querySelectorAll('[data-b]')) {
        const id = b.dataset.b;
        b.addEventListener('pointerdown', e => { e.preventDefault(); cap(b, e.pointerId); this.held.set(e.pointerId, id); vib(10); this.paint(); this.request(true); }, o);
        const up = e => { if (this.held.get(e.pointerId) === id) { this.held.delete(e.pointerId); this.paint(); this.request(true); } };
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, up, o);
      }
      root.addEventListener('contextmenu', e => e.preventDefault(), o);
      root.addEventListener('touchmove', e => e.preventDefault(), { signal: this.abort.signal, passive: false });
      // teclado (computador): WASD/setas andam; J/espaço = A, K = B, L = C
      const keyMap = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd', A: 'l', D: 'r', W: 'u', S: 'd', j: 'A', J: 'A', ' ': 'A', k: 'B', K: 'B', l: 'C', L: 'C' };
      window.addEventListener('keydown', e => { const k = keyMap[e.key]; if (!k || e.repeat) return; e.preventDefault(); this.keys.add(k); this.paint(); this.request(true); }, o);
      window.addEventListener('keyup', e => { const k = keyMap[e.key]; if (!k) return; e.preventDefault(); this.keys.delete(k); this.paint(); this.request(true); }, o);
      window.addEventListener('blur', () => { this.focused = false; this.clear(); }, o);
      window.addEventListener('focus', () => { this.focused = true; this.request(); }, o);
      document.addEventListener('visibilitychange', () => { this.focused = !document.hidden; this.clear(); }, o);
      window.addEventListener('resize', () => { this.clear(); this.home(); }, o);
      const fs = root.querySelector('[data-fs]');
      if (fs) fs.addEventListener('click', () => {
        const el = document.documentElement;
        Promise.resolve().then(() => (!document.fullscreenElement && el.requestFullscreen ? el.requestFullscreen() : null))
          .then(() => (screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null)).catch(() => {});
      }, o);
      const stop = root.querySelector('[data-stop]');
      if (stop) stop.addEventListener('click', () => {
        if (stop.classList.contains('stop')) { A.send({ t: 'bash-abort' }); return; }
        stop.classList.add('stop'); stop.textContent = 'PARAR?'; setTimeout(() => { if (stop.isConnected) { stop.classList.remove('stop'); stop.textContent = '■'; } }, 2500);
      }, o);
      this.interval = setInterval(() => this.flush(), HEARTBEAT);
    }
    active() { return !this.dead && this.connected && this.focused && !document.hidden && this.root.isConnected; }
    buttons() {
      const set = new Set(this.held.values());
      if (this.keys.has('A')) set.add('a'); if (this.keys.has('B')) set.add('b'); if (this.keys.has('C')) set.add('c');
      return set;
    }
    paint() { const set = this.buttons(); for (const b of this.root.querySelectorAll('[data-b]')) b.classList.toggle('on', set.has(b.dataset.b)); }
    state() {
      const on = this.active(), set = this.buttons();
      let x = this.x, y = this.y;
      if (this.keys.has('l') || this.keys.has('r') || this.keys.has('u') || this.keys.has('d')) {
        x = (this.keys.has('r') ? 1 : 0) - (this.keys.has('l') ? 1 : 0); y = (this.keys.has('d') ? 1 : 0) - (this.keys.has('u') ? 1 : 0);
        const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      }
      return { t: 'input', matchId: this.matchId, x: on ? x : 0, y: on ? y : 0, a: on && set.has('a'), b: on && set.has('b'), c: on && set.has('c'), active: on };
    }
    request(edge) {
      if (this.dead) return;
      if (edge) { const s = this.state(), l = this.queue[this.queue.length - 1] || this.last; if (!l || l.a !== s.a || l.b !== s.b || l.c !== s.c) { this.queue.push(s); if (this.queue.length > 6) this.queue.shift(); } }
      this.flush();
    }
    flush() {
      if (this.dead) return;
      const now = performance.now(), since = now - this.lastSent;
      if (this.queue.length) {
        if (since < 16) return this.later(16 - since);
        this.emit(this.queue.shift(), now); if (this.queue.length) this.later(16); return;
      }
      const s = this.state(), l = this.last;
      const changed = !l || s.x !== l.x || s.y !== l.y || s.a !== l.a || s.b !== l.b || s.c !== l.c || s.active !== l.active;
      if (!changed && since < HEARTBEAT - 5) return;
      if (changed && since < SEND_GAP) return this.later(SEND_GAP - since);
      this.emit(s, now);
    }
    later(ms) { if (this.timer) return; this.timer = setTimeout(() => { this.timer = null; this.flush(); }, Math.max(0, ms)); }
    emit(s, now) { A.send(s); this.lastSent = now; this.last = s; }
    clear() {
      this.held.clear(); this.keys.clear(); this.stickId = null; this.x = 0; this.y = 0; this.paint(); this.queue.length = 0;
      if (!this.dead) { this.queue.push({ t: 'input', matchId: this.matchId, x: 0, y: 0, a: false, b: false, c: false, active: false }); this.flush(); }
    }
    setConnected(on) { if (this.connected === on) return; this.connected = on; this.root.classList.toggle('offline', !on); if (!on) this.clear(); else this.request(); }
    destroy() { this.clear(); this.dead = true; clearInterval(this.interval); clearTimeout(this.timer); this.abort.abort(); }
  }

  function register(id, game) {
    let pad = null, ctx = null, lastHit = null, lastOut = null;
    const mine = c => (c.G && c.G.me) || null;
    const playing = c => !!c.G && ['loading', 'countdown', 'playing', 'roundEnd'].includes(c.G.phase) && !!mine(c);
    const host = c => c.you && c.G && c.you.pid === c.G.hostPid;
    const face = (c, p, px) => {
      const live = ((c.C && c.C.players) || []).find(x => x.pid === p.pid);
      if (live && c.avatar) return c.avatar(live, px);
      return A.avatar && A.avatar.svg ? `<span class="avatar" style="width:${px}px;height:${px}px">${A.avatar.svg(p.av, p.color, px)}</span>` : '';
    };
    const hero = (kicker, sub) => `<div class="bp-hero" style="background-color:${game.color}"><span class="tag">${kicker}</span><h1>${game.title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`;
    const keys = ctl => `<div class="bp-keys"><span><i class="bp-k s">✥</i>${ctl.stick === 'grid' ? 'pular de casa em casa' : ctl.stick === 'axis' ? 'andar no seu gol' : 'andar'}</span>${ctl.buttons.map(b => `<span><i class="bp-k ${b.id}">${b.id.toUpperCase()}</i>${A.esc ? A.esc(b.label.toLowerCase()) : b.label}</span>`).join('')}</div>`;
    function setup(c) {
      const G = c.G, h = host(c), seated = G.roster.some(p => p.pid === c.you.pid), lv = G.levels[G.level];
      const dis = h ? '' : 'disabled';
      return `<section class="bash-ui">${hero('Arena · até 4', h ? 'Você escolhe a arena e começa.' : 'O primeiro jogador escolhe a arena.')}
        ${G.error ? `<p class="bp-err" role="alert">${c.esc(G.error)}</p>` : ''}
        <div class="bp-block"><h3>Arena <small>${h ? 'toque para escolher' : 'quem escolhe é o 1º'}</small></h3><div class="bp-levels">${G.levels.map((l, i) => `<button class="bp-lv ${i === G.level ? 'sel' : ''}" data-a="bash-level" data-v="${i}" ${dis}><b>${c.esc(l.name)}</b><small>${c.esc(l.short)}</small></button>`).join('')}</div></div>
        <div class="bp-block"><h3>Como jogar <small>${c.esc(lv.name)}</small></h3><ul class="bp-how">${lv.how.map(x => `<li>${c.esc(x)}</li>`).join('')}</ul>${keys(G.controls)}</div>
        <div class="bp-block"><h3>Partida</h3>
          <div class="bp-seg">${[1, 2, 3].map(n => `<button class="${G.target === n ? 'sel' : ''}" data-a="bash-target" data-v="${n}" ${dis}>${n} vitória${n > 1 ? 's' : ''}</button>`).join('')}</div>
          <div class="bp-seg">${[['on', 'Com CPU'], ['off', 'Sem CPU']].map(([v, t]) => `<button class="${(G.cpu ? 'on' : 'off') === v ? 'sel' : ''}" data-a="bash-cpu" data-v="${v}" ${dis}>${t}</button>`).join('')}</div>
          ${G.cpu ? `<div class="bp-seg">${['Fácil', 'Normal', 'Difícil'].map((t, i) => `<button class="${G.cpuLevel === i ? 'sel' : ''}" data-a="bash-cpulevel" data-v="${i}" ${dis}>${t}</button>`).join('')}</div>` : ''}
        </div>
        <div class="bp-block"><h3>Jogadores <small>${G.roster.length}/4${G.cpu && G.roster.length < 4 ? ` + ${4 - G.roster.length} CPU` : ''}</small></h3>
          ${G.roster.map(p => `<div class="bp-seat">${face(c, p, 28)}<span class="nm">${c.esc(p.name)}</span></div>`).join('')}
          ${G.cpu ? Array.from({ length: Math.max(0, 4 - G.roster.length) }, () => '<div class="bp-seat"><span class="bp-cpu">CPU</span><span class="nm mut">Computador</span></div>').join('') : ''}
          <button class="btn ${seated ? 'ghost' : 'blue'}" data-a="bash-seat" ${!seated && G.roster.length >= 4 ? 'disabled' : ''}>${seated ? 'Só assistir' : 'Entrar na partida'}</button>
        </div>
        ${h ? `<button class="btn big ok bp-start" data-a="bash-start" ${G.canStart ? '' : 'disabled'}>Começar!</button>${G.canStart ? '' : '<p class="bp-note">Sem CPU precisa de pelo menos 2 jogadores.</p>'}` : '<p class="bp-note">Aguarde o primeiro jogador tocar em COMEÇAR.</p>'}
      </section>`;
    }
    function padHtml(c) {
      const G = c.G, me = mine(c), seat = G.seats[me.slot] || {}, ctl = G.controls;
      const pos = ctl.buttons.length === 1 ? [[50, 50, 46]] : ctl.buttons.length === 2 ? [[30, 62, 40], [72, 34, 40]] : [[20, 64, 29], [50, 30, 29], [80, 64, 29]];
      const maxR = ctl.buttons.length === 3 ? 60 : 75;   // raio máximo em px: três botões cabem sem se encostar
      const axis = ctl.stick === 'axis' ? 'axis-' + (me.axis || 'h') : '';
      return `<div id="bp-pad" style="--pc:${c.esc(seat.color || '#ffce1f')}">
        <div class="top"><span class="me"><i style="background:${c.esc(seat.color || '#fff')}"></i>${face(c, seat, 26)}${c.esc(seat.name || '')}</span>
          <span class="st" id="bp-st"></span>
          ${host(c) ? '<button class="sys" data-stop aria-label="Parar a partida">■</button>' : ''}<button class="sys" data-fs aria-label="Tela cheia">⛶</button></div>
        <div class="bar" id="bp-bar"><i></i></div>
        <div class="body">
          <div class="zone ${axis}"><div class="base"></div><div class="knob"></div><small>${ctl.stick === 'grid' ? 'ARRASTE PARA PULAR' : 'ARRASTE PARA ANDAR'}</small></div>
          <div class="btns">${ctl.buttons.map((b, i) => `<button class="btn-b ${b.id}" data-b="${b.id}" style="left:calc(${pos[i][0]}% - min(${pos[i][2]}vmin,${maxR}px));top:calc(${pos[i][1]}% - min(${pos[i][2]}vmin,${maxR}px));width:min(${pos[i][2] * 2}vmin,${maxR * 2}px);height:min(${pos[i][2] * 2}vmin,${maxR * 2}px)">${b.id.toUpperCase()}<small>${c.esc(b.label)}</small></button>`).join('')}</div>
        </div>
        <div class="msg"><b id="bp-msg"></b></div>
      </div>`;
    }
    function results(c) {
      const G = c.G, list = G.seats.slice().sort((a, b) => b.wins - a.wins);
      return `<section class="bash-ui">${hero('Resultado', G.champions.map(s => c.esc((G.seats[s] || {}).name)).join(' e ') + ' ganhou o troféu!')}
        <div class="bp-block">${list.map((p, i) => `<div class="bp-pod ${c.you && p.pid === c.you.pid ? 'me' : ''}" style="background:${p.color}"><span class="n">${i + 1}º</span>${face(c, p, 32)}<b>${c.esc(p.name)}</b><span>${'🏆'.repeat(p.wins) || '—'}</span></div>`).join('')}</div>
        ${host(c) ? '<button class="btn big ok" data-a="bash-again">Revanche</button><p></p><button class="btn" data-a="bash-setup">Trocar arena</button>' : '<p class="bp-note">O primeiro jogador escolhe: revanche ou outra arena.</p>'}
      </section>`;
    }
    function hud(c) {
      if (!pad) return;
      const G = c.G, me = mine(c) || {};
      const st = document.getElementById('bp-st'), msg = document.getElementById('bp-msg'), bar = document.getElementById('bp-bar');
      const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
      set(st, (me.status || '') + (G.target ? `  ${'★'.repeat((G.seats[me.slot] || {}).wins || 0)}` : ''));
      let m = '';
      if (G.phase === 'loading') m = 'Preparando…';
      else if (G.phase === 'countdown') m = String(G.countdown || '');
      else if (G.phase === 'roundEnd') m = G.roundWinners.includes(me.slot) ? (G.champions.length ? 'Troféu!' : 'Você venceu!') : (G.roundWinners.length ? (G.seats[G.roundWinners[0]] || {}).name + ' venceu' : 'Empate');
      else if (me.out) m = me.outText || 'Você caiu!';
      else if (me.msg) m = me.msg;
      set(msg, m);
      if (bar) { const show = typeof me.bar === 'number'; bar.style.display = show ? 'block' : 'none'; if (show) bar.firstChild.style.width = Math.round(Math.max(0, Math.min(1, me.bar)) * 100) + '%'; }
      for (const b of pad.root.querySelectorAll('[data-b]')) b.classList.toggle('off', !!(me.off && me.off[b.dataset.b]));
      if (lastHit !== null && me.hit !== undefined && me.hit !== lastHit) vib(me.hit > lastHit ? 60 : 20);
      lastHit = me.hit === undefined ? lastHit : me.hit;
      if (me.out && !lastOut) vib([80, 60, 160]);
      lastOut = !!me.out;
    }
    function stopPad() { if (pad) pad.destroy(); pad = null; lastHit = null; lastOut = null; document.body.classList.remove('bash-pad'); }
    A.register(id, { phone: {
      key(c) {
        const G = c.G; if (!G) return 'loading';
        if (playing(c)) return 'pad:' + G.matchId + ':' + JSON.stringify(G.controls) + ':' + host(c);
        return JSON.stringify([G.phase, G.level, G.cpu, G.cpuLevel, G.target, G.roster, G.error, G.hostPid, G.matchId, G.spectator, G.canStart]);
      },
      html(c) {
        css(); ctx = c;
        const G = c.G;
        if (!G) return '<div class="box">Carregando…</div>';
        if (G.phase === 'setup') return setup(c);
        if (playing(c)) return padHtml(c);
        if (G.phase === 'results') return results(c);
        return `<section class="bash-ui">${hero('Na torcida', 'A partida está rolando na TV. Você entra na próxima.')}</section>`;
      },
      act(a, el, c) {
        if (a === 'bash-level') c.send({ t: a, level: Number(el.dataset.v) });
        else if (a === 'bash-target') c.send({ t: a, n: Number(el.dataset.v) });
        else if (a === 'bash-cpu') c.send({ t: a, on: el.dataset.v === 'on' });
        else if (a === 'bash-cpulevel') c.send({ t: a, v: Number(el.dataset.v) });
        else if (['bash-seat', 'bash-start', 'bash-again', 'bash-setup'].includes(a)) c.send({ t: a });
      },
      after(c) {
        ctx = c;
        if (playing(c)) {
          document.body.classList.add('bash-pad');
          const root = document.getElementById('bp-pad');
          if (root && (!pad || pad.root !== root || pad.matchId !== c.G.matchId)) { if (pad) pad.destroy(); pad = new Pad(root, c); }
          if (pad) pad.setConnected(true);
          hud(c);
        } else stopPad();
      },
      frame(c) { ctx = c; if (pad && playing(c)) { pad.setConnected(true); hud(c); } },
      disconnect() { if (pad) pad.setConnected(false); },
      destroy() { stopPad(); ctx = null; },
    } });
  }
  window.BashPhone = { register };
})();
