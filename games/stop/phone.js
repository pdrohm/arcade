// Stop — tela do celular.
'use strict';
(() => {
  let styled = false, saveT = null, autoSent = '';
  const style = `
    .st-letter { font-size:64px; font-weight:900; line-height:1; color:#fff; background:#ef4444; border-radius:20px; width:96px; height:96px; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px #ef444466; }
    .st-cat { display:flex; flex-direction:column; gap:6px; }
    .st-cat label { font-size:16px; font-weight:800; color:#cbd5e1; }
    .st-cat input { font-size:22px; padding:14px; }
    .st-ans { display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; background:#0b0e17; border:2px solid transparent; }
    .st-ans .a { flex:1; font-size:22px; font-weight:800; }
    .st-ans .a.bad { color:#6b7280; text-decoration:line-through; }
    .st-ans .p { font-weight:900; font-size:18px; min-width:34px; text-align:right; }
    .st-flag { width:48px; height:48px; border-radius:12px; background:#2a3350; display:flex; align-items:center; justify-content:center; font-size:22px; }
    .st-flag.on { background:#ef4444; }
    .st-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .st-o { padding:12px 16px; border-radius:12px; background:#2a3350; font-weight:900; font-size:18px; min-width:52px; text-align:center; }
    .st-o.sel { background:#f59e0b; color:#111; }
    .st-lt { width:44px; height:44px; border-radius:10px; background:#2a3350; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:20px; opacity:.35; }
    .st-lt.sel { background:#22c55e; color:#111; opacity:1; }
    .st-chip { display:inline-flex; align-items:center; gap:10px; padding:12px 8px 12px 16px; border-radius:14px; background:#0b0e17; font-weight:700; font-size:18px; border:1px solid #2a3350; }
    .st-chip b { color:#fff; background:#ef4444; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; font-size:18px; }
    .st-add { display:flex; flex-direction:column; gap:10px; }
    .st-add input { width:100%; font-size:22px; padding:18px 16px; border-radius:14px; border:2px solid #2a3350; min-width:0; }
    .st-add input:focus { outline:none; border-color:#f59e0b; }
    .st-add .btn { padding:18px; font-size:20px; }
    .st-spin { font-size:120px; font-weight:900; line-height:1; color:#fff; background:#ef4444; border-radius:28px; width:180px; height:180px; display:flex; align-items:center; justify-content:center; margin:0 auto; box-shadow:0 20px 50px #ef444466; }
    .st-spin.done { animation:stpop .5s; background:#22c55e; }
    @keyframes stpop { 0% { transform:scale(.6); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }
  `;
  let spinTimer = null, spinFor = '';
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const collect = () => { const a = {}; document.querySelectorAll('[data-cat]').forEach(i => { a[i.dataset.cat] = i.value; }); return a; };
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ARCADE.send({ t: 'save', answers: collect() }), 250); };

  ARCADE.register('stop', {
    phone: {
      key(c) { const G = c.G; return G ? `${G.phase}:${G.round}:${G.review}:${G.stopBy ? 1 : 0}:${G.phase === 'setup' ? JSON.stringify(G.cfg) : ''}` : ''; },
      html(c) {
        ensureStyle();
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G) return '';
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const placar = () => `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>${c.playersHtml({ info: p => `${G.scores[p.pid] || 0} pts${G.roundScores[p.pid] !== undefined ? ` (+${G.roundScores[p.pid]})` : ''}` })}</div>`;

        if (G.phase === 'setup') {
          const cfg = G.cfg;
          const opt = (a, vals, cur, fmt) => `<div class="st-opt">${vals.map(v => `<div class="st-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          return `<div class="box center"><h2 style="font-size:26px">⚙️ Regras do Stop</h2><p class="sub mut" style="margin-top:6px">Qualquer um pode mudar. Vale para todos.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Rodadas</p>${opt('cfgRounds', [1, 2, 3, 4, 5, 6, 8, 10], cfg.rounds)}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Tempo por rodada</p>${opt('cfgTime', [30, 45, 60, 90, 120, 180], cfg.fillSec, v => v + 's')}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Categorias por rodada</p>${opt('cfgPer', [3, 4, 5, 6, 7, 8, 10], cfg.catsPerRound)}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Letras que podem sair <span class="mut">(${cfg.letters.length})</span></p><div class="st-opt">${G.allLetters.map(l => `<div class="st-lt ${cfg.letters.includes(l) ? 'sel' : ''}" data-a="cfgLetter" data-l="${l}">${l}</div>`).join('')}</div></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Categorias <span class="mut">(${cfg.cats.length}, sorteadas ${Math.min(cfg.catsPerRound, cfg.cats.length)} por rodada)</span></p>
              <div class="st-opt" style="margin-bottom:10px">${cfg.cats.map(k => `<span class="st-chip">${esc(k)}<b data-a="cfgDelCat" data-k="${esc(k)}">✕</b></span>`).join('')}</div>
              <div class="st-add"><input id="st-newcat" placeholder="Nova categoria (ex.: Youtuber)" maxlength="30" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"><button class="btn ok" data-a="cfgAddCat">➕ Adicionar categoria</button></div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:12px">↺ Restaurar as categorias padrão</button></div>
            <button class="btn big ok" data-a="begin" ${cfg.cats.length >= 2 && cfg.letters.length ? '' : 'disabled'}>▶ Começar o Stop</button>
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }
        if (G.phase === 'spin') {
          return `<div class="box center"><p class="sub mut">Rodada ${G.round} de ${G.rounds}</p><h2 style="font-size:24px;margin:6px 0 14px">🎰 Sorteando a letra…</h2><div class="st-spin" id="st-spin">?</div></div>
            <div class="box"><p class="sub mut" style="margin-bottom:8px">Categorias desta rodada</p><div class="st-opt">${G.cats.map(k => `<span class="st-chip">${esc(k)}</span>`).join('')}</div></div>
            <button class="btn ghost" data-a="next">Pular roleta</button>`;
        }
        if (G.phase === 'fill') {
          const mine = G.answers[c.you.pid] || {};
          const cheio = G.cats.every(k => (mine[k] || '').trim().length >= 2);   // uma letra só não conta
          return `<div class="box" style="display:flex;align-items:center;gap:16px"><div class="st-letter">${G.letter}</div><div><p class="sub mut">Rodada ${G.round} de ${G.rounds}</p><p class="sub" style="font-size:20px;font-weight:800">Tudo com a letra ${G.letter}</p></div></div>
            ${G.stopBy ? `<div class="box" style="border-color:#ef4444;text-align:center"><div style="font-size:30px;font-weight:900">🛑 STOP!</div><p class="sub">${nm(ply(G.stopBy))} gritou. Conferindo…</p></div>` : c.timerHtml('', G.turnMs)}
            <div class="box" style="display:flex;flex-direction:column;gap:14px">${G.cats.map(k => `<div class="st-cat"><label>${esc(k)}</label><input data-cat="${esc(k)}" maxlength="40" autocomplete="off" autocapitalize="words" value="${esc(mine[k] || '')}" placeholder="${G.letter}…"></div>`).join('')}</div>
            <button class="btn big no" data-a="stop" id="st-stop" ${cheio && !G.stopBy ? '' : 'disabled'}>🛑 STOP!</button>
            <p class="sub center mut" id="st-hint">${G.stopBy ? 'Acabou! O que estava digitado foi enviado.' : 'Preencha tudo (mínimo 2 letras) para poder gritar STOP.'}</p>
            <div class="box"><p class="sub mut" style="margin-bottom:6px">Quem está preenchendo</p><div id="st-prog" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>`;
        }
        if (G.phase === 'review') {
          const cat = G.cats[G.review];
          return `<div class="box center"><p class="sub mut">Conferindo ${G.review + 1} de ${G.cats.length} · letra ${G.letter}</p><h2 style="font-size:28px;margin-top:4px">${esc(cat)}</h2><p class="sub mut" style="margin-top:6px">Marque ❌ se a resposta não vale. Vale se a maioria concordar.</p></div>
            <div class="box" style="display:flex;flex-direction:column;gap:8px">${c.C.players.map(p => {
              const a = (G.answers[p.pid] || {})[cat] || '', pts = (G.points[cat] || {})[p.pid] || 0;
              const flags = (G.flags[cat] || {})[p.pid] || [], meu = flags.includes(c.you.pid);
              return `<div class="st-ans" style="border-color:${pts ? 'transparent' : '#ef444455'}">${nm(p)}<span class="a ${pts ? '' : 'bad'}">${a ? esc(a) : '—'}</span><span class="p" style="color:${pts === 10 ? '#22c55e' : pts === 5 ? '#f59e0b' : '#6b7280'}">${pts}</span>${p.pid !== c.you.pid && a ? `<div class="st-flag ${meu ? 'on' : ''}" data-a="flag" data-pid="${p.pid}">❌${flags.length ? `<small style="font-size:12px">${flags.length}</small>` : ''}</div>` : ''}</div>`;
            }).join('')}</div>
            <button class="btn big warn" data-a="next">${G.review + 1 < G.cats.length ? 'Próxima categoria ➡️' : 'Fechar rodada 🏁'}</button>`;
        }
        if (G.phase === 'scores') return `<div class="box center"><h2 style="font-size:26px">Rodada ${G.round} fechada</h2></div>${placar()}<button class="btn big ok" data-a="next">Próxima rodada ➡️</button>`;
        if (G.phase === 'end') {
          const lider = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0))[0];
          return `<div class="box center"><div class="big-emoji">🏆</div><h2 style="font-size:30px;margin-top:8px">${nm(lider)} venceu!</h2></div>${placar()}<button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
        }
        return '';
      },
      after(c) {
        const G = c.G; if (!G) return;
        // roleta de letras: gira rápido, desacelera e para na sorteada
        const sp = document.getElementById('st-spin');
        if (sp && G.phase === 'spin') {
          const tag = 'spin' + G.round;
          if (spinFor !== tag) {
            spinFor = tag; clearInterval(spinTimer);
            const pool = G.cfg.letters.length ? G.cfg.letters : G.allLetters;
            const off = c.S.now - Date.now();
            let done = false;
            spinTimer = setInterval(() => {
              const left = G.spinEnd - (Date.now() + off);
              if (left <= 350) { if (!done) { done = true; sp.textContent = G.letter; sp.classList.add('done'); c.chord([659, 880]); } return; }
              if (Math.random() < Math.max(0.06, left / G.spinMs)) sp.textContent = pool[Math.floor(Math.random() * pool.length)];
              if (Math.random() < .5) c.beep(400 + Math.random() * 300, .03, 'square', .03);
            }, 60);
          }
        } else if (spinTimer && G.phase !== 'spin') { clearInterval(spinTimer); spinTimer = null; spinFor = ''; }
        const nc = document.getElementById('st-newcat');
        if (nc && !nc._st) { nc._st = true; nc.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ARCADE.games.stop.phone.act('cfgAddCat', null, c); } }); }
        document.querySelectorAll('[data-cat]').forEach(i => { if (!i._st) { i._st = true; i.addEventListener('input', () => { save(); const cheio = [...document.querySelectorAll('[data-cat]')].every(x => x.value.trim().length >= 2); const b = document.getElementById('st-stop'); if (b) b.disabled = !cheio || !!G.stopBy; }); } });
        const prog = document.getElementById('st-prog');
        if (prog) prog.innerHTML = G.filled.map(f => { const p = c.C.players.find(x => x.pid === f.pid); return p ? `<span class="nm" style="${c.nmStyle(p)}">${c.esc(p.name)} ${f.n}/${G.cats.length}</span>` : ''; }).join('');
        const tag = `${G.round}:${G.phase}`;
        const r = c.remaining();
        // acabou o tempo, ou alguém gritou STOP: manda o que está digitado agora
        if (G.phase === 'fill' && ((r !== null && r <= 0.4) || G.stopBy) && autoSent !== tag) { autoSent = tag; clearTimeout(saveT); c.send({ t: 'save', answers: collect() }); document.querySelectorAll('[data-cat]').forEach(i => { i.disabled = true; }); }
      },
      act(a, el, c) {
        const send = ARCADE.send;
        const cfg = c && c.G ? c.G.cfg : null;
        if (a === 'cfgRounds') send({ t: 'config', cfg: { rounds: Number(el.dataset.v) } });
        else if (a === 'cfgTime') send({ t: 'config', cfg: { fillSec: Number(el.dataset.v) } });
        else if (a === 'cfgPer') send({ t: 'config', cfg: { catsPerRound: Number(el.dataset.v) } });
        else if (a === 'cfgLetter') { const l = el.dataset.l; const ls = cfg.letters.includes(l) ? cfg.letters.filter(x => x !== l) : [...cfg.letters, l]; send({ t: 'config', cfg: { letters: ls } }); }
        else if (a === 'cfgDelCat') send({ t: 'config', cfg: { cats: cfg.cats.filter(k => k !== el.dataset.k) } });
        else if (a === 'cfgAddCat') { const i = document.getElementById('st-newcat'); const v = i && i.value.trim(); if (v) { send({ t: 'config', cfg: { cats: [...cfg.cats, v] } }); i.value = ''; } }
        else if (a === 'cfgReset') { if (confirm('Voltar às regras padrão?')) send({ t: 'config', cfg: { reset: true } }); }
        else if (a === 'begin') send({ t: 'begin' });
        else if (a === 'stop') { clearTimeout(saveT); send({ t: 'save', answers: collect() }); setTimeout(() => send({ t: 'stop' }), 120); }
        else if (a === 'flag') send({ t: 'flag', pid: el.dataset.pid });
        else if (a === 'next') send({ t: 'next' });
        else if (a === 'again') send({ t: 'again' });
      },
    },
  });
  setInterval(() => { const c = ARCADE.ctx(); if (c && c.C && c.C.gameId === 'stop' && ARCADE.games.stop) ARCADE.games.stop.phone.after(c); }, 500);
})();
