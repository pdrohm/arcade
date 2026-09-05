// Palavra Secreta — tela do celular. Só quem dá as dicas vê a palavra.
(() => {
  let styled = false, lastTurnTag = '', lastEnd = '';
  const style = `
    .ps-word { font-size:56px; font-weight:900; text-align:center; line-height:1.05; padding:22px 10px; border-radius:18px;
      background:#0b0e17; border:2px solid #14b8a6; text-transform:uppercase; word-break:break-word; }
    .ps-cat { text-align:center; font-size:15px; font-weight:800; color:#5eead4; letter-spacing:2px; text-transform:uppercase; margin-top:8px; }
    .ps-big { padding:34px; font-size:32px; }
    .ps-team { border-radius:16px; padding:18px 12px; text-align:center; font-weight:900; font-size:22px; color:#08211f; border:4px solid transparent; }
    .ps-team.sel { border-color:#fff; box-shadow:0 0 0 3px #0008; }
    .ps-team small { display:block; font-weight:700; font-size:14px; opacity:.85; margin-top:6px; }
    .ps-teams { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ps-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .ps-o { padding:12px 16px; border-radius:12px; background:#2a3350; font-weight:900; font-size:18px; min-width:52px; text-align:center; }
    .ps-o.sel { background:#14b8a6; color:#04211d; }
    .ps-c { padding:10px 14px; border-radius:12px; background:#2a3350; font-weight:800; font-size:16px; opacity:.4; }
    .ps-c.sel { background:#0f766e; color:#e6fffb; opacity:1; }
    .ps-w { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; background:#0b0e17; font-size:18px; font-weight:700; }
    .ps-w.no { color:#94a3b8; }
    .ps-score { display:flex; align-items:center; gap:12px; padding:12px; border-radius:12px; background:#0b0e17; font-size:20px; font-weight:900; }
    .ps-score b { flex:1; }
  `;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const tname = i => 'Time ' + (i + 1);

  ARCADE.register('palavrasecreta', {
    phone: {
      // redesenha só quando muda de verdade (a palavra troca sem piscar o resto)
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase, G.round, G.turn, G.clue, G.guess, G.word || '', G.hits, G.myTeam,
          G.phase === 'setup' ? JSON.stringify(G.cfg) + ':' + G.teams.map(t => t.players.join(',')).join('|') : ''].join(':');
      },

      html(c) {
        ensureStyle();
        const { G, esc, nm } = c;
        if (!G || !G.teams) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const ply = pid => c.C.players.find(p => p.pid === pid) || null;
        const col = i => G.colors[i % G.colors.length];
        const eu = c.you ? c.you.pid : null;
        const souClue = eu && eu === G.clue, souGuess = eu && eu === G.guess;
        const meuTime = G.myTeam;
        const placar = () => `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>
          <div style="display:flex;flex-direction:column;gap:8px">${G.teams.map((t, i) => `<div class="ps-score" style="border-left:6px solid ${col(i)}">
            <b style="color:${col(i)}">${tname(i)}</b><span>${t.score}</span></div>`).join('')}</div></div>`;

        // ---------- preparação ----------
        if (G.phase === 'setup') {
          const cfg = G.cfg;
          const opt = (a, vals, curv, fmt) => `<div class="ps-opt">${vals.map(v => `<div class="ps-o ${v === curv ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          const todas = G.catIds.every(id => cfg.cats.includes(id));
          return `<div class="box center"><h2 style="font-size:26px">🗝️ Palavra Secreta</h2>
              <p class="sub mut" style="margin-top:6px">Qualquer um pode mudar as regras. Vale para todos.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Quantos times</p>${opt('cfgTeams', G.teamOpts, cfg.teams)}
              ${G.teamOpts.length ? '' : '<p class="sub mut">Precisa de pelo menos 4 jogadores.</p>'}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Como formar os times</p>
              <div class="ps-opt"><div class="ps-o ${cfg.auto ? 'sel' : ''}" data-a="cfgAuto" data-v="1">🎲 Sorteio</div><div class="ps-o ${cfg.auto ? '' : 'sel'}" data-a="cfgAuto" data-v="0">✋ Escolher</div></div></div>
            ${cfg.auto ? '' : `<div class="box"><p class="sub" style="margin-bottom:8px">Toque no seu time</p>
              <div class="ps-teams">${G.teams.map((t, i) => `<div class="ps-team ${meuTime === i ? 'sel' : ''}" style="background:${col(i)}" data-a="time" data-i="${i}">${tname(i)}
                <small>${t.players.map(pid => { const p = ply(pid); return p ? esc(p.name) : ''; }).filter(Boolean).join(', ') || 'vazio'}</small></div>`).join('')}</div></div>`}
            <div class="box"><p class="sub" style="margin-bottom:8px">Rodadas <span class="mut">(cada time joga uma vez por rodada)</span></p>${opt('cfgRounds', G.roundOpts, cfg.rounds)}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Tempo por vez</p>${opt('cfgTime', G.timeOpts, cfg.turnSec, v => v + 's')}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Dificuldade</p>
              <div class="ps-opt">${G.diffs.map(d => `<div class="ps-o ${cfg.diff === d.id ? 'sel' : ''}" data-a="cfgDiff" data-v="${d.id}">${d.name}</div>`).join('')}</div></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Categorias ${todas ? '<span class="mut">(Aleatório: todas)</span>' : `<span class="mut">(${cfg.cats.length})</span>`}</p>
              <div class="ps-opt" style="margin-bottom:10px">${G.cats.filter(k => k.id !== 'aleatorio').map(k => `<div class="ps-c ${cfg.cats.includes(k.id) ? 'sel' : ''}" data-a="cfgCat" data-k="${k.id}">${esc(k.name)}</div>`).join('')}</div>
              <button class="btn ghost" data-a="cfgAll">🎲 Aleatório (todas as categorias)</button></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Pode passar palavra?</p>
              <div class="ps-opt"><div class="ps-o ${cfg.pass ? 'sel' : ''}" data-a="cfgPass" data-v="1">Sim</div><div class="ps-o ${cfg.pass ? '' : 'sel'}" data-a="cfgPass" data-v="0">Não</div></div></div>
            <button class="btn big ok" data-a="begin" ${G.canBegin ? '' : 'disabled'}>▶ Começar</button>
            ${G.canBegin ? '' : `<p class="sub center mut">${cfg.auto ? 'Precisa de 2 jogadores por time.' : 'Todo mundo tem que estar num time, e cada time precisa de 2+.'}</p>`}
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- vez começando ----------
        if (G.phase === 'ready') {
          const cp = ply(G.clue), gp = ply(G.guess);
          const cab = `<div class="box center" style="border-color:${col(G.turn)}">
              <p class="sub mut">Rodada ${G.round} de ${G.cfg.rounds}</p>
              <h2 style="font-size:30px;color:${col(G.turn)};margin-top:4px">${tname(G.turn)}</h2>
              <p class="sub" style="margin-top:8px">${cp ? nm(cp) : '—'} dá as dicas · ${gp ? nm(gp) : '—'} adivinha</p></div>`;
          const pular = meuTime === G.turn ? '<button class="btn ghost" data-a="skip">⏭ Pular a vez (alguém sumiu)</button>' : '';
          if (souClue) return cab + `<div class="box center"><div class="big-emoji">🗝️</div><p class="sub" style="margin-top:8px">Você dá as dicas. Fale, mas <b>nunca diga a palavra</b>.</p></div>
            <button class="btn big ok ps-big" data-a="go">▶ Começar</button>${pular}`;
          if (souGuess) return cab + `<div class="box center"><div class="big-emoji">👂</div><h2 style="font-size:26px;margin-top:8px">Você adivinha!</h2>
            <p class="sub mut" style="margin-top:6px">Espere ${cp ? esc(cp.name) : 'seu colega'} começar.</p></div>${pular}`;
          return cab + `<div class="box center"><div class="big-emoji">📺</div><h2 style="font-size:24px;margin-top:8px">Veja a TV</h2>
            <p class="sub mut" style="margin-top:6px">${tname(G.turn)} vai jogar.</p></div>${pular}`;
        }

        // ---------- vez rolando ----------
        if (G.phase === 'play') {
          const cp = ply(G.clue);
          const cat = (G.cats.find(k => k.id === G.wordCat) || {}).name || '';
          if (souClue) {
            return `<div class="box"><p class="sub mut center">Sua palavra${cat ? ' · ' + esc(cat) : ''}</p>
                <div class="ps-word" id="ps-word">${G.word ? esc(G.word) : '—'}</div>
                <p class="ps-cat">Acertos nesta vez: ${G.hits}</p></div>
              ${c.timerHtml('', G.turnMs)}
              <button class="btn big ok ps-big" data-a="hit">✅ ACERTOU</button>
              ${G.allowPass ? '<button class="btn big warn ps-big" data-a="pass">⏭ PASSAR</button>' : '<p class="sub center mut">Passar está desligado nesta partida.</p>'}`;
          }
          if (souGuess) {
            return `<div class="box center" style="border-color:${col(G.turn)}"><div class="big-emoji">🗣️</div>
                <h2 style="font-size:26px;margin-top:8px">Sua vez de adivinhar</h2>
                <p class="sub" style="margin-top:6px">Escute as dicas de ${cp ? nm(cp) : 'seu colega'}!</p>
                <p class="sub mut" style="margin-top:6px">Fale alto. Acertos: <b>${G.hits}</b></p></div>
              ${c.timerHtml('', G.turnMs)}`;
          }
          return `<div class="box center"><div class="big-emoji">📺</div><h2 style="font-size:24px;margin-top:8px">Veja a TV</h2>
              <p class="sub mut" style="margin-top:6px">${tname(G.turn)} está jogando.</p>
              <p class="sub mut" style="margin-top:6px">Acertos: <b>${G.hits}</b></p></div>
            ${c.timerHtml('', G.turnMs)}`;
        }

        // ---------- fim da vez ----------
        if (G.phase === 'result') {
          const L = G.last || { team: G.turn, hits: 0, words: [] };
          const meu = meuTime === L.team;
          const lista = (L.words || []).length ? `<div class="box"><p class="sub mut" style="margin-bottom:8px">Palavras desta vez</p>
              <div style="display:flex;flex-direction:column;gap:6px">${L.words.map(w => `<div class="ps-w ${w.ok ? '' : 'no'}">${w.ok ? '✅' : '⏭'} ${esc(w.w)}</div>`).join('')}</div></div>` : '';
          return `<div class="box center" style="border-color:${col(L.team)}"><p class="sub mut">Fim da rodada</p>
              <h2 style="font-size:30px;color:${col(L.team)};margin-top:4px">${tname(L.team)}</h2>
              <div style="font-size:56px;font-weight:900;margin-top:6px">${L.hits}</div>
              <p class="sub mut">${L.hits === 1 ? 'acerto' : 'acertos'}</p></div>
            ${lista}${placar()}
            ${meu ? '<button class="btn big ok" data-a="next">Próximo time ➡️</button>' : '<p class="sub center mut">Já já é a vez do próximo time.</p>'}`;
        }

        // ---------- fim de jogo ----------
        if (G.phase === 'end') {
          const best = Math.max(...G.teams.map(t => t.score));
          const win = G.teams.map((t, i) => i).filter(i => G.teams[i].score === best);
          return `<div class="box center"><div class="big-emoji">🏆</div>
              <h2 style="font-size:28px;margin-top:8px">${win.length > 1 ? 'Empate!' : tname(win[0]) + ' venceu!'}</h2>
              <p class="sub mut" style="margin-top:6px">${win.map(i => tname(i)).join(' e ')} · ${best} ${best === 1 ? 'ponto' : 'pontos'}</p></div>
            ${placar()}<button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
        }
        return '';
      },

      after(c) {
        const G = c.G; if (!G) return;
        const eu = c.you ? c.you.pid : null;
        // aviso de "é a sua vez" para quem dá a dica e para quem adivinha
        const tag = `${G.round}:${G.turn}:${G.phase}`;
        if (G.phase === 'play' && tag !== lastTurnTag) {
          lastTurnTag = tag;
          if (eu === G.clue) c.turnover('<div><small>🗝️ VOCÊ DÁ AS DICAS</small><div class="who2" style="background:#14b8a6;color:#04211d">Fale!</div></div>', 1500, [90, 60, 90]);
          else if (eu === G.guess) c.turnover('<div><small>👂 VOCÊ ADIVINHA</small><div class="who2" style="background:#facc15;color:#111">Escute!</div></div>', 1500, [90, 60, 90]);
        }
        if (G.phase === 'result' && tag !== lastTurnTag) { lastTurnTag = tag; c.chord([784, 587, 392]); }
        if (G.phase === 'ready' || G.phase === 'setup') lastTurnTag = tag;
        if (G.phase === 'end' && lastEnd !== 'end') { lastEnd = 'end'; c.chord([523, 659, 784, 1046, 1318]); }
        if (G.phase !== 'end') lastEnd = '';
      },

      act(a, el, c) {
        const send = ARCADE.send, G = c.G;
        const cfg = G ? G.cfg : null;
        if (a === 'cfgTeams') send({ t: 'config', cfg: { teams: Number(el.dataset.v) } });
        else if (a === 'cfgAuto') send({ t: 'config', cfg: { auto: el.dataset.v === '1' } });
        else if (a === 'cfgRounds') send({ t: 'config', cfg: { rounds: Number(el.dataset.v) } });
        else if (a === 'cfgTime') send({ t: 'config', cfg: { turnSec: Number(el.dataset.v) } });
        else if (a === 'cfgDiff') send({ t: 'config', cfg: { diff: el.dataset.v } });
        else if (a === 'cfgPass') send({ t: 'config', cfg: { pass: el.dataset.v === '1' } });
        else if (a === 'cfgCat') { const k = el.dataset.k; const list = cfg.cats.includes(k) ? cfg.cats.filter(x => x !== k) : [...cfg.cats, k]; send({ t: 'config', cfg: { cats: list } }); }
        else if (a === 'cfgAll') send({ t: 'config', cfg: { cats: G.catIds.slice() } });
        else if (a === 'time') send({ t: 'team', i: Number(el.dataset.i) });
        else if (a === 'begin') send({ t: 'begin' });
        else if (a === 'go') send({ t: 'go' });
        else if (a === 'hit') { c.beep(1046, .1, 'square', .2); send({ t: 'hit' }); }
        else if (a === 'pass') { c.beep(180, .18, 'sawtooth', .22); send({ t: 'pass' }); }
        else if (a === 'skip') { if (confirm('Pular a vez deste time?')) send({ t: 'skip' }); }
        else if (a === 'next') send({ t: 'next' });
        else if (a === 'again') send({ t: 'again' });
      },
    },
  });
})();
