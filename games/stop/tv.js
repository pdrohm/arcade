// Stop — tela da TV.
'use strict';
(() => {
  let lastKey = '';
  const style = `
    .st-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; text-align:center; }
    .st-letter { font-size:clamp(90px,16vw,220px); font-weight:900; line-height:1; color:#fff; background:#ef4444; border-radius:28px; padding:10px 40px; box-shadow:0 20px 60px #ef444466; }
    .st-cats { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; }
    .st-cat { padding:12px 22px; border-radius:14px; background:#182036; border:1px solid #2a3350; font-size:clamp(16px,1.8vw,26px); font-weight:800; }
    .st-tbl { width:100%; max-width:900px; display:flex; flex-direction:column; gap:10px; }
    .st-row { display:flex; align-items:center; gap:16px; padding:14px 20px; border-radius:16px; background:#182036; font-size:clamp(18px,2.2vw,32px); animation:stpop .3s; }
    .st-row .a { flex:1; text-align:left; font-weight:900; } .st-row .a.bad { color:#6b7280; text-decoration:line-through; }
    .st-row .p { font-weight:900; min-width:60px; }
    @keyframes stpop { from { transform:translateY(10px); opacity:0; } }
    .st-big { font-size:clamp(28px,4vw,64px); font-weight:900; }
    .st-spin { font-size:clamp(120px,22vw,300px); font-weight:900; line-height:1; color:#fff; background:#ef4444; border-radius:36px; padding:10px 60px; box-shadow:0 30px 80px #ef444466; }
    .st-spin.done { animation:stspin .6s; background:#22c55e; }
    @keyframes stspin { 0% { transform:scale(.6) rotate(-8deg); } 60% { transform:scale(1.15) rotate(3deg); } 100% { transform:scale(1) rotate(0); } }
    .st-chip { padding:10px 18px; border-radius:12px; background:#182036; border:1px solid #2a3350; font-size:clamp(15px,1.5vw,22px); font-weight:800; }
  `;
  let spinTimer = null, spinFor = '';
  ARCADE.register('stop', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm; if (!G) return {};
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const placar = () => `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>${c.playersHtml({ info: p => `${G.scores[p.pid] || 0} pts${G.roundScores[p.pid] !== undefined ? ` (+${G.roundScores[p.pid]})` : ''}` })}</div>`;
        let stage = `<style>${style}</style>`, side = `<div class="box center"><div style="font-size:30px;font-weight:900">🛑 Stop</div><p class="sub mut">Rodada ${G.round} de ${G.rounds}</p></div>`;
        if (G.phase === 'setup') {
          const cfg = G.cfg;
          stage += `<div class="st-stage"><div class="st-big">⚙️ Ajustem as regras no celular</div>
            <div class="st-cats"><div class="st-cat">${cfg.rounds} rodada${cfg.rounds > 1 ? 's' : ''}</div><div class="st-cat">${cfg.fillSec}s por rodada</div><div class="st-cat">${Math.min(cfg.catsPerRound, cfg.cats.length)} categorias por rodada</div><div class="st-cat">${cfg.letters.length} letras</div></div>
            <div class="sub mut" style="font-size:18px;letter-spacing:2px;text-transform:uppercase">Categorias</div><div class="st-cats">${cfg.cats.map(k => `<div class="st-chip">${esc(k)}</div>`).join('')}</div>
            <div class="sub mut" style="font-size:18px;letter-spacing:2px;text-transform:uppercase">Letras</div><div class="st-cats">${G.allLetters.map(l => `<div class="st-chip" style="opacity:${cfg.letters.includes(l) ? 1 : .25}">${l}</div>`).join('')}</div></div>`;
          side += `<div class="box">${c.playersHtml()}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        } else if (G.phase === 'spin') {
          stage += `<div class="st-stage"><div class="sub mut" style="font-size:22px;letter-spacing:3px;text-transform:uppercase">Rodada ${G.round} de ${G.rounds} · sorteando a letra</div><div class="st-spin" id="st-spin-tv">?</div>
            <div class="st-cats">${G.cats.map(k => `<div class="st-cat">${esc(k)}</div>`).join('')}</div></div>`;
          side += placar();
        } else if (G.phase === 'fill') {
          stage += `<div class="st-stage"><div class="st-letter">${G.letter}</div><div class="st-cats">${G.cats.map(k => `<div class="st-cat">${esc(k)}</div>`).join('')}</div>
            <div class="st-cats">${G.filled.map(f => { const p = ply(f.pid); return p ? `<div class="st-cat" style="${c.nmStyle(p)};opacity:${f.n === G.cats.length ? 1 : .5 + f.n / G.cats.length / 2}">${esc(p.name)} ${f.n}/${G.cats.length}</div>` : ''; }).join('')}</div>
            ${G.stopBy ? `<div class="st-big">🛑 ${nm(ply(G.stopBy))} gritou STOP!</div><div class="sub mut">conferindo…</div>` : ''}</div>`;
          side += (G.stopBy ? '' : c.timerHtml('', G.turnMs)) + placar();
        } else if (G.phase === 'review') {
          const cat = G.cats[G.review];
          stage += `<div class="st-stage"><div class="sub mut" style="font-size:20px;letter-spacing:2px;text-transform:uppercase">Letra ${G.letter} · ${G.review + 1} de ${G.cats.length}</div><div class="st-big">${esc(cat)}</div>
            <div class="st-tbl">${c.C.players.map(p => { const a = (G.answers[p.pid] || {})[cat] || '', pts = (G.points[cat] || {})[p.pid] || 0, fl = ((G.flags[cat] || {})[p.pid] || []).length;
              return `<div class="st-row">${nm(p)}<span class="a ${pts ? '' : 'bad'}">${a ? esc(a) : '—'}</span>${fl ? `<span class="sub">❌ ${fl}</span>` : ''}<span class="p" style="color:${pts === 10 ? '#22c55e' : pts === 5 ? '#f59e0b' : '#6b7280'}">+${pts}</span></div>`; }).join('')}</div>
            <div class="sub mut">10 = certa · 5 = repetida · 0 = errada ou vetada pela maioria</div></div>`;
          side += placar();
        } else {
          const lider = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0))[0];
          stage += `<div class="st-stage">${G.phase === 'end' ? `<div style="font-size:110px">🏆</div><div class="st-big">${nm(lider)} venceu!</div>` : `<div class="st-big">Rodada ${G.round} fechada</div><div class="sub mut">toque em "Próxima rodada" no celular</div>`}
            <div class="st-tbl">${[...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0)).map((p, i) => `<div class="st-row"><span style="min-width:40px">${i + 1}º</span>${nm(p)}<span class="a"></span><span class="p">${G.scores[p.pid] || 0}</span></div>`).join('')}</div></div>`;
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
