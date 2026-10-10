// Perfil — tela do celular.
'use strict';
(() => {
  let showAnswer = false, ovRound = null, ovTurn = null, ovMed = null, lastRound = -1;

  // visual "fliperama de papel": tinta sobre papel, destaque na cor de palavras (#3db4f2); instrução automática em lilás
  const style = `
    .pf-lab { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; }
    .pf-lab b { color:#0f0f14; }
    .pf-h { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; letter-spacing:-.01em; }
    .pf-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .pf-nums { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .pf-num { aspect-ratio:1; border-radius:0; background:#fff; border:3px solid #0f0f14; box-shadow:4px 4px 0 #0f0f14; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:30px; color:#0f0f14; padding:0; cursor:pointer; }
    button.pf-num[data-a] { background:#3db4f2; }
    button.pf-num[data-a]:active { transform:translate(4px,4px); box-shadow:none; }
    .pf-num:disabled { opacity:1; }
    .pf-num.used { background:#e4e2d9; color:#8a8a92; border-color:#b9b7ae; text-decoration:line-through; box-shadow:none; }
    .pf-num.sp { background:#b08cff; color:#0f0f14; border-color:#0f0f14; text-decoration:none; }
    .pf-num.last { background:#ffce1f; color:#0f0f14; border-color:#0f0f14; text-decoration:none; }
    .pf-clue { font-size:22px; font-weight:800; line-height:1.3; color:#0f0f14; }
    .pf-clue small { display:block; font-family:'JetBrains Mono',monospace; color:#55555e; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; }
    .box.pf-read { background:#ffce1f; }
    .pf-read small { display:block; font-family:'JetBrains Mono',monospace; color:#0f0f14; font-size:12px; font-weight:700; letter-spacing:.06em; margin-bottom:8px; }
    .pf-read .pf-clue { font-size:26px; }
    .box.pf-auto { background:#b08cff; }
    .pf-auto small { display:block; font-family:'JetBrains Mono',monospace; color:#0f0f14; font-size:12px; font-weight:700; letter-spacing:.06em; margin-bottom:8px; }
    .pf-auto .pf-clue { font-size:24px; }
    .pf-auto .sub, .pf-read .sub, .box.hi .sub, .box.info .sub { color:#0f0f14; }
    .pf-ans { font-family:'Archivo',sans-serif; font-size:30px; font-weight:900; font-stretch:125%; text-transform:uppercase; text-align:center; line-height:1; color:#0f0f14; padding:18px 10px; background:#ffce1f; border:3px solid #0f0f14; box-shadow:4px 4px 0 #0f0f14; overflow-wrap:break-word; cursor:pointer; }
    .pf-ans.hid { background:#e4e2d9; font-family:'JetBrains Mono',monospace; font-stretch:100%; font-size:15px; font-weight:700; letter-spacing:.06em; border-style:dashed; box-shadow:none; }
    .pf-card { display:flex; flex-direction:column; gap:6px; max-height:50vh; overflow:auto; }
    .pf-card div { font-size:16px; line-height:1.35; padding:8px 10px; background:#fff; border:2px solid #0f0f14; display:flex; gap:10px; }
    .pf-card div b { font-family:'Pixelify Sans',monospace; min-width:24px; }
    .pf-card div.used { background:#e4e2d9; color:#55555e; border-color:#b9b7ae; } .pf-card div.used b::after { content:' ✓'; color:#0f0f14; }
    .pf-card div.sp { background:#efe6ff; }
    .pf-card div.now { background:#ffce1f; color:#0f0f14; border:3px solid #0f0f14; font-size:18px; font-weight:700; }
    .pf-hist { display:flex; flex-direction:column; gap:6px; max-height:40vh; overflow:auto; }
    .pf-hist div { font-size:16px; color:#0f0f14; padding:8px 10px; background:#fff; border:2px solid #0f0f14; }
    .pf-hist div b { font-family:'Pixelify Sans',monospace; background:#e4e2d9; border:2px solid #0f0f14; padding:0 5px; margin-right:8px; }
    .pf-hist div.sp b { background:#b08cff; }
    .pf-cat { display:inline-block; padding:5px 12px; border:3px solid #0f0f14; font-weight:900; font-stretch:115%; text-transform:uppercase; font-size:16px; color:#0f0f14; }
    .pf-role { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; background:#0f0f14; color:#ffce1f; padding:2px 6px; letter-spacing:.06em; text-transform:uppercase; }
    .pf-chip { display:inline-block; width:12px; height:12px; background:#3db4f2; border:2px solid #0f0f14; margin-left:3px; vertical-align:middle; }
    .pl.pf-med { background:#ffce1f; }
    .pl .pf-role { color:#ffce1f; font-size:11px; }
    .pl.pf-turn { background:#d7effc; }
  `;
  let styled = false;
  function ensureStyle() { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; }

  ARCADE.register('perfil', {
    phone: {
      html(c) {
        ensureStyle();
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G || !G.order) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const ply = i => c.C.players.find(p => p.pid === G.order[i]);
        const meIdx = G.order.indexOf(c.you.pid);
        const isMed = meIdx === G.mediator, isTurn = meIdx === G.turn && !isMed;
        const m = ply(G.mediator), g = ply(G.turn), L = G.last;
        if (G.round !== lastRound) { showAnswer = false; lastRound = G.round; }

        const nums = (card, action, lastN) => `<div class="pf-nums">${card.slots.map(x =>
          `<button class="pf-num ${x.used ? 'used' : ''} ${x.used && x.type && x.type !== 'clue' ? 'sp' : ''} ${x.n === lastN ? 'last' : ''}" ${action && !x.used ? `data-a="${action}" data-n="${x.n}"` : 'disabled'}>${x.n}</button>`).join('')}</div>`;
        const hist = list => list.length ? `<p class="pf-lab" style="margin-bottom:8px">Dicas já lidas</p><div class="pf-hist">${list.slice().reverse().map(r => `<div class="${r.type && r.type !== 'clue' ? 'sp' : ''}"><b>${r.n}</b>${r.text ? esc(r.text) : 'lida pelo mediador'}</div>`).join('')}</div>` : '';
        const autoBox = x => `<div class="box pf-auto"><small>DICA ${x.n} · INSTRUÇÃO AUTOMÁTICA</small><div class="pf-clue">${esc(x.text)}</div><p class="sub" style="margin-top:8px">${c.C.event ? c.hl(c.C.event.text) : ''}</p></div>`;
        const clueBox = (x, hi) => x.type !== 'clue' ? autoBox(x) : `<div class="box ${hi ? 'hi' : ''}"><div class="pf-clue"><small style="${hi ? 'color:#0f0f14' : ''}">Dica ${x.n}</small>${x.text ? esc(x.text) : 'Ouça o mediador ler a dica.'}</div></div>`;
        const chipBtn = () => (G.chips[c.you.pid] || 0) > 0 && !isMed && ['pick', 'guess', 'choose'].includes(G.phase)
          ? `<button class="btn blue" data-a="chip">Usar ficha azul: palpite agora!</button>` : '';

        // ---------- carta bônus ----------
        if ((G.phase === 'bonus' || G.phase === 'bonusguess') && G.bonus) {
          const b = G.bonus, bp = c.C.players.find(p => p.pid === b.player), bj = c.C.players.find(p => p.pid === b.judge);
          const judge = b.judge === c.you.pid, mine = b.player === c.you.pid;
          const bk = G.categories[b.card.cat];
          let h = `<div class="box warn center"><p class="mono" style="font-size:12px">CASA "?"</p><div class="pf-h" style="font-size:30px;margin-top:6px">Carta bônus</div>
            <p class="sub center" style="margin-top:10px;color:#0f0f14;font-size:16px">${nm(bp)} caiu na casa "?". Até 5 dicas, 1 palpite. ${nm(bj)} lê e julga.</p>
            <div class="center" style="margin-top:12px"><span class="pf-cat" style="background:${bk.color}">${bk.name}</span></div></div>`;
          h += c.timerHtml(mine ? 'Seu tempo na carta bônus.' : `Tempo de ${nm(bp)}`, G.turnMs);
          if (judge) {
            h += `<div class="box"><p class="pf-lab center" style="margin-bottom:10px">Você lê as dicas e julga. A resposta é:</p><div class="pf-ans">${esc(b.card.answer)}</div></div>`;
            if (b.picks.length) { const lp = b.picks[b.picks.length - 1]; h += `<div class="box pf-read"><small>LEIA EM VOZ ALTA · DICA ${lp.n}</small><div class="pf-clue">${esc(lp.text)}</div></div>`; }
          }
          h += `<div class="box"><p class="pf-lab" style="margin-bottom:12px"><b>${b.picks.length}</b> de 5 dicas · vale <b>${G.bonusTable[Math.max(0, b.picks.length - 1)]}</b> casas</p>
            ${nums(b.card, mine && G.phase === 'bonus' && b.picks.length < 5 ? 'bonusPick' : null, b.picks.length ? b.picks[b.picks.length - 1].n : 0)}</div>`;
          if (b.picks.length) h += `<div class="box">${judge ? hist(b.picks) : `<p class="sub">Dicas pedidas: <b class="pix">${b.picks.map(x => x.n).join(', ')}</b>. ${nm(bj)} lê em voz alta.</p>`}</div>`;
          if (mine && G.phase === 'bonus') h += `<button class="btn big warn" data-a="bonusGuess" ${b.picks.length ? '' : 'disabled'}>Dar o palpite (vale ${G.bonusTable[Math.max(0, b.picks.length - 1)]} casas)</button>`;
          if (mine && G.phase === 'bonusguess') h += `<div class="box hi center"><div class="pf-h" style="font-size:26px">Palpite!</div><p class="sub" style="margin-top:8px">Diga seu palpite em voz alta. ${nm(bj)} julga.</p></div>`;
          if (judge && G.phase === 'bonusguess') h += `<div class="row"><button class="btn big ok" data-a="bonusOk">✓ Acertou</button><button class="btn big no" data-a="bonusNo">✕ Errou</button></div>`;
          return h;
        }

        // ---------- vitória ----------
        if (G.phase === 'win') {
          const w = c.C.players.find(p => p.pid === G.winner);
          return `<div class="box pf-head center"><p class="mono" style="font-size:12px">FIM DE JOGO</p><div style="margin-top:12px">${c.avatar(w, 96)}</div><h2 class="pf-h" style="margin-top:10px;font-size:30px">${w ? esc(w.name) : ''} venceu!</h2></div>
            <div class="box">${c.playersHtml({ info: p => `casa <b class="pix" style="color:#0f0f14;font-size:18px">${G.pos[p.pid] || 0}</b>` })}</div>
            <button class="btn big warn" data-a="again">↻ Jogar Perfil de novo</button>`;
        }

        // ---------- rodada normal ----------
        const cat = G.categories[G.card.cat];
        let h = `<div class="box pf-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <span class="pf-cat" style="background:${cat.color}">${cat.name}</span>
          <span class="mono" style="font-size:12px;text-align:right"><span class="pix" style="font-size:16px">${G.usedCount}</span> USADAS · VALE <span class="pix" style="font-size:16px">${G.clues - G.usedCount}</span> CASAS</span></div>`;
        h += c.timerHtml(isTurn ? 'Seu tempo. Acabou, a vez passa.' : `Tempo de ${nm(g)}`, G.turnMs);

        if (isMed) {
          h += `<div class="box"><p class="pf-lab center" style="margin-bottom:12px"><span class="pf-role">mediador</span> Não fale a resposta!</p>
            ${showAnswer ? `<div class="pf-ans" data-a="hide">${esc(G.card.answer)}</div>` : `<div class="pf-ans hid" data-a="show">Toque para ver a resposta</div>`}</div>`;
          if (L && L.type !== 'clue') h += `<div class="box pf-auto"><small>DICA ${L.n} · INSTRUÇÃO AUTOMÁTICA · NADA PARA LER</small><div class="pf-clue">${esc(L.text)}</div><p class="sub" style="margin-top:8px">Já foi aplicada. ${c.C.event ? c.hl(c.C.event.text) : ''}</p></div>`;
          else if (L && (G.phase === 'guess' || G.phase === 'chip')) h += `<div class="box pf-read"><small>LEIA EM VOZ ALTA · DICA ${L.n} · PEDIDA POR ${c.hl(L.by)}</small><div class="pf-clue">${esc(L.text)}</div></div>`;
          if (G.phase === 'guess') h += `<div class="box hi center"><p class="sub">${nm(g)} pode dar 1 palpite. Acertou?</p></div><div class="row"><button class="btn big ok" data-a="ok">✓ Acertou</button><button class="btn big no" data-a="no">✕ Errou</button></div>`;
          else if (G.phase === 'chip') h += `<div class="box info center"><p class="sub"><span class="pf-chip"></span> ${nm(c.C.players.find(p => p.pid === G.chip.player))} usou a ficha azul. Acertou?</p></div><div class="row"><button class="btn big ok" data-a="ok">✓ Acertou</button><button class="btn big no" data-a="no">✕ Errou</button></div>`;
          else if (G.phase === 'pick') h += `<div class="box center"><p class="sub">${nm(g)} está escolhendo um número…</p></div>`;
          else if (G.phase === 'choose') h += `<div class="box center"><p class="sub">${nm(g)} está escolhendo um jogador…</p></div>`;
          h += `<div class="box"><p class="pf-lab" style="margin-bottom:10px">A carta · ✓ = já lida · amarela = a de agora</p>
            <div class="pf-card">${G.card.slots.map(x => `<div class="${x.used ? 'used' : ''} ${x.type !== 'clue' ? 'sp' : ''} ${L && x.n === L.n ? 'now' : ''}"><b>${x.n}</b><span>${esc(x.text)}</span></div>`).join('')}</div></div>`;
        } else if (G.phase === 'chip' && G.chip && G.chip.player === c.you.pid) {
          h += `<div class="box info center"><div class="pf-h" style="font-size:24px">Ficha azul!</div><p class="sub" style="margin-top:8px">Diga seu palpite em voz alta! ${nm(m)} julga.</p></div>`;
          if (L) h += clueBox(L);
          h += `<div class="box">${hist(G.revealed)}</div>`;
        } else if (isTurn && G.phase === 'pick') {
          if (L && L.type !== 'clue') h += autoBox(L);
          h += `<div class="box hi"><p class="pf-h center" style="font-size:24px">Sua vez!</p><p class="sub center" style="margin:6px 0 14px">Escolha um número de 1 a 20</p>${nums(G.card, 'pickNum', 0)}</div>` + chipBtn();
          if (G.revealed.length) h += `<div class="box">${hist(G.revealed)}</div>`;
        } else if (isTurn && G.phase === 'guess') {
          h += clueBox(L, true) + `<div class="box center"><div class="pf-h" style="font-size:24px">Palpite!</div><p class="sub" style="margin-top:8px">Sabe a resposta? Diga em voz alta. ${nm(m)} julga.<br>Se errar, a vez passa.</p></div>
            <button class="btn big" data-a="pass">Não sei: passar a vez</button>`;
          if (G.revealed.length > 1) h += `<div class="box">${hist(G.revealed.slice(0, -1))}</div>`;
        } else if (isTurn && G.phase === 'choose') {
          h += `<div class="box pf-auto"><small>DICA ${L.n} · INSTRUÇÃO AUTOMÁTICA</small><div class="pf-clue">${esc(L.text)}</div>
            <p class="sub" style="margin-top:8px">Escolha quem vai ${G.choose.type === 'escolhaAvance' ? 'AVANÇAR' : 'VOLTAR'} ${G.choose.x} casas (pode ser você ou o mediador):</p></div>`
            + c.C.players.filter(p => G.order.includes(p.pid)).map(p => `<button class="btn" data-a="escolher" data-pid="${p.pid}" style="display:flex;gap:10px;align-items:center;justify-content:flex-start">${c.avatar(p, 34)}${nm(p)} <span class="mono" style="font-size:12px;color:#55555e">CASA <span class="pix" style="font-size:16px;color:#0f0f14">${G.pos[p.pid] || 0}</span></span></button>`).join('');
        } else {
          const agora = G.phase === 'chip' ? `<span class="pf-chip"></span> ${nm(c.C.players.find(p => p.pid === G.chip.player))} usou a ficha azul.`
            : G.phase === 'pick' ? `${nm(g)} está escolhendo um número.`
            : G.phase === 'guess' ? `${nm(g)} pode dar um palpite.` : `${nm(g)} está escolhendo um jogador.`;
          h += `<div class="box center"><p class="sub" style="font-size:19px;color:#0f0f14;font-weight:700">${agora}</p><p class="sub mut" style="margin-top:10px"><span class="pf-role">mediador</span> ${nm(m)}</p></div>`;
          if (L) h += clueBox(L);
          h += chipBtn();
          if (G.revealed.length > 1) h += `<div class="box">${hist(G.revealed.slice(0, -1))}</div>`;
        }

        h += `${c.C.event ? `<p class="sub center">${c.hl(c.C.event.text)}</p>` : ''}
          <div class="box">${c.playersHtml({
            tag: p => { const i = G.order.indexOf(p.pid); return (i === G.mediator ? ' <span class="pf-role">mediador</span>' : '') + (i === G.turn && i !== G.mediator ? ' <span class="pf-role">vez</span>' : ''); },
            info: p => `casa <b class="pix" style="color:#0f0f14;font-size:17px">${G.pos[p.pid] || 0}</b>${G.chips[p.pid] ? ' ' + '<span class="pf-chip"></span>'.repeat(G.chips[p.pid]) : ''}`,
            cls: p => { const i = G.order.indexOf(p.pid); return i === G.mediator ? 'pf-med' : (i === G.turn ? 'pf-turn' : ''); },
          })}</div>`;
        return h;
      },

      after(c) {
        const G = c.G;
        if (!G || !G.order) return;
        if (!['pick', 'guess', 'choose', 'chip'].includes(G.phase)) { ovRound = G.round; ovTurn = G.turn; ovMed = G.mediator; return; }
        const first = ovRound === null;
        const novoRound = !first && G.round !== ovRound, novoMed = !first && G.mediator !== ovMed, novaVez = !first && G.turn !== ovTurn;
        ovRound = G.round; ovTurn = G.turn; ovMed = G.mediator;
        if (first || !(novoRound || novoMed || novaVez)) return;
        const m = c.C.players.find(p => p.pid === G.order[G.mediator]), g = c.C.players.find(p => p.pid === G.order[G.turn]);
        if (!m || !g) return;
        const big = novoRound || novoMed;
        const euMed = c.you && c.you.pid === m.pid, euVez = c.you && c.you.pid === g.pid;
        c.turnover(`${big ? `<div class="round">Rodada ${G.round}</div><div><small>MEDIADOR (lê as dicas)</small><div>${c.avatar(m, 72)}</div><span class="who2" style="${c.nmStyle(m)}">${c.esc(m.name)}</span></div>` : ''}
          <div><small>${big ? 'COMEÇA ADIVINHANDO' : 'AGORA É A VEZ DE'}</small><div>${c.avatar(g, big ? 72 : 110)}</div><span class="who2 ${big ? 'sm' : ''}" style="${c.nmStyle(g)}">${c.esc(g.name)}</span></div>
          ${euMed ? '<div class="who2 sm" style="background:#ffce1f;color:#0f0f14">O mediador é você!</div>' : euVez ? '<div class="who2 sm" style="background:#ffce1f;color:#0f0f14">É a sua vez!</div>' : ''}
          ${big ? '' : `<div class="round" style="font-size:15px">mediador: ${c.esc(m.name)}</div>`}`,
          big ? 4000 : 2400, euVez || euMed ? [90, 60, 90] : 60);
      },

      act(a, el, c) {
        const send = ARCADE.send;
        switch (a) {
          case 'pickNum': return send({ t: 'pick', n: Number(el.dataset.n) });
          case 'escolher': return send({ t: 'choose', pid: el.dataset.pid });
          case 'pass': return confirm('Passar a vez? Você não dá palpite nesta dica.') && send({ t: 'pass' });
          case 'ok': return send({ t: 'judge', ok: true });
          case 'no': return send({ t: 'judge', ok: false });
          case 'chip': return confirm('Usar a ficha azul agora? Você dá 1 palpite. Errando, a ficha se perde.') && send({ t: 'chip' });
          case 'bonusPick': return send({ t: 'bonusPick', n: Number(el.dataset.n) });
          case 'bonusGuess': return send({ t: 'bonusGuess' });
          case 'bonusOk': return send({ t: 'bonusJudge', ok: true });
          case 'bonusNo': return send({ t: 'bonusJudge', ok: false });
          case 'show': showAnswer = true; return ARCADE.redraw();
          case 'hide': showAnswer = false; return ARCADE.redraw();
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });

})();
