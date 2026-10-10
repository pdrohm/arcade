// Top 10 — tela da TV: o título da carta em tamanho de cartaz, o contador de respostas,
// a lista revelada no DUVIDO e as vidas de todo mundo. A TV nunca recebe a lista antes da hora.
// Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8, texto sempre em tinta.
// Este arquivo roda também na TV de 2016 (Chrome 47): ver docs/TV-ANTIGA.md. Tamanhos em rem (1rem = 1% da largura).
'use strict';
(() => {
  let lastFx = 0, lastKey = '';
  const style = `
    .t10-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#0f0f14; }
    .t10-stage > * + * { margin-top:1.3rem; }
    .t10-cat { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.5rem 1rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.15rem; letter-spacing:.08em; text-transform:uppercase; line-height:1.1; }
    .t10-card { max-width:90%; background:#ff7ab8; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:1.8rem 2.6rem; background-image:radial-gradient(rgba(15,15,20,.16) 2px, transparent 2.1px); background-size:16px 16px; }
    .t10-card.sm { padding:1rem 1.8rem; box-shadow:.45rem .45rem 0 #0f0f14; }
    .t10-title { font-size:3.9rem; font-weight:900; font-stretch:112%; line-height:1.05; letter-spacing:-.01em; }
    .t10-title.sm { font-size:2.1rem; }
    .t10-src { margin-top:.8rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1rem; letter-spacing:.06em; text-transform:uppercase; }
    .t10-tag { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.15rem; letter-spacing:.06em; text-transform:uppercase; max-width:90%; }
    .t10-count { display:flex; align-items:center; justify-content:center; }
    .t10-count > * + * { margin-left:1.2rem; }
    .t10-count b { display:inline-block; background:#fff; border:.25rem solid #0f0f14; box-shadow:.45rem .45rem 0 #0f0f14; padding:.5rem 1.6rem .2rem; font-family:'Pixelify Sans',monospace; font-size:6.5rem; font-weight:700; line-height:1; }
    .t10-count span { font-family:'JetBrains Mono',monospace; font-size:1.4rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; text-align:left; line-height:1.3; }
    .t10-turn { display:flex; flex-wrap:wrap; justify-content:center; margin-left:-.4rem; margin-right:-.4rem; margin-bottom:-.8rem; }
    .t10-turn > * { margin:0 .4rem .8rem; }
    .t10-pl { display:flex; align-items:center; padding:.45rem 1rem .45rem .5rem; border:.2rem solid #0f0f14; font-size:1.6rem; font-weight:900; }
    .t10-pl .avatar { margin-right:.6rem; }
    .t10-pl small { display:block; margin-left:.7rem; }
    .t10-pl.now { box-shadow:.4rem .4rem 0 #0f0f14; outline:.25rem solid #ffce1f; }
    .t10-pl.dead { background:#e4e2d9 !important; color:#55555e !important; border-style:dashed; }
    .t10-h { color:#f0443a; font-size:1.3rem; letter-spacing:.1rem; -webkit-text-stroke:1px #0f0f14; }
    .t10-h.off { color:#e4e2d9; }
    .t10-out { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:.8rem; letter-spacing:.06em; padding:.2rem .4rem; }
    .t10-items { display:flex; flex-wrap:wrap; justify-content:center; width:100%; max-width:64rem; margin:0 -.35rem; }
    .t10-items > * { width:calc(50% - .7rem); margin:.35rem; }
    .t10-it { display:flex; align-items:center; padding:.45rem 1rem; background:#fff; border:.2rem solid #0f0f14; font-size:1.5rem; font-weight:800; text-align:left; animation:t10in .35s; }
    .t10-it > * + * { margin-left:.9rem; }
    .t10-it i { font-style:normal; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:1.7rem; min-width:2.8rem; }
    .t10-it.top { background:#ffce1f; }
    @keyframes t10in { from { transform:translateY(12px); opacity:0; } }
    .t10-big { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:3.4rem; line-height:.95; letter-spacing:-.01em; max-width:92%; }
    .t10-big.box2 { display:inline-block; border:.25rem solid #0f0f14; box-shadow:.5rem .5rem 0 #0f0f14; padding:.8rem 1.6rem; background:#fff; }
    .t10-big .nm { font-stretch:112%; border-width:.22rem; padding:.05rem .6rem; }
    .t10-ok { background:#35d07f !important; } .t10-no { background:#f0443a !important; } .t10-warn { background:#ffce1f !important; }
    .t10-chip { padding:.5rem 1rem; background:#fff; border:.2rem solid #0f0f14; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.1rem; letter-spacing:.04em; text-transform:uppercase; }
    .t10-chip.off { background:#e4e2d9; color:#55555e; border-style:dashed; }
    .t10-pop { animation:t10pop .4s; }
    @keyframes t10pop { from { transform:scale(.6); opacity:0; } }
    .t10-head { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:14px 16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .t10-head .k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:4px 8px; }
    .t10-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:38px; line-height:.95; margin-top:10px; }
    .t10-head .r { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; letter-spacing:.06em; margin-top:8px; text-transform:uppercase; }
    .t10-head .r .pix { font-size:22px; }
    .t10-side-t { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .pl.t10-now { background:#ffce1f; }
    .pl.t10-dead { background:#e4e2d9; }
    .pl .t10-h { font-size:18px; color:#f0443a; }
    .pl .t10-h.off { color:#e4e2d9; }
    .pl .t10-out { color:#f1f0ea; font-size:11px; }
  `;

  ARCADE.register('top10', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc;
        if (!G) return {};
        // a mesa vem pronta do servidor: nome digitado pelo mediador e celular conectado, no mesmo formato
        const ply = pid => (G.roster || []).find(r => r.pid === pid) || null;
        const max = G.maxLives || 4;
        const hearts = pid => {
          const r = ply(pid);
          const n = r ? r.lives : 0;
          if (n <= 0) return '<span class="t10-out">FORA</span>';
          return `<span class="t10-h">${'♥'.repeat(n)}</span><span class="t10-h off">${'♥'.repeat(Math.max(0, max - n))}</span>`;
        };
        const nmr = r => r ? `<span class="nm" style="${c.nmStyle({ color: r.color })}">${esc(r.name)}</span>` : '';
        const cracha = pid => {
          const r = ply(pid);
          if (!r) return '';
          return `<div class="t10-pl ${G.cur === pid ? 'now' : ''} ${r.lives <= 0 ? 'dead' : ''}" style="${c.nmStyle({ color: r.color })}">${c.avatar(r, 40)}${esc(r.name)}<small>${hearts(pid)}</small></div>`;
        };
        const crachas = () => `<div class="t10-turn">${(G.roster || []).map(x => cracha(x.pid)).join('')}</div>`;
        const itens = () => !G.card || !G.card.items ? '' :
          `<div class="t10-items">${G.card.items.map((it, i) => `<div><div class="t10-it ${i < 3 ? 'top' : ''}"><i>${i + 1}º</i><span>${esc(it)}</span></div></div>`).join('')}</div>`;
        const cabecalho = small => `<div class="t10-cat">${G.card ? G.card.catEmoji + ' ' + esc(G.card.catName) : ''}</div>
          <div class="t10-card ${small ? 'sm' : ''}"><div class="t10-title ${small ? 'sm' : ''}">${G.card ? esc(G.card.t) : ''}</div>
          ${G.card && G.card.src && !small ? `<div class="t10-src">fonte: ${esc(G.card.src)}</div>` : ''}</div>`;
        const placar = () => `<div class="box"><p class="t10-side-t">Vidas</p>
          <div class="players">${(G.roster || []).map(r => `<div class="pl ${r.pid === G.cur ? 't10-now' : ''} ${r.lives <= 0 ? 't10-dead' : ''}">
            ${c.avatar(r, 38)}<b>${nmr(r)}${r.on === false ? ' 📵' : ''}</b><span>${hearts(r.pid)}</span></div>`).join('')}</div></div>`;

        let stage = `<style>${style}</style>`;
        let side = `<div class="t10-head"><span class="k">FESTA</span><h2>Top 10</h2><div class="r">${G.phase === 'setup' ? 'preparando' : `Carta <span class="pix">${G.round}</span>`}</div></div>`;

        if (G.phase === 'setup') {
          stage += `<div class="t10-stage"><div class="t10-card" style="padding:1.4rem 3rem"><div class="t10-big" style="font-size:8rem;line-height:.85">Top 10</div></div>
            <div class="t10-cat" style="margin-top:2.2rem">Ajustem as regras no celular</div>
            ${G.cfg.solo ? `<div class="t10-tag">Modo mediador · um celular conduz a mesa</div>
              <div class="t10-turn">${(G.cfg.names || []).map(n => `<div class="t10-chip">${esc(n)}</div>`).join('') || '<div class="t10-chip off">ninguém na mesa ainda</div>'}</div>` : ''}
            <div class="t10-turn"><div class="t10-chip"><span class="t10-h">${'♥'.repeat(G.cfg.lives)}</span> por pessoa</div>
              <div class="t10-chip">${G.cfg.turnSec ? `<span class="pix">${G.cfg.turnSec}s</span> por resposta` : 'sem tempo'}</div>
              <div class="t10-chip"><span class="pix">${G.cfg.cats.length}</span> temas</div></div>
            <div class="t10-tag">Temas</div>
            <div class="t10-turn">${G.cats.map(k => `<div class="t10-chip ${G.cfg.cats.indexOf(k.id) >= 0 ? '' : 'off'}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div>
            <div class="t10-tag">Na sua vez, fale um item da lista ▸ ou duvide de quem falou</div></div>`;
          side += `<div class="box">${c.playersHtml()}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        if (G.phase === 'end') {
          const w = ply(G.winner);
          stage += `<div class="t10-stage"><div class="t10-cat">Fim de jogo</div>
            <div class="t10-big t10-pop">${w ? nmr(w) + ' venceu!' : 'Fim de jogo.'}</div>
            ${cabecalho(true)}${itens()}</div>`;
          side += placar() + `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        if (G.phase === 'reveal') {
          const by = ply(G.doubt.by), alvo = ply(G.doubt.target);
          const faltam = G.doubt.voters.length - Object.keys(G.doubt.votes).length;
          stage += `<div class="t10-stage"><div class="t10-big box2 t10-warn t10-pop" style="font-size:2.8rem">${nmr(by)} duvidou de ${nmr(alvo)}!</div>
            ${cabecalho(true)}${itens()}
            <div class="t10-tag">${G.solo ? 'A resposta estava na lista? O mediador decide no celular' : 'A resposta estava na lista? ' + (faltam > 0 ? `<span class="pix" style="font-size:1.6rem">${faltam}</span> ainda não ${faltam === 1 ? 'votou' : 'votaram'}` : 'Contando os votos…')}</div></div>`;
          side += c.timerHtml('votação', G.turnMs) + placar();
          return { stage, side };
        }

        if (G.phase === 'result') {
          const R = G.result, alvo = ply(R.target), by = ply(R.by), loser = ply(R.loser);
          const titulo = R.timeout
            ? `<div class="t10-big box2 t10-no t10-pop" style="font-size:2.8rem">Tempo! ${nmr(alvo)} não respondeu</div>`
            : R.valid
              ? `<div class="t10-big box2 t10-ok t10-pop" style="font-size:2.8rem">Valia! ${nmr(by)} duvidou à toa</div>`
              : `<div class="t10-big box2 t10-no t10-pop" style="font-size:2.8rem">Não valia! ${nmr(alvo)} chutou</div>`;
          stage += `<div class="t10-stage">${titulo}
            <div class="t10-tag">${loser ? esc(loser.name) : ''} perdeu uma vida · ${loser ? hearts(loser.pid) : ''}</div>
            ${cabecalho(true)}${itens()}
            <div class="t10-tag">Toque em "Próxima carta" no celular</div></div>`;
          side += placar() + `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        // fase de jogo: ninguém vê a lista
        const curP = ply(G.cur), lastP = ply(G.last);
        stage += `<div class="t10-stage">${cabecalho(false)}
          <div class="t10-count"><b>${G.saidCount}</b><span>${G.saidCount === 1 ? 'resposta<br>já dita' : 'respostas<br>já ditas'}</span></div>
          <div class="t10-tag">${lastP ? 'Na mesa: a resposta de ' + esc(lastP.name) : 'A lista está escondida de todo mundo'} · carta repetida dá para pular no celular</div>
          <div class="t10-big">Vez de ${curP ? nmr(curP) : '—'}</div>
          ${crachas()}</div>`;
        side += (G.turnSec ? c.timerHtml('', G.turnMs) : '') + placar() + `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        return { stage, side };
      },

      after(c) {
        const G = c.G;
        if (!G) return;
        const f = G.fx;
        if (f && f.id !== lastFx) {
          const first = lastFx === 0;
          lastFx = f.id;
          if (!first) {
            if (f.k === 'said') c.beep(700, .07, 'square', .1);
            else if (f.k === 'newcard') c.chord([523, 659, 784]);
            else if (f.k === 'doubt') c.chord([880, 660, 440]);
            else if (f.k === 'result') c.chord(f.valid ? [523, 659, 784] : [392, 294, 196]);
            else if (f.k === 'out') c.chord([392, 294, 196]);
            else if (f.k === 'win') c.chord([523, 659, 784, 1046, 1318]);
          }
        }
        const k = G.phase + ':' + G.round + ':' + G.saidCount;
        if (k !== lastKey) lastKey = k;
      },
    },
  });
})();
