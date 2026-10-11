// Decisões de Merda — tela da TV.
// Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8; as opções são verde-enjoo (#a3d65c) e caramelo (#e9a95b).
// Roda na TV de 2016 (Chrome 47): nada de var(), gap em flex, grid nem inset. Tamanhos em rem (1rem = 1% da largura).
'use strict';
(() => {
  let lastKey = '';
  const COR = { 1: '#a3d65c', 2: '#e9a95b' };
  const style = `
    .ddm-stage { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#0f0f14; }
    .ddm-stage > * + * { margin-top:1.5rem; }
    .ddm-tag { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.5rem 1rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.15rem; letter-spacing:.08em; text-transform:uppercase; line-height:1; }
    .ddm-tag .pix { color:#ffce1f; font-size:1.5rem; }
    .ddm-pre { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:2.2rem; line-height:1; }
    .ddm-opts { width:92%; display:flex; align-items:stretch; justify-content:center; }
    .ddm-opt { flex:1; position:relative; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:2.6rem 2rem 2rem; display:flex; flex-direction:column; align-items:center; justify-content:center; background-image:radial-gradient(rgba(15,15,20,.14) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .ddm-opt .num { position:absolute; top:-1.6rem; left:50%; margin-left:-1.6rem; width:3.2rem; height:3.2rem; line-height:2.9rem; background:#0f0f14; color:#ffce1f; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:2.2rem; border:.2rem solid #0f0f14; }
    .ddm-opt .t { font-size:2.9rem; font-weight:900; font-stretch:112%; line-height:1.1; }
    .ddm-opts.sm .ddm-opt { padding:2rem 1.4rem 1.2rem; box-shadow:.45rem .45rem 0 #0f0f14; }
    .ddm-opts.sm .ddm-opt .t { font-size:1.9rem; }
    .ddm-opt.lose { opacity:.45; }
    .ddm-opt.win { box-shadow:.6rem .6rem 0 #0f0f14, 0 0 0 .5rem #ffce1f; }
    .ddm-ou { flex:none; width:6rem; display:flex; align-items:center; justify-content:center; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; font-size:2.6rem; }
    .ddm-big { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:4.4rem; line-height:1; margin-top:1rem; }
    .ddm-who { display:flex; flex-wrap:wrap; justify-content:center; margin-top:.8rem; }
    .ddm-who .avatar { margin:0 .2rem .3rem; }
    .ddm-maj { display:inline-block; margin-top:.8rem; background:#ffce1f; border:.15rem solid #0f0f14; padding:.3rem .6rem; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1rem; letter-spacing:.06em; }
    .ddm-hint { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:1.2rem; letter-spacing:.06em; text-transform:uppercase; }
    .ddm-hint .pix { font-size:1.6rem; }
    .ddm-vs { display:flex; flex-wrap:wrap; justify-content:center; max-width:90%; margin:0 -.4rem -.8rem; }
    .ddm-vs > * { margin:0 .4rem .8rem; }
    .ddm-v { display:flex; align-items:center; padding:.5rem 1.1rem .5rem .5rem; border:.2rem solid #0f0f14; font-size:1.5rem; font-weight:900; background:#e4e2d9; color:#55555e; }
    .ddm-v .avatar { margin-right:.6rem; }
    .ddm-v.ok { box-shadow:.3rem .3rem 0 #0f0f14; color:#0f0f14; }
    .ddm-v .ck { margin-left:.6rem; font-family:'JetBrains Mono',monospace; font-size:.9rem; letter-spacing:.06em; background:#0f0f14; color:#35d07f; padding:.25rem .45rem; }
    .ddm-v .bt { margin-left:.6rem; font-family:'Pixelify Sans',monospace; font-size:1.3rem; background:#fff; border:.15rem solid #0f0f14; padding:0 .4rem; color:#0f0f14; }
    .ddm-v.hit { background:#35d07f; color:#0f0f14; box-shadow:.3rem .3rem 0 #0f0f14; }
    .ddm-win { display:inline-block; background:#fff; border:.25rem solid #0f0f14; box-shadow:.5rem .5rem 0 #0f0f14; padding:1rem 1.8rem; font-size:2rem; font-weight:900; font-stretch:112%; max-width:88%; animation:ddmpop .4s; }
    .ddm-win .nm { font-size:1.8rem; }
    .ddm-back { width:30rem; height:20rem; background:#0f0f14; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #a3d65c; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#a3d65c; background-image:radial-gradient(rgba(241,240,234,.14) 1.2px, transparent 1.3px); background-size:9px 9px; animation:ddmwob 2.2s ease-in-out infinite; }
    .ddm-back .e { font-size:6rem; line-height:1; }
    .ddm-back .t { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:2.4rem; line-height:.9; margin-top:1rem; }
    .ddm-reader { display:flex; align-items:center; justify-content:center; font-size:2.6rem; font-weight:900; }
    .ddm-reader .avatar { margin-right:1rem; }
    .ddm-reader .nm { font-size:2.4rem; }
    .ddm-champ { display:flex; flex-direction:column; align-items:center; background:#ffce1f; border:.25rem solid #0f0f14; box-shadow:.6rem .6rem 0 #0f0f14; padding:2rem 3.5rem; }
    .ddm-champ > * + * { margin-top:1rem; }
    .ddm-champ .row { display:flex; } .ddm-champ .row .avatar { margin:0 .6rem; }
    .ddm-end { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:4.6rem; line-height:.9; letter-spacing:-.01em; }
    .ddm-how { max-width:64rem; text-align:left; background:#fff; border:.25rem solid #0f0f14; box-shadow:.5rem .5rem 0 #0f0f14; padding:1.6rem 2rem; }
    .ddm-how p { font-size:1.6rem; font-weight:700; line-height:1.35; }
    .ddm-how p + p { margin-top:.6rem; }
    .ddm-how b { display:inline-block; width:2.6rem; font-family:'Pixelify Sans',monospace; font-size:1.8rem; }
    @keyframes ddmpop { from { transform:scale(.6); opacity:0; } }
    @keyframes ddmwob { 0%, 100% { transform:rotate(-2deg); } 50% { transform:rotate(2deg); } }
    .ddm-head { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:14px 16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .ddm-head .k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:4px 8px; }
    .ddm-head h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:10px; }
    .ddm-head .r { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; letter-spacing:.06em; margin-top:8px; text-transform:uppercase; }
    .ddm-head .r .pix { font-size:22px; }
    .ddm-side-t { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .pl .ddm-pts { font-family:'Pixelify Sans',monospace; font-weight:700; font-size:22px; color:#0f0f14; }
    .pl .ddm-pts small { font-family:'JetBrains Mono',monospace; font-size:12px; background:#35d07f; border:2px solid #0f0f14; padding:1px 4px; margin-left:4px; vertical-align:middle; }
    .pl .ddm-rd { display:inline-block; margin-left:6px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:10px; letter-spacing:.06em; padding:1px 4px; vertical-align:middle; background:#0f0f14; color:#ffce1f; }
  `;
  const pix = n => `<span class="pix">${n}</span>`;
  const ply = (c, pid) => c.C.players.filter(p => p.pid === pid)[0] || null;

  function opcoes(c, G, R) {
    const card = G.card || ['', ''];
    const um = k => {
      let extra = '', cls = '';
      if (R) {
        const quem = Object.keys(R.picks).filter(pid => R.picks[pid] === k).map(pid => ply(c, pid)).filter(Boolean);
        extra = `<div class="ddm-big">${R.n[k]}</div><div class="ddm-who">${quem.map(p => c.avatar(p, 40)).join('')}</div>${R.maj === k && !R.vazio ? '<span class="ddm-maj">ESCOLHA DA MAIORIA</span>' : ''}`;
        cls = R.maj === k ? 'win' : R.maj ? 'lose' : '';
      }
      return `<div class="ddm-opt ${cls}" style="background-color:${COR[k]}"><span class="num">${k}</span><div class="t">${c.esc(card[k - 1])}</div>${extra}</div>`;
    };
    return `<div class="ddm-opts ${R ? 'sm' : ''}">${um(1)}<div class="ddm-ou">OU</div>${um(2)}</div>`;
  }

  ARCADE.register('decisoesdemerda', {
    tv: {
      html(c) {
        const G = c.G, esc = c.esc; if (!G) return {};
        const reader = ply(c, G.reader);
        const nCarta = G.phase === 'draw' ? G.round + 1 : G.round;
        const roda = `CARTA ${pix(nCarta)} · META ${pix(G.cfg.goal)} PONTOS`;
        let stage = `<style>${style}</style>`;
        let side = `<div class="ddm-head"><span class="k">FESTA</span><h2>Decisões de Merda</h2><div class="r">${G.phase === 'setup' ? 'ajustando as regras' : roda}</div></div>`;

        if (G.phase === 'setup') {
          stage += `<div class="ddm-stage"><div class="ddm-tag">🤢 DECISÕES DE MERDA</div>
            <div class="ddm-how">
              <p><b>1</b>Na sua vez, vire uma carta: duas opções ruins.</p>
              <p><b>2</b>Os outros escolhem em segredo no celular qual preferem.</p>
              <p><b>3</b>Quem está na vez não escolhe: aposta se a maioria vai de 1, de 2 ou se dá empate.</p>
              <p><b>4</b>Acertou? Quem está na vez ganha 1 ponto.</p>
              <p><b>5</b>Quem chegar a ${pix(G.cfg.goal)} pontos primeiro vence.</p>
            </div>
            <div class="ddm-hint">Meta ${pix(G.cfg.goal)} pontos · ${pix(G.cfg.voteSec + 's')} para escolher · ${G.cfg.sacana ? 'com' : 'sem'} cartas sacanas</div>
            <div class="ddm-hint">Ajustem no celular e toquem em Começar</div></div>`;
        } else if (G.phase === 'draw') {
          stage += `<div class="ddm-stage"><div class="ddm-tag">VEZ DE VIRAR A CARTA</div>
            <div class="ddm-back"><div class="e">🤢</div><div class="t">Decisões<br>de Merda</div></div>
            ${reader ? `<div class="ddm-reader">${c.avatar(reader, 72)}${c.nm(reader)}</div>` : ''}
            <div class="ddm-hint">${reader && reader.on === false ? 'Sem conexão: qualquer um vira ou pula a vez no celular' : 'Toque em "Virar carta" no celular'}</div></div>`;
        } else if (G.phase === 'vote') {
          stage += `<div class="ddm-stage"><div class="ddm-tag">${roda}</div><div class="ddm-pre">O que você prefere?</div>
            ${opcoes(c, G, null)}
            <div class="ddm-hint">Escolham no celular ▸ ${reader ? esc(reader.name).toUpperCase() : 'quem leu'} aposta no que a maioria vai escolher</div>
            <div class="ddm-vs">${c.C.players.map(p => { const ok = G.ready.indexOf(p.pid) >= 0, eu = p.pid === G.reader; return `<div class="ddm-v ${ok ? 'ok' : ''}" style="${ok ? c.nmStyle(p) : ''}">${c.avatar(p, 40)}${esc(p.name)}${ok ? `<span class="ck">${eu ? 'APOSTOU' : 'ESCOLHEU'}</span>` : eu ? '<span class="ck" style="color:#ffce1f">APOSTANDO</span>' : ''}</div>`; }).join('')}</div></div>`;
          side += c.timerHtml('', G.turnMs);
        } else {
          const R = G.result || { n: { 1: 0, 2: 0 }, picks: {}, maj: 0, vazio: true, bet: null, hit: false };
          const rd = ply(c, R.reader);
          const apTxt = R.bet == null ? 'não apostou' : R.bet ? `apostou na opção ${R.bet}` : 'apostou no empate';
          let fim = '';
          if (G.phase === 'end') {
            const cs = G.champs.map(pid => ply(c, pid)).filter(Boolean);
            fim = `<div class="ddm-champ"><div class="row">${cs.map(p => c.avatar(p, cs.length > 1 ? 100 : 130)).join('')}</div><div class="ddm-end">${cs.map(p => esc(p.name)).join(' e ')}</div><div class="ddm-tag">${cs.length > 1 ? 'VENCERAM' : 'VENCEU'} 👑</div></div>`;
          }
          stage += `<div class="ddm-stage">${G.phase === 'end' ? fim : `<div class="ddm-tag">${roda}</div>`}
            ${opcoes(c, G, R)}
            ${rd ? `<div class="ddm-vs" style="margin-top:2.4rem"><div class="ddm-v ${R.hit ? 'hit' : 'ok'}">${c.avatar(rd, 40)}${esc(rd.name)} ${apTxt}${R.hit ? '<span class="ck">ACERTOU +1</span>' : '<span class="ck" style="color:#f0443a">ERROU</span>'}</div></div>` : ''}
            <div class="ddm-win">${c.hl(c.C.event ? c.C.event.text : '')}</div>
            <div class="ddm-hint">${G.phase === 'end' ? 'Toque em "Jogar de novo" no celular' : 'Toque em "Próxima vez" no celular'}</div></div>`;
        }

        const hits = G.result && G.result.hit ? [G.result.reader] : [];
        side += `<div class="box"><p class="ddm-side-t">Pontos (meta ${G.cfg.goal})</p>${c.playersHtml({
          info: p => `<span class="ddm-pts">${G.scores[p.pid] || 0}${hits.indexOf(p.pid) >= 0 ? '<small>+1</small>' : ''}</span>`,
          tag: p => (p.pid === G.reader && G.phase !== 'setup' && G.phase !== 'end' ? '<span class="ddm-rd">LEU</span>' : '') + (G.champs.indexOf(p.pid) >= 0 ? ' 👑' : ''),
        })}</div>`;
        return { stage, side };
      },
      after(c) {
        const G = c.G; if (!G) return;
        const k = `${G.phase}:${G.round}`;
        if (k === lastKey) return;
        lastKey = k;
        if (G.phase === 'vote') c.chord([523, 659]);
        else if (G.phase === 'result') c.chord([659, 784, 1046]);
        else if (G.phase === 'end') c.chord([523, 659, 784, 1046]);
      },
    },
  });
})();
