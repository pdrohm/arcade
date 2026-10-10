// UNO — tela da TV: a mesa. Todo mundo em volta, monte de compra e pilha de descarte no meio,
// sentido da rodada girando, cor atual brilhando, e as cartas VOANDO quando alguém joga ou compra.
// A TV nunca mostra a mão de ninguém: só quantas cartas cada um tem.
//
// Feita para a TV da sala (Chrome 47): tamanhos em vw, nada de var()/clamp()/gap/grid/inset,
// cores em rgba(), filtros com -webkit-. Ver docs/TV-ANTIGA.md.
// A mesa é montada uma vez (mount) e atualizada por dentro (after); as animações nascem da
// diferença entre o estado anterior e o novo — o jogo (game.js) não sabe de nada disso.
'use strict';
(() => {
  const HEX = { r: '#ef4444', y: '#facc15', g: '#22c55e', b: '#3b82f6', w: '#0f0f14' };
  const NOME = { r: 'Vermelho', y: 'Amarelo', g: 'Verde', b: 'Azul' };
  // arco de 4 cores do coringa: linear para a TV antiga, cônico por cima nos browsers novos
  const ARCO_TV = 'linear-gradient(135deg,#ef4444 0%,#ef4444 25%,#facc15 25%,#facc15 50%,#22c55e 50%,#22c55e 75%,#3b82f6 75%)';
  const ARCO = 'conic-gradient(from 215deg,#ef4444 0 25%,#facc15 0 50%,#22c55e 0 75%,#3b82f6 0)';
  const SIM = { '+2': '+2', '+4': '+4', rev: '⇄', skip: '⊘', wild: '★' };
  const face = c => SIM[c.v] || c.v;
  const qa = (raiz, sel) => Array.prototype.slice.call(raiz.querySelectorAll(sel));

  // Posição de cada cadeira em volta da mesa (em % da mesa), a partir do topo, no sentido horário.
  const cadeira = (i, n) => {
    const ang = (-90 + i * 360 / Math.max(1, n)) * Math.PI / 180;
    return { x: 50 + 41 * Math.cos(ang), y: 45 + 33 * Math.sin(ang) };   // assento de baixo acima do aviso do rodapé
  };
  const DECK = { x: 42.5, y: 47 }, PILHA = { x: 56, y: 47 };

  const style = `
    .un-table { position:absolute; top:0; left:0; right:.6vw; bottom:.6vw; overflow:hidden; color:#0f0f14;
      background-color:#f0443a; background-image:radial-gradient(rgba(15,15,20,.16) .1vw, transparent .11vw); background-size:.6vw .6vw;
      border:.25vw solid #0f0f14; box-shadow:.6vw .6vw 0 #0f0f14; }
    .un-brand { position:absolute; top:1.4vw; left:1.4vw; z-index:3; }
    .un-brand b { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.45vw .9vw; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:2.4vw; line-height:1; }
    .un-brand small { display:block; margin-top:.5vw; font-family:'JetBrains Mono',monospace; font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-size:.95vw; }
    .un-brand small:empty { display:none; }

    /* ---- carta: face nas cores do UNO, borda de tinta e sombra dura ---- */
    .uc { position:relative; width:8.4vw; height:12.6vw; border-radius:.45vw; background:#fff; overflow:hidden; border:.2vw solid #0f0f14;
      box-shadow:.35vw .35vw 0 #0f0f14; display:flex; align-items:center; justify-content:center; }
    .uc .o { position:absolute; left:11%; top:13%; width:78%; height:74%; border-radius:50%; background:rgba(255,255,255,.28); border:.15vw solid #0f0f14; box-sizing:border-box; transform:rotate(-22deg); }
    .uc .o.rb { background:${ARCO_TV}; }
    .uc .o.rb { background:${ARCO}; } /* tv-ok: linear antes */
    .uc .v { position:relative; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:115%; font-size:4.6vw; line-height:1; color:#fff; letter-spacing:-.1vw;
      -webkit-text-stroke:.15vw #0f0f14; text-shadow:.25vw .25vw 0 #0f0f14; }
    .uc .tl, .uc .br { position:absolute; font-weight:900; font-size:1.5vw; line-height:1; color:#0f0f14; }
    .uc.w .tl, .uc.w .br { color:#fff; }
    .uc .tl { left:8%; top:5%; } .uc .br { right:8%; bottom:5%; transform:rotate(180deg); }
    .uc.back { background:#0f0f14; }
    .uc.back .o { background:#f0443a; border-color:#f1f0ea; }
    .uc.back .v { font-size:2vw; letter-spacing:.05vw; color:#ffce1f; text-shadow:.15vw .15vw 0 #0f0f14; -webkit-text-stroke:.08vw #0f0f14; transform:rotate(-22deg); }
    .uc.sm { width:6.2vw; height:9.3vw; border-width:.18vw; box-shadow:.3vw .3vw 0 #0f0f14; }
    .uc.sm .v { font-size:1.5vw; }
    .uc.play { animation:unpop .45s cubic-bezier(.2,1.4,.4,1); }
    @keyframes unpop { 0% { transform:translateY(-2vw) rotate(-14deg) scale(.6); opacity:0; } 60% { transform:translateY(0) rotate(4deg) scale(1.12); } 100% { transform:none; } }

    /* ---- centro: monte + pilha ---- */
    .un-center { position:absolute; left:50%; top:47%; width:0; height:0; }
    .un-deck { position:absolute; left:-7.5vw; top:-4.65vw; margin-left:-3.1vw; width:6.2vw; height:9.3vw; }
    .un-deck .uc { position:absolute; left:0; top:0; }
    .un-deck .uc.d2 { left:.3vw; top:-.3vw; } .un-deck .uc.d3 { left:.6vw; top:-.6vw; }
    .un-deckn { position:absolute; left:50%; top:10.6vw; transform:translateX(-50%); padding:.3vw .7vw; background:#0f0f14; color:#f1f0ea;
      font-family:'JetBrains Mono',monospace; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:.95vw; white-space:nowrap; }
    .un-pile { position:absolute; left:6vw; top:-6.3vw; margin-left:-4.2vw; width:8.4vw; height:12.6vw; }
    /* cor atual: um quadrado grande na cor, com borda de tinta, atrás da pilha */
    .un-ring { position:absolute; left:50%; top:50%; width:15vw; height:15vw; margin:-7.5vw 0 0 -7.5vw; border:.25vw solid #0f0f14; box-sizing:border-box;
      background-image:none; transform:rotate(8deg); transition:background-color .5s; }
    .un-prev { position:absolute; left:0; top:0; transform:rotate(-9deg) translate(-.6vw,.2vw); }
    .un-top { position:absolute; left:0; top:0; }
    .un-pend { position:absolute; right:-2vw; top:-1.8vw; z-index:2; padding:.3vw .9vw; background:#ffce1f; color:#0f0f14; border:.2vw solid #0f0f14; box-shadow:.3vw .3vw 0 #0f0f14;
      font-family:'Pixelify Sans',monospace; font-weight:700; font-size:2.2vw; line-height:1; animation:unpulse .8s infinite alternate; }
    @keyframes unpulse { to { transform:scale(1.12); } }
    .un-colorlab { position:absolute; left:50%; top:47%; margin-top:9.6vw; transform:translateX(-50%); display:flex; align-items:center; padding:.45vw .9vw; background:#fff;
      border:.2vw solid #0f0f14; box-shadow:.3vw .3vw 0 #0f0f14; font-family:'JetBrains Mono',monospace; font-weight:700; text-transform:uppercase; letter-spacing:.05em; font-size:1.1vw; white-space:nowrap; }
    .un-colorlab:empty { display:none; }
    .un-colorlab i { width:1.4vw; height:1.4vw; border:.15vw solid #0f0f14; margin-right:.6vw; box-sizing:border-box; }

    /* ---- sentido da rodada: anel tracejado com setas girando ---- */
    .un-dir { position:absolute; left:50%; top:47%; width:32vw; height:32vw; margin:-16vw 0 0 -16vw; border-radius:50%; border:.2vw dashed rgba(15,15,20,.45); pointer-events:none; }
    .un-dir i { position:absolute; font-size:2.2vw; line-height:1; color:#0f0f14; font-style:normal; }
    .un-dir .a1 { left:50%; top:-1.3vw; margin-left:-.6vw; transform:rotate(0deg); }
    .un-dir .a2 { right:-1.3vw; top:50%; margin-top:-.9vw; transform:rotate(90deg); }
    .un-dir .a3 { left:50%; bottom:-1.3vw; margin-left:-.6vw; transform:rotate(180deg); }
    .un-dir .a4 { left:-1.3vw; top:50%; margin-top:-.9vw; transform:rotate(270deg); }
    .un-dir.ccw i { transform:scaleX(-1) rotate(0deg); }
    .un-dir.ccw .a2 { transform:scaleX(-1) rotate(-90deg); } .un-dir.ccw .a3 { transform:scaleX(-1) rotate(180deg); } .un-dir.ccw .a4 { transform:scaleX(-1) rotate(90deg); }
    .un-dir.cw { animation:unspin 16s linear infinite; } .un-dir.ccw { animation:unspinb 16s linear infinite; }
    @keyframes unspin { to { transform:rotate(360deg); } }
    @keyframes unspinb { to { transform:rotate(-360deg); } }

    /* ---- cadeiras: leque de cartas, boneco num quadrado, nome no crachá, contagem ---- */
    .un-seat { position:absolute; width:13vw; margin-left:-6.5vw; margin-top:-5.6vw; text-align:center; transition:opacity .4s; }
    .un-seat.off { opacity:.45; }
    .un-fan { position:relative; height:3.4vw; margin-bottom:.3vw; }
    .un-fan i { position:absolute; left:50%; bottom:0; width:1.9vw; height:2.85vw; margin-left:-.95vw; border-radius:.2vw; background:#0f0f14; border:.12vw solid #f1f0ea; box-sizing:border-box;
      transform-origin:50% 130%; }
    .un-fan i:after { content:''; position:absolute; left:18%; top:18%; width:64%; height:64%; border-radius:50%; background:#f0443a; transform:rotate(-22deg); }
    .un-av { position:relative; width:6.4vw; height:6.4vw; margin:0 auto; background:#fff; border:.22vw solid #0f0f14; box-shadow:.35vw .35vw 0 #0f0f14; box-sizing:border-box;
      display:flex; align-items:center; justify-content:center; transition:transform .3s, box-shadow .3s; }
    .un-av > span { display:none; } .un-av > i { display:block; line-height:0; }
    .un-av > i .avatar { width:5.2vw !important; height:5.2vw !important; }
    .un-av b { display:none; }
    .un-seat.now .un-av { background:#ffce1f; transform:translate(-.2vw,-.2vw) scale(1.08); box-shadow:.6vw .6vw 0 #0f0f14; }
    .un-name { display:inline-block; max-width:12vw; margin-top:.9vw; padding:.15vw .6vw; border:.15vw solid #0f0f14; background:#fff; color:#0f0f14;
      font-size:1.25vw; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; vertical-align:top; }
    .un-count { display:table; margin:.4vw auto 0; padding:.25vw .7vw; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700;
      text-transform:uppercase; letter-spacing:.04em; font-size:.95vw; white-space:nowrap; }
    .un-count b { color:#ffce1f; font-family:'Pixelify Sans',monospace; font-size:1.3vw; }
    .un-seat.now .un-count { background:#ffce1f; color:#0f0f14; border:.12vw solid #0f0f14; }
    .un-seat.now .un-count b { color:#0f0f14; }
    .un-seat.uno .un-count { background:#ffce1f; color:#0f0f14; border:.12vw solid #0f0f14; animation:unblink .7s infinite alternate; }
    .un-seat.uno .un-count b { color:#0f0f14; }
    @keyframes unblink { to { opacity:.45; } }
    .un-timer { height:.6vw; margin:.4vw auto 0; width:7vw; background:#e4e2d9; border:.12vw solid #0f0f14; overflow:hidden; opacity:0; transition:opacity .3s; }
    .un-seat.now .un-timer.on { opacity:1; }
    .un-timer i { display:block; height:100%; width:100%; background:#35d07f; transition:width .25s linear; }
    .un-timer i.low { background:#0f0f14; }
    .un-seat .un-x { position:absolute; left:50%; top:3.2vw; margin-left:-2.4vw; width:4.8vw; height:4.8vw; background:#ffce1f; color:#0f0f14; border:.22vw solid #0f0f14;
      box-shadow:.35vw .35vw 0 #0f0f14; box-sizing:border-box; font-size:3vw; font-weight:900; line-height:4.3vw; opacity:0; pointer-events:none; }
    .un-seat.skipped .un-x { animation:unx 1.2s ease-out; }
    @keyframes unx { 0% { opacity:0; transform:scale(.4); } 20% { opacity:1; transform:scale(1.15); } 70% { opacity:1; transform:scale(1); } 100% { opacity:0; } }

    /* ---- carta voando (jogou / comprou) ---- */
    .un-fly { position:absolute; z-index:6; margin-left:-3.1vw; margin-top:-4.65vw; transition:left .55s cubic-bezier(.2,.8,.2,1), top .55s cubic-bezier(.2,.8,.2,1), transform .55s cubic-bezier(.2,.8,.2,1), opacity .2s; }
    .un-fly.back { margin-left:-.95vw; margin-top:-1.4vw; }
    /* ---- estouro no centro: "Inverteu!", "+4", "UNO!" ---- */
    .un-burst { position:absolute; left:50%; top:30%; transform:translate(-50%,-50%); z-index:7; padding:.8vw 2.4vw; background:#fff; color:#0f0f14; border:.3vw solid #0f0f14;
      box-shadow:.8vw .8vw 0 #0f0f14; font-family:'Archivo',sans-serif; font-stretch:125%; text-transform:uppercase; font-size:3.6vw; font-weight:900; line-height:1; white-space:nowrap;
      animation:unburst 1.1s cubic-bezier(.2,1.3,.3,1) both; pointer-events:none; }
    @keyframes unburst { 0% { opacity:0; transform:translate(-50%,-50%) scale(.3) rotate(-8deg); } 25% { opacity:1; transform:translate(-50%,-50%) scale(1.08) rotate(2deg); } 75% { opacity:1; transform:translate(-50%,-50%) scale(1); } 100% { opacity:0; transform:translate(-50%,-60%) scale(.9); } }

    /* rodapé: último aviso num bloco amarelo */
    .un-msg { position:absolute; left:50%; bottom:1.4vw; max-width:70%; transform:translateX(-50%); padding:.6vw 1.4vw; background:#ffce1f; color:#0f0f14; border:.2vw solid #0f0f14;
      box-shadow:.4vw .4vw 0 #0f0f14; text-align:center; font-size:1.35vw; font-weight:800; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .un-msg:empty { display:none; }
    .un-msg .nm { border-width:.12vw; }

    /* ---- por cima da mesa: regras / fim de rodada / fim de jogo ---- */
    .un-over { position:absolute; top:0; left:0; right:0; bottom:0; z-index:8; background:rgba(241,240,234,.96); display:flex; align-items:center; justify-content:center; padding:2vw; text-align:center; }
    .un-card { background:#fff; border:.25vw solid #0f0f14; box-shadow:.8vw .8vw 0 #0f0f14; padding:2.2vw 3vw; display:flex; flex-direction:column; align-items:center; min-width:40vw; max-width:62vw; }
    .un-card > * + * { margin-top:1.3vw; }
    .un-kick { display:inline-block; background:#0f0f14; color:#f1f0ea; padding:.4vw .9vw; font-family:'JetBrains Mono',monospace; font-weight:700; letter-spacing:.1em; text-transform:uppercase; font-size:1.05vw; }
    .un-card h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:3.6vw; line-height:.95; letter-spacing:-.01em; }
    .un-card h2 .nm { border-width:.2vw; padding:0 .6vw; }
    .un-card .un-hint { font-family:'JetBrains Mono',monospace; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:1.05vw; color:#55555e; }
    .un-rules { display:flex; flex-wrap:wrap; justify-content:center; margin:-.4vw; }
    .un-card > .un-rules { margin:.9vw -.4vw -.4vw; }
    .un-rule { margin:.4vw; padding:.6vw 1.1vw; background:#fff; border:.2vw solid #0f0f14; box-shadow:.3vw .3vw 0 #0f0f14; font-family:'JetBrains Mono',monospace; font-weight:700;
      text-transform:uppercase; letter-spacing:.04em; font-size:1.1vw; }
    .un-rule b { font-family:'Pixelify Sans',monospace; margin-left:.4vw; }
    .un-rule.on { background:#35d07f; } .un-rule.offr { background:#e4e2d9; }
    .un-sc { display:flex; flex-direction:column; width:38vw; }
    .un-sc > * + * { margin-top:.7vw; }
    .un-sc div { display:flex; align-items:center; font-size:1.6vw; font-weight:800; background:#fff; border:.2vw solid #0f0f14; padding:.5vw 1vw; }
    .un-sc div.lead { background:#ffce1f; box-shadow:.4vw .4vw 0 #0f0f14; }
    .un-sc div > * + * { margin-left:.9vw; }
    .un-sc .pos { font-family:'Pixelify Sans',monospace; font-weight:700; width:2vw; }
    .un-sc .pts { margin-left:auto; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:2vw; }
    .un-sc .plus { margin-left:.6vw; padding:.1vw .5vw; background:#35d07f; border:.15vw solid #0f0f14; font-family:'Pixelify Sans',monospace; font-size:1.2vw; }
    /* painel do lado */
    .pl.un-now { background:#ffce1f; }
    .un-side-t { display:flex; align-items:center; justify-content:center; }
    .un-side-t > * + * { margin-left:12px; }
    .un-glyph { display:inline-block; width:46px; height:46px; line-height:40px; text-align:center; background:#f0443a; border:3px solid #0f0f14; font-family:'Pixelify Sans',monospace; font-weight:700; font-size:22px; }
    .un-side-rules { display:flex; flex-wrap:wrap; margin:-4px; }
    .un-side-rules span { margin:4px; padding:5px 9px; border:2px solid #0f0f14; background:#fff; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; text-transform:uppercase; }
    .un-side-rules span.on { background:#35d07f; } .un-side-rules span.offr { background:#e4e2d9; color:#55555e; }
  `;

  const cardHtml = (card, cls) => {
    if (!card) return '';
    const bg = HEX[card.c] || '#0f0f14';
    return `<div class="uc ${card.c === 'w' ? 'w ' : ''}${cls || ''}" style="background:${bg}"><i class="o ${card.c === 'w' ? 'rb' : ''}"></i>
      <span class="tl">${face(card)}</span><span class="v">${face(card)}</span><span class="br">${face(card)}</span></div>`;
  };
  const backHtml = cls => `<div class="uc back ${cls || ''}"><i class="o"></i><span class="v">UNO</span></div>`;

  // memória entre estados (para descobrir o que aconteceu)
  let prev = null, timerT = null, topTimer = null, lastKey = '', prevKey2 = '';
  const $ = id => document.getElementById(id);

  function burst(txt, cor, fundo) {
    const t = $('un-table'); if (!t) return;
    const b = document.createElement('div'); b.className = 'un-burst'; b.textContent = txt;
    if (fundo) { b.style.background = fundo; b.style.color = cor || '#0f0f14'; }
    t.appendChild(b); setTimeout(() => b.remove(), 1150);
  }
  // Uma carta voa de um ponto a outro da mesa (em % da mesa). html = carta (face ou verso).
  function fly(html, de, para, opts) {
    const fx = $('un-fx'); if (!fx) return;
    const o = opts || {};
    const el = document.createElement('div');
    el.className = 'un-fly' + (o.back ? ' back' : '');
    el.innerHTML = html;
    el.style.left = de.x + '%'; el.style.top = de.y + '%';
    el.style.transform = 'rotate(' + (o.rot0 || 0) + 'deg) scale(' + (o.s0 || 1) + ')';
    fx.appendChild(el);
    setTimeout(() => {
      el.style.left = para.x + '%'; el.style.top = para.y + '%';
      el.style.transform = 'rotate(' + (o.rot1 || 0) + 'deg) scale(' + (o.s1 || 1) + ')';
    }, 30 + (o.delay || 0));
    setTimeout(() => { el.style.opacity = '0'; }, 560 + (o.delay || 0));
    setTimeout(() => el.remove(), 800 + (o.delay || 0));
  }

  ARCADE.register('uno', {
    tv: {
      mount() {
        prev = null; lastKey = '';
        clearInterval(timerT);
        // barra de tempo de quem está na vez, atualizada fora do fluxo de estado
        timerT = setInterval(() => {
          const c = ARCADE.ctx(); if (!c || !c.G || !c.G.turnMs) return;
          const r = c.remaining(); const bar = document.querySelector('.un-seat.now .un-timer');
          if (!bar) return;
          if (r === null) { bar.classList.remove('on'); return; }
          bar.classList.add('on');
          const i = bar.firstElementChild; i.style.width = Math.max(0, Math.min(100, r / (c.G.turnMs / 1000) * 100)) + '%';
          i.classList.toggle('low', r <= 5);
        }, 250);
        return `<style>${style}</style><div class="un-table" id="un-table">
          <div class="un-brand"><b>UNO</b><small id="un-round"></small></div>
          <div class="un-dir cw" id="un-dir"><i class="a1">➤</i><i class="a2">➤</i><i class="a3">➤</i><i class="a4">➤</i></div>
          <div class="un-center">
            <div class="un-deck" id="un-deck">${backHtml('sm')}${backHtml('sm d2')}${backHtml('sm d3')}<div class="un-deckn" id="un-deckn"></div></div>
            <div class="un-pile"><div class="un-ring" id="un-ring"></div><div class="un-prev" id="un-prev"></div><div class="un-top" id="un-top"></div><div id="un-pendbox"></div></div>
          </div>
          <div class="un-colorlab" id="un-colorlab"></div>
          <div id="un-seats"></div>
          <div id="un-fx"></div>
          <div class="un-msg" id="un-msg"></div>
          <div id="un-over"></div>
        </div>`;
      },
      destroy() { clearInterval(timerT); timerT = null; clearTimeout(topTimer); prev = null; },

      html(c) {
        const G = c.G, esc = c.esc; if (!G) return {};
        const alvo = G.cfg.target ? `até ${G.cfg.target} pontos` : 'uma rodada só';
        const regra = (on, txt) => `<span class="${on ? 'on' : 'offr'}">${on ? '✓' : '✕'} ${txt}</span>`;
        let side = `<div class="box center"><div class="un-side-t"><span class="un-glyph">+4</span><span class="disp" style="font-size:36px">UNO</span></div>
          <p class="mono" style="margin-top:10px;font-size:13px;color:#55555e;text-transform:uppercase">${G.phase === 'setup' ? 'Ajustando as regras' : `Rodada ${G.round} · ${alvo}`}</p></div>`;
        side += `<div class="box"><p class="mono" style="margin-bottom:10px;font-size:13px;text-transform:uppercase">Placar</p>${c.playersHtml({
          info: p => {
            const o = G.order.find(x => x.pid === p.pid);
            return `${o ? o.n + (o.n === 1 ? ' carta · ' : ' cartas · ') : ''}<b class="pix" style="color:#0f0f14;font-size:18px">${G.scores[p.pid] || 0}</b> pts`;
          },
          cls: p => (G.turn === p.pid && G.phase !== 'setup' ? 'un-now' : ''),
        })}</div>`;
        side += `<div class="box"><p class="mono" style="margin-bottom:10px;font-size:13px;text-transform:uppercase">Regras</p><div class="un-side-rules">
          ${regra(G.cfg.stack, 'Acumular +2/+4')}${regra(G.cfg.sevenzero, '7 e 0')}
          <span>${G.cfg.turnSec ? G.cfg.turnSec + 's por vez' : 'sem tempo'}</span><span>${esc(alvo)}</span></div></div>`;
        if (G.phase === 'play' && G.cfg.turnSec) side += c.timerHtml('', G.turnMs);
        side += `<div class="event">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        return { side };
      },

      after(c) {
        const G = c.G, esc = c.esc; if (!G || !$('un-table')) return;
        const ply = pid => c.C.players.find(p => p.pid === pid);
        const n = G.order.length;
        const pos = {}; G.order.forEach((o, i) => { pos[o.pid] = cadeira(i, n); });
        const emJogo = G.phase === 'play' || G.phase === 'color' || G.phase === 'swap';

        // ---------- o que mudou desde o último estado ----------
        const novaRodada = prev && prev.round !== G.round && G.round > 0;
        const jogada = G.lastPlay && (!prev || !prev.lastAt || prev.lastAt !== G.lastPlay.at) && !novaRodada ? G.lastPlay : null;
        const compras = [];   // { pid, k }
        if (prev && !novaRodada && emJogo) for (const o of G.order) {
          const antes = prev.n[o.pid];
          if (antes !== undefined && o.n > antes && !(jogada && jogada.pid === o.pid)) compras.push({ pid: o.pid, k: o.n - antes });
        }
        const trocaMaos = compras.length >= 2 && compras.length >= n - 1;   // 7/0: todo mundo mudou de mão — não é compra
        const inverteu = prev && prev.dir !== G.dir && emJogo && !novaRodada;

        // ---------- centro: monte, pilha, cor ----------
        $('un-deckn').textContent = `${G.deckN} cartas`;
        $('un-round').textContent = G.phase === 'setup' ? '' : `Rodada ${G.round}${G.cfg.target ? ' · até ' + G.cfg.target : ''}`;
        const key = G.top ? `${G.top.i}:${G.color}` : '';
        if (key !== lastKey) {
          const trocaTopo = () => {
            const atual = $('un-top').innerHTML;
            if (atual && prev && prev.top) $('un-prev').innerHTML = cardHtml(prev.top);
            $('un-top').innerHTML = cardHtml(G.top, 'play');
          };
          clearTimeout(topTimer);
          if (jogada && pos[jogada.pid]) {   // a carta voa da cadeira até a pilha; só então vira o topo
            fly(cardHtml(jogada.card), pos[jogada.pid], PILHA, { rot0: -20, rot1: 6, s0: .55, s1: 1 });
            topTimer = setTimeout(trocaTopo, 480);
            c.beep(520, .08, 'triangle', .12);
          } else trocaTopo();
          lastKey = key;
        }
        const ring = $('un-ring');
        if (G.color && emJogo) { ring.style.backgroundColor = HEX[G.color]; ring.style.boxShadow = '.5vw .5vw 0 #0f0f14'; ring.style.opacity = '1'; }
        else ring.style.opacity = '0';
        $('un-pendbox').innerHTML = G.pending ? `<div class="un-pend">+${G.pending}</div>` : '';
        $('un-colorlab').innerHTML = G.color && emJogo ? `<i style="background:${HEX[G.color]}"></i>Cor: ${NOME[G.color]}${G.phase === 'color' ? ' ▸ escolhendo…' : ''}` : '';

        // ---------- sentido ----------
        const dir = $('un-dir');
        const cls = G.dir > 0 ? 'un-dir cw' : 'un-dir ccw';
        if (dir.className !== cls) dir.className = cls;

        // ---------- cadeiras (chaveadas por jogador: só muda o que precisa) ----------
        const seats = $('un-seats');
        const have = {}; qa(seats, '.un-seat').forEach(s => { have[s.dataset.pid] = s; });
        const keep = {};
        G.order.forEach((o, i) => {
          const p = ply(o.pid); if (!p) return;
          keep[o.pid] = true;
          let s = have[o.pid];
          if (!s) {
            s = document.createElement('div'); s.className = 'un-seat'; s.dataset.pid = o.pid;
            s.innerHTML = `<div class="un-fan"></div><div class="un-av"><span></span><i></i><b></b></div><div class="un-name"></div><div class="un-count"></div><div class="un-timer"><i></i></div><div class="un-x">⊘</div>`;
            seats.appendChild(s);
          }
          const at = pos[o.pid];
          s.style.left = at.x + '%'; s.style.top = at.y + '%';
          const col = c.ci(p.color);
          const av = s.querySelector('.un-av');
          const avh = c.avatar(p, Math.round(window.innerWidth * 0.06));
          const ai = av.children[1]; if (ai.dataset.k !== avh) { ai.dataset.k = avh; ai.innerHTML = avh; }
          const nm = s.querySelector('.un-name'); const nome = p.name + (p.on === false ? ' (fora)' : ''); if (nm.textContent !== nome) nm.textContent = nome;
          nm.style.background = col.hex;
          const cnt = s.querySelector('.un-count'); const ch = `<b>${o.n}</b> ${o.n === 1 ? 'carta' : 'cartas'}${o.n === 1 ? (o.said ? ' · UNO!' : ' · sem UNO!') : ''}`;
          if (cnt.innerHTML !== ch) cnt.innerHTML = ch;
          const fan = s.querySelector('.un-fan'); const k = Math.min(o.n, 9);
          if (Number(fan.dataset.k) !== k) {
            fan.dataset.k = k;
            fan.innerHTML = Array.from({ length: k }, (_, j) => `<i style="transform:rotate(${(j - (k - 1) / 2) * 9}deg)"></i>`).join('');
          }
          s.classList.toggle('now', G.turn === o.pid && emJogo);
          s.classList.toggle('uno', o.n === 1 && emJogo);
          s.classList.toggle('off', p.on === false);
        });
        for (const pid in have) if (!keep[pid]) have[pid].remove();

        // ---------- animações do que aconteceu ----------
        if (prev && emJogo) {
          if (!trocaMaos) compras.forEach(cp => {
            if (!pos[cp.pid]) return;
            const k = Math.min(cp.k, 4);
            for (let j = 0; j < k; j++) fly(backHtml('sm'), DECK, pos[cp.pid], { back: true, delay: j * 110, rot0: 0, rot1: (j - 1) * 12, s0: 1, s1: .45 });
            c.beep(300, .06, 'sine', .08);
            if (cp.k >= 2) burst('+' + cp.k, '#0f0f14', '#ffce1f');
          });
          if (trocaMaos) burst('Trocou tudo!', '#0f0f14', '#b08cff');
          if (inverteu) { burst('Inverteu!', '#0f0f14', '#3db4f2'); c.chord([660, 440], 'square'); }
          if (jogada && jogada.card.v === 'skip' && n > 2) {   // quem foi pulado: o próximo de quem jogou, no sentido de agora
            const i = G.order.findIndex(o => o.pid === jogada.pid);
            const alvo = G.order[((i + (G.dir > 0 ? 1 : -1)) % n + n) % n];
            const s = alvo && have[alvo.pid] || (alvo && seats.querySelector(`[data-pid="${alvo.pid}"]`));
            if (s) { s.classList.remove('skipped'); void s.offsetWidth; s.classList.add('skipped'); }
            burst('Pulou!', '#0f0f14', '#ffce1f');
          }
          for (const o of G.order) if (o.said && o.n === 1 && !(prev.said[o.pid])) { burst('UNO!', '#ffce1f', '#0f0f14'); c.chord([784, 988, 1175]); }
        }
        if (novaRodada && emJogo) {   // distribuição: 3 cartas voam do monte para cada cadeira
          G.order.forEach((o, i) => { for (let j = 0; j < 3; j++) fly(backHtml('sm'), DECK, pos[o.pid], { back: true, delay: (i * 3 + j) * 70, s0: 1, s1: .45, rot1: (j - 1) * 10 }); });
        }

        $('un-msg').innerHTML = c.C.event ? c.hl(c.C.event.text) : '';

        // ---------- por cima da mesa: regras / placar / fim ----------
        const over = $('un-over');
        let h = '';
        if (G.phase === 'setup') {
          const rg = (on, txt) => `<div class="un-rule ${on ? 'on' : 'offr'}">${on ? '✓' : '✕'} ${txt}</div>`;
          h = `<div class="un-over"><div class="un-card"><span class="un-kick">Antes de começar</span><h2>Regras do UNO</h2>
            <div class="un-rules">
              ${rg(G.cfg.stack, 'Acumular +2 / +4')}
              ${rg(G.cfg.sevenzero, '7 e 0')}
              <div class="un-rule">${G.cfg.target ? 'Até <b>' + G.cfg.target + '</b> pontos' : 'Uma rodada só'}</div>
              <div class="un-rule">${G.cfg.turnSec ? '<b>' + G.cfg.turnSec + 's</b> por vez' : 'Sem tempo'}</div>
            </div>
            <p class="un-hint">Ajustem no celular e toquem em Começar</p></div></div>`;
        } else if (G.phase === 'round' || G.phase === 'end') {
          const ordem = c.C.players.slice().sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0));
          const w = ply(G.phase === 'end' ? G.winner : G.roundWinner);
          h = `<div class="un-over"><div class="un-card"><span class="un-kick">${G.phase === 'end' ? 'Fim de jogo' : 'Fim da rodada ' + G.round}</span>
            <h2>${w ? `<span class="nm" style="background:${c.ci(w.color).hex};color:#0f0f14">${esc(w.name)}</span>` : ''} ${G.phase === 'end' ? 'venceu!' : 'bateu!'}</h2>
            <div class="un-sc">${ordem.map((p, i) => `<div class="${i === 0 ? 'lead' : ''}"><span class="pos">${i + 1}</span>${c.avatar(p, Math.round(window.innerWidth * 0.022))}<span>${esc(p.name)}</span>
              <span class="pts">${G.scores[p.pid] || 0}${G.roundScores[p.pid] ? `<span class="plus">+${G.roundScores[p.pid]}</span>` : ''}</span></div>`).join('')}</div>
            <p class="un-hint">${G.phase === 'end' ? 'Toquem em Jogar de novo no celular' : 'Toquem em Próxima rodada no celular'}</p></div></div>`;
        }
        if (over.innerHTML !== h) over.innerHTML = h;

        // sons dos momentos: fim de rodada e fim de jogo
        const k2 = `${G.phase}:${G.round}:${G.roundWinner || ''}`;
        if (k2 !== prevKey2) {
          if (G.phase === 'end') c.chord([523, 659, 784, 1046]);
          else if (G.phase === 'round') c.chord([659, 880]);
          prevKey2 = k2;
        }

        // guarda o estado para a próxima comparação
        const ns = {}, said = {};
        for (const o of G.order) { ns[o.pid] = o.n; said[o.pid] = o.said; }
        prev = { n: ns, said, dir: G.dir, round: G.round, top: G.top, lastAt: G.lastPlay ? G.lastPlay.at : null };
      },
    },
  });
})();
