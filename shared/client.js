// Núcleo das telas: conexão, identidade, ajudantes de desenho e registro de jogos.
// Cada jogo registra suas telas com ARCADE.register(id, { tv:{...}, phone:{...} }).
// A TV da casa é um Chrome de 2016: só entende let/const em modo estrito e não tem
// parâmetro padrão, desestruturação, catch sem variável nem async/await. Ver docs/TV-ANTIGA.md.
'use strict';
window.ARCADE = (() => {
  const games = {};
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let ws = null, meta = null, S = null, you = null, clockOffset = 0, reconnectT = null;
  let onState = () => {}, kind = 'phone', pid = null, overT = null;
  const loaded = new Set();

  // ---------- sala (código de 4 letras na URL: /ABCD ou /tv/ABCD) ----------
  const ROOM_RE = /^\/(?:tv\/)?([a-z0-9]{4})\/?$/i;
  let room = (location.pathname.match(ROOM_RE) || [])[1] || null;
  if (room) room = room.toUpperCase();
  let noRoom = false;   // a sala da URL não existe (mais)
  const goRoom = code => { location.href = '/' + String(code || '').trim().toUpperCase(); };

  // ---------- identidade do celular (não muda ao recarregar) ----------
  function identity() {
    pid = localStorage.getItem('arcade_pid');
    if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 12); localStorage.setItem('arcade_pid', pid); }
    return pid;
  }
  // segredo da vaga: prova que este celular é o dono do pid. O servidor manda em you.sid;
  // guardamos e reenviamos ao (re)entrar. É o que impede outra pessoa de assumir sua vaga pelo pid.
  const sid = () => { try { return localStorage.getItem('arcade_sid') || ''; } catch (err) { return ''; } };
  const saveSid = s => { try { if (s) localStorage.setItem('arcade_sid', s); } catch (err) {} };
  const form = () => JSON.parse(localStorage.getItem('arcade_me') || 'null') || { color: null, name: '' };
  const saveForm = f => localStorage.setItem('arcade_me', JSON.stringify(f));
  const prevName = () => localStorage.getItem('arcade_prev') || '';
  const setPrev = n => { if (n) localStorage.setItem('arcade_prev', n); };

  // ---------- conexão ----------
  function connect() {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
    ws.onopen = () => {
      const el = $('#conn'); if (el) { el.textContent = 'online'; el.className = 'conn'; }
      if (kind === 'tv') send({ t: 'tv', room });
      else if (room) {
        const f = form();
        if (f.color) send({ t: 'join', room, color: f.color, name: f.name, pid: identity(), prevName: prevName(), sid: sid() });
        else send({ t: 'watch', room });     // só olhar a sala (cores livres, quem já entrou) antes de escolher a cor
      }
    };
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.t === 'init') { meta = m; ensureGames().then(draw); return; }
      if (m.t === 'error') return toast(m.text);
      if (m.t === 'room') { if (m.code !== room) location.replace((kind === 'tv' ? '/tv/' : '/') + m.code); return; }
      if (m.t === 'noroom') { noRoom = true; S = null; you = null; return draw(); }
      if (m.t === 'state') {
        clockOffset = m.now - Date.now();
        noRoom = false;
        S = m; you = m.you;
        if (you && you.sid) saveSid(you.sid);   // guarda o segredo da vaga para reconectar como você

        if (meta && S.core.gameId && !loaded.has(S.core.gameId)) { loadGame(S.core.gameId).then(draw); return; }
        draw();
      }
    };
    ws.onclose = () => {
      const el = $('#conn'); if (el) { el.textContent = 'sem conexão… reconectando'; el.className = 'conn off'; }
      clearTimeout(reconnectT); reconnectT = setTimeout(connect, 1200);
    };
    ws.onerror = () => ws.close();
  }
  const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

  // ---------- carregar as telas dos jogos sob demanda ----------
  function loadGame(id) {
    if (loaded.has(id)) return Promise.resolve();
    loaded.add(id);
    return new Promise(res => {
      const sc = document.createElement('script');
      sc.src = `/games/${id}/${kind}.js`;
      sc.onload = res; sc.onerror = res;
      document.head.appendChild(sc);
    });
  }
  const ensureGames = () => Promise.all((meta.games || []).map(g => loadGame(g.id)));

  // ---------- ajudantes de desenho ----------
  const ci = c => (meta.colors || []).find(x => x.key === c) || { hex: '#888', dark: true, name: c };
  const nmStyle = p => `background:${ci(p.color).hex};color:${ci(p.color).dark ? '#fff' : '#111'}`;
  const nm = p => p ? `<span class="nm" style="${nmStyle(p)}">${esc(p.name)}</span>` : '';
  function hl(text) {   // destaca os nomes dos jogadores dentro de qualquer frase
    let out = esc(text);
    for (const p of [...(S.core.players || [])].sort((a, b) => b.name.length - a.name.length)) {
      const n = esc(p.name); if (n) out = out.split(n).join(`<span class="nm" style="${nmStyle(p)}">${n}</span>`);
    }
    return out;
  }
  const remaining = () => S && S.core.timerEnd ? Math.max(0, (S.core.timerEnd - (Date.now() + clockOffset)) / 1000) : null;
  const fmt = r => { const t = Math.ceil(r), s = t % 60; return `${Math.floor(t / 60)}:${s < 10 ? '0' : ''}${s}`; };
  function timerHtml(label, totalMs) {
    const r = remaining(); if (r === null) return '';
    const total = (totalMs || 120000) / 1000;
    return `<div class="box" style="padding:12px"><div class="timer ${r <= 15 ? 'low' : ''}" id="timer">⏱ ${fmt(r)}</div><div class="tbar"><i id="tbar" style="width:${Math.min(100, r / total * 100)}%"></i></div>${label ? `<p class="sub center" style="margin-top:6px">${label}</p>` : ''}</div>`;
  }
  function playersHtml(opts) {
    opts = opts || {};
    const ps = S.core.players;
    if (!ps.length) return '<p class="sub center">Ninguém entrou ainda.</p>';
    return `<div class="players">${ps.map((p, i) => {
      const tag = opts.tag ? opts.tag(p, i) : '';
      const info = opts.info ? opts.info(p, i) : '';
      const cls = ['pl', you && p.pid === you.pid ? 'me' : '', opts.cls ? opts.cls(p, i) : ''].join(' ');
      const style = opts.border ? `border-color:${opts.border(p, i) || 'transparent'}` : '';
      return `<div class="${cls}" style="${style}"><span class="dot" style="background:${ci(p.color).hex}"></span><b>${i + 1}. ${nm(p)}${tag}${p.on === false ? ' 📵' : ''}</b><span>${info}</span>${p.on === false && you && p.pid !== you.pid && kind === 'phone' ? `<b class="kick" data-a="kick" data-pid="${p.pid}" data-name="${esc(p.name)}">✕</b>` : ''}</div>`;
    }).join('')}</div>`;
  }
  function turnover(html, ms, vibrate) {
    const el = $('#turnover'); if (!el) return;
    el.innerHTML = `<div class="turnover">${html}</div>`;
    clearTimeout(overT);
    overT = setTimeout(() => { el.innerHTML = ''; }, ms || 2600);
    if (vibrate && navigator.vibrate) { try { navigator.vibrate(vibrate); } catch (err) {} }
  }
  function toast(t) { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800); }

  // ---------- som ----------
  let actx = null;
  function beep(freq, dur, type, vol) {
    type = type || 'sine'; vol = vol === undefined ? .22 : vol;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = vol;
      o.connect(g); g.connect(actx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + dur); o.stop(actx.currentTime + dur);
    } catch (err) {}
  }
  const chord = (fs, t) => fs.forEach((f, i) => setTimeout(() => beep(f, .22, t || 'triangle', .2), i * 130));
  document.addEventListener('click', () => { if (actx && actx.state === 'suspended') actx.resume(); });

  // ---------- tela sempre acesa e reconexão ----------
  let wakeLock = null;
  function keepAwake() {
    try {
      if (!('wakeLock' in navigator) || wakeLock) return;
      navigator.wakeLock.request('screen').then(w => {
        wakeLock = w;
        w.addEventListener('release', () => { wakeLock = null; });
      }, () => {});   // sem wakeLock (ou negado): a tela pode apagar, o resto funciona igual
    } catch (err) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); if (!ws || ws.readyState > 1) connect(); } });
  document.addEventListener('click', keepAwake);
  document.addEventListener('touchstart', keepAwake, { passive: true });

  // contexto entregue às telas dos jogos
  function ctx() {
    return {
      S, you, meta, kind, room, noRoom, send, esc, ci, nm, nmStyle, hl, playersHtml, timerHtml, turnover, toast, beep, chord,
      G: S ? S.game : null, C: S ? S.core : null, remaining, fmt,
      game: () => (meta.games || []).find(g => g.id === S.core.gameId) || {},
    };
  }
  // O celular sem sala (ou com sala que sumiu) desenha a tela de código mesmo sem estado.
  function draw() { if (meta && (S || (kind === 'phone' && (!room || noRoom)))) onState(ctx()); }

  return {
    games,
    register(id, impl) { games[id] = impl; if (S && meta) draw(); },
    start(k, handler) {
      kind = k; onState = handler;
      document.body.classList.add(k === 'tv' ? 'tv' : 'phone');
      identity();
      keepAwake();
      setInterval(() => send({ t: 'ping' }), 20000);
      setInterval(() => {
        if (!S || !S.core.timerEnd) return;
        const r = remaining(), t = $('#timer'), b = $('#tbar');
        if (t) { t.textContent = '⏱ ' + fmt(r); t.classList.toggle('low', r <= 15); }
        if (b) { const total = ((S.game && S.game.turnMs) || 120000) / 1000; b.style.width = Math.min(100, r / total * 100) + '%'; }
      }, 250);
      connect();
    },
    ctx, send, esc, $, form, saveForm, setPrev, identity, sid, toast, beep, chord, turnover,
    get room() { return room; }, goRoom, createRoom: () => send({ t: 'create' }),
    redraw: draw,   // redesenhar sem esperar o servidor (ex.: mostrar/esconder a resposta)
  };
})();
