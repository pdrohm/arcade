// Perfil — tela do celular.
(() => {
  let showAnswer = false, ovRound = null, ovTurn = null, ovMed = null, lastRound = -1;

  const style = `
    .pf-nums { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .pf-num { aspect-ratio:1; border-radius:14px; background:#2a3350; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:28px; color:#fff; border:0; font-family:inherit; }
    .pf-num.used { background:#0b0e17; color:#4b5563; text-decoration:line-through; }
    .pf-num.sp { background:#7c3aed; } .pf-num.last { background:#f59e0b; color:#111; }
    .pf-clue { font-size:24px; font-weight:800; line-height:1.3; }
    .pf-clue small { display:block; color:#cbd5e1; font-size:15px; font-weight:700; margin-bottom:6px; }
    .pf-clue.sp { color:#c4b5fd; }
    .pf-read { background:#3b2f00; border:2px solid #f59e0b; }
    .pf-read small { color:#f59e0b; font-weight:900; letter-spacing:.5px; }
    .pf-read .pf-clue { font-size:28px; }
    .pf-auto { background:#2e1065; border:2px solid #a78bfa; }
    .pf-auto small { color:#c4b5fd; font-weight:900; letter-spacing:.5px; }
    .pf-auto .pf-clue { color:#fff; font-size:26px; }
    .pf-ans { font-size:36px; font-weight:900; text-align:center; color:#f59e0b; padding:12px; border:2px dashed #f59e0b; border-radius:14px; }
    .pf-ans.hid { color:#e5e7eb; border-color:#2a3350; font-size:20px; font-weight:600; }
    .pf-card { display:flex; flex-direction:column; gap:6px; max-height:50vh; overflow:auto; }
    .pf-card div { font-size:16px; line-height:1.35; padding:9px 10px; border-radius:8px; background:#0b0e17; display:flex; gap:8px; }
    .pf-card div b { color:#f59e0b; min-width:24px; }
    .pf-card div.used { opacity:.55; } .pf-card div.used b::after { content:' ✓'; color:#22c55e; }
    .pf-card div.now { opacity:1; background:#3b2f00; border:2px solid #f59e0b; font-size:18px; }
    .pf-card div.sp { color:#c4b5fd; }
    .pf-hist { display:flex; flex-direction:column; gap:6px; max-height:40vh; overflow:auto; }
    .pf-hist div { font-size:17px; color:#e5e7eb; padding:10px 12px; background:#0b0e17; border-radius:8px; }
    .pf-hist div b { color:#f59e0b; margin-right:6px; } .pf-hist div.sp { color:#c4b5fd; }
  `;
  let styled = false;
  function ensureStyle() { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; }

  ARCADE.register('perfil', {
    phone: {
      html(c) {
        ensureStyle();
        const { G, esc, nm } = c;
        if (!G || !G.order) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const ply = i => c.C.players.find(p => p.pid === G.order[i]);
        const meIdx = G.order.indexOf(c.you.pid);
        const isMed = meIdx === G.mediator, isTurn = meIdx === G.turn && !isMed;
        const m = ply(G.mediator), g = ply(G.turn), L = G.last;
        if (G.round !== lastRound) { showAnswer = false; lastRound = G.round; }

        const nums = (card, action, lastN) => `<div class="pf-nums">${card.slots.map(x =>
          `<button class="pf-num ${x.used ? 'used' : ''} ${x.used && x.type && x.type !== 'clue' ? 'sp' : ''} ${x.n === lastN ? 'last' : ''}" ${action && !x.used ? `data-a="${action}" data-n="${x.n}"` : 'disabled'}>${x.n}</button>`).join('')}</div>`;
        const hist = list => list.length ? `<div class="pf-hist">${list.slice().reverse().map(r => `<div class="${r.type && r.type !== 'clue' ? 'sp' : ''}"><b>${r.n}</b>${r.text ? esc(r.text) : '🔊 lida pelo mediador'}</div>`).join('')}</div>` : '';
        const autoBox = x => `<div class="box pf-auto"><small>⚡ DICA ${x.n} · INSTRUÇÃO AUTOMÁTICA</small><div class="pf-clue">${esc(x.text)}</div><p class="sub" style="margin-top:6px">${c.C.event ? c.hl(c.C.event.text) : ''}</p></div>`;
        const clueBox = (x, hi) => x.type !== 'clue' ? autoBox(x) : `<div class="box ${hi ? 'hi' : ''}"><div class="pf-clue"><small>Dica ${x.n}</small>${x.text ? esc(x.text) : '🔊 Ouça o mediador ler a dica.'}</div></div>`;
        const chipBtn = () => (G.chips[c.you.pid] || 0) > 0 && !isMed && ['pick', 'guess', 'choose'].includes(G.phase)
          ? `<button class="btn blue" data-a="chip">🔵 Usar ficha azul: palpite agora!</button>` : '';

        // ---------- carta bônus ----------
        if ((G.phase === 'bonus' || G.phase === 'bonusguess') && G.bonus) {
          const b = G.bonus, bp = c.C.players.find(p => p.pid === b.player), bj = c.C.players.find(p => p.pid === b.judge);
          const judge = b.judge === c.you.pid, mine = b.player === c.you.pid;
          const bk = G.categories[b.card.cat];
          let h = `<div class="box warn"><div class="center" style="font-size:24px;font-weight:900">❓ CARTA BÔNUS</div>
            <p class="sub center">${nm(bp)} caiu na casa "?". Até 5 dicas, 1 palpite. ${nm(bj)} lê e julga.</p>
            <div class="center" style="margin-top:10px"><span class="badge" style="background:${bk.color};color:${bk.text}">${bk.name}</span></div></div>`;
          h += c.timerHtml(mine ? 'Seu tempo na carta bônus.' : `Tempo de ${nm(bp)}`, G.turnMs);
          if (judge) {
            h += `<div class="box"><p class="sub center">Você lê as dicas e julga. A resposta é:</p><div class="pf-ans">${esc(b.card.answer)}</div></div>`;
            if (b.picks.length) { const lp = b.picks[b.picks.length - 1]; h += `<div class="box pf-read"><small>🔊 LEIA EM VOZ ALTA · DICA ${lp.n}</small><div class="pf-clue">${esc(lp.text)}</div></div>`; }
          }
          h += `<div class="box"><p class="sub mut" style="margin-bottom:8px">${b.picks.length} de 5 dicas · vale ${G.bonusTable[Math.max(0, b.picks.length - 1)]} casas</p>
            ${nums(b.card, mine && G.phase === 'bonus' && b.picks.length < 5 ? 'bonusPick' : null, b.picks.length ? b.picks[b.picks.length - 1].n : 0)}</div>`;
          if (b.picks.length) h += `<div class="box">${judge ? hist(b.picks) : `<p class="sub">Dicas pedidas: ${b.picks.map(x => x.n).join(', ')}. 🔊 ${nm(bj)} lê em voz alta.</p>`}</div>`;
          if (mine && G.phase === 'bonus') h += `<button class="btn big warn" data-a="bonusGuess" ${b.picks.length ? '' : 'disabled'}>🗣️ Dar o palpite (vale ${G.bonusTable[Math.max(0, b.picks.length - 1)]} casas)</button>`;
          if (mine && G.phase === 'bonusguess') h += `<div class="box center"><div class="big-emoji">🗣️</div><p class="sub">Diga seu palpite em voz alta. ${nm(bj)} julga.</p></div>`;
          if (judge && G.phase === 'bonusguess') h += `<div class="row"><button class="btn big ok" data-a="bonusOk">✔ Acertou</button><button class="btn big no" data-a="bonusNo">✘ Errou</button></div>`;
          return h;
        }

        // ---------- vitória ----------
        if (G.phase === 'win') {
          const w = c.C.players.find(p => p.pid === G.winner);
          return `<div class="box center"><div class="big-emoji">🏆</div><h2 style="margin:8px 0;font-size:30px">${nm(w)} venceu!</h2></div>
            <div class="box">${c.playersHtml({ info: p => `casa ${G.pos[p.pid] || 0}` })}</div>
            <button class="btn big ok" data-a="again">🔄 Jogar Perfil de novo</button>`;
        }

        // ---------- rodada normal ----------
        const cat = G.categories[G.card.cat];
        let h = `<div class="box"><div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge" style="background:${cat.color};color:${cat.text}">${cat.name}</span>
          <span class="sub mut">${G.usedCount} usadas · vale ${G.clues - G.usedCount} casas</span></div></div>`;
        h += c.timerHtml(isTurn ? 'Seu tempo. Acabou, a vez passa.' : `Tempo de ${nm(g)}`, G.turnMs);

        if (isMed) {
          h += `<div class="box"><p class="sub center" style="margin-bottom:8px">📖 Você é o mediador. Não fale a resposta!</p>
            ${showAnswer ? `<div class="pf-ans" data-a="hide">${esc(G.card.answer)}</div>` : `<div class="pf-ans hid" data-a="show">👆 Toque para ver a resposta</div>`}</div>`;
          if (L && L.type !== 'clue') h += `<div class="box pf-auto"><small>⚡ DICA ${L.n} · INSTRUÇÃO AUTOMÁTICA · nada para ler</small><div class="pf-clue">${esc(L.text)}</div><p class="sub" style="margin-top:6px">Já foi aplicada. ${c.C.event ? c.hl(c.C.event.text) : ''}</p></div>`;
          else if (L && (G.phase === 'guess' || G.phase === 'chip')) h += `<div class="box pf-read"><small>🔊 LEIA EM VOZ ALTA · DICA ${L.n} · pedida por ${c.hl(L.by)}</small><div class="pf-clue">${esc(L.text)}</div></div>`;
          if (G.phase === 'guess') h += `<div class="box hi center"><p class="sub">🗣️ ${nm(g)} pode dar 1 palpite. Acertou?</p></div><div class="row"><button class="btn big ok" data-a="ok">✔ Acertou</button><button class="btn big no" data-a="no">✘ Errou</button></div>`;
          else if (G.phase === 'chip') h += `<div class="box info center"><p class="sub">🔵 ${nm(c.C.players.find(p => p.pid === G.chip.player))} usou a ficha azul. Acertou?</p></div><div class="row"><button class="btn big ok" data-a="ok">✔ Acertou</button><button class="btn big no" data-a="no">✘ Errou</button></div>`;
          else if (G.phase === 'pick') h += `<div class="box center"><p class="sub">🎯 ${nm(g)} está escolhendo um número…</p></div>`;
          else if (G.phase === 'choose') h += `<div class="box center"><p class="sub">${nm(g)} está escolhendo um jogador…</p></div>`;
          h += `<div class="box"><p class="sub mut" style="margin-bottom:6px">A carta · ✓ = já lida · destacada = a de agora</p>
            <div class="pf-card">${G.card.slots.map(x => `<div class="${x.used ? 'used' : ''} ${x.type !== 'clue' ? 'sp' : ''} ${L && x.n === L.n ? 'now' : ''}"><b>${x.n}</b><span>${esc(x.text)}</span></div>`).join('')}</div></div>`;
        } else if (G.phase === 'chip' && G.chip && G.chip.player === c.you.pid) {
          h += `<div class="box info center"><div class="big-emoji">🔵</div><p class="sub">Diga seu palpite em voz alta! ${nm(m)} julga.</p></div>`;
          if (L) h += clueBox(L);
          h += `<div class="box">${hist(G.revealed)}</div>`;
        } else if (isTurn && G.phase === 'pick') {
          if (L && L.type !== 'clue') h += autoBox(L);
          h += `<div class="box hi"><p class="sub center" style="margin-bottom:10px">🎯 Sua vez! Escolha um número de 1 a 20</p>${nums(G.card, 'pickNum', 0)}</div>` + chipBtn();
          if (G.revealed.length) h += `<div class="box">${hist(G.revealed)}</div>`;
        } else if (isTurn && G.phase === 'guess') {
          h += clueBox(L, true) + `<div class="box center"><div class="big-emoji">🗣️</div><p class="sub">Sabe a resposta? Diga em voz alta. ${nm(m)} julga.<br>Se errar, a vez passa.</p></div>
            <button class="btn big warn" data-a="pass">🙅 Não sei — passar a vez</button>`;
          if (G.revealed.length > 1) h += `<div class="box">${hist(G.revealed.slice(0, -1))}</div>`;
        } else if (isTurn && G.phase === 'choose') {
          h += `<div class="box pf-auto"><small>⚡ DICA ${L.n} · INSTRUÇÃO AUTOMÁTICA</small><div class="pf-clue">${esc(L.text)}</div>
            <p class="sub" style="margin-top:8px">Escolha quem vai ${G.choose.type === 'escolhaAvance' ? 'AVANÇAR' : 'VOLTAR'} ${G.choose.x} casas (pode ser você ou o mediador):</p></div>`
            + c.C.players.filter(p => G.order.includes(p.pid)).map(p => `<button class="btn" data-a="escolher" data-pid="${p.pid}" style="display:flex;gap:10px;align-items:center;justify-content:flex-start">${nm(p)} <span class="sub mut">casa ${G.pos[p.pid] || 0}</span></button>`).join('');
        } else {
          const agora = G.phase === 'chip' ? `🔵 ${nm(c.C.players.find(p => p.pid === G.chip.player))} usou a ficha azul.`
            : G.phase === 'pick' ? `🎯 ${nm(g)} está escolhendo um número.`
            : G.phase === 'guess' ? `🗣️ ${nm(g)} pode dar um palpite.` : `${nm(g)} está escolhendo um jogador.`;
          h += `<div class="box center"><p class="sub" style="font-size:20px">${agora}</p><p class="sub mut" style="margin-top:8px">Mediador: 📖 ${nm(m)}</p></div>`;
          if (L) h += clueBox(L);
          h += chipBtn();
          if (G.revealed.length > 1) h += `<div class="box">${hist(G.revealed.slice(0, -1))}</div>`;
        }

        h += `${c.C.event ? `<p class="sub center">${c.hl(c.C.event.text)}</p>` : ''}
          <div class="box">${c.playersHtml({
            tag: p => { const i = G.order.indexOf(p.pid); return (i === G.mediator ? ' 📖' : '') + (i === G.turn && i !== G.mediator ? ' 🎯' : ''); },
            info: p => `casa ${G.pos[p.pid] || 0}${G.chips[p.pid] ? ' ' + '🔵'.repeat(G.chips[p.pid]) : ''}`,
            border: p => { const i = G.order.indexOf(p.pid); return i === G.mediator ? '#f59e0b' : (i === G.turn ? '#fff' : ''); },
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
        c.turnover(`${big ? `<div class="round">Rodada ${G.round}</div><div><small>📖 MEDIADOR (lê as dicas)</small><span class="who2" style="${c.nmStyle(m)}">${c.esc(m.name)}</span></div>` : ''}
          <div><small>🎯 ${big ? 'COMEÇA ADIVINHANDO' : 'AGORA É A VEZ DE'}</small><span class="who2 ${big ? 'sm' : ''}" style="${c.nmStyle(g)}">${c.esc(g.name)}</span></div>
          ${euMed ? '<div class="mine">📖 O mediador é você!</div>' : euVez ? '<div class="mine">🎯 É a sua vez!</div>' : ''}
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
