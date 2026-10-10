// Impostor — tela do celular. Cada um só vê a própria palavra.
'use strict';
(() => {
  let styled = false, aberto = false, lastRound = -1, ovKey = '';
  // Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8, texto sempre em tinta.
  const style = `
    .imp-hero { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .imp-k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:5px 9px; text-transform:uppercase; }
    .imp-k .pix { color:#ffce1f; font-size:15px; }
    .imp-hero h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:12px; overflow-wrap:break-word; word-break:break-word; }
    .imp-hero h2.w { font-size:24px; }
    .imp-hero p { font-size:15px; font-weight:600; line-height:1.35; margin-top:8px; }
    .imp-lbl { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .imp-lbl .mut { letter-spacing:.02em; text-transform:none; font-family:'Archivo',sans-serif; font-weight:600; font-size:13px; }
    .imp-hid { background:#0f0f14; color:#f1f0ea; border:3px solid #0f0f14; box-shadow:5px 5px 0 #ff7ab8; padding:34px 18px; text-align:center; cursor:pointer; background-image:radial-gradient(rgba(241,240,234,.14) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .imp-hid b { display:block; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:26px; line-height:1; color:#ffce1f; }
    .imp-hid small { display:block; margin-top:10px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
    .imp-open { background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:22px 16px; text-align:center; cursor:pointer; }
    .imp-open .w { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:36px; line-height:1; word-break:break-word; margin-top:10px; }
    .imp-open .k2 { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:5px 9px; text-transform:uppercase; }
    .imp-open .x { margin-top:14px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#55555e; }
    .imp-imp { background:#f0443a; }
    .imp-imp .x, .imp-imp p { color:#0f0f14; }
    .imp-imp .hint { display:inline-block; margin-top:8px; background:#fff; border:3px solid #0f0f14; padding:8px 14px; font-size:22px; font-weight:900; }
    .imp-o { padding:11px 14px; background:#fff; border:3px solid #0f0f14; font-weight:900; font-size:17px; text-align:center; cursor:pointer; min-width:52px; }
    .imp-o.sel { background:#ffce1f; box-shadow:3px 3px 0 #0f0f14; }
    .imp-o.off { background:#e4e2d9; color:#55555e; border-style:dashed; }
    .imp-o .pix { font-size:20px; }
    .imp-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .imp-cl { display:flex; align-items:center; gap:10px; padding:9px 12px; background:#fff; border:3px solid #0f0f14; }
    .imp-cl.imp-now { background:#ffce1f; }
    .imp-cl.dead { background:#e4e2d9; opacity:.6; }
    .imp-cl b { flex:1; text-align:right; font-size:19px; font-weight:900; word-break:break-word; }
    .imp-in { display:flex; gap:8px; } .imp-in input { flex:1; }
    .imp-pick { display:flex; align-items:center; gap:12px; justify-content:flex-start; text-align:left; padding:12px 14px; }
    .imp-pick .t { flex:1; }
    .imp-pick .t small { display:block; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.04em; text-transform:none; color:#3a3a42; margin-top:3px; }
    .imp-pick em { font-style:normal; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.06em; padding:4px 6px; background:#0f0f14; color:#ffce1f; }
    .imp-res { text-align:center; }
    .imp-res.yes { background:#35d07f; } .imp-res.no { background:#f0443a; } .imp-res.tie { background:#ffce1f; }
    .imp-res h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:26px; line-height:1; margin-top:12px; }
    .imp-res p { font-size:16px; font-weight:600; margin-top:10px; line-height:1.4; }
    .imp-res .wd { display:inline-block; background:#fff; border:3px solid #0f0f14; padding:4px 10px; font-weight:900; font-stretch:112%; text-transform:uppercase; font-size:20px; }
    .imp-big { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; }
    .pl .imp-pts { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; color:#0f0f14; }
    .pl .imp-pts small { font-family:'JetBrains Mono',monospace; font-size:12px; background:#35d07f; border:2px solid #0f0f14; padding:1px 4px; margin-left:4px; vertical-align:middle; }
    .pl .imp-mk { display:inline-block; margin-left:6px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:10px; letter-spacing:.06em; padding:1px 4px; vertical-align:middle; background:#f0443a; color:#0f0f14; border:2px solid #0f0f14; }
    .imp-ev { text-align:center; font-weight:700; font-size:16px; line-height:1.4; }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const ply = (c, pid) => c.C.players.find(p => p.pid === pid);

  function listaDicas(c, so) {
    const G = c.G;
    return `<div class="box" style="display:flex;flex-direction:column;gap:8px"><p class="imp-lbl" style="margin-bottom:2px">Dicas ditas</p>
      ${(so || G.order).map(pid => { const p = ply(c, pid); if (!p) return '';
        const cl = G.clues[pid] || [];
        return `<div class="imp-cl ${G.speaker === pid ? 'imp-now' : ''} ${G.out.includes(pid) ? 'dead' : ''}">${c.avatar(p, 30)}${c.nm(p)}<b>${cl.length ? cl.map(c.esc).join(' · ') : '<span class="mut" style="font-size:15px">—</span>'}</b></div>`;
      }).join('')}</div>`;
  }
  function minhaPalavra(c, curta) {
    const m = c.G.mine; if (!m) return '';
    if (!aberto) return `<div class="imp-hid" data-a="ver"><b>Toque para ver ${curta ? 'de novo' : 'sua palavra'}</b><small>ninguém pode olhar sua tela</small></div>`;
    if (m.impostor) return `<div class="imp-open imp-imp" data-a="esconder"><span class="k2">seu papel</span><div class="w">Você é o impostor</div>${m.hint
      ? `<div class="x">dica</div><div class="hint">${c.esc(m.hint)}</div>`
      : '<p style="margin-top:10px;font-weight:700">Descubra qual é a palavra sem ser descoberto.</p>'}<div class="x">toque para esconder</div></div>`;
    return `<div class="imp-open" data-a="esconder"><span class="k2">sua palavra</span><div class="w">${c.esc(m.word)}</div><div class="x">toque para esconder</div></div>`;
  }
  function placar(c) {
    const G = c.G;
    return `<div class="box"><p class="imp-lbl">Placar</p>${c.playersHtml({
      info: p => `<span class="imp-pts">${G.scores[p.pid] || 0}${(G.gain || {})[p.pid] ? `<small>+${G.gain[p.pid]}</small>` : ''}</span>`,
      tag: p => (G.impostors || []).includes(p.pid) ? '<span class="imp-mk">IMPOSTOR</span>' : '',
    })}</div>`;
  }
  const pix = n => `<span class="pix">${n}</span>`;
  const hero = (k, t, p, cls) => `<div class="imp-hero"><span class="imp-k">${k}</span><h2 class="${cls || ''}">${t}</h2>${p ? `<p>${p}</p>` : ''}</div>`;

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
        const opt = (a, vals, cur, fmt) => `<div class="imp-opt">${vals.map(v => `<div class="imp-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : pix(v)}</div>`).join('')}</div>`;

        if (G.phase === 'setup') {
          const cfg = G.cfg, max = Math.max(1, cfg.maxImp || 1);
          const impVals = []; for (let i = 1; i <= max; i++) impVals.push(i);
          return `${hero('Regras', 'Impostor', 'Qualquer um pode mudar. Vale para todos.')}
            <div class="box"><p class="imp-lbl">Impostores <span class="mut">(máximo ${max} com ${c.C.players.length} jogadores)</span></p>
              <div class="imp-opt">${impVals.map(v => `<div class="imp-o ${v === cfg.impostorsReal ? 'sel' : ''}" data-a="cfgImp" data-v="${v}">${pix(v)}</div>`).join('')}</div>
              ${cfg.impostors > max ? `<p class="sub mut" style="margin-top:8px">Escolheram ${cfg.impostors}, mas com ${c.C.players.length} jogadores vale ${cfg.impostorsReal}.</p>` : ''}</div>
            <div class="box"><p class="imp-lbl">Modo de dica <span class="mut">(o impostor recebe uma dica da palavra)</span></p>
              <div class="imp-opt"><div class="imp-o ${cfg.hint ? 'sel' : ''}" data-a="cfgHint" data-v="1">Com dica</div><div class="imp-o ${cfg.hint ? '' : 'sel'}" data-a="cfgHint" data-v="0">Sem dica</div></div></div>
            <div class="box"><p class="imp-lbl">Mister White <span class="mut">(o impostor recebe uma palavra parecida)</span></p>
              <div class="imp-opt"><div class="imp-o ${cfg.white ? 'sel' : ''}" data-a="cfgWhite" data-v="1">Ligado</div><div class="imp-o ${cfg.white ? '' : 'sel'}" data-a="cfgWhite" data-v="0">Desligado</div></div></div>
            <div class="box"><p class="imp-lbl">Voltas de dicas</p>${opt('cfgLaps', [1, 2], cfg.laps)}</div>
            <div class="box"><p class="imp-lbl">Tempo de discussão</p>${opt('cfgTime', [60, 90, 120, 180], cfg.discussSec, v => pix(v + 's'))}</div>
            <div class="box"><p class="imp-lbl">Palavras por partida</p>${opt('cfgRounds', [3, 5, 8, 10], cfg.rounds)}</div>
            <div class="box"><p class="imp-lbl">Categorias <span class="mut">(${cfg.cats.length})</span></p>
              <div class="imp-opt">${G.cats.map(k => `<div class="imp-o ${cfg.cats.includes(k.id) ? 'sel' : 'off'}" data-a="cfgCat" data-id="${k.id}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:12px">↺ Regras padrão</button></div>
            <button class="btn big ok" data-a="begin" ${c.C.players.length >= 3 ? '' : 'disabled'}>Começar</button>
            <p class="imp-ev">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        if (G.phase === 'reveal') {
          return `${hero(`Palavra ${pix(G.round)} de ${pix(G.rounds)}`, 'Sua palavra secreta')}
            ${minhaPalavra(c)}
            ${m.seen ? `<div class="box center"><p class="imp-lbl" style="margin:0">Esperando os outros · ${pix(G.seen.length)}/${pix(c.C.players.length)}</p></div>`
              : `<button class="btn big ok" data-a="javi" ${aberto ? '' : 'disabled'}>Já vi</button>`}
            <div class="box">${c.playersHtml({ info: p => G.seen.includes(p.pid) ? '<b style="color:#0f0f14">JÁ VIU</b>' : '…' })}</div>`;
        }

        if (G.phase === 'clues') {
          const minha = G.speaker === c.you.pid, sp = ply(c, G.speaker);
          const off = sp && sp.on === false;
          return `${hero(`Palavra ${pix(G.round)} de ${pix(G.rounds)} · volta ${pix(Math.floor(G.turn / Math.max(1, G.order.length)) + 1)} de ${pix(G.laps)}`,
              minha ? 'Sua vez!' : `Vez de ${sp ? esc(sp.name) : '—'}`, 'Uma palavra só, sem espaço. Não pode ser a palavra secreta.')}
            ${minha ? `<div class="box"><div class="imp-in"><input id="imp-clue" maxlength="20" placeholder="sua dica" autocomplete="off" autocapitalize="none" enterkeyhint="send"></div>
                <button class="btn ok" style="margin-top:12px" data-a="dica">Falar dica</button></div>`
              : off ? `<button class="btn warn" data-a="skip">Pular ${esc(sp.name)} (sem conexão)</button>` : ''}
            ${listaDicas(c)}
            ${minhaPalavra(c, true)}`;
        }

        if (G.phase === 'discuss') {
          return `${hero(G.revote ? 'Empate' : 'Discussão', G.revote ? 'Discussão relâmpago' : 'Discutam!', 'Quem parece o impostor?')}
            ${c.timerHtml('', G.turnMs)}
            <button class="btn ${m.endVoted ? 'ok' : 'warn'}" data-a="endnow">${m.endVoted ? 'Você quer votar agora' : 'Votar agora'} · ${pix(G.endVotes.length + '/' + G.need)}</button>
            ${listaDicas(c)}
            ${minhaPalavra(c, true)}`;
        }

        if (G.phase === 'vote') {
          if (m.out) return `${hero('Votação', 'Você está fora', 'Assista à votação na TV.')}${listaDicas(c)}`;
          const alvos = G.alive.filter(pid => pid !== c.you.pid);
          return `${hero(`Votação · ${pix(G.voted.length)} de ${pix(G.nAlive)} votaram`, 'Vote no impostor')}
            <div style="display:flex;flex-direction:column;gap:10px">${alvos.map(pid => { const p = ply(c, pid); if (!p) return '';
              const cl = (G.clues[pid] || []).join(' · '), sel = m.myVote === pid;
              return `<button class="btn imp-pick ${sel ? 'warn' : ''}" data-a="votar" data-pid="${pid}">
                ${c.avatar(p, 34)}<span class="t">${esc(p.name)}<small>${esc(cl) || '—'}</small></span>${sel ? '<em>SEU VOTO</em>' : ''}</button>`;
            }).join('')}</div>
            <button class="btn ghost" data-a="fechar" ${G.voted.length >= G.need ? '' : 'disabled'}>Fechar votação (${G.voted.length}/${G.need})</button>
            ${minhaPalavra(c, true)}`;
        }

        if (G.phase === 'result') {
          const R = G.result || {}, alvo = ply(c, R.out);
          const kind = R.aborted ? '' : R.tie ? 'tie' : R.wasImp ? 'yes' : 'no';
          let h = `<div class="box imp-res ${kind}">`;
          if (R.aborted) h += `<span class="imp-k">Fim da rodada</span><h2>Rodada encerrada</h2>`;
          else if (R.tie) h += `<span class="imp-k">Votação fechada</span><h2>Empate!</h2><p>${R.over ? 'Empatou de novo: o impostor escapou.' : 'Ninguém eliminado. Mais 30 segundos de discussão.'}</p>`;
          else h += `<span class="imp-k">Votação fechada</span><div style="margin-top:12px">${alvo ? c.avatar(alvo, 64) : ''}</div><h2>${alvo ? esc(alvo.name) : '—'} ${R.wasImp ? 'era o impostor!' : 'não era o impostor'}</h2>`;
          h += `${G.word ? `<p>A palavra era <span class="wd">${esc(G.word)}</span></p>` : `<p>${G.needGuess ? 'A palavra continua secreta: o impostor ainda pode adivinhar.' : 'A palavra continua secreta.'}</p>`}
            ${G.whiteWord ? `<p>o impostor tinha "${esc(G.whiteWord)}"</p>` : ''}
            ${(G.impostors || []).length ? `<p>Impostor: ${(G.impostors || []).map(p => c.nm(ply(c, p))).join(' ')}</p>` : ''}</div>
            <button class="btn big warn" data-a="next">${R.over ? 'Continuar →' : 'Continuar a caçada →'}</button>${listaDicas(c)}`;
          return h;
        }

        if (G.phase === 'guess') {
          if (m.canGuess) return `${hero('Chance final', 'Qual era a palavra?', 'Acertou, +1 ponto.')}
            <div class="box"><input id="imp-guess" maxlength="40" placeholder="a palavra secreta" autocomplete="off" enterkeyhint="send"><button class="btn ok" style="margin-top:12px" data-a="chute">Chutar</button></div>
            <button class="btn ghost" data-a="next">Desistir</button>`;
          return hero('Chance final', 'O impostor está chutando a palavra…');
        }

        const R = G.result || {};
        if (G.phase === 'scores') return `${hero(`Palavra ${pix(G.round)} de ${pix(G.rounds)}`, esc(G.word || ''),
            `${R.winner === 'inocentes' ? 'Os inocentes venceram.' : R.winner === 'impostores' ? 'O impostor venceu.' : 'Sem vencedor.'}${G.guess && G.guess.text ? ` Chute: "${esc(G.guess.text)}" ${G.guess.ok ? '(acertou)' : '(errou)'}.` : ''}`, 'w')}
          ${placar(c)}<button class="btn big ok" data-a="next">Próxima palavra →</button>`;
        const lider = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0))[0];
        return `<div class="box center" style="background:#ffce1f"><span class="imp-k">Fim de jogo</span><div style="margin-top:12px">${c.avatar(lider, 96)}</div><div class="imp-big" style="margin-top:10px">${esc(lider.name)} venceu!</div></div>
          ${placar(c)}<button class="btn big ok" data-a="again">Jogar de novo</button>`;
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
          c.turnover(`<div class="round">Palavra ${G.round}</div><small>sua vez</small><div>${c.avatar(c.C.players.find(p => p.pid === c.you.pid), 110)}</div><div class="who2" style="${c.nmStyle(c.C.players.find(p => p.pid === c.you.pid))}">Dê sua dica</div><div class="mine">uma palavra só</div>`, 1800, [60, 60, 160]);
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
