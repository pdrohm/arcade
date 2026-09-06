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
      background:linear-gradient(160deg,#f6f1e4,#e9e2d0); box-shadow:0 30px 60px #0009, inset 0 0 0 6px #fff8, inset 0 0 0 8px #c9bfa6; overflow:hidden; }
    .ia-sq { position:absolute; border-radius:14%; box-shadow:inset 0 -4px 0 #0002, inset 0 2px 0 #fff5, 0 2px 4px #0003; display:flex; align-items:center; justify-content:center; font-weight:900; color:#1a1a1a; font-size:clamp(9px,1.05vw,16px); }
    .ia-sq .n { position:absolute; right:9%; bottom:5%; font-size:clamp(7px,.7vw,11px); font-weight:800; opacity:.45; }
    .ia-sq.all::before { content:''; position:absolute; inset:22%; border-radius:50%; background:#fff; opacity:.9; }
    .ia-sq.all::after { content:'⚡'; position:absolute; font-size:clamp(10px,1.3vw,22px); }
    .ia-sq.start, .ia-sq.finish { background:#fff; color:#1a1a1a; text-align:center; line-height:1.1; }
    .ia-sq.finish { background:repeating-linear-gradient(45deg,#fff 0 8px,#ddd 8px 16px); }
    .ia-sq.active { animation:iaglow .9s infinite alternate; z-index:2; }
    @keyframes iaglow { from { box-shadow:0 0 0 3px #fff, 0 0 12px 4px #0006; } to { box-shadow:0 0 0 5px #fff, 0 0 26px 8px #0008; } }
    .ia-pawn { position:absolute; width:5.4%; aspect-ratio:1; border-radius:50%; border:3px solid #fff; box-shadow:0 5px 10px #0007, 0 0 0 2px #0004; transition:left .28s ease, top .28s ease; z-index:5; transform:translate(-50%,-50%); }
    .ia-ghost { position:absolute; width:5.4%; aspect-ratio:1; border-radius:50%; border:3px dashed #fff; z-index:4; transform:translate(-50%,-50%); animation:iagh 1s infinite alternate; pointer-events:none; }
    @keyframes iagh { from { opacity:.45; } to { opacity:.9; } }
    .ia-center { position:absolute; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2%; padding:2%; text-align:center; color:#1a1a1a; }
    .ia-logo { font-size:clamp(20px,2.6vw,40px); font-weight:900; line-height:1; } .ia-logo span { color:#f97316; }
    .ia-cat { border-radius:12px; padding:.5em 1.4em; font-weight:900; font-size:clamp(14px,1.8vw,28px); box-shadow:0 4px 10px #0003; }
    .ia-hint { color:#6b6252; font-size:clamp(12px,1.2vw,18px); font-weight:700; }
    .ia-timer { font-size:clamp(50px,7vw,120px); font-weight:900; line-height:1; font-variant-numeric:tabular-nums; color:#1a1a1a; }
    .ia-timer.low { color:#ef4444; animation:pulse .5s infinite alternate; }
    .ia-dice { width:clamp(50px,6.5vw,100px); aspect-ratio:1; border-radius:18%; background:#fff; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); padding:14%; gap:6%; box-shadow:0 6px 14px #0004; }
    .ia-dice i { border-radius:50%; background:#111; visibility:hidden; }
    .ia-dice.shake { animation:iashake .12s infinite; }
    @keyframes iashake { 0%{transform:rotate(-12deg)} 100%{transform:rotate(12deg)} }
    .ia-row { display:flex; align-items:center; gap:4%; }
    .ia-win { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#000c; z-index:20; gap:10px; border-radius:22px; }
  `;

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
        const svg = `<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 ${BH}" preserveAspectRatio="none">
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
        return `<style>${style}</style><div class="ia-board" id="ia-board" style="aspect-ratio:100 / ${BH}">${svg}${squares}
          <div class="ia-center" id="ia-center" style="left:${cl}%;top:${pctY(ct)};width:${cr - cl}%;height:${pctY(cb - ct)}"></div></div>`;
      },

      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm, hl = c.hl;
        const t = G.teams[G.turn];
        const ti = k => G.teamList.find(x => x.key === k);
        const drawerName = tt => { const pid = tt && G.drawers[tt.key]; const p = pid && c.C.players.find(x => x.pid === pid); return p ? p.name : null; };
        let side = `<div class="box"><p class="sub mut">${G.phase === 'setup' ? 'Escolhendo as equipes' : 'Rodada ' + G.round}</p>
          ${t && G.phase !== 'setup' ? `<div style="display:flex;align-items:center;gap:12px;margin-top:8px"><span class="dot" style="background:${ti(t.key).hex};width:34px;height:34px"></span><b style="font-size:26px;color:${ti(t.key).hex}">${ti(t.key).name}</b></div>` : ''}</div>`;

        side += `<div class="box">${G.teams.length ? `<div class="players">${G.teams.map((tt, i) => `
          <div class="pl" style="border-color:${i === G.turn && G.phase !== 'setup' ? '#fff' : 'transparent'}">
            <span class="dot" style="background:${ti(tt.key).hex}"></span>
            <b>${ti(tt.key).name}</b><span>casa ${tt.pos} · ${tt.players.length} 📱</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 6px 8px 14px">${tt.players.map((pid, k) => {
            const p = c.C.players.find(x => x.pid === pid);
            const now = G.drawers[tt.key] === pid && G.phase !== 'setup';
            return p ? `<span class="nm" style="${now ? 'background:#fbbf24;color:#111' : 'background:#ffffff12;color:#cbd5e1'};font-size:14px">${k + 1}. ${esc(p.name)}${now ? ' ✏️' : ''}${p.on === false ? ' 📵' : ''}</span>` : '';
          }).join('')}</div>`).join('')}</div>` : '<p class="sub center">Nenhuma equipe ainda. Escolham no celular!</p>'}</div>`;

        side += `<div class="event">${c.C.event ? hl(c.C.event.text) : ''}</div>`;
        side += `<div class="box" style="margin-top:auto"><p class="sub mut" style="margin-bottom:8px">Categorias</p>
          <div style="display:flex;flex-direction:column;gap:7px">${Object.keys(G.categories).map(kk => G.categories[kk]).map(k => `<div style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700"><i style="width:22px;height:22px;border-radius:6px;background:${k.color};display:inline-block"></i>${k.name}</div>`).join('')}
          <div style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700"><i style="width:22px;height:22px;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center">⚡</i>Todos jogam</div></div></div>`;
        return { side };
      },

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
            <div style="text-align:left"><div class="ia-hint">Vez da equipe</div><div style="font-size:clamp(14px,1.8vw,28px);font-weight:900">${k.name}</div></div>
            <div style="margin-left:1.5vw">${dice(G.dice, G.phase === 'rolling')}</div></div>`;
          const dn = drawerName(t);
          if (dn) ch += `<div class="ia-hint">✏️ ${esc(dn)} ${G.phase === 'roll' ? 'joga o dado e desenha' : 'desenha'}</div>`;
          if (G.phase === 'roll') ch += `<div class="ia-hint">Jogue o dado no celular 🎲</div>`;
          if (G.card) {
            const cat = G.categories[G.card.cat];
            if (G.phase === 'allplay') ch += `<div style="background:#1a1a1a;color:#fff;border-radius:12px;padding:.3em 1em;font-weight:900;font-size:clamp(12px,1.3vw,20px)">⚡ TODOS JOGAM</div>`;
            ch += `<div class="ia-cat" style="background:${cat.color};color:${cat.text}">${cat.name}</div>`;
            if (G.target !== null) ch += `<div class="ia-hint">Casa ${t.pos} → ${G.target} se acertar</div>`;
            const r = c.remaining();
            if (r !== null) ch += `<div class="ia-timer ${r <= 10 ? 'low' : ''}" id="timer">${Math.ceil(r)}</div><div class="tbar" style="width:70%"><i id="tbar" style="width:${r / (G.roundMs / 1000) * 100}%"></i></div>`;
            else ch += G.timeUp ? `<div class="ia-timer low">⏰</div><div class="ia-hint">Tempo esgotado!</div>` : `<div class="ia-hint">Esperando começar a desenhar…</div>`;
          }
        }
        center.innerHTML = ch;

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
              <div><small>🎨 AGORA DESENHA A EQUIPE</small><div class="who2" style="background:${k.hex};color:#111">${k.name}</div></div>
              ${dn ? `<div><small>✏️ QUEM DESENHA</small><div class="who2 sm" style="background:#fff;color:#111">${esc(dn)}</div></div>` : ''}`, 3200);
            c.chord([523, 659, 784]);
          }
        } else { lastTurn = G.turn; lastRound = G.round; }
      },
    },
  });
})();
