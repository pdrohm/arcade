// Palavra Secreta — tela do celular. Todos veem a palavra, menos quem adivinha.
'use strict';
(() => {
  let styled = false, lastTurnTag = '', lastEnd = '';
  // visual "fliperama de papel": tinta sobre papel, destaque na cor de palavras (#3db4f2)
  const style = `
    .ps-lab { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .ps-lab b { color:#0f0f14; }
    .ps-h { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; letter-spacing:-.01em; }
    .ps-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .ps-word { font-family:'Archivo',sans-serif; font-size:44px; font-weight:900; font-stretch:125%; text-align:center; line-height:1; padding:26px 10px; margin-top:10px;
      background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; text-transform:uppercase; overflow-wrap:break-word; }
    .ps-cat { text-align:center; font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-top:14px; }
    .ps-cat b { font-family:'Pixelify Sans',monospace; font-size:20px; }
    .ps-big { padding:30px; font-size:30px; }
    .ps-team { padding:16px 10px; text-align:center; font-weight:900; font-stretch:115%; text-transform:uppercase; font-size:21px; color:#0f0f14; border:3px solid #0f0f14; cursor:pointer; }
    .ps-team.sel { box-shadow:5px 5px 0 #0f0f14; outline:3px solid #0f0f14; outline-offset:3px; }
    .ps-team small { display:block; font-weight:700; font-size:13px; text-transform:none; font-stretch:100%; margin-top:6px; }
    .ps-teams { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ps-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .ps-o { padding:10px 14px; background:#fff; border:3px solid #0f0f14; font-weight:900; font-size:17px; min-width:54px; text-align:center; cursor:pointer; }
    .ps-o.n { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; }
    .ps-o.sel { background:#3db4f2; box-shadow:3px 3px 0 #0f0f14; }
    .ps-c { padding:8px 12px; background:#e4e2d9; border:2px solid #b9b7ae; color:#55555e; font-weight:800; font-size:15px; cursor:pointer; }
    .ps-c.sel { background:#3db4f2; color:#0f0f14; border:3px solid #0f0f14; }
    .ps-w { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#35d07f; border:3px solid #0f0f14; font-size:18px; font-weight:900; text-transform:uppercase; }
    .ps-w.no { background:#e4e2d9; color:#8a8a92; border-color:#8a8a92; text-decoration:line-through; }
    .ps-score { display:flex; align-items:center; gap:12px; padding:10px 12px; background:#fff; border:3px solid #0f0f14; font-size:19px; font-weight:900; }
    .ps-score.me { background:#fff4c2; }
    .ps-score b { flex:1; min-width:0; }
    .ps-score .pts { font-family:'Pixelify Sans',monospace; font-size:24px; }
    .ps-score .tm { padding:2px 9px; border:3px solid #0f0f14; text-transform:uppercase; font-stretch:115%; }
    .ps-score small { display:block; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; color:#55555e; text-transform:uppercase; }
    .ps-tag { display:inline-block; padding:6px 14px; border:3px solid #0f0f14; box-shadow:4px 4px 0 #0f0f14; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:26px; color:#0f0f14; }
    .ps-role { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; background:#0f0f14; color:#ffce1f; padding:2px 6px; letter-spacing:.06em; }
    .ps-pix { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:64px; line-height:1; }
  `;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const tname = i => 'Time ' + (i + 1);
  // a palavra grande cabe inteira: a fonte encolhe conforme a maior palavra (a letra larga ocupa ~0,9 em)
  const wsize = w => { const n = Math.max(1, ...String(w || '').split(/\s+/).map(x => x.length)); return Math.max(20, Math.min(46, Math.floor(290 / (n * 0.9)))); };

  ARCADE.register('palavrasecreta', {
    phone: {
      // redesenha só quando muda de verdade (a palavra troca sem piscar o resto)
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase, G.round, G.turn, G.clue, G.guess, G.word || '', G.hits, G.myTeam, G.mode, c.C.players.length,
          (G.ranking || []).map(r => r.pid + '=' + r.give + '/' + r.guess).join(','),
          G.phase === 'setup' ? JSON.stringify(G.cfg) + ':' + G.teams.map(t => t.players.join(',')).join('|') : ''].join(':');
      },

      html(c) {
        ensureStyle();
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G || !G.teams) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const ply = pid => c.C.players.find(p => p.pid === pid) || null;
        const col = i => G.colors[i % G.colors.length];
        const eu = c.you ? c.you.pid : null;
        const souClue = eu && eu === G.clue, souGuess = eu && eu === G.guess;
        const meuTime = G.myTeam;
        const todos = G.mode === 'todos';
        const pnm = pid => { const p = ply(pid); return p ? c.avatar(p, 26) + ' ' + nm(p) : '—'; };
        const tag = (i, extra) => `<span class="ps-tag" style="background:${col(i)};${extra || ''}">${tname(i)}</span>`;
        const head = (lab, inner, cls) => `<div class="box center ${cls || ''}"><p class="ps-lab">${lab}</p>${inner}</div>`;
        const ranking = () => `<div class="box"><p class="ps-lab">Placar</p>
          <div style="display:flex;flex-direction:column;gap:8px">${(G.ranking || []).map((r, i) => { const p = ply(r.pid); return p ? `<div class="ps-score ${r.pid === eu ? 'me' : ''}">
            <span class="pix">${i + 1}º</span>${c.avatar(p, 26)}<b>${esc(p.name)}<small>dica ${r.give} · adivinhou ${r.guess}</small></b><span class="pts">${r.score}</span></div>` : ''; }).join('')}</div></div>`;
        const placar = () => todos ? ranking() : `<div class="box"><p class="ps-lab">Placar</p>
          <div style="display:flex;flex-direction:column;gap:8px">${G.teams.map((t, i) => `<div class="ps-score ${meuTime === i ? 'me' : ''}">
            <b><span class="tm" style="background:${col(i)}">${tname(i)}</span></b><span class="pts">${t.score}</span></div>`).join('')}</div></div>`;

        // ---------- preparação ----------
        if (G.phase === 'setup') {
          const cfg = G.cfg;
          const opt = (a, vals, curv, fmt) => `<div class="ps-opt">${vals.map(v => `<div class="ps-o n ${v === curv ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          const todas = G.catIds.every(id => cfg.cats.includes(id));
          return `<div class="box ps-head"><p class="mono" style="font-size:12px">PALAVRAS · REGRAS</p><h2 class="ps-h" style="font-size:30px;margin-top:6px">Palavra Secreta</h2></div>
            <p class="sub" style="font-size:15px;margin-top:-4px">Qualquer um pode mudar as regras. Vale para todos.</p>
            <div class="box"><p class="ps-lab">Modo de jogo</p>
              <div class="ps-opt">${G.modes.map(m => `<div class="ps-o ${cfg.mode === m.id ? 'sel' : ''}" data-a="cfgMode" data-v="${m.id}">${m.name}</div>`).join('')}</div>
              <p class="sub mut" style="margin-top:10px;font-size:15px">${todos ? `Sem times. Cada um dá dicas para cada um, em duplas que vão girando (${G.pairTotal} vezes com ${c.C.players.length} jogadores). Acertou: 1 ponto para quem deu a dica e 1 para quem adivinhou.` : 'Em times: um dá as dicas, o colega do time adivinha.'}</p></div>
            ${todos ? '' : `<div class="box"><p class="ps-lab">Quantos times</p>${opt('cfgTeams', G.teamOpts, cfg.teams)}
              ${G.teamOpts.length ? '' : '<p class="sub mut">Precisa de pelo menos 4 jogadores.</p>'}</div>
            <div class="box"><p class="ps-lab">Como formar os times</p>
              <div class="ps-opt"><div class="ps-o ${cfg.auto ? 'sel' : ''}" data-a="cfgAuto" data-v="1">Sorteio</div><div class="ps-o ${cfg.auto ? '' : 'sel'}" data-a="cfgAuto" data-v="0">Escolher</div></div></div>`}
            ${cfg.auto || todos ? '' : `<div class="box"><p class="ps-lab">Toque no seu time</p>
              <div class="ps-teams">${G.teams.map((t, i) => `<div class="ps-team ${meuTime === i ? 'sel' : ''}" style="background:${col(i)}" data-a="time" data-i="${i}">${tname(i)}
                <small>${t.players.map(pid => { const p = ply(pid); return p ? c.avatar(p, 22) + ' ' + esc(p.name) : ''; }).filter(Boolean).join(' · ') || 'vazio'}</small></div>`).join('')}</div></div>`}
            ${todos ? '' : `<div class="box"><p class="ps-lab">Rodadas · cada time joga uma vez por rodada</p>${opt('cfgRounds', G.roundOpts, cfg.rounds)}</div>`}
            <div class="box"><p class="ps-lab">Tempo por vez</p>${opt('cfgTime', G.timeOpts, cfg.turnSec, v => v + 's')}</div>
            <div class="box"><p class="ps-lab">Dificuldade</p>
              <div class="ps-opt">${G.diffs.map(d => `<div class="ps-o ${cfg.diff === d.id ? 'sel' : ''}" data-a="cfgDiff" data-v="${d.id}">${d.name}</div>`).join('')}</div></div>
            <div class="box"><p class="ps-lab">Categorias · ${todas ? '<b>aleatório: todas</b>' : `<b>${cfg.cats.length}</b>`}</p>
              <div class="ps-opt" style="margin-bottom:10px">${G.cats.filter(k => k.id !== 'aleatorio').map(k => `<div class="ps-c ${cfg.cats.includes(k.id) ? 'sel' : ''}" data-a="cfgCat" data-k="${k.id}">${esc(k.name)}</div>`).join('')}</div>
              <button class="btn ghost" data-a="cfgAll">Aleatório (todas as categorias)</button></div>
            <div class="box"><p class="ps-lab">Pode passar palavra?</p>
              <div class="ps-opt"><div class="ps-o ${cfg.pass ? 'sel' : ''}" data-a="cfgPass" data-v="1">Sim</div><div class="ps-o ${cfg.pass ? '' : 'sel'}" data-a="cfgPass" data-v="0">Não</div></div></div>
            <button class="btn big warn" data-a="begin" ${G.canBegin ? '' : 'disabled'}>▶ Começar</button>
            ${G.canBegin ? '' : `<p class="sub center mut" style="font-size:15px">${todos ? 'Precisa de pelo menos 3 jogadores.' : cfg.auto ? 'Precisa de 2 jogadores por time.' : 'Todo mundo tem que estar num time, e cada time precisa de 2+.'}</p>`}
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- vez começando ----------
        if (G.phase === 'ready') {
          const cp = ply(G.clue), gp = ply(G.guess);
          const cab = todos ? `<div class="box center"><p class="ps-lab">Vez <b class="pix">${G.turnNo}/${G.turnTotal}</b></p>
              <p class="sub" style="margin-top:4px">${pnm(G.clue)} <span class="ps-role">DICA</span></p>
              <p class="sub" style="margin-top:8px">${pnm(G.guess)} <span class="ps-role">ADIVINHA</span></p></div>` : `<div class="box center">
              <p class="ps-lab">Rodada <b class="pix">${G.round}/${G.cfg.rounds}</b></p>
              ${tag(G.turn)}
              <p class="sub" style="margin-top:14px;font-size:16px">${cp ? c.avatar(cp, 28) + ' ' + nm(cp) : '—'} dá as dicas · ${gp ? c.avatar(gp, 28) + ' ' + nm(gp) : '—'} adivinha</p></div>`;
          const pular = todos || meuTime === G.turn ? '<button class="btn ghost" data-a="skip">Pular a vez (alguém sumiu)</button>' : '';
          if (souClue) return cab + `<div class="box hi center"><h2 class="ps-h" style="font-size:26px">Você dá as dicas</h2><p class="sub" style="margin-top:8px;color:#0f0f14">Fale, mas <b>nunca diga a palavra</b>.</p></div>
            <button class="btn big ok ps-big" data-a="go">▶ Começar</button>${pular}`;
          if (souGuess) return cab + `<div class="box hi center"><h2 class="ps-h" style="font-size:26px">Você adivinha!</h2>
            <p class="sub" style="margin-top:8px;color:#0f0f14">Espere ${cp ? esc(cp.name) : 'seu colega'} começar.</p></div>${pular}`;
          return cab + `<div class="box center"><h2 class="ps-h" style="font-size:24px">Veja a TV</h2>
            <p class="sub mut" style="margin-top:6px">${todos ? 'Você vai ver a palavra. Fique quieto!' : tname(G.turn) + ' vai jogar.'}</p></div>${pular}`;
        }

        // ---------- vez rolando ----------
        if (G.phase === 'play') {
          const cp = ply(G.clue);
          const cat = (G.cats.find(k => k.id === G.wordCat) || {}).name || '';
          if (souClue) {
            return `<div class="box"><p class="ps-lab center">Sua palavra${cat ? ' · <b>' + esc(cat) + '</b>' : ''}</p>
                <div class="ps-word" id="ps-word" style="font-size:${wsize(G.word)}px">${G.word ? esc(G.word) : '—'}</div>
                <p class="ps-cat">Acertos nesta vez: <b>${G.hits}</b></p></div>
              ${c.timerHtml('', G.turnMs)}
              <button class="btn big ok ps-big" data-a="hit">✓ Acertou</button>
              ${G.allowPass ? '<button class="btn big warn ps-big" data-a="pass">Passar ▸</button>' : '<p class="sub center mut" style="font-size:15px">Passar está desligado nesta partida.</p>'}`;
          }
          if (souGuess) {
            return `<div class="box hi center"><h2 class="ps-h" style="font-size:28px">Sua vez de adivinhar</h2>
                <p class="sub" style="margin-top:10px;color:#0f0f14">Escute as dicas de ${cp ? nm(cp) : 'seu colega'}!</p>
                <p class="sub" style="margin-top:6px;color:#0f0f14">Fale alto. Acertos: <b class="pix" style="font-size:22px">${G.hits}</b></p></div>
              ${c.timerHtml('', G.turnMs)}`;
          }
          if (G.word) {
            return `<div class="box"><p class="sub mut center" style="font-size:15px">${todos ? `${cp ? nm(cp) : 'alguém'} → ${G.guess && ply(G.guess) ? nm(ply(G.guess)) : 'alguém'}` : `${tname(G.turn)} jogando · ${cp ? nm(cp) : 'alguém'} dá as dicas`}</p>
                <p class="ps-lab center" style="margin-top:10px">Palavra${cat ? ' · <b>' + esc(cat) + '</b>' : ''} · não fale!</p>
                <div class="ps-word" style="font-size:${wsize(G.word)}px">${esc(G.word)}</div>
                <p class="ps-cat">Acertos nesta vez: <b>${G.hits}</b></p></div>
              ${c.timerHtml('', G.turnMs)}`;
          }
          return `<div class="box center"><h2 class="ps-h" style="font-size:24px">Veja a TV</h2>
              <p class="sub mut" style="margin-top:6px">${todos ? 'Sua vez já chega.' : tname(G.turn) + ' está jogando.'}</p>
              <p class="sub mut" style="margin-top:6px">Acertos: <b class="pix" style="color:#0f0f14;font-size:22px">${G.hits}</b></p></div>
            ${c.timerHtml('', G.turnMs)}`;
        }

        // ---------- fim da vez ----------
        if (G.phase === 'result') {
          const L = G.last || { team: G.turn, hits: 0, words: [] };
          const meu = todos || meuTime === L.team;
          const lista = (L.words || []).length ? `<div class="box"><p class="ps-lab">Palavras desta vez</p>
              <div style="display:flex;flex-direction:column;gap:6px">${L.words.map(w => `<div class="ps-w ${w.ok ? '' : 'no'}">${w.ok ? '✓' : '›'} ${esc(w.w)}</div>`).join('')}</div></div>` : '';
          return `<div class="box center"><p class="ps-lab">${todos ? 'Fim da vez' : 'Fim da rodada'}</p>
              ${todos ? `<p class="sub" style="margin-top:2px">${pnm(L.clue)} → ${pnm(L.guess)}</p>` : tag(L.team)}
              <div class="ps-pix" style="margin-top:14px">${L.hits}</div>
              <p class="ps-lab" style="margin:4px 0 0">${L.hits === 1 ? 'acerto' : 'acertos'}</p></div>
            ${lista}${placar()}
            ${meu ? `<button class="btn big warn" data-a="next">${todos ? 'Próxima dupla' : 'Próximo time'} ▸</button>` : '<p class="sub center mut" style="font-size:15px">Já já é a vez do próximo time.</p>'}`;
        }

        // ---------- fim de jogo ----------
        if (G.phase === 'end' && todos) {
          const r = G.ranking || [], top = r.length ? r[0].score : 0;
          const win = r.filter(x => x.score === top).map(x => ply(x.pid)).filter(Boolean);
          const melhor = k => { const m = Math.max(0, ...r.map(x => x[k])); const q = r.filter(x => x[k] === m && m > 0).map(x => ply(x.pid)).filter(Boolean); return q.length ? q.map(p => esc(p.name)).join(' e ') + ` (${m})` : '—'; };
          return `<div class="box ps-head center"><p class="mono" style="font-size:12px">FIM DE JOGO</p>${win.length === 1 ? `<div style="margin-top:12px">${c.avatar(win[0], 84)}</div>` : ''}
              <h2 class="ps-h" style="font-size:30px;margin-top:10px">${win.length > 1 ? 'Empate!' : win.length ? esc(win[0].name) + ' venceu!' : 'Fim!'}</h2>
              <p class="mono" style="font-size:13px;margin-top:8px">${win.map(p => esc(p.name)).join(' e ')} · ${top} ${top === 1 ? 'PONTO' : 'PONTOS'}</p></div>
            <div class="box"><p class="ps-lab" style="margin-bottom:4px">Melhor dando dica</p><p class="sub" style="font-weight:900">${melhor('give')}</p>
              <p class="ps-lab" style="margin:12px 0 4px">Melhor adivinhando</p><p class="sub" style="font-weight:900">${melhor('guess')}</p></div>
            ${placar()}<button class="btn big warn" data-a="again">↻ Jogar de novo</button>`;
        }
        if (G.phase === 'end') {
          const best = Math.max(...G.teams.map(t => t.score));
          const win = G.teams.map((t, i) => i).filter(i => G.teams[i].score === best);
          return `<div class="box center" style="background:${win.length > 1 ? '#ffce1f' : col(win[0])}"><p class="mono" style="font-size:12px">FIM DE JOGO</p>
              <h2 class="ps-h" style="font-size:32px;margin-top:10px">${win.length > 1 ? 'Empate!' : tname(win[0]) + ' venceu!'}</h2>
              <p class="mono" style="font-size:13px;margin-top:8px">${win.map(i => tname(i)).join(' e ')} · ${best} ${best === 1 ? 'PONTO' : 'PONTOS'}</p></div>
            ${placar()}<button class="btn big warn" data-a="again">↻ Jogar de novo</button>`;
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
          if (eu === G.clue) c.turnover('<div><small>VOCÊ DÁ AS DICAS</small><div class="who2" style="background:#3db4f2;color:#0f0f14">Fale!</div></div>', 1500, [90, 60, 90]);
          else if (eu === G.guess) c.turnover('<div><small>VOCÊ ADIVINHA</small><div class="who2" style="background:#ffce1f;color:#0f0f14">Escute!</div></div>', 1500, [90, 60, 90]);
        }
        if (G.phase === 'result' && tag !== lastTurnTag) { lastTurnTag = tag; c.chord([784, 587, 392]); }
        if (G.phase === 'ready' || G.phase === 'setup') lastTurnTag = tag;
        if (G.phase === 'end' && lastEnd !== 'end') { lastEnd = 'end'; c.chord([523, 659, 784, 1046, 1318]); }
        if (G.phase !== 'end') lastEnd = '';
      },

      act(a, el, c) {
        const send = ARCADE.send, G = c.G;
        const cfg = G ? G.cfg : null;
        if (a === 'cfgMode') send({ t: 'config', cfg: { mode: el.dataset.v } });
        else if (a === 'cfgTeams') send({ t: 'config', cfg: { teams: Number(el.dataset.v) } });
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
