// Stop — tela da TV.
'use strict';
(() => {
  let lastKey = '';
  // visual "fliperama de papel": tinta #0f0f14 sobre papel, cor da categoria palavras (#3db4f2) como destaque. 1rem = 1vw na TV.
  const style = `
    .st-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
    .st-stage > * + * { margin-top:1.6rem; }
    .st-lab { font-family:'JetBrains Mono',monospace; font-weight:700; letter-spacing:.12em; text-transform:uppercase; font-size:1.05rem; color:#55555e; }
    .st-letter, .st-spin { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1; color:#0f0f14; background-color:#3db4f2;
      background-image:radial-gradient(rgba(15,15,20,.18) 2px, transparent 2.1px); background-size:16px 16px; border:6px solid #0f0f14; box-shadow:14px 14px 0 #0f0f14; }
    .st-letter { font-size:12rem; padding:1.2rem 3.6rem 1.6rem; transform:rotate(-3deg); }
    .st-spin { font-size:15rem; padding:1.2rem 4.4rem 1.8rem; }
    .st-spin.done { animation:stspin .6s; background-color:#ffce1f; }
    @keyframes stspin { 0% { transform:scale(.6) rotate(-8deg); } 60% { transform:scale(1.15) rotate(3deg); } 100% { transform:scale(1) rotate(0); } }
    .st-cats { display:flex; flex-wrap:wrap; justify-content:center; margin:-.4rem; max-width:62rem; }   /* sem gap: margem nos filhos */
    .st-cats > * { margin:.4rem; }
    .st-stage > * + .st-cats { margin-top:1.2rem; }
    .st-cat { padding:.7rem 1.2rem; background:#fff; border:4px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; font-weight:900; font-stretch:115%; text-transform:uppercase; font-size:1.45rem; line-height:1.1; }
    .st-prog { padding:.5rem 1rem; border:4px solid #0f0f14; font-weight:900; font-size:1.3rem; color:#0f0f14; }
    .st-prog .pix { margin-left:.5rem; }
    .st-chip { padding:.45rem .8rem; background:#fff; border:3px solid #0f0f14; font-weight:800; font-size:1.05rem; }
    .st-chip.lt { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:1.4rem; width:3rem; padding:.3rem 0; }
    .st-chip.lt.off { background:#e4e2d9; color:#8a8a92; border-color:#b9b7ae; }
    .st-tbl { width:100%; max-width:56rem; display:flex; flex-direction:column; }
    .st-tbl > * + * { margin-top:.8rem; }
    .st-row { display:flex; align-items:center; padding:.8rem 1.2rem; background:#fff; border:4px solid #0f0f14; box-shadow:6px 6px 0 #0f0f14; font-size:1.7rem; animation:stpop .3s; }
    .st-row > * + * { margin-left:1rem; }
    .st-row .a { flex:1; text-align:left; font-weight:900; font-stretch:115%; text-transform:uppercase; }
    .st-row .a.bad { color:#8a8a92; text-decoration:line-through; }
    .st-row .p { font-family:'Pixelify Sans',monospace; font-weight:700; min-width:4.6rem; padding:.2rem .5rem; border:3px solid #0f0f14; text-align:center; font-size:1.7rem; }
    .st-row .n { font-family:'Pixelify Sans',monospace; font-weight:700; min-width:2.6rem; text-align:left; }
    .st-row .fl { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1rem; background:#f0443a; border:3px solid #0f0f14; padding:.2rem .5rem; }
    .st-row.win { background:#ffce1f; }
    @keyframes stpop { from { transform:translateY(10px); opacity:0; } }
    .st-big { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:3.4rem; line-height:1; letter-spacing:-.01em; }
    .st-big .nm { font-size:.8em; padding:.1em .3em; border-width:4px; }
    .st-ink { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.5rem 1.1rem; }
    .st-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; border-width:4px; box-shadow:8px 8px 0 #0f0f14; padding:14px 18px; }
    .st-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:46px; line-height:.95; margin-top:6px; }
    .st-head .mono { font-size:14px; }
    .st-legend { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1rem; color:#55555e; text-transform:uppercase; letter-spacing:.06em; }
    .st-legend b { display:inline-block; border:2px solid #0f0f14; color:#0f0f14; padding:0 .4rem; margin:0 .3rem 0 1rem; font-family:'Pixelify Sans',monospace; }
  `;
  let spinTimer = null, spinFor = '';
  ARCADE.register('stop', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc, nm = p => p ? `<span style="display:inline-flex;align-items:center;vertical-align:middle"><span style="margin-right:12px;display:inline-block">${c.avatar(p, 58)}</span>${c.nm(p)}</span>` : ''; if (!G) return {};
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const ink = p => `background:${c.ci(p.color).hex};color:#0f0f14`;   // cor da pessoa, texto sempre em tinta
        const pts = n => `<span class="p" style="background:${n === 10 ? '#35d07f' : n === 5 ? '#ffce1f' : '#e4e2d9'}">+${n}</span>`;
        const placar = () => `<div class="box"><p class="mono mut" style="font-size:13px;margin-bottom:10px">PLACAR</p>${c.playersHtml({ info: p => `<span class="pix" style="font-size:22px;color:#0f0f14">${G.scores[p.pid] || 0}</span>${G.roundScores[p.pid] !== undefined ? ` <span class="pix" style="font-size:16px">+${G.roundScores[p.pid]}</span>` : ''}` })}</div>`;
        const ranking = () => [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0));
        let stage = `<style>${style}</style>`, side = `<div class="box st-head"><div class="mono">PALAVRAS · ${G.phase === 'setup' ? 'REGRAS' : `RODADA <span class="pix" style="font-size:18px">${G.round}/${G.rounds}</span>`}</div><h2>Stop</h2></div>`;
        if (G.phase === 'setup') {
          const cfg = G.cfg;
          stage += `<div class="st-stage"><div class="st-lab">antes de começar</div><div class="st-big">Ajustem as regras<br>no celular</div>
            <div class="st-cats"><div class="st-cat"><span class="pix">${cfg.rounds}</span> rodada${cfg.rounds > 1 ? 's' : ''}</div><div class="st-cat"><span class="pix">${cfg.fillSec}s</span> por rodada</div><div class="st-cat"><span class="pix">${Math.min(cfg.catsPerRound, cfg.cats.length)}</span> categorias por rodada</div><div class="st-cat"><span class="pix">${cfg.letters.length}</span> letras</div></div>
            <div class="st-lab">categorias</div><div class="st-cats">${cfg.cats.map(k => `<div class="st-chip">${esc(k)}</div>`).join('')}</div>
            <div class="st-lab">letras</div><div class="st-cats">${G.allLetters.map(l => `<div class="st-chip lt ${cfg.letters.includes(l) ? '' : 'off'}">${l}</div>`).join('')}</div></div>`;
          side += `<div class="box">${c.playersHtml()}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        } else if (G.phase === 'spin') {
          stage += `<div class="st-stage"><div class="st-lab">rodada ${G.round} de ${G.rounds} · sorteando a letra</div><div class="st-spin" id="st-spin-tv">?</div>
            <div class="st-cats">${G.cats.map(k => `<div class="st-cat">${esc(k)}</div>`).join('')}</div></div>`;
          side += placar();
        } else if (G.phase === 'fill') {
          stage += `<div class="st-stage"><div class="st-lab">tudo com a letra</div><div class="st-letter">${G.letter}</div><div class="st-cats" style="margin-top:2.4rem">${G.cats.map(k => `<div class="st-cat">${esc(k)}</div>`).join('')}</div>
            <div class="st-cats">${G.filled.map(f => { const p = ply(f.pid); return p ? `<div class="st-prog" style="${ink(p)};opacity:${f.n === G.cats.length ? 1 : .55 + f.n / G.cats.length * .45}">${esc(p.name)}<span class="pix">${f.n}/${G.cats.length}</span></div>` : ''; }).join('')}</div>
            ${G.stopBy ? `<div class="st-big"><span class="st-ink">STOP!</span></div><div class="st-big" style="font-size:2.4rem">${nm(ply(G.stopBy))} gritou</div><div class="st-lab">conferindo…</div>` : ''}</div>`;
          side += (G.stopBy ? '' : c.timerHtml('', G.turnMs)) + placar();
        } else if (G.phase === 'review') {
          const cat = G.cats[G.review];
          stage += `<div class="st-stage"><div class="st-lab">letra <span class="pix" style="color:#0f0f14">${G.letter}</span> · categoria <span class="pix" style="color:#0f0f14">${G.review + 1}/${G.cats.length}</span></div><div class="st-big"><span class="st-ink">${esc(cat)}</span></div>
            <div class="st-tbl">${c.C.players.map(p => { const a = (G.answers[p.pid] || {})[cat] || '', n = (G.points[cat] || {})[p.pid] || 0, fl = ((G.flags[cat] || {})[p.pid] || []).length;
              return `<div class="st-row">${nm(p)}<span class="a ${n ? '' : 'bad'}">${a ? esc(a) : '—'}</span>${fl ? `<span class="fl">✕ ${fl}</span>` : ''}${pts(n)}</div>`; }).join('')}</div>
            <div class="st-legend"><b style="background:#35d07f">10</b>certa<b style="background:#ffce1f">5</b>repetida<b style="background:#e4e2d9">0</b>errada ou vetada pela maioria</div></div>`;
          side += placar();
        } else {
          const rk = ranking(), lider = rk[0];
          stage += `<div class="st-stage">${G.phase === 'end' ? `<div class="st-lab">fim de jogo</div><div class="st-big" style="font-size:4.4rem">${nm(lider)}</div><div class="st-big"><span class="st-ink">venceu!</span></div>` : `<div class="st-lab">rodada ${G.round} de ${G.rounds}</div><div class="st-big">Rodada fechada</div><div class="st-lab">toque em "Próxima rodada" no celular</div>`}
            <div class="st-tbl" style="max-width:46rem">${rk.map((p, i) => `<div class="st-row ${i === 0 && G.phase === 'end' ? 'win' : ''}"><span class="n">${i + 1}º</span>${nm(p)}<span class="a"></span><span class="n" style="font-size:2.2rem;text-align:right">${G.scores[p.pid] || 0}</span></div>`).join('')}</div></div>`;
          side += `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        }
        return { stage, side };
      },
      after(c) {
        const G = c.G; if (!G) return;
        const sp = document.getElementById('st-spin-tv');
        if (sp && G.phase === 'spin') {
          const tag = 'spin' + G.round;
          if (spinFor !== tag) {
            spinFor = tag; clearInterval(spinTimer);
            const pool = G.cfg.letters.length ? G.cfg.letters : G.allLetters;
            const off = c.S.now - Date.now();
            let done = false;
            spinTimer = setInterval(() => {
              const left = G.spinEnd - (Date.now() + off);
              if (left <= 350) { if (!done) { done = true; sp.textContent = G.letter; sp.classList.add('done'); c.chord([659, 880, 1046]); } return; }
              if (Math.random() < Math.max(0.06, left / G.spinMs)) { sp.textContent = pool[Math.floor(Math.random() * pool.length)]; c.beep(500 + Math.random() * 400, .03, 'square', .05); }
            }, 60);
          }
        } else if (spinTimer && G.phase !== 'spin') { clearInterval(spinTimer); spinTimer = null; spinFor = ''; }
        const k = `${G.phase}:${G.round}:${G.review}:${G.stopBy}`; if (k !== lastKey) { lastKey = k; if (G.stopBy && G.phase === 'fill') c.chord([880, 660, 440]); else if (G.phase === 'fill') c.chord([523, 784]); else c.beep(700, .1, 'triangle', .15); } },
    },
  });
})();
