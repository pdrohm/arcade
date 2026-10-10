// Te Fode na TV: a mesa. Cadeiras em volta, cada carta jogada VOA da cadeira até a frente dela,
// a vira e a manilha no meio, palpites e vidas em cada cadeira. A TV nunca mostra a mão de ninguém.
//
// Feita para a TV da sala (Chrome 47): tamanhos em vw, nada de var()/clamp()/gap/grid/inset.
// Ver docs/TV-ANTIGA.md. Como no UNO, a mesa é montada uma vez (mount) e atualizada por dentro
// (after); as animações nascem da diferença entre o estado anterior e o novo.
'use strict';
(() => {
  const SUIT = { S: ['♠', 'Espadas'], H: ['♥', 'Copas'], D: ['♦', 'Ouros'], C: ['♣', 'Paus'] };
  const rank = n => n === 1 ? 'A' : n === 10 ? 'Q' : n === 11 ? 'J' : n === 12 ? 'K' : String(n);
  const qa = (raiz, sel) => Array.prototype.slice.call(raiz.querySelectorAll(sel));
  const has = (lista, x) => (lista || []).indexOf(x) >= 0;

  // Cadeiras numa elipse (em % da mesa), do topo, no sentido horário. A carta jogada fica no meio do caminho até o centro.
  const MEIO = { x: 50, y: 44 };
  const cadeira = (i, n) => {
    const ang = (-90 + i * 360 / Math.max(1, n)) * Math.PI / 180;
    return { x: MEIO.x + 41 * Math.cos(ang), y: MEIO.y + 33 * Math.sin(ang) };
  };
  const vaga = p => ({ x: MEIO.x + (p.x - MEIO.x) * .52, y: MEIO.y + (p.y - MEIO.y) * .5 });

  const style = `
    .tfv-table { position:absolute; top:0; left:0; right:0; bottom:0; overflow:hidden; border-radius:2vw; color:#fff9ec;
      background:radial-gradient(ellipse at 50% 44%,#2b4f80 0%,#1a3359 58%,#0f1e3b 100%);
      box-shadow:inset 0 0 0 1.1vw #142343, inset 0 0 0 1.3vw #cc7f62, inset 0 0 6vw rgba(0,0,0,.55); }
    .tfv-table:before { content:''; position:absolute; top:22%; left:24%; width:52%; height:46%; border:.15vw solid rgba(255,190,126,.2); border-radius:50%; }
    .tfv-brand { position:absolute; top:3%; left:3%; color:#ffbc7d; font-size:1.35vw; font-weight:900; letter-spacing:.18em; }
    .tfv-round { position:absolute; top:3%; right:3%; color:#ffbc7d; font-size:1.15vw; font-weight:900; letter-spacing:.08em; text-transform:uppercase; text-align:right; }
    .tfv-round small { display:block; color:#d9dfed; font-size:.9vw; letter-spacing:.02em; text-transform:none; margin-top:.2vw; }

    /* ---- carta ---- */
    .tfc { position:relative; width:4.6vw; height:6.6vw; border:.2vw solid #ddd2bd; border-radius:.6vw; background:#fff9ed; color:#172947;
      box-shadow:0 .35vw 0 #a7a29d, 0 .6vw 1.2vw rgba(0,0,0,.4); }
    .tfc.red { color:#bb403e; }
    .tfc .n { position:absolute; top:.25vw; left:.35vw; font-size:1vw; font-weight:900; line-height:1; text-align:center; }
    .tfc .s { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:2.7vw; line-height:1; }
    .tfc .lab { position:absolute; left:.1vw; right:.1vw; bottom:.3vw; font-size:.52vw; font-weight:900; text-transform:uppercase; letter-spacing:.06em; text-align:center; }
    .tfc .mn { position:absolute; top:-.7vw; right:-.7vw; padding:.15vw .45vw; border-radius:99px; background:#ffcf72; color:#3a2410; font-size:.7vw; font-weight:900; box-shadow:0 .15vw .4vw rgba(0,0,0,.4); }
    .tfc.back { background:repeating-linear-gradient(45deg,#cf624a,#cf624a .3vw,#8b3850 .3vw,#8b3850 .6vw); border-color:#f2dbc1; }
    .tfc.sm { width:2vw; height:2.9vw; border-width:.12vw; border-radius:.3vw; box-shadow:0 .15vw .4vw rgba(0,0,0,.5); }

    /* ---- centro: vira e manilha ---- */
    .tfv-vira { position:absolute; left:50%; top:44%; width:12vw; margin-left:-6vw; margin-top:-4.6vw; text-align:center; }
    .tfv-vira .tfc { margin:0 auto; width:3.6vw; height:5.2vw; transform:rotate(-6deg); }
    .tfv-vira .tfc .s { font-size:2.1vw; } .tfv-vira .tfc .lab { display:none; }
    .tfv-vira p { margin-top:.5vw; font-size:.85vw; font-weight:900; color:#ffdcaf; letter-spacing:.08em; text-transform:uppercase; }
    .tfv-vira b { display:inline-block; margin-top:.25vw; padding:.2vw .8vw; border-radius:99px; background:#ffcf72; color:#3a2410; font-size:1.05vw; font-weight:900; }
    .tfv-surpresa { position:absolute; left:50%; top:62%; transform:translateX(-50%); padding:.4vw 1.2vw; border-radius:99px; background:rgba(0,0,0,.35); color:#ffdcaf; font-size:.95vw; font-weight:800; white-space:nowrap; }

    /* ---- cartas jogadas: uma vaga na frente de cada cadeira ---- */
    .tfv-slot { position:absolute; width:4.6vw; height:6.6vw; margin-left:-2.3vw; margin-top:-3.3vw; transition:opacity .3s, transform .3s; }
    .tfv-slot.wait { opacity:0; }
    .tfv-slot .ord { position:absolute; left:-.7vw; top:-.7vw; width:1.5vw; height:1.5vw; border-radius:50%; background:#0f1e3b; border:.12vw solid #ffbc7d; color:#ffbc7d; font-size:.75vw; font-weight:900; line-height:1.3vw; text-align:center; z-index:2; }
    .tfv-slot.win .tfc { border-color:#ffcf72; box-shadow:0 0 0 .35vw rgba(255,207,114,.45), 0 0 2.4vw rgba(255,207,114,.7); }
    .tfv-slot.win { transform:translateY(-.6vw) scale(1.12); z-index:3; }
    .tfv-slot.lose { opacity:.55; }
    .tfv-slot .stamp { position:absolute; left:50%; top:50%; padding:.2vw .5vw; border-radius:.3vw; border:.15vw solid #ff6b5a; color:#ff6b5a; background:rgba(255,249,236,.92);
      font-size:.85vw; font-weight:900; letter-spacing:.06em; transform:translate(-50%,-50%) rotate(-18deg); white-space:nowrap; animation:tfvstamp .45s cubic-bezier(.2,1.4,.4,1) both; }
    .tfv-slot .crown { position:absolute; left:50%; top:-2.1vw; margin-left:-1vw; width:2vw; text-align:center; font-size:1.6vw; line-height:1; animation:tfvpop .5s cubic-bezier(.2,1.4,.4,1) both; }
    @keyframes tfvstamp { from { opacity:0; transform:translate(-50%,-50%) rotate(-18deg) scale(2.2); } to { opacity:1; transform:translate(-50%,-50%) rotate(-18deg) scale(1); } }
    @keyframes tfvpop { 0% { opacity:0; transform:scale(.3); } 60% { opacity:1; transform:scale(1.25); } 100% { transform:scale(1); } }

    /* ---- cadeiras ---- */
    .tfv-seat { position:absolute; width:11vw; margin-left:-5.5vw; margin-top:-4.6vw; text-align:center; transition:opacity .4s; }
    .tfv-seat.off { opacity:.38; }
    .tfv-av { position:relative; width:4.2vw; height:4.2vw; margin:0 auto; border-radius:50%; transition:transform .3s; }
    .tfv-av > i { display:block; line-height:0; }
    .tfv-av > b { position:absolute; left:-.4vw; top:-.4vw; right:-.4vw; bottom:-.4vw; border-radius:50%; border:.3vw solid #ffbc7d; opacity:0; transition:opacity .3s; }
    .tfv-seat.now .tfv-av { transform:scale(1.14); }
    .tfv-seat.now .tfv-av > b { opacity:1; animation:tfvring 1.1s ease-in-out infinite alternate; }
    .tfv-seat.won .tfv-av > b { opacity:1; border-color:#ffcf72; }
    @keyframes tfvring { from { box-shadow:0 0 0 0 rgba(255,188,125,.7); } to { box-shadow:0 0 0 .8vw rgba(255,188,125,0); } }
    .tfv-ord { position:absolute; left:1.4vw; top:-.3vw; min-width:1.7vw; height:1.7vw; padding:0 .3vw; border-radius:99px; background:#0f1e3b; border:.12vw solid #ffbc7d; color:#ffbc7d; font-size:.85vw; font-weight:900; line-height:1.5vw; z-index:2; }
    .tfv-seat.now .tfv-ord { background:#ffbc7d; color:#24304b; }
    .tfv-dealer { position:absolute; right:1.4vw; top:-.3vw; width:1.7vw; height:1.7vw; border-radius:50%; background:#fff9ec; color:#24304b; font-size:.85vw; font-weight:900; line-height:1.7vw; z-index:2; box-shadow:0 .15vw .4vw rgba(0,0,0,.4); }
    .tfv-name { margin-top:.5vw; font-size:1.15vw; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 .1vw .5vw rgba(0,0,0,.7); }
    .tfv-lives { margin-top:.1vw; font-size:.95vw; letter-spacing:.1vw; color:#ff6b7d; line-height:1.1; }
    .tfv-lives i { font-style:normal; opacity:.22; color:#d9dfed; }
    .tfv-chip { display:inline-block; margin-top:.3vw; padding:.15vw .8vw; border-radius:99px; background:rgba(0,0,0,.45); color:#d9dfed; font-size:.9vw; font-weight:800; white-space:nowrap; }
    .tfv-chip b { color:#fff; font-size:1.15vw; }
    .tfv-chip.hit { background:#2f6d4a; color:#d9f5e2; }
    .tfv-chip.over { background:#8a3340; color:#ffe1e1; }
    .tfv-chip.pop { animation:tfvpop .5s cubic-bezier(.2,1.4,.4,1); }
    .tfv-fan { position:relative; height:1.6vw; margin-top:.35vw; }
    .tfv-fan i { position:absolute; left:50%; top:0; width:1.1vw; height:1.6vw; margin-left:-.55vw; border-radius:.2vw; border:.1vw solid #f2dbc1;
      background:repeating-linear-gradient(45deg,#cf624a,#cf624a .2vw,#8b3850 .2vw,#8b3850 .4vw); transform-origin:50% 120%; }
    .tfv-out { display:none; margin-top:.3vw; font-size:.9vw; font-weight:900; color:#ff9b8f; letter-spacing:.1em; }
    .tfv-seat.off .tfv-out { display:block; } .tfv-seat.off .tfv-chip, .tfv-seat.off .tfv-fan { display:none; }

    /* ---- carta voando ---- */
    .tfv-fly { position:absolute; z-index:6; margin-left:-2.3vw; margin-top:-3.3vw; transition:left .55s cubic-bezier(.2,.8,.2,1), top .55s cubic-bezier(.2,.8,.2,1), transform .55s cubic-bezier(.2,.8,.2,1), opacity .2s; }
    .tfv-fly.back { margin-left:-1vw; margin-top:-1.45vw; }

    /* ---- faixa de baixo: de quem é a vez ---- */
    .tfv-hud { position:absolute; left:8%; right:8%; bottom:3.2%; text-align:center; }
    .tfv-prompt { font-size:2.1vw; font-weight:900; line-height:1.1; text-shadow:0 .3vw .9vw rgba(0,0,0,.6); }
    .tfv-prompt.hot { color:#ffcf72; animation:tfvpop .45s ease-out both; }
    .tfv-sub { margin-top:.35vw; color:#ffdcaf; font-size:1.05vw; font-weight:800; }
    .tfv-sub em { font-style:normal; display:inline-block; margin-left:.5vw; padding:.1vw .7vw; border-radius:99px; background:#8a3340; color:#ffe1e1; }
    .tfv-progress { width:30%; height:.3vw; margin:.6vw auto 0; border-radius:99px; background:rgba(255,255,255,.2); overflow:hidden; }
    .tfv-progress i { display:block; width:100%; height:100%; background:#ffcf72; transform-origin:left; animation-name:tfvcount; animation-timing-function:linear; animation-fill-mode:forwards; }
    @keyframes tfvcount { from { transform:scaleX(1); } to { transform:scaleX(0); } }

    /* ---- estouro no centro ---- */
    .tfv-burst { position:absolute; left:50%; top:30%; z-index:8; padding:.8vw 2.4vw; border-radius:1.4vw; background:#fff9ec; color:#24304b; text-align:center;
      font-size:3vw; font-weight:900; white-space:nowrap; box-shadow:0 1vw 3vw rgba(0,0,0,.6); transform:translate(-50%,-50%); animation:tfvburst 1.7s cubic-bezier(.2,1.3,.3,1) both; pointer-events:none; }
    .tfv-burst small { display:block; font-size:1.2vw; font-weight:800; }
    @keyframes tfvburst { 0% { opacity:0; transform:translate(-50%,-50%) scale(.3) rotate(-8deg); } 18% { opacity:1; transform:translate(-50%,-50%) scale(1.08) rotate(2deg); } 82% { opacity:1; transform:translate(-50%,-50%) scale(1); } 100% { opacity:0; transform:translate(-50%,-60%) scale(.9); } }

    /* ---- por cima da mesa: início / resultado da rodada / fim ---- */
    .tfv-over { position:absolute; top:0; left:0; right:0; bottom:0; z-index:9; background:rgba(10,18,36,.95); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2vw; text-align:center; animation:tfvfade .4s ease-out both; }
    @keyframes tfvfade { from { opacity:0; } to { opacity:1; } }
    .tfv-over > * + * { margin-top:1vw; }
    .tfv-over h2 { font-size:3vw; line-height:1.1; }
    .tfv-over .kick { color:#ffbc7d; font-size:1.1vw; font-weight:900; letter-spacing:.18em; text-transform:uppercase; }
    .tfv-over .sub { color:#d9dfed; font-size:1.2vw; }
    .tfv-rows { width:44vw; }
    .tfv-rows > * + * { margin-top:.45vw; }
    .tfv-row { display:flex; align-items:center; padding:.5vw 1vw; border-radius:.9vw; background:#1b2d4c; font-size:1.35vw; text-align:left; animation:tfvrow .4s ease-out both; }
    .tfv-row > * + * { margin-left:.9vw; }
    .tfv-row .nm { flex:1; min-width:0; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .tfv-row .st { color:#d9dfed; font-size:1.05vw; white-space:nowrap; }
    .tfv-row .add { width:4.5vw; text-align:right; font-weight:900; color:#ff9b8f; }
    .tfv-row .add.ok { color:#a7e6bb; }
    .tfv-row .lv { width:6.5vw; text-align:right; color:#ff6b7d; font-size:1.05vw; letter-spacing:.1vw; }
    .tfv-row .lv i { font-style:normal; opacity:.22; color:#d9dfed; }
    .tfv-row.out { background:#4a1f2c; }
    .tfv-row.win { background:#4b3b1c; border:.12vw solid #ffcf72; }
    @keyframes tfvrow { from { opacity:0; transform:translateX(-1.5vw); } to { opacity:1; transform:none; } }
    .tfv-steps { display:flex; justify-content:center; flex-wrap:wrap; width:56vw; }
    .tfv-steps div { width:16vw; margin:.4vw; padding:.8vw; border-radius:.9vw; background:#1b2d4c; border:1px solid #536788; font-size:1.05vw; line-height:1.35; }
    .tfv-steps b { display:block; color:#ffbc7d; font-size:1.6vw; }

    /* ---- painel ao lado ---- */
    .tfv-side-title { border-radius:15px; border:1px solid #596c94; background:#1b3055; padding:15px; text-align:center; }
    .tfv-side-title b { font-size:30px; color:#ffbc7d; }
    .tfv-side-title p { margin-top:4px; font-size:16px; color:#e0e4ee; }
    .tfv-side-box { border-radius:14px; border:1px solid #536788; background:#1b2d4c; padding:12px; color:#f9f4e9; }
    .tfv-side-box > small { display:block; font-size:11px; color:#ffbc7d; text-transform:uppercase; letter-spacing:.13em; font-weight:900; margin-bottom:6px; }
    .tfv-line { display:flex; align-items:center; padding:6px 2px; font-size:17px; border-top:1px solid rgba(255,255,255,.11); }
    .tfv-line:first-of-type { border-top:0; }
    .tfv-line > * + * { margin-left:8px; }
    .tfv-line .nm { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:800; }
    .tfv-line .lv { color:#ff6b7d; font-size:14px; letter-spacing:1px; white-space:nowrap; }
    .tfv-line .lv i { font-style:normal; opacity:.22; color:#d9dfed; }
    .tfv-line .bd { color:#d6deeb; font-size:14px; white-space:nowrap; }
    .tfv-line.off { opacity:.45; }
    .tfv-line.now .nm { color:#ffbc7d; }
    @media (prefers-reduced-motion:reduce) { .tfv-fly { transition:none; } .tfv-burst, .tfv-chip.pop, .tfv-seat.now .tfv-av > b, .tfv-row, .tfv-over, .tfv-slot .stamp, .tfv-slot .crown { animation:none; } }
  `;

  const cardHtml = (x, cls, extra) => {
    if (!x) return '';
    const s = SUIT[x.s] || ['?', 'Carta'];
    return `<div class="tfc ${x.s === 'H' || x.s === 'D' ? 'red' : ''} ${cls || ''}" role="img" aria-label="${rank(x.n)} de ${s[1]}"><span class="n">${rank(x.n)}<br>${s[0]}</span><span class="s" aria-hidden="true">${s[0]}</span><span class="lab">${s[1]}</span>${extra || ''}</div>`;
  };
  const backHtml = cls => `<div class="tfc back ${cls || ''}"></div>`;
  const vidas = (pen, max) => {
    const left = Math.max(0, max - (pen || 0));
    return Array(left + 1).join('♥') + (max - left > 0 ? `<i>${Array(max - left + 1).join('♥')}</i>` : '');
  };

  // memória entre estados (para descobrir o que aconteceu)
  let prev = null, slotTimer = null, lastChord = '';
  const $ = id => document.getElementById(id);

  function burst(html, cor, fundo) {
    const t = $('tfv-table'); if (!t) return;
    const b = document.createElement('div'); b.className = 'tfv-burst'; b.innerHTML = html;
    if (fundo) { b.style.background = fundo; b.style.color = cor || '#fff'; }
    t.appendChild(b); setTimeout(() => { if (b.parentNode) b.parentNode.removeChild(b); }, 1750);
  }
  // Uma carta voa de um ponto a outro da mesa (em % da mesa).
  function fly(html, de, para, opts) {
    const fx = $('tfv-fx'); if (!fx) return;
    const o = opts || {};
    const el = document.createElement('div');
    el.className = 'tfv-fly' + (o.back ? ' back' : '');
    el.innerHTML = html;
    el.style.left = de.x + '%'; el.style.top = de.y + '%';
    el.style.transform = 'rotate(' + (o.rot0 || 0) + 'deg) scale(' + (o.s0 || 1) + ')';
    fx.appendChild(el);
    setTimeout(() => {
      el.style.left = para.x + '%'; el.style.top = para.y + '%';
      el.style.transform = 'rotate(' + (o.rot1 || 0) + 'deg) scale(' + (o.s1 || 1) + ')';
    }, 30 + (o.delay || 0));
    setTimeout(() => { el.style.opacity = '0'; }, 560 + (o.delay || 0));
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 800 + (o.delay || 0));
  }

  ARCADE.register('tefode', {
    tv: {
      mount() {
        prev = null; lastChord = '';
        return `<style>${style}</style><div class="tfv-table" id="tfv-table">
          <div class="tfv-brand">TE FODE</div><div class="tfv-round" id="tfv-round"></div>
          <div class="tfv-vira" id="tfv-vira"></div>
          <div id="tfv-surpresa"></div>
          <div id="tfv-slots"></div>
          <div id="tfv-seats"></div>
          <div id="tfv-fx"></div>
          <div class="tfv-hud" id="tfv-hud"></div>
          <div id="tfv-over"></div>
        </div>`;
      },
      destroy() { clearTimeout(slotTimer); prev = null; },

      html(c) {
        const G = c.G, esc = c.esc; if (!G) return {};
        const players = c.C.players || [];
        const order = G.order && G.order.length ? G.order : players.map(p => p.pid);
        const max = G.maxPenalties || 5;
        const rows = order.map(pid => {
          const p = players.find(x => x.pid === pid); if (!p) return '';
          const out = G.phase !== 'setup' && !has(G.active, pid);
          const bid = G.bids && G.bids[pid] !== undefined ? `${G.wins && G.wins[pid] || 0}/${G.bids[pid]}` : '';
          return `<div class="tfv-line ${out ? 'off' : ''} ${G.turn === pid ? 'now' : ''}">${c.avatar(p, 26)}<span class="nm">${esc(p.name)}</span>${bid ? `<span class="bd">${bid}</span>` : ''}<span class="lv">${out ? 'fora' : vidas(G.penalties && G.penalties[pid], max)}</span></div>`;
        }).join('');
        const side = `<div class="tfv-side-title"><b>TE FODE</b><p>${G.phase === 'setup' ? `${players.length} pessoas na mesa` : `Rodada ${G.round} · ${G.handSize} ${G.handSize === 1 ? 'carta' : 'cartas'}`}</p></div>`
          + `<div class="tfv-side-box"><small>Vidas · ${max} erros e sai</small>${rows}</div>`
          + `<div class="tfv-side-box"><small>Como joga</small><p class="sub">Diga quantas vazas vai ganhar. Cada vaza a mais ou a menos custa uma vida. Cartas iguais se anulam. As 2 últimas pessoas vencem.</p></div>`
          + `<div class="event" style="margin-top:auto">${c.C.event ? c.hl(c.C.event.text) : ''}</div>`;
        return { side };
      },

      after(c) {
        const G = c.G, esc = c.esc; if (!G || !$('tfv-table')) return;
        const players = c.C.players || [];
        const ply = pid => players.find(p => p.pid === pid);
        const nome = pid => { const p = ply(pid); return p ? esc(p.name) : 'Alguém'; };
        const order = G.order && G.order.length ? G.order : players.map(p => p.pid);
        const n = order.length, max = G.maxPenalties || 5;
        const pos = {}, slot = {};
        order.forEach((pid, i) => { pos[pid] = cadeira(i, n); slot[pid] = vaga(pos[pid]); });
        const emJogo = G.phase === 'bid' || G.phase === 'play' || G.phase === 'reveal';
        const seq = G.seq || [];

        // ---------- o que mudou desde o último estado ----------
        const novaRodada = prev && prev.round !== G.round && G.round > 0 && G.phase === 'bid';
        const jogada = G.lastPlay && (!prev || prev.lastAt !== G.lastPlay.at) && G.phase !== 'bid' ? G.lastPlay : null;
        const vazaFechou = prev && prev.phase === 'reveal' && G.phase !== 'reveal';

        // ---------- topo e centro ----------
        const roundEl = $('tfv-round');
        const rh = G.phase === 'setup' ? 'Preparando a mesa' : `Rodada ${G.round} · ${G.handSize} ${G.handSize === 1 ? 'carta' : 'cartas'}<small>${G.active.length} na mesa · até ${G.maxCards} cartas</small>`;
        if (roundEl.innerHTML !== rh) roundEl.innerHTML = rh;
        const vh = G.vira && emJogo ? `${cardHtml(G.vira)}<p>Vira</p><b>Manilha: ${rank(G.manilha)}</b>` : '';
        const vEl = $('tfv-vira'); if (vEl.dataset.k !== vh) { vEl.dataset.k = vh; vEl.innerHTML = vh; }
        const sh = emJogo && G.handSize === 1 ? '<div class="tfv-surpresa">🙈 Rodada de 1 carta: cada um vê a dos outros, nunca a sua</div>' : '';
        if ($('tfv-surpresa').innerHTML !== sh) $('tfv-surpresa').innerHTML = sh;

        // ---------- cartas na mesa: uma vaga na frente de cada cadeira ----------
        const rev = G.phase === 'reveal' ? G.reveal : null;
        const slotsEl = $('tfv-slots');
        const desenhaVagas = (r, esperando) => {
          slotsEl.innerHTML = (G.table || []).map((x, i) => {
            const at = slot[x.pid] || MEIO;
            const anulou = r && has(r.cancelled, x.pid);
            const cls = r ? (r.winner === x.pid ? 'win' : 'lose') : '';
            const extra = (anulou ? '<span class="stamp">ANULOU</span>' : '') + (r && r.winner === x.pid ? '<span class="crown">👑</span>' : '');
            const manilha = x.card.n === G.manilha ? '<span class="mn">MANILHA</span>' : '';
            return `<div class="tfv-slot ${cls} ${esperando === x.pid ? 'wait' : ''}" data-pid="${x.pid}" style="left:${at.x}%;top:${at.y}%"><span class="ord">${i + 1}</span>${cardHtml(x.card, '', manilha)}${extra}</div>`;
          }).join('');
        };
        const tableKey = (G.table || []).map(x => x.pid + ':' + x.card.id).join(',') + '|' + (rev ? 'r' + rev.winner : '');
        if (slotsEl.dataset.k !== tableKey) {
          slotsEl.dataset.k = tableKey;
          clearTimeout(slotTimer);
          const voa = jogada && pos[jogada.pid] && has((G.table || []).map(x => x.pid), jogada.pid);
          if (voa) {   // a carta voa da cadeira até a vaga; só então aparece parada (e só então a vaza se resolve)
            desenhaVagas(null, jogada.pid);
            fly(cardHtml(jogada.card), pos[jogada.pid], slot[jogada.pid], { rot0: -25, rot1: Math.random() * 10 - 5, s0: .5, s1: 1 });
            c.beep(520, .07, 'triangle', .1);
            slotTimer = setTimeout(() => {
              if (rev) {
                desenhaVagas(rev, null);
                if (!rev.winner) burst('Ninguém levou!<small>as cartas mais fortes se anularam</small>', '#fff', '#8a3340');
              } else qa(slotsEl, '.tfv-slot.wait').forEach(el => el.classList.remove('wait'));
            }, 560);
          } else desenhaVagas(rev, null);
        }

        // ---------- cadeiras (chaveadas por pessoa: só muda o que precisa) ----------
        const seats = $('tfv-seats');
        const have = {}; qa(seats, '.tfv-seat').forEach(s => { have[s.dataset.pid] = s; });
        const keep = {};
        order.forEach(pid => {
          const p = ply(pid); if (!p) return;
          keep[pid] = true;
          let s = have[pid];
          if (!s) {
            s = document.createElement('div'); s.className = 'tfv-seat'; s.dataset.pid = pid;
            s.innerHTML = '<div class="tfv-av"><i></i><b></b></div><span class="tfv-ord"></span><span class="tfv-dealer" title="Distribui">D</span><div class="tfv-name"></div><div class="tfv-lives"></div><div class="tfv-chip"></div><div class="tfv-fan"></div><div class="tfv-out">☠ FORA</div>';
            seats.appendChild(s);
          }
          const at = pos[pid];
          s.style.left = at.x + '%'; s.style.top = at.y + '%';
          const avh = c.avatar(p, Math.round(window.innerWidth * 0.042));
          const ai = s.querySelector('.tfv-av > i'); if (ai.dataset.k !== avh) { ai.dataset.k = avh; ai.innerHTML = avh; }
          const nm = s.querySelector('.tfv-name'); const nt = p.name + (p.on === false ? ' 📵' : ''); if (nm.textContent !== nt) nm.textContent = nt;
          const lv = s.querySelector('.tfv-lives'); const lh = vidas(G.penalties && G.penalties[pid], max); if (lv.innerHTML !== lh) lv.innerHTML = lh;
          const ativo = G.phase === 'setup' || has(G.active, pid);
          const k = seq.indexOf(pid);
          const ord = s.querySelector('.tfv-ord');
          ord.style.display = emJogo && k >= 0 ? '' : 'none';
          if (k >= 0) ord.textContent = (k + 1) + 'º';
          s.querySelector('.tfv-dealer').style.display = emJogo && G.dealer === pid ? '' : 'none';
          // ficha: palpite (e vazas ganhas depois que o jogo começa)
          const chip = s.querySelector('.tfv-chip');
          const bid = G.bids ? G.bids[pid] : undefined, won = G.wins && G.wins[pid] || 0;
          let ch = '', cc = 'tfv-chip';
          if (emJogo && bid !== undefined) {
            ch = G.phase === 'bid' ? `palpite <b>${bid}</b>` : `<b>${won}</b> de ${bid} vaza${bid === 1 ? '' : 's'}`;
            if (G.phase !== 'bid') cc += won > bid ? ' over' : won === bid ? ' hit' : '';
          } else if (G.phase === 'bid' && ativo) ch = G.turn === pid ? 'pensando…' : 'palpite: …';
          chip.style.display = ch ? '' : 'none';
          if (chip.innerHTML !== ch) chip.innerHTML = ch;
          const newBid = prev && prev.bids[pid] === undefined && bid !== undefined && G.phase === 'bid';
          if (newBid) { chip.className = cc; void chip.offsetWidth; chip.className = cc + ' pop'; }
          else if (chip.className.replace(' pop', '') !== cc) chip.className = cc;
          // leque com o verso das cartas que ainda estão na mão
          const fan = s.querySelector('.tfv-fan'); const cnt = Math.min(G.counts && G.counts[pid] || 0, 6);
          if (Number(fan.dataset.k) !== cnt) {
            fan.dataset.k = cnt;
            fan.innerHTML = Array.apply(null, Array(cnt)).map((_, j) => `<i style="transform:rotate(${(j - (cnt - 1) / 2) * 10}deg)"></i>`).join('');
          }
          s.classList.toggle('now', G.turn === pid && (G.phase === 'bid' || G.phase === 'play'));
          s.classList.toggle('won', !!rev && rev.winner === pid);
          s.classList.toggle('off', !ativo || p.on === false);
        });
        for (const pid in have) if (!keep[pid]) seats.removeChild(have[pid]);

        // ---------- faixa de baixo ----------
        let prompt = '', sub = '', hot = false;
        if (G.phase === 'bid') {
          prompt = G.turn ? `Palpite de ${nome(G.turn)}` : 'Palpites';
          sub = `Soma dos palpites: ${G.bidTotal || 0} de ${G.handSize} carta${G.handSize === 1 ? '' : 's'}`;
          if (G.forbiddenBid !== null && G.forbiddenBid !== undefined) sub += `<em>${nome(G.turn)} não pode dizer ${G.forbiddenBid}</em>`;
        } else if (G.phase === 'play') {
          prompt = `Vez de ${nome(G.turn)}`;
          const total = G.bidTotal || 0;
          sub = `Vaza ${G.trick + 1} de ${G.handSize}${seq[0] ? ' · ' + nome(seq[0]) + ' abriu' : ''} · palpites somam ${total} ${total > G.handSize ? '(falta vaza para todo mundo)' : '(sobra vaza: alguém leva a mais)'}`;
        } else if (rev) {
          hot = true;
          prompt = rev.winner ? `${nome(rev.winner)} levou a vaza!` : 'Ninguém levou a vaza!';
          sub = rev.winner ? `Vaza ${rev.trick} de ${G.handSize}` : 'As cartas mais fortes se anularam';
        }
        const left = rev ? Math.max(.1, Math.min(5, (rev.endsAt - Date.now()) / 1000)) : 0;
        const hk = prompt + '|' + sub + '|' + (rev ? rev.trick : '');
        const hud = $('tfv-hud');
        if (hud.dataset.k !== hk) {
          hud.dataset.k = hk;
          hud.innerHTML = prompt ? `<div class="tfv-prompt ${hot ? 'hot' : ''}">${prompt}</div><div class="tfv-sub">${sub}</div>${rev ? `<div class="tfv-progress"><i style="animation-duration:${left}s"></i></div>` : ''}` : '';
        }

        // ---------- animações do que aconteceu ----------
        if (novaRodada) {   // distribuição: as cartas voam do centro para cada cadeira
          const ativos = order.filter(pid => has(G.active, pid));
          const k = Math.min(G.handSize, 3);
          ativos.forEach((pid, i) => { for (let j = 0; j < k; j++) fly(backHtml('sm'), MEIO, pos[pid], { back: true, delay: (j * ativos.length + i) * 70, s0: 1, s1: .7, rot1: (j - 1) * 10 }); });
          c.beep(380, .05, 'sine', .07);
        }
        if (vazaFechou && prev.table.length && prev.winner && pos[prev.winner]) {   // a vaza vai para quem ganhou
          prev.table.forEach((x, j) => { if (slot[x.pid]) fly(cardHtml(x.card), slot[x.pid], pos[prev.winner], { delay: j * 40, s0: 1, s1: .35, rot1: 20 }); });
        }

        // ---------- por cima da mesa: início / resultado / fim ----------
        const over = $('tfv-over');
        let h = '';
        if (G.phase === 'setup') {
          h = `<div class="tfv-over"><div class="big-emoji">🂠</div><h2>Te Fode</h2><p class="sub">${players.length} de 4–7 pessoas na mesa. Toquem em "Começar" no celular.</p>
            <div class="tfv-steps"><div><b>1. Palpite</b>Quantas vazas você leva? A soma nunca fecha com o número de cartas.</div><div><b>2. Jogue</b>A vira define a manilha. Cartas iguais se anulam.</div><div><b>3. Acerte</b>Cada vaza de diferença custa uma vida. Sem vidas, você sai.</div></div></div>`;
        } else if (G.phase === 'result' || G.phase === 'end') {
          const rows = (G.roundResults || []).slice().sort((a, b) => order.indexOf(a.pid) - order.indexOf(b.pid));
          const lista = G.phase === 'end'
            ? order.slice().sort((a, b) => (G.penalties[a] || 0) - (G.penalties[b] || 0)).map((pid, i) => {
              const r = rows.find(x => x.pid === pid);
              return `<div class="tfv-row ${has(G.winners, pid) ? 'win' : ''}" style="animation-delay:${i * .08}s">${c.avatar(ply(pid), Math.round(window.innerWidth * .022))}<span class="nm">${has(G.winners, pid) ? '🏆 ' : ''}${nome(pid)}</span>${r ? `<span class="st">${r.won}/${r.bid} vazas</span>` : ''}<span class="lv">${vidas(G.penalties[pid], max)}</span></div>`;
            }).join('')
            : rows.map((r, i) => `<div class="tfv-row ${r.out ? 'out' : ''}" style="animation-delay:${i * .08}s">${c.avatar(ply(r.pid), Math.round(window.innerWidth * .022))}<span class="nm">${nome(r.pid)}${r.out ? ' ☠' : ''}</span><span class="st">${r.won}/${r.bid} vazas</span><span class="add ${r.added ? '' : 'ok'}">${r.added ? '−' + r.added + ' ♥' : '✓'}</span><span class="lv">${r.out ? 'fora' : vidas(G.penalties[r.pid], max)}</span></div>`).join('');
          const winners = (G.winners || []).map(nome).join(' e ');
          h = G.phase === 'end'
            ? `<div class="tfv-over"><div class="big-emoji">🏆</div><p class="kick">Fim de jogo</p><h2>${winners || 'A mesa'} ${G.winners && G.winners.length > 1 ? 'venceram' : 'venceu'}!</h2><div class="tfv-rows">${lista}</div><p class="sub">Toquem em "Jogar de novo" no celular.</p></div>`
            : `<div class="tfv-over"><p class="kick">Rodada ${G.round} · ${G.handSize} ${G.handSize === 1 ? 'carta' : 'cartas'}</p><h2>Quem acertou o palpite?</h2><div class="tfv-rows">${lista}</div><p class="sub">Vazas ganhas / palpite. Toquem em "Próxima rodada" no celular.</p></div>`;
        }
        if (over.dataset.k !== h) { over.dataset.k = h; over.innerHTML = h; }

        // sons e estouros dos momentos grandes
        const k2 = `${G.phase}:${G.round}`;
        if (k2 !== lastChord) {
          if (prev && (G.phase === 'result' || G.phase === 'end')) {
            const fora = (G.roundResults || []).filter(r => r.out);
            if (fora.length) setTimeout(() => burst(`FODEU!<small>${fora.map(r => nome(r.pid)).join(' e ')} ${fora.length > 1 ? 'saíram' : 'saiu'} da mesa</small>`, '#fff', '#8a3340'), 350);
            c.chord(G.phase === 'end' ? [523, 659, 784, 1046] : [523, 659, 784]);
          }
          lastChord = k2;
        }

        // guarda o estado para a próxima comparação
        prev = { round: G.round, phase: G.phase, lastAt: G.lastPlay ? G.lastPlay.at : null, bids: Object.assign({}, G.bids || {}),
          table: (G.table || []).map(x => ({ pid: x.pid, card: x.card })), winner: G.reveal ? G.reveal.winner : null };
      },
    },
  });
})();
