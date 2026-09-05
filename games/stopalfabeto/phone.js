// Stop Alfabeto — tela do celular (o controle).
(() => {
  let styled = false, lastFx = 0, lastTick = -1, turnTag = null;
  const style = `
    .sa-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
    .sa-l { aspect-ratio:1; border-radius:14px; border:0; font-family:inherit; font-size:30px; font-weight:900;
      background:linear-gradient(160deg,#fde68a,#f59e0b); color:#3b1d00; display:flex; align-items:center; justify-content:center; }
    .sa-l:active { transform:scale(.94); }
    .sa-l.used { background:#101627; color:#475569; text-decoration:line-through; }
    .sa-l.off { opacity:.15; background:#0b0e17; }
    .sa-l.lock { filter:grayscale(.7); opacity:.5; }
    .sa-t { font-size:78px; font-weight:900; line-height:1; text-align:center; font-variant-numeric:tabular-nums; }
    .sa-t.low { color:#ef4444; animation:pulse .5s infinite alternate; }
    .sa-hp { font-size:26px; letter-spacing:2px; }
    .sa-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .sa-o { padding:12px 16px; border-radius:12px; background:#2a3350; font-weight:900; font-size:18px; min-width:56px; text-align:center; }
    .sa-o.sel { background:#f59e0b; color:#111; }
    .sa-lt { width:44px; height:44px; border-radius:10px; background:#2a3350; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:20px; opacity:.35; }
    .sa-lt.sel { background:#22c55e; color:#111; opacity:1; }
    .sa-chip { display:inline-flex; align-items:center; gap:10px; padding:12px 8px 12px 16px; border-radius:14px; background:#0b0e17; font-weight:700; font-size:18px; border:1px solid #2a3350; }
    .sa-chip b { color:#fff; background:#d946ef; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; font-size:18px; }
    .sa-add { display:flex; flex-direction:column; gap:10px; }
    .sa-add input { font-size:22px; padding:18px 16px; border-radius:14px; border:2px solid #2a3350; }
    .sa-add input:focus { outline:none; border-color:#f59e0b; }
    .pl.dead { opacity:.4; }
    .sa-cat { font-size:30px; font-weight:900; background:linear-gradient(135deg,#f59e0b,#d946ef); -webkit-background-clip:text; background-clip:text; color:transparent; }
  `;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const hearts = (G, pid) => { const n = G.lives[pid] || 0; return n <= 0 ? '💀' : '❤️'.repeat(n) + '<span style="opacity:.2">' + '🖤'.repeat(Math.max(0, (G.maxLives || 3) - n)) + '</span>'; };
  const contestOn = (c, G) => !!(G.last && G.contestUntil && G.contestUntil > Date.now() + (c.S.now - Date.now()) && c.you && G.last.pid !== c.you.pid);

  ARCADE.register('stopalfabeto', {
    phone: {
      key(c) {
        const G = c.G; if (!G || !c.you) return '';
        const v = G.vote ? `${G.vote.letter}:${G.vote.target}:${Object.keys(G.vote.votes).length}` : '';
        return `${G.phase}:${G.round}:${G.cur}:${Object.keys(G.used).length}:${v}:${contestOn(c, G) ? 1 : 0}:${G.order.map(p => G.lives[p] || 0).join('')}:${G.phase === 'setup' ? JSON.stringify(G.cfg) : ''}`;
      },
      html(c) {
        ensureStyle();
        const { G, esc, nm } = c;
        if (!G || !c.you) return '';
        const me = c.you.pid;
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const myLives = G.lives[me] === undefined ? null : G.lives[me];
        const dead = myLives !== null && myLives <= 0;
        const naFila = G.order.includes(me);

        if (G.phase === 'setup') {
          const cfg = G.cfg;
          const opt = (a, vals, cur, fmt) => `<div class="sa-opt">${vals.map(v => `<div class="sa-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          return `<div class="box center"><h2 style="font-size:26px">⚙️ Regras do Stop Alfabeto</h2><p class="sub mut" style="margin-top:6px">Qualquer um pode mudar. Vale para todos.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Tempo de cada jogada</p>${opt('cfgTime', G.turnSecs, cfg.turnSec, v => v + 's')}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Vidas de cada um</p>${opt('cfgLives', G.livesOpts, cfg.lives, v => '❤️'.repeat(v))}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Letras do jogo <span class="mut">(${cfg.letters.length})</span></p>
              <div class="sa-opt">${G.allLetters.map(l => `<div class="sa-lt ${cfg.letters.includes(l) ? 'sel' : ''}" data-a="cfgLetter" data-l="${l}">${l}</div>`).join('')}</div></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Categorias <span class="mut">(${cfg.cats.length}, uma por vez)</span></p>
              <div class="sa-opt" style="margin-bottom:10px">${cfg.cats.map(k => `<span class="sa-chip">${esc(k)}<b data-a="cfgDelCat" data-k="${esc(k)}">✕</b></span>`).join('')}</div>
              <div class="sa-add"><input id="sa-newcat" placeholder="Nova categoria (ex.: Doce)" maxlength="30" autocomplete="off" enterkeyhint="done"><button class="btn ok" data-a="cfgAddCat">➕ Adicionar categoria</button></div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:12px">↺ Restaurar as categorias padrão</button></div>
            <button class="btn big ok" data-a="begin" ${cfg.cats.length >= 1 && cfg.letters.length >= 2 ? '' : 'disabled'}>▶ Começar</button>
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        if (G.phase === 'end') {
          const w = ply(G.winner);
          return `<div class="box center"><div class="big-emoji">🏆</div><h2 style="font-size:28px;margin-top:8px">${w ? `${nm(w)} venceu!` : 'Fim de jogo.'}</h2>
            <p class="sub mut" style="margin-top:6px">${w && w.pid === me ? 'Você venceu! 🎉' : 'Boa partida.'}</p></div>
            <div class="box">${c.playersHtml({ info: p => (p.pid === G.winner ? '🏆' : '💀') })}</div>
            <button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
        }

        // cabeçalho comum em jogo
        const curP = ply(G.cur);
        let h = `<div class="box" style="display:flex;align-items:center;gap:14px">
          <div style="flex:1"><p class="sub mut">Categoria ${G.round}</p><div class="sa-cat">${esc(G.cat || '')}</div></div>
          <div class="center"><div class="sa-hp">${naFila ? hearts(G, me) : '👀'}</div><p class="sub mut" style="font-size:14px">${naFila ? (dead ? 'sem vidas' : 'suas vidas') : 'assistindo'}</p></div></div>`;

        if (G.phase === 'vote') {
          const t = ply(G.vote.target), by = ply(G.vote.by), meu = G.vote.votes[me];
          h += `<div class="box" style="border-color:#f59e0b;text-align:center"><div style="font-size:26px;font-weight:900">🚨 Contestado!</div>
            <p class="sub" style="margin-top:8px">${by ? nm(by) : ''} contestou a palavra com <b>${G.vote.letter}</b> de ${t ? nm(t) : ""}</p></div>
            <div class="sa-t ${''}" id="sa-t">–</div>`;
          if (G.vote.target === me) h += `<div class="box center"><p class="sub">Espere: o pessoal está votando na sua palavra.</p></div>`;
          else if (meu === undefined) h += `<p class="sub center">A palavra vale?</p><div class="row"><button class="btn ok" data-a="sim">✅ Vale</button><button class="btn no" data-a="nao">❌ Não vale</button></div>`;
          else h += `<div class="box center"><p class="sub">Você votou <b>${meu ? '✅ Vale' : '❌ Não vale'}</b>. Esperando os outros…</p></div>`;
          h += `<p class="sub center mut">Empate conta como "vale". Quem não votar é ignorado.</p>`;
          return h;
        }

        const minhaVez = G.cur === me && !dead;
        h += `<div class="sa-t" id="sa-t">–</div>`;
        if (minhaVez) {
          h += `<div class="box center" style="border-color:#22c55e"><div style="font-size:24px;font-weight:900">🎤 É a sua vez!</div>
            <p class="sub mut" style="margin-top:4px">Fale a palavra em voz alta e aperte a letra.</p></div>
            <div class="sa-grid">${G.allLetters.map(l => {
              if (!G.letters.includes(l)) return `<div class="sa-l off">${l}</div>`;
              const usada = !!G.used[l];
              return `<button class="sa-l ${usada ? 'used' : ''}" ${usada ? 'disabled' : `data-a="letra" data-l="${l}"`}>${l}</button>`;
            }).join('')}</div>`;
        } else if (dead) {
          h += `<div class="box center"><div class="big-emoji">💀</div><h2 style="font-size:26px;margin-top:8px">Você foi eliminado</h2>
            <p class="sub mut" style="margin-top:6px">Fique de olho na TV: ainda dá para contestar as jogadas.</p></div>`;
        } else {
          h += `<div class="box center"><p class="sub">Vez de</p><div style="margin-top:8px">${curP ? nm(curP) : '—'}</div>
            <p class="sub mut" style="margin-top:10px">Espere a sua vez. Só quem está jogando pode apertar.</p></div>
            <div class="sa-grid">${G.allLetters.map(l => {
              if (!G.letters.includes(l)) return `<div class="sa-l off">${l}</div>`;
              return `<div class="sa-l ${G.used[l] ? 'used' : 'lock'}">${l}</div>`;
            }).join('')}</div>`;
        }
        if (contestOn(c, G)) {
          const lp = ply(G.last.pid);
          h += `<button class="btn no" data-a="contestar">🚨 Contestar o ${G.last.letter}${lp ? ' de ' + esc(lp.name) : ''}</button>`;
        }
        h += `<div class="box"><p class="sub mut" style="margin-bottom:8px">Ordem e vidas</p>${c.playersHtml({
          cls: p => ((G.lives[p.pid] || 0) <= 0 && G.order.includes(p.pid) ? 'dead' : ''),
          border: p => (p.pid === G.cur ? '#f59e0b' : 'transparent'),
          info: p => (G.order.includes(p.pid) ? hearts(G, p.pid) : '👀'),
        })}</div>
        <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        return h;
      },

      after(c) {
        const G = c.G; if (!G || !c.you) return;
        const fx = G.fx;
        if (fx && fx.id !== lastFx) {
          const first = lastFx === 0;
          lastFx = fx.id;
          if (!first) {
            if (fx.k === 'letter') c.beep(880, .07, 'square', .14);
            else if (fx.k === 'newcat') { c.chord([523, 659, 784, 1046]); c.turnover(`<div class="round">nova categoria</div><div class="who2" style="background:#f59e0b;color:#111">${c.esc(fx.cat || G.cat || '')}</div>`, 2000, 40); }
            else if (fx.k === 'out') { c.chord([392, 294, 196]); if (fx.pid === c.you.pid) c.turnover('<div class="round">💀 você foi eliminado</div><div class="mine" style="color:#ef4444">Agora é só assistir</div>', 2400, [200, 80, 200]); }
            else if (fx.k === 'life' && fx.pid === c.you.pid) { c.beep(160, .35, 'sawtooth', .25); c.turnover('<div class="round">💔 você perdeu uma vida</div>', 1400, [120, 60, 120]); }
            else if (fx.k === 'win' && fx.pid === c.you.pid) c.chord([523, 659, 784, 1046, 1318]);
          }
        }
        // aviso da vez: só quando a vez muda para mim
        const tag = `${G.phase}:${G.round}:${G.cur}`;
        if (G.phase === 'play' && G.cur === c.you.pid && turnTag !== tag) {
          turnTag = tag;
          c.turnover(`<div class="round">${c.esc(G.cat || '')}</div><div class="mine">🎤 É a sua vez!</div><small>${G.left} letras livres · ${G.cfg.turnSec}s</small>`, 900, [90, 60, 90]);
          c.beep(1046, .12, 'triangle', .2);
        } else if (G.cur !== c.you.pid) turnTag = tag;
        tick(c);
      },

      act(a, el, c) {
        const send = ARCADE.send;
        const cfg = c && c.G ? c.G.cfg : null;
        if (a === 'cfgTime') send({ t: 'config', cfg: { turnSec: Number(el.dataset.v) } });
        else if (a === 'cfgLives') send({ t: 'config', cfg: { lives: Number(el.dataset.v) } });
        else if (a === 'cfgLetter') { const l = el.dataset.l; send({ t: 'config', cfg: { letters: cfg.letters.includes(l) ? cfg.letters.filter(x => x !== l) : [...cfg.letters, l] } }); }
        else if (a === 'cfgDelCat') send({ t: 'config', cfg: { cats: cfg.cats.filter(k => k !== el.dataset.k) } });
        else if (a === 'cfgAddCat') { const i = document.getElementById('sa-newcat'); const v = i && i.value.trim(); if (v) { send({ t: 'config', cfg: { cats: [...cfg.cats, v] } }); i.value = ''; } }
        else if (a === 'cfgReset') { if (confirm('Voltar às regras padrão?')) send({ t: 'config', cfg: { reset: true } }); }
        else if (a === 'begin') send({ t: 'begin' });
        else if (a === 'letra') { ARCADE.beep(660, .06, 'square', .14); send({ t: 'letter', l: el.dataset.l }); }
        else if (a === 'contestar') send({ t: 'contest' });
        else if (a === 'sim') send({ t: 'vote', ok: true });
        else if (a === 'nao') send({ t: 'vote', ok: false });
        else if (a === 'again') send({ t: 'again' });
      },
    },
  });

  // relógio grande no celular: conta sozinho e tica nos 2 últimos segundos
  function tick(c) {
    const el = document.getElementById('sa-t'); if (!el || !c.G) return;
    const r = c.remaining();
    if (r === null) { el.textContent = '–'; el.classList.remove('low'); return; }
    const n = Math.ceil(r);
    el.textContent = String(n);
    el.classList.toggle('low', r <= 2.05 && c.G.phase === 'play');
    if (c.G.phase === 'play' && c.G.cur === (c.you || {}).pid && r > 0 && r <= 2.05 && n !== lastTick) { lastTick = n; c.beep(1046, .06, 'square', .14); }
    if (r > 2.2) lastTick = -1;
  }
  // a janela de contestar fecha sozinha: redesenha para o botão sumir
  setInterval(() => {
    const c = ARCADE.ctx();
    if (!c || !c.C || c.C.gameId !== 'stopalfabeto' || !c.G) return;
    tick(c);
    const on = contestOn(c, c.G);
    if (on !== setInterval.saOn) { setInterval.saOn = on; ARCADE.redraw(); }
  }, 300);
})();
