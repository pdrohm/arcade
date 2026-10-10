// Palavra Secreta — tela da TV. Placar público, cronômetro gigante. A TV nunca recebe a palavra, só a categoria.
'use strict';
(() => {
  let lastTick = -1, lastTurnTag = '', lastPhase = '';
  // visual "fliperama de papel": tinta sobre papel, destaque na cor de palavras (#3db4f2). 1rem = 1vw na TV.
  const style = `
    .ps-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:0 2vw; }
    .ps-stage > * + * { margin-top:1.6rem; }
    .ps-disp { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; letter-spacing:-.01em; line-height:.95; }
    .ps-logo { font-size:6.4rem; }
    .ps-logo span { display:inline-block; margin-top:.8rem; padding:.4rem 1.4rem .6rem; color:#0f0f14; background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.18) 2px, transparent 2.1px); background-size:16px 16px; border:6px solid #0f0f14; box-shadow:12px 12px 0 #0f0f14; }
    .ps-tname { display:inline-block; font-size:4.6rem; padding:.4rem 1.4rem .6rem; border:5px solid #0f0f14; box-shadow:10px 10px 0 #0f0f14; color:#0f0f14; }
    .ps-roles { display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-start; }
    .ps-roles > div { background:#fff; border:4px solid #0f0f14; box-shadow:6px 6px 0 #0f0f14; padding:.9rem 1.4rem 1rem; font-size:1.7rem; font-weight:900; }
    .ps-roles > * + * { margin-left:2rem; }
    .ps-roles .nm { font-size:1.9rem; padding:.1rem .7rem; border-width:3px; vertical-align:middle; }
    .ps-roles small { display:block; font-family:'JetBrains Mono',monospace; font-size:.95rem; font-weight:700; color:#55555e; letter-spacing:.12em; text-transform:uppercase; margin-bottom:.6rem; }
    .ps-clock { font-family:'Pixelify Sans',monospace; font-size:15rem; font-weight:700; line-height:.85; font-variant-numeric:tabular-nums; color:#0f0f14; }
    .ps-clock.low { color:#d02a20; animation:pspulse .5s infinite alternate; }
    @keyframes pspulse { to { transform:scale(1.07); } }
    .ps-hits { font-family:'JetBrains Mono',monospace; font-size:1.5rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:#0f0f14; color:#f1f0ea; padding:.5rem 1.1rem; }
    .ps-hits b { font-family:'Pixelify Sans',monospace; color:#ffce1f; font-size:1.3em; }
    .ps-big { font-family:'Pixelify Sans',monospace; font-size:12rem; font-weight:700; line-height:.9; }
    .ps-sub { font-family:'JetBrains Mono',monospace; font-size:1.2rem; color:#55555e; font-weight:700; letter-spacing:.06em; text-transform:uppercase; max-width:60rem; line-height:1.5; }
    .ps-list { display:flex; flex-wrap:wrap; justify-content:center; max-width:80%; margin-bottom:-.6rem; }
    .ps-chip { padding:.4rem .9rem; font-weight:900; font-size:1.25rem; text-transform:uppercase; background:#35d07f; border:3px solid #0f0f14; margin:0 .3rem .6rem; }
    .ps-chip.no { background:#e4e2d9; color:#8a8a92; border-color:#8a8a92; text-decoration:line-through; }
    .ps-sc { display:flex; align-items:center; padding:8px 12px; background:#fff; border:3px solid #0f0f14; font-size:20px; font-weight:900; }
    .ps-sc.now { background:#ffce1f; box-shadow:5px 5px 0 #0f0f14; }
    .ps-sc > * + * { margin-left:12px; }
    .ps-sc .pts { font-family:'Pixelify Sans',monospace; font-size:28px; }
    .ps-sc .tm { padding:2px 10px; border:3px solid #0f0f14; text-transform:uppercase; font-stretch:115%; }
    .ps-teams > * + * { margin-top:10px; }
    .ps-mates { display:flex; flex-wrap:wrap; padding:0 0 4px 14px; margin-bottom:-6px; }
    .ps-mates > * { margin:0 6px 6px 0; }
    .ps-mate { display:inline-flex; align-items:center; background:#fff; border:2px solid #0f0f14; padding:2px 8px 2px 4px; font-size:14px; font-weight:800; }
    .ps-mate .avatar { margin-right:4px; }
    .ps-role { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; background:#0f0f14; color:#ffce1f; padding:1px 5px; margin-left:6px; }
    .ps-sc b { flex:1; }
    .ps-sc small { display:block; font-family:'JetBrains Mono',monospace; font-size:12px; color:#55555e; font-weight:700; text-transform:uppercase; }
    .ps-cat { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:2.6rem; line-height:1; padding:.6rem 1.6rem .7rem; color:#0f0f14;
      background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.18) 2px, transparent 2.1px); background-size:16px 16px; border:5px solid #0f0f14; box-shadow:8px 8px 0 #0f0f14; }
    .ps-cat small { display:block; font-family:'JetBrains Mono',monospace; font-size:.9rem; letter-spacing:.14em; margin-bottom:.4rem; }
    .ps-bar { height:1.4rem; background:#e4e2d9; border:4px solid #0f0f14; overflow:hidden; width:60%; }
    .ps-bar i { display:block; height:100%; background:#35d07f; transition:width .3s linear; }
    .ps-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; border-width:4px; box-shadow:8px 8px 0 #0f0f14; padding:14px 18px; text-align:left; }
    .ps-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:40px; line-height:.95; margin-top:6px; }
    .ps-head .mono { font-size:14px; }
  `;
  const tname = i => 'Time ' + (i + 1);

  function tick(c) {
    const el = document.getElementById('ps-clock'); if (!el) return;
    const G = c.G, r = c.remaining();
    if (r === null) { el.textContent = '–'; el.classList.remove('low'); return; }
    const n = Math.ceil(r);
    el.textContent = n;
    el.classList.toggle('low', r <= 10.05 && G.phase === 'play');
    const bar = document.getElementById('ps-bar');
    if (bar) bar.style.width = Math.min(100, r / (G.turnMs / 1000) * 100) + '%';
    if (G.phase === 'play' && r > 0 && r <= 5.05 && n !== lastTick) { lastTick = n; c.beep(1046, .07, 'square', .16); }
  }

  ARCADE.register('palavrasecreta', {
    tv: {
      mount() { return `<style>${style}</style><div class="ps-stage" id="ps-stage"></div>`; },

      html(c) {
        const G = c.G, esc = c.esc;
        if (!G || !G.teams) return { side: '' };
        const col = i => G.colors[i % G.colors.length];
        const ply = pid => c.C.players.find(p => p.pid === pid) || null;
        const todos = G.mode === 'todos';
        let side = `<div class="box ps-head"><div class="mono">PALAVRAS · ${G.phase === 'setup' ? 'REGRAS' : todos ? `VEZ <span class="pix" style="font-size:18px">${Math.min(G.turnNo, G.turnTotal)}/${G.turnTotal}</span>` : `RODADA <span class="pix" style="font-size:18px">${Math.min(G.round, G.cfg.rounds)}/${G.cfg.rounds}</span>`}</div>
          <h2>Palavra Secreta</h2></div>`;
        if (todos) {
          side += `<div class="box"><p class="mono mut" style="font-size:13px;margin-bottom:10px">${G.phase === 'setup' ? 'MODO: TODOS COM TODOS' : 'PLACAR'}</p>
            <div class="ps-teams">${(G.ranking || []).map((r, i) => { const p = ply(r.pid); if (!p) return '';
              const vez = G.phase === 'ready' || G.phase === 'play';
              const papel = vez && r.pid === G.clue ? '<span class="ps-role">DICA</span>' : vez && r.pid === G.guess ? '<span class="ps-role">ADIVINHA</span>' : '';
              return `<div class="ps-sc ${papel ? 'now' : ''}"><span class="pix" style="font-size:20px">${i + 1}º</span>${c.avatar(p, 30)}<b>${esc(p.name)}${papel}${p.on === false ? ' 📵' : ''}<small>dica ${r.give} · adivinhou ${r.guess}</small></b><span class="pts">${r.score}</span></div>`;
            }).join('')}</div></div>`;
          side += `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { side };
        }
        side += `<div class="box"><p class="mono mut" style="font-size:13px;margin-bottom:10px">PLACAR</p>
          <div class="ps-teams" style="display:flex;flex-direction:column">${G.teams.map((t, i) => `
            <div class="ps-sc ${i === G.turn && G.phase !== 'setup' && G.phase !== 'end' ? 'now' : ''}">
              <b><span class="tm" style="background:${col(i)}">${tname(i)}</span></b><span class="pts">${t.score}</span></div>
            <div class="ps-mates">${t.players.map(pid => {
              const p = ply(pid); if (!p) return '';
              const vez = G.phase !== 'setup' && G.phase !== 'end';
              const papel = pid === G.clue && vez ? '<span class="ps-role">DICA</span>' : pid === G.guess && vez ? '<span class="ps-role">ADIVINHA</span>' : '';
              return `<span class="ps-mate">${c.avatar(p, 24)}${esc(p.name)}${papel}${p.on === false ? ' 📵' : ''}</span>`;
            }).join('')}</div>`).join('')}</div></div>`;
        side += `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        return { side };
      },

      after(c) {
        const G = c.G, esc = c.esc;
        const st = document.getElementById('ps-stage');
        if (!st || !G || !G.teams) return;
        const col = i => G.colors[i % G.colors.length];
        const ply = pid => c.C.players.find(p => p.pid === pid) || null;
        const nome = pid => { const p = ply(pid); return p ? esc(p.name) : '—'; };
        const nmc = pid => { const p = ply(pid); return p ? `${c.avatar(p, 64)} <span class="nm" style="background:${c.ci(p.color).hex};color:#0f0f14">${esc(p.name)}</span>` : '—'; };
        const team = (i, big) => `<div class="ps-tname ps-disp" style="background:${col(i)}${big ? ';font-size:6rem' : ''}">${tname(i)}</div>`;
        const hits = (n, pre) => `<div class="ps-hits">${pre || ''}<b>${n}</b> ${n === 1 ? 'acerto' : 'acertos'}</div>`;

        const tag = `${G.mode}:${(G.ranking || []).map(r => r.pid + '=' + r.give + '/' + r.guess).join(',')}:${G.phase}:${G.round}:${G.turn}:${G.hits}:${G.curCat || ''}:${G.clue}:${G.guess}:${G.teams.map(t => t.score).join(',')}`;
        if (tag !== lastPhase) {
          lastPhase = tag;
          let h = '';
          if (G.phase === 'setup') {
            h = `<div class="ps-logo ps-disp">Palavra<br><span>Secreta</span></div>
              <div class="ps-sub" style="margin-top:2.4rem">${G.mode === 'todos' ? 'Todos com todos: cada um dá dicas para cada um, em duplas que vão girando.' : 'Em times: um dá as dicas falando, o colega adivinha.'}</div>
              <div class="ps-sub" style="color:#0f0f14">Ajustem as regras no celular e toquem em “Começar”.</div>`;
          } else if (G.mode === 'todos' && G.phase === 'ready') {
            h = `<div class="ps-sub">Vez <b class="pix" style="color:#0f0f14">${G.turnNo}/${G.turnTotal}</b></div>
              <div class="ps-roles"><div><small>dá as dicas</small>${nmc(G.clue)}</div><div><small>adivinha</small>${nmc(G.guess)}</div></div>
              <div class="ps-sub">${nome(G.clue)} toca em “▶ Começar” no celular.</div>`;
          } else if (G.mode === 'todos' && G.phase === 'play') {
            h = `<div class="ps-roles"><div><small>dá as dicas</small>${nmc(G.clue)}</div><div><small>adivinha</small>${nmc(G.guess)}</div></div>
              ${G.curCat ? `<div class="ps-cat"><small>categoria</small>${esc((G.cats.find(k => k.id === G.curCat) || {}).name || '')}</div>` : ''}
              <div class="ps-clock" id="ps-clock">–</div><div class="ps-bar"><i id="ps-bar"></i></div>
              ${hits(G.hits)}`;
          } else if (G.mode === 'todos' && G.phase === 'result') {
            const L = G.last || { hits: 0, words: [] };
            h = `<div class="ps-sub">Fim da vez</div>
              <div class="ps-roles"><div><small>deu as dicas</small>${nmc(L.clue)}</div><div><small>adivinhou</small>${nmc(L.guess)}</div></div>
              <div class="ps-big">${L.hits}</div><div class="ps-sub" style="margin-top:0">${L.hits === 1 ? 'acerto' : 'acertos'}</div>
              ${(L.words || []).length ? `<div class="ps-list">${L.words.map(w => `<span class="ps-chip ${w.ok ? '' : 'no'}">${esc(w.w)}</span>`).join('')}</div>` : ''}`;
          } else if (G.mode === 'todos' && G.phase === 'end') {
            const r = G.ranking || [], top = r.length ? r[0].score : 0;
            const win = r.filter(x => x.score === top);
            const melhor = k => { const m = Math.max(0, ...r.map(x => x[k])); const q = r.filter(x => x[k] === m && m > 0); return q.length ? q.map(x => nome(x.pid)).join(' e ') + ` (${m})` : '—'; };
            h = `<div class="ps-sub">fim de jogo</div>
              ${win.length === 1 ? `<div>${c.avatar(ply(win[0].pid), 120)}</div>` : ''}
              <div class="ps-tname ps-disp" style="background:#ffce1f">${win.length > 1 ? 'Empate!' : win.length ? nome(win[0].pid) + ' venceu!' : 'Fim!'}</div>
              <div class="ps-hits">${win.map(x => nome(x.pid)).join(' e ')} · <b>${top}</b> ${top === 1 ? 'ponto' : 'pontos'}</div>
              <div class="ps-roles"><div><small>melhor dando dica</small>${melhor('give')}</div><div><small>melhor adivinhando</small>${melhor('guess')}</div></div>
              <div class="ps-sub">Toque em “Jogar de novo” no celular.</div>`;
          } else if (G.phase === 'ready') {
            h = `${team(G.turn, true)}
              <div class="ps-roles" style="margin-top:3rem"><div><small>dá as dicas</small>${nmc(G.clue)}</div><div><small>adivinha</small>${nmc(G.guess)}</div></div>
              <div class="ps-sub" style="margin-top:2.4rem">${nome(G.clue)} toca em “▶ Começar” no celular.</div>`;
          } else if (G.phase === 'play') {
            h = `${team(G.turn)}
              <div class="ps-roles" style="margin-top:2.4rem"><div><small>dá as dicas</small>${nmc(G.clue)}</div><div><small>adivinha</small>${nmc(G.guess)}</div></div>
              ${G.curCat ? `<div class="ps-cat"><small>categoria</small>${esc((G.cats.find(k => k.id === G.curCat) || {}).name || '')}</div>` : ''}
              <div class="ps-clock" id="ps-clock">–</div><div class="ps-bar"><i id="ps-bar"></i></div>
              ${hits(G.hits, 'rodada: ')}`;
          } else if (G.phase === 'result') {
            const L = G.last || { team: G.turn, hits: 0, words: [] };
            h = `<div class="ps-sub">Fim da rodada</div>
              ${team(L.team)}
              <div class="ps-big" style="margin-top:2.4rem">${L.hits}</div><div class="ps-sub" style="margin-top:0">${L.hits === 1 ? 'acerto' : 'acertos'}</div>
              ${(L.words || []).length ? `<div class="ps-list">${L.words.map(w => `<span class="ps-chip ${w.ok ? '' : 'no'}">${esc(w.w)}</span>`).join('')}</div>` : ''}`;
          } else if (G.phase === 'end') {
            const best = Math.max(...G.teams.map(t => t.score));
            const win = G.teams.map((t, i) => i).filter(i => G.teams[i].score === best);
            h = `<div class="ps-sub">fim de jogo</div>
              <div class="ps-tname ps-disp" style="font-size:6rem;background:${win.length > 1 ? '#ffce1f' : col(win[0])}">${win.length > 1 ? 'Empate!' : tname(win[0]) + ' venceu!'}</div>
              <div class="ps-hits" style="margin-top:2.4rem">${win.map(i => tname(i)).join(' e ')} · <b>${best}</b> ${best === 1 ? 'ponto' : 'pontos'}</div>
              <div class="ps-sub">Toque em “Jogar de novo” no celular.</div>`;
          }
          st.innerHTML = h;
        }

        // aviso grande na troca de vez + sons
        const t2 = `${G.round}:${G.turn}:${G.phase}`;
        if (G.phase === 'ready' && t2 !== lastTurnTag) {
          lastTurnTag = t2; lastTick = -1;
          c.turnover(`<div class="round">${G.mode === 'todos' ? `Vez ${G.turnNo} de ${G.turnTotal}` : `Rodada ${G.round} de ${G.cfg.rounds}`}</div>
            ${G.mode === 'todos' ? '' : `<div><small>AGORA JOGA</small><div class="who2" style="background:${col(G.turn)};color:#0f0f14">${tname(G.turn)}</div></div>`}
            <div><small>DÁ AS DICAS</small><div>${c.avatar(ply(G.clue), 80)}</div><div class="who2 sm" style="background:#fff;color:#0f0f14">${nome(G.clue)}</div></div>
            <div><small>ADIVINHA</small><div>${c.avatar(ply(G.guess), 80)}</div><div class="who2 sm" style="background:#fff;color:#0f0f14">${nome(G.guess)}</div></div>`, 3000);
          c.chord([523, 659, 784]);
        } else if (G.phase === 'result' && t2 !== lastTurnTag) { lastTurnTag = t2; c.chord([784, 587, 392]); }
        else if (G.phase !== 'ready' && G.phase !== 'result') lastTurnTag = t2;
        tick(c);
      },
    },
  });
  setInterval(() => { const c = ARCADE.ctx(); if (c && c.C && c.C.gameId === 'palavrasecreta' && c.G) tick(c); }, 120);
})();
