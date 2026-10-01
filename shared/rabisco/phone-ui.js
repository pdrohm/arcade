// Rabisco — tela do celular (e do computador de quem joga de casa).
// A tela é montada uma vez por fase (preparação, partida, fim) e depois só atualizada por dentro:
// assim o campo do chat não perde o foco nem o texto, e o quadro não some no meio do risco.
// Carregado por games/rabisco/phone.js depois de shared/rabisco/draw.js.
'use strict';
(() => {
  const A = window.ARCADE, esc = A.esc;
  const D = { pad: (a, b) => A.draw.pad(a, b), viewer: (a, b) => A.draw.viewer(a, b) };   // draw.js carrega antes, mas é lido só na hora de usar
  const CORES = ['#111111', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#8b5a2b', '#9ca3af'];
  const TOOLS = [['pen', '✏️', 'caneta'], ['eraser', '🧽', 'borracha'], ['line', '📏', 'reta'], ['rect', '▭', 'retângulo'], ['circle', '◯', 'círculo']];
  const SIZES = [4, 8, 16, 28];
  const PACES = [['cedo', 'Cedo'], ['normal', 'Normal'], ['tarde', 'Tarde']];
  const PLACES = [['auto', 'Automático'], ['presencial', 'Todos com a TV'], ['remoto', 'Cada um em casa']];

  let C = null;                         // último contexto recebido
  let pad = null, padTurn = null, padLoaded = false, viewer = null, stageSig = '', root = null;
  let lastFx = null, lastMatch = null, msgSig = '', prevHint = null, showHere = null, adjustOpen = false, qrOpen = false;
  let rankAtStart = {}, beepSec = null, timerT = null, layer = null;

  // ---------- estilo ----------
  const css = `
  .rb { display:flex; flex-direction:column; gap:10px; }
  .rb-col { display:flex; flex-direction:column; gap:8px; }
  .rb-main, .rb-aside { display:flex; flex-direction:column; gap:10px; min-width:0; }
  @media (min-width: 900px) {
    body.phone #app.rb-wide { max-width:1180px; }
    .rb.rb-game { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:16px; align-items:start; }
    .rb-game .rb-aside { position:sticky; top:12px; }
    .rb-game .rb-msgs { height:calc(100vh - 330px); min-height:220px; }
    .rb-game .rb-canvas, .rb-game .rb-reveal { max-width:calc(100vh - 320px); min-width:320px; margin-left:auto; margin-right:auto; }
  }
  .rb-top { display:flex; align-items:center; gap:10px; background:#182036; border:1px solid #2a3350; border-radius:18px; padding:10px 12px; }
  .rb-who { display:flex; align-items:center; gap:8px; min-width:0; flex:1; font-weight:800; font-size:17px; }
  .rb-who span.t { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rb-av { width:30px; height:30px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; border:2px solid #fff; }
  .rb-round { color:#9aa6c0; font-size:13px; font-weight:800; text-align:right; line-height:1.2; }
  .rb-time { min-width:64px; text-align:center; font-weight:900; font-size:24px; font-variant-numeric:tabular-nums; border-radius:12px; padding:4px 8px; background:#0b0e17; }
  .rb-time.low { color:#ef4444; animation:rbpulse .5s infinite alternate; }
  @keyframes rbpulse { to { transform:scale(1.08); } }
  .rb-bar { height:5px; border-radius:99px; background:#0b0e17; overflow:hidden; margin-top:-4px; }
  .rb-bar i { display:block; height:100%; background:#f59e0b; transition:width .3s linear; }
  .rb-word { background:#182036; border:1px solid #2a3350; border-radius:18px; padding:12px; text-align:center; }
  .rb-hint { display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-end; gap:6px 5px; }
  .rb-hint i { font-style:normal; width:24px; height:34px; border-bottom:4px solid #9aa6c0; font-size:26px; font-weight:900; line-height:30px; color:#fff; }
  .rb-hint i.on { border-color:#f59e0b; color:#fbbf24; }
  .rb-hint i.pop { animation:rbpop .6s ease; }
  .rb-hint i.sp { width:14px; border:0; }
  .rb-hint i.p { border:0; width:12px; }
  @keyframes rbpop { 0% { transform:scale(.3); } 60% { transform:scale(1.35); } 100% { transform:scale(1); } }
  .rb-meta { display:flex; justify-content:center; flex-wrap:wrap; gap:6px; margin-top:8px; font-size:13px; color:#9aa6c0; font-weight:700; }
  .rb-chip { display:inline-flex; align-items:center; gap:5px; background:#0b0e17; border:1px solid #2a3350; border-radius:99px; padding:3px 10px; font-size:13px; font-weight:800; color:#e5e7eb; }
  .rb-chip.mod { border-color:#a855f7; color:#e9d5ff; background:#2a1544; }
  .rb-the { font-size:32px; font-weight:900; letter-spacing:1px; text-transform:uppercase; line-height:1.1; word-break:break-word; }
  .rb-the.ok { color:#4ade80; }
  .rb-small { font-size:13px; color:#9aa6c0; font-weight:700; }
  .rb-canvas { position:relative; width:100%; aspect-ratio:1; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 0 0 6px #ece5d3, 0 10px 30px rgba(0,0,0,.45); touch-action:none; }
  .rb-canvas canvas { position:absolute; top:0; left:0; width:100%; height:100%; touch-action:none; display:block; }
  .rb-canvas.flip canvas { transform:rotate(180deg); }
  .rb-canvas.shake canvas { animation:rbshake .35s infinite; }
  .rb-canvas.flip.shake canvas { animation:rbshakeflip .35s infinite; }
  @keyframes rbshake { 0%,100% { transform:translate(0,0) rotate(0); } 25% { transform:translate(-3px,2px) rotate(-.6deg); } 75% { transform:translate(3px,-2px) rotate(.6deg); } }
  @keyframes rbshakeflip { 0%,100% { transform:rotate(180deg); } 25% { transform:translate(-3px,2px) rotate(179.4deg); } 75% { transform:translate(3px,-2px) rotate(180.6deg); } }
  .rb-lock { position:absolute; left:50%; bottom:12px; transform:translateX(-50%); background:rgba(11,14,23,.85); color:#fff; border-radius:99px; padding:6px 14px; font-weight:800; font-size:14px; }
  .rb-tools { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
  .rb-cor { width:30px; height:30px; border-radius:50%; border:3px solid transparent; box-shadow:0 0 0 1px rgba(0,0,0,.5) inset; flex:none; cursor:pointer; }
  .rb-cor.sel { border-color:#fff; box-shadow:0 0 0 3px #f59e0b; }
  .rb-tb { width:38px; height:38px; border-radius:12px; background:#2a3350; display:flex; align-items:center; justify-content:center; flex:none; font-size:20px; cursor:pointer; color:#fff; }
  .rb-tb.sel { background:#f59e0b; color:#111; }
  .rb-tb.off { opacity:.3; pointer-events:none; }
  .rb-tb i { display:block; border-radius:50%; background:#fff; }
  .rb-tb.sel i { background:#111; }
  .rb-tv { background:#182036; border:1px dashed #2a3350; border-radius:18px; padding:18px; text-align:center; }
  .rb-tv .big-emoji { font-size:52px; }
  .rb-opts { display:flex; flex-direction:column; gap:10px; }
  .rb-opt { border:0; border-radius:16px; padding:16px; background:#f6f1e7; color:#141a2b; font:inherit; text-align:left; display:flex; align-items:center; gap:12px; cursor:pointer; box-shadow:0 4px 0 #c9bfa6; }
  .rb-opt:active { transform:translateY(2px); box-shadow:0 2px 0 #c9bfa6; }
  .rb-opt b { font-size:24px; font-weight:900; text-transform:uppercase; flex:1; word-break:break-word; }
  .rb-opt small { font-size:13px; font-weight:800; color:#6b6252; white-space:nowrap; }
  .rb-opt .e { font-size:28px; }
  .rb-wait { text-align:center; padding:26px 16px; }
  .rb-bob { display:flex; justify-content:center; margin-bottom:8px; animation:rbbob 1.2s ease-in-out infinite; }
  .rb-pod .f { display:flex; justify-content:center; margin-bottom:2px; }
  .rb-aw .e { display:flex; align-items:center; gap:6px; }
  @keyframes rbbob { 50% { transform:translateY(-6px); } }
  .rb-reveal { background:#f6f1e7; color:#141a2b; border-radius:20px; padding:18px; text-align:center; animation:rbin .35s cubic-bezier(.2,.8,.2,1); }
  @keyframes rbin { from { transform:scale(.85) rotate(-2deg); opacity:0; } }
  .rb-reveal .k { font-size:13px; font-weight:900; letter-spacing:2px; text-transform:uppercase; color:#8a7f69; }
  .rb-reveal .w { font-size:36px; font-weight:900; text-transform:uppercase; margin:4px 0 10px; word-break:break-word; }
  .rb-gains { display:flex; flex-direction:column; gap:5px; text-align:left; }
  .rb-gain { display:flex; align-items:center; gap:8px; font-weight:800; font-size:16px; }
  .rb-gain .pts { color:#15803d; font-weight:900; min-width:56px; font-variant-numeric:tabular-nums; }
  .rb-mini { display:flex; flex-direction:column; gap:4px; margin-top:12px; padding-top:10px; border-top:2px dashed #d8cfba; text-align:left; }
  .rb-mini div { display:flex; align-items:center; gap:8px; font-weight:800; font-size:15px; }
  .rb-mini .sc { margin-left:auto; font-variant-numeric:tabular-nums; }
  .up { color:#15803d; } .down { color:#b91c1c; }
  .rb-rank { display:flex; flex-wrap:wrap; gap:6px; }
  .rb-rk { display:flex; align-items:center; gap:6px; background:#182036; border:2px solid #2a3350; border-radius:99px; padding:4px 10px 4px 5px; font-size:14px; font-weight:800; transition:border-color .3s, background .3s; }
  .rb-rk .dot { width:16px; height:16px; }
  .rb-rk .rb-pl { color:#9aa6c0; font-size:12px; min-width:18px; text-align:right; }
  .rb-rk .sc { font-variant-numeric:tabular-nums; color:#fbbf24; }
  .rb-rk.me { background:#1a2340; border-color:#f59e0b; }
  .rb-rk.ok { border-color:#16a34a; background:#0f2a1a; }
  .rb-rk.dr { border-style:dashed; }
  .rb-rk.off { opacity:.5; }
  .rb-rk.jump { animation:rbjump .6s ease; }
  @keyframes rbjump { 30% { transform:translateY(-8px) scale(1.06); } }
  .rb-chat { background:#182036; border:1px solid #2a3350; border-radius:18px; overflow:hidden; display:flex; flex-direction:column; }
  .rb-msgs { height:190px; overflow-y:auto; padding:10px 12px; display:flex; flex-direction:column; gap:5px; font-size:15px; line-height:1.3; overscroll-behavior:contain; }
  .rb-msgs.tall { height:300px; }
  .rb-m { word-break:break-word; }
  .rb-m b { font-weight:900; margin-right:6px; }
  .rb-m.guess { color:#9aa6c0; font-size:14px; }
  .rb-m.guess b { font-weight:800; }
  .rb-m.hit { align-self:flex-start; background:#14532d; color:#bbf7d0; border-radius:10px; padding:4px 10px; font-weight:800; }
  .rb-m.hit.me { background:#16a34a; color:#fff; }
  .rb-m.hit .pts { color:#fde68a; margin-left:4px; }
  .rb-m.close { align-self:flex-start; background:#0c3440; border:1px solid #22d3ee; color:#cffafe; border-radius:10px; padding:4px 10px; }
  .rb-m.close em { font-style:normal; font-weight:900; color:#67e8f9; margin-left:6px; }
  .rb-m.close small { display:block; font-size:11px; color:#67e8f9; opacity:.8; }
  .rb-m.knower { color:#e9d5ff; background:#2a1544; border-radius:10px; padding:3px 9px; align-self:flex-start; }
  .rb-m.sys { text-align:center; font-size:13px; font-weight:700; color:#9aa6c0; padding:1px 0; }
  .rb-m.sys .nm { padding:0 6px; font-size:12px; }
  .rb-m.sys.t-good { color:#4ade80; } .rb-m.sys.t-bad { color:#f87171; } .rb-m.sys.t-warn { color:#fbbf24; }
  .rb-m.sys.t-fun { color:#d8b4fe; } .rb-m.sys.t-hint { color:#fbbf24; } .rb-m.sys.t-close { color:#67e8f9; }
  .rb-form { display:flex; gap:8px; padding:8px; border-top:1px solid #2a3350; background:#121728; }
  .rb-form input { flex:1; padding:12px 14px; font-size:17px; border-radius:12px; min-width:0; }
  .rb-form button { border:0; border-radius:12px; background:#f59e0b; color:#111; font-weight:900; font-size:20px; width:52px; flex:none; cursor:pointer; }
  .rb-form.knows input { border-color:#a855f7; }
  .rb-hero { background:linear-gradient(135deg,#a855f7 0%,#7e22ce 55%,#1e1b4b 100%); border-radius:20px; padding:18px; position:relative; overflow:hidden; }
  .rb-hero h2 { font-size:30px; font-weight:900; }
  .rb-hero p { color:rgba(255,255,255,.9); margin-top:4px; line-height:1.35; font-size:16px; }
  .rb-hero .e { position:absolute; right:-8px; top:-10px; font-size:92px; opacity:.25; }
  .rb-share { display:flex; flex-direction:column; gap:8px; }
  .rb-link { display:flex; align-items:center; gap:8px; background:#0b0e17; border:1px solid #2a3350; border-radius:12px; padding:10px 12px; font-weight:800; font-size:15px; color:#fbbf24; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .rb-btns { display:flex; gap:8px; }
  .rb-btns .btn { padding:12px; font-size:15px; }
  .rb-qr { display:flex; justify-content:center; gap:12px; flex-wrap:wrap; }
  .rb-qr svg { width:180px; height:180px; background:#fff; border-radius:10px; }
  .rb-presets { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .rb-pre { border:2px solid #2a3350; background:#182036; border-radius:16px; padding:12px; cursor:pointer; color:#e5e7eb; }
  .rb-pre b { display:block; font-size:18px; font-weight:900; }
  .rb-pre small { display:block; font-size:12px; color:#9aa6c0; font-weight:700; margin-top:2px; }
  .rb-pre.sel { border-color:#f59e0b; background:#2b230c; }
  .rb-sum { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .rb-sum .rb-small { flex:1; }
  .rb-adj { display:flex; flex-direction:column; gap:12px; }
  .rb-row { display:flex; align-items:center; gap:10px; }
  .rb-row > span:first-child { flex:1; font-weight:800; }
  .rb-step { display:flex; align-items:center; gap:6px; }
  .rb-step b { min-width:58px; text-align:center; font-size:18px; font-variant-numeric:tabular-nums; }
  .rb-step .rb-tb { width:38px; height:38px; }
  .rb-seg { display:flex; gap:4px; background:#0b0e17; border-radius:12px; padding:3px; flex-wrap:wrap; }
  .rb-seg span { padding:7px 10px; border-radius:9px; font-size:13px; font-weight:800; color:#9aa6c0; cursor:pointer; }
  .rb-seg span.sel { background:#f59e0b; color:#111; }
  .rb-cats { display:flex; flex-wrap:wrap; gap:6px; }
  .rb-cat { border:2px solid #2a3350; border-radius:99px; padding:6px 11px; font-size:14px; font-weight:800; color:#9aa6c0; cursor:pointer; }
  .rb-cat.sel { border-color:#22c55e; color:#fff; background:#0f2a1a; }
  .rb-cw { display:flex; gap:8px; }
  .rb-cw input { flex:1; padding:12px; font-size:16px; min-width:0; }
  .rb-cw .btn { width:auto; padding:10px 14px; font-size:15px; }
  .rb-people { display:flex; flex-wrap:wrap; gap:6px; }
  .rb-end h2 { font-size:26px; }
  .rb-podium { display:flex; align-items:flex-end; justify-content:center; gap:8px; padding-top:8px; }
  .rb-pod { flex:1; max-width:150px; text-align:center; }
  .rb-pod .m { font-size:40px; line-height:1; }
  .rb-pod .n { font-weight:900; font-size:17px; margin-top:4px; word-break:break-word; }
  .rb-pod .s { color:#fbbf24; font-weight:900; font-variant-numeric:tabular-nums; }
  .rb-pod .bar { margin-top:8px; border-radius:12px 12px 0 0; background:#2a3350; }
  .rb-pod.p1 .bar { height:90px; background:linear-gradient(#f59e0b,#b45309); } .rb-pod.p2 .bar { height:62px; background:linear-gradient(#cbd5e1,#64748b); } .rb-pod.p3 .bar { height:44px; background:linear-gradient(#fb923c,#9a3412); }
  .rb-pod.p1 .m { animation:rbbob 1.4s ease-in-out infinite; }
  .rb-awards { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .rb-aw { background:#182036; border:1px solid #2a3350; border-radius:16px; padding:12px; }
  .rb-aw .e { font-size:28px; }
  .rb-aw b { display:block; font-size:12px; color:#9aa6c0; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; }
  .rb-aw .n { font-weight:900; font-size:17px; margin-top:2px; }
  .rb-aw small { display:block; color:#cbd5e1; font-size:13px; margin-top:2px; }
  #rb-fx { position:fixed; top:0; left:0; right:0; bottom:0; pointer-events:none; z-index:80; overflow:hidden; }
  .rb-float { position:absolute; font-weight:900; font-size:22px; color:#fde68a; text-shadow:0 2px 6px rgba(0,0,0,.7); transition:transform 1.1s cubic-bezier(.2,.8,.2,1), opacity 1.1s ease; white-space:nowrap; }
  .rb-float.big { font-size:44px; color:#4ade80; }
  .rb-bit { position:absolute; width:9px; height:13px; border-radius:2px; transition:transform .95s cubic-bezier(.15,.7,.3,1), opacity .95s ease; }
  .rb-pill { position:absolute; left:50%; top:22%; transform:translate(-50%,0) scale(.6); opacity:0; background:#182036; border:2px solid #f59e0b; color:#fff; font-weight:900; font-size:22px; border-radius:99px; padding:12px 22px; transition:transform .25s ease, opacity .25s ease; white-space:nowrap; box-shadow:0 10px 30px rgba(0,0,0,.5); }
  .rb-pill.on { transform:translate(-50%,0) scale(1); opacity:1; }
  .rb-pill.close { border-color:#22d3ee; }
  .rb-pill.hit { border-color:#16a34a; background:#14532d; }
  .rb-pill.ok { border-color:#16a34a; }
  `;
  let styled = false;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el); styled = true; };

  // ---------- ajudantes ----------
  const G = () => C.G;
  const me = () => (C.you ? C.you.pid : null);
  const player = pid => C.C.players.find(p => p.pid === pid) || null;
  const initial = n => (String(n || '').match(/[A-Za-z0-9À-ɏ]/) || ['?'])[0].toUpperCase();
  function who(pid, fb) {
    const p = player(pid) || (fb ? { name: fb.name || 'Alguém', color: fb.color } : { name: 'Alguém', color: null });
    const col = C.ci(p.color);
    return { name: p.name, hex: col.hex, fg: col.dark ? '#fff' : '#111', on: p.on !== false };
  }
  // Boneco da pessoa (shared/avatar.js, via ARCADE.avatarHtml); quem saiu da sala vira um boneco cinza.
  const av = (pid, size) => A.avatarHtml(player(pid) || { color: null, av: null }, size || 30);
  const isRemote = () => G().place === 'remoto';
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const $ = id => document.getElementById(id);
  function joinUrl() {
    const nets = (C.meta && C.meta.nets) || [];
    const w = nets.find(n => n.kind === 'web') || nets[0];
    return (w && w.url) || (location.origin + '/' + C.room);
  }

  // ---------- efeitos ----------
  function fxLayer() {
    if (layer && document.body.contains(layer)) return layer;
    layer = document.createElement('div'); layer.id = 'rb-fx';
    document.body.appendChild(layer);
    return layer;
  }
  const later = (fn, ms) => setTimeout(fn, ms);
  function floatAt(x, y, text, big) {
    const el = document.createElement('div');
    el.className = 'rb-float' + (big ? ' big' : '');
    el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.transform = 'translate(-50%,-50%) scale(.6)';
    fxLayer().appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = 'translate(-50%,-50%) translateY(-' + (big ? 120 : 60) + 'px) scale(1)'; el.style.opacity = '0'; }));
    later(() => el.remove(), 1200);
  }
  function confetti(x, y, n) {
    const cols = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#facc15'];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'rb-bit';
      b.style.background = cols[i % cols.length];
      b.style.left = x + 'px'; b.style.top = y + 'px';
      fxLayer().appendChild(b);
      const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 90;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40, rot = Math.round(Math.random() * 540 - 270);
      requestAnimationFrame(() => requestAnimationFrame(() => { b.style.transform = `translate(${dx}px,${dy + 60}px) rotate(${rot}deg)`; b.style.opacity = '0'; }));
      later(() => b.remove(), 1000);
    }
  }
  let pillT = null;
  function pill(text, kind, ms) {
    const L = fxLayer();
    let el = L.querySelector('.rb-pill');
    if (!el) { el = document.createElement('div'); L.appendChild(el); }
    el.className = 'rb-pill ' + (kind || '');
    el.textContent = text;
    requestAnimationFrame(() => el.classList.add('on'));
    clearTimeout(pillT);
    pillT = later(() => el.classList.remove('on'), ms || 1400);
  }
  const vib = p => { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (err) {} } };
  function rowRect(pid) {
    const el = root && root.querySelector(`.rb-rk[data-pid="${pid}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return null;
    return r;
  }
  function playFx(e) {
    const g = G(), mine = e.pid && e.pid === me(), remote = isRemote();
    if (e.k === 'hit') {
      if (mine) {
        C.chord([660, 880, 1320]); vib([40, 30, 90]);
        floatAt(window.innerWidth / 2, window.innerHeight * 0.38, '+' + e.pts, true);
        confetti(window.innerWidth / 2, window.innerHeight * 0.38, 26);
        pill(e.first ? '🎯 Primeiro a acertar!' : '✓ Você acertou!', 'hit', 1500);
      } else if (remote) C.beep(e.first ? 990 : 880, .08, 'sine', e.first ? .14 : .08);
      const r = rowRect(e.pid);
      if (r && !mine) { floatAt(r.left + r.width / 2, r.top, '+' + e.pts); confetti(r.left + r.width / 2, r.top + r.height / 2, e.first ? 14 : 8); }
      const rd = rowRect(e.dpid);
      if (rd && e.dpts) later(() => floatAt(rd.left + rd.width / 2, rd.top, '+' + e.dpts), 250);
      if (e.dpid === me() && e.dpts) { C.beep(740, .07, 'triangle', .1); }
    } else if (e.k === 'close') {
      C.beep(740, .07, 'sine', .14); later(() => C.beep(820, .07, 'sine', .14), 110); vib(30);
      pill('Tá muito perto 👀', 'close', 1300);
    } else if (e.k === 'miss') {
      C.beep(210, .07, 'square', .04);
    } else if (e.k === 'lead') {
      const r = rowRect(e.pid);
      if (r) { const el = root.querySelector(`.rb-rk[data-pid="${e.pid}"]`); if (el) { el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump'); } floatAt(r.left + r.width / 2, r.top - 4, '👑'); }
      if (mine) { C.chord([784, 988, 1175]); pill('👑 Você está na frente!', 'ok', 1500); }
      else if (remote) C.chord([523, 659, 784]);
    } else if (e.k === 'turn') {
      if (mine) { C.chord([523, 659, 784]); vib([90, 60, 90]); pill('✏️ Sua vez de desenhar!', 'ok', 1600); }
    } else if (e.k === 'reveal') {
      if (remote || g.amDrawer) { if (e.hits) C.chord([523, 659, 784]); else { C.beep(392, .18, 'triangle', .14); later(() => C.beep(330, .28, 'triangle', .14), 180); } }
    } else if (e.k === 'hint') {
      if (remote && !g.knower) C.beep(1200, .05, 'sine', .07);
    } else if (e.k === 'end') {
      C.chord([523, 659, 784, 1047]);
      later(() => confetti(window.innerWidth / 2, window.innerHeight * 0.3, 40), 300);
    }
  }
  function runFx() {
    const g = G();
    if (lastMatch === null) { lastMatch = g.matchId; lastFx = g.lastFx; return; }   // recarregou: não repete efeito velho
    if (g.matchId !== lastMatch) { lastMatch = g.matchId; lastFx = 0; }
    for (const e of g.fx || []) if (e.id > lastFx) { lastFx = e.id; try { playFx(e); } catch (err) {} }
  }

  // ---------- cronômetro (próprio: o do núcleo reescreve #timer) ----------
  function tickTimer() {
    if (!C || !C.G || C.C.gameId !== 'rabisco') return;
    const el = $('rb-time'), bar = $('rb-bari');
    const r = C.remaining();
    if (el) {
      if (r === null) { el.textContent = '—'; el.classList.remove('low'); }
      else { el.textContent = Math.ceil(r) + 's'; el.classList.toggle('low', r <= 10 && C.G.phase === 'draw'); }
    }
    if (bar) bar.style.width = (r === null || !C.G.turnMs ? 0 : Math.max(0, Math.min(100, r / (C.G.turnMs / 1000) * 100))) + '%';
    // últimos 5 segundos do desenho: um tique por segundo (de casa, ou para quem desenha)
    if (r !== null && C.G.phase === 'draw' && r <= 5 && r > 0 && (isRemote() || C.G.amDrawer)) {
      const sec = Math.ceil(r);
      if (sec !== beepSec) { beepSec = sec; C.beep(880, .05, 'square', .06); }
    }
  }

  // ---------- chat ----------
  function chatBox(tall) {
    return `<div class="rb-chat"><div class="rb-msgs ${tall ? 'tall' : ''}" id="rb-msgs"></div>
      <form class="rb-form" id="rb-form" autocomplete="off"><input id="rb-in" maxlength="120" enterkeyhint="send" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Mande uma mensagem…"><button type="submit" aria-label="Enviar">➤</button></form></div>`;
  }
  function msgHtml(m) {
    const mine = m.pid && m.pid === me();
    if (m.k === 'sys') return `<div class="rb-m sys t-${m.tone || 'info'}">${C.hl(m.text)}</div>`;
    const w = who(m.pid, m);
    const nameB = `<b style="color:${w.hex}">${esc(mine ? 'Você' : w.name)}</b>`;
    if (m.k === 'hit') return `<div class="rb-m hit ${mine ? 'me' : ''}">✓ ${esc(mine ? 'Você acertou!' : w.name + ' acertou!')}${m.pts ? `<span class="pts">+${m.pts}</span>` : ''}</div>`;
    if (m.k === 'close') return `<div class="rb-m close">${esc(m.text)}<em>Tá muito perto 👀</em><small>só você vê esta mensagem</small></div>`;
    if (m.k === 'knower') return `<div class="rb-m knower">🔒 ${nameB}${esc(m.text)}</div>`;
    if (m.k === 'guess') return `<div class="rb-m guess">${nameB}${esc(m.text)}</div>`;
    return `<div class="rb-m chat">${nameB}${esc(m.text)}</div>`;
  }
  function patchChat() {
    const box = $('rb-msgs');
    if (!box) return;
    const g = G(), list = g.chat || [];
    const sig = list.length + ':' + (list.length ? list[list.length - 1].id : 0) + ':' + g.knower + ':' + C.C.players.length;
    if (sig !== msgSig || !box.childNodes.length) {
      msgSig = sig;
      const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      box.innerHTML = list.length ? list.map(msgHtml).join('') : '<div class="rb-m sys">Ninguém falou nada ainda. Diga oi! 👋</div>';
      if (atEnd || box.dataset.first !== '1') { box.scrollTop = box.scrollHeight; box.dataset.first = '1'; }
    }
    const inp = $('rb-in'), form = $('rb-form');
    if (inp && form) {
      const guessing = g.phase === 'draw' && !g.knower;
      const ph = g.phase === 'draw' && g.knower ? (g.amDrawer ? 'Só quem já acertou vê o que você escreve…' : 'Converse com quem já acertou…') : guessing ? 'Digite seu palpite…' : 'Mande uma mensagem…';
      if (inp.placeholder !== ph) inp.placeholder = ph;
      form.classList.toggle('knows', g.phase === 'draw' && !!g.knower);
      if (!form.dataset.bound) {
        form.dataset.bound = '1';
        form.addEventListener('submit', ev => {
          ev.preventDefault();
          const t = inp.value.trim();
          if (!t) return;
          A.send({ t: 'say', text: t });
          inp.value = '';
          inp.focus();
        });
      }
    }
  }

  // ---------- ranking ----------
  function rankHtml() {
    const g = G();
    return g.rank.map(r => {
      const w = who(r.pid);
      const cls = ['rb-rk', r.pid === me() ? 'me' : '', g.guessed.indexOf(r.pid) >= 0 ? 'ok' : '', r.pid === g.drawer && (g.phase === 'draw' || g.phase === 'choose') ? 'dr' : '', w.on ? '' : 'off'].join(' ');
      const badge = (r.pid === g.drawer && (g.phase === 'draw' || g.phase === 'choose') ? ' ✏️' : '') + (g.guessed.indexOf(r.pid) >= 0 ? ' ✓' : '') + (r.pid === g.leader && r.score > 0 ? ' 👑' : '') + (w.on ? '' : ' 📵');
      return `<div class="${cls}" data-pid="${esc(r.pid)}"><span class="rb-pl">${r.place}º</span>${av(r.pid, 22)}<span>${esc(w.name)}${badge}</span><span class="sc">${r.score}</span></div>`;
    }).join('');
  }

  // ---------- topo e palavra ----------
  function topHtml() {
    const g = G();
    const d = g.drawer ? who(g.drawer) : null;
    let t = '';
    if (g.phase === 'choose') t = g.amDrawer ? 'Sua vez! Escolha a palavra' : `${esc(d ? d.name : '')} está escolhendo…`;
    else if (g.phase === 'draw') t = g.amDrawer ? 'Desenhe!' : `${esc(d ? d.name : '')} está desenhando`;
    else t = 'Fim da vez';
    const myR = g.rank.find(r => r.pid === me());
    return `<div class="rb-who">${g.drawer && g.phase !== 'reveal' ? av(g.drawer) : '<span class="rb-av" style="background:#f59e0b;color:#111">✓</span>'}<span class="t">${t}</span></div>
      <div class="rb-round">Rodada ${g.round}/${g.rounds}${myR ? `<br>você: ${myR.place}º` : ''}</div>
      <div class="rb-time" id="rb-time">—</div>`;
  }
  function hintHtml(hint) {
    const was = prevHint || [];
    return `<div class="rb-hint">${hint.map((ch, i) => {
      if (ch === ' ') return '<i class="sp"></i>';
      if (ch === '_') return '<i></i>';
      if (!/[A-Z0-9À-Ý]/.test(ch)) return `<i class="p">${esc(ch)}</i>`;
      return `<i class="on ${was[i] === '_' ? 'pop' : ''}">${esc(ch)}</i>`;
    }).join('')}</div>`;
  }
  function modChip(g) { return g.mod ? `<span class="rb-chip mod">🌀 ${esc(g.mod.emoji + ' ' + g.mod.name)}</span>` : ''; }
  function wordHtml() {
    const g = G();
    if (g.phase === 'choose') return `<div class="rb-small">${g.amDrawer ? 'Só você vê as opções.' : 'A palavra aparece aqui como dica: _ _ _ _'}</div>${g.mod ? `<div class="rb-meta">${modChip(g)}<span>${esc(g.mod.desc)}</span></div>` : ''}`;
    const cat = g.cat ? `<span class="rb-chip">${esc(g.cat.emoji + ' ' + g.cat.name)}</span>` : '';
    if (g.phase === 'reveal') return `<div class="rb-small">A palavra era</div><div class="rb-the">${esc(g.word || '')}</div><div class="rb-meta">${cat}</div>`;
    if (g.amDrawer) return `<div class="rb-small">Desenhe:</div><div class="rb-the">${esc(g.word || '')}</div><div class="rb-meta">${cat}${modChip(g)}</div>`;
    if (g.knower) return `<div class="rb-small">✓ Você acertou. Não conte para ninguém 🤫</div><div class="rb-the ok">${esc(g.word || '')}</div><div class="rb-meta">${cat}</div>`;
    const lens = g.lens || [];
    const dicas = g.hintsTotal ? `💡 ${g.revealed}/${g.hintsTotal} dicas` : 'sem dicas';
    return `${hintHtml(g.hint || [])}<div class="rb-meta">${cat}<span class="rb-chip">${lens.length > 1 ? lens.join(' + ') + ' letras' : plural(lens[0] || 0, 'letra', 'letras')}</span><span class="rb-chip">${dicas}</span>${modChip(g)}</div>`;
  }

  // ---------- palco (escolher, desenhar, assistir, revelar) ----------
  function canvasHere() {
    const g = G();
    if (showHere !== null) return showHere;
    return g.place !== 'presencial';
  }
  function stageKey() {
    const g = G();
    if (g.phase === 'choose') return `choose:${g.turnNo}:${g.amDrawer}`;
    if (g.phase === 'draw') return `draw:${g.turnNo}:${g.amDrawer ? 'pad' : canvasHere() ? 'view' : 'tv'}`;
    return `reveal:${g.turnNo}:${canvasHere()}`;
  }
  function toolsHtml() {
    const g = G(), rules = g.mod ? g.mod.key : null;
    const cores = rules === 'cores' && g.mod.colors ? g.mod.colors : CORES;
    const tools = rules === 'umtraco' || rules === 'semborracha' ? TOOLS.filter(t => t[0] !== 'eraser' && (rules !== 'umtraco' || t[0] === 'pen')) : TOOLS;
    const p = pad;
    if (!p) return '';
    let h = `<div class="rb-tools">${cores.map(c => `<div class="rb-cor ${p.tool !== 'eraser' && p.color === c ? 'sel' : ''}" style="background:${c}" data-rb="color" data-c="${c}"></div>`).join('')}</div>`;
    h += `<div class="rb-tools">${tools.map(t => `<div class="rb-tb ${p.tool === t[0] ? 'sel' : ''}" data-rb="tool" data-k="${t[0]}" title="${t[2]}">${t[1]}</div>`).join('')}<span style="flex:1"></span>`;
    if (p.canErase()) h += `<div class="rb-tb ${p.canUndo() ? '' : 'off'}" data-rb="undo" title="desfazer">↶</div><div class="rb-tb ${p.canRedo() ? '' : 'off'}" data-rb="redo" title="refazer">↷</div><div class="rb-tb" data-rb="clear" title="limpar tudo">🗑</div>`;
    h += '</div>';
    if (rules !== 'gigante') h += `<div class="rb-tools"><span class="rb-small">Traço</span>${SIZES.map(t => `<div class="rb-tb ${p.size === t ? 'sel' : ''}" data-rb="size" data-t="${t}"><i style="width:${Math.min(28, t + 4)}px;height:${Math.min(28, t + 4)}px"></i></div>`).join('')}</div>`;
    return h;
  }
  function refreshTools() { const t = $('rb-tools'); if (t) t.innerHTML = toolsHtml(); const l = $('rb-lock'); if (l) l.style.display = pad && pad.locked ? '' : 'none'; }
  function dropPad() { if (pad) { pad.destroy(); pad = null; } padTurn = null; padLoaded = false; }
  function buildStage(key) {
    const g = G(), st = $('rb-stage');
    if (!st) return;
    const oldViewer = viewer;
    dropPad(); viewer = null;
    if (g.phase === 'choose') {
      if (g.amDrawer && g.options) {
        st.innerHTML = `<div class="rb-opts">${g.options.map((o, i) => `<button class="rb-opt" data-rb="pick" data-i="${i}"><span class="e">${o.cat ? esc(o.cat.emoji) : '🎲'}</span><b>${esc(o.w)}</b><small>${o.cat ? esc(o.cat.name) : ''}</small></button>`).join('')}</div>
          <p class="rb-small" style="text-align:center;margin-top:8px">Se não escolher a tempo, o jogo escolhe por você.</p>`;
      } else {
        const d = who(g.drawer);
        st.innerHTML = `<div class="box rb-wait"><div class="rb-bob">${av(g.drawer, 72)}</div><p class="sub"><b style="color:${d.hex}">${esc(d.name)}</b> está escolhendo a palavra…</p><p class="rb-small" style="margin-top:6px">Prepare os dedos para digitar ⌨️</p></div>`;
      }
      return;
    }
    if (g.phase === 'draw' && g.amDrawer) {
      st.innerHTML = `<div class="rb-canvas" id="rb-cvwrap"><canvas id="rb-cv"></canvas><div class="rb-lock" id="rb-lock" style="display:none">✋ Seu traço acabou</div></div>
        <div id="rb-tools" class="rb-col" style="margin-top:8px"></div>
        <button class="btn ghost" data-rb="skip" style="margin-top:8px;padding:12px;font-size:15px">⏭️ Pular minha vez</button>`;
      pad = D.pad($('rb-cv'), { send: ops => A.send({ t: 'input', k: 'draw', ops }), onChange: refreshTools });
      padTurn = g.turnNo;
      pad.setRules(g.mod ? g.mod.key : null, g.mod && g.mod.colors);
      if (g.board && g.board.seq > 0) A.send({ t: 'rb-sync' });   // recarregou no meio da vez: pede o que já foi desenhado
      else padLoaded = true;
      refreshTools();
      return;
    }
    if (g.phase === 'draw' && !canvasHere()) {
      st.innerHTML = `<div class="rb-tv"><div class="big-emoji">📺</div><p class="sub" style="margin-top:6px">Olhe o desenho na TV e digite o palpite aqui embaixo.</p><button class="btn ghost" data-rb="here" style="margin-top:10px;padding:12px;font-size:15px">Ver o desenho aqui também</button></div>`;
      return;
    }
    // assistindo (desenho) ou revelação com o desenho por trás
    const mods = g.mod && g.phase === 'draw' ? (g.mod.key === 'espelho' ? ' flip' : '') + (g.mod.key === 'tremor' ? ' shake' : '') : '';
    let h = canvasHere() ? `<div class="rb-canvas${mods}"><canvas id="rb-view"></canvas></div>` : '';
    if (g.phase === 'reveal') h = revealHtml() + (h ? `<div style="margin-top:10px">${h}</div>` : '');
    if (g.phase === 'draw' && g.place === 'presencial') h += `<button class="btn ghost" data-rb="nothere" style="margin-top:8px;padding:10px;font-size:14px">Esconder o desenho (olhar só a TV)</button>`;
    st.innerHTML = h;
    const cv = $('rb-view');
    if (cv) {
      viewer = D.viewer(cv, 640);
      if (oldViewer && oldViewer.turn === g.turnNo) viewer.adopt(oldViewer);
      viewer.sync(g.board, () => A.send({ t: 'rb-sync' }));
    }
  }
  function revealHtml() {
    const g = G();
    const gains = Object.keys(g.turnPts).map(pid => ({ pid, pts: g.turnPts[pid] })).sort((a, b) => b.pts - a.pts);
    const before = rankAtStart[g.turnNo] || [];
    const mini = g.rank.slice(0, 5).map((r, i) => {
      const was = before.indexOf(r.pid);
      const mv = was < 0 || was === i ? '' : was > i ? `<span class="up">▲${was - i}</span>` : `<span class="down">▼${i - was}</span>`;
      const w = who(r.pid);
      return `<div><span style="min-width:26px">${r.place}º</span>${av(r.pid, 22)}${esc(w.name)} ${mv}<span class="sc">${r.score}</span></div>`;
    }).join('');
    const none = !g.guessed.length;
    return `<div class="rb-reveal"><div class="k">A palavra era</div><div class="w">${esc(g.word || '')}</div>
      ${none ? '<div style="font-weight:900;font-size:18px">Ninguém acertou 😭</div>' : `<div class="rb-gains">${gains.map(x => { const w = who(x.pid); return `<div class="rb-gain"><span class="pts">+${x.pts}</span>${av(x.pid, 22)}${esc(w.name)}${x.pid === g.drawer ? ' ✏️' : ''}</div>`; }).join('')}</div>`}
      <div class="rb-mini">${mini}</div></div>`;
  }

  // ---------- telas ----------
  function setupHtml() {
    const g = G();
    return `<div class="rb-hero"><span class="e">✏️</span><h2>Rabisco</h2><p>Desenhe no celular. Adivinhe digitando no chat. Quem acerta primeiro ganha mais pontos.</p></div>
      <div class="box rb-share">
        <div class="rb-small">Chame a turma: quem abrir o link escolhe um nome e já entra.</div>
        <div class="rb-link">🔗 ${esc(joinUrl().replace(/^https?:\/\//, ''))}</div>
        <div class="rb-btns"><button class="btn blue" data-rb="copy">Copiar link</button>${navigator.share ? '<button class="btn ghost" data-rb="share">Compartilhar</button>' : ''}<button class="btn ghost" data-rb="qr">QR</button></div>
        <div id="rb-qr"></div>
      </div>
      <div class="rb-presets" id="rb-presets"></div>
      <div class="box rb-sum" id="rb-sum"></div>
      <div class="box rb-adj" id="rb-adj" style="display:none"></div>
      <div class="box rb-col">
        <div style="font-weight:900">✍️ Palavras da turma</div>
        <div class="rb-small">Nomes, piadas internas, lugares de vocês. Separe por vírgula. Ninguém vê a lista.</div>
        <div class="rb-cw"><input id="rb-cw" maxlength="300" placeholder="Ex.: tio Zé, churrasco, Bidu" autocomplete="off"><button class="btn ok" data-rb="addw">Adicionar</button></div>
        <div id="rb-cwinfo"></div>
      </div>
      <div class="box" id="rb-people"></div>
      <button class="btn big ok" data-rb="begin" id="rb-begin">▶ Começar</button>
      <p class="sub center" id="rb-event"></p>
      ${chatBox(false)}`;
  }
  function patchSetup() {
    const g = G(), cfg = g.cfg;
    const pre = $('rb-presets');
    if (pre) pre.innerHTML = Object.keys(g.presets).map(k => { const p = g.presets[k]; return `<div class="rb-pre ${cfg.preset === k ? 'sel' : ''}" data-rb="preset" data-k="${k}"><b>${p.emoji} ${esc(p.name)}</b><small>${p.rounds} rodadas · ${p.drawSec}s${p.chaos ? ' · com surpresas' : ''}</small></div>`; }).join('');
    const catN = cfg.cats.length;
    const sum = $('rb-sum');
    if (sum) sum.innerHTML = `<span class="rb-small">${cfg.preset === 'custom' ? '🛠️ Personalizado · ' : ''}${plural(cfg.rounds, 'rodada', 'rodadas')} · ${cfg.drawSec}s · ${cfg.hints ? plural(cfg.hints, 'dica', 'dicas') + ' (' + cfg.pace + ')' : 'sem dicas'} · ${catN === g.cats.length ? 'todas as categorias' : plural(catN, 'categoria', 'categorias')}${cfg.chaos ? ' · 🌀 caos' : ''}<br>${g.hasTv ? '📺 TV conectada: o desenho aparece grande na TV' : '🏠 Sem TV: cada um vê o desenho no próprio celular'}</span><button class="btn ghost" data-rb="adjust" style="width:auto;padding:10px 14px;font-size:15px">${adjustOpen ? 'Fechar' : '⚙️ Ajustar'}</button>`;
    const adj = $('rb-adj');
    if (adj) {
      adj.style.display = adjustOpen ? '' : 'none';
      if (adjustOpen) {
        const step = (k, v, unit, d) => `<div class="rb-step"><div class="rb-tb" data-rb="cfg" data-k="${k}" data-v="${v - d}">−</div><b>${v}${unit}</b><div class="rb-tb" data-rb="cfg" data-k="${k}" data-v="${v + d}">+</div></div>`;
        adj.innerHTML = `<div class="rb-row"><span>Rodadas</span>${step('rounds', cfg.rounds, '', 1)}</div>
          <div class="rb-row"><span>Tempo para desenhar</span>${step('drawSec', cfg.drawSec, 's', 10)}</div>
          <div class="rb-row"><span>Dicas (letras)</span>${step('hints', cfg.hints, '', 1)}</div>
          <div class="rb-row"><span>Dicas aparecem</span><div class="rb-seg">${PACES.map(p => `<span class="${cfg.pace === p[0] ? 'sel' : ''}" data-rb="cfg" data-k="pace" data-v="${p[0]}">${p[1]}</span>`).join('')}</div></div>
          <div class="rb-row"><span>Modo Caos 🌀<br><small class="rb-small">pincel gigante, quadro de cabeça para baixo…</small></span><div class="rb-seg"><span class="${cfg.chaos ? '' : 'sel'}" data-rb="cfg" data-k="chaos" data-v="0">Não</span><span class="${cfg.chaos ? 'sel' : ''}" data-rb="cfg" data-k="chaos" data-v="1">Sim</span></div></div>
          <div><div style="font-weight:800;margin-bottom:6px">Onde vocês estão?</div><div class="rb-seg">${PLACES.map(p => `<span class="${cfg.place === p[0] ? 'sel' : ''}" data-rb="cfg" data-k="place" data-v="${p[0]}">${p[1]}</span>`).join('')}</div>
            <div class="rb-small" style="margin-top:4px">Com a TV, o celular de quem adivinha só mostra o chat (o desenho fica grande na TV).</div></div>
          <div><div style="font-weight:800;margin-bottom:6px">Categorias</div><div class="rb-cats">${g.cats.map(k => `<span class="rb-cat ${cfg.cats.indexOf(k.key) >= 0 ? 'sel' : ''}" data-rb="cat" data-k="${k.key}">${esc(k.emoji + ' ' + k.name)}</span>`).join('')}<span class="rb-cat" data-rb="allcats">Todas</span></div></div>`;
      }
    }
    const info = $('rb-cwinfo');
    if (info) info.innerHTML = cfg.customN ? `<div class="rb-row"><span class="rb-small" style="font-weight:800;color:#4ade80">✓ ${plural(cfg.customN, 'palavra da turma', 'palavras da turma')}</span><div class="rb-seg"><span class="${cfg.onlyCustom ? '' : 'sel'}" data-rb="cfg" data-k="onlyCustom" data-v="0">Misturar</span><span class="${cfg.onlyCustom ? 'sel' : ''}" data-rb="cfg" data-k="onlyCustom" data-v="1">Só elas</span></div><div class="rb-tb" data-rb="clearw" title="apagar">🗑</div></div>` : '';
    const ppl = $('rb-people');
    const ps = C.C.players, on = ps.filter(p => p.on !== false).length;
    if (ppl) ppl.innerHTML = `<div class="rb-small" style="margin-bottom:8px">${plural(ps.length, 'jogador', 'jogadores')} na sala${on < 2 ? ' · precisa de 2 ou mais' : ''}</div><div class="rb-people">${ps.map(p => { const w = who(p.pid); return `<span class="rb-chip">${av(p.pid, 22)}${esc(p.name)}${p.on === false ? ' 📵' : ''}</span>`; }).join('')}</div>`;
    const b = $('rb-begin'); if (b) b.disabled = on < 2;
    const ev = $('rb-event'); if (ev) ev.innerHTML = C.C.event ? C.hl(C.C.event.text) : '';
    const qr = $('rb-qr');
    if (qr) {
      const want = qrOpen ? 'on' : 'off';
      if (qr.dataset.s !== want) {
        qr.dataset.s = want;
        const nets = ((C.meta && C.meta.nets) || []).filter(x => x.qr);
        qr.innerHTML = qrOpen ? `<div class="rb-qr">${nets.map(x => `<div style="text-align:center">${x.qr}${nets.length > 1 ? `<div class="rb-small">${esc(x.label)}</div>` : ''}</div>`).join('')}</div><p class="rb-small" style="text-align:center;margin-top:6px">Aponte a câmera de outro celular. Código da sala: <b style="color:#fbbf24">${esc(C.room)}</b></p>` : '';
      }
    }
  }
  function gameHtml() {
    return `<div class="rb rb-game" id="rb-root">
      <div class="rb-main">
        <div><div class="rb-top" id="rb-top"></div><div class="rb-bar"><i id="rb-bari"></i></div></div>
        <div class="rb-word" id="rb-word"></div>
        <div id="rb-stage"></div>
      </div>
      <div class="rb-aside">
        ${chatBox(false)}
        <div class="rb-rank" id="rb-rank"></div>
      </div>
    </div>`;
  }
  function patchGame() {
    const g = G();
    if (g.phase === 'choose' && !rankAtStart[g.turnNo]) rankAtStart[g.turnNo] = g.rank.map(r => r.pid);
    const top = $('rb-top'); if (top) top.innerHTML = topHtml();
    const word = $('rb-word'); if (word) { word.style.display = g.phase === 'reveal' ? 'none' : ''; word.innerHTML = wordHtml(); }
    prevHint = g.hint ? g.hint.slice() : null;
    const k = stageKey();
    if (k !== stageSig || !$('rb-stage').childNodes.length) { stageSig = k; buildStage(k); }
    if (pad && !padLoaded && g.board && g.board.from === 0 && g.board.ops.length) { pad.load(g.board.ops); padLoaded = true; }
    if (viewer) viewer.sync(g.board, () => A.send({ t: 'rb-sync' }));
    const msgs = $('rb-msgs'); if (msgs) msgs.classList.toggle('tall', !$('rb-cvwrap') && !$('rb-view'));
    const rank = $('rb-rank'); if (rank) rank.innerHTML = rankHtml();
    tickTimer();
  }
  function endHtml() {
    return `<div class="rb rb-end" id="rb-root">
      <div class="box center"><div class="big-emoji">🏆</div><h2 id="rb-champ" style="margin-top:6px"></h2><div class="rb-podium" id="rb-podium"></div></div>
      <div class="rb-awards" id="rb-awards"></div>
      <div class="box" id="rb-final"></div>
      <button class="btn big ok" data-rb="again">🔄 Jogar de novo</button>
      <button class="btn blue" data-rb="setup">⚙️ Trocar configurações</button>
      <button class="btn ghost" data-rb="quit">🕹️ Voltar para o Arcade</button>
      ${chatBox(false)}
    </div>`;
  }
  function patchEnd() {
    const g = G(), r = g.rank;
    const champ = $('rb-champ');
    if (champ) champ.innerHTML = r.length ? `<span style="color:${who(r[0].pid).hex}">${esc(who(r[0].pid).name)}</span> venceu!` : 'Fim de jogo';
    const pod = $('rb-podium');
    if (pod) {
      const medal = ['🥇', '🥈', '🥉'];
      const order = [1, 0, 2].filter(i => r[i]);
      pod.innerHTML = order.map(i => { const w = who(r[i].pid); return `<div class="rb-pod p${i + 1}"><div class="f">${av(r[i].pid, i ? 52 : 64)}</div><div class="m">${medal[i]}</div><div class="n" style="color:${w.hex}">${esc(w.name)}</div><div class="s">${r[i].score}</div><div class="bar"></div></div>`; }).join('');
    }
    const aw = $('rb-awards');
    if (aw) aw.innerHTML = (g.awards || []).map(a => { const w = who(a.pid); return `<div class="rb-aw"><div class="e">${a.emoji} ${av(a.pid, 30)}</div><b>${esc(a.title)}</b><div class="n" style="color:${w.hex}">${esc(w.name)}</div><small>${esc(a.detail)}</small></div>`; }).join('');
    const fin = $('rb-final');
    if (fin) fin.innerHTML = `<div class="players">${r.map(x => { const w = who(x.pid); return `<div class="pl ${x.pid === me() ? 'me' : ''}">${av(x.pid, 30)}<b>${x.place}º ${esc(w.name)}</b><span>${x.score} pts</span></div>`; }).join('')}</div>`;
  }

  // ---------- cliques (delegados: os pedaços atualizados por dentro não passam pelo index.html) ----------
  function bindRoot() {
    const app = document.getElementById('app');
    if (!app || app.dataset.rbBound) return;
    app.dataset.rbBound = '1';
    app.addEventListener('click', ev => {
      const el = ev.target && ev.target.closest ? ev.target.closest('[data-rb]') : null;
      if (!el || !C || !C.G || C.C.gameId !== 'rabisco') return;
      ev.preventDefault();
      act(el.dataset.rb, el);
    });
  }
  function act(a, el) {
    const send = A.send;
    switch (a) {
      case 'preset': return send({ t: 'rb-cfg', cfg: { preset: el.dataset.k } });
      case 'cfg': {
        const k = el.dataset.k, raw = el.dataset.v;
        const v = ['pace', 'place'].indexOf(k) >= 0 ? raw : ['chaos', 'onlyCustom'].indexOf(k) >= 0 ? raw === '1' : Number(raw);
        const cfg = {}; cfg[k] = v;
        return send({ t: 'rb-cfg', cfg });
      }
      case 'cat': return send({ t: 'rb-cfg', cfg: { cat: el.dataset.k } });
      case 'allcats': return send({ t: 'rb-cfg', cfg: { allCats: true } });
      case 'adjust': adjustOpen = !adjustOpen; return patchSetup();
      case 'addw': { const i = $('rb-cw'); if (i && i.value.trim()) { send({ t: 'rb-words', text: i.value }); i.value = ''; } return; }
      case 'clearw': if (confirm('Apagar as palavras da turma?')) send({ t: 'rb-clear-words' }); return;
      case 'copy': return copyLink();
      case 'share': try { navigator.share({ title: 'Bora jogar Rabisco?', text: 'Entra na minha sala do Arcade:', url: joinUrl() }).then(() => {}, () => {}); } catch (err) {} return;
      case 'qr': qrOpen = !qrOpen; return patchSetup();
      case 'begin': return send({ t: 'begin' });
      case 'pick': return send({ t: 'pick', i: Number(el.dataset.i) });
      case 'skip': if (confirm('Pular sua vez de desenhar?')) send({ t: 'rb-skip' }); return;
      case 'here': showHere = true; return patchGame();
      case 'nothere': showHere = false; return patchGame();
      case 'color': if (pad) pad.set({ color: el.dataset.c }); return;
      case 'tool': if (pad) pad.set({ tool: el.dataset.k }); return;
      case 'size': if (pad) pad.set({ size: Number(el.dataset.t) }); return;
      case 'undo': if (pad) pad.undo(); return;
      case 'redo': if (pad) pad.redo(); return;
      case 'clear': if (pad && confirm('Apagar tudo?')) pad.clear(); return;
      case 'again': return send({ t: 'again' });
      case 'setup': return send({ t: 'rb-setup' });
      case 'quit': return send({ t: 'quit' });
    }
  }
  function copyLink() {
    const url = joinUrl();
    const ok = () => pill('🔗 Link copiado!', 'ok', 1400);
    const fallback = () => {
      const t = document.createElement('textarea'); t.value = url; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (err) { A.toast(url); }
      t.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, fallback);
    else fallback();
  }

  // ---------- o que o phone.js chama ----------
  function screen(g) { return g.phase === 'setup' ? 'setup' : g.phase === 'end' ? 'end' : 'game'; }
  A.rabiscoPhone = {
    key(c) { return screen(c.G) + ':' + c.G.matchId; },
    html(c) {
      C = c; ensureStyle();
      stageSig = ''; msgSig = ''; dropPad(); viewer = null;
      const s = screen(c.G);
      return s === 'setup' ? setupHtml() : s === 'end' ? endHtml() : gameHtml();
    },
    after(c) {
      C = c; ensureStyle(); bindRoot();
      root = document.getElementById('app');
      if (!timerT) timerT = setInterval(tickTimer, 250);
      const s = screen(c.G);
      if (root) root.classList.toggle('rb-wide', s === 'game');
      if (s === 'setup') patchSetup();
      else if (s === 'end') patchEnd();
      else patchGame();
      patchChat();
      runFx();
      if (s !== 'game') dropPad();
      // campo de palavras da turma: Enter adiciona
      const cw = $('rb-cw');
      if (cw && !cw.dataset.bound) { cw.dataset.bound = '1'; cw.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); act('addw'); } }); }
    },
    frame(c) {
      C = c;
      if (viewer && c.G.board) viewer.sync(c.G.board, () => A.send({ t: 'rb-sync' }));
    },
    act(a, el) { act(a, el); },
    leave() {
      dropPad(); viewer = null; stageSig = ''; msgSig = '';
      clearInterval(timerT); timerT = null;
      const app = document.getElementById('app'); if (app) app.classList.remove('rb-wide');
      if (layer) { layer.remove(); layer = null; }
      lastFx = null; lastMatch = null;
    },
  };
})();
