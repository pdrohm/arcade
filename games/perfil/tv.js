// Perfil — tela da TV.
'use strict';
(() => {
  const COLS = 13, ROWS = 10, PAD = 1.6, GAP = 0.9, CW = (100 - 2 * PAD - (COLS - 1) * GAP) / COLS;
  const BH = 2 * PAD + (ROWS - 1) * GAP + ROWS * CW;
  const cell = i => { const row = Math.floor(i / COLS), c = i % COLS; return { row, col: row % 2 ? COLS - 1 - c : c }; };
  const cx = col => PAD + col * (CW + GAP) + CW / 2, cy = row => PAD + row * (CW + GAP) + CW / 2;
  const pctY = v => (v / BH * 100) + '%';

  const shown = {};
  let animating = false, lastAlert = '', alertT = null, lastRound = null, lastTurn = null, lastMed = null;

  // visual "fliperama de papel": tabuleiro branco de borda grossa, casas quadradas, sombra dura; destaque na cor de palavras (#3db4f2)
  const style = `
    /* TV antiga (sem aspect-ratio): um espaçador dá a altura do tabuleiro (padding % = largura do tabuleiro) */
    .pf-board::before { content:''; display:block; padding-top:${BH}%; }
    @supports (aspect-ratio:1) { .pf-board::before { display:none; } }
    .pf-board { position:relative; width:100%; max-width:calc((100vh - 60px) * 13 / 10.4); background:#fff; border:6px solid #0f0f14; box-shadow:12px 12px 0 #0f0f14; }
    .pf-board .track { position:absolute; top:0; left:0; width:100%; height:100%; }
    .pf-sq { position:absolute; background:#fff; border:2px solid #0f0f14; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-weight:700; color:#8a8a92; font-size:.65rem; }
    .pf-sq.tens { background:#e4e2d9; color:#0f0f14; font-size:.95rem; }
    .pf-sq.bonus { background:#ffce1f; color:#0f0f14; font-size:1.6rem; border-width:3px; box-shadow:3px 3px 0 #0f0f14; }
    .pf-sq.start { background:#35d07f; color:#0f0f14; font-family:'JetBrains Mono',monospace; font-size:.6rem; text-align:center; line-height:1.05; }
    .pf-sq.finish { background:repeating-linear-gradient(45deg,#0f0f14 0 6px,#fff 6px 12px); color:#0f0f14; font-family:'JetBrains Mono',monospace; font-size:.62rem; text-align:center; line-height:1.05; }
    .pf-sq.finish span { background:#fff; padding:1px 3px; border:2px solid #0f0f14; }
    .pf-arrow { position:absolute; transform:translate(-50%,-50%); color:#0f0f14; font-weight:900; opacity:.35; pointer-events:none; }
    .pf-pawn { position:absolute; width:4.2%; border:3px solid #0f0f14; box-shadow:3px 3px 0 #0f0f14; transition:left .35s ease, top .35s ease; z-index:5; transform:translate(-50%,-50%); }
    .pf-pawn { aspect-ratio:1; } /* tv-ok */
    /* TV antiga (sem aspect-ratio): um espaçador de largura zero dá a altura ao peão e à casinha do número */
    .pf-pawn::before { content:''; display:block; padding-top:100%; }
    .pf-pawn { overflow:hidden; } .pf-pawn .avatar { position:absolute; left:0; top:0; width:100% !important; height:100% !important; }
    .pf-pawn.hop { animation:pfhop .3s; }
    @keyframes pfhop { 50% { transform:translate(-50%,-95%) scale(1.15); } }
    /* 10 colunas com 5px de vão, na conta (calc a TV tem): igualzinho ao grid de baixo */
    .pf-nums { display:flex; flex-wrap:wrap; margin-bottom:-5px; }
    .pf-nums { display:grid; grid-template-columns:repeat(10,1fr); gap:5px; } /* tv-ok */
    .pf-num { width:calc((100% - 45px) / 10); margin:0 5px 5px 0; background:#fff; border:2px solid #0f0f14; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:16px; color:#0f0f14; }
    .pf-num::before { content:''; display:block; padding-top:100%; }
    .pf-num:nth-child(10n) { margin-right:0; }
    .pf-num { aspect-ratio:1; } /* tv-ok */
    @supports (display:grid) { .pf-nums { margin-bottom:0; } .pf-num { width:auto; margin:0; } .pf-num::before { display:none; } }
    @supports (aspect-ratio:1) { .pf-pawn::before { display:none; } }
    .pf-num.used { background:#e4e2d9; color:#8a8a92; border-color:#b9b7ae; text-decoration:line-through; }
    .pf-num.sp { background:#b08cff; color:#0f0f14; border-color:#0f0f14; text-decoration:none; }
    .pf-num.last { background:#ffce1f; color:#0f0f14; border-color:#0f0f14; box-shadow:3px 3px 0 #0f0f14; text-decoration:none; }
    .pf-lab { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; }
    .pf-clue { font-size:22px; font-weight:800; line-height:1.25; }
    .pf-clue small { display:block; font-family:'JetBrains Mono',monospace; color:#55555e; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:6px; }
    .pf-clue small .nm { font-family:'Archivo',sans-serif; font-size:13px; letter-spacing:0; text-transform:none; }
    .box.pf-auto { background:#b08cff; }
    .box.pf-auto .pf-clue small { color:#0f0f14; }
    .pf-alert { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:#b08cff; border:6px solid #0f0f14; padding:2rem 2.6rem; text-align:center; z-index:15; box-shadow:14px 14px 0 #0f0f14; max-width:80%; animation:pfpop .35s; }
    .pf-alert small { display:block; font-family:'JetBrains Mono',monospace; color:#0f0f14; font-weight:700; letter-spacing:.12em; font-size:1rem; }
    .pf-alert .t { font-family:'Archivo',sans-serif; font-size:3rem; font-weight:900; font-stretch:125%; text-transform:uppercase; color:#0f0f14; margin:1rem 0; line-height:1; }
    .pf-alert p { color:#0f0f14; font-size:1.2rem; font-weight:700; margin:0; }
    @keyframes pfpop { from { transform:translate(-50%,-50%) scale(.6); opacity:0; } }
    .pf-win { position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(241,240,234,0.96); z-index:20; }
    .pf-win > * + * { margin-top:1.4rem; }
    .pf-win h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:4.6rem; line-height:1; background:#ffce1f; border:6px solid #0f0f14; box-shadow:12px 12px 0 #0f0f14; padding:.6rem 1.6rem .8rem; }
    .pf-win p { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.2rem; letter-spacing:.1em; text-transform:uppercase; color:#55555e; }
    /* linhas com espaço entre os filhos, no lugar do gap */
    .pf-papeis { margin-top:12px; }
    .pf-papeis > div { display:flex; align-items:center; font-size:18px; }
    .pf-papeis > div > * + * { margin-left:8px; }
    .pf-papeis > * + * { margin-top:8px; }
    .pf-role { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; background:#0f0f14; color:#ffce1f; padding:2px 6px; letter-spacing:.06em; text-transform:uppercase; }
    .pf-pedidas { display:flex; flex-wrap:wrap; margin-bottom:-6px; }
    .pf-pedidas > * { margin:0 6px 6px 0; }
    /* as bolinhas de "dicas já pedidas" são pílulas: sem quadrado, sem espaçador */
    .pf-num.pill { width:38px; padding:4px 0; margin:0 6px 6px 0; text-decoration:none; }
    .pf-num.pill::before { display:none; }
    .pf-num.pill { aspect-ratio:auto; } /* tv-ok */
    .pf-especiais { margin-top:8px; }
    .pf-especiais > * + * { margin-top:6px; }
    .pf-especiais b { font-family:'Pixelify Sans',monospace; background:#b08cff; border:2px solid #0f0f14; padding:0 5px; margin-right:6px; }
    .pf-cat { display:inline-block; padding:5px 12px; border:3px solid #0f0f14; font-weight:900; font-stretch:115%; text-transform:uppercase; font-size:16px; color:#0f0f14; }
    .pf-chip { display:inline-block; width:12px; height:12px; background:#3db4f2; border:2px solid #0f0f14; margin-left:3px; vertical-align:middle; }
    .pl.pf-med { background:#ffce1f; }
    .pl .pf-role { color:#ffce1f; font-size:11px; }
    .pl.pf-turn { background:#d7effc; }
    .pf-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; border-width:4px; box-shadow:8px 8px 0 #0f0f14; padding:12px 16px; }
    .pf-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:36px; line-height:.95; }
    .pf-head .mono { font-size:13px; }
  `;

  ARCADE.register('perfil', {
    tv: {
      mount(c) {
        const G = c.G;
        const pts = G.board.map(sq => { const rc = cell(sq.i), row = rc.row, col = rc.col; return [cx(col), cy(row)]; });
        const line = pts.map(p => p.join(',')).join(' ');
        let arrows = '';
        for (let i = 0; i < G.board.length - 1; i++) {
          const a = cell(i), b = cell(i + 1);
          const x = (cx(a.col) + cx(b.col)) / 2, y = (cy(a.row) + cy(b.row)) / 2;
          arrows += `<div class="pf-arrow" style="left:${x}%;top:${pctY(y)};font-size:11px;font-size:clamp(6px,.75vw,11px)/* tv-ok */">${b.row !== a.row ? '▼' : (b.col > a.col ? '▶' : '◀')}</div>`;
        }
        const squares = G.board.map(sq => {
          const rc = cell(sq.i), row = rc.row, col = rc.col;
          const tens = sq.i > 0 && sq.i % 10 === 0 && !sq.bonus && !sq.finish;
          const cls = ['pf-sq', sq.bonus ? 'bonus' : '', tens ? 'tens' : '', sq.start ? 'start' : '', sq.finish ? 'finish' : ''].join(' ');
          const label = sq.start ? 'INÍCIO' : sq.finish ? '<span>FIM</span>' : sq.bonus ? '?' : (tens ? sq.i : '');
          return `<div class="${cls}" style="left:${cx(col) - CW / 2}%;top:${pctY(cy(row) - CW / 2)};width:${CW}%;height:${pctY(CW)}">${label}</div>`;
        }).join('');
        return `<style>${style}</style>
          <div class="pf-board" id="pf-board" style="aspect-ratio:100 / ${BH}/* tv-ok */">
            <svg class="track" viewBox="0 0 100 ${BH}" preserveAspectRatio="none">
              <polyline points="${line}" fill="none" stroke="#e4e2d9" stroke-width="${CW * 1.15}" stroke-linejoin="miter" stroke-linecap="square"/>
              <polyline points="${line}" fill="none" stroke="#0f0f14" stroke-width="0.25" stroke-dasharray="1.2 1.2" stroke-linejoin="round" opacity=".35"/>
            </svg>${arrows}${squares}
          </div><div id="pf-overlay"></div>`;
      },

      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm, hl = c.hl;
        const ply = i => c.C.players.find(p => p.pid === G.order[i]);
        const m = ply(G.mediator), g = ply(G.turn);
        const cat = G.categories[G.card ? G.card.cat : 'P'];
        const L = G.last;
        const nums = (card, lastN) => `<div class="pf-nums">${card.slots.map(x => `<div class="pf-num ${x.used ? 'used' : ''} ${x.used && x.type && x.type !== 'clue' ? 'sp' : ''} ${x.n === lastN ? 'last' : ''}">${x.n}</div>`).join('')}</div>`;

        let side = `<div class="box pf-head"><div style="display:flex;justify-content:space-between;align-items:center">
            <span class="mono">PALAVRAS · RODADA <span class="pix" style="font-size:17px">${G.round}</span></span>
            ${G.card ? `<span class="pf-cat" style="background:${cat.color}">${cat.name}</span>` : ''}</div><h2 style="margin-top:6px">Perfil</h2></div>
          <div class="box" style="padding:12px 14px"><div class="pf-papeis" style="margin-top:0">
            <div>${c.avatar(m, 34)} ${nm(m)} <span class="pf-role">mediador</span></div>
            <div>${c.avatar(G.phase === 'chip' && G.chip ? c.C.players.find(p => p.pid === G.chip.player) : g, 34)} ${G.phase === 'chip' && G.chip ? nm(c.C.players.find(p => p.pid === G.chip.player)) + ' <span class="pf-role">ficha azul</span>' : nm(g) + ' <span class="pf-role">adivinha</span>'}</div>
          </div></div>${c.timerHtml('', G.turnMs)}`;

        if ((G.phase === 'bonus' || G.phase === 'bonusguess') && G.bonus) {
          const b = G.bonus, bp = c.C.players.find(p => p.pid === b.player), bj = c.C.players.find(p => p.pid === b.judge);
          const bk = G.categories[b.card.cat];
          side += `<div class="box warn"><div class="center disp" style="font-size:28px">Carta bônus</div>
            <p class="sub center" style="margin-top:6px">${nm(bp)} escolhe até 5 dicas · ${nm(bj)} lê e julga</p>
            <div class="center" style="margin:10px 0"><span class="pf-cat" style="background:${bk.color}">${bk.name}</span>
              <span class="mono" style="font-size:13px;margin-left:8px">${b.picks.length}/5 · VALE ${G.bonusTable[Math.max(0, b.picks.length - 1)]} CASAS</span></div>
            ${nums(b.card, b.picks.length ? b.picks[b.picks.length - 1].n : 0)}
            <p class="sub center" style="margin-top:10px;color:#0f0f14">Dicas pedidas: <b class="pix">${b.picks.map(x => x.n).join(', ') || '—'}</b></p>
            ${G.phase === 'bonusguess' ? '<div class="center disp" style="font-size:26px;margin-top:10px">Palpite!</div>' : ''}</div>`;
        } else if (G.card) {
          side += `<div class="box">${nums(G.card, L ? L.n : 0)}<p class="pf-lab" style="margin-top:10px"><b class="pix" style="color:#0f0f14;font-size:15px">${G.usedCount}</b> dica${G.usedCount !== 1 ? 's' : ''} usada${G.usedCount !== 1 ? 's' : ''} · acertar agora vale <b class="pix" style="color:#0f0f14;font-size:15px">${G.clues - G.usedCount}</b> casa${G.clues - G.usedCount !== 1 ? 's' : ''}</p></div>`;
          if (L) side += `<div class="box ${L.type !== 'clue' ? 'pf-auto' : ''}">
              <div class="pf-clue"><small>${L.type !== 'clue' ? 'Instrução automática · ' : ''}Dica ${L.n} · pedida por ${hl(L.by)}</small>${L.text ? esc(L.text) : `${nm(m)} lê a dica em voz alta`}</div>
              ${G.phase === 'guess' ? `<p class="sub" style="margin-top:8px;color:#0f0f14">${nm(g)} pode dar 1 palpite. ${nm(m)} julga.</p>` : ''}
              ${G.phase === 'chip' ? `<p class="sub" style="margin-top:8px;color:#0f0f14"><span class="pf-chip"></span> Palpite da ficha azul!</p>` : ''}
              ${G.phase === 'choose' ? `<p class="sub" style="margin-top:8px">${nm(g)} está escolhendo um jogador…</p>` : ''}
              ${G.phase === 'pick' ? `<p class="sub" style="margin-top:8px">${nm(g)} escolhe um número de 1 a 20.</p>` : ''}</div>`;
          else side += `<div class="box"><div class="pf-clue"><small>Nova carta</small>${nm(g)} escolhe um número de 1 a 20 no celular.</div></div>`;
          const especiais = G.revealed.filter(r => r.type !== 'clue');
          if (G.revealed.length > 1) side += `<div class="box"><p class="pf-lab" style="margin-bottom:8px">Dicas já pedidas</p>
            <div class="pf-pedidas">${G.revealed.map(r => `<span class="pf-num pill ${r.type !== 'clue' ? 'sp' : ''}">${r.n}</span>`).join('')}</div>
            ${especiais.length ? `<div class="pf-especiais">${especiais.map(r => `<div class="sub" style="color:#0f0f14;font-size:15px"><b>${r.n}</b>${esc(r.text)}</div>`).join('')}</div>` : ''}</div>`;
        }

        side += `<div class="box">${c.playersHtml({
          tag: p => { const i = G.order.indexOf(p.pid); return (i === G.mediator ? ' <span class="pf-role">mediador</span>' : '') + (i === G.turn && i !== G.mediator ? ' <span class="pf-role">vez</span>' : ''); },
          info: p => `casa <b class="pix" style="color:#0f0f14;font-size:18px">${G.pos[p.pid] || 0}</b>${G.chips[p.pid] ? ' ' + '<span class="pf-chip"></span>'.repeat(G.chips[p.pid]) : ''}`,
          cls: p => { const i = G.order.indexOf(p.pid); return i === G.mediator ? 'pf-med' : (i === G.turn ? 'pf-turn' : ''); },
        })}</div>
        <div class="event">${c.C.event ? hl(c.C.event.text) : ''}</div>`;
        return { side };
      },

      after(c) {
        const G = c.G;
        const board = document.getElementById('pf-board');
        if (!board) return;
        // peões
        const groups = {};
        for (const pid of G.order) { const p = c.C.players.find(x => x.pid === pid); if (p) (groups[G.pos[pid] || 0] = groups[G.pos[pid] || 0] || []).push(pid); }
        const place = posMap => {
          for (const pid of G.order) {
            const p = c.C.players.find(x => x.pid === pid); if (!p) continue;
            let el = document.getElementById('pf-pawn-' + pid);
            if (!el) { el = document.createElement('div'); el.id = 'pf-pawn-' + pid; el.className = 'pf-pawn'; board.appendChild(el); }
            el.style.background = c.ci(p.color).hex;
            if (el.getAttribute('data-av') !== JSON.stringify(p.av)) { el.setAttribute('data-av', JSON.stringify(p.av)); el.innerHTML = c.avatar(p, 40); }
            const at = posMap[pid] || 0, gr = Object.keys(groups).length ? (groups[G.pos[pid] || 0] || [pid]) : [pid];
            const k = gr.indexOf(pid), n = gr.length;
            const rc = cell(at), row = rc.row, col = rc.col;
            const ox = n > 1 ? (k % 2 ? .28 : -.28) : 0, oy = n > 2 ? (k < 2 ? -.28 : .28) : 0;
            el.style.left = (cx(col) + ox * CW) + '%';
            el.style.top = pctY(cy(row) + oy * CW);
          }
          for (const el of Array.prototype.slice.call(board.querySelectorAll('.pf-pawn'))) if (!G.order.some(pid => 'pf-pawn-' + pid === el.id)) el.remove();
        };
        (function () {
          if (animating) return; animating = true;
          for (const pid of G.order) if (shown[pid] === undefined) shown[pid] = G.pos[pid] || 0;
          function step() {
            let moved = false;
            for (const pid of G.order) {
              const alvo = G.pos[pid] || 0;
              if (shown[pid] < alvo) { shown[pid]++; moved = true; }
              else if (shown[pid] > alvo) { shown[pid]--; moved = true; }
            }
            place(shown);
            if (moved) { c.beep(560, .04, 'square', .06); setTimeout(step, 110); }
            else animating = false;
          }
          step();
        })();

        // aviso da instrução automática
        const key = G.last && G.last.type !== 'clue' ? G.round + '-' + G.last.n : '';
        if (key && key !== lastAlert && ['pick', 'guess', 'choose', 'bonus', 'win'].includes(G.phase)) {
          lastAlert = key;
          const ov = document.getElementById('pf-overlay');
          if (ov) {
            ov.innerHTML = `<div class="pf-alert"><small>DICA ${G.last.n} · INSTRUÇÃO AUTOMÁTICA</small><div class="t">${c.esc(G.last.text)}</div><p>${c.C.event ? c.hl(c.C.event.text) : ''}</p></div>`;
            clearTimeout(alertT); alertT = setTimeout(() => { ov.innerHTML = ''; }, 7000);
            c.chord([440, 660, 880]);
          }
        }
        // vitória
        const ov = document.getElementById('pf-overlay');
        if (ov && G.phase === 'win') {
          const w = c.C.players.find(p => p.pid === G.winner);
          ov.innerHTML = `<div class="pf-win">${c.avatar(w, 180)}<h2>${w ? c.esc(w.name) : ''} venceu!</h2><p>Toque em "Jogar de novo" no celular</p></div>`;
        }

        // aviso de troca de vez em tela cheia
        if (['pick', 'guess', 'choose', 'chip'].includes(G.phase)) {
          const first = lastRound === null;
          const novoRound = !first && G.round !== lastRound, novoMed = !first && G.mediator !== lastMed, novaVez = !first && G.turn !== lastTurn;
          lastRound = G.round; lastMed = G.mediator; lastTurn = G.turn;
          if (!first && (novoRound || novoMed || novaVez)) {
            const m = c.C.players.find(p => p.pid === G.order[G.mediator]), g = c.C.players.find(p => p.pid === G.order[G.turn]);
            if (m && g) {
              const big = novoRound || novoMed;
              c.turnover(`${big ? `<div class="round">Rodada ${G.round}</div><div><small>MEDIADOR (lê as dicas)</small><div>${c.avatar(m, 110)}</div><div class="who2" style="${c.nmStyle(m)}">${c.esc(m.name)}</div></div>` : ''}
                <div><small>${big ? 'COMEÇA ADIVINHANDO' : 'AGORA É A VEZ DE'}</small><div>${c.avatar(g, big ? 110 : 150)}</div><div class="who2 ${big ? 'sm' : ''}" style="${c.nmStyle(g)}">${c.esc(g.name)}</div></div>
                ${big ? '' : `<div class="round" style="font-size:18px">mediador: ${c.esc(m.name)}</div>`}`, big ? 4200 : 2600);
              if (big) c.chord([523, 659, 784]); else c.beep(660, .12, 'triangle', .18);
            }
          }
        } else { lastRound = G.round; lastMed = G.mediator; lastTurn = G.turn; }
      },
    },
  });
})();
