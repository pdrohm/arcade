// Quem é mais provável? — tela do celular.
(() => {
  ARCADE.register('provavel', {
    phone: {
      html(c) {
        const { G, esc, nm } = c; if (!G) return '';
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const ranking = () => `<div class="box"><p class="sub mut" style="margin-bottom:8px">Mais apontados da noite</p>${c.playersHtml({ info: p => `${'👑'.repeat(G.wins[p.pid] || 0)}` })}</div>`;
        if (G.phase === 'vote') {
          return `<div class="box hi center"><p class="sub mut">Pergunta ${G.round} de ${G.rounds}</p><h2 style="font-size:26px;margin-top:6px;line-height:1.25">${esc(G.q)}</h2></div>
            ${c.timerHtml(G.myVote ? 'Voto enviado. Pode trocar até o tempo acabar.' : 'Escolha alguém!', G.turnMs)}
            <div style="display:flex;flex-direction:column;gap:10px">${c.C.players.map(p => `<button class="btn" data-a="votar" data-pid="${p.pid}" style="display:flex;align-items:center;gap:12px;justify-content:flex-start;${G.myVote === p.pid ? 'outline:4px solid #fff' : ''}"><span class="dot" style="background:${c.ci(p.color).hex};width:26px;height:26px"></span>${esc(p.name)}${p.pid === c.you.pid ? ' <span class="sub mut">(eu)</span>' : ''}${G.myVote === p.pid ? ' ✅' : ''}</button>`).join('')}</div>
            <p class="sub center mut">${G.voted.length} de ${c.C.players.length} votaram</p>`;
        }
        const L = G.last;
        const cnt = G.count || {};
        const ordem = [...c.C.players].sort((a, b) => (cnt[b.pid] || 0) - (cnt[a.pid] || 0));
        let h = `<div class="box center"><p class="sub mut">${esc(G.q)}</p></div>
          <div class="box" style="display:flex;flex-direction:column;gap:8px">${ordem.map(p => `<div class="pl" style="border-color:${L && L.tops.includes(p.pid) ? '#f59e0b' : 'transparent'}"><span class="dot" style="background:${c.ci(p.color).hex}"></span><b>${nm(p)}${L && L.tops.includes(p.pid) ? ' 👑' : ''}</b><span>${'●'.repeat(cnt[p.pid] || 0)} ${cnt[p.pid] || 0}</span></div>`).join('')}</div>
          <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        if (G.phase === 'reveal') h += `<button class="btn big warn" data-a="next">Próxima pergunta ➡️</button>`;
        else h += `<div class="box center"><div class="big-emoji">🏆</div><p class="sub" style="margin-top:8px">Fim! Veja quem foi mais apontado.</p></div>${ranking()}<button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
        return h + (G.phase === 'reveal' ? ranking() : '');
      },
      act(a, el) { const send = ARCADE.send; if (a === 'votar') send({ t: 'vote', pid: el.dataset.pid }); else if (a === 'next') send({ t: 'next' }); else if (a === 'again') send({ t: 'again' }); },
    },
  });
})();
