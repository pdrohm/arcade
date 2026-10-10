// Stop Alfabeto — tela do celular (o controle).
'use strict';
(() => {
  let styled = false, lastFx = 0, lastTick = -1, turnTag = null;
  // visual "fliperama de papel": tinta sobre papel, destaque na cor de palavras (#3db4f2)
  const style = `
    .sa-lab { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .sa-lab b { color:#0f0f14; }
    .sa-h { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; letter-spacing:-.01em; }
    .sa-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .sa-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:9px; }
    .sa-l { aspect-ratio:1; border:3px solid #0f0f14; border-radius:0; font-family:'Archivo',sans-serif; font-stretch:125%; font-size:30px; font-weight:900; padding:0;
      background:#fff; color:#0f0f14; box-shadow:4px 4px 0 #0f0f14; display:flex; align-items:center; justify-content:center; cursor:pointer; }
    button.sa-l { background:#3db4f2; }
    .sa-l:active { transform:translate(4px,4px); box-shadow:none; }
    .sa-l.used { background:#e4e2d9; color:#8a8a92; border-color:#8a8a92; text-decoration:line-through; box-shadow:none; }
    .sa-l.off { background:transparent; border:2px dashed #b9b7ae; color:#c9c7be; box-shadow:none; }
    .sa-l.lock { background:#fff; color:#55555e; box-shadow:none; border-color:#8a8a92; }
    .sa-t { font-family:'Pixelify Sans',monospace; font-size:76px; font-weight:700; line-height:1; text-align:center; font-variant-numeric:tabular-nums; }
    .sa-t.low { color:#d02a20; animation:pulse .5s infinite alternate; }
    .sa-pip { display:inline-block; width:18px; height:18px; border:2px solid #0f0f14; background:#f0443a; margin-left:4px; vertical-align:middle; }
    .sa-pip.e { background:#e4e2d9; border-color:#b9b7ae; }
    .sa-out { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; background:#0f0f14; color:#f1f0ea; padding:3px 6px; }
    .sa-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .sa-o { padding:10px 14px; background:#fff; border:3px solid #0f0f14; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; min-width:54px; text-align:center; cursor:pointer; }
    .sa-o.sel { background:#3db4f2; box-shadow:3px 3px 0 #0f0f14; }
    .sa-o .sa-pip { margin:0 1px; width:14px; height:14px; }
    .sa-lt { width:44px; height:44px; background:#e4e2d9; border:2px solid #b9b7ae; color:#8a8a92; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:21px; cursor:pointer; }
    .sa-lt.sel { background:#3db4f2; color:#0f0f14; border:3px solid #0f0f14; }
    .sa-chip { display:inline-flex; align-items:center; gap:10px; padding:6px 6px 6px 12px; background:#fff; border:3px solid #0f0f14; font-weight:800; font-size:17px; }
    .sa-chip b { color:#0f0f14; background:#f0443a; border:2px solid #0f0f14; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; }
    .sa-add { display:flex; flex-direction:column; gap:10px; }
    .sa-add input { font-size:20px; padding:16px 14px; }
    .pl.dead { opacity:.4; }
    .sa-cat { font-family:'Archivo',sans-serif; font-size:28px; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; margin-top:6px; overflow-wrap:anywhere; }
  `;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const pips = (n, max) => { let h = ''; for (let i = 0; i < max; i++) h += `<span class="sa-pip ${i < n ? '' : 'e'}"></span>`; return h; };
  const hearts = (G, pid) => { const n = G.lives[pid] || 0; return n <= 0 ? '<span class="sa-out">FORA</span>' : pips(n, G.maxLives || 3); };
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
        const G = c.G, esc = c.esc, nm = p => p ? `<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle">${c.avatar(p, 26)}${c.nm(p)}</span>` : '';
        if (!G || !c.you) return '';
        const me = c.you.pid;
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const myLives = G.lives[me] === undefined ? null : G.lives[me];
        const dead = myLives !== null && myLives <= 0;
        const naFila = G.order.includes(me);

        if (G.phase === 'setup') {
          const cfg = G.cfg;
          const opt = (a, vals, cur, fmt) => `<div class="sa-opt">${vals.map(v => `<div class="sa-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          return `<div class="box sa-head"><p class="mono" style="font-size:12px">PALAVRAS · REGRAS</p><h2 class="sa-h" style="font-size:30px;margin-top:6px">Regras do Stop Alfabeto</h2></div><p class="sub" style="font-size:15px;margin-top:-4px">Qualquer um pode mudar. Vale para todos.</p>
            <div class="box"><p class="sa-lab">Tempo de cada jogada</p>${opt('cfgTime', G.turnSecs, cfg.turnSec, v => v + 's')}</div>
            <div class="box"><p class="sa-lab">Vidas de cada um</p>${opt('cfgLives', G.livesOpts, cfg.lives, v => v + pips(v, v))}</div>
            <div class="box"><p class="sa-lab">Letras do jogo · <b>${cfg.letters.length}</b></p>
              <div class="sa-opt">${G.allLetters.map(l => `<div class="sa-lt ${cfg.letters.includes(l) ? 'sel' : ''}" data-a="cfgLetter" data-l="${l}">${l}</div>`).join('')}</div></div>
            <div class="box"><p class="sa-lab">Categorias · <b>${cfg.cats.length}</b> · uma por vez</p>
              <div class="sa-opt" style="margin-bottom:14px">${cfg.cats.map(k => `<span class="sa-chip">${esc(k)}<b data-a="cfgDelCat" data-k="${esc(k)}">✕</b></span>`).join('')}</div>
              <div class="sa-add"><input id="sa-newcat" placeholder="Nova categoria (ex.: Doce)" maxlength="30" autocomplete="off" enterkeyhint="done"><button class="btn blue" data-a="cfgAddCat">+ Adicionar categoria</button></div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:8px">↺ Restaurar as categorias padrão</button></div>
            <button class="btn big warn" data-a="begin" ${cfg.cats.length >= 1 && cfg.letters.length >= 2 ? '' : 'disabled'}>▶ Começar</button>
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        if (G.phase === 'end') {
          const w = ply(G.winner);
          return `<div class="box sa-head center"><p class="mono" style="font-size:12px">FIM DE JOGO</p>${w ? `<div style="margin-top:12px">${c.avatar(w, 84)}</div>` : ''}<h2 class="sa-h" style="font-size:30px;margin-top:10px">${w ? `${esc(w.name)} venceu!` : 'Fim de jogo.'}</h2>
            <p class="mono" style="font-size:13px;margin-top:8px">${w && w.pid === me ? 'VOCÊ VENCEU!' : 'BOA PARTIDA.'}</p></div>
            <div class="box">${c.playersHtml({ info: p => (p.pid === G.winner ? '<b style="color:#0f0f14">VENCEU</b>' : 'fora') })}</div>
            <button class="btn big warn" data-a="again">↻ Jogar de novo</button>`;
        }

        // cabeçalho comum em jogo
        const curP = ply(G.cur);
        let h = `<div class="box sa-head" style="display:flex;align-items:center;gap:14px">
          <div style="flex:1;min-width:0"><p class="sa-lab" style="margin-bottom:0">Categoria <b class="pix">${G.round}</b></p><div class="sa-cat">${esc(G.cat || '')}</div></div>
          <div class="center"><div>${naFila ? hearts(G, me) : ''}</div><p class="sa-lab" style="margin:6px 0 0;font-size:11px">${naFila ? (dead ? 'sem vidas' : 'suas vidas') : 'assistindo'}</p></div></div>`;

        if (G.phase === 'vote') {
          const t = ply(G.vote.target), by = ply(G.vote.by), meu = G.vote.votes[me];
          h += `<div class="box hi center"><div class="sa-h" style="font-size:32px">Contestado!</div>
            <p class="sub" style="margin-top:10px;color:#0f0f14;font-weight:700">${by ? nm(by) : ''} contestou a palavra com <b class="pix" style="font-size:22px">${G.vote.letter}</b> de ${t ? nm(t) : ""}</p></div>
            <div class="sa-t ${''}" id="sa-t">–</div>`;
          if (G.vote.target === me) h += `<div class="box center"><p class="sub">Espere: o pessoal está votando na sua palavra.</p></div>`;
          else if (meu === undefined) h += `<p class="sa-h center" style="font-size:22px">A palavra vale?</p><div class="row"><button class="btn big ok" data-a="sim">✓ Vale</button><button class="btn big no" data-a="nao">✕ Não vale</button></div>`;
          else h += `<div class="box center"><p class="sub">Você votou <b>${meu ? 'VALE' : 'NÃO VALE'}</b>. Esperando os outros…</p></div>`;
          h += `<p class="sub center mut" style="font-size:15px">Empate conta como "vale". Quem não votar é ignorado.</p>`;
          return h;
        }

        const minhaVez = G.cur === me && !dead;
        h += `<div class="sa-t" id="sa-t">–</div>`;
        if (minhaVez) {
          h += `<div class="box hi center"><div class="sa-h" style="font-size:28px">É a sua vez!</div>
            <p class="sub" style="margin-top:6px;color:#0f0f14;font-size:16px">Fale a palavra em voz alta e aperte a letra.</p></div>
            <div class="sa-grid">${G.allLetters.map(l => {
              if (!G.letters.includes(l)) return `<div class="sa-l off">${l}</div>`;
              const usada = !!G.used[l];
              return `<button class="sa-l ${usada ? 'used' : ''}" ${usada ? 'disabled' : `data-a="letra" data-l="${l}"`}>${l}</button>`;
            }).join('')}</div>`;
        } else if (dead) {
          h += `<div class="box center"><span class="sa-out" style="font-size:14px">FORA</span><h2 class="sa-h" style="font-size:26px;margin-top:12px">Você foi eliminado</h2>
            <p class="sub mut" style="margin-top:6px">Fique de olho na TV: ainda dá para contestar as jogadas.</p></div>`;
        } else {
          h += `<div class="box center"><p class="sa-lab" style="margin-bottom:0">Vez de</p><div style="margin-top:8px">${curP ? nm(curP) : '—'}</div>
            <p class="sub mut" style="margin-top:10px;font-size:15px">Espere a sua vez. Só quem está jogando pode apertar.</p></div>
            <div class="sa-grid">${G.allLetters.map(l => {
              if (!G.letters.includes(l)) return `<div class="sa-l off">${l}</div>`;
              return `<div class="sa-l ${G.used[l] ? 'used' : 'lock'}">${l}</div>`;
            }).join('')}</div>`;
        }
        if (contestOn(c, G)) {
          const lp = ply(G.last.pid);
          h += `<button class="btn no" data-a="contestar">Contestar o ${G.last.letter}${lp ? ' de ' + esc(lp.name) : ''}</button>`;
        }
        h += `<div class="box"><p class="sa-lab">Ordem e vidas</p>${c.playersHtml({
          cls: p => ((G.lives[p.pid] || 0) <= 0 && G.order.includes(p.pid) ? 'dead' : p.pid === G.cur ? 'me' : ''),
          info: p => (G.order.includes(p.pid) ? hearts(G, p.pid) : 'assiste'),
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
            else if (fx.k === 'newcat') { c.chord([523, 659, 784, 1046]); c.turnover(`<div class="round">nova categoria</div><div class="who2" style="background:#3db4f2;color:#0f0f14">${c.esc(fx.cat || G.cat || '')}</div>`, 2000, 40); }
            else if (fx.k === 'out') { c.chord([392, 294, 196]); if (fx.pid === c.you.pid) c.turnover('<div class="round">você foi eliminado</div><div class="who2" style="background:#f0443a;color:#0f0f14">Agora é só assistir</div>', 2400, [200, 80, 200]); }
            else if (fx.k === 'life' && fx.pid === c.you.pid) { c.beep(160, .35, 'sawtooth', .25); c.turnover('<div class="round">você perdeu uma vida</div><div class="who2 sm" style="background:#f0443a;color:#0f0f14">−1 vida</div>', 1400, [120, 60, 120]); }
            else if (fx.k === 'win' && fx.pid === c.you.pid) c.chord([523, 659, 784, 1046, 1318]);
          }
        }
        // aviso da vez: só quando a vez muda para mim
        const tag = `${G.phase}:${G.round}:${G.cur}`;
        if (G.phase === 'play' && G.cur === c.you.pid && turnTag !== tag) {
          turnTag = tag;
          c.turnover(`<div class="round">${c.esc(G.cat || '')}</div><div class="who2" style="background:#ffce1f;color:#0f0f14">É a sua vez!</div><small>${G.left} letras livres · ${G.cfg.turnSec}s</small>`, 900, [90, 60, 90]);
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
