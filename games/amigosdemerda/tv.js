// Amigos de Merda — tela da TV.
// Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8; a carta de pergunta é caramelo (#e9a95b).
// Roda na TV de 2016 (Chrome 47): nada de var(), gap em flex, grid nem inset. Tamanhos em rem (1rem = 1% da largura).
'use strict';
(() => {
  let lastKey = '';
  const style = `
    .adm-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#0f0f14; }
    .adm-stage > * + * { margin-top:1.5rem; }
    .adm-tag { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.5rem 1rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.15rem; letter-spacing:.08em; text-transform:uppercase; line-height:1; }
    .adm-tag .pix { color:#ffce1f; font-size:1.5rem; }
    .adm-tag.red { background:#f0443a; color:#0f0f14; }
    .adm-card { position:relative; max-width:84%; background:#e9a95b; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:2.6rem 3.2rem 2.2rem; background-image:radial-gradient(rgba(15,15,20,.14) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .adm-card .lb { position:absolute; top:-1.2rem; left:2rem; background:#fff; border:.2rem solid #0f0f14; padding:.3rem .7rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1rem; letter-spacing:.08em; }
    .adm-q { font-size:3.6rem; font-weight:900; font-stretch:112%; line-height:1.08; letter-spacing:-.01em; }
    .adm-card.sm { padding:1.6rem 2.2rem 1.3rem; box-shadow:.45rem .45rem 0 #0f0f14; }
    .adm-card.sm .adm-q { font-size:2.1rem; }
    .adm-back { width:24rem; height:32rem; background:#0f0f14; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #e9a95b; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#f1f0ea; background-image:radial-gradient(rgba(241,240,234,.14) 1.2px, transparent 1.3px); background-size:9px 9px; animation:admwob 2.2s ease-in-out infinite; }
    .adm-back .e { font-size:7rem; line-height:1; }
    .adm-back .t { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:2.6rem; line-height:.9; margin-top:1.4rem; color:#e9a95b; }
    .adm-who { display:flex; align-items:center; justify-content:center; font-size:2.6rem; font-weight:900; font-stretch:112%; }
    .adm-who .avatar { margin-right:1rem; }
    .adm-who .nm { font-size:2.4rem; }
    .adm-hint { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.2rem; letter-spacing:.06em; text-transform:uppercase; }
    .adm-hint .pix { font-size:1.6rem; }
    .adm-vs { display:flex; flex-wrap:wrap; justify-content:center; max-width:90%; margin:0 -.4rem -.8rem; }
    .adm-vs > * { margin:0 .4rem .8rem; }
    .adm-v { display:flex; align-items:center; padding:.5rem 1.1rem .5rem .5rem; border:.2rem solid #0f0f14; font-size:1.5rem; font-weight:900; background:#e4e2d9; color:#55555e; }
    .adm-v .avatar { margin-right:.6rem; }
    .adm-v.ok { box-shadow:.3rem .3rem 0 #0f0f14; color:#0f0f14; }
    .adm-v .ck { margin-left:.6rem; font-family:'JetBrains Mono',monospace; font-size:.9rem; letter-spacing:.06em; background:#0f0f14; color:#35d07f; padding:.25rem .45rem; }
    .adm-bars { width:100%; max-width:66rem; display:flex; flex-direction:column; }
    .adm-bars > * + * { margin-top:.6rem; }
    .adm-bar { display:flex; align-items:center; font-size:1.5rem; }
    .adm-bar > * + * { margin-left:.8rem; }
    .adm-bar .n { width:11rem; flex:none; text-align:right; }
    .adm-bar .n .nm { font-size:1.35rem; }
    .adm-bar .tr { flex:1; height:3rem; background:#fff; border:.2rem solid #0f0f14; position:relative; display:flex; align-items:center; overflow:hidden; }
    .adm-bar .b { position:absolute; top:0; left:0; bottom:0; border-right:.2rem solid #0f0f14; transition:width .8s cubic-bezier(.2,.8,.2,1); }
    .adm-bar .who { position:relative; display:flex; align-items:center; padding-left:.4rem; }
    .adm-bar .who .avatar { margin-right:.25rem; }
    .adm-bar .ct { width:3.5rem; flex:none; text-align:left; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:2.4rem; line-height:1; }
    .adm-bar .top { flex:none; width:11.5rem; white-space:nowrap; text-align:left; }
    .adm-bar .top span { display:inline-block; background:#ffce1f; border:.15rem solid #0f0f14; padding:.25rem .5rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:.85rem; letter-spacing:.06em; }
    .adm-bar.win .tr { box-shadow:.3rem .3rem 0 #0f0f14; }
    .adm-bar.out { opacity:.45; }
    .adm-win { display:inline-block; background:#fff; border:.25rem solid #0f0f14; box-shadow:.5rem .5rem 0 #0f0f14; padding:1rem 1.8rem; font-size:2.2rem; font-weight:900; font-stretch:112%; animation:admpop .4s; }
    .adm-win .nm { font-size:2rem; }
    .adm-crown { font-size:6rem; line-height:1; animation:admpop .5s; }
    .adm-champ { display:flex; flex-direction:column; align-items:center; background:#ffce1f; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:2rem 3.5rem; }
    .adm-champ > * + * { margin-top:1rem; }
    .adm-end { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:5rem; line-height:.9; letter-spacing:-.01em; }
    .adm-list { max-width:70rem; display:flex; flex-wrap:wrap; justify-content:center; margin:0 -.4rem -.8rem; }
    .adm-list > * { margin:0 .4rem .8rem; }
    .adm-list span { display:inline-block; background:#e9a95b; border:.15rem solid #0f0f14; padding:.4rem .7rem; font-size:1.15rem; font-weight:800; }
    .adm-how { max-width:64rem; text-align:left; background:#fff; border:.25rem solid #0f0f14; box-shadow:.5rem .5rem 0 #0f0f14; padding:1.6rem 2rem; }
    .adm-how p { font-size:1.6rem; font-weight:700; line-height:1.35; }
    .adm-how p + p { margin-top:.6rem; }
    .adm-how b { display:inline-block; width:2.6rem; font-family:'Pixelify Sans',monospace; font-size:1.8rem; }
    @keyframes admpop { from { transform:scale(.6); opacity:0; } }
    @keyframes admwob { 0%, 100% { transform:rotate(-2deg); } 50% { transform:rotate(2deg); } }
    .adm-head { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:14px 16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .adm-head .k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:4px 8px; }
    .adm-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:10px; }
    .adm-head .r { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; letter-spacing:.06em; margin-top:8px; text-transform:uppercase; }
    .adm-head .r .pix { font-size:22px; }
    .adm-side-t { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .pl .adm-pips { white-space:nowrap; }
    .pl .adm-pips i { display:inline-block; width:12px; height:17px; border:2px solid #0f0f14; background:#fff; margin-left:3px; vertical-align:middle; }
    .pl .adm-pips i.on { background:#e9a95b; }
    .pl .adm-rd { display:inline-block; margin-left:6px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:10px; letter-spacing:.06em; padding:1px 4px; vertical-align:middle; background:#0f0f14; color:#ffce1f; }
  `;
  const pix = n => `<span class="pix">${n}</span>`;
  const ply = (c, pid) => c.C.players.filter(p => p.pid === pid)[0] || null;

  // barras de votos; embaixo de cada nome, os bonecos de quem apontou
  function barras(c, G, destaque, apagar) {
    const cnt = G.count || {}, votes = G.votes || {};
    const total = Math.max.apply(null, [1].concat(Object.keys(cnt).map(k => cnt[k])));
    const ordem = c.C.players.slice().sort((a, b) => (cnt[b.pid] || 0) - (cnt[a.pid] || 0));
    return `<div class="adm-bars">${ordem.map(p => {
      const n = cnt[p.pid] || 0, top = destaque.indexOf(p.pid) >= 0;
      const quem = Object.keys(votes).filter(v => votes[v] === p.pid).map(v => ply(c, v)).filter(Boolean);
      return `<div class="adm-bar ${top ? 'win' : ''} ${apagar && !top ? 'out' : ''}"><span class="n">${c.nm(p)}</span>${c.avatar(p, 48)}
        <div class="tr">${n ? `<div class="b" style="width:${n / total * 100}%;background:${c.ci(p.color).hex}"></div>` : ''}<span class="who">${quem.map(q => c.avatar(q, 30)).join('')}</span></div>
        <span class="ct">${n}</span><span class="top">${top ? `<span>${G.phase === 'tie' || G.phase === 'decide' ? 'EMPATADO' : 'FICA COM A CARTA'}</span>` : ''}</span></div>`;
    }).join('')}</div>`;
  }

  ARCADE.register('amigosdemerda', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc; if (!G) return {};
        const reader = ply(c, G.reader);
        const roda = `CARTA ${pix(G.phase === 'draw' ? G.round + 1 : G.round)} · META ${pix(G.cfg.goal)} CARTAS`;
        let stage = `<style>${style}</style>`;
        let side = `<div class="adm-head"><span class="k">FESTA</span><h2>Amigos de Merda</h2><div class="r">${G.phase === 'setup' ? 'ajustando as regras' : roda}</div></div>`;

        if (G.phase === 'setup') {
          stage += `<div class="adm-stage"><div class="adm-tag">💩 AMIGOS DE MERDA</div>
            <div class="adm-how">
              <p><b>1</b>Na sua vez, compre uma carta e leia a pergunta.</p>
              <p><b>2</b>Todo mundo aponta no celular ao mesmo tempo. Em si mesmo, não vale.</p>
              <p><b>3</b>O mais apontado fica com a carta.</p>
              <p><b>4</b>Empate: quem não votou nos empatados pode trocar. Depois, quem leu desempata.</p>
              <p><b>5</b>Quem juntar ${pix(G.cfg.goal)} cartas é coroado o AMIGO DE MERDA.</p>
            </div>
            <div class="adm-hint">Meta ${pix(G.cfg.goal)} cartas · ${pix(G.cfg.voteSec + 's')} para votar · ${G.cfg.sacana ? 'com' : 'sem'} cartas sacanas</div>
            <div class="adm-hint">Ajustem no celular e toquem em Começar</div></div>`;
        } else if (G.phase === 'draw') {
          stage += `<div class="adm-stage"><div class="adm-tag">VEZ DE COMPRAR</div>
            <div class="adm-back"><div class="e">💩</div><div class="t">Amigos<br>de Merda</div></div>
            ${reader ? `<div class="adm-who">${c.avatar(reader, 72)}${c.nm(reader)}</div>` : ''}
            <div class="adm-hint">${reader && reader.on === false ? 'Sem conexão: qualquer um compra ou pula a vez no celular' : 'Toque em "Comprar carta" no celular'}</div></div>`;
        } else if (G.phase === 'vote') {
          stage += `<div class="adm-stage"><div class="adm-tag">${roda}</div>
            <div class="adm-card"><span class="lb">${reader ? esc(reader.name).toUpperCase() + ' LEU' : 'CARTA'}</span><div class="adm-q">${esc(G.q)}</div></div>
            <div class="adm-hint">Apontem no celular ▸ ${pix(G.voted.length)}/${pix(c.C.players.length)} apontaram</div>
            <div class="adm-vs">${c.C.players.map(p => { const ok = G.voted.indexOf(p.pid) >= 0; return `<div class="adm-v ${ok ? 'ok' : ''}" style="${ok ? c.nmStyle(p) : ''}">${c.avatar(p, 40)}${esc(p.name)}${ok ? '<span class="ck">APONTOU</span>' : ''}</div>`; }).join('')}</div></div>`;
          side += c.timerHtml('', G.turnMs);
        } else if (G.phase === 'tie' || G.phase === 'decide') {
          const falta = G.tieElig.filter(x => G.tieDone.indexOf(x) < 0).map(x => ply(c, x)).filter(Boolean);
          stage += `<div class="adm-stage"><div class="adm-tag red">EMPATE!</div>
            <div class="adm-card sm"><div class="adm-q">${esc(G.q)}</div></div>
            ${barras(c, G, G.tops, true)}
            <div class="adm-win">${G.phase === 'tie'
              ? `Quem não votou nos empatados pode trocar o voto${falta.length ? ': ' + falta.map(p => c.nm(p)).join(' ') : ''}`
              : `${reader ? c.nm(reader) : 'Quem leu'} leu a carta e desempata`}</div></div>`;
          side += c.timerHtml('', G.turnMs);
        } else if (G.phase === 'result') {
          const R = G.result || {};
          stage += `<div class="adm-stage"><div class="adm-tag">${roda}</div>
            <div class="adm-card sm"><div class="adm-q">${esc(G.q)}</div></div>
            ${barras(c, Object.assign({}, G, { count: R.count, votes: R.votes }), R.win ? [R.win] : [], false)}
            <div class="adm-win">${c.hl(c.C.event ? c.C.event.text : '')}</div>
            <div class="adm-hint">Toque em "Próxima vez" no celular</div></div>`;
        } else if (G.phase === 'end') {
          const champ = ply(c, G.champ);
          const lista = (G.won && G.champ && G.won[G.champ]) || [];
          stage += `<div class="adm-stage"><div class="adm-crown">👑</div>
            <div class="adm-champ">${champ ? c.avatar(champ, 140) : ''}<div class="adm-end">${champ ? esc(champ.name) : '—'}</div><div class="adm-tag">É O AMIGO DE MERDA</div></div>
            <div class="adm-list">${lista.map(q => `<span>${esc(q)}</span>`).join('')}</div>
            <div class="adm-hint">Toque em "Jogar de novo" no celular</div></div>`;
        }

        const goal = G.cfg.goal;
        side += `<div class="box"><p class="adm-side-t">Cartas de cada um</p>${c.playersHtml({
          info: p => { const n = G.cards[p.pid] || 0; let h = ''; for (let i = 0; i < goal; i++) h += `<i class="${i < n ? 'on' : ''}"></i>`; return `<span class="adm-pips">${h}</span>`; },
          tag: p => (p.pid === G.reader && G.phase !== 'setup' && G.phase !== 'end' ? '<span class="adm-rd">LEU</span>' : '') + (p.pid === G.champ ? ' 👑' : ''),
        })}</div>`;
        return { stage, side };
      },
      after(c) {
        const G = c.G; if (!G) return;
        const k = `${G.phase}:${G.round}`;
        if (k === lastKey) return;
        lastKey = k;
        if (G.phase === 'vote') c.chord([523, 659]);
        else if (G.phase === 'tie') c.chord([440, 415]);
        else if (G.phase === 'result') c.chord([659, 784, 1046]);
        else if (G.phase === 'end') c.chord([523, 659, 784, 1046]);
      },
    },
  });
})();
