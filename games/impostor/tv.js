// Impostor — tela da TV. A palavra secreta só aparece no resultado.
'use strict';
(() => {
  // Visual "fliperama de papel" (shared/ui.css): papel, tinta, bordas grossas, sombra dura. Cor da festa: #ff7ab8.
  // TV de 2016 (Chrome 47): nada de var(), gap em flex, grid nem inset. Tamanhos em rem (1rem = 1% da largura).
  const style = `
    .imp-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#0f0f14; }
    .imp-stage > * + * { margin-top:1.4rem; }
    .imp-tag { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.5rem 1rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.1rem; letter-spacing:.08em; text-transform:uppercase; line-height:1.1; }
    .imp-tag .pix { color:#ffce1f; font-size:1.4rem; }
    .imp-hint { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.15rem; letter-spacing:.06em; text-transform:uppercase; }
    .imp-hint .pix { font-size:1.6rem; }
    .imp-big { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:3.6rem; line-height:.95; letter-spacing:-.01em; max-width:92%; }
    .imp-big .nm { font-stretch:112%; padding:.1rem .8rem; border-width:.25rem; box-shadow:.35rem .35rem 0 #0f0f14; }
    .imp-mid { font-size:1.9rem; font-weight:900; font-stretch:112%; line-height:1.3; }
    .imp-logo { display:inline-block; background:#ff7ab8; border:.3rem solid #0f0f14; box-shadow:.7rem .7rem 0 #0f0f14; padding:1.4rem 2.6rem 1.2rem; background-image:radial-gradient(rgba(15,15,20,.18) 2px, transparent 2.1px); background-size:16px 16px; }
    .imp-logo .imp-big { font-size:7rem; line-height:.85; max-width:none; }
    .imp-ring { display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-start; margin-left:-.45rem; margin-right:-.45rem; margin-bottom:-.9rem; }
    .imp-ring > * { margin:0 .45rem .9rem; }
    .imp-p { width:11.5rem; padding:.9rem .7rem; background:#fff; border:.22rem solid #0f0f14; box-shadow:.35rem .35rem 0 #0f0f14; display:flex; flex-direction:column; align-items:center; animation:imppop .3s; }
    .imp-p > * + * { margin-top:.45rem; }
    .imp-p.now { background:#ffce1f; box-shadow:.55rem .55rem 0 #0f0f14; -webkit-transform:translate(-.2rem,-.2rem); transform:translate(-.2rem,-.2rem); }
    .imp-p.ok { background:#35d07f; }
    .imp-p.dead { background:#e4e2d9; box-shadow:none; opacity:.55; }
    .imp-p .who .nm { font-size:1.25rem; }
    .imp-p .cl { display:flex; flex-direction:column; min-height:2rem; justify-content:center; }
    .imp-p .cl > * + * { margin-top:.2rem; }
    .imp-p .cl b { font-size:1.7rem; font-weight:900; font-stretch:112%; line-height:1.05; word-break:break-word; }
    .imp-p .cl small { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:.85rem; letter-spacing:.06em; text-transform:uppercase; color:#55555e; }
    .imp-p.now .cl small { color:#0f0f14; }
    .imp-p .st { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:.85rem; letter-spacing:.06em; text-transform:uppercase; background:#0f0f14; color:#f1f0ea; padding:.25rem .5rem; }
    .imp-p .st.off { background:transparent; color:#55555e; border:.12rem dashed #55555e; }
    @keyframes imppop { from { transform:translateY(12px); opacity:0; } }
    .imp-clock { display:inline-block; background:#fff; border:.3rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:.6rem 2.4rem .3rem; font-family:'Pixelify Sans',monospace; font-size:8.5rem; font-weight:700; line-height:1; }
    .imp-clock.low { background:#f0443a; animation:imppulse .5s infinite alternate; }
    @keyframes imppulse { to { transform:scale(1.04); } }
    .imp-word { display:inline-block; padding:.6rem 1.8rem; background:#ffce1f; color:#0f0f14; border:.25rem solid #0f0f14; box-shadow:.45rem .45rem 0 #0f0f14; font-family:'Archivo',sans-serif; font-stretch:125%; text-transform:uppercase; font-size:3.4rem; font-weight:900; line-height:1; vertical-align:middle; animation:impword .5s; }
    @keyframes impword { 0% { transform:scale(.5) rotate(-4deg); opacity:0; } 70% { transform:scale(1.1); } 100% { transform:scale(1); } }
    .imp-dots { font-family:'Pixelify Sans',monospace; font-size:5rem; font-weight:700; letter-spacing:1rem; color:#0f0f14; }
    .imp-verdict .imp-big { max-width:none; }
    .imp-verdict { display:inline-block; max-width:64rem; border:.3rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:1rem 2rem; }
    .imp-verdict.yes { background:#35d07f; } .imp-verdict.no { background:#f0443a; }
    .imp-rank { width:100%; max-width:52rem; display:flex; flex-direction:column; }
    .imp-rank > * + * { margin-top:.6rem; }
    .imp-row { display:flex; align-items:center; padding:.55rem 1.1rem; background:#fff; border:.2rem solid #0f0f14; font-size:1.6rem; font-weight:800; }
    .imp-row > * + * { margin-left:1rem; }
    .imp-row.first { background:#ffce1f; box-shadow:.4rem .4rem 0 #0f0f14; }
    .imp-row .i { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:2rem; min-width:3rem; text-align:left; }
    .imp-row .g { flex:1; text-align:right; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.1rem; }
    .imp-row .g span { background:#35d07f; border:.12rem solid #0f0f14; padding:.15rem .45rem; }
    .imp-row .p { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:2.4rem; min-width:3.2rem; text-align:right; }
    .imp-chip { padding:.55rem 1.1rem; background:#fff; border:.2rem solid #0f0f14; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.15rem; letter-spacing:.04em; text-transform:uppercase; }
    .imp-chip.off { background:#e4e2d9; color:#55555e; border-style:dashed; }
    .imp-chips { display:flex; flex-wrap:wrap; justify-content:center; max-width:66rem; margin-left:-.3rem; margin-right:-.3rem; margin-bottom:-.6rem; }
    .imp-chips > * { margin:0 .3rem .6rem; }
    .imp-head { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:14px 16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .imp-head .k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:4px 8px; }
    .imp-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:38px; line-height:.95; margin-top:10px; }
    .imp-head .r { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; letter-spacing:.06em; margin-top:8px; text-transform:uppercase; }
    .imp-head .r .pix { font-size:22px; }
    .imp-side-t { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .pl .imp-pts { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:22px; color:#0f0f14; }
    .pl .imp-mk { display:inline-block; margin-left:6px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:10px; letter-spacing:.06em; padding:3px 5px; vertical-align:middle; background:#0f0f14; color:#f1f0ea; }
    .pl .imp-mk.imp { background:#f0443a; color:#0f0f14; border:2px solid #0f0f14; padding:1px 4px; }
  `;
  let cur = null, lastK = '', lastPhase = '', step = 0, timers = [];
  const kill = () => { timers.forEach(clearTimeout); timers = []; };

  const ply = (c, pid) => c.C.players.find(p => p.pid === pid);
  const dataKey = G => [G.phase, G.round, G.turn, G.seen.length, G.voted.length, G.endVotes.length, G.out.length, G.result ? 1 : 0, G.guess ? 1 : 0, JSON.stringify(G.clues), G.phase === 'setup' ? JSON.stringify(G.cfg) : ''].join('|');

  function card(c, pid, extra) {
    const p = ply(c, pid); if (!p) return '';
    const G = c.G, cl = G.clues[pid] || [];
    const cls = ['imp-p', G.speaker === pid ? 'now' : '', G.out.includes(pid) ? 'dead' : '', extra && extra.ok ? 'ok' : ''].join(' ');
    return `<div class="${cls}">${c.avatar(p, 56)}<span class="who">${c.nm(p)}</span>
      ${cl.length ? `<div class="cl">${cl.map(x => `<b>${c.esc(x)}</b>`).join('')}</div>` : `<div class="cl"><small>${G.speaker === pid ? 'falando agora…' : '—'}</small></div>`}
      ${extra && extra.st ? `<div class="st ${extra.off ? 'off' : ''}">${extra.st}</div>` : ''}</div>`;
  }
  const pix = n => `<span class="pix">${n}</span>`;
  const catTxt = (c, G) => G.cat ? ' · ' + c.esc(G.cat.name) : '';
  const nomes = (c, G) => (G.impostors || []).map(p => c.nm(ply(c, p))).join(' ');

  function stageHtml(c) {
    const G = c.G, esc = c.esc; if (!G) return '';
    const cat = catTxt(c, G);
    const rodada = `Rodada ${pix(G.round)} de ${pix(G.rounds)}${cat}`;
    if (G.phase === 'setup') {
      const cfg = G.cfg;
      return `<div class="imp-stage"><div class="imp-logo"><div class="imp-big">Impostor</div></div>
        <div class="imp-tag" style="margin-top:2.2rem">Ajustem as regras no celular</div>
        <div class="imp-chips"><div class="imp-chip">${pix(cfg.impostorsReal)} impostor${cfg.impostorsReal > 1 ? 'es' : ''}</div>
          <div class="imp-chip">${cfg.hint ? 'com dica' : 'sem dica'}</div>
          <div class="imp-chip">${cfg.white ? 'Mister White ligado' : 'sem Mister White'}</div>
          <div class="imp-chip">${pix(cfg.discussSec + 's')} de discussão</div>
          <div class="imp-chip">${pix(cfg.rounds)} palavras</div>
          <div class="imp-chip">${pix(cfg.laps)} volta${cfg.laps > 1 ? 's' : ''} de dicas</div></div>
        <div class="imp-hint">Categorias</div>
        <div class="imp-chips">${G.cats.map(k => `<div class="imp-chip ${cfg.cats.includes(k.id) ? '' : 'off'}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div></div>`;
    }
    if (G.phase === 'reveal') {
      return `<div class="imp-stage"><div class="imp-tag">${rodada}</div>
        <div class="imp-big">Vejam a palavra<br>no celular</div>
        <div class="imp-hint">Ninguém mostra a tela para ninguém ▸ ${pix(G.seen.length)}/${pix(c.C.players.length)}</div>
        <div class="imp-ring">${c.C.players.map(p => { const ok = G.seen.includes(p.pid); return `<div class="imp-p ${ok ? 'ok' : ''}">${c.avatar(p, 56)}<span class="who">${c.nm(p)}</span><div class="st ${ok ? '' : 'off'}">${ok ? 'já viu' : 'olhando…'}</div></div>`; }).join('')}</div></div>`;
    }
    if (G.phase === 'clues') {
      const sp = ply(c, G.speaker);
      return `<div class="imp-stage"><div class="imp-tag">${rodada} · dica ${pix(Math.floor(G.turn / Math.max(1, G.order.length)) + 1)} de ${pix(G.laps)}</div>
        <div class="imp-big">${sp ? `${c.nm(sp)} fala<br>uma palavra` : 'Dicas dadas'}</div>
        <div class="imp-ring">${G.order.map(pid => card(c, pid)).join('')}</div></div>`;
    }
    if (G.phase === 'discuss') {
      const r = c.remaining();
      return `<div class="imp-stage"><div class="imp-tag">${G.revote ? 'Empate · discussão relâmpago' : 'Discussão'}${cat}</div>
        <div class="imp-clock ${r !== null && r <= 15 ? 'low' : ''}" id="timer">${r === null ? '0:00' : c.fmt(r)}</div>
        <div class="imp-ring">${G.order.filter(p => !G.out.includes(p)).map(pid => card(c, pid)).join('')}</div>
        <div class="imp-hint">${pix(G.endVotes.length)} de ${pix(G.need)} querem votar agora</div></div>`;
    }
    if (G.phase === 'vote') {
      return `<div class="imp-stage"><div class="imp-tag">Votação${cat}</div><div class="imp-big">Quem é o impostor?</div>
        <div class="imp-ring">${G.order.map(pid => { const out = G.out.includes(pid), ok = G.voted.includes(pid); return card(c, pid, { st: out ? 'fora' : (ok ? 'votou' : 'pensando…'), ok, off: !out && !ok }); }).join('')}</div>
        <div class="imp-hint">${pix(G.voted.length)} de ${pix(G.nAlive)} votaram · o voto é secreto</div></div>`;
    }
    if (G.phase === 'result') {
      const R = G.result || {};
      const alvo = ply(c, R.out);
      if (R.aborted) return `<div class="imp-stage"><div class="imp-tag">Fim da rodada</div><div class="imp-big">Rodada encerrada</div><div class="imp-mid">A palavra era <span class="imp-word">${esc(G.word || '')}</span></div></div>`;
      if (R.tie) return `<div class="imp-stage"><div class="imp-tag">Votação fechada</div><div class="imp-verdict" style="background:#ffce1f"><div class="imp-big">Empate!</div></div>
        <div class="imp-mid">${R.over ? 'Empatou de novo: o impostor escapou.' : 'Ninguém foi eliminado. Mais 30 segundos.'}</div>
        ${R.over ? `<div class="imp-mid">A palavra era <span class="imp-word">${esc(G.word || '')}</span></div><div class="imp-mid">Impostor: ${nomes(c, G)}</div>` : ''}</div>`;
      if (step === 0) return `<div class="imp-stage"><div class="imp-tag">Votação fechada</div><div class="imp-big">O mais votado foi…</div><div class="imp-dots">...</div></div>`;
      if (step === 1) return `<div class="imp-stage"><div class="imp-tag">O mais votado foi</div><div>${c.avatar(alvo, 150)}</div><div class="imp-big" style="font-size:5.5rem">${c.nm(alvo)}</div><div class="imp-dots">...</div></div>`;
      return `<div class="imp-stage"><div>${c.avatar(alvo, 130)}</div>
        <div class="imp-verdict ${R.wasImp ? 'yes' : 'no'}"><div class="imp-big" style="font-size:3.6rem">${c.nm(alvo)} ${R.wasImp ? 'era o impostor!' : 'não era o impostor'}</div></div>
        ${G.word ? `<div class="imp-mid">A palavra era <span class="imp-word">${esc(G.word)}</span></div>` : ''}
        ${G.whiteWord ? `<div class="imp-hint">o impostor tinha "${esc(G.whiteWord)}"</div>` : ''}
        <div class="imp-mid">${R.winner === 'inocentes' ? 'Os inocentes venceram a rodada!' : R.winner === 'impostores' ? `${nomes(c, G)} venceu!` : 'A caçada continua…'}</div></div>`;
    }
    if (G.phase === 'guess') {
      return `<div class="imp-stage"><div class="imp-tag">Chance final</div><div class="imp-big">O impostor<br>vai chutar</div>
        <div class="imp-mid">${nomes(c, G)} está digitando um chute…</div>
        <div class="imp-hint">Acertar a palavra vale ${pix('+1')} ponto</div></div>`;
    }
    const ordem = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0));
    const R = G.result || {};
    return `<div class="imp-stage">
      ${G.phase === 'end' ? `<div class="imp-tag">Fim de jogo</div><div class="imp-big">${c.nm(ordem[0])} venceu!</div>`
        : `<div class="imp-tag">Palavra ${pix(G.round)} de ${pix(G.rounds)}</div><div class="imp-mid">A palavra era <span class="imp-word">${esc(G.word || '')}</span></div>
           <div class="imp-mid">${R.winner === 'inocentes' ? 'Inocentes venceram' : R.winner === 'impostores' ? 'Impostor venceu' : 'Sem vencedor'}${G.guess && G.guess.text ? ` · chute: "${esc(G.guess.text)}" ${G.guess.ok ? '(acertou)' : '(errou)'}` : ''}</div>`}
      <div class="imp-rank">${ordem.map((p, i) => `<div class="imp-row ${i === 0 ? 'first' : ''}"><span class="i">${i + 1}º</span>${c.avatar(p, 44)}${c.nm(p)}<span class="g">${(G.gain || {})[p.pid] ? `<span>+${G.gain[p.pid]}</span>` : ''}</span><span class="p">${G.scores[p.pid] || 0}</span></div>`).join('')}</div>
      <div class="imp-hint">${G.phase === 'end' ? 'Toque em "Jogar de novo" no celular' : 'Toque em "Próxima palavra" no celular'}</div></div>`;
  }

  function paint() { const el = document.getElementById('imp-st'); if (el && cur) el.innerHTML = stageHtml(cur); }

  ARCADE.register('impostor', {
    tv: {
      mount() { return `<style>${style}</style><div id="imp-st" style="width:100%"></div>`; },
      html(c) {
        const G = c.G; if (!G) return {};
        const suspense = G.phase === 'result';    // o painel não entrega o resultado antes do palco
        const side = `<div class="imp-head"><span class="k">FESTA</span><h2>Impostor</h2>
            <div class="r">${G.phase === 'setup' ? 'ajustando as regras' : `Palavra ${pix(G.round)} de ${pix(G.rounds)}`}${catTxt(c, G)}</div></div>
          <div class="box"><p class="imp-side-t">Placar</p>${c.playersHtml({
            info: p => `<span class="imp-pts">${(G.scores[p.pid] || 0) - (suspense ? (G.gain || {})[p.pid] || 0 : 0)}</span>`,
            tag: p => suspense ? '' : (G.out.includes(p.pid) ? '<span class="imp-mk">FORA</span>' : '') + ((G.impostors || []).includes(p.pid) ? '<span class="imp-mk imp">IMPOSTOR</span>' : ''),
          })}</div>
          <div class="event">${suspense ? 'revelando…' : (c.C.event ? c.hl(c.C.event.text) : '')}</div>`;
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
