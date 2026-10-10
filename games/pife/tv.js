'use strict';
(function () {
  // A TV usa Chrome 47. A mão de cada pessoa fica só no celular.
  var css = `
    .pft { position:absolute; top:0; right:.6vw; bottom:.6vw; left:0; overflow:hidden; color:#0f0f14;
      background-color:#f0443a; background-image:radial-gradient(rgba(15,15,20,.16) .1vw, transparent .11vw); background-size:.6vw .6vw;
      border:.25vw solid #0f0f14; box-shadow:.6vw .6vw 0 #0f0f14; }
    .pft:before { content:''; position:absolute; top:16%; left:15%; width:70%; height:68%; border:.2vw dashed rgba(15,15,20,.35); border-radius:50%; }
    .pft-brand { position:absolute; top:3%; left:3%; }
    .pft-brand b { display:inline-block; padding:.5vw 1vw; background:#0f0f14; color:#f1f0ea; font-size:2.4vw; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1; }
    .pft-brand small { display:block; margin-top:.6vw; font-family:'JetBrains Mono',monospace; font-size:.95vw; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    .pft-meta { position:absolute; top:3%; right:3%; padding:.55vw 1vw; background:#fff; border:.2vw solid #0f0f14; box-shadow:.3vw .3vw 0 #0f0f14;
      font-family:'JetBrains Mono',monospace; font-size:1vw; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .pft-seat { position:absolute; width:13vw; margin-left:-6.5vw; margin-top:-3.6vw; text-align:center; }
    .pft-face { width:4.6vw; height:4.6vw; margin:0 auto; padding:.35vw; background:#fff; border:.2vw solid #0f0f14; box-shadow:.35vw .35vw 0 #0f0f14; }
    .pft-face .avatar { width:100%; height:100%; }
    .pft-seat.on .pft-face { background:#ffce1f; box-shadow:.6vw .6vw 0 #0f0f14; }
    .pft-name { margin-top:.7vw; }
    .pft-name .nm { max-width:12vw; overflow:hidden; text-overflow:ellipsis; font-size:1.15vw; padding:.15vw .6vw; border-width:.15vw; vertical-align:top; }
    .pft-count { display:inline-block; margin-top:.4vw; padding:.25vw .6vw; background:#0f0f14; color:#f1f0ea;
      font-family:'JetBrains Mono',monospace; font-size:.85vw; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .pft-seat.on .pft-count { background:#ffce1f; color:#0f0f14; border:.15vw solid #0f0f14; }
    .pft-center { position:absolute; top:48%; left:50%; width:34vw; height:17vw; margin:-8.5vw 0 0 -17vw; display:flex; align-items:center; justify-content:center; }
    .pft-pile { width:10vw; text-align:center; }
    .pft-pile + .pft-pile { margin-left:3vw; }
    .pft-card { position:relative; box-sizing:border-box; width:6.4vw; height:9.3vw; margin:0 auto; border:.2vw solid #0f0f14; border-radius:.35vw;
      background:#fff; color:#0f0f14; box-shadow:.35vw .35vw 0 #0f0f14; }
    .pft-card.red { color:#d02a20; }
    .pft-card.back { background-color:#0f0f14; background-image:repeating-linear-gradient(45deg,#0f0f14,#0f0f14 .35vw,#23232b .35vw,#23232b .7vw);
      box-shadow:.35vw .35vw 0 #0f0f14,.7vw -.35vw 0 #fff,.7vw -.35vw 0 .2vw #0f0f14; }
    .pft-card.back:after { content:'PIFE'; position:absolute; top:7%; left:9%; width:82%; height:86%; box-sizing:border-box; border:.15vw solid #ffce1f;
      display:flex; align-items:center; justify-content:center; color:#ffce1f; font-family:'Pixelify Sans',monospace; font-size:1.3vw; font-weight:700; letter-spacing:.08em; }
    .pft-corner { position:absolute; top:.3vw; left:.45vw; font-family:'Pixelify Sans',monospace; font-size:1.55vw; font-weight:700; line-height:1; text-align:center; }
    .pft-symbol { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:4.5vw; line-height:1; }
    .pft-joker { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#7a3fd0; font-size:3.6vw; }
    .pft-empty { display:flex; align-items:center; justify-content:center; border-style:dashed; background:rgba(255,255,255,.35); box-shadow:none; font-family:'Pixelify Sans',monospace; font-size:2vw; }
    .pft-label { display:inline-block; margin-top:1vw; padding:.25vw .7vw; background:#0f0f14; color:#f1f0ea; font-size:1.1vw; font-weight:900; font-stretch:125%; text-transform:uppercase; }
    .pft-qty { margin-top:.4vw; font-family:'JetBrains Mono',monospace; font-size:.9vw; font-weight:700; text-transform:uppercase; }
    .pft-qty b { font-family:'Pixelify Sans',monospace; font-size:1.2vw; }
    .pft-turn { position:absolute; left:27%; right:27%; bottom:3%; padding:.7vw 1vw; background:#ffce1f; border:.2vw solid #0f0f14; box-shadow:.45vw .45vw 0 #0f0f14;
      text-align:center; font-size:1.5vw; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1.1; }
    .pft-turn .nm { font-size:inherit; padding:0 .5vw; border-width:.15vw; }
    .pft-turn small { display:block; margin-top:.3vw; font-family:'JetBrains Mono',monospace; font-size:.8vw; font-weight:700; letter-spacing:.08em; font-stretch:100%; }
    .pft-over { position:absolute; top:0; right:0; bottom:0; left:0; z-index:2; background:rgba(241,240,234,.96);
      display:flex; align-items:center; justify-content:center; padding:2vw; }
    .pft-box { min-width:34vw; max-width:52vw; padding:2vw 2.6vw; background:#fff; border:.25vw solid #0f0f14; box-shadow:.8vw .8vw 0 #0f0f14; text-align:center; }
    .pft-kick { display:inline-block; padding:.35vw .8vw; background:#0f0f14; color:#ffce1f; font-family:'JetBrains Mono',monospace; font-size:1vw; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
    .pft-glyph { font-family:'Pixelify Sans',monospace; font-size:5vw; font-weight:700; line-height:1; color:#d02a20; }
    .pft-box h2 { margin:.8vw 0 0; font-size:3.6vw; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:.95; }
    .pft-box h2 .nm { font-size:inherit; padding:0 .6vw; border-width:.2vw; }
    .pft-box p { margin:1vw auto; max-width:44vw; font-size:1.3vw; font-weight:600; line-height:1.35; }
    .pft-box p.pft-hint { margin-bottom:0; font-family:'JetBrains Mono',monospace; font-size:1vw; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .pft-badge { display:inline-block; margin:.6vw .35vw 0; padding:.5vw 1vw; background:#fff; border:.2vw solid #0f0f14; box-shadow:.25vw .25vw 0 #0f0f14;
      font-family:'JetBrains Mono',monospace; font-size:1vw; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .pft-badge.hi { background:#ffce1f; }
    .pft-scores { margin:1.2vw auto 0; width:30vw; text-align:left; }
    .pft-score { display:flex; align-items:center; justify-content:space-between; padding:.45vw .8vw; background:#fff; border:.2vw solid #0f0f14; font-size:1.25vw; font-weight:800; }
    .pft-score + .pft-score { margin-top:.4vw; }
    .pft-score.top { background:#ffce1f; box-shadow:.3vw .3vw 0 #0f0f14; }
    .pft-score b { font-family:'Pixelify Sans',monospace; font-size:1.7vw; font-weight:700; line-height:1; }
    .pft-side-title { display:flex; align-items:center; }
    .pft-side-title b { display:inline-block; padding:6px 12px; background:#0f0f14; color:#f1f0ea; font-size:30px; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1; }
    .pft-side-title span { margin-left:12px; font-family:'Pixelify Sans',monospace; font-size:30px; font-weight:700; color:#d02a20; }
    .pft-side-label { font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .pl.pft-now { background:#ffce1f; }
  `;
  var names = { S: '♠', H: '♥', D: '♦', C: '♣' };
  function rank(n) { return n === 1 ? 'A' : n === 11 ? 'J' : n === 12 ? 'Q' : n === 13 ? 'K' : String(n); }
  function card(x) {
    if (!x) return '<div class="pft-card pft-empty">?</div>';
    if (x.j || x.joker) return '<div class="pft-card"><span class="pft-corner">★</span><span class="pft-joker">★</span></div>';
    var suit = names[x.s] || '?';
    return '<div class="pft-card ' + (x.s === 'H' || x.s === 'D' ? 'red' : '') + '"><span class="pft-corner">' + rank(x.n) + '<br>' + suit + '</span><span class="pft-symbol">' + suit + '</span></div>';
  }
  // nome no crachá da cor da pessoa, sempre com texto em tinta
  function inkNm(c, p) { return '<span class="nm" style="background:' + c.ci(p.color).hex + ';color:#0f0f14">' + c.esc(p.name) + '</span>'; }
  function player(c, pid) {
    var ps = c.C.players || [];
    for (var i = 0; i < ps.length; i++) if (ps[i].pid === pid) return ps[i];
    return null;
  }
  function name(c, pid) { var p = player(c, pid); return p ? c.esc(p.name) : 'Jogador'; }
  function seats(c, G) {
    var order = G.order && G.order.length ? G.order : (c.C.players || []).map(function (p) { return { pid: p.pid, n: 0 }; });
    var html = '';
    for (var i = 0; i < order.length; i++) {
      var o = order[i], p = player(c, o.pid);
      if (!p) continue;
      var a = (-90 + i * 360 / order.length) * Math.PI / 180;
      var x = 50 + 40 * Math.cos(a), y = 47 + 35 * Math.sin(a);
      html += '<div class="pft-seat ' + (G.turn === o.pid ? 'on' : '') + '" style="left:' + x + '%;top:' + y + '%">' +
        '<div class="pft-face">' + c.avatar(p, 64) + '</div><div class="pft-name">' + inkNm(c, p) +
        '</div><div class="pft-count">' + (G.phase === 'setup' ? 'pronto' : o.n + ' cartas') + '</div></div>';
    }
    return html;
  }
  function overlay(c, G) {
    if (G.phase === 'setup') return '<div class="pft-over"><div class="pft-box"><div class="pft-glyph">J♠</div><h2>Pife · Cacheta</h2>' +
      '<p>Forme três jogos de três cartas. Compre uma carta e descarte uma por vez.</p>' +
      '<div><span class="pft-badge hi">' + (G.cfg && G.cfg.jokers ? '★ Com coringa' : 'Sem coringa') + '</span>' +
      '<span class="pft-badge">2 a 10 pessoas</span></div><p class="pft-hint">Escolham a regra e comecem pelo celular</p></div></div>';
    if (G.phase !== 'round' && G.phase !== 'end') return '';
    var id = G.phase === 'end' ? G.winner : G.roundWinner;
    var scores = G.scores || {}, rows = '';
    var ps = (c.C.players || []).slice().sort(function (a, b) { return (scores[b.pid] || 0) - (scores[a.pid] || 0); });
    var top = ps.length ? scores[ps[0].pid] || 0 : 0;
    for (var i = 0; i < ps.length; i++) rows += '<div class="pft-score' + ((scores[ps[i].pid] || 0) === top && top > 0 ? ' top' : '') + '"><span>' + inkNm(c, ps[i]) + '</span><b>' + (scores[ps[i].pid] || 0) + '</b></div>';
    var wp = player(c, id);
    return '<div class="pft-over"><div class="pft-box"><div class="pft-kick">' + (G.phase === 'end' ? 'Fim da partida' : 'Fim da rodada ' + G.round) + '</div><h2>' + (wp ? inkNm(c, wp) : 'Jogador') +
      '<br>' + (G.phase === 'end' ? 'venceu!' : 'bateu!') + '</h2><div class="pft-scores">' + rows + '</div>' +
      '<p class="pft-hint">' + (G.phase === 'end' ? 'Toquem em Jogar de novo no celular' : 'Toquem em Próxima rodada no celular') + '</p></div></div>';
  }
  ARCADE.register('pife', { tv: {
    html: function (c) {
      var G = c.G; if (!G) return {};
      var tp = player(c, G.turn);
      var turn = G.phase === 'play' ? (tp ? inkNm(c, tp) : 'Jogador') + (G.step === 'draw' ? ' vai comprar' : ' vai descartar') : '';
      var stage = '<style>' + css + '</style><div class="pft"><div class="pft-brand"><b>Pife</b><small>Rodada ' + (G.round || 1) + '</small></div>' +
        '<div class="pft-meta">' + (G.cfg && G.cfg.jokers ? '★ COM CORINGA' : 'SEM CORINGA') + '</div>' + seats(c, G) +
        '<div class="pft-center"><div class="pft-pile"><div class="pft-card back"></div><div class="pft-label">Monte</div><div class="pft-qty"><b>' + (G.deckN || 0) + '</b> cartas</div></div>' +
        '<div class="pft-pile">' + card(G.discardTop) + '<div class="pft-label">Descarte</div><div class="pft-qty"><b>' + (G.discardN || 0) + '</b> cartas</div></div></div>' +
        (turn ? '<div class="pft-turn">' + turn + '<small>Use o celular para jogar</small></div>' : '') + overlay(c, G) + '</div>';
      var side = '<div class="box"><div class="pft-side-title"><b>Pife</b><span>J♠</span></div><p class="sub" style="margin-top:10px">' +
        (G.cfg && G.cfg.jokers ? 'Com coringa' : 'Sem coringa') + ' · ' + (G.target || 3) + ' rodadas para vencer</p></div><div class="box"><p class="pft-side-label">Rodadas ganhas</p>' +
        c.playersHtml({ info: function (p) { var o = (G.order || []).filter(function (x) { return x.pid === p.pid; })[0];
          return (G.scores && G.scores[p.pid] || 0) + ' pontos' + (o ? ' · ' + o.n + ' cartas' : ''); },
          cls: function (p) { return G.turn === p.pid ? 'pft-now' : ''; } }) + '</div>' +
        '<div class="event">' + (c.C.event ? c.hl(c.C.event.text) : '') + '</div>';
      return { stage: stage, side: side };
    },
  } });
})();
