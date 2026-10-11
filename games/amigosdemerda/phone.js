// Amigos de Merda — tela do celular.
// Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8; a carta é caramelo (#e9a95b). Texto sempre em tinta.
'use strict';
(() => {
  let styled = false, ovKey = '';
  const style = `
    .admp-hero { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .admp-hero.card { background-color:#e9a95b; }
    .admp-k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:5px 9px; text-transform:uppercase; }
    .admp-k .pix { color:#ffce1f; font-size:15px; }
    .admp-k.red { background:#f0443a; color:#0f0f14; }
    .admp-q { font-size:25px; font-weight:900; font-stretch:112%; line-height:1.15; margin-top:12px; }
    .admp-q.sm { font-size:19px; margin-top:10px; }
    .admp-hero h2.t { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:12px; }
    .admp-hero p { font-size:15px; font-weight:600; line-height:1.35; margin-top:8px; }
    .admp-lbl { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .admp-lbl .mut { letter-spacing:.02em; text-transform:none; font-family:'Archivo',sans-serif; font-weight:600; font-size:13px; }
    .admp-o { padding:11px 14px; background:#fff; border:3px solid #0f0f14; font-weight:900; font-size:17px; text-align:center; cursor:pointer; min-width:52px; }
    .admp-o.sel { background:#ffce1f; box-shadow:3px 3px 0 #0f0f14; }
    .admp-o .pix { font-size:20px; }
    .admp-opt { display:flex; flex-wrap:wrap; margin:0 -4px -8px; }
    .admp-opt > * { margin:0 4px 8px; }
    .admp-list { display:flex; flex-direction:column; }
    .admp-list > * + * { margin-top:10px; }
    .admp-pick { display:flex; align-items:center; justify-content:flex-start; text-align:left; padding:12px 14px; font-size:20px; }
    .admp-pick > * + * { margin-left:12px; }
    .admp-pick .t { flex:1; }
    .admp-pick small { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.06em; padding:4px 6px; border:2px solid #0f0f14; background:#fff; }
    .admp-pick.sel small { background:#0f0f14; color:#ffce1f; }
    .admp-row { display:flex; align-items:center; padding:9px 12px; background:#fff; border:3px solid #0f0f14; }
    .admp-row > * + * { margin-left:10px; }
    .admp-row b { flex:1; font-weight:800; }
    .admp-row.top { background:#ffce1f; box-shadow:4px 4px 0 #0f0f14; }
    .admp-row .who { display:flex; } .admp-row .who .avatar { margin-left:2px; }
    .admp-row .n { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:24px; min-width:26px; text-align:right; }
    .admp-row .tg { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:10px; letter-spacing:.06em; background:#0f0f14; color:#ffce1f; padding:3px 5px; margin-left:6px; vertical-align:middle; }
    .admp-ev { text-align:center; font-weight:800; font-size:17px; line-height:1.4; }
    .admp-draw { background:#0f0f14; color:#f1f0ea; border:3px solid #0f0f14; box-shadow:5px 5px 0 #e9a95b; padding:34px 18px; text-align:center; cursor:pointer; background-image:radial-gradient(rgba(241,240,234,.14) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .admp-draw .e { font-size:64px; line-height:1; }
    .admp-draw b { display:block; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:28px; line-height:1; color:#e9a95b; margin-top:14px; }
    .admp-draw small { display:block; margin-top:10px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
    .admp-draw:active { transform:translate(4px,4px); box-shadow:1px 1px 0 #e9a95b; }
    .admp-mine { display:flex; flex-direction:column; } .admp-mine > * + * { margin-top:6px; }
    .admp-mine span { display:block; background:#e9a95b; border:2px solid #0f0f14; padding:7px 10px; font-weight:800; font-size:15px; line-height:1.3; }
    .admp-end { text-align:center; background:#ffce1f; }
    .admp-end .cr { font-size:56px; line-height:1; }
    .admp-end h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:10px; }
    .pl .admp-pips { white-space:nowrap; }
    .pl .admp-pips i { display:inline-block; width:11px; height:15px; border:2px solid #0f0f14; background:#fff; margin-left:2px; vertical-align:middle; }
    .pl .admp-pips i.on { background:#e9a95b; }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const pix = n => `<span class="pix">${n}</span>`;
  const ply = (c, pid) => c.C.players.filter(p => p.pid === pid)[0] || null;
  const has = (l, x) => (l || []).indexOf(x) >= 0;

  function placar(c) {
    const G = c.G, goal = G.cfg.goal;
    return `<div class="box"><p class="admp-lbl">Cartas de cada um <span class="mut">(meta: ${goal})</span></p>${c.playersHtml({
      info: p => { const n = G.cards[p.pid] || 0; let h = ''; for (let i = 0; i < goal; i++) h += `<i class="${i < n ? 'on' : ''}"></i>`; return `<span class="admp-pips">${h}</span>`; },
      tag: p => p.pid === G.champ ? ' 👑' : '',
    })}</div>`;
  }
  function minhasCartas(c, lista) {
    if (!lista || !lista.length) return '';
    return `<div class="box"><p class="admp-lbl">Suas cartas</p><div class="admp-mine">${lista.map(q => `<span>${c.esc(q)}</span>`).join('')}</div></div>`;
  }
  function resultado(c, R) {
    const cnt = R.count || {}, votes = R.votes || {};
    const ordem = c.C.players.slice().sort((a, b) => (cnt[b.pid] || 0) - (cnt[a.pid] || 0));
    return `<div class="admp-list">${ordem.map(p => {
      const n = cnt[p.pid] || 0, top = p.pid === R.win;
      const quem = Object.keys(votes).filter(v => votes[v] === p.pid).map(v => ply(c, v)).filter(Boolean);
      return `<div class="admp-row ${top ? 'top' : ''}">${c.avatar(p, 30)}<b>${c.nm(p)}${top ? '<span class="tg">FICA COM A CARTA</span>' : ''}</b><span class="who">${quem.map(q => c.avatar(q, 20)).join('')}</span><span class="n">${n}</span></div>`;
    }).join('')}</div>`;
  }
  // botões para apontar: lista de pessoas (sem você); alvos limita (empate)
  function apontar(c, alvos, meu) {
    const G = c.G;
    return `<div class="admp-list">${c.C.players.filter(p => p.pid !== c.you.pid && (!alvos || has(alvos, p.pid))).map(p => {
      const sel = meu === p.pid;
      return `<button class="btn admp-pick ${sel ? 'warn sel' : ''}" data-a="votar" data-pid="${p.pid}">${c.avatar(p, 34)}<span class="t">${c.esc(p.name)}</span>${p.pid === G.reader ? '<small>LEU</small>' : ''}${sel ? '<small>SEU VOTO</small>' : ''}</button>`;
    }).join('')}</div>`;
  }

  ARCADE.register('amigosdemerda', {
    phone: {
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase, G.round, G.reader, G.voted.length, G.myVote, G.tieDone.length, G.tops.join(','), JSON.stringify(G.cfg), JSON.stringify(G.cards)].join('|');
      },
      html(c) {
        ensure();
        const G = c.G, esc = c.esc; if (!G || !c.you) return '';
        const me = c.you.pid, reader = ply(c, G.reader), souEu = G.reader === me;
        const roda = `Carta ${pix(G.phase === 'draw' ? G.round + 1 : G.round)} · meta ${pix(G.cfg.goal)}`;

        if (G.phase === 'setup') {
          const opt = (a, vals, cur, fmt) => `<div class="admp-opt">${vals.map(v => `<div class="admp-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : pix(v)}</div>`).join('')}</div>`;
          return `<div class="admp-hero"><span class="admp-k">Regras</span><h2 class="t">Amigos de Merda</h2><p>Leia a carta, todo mundo aponta. O mais apontado fica com ela. Qualquer um pode mudar as regras.</p></div>
            <div class="box"><p class="admp-lbl">Cartas para ser coroado</p>${opt('cfgGoal', G.goals, G.cfg.goal)}</div>
            <div class="box"><p class="admp-lbl">Tempo para apontar</p>${opt('cfgTime', G.voteSecs, G.cfg.voteSec, v => pix(v + 's'))}</div>
            <div class="box"><p class="admp-lbl">Cartas sacanas <span class="mut">(perguntas mais pesadas, para maiores)</span></p>
              <div class="admp-opt"><div class="admp-o ${G.cfg.sacana ? '' : 'sel'}" data-a="cfgSac" data-v="0">Sem</div><div class="admp-o ${G.cfg.sacana ? 'sel' : ''}" data-a="cfgSac" data-v="1">Com 🌶️</div></div></div>
            <button class="btn big ok" data-a="begin" ${c.C.players.length >= 3 ? '' : 'disabled'}>Começar</button>
            ${c.C.players.length < 3 ? '<p class="admp-ev">Precisa de pelo menos 3 pessoas.</p>' : '<p class="admp-ev">Quem começa é sorteado.</p>'}`;
        }

        if (G.phase === 'draw') {
          if (souEu) return `<div class="admp-hero"><span class="admp-k">${roda}</span><h2 class="t">Sua vez!</h2><p>Compre a carta e leia a pergunta em voz alta.</p></div>
            <div class="admp-draw" data-a="comprar"><div class="e">💩</div><b>Comprar carta</b><small>a pergunta aparece na TV</small></div>${placar(c)}`;
          const off = reader && reader.on === false;
          return `<div class="admp-hero"><span class="admp-k">${roda}</span><h2 class="t">Vez de ${reader ? esc(reader.name) : '—'}</h2><p>Esperando comprar a carta.</p></div>
            ${off ? `<button class="btn warn" data-a="comprar">Comprar por ${esc(reader.name)} (sem conexão)</button><button class="btn ghost" data-a="pular">Pular a vez</button>` : ''}
            ${placar(c)}`;
        }

        if (G.phase === 'vote') {
          return `<div class="admp-hero card"><span class="admp-k">${reader ? esc(reader.name) + ' leu' : roda}</span><h2 class="admp-q">${esc(G.q)}</h2></div>
            ${c.timerHtml(G.myVote ? 'Voto enviado. Pode trocar até o tempo acabar.' : 'Aponte para alguém!', G.turnMs)}
            ${apontar(c, null, G.myVote)}
            <p class="admp-lbl" style="text-align:center;margin:0">${pix(G.voted.length)} de ${pix(c.C.players.length)} apontaram</p>`;
        }

        if (G.phase === 'tie') {
          const posso = has(G.tieElig, me) && !has(G.tieDone, me);
          const tops = G.tops.map(x => ply(c, x)).filter(Boolean);
          let h = `<div class="admp-hero card"><span class="admp-k red">Empate!</span><h2 class="admp-q sm">${esc(G.q)}</h2><p>Empataram: ${tops.map(p => c.nm(p)).join(' ')}</p></div>
            ${c.timerHtml('', G.turnMs)}`;
          if (posso) {
            const cand = G.tops.filter(x => x !== me);
            h += `<div class="box hi"><p style="font-weight:800;font-size:17px;line-height:1.35">Você não votou em nenhum dos empatados. Quer trocar o voto para um deles?</p></div>
              ${apontar(c, cand, null)}<button class="btn" data-a="manter">Manter meu voto</button>`;
          } else {
            h += `<div class="box center"><p class="admp-lbl" style="margin:0">${has(G.tieElig, me) ? 'Decisão enviada.' : 'Seu voto já está num dos empatados.'} Esperando quem pode trocar.</p></div>`;
          }
          return h + resultado(c, { count: G.count, votes: G.votes });
        }

        if (G.phase === 'decide') {
          const cand = G.tops.filter(x => x !== me);
          return `<div class="admp-hero card"><span class="admp-k red">Continua empatado</span><h2 class="admp-q sm">${esc(G.q)}</h2></div>
            ${c.timerHtml('', G.turnMs)}
            ${souEu ? `<div class="box hi"><p style="font-weight:800;font-size:17px;line-height:1.35">Você leu a carta: seu voto desempata. Quem fica com ela?</p></div>${apontar(c, cand, null)}`
              : `<div class="box center"><p class="admp-lbl" style="margin:0">${reader ? c.nm(reader) : 'Quem leu'} está desempatando…</p></div>`}
            ${resultado(c, { count: G.count, votes: G.votes })}`;
        }

        const R = G.result || {};
        if (G.phase === 'result') {
          return `<div class="admp-hero card"><span class="admp-k">${roda}</span><h2 class="admp-q sm">${esc(G.q)}</h2></div>
            ${resultado(c, R)}
            <p class="admp-ev">${c.C.event ? c.hl(c.C.event.text) : ''}</p>
            <button class="btn big warn" data-a="next">Próxima vez →</button>
            ${placar(c)}`;
        }

        // fim
        const champ = ply(c, G.champ);
        return `<div class="box admp-end"><div class="cr">👑</div><span class="admp-k">Fim de jogo</span>
            ${champ ? `<div style="margin-top:12px">${c.avatar(champ, 96)}</div>` : ''}
            <h2>${champ ? esc(champ.name) : '—'}${G.champ === me ? ' (você!)' : ''}</h2><p class="admp-lbl" style="margin:8px 0 0;color:#0f0f14">é o amigo de merda</p></div>
          ${resultado(c, R)}
          ${minhasCartas(c, G.won && G.won[me])}
          ${placar(c)}
          <button class="btn big ok" data-a="again">Jogar de novo</button>`;
      },
      after(c) {
        const G = c.G; if (!G || !c.you) return;
        // sua vez de comprar / desempatar: aviso em tela cheia
        const meu = (G.phase === 'draw' || G.phase === 'decide') && G.reader === c.you.pid;
        const k = `${G.phase}:${G.round}`;
        if (meu && ovKey !== k) {
          ovKey = k;
          const p = ply(c, c.you.pid);
          c.turnover(`<div class="round">${G.phase === 'draw' ? 'Sua vez' : 'Empate'}</div><div>${c.avatar(p, 110)}</div><div class="who2" style="${c.nmStyle(p)}">${G.phase === 'draw' ? 'Compre a carta' : 'Você desempata'}</div>`, 1800, [60, 60, 160]);
          c.chord([784, 1046]);
        }
      },
      act(a, el) {
        const send = ARCADE.send;
        switch (a) {
          case 'cfgGoal': return send({ t: 'config', cfg: { goal: Number(el.dataset.v) } });
          case 'cfgTime': return send({ t: 'config', cfg: { voteSec: Number(el.dataset.v) } });
          case 'cfgSac': return send({ t: 'config', cfg: { sacana: el.dataset.v === '1' } });
          case 'begin': return send({ t: 'begin' });
          case 'comprar': return send({ t: 'draw' });
          case 'pular': return send({ t: 'skip' });
          case 'votar': return send({ t: 'vote', pid: el.dataset.pid });
          case 'manter': return send({ t: 'keep' });
          case 'next': return send({ t: 'next' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });
})();
