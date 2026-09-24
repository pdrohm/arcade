// Celular do Último de Pé: a arena em tela cheia (o mesmo desenho da TV) e o controle de mira.
// Mirar: arraste o dedo na arena. O personagem aponta para o dedo e, nos pinguins, a distância
// até o dedo é a FORÇA do dash (a seta mostra até onde você escorrega). Também dá para deslizar
// na faixa de baixo ou segurar ⟲ ⟳. No computador: o mouse aponta; A/D e as setas giram;
// W/S (↑/↓) mudam a força.
// O celular manda só ângulo e força (t:'input'). Nada de botão de ação: no fim do 3, 2, 1 o
// servidor fecha as miras e resolve a rodada para todos ao mesmo tempo.
(() => {
  const A = ARCADE;
  const AIMING = ['aim', 'ready'];
  let context = null, renderer = null, pad = null, panelKey = '', loading = false;

  function css() {
    if (document.getElementById('udp-css')) return;
    const link = document.createElement('link'); link.id = 'udp-css'; link.rel = 'stylesheet'; link.href = '/shared/ultimodepe/ui.css'; document.head.appendChild(link);
  }
  function loadRenderer() {
    if (window.UDPRender || loading) return;
    loading = true;
    const s = document.createElement('script'); s.src = '/shared/ultimodepe/render.js';
    s.onload = () => { loading = false; if (context) ensure(context); };
    s.onerror = () => { loading = false; s.remove(); };
    document.head.appendChild(s);
  }
  const who = (G, pid) => G.roster.find(p => p.pid === pid) || { name: '?', color: '#94a3b8' };
  const ownBody = G => G && G.you ? (G.bodies || []).find(b => b.pid === G.you.pid) : null;
  const left = c => { const r = c && c.remaining(); return r === null || r === undefined ? null : r * 1000; };
  // mesma regra de contraste da paleta da casa (branco no roxo, preto no verde)
  const ink = hex => { const n = parseInt(String(hex).replace('#', ''), 16) || 0; return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 133 ? '#111' : '#fff'; };
  const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (err) { /* opcional */ } };
  // distância do dedo → força: a força cujo dash para exatamente ali (tabela do servidor, ao contrário)
  function powerFor(G, dist) {
    const t = G.reachTable;
    if (!t || !t.length) return 1;
    if (dist <= t[0][1]) return t[0][0];
    for (let i = 1; i < t.length; i++) if (dist <= t[i][1]) return t[i - 1][0] + (t[i][0] - t[i - 1][0]) * (dist - t[i - 1][1]) / (t[i][1] - t[i - 1][1]);
    return 1;
  }

  // ---------- controle de mira ----------
  class AimPad {
    constructor(root) {
      this.root = root; this.canvas = root.querySelector('#udp-canvas'); this.dial = root.querySelector('#udp-dial');
      this.aim = null; this.power = null; this.move = null; this.mode = 'aim'; this.roundKey = ''; this.gen = 0; this.pointer = null; this.hoverOk = false;
      this.rot = new Map(); this.pow = new Map(); this.lastSent = 0; this.pendingT = null; this.dead = false; this.lastPhase = '';
      this.abort = new AbortController(); const o = { signal: this.abort.signal };
      const unlock = () => { if (window.UDPSound) window.UDPSound.unlock(); };
      const cap = (el, id) => { try { el.setPointerCapture(id); } catch (err) { /* sem captura */ } };
      // arena: o personagem aponta para o dedo. Um dedo que já estava na tela ANTES de todos sumirem
      // não vale (senão dava para "marcar" alguém com o dedo parado durante o MEMORIZE).
      this.canvas.addEventListener('pointerdown', e => {
        unlock(); e.preventDefault();
        this.pointer = { id: e.pointerId, gen: this.gen, kind: 'arena' }; cap(this.canvas, e.pointerId);
        if (this.can()) this.pointAt(e);
      }, o);
      this.canvas.addEventListener('pointermove', e => {
        if (this.pointer && this.pointer.id === e.pointerId) { if (this.pointer.gen === this.gen && this.can()) this.pointAt(e); return; }
        // mouse sem clicar: aponta também, mas só depois de mexer já na fase de mira
        if (e.pointerType === 'mouse' && !e.buttons && this.can()) { if (this.hoverOk) this.pointAt(e); else this.hoverOk = true; }
      }, o);
      const release = e => { if (this.pointer && this.pointer.id === e.pointerId) this.pointer = null; };
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) this.canvas.addEventListener(t, release, o);
      // faixa de baixo: deslizar para o lado gira; para cima/baixo muda a força
      this.dial.addEventListener('pointerdown', e => { unlock(); e.preventDefault(); this.pointer = { id: e.pointerId, gen: this.gen, kind: 'dial', x: e.clientX, y: e.clientY }; cap(this.dial, e.pointerId); }, o);
      this.dial.addEventListener('pointermove', e => {
        const p = this.pointer; if (!p || p.id !== e.pointerId || p.kind !== 'dial') return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (p.gen !== this.gen || !this.can() || this.aim === null) return;
        if (this.power !== null) this.power = this.clampPow(this.power - dy * .006);
        this.set(this.aim + dx * .012);
      }, o);
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) this.dial.addEventListener(t, release, o);
      // Tiroteio: 🎯 mirar ou 🏃 andar (tocar na arena escolhe o lugar novo)
      for (const b of root.querySelectorAll('[data-mode]')) b.addEventListener('click', e => { e.stopPropagation(); unlock(); this.mode = b.dataset.mode; this.paint(); if (context) status(context); }, o);
      // ⟲ ⟳ seguram e giram
      for (const b of root.querySelectorAll('[data-rot]')) {
        b.addEventListener('pointerdown', e => { unlock(); e.preventDefault(); cap(b, e.pointerId); this.rot.set('p' + e.pointerId, Number(b.dataset.rot)); b.classList.add('held'); }, o);
        const up = e => { this.rot.delete('p' + e.pointerId); b.classList.remove('held'); };
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, up, o);
      }
      const keys = { a: -1, A: -1, ArrowLeft: -1, d: 1, D: 1, ArrowRight: 1 };
      const powKeys = { w: 1, W: 1, ArrowUp: 1, s: -1, S: -1, ArrowDown: -1 };
      window.addEventListener('keydown', e => {
        if (keys[e.key] !== undefined) { e.preventDefault(); unlock(); this.rot.set('k' + e.key.toLowerCase(), keys[e.key]); }
        if (powKeys[e.key] !== undefined) { e.preventDefault(); unlock(); this.pow.set('k' + e.key.toLowerCase(), powKeys[e.key]); }
      }, o);
      window.addEventListener('keyup', e => { this.rot.delete('k' + e.key.toLowerCase()); this.pow.delete('k' + e.key.toLowerCase()); }, o);
      window.addEventListener('blur', () => { this.rot.clear(); this.pow.clear(); this.pointer = null; }, o);
      root.addEventListener('contextmenu', e => e.preventDefault(), o);
      // nada de rolar nem dar zoom na arena; só a lista do fim de partida rola
      root.addEventListener('touchmove', e => { if (!e.target.closest('#udp-panel')) e.preventDefault(); }, { signal: this.abort.signal, passive: false });
      let last = performance.now();
      const spin = () => {
        if (this.dead) return;
        const t = performance.now(), dt = Math.min(.05, (t - last) / 1000); last = t;
        let dir = 0, dp = 0; for (const v of this.rot.values()) dir += v; for (const v of this.pow.values()) dp += v;
        if ((dir || dp) && this.can() && this.aim !== null) {
          if (dp && this.power !== null) this.power = this.clampPow(this.power + Math.sign(dp) * .8 * dt);
          this.set(this.aim + Math.sign(dir) * 3 * dt);
        }
        this.raf = requestAnimationFrame(spin);
      };
      this.raf = requestAnimationFrame(spin);
      this.beat = setInterval(() => { if (this.can()) this.flush(); }, 400);   // reforço: a última mira sempre chega
    }
    clampPow(p) { const G = context && context.G, min = (G && G.powerMin) || .3; return Math.max(min, Math.min(1, p)); }
    can() {
      const G = context && context.G;
      if (!G || !G.you || !G.you.alive || !AIMING.includes(G.phase) || !ownBody(G)) return false;
      if (G.phase === 'ready') { const l = left(context); if (l !== null && l < 40) return false; }   // o JÁ! local fecha a mira
      return true;
    }
    sync(c) {
      const G = c.G;
      if (['aim', 'ready', 'lock'].includes(G.phase) && G.you && G.you.alive) {
        const key = G.matchId + ':' + G.round;
        if (key !== this.roundKey) {
          this.roundKey = key; this.gen++; this.pointer = null; this.hoverOk = false;
          const b = ownBody(G);
          this.aim = Number.isFinite(G.you.aim) ? G.you.aim : b ? b.face : 0;
          this.power = G.power ? (Number.isFinite(G.you.power) ? G.you.power : .8) : null;
          this.move = G.canMove && G.you.move ? { x: G.you.move.x, y: G.you.move.y } : null;
          this.mode = 'aim';
        }
      }
      if (G.phase !== this.lastPhase) {
        this.lastPhase = G.phase;
        if (G.phase === 'ready' || G.phase === 'lock') this.flush(true);   // manda a mira de novo: chega antes do fechamento
      }
      this.paint();
    }
    // onde você está nesta rodada: o lugar novo escolhido (tiroteio) ou o de sempre
    at() { const b = ownBody(context.G); return b && this.move ? { x: this.move.x, y: this.move.y } : b; }
    pointAt(e) {
      const G = context.G, b0 = ownBody(G); if (!b0 || !renderer) return;
      const r = this.canvas.getBoundingClientRect(), w = renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
      if (this.mode === 'move' && G.canMove) {
        // mesma regra do servidor: até moveMax de onde você estava, e dentro da cerca
        let x = w.x, y = w.y; const mx = x - b0.x, my = y - b0.y, md = Math.hypot(mx, my), max = G.moveMax || 4.5;
        if (md > max) { x = b0.x + mx / md * max; y = b0.y + my / md * max; }
        const lim = G.radius - G.body * 1.5, e2 = Math.hypot(x, y);
        if (e2 > lim) { x = x / e2 * lim; y = y / e2 * lim; }
        this.move = Math.hypot(x - b0.x, y - b0.y) < .3 ? null : { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
        this.set(this.aim);
        return;
      }
      const b = this.at();
      const dx = w.x - b.x, dy = w.y - b.y, d = Math.hypot(dx, dy);
      if (d < .5) return;
      if (this.power !== null) this.power = this.clampPow(powerFor(G, d));
      this.set(Math.atan2(dy, dx));
    }
    set(a) {
      this.aim = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const t = performance.now();
      if (t - this.lastSent >= 50) this.flush();
      else if (!this.pendingT) this.pendingT = setTimeout(() => { this.pendingT = null; this.flush(); }, 50 - (t - this.lastSent));
    }
    flush(force) {
      const G = context && context.G;
      if (this.dead || this.aim === null || !G || !G.you || !G.you.alive || !['aim', 'ready', 'lock'].includes(G.phase)) return;
      if (!force && !this.can()) return;
      const msg = { t: 'input', matchId: G.matchId, round: G.round, aim: Math.round(this.aim * 1000) / 1000 };
      if (this.power !== null) msg.power = Math.round(this.power * 100) / 100;
      if (G.canMove) { const b = ownBody(G), m = this.move || b; if (m) { msg.mx = m.x; msg.my = m.y; } }
      A.send(msg);
      this.lastSent = performance.now();
    }
    paint() {
      const ok = this.can();
      for (const b of this.root.querySelectorAll('[data-rot]')) b.disabled = !ok;
      this.dial.classList.toggle('on', ok);
      const G = context && context.G, box = this.root.querySelector('#udp-mode');
      if (box) {
        box.hidden = !(G && G.canMove && ok);
        for (const b of box.querySelectorAll('[data-mode]')) b.classList.toggle('sel', b.dataset.mode === this.mode);
      }
    }
    destroy() { this.dead = true; this.abort.abort(); cancelAnimationFrame(this.raf); clearInterval(this.beat); clearTimeout(this.pendingT); }
  }

  // ---------- telas ----------
  function setup(c) {
    const G = c.G, host = c.you && c.you.pid === G.hostPid, n = c.C.players.length, hostP = c.C.players.find(p => p.pid === G.hostPid);
    const peng = G.variant === 'penguins';
    const v = (id, e, name, sub) => `<button class="udp-vbtn ${id} ${G.variant === id ? 'sel' : ''}" data-a="udp-variant" data-v="${id}" ${host ? '' : 'disabled'} aria-pressed="${G.variant === id}"><span class="e">${e}</span>${name}<small>${sub}</small></button>`;
    return `<section class="udp-ui">
      <div class="udp-variants">${v('penguins', '🐧', 'PINGUINS', 'dash no gelo')}${v('shootout', '🤠', 'TIROTEIO', 'um tiro cada')}</div>
      <div class="box"><p class="sub">${peng
        ? 'Todo mundo aparece por alguns segundos. Depois os outros somem: você arrasta o dedo para escolher a <b>direção</b> e a <b>força</b> e, no <b>JÁ!</b>, todos os pinguins dão um dash juntos. Bateu, empurrou. Caiu na água, saiu.'
        : 'Todo mundo aparece por alguns segundos. Depois os outros somem: você mira de memória e, no <b>FOGO!</b>, todos atiram juntos. Levou tiro, saiu. Dois se acertando caem juntos.'}</p>
        <p class="sub mut" style="margin-top:8px">O último de pé vence. Se todos os que restam saem juntos, eles jogam um desempate.</p></div>
      <button class="udp-toggle ${G.showOthers ? 'on' : ''}" data-a="udp-show" ${host ? '' : 'disabled'} aria-pressed="${G.showOthers}">
        <span class="sw"><i></i></span><span><b>👀 Mostrar todo mundo antes de cada rodada</b><small>${G.showOthers ? 'Ligado: MEMORIZE de alguns segundos no começo de cada rodada.' : 'Desligado: ninguém aparece antes. Só a memória da rodada anterior.'}</small></span>
      </button>
      <div class="box">${c.playersHtml({ tag: (p, i) => (i >= 8 ? ' 👀' : '') })}${n > 8 ? '<p class="sub mut center" style="margin-top:8px">Até 8 na disputa. 👀 assiste esta partida.</p>' : ''}</div>
      ${host
        ? `<button class="btn big ok" data-a="udp-start" ${n >= 2 ? '' : 'disabled'}>▶️ Começar</button>${n < 2 ? '<p class="sub center mut">Precisa de pelo menos 2 jogadores.</p>' : ''}`
        : `<p class="sub center mut">${hostP ? c.nm(hostP) : 'O primeiro jogador'} escolhe a variante e começa.</p>`}
    </section>`;
  }
  // Tela cheia: o canvas ocupa o celular inteiro. Em cima, só botões flutuantes; embaixo, os controles.
  function arena() {
    const fs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    return `<section class="udp-full" id="udp-root">
      <canvas id="udp-canvas" aria-label="Arena do Último de Pé"></canvas>
      <div class="udp-fab">
        <button data-a="voltar" aria-label="Sair do jogo">✕</button>
        ${fs ? '<button data-a="udp-fs" aria-label="Tela cheia">⛶</button>' : ''}
      </div>
      <div class="udp-bottom" id="udp-bottom">
        <div class="udp-mode" id="udp-mode" hidden><button data-mode="aim">🎯 Mirar</button><button data-mode="move">🏃 Andar</button></div>
        <div class="udp-bar" id="udp-bar">
          <button class="udp-rot" data-rot="-1" aria-label="Girar para a esquerda">↺</button>
          <div class="udp-dial" id="udp-dial"><b id="udp-status">…</b><small id="udp-sub"></small></div>
          <button class="udp-rot" data-rot="1" aria-label="Girar para a direita">↻</button>
        </div>
        <div class="udp-panel" id="udp-panel"></div>
      </div>
    </section>`;
  }
  function status(c) {
    const G = c.G, you = G.you || {}, peng = G.variant === 'penguins';
    const put = (id, t) => { const e = document.getElementById(id); if (e && e.textContent !== t) e.textContent = t; };
    let a = '', b = '';
    if (!you.playing) { a = '👀 Na torcida'; b = 'Você joga na próxima partida'; }
    else if (!you.alive && G.phase !== 'end' && !(G.phase === 'result' && G.result && G.result.out.includes(you.pid))) { a = peng ? '💦 Você caiu' : '💥 Você saiu'; b = 'Assista e torça!'; }
    else switch (G.phase) {
      case 'intro': a = 'Prepare-se!'; b = 'Leia as regras na tela'; break;
      case 'reveal': a = G.blind ? 'Sem espiar!' : G.tiebreak ? 'DESEMPATE! Memorize' : 'MEMORIZE!'; b = G.blind ? 'Lembre da rodada anterior' : 'Decore onde cada um está'; break;
      case 'aim': a = peng ? 'Arraste: direção e força' : pad && pad.mode === 'move' ? 'Toque onde quer ficar' : 'Arraste na arena para mirar'; b = peng ? 'longe = forte · perto = fraco' : '🏃 Andar troca de lugar · 🎯 Mirar aponta'; break;
      case 'ready': a = 'Prepare-se… 3, 2, 1'; b = 'Ainda dá para ajustar'; break;
      case 'lock': case 'action': a = peng ? 'JÁ!' : 'FOGO!'; b = ''; break;
      case 'result': {
        const r = G.result || { out: [] };
        if (G.ending) { a = G.winners.includes(you.pid) ? (G.winners.length > 1 ? '🤝 Empate!' : '🏆 Você venceu!') : '🏁 Fim!'; b = ''; }
        else if (r.tie) { a = '😱 Todo mundo saiu junto'; b = 'Desempate!'; }
        else if (r.out.includes(you.pid)) { a = peng ? '💦 Você caiu!' : '💥 Te pegaram!'; b = 'Assista e torça!'; }
        else if (r.none) { a = peng ? 'Ninguém caiu!' : 'Todo mundo errou!'; b = 'Próxima rodada'; }
        else { a = 'Você sobreviveu!'; b = r.out.map(pid => who(G, pid).name).join(', ') + (r.out.length > 1 ? ' saíram' : ' saiu'); }
        break;
      }
      case 'end': a = G.winners.includes(you.pid) ? (G.winners.length > 1 ? '🤝 Vitória dividida!' : '🏆 Você venceu!') : '🏁 Fim de partida'; b = ''; break;
    }
    put('udp-status', a); put('udp-sub', b);
  }
  function panel(c) {
    const G = c.G, el = document.getElementById('udp-panel'); if (!el) return;
    const bar = document.getElementById('udp-bar');
    if (bar) bar.hidden = G.phase === 'end';
    const key = G.phase === 'end' ? 'end:' + G.matchId + ':' + G.hostPid + ':' + (c.you && c.you.pid) : '';
    if (key === panelKey) return;
    panelKey = key;
    if (G.phase !== 'end') { el.innerHTML = ''; return; }
    const list = [], seen = new Set();
    for (const pid of G.winners) { list.push({ pid, pos: 1 }); seen.add(pid); }
    let pos = list.length + 1;
    for (const o of G.outList.slice().reverse()) if (!seen.has(o.pid)) { seen.add(o.pid); list.push({ pid: o.pid, pos: pos++, round: o.round }); }
    for (const p of G.roster) if (!seen.has(p.pid)) list.push({ pid: p.pid, pos: pos++ });
    const host = c.you && c.you.pid === G.hostPid;
    el.innerHTML = `<div class="udp-rank">${list.map(x => { const p = who(G, x.pid); return `<p class="${c.you && x.pid === c.you.pid ? 'me' : ''}"><i>${x.pos}º</i><span class="nm" style="background:${c.esc(p.color)};color:${ink(p.color)}">${c.esc(p.name)}</span>${x.round ? `<small>rodada ${x.round}</small>` : ''}</p>`; }).join('')}</div>
      ${host ? '<button class="btn big ok" id="udp-again">🔁 Jogar de novo</button>' : '<p class="sub center mut">O primeiro jogador pode começar outra partida.</p>'}`;
    const again = document.getElementById('udp-again');
    if (again) again.onclick = ev => { ev.stopPropagation(); A.send({ t: 'udp-again' }); };
  }
  function ensure(c) {
    const canvas = document.getElementById('udp-canvas');
    if (!canvas || !window.UDPRender) return;
    if (!renderer || renderer.canvas !== canvas) {
      if (renderer) renderer.dispose();
      if (pad) pad.destroy();
      renderer = new window.UDPRender(canvas, {
        kind: 'phone',
        you: () => (context && context.you ? context.you.pid : null),
        left: () => left(context),
        aim: () => (pad ? pad.aim : null),
        move: () => (pad ? pad.move : null),
        mode: () => (pad ? pad.mode : 'aim'),
        power: () => (pad ? pad.power : null),
        // a arena desenha acima dos controles de baixo
        insetBottom: () => { const b = document.getElementById('udp-bottom'); return b ? b.offsetHeight + 10 : 150; },
        onEvent: (name, d) => {
          if (name === 'go') vibrate(35);
          else if (name === 'tick') vibrate(12);
          else if (name === 'bump') vibrate(Math.round(30 + 50 * (d.s || 0)));
          else if (name === 'out') { vibrate([90, 50, 180]); if (window.UDPSound) window.UDPSound.play('out'); }
        },
      });
      window.UDPSound.volume(.55);
      pad = new AimPad(document.getElementById('udp-root'));
    }
    renderer.setState(c.G);
    pad.sync(c);
  }
  function stop() { if (pad) pad.destroy(); pad = null; if (renderer) renderer.dispose(); renderer = null; panelKey = ''; document.body.classList.remove('udp-playing'); }
  function toggleFullscreen() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else { const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (p && p.catch) p.catch(() => {}); }
    } catch (err) { /* o navegador não deixou: segue na tela normal */ }
  }

  A.register('ultimodepe', { phone: {
    // A arena fica montada a partida inteira: o estado novo só atualiza o desenho e os textos.
    key(c) {
      const G = c.G;
      if (!G) return 'loading';
      if (G.phase === 'setup') return 'setup:' + JSON.stringify([G.variant, G.showOthers, G.hostPid, c.C.players.map(p => [p.pid, p.name, p.color, p.on])]);
      return 'arena:' + G.matchId;
    },
    html(c) {
      css();
      if (!c.G) return '<div class="box">Carregando…</div>';
      if (c.G.phase === 'setup') return setup(c);
      loadRenderer();
      return arena();
    },
    act(a, el, c) {
      if (a === 'udp-variant') c.send({ t: 'udp-variant', variant: el.dataset.v });
      if (a === 'udp-show') c.send({ t: 'udp-show', on: !c.G.showOthers });
      if (a === 'udp-start') c.send({ t: 'udp-start' });
      if (a === 'udp-fs') toggleFullscreen();
    },
    after(c) {
      context = c;
      if (!c.G || c.G.phase === 'setup') { stop(); return; }
      document.body.classList.add('udp-playing');
      ensure(c);
      status(c);
      panel(c);
    },
    destroy() { stop(); context = null; },
  } });
})();
