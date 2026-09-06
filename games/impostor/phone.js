// Impostor — tela do celular. Cada um só vê a própria palavra.
'use strict';
(() => {
  let styled = false, aberto = false, lastRound = -1, ovKey = '';
  const style = `
    .imp-hid { border-radius:20px; background:linear-gradient(135deg,#0ea5e9,#1e3a8a); padding:34px 18px; text-align:center; font-size:22px; font-weight:900; line-height:1.3; }
    .imp-open { border-radius:20px; background:#0b0e17; border:3px solid #0ea5e9; padding:28px 18px; text-align:center; }
    .imp-open .w { font-size:40px; font-weight:900; line-height:1.15; word-break:break-word; }
    .imp-open .k { font-size:16px; color:#9aa6c0; font-weight:800; letter-spacing:2px; text-transform:uppercase; }
    .imp-imp { border-color:#ef4444 !important; }
    .imp-imp .w { color:#ef4444; }
    .imp-o { padding:12px 16px; border-radius:12px; background:#2a3350; font-weight:900; font-size:18px; text-align:center; }
    .imp-o.sel { background:#f59e0b; color:#111; }
    .imp-o.off { opacity:.35; }
    .imp-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .imp-cl { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; background:#0b0e17; border:2px solid transparent; }
    .imp-cl.now { border-color:#facc15; }
    .imp-cl.dead { opacity:.4; }
    .imp-cl b { flex:1; text-align:right; font-size:20px; font-weight:900; word-break:break-word; }
    .imp-in { display:flex; gap:8px; } .imp-in input { flex:1; }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const ply = (c, pid) => c.C.players.find(p => p.pid === pid);

  function listaDicas(c, so) {
    const G = c.G;
    return `<div class="box" style="display:flex;flex-direction:column;gap:8px"><p class="sub mut">Dicas ditas</p>
      ${(so || G.order).map(pid => { const p = ply(c, pid); if (!p) return '';
        const cl = G.clues[pid] || [];
        return `<div class="imp-cl ${G.speaker === pid ? 'now' : ''} ${G.out.includes(pid) ? 'dead' : ''}">${c.nm(p)}<b>${cl.length ? cl.map(c.esc).join(' · ') : '<span class="mut" style="font-size:15px">—</span>'}</b></div>`;
      }).join('')}</div>`;
  }
  function minhaPalavra(c, curta) {
    const m = c.G.mine; if (!m) return '';
    if (!aberto) return `<div class="imp-hid" data-a="ver">👆 Toque para ver ${curta ? 'de novo' : 'sua palavra'}<br><small style="font-size:15px;opacity:.85">ninguém pode olhar sua tela</small></div>`;
    if (m.impostor) return `<div class="imp-open imp-imp" data-a="esconder"><div class="k">seu papel</div><div class="w">🕵️ VOCÊ É O IMPOSTOR</div>${m.hint
      ? `<div class="k" style="margin-top:14px">dica</div><div class="w" style="font-size:26px;color:#fff">${c.esc(m.hint)}</div>`
      : '<p class="sub mut" style="margin-top:8px">Descubra qual é a palavra sem ser descoberto.</p>'}</div>`;
    return `<div class="imp-open" data-a="esconder"><div class="k">sua palavra</div><div class="w">${c.esc(m.word)}</div></div>`;
  }
  function placar(c) {
    const G = c.G;
    return `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>${c.playersHtml({
      info: p => `${G.scores[p.pid] || 0} pts${(G.gain || {})[p.pid] ? ` (+${G.gain[p.pid]})` : ''}`,
      tag: p => (G.impostors || []).includes(p.pid) ? ' 🕵️' : '',
    })}</div>`;
  }

  ARCADE.register('impostor', {
    phone: {
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase, G.round, G.turn, G.seen.length, G.voted.length, G.endVotes.length, G.out.length, G.result ? 1 : 0, G.guess ? 1 : 0,
          aberto ? 1 : 0, G.mine ? G.mine.myVote : '', G.phase === 'setup' ? JSON.stringify(G.cfg) : ''].join('|');
      },
      html(c) {
        ensure();
        const G = c.G, esc = c.esc; if (!G || !c.you) return '';
        const m = G.mine || {};
        const opt = (a, vals, cur, fmt) => `<div class="imp-opt">${vals.map(v => `<div class="imp-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;

        if (G.phase === 'setup') {
          const cfg = G.cfg, max = Math.max(1, cfg.maxImp || 1);
          const impVals = []; for (let i = 1; i <= max; i++) impVals.push(i);
          return `<div class="box center"><h2 style="font-size:26px">⚙️ Regras</h2><p class="sub mut" style="margin-top:6px">Qualquer um pode mudar. Vale para todos.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Número de impostores <span class="mut">(máximo ${max} com ${c.C.players.length} jogadores)</span></p>
              <div class="imp-opt">${impVals.map(v => `<div class="imp-o ${v === cfg.impostorsReal ? 'sel' : ''}" data-a="cfgImp" data-v="${v}">${v}</div>`).join('')}</div>
              ${cfg.impostors > max ? `<p class="sub mut" style="margin-top:8px">Escolheram ${cfg.impostors}, mas com ${c.C.players.length} jogadores vale ${cfg.impostorsReal}.</p>` : ''}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Modo de dica <span class="mut">(o impostor recebe uma dica da palavra)</span></p>
              <div class="imp-opt"><div class="imp-o ${cfg.hint ? 'sel' : ''}" data-a="cfgHint" data-v="1">Com dica</div><div class="imp-o ${cfg.hint ? '' : 'sel'}" data-a="cfgHint" data-v="0">Sem dica</div></div></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Modo Mister White <span class="mut">(o impostor recebe uma palavra parecida)</span></p>
              <div class="imp-opt"><div class="imp-o ${cfg.white ? 'sel' : ''}" data-a="cfgWhite" data-v="1">Ligado</div><div class="imp-o ${cfg.white ? '' : 'sel'}" data-a="cfgWhite" data-v="0">Desligado</div></div></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Voltas de dicas</p>${opt('cfgLaps', [1, 2], cfg.laps)}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Tempo de discussão</p>${opt('cfgTime', [60, 90, 120, 180], cfg.discussSec, v => v + 's')}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Palavras por partida</p>${opt('cfgRounds', [3, 5, 8, 10], cfg.rounds)}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Categorias <span class="mut">(${cfg.cats.length})</span></p>
              <div class="imp-opt">${G.cats.map(k => `<div class="imp-o ${cfg.cats.includes(k.id) ? 'sel' : 'off'}" data-a="cfgCat" data-id="${k.id}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:12px">↺ Regras padrão</button></div>
            <button class="btn big ok" data-a="begin" ${c.C.players.length >= 3 ? '' : 'disabled'}>▶ Começar</button>
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        if (G.phase === 'reveal') {
          return `<div class="box center"><p class="sub mut">Palavra ${G.round} de ${G.rounds}</p><h2 style="font-size:24px;margin-top:4px">Sua palavra secreta</h2></div>
            ${minhaPalavra(c)}
            ${m.seen ? `<div class="box center"><p class="sub">✅ Esperando os outros… (${G.seen.length}/${c.C.players.length})</p></div>`
              : `<button class="btn big ok" data-a="javi" ${aberto ? '' : 'disabled'}>👍 Já vi</button>`}
            <div class="box">${c.playersHtml({ info: p => G.seen.includes(p.pid) ? '✅' : '⏳' })}</div>`;
        }

        if (G.phase === 'clues') {
          const minha = G.speaker === c.you.pid, sp = ply(c, G.speaker);
          const off = sp && sp.on === false;
          return `<div class="box center"><p class="sub mut">Palavra ${G.round} de ${G.rounds} · volta ${Math.floor(G.turn / Math.max(1, G.order.length)) + 1} de ${G.laps}</p>
              <h2 style="font-size:24px;margin-top:4px">${minha ? '🎤 Sua vez!' : `Vez de ${sp ? esc(sp.name) : '—'}`}</h2>
              <p class="sub mut" style="margin-top:6px">Uma palavra só, sem espaço. Não pode ser a palavra secreta.</p></div>
            ${minha ? `<div class="box"><div class="imp-in"><input id="imp-clue" maxlength="20" placeholder="sua dica" autocomplete="off" autocapitalize="none" enterkeyhint="send"></div>
                <button class="btn ok" style="margin-top:10px" data-a="dica">Falar dica</button></div>`
              : off ? `<button class="btn warn" data-a="skip">⏭️ Pular ${esc(sp.name)} (sem conexão)</button>` : ''}
            ${listaDicas(c)}
            ${minhaPalavra(c, true)}`;
        }

        if (G.phase === 'discuss') {
          return `<div class="box center"><h2 style="font-size:24px">💬 ${G.revote ? 'Empate! Discussão relâmpago' : 'Discutam!'}</h2><p class="sub mut" style="margin-top:6px">Quem parece o impostor?</p></div>
            ${c.timerHtml('', G.turnMs)}
            <button class="btn ${m.endVoted ? 'ok' : 'warn'}" data-a="endnow">${m.endVoted ? '✅ Você quer votar agora' : '🗳️ Votar agora'} (${G.endVotes.length}/${G.need})</button>
            ${listaDicas(c)}
            ${minhaPalavra(c, true)}`;
        }

        if (G.phase === 'vote') {
          if (m.out) return `<div class="box center"><h2 style="font-size:24px">💀 Você está fora</h2><p class="sub mut" style="margin-top:6px">Assista à votação na TV.</p></div>${listaDicas(c)}`;
          const alvos = G.alive.filter(pid => pid !== c.you.pid);
          return `<div class="box center"><h2 style="font-size:24px">🗳️ Vote no impostor</h2><p class="sub mut" style="margin-top:6px">${G.voted.length} de ${G.nAlive} já votaram</p></div>
            <div style="display:flex;flex-direction:column;gap:10px">${alvos.map(pid => { const p = ply(c, pid); if (!p) return '';
              const cl = (G.clues[pid] || []).join(' · ');
              return `<button class="btn" data-a="votar" data-pid="${pid}" style="display:flex;align-items:center;gap:12px;justify-content:flex-start;text-align:left;${m.myVote === pid ? 'outline:4px solid #fff' : ''}">
                <span class="dot" style="background:${c.ci(p.color).hex};width:26px;height:26px"></span><span style="flex:1">${esc(p.name)}<br><small style="font-size:14px;opacity:.7">${esc(cl) || '—'}</small></span>${m.myVote === pid ? '✅' : ''}</button>`;
            }).join('')}</div>
            <button class="btn ghost" data-a="fechar" ${G.voted.length >= G.need ? '' : 'disabled'}>🔒 Fechar votação (${G.voted.length}/${G.need})</button>
            ${minhaPalavra(c, true)}`;
        }

        if (G.phase === 'result') {
          const R = G.result || {}, alvo = ply(c, R.out);
          let h = `<div class="box center">`;
          if (R.aborted) h += `<div class="big-emoji">🚪</div><h2 style="font-size:24px;margin-top:8px">Rodada encerrada</h2>`;
          else if (R.tie) h += `<div class="big-emoji">🤝</div><h2 style="font-size:24px;margin-top:8px">Empate!</h2><p class="sub" style="margin-top:6px">${R.over ? 'Empatou de novo: o impostor escapou.' : 'Ninguém eliminado. Mais 30 segundos de discussão.'}</p>`;
          else h += `<div class="big-emoji">${R.wasImp ? '🕵️' : '😬'}</div><h2 style="font-size:24px;margin-top:8px">${alvo ? esc(alvo.name) : '—'} ${R.wasImp ? 'ERA o impostor!' : 'não era o impostor.'}</h2>`;
          h += `${G.word ? `<p class="sub" style="margin-top:10px">A palavra era <b style="font-size:22px">${esc(G.word)}</b></p>` : '<p class="sub mut" style="margin-top:10px">A palavra continua secreta.</p>'}
            ${G.whiteWord ? `<p class="sub mut">o impostor tinha "${esc(G.whiteWord)}"</p>` : ''}
            ${(G.impostors || []).length ? `<p class="sub mut" style="margin-top:6px">Impostor: ${(G.impostors || []).map(p => c.nm(ply(c, p))).join(' ')}</p>` : ''}</div>
            <button class="btn big warn" data-a="next">${R.over ? 'Continuar ➡️' : 'Continuar a caçada ➡️'}</button>${listaDicas(c)}`;
          return h;
        }

        if (G.phase === 'guess') {
          if (m.canGuess) return `<div class="box center"><div class="big-emoji">🎯</div><h2 style="font-size:24px;margin-top:8px">Chance final!</h2><p class="sub mut" style="margin-top:6px">Qual era a palavra secreta? Acertou, +1 ponto.</p></div>
            <div class="box"><input id="imp-guess" maxlength="40" placeholder="a palavra secreta" autocomplete="off" enterkeyhint="send"><button class="btn ok" style="margin-top:10px" data-a="chute">Chutar</button></div>
            <button class="btn ghost" data-a="next">Desistir</button>`;
          return `<div class="box center"><div class="big-emoji">🎯</div><h2 style="font-size:22px;margin-top:8px">O impostor está chutando a palavra…</h2></div>`;
        }

        const R = G.result || {};
        if (G.phase === 'scores') return `<div class="box center"><h2 style="font-size:24px">Palavra ${G.round} de ${G.rounds}</h2>
            <p class="sub" style="margin-top:6px">${esc(G.word || '')} · ${R.winner === 'inocentes' ? '✅ inocentes' : R.winner === 'impostores' ? '😈 impostor' : 'sem vencedor'}</p>
            ${G.guess && G.guess.text ? `<p class="sub mut">chute: "${esc(G.guess.text)}" ${G.guess.ok ? '✅' : '❌'}</p>` : ''}</div>
          ${placar(c)}<button class="btn big ok" data-a="next">Próxima palavra ➡️</button>`;
        const lider = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0))[0];
        return `<div class="box center"><div class="big-emoji">🏆</div><h2 style="font-size:28px;margin-top:8px">${c.nm(lider)} venceu!</h2></div>
          ${placar(c)}<button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
      },
      after(c) {
        const G = c.G; if (!G) return;
        if (G.round !== lastRound) { lastRound = G.round; aberto = false; }
        if (G.phase === 'setup') aberto = false;
        const i = document.getElementById('imp-clue');
        if (i && !i._imp) { i._imp = true; i.focus(); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ARCADE.games.impostor.phone.act('dica', null, c); } }); }
        const g = document.getElementById('imp-guess');
        if (g && !g._imp) { g._imp = true; g.focus(); g.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ARCADE.games.impostor.phone.act('chute', null, c); } }); }
        // é a sua vez de dar a dica: aviso em tela cheia
        const k = `${G.round}:${G.turn}`;
        if (G.phase === 'clues' && G.speaker === c.you.pid && ovKey !== k) {
          ovKey = k;
          c.turnover(`<div class="round">Palavra ${G.round}</div><small>sua vez</small><div class="who2" style="${c.nmStyle(c.C.players.find(p => p.pid === c.you.pid))}">Dê sua dica</div><div class="mine">uma palavra só</div>`, 1800, [60, 60, 160]);
          c.chord([784, 1046]);
        }
        if (G.phase !== 'clues') ovKey = '';
      },
      act(a, el, c) {
        const send = ARCADE.send, cfg = c && c.G ? c.G.cfg : null;
        switch (a) {
          case 'cfgImp': return send({ t: 'config', cfg: { impostors: Number(el.dataset.v) } });
          case 'cfgHint': return send({ t: 'config', cfg: { hint: el.dataset.v === '1' } });
          case 'cfgWhite': return send({ t: 'config', cfg: { white: el.dataset.v === '1' } });
          case 'cfgLaps': return send({ t: 'config', cfg: { laps: Number(el.dataset.v) } });
          case 'cfgTime': return send({ t: 'config', cfg: { discussSec: Number(el.dataset.v) } });
          case 'cfgRounds': return send({ t: 'config', cfg: { rounds: Number(el.dataset.v) } });
          case 'cfgCat': { const id = el.dataset.id; const l = cfg.cats.includes(id) ? cfg.cats.filter(x => x !== id) : [...cfg.cats, id]; if (!l.length) return ARCADE.toast('Deixe pelo menos uma categoria.'); return send({ t: 'config', cfg: { cats: l } }); }
          case 'cfgReset': if (confirm('Voltar às regras padrão?')) send({ t: 'config', cfg: { reset: true } }); return;
          case 'begin': return send({ t: 'begin' });
          case 'ver': aberto = true; return ARCADE.redraw();
          case 'esconder': aberto = false; return ARCADE.redraw();
          case 'javi': aberto = false; return send({ t: 'seen' });
          case 'dica': { const i = document.getElementById('imp-clue'); const v = i && i.value.trim(); if (!v) return; if (/\s/.test(v)) return ARCADE.toast('Uma palavra só, sem espaço.'); i.value = ''; return send({ t: 'clue', text: v }); }
          case 'skip': return send({ t: 'skip' });
          case 'endnow': return send({ t: 'endnow' });
          case 'votar': return send({ t: 'vote', pid: el.dataset.pid });
          case 'fechar': return send({ t: 'closevote' });
          case 'chute': { const i = document.getElementById('imp-guess'); const v = i && i.value.trim(); if (!v) return; i.value = ''; return send({ t: 'guess', text: v }); }
          case 'next': return send({ t: 'next' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });
})();
