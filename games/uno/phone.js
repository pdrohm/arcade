// UNO — tela do celular. A mão só existe aqui: o servidor manda as cartas só para o dono delas.
'use strict';
(() => {
  const HEX = { r: '#ef4444', y: '#facc15', g: '#22c55e', b: '#3b82f6', w: '#111827' };
  const NOME = { r: 'Vermelho', y: 'Amarelo', g: 'Verde', b: 'Azul' };
  const ARCO = 'conic-gradient(from 215deg,#ef4444 0 25%,#facc15 0 50%,#22c55e 0 75%,#3b82f6 0)';
  const SIM = { '+2': '+2', '+4': '+4', rev: '⇄', skip: '⊘', wild: '★' };
  const face = c => SIM[c.v] || c.v;
  let styled = false, lastTurn = '';

  const style = `
    .un-hand { display:flex; gap:8px; overflow-x:auto; padding:14px 6px 18px; scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch; }
    .un-hand::-webkit-scrollbar { height:6px; } .un-hand::-webkit-scrollbar-thumb { background:#2a3350; border-radius:9px; }
    .uc { position:relative; flex:none; width:var(--w,84px); aspect-ratio:2/3; border-radius:12%; scroll-snap-align:center;
      box-shadow:0 6px 14px #0008, inset 0 0 0 5px #fff; display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .uc .o { position:absolute; left:9%; top:11%; width:82%; height:78%; border-radius:50%; background:#ffffff2e; transform:rotate(-22deg); }
    .uc .o.rb { background:${ARCO}; opacity:.9; }
    .uc .v { position:relative; font-weight:900; font-size:calc(var(--w,84px) * .56); line-height:1; color:#fff; text-shadow:2px 3px 0 #0006; letter-spacing:-2px; }
    .uc .tl, .uc .br { position:absolute; font-weight:900; font-size:calc(var(--w,84px) * .2); color:#ffffffdd; }
    .uc .tl { left:8%; top:5%; } .uc .br { right:8%; bottom:5%; transform:rotate(180deg); }
    .un-hand .uc { opacity:.4; filter:grayscale(.55); transition:transform .12s, opacity .12s; }
    .un-hand .uc.ok { opacity:1; filter:none; transform:translateY(-8px); box-shadow:0 10px 20px #000a, inset 0 0 0 5px #fff, 0 0 0 3px #fff; }
    .un-hand .uc.ok:active { transform:translateY(-16px) scale(1.04); }
    .un-hand .uc.novo { animation:unnew .5s; } @keyframes unnew { from { transform:translateY(30px) scale(.7); opacity:0; } }
    .un-mesa { display:flex; align-items:center; justify-content:center; gap:16px; }
    .un-mesa .lab { font-size:15px; font-weight:800; }
    .un-cores { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
    .un-cor { aspect-ratio:1.5; border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:900; color:#111; box-shadow:0 6px 16px #0006; }
    .un-cor:active { transform:scale(.97); }
    .un-o { padding:12px 16px; border-radius:12px; background:#2a3350; font-weight:900; font-size:18px; text-align:center; }
    .un-o.sel { background:#f59e0b; color:#111; }
    .un-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .un-uno { background:#facc15; color:#111; font-size:30px; letter-spacing:4px; }
    .un-bar { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
    .un-bar .nm { font-size:14px; }
    /* em pé: tudo empilhado, na ordem mesa → mão → botões → quem está na mesa */
    .un-game, .un-acts, .un-foot { display:flex; flex-direction:column; gap:12px; }
    .un-game > .un-handwrap { order:2; } .un-game > .un-acts { order:3; } .un-game > .un-foot { order:4; }
    .un-acts:empty { display:none; }
    /* deitado (paisagem): a mão vira a estrela — cartas grandes na largura toda, botões numa coluna à direita */
    @media (orientation: landscape) and (max-height: 600px) {
      body.phone:has(.un-game) #app { max-width:none; padding:8px 10px 10px; gap:8px; min-height:100vh; }
      body.phone:has(.un-game) .head { display:none; }
      body.phone:has(.un-game) [data-a="voltar"] { display:none; }
      .un-game { display:grid; grid-template-columns:minmax(0,1fr) 190px; grid-template-rows:auto minmax(0,1fr) auto; gap:8px;
        grid-template-areas:"m b" "h b" "n b"; height:calc(100vh - 18px); }
      .un-game:has(> .un-acts:empty), .un-game:not(:has(> .un-acts)) { grid-template-columns:minmax(0,1fr); grid-template-areas:"m" "h" "n"; }
      .un-game > .un-mesabox { grid-area:m; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:18px; flex-wrap:wrap; }
      .un-mesabox .tmr { margin-top:0 !important; flex:1; min-width:140px; max-width:260px; }
      .un-game > .un-handwrap { grid-area:h; min-height:0; }
      .un-game > .un-acts { grid-area:b; gap:8px; justify-content:flex-start; min-height:0; overflow-y:auto; }
      .un-game > .un-foot { grid-area:n; gap:6px; }
      .un-handwrap .box { height:100%; display:flex; flex-direction:column; justify-content:center; padding:0 4px; }
      .un-hand { padding:10px 8px 12px; gap:10px; --w:clamp(90px, 36vh, 150px); }
      .un-hand .uc { --w:clamp(90px, 36vh, 150px); }
      .un-hand .uc.ok { transform:translateY(-6px); }
      .un-handwrap .dica { display:none; }
      .un-mesa { gap:12px; } .un-mesa .uc { --w:52px !important; }
      .un-mesa .lab { font-size:13px; } .un-mesa .vez { font-size:17px; } .un-mesa .info { font-size:13px; }
      .un-mesabox .timer { font-size:22px; } .un-mesabox .tbar { margin-top:4px; height:6px; }
      .un-mesabox .pend { flex-basis:100%; text-align:center; }
      .un-mesabox .pend { font-size:14px; margin-top:4px; }
      .un-acts .btn { padding:12px 10px; font-size:17px; border-radius:12px; }
      .un-acts .btn.big { padding:14px 10px; font-size:19px; }
      .un-acts .un-uno { font-size:24px; letter-spacing:3px; }
      .un-acts .sub { font-size:14px; }
      .un-foot .box { padding:6px 8px; } .un-foot .lab2 { display:none; }
      .un-foot .un-bar { gap:6px; } .un-foot .un-bar .nm { font-size:12px; padding:1px 8px; }
      .un-foot .evento { font-size:13px; }
      .un-cores { grid-template-columns:repeat(4,1fr); } .un-cor { aspect-ratio:2; font-size:19px; }
    }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };

  const cardHtml = (card, cls, w, attrs) => {
    const bg = card.c === 'w' ? '#111827' : HEX[card.c];
    return `<div class="uc ${cls || ''}" style="--w:${w};background:${bg}" ${attrs || ''}><i class="o ${card.c === 'w' ? 'rb' : ''}"></i>
      <span class="tl">${face(card)}</span><span class="v">${face(card)}</span><span class="br">${face(card)}</span></div>`;
  };

  ARCADE.register('uno', {
    phone: {
      // não redesenhar a mão a cada broadcast: só quando algo que eu vejo muda
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase, G.turn, G.top ? G.top.i : '', G.color, G.pending, G.risk || '', G.drawn || '', G.wildBy || '', G.swapBy || '',
          G.canUno ? 1 : 0, G.round, G.hand.map(x => x.i + (x.ok ? '*' : '')).join('.'),
          G.order.map(o => o.n + (o.said ? 'u' : '')).join('.'),
          G.phase === 'setup' ? JSON.stringify(G.cfg) : '',
          (G.phase === 'round' || G.phase === 'end') ? JSON.stringify(G.scores) : ''].join('|');
      },

      html(c) {
        ensure();
        const G = c.G, esc = c.esc, nm = c.nm; if (!G || !c.you) return '';
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const eu = c.you.pid;
        const minhaVez = G.turn === eu;

        const placar = () => `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>${c.playersHtml({
          info: p => `${G.scores[p.pid] || 0} pts${G.roundScores[p.pid] ? ` (+${G.roundScores[p.pid]})` : ''}`,
        })}</div>`;

        // ---------- menu de regras ----------
        if (G.phase === 'setup') {
          const sw = (a, on, txt) => `<div class="un-o ${on ? 'sel' : ''}" data-a="${a}" style="flex:1">${on ? '✅' : '❌'} ${txt}</div>`;
          const opt = (a, vals, cur, fmt) => `<div class="un-opt">${vals.map(v => `<div class="un-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt(v)}</div>`).join('')}</div>`;
          return `<div class="box center"><h2 style="font-size:26px">⚙️ Regras do UNO</h2><p class="sub mut" style="margin-top:6px">Qualquer um pode mudar. Vale para todos.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Acumular +2 e +4</p><div class="un-opt">${sw('cfgStack', G.cfg.stack, G.cfg.stack ? 'Empilha' : 'Não empilha')}</div>
              <p class="sub mut" style="margin-top:8px;font-size:15px">Com "empilha", quem levaria +2 pode jogar outro +2 e passar a conta adiante.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Regra "7 e 0"</p><div class="un-opt">${sw('cfgSeven', G.cfg.sevenzero, G.cfg.sevenzero ? 'Ligada' : 'Desligada')}</div>
              <p class="sub mut" style="margin-top:8px;font-size:15px">7 troca sua mão com alguém. 0 gira as mãos de todo mundo.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Pontuação</p>${opt('cfgTarget', G.alvos, G.cfg.target, v => v ? `até ${v}` : '1 rodada')}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Tempo por vez</p>${opt('cfgTime', G.tempos, G.cfg.turnSec, v => v ? v + 's' : 'sem tempo')}</div>
            <button class="btn big ok" data-a="begin">▶ Começar o UNO</button>
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- fim de rodada / fim de jogo ----------
        if (G.phase === 'round' || G.phase === 'end') {
          const w = ply(G.phase === 'end' ? G.winner : G.roundWinner);
          return `<div class="box center"><div class="big-emoji">${G.phase === 'end' ? '🏆' : '🏁'}</div>
            <h2 style="font-size:28px;margin-top:8px">${w ? nm(w) : ''} ${G.phase === 'end' ? 'venceu!' : 'bateu a rodada!'}</h2></div>
            ${placar()}
            ${G.phase === 'end' ? '<button class="btn big ok" data-a="again">🔄 Jogar de novo</button>' : '<button class="btn big warn" data-a="next">Próxima rodada ➡️</button>'}`;
        }

        // ---------- escolha de cor do coringa ----------
        if (G.phase === 'color') {
          if (G.wildBy === eu) {
            return `<div class="box center hi"><h2 style="font-size:26px">🌈 Escolha a cor</h2><p class="sub mut" style="margin-top:6px">A mesa vira essa cor.</p></div>
              <div class="un-cores">${['r', 'y', 'g', 'b'].map(k => `<div class="un-cor" style="background:${HEX[k]}" data-a="unoCor" data-c="${k}">${NOME[k]}</div>`).join('')}</div>`;
          }
          return `<div class="un-game"><div class="box center un-mesabox"><div class="big-emoji">🌈</div><p class="sub" style="margin-top:8px">${nm(ply(G.wildBy))} está escolhendo a cor…</p></div><div class="un-handwrap">${maoHtml()}</div></div>`;
        }

        // ---------- troca de mão (regra 7) ----------
        if (G.phase === 'swap') {
          if (G.swapBy === eu) {
            return `<div class="box center hi"><h2 style="font-size:26px">🔁 Trocar de mão</h2><p class="sub mut" style="margin-top:6px">Escolha com quem você troca as cartas.</p></div>
              <div style="display:flex;flex-direction:column;gap:10px">${G.order.filter(o => o.pid !== eu).map(o => { const p = ply(o.pid); return p ? `<button class="btn" data-a="unoTrocar" data-pid="${o.pid}" style="display:flex;align-items:center;gap:12px;justify-content:flex-start"><span class="dot" style="background:${c.ci(p.color).hex};width:26px;height:26px"></span>${esc(p.name)} <span class="sub mut">${o.n} cartas</span></button>` : ''; }).join('')}</div>`;
          }
          return `<div class="un-game"><div class="box center un-mesabox"><div class="big-emoji">🔁</div><p class="sub" style="margin-top:8px">${nm(ply(G.swapBy))} está trocando de mão…</p></div><div class="un-handwrap">${maoHtml()}</div></div>`;
        }

        // ---------- jogo ----------
        function maoHtml() {
          if (!G.hand.length) return '';
          return `<div class="box" style="padding:0 4px"><div class="un-hand">${G.hand.map(card =>
            cardHtml(card, card.ok ? 'ok' : '', '84px', card.ok ? `data-a="carta" data-i="${card.i}"` : '')).join('')}</div>
            <p class="sub center mut dica" style="padding:0 10px 12px;font-size:15px">${G.hand.length} cartas · ${G.hand.filter(x => x.ok).length ? 'as acesas dá para jogar' : minhaVez ? 'nenhuma serve: compre' : 'espere sua vez'}</p></div>`;
        }

        const daVez = ply(G.turn);
        const topo = G.top ? cardHtml(G.top, '', '76px') : '';
        // mesa: carta do topo, cor, de quem é a vez e o cronômetro
        const mesa = `<div class="box un-mesabox ${minhaVez ? 'hi' : ''}"><div class="un-mesa">${topo}
          <div><p class="lab" style="color:${HEX[G.color]}">Cor: ${NOME[G.color] || '—'}</p>
          <p class="sub vez" style="font-size:20px;font-weight:800;margin-top:4px">${minhaVez ? '👉 Sua vez!' : `Vez de ${daVez ? esc(daVez.name) : '…'}`}</p>
          <p class="sub mut info" style="font-size:15px;margin-top:4px">${G.dir > 0 ? '↻ horário' : '↺ anti-horário'} · 🎴 ${G.deckN}</p></div></div>
          ${G.pending ? `<p class="sub center pend" style="margin-top:10px;color:#facc15;font-weight:900">⚠️ Acumulado: +${G.pending} para quem não responder</p>` : ''}
          ${minhaVez && G.cfg.turnSec ? `<div class="tmr" style="margin-top:10px">${c.timerHtml('', G.turnMs)}</div>` : ''}</div>`;

        // botões: comprar / jogar a comprada / passar / UNO! / Pegou!
        let acts = '';
        if (minhaVez) {
          if (G.drawn) {
            acts += `<p class="sub center">Você comprou esta carta. Dá para jogar!</p>
              <button class="btn big ok" data-a="jogarComprada" data-i="${G.drawn}">▶ Jogar a comprada</button>
              <button class="btn ghost" data-a="passar">Passar a vez</button>`;
          } else {
            acts += `<button class="btn big blue" data-a="comprar">🎴 Comprar ${G.pending ? `as ${G.pending} acumuladas` : '1 carta'}</button>`;
          }
        }
        if (G.canUno) acts += `<button class="btn big un-uno" data-a="uno">UNO!</button>`;
        if (G.risk && G.risk !== eu) acts += `<button class="btn big no" data-a="pegou">✋ Pegou ${esc((ply(G.risk) || {}).name || '')}! (+2)</button>`;

        // rodapé: quem está na mesa e o último aviso
        const foot = `<div class="box"><p class="sub mut lab2" style="margin-bottom:8px">Na mesa</p><div class="un-bar">${G.order.map(o => {
          const p = ply(o.pid); if (!p) return '';
          const eh = G.turn === o.pid;
          return `<span class="nm" style="${c.nmStyle(p)};${eh ? 'box-shadow:0 0 0 3px #fff' : ''}">${esc(p.name)} ${o.n}${o.n === 1 ? (o.said ? ' 🔔' : ' ⚠️') : ''}</span>`;
        }).join('')}</div></div>
        <p class="sub center evento">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;

        // em pé fica tudo empilhado; deitado vira grade (ver o CSS de paisagem lá em cima)
        return `<div class="un-game">${mesa}<div class="un-handwrap">${maoHtml()}</div><div class="un-acts">${acts}</div><div class="un-foot">${foot}</div></div>`;
      },

      after(c) {
        const G = c.G; if (!G || !c.you) return;
        // aviso de tela cheia quando chega a minha vez
        const tag = `${G.round}:${G.phase}:${G.turn}:${G.top ? G.top.i : ''}`;
        const minha = G.turn === c.you.pid && (G.phase === 'play' || (G.phase === 'color' && G.wildBy === c.you.pid) || (G.phase === 'swap' && G.swapBy === c.you.pid));
        if (minha && lastTurn !== tag && G.phase === 'play') {
          lastTurn = tag;
          const jog = G.hand.filter(x => x.ok).length;
          c.turnover(`<div class="round">Rodada ${G.round}</div><div class="mine">👉 SUA VEZ</div>
            <div class="who2" style="background:${HEX[G.color]};color:#111">${NOME[G.color] || ''}</div>
            <small>${jog ? `${jog} carta${jog > 1 ? 's' : ''} para jogar` : 'nada serve: compre uma'}</small>`, 1500, [60, 40, 60]);
          c.chord([659, 880]);
        } else if (!minha) lastTurn = '';
      },

      act(a, el, c) {
        const send = ARCADE.send;
        if (a === 'cfgStack') send({ t: 'config', cfg: { stack: !c.G.cfg.stack } });
        else if (a === 'cfgSeven') send({ t: 'config', cfg: { sevenzero: !c.G.cfg.sevenzero } });
        else if (a === 'cfgTarget') send({ t: 'config', cfg: { target: Number(el.dataset.v) } });
        else if (a === 'cfgTime') send({ t: 'config', cfg: { turnSec: Number(el.dataset.v) } });
        else if (a === 'begin') send({ t: 'begin' });
        else if (a === 'carta' || a === 'jogarComprada') send({ t: 'card', i: Number(el.dataset.i) });
        else if (a === 'comprar') send({ t: 'draw' });
        else if (a === 'passar') send({ t: 'pass' });
        else if (a === 'unoCor') send({ t: 'color', c: el.dataset.c });
        else if (a === 'unoTrocar') send({ t: 'swap', pid: el.dataset.pid });
        else if (a === 'uno') { ARCADE.beep(880, .18, 'square', .25); send({ t: 'uno' }); }
        else if (a === 'pegou') send({ t: 'catch' });
        else if (a === 'next') send({ t: 'next' });
        else if (a === 'again') send({ t: 'again' });
      },
    },
  });
})();
