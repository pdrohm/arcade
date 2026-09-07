// Imagem e Ação — tela da TV.
'use strict';
(() => {
  const COLS = 10, ROWS = 7, PAD = 2.2, GAP = 2.6, CW = (100 - 2 * PAD - (COLS - 1) * GAP) / COLS;
  const BH = 2 * PAD + (ROWS - 1) * GAP + ROWS * CW;
  const cx = col => PAD + col * (CW + GAP) + CW / 2, cy = row => PAD + row * (CW + GAP) + CW / 2;
  const pctY = v => (v / BH * 100) + '%';
  function spiral(n) {
    const out = []; let top = 0, left = 0, bottom = ROWS - 1, right = COLS - 1;
    while (out.length < n) {
      for (let c = left; c <= right && out.length < n; c++) out.push({ row: top, col: c }); top++;
      for (let r = top; r <= bottom && out.length < n; r++) out.push({ row: r, col: right }); right--;
      for (let c = right; c >= left && out.length < n; c--) out.push({ row: bottom, col: c }); bottom--;
      for (let r = bottom; r >= top && out.length < n; r--) out.push({ row: r, col: left }); left++;
    }
    return out;
  }
  let PATH = [];
  const shown = {};
  let animating = false, lastTurn = null, lastRound = null;

  const style = `
    .ia-board { position:relative; width:100%; max-width:calc((100vh - 40px) * 10 / 7.1); border-radius:22px;
      background:linear-gradient(160deg,#f6f1e4,#e9e2d0); box-shadow:0 30px 60px rgba(0,0,0,0.6), inset 0 0 0 6px rgba(255,255,255,0.53), inset 0 0 0 8px #c9bfa6; overflow:hidden; }
    .ia-board { aspect-ratio:100 / ${BH}; } /* tv-ok */
    /* TV antiga (sem aspect-ratio): um espaçador dá a altura do tabuleiro (padding % = largura do tabuleiro). */
    .ia-board::before { content:''; display:block; padding-top:${BH}%; }
    .ia-sq { position:absolute; border-radius:14%; box-shadow:inset 0 -4px 0 rgba(0,0,0,0.13), inset 0 2px 0 rgba(255,255,255,0.33), 0 2px 4px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; font-weight:900; color:#1a1a1a; font-size:16px;
      font-size:clamp(9px,1.05vw,16px); } /* tv-ok */
    .ia-sq .n { position:absolute; right:9%; bottom:5%; font-size:11px; font-size:clamp(7px,.7vw,11px); font-weight:800; opacity:.45; } /* tv-ok */
    .ia-sq.all::before { content:''; position:absolute; top:22%; left:22%; right:22%; bottom:22%; border-radius:50%; background:#fff; opacity:.9; }
    .ia-sq.all::after { content:'⚡'; position:absolute; font-size:22px; font-size:clamp(10px,1.3vw,22px); } /* tv-ok */
    .ia-sq.start, .ia-sq.finish { background:#fff; color:#1a1a1a; text-align:center; line-height:1.1; }
    .ia-sq.finish { background:repeating-linear-gradient(45deg,#fff 0,#fff 8px,#ddd 8px,#ddd 16px); }
    .ia-sq.active { animation:iaglow .9s infinite alternate; z-index:2; }
    @keyframes iaglow { from { box-shadow:0 0 0 3px #fff, 0 0 12px 4px rgba(0,0,0,0.4); } to { box-shadow:0 0 0 5px #fff, 0 0 26px 8px rgba(0,0,0,0.53); } }
    .ia-pawn { position:absolute; width:5.4%; border-radius:50%; border:3px solid #fff; box-shadow:0 5px 10px rgba(0,0,0,0.47), 0 0 0 2px rgba(0,0,0,0.27); transition:left .28s ease, top .28s ease; z-index:5; transform:translate(-50%,-50%); }
    .ia-ghost { position:absolute; width:5.4%; border-radius:50%; border:3px dashed #fff; z-index:4; transform:translate(-50%,-50%); animation:iagh 1s infinite alternate; pointer-events:none; }
    /* peão redondo na TV antiga: espaçador de 100% da largura de dentro (+ borda dos dois lados = largura total) */
    .ia-pawn::before, .ia-ghost::before { content:''; display:block; padding-top:100%; }
    .ia-pawn, .ia-ghost { aspect-ratio:1; } /* tv-ok */
    @supports (aspect-ratio:1) { .ia-board::before, .ia-pawn::before, .ia-ghost::before { display:none; } }
    @keyframes iagh { from { opacity:.45; } to { opacity:.9; } }
    .ia-center { position:absolute; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2%; text-align:center; color:#1a1a1a; }
    /* era gap:2% (2% da altura de dentro do miolo = 0,874% da largura de dentro); a barra de tempo já tem 8px de margem */
    .ia-center > * + * { margin-top:.874%; }
    .ia-center > .tbar { margin-top:calc(8px + .874%); }
    .ia-logo { font-size:40px; font-size:clamp(20px,2.6vw,40px); font-weight:900; line-height:1; } .ia-logo span { color:#f97316; } /* tv-ok */
    .ia-cat { border-radius:12px; padding:.5em 1.4em; font-weight:900; font-size:28px; font-size:clamp(14px,1.8vw,28px); box-shadow:0 4px 10px rgba(0,0,0,0.2); } /* tv-ok */
    .ia-hint { color:#6b6252; font-size:18px; font-size:clamp(12px,1.2vw,18px); font-weight:700; } /* tv-ok */
    .ia-timer { font-size:120px; font-size:clamp(50px,7vw,120px); font-weight:900; line-height:1; font-variant-numeric:tabular-nums; color:#1a1a1a; } /* tv-ok */
    .ia-timer.low { color:#ef4444; animation:pulse .5s infinite alternate; }
    .ia-dice { width:100px; height:100px; border-radius:18%; background:#fff; display:flex; flex-wrap:wrap; align-content:flex-start; padding:14%; box-shadow:0 6px 14px rgba(0,0,0,0.27); }
    .ia-dice { width:clamp(50px,6.5vw,100px); height:clamp(50px,6.5vw,100px); } /* tv-ok */
    /* 3 colunas × 3 linhas com 6% de vão (era grid + gap:6%) */
    .ia-dice i { width:29.3333%; height:29.3333%; margin:0 6% 6% 0; border-radius:50%; background:#111; visibility:hidden; }
    .ia-dice i:nth-child(3n) { margin-right:0; } .ia-dice i:nth-child(n+7) { margin-bottom:0; }
    .ia-dice.shake { animation:iashake .12s infinite; }
    @keyframes iashake { 0%{transform:rotate(-12deg)} 100%{transform:rotate(12deg)} }
    .ia-row { display:flex; align-items:center; } .ia-row > * + * { margin-left:4%; }
    .ia-win { position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); z-index:20; border-radius:22px; }
    .ia-win > * + * { margin-top:10px; }
    /* quadro de desenho: cobre o tabuleiro enquanto a equipe desenha (quem adivinha está no sofá; precisa ver grande) */
    .ia-easel { position:absolute; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(236,229,211,0.82); border-radius:22px; }
    .ia-easel-top { display:flex; align-items:center; justify-content:center; color:#1a1a1a; font-weight:900; margin-bottom:.5vw; }
    .ia-easel-top > * + * { margin-left:1.2vw; }
    .ia-easel .ia-timer { font-size:64px; font-size:clamp(30px,3.6vw,64px); } /* tv-ok */
    .ia-easel .ia-cat { font-size:22px; font-size:clamp(12px,1.4vw,22px); } /* tv-ok */
    .ia-easel .tbar { width:14vw; margin:0; }
    .ia-easel-row { display:flex; align-items:flex-start; justify-content:center; }
    .ia-easel-row > * + * { margin-left:1.4vw; }
    .ia-card { display:flex; flex-direction:column; align-items:center; }
    .ia-card canvas { display:block; background:#fff; border-radius:1vw; box-shadow:0 20px 50px rgba(0,0,0,0.45), 0 0 0 .35vw #fff, 0 0 0 .6vw rgba(0,0,0,0.18); }
    .ia-card-lb { margin-top:.6vw; font-weight:900; color:#1a1a1a; display:flex; align-items:center; font-size:22px; font-size:clamp(12px,1.3vw,22px); } /* tv-ok */
    .ia-card-lb .dot { width:1.2vw; height:1.2vw; margin-right:.5vw; }
    .ia-card-lb small { font-weight:700; opacity:.7; margin-left:.6vw; }
    .ia-mime { font-size:60px; font-size:clamp(30px,3.6vw,60px); line-height:1; } /* tv-ok */
  `;

  // ---------- quadro de desenho ----------
  // O celular manda traços em 0..DRAW_SIZE; aqui cada equipe tem um canvas maior, e cada traço
  // novo é desenhado por cima (desfazer redesenha tudo). Se um pedaço da transmissão se perdeu,
  // a TV pede o quadro inteiro ao servidor (ia-sync).
  const DRAW_SIZE = 640, TV_SIZE = 1280, K = TV_SIZE / DRAW_SIZE;
  const boards = {};       // key -> { round, seq, stack, redo, cv, g }
  let lastSync = 0, easelSig = '', fitBound = false;
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
  function repaint(b) {
    b.g.fillStyle = '#fff'; b.g.fillRect(0, 0, TV_SIZE, TV_SIZE);
    let from = 0;
    for (let i = b.stack.length - 1; i >= 0; i--) if (b.stack[i].t === 'c') { from = i + 1; break; }
    for (let i = from; i < b.stack.length; i++) drawOp(b.g, b.stack[i], K);
  }
  function apply(b, op) {
    const top = b.stack[b.stack.length - 1];
    if (op.t === 's') {
      if (top && top.t === 's' && top.id === op.id) {   // continuação do traço: desenha só o pedaço novo
        const n = top.p.length;
        drawOp(b.g, { t: 's', c: op.c, w: op.w, p: [top.p[n - 2], top.p[n - 1]].concat(op.p) }, K);
        top.p = top.p.concat(op.p);
      } else { b.stack.push({ t: 's', id: op.id, c: op.c, w: op.w, p: op.p.slice() }); b.redo = []; drawOp(b.g, op, K); }
    } else if (op.t === 'f') { b.stack.push(op); b.redo = []; drawOp(b.g, op, K); }
    else if (op.t === 'c') { b.stack.push(op); b.redo = []; b.g.fillStyle = '#fff'; b.g.fillRect(0, 0, TV_SIZE, TV_SIZE); }
    else if (op.t === 'u') { if (b.stack.length) { b.redo.push(b.stack.pop()); repaint(b); } }
    else if (op.t === 'y') { if (b.redo.length) { const r = b.redo.pop(); b.stack.push(r); if (r.t === 'c') { b.g.fillStyle = '#fff'; b.g.fillRect(0, 0, TV_SIZE, TV_SIZE); } else drawOp(b.g, r, K); } }
  }
  function newBoard(key, round) {
    const cv = document.createElement('canvas'); cv.width = TV_SIZE; cv.height = TV_SIZE;
    const b = { round, seq: 0, stack: [], redo: [], cv, g: cv.getContext('2d') };
    repaint(b);
    boards[key] = b;
    return b;
  }
  function syncBoards(c) {
    const G = c.G;
    if (!G || G.mode !== 'desenho' || !G.boards) { for (const k of Object.keys(boards)) delete boards[k]; return; }
    for (const key of Object.keys(G.boards)) {
      const inc = G.boards[key];
      let b = boards[key];
      if (!b || b.round !== G.round) b = newBoard(key, G.round);
      if (inc.from > b.seq) {   // perdemos um pedaço: pede tudo de novo (no máximo uma vez por segundo)
        if (Date.now() - lastSync > 1000) { lastSync = Date.now(); c.send({ t: 'ia-sync' }); }
        continue;
      }
      if (inc.from === 0 && inc.ops.length < b.seq) { b.seq = 0; b.stack = []; b.redo = []; repaint(b); }
      for (let i = b.seq - inc.from; i < inc.ops.length; i++) apply(b, inc.ops[i]);
      b.seq = inc.from + inc.ops.length;
    }
    for (const k of Object.keys(boards)) if (!G.boards[k]) delete boards[k];
  }
  // Tamanho dos quadros: o maior quadrado que cabe no tabuleiro (um por equipe, lado a lado).
  function fitEasel() {
    const board = document.getElementById('ia-board'), easel = document.getElementById('ia-easel');
    if (!board || !easel) return;
    const cards = Array.prototype.slice.call(easel.querySelectorAll('.ia-card'));
    if (!cards.length) return;
    const top = easel.querySelector('.ia-easel-top');
    const lb = easel.querySelector('.ia-card-lb');
    const gap = board.clientWidth * 0.014;
    const availH = board.clientHeight * 0.94 - (top ? top.offsetHeight + board.clientWidth * 0.005 : 0) - (lb ? lb.offsetHeight + board.clientWidth * 0.006 : 0);
    const availW = (board.clientWidth * 0.94 - gap * (cards.length - 1)) / cards.length;
    const size = Math.max(60, Math.floor(Math.min(availH, availW)));
    for (const card of cards) { const cv = card.querySelector('canvas'); cv.style.width = size + 'px'; cv.style.height = size + 'px'; }
  }

  const dice = (n, shake) => {
    const map = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const on = new Set(map[n] || []);
    return `<div class="ia-dice ${shake ? 'shake' : ''}">${Array.from({ length: 9 }, (_, i) => `<i style="visibility:${on.has(i) ? 'visible' : 'hidden'}"></i>`).join('')}</div>`;
  };

  ARCADE.register('imagemeacao', {
    tv: {
      mount(c) {
        const G = c.G;
        PATH = spiral(G.board.length);
        const pts = PATH.map(p => [cx(p.col), cy(p.row)]);
        let arrows = '';
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i], x1 = p1[0], y1 = p1[1], p2 = pts[i + 1], x2 = p2[0], y2 = p2[1];
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          arrows += `<path d="M-0.55 -0.7 L0.35 0 L-0.55 0.7" transform="translate(${mx} ${my}) rotate(${ang})" fill="none" stroke="#6b5f48" stroke-width="0.32" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`;
        }
        const line = pts.map(p => p.join(',')).join(' ');
        const svg = `<svg style="position:absolute;top:0;left:0;width:100%;height:100%" viewBox="0 0 100 ${BH}" preserveAspectRatio="none">
          <polyline points="${line}" fill="none" stroke="#b9ad90" stroke-width="${CW * 0.62}" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>
          <polyline points="${line}" fill="none" stroke="#d3c8ab" stroke-width="${CW * 0.5}" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="${line}" fill="none" stroke="#fffdf5" stroke-width="0.22" stroke-dasharray="1.2 1" stroke-linejoin="round" opacity=".8"/>${arrows}</svg>`;
        const squares = G.board.map(sq => {
          const rc = PATH[sq.i], row = rc.row, col = rc.col;
          const k = sq.cat ? G.categories[sq.cat] : null;
          const cls = ['ia-sq', sq.allPlay ? 'all' : '', sq.start ? 'start' : '', sq.finish ? 'finish' : ''].join(' ');
          const st = `left:${cx(col) - CW / 2}%;top:${pctY(cy(row) - CW / 2)};width:${CW}%;height:${pctY(CW)};${k && !sq.start && !sq.finish ? `background:${k.color}` : ''}`;
          const label = sq.start ? 'INÍCIO ▶' : sq.finish ? '🏁<br>FIM' : '';
          return `<div class="${cls}" id="ia-sq${sq.i}" style="${st}">${label}${sq.start || sq.finish ? '' : `<span class="n">${sq.i}</span>`}</div>`;
        }).join('');
        const cl = cx(2) - CW / 2, ct = cy(2) - CW / 2, cr = cx(7) + CW / 2, cb = cy(4) + CW / 2;
        return `<style>${style}</style><div class="ia-board" id="ia-board">${svg}${squares}
          <div class="ia-center" id="ia-center" style="left:${cl}%;top:${pctY(ct)};width:${cr - cl}%;height:${pctY(cb - ct)}"></div></div>`;
      },

      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm, hl = c.hl;
        const t = G.teams[G.turn];
        const ti = k => G.teamList.find(x => x.key === k);
        const drawerName = tt => { const pid = tt && G.drawers[tt.key]; const p = pid && c.C.players.find(x => x.pid === pid); return p ? p.name : null; };
        let side = `<div class="box"><p class="sub mut">${G.phase === 'setup' ? 'Escolhendo as equipes' : 'Rodada ' + G.round}</p>
          ${t && G.phase !== 'setup' ? `<div style="display:flex;align-items:center;margin-top:8px"><span class="dot" style="background:${ti(t.key).hex};width:34px;height:34px"></span><b style="font-size:26px;color:${ti(t.key).hex};margin-left:12px">${ti(t.key).name}</b>
            ${G.mode ? `<span style="margin-left:auto;background:${G.mode === 'mimica' ? '#2563eb' : '#16a34a'};color:#fff;border-radius:10px;padding:4px 12px;font-weight:900;font-size:16px">${G.mode === 'mimica' ? '🎭 Mímica' : '🎨 Desenho'}</span>` : ''}</div>` : ''}</div>`;

        side += `<div class="box">${G.teams.length ? `<div class="players">${G.teams.map((tt, i) => `
          <div class="pl" style="border-color:${i === G.turn && G.phase !== 'setup' ? '#fff' : 'transparent'}">
            <span class="dot" style="background:${ti(tt.key).hex}"></span>
            <b>${ti(tt.key).name}</b><span>casa ${tt.pos} · ${tt.players.length} 📱</span></div>
          <div style="display:flex;flex-wrap:wrap;padding:0 0 2px 14px">${tt.players.map((pid, k) => {
            const p = c.C.players.find(x => x.pid === pid);
            const now = G.drawers[tt.key] === pid && G.phase !== 'setup';
            return p ? `<span class="nm" style="${now ? 'background:#fbbf24;color:#111' : 'background:rgba(255,255,255,0.07);color:#cbd5e1'};font-size:14px;margin:0 6px 6px 0">${k + 1}. ${esc(p.name)}${now ? ' ✏️' : ''}${p.on === false ? ' 📵' : ''}</span>` : '';
          }).join('')}</div>`).join('')}</div>` : '<p class="sub center">Nenhuma equipe ainda. Escolham no celular!</p>'}</div>`;

        side += `<div class="event">${c.C.event ? hl(c.C.event.text) : ''}</div>`;
        side += `<div class="box" style="margin-top:auto"><p class="sub mut" style="margin-bottom:8px">Categorias</p>
          <div style="display:flex;flex-direction:column">${Object.keys(G.categories).map(kk => G.categories[kk]).map((k, i) => `<div style="display:flex;align-items:center;font-size:14px;font-weight:700${i ? ';margin-top:7px' : ''}"><i style="width:22px;height:22px;border-radius:6px;background:${k.color};display:inline-block;margin-right:10px"></i>${k.name}</div>`).join('')}
          <div style="display:flex;align-items:center;font-size:14px;font-weight:700;margin-top:7px"><i style="width:22px;height:22px;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;margin-right:10px">⚡</i>Todos jogam</div></div></div>`;
        return { side };
      },

      // traços chegando pelo canal rápido (game-frame): só o quadro muda
      frame(c) { syncBoards(c); },

      after(c) {
        const G = c.G, esc = c.esc;
        const board = document.getElementById('ia-board'), center = document.getElementById('ia-center');
        if (!board || !center) return;
        const ti = k => G.teamList.find(x => x.key === k);
        const t = G.teams[G.turn];
        const drawerName = tt => { const pid = tt && G.drawers[tt.key]; const p = pid && c.C.players.find(x => x.pid === pid); return p ? p.name : null; };

        // centro do tabuleiro
        let ch = '';
        if (G.phase === 'setup') {
          ch = `<div class="ia-logo">Imagem e <span>Ação</span></div><div class="ia-hint">Escolham as equipes no celular</div><div class="ia-hint">Precisa de 2 equipes ou mais</div>`;
        } else if (t) {
          const k = ti(t.key);
          ch = `<div class="ia-row"><span class="dot" style="background:${k.hex};width:2vw;height:2vw"></span>
            <div style="text-align:left"><div class="ia-hint">Vez da equipe</div><div style="font-size:28px;font-size:clamp(14px,1.8vw,28px) /* tv-ok */;font-weight:900">${k.name}</div></div>
            <div style="margin-left:calc(4% + 1.5vw)">${dice(G.dice, G.phase === 'rolling')}</div></div>`;
          const dn = drawerName(t);
          const verbo = G.mode === 'mimica' ? 'faz mímica' : G.mode === 'desenho' ? 'desenha' : 'faz a carta';
          if (dn) ch += `<div class="ia-hint">✏️ ${esc(dn)} ${G.phase === 'roll' ? 'joga o dado e faz a carta' : verbo}</div>`;
          if (G.phase === 'roll') ch += `<div class="ia-hint">Jogue o dado no celular 🎲</div>`;
          if (G.card) {
            const cat = G.categories[G.card.cat];
            if (G.phase === 'allplay') ch += `<div style="background:#1a1a1a;color:#fff;border-radius:12px;padding:.3em 1em;font-weight:900;font-size:20px;font-size:clamp(12px,1.3vw,20px) /* tv-ok */">⚡ TODOS JOGAM</div>`;
            if (G.mode === 'mimica') ch += `<div class="ia-mime">🎭</div>`;
            ch += `<div class="ia-cat" style="background:${cat.color};color:${cat.text}">${cat.name}</div>`;
            if (G.target !== null) ch += `<div class="ia-hint">Casa ${t.pos} → ${G.target} se acertar</div>`;
            const r = c.remaining();
            if (r !== null) ch += `<div class="ia-timer ${r <= 10 ? 'low' : ''}" id="timer">${Math.ceil(r)}</div><div class="tbar" style="width:70%"><i id="tbar" style="width:${r / (G.roundMs / 1000) * 100}%"></i></div>`;
            else ch += G.timeUp ? `<div class="ia-timer low">⏰</div><div class="ia-hint">Tempo esgotado!</div>` : `<div class="ia-hint">Esperando escolher: desenho ou mímica…</div>`;
          }
        }

        // quadro de desenho por cima do tabuleiro (um canvas por equipe que desenha)
        syncBoards(c);
        let easel = document.getElementById('ia-easel');
        const keys = G.mode === 'desenho' && G.boards ? Object.keys(G.boards) : [];
        if (keys.length && t && G.card) {
          center.innerHTML = '';
          const sig = G.round + ':' + keys.join(',');
          if (!easel) { easel = document.createElement('div'); easel.id = 'ia-easel'; easel.className = 'ia-easel'; board.appendChild(easel); easelSig = ''; }
          if (easelSig !== sig) {
            easelSig = sig;
            easel.innerHTML = '<div class="ia-easel-top" id="ia-easel-top"></div><div class="ia-easel-row" id="ia-easel-row"></div>';
            const row = document.getElementById('ia-easel-row');
            for (const key of keys) {
              const kk = ti(key);
              const card = document.createElement('div'); card.className = 'ia-card';
              card.appendChild(boards[key].cv);
              const lb = document.createElement('div'); lb.className = 'ia-card-lb'; lb.id = 'ia-lb-' + key;
              lb.innerHTML = `<span class="dot" style="background:${kk.hex}"></span>${kk.name}`;
              card.appendChild(lb);
              row.appendChild(card);
            }
            if (!fitBound) { fitBound = true; window.addEventListener('resize', fitEasel); }
          }
          const cat = G.categories[G.card.cat], r = c.remaining();
          let th = G.phase === 'allplay' ? `<div style="background:#1a1a1a;color:#fff;border-radius:12px;padding:.3em 1em;font-size:18px;font-size:clamp(11px,1.1vw,18px) /* tv-ok */">⚡ TODOS JOGAM</div>` : '';
          th += `<div class="ia-cat" style="background:${cat.color};color:${cat.text}">${cat.name}</div>`;
          if (G.target !== null) th += `<div class="ia-hint">Casa ${t.pos} → ${G.target}</div>`;
          if (r !== null) th += `<div class="ia-timer ${r <= 10 ? 'low' : ''}" id="timer">⏱ ${c.fmt(r)}</div><div class="tbar"><i id="tbar" style="width:${r / (G.roundMs / 1000) * 100}%"></i></div>`;
          else th += G.timeUp ? `<div class="ia-timer low">⏰</div><div class="ia-hint">Tempo esgotado!</div>` : '';
          document.getElementById('ia-easel-top').innerHTML = th;
          for (const key of keys) {
            const lb = document.getElementById('ia-lb-' + key), tt = G.teams.find(x => x.key === key), dn2 = drawerName(tt);
            if (lb) lb.innerHTML = `<span class="dot" style="background:${ti(key).hex}"></span>${ti(key).name}${dn2 ? `<small>✏️ ${esc(dn2)}</small>` : ''}`;
          }
          fitEasel();
        } else {
          if (easel) { easel.remove(); easelSig = ''; }
          center.innerHTML = ch;
        }

        // casa alvo + peão fantasma
        Array.prototype.slice.call(board.querySelectorAll('.ia-sq.active')).forEach(e => e.classList.remove('active'));
        let ghost = document.getElementById('ia-ghost');
        if (t && G.target !== null && ['draw', 'judge', 'allplay'].includes(G.phase)) {
          const el = document.getElementById('ia-sq' + G.target); if (el) el.classList.add('active');
          if (!ghost) { ghost = document.createElement('div'); ghost.id = 'ia-ghost'; ghost.className = 'ia-ghost'; board.appendChild(ghost); }
          const rc = PATH[G.target], row = rc.row, col = rc.col;
          ghost.style.left = cx(col) + '%'; ghost.style.top = pctY(cy(row));
          ghost.style.background = ti(t.key).hex + '55'; ghost.style.borderColor = ti(t.key).hex;
        } else if (ghost) ghost.remove();

        // peões
        const place = posMap => {
          const groups = {};
          for (const tt of G.teams) (groups[posMap[tt.key]] = groups[posMap[tt.key]] || []).push(tt.key);
          for (const tt of G.teams) {
            let el = document.getElementById('ia-pawn-' + tt.key);
            if (!el) { el = document.createElement('div'); el.id = 'ia-pawn-' + tt.key; el.className = 'ia-pawn'; el.style.background = ti(tt.key).hex; board.appendChild(el); }
            const gr = groups[posMap[tt.key]], k = gr.indexOf(tt.key), n = gr.length;
            const rc = PATH[posMap[tt.key]], row = rc.row, col = rc.col;
            const ox = n > 1 ? (k % 2 ? .3 : -.3) : 0, oy = n > 2 ? (k < 2 ? -.3 : .3) : 0;
            el.style.left = (cx(col) + ox * CW) + '%'; el.style.top = pctY(cy(row) + oy * CW);
          }
          for (const el of Array.prototype.slice.call(board.querySelectorAll('.ia-pawn'))) if (!G.teams.some(tt => 'ia-pawn-' + tt.key === el.id)) el.remove();
        };
        (function () {
          if (animating) return; animating = true;
          for (const tt of G.teams) if (shown[tt.key] === undefined) shown[tt.key] = tt.pos;
          function step() {
            let moved = false;
            for (const tt of G.teams) { if (shown[tt.key] < tt.pos) { shown[tt.key]++; moved = true; } else if (shown[tt.key] > tt.pos) { shown[tt.key] = tt.pos; moved = true; } }
            place(shown);
            if (moved) { c.beep(520, .05, 'square', .07); setTimeout(step, 260); }
            else animating = false;
          }
          step();
        })();

        // vitória
        let win = document.getElementById('ia-win');
        if (G.phase === 'win') {
          if (!win) { win = document.createElement('div'); win.id = 'ia-win'; win.className = 'ia-win'; board.appendChild(win); }
          win.innerHTML = `<div style="font-size:110px">🏆</div><h2 style="font-size:52px;color:${ti(G.winner).hex}">Equipe ${ti(G.winner).name} venceu!</h2><p class="sub">Toque em "Jogar de novo" no celular</p>`;
        } else if (win) win.remove();

        // aviso de troca de vez
        if (['roll', 'draw', 'allplay', 'judge'].includes(G.phase) && t) {
          const first = lastTurn === null;
          const mudou = !first && (G.turn !== lastTurn || G.round !== lastRound);
          lastTurn = G.turn; lastRound = G.round;
          if (mudou && G.phase === 'roll') {
            const k = ti(t.key), dn = drawerName(t);
            c.turnover(`<div class="round">Rodada ${G.round}</div>
              <div><small>🎨 AGORA É A VEZ DA EQUIPE</small><div class="who2" style="background:${k.hex};color:#111">${k.name}</div></div>
              ${dn ? `<div><small>✏️ QUEM FAZ A CARTA</small><div class="who2 sm" style="background:#fff;color:#111">${esc(dn)}</div></div>` : ''}`, 3200);
            c.chord([523, 659, 784]);
          }
        } else { lastTurn = G.turn; lastRound = G.round; }
      },
    },
  });
})();
