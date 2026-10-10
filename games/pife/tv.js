'use strict';
(function () {
  // A TV usa Chrome 47. A mão de cada pessoa fica só no celular.
  var css = `
    .pft { position:absolute; top:0; right:0; bottom:0; left:0; overflow:hidden; border-radius:2vw; color:#fff8e9;
      background:radial-gradient(ellipse at 50% 45%,#247452 0%,#145039 58%,#0b3027 100%);
      box-shadow:inset 0 0 0 .7vw #183a2e,inset 0 0 0 .9vw #bd9453,inset 0 0 5vw rgba(0,0,0,.5); }
    .pft:before { content:''; position:absolute; top:16%; left:15%; width:70%; height:68%; border:.12vw solid rgba(255,229,168,.2); border-radius:50%; }
    .pft-brand { position:absolute; top:3%; left:4%; color:#f8dda0; font-size:2vw; font-weight:900; letter-spacing:.1em; }
    .pft-brand small { display:block; margin-top:.1vw; color:#d0e4d7; font-size:.9vw; font-weight:700; letter-spacing:.03em; }
    .pft-meta { position:absolute; top:3%; right:4%; padding:.55vw 1vw; border-radius:.8vw; background:rgba(0,0,0,.3); color:#fff0c8; font-size:1vw; font-weight:900; text-align:right; }
    .pft-seat { position:absolute; width:13vw; margin-left:-6.5vw; margin-top:-3.2vw; text-align:center; }
    .pft-seat.on .pft-face { box-shadow:0 0 0 .35vw #f5ca68,0 0 2vw #f5ca68; transform:scale(1.08); }
    .pft-face { width:4.3vw; height:4.3vw; margin:0 auto; border-radius:50%; background:#efd39a; color:#25362c;
      display:flex; align-items:center; justify-content:center; font-size:1.7vw; font-weight:900; transition:transform .25s; }
    .pft-face .avatar { width:100%; height:100%; }
    .pft-name { margin-top:.55vw; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:1.15vw; font-weight:900; text-shadow:0 .12vw .4vw #05261b; }
    .pft-count { display:inline-block; margin-top:.25vw; padding:.18vw .7vw; border-radius:99px; background:rgba(0,0,0,.48); font-size:.9vw; font-weight:800; }
    .pft-seat.on .pft-count { background:#f5ca68; color:#182d22; }
    .pft-center { position:absolute; top:48%; left:50%; width:34vw; height:17vw; margin:-8.5vw 0 0 -17vw; display:flex; align-items:center; justify-content:center; }
    .pft-pile { width:10vw; text-align:center; }
    .pft-pile + .pft-pile { margin-left:3vw; }
    .pft-card { position:relative; box-sizing:border-box; width:6.4vw; height:9.3vw; margin:0 auto; border:.22vw solid #f1e9d7; border-radius:.55vw;
      background:#fffdf5; color:#203029; box-shadow:0 .55vw 1.2vw rgba(0,0,0,.5); }
    .pft-card.red { color:#c13e48; }
    .pft-card.back { background:#802c34; border-color:#efd6a0; box-shadow:.27vw -.25vw 0 #a74b4d,.5vw -.5vw 0 #efd6a0,0 .7vw 1.2vw rgba(0,0,0,.5); }
    .pft-card.back:after { content:'PIFE'; position:absolute; top:7%; left:9%; width:82%; height:86%; box-sizing:border-box; border:.15vw solid #efd6a0; border-radius:.35vw;
      display:flex; align-items:center; justify-content:center; color:#ffe4ad; font-size:1.15vw; font-weight:900; letter-spacing:.12em;
      background:repeating-linear-gradient(45deg,#862e36,#862e36 .35vw,#a54549 .35vw,#a54549 .7vw); }
    .pft-corner { position:absolute; top:.3vw; left:.45vw; font-size:1.55vw; font-weight:900; line-height:1; text-align:center; }
    .pft-symbol { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:4.5vw; line-height:1; }
    .pft-joker { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#9b46a1; font-size:3.6vw; }
    .pft-empty { display:flex; align-items:center; justify-content:center; border-style:dashed; background:rgba(255,255,255,.09); color:#c9dfce; font-size:2vw; }
    .pft-label { margin-top:.8vw; color:#ecf4df; font-size:1.15vw; font-weight:900; }
    .pft-qty { margin-top:.2vw; color:#cadfca; font-size:.9vw; }
    .pft-turn { position:absolute; left:25%; right:25%; bottom:2%; padding:.65vw 1vw; border-radius:99px; background:rgba(4,33,24,.7);
      color:#fff0c8; text-align:center; font-size:1.45vw; font-weight:900; }
    .pft-turn small { display:block; margin-top:.2vw; color:#cbe3d3; font-size:.85vw; }
    .pft-over { position:absolute; top:0; right:0; bottom:0; left:0; z-index:2; background:rgba(5,20,15,.91);
      display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:2vw; }
    .pft-over h2 { margin:.5vw 0 0; color:#ffe2a1; font-size:3.5vw; }
    .pft-over p { max-width:45vw; margin:.8vw 0; color:#deeadc; font-size:1.3vw; }
    .pft-badge { display:inline-block; margin:1vw .35vw; padding:.65vw 1.1vw; border-radius:.8vw; background:#214e3b; border:.1vw solid #967e50; font-size:1.15vw; font-weight:900; }
    .pft-win { font-size:6vw; }
    .pft-score { width:28vw; display:flex; justify-content:space-between; margin:.28vw 0; padding:.5vw .8vw; border-radius:.6vw; background:#214232; font-size:1.1vw; font-weight:800; }
  `;
  var names = { S: '♠', H: '♥', D: '♦', C: '♣' };
  function rank(n) { return n === 1 ? 'A' : n === 11 ? 'J' : n === 12 ? 'Q' : n === 13 ? 'K' : String(n); }
  function card(x) {
    if (!x) return '<div class="pft-card pft-empty">?</div>';
    if (x.j || x.joker) return '<div class="pft-card"><span class="pft-corner">★</span><span class="pft-joker">★</span></div>';
    var suit = names[x.s] || '?';
    return '<div class="pft-card ' + (x.s === 'H' || x.s === 'D' ? 'red' : '') + '"><span class="pft-corner">' + rank(x.n) + '<br>' + suit + '</span><span class="pft-symbol">' + suit + '</span></div>';
  }
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
        '<div class="pft-face">' + c.avatar(p, 64) + '</div><div class="pft-name">' + c.esc(p.name) +
        '</div><div class="pft-count">' + (G.phase === 'setup' ? 'pronto' : o.n + ' cartas') + '</div></div>';
    }
    return html;
  }
  function overlay(c, G) {
    if (G.phase === 'setup') return '<div class="pft-over"><div class="pft-win">🃏</div><h2>Pife · Cacheta</h2>' +
      '<p>Forme três jogos de três cartas. Compre uma carta e descarte uma por vez.</p>' +
      '<div><span class="pft-badge">' + (G.cfg && G.cfg.jokers ? '★ Com coringa' : 'Sem coringa') + '</span>' +
      '<span class="pft-badge">2 a 10 pessoas</span></div><p>Escolham a regra e comecem pelo celular.</p></div>';
    if (G.phase !== 'round' && G.phase !== 'end') return '';
    var id = G.phase === 'end' ? G.winner : G.roundWinner;
    var scores = G.scores || {}, rows = '';
    var ps = (c.C.players || []).slice().sort(function (a, b) { return (scores[b.pid] || 0) - (scores[a.pid] || 0); });
    for (var i = 0; i < ps.length; i++) rows += '<div class="pft-score"><span>' + c.esc(ps[i].name) + '</span><b>' + (scores[ps[i].pid] || 0) + '</b></div>';
    return '<div class="pft-over"><div class="pft-win">' + (G.phase === 'end' ? '🏆' : '🎉') + '</div><h2>' + name(c, id) +
      (G.phase === 'end' ? ' venceu!' : ' bateu!') + '</h2><p>' + (G.phase === 'end' ? 'Fim da partida' : 'Fim da rodada ' + G.round) + '</p>' + rows +
      '<p>' + (G.phase === 'end' ? 'Toquem em Jogar de novo no celular.' : 'Toquem em Próxima rodada no celular.') + '</p></div>';
  }
  ARCADE.register('pife', { tv: {
    html: function (c) {
      var G = c.G; if (!G) return {};
      var turn = G.phase === 'play' ? name(c, G.turn) + (G.step === 'draw' ? ' vai comprar' : ' vai descartar') : '';
      var stage = '<style>' + css + '</style><div class="pft"><div class="pft-brand">PIFE<small>Rodada ' + (G.round || 1) + '</small></div>' +
        '<div class="pft-meta">' + (G.cfg && G.cfg.jokers ? '★ COM CORINGA' : 'SEM CORINGA') + '</div>' + seats(c, G) +
        '<div class="pft-center"><div class="pft-pile"><div class="pft-card back"></div><div class="pft-label">MONTE</div><div class="pft-qty">' + (G.deckN || 0) + ' cartas</div></div>' +
        '<div class="pft-pile">' + card(G.discardTop) + '<div class="pft-label">DESCARTE</div><div class="pft-qty">' + (G.discardN || 0) + ' cartas</div></div></div>' +
        (turn ? '<div class="pft-turn">' + turn + '<small>Use o celular para jogar</small></div>' : '') + overlay(c, G) + '</div>';
      var side = '<div class="box center"><div style="font-size:28px;font-weight:900">🃏 Pife</div><p class="sub mut">' +
        (G.cfg && G.cfg.jokers ? 'Com coringa' : 'Sem coringa') + ' · ' + (G.target || 3) + ' rodadas para vencer</p></div><div class="box"><p class="sub mut">Rodadas ganhas</p>' +
        c.playersHtml({ info: function (p) { var o = (G.order || []).filter(function (x) { return x.pid === p.pid; })[0];
          return (G.scores && G.scores[p.pid] || 0) + ' pontos' + (o ? ' · ' + o.n + ' cartas' : ''); },
          border: function (p) { return G.turn === p.pid ? '#f5ca68' : null; } }) + '</div>' +
        '<div class="event" style="margin-top:auto">' + (c.C.event ? c.hl(c.C.event.text) : '') + '</div>';
      return { stage: stage, side: side };
    },
  } });
})();
