(() => {
  const A = ARCADE;
  // Nomes dos itens; os desenhos vêm de /shared/kart/icons.js (o mesmo traço da TV).
  const items = { rocket: 'FOGUETE', bomb: 'BOMBA', oil: 'ÓLEO', shield: 'ESCUDO', boost: 'TURBO', rapid: 'RAJADA', mine: 'MINA' };
  const TRACKS = { race: 'Circuito Aurora', battle: 'Forte Prisma' };
  let context = null, controller = null, lastItem = null;
  function css() {
    if (!document.getElementById('kart-phone-css')) { const link = document.createElement('link'); link.id = 'kart-phone-css'; link.rel = 'stylesheet'; link.href = '/shared/kart/phone.css'; document.head.appendChild(link); }
    if (!window.KartIcons && !document.getElementById('kart-icons-js')) { const s = document.createElement('script'); s.id = 'kart-icons-js'; s.src = '/shared/kart/icons.js'; s.onload = () => { lastItem = null; if (A.redraw) A.redraw(); }; document.head.appendChild(s); }
  }
  const I = () => window.KartIcons;
  const portrait = (i, color, cls = 'ks-portrait') => `<span class="${cls}" style="background:${I() ? I().driverBg(i) : '#cfe2ee'}">${I() ? I().driver(i, color) : ''}</span>`;
  const misc = name => I() ? I().misc(name) : '';
  const mine = c => c.G.roster.find(p => c.you && p.pid === c.you.pid);
  const driving = c => ['loading', 'countdown', 'playing'].includes(c.G.phase) && !!mine(c);
  function stop() { if (controller) controller.destroy(); controller = null; lastItem = null; document.body.classList.remove('kart-driving'); }
  const EDGE_GAP = 16, STEER_GAP = 33, HEARTBEAT = 100, DEADZONE = .08;
  class PhoneController {
    constructor(root) {
      this.root = root; this.matchId = context.G.matchId; this.pointers = new Map(); this.keys = new Set();
      this.steer = 0; this.stickId = null; this.queue = []; this.lastSent = -Infinity; this.lastState = null; this.dead = false;
      this.connected = true; this.focused = !document.hidden; this.portrait = false; this.lastHaptic = -Infinity;
      this.pending = null; this.pendingAt = Infinity;
      this.abort = new AbortController(); const options = { signal: this.abort.signal };
      this.stick = root.querySelector('[data-stick]'); this.knob = root.querySelector('.kart-stick-knob'); this.conn = root.querySelector('.kart-conn');
      const capture = (el, id) => { try { el.setPointerCapture(id); } catch (_) { /* Synthetic/unsupported pointer capture. */ } };
      this.stick.addEventListener('pointerdown', e => {
        if (!this.available() || this.stickId !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault(); this.stickId = e.pointerId; capture(this.stick, e.pointerId); this.move(e); this.request();
      }, options);
      this.stick.addEventListener('pointermove', e => { if (e.pointerId === this.stickId) { e.preventDefault(); this.move(e); this.request(); } }, options);
      const releaseStick = e => { if (e.pointerId !== this.stickId) return; this.stickId = null; this.steer = 0; this.paintStick(0, 0); this.request(); };
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.stick.addEventListener(type, releaseStick, options);
      for (const button of root.querySelectorAll('[data-control]')) {
        button.addEventListener('pointerdown', e => {
          if (!this.available() || (e.pointerType === 'mouse' && e.button !== 0)) return;
          e.preventDefault(); this.pointers.set(e.pointerId, button.dataset.control); capture(button, e.pointerId); this.paint(); this.request(true);
        }, options);
        const release = e => { if (this.pointers.delete(e.pointerId)) { this.paint(); this.request(true); } };
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release, options);
      }
      root.addEventListener('contextmenu', e => e.preventDefault(), options);
      // O gesto de "voltar" ou zoom do navegador não pode roubar um toque no meio da curva.
      root.addEventListener('touchmove', e => e.preventDefault(), { signal: this.abort.signal, passive: false });
      const bindings = { ArrowLeft: 'left', ArrowRight: 'right', ' ': 'drift', x: 'item', z: 'boost' };
      window.addEventListener('keydown', e => {
        if (!bindings[e.key] || e.repeat || !this.available()) return;
        e.preventDefault(); this.keys.add(bindings[e.key]); this.paint(); this.request(true);
      }, options);
      window.addEventListener('keyup', e => { if (!bindings[e.key]) return; e.preventDefault(); this.keys.delete(bindings[e.key]); this.paint(); this.request(true); }, options);
      window.addEventListener('blur', () => { this.focused = false; this.clear(); }, options);
      window.addEventListener('focus', () => { this.focused = true; this.request(); }, options);
      window.addEventListener('pagehide', () => { this.focused = false; this.clear(); }, options);
      window.addEventListener('pageshow', () => { this.focused = true; this.orientation(); }, options);
      document.addEventListener('visibilitychange', () => { this.focused = !document.hidden; this.clear(); }, options);
      this.coarse = window.matchMedia('(pointer: coarse)'); this.landscape = window.matchMedia('(orientation: landscape)');
      this.onOrientation = () => this.orientation();
      for (const query of [this.coarse, this.landscape]) {
        if (query.addEventListener) query.addEventListener('change', this.onOrientation, options);
        else if (query.addListener) query.addListener(this.onOrientation);
      }
      window.addEventListener('resize', this.onOrientation, options);
      root.querySelector('[data-fullscreen]').addEventListener('click', async () => {
        try {
          if (!document.fullscreenElement && root.requestFullscreen) await root.requestFullscreen();
          if (document.fullscreenElement && screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape'); this.locked = true;
          }
        } catch (_) { /* Rotation detection remains available without fullscreen/lock. */ }
      }, options);
      this.orientation(); this.interval = setInterval(() => this.request(), HEARTBEAT);
    }
    available() { return !this.dead && this.connected && this.focused && !document.hidden && !this.portrait && this.root.isConnected; }
    current() { return context && driving(context) && context.G.matchId === this.matchId; }
    orientation() {
      const portrait = this.coarse.matches && !this.landscape.matches;
      if (portrait !== this.portrait) { this.portrait = portrait; this.clear(); }
      this.root.classList.toggle('needs-rotation', portrait);
      this.root.querySelector('.kart-gamepad').hidden = portrait;
      this.root.querySelector('.kart-rotate').hidden = !portrait;
      this.request();
    }
    setConnected(on) {
      if (this.connected === on) return;
      this.connected = on; this.root.classList.toggle('offline', !on);
      if (this.conn) this.conn.hidden = on;
      if (!on) this.clear(); else this.request();
    }
    move(e) {
      const r = this.stick.getBoundingClientRect(), radius = Math.max(1, r.width * .31);
      const x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / radius));
      const y = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / radius));
      // Zona morta no centro; depois uma curva suave: precisão perto do centro, força perto da borda.
      const t = Math.max(0, Math.abs(x) - DEADZONE) / (1 - DEADZONE);
      this.steer = Math.round(Math.sign(x) * (.6 * t + .4 * t * t) * 1000) / 1000;
      this.paintStick(x * radius, y * radius * .45);
    }
    paintStick(x, y) { this.knob.style.transform = `translate(${x}px,${y}px)`; this.stick.style.setProperty('--steer', Math.abs(this.steer)); this.stick.setAttribute('aria-valuenow', String(Math.round(this.steer * 100))); }
    held() { return new Set([...this.pointers.values(), ...this.keys]); }
    paint() { const held = this.held(); for (const b of this.root.querySelectorAll('[data-control]')) { const pressed = held.has(b.dataset.control); b.classList.toggle('held', pressed); b.setAttribute('aria-pressed', String(pressed)); } }
    state() {
      const held = this.held(), active = this.available();
      return { t: 'input', matchId: this.matchId, steer: active ? (this.keys.has('left') || this.keys.has('right') ? Number(this.keys.has('right')) - Number(this.keys.has('left')) : this.steer) : 0,
        drift: active && held.has('drift'), item: active && held.has('item'), boost: active && held.has('boost'), active };
    }
    static sameButtons(a, b) { return !!a && !!b && ['drift', 'item', 'boost', 'active'].every(k => a[k] === b[k]); }
    schedule(ms) {
      const at = performance.now() + Math.max(0, ms);
      if (this.pending && this.pendingAt <= at) return;
      clearTimeout(this.pending);
      this.pendingAt = at; this.pending = setTimeout(() => { this.pending = null; this.pendingAt = Infinity; this.flush(); }, Math.max(0, ms));
    }
    request(edge = false) {
      if (this.dead || !this.current()) return;
      // Preserve quick action edges between ticks; analog moves only replace the latest state.
      if (edge) {
        const next = this.state(), last = this.queue[this.queue.length - 1] || this.lastState;
        if (!PhoneController.sameButtons(last, next)) { if (this.queue.length >= 6) this.queue.shift(); this.queue.push(next); }
      }
      this.flush();
    }
    flush() {
      if (this.dead || !this.current()) return;
      const now = performance.now(), since = now - this.lastSent;
      if (this.queue.length) {
        if (since < EDGE_GAP) { this.schedule(EDGE_GAP - since); return; }
        this.emit(this.queue.shift(), now);
        if (this.queue.length) this.schedule(EDGE_GAP); else this.schedule(HEARTBEAT);
        return;
      }
      const state = this.state();
      const changed = !this.lastState || state.steer !== this.lastState.steer || !PhoneController.sameButtons(state, this.lastState);
      if (!changed) { if (since < HEARTBEAT) { this.schedule(HEARTBEAT - since); return; } }
      else if (since < STEER_GAP) { this.schedule(STEER_GAP - since); return; }
      this.emit(state, now); this.schedule(HEARTBEAT);
    }
    emit(state, now) {
      if (!this.available()) Object.assign(state, { steer: 0, drift: false, item: false, boost: false, active: false });
      A.send(state); this.lastSent = now; this.lastState = state;
    }
    clear() {
      this.pointers.clear(); this.keys.clear(); this.stickId = null; this.steer = 0;
      this.paintStick(0, 0); this.paint(); this.queue.length = 0;
      if (!this.dead && this.current()) { this.queue.push({ t: 'input', matchId: this.matchId, steer: 0, drift: false, item: false, boost: false, active: false }); this.request(); }
    }
    haptic(duration) { const now = performance.now(); if (this.available() && now - this.lastHaptic > 250 && typeof navigator.vibrate === 'function') { try { navigator.vibrate(duration); this.lastHaptic = now; } catch (_) { /* Optional enhancement. */ } } }
    feedback(priv) {
      if (this.previous) {
        if (priv.item && priv.item !== this.previous.item) this.haptic(18);
        else if (this.previous.item && !priv.item) this.haptic(12);
        else if (priv.hit !== this.previous.hit) this.haptic(35);
        else if (this.previous.driftCharge >= .65 && !priv.driftCharge && !this.held().has('drift') && this.available()) this.haptic(20);
      }
      this.previous = { ...priv };
    }
    destroy() {
      this.clear(); this.dead = true; clearInterval(this.interval); clearTimeout(this.pending); this.abort.abort();
      for (const query of [this.coarse, this.landscape]) if (!query.removeEventListener && query.removeListener) query.removeListener(this.onOrientation);
      if (this.locked && screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }
  }
  function setup(c) {
    const g = c.G, p = mine(c), host = c.you.pid === g.hostPid;
    const mode = `<div class="ks-block"><h3 class="ks-title">Disputa <small>${host ? 'você escolhe' : 'o primeiro piloto escolhe'}</small></h3><div class="ks-modes">${[['race', 'flag', 'CORRIDA', '3 voltas · ' + TRACKS.race], ['battle', 'burst', 'BATALHA', '2 minutos · ' + TRACKS.battle]].map(([id, icon, label, sub]) => `<button class="ks-mode ${id} ${g.mode === id ? 'sel' : ''}" data-a="kart-mode" data-mode="${id}" aria-pressed="${g.mode === id}" ${host ? '' : 'disabled'}>${misc(icon)}<b>${label}</b><small>${sub}</small></button>`).join('')}</div></div>`;
    const logo = `<div class="ks-logo"><small>Arcade</small><b>Kart</b></div>`;
    const roster = `<div class="ks-block ks-roster"><h3 class="ks-title">Pilotos <small>${g.roster.length}/4</small></h3>${g.roster.map(x => `<p>${portrait(x.driver, x.color)}<span class="nm">${c.esc(x.name)}</span><i style="background:${c.esc(x.color)}"></i><span class="ks-tag ${x.ready ? 'ready' : 'wait'}">${x.ready ? 'pronto' : 'escolhendo…'}</span></p>`).join('')}</div>`;
    if (!p) return `<section class="kart-ui kart-setup">${logo}<p class="ks-sub">Na torcida · você continua nesta sala</p>${mode}${roster}<button class="ks-btn go" data-a="kart-seat" ${g.roster.length >= 4 ? 'disabled' : ''}>${misc('flag')}Entrar na largada</button><p class="ks-note">Até 4 pilotos por partida.</p></section>`;
    return `<section class="kart-ui kart-setup">${logo}<p class="ks-sub">Seu celular é o volante</p>${mode}
      <div class="ks-block"><h3 class="ks-title">Seu piloto</h3><div class="ks-grid">${g.drivers.map((name, i) => `<button class="ks-choice ${p.driver === i ? 'sel' : ''}" data-a="kart-driver" data-value="${i}" aria-pressed="${p.driver === i}">${portrait(i, p.color)}<b>${c.esc(name)}</b></button>`).join('')}</div></div>
      <div class="ks-block"><h3 class="ks-title">Seu kart <small>mesma velocidade, só o estilo</small></h3><div class="ks-grid">${g.karts.map((name, i) => `<button class="ks-choice ${p.kart === i ? 'sel' : ''}" data-a="kart-kart" data-value="${i}" aria-pressed="${p.kart === i}"><span class="ks-kart">${I() ? I().kart(i, p.color) : ''}</span><b>${c.esc(name)}</b></button>`).join('')}</div></div>
      <button class="ks-btn ready ${p.ready ? 'on' : ''}" data-a="kart-ready">${p.ready ? 'Pronto · mudar' : 'Estou pronto'}</button>
      ${roster}
      ${host ? `<button class="ks-btn go" data-a="kart-start" ${g.canStart ? '' : 'disabled'}>${misc('flag')}Largar!</button>` : '<p class="ks-note">Aguarde o primeiro piloto tocar em LARGAR.</p>'}
      ${g.error ? `<p class="ks-error" role="alert">${misc('burst')}${c.esc(g.error)}</p>` : ''}
      <p class="ks-note">Acelera sozinho. Segure DRIFT na curva e solte para ganhar turbo.</p>
      <button class="ks-btn ghost" data-a="kart-seat">Ficar na torcida</button></section>`;
  }
  function controls(c) {
    const p = mine(c);
    return `<section class="kart-controller kart-ui" id="kart-controller" aria-label="Controle do kart" style="--player-color:${c.esc(p.color)}">
      <div class="kart-rotate" hidden role="status"><div class="kart-rotate-phone" aria-hidden="true">▰</div><h2>Vire o celular</h2><p>Use o celular na horizontal para pilotar.</p></div>
      <div class="kart-conn" hidden role="alert"><h2>Conexão perdida</h2><p>Reconectando…</p></div>
      <div class="kart-gamepad">
        <header class="kart-controller-header"><span class="kart-player">${portrait(p.driver, p.color)}${c.esc(p.name)}<i></i></span><span id="kart-status" role="status"></span><button type="button" data-fullscreen aria-label="Tela cheia">⛶</button></header>
        <div class="kart-stick-area"><div class="kart-stick" data-stick role="slider" tabindex="0" aria-label="Direção. Arraste para os lados ou use as setas do teclado." aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><span class="kart-stick-arrow left" aria-hidden="true">‹</span><span class="kart-stick-arrow right" aria-hidden="true">›</span><span class="kart-stick-knob" aria-hidden="true"><span></span></span></div><small class="kart-stick-label">DIREÇÃO</small></div>
        <div class="kart-actions"><button class="kart-pad kart-item empty" data-control="item" aria-pressed="false" aria-label="Usar item"><span id="kart-item" class="kart-item-slot"></span><small id="kart-item-name">SEM ITEM</small></button><button class="kart-pad kart-drift" data-control="drift" aria-pressed="false"><span>DRIFT</span><small>segure · solte</small><span class="kart-drift-fill" aria-hidden="true"></span></button><button class="kart-pad kart-boost" data-control="boost" aria-pressed="false">${misc('turbo')}<b>TURBO</b><small id="kart-boost-state">PRONTO</small></button></div>
        <p class="kart-help">OLHE PARA A TV · ACELERA SOZINHO</p>
      </div>
    </section>`;
  }
  function hud(c) {
    const g = c.G, p = g.world && g.world.karts.find(x => x.pid === c.you.pid), priv = g.private || {};
    const put = (id, text) => { const e = document.getElementById(id); if (e && e.textContent !== text) e.textContent = text; };
    // Battle only: HP is the one private number worth a glance (the TV shows it too, but not per phone).
    put('kart-status', g.phase === 'loading' ? 'CARREGANDO…' : g.phase === 'countdown' ? `LARGADA EM ${g.countdown}` : p && p.respawn > 0 ? `VOLTANDO ${Math.ceil(p.respawn)}` : p && p.finished ? '🏁 CHEGOU!' : g.mode === 'battle' && priv.hp != null ? `♥ ${Math.max(0, Math.ceil(priv.hp))}` : p && p.lap != null && g.mode === 'race' ? `VOLTA ${Math.min(3, p.lap + 1)}/3 · ${p.position}º` : '');
    const item = priv.item || null;
    if (item !== lastItem) { lastItem = item; const slot = document.getElementById('kart-item'); if (slot) { slot.innerHTML = item && I() ? I().item(item) : ''; slot.className = item ? '' : 'kart-item-slot'; } }
    put('kart-item-name', item ? items[item] : 'SEM ITEM');
    put('kart-boost-state', priv.boostCooldown > 0 ? `${Math.ceil(priv.boostCooldown)}s` : 'PRONTO');
    if (controller) {
      controller.root.querySelector('.kart-item').classList.toggle('empty', !item);
      controller.root.querySelector('.kart-boost').classList.toggle('cooldown', priv.boostCooldown > 0);
      const drift = controller.root.querySelector('.kart-drift');
      drift.style.setProperty('--charge', Math.min(1, (priv.driftCharge || 0) / 2.5));
      drift.classList.toggle('charged', priv.driftCharge >= .65);
      controller.feedback(priv);
    }
  }
  function results(c) {
    const g = c.G, results = (g.world && g.world.results) || [], battle = g.mode === 'battle';
    const info = p => battle ? `${p.kills || 0} KO${p.kills === 1 ? '' : 's'}` : p.finished ? `${Math.floor(p.finishTime / 60)}:${String(Math.floor(p.finishTime % 60)).padStart(2, '0')}.${Math.floor(p.finishTime % 1 * 10)}` : `${p.lap} volta${p.lap === 1 ? '' : 's'}`;
    const driverOf = p => (g.roster.find(x => x.pid === p.pid) || {}).driver || 0;
    return `<section class="kart-ui kart-setup"><div class="ks-logo"><small>Resultado</small><b>Kart</b></div><p class="ks-sub">${battle ? 'Fim da batalha' : 'Fim da corrida'} · ${TRACKS[g.mode]}</p>
      <div class="ks-block ks-podium">${results.map((p, i) => `<div class="ks-place p${i + 1} ${p.pid === c.you.pid ? 'me' : ''}"><span class="ks-n">${i + 1}º</span>${portrait(driverOf(p), p.color)}<b>${c.esc(p.name || (g.roster.find(x => x.pid === p.pid) || {}).name || 'Piloto')}</b><small>${info(p)}</small></div>`).join('')}</div>
      ${c.you.pid === g.hostPid ? `<button class="ks-btn go" data-a="kart-again">${misc('flag')}Jogar de novo</button>` : '<p class="ks-note">O primeiro piloto pode iniciar outra partida.</p>'}</section>`;
  }
  A.register('kart', { phone: {
    key(c) {
      const g = c.G;
      if (!g) return 'loading';
      return g.matchId + ':' + (I() ? 'i' : '') + ':' + (driving(c) ? 'controller' : JSON.stringify([g.phase, g.mode, g.roster, g.error, g.tvReady]));
    },
    html(c) {
      css();
      if (!c.G) return '<div class="box">Carregando Kart…</div>';
      if (c.G.phase === 'setup') return setup(c);
      if (driving(c)) return controls(c);
      if (c.G.phase === 'results') return results(c);
      return `<section class="kart-ui kart-setup"><div class="ks-logo"><small>Arcade</small><b>Kart</b></div><div class="ks-block ks-card"><div class="ks-big">${misc('eye')}</div><h2>Na torcida</h2><p>Acompanhe a partida na TV.<br>Você pode jogar na próxima largada.</p></div></section>`;
    },
    act(a, el, c) {
      const actions = { 'kart-ready':'kart-ready', 'kart-start':'kart-start', 'kart-again':'kart-again', 'kart-seat':'kart-seat' };
      if (actions[a]) return c.send({ t: actions[a] });
      if (a === 'kart-mode') c.send({ t:'kart-mode', mode:el.dataset.mode });
      if (a === 'kart-driver') c.send({ t:'kart-select', driver:Number(el.dataset.value) });
      if (a === 'kart-kart') c.send({ t:'kart-select', kart:Number(el.dataset.value) });
    },
    after(c) {
      context = c;
      if (driving(c)) {
        document.body.classList.add('kart-driving');
        const root = document.getElementById('kart-controller');
        if (!controller || controller.root !== root) { if (controller) controller.destroy(); controller = new PhoneController(root); lastItem = null; }
        controller.setConnected(true); hud(c);
      } else stop();
    },
    frame(c) { context = c; if (driving(c)) { if (controller) controller.setConnected(true); hud(c); } },
    disconnect() { if (controller) controller.setConnected(false); },
    destroy() { stop(); context = null; },
  } });
})();
