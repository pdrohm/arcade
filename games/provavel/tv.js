// Quem é mais provável? — tela da TV.
// Visual "fliperama de papel" (shared/ui.css): papel, tinta, bordas grossas e sombra dura. Cor da festa: #ff7ab8.
// Roda na TV de 2016 (Chrome 47): nada de var(), gap em flex, grid nem inset. Tamanhos em rem (1rem = 1% da largura).
'use strict';
(() => {
  let lastKey = '';
  const style = `
    .qm-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#0f0f14; }
    .qm-stage > * + * { margin-top:1.6rem; }
    .qm-tag { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.5rem 1rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.15rem; letter-spacing:.08em; text-transform:uppercase; line-height:1; }
    .qm-tag .pix { color:#ffce1f; font-size:1.5rem; }
    .qm-card { position:relative; max-width:88%; background:#ff7ab8; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:2.4rem 3rem; }
    .qm-q { font-size:3.5rem; font-weight:900; font-stretch:112%; line-height:1.08; letter-spacing:-.01em; }
    .qm-q.sm { font-size:2.1rem; }
    .qm-card.sm { padding:1.3rem 2rem; box-shadow:.45rem .45rem 0 #0f0f14; }
    .qm-hint { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.2rem; letter-spacing:.06em; text-transform:uppercase; color:#0f0f14; }
    .qm-vs { display:flex; flex-wrap:wrap; justify-content:center; margin:0 -.4rem -.8rem; }
    .qm-vs > * { margin:0 .4rem .8rem; }
    .qm-v { display:flex; align-items:center; padding:.5rem 1.1rem .5rem .5rem; border:.2rem solid #0f0f14; font-size:1.5rem; font-weight:900; background:#e4e2d9; color:#55555e; }
    .qm-v .avatar { margin-right:.6rem; }
    .qm-v.ok { box-shadow:.3rem .3rem 0 #0f0f14; }
    .qm-v .ck { margin-left:.6rem; font-family:'JetBrains Mono',monospace; font-size:.9rem; letter-spacing:.06em; background:#0f0f14; color:#35d07f; padding:.25rem .45rem; }
    .qm-bars { width:100%; max-width:62rem; display:flex; flex-direction:column; }
    .qm-bars > * + * { margin-top:.7rem; }
    .qm-bar { display:flex; align-items:center; font-size:1.5rem; }
    .qm-bar > * + * { margin-left:.8rem; }
    .qm-bar .n { width:12rem; flex:none; text-align:right; }
    .qm-bar .n .nm { font-size:1.4rem; }
    .qm-bar .tr { flex:1; height:3rem; background:#fff; border:.2rem solid #0f0f14; position:relative; }
    .qm-bar .b { height:100%; border-right:.2rem solid #0f0f14; transition:width .8s cubic-bezier(.2,.8,.2,1); }
    .qm-bar .ct { width:4rem; flex:none; text-align:left; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:2.4rem; line-height:1; }
    .qm-bar .top { flex:none; width:8.5rem; text-align:left; }
    .qm-bar .top span { display:inline-block; background:#ffce1f; border:.15rem solid #0f0f14; padding:.25rem .5rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:.85rem; letter-spacing:.06em; }
    .qm-bar.win .tr { box-shadow:.3rem .3rem 0 #0f0f14; }
    .qm-win { display:inline-block; background:#fff; border:.25rem solid #0f0f14; box-shadow:.5rem .5rem 0 #0f0f14; padding:1rem 1.8rem; font-size:2.3rem; font-weight:900; font-stretch:112%; animation:qmpop .4s; }
    .qm-win .nm { font-size:2.1rem; }
    .qm-end { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:5.5rem; line-height:.9; letter-spacing:-.01em; }
    @keyframes qmpop { from { transform:scale(.6); opacity:0; } }
    .qm-head { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:14px 16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .qm-head .k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:4px 8px; }
    .qm-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:10px; }
    .qm-head .r { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; letter-spacing:.06em; margin-top:8px; text-transform:uppercase; }
    .qm-head .r .pix { font-size:22px; }
    .qm-side-t { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .pl .qm-pts { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:22px; color:#0f0f14; }
  `;
  ARCADE.register('provavel', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm; if (!G) return {};
        let stage = `<style>${style}</style>`;
        const roda = `PERGUNTA <span class="pix">${G.round}</span> DE <span class="pix">${G.rounds}</span>`;
        let side = `<div class="qm-head"><span class="k">FESTA</span><h2>Quem é mais provável?</h2><div class="r">${roda}</div></div>`;
        if (G.phase === 'vote') {
          stage += `<div class="qm-stage"><div class="qm-tag">${roda}</div>
            <div class="qm-card"><div class="qm-q">${esc(G.q)}</div></div>
            <div class="qm-hint">Votem no celular ▸ <span class="pix" style="font-size:1.6rem">${G.voted.length}</span>/<span class="pix" style="font-size:1.6rem">${c.C.players.length}</span> votaram</div>
            <div class="qm-vs">${c.C.players.map(p => { const ok = G.voted.includes(p.pid); return `<div class="qm-v ${ok ? 'ok' : ''}" style="${ok ? c.nmStyle(p) : ''}">${c.avatar(p, 40)}${esc(p.name)}${ok ? '<span class="ck">VOTOU</span>' : ''}</div>`; }).join('')}</div></div>`;
          side += c.timerHtml('', G.turnMs);
        } else {
          const cnt = G.count || {}, L = G.last, total = Math.max(1, ...Object.keys(cnt).map(k => cnt[k]));
          const ordem = [...c.C.players].sort((a, b) => (cnt[b.pid] || 0) - (cnt[a.pid] || 0));
          const fim = G.phase === 'end';
          stage += `<div class="qm-stage">${fim ? '<div class="qm-tag">FIM DE JOGO · ÚLTIMA PERGUNTA</div>' : `<div class="qm-tag">${roda}</div>`}
            <div class="qm-card sm"><div class="qm-q sm">${esc(G.q)}</div></div>
            <div class="qm-bars">${ordem.map(p => { const n = cnt[p.pid] || 0, top = L && L.tops.includes(p.pid);
              return `<div class="qm-bar ${top ? 'win' : ''}"><span class="n">${nm(p)}</span>${c.avatar(p, 48)}<div class="tr">${n ? `<div class="b" style="width:${n / total * 100}%;background:${c.ci(p.color).hex}"></div>` : ""}</div><span class="ct">${n}</span><span class="top">${top ? '<span>MAIS VOTADO</span>' : ''}</span></div>`; }).join('')}</div>
            ${L ? `<div class="qm-win">${c.hl(c.C.event ? c.C.event.text : '')}</div>` : ''}
            <div class="qm-hint">${fim ? 'Toque em "Jogar de novo" no celular' : 'Toque em "Próxima pergunta" no celular'}</div></div>`;
        }
        side += `<div class="box"><p class="qm-side-t">Mais apontados da noite</p>${c.playersHtml({ info: p => `<span class="qm-pts">${G.wins[p.pid] || 0}</span>` })}</div>`;
        return { stage, side };
      },
      after(c) { const G = c.G; if (!G) return; const k = `${G.phase}:${G.round}`; if (k !== lastKey) { lastKey = k; if (G.phase === 'vote') c.chord([523, 659]); else c.chord([659, 784, 1046]); } },
    },
  });
})();
