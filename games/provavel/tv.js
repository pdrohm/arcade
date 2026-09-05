// Quem é mais provável? — tela da TV.
(() => {
  let lastKey = '';
  const style = `
    .qm-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; text-align:center; }
    .qm-q { font-size:clamp(30px,4.2vw,66px); font-weight:900; line-height:1.15; max-width:92%; }
    .qm-bars { width:100%; max-width:900px; display:flex; flex-direction:column; gap:12px; }
    .qm-bar { display:flex; align-items:center; gap:14px; font-size:clamp(18px,2.2vw,30px); }
    .qm-bar .b { height:44px; border-radius:12px; transition:width .8s cubic-bezier(.2,.8,.2,1); min-width:6px; display:flex; align-items:center; justify-content:flex-end; padding-right:12px; font-weight:900; color:#111; }
    .qm-bar .n { min-width:160px; text-align:right; }
    .qm-tag { font-size:clamp(16px,1.6vw,24px); color:#9aa6c0; font-weight:800; letter-spacing:1px; text-transform:uppercase; }
    .qm-vs { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; }
    .qm-v { padding:12px 22px; border-radius:14px; font-size:clamp(16px,1.8vw,26px); font-weight:900; opacity:.35; } .qm-v.ok { opacity:1; box-shadow:0 0 0 4px #22c55e; }
    .qm-win { font-size:clamp(28px,4vw,60px); font-weight:900; animation:qmpop .4s; }
    @keyframes qmpop { from { transform:scale(.6); opacity:0; } }
  `;
  ARCADE.register('provavel', {
    tv: {
      html(c) {
        const { G, esc, nm } = c; if (!G) return {};
        let stage = `<style>${style}</style>`;
        let side = `<div class="box center"><div style="font-size:28px;font-weight:900">👉 Quem é mais provável?</div><p class="sub mut">Pergunta ${G.round} de ${G.rounds}</p></div>`;
        if (G.phase === 'vote') {
          stage += `<div class="qm-stage"><div class="qm-tag">Pergunta ${G.round} de ${G.rounds}</div><div class="qm-q">${esc(G.q)}</div>
            <div class="qm-tag">votem no celular</div><div class="qm-vs">${c.C.players.map(p => `<div class="qm-v ${G.voted.includes(p.pid) ? 'ok' : ''}" style="${c.nmStyle(p)}">${G.voted.includes(p.pid) ? '✓ ' : ''}${esc(p.name)}</div>`).join('')}</div></div>`;
          side += c.timerHtml('', G.turnMs);
        } else {
          const cnt = G.count || {}, L = G.last, total = Math.max(1, ...Object.values(cnt));
          const ordem = [...c.C.players].sort((a, b) => (cnt[b.pid] || 0) - (cnt[a.pid] || 0));
          stage += `<div class="qm-stage"><div class="qm-q" style="font-size:clamp(22px,2.8vw,44px)">${esc(G.q)}</div>
            <div class="qm-bars">${ordem.map(p => `<div class="qm-bar"><span class="n">${nm(p)}</span><div class="b" style="width:${Math.max(2, (cnt[p.pid] || 0) / total * 100)}%;background:${c.ci(p.color).hex}">${cnt[p.pid] || ''}</div>${L && L.tops.includes(p.pid) ? '👑' : ''}</div>`).join('')}</div>
            ${L ? `<div class="qm-win">${c.hl(c.C.event ? c.C.event.text : '')}</div>` : ''}
            <div class="qm-tag">${G.phase === 'end' ? '🏆 fim de jogo' : 'toque em "Próxima pergunta" no celular'}</div></div>`;
        }
        side += `<div class="box"><p class="sub mut" style="margin-bottom:8px">Mais apontados da noite</p>${c.playersHtml({ info: p => '👑'.repeat(G.wins[p.pid] || 0) })}</div>`;
        return { stage, side };
      },
      after(c) { const G = c.G; if (!G) return; const k = `${G.phase}:${G.round}`; if (k !== lastKey) { lastKey = k; if (G.phase === 'vote') c.chord([523, 659]); else c.chord([659, 784, 1046]); } },
    },
  });
})();
