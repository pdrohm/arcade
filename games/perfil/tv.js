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

  const style = `
    /* TV antiga (sem aspect-ratio): um espaçador dá a altura do tabuleiro (padding % = largura do tabuleiro) */
    .pf-board::before { content:''; display:block; padding-top:${BH}%; }
    @supports (aspect-ratio:1) { .pf-board::before { display:none; } }
    .pf-board { position:relative; width:100%; max-width:calc((100vh - 40px) * 13 / 10.4); border-radius:20px;
      background:linear-gradient(160deg,#f6f1e4,#e6dfcc); box-shadow:0 30px 60px rgba(0,0,0,0.6), inset 0 0 0 6px rgba(255,255,255,0.53), inset 0 0 0 8px #c9bfa6; }
    .pf-board .track { position:absolute; top:0; left:0; width:100%; height:100%; }
    .pf-sq { position:absolute; border-radius:22%; background:#fffdf7; box-shadow:inset 0 -3px 0 rgba(0,0,0,0.07), 0 2px 3px rgba(0,0,0,0.13); display:flex; align-items:center; justify-content:center; font-weight:800; color:#a3977c; font-size:12px; font-size:clamp(7px,.8vw,12px); } /* tv-ok */
    .pf-sq.tens { background:#fff; color:#4b5563; font-size:15px; font-size:clamp(8px,1vw,15px); /* tv-ok */ font-weight:900; box-shadow:inset 0 -3px 0 rgba(0,0,0,0.13), 0 0 0 2px #c9bfa6; }
    .pf-sq.bonus { background:#fbbf24; color:#7c2d12; font-size:26px; font-size:clamp(12px,1.6vw,26px); /* tv-ok */ box-shadow:inset 0 -3px 0 rgba(0,0,0,0.13), 0 0 0 3px #b45309; }
    .pf-sq.start { background:#166534; color:#fff; font-size:11px; font-size:clamp(7px,.75vw,11px); /* tv-ok */ font-weight:900; text-align:center; line-height:1.05; }
    .pf-sq.finish { background:repeating-linear-gradient(45deg,#111 0 6px,#fff 6px 12px); color:#111; text-shadow:0 0 3px #fff,0 0 4px #fff; font-size:11px; font-size:clamp(7px,.75vw,11px); /* tv-ok */ font-weight:900; text-align:center; line-height:1.05; }
    .pf-arrow { position:absolute; transform:translate(-50%,-50%); color:#8a7f66; font-weight:900; opacity:.65; pointer-events:none; }
    .pf-pawn { position:absolute; width:4.2%; border-radius:50%; border:2.5px solid #fff; box-shadow:0 4px 8px rgba(0,0,0,0.47), 0 0 0 2px rgba(0,0,0,0.27); transition:left .35s ease, top .35s ease; z-index:5; transform:translate(-50%,-50%); }
    .pf-pawn { aspect-ratio:1; } /* tv-ok */
    /* TV antiga (sem aspect-ratio): um espaçador de largura zero dá a altura ao peão e à casinha do número */
    .pf-pawn::before { content:''; display:block; padding-top:100%; }
    .pf-pawn.hop { animation:pfhop .3s; }
    @keyframes pfhop { 50% { transform:translate(-50%,-95%) scale(1.15); } }
    /* 10 colunas com 5px de vão, na conta (calc a TV tem): igualzinho ao grid de baixo */
    .pf-nums { display:flex; flex-wrap:wrap; margin-bottom:-5px; }
    .pf-nums { display:grid; grid-template-columns:repeat(10,1fr); gap:5px; } /* tv-ok */
    .pf-num { width:calc((100% - 45px) / 10); margin:0 5px 5px 0; border-radius:8px; background:#2a3350; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; color:#e5e7eb; }
    .pf-num::before { content:''; display:block; padding-top:100%; }
    .pf-num:nth-child(10n) { margin-right:0; }
    .pf-num { aspect-ratio:1; } /* tv-ok */
    @supports (display:grid) { .pf-nums { margin-bottom:0; } .pf-num { width:auto; margin:0; } .pf-num::before { display:none; } }
    @supports (aspect-ratio:1) { .pf-pawn::before { display:none; } }
    .pf-num.used { background:#0b0e17; color:#4b5563; text-decoration:line-through; }
    .pf-num.sp { background:#7c3aed; color:#fff; }
    .pf-num.last { background:#f59e0b; color:#111; box-shadow:0 0 0 3px #fff; }
    .pf-clue { font-size:23px; font-weight:800; line-height:1.25; }
    .pf-clue small { display:block; color:#9aa6c0; font-size:13px; font-weight:700; margin-bottom:4px; }
    .pf-clue.sp { color:#c4b5fd; }
    .pf-alert { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:#2e1065; border:4px solid #a78bfa; border-radius:24px; padding:28px 40px; text-align:center; z-index:15; box-shadow:0 30px 80px rgba(0,0,0,0.8); max-width:80%; animation:pfpop .35s; }
    .pf-alert small { display:block; color:#c4b5fd; font-weight:900; letter-spacing:1px; font-size:16px; }
    .pf-alert .t { font-size:42px; font-weight:900; color:#fff; margin:8px 0; line-height:1.15; }
    .pf-alert p { color:#e9d5ff; font-size:19px; margin:0; }
    @keyframes pfpop { from { transform:translate(-50%,-50%) scale(.6); opacity:0; } }
    .pf-win { position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); z-index:20; border-radius:20px; }
    .pf-win > * + * { margin-top:12px; }
    /* linhas com espaço entre os filhos, no lugar do gap */
    .pf-papeis { display:flex; margin-top:10px; flex-wrap:wrap; font-size:19px; }
    .pf-papeis > * + * { margin-left:16px; }
    .pf-pedidas { display:flex; flex-wrap:wrap; margin-bottom:-6px; }
    .pf-pedidas > * { margin:0 6px 6px 0; }
    /* as bolinhas de "dicas já pedidas" são pílulas: sem quadrado, sem espaçador */
    .pf-num.pill { width:36px; padding:5px 0; margin:0 6px 6px 0; }
    .pf-num.pill::before { display:none; }
    .pf-num.pill { aspect-ratio:auto; } /* tv-ok */
    .pf-especiais { margin-top:8px; }
    .pf-especiais > * + * { margin-top:6px; }
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
          const label = sq.start ? 'INÍCIO' : sq.finish ? '🏁<br>FIM' : sq.bonus ? '?' : (tens ? sq.i : '');
          return `<div class="${cls}" style="left:${cx(col) - CW / 2}%;top:${pctY(cy(row) - CW / 2)};width:${CW}%;height:${pctY(CW)}">${label}</div>`;
        }).join('');
        return `<style>${style}</style>
          <div class="pf-board" id="pf-board" style="aspect-ratio:100 / ${BH}/* tv-ok */">
            <svg class="track" viewBox="0 0 100 ${BH}" preserveAspectRatio="none">
              <polyline points="${line}" fill="none" stroke="#b9ad90" stroke-width="${CW * 1.35}" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>
              <polyline points="${line}" fill="none" stroke="#efe7d2" stroke-width="${CW * 1.1}" stroke-linejoin="round" stroke-linecap="round"/>
              <polyline points="${line}" fill="none" stroke="#fffdf5" stroke-width="0.25" stroke-dasharray="1.2 1.2" stroke-linejoin="round" opacity=".9"/>
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

        let side = `<div class="box"><div style="display:flex;justify-content:space-between;align-items:center">
            <span class="sub mut">Rodada ${G.round}</span>
            ${G.card ? `<span class="badge" style="background:${cat.color};color:${cat.text}">${cat.name}</span>` : ''}</div>
          <div class="pf-papeis">
            <span>${nm(m)} <span class="sub mut">📖 mediador</span></span>
            <span>${G.phase === 'chip' && G.chip ? nm(c.C.players.find(p => p.pid === G.chip.player)) + ' <span class="sub mut">🔵 ficha azul</span>' : nm(g) + ' <span class="sub mut">🎯 adivinha</span>'}</span>
          </div>${c.timerHtml('', G.turnMs)}</div>`;

        if ((G.phase === 'bonus' || G.phase === 'bonusguess') && G.bonus) {
          const b = G.bonus, bp = c.C.players.find(p => p.pid === b.player), bj = c.C.players.find(p => p.pid === b.judge);
          const bk = G.categories[b.card.cat];
          side += `<div class="box warn"><div class="center" style="font-size:26px;font-weight:900">❓ CARTA BÔNUS</div>
            <p class="sub center" style="margin-top:6px">${nm(bp)} escolhe até 5 dicas · ${nm(bj)} lê e julga</p>
            <div class="center" style="margin:10px 0"><span class="badge" style="background:${bk.color};color:${bk.text}">${bk.name}</span>
              <span class="sub mut"> ${b.picks.length}/5 · vale ${G.bonusTable[Math.max(0, b.picks.length - 1)]} casas</span></div>
            ${nums(b.card, b.picks.length ? b.picks[b.picks.length - 1].n : 0)}
            <p class="sub center" style="margin-top:8px">🔊 dicas pedidas: ${b.picks.map(x => x.n).join(', ') || '—'}</p>
            ${G.phase === 'bonusguess' ? '<div class="center" style="font-size:26px;font-weight:900;margin-top:8px">🗣️ Palpite!</div>' : ''}</div>`;
        } else if (G.card) {
          side += `<div class="box">${nums(G.card, L ? L.n : 0)}<p class="sub mut" style="margin-top:8px">${G.usedCount} dica${G.usedCount !== 1 ? 's' : ''} usada${G.usedCount !== 1 ? 's' : ''} · acertar agora vale ${G.clues - G.usedCount} casa${G.clues - G.usedCount !== 1 ? 's' : ''}</p></div>`;
          if (L) side += `<div class="box" ${L.type !== 'clue' ? 'style="border-color:#a78bfa;background:#2e1065"' : ''}>
              <div class="pf-clue ${L.type !== 'clue' ? 'sp' : ''}"><small>${L.type !== 'clue' ? '⚡ INSTRUÇÃO AUTOMÁTICA · ' : ''}Dica ${L.n} · pedida por ${hl(L.by)}</small>${L.text ? esc(L.text) : `🔊 ${nm(m)} lê a dica em voz alta`}</div>
              ${G.phase === 'guess' ? `<p class="sub" style="margin-top:8px">🗣️ ${nm(g)} pode dar 1 palpite. ${nm(m)} julga.</p>` : ''}
              ${G.phase === 'chip' ? `<p class="sub" style="margin-top:8px">🔵 palpite da ficha azul!</p>` : ''}
              ${G.phase === 'choose' ? `<p class="sub" style="margin-top:8px">${nm(g)} está escolhendo um jogador…</p>` : ''}
              ${G.phase === 'pick' ? `<p class="sub" style="margin-top:8px">${nm(g)} escolhe um número de 1 a 20.</p>` : ''}</div>`;
          else side += `<div class="box"><div class="pf-clue"><small>Nova carta</small>${nm(g)} escolhe um número de 1 a 20 no celular.</div></div>`;
          const especiais = G.revealed.filter(r => r.type !== 'clue');
          if (G.revealed.length > 1) side += `<div class="box"><p class="sub mut" style="margin-bottom:6px">Dicas já pedidas</p>
            <div class="pf-pedidas">${G.revealed.map(r => `<span class="pf-num pill ${r.type !== 'clue' ? 'sp' : ''}">${r.n}</span>`).join('')}</div>
            ${especiais.length ? `<div class="pf-especiais">${especiais.map(r => `<div class="sub" style="color:#c4b5fd">⚡ <b>${r.n}</b> ${esc(r.text)}</div>`).join('')}</div>` : ''}</div>`;
        }

        side += `<div class="box">${c.playersHtml({
          tag: p => { const i = G.order.indexOf(p.pid); return (i === G.mediator ? ' 📖' : '') + (i === G.turn && i !== G.mediator ? ' 🎯' : ''); },
          info: p => `casa ${G.pos[p.pid] || 0}${G.chips[p.pid] ? ' ' + '🔵'.repeat(G.chips[p.pid]) : ''}`,
          border: p => { const i = G.order.indexOf(p.pid); return i === G.mediator ? '#f59e0b' : (i === G.turn ? '#fff' : ''); },
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
            ov.innerHTML = `<div class="pf-alert"><small>⚡ DICA ${G.last.n} · INSTRUÇÃO AUTOMÁTICA</small><div class="t">${c.esc(G.last.text)}</div><p>${c.C.event ? c.hl(c.C.event.text) : ''}</p></div>`;
            clearTimeout(alertT); alertT = setTimeout(() => { ov.innerHTML = ''; }, 7000);
            c.chord([440, 660, 880]);
          }
        }
        // vitória
        const ov = document.getElementById('pf-overlay');
        if (ov && G.phase === 'win') {
          const w = c.C.players.find(p => p.pid === G.winner);
          ov.innerHTML = `<div class="pf-win"><div style="font-size:110px">🏆</div><h2 style="font-size:52px">${c.nm(w)} venceu!</h2><p class="sub">Toque em "Jogar de novo" no celular</p></div>`;
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
              c.turnover(`${big ? `<div class="round">Rodada ${G.round}</div><div><small>📖 MEDIADOR (lê as dicas)</small><div class="who2" style="${c.nmStyle(m)}">${c.esc(m.name)}</div></div>` : ''}
                <div><small>🎯 ${big ? 'COMEÇA ADIVINHANDO' : 'AGORA É A VEZ DE'}</small><div class="who2 ${big ? 'sm' : ''}" style="${c.nmStyle(g)}">${c.esc(g.name)}</div></div>
                ${big ? '' : `<div class="round" style="font-size:18px">mediador: ${c.esc(m.name)}</div>`}`, big ? 4200 : 2600);
              if (big) c.chord([523, 659, 784]); else c.beep(660, .12, 'triangle', .18);
            }
          }
        } else { lastRound = G.round; lastMed = G.mediator; lastTurn = G.turn; }
      },
    },
  });
})();
