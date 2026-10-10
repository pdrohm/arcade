// Imagem e Ação — tela do celular.
// Quem faz a carta escolhe: desenhar (quadro aqui, o desenho aparece na TV) ou mímica.
'use strict';
(() => {
  let reveal = false, lastRound = -1, ovTurn = null, ovRound = null, keyN = 0;
  let lastDraw = null, drawWord = '';   // o último desenho de quem desenhou (fica só neste celular, para salvar)

  // Visual "fliperama de papel" (shared/ui.css): cartões brancos com borda de tinta e sombra dura, letra sempre em tinta.
  const style = `
    .ia-word { font-size:40px; font-weight:900; font-stretch:115%; text-align:center; padding:24px 12px; background:#fff; color:#0f0f14; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; text-transform:uppercase; line-height:1.05; overflow-wrap:anywhere; cursor:pointer; }
    .ia-word.hid { background:#0f0f14; color:#ffce1f; font-size:20px; font-weight:900; text-transform:uppercase; }
    .ia-word.hid small { display:block; margin-top:8px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; color:#f1f0ea; }
    .ia-word.sm { font-size:28px; padding:12px 10px; }
    .ia-cat { padding:14px; text-align:center; font-weight:900; font-stretch:115%; text-transform:uppercase; font-size:24px; line-height:1; color:#0f0f14; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; }
    .ia-all { background:#0f0f14; color:#ffce1f; padding:12px; text-align:center; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:20px; line-height:1; }
    .ia-dice { width:104px; height:104px; margin:12px auto 0; background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); padding:12px; gap:6px; }
    .ia-dice i { background:#0f0f14; visibility:hidden; }
    .ia-dice.shake { animation:iashake .12s infinite; }
    @keyframes iashake { 0%{transform:rotate(-8deg)} 100%{transform:rotate(8deg)} }
    .ia-teams { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ia-team { padding:16px 12px; text-align:center; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:21px; line-height:1; color:#0f0f14; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; cursor:pointer; }
    .ia-team.sel { transform:translate(3px,3px); box-shadow:2px 2px 0 #0f0f14; outline:3px solid #0f0f14; outline-offset:3px; }
    .ia-team small { display:block; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.02em; text-transform:none; margin-top:8px; min-height:15px; }
    .ia-modes { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ia-mode { padding:18px 10px; text-align:center; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:20px; color:#0f0f14; line-height:1.05; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; cursor:pointer; }
    .ia-mode:active { transform:translate(4px,4px); box-shadow:1px 1px 0 #0f0f14; }
    .ia-mode small { display:block; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.02em; text-transform:none; margin-top:8px; }
    .ia-mode .em { display:block; margin:0 auto 10px; width:44px; height:44px; background:#fff; border:3px solid #0f0f14; display:flex; align-items:center; justify-content:center; }
    .ia-mode .em svg { width:26px; height:26px; fill:none; stroke:#0f0f14; stroke-width:2.6; }
    .ia-wrap { position:relative; width:100%; aspect-ratio:1; background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; overflow:hidden; touch-action:none; }
    .ia-wrap canvas { position:absolute; inset:0; width:100%; height:100%; touch-action:none; }
    .ia-tools { display:grid; gap:6px; align-items:center; }
    .ia-tools.cores { grid-template-columns:repeat(10,1fr); }
    .ia-tools.ferr, .ia-tools.tam { grid-template-columns:repeat(8,1fr); }
    .ia-tools .lb { grid-column:span 2; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
    .ia-cor { aspect-ratio:1; border:3px solid #0f0f14; cursor:pointer; }
    .ia-cor.sel { outline:3px solid #0f0f14; outline-offset:2px; }
    .ia-sz { aspect-ratio:1; min-height:38px; background:#fff; border:3px solid #0f0f14; box-shadow:3px 3px 0 #0f0f14; display:flex; align-items:center; justify-content:center; color:#0f0f14; cursor:pointer; }
    .ia-sz svg { width:60%; height:60%; fill:none; stroke:#0f0f14; stroke-width:2.6; stroke-linecap:square; }
    .ia-sz.sel { background:#ffce1f; transform:translate(3px,3px); box-shadow:none; }
    .ia-sz:active { transform:translate(3px,3px); box-shadow:none; }
    .ia-sz.off { opacity:.3; box-shadow:none; }
    .ia-sz i { display:block; border-radius:50%; background:#0f0f14; }
    .ia-live { display:flex; align-items:center; gap:8px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.04em; text-transform:uppercase; color:#0f0f14; }
    .ia-live i { width:12px; height:12px; background:#35d07f; border:2px solid #0f0f14; animation:ialive 1s infinite alternate; }
    @keyframes ialive { from { opacity:.3 } to { opacity:1 } }
    .ia-k { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:#55555e; }
    .ia-sw { display:inline-block; width:30px; height:30px; border:3px solid #0f0f14; flex:none; }
    .ia-h { font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:24px; line-height:1; }
    .ia-tm { border:3px solid #0f0f14; background:#fff; padding:8px 10px; }
    .ia-tm + .ia-tm { margin-top:8px; }
    .ia-tm.cur { background:#fff4c2; }
    .ia-tm .hd { display:flex; align-items:center; font-size:17px; }
    .ia-tm .hd .sw { width:18px; height:18px; border:2px solid #0f0f14; flex:none; margin-right:10px; }
    .ia-tm .hd b { flex:1; font-weight:900; text-transform:uppercase; font-stretch:115%; }
    .ia-tm .hd span { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; text-transform:uppercase; color:#55555e; }
    .ia-tm .ps { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
    .ia-p { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; border:2px solid #0f0f14; background:#fff; color:#55555e; font-weight:800; font-size:14px; padding:1px 7px 1px 2px; }
    .ia-p.now { background:#ffce1f; color:#0f0f14; }
    .ia-last { display:flex; align-items:center; gap:14px; padding:12px; }
    .ia-save { flex:none; width:110px; cursor:pointer; }
    .ia-save img { display:block; width:100%; aspect-ratio:1; background:#fff; border:3px solid #0f0f14; box-shadow:3px 3px 0 #0f0f14; }
    .ia-wait { width:64px; height:64px; margin:0 auto 10px; border:3px solid #0f0f14; background:#b08cff; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:34px; }
  `;
  let styled = false;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const dice = (n, shake) => {
    const map = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const on = new Set(map[n] || []);
    return `<div class="ia-dice ${shake ? 'shake' : ''}">${Array.from({ length: 9 }, (_, i) => `<i style="visibility:${on.has(i) ? 'visible' : 'hidden'}"></i>`).join('')}</div>`;
  };

  // ---------- quadro de desenho ----------
  // Cada gesto vira "traços" (ops) em coordenadas 0..SIZE. Os mesmos traços vão para o servidor pelo
  // canal rápido (t:'input') e a TV redesenha igual. Desfazer/refazer/limpar também são traços.
  const SIZE = 640, FLUSH_MS = 80, MAX_PTS = 160, MAX_BATCH = 40;
  const CORES = ['#111111', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#8b5a2b', '#ffffff'];
  // ícones de traço (SVG em tinta), no lugar dos emojis
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    pen: ic('<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>'),
    eraser: ic('<path d="M3 15l9-9 7 7-6 6H7z"/><path d="M13 19h8"/>'),
    line: ic('<path d="M5 19L19 5"/>'),
    rect: ic('<rect x="4" y="6" width="16" height="12"/>'),
    circle: ic('<circle cx="12" cy="12" r="8"/>'),
    undo: ic('<path d="M9 4L4 9l5 5"/><path d="M4 9h10a5 5 0 0 1 0 10h-4"/>'),
    redo: ic('<path d="M15 4l5 5-5 5"/><path d="M20 9H10a5 5 0 0 0 0 10h4"/>'),
    trash: ic('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'),
    mime: ic('<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M5 10l7 2 7-2M8 22l4-7 4 7"/>'),
  };
  const TOOLS = [['pen', ICON.pen, 'caneta'], ['eraser', ICON.eraser, 'borracha'], ['line', ICON.line, 'reta'], ['rect', ICON.rect, 'retângulo'], ['circle', ICON.circle, 'círculo']];
  const KIND = { line: 'l', rect: 'r', circle: 'o' };
  let cv = null, cx2 = null, cor = CORES[0], tam = 8, tool = 'pen', drawing = false;
  let ops = [], pending = [], nextId = 1, stroke = null, sentUpTo = 0, snap = null, p0 = null, last = null, mountedFor = '';
  const W = () => (tool === 'eraser' ? tam * 3 : tam);
  const C = () => (tool === 'eraser' ? '#ffffff' : cor);

  // Traços → pilha do que está visível (desfazer tira do fim, refazer devolve, limpar é um marco).
  function stackOf(list) {
    const stack = [];
    let redo = [];
    for (const op of list) {
      if (op.t === 's') {
        const lastS = stack[stack.length - 1];
        if (lastS && lastS.t === 's' && lastS.id === op.id) lastS.p = lastS.p.concat(op.p);
        else { stack.push({ t: 's', id: op.id, c: op.c, w: op.w, p: op.p.slice() }); redo = []; }
      } else if (op.t === 'f' || op.t === 'c') { stack.push(op); redo = []; }
      else if (op.t === 'u') { if (stack.length) redo.push(stack.pop()); }
      else if (op.t === 'y') { if (redo.length) stack.push(redo.pop()); }
    }
    return { stack, redo };
  }
  function drawOp(g, op, k) {
    g.strokeStyle = g.fillStyle = op.c; g.lineWidth = op.w * k; g.lineCap = 'round'; g.lineJoin = 'round';
    if (op.t === 's') {
      if (op.p.length <= 2) { g.beginPath(); g.arc(op.p[0] * k, op.p[1] * k, op.w * k / 2, 0, Math.PI * 2); g.fill(); return; }
      g.beginPath(); g.moveTo(op.p[0] * k, op.p[1] * k);
      for (let i = 2; i < op.p.length; i += 2) g.lineTo(op.p[i] * k, op.p[i + 1] * k);
      g.stroke(); return;
    }
    const a = op.a, b = op.b;
    g.beginPath();
    if (op.k === 'l') { g.moveTo(a[0] * k, a[1] * k); g.lineTo(b[0] * k, b[1] * k); }
    else if (op.k === 'r') g.rect(Math.min(a[0], b[0]) * k, Math.min(a[1], b[1]) * k, Math.abs(b[0] - a[0]) * k, Math.abs(b[1] - a[1]) * k);
    else g.ellipse((a[0] + b[0]) / 2 * k, (a[1] + b[1]) / 2 * k, Math.max(1, Math.abs(b[0] - a[0]) / 2) * k, Math.max(1, Math.abs(b[1] - a[1]) / 2) * k, 0, 0, Math.PI * 2);
    g.stroke();
  }
  function paint(g, stack, size, k) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size);
    let from = 0;
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].t === 'c') { from = i + 1; break; }
    for (let i = from; i < stack.length; i++) drawOp(g, stack[i], k);
  }
  const repaint = () => { if (cx2) paint(cx2, stackOf(ops).stack, SIZE, 1); };
  const push = op => { ops.push(op); pending.push(op); };
  function flush() {
    if (stroke && stroke.p.length > sentUpTo) {          // pedaço novo do traço em andamento
      const p = stroke.p.slice(sentUpTo, sentUpTo + MAX_PTS);
      sentUpTo += p.length;
      push({ t: 's', id: stroke.id, c: stroke.c, w: stroke.w, p });
    }
    while (pending.length) { const b = pending.splice(0, MAX_BATCH); ARCADE.send({ t: 'input', k: 'draw', ops: b }); }
  }
  setInterval(() => { if (cv) flush(); }, FLUSH_MS);

  function initCanvas(el, serverOps) {
    cv = el; cx2 = cv.getContext('2d');
    cv.width = SIZE; cv.height = SIZE;
    ops = Array.isArray(serverOps) ? serverOps.slice() : []; pending = []; stroke = null; tool = 'pen'; drawing = false;
    for (const op of ops) if (op.id >= nextId) nextId = op.id + 1;   // ids novos não podem colar num traço antigo
    repaint();
    const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round(Math.max(0, Math.min(SIZE, (e.clientX - r.left) / r.width * SIZE))), Math.round(Math.max(0, Math.min(SIZE, (e.clientY - r.top) / r.height * SIZE)))]; };
    const seg = (a, b) => drawOp(cx2, { t: 's', c: C(), w: W(), p: [a[0], a[1], b[0], b[1]] }, 1);
    const down = e => {
      e.preventDefault(); if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      drawing = true; p0 = last = pos(e);
      if (tool === 'pen' || tool === 'eraser') {
        stroke = { id: nextId++, c: C(), w: W(), p: [p0[0], p0[1]] }; sentUpTo = 0;
        drawOp(cx2, stroke, 1);
        flush();                                          // o primeiro ponto sai na hora: a TV mostra o pingo
      } else snap = cx2.getImageData(0, 0, SIZE, SIZE);
    };
    const move = e => {
      if (!drawing) return; e.preventDefault();
      const p = pos(e);
      if (stroke) { if (p[0] === last[0] && p[1] === last[1]) return; seg(last, p); stroke.p.push(p[0], p[1]); last = p; }
      else { cx2.putImageData(snap, 0, 0); drawOp(cx2, { t: 'f', k: KIND[tool], c: C(), w: W(), a: p0, b: p }, 1); }   // prévia da forma
    };
    const up = e => {
      if (!drawing) return; drawing = false;
      if (stroke) { flush(); stroke = null; }
      else { const b = e && e.clientX !== undefined ? pos(e) : last; cx2.putImageData(snap, 0, 0); snap = null; const op = { t: 'f', id: nextId++, k: KIND[tool], c: C(), w: W(), a: p0, b }; drawOp(cx2, op, 1); push(op); flush(); }
      refreshTools();
    };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', e => { if (drawing && stroke) up(e); });
  }
  const st = () => stackOf(ops);
  function toolsHtml() {
    const s = st();
    return `<div class="ia-tools cores">${CORES.map(c => `<div class="ia-cor ${tool !== 'eraser' && cor === c ? 'sel' : ''}" style="background:${c}" data-a="tcor" data-c="${c}"></div>`).join('')}</div>
      <div class="ia-tools ferr" style="margin-top:10px">${TOOLS.map(t => `<div class="ia-sz ${tool === t[0] ? 'sel' : ''}" data-a="tool" data-k="${t[0]}" title="${t[2]}">${t[1]}</div>`).join('')}
        <div class="ia-sz ${s.stack.length ? '' : 'off'}" data-a="undo" title="desfazer">${ICON.undo}</div><div class="ia-sz ${s.redo.length ? '' : 'off'}" data-a="redo" title="refazer">${ICON.redo}</div><div class="ia-sz" data-a="limpar" title="limpar tudo">${ICON.trash}</div></div>
      <div class="ia-tools tam" style="margin-top:10px"><span class="lb">Traço</span>${[4, 8, 16, 28].map(t => `<div class="ia-sz ${tam === t ? 'sel' : ''}" data-a="tam" data-t="${t}"><i style="width:${Math.min(26, t + 3)}px;height:${Math.min(26, t + 3)}px"></i></div>`).join('')}</div>`;
  }
  function refreshTools() { const t = document.getElementById('ia-tools'); if (t) { t.innerHTML = toolsHtml(); bindTools(t); } }
  function bindTools(root) {
    Array.prototype.slice.call(root.querySelectorAll('[data-a]')).forEach(el => el.onclick = ev => {
      ev.stopPropagation();
      const a = el.dataset.a;
      if (a === 'tcor') { cor = el.dataset.c; if (tool === 'eraser') tool = 'pen'; }
      else if (a === 'tool') tool = el.dataset.k;
      else if (a === 'tam') tam = Number(el.dataset.t);
      else if (a === 'undo') { if (st().stack.length) { push({ t: 'u' }); repaint(); } }
      else if (a === 'redo') { if (st().redo.length) { push({ t: 'y' }); repaint(); } }
      else if (a === 'limpar') { if (confirm('Apagar tudo?')) { push({ t: 'c' }); repaint(); } }
      flush();
      refreshTools();
    });
  }
  const canvasOn = c => { const G = c.G; return !!(G && G.mode === 'desenho' && c.C.timerEnd && G.amDrawer && G.card && ['draw', 'allplay'].includes(G.phase)); };

  // Toque para salvar (shared/client.js, data-copyimg): o ajudante lê a imagem com fetch, e a política de
  // segurança do site não deixa buscar endereço data:. Por isso cada imagem salvável ganha uma cópia em
  // <canvas> escondida, que vem antes da <img> e é a que o ajudante usa.
  function canvasCopies() {
    Array.prototype.slice.call(document.querySelectorAll('[data-copyimg]')).forEach(w => {
      const img = w.querySelector('img');
      if (!img || w.querySelector('canvas')) return;
      const make = () => {
        if (w.querySelector('canvas') || !img.naturalWidth) return;
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight; cv.style.display = 'none';
        cv.getContext('2d').drawImage(img, 0, 0);
        w.insertBefore(cv, w.firstChild);
      };
      if (img.complete) make(); else img.addEventListener('load', make);
    });
  }

  ARCADE.register('imagemeacao', {
    phone: {
      // Com o quadro aberto a tela não é redesenhada a cada estado (senão o desenho some no meio do risco).
      key(c) { return canvasOn(c) ? `canvas:${c.G.round}:${c.G.phase}:${c.G.card.word}` : 'r' + (++keyN); },

      html(c) {
        ensureStyle();
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G || !G.teamList) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const ti = k => G.teamList.find(x => x.key === k);
        const t = G.teams[G.turn];
        const mine = G.teams.find(x => x.key === G.myTeam);
        const isMyTurn = !!(t && mine && t.key === mine.key);
        const drawerP = tt => { const pid = tt && G.drawers[tt.key]; return pid ? c.C.players.find(x => x.pid === pid) : null; };
        const dOf = tt => { const p = drawerP(tt); return p ? p.name : null; };
        const offline = tt => { const p = drawerP(tt); return p && p.on === false ? `<div class="box center" style="background:#f0443a"><div class="ia-h" style="font-size:18px">Sem conexão</div><p class="sub" style="color:#0f0f14;margin-top:6px"><b>${esc(p.name)}</b> está sem conexão. A vez é dele: ninguém joga no lugar.</p></div>` : ''; };
        if (G.round !== lastRound) { reveal = false; lastRound = G.round; }
        const modeTxt = G.mode === 'mimica' ? 'fazendo mímica' : 'desenhando';
        const modeEm = G.mode === 'mimica' ? 'Mímica' : 'Desenho';
        const picker = () => `<div class="box hi"><p class="ia-h center" style="font-size:18px;margin-bottom:14px">Como você vai mostrar a palavra?</p>
          <div class="ia-modes"><div class="ia-mode" style="background:#35d07f" data-a="desenho"><span class="em">${ICON.pen}</span>Desenhar<small>aqui no celular, aparece na TV</small></div>
          <div class="ia-mode" style="background:#3db4f2" data-a="mimica"><span class="em">${ICON.mime}</span>Mímica<small>só o cronômetro</small></div></div>
          <p class="sub center" style="margin-top:12px;font-size:15px">O tempo começa quando você escolher.</p></div>`;
        const board = () => `<div class="ia-live"><i></i>Ao vivo: o que você desenha aparece na TV</div>
          <div class="ia-wrap"><canvas id="ia-cv"></canvas></div><div id="ia-tools">${toolsHtml()}</div>`;

        // ---------- escolher equipe ----------
        if (G.phase === 'setup') {
          return `<div class="box" style="background:#b08cff"><p class="ia-h">Escolha sua equipe</p><p class="sub" style="color:#0f0f14;margin-top:6px;font-size:15px">Dentro dela, a ordem de fazer a carta é a ordem de entrada.</p></div>
            <div class="ia-teams">${G.teamList.map(k => {
              const tt = G.teams.find(x => x.key === k.key);
              return `<div class="ia-team dots ${G.myTeam === k.key ? 'sel' : ''}" style="background-color:${k.hex}" data-a="time" data-k="${k.key}">${k.name}
                <small>${tt ? tt.players.map(pid => { const p = c.C.players.find(x => x.pid === pid); return p ? esc(p.name) : ''; }).filter(Boolean).join(', ') : 'vazia'}</small></div>`;
            }).join('')}</div>
            <button class="btn big ok" data-a="begin" ${G.teams.length < 2 ? 'disabled' : ''}>Começar o jogo ▶</button>
            ${G.teams.length < 2 ? '<p class="sub center mut">Precisa de 2 equipes ou mais.</p>' : ''}
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- vitória ----------
        if (G.phase === 'win') {
          const k = ti(G.winner);
          return `<div class="box center dots" style="background-color:${k.hex}"><p class="ia-k" style="color:#0f0f14">Fim do tabuleiro</p><h2 class="disp" style="margin:10px 0 4px;font-size:34px">Equipe ${k.name} venceu!</h2></div>
            <button class="btn big ok" data-a="again">Jogar de novo</button>`;
        }

        const k = t ? ti(t.key) : null;
        let h = `<div class="box"><div style="display:flex;align-items:center;gap:12px">
          <span class="ia-sw" style="background:${k.hex}"></span>
          <div><p class="ia-k">Vez da equipe</p><b class="ia-h">${k.name}</b></div>
          <div style="margin-left:auto;text-align:right"><p class="ia-k">Casa <b class="pix" style="font-size:18px;color:#0f0f14">${t.pos}${G.target !== null ? ` → ${G.target}` : ''}</b></p>
          ${dOf(t) ? `<p class="sub" style="font-weight:800;font-size:15px">✎ ${esc(dOf(t))}</p>` : ''}</div></div></div>`;

        if (G.phase === 'rolling') return h + `<div class="box center"><p class="ia-h" style="font-size:18px">Rolando…</p>${dice(null, true)}</div>`;

        if (G.phase === 'roll') {
          if (isMyTurn && G.amDrawer) h += `<div class="box hi center"><p class="ia-h" style="font-size:20px">Sua vez de fazer a carta!</p>${dice(G.dice)}</div><button class="btn big dark" data-a="roll">Jogar o dado</button>`;
          else if (isMyTurn) h += `<div class="box center"><p class="ia-k">Sua equipe joga agora</p><h2 class="disp" style="margin:10px 0;font-size:28px">✎ ${esc(dOf(t) || '?')}</h2><p class="sub">Ele joga o dado e desenha ou faz mímica. Você adivinha!</p></div>` + offline(t);
          else h += `<div class="box center"><div class="ia-wait">…</div><p class="sub">Esperando a equipe <span class="nm" style="background:${k.hex};color:#0f0f14">${k.name}</span> jogar o dado.</p></div>`;
        } else if (G.phase === 'allplay') {
          const cat = G.categories[G.card.cat];
          h += `<div class="ia-all">⚡ Todos jogam</div>
            <div class="ia-cat" style="background:${cat.color}">${cat.name}</div>
            <p class="sub center">Todas as equipes ${G.mode ? 'estão ' + modeTxt : 'mostram a mesma palavra'}. Quem acertar primeiro anda <b>${G.dice}</b> casa${G.dice === 1 ? '' : 's'}!</p>`;
          if (G.amDrawer) {
            const on = canvasOn(c);
            h += `<p class="sub center"><b>✎ Você faz a carta pela equipe ${mine ? ti(mine.key).name : ''}.</b></p>`;
            if (on) h += `<div class="ia-word sm">${esc(G.card.word)}</div>`;
            else h += reveal ? `<div class="ia-word" data-a="esconder">${esc(G.card.word)}</div>` : `<div class="ia-word hid" data-a="ver">Toque para ver a palavra<small>só quem faz a carta!</small></div>`;
            if (c.C.timerEnd) h += c.timerHtml('', G.roundMs);
            if (on) h += board();
          } else h += `<div class="box center">${G.mode ? `<p class="ia-k" style="margin-bottom:6px">${modeEm}</p>` : ''}<p class="sub"><b>${esc(dOf(mine) || 'Alguém')}</b> ${G.mode ? 'está ' + modeTxt : 'faz a carta'} pela sua equipe. Você adivinha!</p></div>` + offline(mine);
          if (!c.C.timerEnd) {
            if (isMyTurn && G.amDrawer) h += picker() + `<button class="btn ghost" data-a="swap">↻ Trocar carta</button>`;
            else h += `<p class="sub center mut">Esperando ${esc(dOf(t) || 'a equipe ' + k.name)} escolher desenho ou mímica…</p>`;
          } else {
            if (!G.amDrawer) h += c.timerHtml('', G.roundMs);
            h += `<button class="btn big ok" data-a="allwin">Acertamos!</button>`;
            if (isMyTurn && G.amDrawer) h += `<button class="btn ghost" data-a="allnone">Ninguém acertou → passar a vez</button>`;
          }
        } else {  // draw | judge
          const cat = G.categories[G.card.cat];
          h += `<div class="ia-cat" style="background:${cat.color}">${cat.name}</div>`;
          if (isMyTurn && G.amDrawer) {
            const on = canvasOn(c);
            if (on) h += `<div class="ia-word sm">${esc(G.card.word)}</div>`;
            else h += reveal ? `<div class="ia-word" data-a="esconder">${esc(G.card.word)}</div>` : `<div class="ia-word hid" data-a="ver">Toque para ver a palavra<small>só você vê!</small></div>`;
            if (G.phase === 'draw' && !c.C.timerEnd) h += picker() + `<button class="btn ghost" data-a="swap">↻ Trocar carta</button>`;
            else {
              h += G.timeUp ? `<div class="box center" style="background:#f0443a"><p class="ia-h">Tempo esgotado!</p></div>` : c.timerHtml(G.mode === 'mimica' ? 'Mímica valendo!' : '', G.roundMs);
              if (on) h += board();
              h += `<div class="row"><button class="btn big ok" data-a="ok">✔ Acertou</button><button class="btn big no" data-a="fail">✘ Errou</button></div>`;
            }
          } else if (isMyTurn) {
            h += offline(t) + `<div class="box center">${G.mode ? `<p class="ia-k" style="margin-bottom:6px">${modeEm}</p>` : ''}<p class="ia-h" style="font-size:20px;margin-bottom:8px">Sua equipe adivinha!</p><p class="sub"><b>${esc(dOf(t) || 'Alguém')}</b> ${G.mode ? 'está ' + modeTxt : 'vai fazer a carta'} pela sua equipe.<br>${G.mode === 'desenho' ? 'Olhe o desenho na TV e adivinhe!' : 'Adivinhe! Você não vê a palavra.'}</p></div>`;
            h += G.timeUp ? '<p class="ia-k center" style="color:#d02a20">Tempo esgotado</p>' : c.timerHtml('', G.roundMs);
          } else {
            h += `<div class="box center">${G.mode ? `<p class="ia-k" style="margin-bottom:6px">${modeEm}</p>` : ''}<p class="sub">A equipe <span class="nm" style="background:${k.hex};color:#0f0f14">${k.name}</span> ${G.mode ? 'está ' + modeTxt : 'está na vez'}.<br><b>Olhe para a TV!</b></p></div>`;
            h += G.timeUp ? '<p class="ia-k center" style="color:#d02a20">Tempo esgotado</p>' : c.timerHtml('', G.roundMs);
          }
        }

        if (lastDraw && !canvasOn(c)) {
          const nome = 'imagem-e-acao-' + String(lastDraw.word || 'desenho').toLowerCase().replace(/[^a-z0-9à-ú]+/g, '-');
          h += `<div class="box ia-last"><div class="ia-save" data-copyimg="${esc(nome)}"><img src="${lastDraw.img}" alt="Seu último desenho"></div>
            <div><p class="ia-k">Seu último desenho</p><p class="ia-h" style="font-size:18px;margin-top:4px;overflow-wrap:anywhere">${esc(lastDraw.word || '')}</p><p class="ia-k" style="color:#0f0f14;margin-top:8px">Toque no desenho para salvar</p></div></div>`;
        }
        h += `<p class="sub center" id="ia-event">${c.C.event ? c.hl(c.C.event.text) : ''}</p>
          <div class="box"><p class="ia-k" style="margin-bottom:10px">Equipes</p>${G.teams.map(tt => {
            const kk = ti(tt.key);
            return `<div class="ia-tm ${tt === t ? 'cur' : ''}"><div class="hd"><span class="sw" style="background:${kk.hex}"></span><b>${kk.name}</b><span>casa ${tt.pos}</span></div>
              <div class="ps">${tt.players.map((pid, i) => {
                const p = c.C.players.find(x => x.pid === pid);
                const now = G.drawers[tt.key] === pid;
                return p ? `<span class="ia-p ${now ? 'now' : ''}">${c.avatar(p, 22)}${i + 1}. ${esc(p.name)}${now ? ' ✎' : ''}${p.on === false ? ' · fora' : ''}</span>` : '';
              }).join('')}</div></div>`;
          }).join('')}</div>`;
        return h;
      },

      after(c) {
        canvasCopies();
        const G = c.G;
        // quadro: monta uma vez por vez de desenhar; se o celular recarregou, refaz com o que a TV já tem
        const canvasEl = document.getElementById('ia-cv');
        if (canvasEl && canvasOn(c)) {
          const tag = `${G.round}:${G.phase}:${G.myTeam}`;
          if (mountedFor !== tag || cv !== canvasEl) {
            mountedFor = tag;
            const b = G.boards && G.boards[G.myTeam];
            initCanvas(canvasEl, b && b.from === 0 ? b.ops : null);
            bindTools(document.getElementById('ia-tools'));
          }
          const ev = document.getElementById('ia-event'); if (ev) ev.innerHTML = c.C.event ? c.hl(c.C.event.text) : '';
          drawWord = G.card ? G.card.word : '';
        } else if (cv) {
          flush();
          if (stackOf(ops).stack.length) { try { lastDraw = { img: cv.toDataURL('image/png'), word: drawWord }; setTimeout(() => ARCADE.redraw(), 0); } catch (err) {} }   // a tela já foi montada: redesenha para mostrar o desenho salvo
          cv = null; cx2 = null; stroke = null;
        }

        if (!G || !G.teams || !['roll', 'draw', 'allplay'].includes(G.phase)) { ovTurn = G ? G.turn : null; ovRound = G ? G.round : null; return; }
        const first = ovTurn === null;
        const mudou = !first && (G.turn !== ovTurn || G.round !== ovRound);
        ovTurn = G.turn; ovRound = G.round;
        if (!mudou || G.phase !== 'roll') return;
        const t = G.teams[G.turn]; if (!t) return;
        const k = G.teamList.find(x => x.key === t.key);
        const pid = G.drawers[t.key], p = pid && c.C.players.find(x => x.pid === pid);
        const euDesenho = c.you && pid === c.you.pid;
        c.turnover(`<div class="round">Rodada ${G.round}</div>
          <div><small>AGORA É A VEZ DA EQUIPE</small><span class="who2" style="background:${k.hex};color:#0f0f14">${k.name}</span></div>
          ${p ? `<div><small>QUEM FAZ A CARTA</small><span class="who2 sm" style="background:#fff;color:#0f0f14;display:inline-flex;align-items:center;gap:8px">${c.avatar(p, 32)}${c.esc(p.name)}</span></div>` : ''}
          ${euDesenho ? '<div class="mine">✎ É você quem faz a carta!</div>' : ''}`,
          3000, euDesenho ? [90, 60, 90] : 60);
      },

      act(a, el) {
        const send = ARCADE.send;
        switch (a) {
          case 'time': return send({ t: 'team', key: el.dataset.k });
          case 'begin': return send({ t: 'begin' });
          case 'roll': return send({ t: 'roll' });
          case 'desenho': return send({ t: 'timer', mode: 'desenho' });
          case 'mimica': return send({ t: 'timer', mode: 'mimica' });
          case 'swap': reveal = false; return send({ t: 'swap' });
          case 'ver': reveal = true; return ARCADE.redraw();
          case 'esconder': reveal = false; return ARCADE.redraw();
          case 'ok': return send({ t: 'result', ok: true });
          case 'fail': return send({ t: 'result', ok: false });
          case 'allwin': return send({ t: 'allwin' });
          case 'allnone': return send({ t: 'allnone' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });
})();
