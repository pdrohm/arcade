// Stop Alfabeto — tela da TV.
'use strict';
(() => {
  const style = `
    .sa-stage { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(10px,2vh,26px); text-align:center; }
    .sa-tag { font-size:clamp(15px,1.5vw,24px); font-weight:800; letter-spacing:3px; text-transform:uppercase; color:#9aa6c0; }
    .sa-cat { font-size:clamp(36px,6vw,110px); font-weight:900; line-height:1; background:linear-gradient(135deg,#f59e0b,#d946ef); -webkit-background-clip:text; background-clip:text; color:transparent; padding:0 10px; }
    .sa-who { display:flex; align-items:center; justify-content:center; gap:18px; flex-wrap:wrap; }
    .sa-who .nm { font-size:clamp(24px,3vw,52px); padding:6px 22px; border-radius:16px; }
    .sa-t { font-size:clamp(70px,12vw,190px); font-weight:900; line-height:.9; font-variant-numeric:tabular-nums; color:#fff; }
    .sa-t.low { color:#ef4444; animation:pulse .5s infinite alternate; }
    .sa-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(clamp(54px,5.2vw,96px),1fr)); gap:clamp(6px,.8vw,14px); width:100%; max-width:1100px; }
    .sa-l { aspect-ratio:1; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:clamp(24px,3.4vw,58px); font-weight:900;
      background:#182036; border:2px solid #2a3350; color:#fff; box-shadow:0 0 18px #f59e0b22; }
    .sa-l.free { background:linear-gradient(160deg,#fde68a,#f59e0b); color:#3b1d00; border-color:#fff5; box-shadow:0 0 26px #f59e0b66; }
    .sa-l.used { color:#64748b; background:#101627; border-color:#1e263e; text-decoration:line-through; box-shadow:none; opacity:.55; position:relative; }
    .sa-l.used i { position:absolute; bottom:4%; font-size:clamp(8px,.7vw,12px); font-style:normal; font-weight:800; opacity:.85; }
    .sa-l.off { opacity:.12; background:#0b0e17; border-style:dashed; box-shadow:none; }
    .sa-l.pop { animation:sapop .55s cubic-bezier(.2,1.6,.4,1); }
    @keyframes sapop { 0% { transform:scale(1); } 35% { transform:scale(1.45) translateY(-14px) rotate(-6deg); } 100% { transform:scale(1); } }
    .sa-ord { display:flex; flex-direction:column; gap:7px; }
    .sa-p { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:12px; background:#0b0e17; border:2px solid transparent; font-size:18px; }
    .sa-p.now { border-color:#f59e0b; background:#1d1704; }
    .sa-p.next { border-color:#2a3350; }
    .sa-p.dead { opacity:.35; }
    .sa-p .who { flex:1; text-align:left; }
    .sa-p .hp { font-size:17px; letter-spacing:1px; }
    .sa-p .hp.brk { animation:sabrk .8s; }
    @keyframes sabrk { 0%,100% { transform:none; } 20% { transform:scale(1.4) rotate(-8deg); } 60% { transform:scale(1.1) rotate(6deg); } }
    .sa-big { font-size:clamp(26px,3.6vw,58px); font-weight:900; }
    .sa-chip { padding:9px 16px; border-radius:12px; background:#182036; border:1px solid #2a3350; font-size:clamp(14px,1.4vw,21px); font-weight:800; }
    .sa-chips { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; max-width:1000px; }
    .sa-vote { display:flex; gap:18px; flex-wrap:wrap; justify-content:center; }
    .sa-v { padding:14px 26px; border-radius:16px; font-size:clamp(16px,1.8vw,26px); font-weight:900; background:#182036; border:2px solid #2a3350; }
    .sa-v.sim { border-color:#22c55e; } .sa-v.nao { border-color:#ef4444; } .sa-v.wait { opacity:.4; }
    .sa-flash { position:fixed; inset:0; z-index:55; background:#070a12f2; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; animation:fade .25s; }
    .sa-flash .k { font-size:clamp(18px,2vw,30px); font-weight:900; letter-spacing:5px; text-transform:uppercase; color:#9aa6c0; }
    .sa-flash .v { font-size:clamp(44px,8vw,140px); font-weight:900; background:linear-gradient(135deg,#f59e0b,#d946ef); -webkit-background-clip:text; background-clip:text; color:transparent; }
  `;
  let lastFx = 0, lastTick = -1, brkPid = null;

  function hearts(G, pid) {
    const n = G.lives[pid] || 0, max = G.maxLives || 3;
    return n <= 0 ? '💀' : '❤️'.repeat(n) + '<span style="opacity:.2">' + '🖤'.repeat(Math.max(0, max - n)) + '</span>';
  }

  ARCADE.register('stopalfabeto', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm; if (!G) return {};
        const ply = pid => c.C.players.find(p => p.pid === pid);
        let stage = `<style>${style}</style>`;
        let side = `<div class="box center"><div style="font-size:28px;font-weight:900">🔤 Stop Alfabeto</div><p class="sub mut">${G.phase === 'setup' ? 'ajustem as regras no celular' : `Categoria ${G.round} · ${G.left} letras livres`}</p></div>`;

        if (G.phase === 'setup') {
          const cfg = G.cfg;
          stage += `<div class="sa-stage"><div class="sa-tag">antes de começar</div><div class="sa-big">⚙️ Ajustem as regras no celular</div>
            <div class="sa-chips"><div class="sa-chip">⏱ ${cfg.turnSec}s por jogada</div><div class="sa-chip">❤️ ${cfg.lives} vida${cfg.lives > 1 ? 's' : ''}</div><div class="sa-chip">🔤 ${cfg.letters.length} letras</div><div class="sa-chip">🗂 ${cfg.cats.length} categorias</div></div>
            <div class="sa-tag">letras</div>
            <div class="sa-grid">${G.allLetters.map(l => `<div class="sa-l ${cfg.letters.includes(l) ? 'free' : 'off'}">${l}</div>`).join('')}</div>
            <div class="sa-tag">categorias</div><div class="sa-chips">${cfg.cats.map(k => `<div class="sa-chip">${esc(k)}</div>`).join('')}</div></div>`;
          side += `<div class="box">${c.playersHtml()}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        if (G.phase === 'end') {
          const w = ply(G.winner);
          stage += `<div class="sa-stage"><div style="font-size:clamp(70px,12vw,180px);line-height:1">🏆</div>
            <div class="sa-big">${w ? `${nm(w)} venceu!` : 'Fim de jogo.'}</div>
            <div class="sa-tag">toque em "Jogar de novo" no celular</div>
            <div class="sa-chips">${[...G.out].reverse().map((pid, i) => { const p = ply(pid); return p ? `<div class="sa-chip">${i + 2}º ${esc(p.name)} 💀</div>` : ''; }).join('')}</div></div>`;
          side += `<div class="box">${c.playersHtml({ info: p => (p.pid === G.winner ? '🏆 venceu' : '💀 eliminado') })}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        // ---- em jogo (play/vote): categoria, quem joga, relógio e o alfabeto ----
        const curP = ply(G.cur), nextP = ply(G.next);
        const grid = `<div class="sa-grid" id="sa-grid">${G.allLetters.map(l => {
          if (!G.letters.includes(l)) return `<div class="sa-l off">${l}</div>`;
          const by = G.used[l] && ply(G.used[l]);
          return `<div class="sa-l ${by ? 'used' : 'free'}" data-l="${l}" ${by ? `style="border-color:${c.ci(by.color).hex}55"` : ''}>${l}${by ? `<i style="color:${c.ci(by.color).hex}">${esc(by.name.slice(0, 8))}</i>` : ''}</div>`;
        }).join('')}</div>`;

        if (G.phase === 'vote') {
          const t = ply(G.vote.target), by = ply(G.vote.by);
          stage += `<div class="sa-stage"><div class="sa-tag">contestação</div>
            <div class="sa-big">🚨 ${by ? nm(by) : ''} contestou a palavra com <b style="color:#f59e0b">${G.vote.letter}</b> de ${t ? nm(t) : ''}</div>
            <div class="sa-tag">votem no celular: vale ou não vale?</div>
            <div class="sa-vote">${G.vote.voters.map(pid => { const p = ply(pid); if (!p) return ''; const v = G.vote.votes[pid];
              return `<div class="sa-v ${v === true ? 'sim' : v === false ? 'nao' : 'wait'}">${esc(p.name)} ${v === true ? '✅' : v === false ? '❌' : '…'}</div>`; }).join('')}</div>
            <div class="sa-t" id="sa-t">–</div>${grid}</div>`;
        } else {
          stage += `<div class="sa-stage"><div class="sa-tag">categoria ${G.round}</div><div class="sa-cat">${esc(G.cat || '')}</div>
            <div class="sa-who">${curP ? nm(curP) : ''}<div class="sa-t" id="sa-t">–</div>${nextP && nextP !== curP ? `<div class="sa-tag">depois: ${esc(nextP.name)}</div>` : ''}</div>
            ${grid}
            <div class="sa-tag">${G.left} letra${G.left === 1 ? '' : 's'} livre${G.left === 1 ? '' : 's'}${G.last ? ' · dá para contestar a última' : ''}</div></div>`;
        }

        side += `<div class="box"><p class="sub mut" style="margin-bottom:8px">Ordem de jogo</p><div class="sa-ord">${G.order.map(pid => {
          const p = ply(pid); if (!p) return '';
          const dead = (G.lives[pid] || 0) <= 0;
          const cls = ['sa-p', pid === G.cur && !dead ? 'now' : '', pid === G.next && !dead ? 'next' : '', dead ? 'dead' : ''].join(' ');
          return `<div class="${cls}"><span style="width:26px">${pid === G.cur ? '▶' : pid === G.next ? '›' : ''}</span><span class="who">${nm(p)}${p.on === false ? ' 📵' : ''}</span><span class="hp ${brkPid === pid ? 'brk' : ''}" data-hp="${pid}">${hearts(G, pid)}</span></div>`;
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
          else if (fx.k === 'life') { brkPid = fx.pid; if (fx.why === 'time') c.beep(110, .55, 'sawtooth', .3); c.beep(196, .3, 'triangle', .2); setTimeout(() => { brkPid = null; }, 900); flash('💔 perdeu uma vida', nameOf(c, fx.pid), 1400); }
          else if (fx.k === 'out') { c.chord([392, 294, 196]); flash('💀 eliminado', nameOf(c, fx.pid), 2200); }
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
  function flash(k, v, ms) {
    const el = document.getElementById('turnover'); if (!el) return;
    el.innerHTML = `<div class="sa-flash"><div class="k">${ARCADE.esc(k)}</div><div class="v">${ARCADE.esc(v || '')}</div></div>`;
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
