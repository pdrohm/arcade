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
  const HEX = { r: '#ef4444', y: '#facc15', g: '#22c55e', b: '#3b82f6', w: '#111827' };
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
    return { x: 50 + 41 * Math.cos(ang), y: 47 + 37 * Math.sin(ang) };
  };
  const DECK = { x: 42.5, y: 47 }, PILHA = { x: 56, y: 47 };

  const style = `
    .un-table { position:absolute; top:0; left:0; right:0; bottom:0; border-radius:2vw; overflow:hidden;
      background:radial-gradient(60% 60% at 50% 45%,#1d6b45,#0d3c27 70%,#082718);
      box-shadow:inset 0 0 0 .5vw #0f2a1c, inset 0 0 5vw rgba(0,0,0,.6), 0 1.5vw 3.5vw rgba(0,0,0,.6); }

    /* ---- carta ---- */
    .uc { position:relative; width:8.4vw; height:12.6vw; border-radius:12%; background:#fff; overflow:hidden;
      box-shadow:0 .4vw 1vw rgba(0,0,0,.45), inset 0 0 0 .3vw #fff; display:flex; align-items:center; justify-content:center; }
    .uc .o { position:absolute; left:9%; top:11%; width:82%; height:78%; border-radius:50%; background:rgba(255,255,255,.18); transform:rotate(-22deg); }
    .uc .o.rb { background:${ARCO_TV}; opacity:.9; }
    .uc .o.rb { background:${ARCO}; } /* tv-ok: linear antes */
    .uc .v { position:relative; font-weight:900; font-size:4.9vw; line-height:1; color:#fff; letter-spacing:-.1vw; text-shadow:.1vw .15vw 0 rgba(0,0,0,.4), 0 0 .5vw rgba(0,0,0,.25); }
    .uc .tl, .uc .br { position:absolute; font-weight:900; font-size:1.7vw; color:rgba(255,255,255,.87); }
    .uc .tl { left:8%; top:5%; } .uc .br { right:8%; bottom:5%; transform:rotate(180deg); }
    .uc.back { background:#111827; }
    .uc.back .o { background:${ARCO_TV}; opacity:.85; }
    .uc.back .o { background:${ARCO}; } /* tv-ok: linear antes */
    .uc.back .v { font-size:2.2vw; letter-spacing:.1vw; }
    .uc.sm { width:6.2vw; height:9.3vw; box-shadow:0 .25vw .6vw rgba(0,0,0,.45), inset 0 0 0 .22vw #fff; }
    .uc.sm .v { font-size:1.6vw; }
    .uc.play { animation:unpop .45s cubic-bezier(.2,1.4,.4,1); }
    @keyframes unpop { 0% { transform:translateY(-2vw) rotate(-14deg) scale(.6); opacity:0; } 60% { transform:translateY(0) rotate(4deg) scale(1.12); } 100% { transform:none; } }

    /* ---- centro: monte + pilha ---- */
    .un-center { position:absolute; left:50%; top:47%; width:0; height:0; }
    .un-deck { position:absolute; left:-7.5vw; top:-4.65vw; margin-left:-3.1vw; width:6.2vw; height:9.3vw; }
    .un-deck .uc { position:absolute; left:0; top:0; }
    .un-deck .uc.d2 { left:.25vw; top:-.25vw; } .un-deck .uc.d3 { left:.5vw; top:-.5vw; }
    .un-deckn { position:absolute; left:50%; top:10.2vw; transform:translateX(-50%); font-size:1.05vw; font-weight:800; color:#cfe9d9; white-space:nowrap; }
    .un-pile { position:absolute; left:6vw; top:-6.3vw; margin-left:-4.2vw; width:8.4vw; height:12.6vw; }
    .un-ring { position:absolute; left:50%; top:50%; width:15vw; height:15vw; margin:-7.5vw 0 0 -7.5vw; border-radius:50%; opacity:.55;
      transition:background .5s, box-shadow .5s; }
    .un-prev { position:absolute; left:0; top:0; transform:rotate(-9deg) translate(-.6vw,.2vw); opacity:.7; }
    .un-top { position:absolute; left:0; top:0; }
    .un-pend { position:absolute; right:-1.6vw; top:-1.4vw; padding:.35vw .9vw; border-radius:99px; background:#facc15; color:#1a1400; font-weight:900; font-size:1.6vw;
      box-shadow:0 .3vw .8vw rgba(0,0,0,.5); animation:unpulse .8s infinite alternate; }
    @keyframes unpulse { to { transform:scale(1.12); } }
    .un-colorlab { position:absolute; left:50%; top:47%; margin-top:8vw; transform:translateX(-50%); display:flex; align-items:center; font-size:1.35vw; font-weight:800; color:#cfe9d9; white-space:nowrap; }
    .un-colorlab i { width:1.5vw; height:1.5vw; border-radius:50%; margin-right:.6vw; box-shadow:0 0 .8vw rgba(0,0,0,.5); }

    /* ---- sentido da rodada: anel de setas girando ---- */
    .un-dir { position:absolute; left:50%; top:47%; width:32vw; height:32vw; margin:-16vw 0 0 -16vw; border-radius:50%; border:.25vw dashed rgba(255,255,255,.14); pointer-events:none; }
    .un-dir i { position:absolute; font-size:2.2vw; line-height:1; color:rgba(255,255,255,.55); font-style:normal; }
    .un-dir .a1 { left:50%; top:-1.3vw; margin-left:-.6vw; transform:rotate(0deg); }
    .un-dir .a2 { right:-1.3vw; top:50%; margin-top:-.9vw; transform:rotate(90deg); }
    .un-dir .a3 { left:50%; bottom:-1.3vw; margin-left:-.6vw; transform:rotate(180deg); }
    .un-dir .a4 { left:-1.3vw; top:50%; margin-top:-.9vw; transform:rotate(270deg); }
    .un-dir.ccw i { transform:scaleX(-1) rotate(0deg); }
    .un-dir.ccw .a2 { transform:scaleX(-1) rotate(-90deg); } .un-dir.ccw .a3 { transform:scaleX(-1) rotate(180deg); } .un-dir.ccw .a4 { transform:scaleX(-1) rotate(90deg); }
    .un-dir.cw { animation:unspin 16s linear infinite; } .un-dir.ccw { animation:unspinb 16s linear infinite; }
    @keyframes unspin { to { transform:rotate(360deg); } }
    @keyframes unspinb { to { transform:rotate(-360deg); } }

    /* ---- cadeiras: leque de cartas, avatar, nome, contagem ---- */
    .un-seat { position:absolute; width:12vw; margin-left:-6vw; margin-top:-5.2vw; text-align:center; transition:opacity .4s; }
    .un-seat.off { opacity:.45; }
    .un-fan { position:relative; height:3.4vw; margin-bottom:.2vw; }
    .un-fan i { position:absolute; left:50%; bottom:0; width:1.9vw; height:2.85vw; margin-left:-.95vw; border-radius:16%; background:#111827;
      box-shadow:0 .15vw .4vw rgba(0,0,0,.5), inset 0 0 0 .12vw rgba(255,255,255,.3); transform-origin:50% 130%; }
    .un-fan i:after { content:''; position:absolute; left:15%; top:15%; width:70%; height:70%; border-radius:50%; background:${ARCO_TV}; opacity:.75; transform:rotate(-22deg); }
    .un-fan i:after { background:${ARCO}; } /* tv-ok: linear antes */
    .un-av { position:relative; width:4.4vw; height:4.4vw; margin:0 auto; border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-size:2vw; font-weight:900; box-shadow:0 .4vw 1vw rgba(0,0,0,.5); transition:transform .3s; }
    .un-av b { position:absolute; left:-.45vw; top:-.45vw; right:-.45vw; bottom:-.45vw; border-radius:50%; border:.35vw solid #fff; opacity:0; transition:opacity .3s; }
    .un-seat.now .un-av { transform:scale(1.12); }
    .un-seat.now .un-av b { opacity:1; animation:unring 1.1s ease-in-out infinite alternate; }
    @keyframes unring { from { box-shadow:0 0 0 0 rgba(255,255,255,.6); } to { box-shadow:0 0 0 .7vw rgba(255,255,255,0); } }
    .un-name { margin-top:.5vw; font-size:1.25vw; font-weight:900; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 .1vw .5vw rgba(0,0,0,.7); }
    .un-count { display:inline-block; margin-top:.3vw; padding:.2vw .9vw; border-radius:99px; background:rgba(0,0,0,.45); color:#cfe9d9; font-size:1.05vw; font-weight:800; white-space:nowrap; }
    .un-count b { color:#fff; font-size:1.3vw; }
    .un-seat.uno .un-count { background:#facc15; color:#1a1400; animation:unblink .7s infinite alternate; }
    .un-seat.uno .un-count b { color:#1a1400; }
    @keyframes unblink { to { opacity:.45; } }
    .un-timer { height:.4vw; margin:.4vw auto 0; width:7vw; border-radius:99px; background:rgba(0,0,0,.4); overflow:hidden; opacity:0; transition:opacity .3s; }
    .un-seat.now .un-timer.on { opacity:1; }
    .un-timer i { display:block; height:100%; width:100%; background:#22c55e; transition:width .25s linear; }
    .un-timer i.low { background:#ef4444; }
    .un-seat .un-x { position:absolute; left:50%; top:1vw; margin-left:-2.2vw; width:4.4vw; height:4.4vw; border-radius:50%; background:rgba(239,68,68,.92); color:#fff;
      font-size:3vw; font-weight:900; line-height:4.4vw; opacity:0; pointer-events:none; }
    .un-seat.skipped .un-x { animation:unx 1.2s ease-out; }
    @keyframes unx { 0% { opacity:0; transform:scale(.4); } 20% { opacity:1; transform:scale(1.15); } 70% { opacity:1; transform:scale(1); } 100% { opacity:0; } }

    /* ---- carta voando (jogou / comprou) ---- */
    .un-fly { position:absolute; z-index:6; margin-left:-3.1vw; margin-top:-4.65vw; transition:left .55s cubic-bezier(.2,.8,.2,1), top .55s cubic-bezier(.2,.8,.2,1), transform .55s cubic-bezier(.2,.8,.2,1), opacity .2s; }
    .un-fly.back { margin-left:-.95vw; margin-top:-1.4vw; }
    /* ---- estouro no centro: "Inverteu!", "+4", "UNO!" ---- */
    .un-burst { position:absolute; left:50%; top:30%; transform:translate(-50%,-50%); z-index:7; padding:.8vw 2.4vw; border-radius:1.4vw; background:#fff; color:#111;
      font-size:3.4vw; font-weight:900; white-space:nowrap; box-shadow:0 1vw 3vw rgba(0,0,0,.6); animation:unburst 1.1s cubic-bezier(.2,1.3,.3,1) both; pointer-events:none; }
    @keyframes unburst { 0% { opacity:0; transform:translate(-50%,-50%) scale(.3) rotate(-8deg); } 25% { opacity:1; transform:translate(-50%,-50%) scale(1.08) rotate(2deg); } 75% { opacity:1; transform:translate(-50%,-50%) scale(1); } 100% { opacity:0; transform:translate(-50%,-60%) scale(.9); } }

    .un-msg { position:absolute; left:6%; right:6%; bottom:.8vw; text-align:center; font-size:1.3vw; font-weight:800; color:#eafff4; text-shadow:0 .1vw .5vw #000; }

    /* ---- por cima da mesa: regras / fim de rodada / fim de jogo ---- */
    .un-over { position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(4,8,7,.96); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2vw; text-align:center; }
    .un-over > * + * { margin-top:1.2vw; }
    .un-over h2 { font-size:3.4vw; }
    .un-rules { display:flex; flex-wrap:wrap; justify-content:center; margin:-.4vw; }
    .un-rule { margin:.4vw; padding:.7vw 1.4vw; border-radius:.9vw; background:#132a20; border:1px solid #2a5c44; font-size:1.3vw; font-weight:800; }
    .un-sc { display:flex; flex-direction:column; width:36vw; }
    .un-sc > * + * { margin-top:.6vw; }
    .un-sc div { display:flex; align-items:center; font-size:1.7vw; background:#0e2018; padding:.6vw 1.1vw; border-radius:.9vw; }
    .un-sc div > * + * { margin-left:.9vw; }
    .un-sc div span:last-child { margin-left:auto; font-weight:900; }
  `;

  const cardHtml = (card, cls) => {
    if (!card) return '';
    const bg = card.c === 'w' ? '#111827' : HEX[card.c];
    return `<div class="uc ${cls || ''}" style="background:${bg}"><i class="o ${card.c === 'w' ? 'rb' : ''}"></i>
      <span class="tl">${face(card)}</span><span class="v">${face(card)}</span><span class="br">${face(card)}</span></div>`;
  };
  const backHtml = cls => `<div class="uc back ${cls || ''}"><i class="o"></i><span class="v">UNO</span></div>`;

  // memória entre estados (para descobrir o que aconteceu)
  let prev = null, timerT = null, topTimer = null, lastKey = '', prevKey2 = '';
  const $ = id => document.getElementById(id);

  function burst(txt, cor, fundo) {
    const t = $('un-table'); if (!t) return;
    const b = document.createElement('div'); b.className = 'un-burst'; b.textContent = txt;
    if (fundo) { b.style.background = fundo; b.style.color = cor || '#fff'; }
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
        let side = `<div class="box center"><div style="font-size:30px;font-weight:900">🃏 UNO</div>
          <p class="sub mut" style="margin-top:4px">${G.phase === 'setup' ? 'Ajustando as regras' : `Rodada ${G.round} · ${alvo}`}</p></div>`;
        side += `<div class="box"><p class="sub mut" style="margin-bottom:8px">Placar</p>${c.playersHtml({
          info: p => {
            const o = G.order.find(x => x.pid === p.pid);
            return `${o ? o.n + ' 🃏 · ' : ''}${G.scores[p.pid] || 0} pts`;
          },
          border: p => (G.turn === p.pid ? '#ffffff' : null),
        })}</div>`;
        side += `<div class="box"><p class="sub mut" style="margin-bottom:6px">Regras</p>
          <p class="sub">${G.cfg.stack ? '✅' : '❌'} acumular +2/+4 &nbsp; ${G.cfg.sevenzero ? '✅' : '❌'} 7 e 0<br>
          ⏱ ${G.cfg.turnSec ? G.cfg.turnSec + 's por vez' : 'sem tempo'} · 🎯 ${esc(alvo)}</p></div>`;
        if (G.phase === 'play' && G.cfg.turnSec) side += c.timerHtml('', G.turnMs);
        side += `<div class="event" style="margin-top:auto">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
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
        if (G.color && emJogo) { ring.style.background = HEX[G.color]; ring.style.boxShadow = `0 0 4vw ${HEX[G.color]}`; ring.style.opacity = '.55'; }
        else ring.style.opacity = '0';
        $('un-pendbox').innerHTML = G.pending ? `<div class="un-pend">+${G.pending}</div>` : '';
        $('un-colorlab').innerHTML = G.color && emJogo ? `<i style="background:${HEX[G.color]}"></i>cor atual: ${NOME[G.color]}${G.phase === 'color' ? ' → escolhendo…' : ''}` : '';

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
            s.innerHTML = `<div class="un-fan"></div><div class="un-av"><span></span><b></b></div><div class="un-name"></div><div class="un-count"></div><div class="un-timer"><i></i></div><div class="un-x">⊘</div>`;
            seats.appendChild(s);
          }
          const at = pos[o.pid];
          s.style.left = at.x + '%'; s.style.top = at.y + '%';
          const col = c.ci(p.color);
          const av = s.querySelector('.un-av'); av.style.background = col.hex; av.style.color = col.dark ? '#fff' : '#111';
          av.firstElementChild.textContent = (p.name.match(/[A-Za-z0-9À-ɏ]/) || ['?'])[0].toUpperCase();
          const nm = s.querySelector('.un-name'); const nome = p.name + (p.on === false ? ' 📵' : ''); if (nm.textContent !== nome) nm.textContent = nome;
          const cnt = s.querySelector('.un-count'); const ch = `<b>${o.n}</b> ${o.n === 1 ? 'carta' : 'cartas'}${o.n === 1 ? (o.said ? ' · UNO!' : ' · sem UNO ⚠️') : ''}`;
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
            if (cp.k >= 2) burst('+' + cp.k, '#1a1400', '#facc15');
          });
          if (trocaMaos) burst('Trocou tudo!', '#fff', '#a855f7');
          if (inverteu) { burst('Inverteu!', '#fff', '#3b82f6'); c.chord([660, 440], 'square'); }
          if (jogada && jogada.card.v === 'skip' && n > 2) {   // quem foi pulado: o próximo de quem jogou, no sentido de agora
            const i = G.order.findIndex(o => o.pid === jogada.pid);
            const alvo = G.order[((i + (G.dir > 0 ? 1 : -1)) % n + n) % n];
            const s = alvo && have[alvo.pid] || (alvo && seats.querySelector(`[data-pid="${alvo.pid}"]`));
            if (s) { s.classList.remove('skipped'); void s.offsetWidth; s.classList.add('skipped'); }
            burst('Pulou!', '#fff', '#ef4444');
          }
          for (const o of G.order) if (o.said && o.n === 1 && !(prev.said[o.pid])) { burst('UNO!', '#1a1400', '#facc15'); c.chord([784, 988, 1175]); }
        }
        if (novaRodada && emJogo) {   // distribuição: 3 cartas voam do monte para cada cadeira
          G.order.forEach((o, i) => { for (let j = 0; j < 3; j++) fly(backHtml('sm'), DECK, pos[o.pid], { back: true, delay: (i * 3 + j) * 70, s0: 1, s1: .45, rot1: (j - 1) * 10 }); });
        }

        $('un-msg').innerHTML = c.C.event ? c.hl(c.C.event.text) : '';

        // ---------- por cima da mesa: regras / placar / fim ----------
        const over = $('un-over');
        let h = '';
        if (G.phase === 'setup') {
          h = `<div class="un-over"><div class="big-emoji">🃏</div><h2>Regras do UNO</h2>
            <div class="un-rules">
              <div class="un-rule">${G.cfg.stack ? '✅' : '❌'} Acumular +2 / +4</div>
              <div class="un-rule">${G.cfg.sevenzero ? '✅' : '❌'} 7 e 0</div>
              <div class="un-rule">🎯 ${G.cfg.target ? 'Até ' + G.cfg.target + ' pontos' : 'Uma rodada só'}</div>
              <div class="un-rule">⏱ ${G.cfg.turnSec ? G.cfg.turnSec + 's por vez' : 'Sem tempo'}</div>
            </div>
            <p class="sub mut">Ajustem no celular e toquem em "Começar".</p></div>`;
        } else if (G.phase === 'round' || G.phase === 'end') {
          const ordem = c.C.players.slice().sort((a, b) => (G.scores[b.pid] || 0) - (G.scores[a.pid] || 0));
          const w = ply(G.phase === 'end' ? G.winner : G.roundWinner);
          h = `<div class="un-over"><div class="big-emoji">${G.phase === 'end' ? '🏆' : '🏁'}</div>
            <h2>${w ? esc(w.name) : ''} ${G.phase === 'end' ? 'venceu!' : 'bateu a rodada!'}</h2>
            <div class="un-sc">${ordem.map(p => `<div><span class="dot" style="background:${c.ci(p.color).hex}"></span><span>${esc(p.name)}</span>
              <span>${G.scores[p.pid] || 0}${G.roundScores[p.pid] ? ` <b style="color:#22c55e">(+${G.roundScores[p.pid]})</b>` : ''}</span></div>`).join('')}</div>
            <p class="sub mut">${G.phase === 'end' ? 'Toquem em "Jogar de novo" no celular.' : 'Toquem em "Próxima rodada" no celular.'}</p></div>`;
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
