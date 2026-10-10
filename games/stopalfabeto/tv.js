// Stop Alfabeto — tela da TV.
'use strict';
(() => {
  // visual "fliperama de papel": tinta sobre papel, destaque na cor de palavras (#3db4f2). 1rem = 1vw na TV.
  const style = `
    .sa-stage { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
    .sa-stage > * + * { margin-top:1.3rem; }
    .sa-tag { font-family:'JetBrains Mono',monospace; font-size:1.05rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#55555e; }
    .sa-tag b { color:#0f0f14; }
    .sa-cat { font-family:'Archivo',sans-serif; font-size:4.6rem; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; letter-spacing:-.01em; color:#0f0f14; padding:.6rem 1.6rem .8rem;
      background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.18) 2px, transparent 2.1px); background-size:16px 16px; border:5px solid #0f0f14; box-shadow:10px 10px 0 #0f0f14; max-width:60rem; }
    .sa-who { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; margin:-.5rem; }   /* sem gap: margem nos filhos */
    .sa-who > * { margin:.5rem; }
    .sa-stage > * + .sa-who { margin-top:1.4rem; }
    .sa-who .nm { font-size:2.6rem; padding:.2rem 1rem; border-width:4px; text-transform:uppercase; font-stretch:115%; }
    .sa-t { font-family:'Pixelify Sans',monospace; font-size:7rem; font-weight:700; line-height:.9; min-width:9rem; padding:.4rem 1rem; background:#fff; border:5px solid #0f0f14; box-shadow:8px 8px 0 #0f0f14; color:#0f0f14; -webkit-font-feature-settings:"tnum"; font-variant-numeric:tabular-nums; }
    .sa-t.low { background:#f0443a; animation:pulse .5s infinite alternate; }
    .sa-grid { display:flex; flex-wrap:wrap; width:100%; max-width:57rem; margin:-.35rem; }   /* 10 colunas sem grid (TV antiga) */
    .sa-stage > * + .sa-grid { margin-top:1.2rem; }
    .sa-l { width:calc(10% - .7rem); margin:.35rem; display:flex; align-items:center; justify-content:center; position:relative; font-family:'Archivo',sans-serif; font-stretch:125%; font-size:2.6rem; font-weight:900;
      background:#fff; border:4px solid #0f0f14; color:#0f0f14; box-shadow:5px 5px 0 #0f0f14; }
    .sa-l::before { content:""; padding-top:100%; }   /* quadrado sem aspect-ratio */
    .sa-l.free { background:#fff; }
    .sa-l.used { color:#8a8a92; background:#e4e2d9; border-color:#8a8a92; text-decoration:line-through; box-shadow:none; }
    .sa-l.used i { position:absolute; left:-4px; right:-4px; bottom:-4px; font-family:'JetBrains Mono',monospace; font-size:.62rem; font-style:normal; font-weight:700; color:#0f0f14; text-decoration:none; text-transform:uppercase; border:2px solid #0f0f14; overflow:hidden; white-space:nowrap; line-height:1.4; }
    .sa-l.off { background:transparent; border:3px dashed #b9b7ae; color:#c9c7be; box-shadow:none; }
    .sa-l.pop { animation:sapop .55s cubic-bezier(.2,1.6,.4,1); }
    @keyframes sapop { 0% { transform:scale(1); } 35% { transform:scale(1.45) translateY(-14px) rotate(-6deg); } 100% { transform:scale(1); } }
    .sa-ord { display:flex; flex-direction:column; }
    .sa-ord > * + * { margin-top:8px; }
    .sa-p { display:flex; align-items:center; padding:8px 12px; background:#fff; border:3px solid #0f0f14; font-size:18px; }
    .sa-p > * + * { margin-left:10px; }
    .sa-p.now { background:#ffce1f; box-shadow:5px 5px 0 #0f0f14; }
    .sa-p.next { border-style:dashed; }
    .sa-p.dead { opacity:.4; background:#e4e2d9; }
    .sa-p .who { flex:1; text-align:left; }
    .sa-p .arr { width:20px; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:20px; }
    .sa-p .hp.brk { animation:sabrk .8s; }
    @keyframes sabrk { 0%,100% { transform:none; } 20% { transform:scale(1.4) rotate(-8deg); } 60% { transform:scale(1.1) rotate(6deg); } }
    .sa-pip { display:inline-block; width:16px; height:16px; border:2px solid #0f0f14; background:#f0443a; margin-left:4px; vertical-align:middle; }
    .sa-pip.e { background:#e4e2d9; border-color:#b9b7ae; }
    .sa-out { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; background:#0f0f14; color:#f1f0ea; padding:3px 6px; }
    .sa-big { font-family:'Archivo',sans-serif; font-size:3.2rem; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1.05; max-width:62rem; }
    .sa-big .nm { font-size:.8em; border-width:4px; }
    .sa-ink { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.4rem 1rem; }
    .sa-chip { padding:.5rem .9rem; background:#fff; border:3px solid #0f0f14; font-size:1.1rem; font-weight:800; }
    .sa-chip .pix { font-size:1.3em; }
    .sa-chips { display:flex; flex-wrap:wrap; justify-content:center; max-width:58rem; margin:-.3rem; }
    .sa-chips > * { margin:.3rem; }
    .sa-stage > * + .sa-chips { margin-top:1rem; }
    .sa-vote { display:flex; flex-wrap:wrap; justify-content:center; margin:-.5rem; }
    .sa-vote > * { margin:.5rem; }
    .sa-stage > * + .sa-vote { margin-top:1rem; }
    .sa-v { padding:.7rem 1.3rem; font-size:1.5rem; font-weight:900; text-transform:uppercase; background:#fff; border:4px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; }
    .sa-v b { font-family:'JetBrains Mono',monospace; font-size:.75em; margin-left:.5rem; }
    .sa-v.sim { background:#35d07f; } .sa-v.nao { background:#f0443a; } .sa-v.wait { background:#e4e2d9; box-shadow:none; color:#55555e; }
    .sa-head { background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; border-width:4px; box-shadow:8px 8px 0 #0f0f14; padding:14px 18px; }
    .sa-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:40px; line-height:.95; margin-top:6px; }
    .sa-head .mono { font-size:14px; }
    .sa-flash { position:fixed; top:0; left:0; right:0; bottom:0; z-index:55; background:rgba(241,240,234,0.97); display:flex; flex-direction:column; align-items:center; justify-content:center; animation:fade .25s; }
    .sa-flash > * + * { margin-top:2rem; }
    .sa-flash .k { font-family:'JetBrains Mono',monospace; font-size:1.6rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#55555e; }
    .sa-flash .v { font-family:'Archivo',sans-serif; font-size:6.5rem; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; color:#0f0f14; padding:1rem 2.4rem 1.3rem; max-width:80vw;
      background-color:#3db4f2; background-image:radial-gradient(rgba(15,15,20,.18) 2px, transparent 2.1px); background-size:16px 16px; border:6px solid #0f0f14; box-shadow:14px 14px 0 #0f0f14; }
    .sa-flash.bad .v { background-color:#f0443a; }
  `;
  let lastFx = 0, lastTick = -1, brkPid = null;

  function hearts(G, pid) {
    const n = G.lives[pid] || 0, max = G.maxLives || 3;
    if (n <= 0) return '<span class="sa-out">FORA</span>';
    let h = ''; for (let i = 0; i < max; i++) h += `<span class="sa-pip ${i < n ? '' : 'e'}"></span>`;
    return h;
  }

  ARCADE.register('stopalfabeto', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc, nm = (p, sz) => p ? `<span style="display:inline-flex;align-items:center;vertical-align:middle"><span style="margin-right:10px;display:inline-block">${c.avatar(p, sz || 38)}</span>${c.nm(p)}</span>` : ''; if (!G) return {};
        const ply = pid => c.C.players.find(p => p.pid === pid);
        let stage = `<style>${style}</style>`;
        let side = `<div class="box sa-head"><div class="mono">PALAVRAS · ${G.phase === 'setup' ? 'REGRAS' : G.phase === 'end' ? 'FIM' : `CATEGORIA <span class="pix" style="font-size:18px">${G.round}</span> · <span class="pix" style="font-size:18px">${G.left}</span> LIVRES`}</div><h2>Stop Alfabeto</h2></div>`;

        if (G.phase === 'setup') {
          const cfg = G.cfg;
          stage += `<div class="sa-stage"><div class="sa-tag">antes de começar</div><div class="sa-big">Ajustem as regras<br>no celular</div>
            <div class="sa-chips"><div class="sa-chip"><span class="pix">${cfg.turnSec}s</span> por jogada</div><div class="sa-chip"><span class="pix">${cfg.lives}</span> vida${cfg.lives > 1 ? 's' : ''}</div><div class="sa-chip"><span class="pix">${cfg.letters.length}</span> letras</div><div class="sa-chip"><span class="pix">${cfg.cats.length}</span> categorias</div></div>
            <div class="sa-tag">letras</div>
            <div class="sa-grid">${G.allLetters.map(l => `<div class="sa-l ${cfg.letters.includes(l) ? 'free' : 'off'}">${l}</div>`).join('')}</div>
            <div class="sa-tag">categorias</div><div class="sa-chips">${cfg.cats.map(k => `<div class="sa-chip">${esc(k)}</div>`).join('')}</div></div>`;
          side += `<div class="box">${c.playersHtml()}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        if (G.phase === 'end') {
          const w = ply(G.winner);
          stage += `<div class="sa-stage"><div class="sa-tag">fim de jogo</div>
            ${w ? `<div class="sa-big" style="font-size:4.4rem">${nm(w, 90)}</div><div class="sa-big"><span class="sa-ink">venceu!</span></div>` : '<div class="sa-big">Fim de jogo.</div>'}
            <div class="sa-tag">toque em "Jogar de novo" no celular</div>
            <div class="sa-chips">${[...G.out].reverse().map((pid, i) => { const p = ply(pid); return p ? `<div class="sa-chip"><span class="pix">${i + 2}º</span> ${esc(p.name)}</div>` : ''; }).join('')}</div></div>`;
          side += `<div class="box">${c.playersHtml({ info: p => (p.pid === G.winner ? '<b style="color:#0f0f14">VENCEU</b>' : 'eliminado') })}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        // ---- em jogo (play/vote): categoria, quem joga, relógio e o alfabeto ----
        const curP = ply(G.cur), nextP = ply(G.next);
        const grid = `<div class="sa-grid" id="sa-grid">${G.allLetters.map(l => {
          if (!G.letters.includes(l)) return `<div class="sa-l off">${l}</div>`;
          const by = G.used[l] && ply(G.used[l]);
          return `<div class="sa-l ${by ? 'used' : 'free'}" data-l="${l}" >${l}${by ? `<i style="background:${c.ci(by.color).hex}">${esc(by.name.slice(0, 8))}</i>` : ''}</div>`;
        }).join('')}</div>`;

        if (G.phase === 'vote') {
          const t = ply(G.vote.target), by = ply(G.vote.by);
          stage += `<div class="sa-stage"><div class="sa-tag">contestação</div>
            <div class="sa-big" style="font-size:2.4rem">${by ? nm(by) : ''} contestou a palavra com <span class="sa-ink">${G.vote.letter}</span> de ${t ? nm(t) : ''}</div>
            <div class="sa-tag">votem no celular: vale ou não vale?</div>
            <div class="sa-vote">${G.vote.voters.map(pid => { const p = ply(pid); if (!p) return ''; const v = G.vote.votes[pid];
              return `<div class="sa-v ${v === true ? 'sim' : v === false ? 'nao' : 'wait'}">${esc(p.name)}<b>${v === true ? 'VALE' : v === false ? 'NÃO VALE' : '…'}</b></div>`; }).join('')}</div>
            <div class="sa-t" id="sa-t">–</div>${grid}</div>`;
        } else {
          stage += `<div class="sa-stage"><div class="sa-tag">categoria ${G.round}</div><div class="sa-cat">${esc(G.cat || '')}</div>
            <div class="sa-who">${curP ? nm(curP, 70) : ''}<div class="sa-t" id="sa-t">–</div>${nextP && nextP !== curP ? `<div class="sa-tag">depois: ${esc(nextP.name)}</div>` : ''}</div>
            ${grid}
            <div class="sa-tag"><b class="pix" style="font-size:1.3rem">${G.left}</b> letra${G.left === 1 ? '' : 's'} livre${G.left === 1 ? '' : 's'}${G.last ? ' · dá para contestar a última' : ''}</div></div>`;
        }

        side += `<div class="box"><p class="mono mut" style="font-size:13px;margin-bottom:10px">ORDEM DE JOGO</p><div class="sa-ord">${G.order.map(pid => {
          const p = ply(pid); if (!p) return '';
          const dead = (G.lives[pid] || 0) <= 0;
          const cls = ['sa-p', pid === G.cur && !dead ? 'now' : '', pid === G.next && !dead ? 'next' : '', dead ? 'dead' : ''].join(' ');
          return `<div class="${cls}"><span class="arr">${pid === G.cur ? '▶' : pid === G.next ? '›' : ''}</span><span class="who">${nm(p)}${p.on === false ? ' 📵' : ''}</span><span class="hp ${brkPid === pid ? 'brk' : ''}" data-hp="${pid}">${hearts(G, pid)}</span></div>`;
        }).join('')}</div></div>
        <div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        return { stage, side };
      },

      after(c) {
        const G = c.G; if (!G) return;
        const fx = G.fx;
        if (fx && fx.id !== lastFx) {
          lastFx = fx.id;
          if (fx.k === 'letter') { c.beep(880, .09, 'square', .18); const el = document.querySelector(`#sa-grid [data-l="${fx.letter}"]`); if (el) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 600); } }
          else if (fx.k === 'life') { brkPid = fx.pid; if (fx.why === 'time') c.beep(110, .55, 'sawtooth', .3); c.beep(196, .3, 'triangle', .2); setTimeout(() => { brkPid = null; }, 900); flash('perdeu uma vida', nameOf(c, fx.pid), 1400, true); }
          else if (fx.k === 'out') { c.chord([392, 294, 196]); flash('eliminado', nameOf(c, fx.pid), 2200, true); }
          else if (fx.k === 'newcat') { c.chord([523, 659, 784, 1046]); flash('nova categoria', fx.cat || G.cat, 2400); }
          else if (fx.k === 'contest') { c.chord([740, 622, 740]); }
          else if (fx.k === 'valid') { c.chord([659, 880]); }
          else if (fx.k === 'win') { c.chord([523, 659, 784, 1046, 1318]); }
        }
        tick(c);
      },
    },
  });

  function nameOf(c, pid) { const p = c.C.players.find(x => x.pid === pid); return p ? p.name : ''; }
  function flash(k, v, ms, bad) {
    const el = document.getElementById('turnover'); if (!el) return;
    el.innerHTML = `<div class="sa-flash ${bad ? 'bad' : ''}"><div class="k">${ARCADE.esc(k)}</div><div class="v">${ARCADE.esc(v || '')}</div></div>`;
    clearTimeout(flash.t); flash.t = setTimeout(() => { el.innerHTML = ''; }, ms || 2000);
  }
  // relógio gigante: conta sozinho e dá um tique nos 2 últimos segundos
  function tick(c) {
    const el = document.getElementById('sa-t'); if (!el || !c || !c.G) return;
    const r = c.remaining();
    if (r === null) { el.textContent = '–'; el.classList.remove('low'); return; }
    const n = Math.ceil(r);
    el.textContent = String(n);
    el.classList.toggle('low', r <= 2.05 && c.G.phase === 'play');
    if (c.G.phase === 'play' && r > 0 && r <= 2.05 && n !== lastTick) { lastTick = n; c.beep(1046, .07, 'square', .16); }
    if (r > 2.2) lastTick = -1;
  }
  setInterval(() => { const c = ARCADE.ctx(); if (c && c.C && c.C.gameId === 'stopalfabeto') tick(c); }, 120);
})();
