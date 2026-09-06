// Telefone Sem Fio — tela da TV: progresso das rodadas e, no fim, o álbum de cada corrente.
'use strict';
(() => {
  let lastKey = '', lastSound = '';
  const style = `
    .tsf-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; text-align:center; }
    .tsf-big { font-size:clamp(28px,4vw,64px); font-weight:900; line-height:1.15; }
    .tsf-frase { font-size:clamp(26px,3.4vw,54px); font-weight:900; line-height:1.2; max-width:90%; }
    .tsf-img { max-height:62vh; max-width:90%; aspect-ratio:1; background:#fff; border-radius:22px; box-shadow:0 30px 60px #0009; object-fit:contain; }
    .tsf-tag { font-size:clamp(16px,1.6vw,24px); color:#9aa6c0; font-weight:800; letter-spacing:1px; text-transform:uppercase; }
    .tsf-grid { display:flex; flex-wrap:wrap; gap:14px; justify-content:center; }
    .tsf-pl { padding:14px 22px; border-radius:16px; font-size:clamp(18px,1.8vw,28px); font-weight:900; opacity:.35; transition:.3s; }
    .tsf-pl.ok { opacity:1; box-shadow:0 0 0 4px #22c55e; }
    .tsf-pop { animation:tsfpop .35s; }
    @keyframes tsfpop { from { transform:scale(.7); opacity:0; } }
  `;

  ARCADE.register('telefone', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G) return { stage: '', side: '' };
        const ply = pid => c.C.players.find(p => p.pid === pid);
        let stage = `<style>${style}</style>`, side = '';

        if (['write', 'draw', 'describe'].includes(G.phase)) {
          const titulo = G.phase === 'write' ? '✍️ Escrevam uma frase maluca' : G.phase === 'draw' ? '🎨 Desenhem o que receberam' : '👀 Descrevam o desenho';
          stage += `<div class="tsf-stage"><div class="tsf-tag">Rodada ${G.step + 1} de ${G.total}</div><div class="tsf-big">${titulo}</div>
            <div class="tsf-grid">${G.order.map(pid => { const p = ply(pid); return p ? `<div class="tsf-pl ${G.done.includes(pid) ? 'ok' : ''}" style="${c.nmStyle(p)}">${G.done.includes(pid) ? '✓ ' : ''}${esc(p.name)}</div>` : ''; }).join('')}</div>
            <div class="tsf-tag">${G.done.length} de ${G.order.length} entregaram</div></div>`;
          side = `<div class="box center"><div style="font-size:30px;font-weight:900">✏️ Telefone Sem Fio</div><p class="sub mut" style="margin-top:6px">Cada frase passa por todo mundo</p></div>
            ${c.timerHtml('', G.turnMs)}
            <div class="box"><p class="sub mut" style="margin-bottom:8px">Como funciona</p><p class="sub">1. Escreva uma frase.<br>2. O vizinho desenha.<br>3. O próximo descreve o desenho.<br>4. E assim até dar a volta.<br>5. No fim, a TV mostra tudo.</p></div>
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
            stage += `<div class="tsf-stage"><div class="tsf-tag">Corrente ${a.chain + 1} de ${G.chainsCount} · começou com ${nm(ply(a.owner))} · passo ${a.items.length} de ${a.totalItems}</div>
              <div class="${pop}" style="display:flex;flex-direction:column;align-items:center;gap:16px;width:100%">
                <div class="tsf-tag">${nm(by)} ${it.type === 'draw' ? 'desenhou' : (a.items.length === 1 ? 'escreveu' : 'viu o desenho e disse')}:</div>
                ${it.type === 'draw' ? (it.content ? `<img class="tsf-img" src="${it.content}">` : '<div class="tsf-frase">(não deu tempo de desenhar)</div>') : `<div class="tsf-frase">“${esc(it.content)}”</div>`}
              </div>
              ${G.phase === 'end' ? '<div class="tsf-big">🎉 Fim do álbum!</div>' : '<div class="tsf-tag">toque em "Próximo" no celular</div>'}</div>`;
            side = `<div class="box center"><div style="font-size:26px;font-weight:900">📖 Álbum</div></div>
              <div class="box"><p class="sub mut" style="margin-bottom:8px">Esta corrente até agora</p>
                <div style="display:flex;flex-direction:column;gap:8px">${a.items.map((x, i) => `<div style="display:flex;gap:10px;align-items:center;font-size:15px">${nm(ply(x.by))}${x.type === 'draw' ? (x.content ? `<img src="${x.content}" style="width:54px;height:54px;border-radius:8px;background:#fff">` : '<span class="sub mut">(sem desenho)</span>') : `<span class="sub">“${esc(x.content)}”</span>`}</div>`).join('')}</div></div>
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
