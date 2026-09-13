// Top 10 — tela da TV: o título da carta em tamanho de cartaz, o contador de respostas,
// a lista revelada no DUVIDO e as vidas de todo mundo. A TV nunca recebe a lista antes da hora.
// Este arquivo roda também na TV de 2016 (Chrome 47): ver docs/TV-ANTIGA.md.
'use strict';
(() => {
  let lastFx = 0, lastKey = '';
  const style = `
    .t10-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
    .t10-stage > * + * { margin-top:22px; }   /* no lugar de gap:22px (a TV não tem gap) */
    .t10-cat { padding:10px 26px; border-radius:99px; background:#f59e0b; color:#1c1200; font-weight:900; font-size:26px; letter-spacing:1px; text-transform:uppercase; } /* tv-ok: valor fixo antes */
    .t10-cat { font-size:26px; font-size:clamp(16px,1.7vw,26px); } /* tv-ok */
    .t10-title { font-size:76px; font-weight:900; line-height:1.1; max-width:92%; } /* tv-ok: valor fixo antes */
    .t10-title { font-size:76px; font-size:clamp(32px,4.8vw,76px); } /* tv-ok */
    .t10-title.sm { font-size:46px; font-size:clamp(22px,2.9vw,46px); } /* tv-ok */
    .t10-src { font-size:22px; color:#9aa6c0; font-weight:700; } /* tv-ok: valor fixo antes */
    .t10-src { font-size:22px; font-size:clamp(14px,1.4vw,22px); } /* tv-ok */
    .t10-tag { font-size:24px; color:#9aa6c0; font-weight:800; letter-spacing:2px; text-transform:uppercase; } /* tv-ok: valor fixo antes */
    .t10-tag { font-size:24px; font-size:clamp(15px,1.6vw,24px); } /* tv-ok */
    .t10-count { display:flex; align-items:baseline; justify-content:center; }
    .t10-count > * + * { margin-left:16px; }
    .t10-count b { font-size:150px; font-weight:900; line-height:1; color:#facc15; } /* tv-ok: valor fixo antes */
    .t10-count b { font-size:150px; font-size:clamp(60px,9vw,150px); } /* tv-ok */
    .t10-count span { font-size:30px; color:#9aa6c0; font-weight:800; text-align:left; } /* tv-ok: valor fixo antes */
    .t10-count span { font-size:30px; font-size:clamp(16px,2vw,30px); } /* tv-ok */
    .t10-turn { display:flex; flex-wrap:wrap; justify-content:center; margin:-8px; }
    .t10-turn > * { margin:8px; }
    .t10-pl { padding:14px 26px; border-radius:18px; font-size:34px; font-weight:900; opacity:.45; } /* tv-ok: valor fixo antes */
    .t10-pl { font-size:34px; font-size:clamp(18px,2.2vw,34px); } /* tv-ok */
    .t10-pl.now { opacity:1; box-shadow:0 0 0 5px #facc15; }
    .t10-pl.dead { opacity:.18; }
    .t10-pl small { display:block; font-size:20px; letter-spacing:1px; } /* tv-ok: valor fixo antes */
    .t10-pl small { font-size:20px; font-size:clamp(12px,1.2vw,20px); } /* tv-ok */
    .t10-items { display:flex; flex-wrap:wrap; justify-content:center; width:100%; max-width:1180px; margin:-7px; }
    .t10-items > * { width:calc(50% - 14px); margin:7px; }
    .t10-it { display:flex; align-items:center; padding:12px 20px; border-radius:14px; background:#182036; font-size:30px; font-weight:800; text-align:left; animation:t10in .35s; } /* tv-ok: valor fixo antes */
    .t10-it { font-size:30px; font-size:clamp(16px,1.9vw,30px); } /* tv-ok */
    .t10-it > * + * { margin-left:14px; }
    .t10-it i { font-style:normal; font-weight:900; color:#f59e0b; min-width:56px; }
    .t10-it.top { background:#3b2f00; }
    @keyframes t10in { from { transform:translateY(12px); opacity:0; } }
    .t10-big { font-size:64px; font-weight:900; line-height:1.15; } /* tv-ok: valor fixo antes */
    .t10-big { font-size:64px; font-size:clamp(28px,4vw,64px); } /* tv-ok */
    .t10-ok { color:#22c55e; } .t10-no { color:#ef4444; }
    .t10-hp { font-size:26px; letter-spacing:2px; } /* tv-ok: valor fixo antes */
    .t10-hp { font-size:26px; font-size:clamp(14px,1.6vw,26px); } /* tv-ok */
    .t10-chip { padding:10px 20px; border-radius:12px; background:#182036; border:1px solid #2a3350; font-size:24px; font-weight:800; } /* tv-ok: valor fixo antes */
    .t10-chip { font-size:24px; font-size:clamp(14px,1.5vw,24px); } /* tv-ok */
    .t10-pop { animation:t10pop .4s; }
    @keyframes t10pop { from { transform:scale(.6); opacity:0; } }
  `;

  ARCADE.register('top10', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G) return {};
        // a mesa vem pronta do servidor: nome digitado pelo mediador e celular conectado, no mesmo formato
        const ply = pid => (G.roster || []).find(r => r.pid === pid) || null;
        const hearts = pid => {
          const r = ply(pid);
          const n = r ? r.lives : 0;
          if (n <= 0) return '💀';
          return '❤️'.repeat(n);
        };
        const cracha = pid => {
          const r = ply(pid);
          if (!r) return '';
          return `<div class="t10-pl ${G.cur === pid ? 'now' : ''} ${r.lives <= 0 ? 'dead' : ''}" style="${c.nmStyle({ color: r.color })}">${esc(r.name)}<small>${hearts(pid)}</small></div>`;
        };
        const crachas = () => `<div class="t10-turn">${(G.roster || []).map(x => cracha(x.pid)).join('')}</div>`;
        const itens = () => !G.card || !G.card.items ? '' :
          `<div class="t10-items">${G.card.items.map((it, i) => `<div><div class="t10-it ${i < 3 ? 'top' : ''}"><i>${i + 1}º</i><span>${esc(it)}</span></div></div>`).join('')}</div>`;
        const cabecalho = small => `<div class="t10-cat">${G.card ? G.card.catEmoji + ' ' + esc(G.card.catName) : ''}</div>
          <div class="t10-title ${small ? 'sm' : ''}">${G.card ? esc(G.card.t) : ''}</div>
          ${G.card && G.card.src && !small ? `<div class="t10-src">fonte: ${esc(G.card.src)}</div>` : ''}`;
        const placar = () => `<div class="box"><p class="sub mut" style="margin-bottom:8px">Vidas</p>
          <div class="players">${(G.roster || []).map(r => `<div class="pl" style="border-color:${r.pid === G.cur ? '#f59e0b' : 'transparent'}">
            <span class="dot" style="background:${c.ci(r.color).hex}"></span><b>${esc(r.name)}${r.on === false ? ' 📵' : ''}</b><span>${hearts(r.pid)}</span></div>`).join('')}</div></div>`;

        let stage = `<style>${style}</style>`;
        let side = `<div class="box center"><div style="font-size:30px;font-weight:900">🔟 Top 10</div><p class="sub mut">${G.phase === 'setup' ? 'preparando' : 'Carta ' + G.round}</p></div>`;

        if (G.phase === 'setup') {
          stage += `<div class="t10-stage"><div class="t10-big">⚙️ Ajustem as regras no celular</div>
            ${G.cfg.solo ? `<div class="t10-tag">🎙️ modo mediador · um celular conduz a mesa</div>
              <div class="t10-turn">${(G.cfg.names || []).map(n => `<div class="t10-chip">${esc(n)}</div>`).join('') || '<div class="t10-chip">ninguém na mesa ainda</div>'}</div>` : ''}
            <div class="t10-turn"><div class="t10-chip">${'❤️'.repeat(G.cfg.lives)} por pessoa</div>
              <div class="t10-chip">${G.cfg.turnSec ? G.cfg.turnSec + 's por resposta' : 'sem tempo'}</div>
              <div class="t10-chip">${G.cfg.cats.length} temas</div></div>
            <div class="t10-tag">temas</div>
            <div class="t10-turn">${G.cats.map(k => `<div class="t10-chip" style="opacity:${G.cfg.cats.indexOf(k.id) >= 0 ? 1 : .25}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div>
            <div class="t10-tag">na sua vez, fale um item da lista — ou duvide de quem falou</div></div>`;
          side += `<div class="box">${c.playersHtml()}</div><div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        if (G.phase === 'end') {
          const w = ply(G.winner);
          stage += `<div class="t10-stage"><div style="font-size:110px">🏆</div>
            <div class="t10-big t10-pop">${w ? esc(w.name) + ' venceu!' : 'Fim de jogo.'}</div>
            ${cabecalho(true)}${itens()}</div>`;
          side += placar() + `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        if (G.phase === 'reveal') {
          const by = ply(G.doubt.by), alvo = ply(G.doubt.target);
          const faltam = G.doubt.voters.length - Object.keys(G.doubt.votes).length;
          stage += `<div class="t10-stage"><div class="t10-big t10-pop">🚨 ${by ? esc(by.name) : ''} duvidou de ${alvo ? esc(alvo.name) : ''}!</div>
            ${cabecalho(true)}${itens()}
            <div class="t10-tag">${G.solo ? 'a resposta estava na lista? o mediador decide no celular' : 'a resposta estava na lista? ' + (faltam > 0 ? faltam + ' ainda não votaram' : 'contando os votos…')}</div></div>`;
          side += c.timerHtml('votação', G.turnMs) + placar();
          return { stage, side };
        }

        if (G.phase === 'result') {
          const R = G.result, alvo = ply(R.target), by = ply(R.by), loser = ply(R.loser);
          const titulo = R.timeout
            ? `<div class="t10-big t10-no t10-pop">⏰ Tempo! ${alvo ? esc(alvo.name) : ''} não respondeu.</div>`
            : R.valid
              ? `<div class="t10-big t10-ok t10-pop">✅ Valia! ${by ? esc(by.name) : ''} duvidou à toa.</div>`
              : `<div class="t10-big t10-no t10-pop">❌ Não valia! ${alvo ? esc(alvo.name) : ''} chutou.</div>`;
          stage += `<div class="t10-stage">${titulo}
            <div class="t10-tag">${loser ? esc(loser.name) : ''} perdeu uma vida · ${loser ? hearts(loser.pid) : ''}</div>
            ${cabecalho(true)}${itens()}
            <div class="t10-tag">toque em "Próxima carta" no celular</div></div>`;
          side += placar() + `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
          return { stage, side };
        }

        // fase de jogo: ninguém vê a lista
        const curP = ply(G.cur), lastP = ply(G.last);
        stage += `<div class="t10-stage">${cabecalho(false)}
          <div class="t10-count"><b>${G.saidCount}</b><span>${G.saidCount === 1 ? 'resposta<br>já dita' : 'respostas<br>já ditas'}</span></div>
          <div class="t10-tag">${lastP ? 'na mesa: a resposta de ' + esc(lastP.name) : 'a lista está escondida de todo mundo'}</div>
          <div class="t10-big">🗣️ ${curP ? esc(curP.name) : '—'}</div>
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
