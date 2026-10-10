// Telefone Sem Fio — tela da TV: progresso das rodadas e, no fim, o álbum de cada corrente.
// Visual "fliperama de papel" (shared/ui.css): papel, tinta, borda grossa, sombra dura sem desfoque.
// Cor do jogo (categoria desenho): #b08cff. No palco, tamanhos em rem (1rem = 1vw na TV).
// A TV da casa é um Chrome 47: sem var(), grid, gap nem inset no CSS (docs/TV-ANTIGA.md).
'use strict';
(() => {
  let lastKey = '', lastSound = '';
  const style = `
    .tsf-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#0f0f14; }
    .tsf-stage > * + * { margin-top:1.6rem; }
    .tsf-k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-size:1.25rem; line-height:1; padding:.6rem 1rem; }
    .tsf-k b { font-family:'Pixelify Sans',monospace; color:#ffce1f; font-size:1.5rem; font-weight:700; }
    .tsf-big { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; letter-spacing:-.01em; font-size:4.2rem; line-height:.95; max-width:92%; }
    .tsf-frase { background:#fff; border:.26rem solid #0f0f14; box-shadow:.7rem .7rem 0 #0f0f14; padding:2rem 2.6rem; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:112%; font-size:3.6rem; line-height:1.1; max-width:88%; word-wrap:break-word; }
    .tsf-frase.none { font-size:2rem; color:#55555e; font-weight:700; }
    .tsf-img { display:block; width:30rem; height:30rem; max-height:58vh; max-width:90%; background:#fff; border:.26rem solid #0f0f14; box-shadow:.7rem .7rem 0 #0f0f14; object-fit:contain; }
    .tsf-img { aspect-ratio:1; } /* tv-ok: na TV antiga fica o quadrado fixo de cima */
    @supports (aspect-ratio:1) { .tsf-img { width:auto; } }
    .tsf-grid { display:flex; flex-wrap:wrap; justify-content:center; max-width:90%; margin-left:-.5rem; margin-right:-.5rem; margin-bottom:-1rem; }
    .tsf-grid > * { margin:0 .5rem 1rem; }
    .tsf-pl { display:flex; align-items:center; background:#fff; border:.21rem dashed #0f0f14; padding:.45rem 1.2rem .45rem .45rem; font-size:1.6rem; font-weight:900; color:#55555e; }
    .tsf-pl .avatar { margin-right:.7rem; }
    .tsf-pl i { font-style:normal; font-family:'Pixelify Sans',monospace; margin-left:.7rem; }
    .tsf-pl.ok { border-style:solid; color:#0f0f14; box-shadow:.36rem .36rem 0 #0f0f14; }
    .tsf-count { font-family:'JetBrains Mono',monospace; font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-size:1.3rem; }
    .tsf-count b { font-family:'Pixelify Sans',monospace; font-size:2.6rem; letter-spacing:.04em; margin-right:.5rem; vertical-align:-.25rem; }
    .tsf-pop { animation:tsfpop .35s; }
    @keyframes tsfpop { from { transform:translate(.8rem,.8rem); opacity:0; } }
    .tsf-item { display:flex; flex-direction:column; align-items:center; width:100%; }
    .tsf-item > * + * { margin-top:1.6rem; }
    .tsf-by { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; font-family:'JetBrains Mono',monospace; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:1.35rem; }
    .tsf-by > * + * { margin-left:.6rem; }
    .tsf-nm { display:inline-block; border:.16rem solid #0f0f14; padding:.15rem .6rem; font-family:'Archivo',sans-serif; font-weight:900; text-transform:none; letter-spacing:0; color:#0f0f14; white-space:nowrap; }
    .tsf-end { display:inline-block; background:#ffce1f; border:.26rem solid #0f0f14; box-shadow:.5rem .5rem 0 #0f0f14; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:2.6rem; line-height:1; padding:.9rem 1.6rem; }
    .tsf-hint { font-family:'JetBrains Mono',monospace; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:1.2rem; color:#55555e; }
    /* painel do lado (em px, como o resto do painel em shared/ui.css) */
    .tsf-head { background-color:#b08cff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:14px 16px; display:flex; align-items:center; color:#0f0f14; }
    .tsf-head .g { width:58px; height:58px; flex:none; background:#fff; border:3px solid #0f0f14; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-size:34px; font-weight:700; margin-right:14px; }
    .tsf-head b { display:block; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:25px; line-height:.95; }
    .tsf-head small { display:block; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; margin-top:6px; }
    .tsf-lbl { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .tsf-how { margin:0; padding:0; list-style:none; }
    .tsf-how li { display:flex; align-items:center; font-size:16px; font-weight:700; line-height:1.25; }
    .tsf-how li + li { margin-top:7px; }
    .tsf-how li b { width:26px; height:26px; flex:none; margin-right:10px; background:#0f0f14; color:#ffce1f; font-family:'Pixelify Sans',monospace; font-size:16px; display:flex; align-items:center; justify-content:center; }
    .tsf-alb { display:flex; flex-direction:column; }
    .tsf-alb > * + * { margin-top:8px; }
    .tsf-alb-l { display:flex; align-items:center; font-size:15px; font-weight:700; }
    .tsf-alb-l > * + * { margin-left:10px; }
    .tsf-alb-l img { width:54px; height:54px; background:#fff; border:2px solid #0f0f14; flex:none; }
    .tsf-alb-l .nm { flex:none; }
  `;

  ARCADE.register('telefone', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc;
        // nome no crachá da cor da pessoa, sempre com letra em tinta
        const chip = (p, cls) => p ? `<span class="${cls || 'nm'}" style="background:${c.ci(p.color).hex};color:#0f0f14">${esc(p.name)}</span>` : '';
        const nm = p => p ? `<span style="display:inline-flex;align-items:center;vertical-align:middle"><span style="margin-right:.5rem;display:inline-block">${c.avatar(p, 38)}</span>${chip(p, 'tsf-nm')}</span>` : '';
        if (!G) return { stage: '', side: '' };
        const ply = pid => c.C.players.find(p => p.pid === pid);
        let stage = `<style>${style}</style>`, side = '';
        const head = sub => `<div class="tsf-head"><span class="g">☎</span><div><b>Telefone<br>sem fio</b><small>${sub}</small></div></div>`;

        if (['write', 'draw', 'describe'].includes(G.phase)) {
          const titulo = G.phase === 'write' ? 'Escrevam uma frase maluca' : G.phase === 'draw' ? 'Desenhem o que receberam' : 'Descrevam o desenho';
          stage += `<div class="tsf-stage"><div class="tsf-k">Rodada <b>${G.step + 1}</b> de <b>${G.total}</b></div><div class="tsf-big">${titulo}</div>
            <div class="tsf-grid">${G.order.map(pid => { const p = ply(pid); if (!p) return ''; const ok = G.done.includes(pid); return `<div class="tsf-pl ${ok ? 'ok' : ''}" style="${ok ? `background:${c.ci(p.color).hex}` : ''}">${c.avatar(p, 44)}${esc(p.name)}${ok ? '<i>✓</i>' : ''}</div>`; }).join('')}</div>
            <div class="tsf-count"><b>${G.done.length}/${G.order.length}</b>entregaram</div></div>`;
          side = head('Cada frase passa por todo mundo')
            + c.timerHtml('', G.turnMs)
            + `<div class="box"><div class="tsf-lbl">Como funciona</div><ol class="tsf-how"><li><b>1</b>Escreva uma frase.</li><li><b>2</b>O vizinho desenha.</li><li><b>3</b>O próximo descreve o desenho.</li><li><b>4</b>E assim até dar a volta.</li><li><b>5</b>No fim, a TV mostra tudo.</li></ol></div>
            <div class="box">${c.playersHtml()}</div>
            <div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        if (G.phase === 'reveal' || G.phase === 'end') {
          const a = G.album;
          if (a) {
            const it = a.items[a.items.length - 1];
            const by = ply(it.by);
            const key = `${a.chain}-${a.items.length}`;
            const pop = key !== lastKey ? 'tsf-pop' : '';
            lastKey = key;
            stage += `<div class="tsf-stage"><div class="tsf-k">Corrente <b>${a.chain + 1}</b> de <b>${G.chainsCount}</b> · passo <b>${a.items.length}</b> de <b>${a.totalItems}</b></div>
              <div class="tsf-by"><span>Começou com</span>${nm(ply(a.owner))}</div>
              <div class="tsf-item ${pop}">
                <div class="tsf-by">${nm(by)}<span>${it.type === 'draw' ? 'desenhou' : (a.items.length === 1 ? 'escreveu' : 'viu o desenho e disse')}:</span></div>
                ${it.type === 'draw' ? (it.content ? `<img class="tsf-img" src="${it.content}">` : '<div class="tsf-frase none">(não deu tempo de desenhar)</div>') : `<div class="tsf-frase">“${esc(it.content)}”</div>`}
              </div>
              ${G.phase === 'end' ? '<div class="tsf-end">Fim do álbum!</div>' : '<div class="tsf-hint">Toque em "Próximo" no celular ▸</div>'}</div>`;
            side = head('Álbum · olhem a TV')
              + `<div class="box"><div class="tsf-lbl">Esta corrente até agora</div>
                <div class="tsf-alb">${a.items.map(x => { const p = ply(x.by); return `<div class="tsf-alb-l">${p ? c.avatar(p, 30) : ''}${chip(p)}${x.type === 'draw' ? (x.content ? `<img src="${x.content}">` : '<span class="sub mut">(sem desenho)</span>') : `<span>“${esc(x.content)}”</span>`}</div>`; }).join('')}</div></div>
              <div class="box">${c.playersHtml()}</div>`;
          }
          return { stage, side };
        }
        return { stage, side };
      },
      after(c) {
        const G = c.G;
        if (!G) return;
        const key = G.phase + ':' + (G.album ? G.album.chain + '-' + G.album.items.length : G.step);
        if (key !== lastSound) { lastSound = key; if (G.phase === 'reveal') c.beep(700, .1, 'triangle', .15); if (['write', 'draw', 'describe'].includes(G.phase)) c.chord([523, 659]); }
      },
    },
  });
})();
