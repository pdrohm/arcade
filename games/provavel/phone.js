// Quem é mais provável? — tela do celular.
// Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8, texto sempre em tinta.
'use strict';
(() => {
  let styled = false;
  const style = `
    .qmp-hero { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .qmp-k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:5px 9px; text-transform:uppercase; }
    .qmp-k .pix { color:#ffce1f; font-size:15px; }
    .qmp-q { font-size:25px; font-weight:900; font-stretch:112%; line-height:1.15; margin-top:12px; }
    .qmp-q.sm { font-size:19px; margin-top:10px; }
    .qmp-lbl { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .qmp-list { display:flex; flex-direction:column; }
    .qmp-list > * + * { margin-top:10px; }
    .qmp-pick { display:flex; align-items:center; justify-content:flex-start; text-align:left; padding:12px 14px; font-size:20px; }
    .qmp-pick > * + * { margin-left:12px; }
    .qmp-pick .t { flex:1; }
    .qmp-pick small { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.06em; padding:4px 6px; border:2px solid #0f0f14; background:#fff; }
    .qmp-pick.sel small { background:#0f0f14; color:#ffce1f; }
    .qmp-row { display:flex; align-items:center; padding:9px 12px; background:#fff; border:3px solid #0f0f14; }
    .qmp-row > * + * { margin-left:10px; }
    .qmp-row b { flex:1; font-weight:800; }
    .qmp-row.top { background:#ffce1f; box-shadow:4px 4px 0 #0f0f14; }
    .qmp-row .sq { display:inline-block; width:10px; height:10px; background:#0f0f14; margin-right:3px; }
    .qmp-row .n { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:24px; min-width:26px; text-align:right; }
    .qmp-row .tg { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:10px; letter-spacing:.06em; background:#0f0f14; color:#ffce1f; padding:3px 5px; margin-left:6px; vertical-align:middle; }
    .qmp-ev { text-align:center; font-weight:800; font-size:17px; line-height:1.4; }
    .pl .qmp-pts { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; color:#0f0f14; }
    .qmp-end { text-align:center; }
    .qmp-end h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:32px; line-height:.95; margin-top:12px; }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  ARCADE.register('provavel', {
    phone: {
      html(c) {
        ensure();
        const G = c.G, esc = c.esc, nm = c.nm; if (!G) return '';
        const roda = `Pergunta <span class="pix">${G.round}</span> de <span class="pix">${G.rounds}</span>`;
        const ranking = () => `<div class="box"><p class="qmp-lbl">Mais apontados da noite</p>${c.playersHtml({ info: p => `<span class="qmp-pts">${G.wins[p.pid] || 0}</span>` })}</div>`;
        if (G.phase === 'vote') {
          return `<div class="qmp-hero"><span class="qmp-k">${roda}</span><h2 class="qmp-q">${esc(G.q)}</h2></div>
            ${c.timerHtml(G.myVote ? 'Voto enviado. Pode trocar até o tempo acabar.' : 'Escolha alguém!', G.turnMs)}
            <div class="qmp-list">${c.C.players.map(p => { const sel = G.myVote === p.pid; return `<button class="btn qmp-pick ${sel ? 'warn sel' : ''}" data-a="votar" data-pid="${p.pid}">${c.avatar(p, 34)}<span class="t">${esc(p.name)}</span>${p.pid === c.you.pid ? '<small>EU</small>' : ''}${sel ? '<small>SEU VOTO</small>' : ''}</button>`; }).join('')}</div>
            <p class="qmp-lbl" style="text-align:center;margin:0"><span class="pix" style="font-size:18px;color:#0f0f14">${G.voted.length}</span> de <span class="pix" style="font-size:18px;color:#0f0f14">${c.C.players.length}</span> votaram</p>`;
        }
        const L = G.last;
        const cnt = G.count || {};
        const ordem = [...c.C.players].sort((a, b) => (cnt[b.pid] || 0) - (cnt[a.pid] || 0));
        const fim = G.phase === 'end';
        let h = `<div class="qmp-hero"><span class="qmp-k">${fim ? 'Última pergunta' : roda}</span><h2 class="qmp-q sm">${esc(G.q)}</h2></div>
          <div class="qmp-list">${ordem.map(p => { const n = cnt[p.pid] || 0, top = L && L.tops.includes(p.pid);
            return `<div class="qmp-row ${top ? 'top' : ''}">${c.avatar(p, 30)}<b>${nm(p)}${top ? '<span class="tg">MAIS VOTADO</span>' : ''}</b><span>${'<i class="sq"></i>'.repeat(Math.min(n, 8))}</span><span class="n">${n}</span></div>`; }).join('')}</div>
          <p class="qmp-ev">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        if (G.phase === 'reveal') h += `<button class="btn big warn" data-a="next">Próxima pergunta →</button>`;
        else h += `<div class="box qmp-end"><span class="qmp-k">Fim de jogo</span><h2>Quem foi mais apontado?</h2></div>${ranking()}<button class="btn big ok" data-a="again">Jogar de novo</button>`;
        return h + (G.phase === 'reveal' ? ranking() : '');
      },
      act(a, el) { const send = ARCADE.send; if (a === 'votar') send({ t: 'vote', pid: el.dataset.pid }); else if (a === 'next') send({ t: 'next' }); else if (a === 'again') send({ t: 'again' }); },
    },
  });
})();
