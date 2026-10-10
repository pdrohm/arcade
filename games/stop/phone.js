// Stop — tela do celular.
'use strict';
(() => {
  let styled = false, saveT = null, autoSent = '';
  // visual "fliperama de papel": tinta sobre papel, destaque na cor de palavras (#3db4f2)
  const style = `
    .st-lab { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .st-lab b { color:#0f0f14; }
    .st-h { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; letter-spacing:-.01em; }
    .st-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .st-letter { font-family:'Archivo',sans-serif; font-size:60px; font-weight:900; font-stretch:125%; line-height:1; color:#0f0f14; background:#3db4f2; border:3px solid #0f0f14; box-shadow:4px 4px 0 #0f0f14; width:92px; height:92px; flex:none; display:flex; align-items:center; justify-content:center; }
    .st-cat { display:flex; flex-direction:column; gap:6px; }
    .st-cat label { font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#0f0f14; }
    .st-cat input { font-size:22px; padding:14px; }
    .st-cat input:disabled { background:#e4e2d9; color:#55555e; }
    .st-ans { display:flex; align-items:center; gap:10px; padding:10px; background:#fff; border:3px solid #0f0f14; }
    .st-ans.bad { background:#e4e2d9; }
    .st-ans .a { flex:1; min-width:0; font-size:20px; font-weight:900; text-transform:uppercase; overflow-wrap:anywhere; }
    .st-ans .a.bad { color:#8a8a92; text-decoration:line-through; }
    .st-ans .p { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; min-width:40px; text-align:center; border:2px solid #0f0f14; padding:2px 4px; }
    .st-flag { position:relative; width:48px; height:48px; flex:none; border:3px solid #0f0f14; background:#fff; box-shadow:3px 3px 0 #0f0f14; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:900; color:#0f0f14; cursor:pointer; }
    .st-flag:active { transform:translate(3px,3px); box-shadow:none; }
    .st-flag.on { background:#f0443a; }
    .st-flag small { position:absolute; right:-8px; top:-8px; background:#0f0f14; color:#ffce1f; font-family:'Pixelify Sans',monospace; font-size:13px; padding:1px 5px; }
    .st-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .st-o { padding:10px 14px; background:#fff; border:3px solid #0f0f14; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; min-width:54px; text-align:center; cursor:pointer; }
    .st-o.sel { background:#3db4f2; box-shadow:3px 3px 0 #0f0f14; }
    .st-lt { width:44px; height:44px; background:#e4e2d9; border:2px solid #b9b7ae; color:#8a8a92; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:21px; cursor:pointer; }
    .st-lt.sel { background:#3db4f2; color:#0f0f14; border:3px solid #0f0f14; }
    .st-chip { display:inline-flex; align-items:center; gap:10px; padding:6px 6px 6px 12px; background:#fff; border:3px solid #0f0f14; font-weight:800; font-size:17px; }
    .st-chip b { color:#0f0f14; background:#f0443a; border:2px solid #0f0f14; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; }
    .st-add { display:flex; flex-direction:column; gap:10px; }
    .st-add input { width:100%; font-size:20px; padding:16px 14px; min-width:0; }
    .st-add .btn { padding:16px; font-size:19px; }
    .st-spin { font-family:'Archivo',sans-serif; font-size:118px; font-weight:900; font-stretch:125%; line-height:1; color:#0f0f14; background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.18) 1.4px, transparent 1.5px); background-size:10px 10px; border:4px solid #0f0f14; box-shadow:7px 7px 0 #0f0f14; width:180px; height:180px; display:flex; align-items:center; justify-content:center; margin:0 auto; }
    .st-spin.done { animation:stpop .5s; background-color:#ffce1f; }
    .st-prog { display:inline-block; padding:3px 8px; border:2px solid #0f0f14; font-weight:900; font-size:15px; color:#0f0f14; }
    .st-prog .pix { margin-left:6px; }
    .st-stopped { background:#f0443a; text-align:center; }
    @keyframes stpop { 0% { transform:scale(.6); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }
  `;
  let spinTimer = null, spinFor = '';
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const collect = () => { const a = {}; Array.prototype.slice.call(document.querySelectorAll('[data-cat]')).forEach(i => { a[i.dataset.cat] = i.value; }); return a; };
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ARCADE.send({ t: 'save', answers: collect() }), 250); };

  ARCADE.register('stop', {
    phone: {
      key(c) { const G = c.G; return G ? `${G.phase}:${G.round}:${G.review}:${G.stopBy ? 1 : 0}:${G.phase === 'setup' ? JSON.stringify(G.cfg) : ''}` : ''; },
      html(c) {
        ensureStyle();
        const G = c.G, esc = c.esc, nm = p => p ? `<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle">${c.avatar(p, 26)}${c.nm(p)}</span>` : '';
        if (!G) return '';
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const placar = () => `<div class="box"><p class="st-lab">Placar</p>${c.playersHtml({ info: p => `<span class="pix" style="font-size:20px;color:#0f0f14">${G.scores[p.pid] || 0}</span>${G.roundScores[p.pid] !== undefined ? ` <span class="pix">+${G.roundScores[p.pid]}</span>` : ''}` })}</div>`;
        const head = (lab, t) => `<div class="box st-head"><p class="mono" style="font-size:12px">${lab}</p><h2 class="st-h" style="font-size:30px;margin-top:6px">${t}</h2></div>`;

        if (G.phase === 'setup') {
          const cfg = G.cfg;
          const opt = (a, vals, cur, fmt) => `<div class="st-opt">${vals.map(v => `<div class="st-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          return `${head('PALAVRAS · REGRAS', 'Regras do Stop')}<p class="sub" style="font-size:15px;margin-top:-4px">Qualquer um pode mudar. Vale para todos.</p>
            <div class="box"><p class="st-lab">Rodadas</p>${opt('cfgRounds', [1, 2, 3, 4, 5, 6, 8, 10], cfg.rounds)}</div>
            <div class="box"><p class="st-lab">Tempo por rodada</p>${opt('cfgTime', [30, 45, 60, 90, 120, 180], cfg.fillSec, v => v + 's')}</div>
            <div class="box"><p class="st-lab">Categorias por rodada</p>${opt('cfgPer', [3, 4, 5, 6, 7, 8, 10], cfg.catsPerRound)}</div>
            <div class="box"><p class="st-lab">Letras que podem sair · <b>${cfg.letters.length}</b></p><div class="st-opt">${G.allLetters.map(l => `<div class="st-lt ${cfg.letters.includes(l) ? 'sel' : ''}" data-a="cfgLetter" data-l="${l}">${l}</div>`).join('')}</div></div>
            <div class="box"><p class="st-lab">Categorias · <b>${cfg.cats.length}</b> · sorteadas <b>${Math.min(cfg.catsPerRound, cfg.cats.length)}</b> por rodada</p>
              <div class="st-opt" style="margin-bottom:14px">${cfg.cats.map(k => `<span class="st-chip">${esc(k)}<b data-a="cfgDelCat" data-k="${esc(k)}">✕</b></span>`).join('')}</div>
              <div class="st-add"><input id="st-newcat" placeholder="Nova categoria (ex.: Youtuber)" maxlength="30" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"><button class="btn blue" data-a="cfgAddCat">+ Adicionar categoria</button></div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:8px">↺ Restaurar as categorias padrão</button></div>
            <button class="btn big warn" data-a="begin" ${cfg.cats.length >= 2 && cfg.letters.length ? '' : 'disabled'}>▶ Começar o Stop</button>
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }
        if (G.phase === 'spin') {
          return `<div class="box center"><p class="st-lab">Rodada <b class="pix">${G.round}/${G.rounds}</b> · sorteando a letra</p><div class="st-spin" id="st-spin" style="margin-top:14px;margin-bottom:8px">?</div></div>
            <div class="box"><p class="st-lab">Categorias desta rodada</p><div class="st-opt">${G.cats.map(k => `<span class="st-chip" style="padding:8px 12px">${esc(k)}</span>`).join('')}</div></div>
            <button class="btn ghost" data-a="next">Pular roleta</button>`;
        }
        if (G.phase === 'fill') {
          const mine = G.answers[c.you.pid] || {};
          const cheio = G.cats.every(k => (mine[k] || '').trim().length >= 2);   // uma letra só não conta
          return `<div class="box" style="display:flex;align-items:center;gap:16px"><div class="st-letter">${G.letter}</div><div><p class="st-lab" style="margin-bottom:6px">Rodada <b class="pix">${G.round}/${G.rounds}</b></p><p class="st-h" style="font-size:21px">Tudo com a letra ${G.letter}</p></div></div>
            ${G.stopBy ? `<div class="box st-stopped"><div class="st-h" style="font-size:44px">STOP!</div><p class="sub" style="margin-top:8px;color:#0f0f14;font-weight:700">${nm(ply(G.stopBy))} gritou. Conferindo…</p></div>` : c.timerHtml('', G.turnMs)}
            <div class="box" style="display:flex;flex-direction:column;gap:14px">${G.cats.map(k => `<div class="st-cat"><label>${esc(k)}</label><input data-cat="${esc(k)}" maxlength="40" autocomplete="off" autocapitalize="words" value="${esc(mine[k] || '')}" placeholder="${G.letter}…"></div>`).join('')}</div>
            <button class="btn big no" data-a="stop" id="st-stop" ${cheio && !G.stopBy ? '' : 'disabled'}>STOP!</button>
            <p class="sub center mut" id="st-hint" style="font-size:15px">${G.stopBy ? 'Acabou! O que estava digitado foi enviado.' : 'Preencha tudo (mínimo 2 letras) para poder gritar STOP.'}</p>
            <div class="box"><p class="st-lab">Quem está preenchendo</p><div id="st-prog" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>`;
        }
        if (G.phase === 'review') {
          const cat = G.cats[G.review];
          return `${head(`CONFERINDO <span class="pix" style="font-size:15px">${G.review + 1}/${G.cats.length}</span> · LETRA <span class="pix" style="font-size:15px">${G.letter}</span>`, esc(cat))}
            <p class="sub" style="font-size:15px;margin-top:-4px">Toque no ✕ se a resposta não vale. Vale se a maioria concordar.</p>
            <div style="display:flex;flex-direction:column;gap:8px">${c.C.players.map(p => {
              const a = (G.answers[p.pid] || {})[cat] || '', pts = (G.points[cat] || {})[p.pid] || 0;
              const flags = (G.flags[cat] || {})[p.pid] || [], meu = flags.includes(c.you.pid);
              return `<div class="st-ans ${pts ? '' : 'bad'}">${c.avatar(p, 30)}<span class="a ${pts ? '' : 'bad'}">${a ? esc(a) : '—'}<small style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;color:#55555e;text-decoration:none;text-transform:uppercase;font-weight:700">${esc(p.name)}</small></span><span class="p" style="background:${pts === 10 ? '#35d07f' : pts === 5 ? '#ffce1f' : '#fff'}">${pts}</span>${p.pid !== c.you.pid && a ? `<div class="st-flag ${meu ? 'on' : ''}" data-a="flag" data-pid="${p.pid}">✕${flags.length ? `<small>${flags.length}</small>` : ''}</div>` : ''}</div>`;
            }).join('')}</div>
            <button class="btn big warn" data-a="next">${G.review + 1 < G.cats.length ? 'Próxima categoria ▸' : 'Fechar rodada ▸'}</button>`;
        }
        if (G.phase === 'scores') return `${head(`RODADA <span class="pix" style="font-size:15px">${G.round}/${G.rounds}</span>`, 'Rodada fechada')}${placar()}<button class="btn big warn" data-a="next">Próxima rodada ▸</button>`;
        if (G.phase === 'end') {
          const lider = [...c.C.players].sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0))[0];
          return `<div class="box st-head center"><p class="mono" style="font-size:12px">FIM DE JOGO</p><div style="margin-top:12px">${lider ? c.avatar(lider, 84) : ''}</div><h2 class="st-h" style="font-size:30px;margin-top:10px">${lider ? esc(lider.name) : ''} venceu!</h2></div>${placar()}<button class="btn big warn" data-a="again">↻ Jogar de novo</button>`;
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
        Array.prototype.slice.call(document.querySelectorAll('[data-cat]')).forEach(i => { if (!i._st) { i._st = true; i.addEventListener('input', () => { save(); const cheio = [...document.querySelectorAll('[data-cat]')].every(x => x.value.trim().length >= 2); const b = document.getElementById('st-stop'); if (b) b.disabled = !cheio || !!G.stopBy; }); } });
        const prog = document.getElementById('st-prog');
        if (prog) prog.innerHTML = G.filled.map(f => { const p = c.C.players.find(x => x.pid === f.pid); return p ? `<span class="st-prog" style="background:${c.ci(p.color).hex}">${c.esc(p.name)}<span class="pix">${f.n}/${G.cats.length}</span></span>` : ''; }).join('');
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
