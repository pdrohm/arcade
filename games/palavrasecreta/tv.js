// Palavra Secreta — tela da TV. A palavra secreta só aparece no resultado.
(() => {
  const style = `
    .ps-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; text-align:center; }
    .ps-tag { font-size:clamp(15px,1.5vw,22px); font-weight:800; letter-spacing:3px; text-transform:uppercase; color:var(--mut); }
    .ps-big { font-size:clamp(28px,4.2vw,70px); font-weight:900; line-height:1.05; }
    .ps-mid { font-size:clamp(20px,2.4vw,38px); font-weight:800; }
    .ps-ring { display:flex; flex-wrap:wrap; gap:14px; justify-content:center; align-items:flex-start; }
    .ps-p { min-width:150px; max-width:230px; padding:14px 16px; border-radius:18px; background:#182036; border:3px solid transparent; display:flex; flex-direction:column; gap:8px; align-items:center; animation:pspop .3s; }
    .ps-p.now { border-color:#facc15; box-shadow:0 0 40px #facc1555; transform:scale(1.05); }
    .ps-p.ok { border-color:#22c55e; }
    .ps-p.dead { opacity:.35; }
    .ps-p .who { font-size:clamp(16px,1.6vw,24px); }
    .ps-p .cl { display:flex; flex-direction:column; gap:4px; }
    .ps-p .cl b { font-size:clamp(17px,1.9vw,30px); font-weight:900; word-break:break-word; }
    .ps-p .cl small { font-size:14px; color:var(--mut); }
    .ps-p .st { font-size:22px; }
    @keyframes pspop { from { transform:translateY(12px); opacity:0; } }
    .ps-clock { font-size:clamp(70px,11vw,190px); font-weight:900; font-variant-numeric:tabular-nums; line-height:1; }
    .ps-clock.low { color:#ef4444; animation:pspulse .5s infinite alternate; }
    @keyframes pspulse { to { transform:scale(1.05); } }
    .ps-word { display:inline-block; padding:14px 40px; border-radius:22px; background:#0ea5e9; color:#04121f; font-size:clamp(30px,5vw,80px); font-weight:900; animation:psword .5s; }
    @keyframes psword { 0% { transform:scale(.5) rotate(-4deg); opacity:0; } 70% { transform:scale(1.1); } 100% { transform:scale(1); } }
    .ps-dots { font-size:clamp(30px,5vw,80px); font-weight:900; letter-spacing:14px; color:var(--mut); }
    .ps-rank { width:100%; max-width:860px; display:flex; flex-direction:column; gap:10px; }
    .ps-row { display:flex; align-items:center; gap:16px; padding:12px 20px; border-radius:16px; background:#182036; font-size:clamp(18px,2.1vw,30px); }
    .ps-row .g { flex:1; text-align:left; }
    .ps-row .p { font-weight:900; }
    .ps-chip { padding:10px 18px; border-radius:12px; background:#182036; border:1px solid #2a3350; font-size:clamp(15px,1.5vw,22px); font-weight:800; }
    .ps-chips { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
  `;
  let cur = null, lastK = '', lastPhase = '', step = 0, timers = [];
  const kill = () => { timers.forEach(clearTimeout); timers = []; };

  const ply = (c, pid) => c.C.players.find(p => p.pid === pid);
  const dataKey = G => [G.phase, G.round, G.turn, G.seen.length, G.voted.length, G.endVotes.length, G.out.length, G.result ? 1 : 0, G.guess ? 1 : 0, JSON.stringify(G.clues), G.phase === 'setup' ? JSON.stringify(G.cfg) : ''].join('|');

  function card(c, pid, extra) {
    const p = ply(c, pid); if (!p) return '';
    const G = c.G, cl = G.clues[pid] || [];
    const cls = ['ps-p', G.speaker === pid ? 'now' : '', G.out.includes(pid) ? 'dead' : '', extra && extra.ok ? 'ok' : ''].join(' ');
    return `<div class="${cls}"><span class="who">${c.nm(p)}</span>
      ${cl.length ? `<div class="cl">${cl.map((x, i) => `<b>${c.esc(x)}</b>${i === 0 && cl.length > 1 ? '' : ''}`).join('')}</div>` : `<div class="cl"><small>${G.speaker === pid ? 'falando agora…' : '—'}</small></div>`}
      ${extra && extra.st ? `<div class="st">${extra.st}</div>` : ''}</div>`;
  }

  function stageHtml(c) {
    const G = c.G, esc = c.esc; if (!G) return '';
    const cat = G.cat ? `${G.cat.emoji} ${esc(G.cat.name)}` : '';
    if (G.phase === 'setup') {
      const cfg = G.cfg;
      return `<div class="ps-stage"><div style="font-size:clamp(60px,9vw,140px)">🕵️‍♂️</div><div class="ps-big">Palavra Secreta</div>
        <div class="ps-tag">ajustem as regras no celular</div>
        <div class="ps-chips"><div class="ps-chip">${cfg.impostorsReal} impostor${cfg.impostorsReal > 1 ? 'es' : ''}</div>
          <div class="ps-chip">${cfg.hint ? 'com dica de categoria' : 'sem dica'}</div>
          <div class="ps-chip">${cfg.white ? 'Mister White ligado' : 'sem Mister White'}</div>
          <div class="ps-chip">${cfg.discussSec}s de discussão</div>
          <div class="ps-chip">${cfg.rounds} palavras</div>
          <div class="ps-chip">${cfg.laps} volta${cfg.laps > 1 ? 's' : ''} de dicas</div></div>
        <div class="ps-chips">${G.cats.map(k => `<div class="ps-chip" style="opacity:${cfg.cats.includes(k.id) ? 1 : .25}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div></div>`;
    }
    if (G.phase === 'reveal') {
      return `<div class="ps-stage"><div class="ps-tag">Rodada ${G.round} de ${G.rounds}${cat ? ' · ' + cat : ''}</div>
        <div class="ps-big">👀 Vejam a palavra no celular</div>
        <div class="ps-tag">ninguém mostra a tela para ninguém</div>
        <div class="ps-ring">${c.C.players.map(p => `<div class="ps-p ${G.seen.includes(p.pid) ? 'ok' : ''}"><span class="who">${c.nm(p)}</span><div class="st">${G.seen.includes(p.pid) ? '✅ já vi' : '⏳'}</div></div>`).join('')}</div></div>`;
    }
    if (G.phase === 'clues') {
      const sp = ply(c, G.speaker);
      return `<div class="ps-stage"><div class="ps-tag">Rodada ${G.round} de ${G.rounds}${cat ? ' · ' + cat : ''} · dica ${Math.floor(G.turn / Math.max(1, G.order.length)) + 1} de ${G.laps}</div>
        <div class="ps-big">${sp ? `${c.nm(sp)} fala uma palavra` : 'Dicas dadas'}</div>
        <div class="ps-ring">${G.order.map(pid => card(c, pid)).join('')}</div></div>`;
    }
    if (G.phase === 'discuss') {
      const r = c.remaining();
      return `<div class="ps-stage"><div class="ps-tag">${G.revote ? 'empate · discussão relâmpago' : 'discussão'}${cat ? ' · ' + cat : ''}</div>
        <div class="ps-clock ${r !== null && r <= 15 ? 'low' : ''}" id="timer">⏱ ${r === null ? '0:00' : c.fmt(r)}</div>
        <div class="ps-ring">${G.order.filter(p => !G.out.includes(p)).map(pid => card(c, pid)).join('')}</div>
        <div class="ps-tag">${G.endVotes.length} de ${G.need} querem votar agora</div></div>`;
    }
    if (G.phase === 'vote') {
      return `<div class="ps-stage"><div class="ps-tag">votação${cat ? ' · ' + cat : ''}</div><div class="ps-big">🗳️ Quem é o impostor?</div>
        <div class="ps-ring">${G.order.map(pid => card(c, pid, { st: G.out.includes(pid) ? '💀' : (G.voted.includes(pid) ? '✅ votou' : '🤔'), ok: G.voted.includes(pid) })).join('')}</div>
        <div class="ps-tag">${G.voted.length} de ${G.nAlive} votaram · o voto é secreto</div></div>`;
    }
    if (G.phase === 'result') {
      const R = G.result || {};
      const alvo = ply(c, R.out);
      if (R.aborted) return `<div class="ps-stage"><div style="font-size:90px">🚪</div><div class="ps-big">Rodada encerrada</div><div class="ps-mid">A palavra era <span class="ps-word">${esc(G.word || '')}</span></div></div>`;
      if (R.tie) return `<div class="ps-stage"><div style="font-size:90px">🤝</div><div class="ps-big">Empate na votação!</div>
        <div class="ps-mid">${R.over ? 'Empatou de novo: o impostor escapou.' : 'Ninguém foi eliminado. Mais 30 segundos.'}</div>
        ${R.over ? `<div class="ps-mid">A palavra era <span class="ps-word">${esc(G.word || '')}</span> · impostor: ${(G.impostors || []).map(p => c.nm(ply(c, p))).join(' ')}</div>` : ''}</div>`;
      if (step === 0) return `<div class="ps-stage"><div class="ps-tag">votação fechada</div><div class="ps-big">O mais votado foi…</div><div class="ps-dots">• • •</div></div>`;
      if (step === 1) return `<div class="ps-stage"><div class="ps-tag">o mais votado foi</div><div class="ps-big" style="font-size:clamp(40px,7vw,110px)">${c.nm(alvo)}</div><div class="ps-dots">• • •</div></div>`;
      return `<div class="ps-stage"><div class="ps-big" style="font-size:clamp(34px,5vw,80px)">${c.nm(alvo)} ${R.wasImp ? 'ERA o impostor! 🕵️‍♂️' : 'NÃO era o impostor. 😬'}</div>
        ${G.word ? `<div class="ps-mid">A palavra era <span class="ps-word">${esc(G.word)}</span></div>` : ''}
        ${G.whiteWord ? `<div class="ps-tag">o impostor tinha "${esc(G.whiteWord)}"</div>` : ''}
        <div class="ps-mid">${R.winner === 'inocentes' ? '✅ Os inocentes venceram a rodada!' : R.winner === 'impostores' ? `😈 ${(G.impostors || []).map(p => c.nm(ply(c, p))).join(' ')} venceu!` : 'A caçada continua…'}</div></div>`;
    }
    if (G.phase === 'guess') {
      return `<div class="ps-stage"><div style="font-size:90px">🎯</div><div class="ps-big">Chance final do impostor</div>
        <div class="ps-mid">${(G.impostors || []).map(p => c.nm(ply(c, p))).join(' ')} está digitando um chute…</div>
        <div class="ps-tag">acertar a palavra vale +1 ponto</div></div>`;
    }
    const ordem = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0));
    const R = G.result || {};
    return `<div class="ps-stage">
      ${G.phase === 'end' ? `<div style="font-size:100px">🏆</div><div class="ps-big">${c.nm(ordem[0])} venceu!</div>`
        : `<div class="ps-big">Palavra: <span class="ps-word">${esc(G.word || '')}</span></div>
           <div class="ps-mid">${R.winner === 'inocentes' ? '✅ Inocentes venceram' : R.winner === 'impostores' ? '😈 Impostor venceu' : 'Sem vencedor'}${G.guess && G.guess.text ? ` · chute: "${esc(G.guess.text)}" ${G.guess.ok ? '✅' : '❌'}` : ''}</div>`}
      <div class="ps-rank">${ordem.map((p, i) => `<div class="ps-row"><span style="min-width:44px">${i + 1}º</span>${c.nm(p)}<span class="g">${(G.gain || {})[p.pid] ? `+${G.gain[p.pid]}` : ''}</span><span class="p">${G.scores[p.pid] || 0}</span></div>`).join('')}</div>
      <div class="ps-tag">${G.phase === 'end' ? 'toque em "Jogar de novo" no celular' : 'toque em "Próxima palavra" no celular'}</div></div>`;
  }

  function paint() { const el = document.getElementById('ps-st'); if (el && cur) el.innerHTML = stageHtml(cur); }

  ARCADE.register('palavrasecreta', {
    tv: {
      mount() { return `<style>${style}</style><div id="ps-st" style="width:100%"></div>`; },
      html(c) {
        const G = c.G; if (!G) return {};
        const suspense = G.phase === 'result';    // o painel não entrega o resultado antes do palco
        const side = `<div class="box center"><div style="font-size:28px;font-weight:900">🕵️‍♂️ Palavra Secreta</div>
            <p class="sub mut">${G.phase === 'setup' ? 'ajustando as regras' : `Palavra ${G.round} de ${G.rounds}`}${G.cat ? ` · ${G.cat.emoji} ${c.esc(G.cat.name)}` : ''}</p></div>
          ${G.phase === 'discuss' ? '' : ''}
          <div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>${c.playersHtml({
            info: p => `${(G.scores[p.pid] || 0) - (suspense ? (G.gain || {})[p.pid] || 0 : 0)} pts`,
            tag: p => suspense ? '' : (G.out.includes(p.pid) ? ' 💀' : '') + ((G.impostors || []).includes(p.pid) ? ' 🕵️' : ''),
          })}</div>
          <div class="event">${suspense ? '🥁 revelando…' : (c.C.event ? c.hl(c.C.event.text) : '')}</div>`;
        return { side };
      },
      after(c) {
        const G = c.G; if (!G) return;
        cur = c;
        const k = dataKey(G);
        if (k === lastK) return;
        lastK = k;
        const fase = `${G.phase}:${G.round}:${G.out.length}:${G.revote}`;
        if (fase !== lastPhase) {
          lastPhase = fase; kill(); step = 0;
          if (G.phase === 'result' && G.result && !G.result.tie && !G.result.aborted) {
            paint();
            timers.push(setTimeout(() => { step = 1; paint(); c.chord([392, 523]); }, 1700));
            timers.push(setTimeout(() => { step = 2; paint(); c.chord(G.result.wasImp ? [523, 659, 784, 1046] : [440, 349, 262]); }, 3600));
            return;
          }
          if (G.phase === 'clues') c.beep(660, .08, 'triangle', .12);
          else if (G.phase === 'discuss') c.chord([523, 659]);
          else if (G.phase === 'vote') c.chord([659, 523]);
          else if (G.phase === 'end') c.chord([523, 659, 784, 1046]);
          else if (G.phase === 'result') c.chord([392, 330]);
          step = 2;
        }
        paint();
      },
    },
  });
})();
