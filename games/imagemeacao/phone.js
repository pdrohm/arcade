// Imagem e Ação — tela do celular.
// Quem faz a carta escolhe: desenhar (quadro aqui, o desenho aparece na TV) ou mímica.
'use strict';
(() => {
  let reveal = false, lastRound = -1, ovTurn = null, ovRound = null, keyN = 0;

  const style = `
    .ia-word { font-size:46px; font-weight:900; text-align:center; padding:26px 10px; border-radius:14px; background:#0b0e17; border:2px dashed #2a3350; text-transform:uppercase; line-height:1.1; word-break:break-word; }
    .ia-word.hid { color:#e5e7eb; font-size:22px; font-weight:600; text-transform:none; }
    .ia-word.sm { font-size:30px; padding:14px 10px; }
    .ia-cat { border-radius:14px; padding:18px; text-align:center; font-weight:900; font-size:26px; }
    .ia-dice { width:110px; height:110px; margin:0 auto; border-radius:18px; background:#fff; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); padding:12px; gap:4px; }
    .ia-dice i { border-radius:50%; background:#111; visibility:hidden; }
    .ia-dice.shake { animation:iashake .12s infinite; }
    @keyframes iashake { 0%{transform:rotate(-8deg)} 100%{transform:rotate(8deg)} }
    .ia-teams { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ia-team { border-radius:16px; padding:18px 12px; text-align:center; font-weight:900; font-size:22px; color:#111; border:4px solid transparent; }
    .ia-team.sel { border-color:#fff; box-shadow:0 0 0 3px #0008; }
    .ia-team small { display:block; font-weight:700; font-size:14px; opacity:.85; margin-top:6px; }
    .ia-modes { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ia-mode { border-radius:18px; padding:22px 10px; text-align:center; font-weight:900; font-size:22px; color:#fff; line-height:1.15; }
    .ia-mode small { display:block; font-weight:600; font-size:13px; opacity:.85; margin-top:6px; }
    .ia-mode .em { font-size:44px; display:block; margin-bottom:6px; }
    .ia-wrap { position:relative; width:100%; aspect-ratio:1; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px #0008; touch-action:none; }
    .ia-wrap canvas { position:absolute; inset:0; width:100%; height:100%; touch-action:none; }
    .ia-tools { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .ia-cor { width:38px; height:38px; border-radius:50%; border:3px solid transparent; box-shadow:0 0 0 1px #0008 inset; flex:none; }
    .ia-cor.sel { border-color:#fff; box-shadow:0 0 0 3px #f59e0b; }
    .ia-sz { width:44px; height:44px; border-radius:12px; background:#2a3350; display:flex; align-items:center; justify-content:center; flex:none; font-size:22px; }
    .ia-sz.sel { background:#f59e0b; }
    .ia-sz.off { opacity:.3; }
    .ia-sz i { display:block; border-radius:50%; background:#fff; }
    .ia-sz.sel i { background:#111; }
    .ia-live { display:flex; align-items:center; gap:8px; font-size:14px; color:#94a3b8; }
    .ia-live i { width:10px; height:10px; border-radius:50%; background:#22c55e; animation:ialive 1s infinite alternate; }
    @keyframes ialive { from { opacity:.3 } to { opacity:1 } }
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
  const TOOLS = [['pen', '✏️', 'caneta'], ['eraser', '🧽', 'borracha'], ['line', '📏', 'reta'], ['rect', '▭', 'retângulo'], ['circle', '◯', 'círculo']];
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
    return `<div class="ia-tools">${CORES.map(c => `<div class="ia-cor ${tool !== 'eraser' && cor === c ? 'sel' : ''}" style="background:${c}" data-a="tcor" data-c="${c}"></div>`).join('')}</div>
      <div class="ia-tools">${TOOLS.map(t => `<div class="ia-sz ${tool === t[0] ? 'sel' : ''}" data-a="tool" data-k="${t[0]}" title="${t[2]}">${t[1]}</div>`).join('')}
        <span style="flex:1"></span>
        <div class="ia-sz ${s.stack.length ? '' : 'off'}" data-a="undo" title="desfazer">↶</div><div class="ia-sz ${s.redo.length ? '' : 'off'}" data-a="redo" title="refazer">↷</div><div class="ia-sz" data-a="limpar" title="limpar tudo">🗑</div></div>
      <div class="ia-tools"><span class="sub mut">Traço</span>${[4, 8, 16, 28].map(t => `<div class="ia-sz ${tam === t ? 'sel' : ''}" data-a="tam" data-t="${t}"><i style="width:${Math.min(30, t + 4)}px;height:${Math.min(30, t + 4)}px"></i></div>`).join('')}</div>`;
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
        const offline = tt => { const p = drawerP(tt); return p && p.on === false ? `<div class="box center" style="border-color:#ef4444"><div class="big-emoji">📵</div><p class="sub"><b>${esc(p.name)}</b> está sem conexão. A vez é dele: ninguém joga no lugar.</p></div>` : ''; };
        if (G.round !== lastRound) { reveal = false; lastRound = G.round; }
        const modeTxt = G.mode === 'mimica' ? 'fazendo mímica' : 'desenhando';
        const modeEm = G.mode === 'mimica' ? '🎭' : '🎨';
        const picker = () => `<div class="box hi"><p class="sub center" style="margin-bottom:12px">Como você vai mostrar a palavra?</p>
          <div class="ia-modes"><div class="ia-mode" style="background:#16a34a" data-a="desenho"><span class="em">🎨</span>Desenhar<small>aqui no celular, aparece na TV</small></div>
          <div class="ia-mode" style="background:#2563eb" data-a="mimica"><span class="em">🎭</span>Mímica<small>só o cronômetro</small></div></div>
          <p class="sub mut center" style="margin-top:10px">O tempo começa quando você escolher.</p></div>`;
        const board = () => `<div class="ia-live"><i></i>O que você desenha aparece na TV ao vivo</div>
          <div class="ia-wrap"><canvas id="ia-cv"></canvas></div><div id="ia-tools">${toolsHtml()}</div>`;

        // ---------- escolher equipe ----------
        if (G.phase === 'setup') {
          return `<div class="box"><p class="sub center">Escolha sua equipe. Dentro dela, a ordem de fazer a carta é a ordem de entrada.</p></div>
            <div class="ia-teams">${G.teamList.map(k => {
              const tt = G.teams.find(x => x.key === k.key);
              return `<div class="ia-team ${G.myTeam === k.key ? 'sel' : ''}" style="background:${k.hex}" data-a="time" data-k="${k.key}">${k.name}
                <small>${tt ? tt.players.map(pid => { const p = c.C.players.find(x => x.pid === pid); return p ? esc(p.name) : ''; }).filter(Boolean).join(', ') : 'vazia'}</small></div>`;
            }).join('')}</div>
            <button class="btn big ok" data-a="begin" ${G.teams.length < 2 ? 'disabled' : ''}>▶ Começar o jogo</button>
            ${G.teams.length < 2 ? '<p class="sub center mut">Precisa de 2 equipes ou mais.</p>' : ''}
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- vitória ----------
        if (G.phase === 'win') {
          const k = ti(G.winner);
          return `<div class="box center"><div class="big-emoji">🏆</div><h2 style="margin:8px 0;font-size:30px;color:${k.hex}">Equipe ${k.name} venceu!</h2></div>
            <button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
        }

        const k = t ? ti(t.key) : null;
        let h = `<div class="box"><div style="display:flex;align-items:center;gap:12px">
          <span class="dot" style="background:${k.hex};width:30px;height:30px"></span>
          <div><p class="sub mut">Vez da equipe</p><b style="font-size:24px;color:${k.hex}">${k.name}</b></div>
          <div style="margin-left:auto;text-align:right"><p class="sub mut">Casa ${t.pos}${G.target !== null ? ` → <b>${G.target}</b>` : ''}</p>
          ${dOf(t) ? `<p class="sub">✏️ ${esc(dOf(t))}</p>` : ''}</div></div></div>`;

        if (G.phase === 'rolling') return h + `<div class="box center"><p class="sub">Rolando…</p>${dice(null, true)}</div>`;

        if (G.phase === 'roll') {
          if (isMyTurn && G.amDrawer) h += `<div class="box hi center"><p class="sub">🎨 É a sua vez de fazer a carta!</p>${dice(G.dice)}</div><button class="btn big warn" data-a="roll">🎲 Jogar o dado</button>`;
          else if (isMyTurn) h += `<div class="box center"><p class="sub">Sua equipe joga agora</p><h2 style="margin:8px 0;font-size:26px">✏️ ${esc(dOf(t) || '?')}</h2><p class="sub">Ele joga o dado e desenha ou faz mímica. Você adivinha!</p></div>` + offline(t);
          else h += `<div class="box center"><p class="sub">Esperando a equipe <b style="color:${k.hex}">${k.name}</b> jogar o dado…</p></div>`;
        } else if (G.phase === 'allplay') {
          const cat = G.categories[G.card.cat];
          h += `<div class="ia-cat" style="background:#fff;color:#111">⚡ TODOS JOGAM</div>
            <div class="ia-cat" style="background:${cat.color};color:${cat.text}">${cat.name}</div>
            <p class="sub center">Todas as equipes ${G.mode ? 'estão ' + modeTxt : 'mostram a mesma palavra'}. Quem acertar primeiro anda <b>${G.dice}</b> casa${G.dice === 1 ? '' : 's'}!</p>`;
          if (G.amDrawer) {
            const on = canvasOn(c);
            h += `<p class="sub center">✏️ Você faz a carta pela equipe ${mine ? ti(mine.key).name : ''}.</p>`;
            if (on) h += `<div class="ia-word sm">${esc(G.card.word)}</div>`;
            else h += reveal ? `<div class="ia-word" data-a="esconder">${esc(G.card.word)}</div>` : `<div class="ia-word hid" data-a="ver">👆 Toque para ver a palavra<br><small>(só quem faz a carta!)</small></div>`;
            if (c.C.timerEnd) h += c.timerHtml('', G.roundMs);
            if (on) h += board();
          } else h += `<div class="box center"><p class="sub">${modeEm} <b>${esc(dOf(mine) || 'Alguém')}</b> ${G.mode ? 'está ' + modeTxt : 'faz a carta'} pela sua equipe. Você adivinha!</p></div>` + offline(mine);
          if (!c.C.timerEnd) {
            if (isMyTurn && G.amDrawer) h += picker() + `<button class="btn ghost" data-a="swap">🔁 Trocar carta</button>`;
            else h += `<p class="sub center mut">Esperando ${esc(dOf(t) || 'a equipe ' + k.name)} escolher desenho ou mímica…</p>`;
          } else {
            if (!G.amDrawer) h += c.timerHtml('', G.roundMs);
            h += `<button class="btn big ok" data-a="allwin">🙋 Acertamos!</button>`;
            if (isMyTurn && G.amDrawer) h += `<button class="btn ghost" data-a="allnone">Ninguém acertou → passar a vez</button>`;
          }
        } else {  // draw | judge
          const cat = G.categories[G.card.cat];
          h += `<div class="ia-cat" style="background:${cat.color};color:${cat.text}">${cat.name}</div>`;
          if (isMyTurn && G.amDrawer) {
            const on = canvasOn(c);
            if (on) h += `<div class="ia-word sm">${esc(G.card.word)}</div>`;
            else h += reveal ? `<div class="ia-word" data-a="esconder">${esc(G.card.word)}</div>` : `<div class="ia-word hid" data-a="ver">👆 Toque para ver a palavra<br><small>(só você vê!)</small></div>`;
            if (G.phase === 'draw' && !c.C.timerEnd) h += picker() + `<button class="btn ghost" data-a="swap">🔁 Trocar carta</button>`;
            else {
              h += G.timeUp ? `<div class="big-emoji">⏰</div><p class="sub center">Tempo esgotado!</p>` : c.timerHtml(G.mode === 'mimica' ? '🎭 Mímica valendo!' : '', G.roundMs);
              if (on) h += board();
              h += `<div class="row"><button class="btn big ok" data-a="ok">✔ Acertou</button><button class="btn big no" data-a="fail">✘ Errou</button></div>`;
            }
          } else if (isMyTurn) {
            h += offline(t) + `<div class="box center"><div class="big-emoji">${G.mode ? modeEm : '🙈'}</div><p class="sub"><b>${esc(dOf(t) || 'Alguém')}</b> ${G.mode ? 'está ' + modeTxt : 'vai fazer a carta'} pela sua equipe.<br>${G.mode === 'desenho' ? 'Olhe o desenho na TV e adivinhe!' : 'Adivinhe! Você não vê a palavra.'}</p></div>`;
            h += G.timeUp ? '<p class="sub center">⏰ Tempo esgotado</p>' : c.timerHtml('', G.roundMs);
          } else {
            h += `<div class="box center"><div class="big-emoji">${G.mode ? modeEm : '🤫'}</div><p class="sub">A equipe <b style="color:${k.hex}">${k.name}</b> ${G.mode ? 'está ' + modeTxt : 'está na vez'}.<br>Olhe para a TV!</p></div>`;
            h += G.timeUp ? '<p class="sub center">⏰ Tempo esgotado</p>' : c.timerHtml('', G.roundMs);
          }
        }

        h += `<p class="sub center" id="ia-event">${c.C.event ? c.hl(c.C.event.text) : ''}</p>
          <div class="box">${G.teams.map(tt => {
            const kk = ti(tt.key);
            return `<div class="pl" style="border-color:${tt === t ? '#fff' : 'transparent'}"><span class="dot" style="background:${kk.hex}"></span><b>${kk.name}</b><span>casa ${tt.pos}</span></div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 6px 10px 14px">${tt.players.map((pid, i) => {
                const p = c.C.players.find(x => x.pid === pid);
                const now = G.drawers[tt.key] === pid;
                return p ? `<span class="nm" style="${now ? 'background:#fbbf24;color:#111' : 'background:#ffffff12;color:#cbd5e1'};font-size:15px">${i + 1}. ${esc(p.name)}${now ? ' ✏️' : ''}${p.on === false ? ' 📵' : ''}</span>` : '';
              }).join('')}</div>`;
          }).join('')}</div>`;
        return h;
      },

      after(c) {
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
        } else if (cv) { flush(); cv = null; cx2 = null; stroke = null; }

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
          <div><small>🎨 AGORA É A VEZ DA EQUIPE</small><span class="who2" style="background:${k.hex};color:#111">${k.name}</span></div>
          ${p ? `<div><small>✏️ QUEM FAZ A CARTA</small><span class="who2 sm" style="background:#fff;color:#111">${c.esc(p.name)}</span></div>` : ''}
          ${euDesenho ? '<div class="mine">✏️ É você quem faz a carta!</div>' : ''}`,
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
