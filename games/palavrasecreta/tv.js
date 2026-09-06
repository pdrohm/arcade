// Palavra Secreta — tela da TV. Placar público, cronômetro gigante. A TV nunca recebe a palavra.
'use strict';
(() => {
  let lastTick = -1, lastTurnTag = '', lastPhase = '';
  const style = `
    .ps-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2vh; text-align:center; padding:0 2vw; }
    .ps-logo { font-size:clamp(28px,3.4vw,58px); font-weight:900; letter-spacing:-1px; }
    .ps-logo span { color:#2dd4bf; }
    .ps-tname { font-size:clamp(30px,4.6vw,78px); font-weight:900; line-height:1; letter-spacing:-1px; }
    .ps-roles { display:flex; gap:2vw; flex-wrap:wrap; justify-content:center; font-size:clamp(15px,1.5vw,24px); font-weight:800; color:#cbd5e1; }
    .ps-roles small { display:block; font-size:clamp(11px,.85vw,15px); color:#8ba0b8; letter-spacing:2px; text-transform:uppercase; margin-bottom:6px; }
    .ps-clock { font-size:clamp(90px,17vw,300px); font-weight:900; line-height:.9; font-variant-numeric:tabular-nums; letter-spacing:-4px; }
    .ps-clock.low { color:#ef4444; animation:pspulse .5s infinite alternate; }
    @keyframes pspulse { to { transform:scale(1.07); } }
    .ps-hits { font-size:clamp(18px,2vw,34px); font-weight:900; color:#2dd4bf; letter-spacing:2px; text-transform:uppercase; }
    .ps-big { font-size:clamp(70px,12vw,220px); font-weight:900; line-height:1; }
    .ps-sub { font-size:clamp(14px,1.4vw,22px); color:#9aa6c0; font-weight:700; }
    .ps-list { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; max-width:80%; }
    .ps-chip { padding:8px 16px; border-radius:99px; font-weight:800; font-size:clamp(13px,1.15vw,19px); background:#ffffff14; }
    .ps-chip.no { color:#7e8ba3; text-decoration:line-through; }
    .ps-sc { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:12px; background:#0b0e17; font-size:22px; font-weight:900; }
    .ps-sc b { flex:1; }
    .ps-bar { height:10px; border-radius:99px; background:#0b0e17; overflow:hidden; width:60%; }
    .ps-bar i { display:block; height:100%; background:#14b8a6; transition:width .3s linear; }
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
        let side = `<div class="box center"><p class="sub mut">${G.phase === 'setup' ? 'Escolhendo as regras' : `Rodada ${Math.min(G.round, G.cfg.rounds)} de ${G.cfg.rounds}`}</p>
          <div style="font-size:26px;font-weight:900;margin-top:4px">🗝️ Palavra Secreta</div></div>`;
        side += `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>
          <div style="display:flex;flex-direction:column;gap:10px">${G.teams.map((t, i) => `
            <div class="ps-sc" style="border-left:7px solid ${col(i)};${i === G.turn && G.phase !== 'setup' && G.phase !== 'end' ? 'outline:2px solid #fff' : ''}">
              <b style="color:${col(i)}">${tname(i)}</b><span>${t.score}</span></div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 4px 4px 14px">${t.players.map(pid => {
              const p = ply(pid); if (!p) return '';
              const papel = pid === G.clue && G.phase !== 'setup' ? ' 🗝️' : pid === G.guess && G.phase !== 'setup' ? ' 👂' : '';
              return `<span class="nm" style="background:#ffffff12;color:#cbd5e1;font-size:14px">${esc(p.name)}${papel}${p.on === false ? ' 📵' : ''}</span>`;
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
        const nmc = pid => { const p = ply(pid); return p ? `<span class="nm" style="${c.nmStyle(p)}">${esc(p.name)}</span>` : '—'; };

        const tag = `${G.phase}:${G.round}:${G.turn}:${G.hits}:${G.clue}:${G.guess}:${G.teams.map(t => t.score).join(',')}`;
        if (tag !== lastPhase) {
          lastPhase = tag;
          let h = '';
          if (G.phase === 'setup') {
            h = `<div class="ps-logo">Palavra <span>Secreta</span></div>
              <div class="ps-sub">Em times: um dá as dicas falando, o colega adivinha.</div>
              <div class="ps-sub">Ajustem as regras no celular e toquem em “Começar”.</div>`;
          } else if (G.phase === 'ready') {
            h = `<div class="ps-tname" style="color:${col(G.turn)}">${tname(G.turn)}</div>
              <div class="ps-roles"><div><small>🗝️ dá as dicas</small>${nmc(G.clue)}</div><div><small>👂 adivinha</small>${nmc(G.guess)}</div></div>
              <div class="ps-sub">${nome(G.clue)} toca em “▶ Começar” no celular.</div>`;
          } else if (G.phase === 'play') {
            h = `<div class="ps-tname" style="color:${col(G.turn)}">${tname(G.turn)}</div>
              <div class="ps-roles"><div><small>🗝️ dá as dicas</small>${nmc(G.clue)}</div><div><small>👂 adivinha</small>${nmc(G.guess)}</div></div>
              <div class="ps-clock" id="ps-clock">–</div><div class="ps-bar"><i id="ps-bar"></i></div>
              <div class="ps-hits">Rodada: ${G.hits} ${G.hits === 1 ? 'acerto' : 'acertos'}</div>`;
          } else if (G.phase === 'result') {
            const L = G.last || { team: G.turn, hits: 0, words: [] };
            h = `<div class="ps-sub">Fim da rodada</div>
              <div class="ps-tname" style="color:${col(L.team)}">${tname(L.team)}</div>
              <div class="ps-big">${L.hits}</div><div class="ps-hits">${L.hits === 1 ? 'acerto' : 'acertos'}</div>
              ${(L.words || []).length ? `<div class="ps-list">${L.words.map(w => `<span class="ps-chip ${w.ok ? '' : 'no'}">${w.ok ? '✅ ' : '⏭ '}${esc(w.w)}</span>`).join('')}</div>` : ''}`;
          } else if (G.phase === 'end') {
            const best = Math.max(...G.teams.map(t => t.score));
            const win = G.teams.map((t, i) => i).filter(i => G.teams[i].score === best);
            h = `<div style="font-size:clamp(60px,8vw,130px)">🏆</div>
              <div class="ps-tname" style="color:${win.length > 1 ? '#fff' : col(win[0])}">${win.length > 1 ? 'Empate!' : tname(win[0]) + ' venceu!'}</div>
              <div class="ps-hits">${win.map(i => tname(i)).join(' e ')} · ${best} ${best === 1 ? 'ponto' : 'pontos'}</div>
              <div class="ps-sub">Toque em “Jogar de novo” no celular.</div>`;
          }
          st.innerHTML = h;
        }

        // aviso grande na troca de vez + sons
        const t2 = `${G.round}:${G.turn}:${G.phase}`;
        if (G.phase === 'ready' && t2 !== lastTurnTag) {
          lastTurnTag = t2; lastTick = -1;
          c.turnover(`<div class="round">Rodada ${G.round} de ${G.cfg.rounds}</div>
            <div><small>AGORA JOGA</small><div class="who2" style="background:${col(G.turn)};color:#08211f">${tname(G.turn)}</div></div>
            <div><small>🗝️ DÁ AS DICAS</small><div class="who2 sm" style="background:#fff;color:#111">${nome(G.clue)}</div></div>
            <div><small>👂 ADIVINHA</small><div class="who2 sm" style="background:#fff;color:#111">${nome(G.guess)}</div></div>`, 3000);
          c.chord([523, 659, 784]);
        } else if (G.phase === 'result' && t2 !== lastTurnTag) { lastTurnTag = t2; c.chord([784, 587, 392]); }
        else if (G.phase !== 'ready' && G.phase !== 'result') lastTurnTag = t2;
        tick(c);
      },
    },
  });
  setInterval(() => { const c = ARCADE.ctx(); if (c && c.C && c.C.gameId === 'palavrasecreta' && c.G) tick(c); }, 120);
})();
