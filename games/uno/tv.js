// UNO — tela da TV. Palco fixo (a mesa) montado uma vez; o resto é atualizado em after().
// A TV nunca mostra a mão de ninguém: só a quantidade de cartas de cada um.
'use strict';
(() => {
  const HEX = { r: '#ef4444', y: '#facc15', g: '#22c55e', b: '#3b82f6', w: '#111827' };
  const NOME = { r: 'Vermelho', y: 'Amarelo', g: 'Verde', b: 'Azul' };
  const ARCO = 'conic-gradient(from 215deg,#ef4444 0 25%,#facc15 0 50%,#22c55e 0 75%,#3b82f6 0)';
  const SIM = { '+2': '+2', '+4': '+4', rev: '⇄', skip: '⊘', wild: '★' };
  const face = c => SIM[c.v] || c.v;

  const style = `
    .un-table { position:relative; width:100%; aspect-ratio:16/10; max-height:calc(100vh - 40px); margin:auto;
      border-radius:40px; background:radial-gradient(60% 60% at 50% 45%,#1d6b45,#0d3c27 70%,#082718);
      box-shadow:inset 0 0 0 10px #0f2a1c, inset 0 0 90px #0009, 0 30px 70px #000a; overflow:hidden; }
    .un-center { position:absolute; left:50%; top:47%; transform:translate(-50%,-50%); display:flex; align-items:center; gap:clamp(14px,2.4vw,42px); }
    /* TV da sala (Chrome 47) não tem var/calc/aspect-ratio: as linhas fixas valem lá; os browsers novos sobrescrevem */
    .uc { position:relative; width:90px; height:135px; width:var(--w,90px); aspect-ratio:2/3; border-radius:12%; background:#fff; /* tv-ok: valor fixo antes */
      box-shadow:0 8px 20px #0007, inset 0 0 0 6px #fff; display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .uc .o { position:absolute; left:9%; top:11%; width:82%; height:78%; border-radius:50%; background:#ffffff2e; transform:rotate(-22deg); }
    .uc .o.rb { background:${ARCO}; opacity:.9; }
    @supports (aspect-ratio:1) { .uc, .un-p .fan i { height:auto; } }   /* altura fixa só onde não existe aspect-ratio */
    .uc .v { position:relative; font-weight:900; font-size:52px; font-size:calc(var(--w,90px) * .58); line-height:1; color:#fff; /* tv-ok: valor fixo antes */
      text-shadow:2px 3px 0 #0006, 0 0 10px #0004; letter-spacing:-2px; }
    .uc .tl, .uc .br { position:absolute; font-weight:900; font-size:18px; font-size:calc(var(--w,90px) * .2); color:#ffffffdd; } /* tv-ok: valor fixo antes */
    .uc .tl { left:8%; top:5%; } .uc .br { right:8%; bottom:5%; transform:rotate(180deg); }
    .uc.back { background:#111827; }
    .uc.back .o { background:${ARCO}; opacity:.85; }
    .uc.back .v { font-size:23px; font-size:calc(var(--w,90px) * .26); letter-spacing:1px; } /* tv-ok: valor fixo antes */
    .uc.play { animation:unpop .45s cubic-bezier(.2,1.4,.4,1); }
    @keyframes unpop { 0% { transform:translateY(-40px) rotate(-14deg) scale(.6); opacity:0; } 60% { transform:translateY(0) rotate(4deg) scale(1.12); } 100% { transform:none; } }
    .un-slot { position:relative; }
    .un-slot .lab { position:absolute; left:50%; bottom:-30px; transform:translateX(-50%); font-size:15px; font-weight:800; color:#cfe9d9; white-space:nowrap; }
    .un-glow { position:absolute; inset:-14px; border-radius:18%; filter:blur(14px); opacity:.85; }
    .un-dir { position:absolute; left:50%; top:47%; transform:translate(-50%,-50%); width:clamp(230px,26vw,420px); aspect-ratio:1;
      border:4px dashed #ffffff22; border-radius:50%; pointer-events:none; }
    .un-dir i { position:absolute; left:50%; top:-22px; transform:translateX(-50%); font-size:clamp(24px,2.6vw,40px); }
    .un-dir.ccw { animation:unspinb 14s linear infinite; } .un-dir.cw { animation:unspin 14s linear infinite; }
    @keyframes unspin { to { transform:translate(-50%,-50%) rotate(360deg); } }
    @keyframes unspinb { to { transform:translate(-50%,-50%) rotate(-360deg); } }
    .un-p { position:absolute; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:6px; width:clamp(104px,11.5vw,168px); text-align:center; }
    .un-p .who { font-weight:900; font-size:clamp(14px,1.4vw,22px); padding:5px 14px; border-radius:11px; white-space:nowrap; max-width:100%; overflow:hidden; text-overflow:ellipsis; }
    .un-p .fan { display:flex; justify-content:center; height:clamp(30px,3.4vw,52px); }
    .un-p .fan i { --fw:clamp(15px,1.6vw,24px); display:block; width:18px; height:27px; width:var(--fw); /* tv-ok: valor fixo antes */ aspect-ratio:2/3; border-radius:16%; background:#111827; box-shadow:0 2px 5px #0008, inset 0 0 0 2px #ffffff44; margin-left:calc(var(--fw) * -0.45); }
    .un-p .fan i:first-child { margin-left:0; }
    .un-p .cnt { font-size:clamp(13px,1.2vw,18px); font-weight:800; color:#cfe9d9; }
    .un-p.now { filter:drop-shadow(0 0 16px #fff); }
    .un-p.now .who { box-shadow:0 0 0 4px #fff; }
    .un-p.uno .cnt { color:#facc15; animation:unblink .7s infinite alternate; }
    @keyframes unblink { to { opacity:.35; } }
    .un-msg { position:absolute; left:6%; right:6%; bottom:8px; text-align:center; font-size:clamp(14px,1.5vw,22px); font-weight:800; color:#eafff4; text-shadow:0 2px 8px #000; }
    .un-over { position:absolute; inset:0; background:#040807f6; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:30px; text-align:center; }
    .un-over h2 { font-size:clamp(28px,4vw,64px); }
    .un-rules { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; }
    .un-rule { padding:12px 22px; border-radius:14px; background:#132a20; border:1px solid #2a5c44; font-size:clamp(15px,1.5vw,22px); font-weight:800; }
    .un-sc { display:flex; flex-direction:column; gap:10px; width:min(700px,80%); }
    .un-sc div { display:flex; align-items:center; gap:14px; font-size:clamp(18px,2vw,30px); background:#0e2018; padding:10px 18px; border-radius:14px; }
    .un-sc div span:last-child { margin-left:auto; font-weight:900; }
  `;

  const cardHtml = (card, cls, w) => {
    if (!card) return '';
    const bg = card.c === 'w' ? '#111827' : HEX[card.c];
    return `<div class="uc ${cls || ''}" style="--w:${w};background:${bg}"><i class="o ${card.c === 'w' ? 'rb' : ''}"></i>
      <span class="tl">${face(card)}</span><span class="v">${face(card)}</span><span class="br">${face(card)}</span></div>`;
  };

  let lastTop = '', lastKey = '';

  ARCADE.register('uno', {
    tv: {
      mount() {
        return `<style>${style}</style><div class="un-table" id="un-table">
          <div class="un-dir" id="un-dir"><i>▲</i></div>
          <div class="un-center">
            <div class="un-slot"><div class="uc back" style="--w:clamp(70px,7.5vw,120px)"><i class="o"></i><span class="v">UNO</span></div><div class="lab" id="un-deckn"></div></div>
            <div class="un-slot"><div class="un-glow" id="un-glow"></div><div id="un-top"></div><div class="lab" id="un-topl"></div></div>
          </div>
          <div id="un-ring"></div>
          <div class="un-msg" id="un-msg"></div>
          <div id="un-over"></div>
        </div>`;
      },

      html(c) {
        const G = c.G, esc = c.esc; if (!G) return {};
        const alvo = G.cfg.target ? `até ${G.cfg.target} pontos` : 'uma rodada só';
        let side = `<div class="box center"><div style="font-size:30px;font-weight:900">🃏 UNO</div>
          <p class="sub mut" style="margin-top:4px">${G.phase === 'setup' ? 'Ajustando as regras' : `Rodada ${G.round} · ${alvo}`}</p></div>`;
        side += `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>${c.playersHtml({
          info: p => {
            const o = G.order.find(x => x.pid === p.pid);
            return `${o ? o.n + ' 🃏 · ' : ''}${G.scores[p.pid] || 0} pts`;
          },
          border: p => (G.turn === p.pid ? '#ffffff' : null),
        })}</div>`;
        side += `<div class="box"><p class="sub mut" style="margin-bottom:6px">Regras</p>
          <p class="sub">${G.cfg.stack ? '✅' : '❌'} acumular +2/+4 &nbsp; ${G.cfg.sevenzero ? '✅' : '❌'} 7 e 0<br>
          ⏱ ${G.cfg.turnSec ? G.cfg.turnSec + 's por vez' : 'sem tempo'} · 🎯 ${esc(alvo)}</p></div>`;
        if (G.phase === 'play' && G.cfg.turnSec) side += c.timerHtml('', G.turnMs);
        side += `<div class="event" style="margin-top:auto">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        return { side };
      },

      after(c) {
        const G = c.G, esc = c.esc; if (!G) return;
        const $ = id => document.getElementById(id);
        const ply = pid => c.C.players.find(p => p.pid === pid);
        if (!$('un-table')) return;

        // carta do topo (pula quando é nova) e brilho na cor atual
        const key = G.top ? `${G.top.i}:${G.color}` : '';
        if (key !== lastTop) {
          lastTop = key;
          $('un-top').innerHTML = cardHtml(G.top, 'play', 'clamp(90px,10vw,170px)');
          if (G.lastPlay) c.beep(520, .08, 'triangle', .12);
        }
        $('un-glow').style.background = HEX[G.color] || '#fff';
        $('un-topl').innerHTML = G.color ? `cor: <b style="color:${HEX[G.color]}">${NOME[G.color]}</b>${G.pending ? ` · <b style="color:#facc15">acumulado ${G.pending}</b>` : ''}` : '';
        $('un-deckn').textContent = `${G.deckN} cartas`;

        // seta de direção
        const dir = $('un-dir');
        dir.className = 'un-dir ' + (G.dir > 0 ? 'cw' : 'ccw');
        dir.querySelector('i').textContent = G.dir > 0 ? '↻' : '↺';

        // jogadores em volta da mesa
        const n = G.order.length;
        $('un-ring').innerHTML = G.order.map((o, i) => {
          const p = ply(o.pid); if (!p) return '';
          const ang = (-90 + i * 360 / Math.max(1, n)) * Math.PI / 180;
          const x = 50 + 38 * Math.cos(ang), y = 50 + 32 * Math.sin(ang);
          const cls = ['un-p', G.turn === o.pid ? 'now' : '', o.n === 1 ? 'uno' : ''].join(' ');
          const fan = Array.from({ length: Math.min(o.n, 9) }, () => '<i></i>').join('');
          return `<div class="${cls}" style="left:${x}%;top:${y}%">
            <div class="fan">${fan}</div>
            <div class="who" style="${c.nmStyle(p)}">${esc(p.name)}${p.on === false ? ' 📵' : ''}</div>
            <div class="cnt">${o.n} carta${o.n === 1 ? ' — UNO!' : 's'}${o.n === 1 && !o.said ? ' ⚠️' : ''}</div></div>`;
        }).join('');

        $('un-msg').innerHTML = c.C.event ? c.hl(c.C.event.text) : '';

        // telas de setup / placar / fim por cima da mesa
        const over = $('un-over');
        let h = '';
        if (G.phase === 'setup') {
          h = `<div class="un-over"><div class="big-emoji">🃏</div><h2>Regras do UNO</h2>
            <div class="un-rules">
              <div class="un-rule">${G.cfg.stack ? '✅' : '❌'} Acumular +2 / +4</div>
              <div class="un-rule">${G.cfg.sevenzero ? '✅' : '❌'} 7 e 0</div>
              <div class="un-rule">🎯 ${G.cfg.target ? 'Até ' + G.cfg.target + ' pontos' : 'Uma rodada só'}</div>
              <div class="un-rule">⏱ ${G.cfg.turnSec ? G.cfg.turnSec + 's por vez' : 'Sem tempo'}</div>
            </div>
            <p class="sub mut">Ajustem no celular e toquem em "Começar".</p></div>`;
        } else if (G.phase === 'round' || G.phase === 'end') {
          const ordem = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0));
          const w = ply(G.phase === 'end' ? G.winner : G.roundWinner);
          h = `<div class="un-over"><div class="big-emoji">${G.phase === 'end' ? '🏆' : '🏁'}</div>
            <h2>${w ? esc(w.name) : ''} ${G.phase === 'end' ? 'venceu!' : 'bateu a rodada!'}</h2>
            <div class="un-sc">${ordem.map(p => `<div><span class="dot" style="background:${c.ci(p.color).hex}"></span><span>${esc(p.name)}</span>
              <span>${G.scores[p.pid] || 0}${G.roundScores[p.pid] ? ` <b style="color:#22c55e">(+${G.roundScores[p.pid]})</b>` : ''}</span></div>`).join('')}</div>
            <p class="sub mut">${G.phase === 'end' ? 'Toquem em "Jogar de novo" no celular.' : 'Toquem em "Próxima rodada" no celular.'}</p></div>`;
        }
        if (over.innerHTML !== h) over.innerHTML = h;

        // sons dos momentos: fim de rodada e fim de jogo
        const k2 = `${G.phase}:${G.round}:${G.roundWinner || ''}`;
        if (k2 !== lastKey) {
          if (G.phase === 'end') c.chord([523, 659, 784, 1046]);
          else if (G.phase === 'round') c.chord([659, 880]);
          lastKey = k2;
        }
      },
    },
  });
})();
