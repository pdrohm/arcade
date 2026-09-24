'use strict';
// TV do Último de Pé. Carregado em toda TV (inclusive a Samsung de 2016): fica em ES5.
// A arena inteira é o canvas de shared/ultimodepe/render.js; aqui só entram os cartazes de
// preparação e de fim, em HTML por cima dele. Nas fases escondidas a TV não recebe a posição
// de ninguém (o servidor não manda), então não há como ela entregar alguém.
(function () {
  var A = ARCADE, renderer = null, context = null, loading = false, token = 0, overlayKey = '';
  function css() {
    if (document.getElementById('udp-css')) return;
    var link = document.createElement('link'); link.id = 'udp-css'; link.rel = 'stylesheet'; link.href = '/shared/ultimodepe/ui.css'; document.head.appendChild(link);
  }
  function load() {
    if (renderer || loading) return;
    if (window.UDPRender) { init(); return; }
    loading = true; var mine = token;
    var s = document.createElement('script'); s.src = '/shared/ultimodepe/render.js';
    s.onload = function () { loading = false; if (mine === token) init(); };
    s.onerror = function () { loading = false; if (s.parentNode) s.parentNode.removeChild(s); };
    document.head.appendChild(s);
  }
  function init() {
    var canvas = document.getElementById('udp-canvas');
    if (!canvas || !context) return;
    renderer = new window.UDPRender(canvas, {
      kind: 'tv',
      left: function () { var r = context && context.remaining(); return r === null || r === undefined ? null : r * 1000; },
    });
    renderer.setState(context.G);
  }
  function stop() { token++; if (renderer) renderer.dispose(); renderer = null; context = null; overlayKey = ''; document.body.classList.remove('udp-tv'); }
  // mesma regra de contraste da paleta da casa (ui: branco no roxo, preto no verde)
  function ink(hex) { var n = parseInt(String(hex).replace('#', ''), 16) || 0; return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 133 ? '#111' : '#fff'; }
  function chip(p, cls) { return '<span class="udp-chip ' + (cls || '') + '" style="background:' + p.color + ';color:' + ink(p.color) + '">' + A.esc(p.name) + '</span>'; }
  // Classificação final: vencedores, depois quem saiu por último.
  function ranking(G) {
    var list = [], seen = {}, i, p;
    for (i = 0; i < G.winners.length; i++) { list.push({ pid: G.winners[i], pos: 1 }); seen[G.winners[i]] = 1; }
    var pos = list.length + 1;
    for (i = G.outList.length - 1; i >= 0; i--) { p = G.outList[i]; if (seen[p.pid]) continue; seen[p.pid] = 1; list.push({ pid: p.pid, pos: pos++, round: p.round }); }
    for (i = 0; i < G.roster.length; i++) if (!seen[G.roster[i].pid]) list.push({ pid: G.roster[i].pid, pos: pos++ });
    return list;
  }
  function who(G, pid) { for (var i = 0; i < G.roster.length; i++) if (G.roster[i].pid === pid) return G.roster[i]; return { name: '?', color: '#94a3b8' }; }
  function overlay(c) {
    var el = document.getElementById('udp-overlay'), G = c.G;
    if (!el || !G) return;
    var key = G.phase === 'setup' ? 'setup:' + G.variant + ':' + G.showOthers + ':' + JSON.stringify(c.C.players) : G.phase === 'end' ? 'end:' + G.matchId : 'none';
    if (key === overlayKey) return;
    overlayKey = key;
    if (G.phase === 'setup') {
      var peng = G.variant === 'penguins', chips = '', ps = c.C.players;
      for (var i = 0; i < ps.length && i < 8; i++) chips += chip({ name: ps[i].name, color: c.ci(ps[i].color).hex });
      el.innerHTML = '<div class="udp-card ' + G.variant + '"><div class="udp-logo">Último de Pé</div>' +
        '<div class="udp-variant">' + (peng ? '🐧 PINGUINS' : '🤠 TIROTEIO') + '</div>' +
        '<div class="udp-rule">' + (peng ? 'Decore onde todo mundo está, escolha a direção e escorregue junto com todo mundo. Quem cai na água sai.' : 'Decore onde todo mundo está, mire escondido e todo mundo atira no mesmo instante. Quem leva tiro sai.') + '</div>' +
        '<div class="udp-rule">' + (G.showOthers ? '👀 Todo mundo aparece por alguns segundos antes de cada rodada.' : '🙈 Sem espiar: ninguém aparece antes da rodada.') + (peng ? ' Arraste o dedo: direção e força do dash.' : '') + '</div>' +
        '<div class="udp-chips">' + chips + '</div>' +
        '<div class="udp-hint">' + (ps.length < 2 ? 'Precisa de pelo menos 2 jogadores' : 'O primeiro jogador escolhe a variante e começa pelo celular') + '</div></div>';
    } else if (G.phase === 'end') {
      var rk = ranking(G), row = '';
      for (var j = 0; j < rk.length; j++) { var p = who(G, rk[j].pid); row += chip({ name: rk[j].pos + 'º ' + p.name, color: p.color }, rk[j].pos === 1 ? '' : 'rest'); }
      el.innerHTML = '<div class="udp-rank">' + row + '<div class="udp-hint">Jogar de novo ou voltar ao Arcade pelo celular</div></div>';
    } else el.innerHTML = '';
  }
  function refresh(c) {
    context = c;
    if (renderer) renderer.setState(c.G);
    overlay(c);
  }
  A.register('ultimodepe', { tv: {
    mount: function (c) {
      stop(); context = c; css();
      document.body.classList.add('udp-tv');
      return '<div id="udp-stage"><canvas id="udp-canvas" aria-label="Último de Pé"></canvas><div id="udp-overlay"></div></div>';
    },
    html: function () { return { side: '' }; },
    after: function (c) { refresh(c); load(); },
    destroy: stop,
  } });
})();
