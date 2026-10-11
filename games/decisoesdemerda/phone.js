// Decisões de Merda — tela do celular.
// Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8; opção 1 verde-enjoo (#a3d65c), opção 2 caramelo (#e9a95b).
'use strict';
(() => {
  let styled = false, ovKey = '';
  const COR = { 1: '#a3d65c', 2: '#e9a95b' };
  const style = `
    .ddmp-hero { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .ddmp-k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:5px 9px; text-transform:uppercase; }
    .ddmp-k .pix { color:#ffce1f; font-size:15px; }
    .ddmp-hero h2.t { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:12px; }
    .ddmp-hero p { font-size:15px; font-weight:600; line-height:1.35; margin-top:8px; }
    .ddmp-lbl { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .ddmp-lbl .mut { letter-spacing:.02em; text-transform:none; font-family:'Archivo',sans-serif; font-weight:600; font-size:13px; }
    .ddmp-step { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:20px; line-height:1; margin:4px 0 -4px; }
    .ddmp-step .n { display:inline-block; background:#0f0f14; color:#ffce1f; font-family:'Pixelify Sans',monospace; padding:2px 7px; margin-right:6px; }
    .ddmp-o { padding:11px 14px; background:#fff; border:3px solid #0f0f14; font-weight:900; font-size:17px; text-align:center; cursor:pointer; min-width:52px; }
    .ddmp-o.sel { background:#ffce1f; box-shadow:3px 3px 0 #0f0f14; }
    .ddmp-o .pix { font-size:20px; }
    .ddmp-opt { display:flex; flex-wrap:wrap; margin:0 -4px -8px; }
    .ddmp-opt > * { margin:0 4px 8px; }
    .ddmp-ch { display:flex; align-items:center; text-align:left; border:3px solid #0f0f14; padding:14px; cursor:pointer; background-image:radial-gradient(rgba(15,15,20,.14) 1.2px, transparent 1.3px); background-size:9px 9px; transition:transform .06s, box-shadow .06s; }
    .ddmp-ch + .ddmp-ch { margin-top:10px; }
    .ddmp-ch .num { flex:none; width:38px; height:38px; line-height:36px; text-align:center; background:#0f0f14; color:#ffce1f; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:24px; margin-right:12px; }
    .ddmp-ch .t { flex:1; font-weight:900; font-size:19px; line-height:1.2; }
    .ddmp-ch .ok { flex:none; margin-left:8px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.06em; background:#0f0f14; color:#ffce1f; padding:4px 6px; }
    .ddmp-ch.sel { box-shadow:5px 5px 0 #0f0f14; outline:4px solid #ffce1f; outline-offset:-10px; }
    .ddmp-ch.dim { opacity:.5; }
    .ddmp-ch:active { transform:translate(3px,3px); }
    .ddmp-bets { display:flex; } .ddmp-bets > * { flex:1; } .ddmp-bets > * + * { margin-left:10px; }
    .ddmp-bet { border:3px solid #0f0f14; padding:14px 8px; text-align:center; cursor:pointer; font-weight:900; font-size:17px; background:#fff; }
    .ddmp-bet .pix { display:block; font-size:34px; line-height:1; }
    .ddmp-bet.sel { box-shadow:5px 5px 0 #0f0f14; }
    .ddmp-row { display:flex; align-items:center; padding:9px 12px; background:#fff; border:3px solid #0f0f14; }
    .ddmp-row + .ddmp-row { margin-top:10px; }
    .ddmp-row > * + * { margin-left:10px; }
    .ddmp-row b { flex:1; font-weight:800; }
    .ddmp-row.hit { background:#35d07f; box-shadow:4px 4px 0 #0f0f14; }
    .ddmp-row .pk { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.04em; text-align:right; line-height:1.4; }
    .ddmp-row .pk i { font-style:normal; font-family:'Pixelify Sans',monospace; font-size:15px; border:2px solid #0f0f14; padding:0 4px; background:#fff; }
    .ddmp-ev { text-align:center; font-weight:800; font-size:17px; line-height:1.4; }
    .ddmp-draw { background:#0f0f14; color:#f1f0ea; border:3px solid #0f0f14; box-shadow:5px 5px 0 #a3d65c; padding:34px 18px; text-align:center; cursor:pointer; background-image:radial-gradient(rgba(241,240,234,.14) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .ddmp-draw .e { font-size:64px; line-height:1; }
    .ddmp-draw b { display:block; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:28px; line-height:1; color:#a3d65c; margin-top:14px; }
    .ddmp-draw small { display:block; margin-top:10px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
    .ddmp-draw:active { transform:translate(4px,4px); box-shadow:1px 1px 0 #a3d65c; }
    .ddmp-end { text-align:center; background:#ffce1f; }
    .ddmp-end .cr { font-size:56px; line-height:1; }
    .ddmp-end h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:28px; line-height:.95; margin-top:10px; }
    .pl .ddmp-pts { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; color:#0f0f14; }
    .pl .ddmp-pts small { font-family:'JetBrains Mono',monospace; font-size:12px; background:#35d07f; border:2px solid #0f0f14; padding:1px 4px; margin-left:4px; vertical-align:middle; }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const pix = n => `<span class="pix">${n}</span>`;
  const ply = (c, pid) => c.C.players.filter(p => p.pid === pid)[0] || null;

  function placar(c) {
    const G = c.G, hits = (G.result && G.result.hit) || [];
    return `<div class="box"><p class="ddmp-lbl">Pontos <span class="mut">(meta: ${G.cfg.goal})</span></p>${c.playersHtml({
      info: p => `<span class="ddmp-pts">${G.scores[p.pid] || 0}${hits.indexOf(p.pid) >= 0 ? '<small>+1</small>' : ''}</span>`,
      tag: p => G.champs.indexOf(p.pid) >= 0 ? ' 👑' : '',
    })}</div>`;
  }
  // as duas opções da carta; com R, mostra quantos escolheram cada uma
  function opcoes(c, a, sel, R) {
    const card = c.G.card || ['', ''];
    return [1, 2].map(k => {
      const cls = sel ? (sel === k ? 'sel' : 'dim') : R && R.maj ? (R.maj === k ? 'sel' : 'dim') : '';
      const tag = R ? `<span class="ok">${R.n[k]} ${R.n[k] === 1 ? 'VOTO' : 'VOTOS'}${R.maj === k ? ' · MAIORIA' : ''}</span>` : sel === k ? '<span class="ok">SUA ESCOLHA</span>' : '';
      return `<div class="ddmp-ch ${cls}" style="background-color:${COR[k]}" ${a ? `data-a="${a}" data-v="${k}"` : ''}><span class="num">${k}</span><span class="t">${c.esc(card[k - 1])}</span>${tag}</div>`;
    }).join('');
  }
  function resultado(c, R) {
    const ordem = c.C.players.filter(p => R.picks[p.pid] || R.bets[p.pid]);
    return `<div>${ordem.map(p => {
      const hit = R.hit.indexOf(p.pid) >= 0;
      return `<div class="ddmp-row ${hit ? 'hit' : ''}">${c.avatar(p, 30)}<b>${c.nm(p)}</b><span class="pk">escolheu <i>${R.picks[p.pid] || '—'}</i><br>apostou <i>${R.bets[p.pid] || '—'}</i>${hit ? ' +1' : ''}</span></div>`;
    }).join('')}</div>`;
  }

  ARCADE.register('decisoesdemerda', {
    phone: {
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase, G.round, G.reader, G.ready.length, G.myPick, G.myBet, JSON.stringify(G.cfg), JSON.stringify(G.scores)].join('|');
      },
      html(c) {
        ensure();
        const G = c.G, esc = c.esc; if (!G || !c.you) return '';
        const me = c.you.pid, reader = ply(c, G.reader), souEu = G.reader === me;
        const roda = `Carta ${pix(G.phase === 'draw' ? G.round + 1 : G.round)} · meta ${pix(G.cfg.goal)}`;

        if (G.phase === 'setup') {
          const opt = (a, vals, cur, fmt) => `<div class="ddmp-opt">${vals.map(v => `<div class="ddmp-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : pix(v)}</div>`).join('')}</div>`;
          return `<div class="ddmp-hero"><span class="ddmp-k">Regras</span><h2 class="t">Decisões de Merda</h2><p>Duas opções ruins. Escolha a sua e aposte na da maioria. Qualquer um pode mudar as regras.</p></div>
            <div class="box"><p class="ddmp-lbl">Pontos para vencer</p>${opt('cfgGoal', G.goals, G.cfg.goal)}</div>
            <div class="box"><p class="ddmp-lbl">Tempo para escolher</p>${opt('cfgTime', G.voteSecs, G.cfg.voteSec, v => pix(v + 's'))}</div>
            <div class="box"><p class="ddmp-lbl">Cartas sacanas <span class="mut">(dilemas mais pesados, para maiores)</span></p>
              <div class="ddmp-opt"><div class="ddmp-o ${G.cfg.sacana ? '' : 'sel'}" data-a="cfgSac" data-v="0">Sem</div><div class="ddmp-o ${G.cfg.sacana ? 'sel' : ''}" data-a="cfgSac" data-v="1">Com 🌶️</div></div></div>
            <button class="btn big ok" data-a="begin" ${c.C.players.length >= 3 ? '' : 'disabled'}>Começar</button>
            <p class="ddmp-ev">${c.C.players.length < 3 ? 'Precisa de pelo menos 3 pessoas.' : 'Quem começa é sorteado.'}</p>`;
        }

        if (G.phase === 'draw') {
          if (souEu) return `<div class="ddmp-hero"><span class="ddmp-k">${roda}</span><h2 class="t">Sua vez!</h2><p>Vire a carta e leia as duas opções em voz alta.</p></div>
            <div class="ddmp-draw" data-a="virar"><div class="e">🤢</div><b>Virar carta</b><small>as opções aparecem na TV</small></div>${placar(c)}`;
          const off = reader && reader.on === false;
          return `<div class="ddmp-hero"><span class="ddmp-k">${roda}</span><h2 class="t">Vez de ${reader ? esc(reader.name) : '—'}</h2><p>Esperando virar a carta.</p></div>
            ${off ? `<button class="btn warn" data-a="virar">Virar por ${esc(reader.name)} (sem conexão)</button><button class="btn ghost" data-a="pular">Pular a vez</button>` : ''}
            ${placar(c)}`;
        }

        if (G.phase === 'vote') {
          const pronto = G.myPick && G.myBet;
          return `<div class="ddmp-hero"><span class="ddmp-k">${reader ? esc(reader.name) + ' leu' : roda}</span><h2 class="t">O que você prefere?</h2></div>
            ${c.timerHtml(pronto ? 'Pronto! Pode trocar até o tempo acabar.' : 'Escolha e aposte. Ninguém vê até o fim.', G.turnMs)}
            <p class="ddmp-step"><span class="n">1</span>Sua escolha</p>
            <div>${opcoes(c, 'escolher', G.myPick, null)}</div>
            <p class="ddmp-step"><span class="n">2</span>A maioria vai escolher…</p>
            <div class="ddmp-bets">${[1, 2].map(k => `<div class="ddmp-bet ${G.myBet === k ? 'sel' : ''}" style="background:${G.myBet === k ? COR[k] : '#fff'}" data-a="apostar" data-v="${k}">${pix(k)}opção ${k}</div>`).join('')}</div>
            <p class="ddmp-lbl" style="text-align:center;margin:0">${pix(G.ready.length)} de ${pix(c.C.players.length)} prontos</p>`;
        }

        const R = G.result || { n: { 1: 0, 2: 0 }, picks: {}, bets: {}, hit: [], maj: 0 };
        const fim = G.phase === 'end';
        let h = '';
        if (fim) {
          const cs = G.champs.map(pid => ply(c, pid)).filter(Boolean);
          h += `<div class="box ddmp-end"><div class="cr">👑</div><span class="ddmp-k">Fim de jogo</span>
            <div style="margin-top:12px">${cs.map(p => c.avatar(p, cs.length > 1 ? 70 : 96)).join(' ')}</div>
            <h2>${cs.map(p => esc(p.name)).join(' e ')} ${cs.length > 1 ? 'venceram' : 'venceu'}${G.champs.indexOf(me) >= 0 ? ' (você!)' : ''}</h2></div>`;
        } else h += `<div class="ddmp-hero"><span class="ddmp-k">${roda}</span><h2 class="t">Resultado</h2></div>`;
        h += `<div>${opcoes(c, null, null, R)}</div>
          <p class="ddmp-ev">${c.C.event ? c.hl(c.C.event.text) : ''}</p>
          ${resultado(c, R)}`;
        h += fim ? `${placar(c)}<button class="btn big ok" data-a="again">Jogar de novo</button>`
          : `<button class="btn big warn" data-a="next">Próxima vez →</button>${placar(c)}`;
        return h;
      },
      after(c) {
        const G = c.G; if (!G || !c.you) return;
        const k = `${G.phase}:${G.round}`;
        if (G.phase === 'draw' && G.reader === c.you.pid && ovKey !== k) {
          ovKey = k;
          const p = ply(c, c.you.pid);
          c.turnover(`<div class="round">Sua vez</div><div>${c.avatar(p, 110)}</div><div class="who2" style="${c.nmStyle(p)}">Vire a carta</div>`, 1800, [60, 60, 160]);
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
          case 'virar': return send({ t: 'draw' });
          case 'pular': return send({ t: 'skip' });
          case 'escolher': return send({ t: 'pick', v: Number(el.dataset.v) });
          case 'apostar': return send({ t: 'bet', v: Number(el.dataset.v) });
          case 'next': return send({ t: 'next' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });
})();
