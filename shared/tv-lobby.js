// Lobby da TV: o palco da sala antes de um jogo começar.
// A TV é passiva. Ela mostra quem está na sala, como entrar e o que dá para jogar,
// e reage ao que os celulares fazem. Nada aqui é clicável.
// Visual "fliperama de papel" (shared/ui.css): barra preta com a marca, código da sala em fonte de pixel
// num bloco amarelo, pessoas em quadrados na cor de cada um, cartão branco com o QR, prateleira de jogos.
//
// Componentes (cada um cuida de um pedaço do DOM, montado uma vez e atualizado por dentro):
//   RoomIdentity   código da sala (bloco amarelo)
//   JoinPanel      cartão do QR + como entrar
//   PlayerList     quadrados de quem está na sala (boneco na cor da pessoa + nome)
//   GameShowcase   prateleira "Jogos da casa" (GamePreview = capa na cor da categoria + símbolo + nome + jogadores)
//   Announce       avisos curtos: entrou, saiu, jogo liberado
//   GameSelected   alguém escolheu um jogo no celular → transição para a partida
//
// A TV da casa é um Chrome de 2016: modo estrito obrigatório para let/const, e nada de
// parâmetro padrão, desestruturação, catch sem variável nem async/await. Ver docs/TV-ANTIGA.md.
'use strict';
window.ARCADE.tvLobby = (() => {
  const A = window.ARCADE, esc = A.esc;
  let root = null, over = null, el = {}, prev = null, netsKey = '', gamesKey = '', trackObs = null;

  // ---------- ajudantes ----------
  // Cores das categorias (o texto em cima delas é sempre tinta #0f0f14).
  const CATS = [['desenho', 'Desenho', '#b08cff'], ['palavras', 'Palavras', '#3db4f2'], ['cartas', 'Cartas', '#f0443a'], ['festa', 'Festa', '#ff7ab8'], ['acao', 'Ação', '#35d07f'], ['videogame', 'Videogame', '#ff9a3c']];
  const cat = g => CATS.find(c => c[0] === (g && g.category)) || ['', '', '#ffce1f'];
  const initial = n => (String(n || '').match(/[A-Za-z0-9À-ɏ]/) || ['?'])[0].toUpperCase();   // sem \p{L}: o browser da TV é antigo
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const short = u => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const noEmoji = s => String(s || '').replace(/^[^A-Za-z0-9À-ɏ]+/, '');   // "📶 Aqui no Wi-Fi" → "Aqui no Wi-Fi"
  const range = g => { const min = g.minPlayers || 2, max = g.maxPlayers || 8; return min === max ? plural(min, 'jogador', 'jogadores') : `${min} a ${max} jogadores`; };
  // querySelectorAll devolve uma NodeList; o Chrome 47 não percorre NodeList com for...of nem [...]
  const qa = (raiz, sel) => Array.prototype.slice.call(raiz.querySelectorAll(sel));
  const logo = '<div class="tvl-logo pix">ARCADE<br><span>DA CASA</span></div>';
  // Quadrado da pessoa: fundo na cor dela, boneco por cima (shared/avatar.js); sem boneco, a inicial.
  function avatar(c, p) {
    const col = c.ci(p.color);
    const AV = A.avatar;
    const face = AV ? AV.svg(p.av, col.hex) : `<b class="disp">${esc(initial(p.name))}</b>`;
    return { hex: col.hex, sig: col.hex + '|' + (p.av || []).join(',') + '|' + (AV ? '' : initial(p.name)), html: `<span class="tvl-tile${AV ? ' face' : ''}" style="background-color:${col.hex}">${face}</span>` };
  }

  // ---------- montagem (uma vez) ----------
  function mount(node) {
    root = node;
    root.innerHTML = `
      <header class="tvl-bar">
        ${logo}
        <div class="tvl-cats mono">${CATS.map(c => `<span class="tvl-cat"><i style="background:${c[2]}"></i>${esc(c[1])}</span>`).join('')}</div>
      </header>
      <main class="tvl-main">
        <section class="tvl-left">
          <h1 class="tvl-h1 disp">Todo mundo joga.<br>Cada um no<br>seu celular.</h1>
          <div class="tvl-row">
            <div class="tvl-codebox dots"><div class="tvl-codek mono">Sala</div><div class="tvl-code pix"></div></div>
            <div class="tvl-people">
              <div class="tvl-count mono"></div>
              <div class="tvl-chips"></div>
              <div class="tvl-empty mono">Ninguém ainda.<br>Escaneie o QR <span>▸</span></div>
            </div>
          </div>
        </section>
        <aside class="tvl-join">
          <div class="tvl-join-k disp"></div>
          <div class="tvl-qrs"></div>
          <div class="tvl-join-hint mono"></div>
        </aside>
      </main>
      <footer class="tvl-show">
        <div class="tvl-show-k"><span class="tvl-show-tag disp">Jogos da casa</span><span class="tvl-show-n pix"></span><span class="tvl-hint mono"></span></div>
        <div class="tvl-track-wrap"><div class="tvl-track"></div></div>
      </footer>
      <div class="tvl-announce"></div>`;
    const q = s => root.querySelector(s);
    el = { code: q('.tvl-code'), chips: q('.tvl-chips'), count: q('.tvl-count'), hint: q('.tvl-hint'),
      joinK: q('.tvl-join-k'), qrs: q('.tvl-qrs'), joinHint: q('.tvl-join-hint'), showN: q('.tvl-show-n'), wrap: q('.tvl-track-wrap'), track: q('.tvl-track'), ann: q('.tvl-announce') };
    over = document.getElementById('tvl-over') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'tvl-over' });
    prev = null; netsKey = ''; gamesKey = '';
    if (!trackObs && 'ResizeObserver' in window) { trackObs = new ResizeObserver(() => fitTrack()); trackObs.observe(el.wrap); }
    else if (!trackObs) { trackObs = true; window.addEventListener('resize', () => fitTrack()); }   // Chrome 47 não tem ResizeObserver
  }

  // ---------- atualização (a cada estado da sala) ----------
  function update(c) {
    const ps = c.C.players, n = ps.length;
    root.dataset.state = n ? 'crowd' : 'empty';
    root.dataset.size = n <= 5 ? 'l' : n <= 8 ? 'm' : 's';
    RoomIdentity(c);
    JoinPanel(c, n);
    PlayerList(c, ps);
    GameShowcase(c, n);
    react(c, ps, n);
    prev = { players: ps.map(p => ({ pid: p.pid, name: p.name, color: p.color })), n };
  }

  function RoomIdentity(c) { const code = c.room || ''; if (el.code.textContent !== code) el.code.textContent = code; }

  function JoinPanel(c, n) {
    const nets = (c.meta.nets || []).filter(x => x.qr);
    const key = nets.map(x => x.url).join('|');
    if (key !== netsKey) {
      netsKey = key;
      el.qrs.className = 'tvl-qrs' + (nets.length > 1 ? ' two' : '');
      el.qrs.innerHTML = nets.map(x => `<div class="tvl-qr"><div class="tvl-qr-img">${x.qr}</div>${nets.length > 1 ? `<div class="tvl-qr-label mono">${esc(noEmoji(x.label))}</div>` : ''}<div class="tvl-qr-url mono">${esc(short(x.url))}</div></div>`).join('')
        || '<div class="tvl-qr-url mono">Abra o endereço da TV no celular</div>';
    }
    el.joinK.innerHTML = n ? 'Mais gente?<br>Escaneie' : 'Escaneie<br>para entrar';
    el.joinHint.textContent = 'ou abra o site e digite o código';
  }

  // Quadrados: um por jogador, chaveados pelo pid. Quem entra aparece com "pop"; quem sai some com "drop".
  function PlayerList(c, ps) {
    const have = new Map(qa(el.chips, '.tvl-chipw').map(x => [x.dataset.pid, x]));
    const keep = new Set();
    ps.forEach((p, i) => {
      keep.add(p.pid);
      let w = have.get(p.pid);
      const av = avatar(c, p);
      if (!w) {   // o wrapper faz o pop/drop; o quadrado de dentro tem a própria sombra
        w = document.createElement('div');
        w.className = 'tvl-chipw'; w.dataset.pid = p.pid;
        w.innerHTML = `<div class="tvl-chip">${av.html}<span class="tvl-nm"></span></div>`;
      }
      const chip = w.firstElementChild;
      chip.classList.toggle('off', p.on === false);
      w.classList.remove('out');
      const nm = chip.querySelector('.tvl-nm'); if (nm.textContent !== p.name) nm.textContent = p.name;
      if (chip.dataset.av !== av.sig) { chip.dataset.av = av.sig; const old = chip.querySelector('.tvl-tile'); old.outerHTML = av.html; }   // trocou o boneco ou a cor: troca o quadrado
      if (el.chips.children[i] !== w) el.chips.insertBefore(w, el.chips.children[i] || null);
    });
    have.forEach((w, pid) => {
      if (keep.has(pid) || w.classList.contains('out')) return;
      w.classList.add('out'); setTimeout(() => w.remove(), 420);
    });
    el.count.innerHTML = `Na sala · <b class="pix">${ps.length}</b>`;
    // ainda não dá para jogar nada? A dica é chamar gente, não escolher jogo.
    const need = Math.min.apply(Math, (c.meta.games || []).map(g => g.minPlayers || 2).concat([Infinity]));
    const falta = need - ps.length;
    const txt = falta > 0 && ps.length
      ? `· ${falta === 1 ? 'Falta' : 'Faltam'} ${plural(falta, 'pessoa', 'pessoas')} para o primeiro jogo`
      : ps.length ? '· Escolha pelo celular' : '· Entre e escolha pelo celular';
    if (el.hint.textContent !== txt) el.hint.textContent = txt;
  }

  // Prateleira: cartões montados uma vez; a cada estado só muda o que depende de quantos estão na sala.
  function GameShowcase(c, n) {
    const games = c.meta.games || [];
    const key = games.map(g => g.id).join('|');
    if (key !== gamesKey) {
      gamesKey = key;
      el.track.innerHTML = games.map(GamePreview).join('');
      el.showN.textContent = games.length;
      fitTrack();
    }
    for (const g of games) for (const node of qa(el.track, `[data-id="${g.id}"]`)) {
      const min = g.minPlayers || 2, max = g.maxPlayers || 8;
      const lock = n > 0 && (n < min || n > max);
      node.classList.toggle('lock', lock);
      const req = node.querySelector('.tvl-req b');
      const txt = !lock ? range(g) : n > max ? `Até ${plural(max, 'jogador', 'jogadores')}` : `Mais ${plural(min - n, 'jogador', 'jogadores')}`;
      if (req.textContent !== txt) req.textContent = txt;
    }
  }
  function GamePreview(g) {
    const hex = cat(g)[2];
    return `<div class="tvl-poster" data-id="${esc(g.id)}">
      <div class="tvl-cover dots pix" style="background-color:${hex}">${esc(g.glyph || initial(g.name))}</div>
      <div class="tvl-pbody">
        <div class="tvl-gname">${esc(g.name)}</div>
        <div class="tvl-req mono"><i style="background:${hex}"></i><b></b></div>
      </div>
    </div>`;
  }
  // Se os cartões não cabem na largura, a fila anda devagar e sem fim (conteúdo dobrado para o laço fechar).
  // Se cabem, ficam parados. Nada de navegação: é ambiente.
  function fitTrack() {
    if (!el.track || !el.wrap) return;
    const posters = qa(el.track, '.tvl-poster');
    const singles = posters.filter(p => !p.dataset.dup);
    for (const p of posters) if (p.dataset.dup) p.remove();
    el.track.className = 'tvl-track';
    el.track.style.animation = 'none';
    const w = el.track.scrollWidth, avail = el.wrap.clientWidth;
    if (!singles.length || w <= avail) { el.track.classList.add('still'); return; }
    for (const p of singles) { const d = p.cloneNode(true); d.dataset.dup = '1'; el.track.appendChild(d); }
    el.track.style.animation = '';
    el.track.style.animationDuration = `${Math.round(w / 26)}s`;   // ~26 px/s: dá para ler, não distrai
    void el.track.offsetWidth;
    el.track.classList.add('drift');
  }

  // ---------- reações: o que mudou desde o último estado ----------
  function react(c, ps, n) {
    if (!prev) return;   // primeira tela (ou volta de um jogo): nada a anunciar
    const was = new Map(prev.players.map(p => [p.pid, p])), now = new Map(ps.map(p => [p.pid, p]));
    let joined = ps.filter(p => !was.has(p.pid)), left = prev.players.filter(p => !now.has(p.pid));
    // mesmo nome saindo e entrando = a vaga foi retomada por outro celular; não é novidade para a sala
    const swap = new Set(left.filter(l => joined.some(j => j.name === l.name)).map(l => l.name));
    joined = joined.filter(p => !swap.has(p.name)); left = left.filter(p => !swap.has(p.name));
    for (const p of joined) announce({ kicker: 'Entrou na sala', title: p.name, color: c.ci(p.color).hex, tile: avatar(c, p).html });
    for (const p of left) announce({ kicker: 'Saiu da sala', title: p.name, color: '#ffffff', ms: 1600 });
    if (n > prev.n) unlocked((c.meta.games || []).filter(g => prev.n < (g.minPlayers || 2) && n >= (g.minPlayers || 2)));
  }
  // Jogos que acabaram de ficar disponíveis: um aviso só, mesmo que vários liberem juntos.
  function unlocked(list) {
    if (!list.length) return;
    for (const g of list) for (const node of qa(el.track, `[data-id="${g.id}"]`)) { node.classList.remove('unlocked'); void node.offsetWidth; node.classList.add('unlocked'); }
    const g = list[0];
    const title = list.length === 1 ? g.name : list.length === 2 ? `${list[0].name} e ${list[1].name}` : `${list[0].name}, ${list[1].name} e mais ${list.length - 2}`;
    announce({ kicker: list.length === 1 ? 'Novo jogo liberado' : `${list.length} jogos liberados`, title, color: cat(g)[2], glyph: list.length === 1 ? (g.glyph || '') : '', ms: 2600 });
  }

  // Avisos em fila: um de cada vez, curtos, sem interromper o lobby.
  const queue = []; let showing = false;
  function announce(a) { queue.push(a); pump(); }
  function pump() {
    if (showing || !queue.length || !el.ann) return;
    const a = queue.shift(); showing = true;
    const side = a.tile || (a.glyph ? `<span class="tvl-ann-glyph pix">${esc(a.glyph)}</span>` : '');
    el.ann.innerHTML = `<div class="tvl-ann dots" style="background-color:${a.color}">${side}<div class="tvl-ann-txt"><small class="mono">${esc(a.kicker)}</small><b class="disp">${esc(a.title)}</b></div></div>`;
    const node = el.ann.firstElementChild;
    setTimeout(() => { node.classList.add('out'); setTimeout(() => { if (node.parentNode) node.remove(); showing = false; pump(); }, 360); }, a.ms || 2200);
  }

  // ---------- alguém escolheu um jogo no celular ----------
  // Tela inteira na cor da categoria: carta inclinada com o símbolo do jogo, quem escolheu, nome gigante.
  let overT = null, tickT = null;
  function gameSelected(c) {
    const g = c.game(); if (!g || !g.id) return;
    const by = c.C.players.find(p => p.pid === c.C.startedBy);
    const k = cat(g), glyph = esc(g.glyph || initial(g.name));
    const len = String(g.name).length;
    const size = len <= 5 ? 'xl' : len <= 9 ? 'l' : len <= 15 ? 'm' : 's';
    clearTimeout(overT); clearInterval(tickT);
    over.innerHTML = `<div class="tvl-over dots" style="background-color:${k[2]}">
      <div class="tvl-obar">${logo}<div class="tvl-oroom mono">Sala <span class="pix">${esc(c.room || '')}</span></div></div>
      <div class="tvl-over-in">
        <div class="tvl-ocard"><span class="pix">${glyph}</span><span class="pix tvl-ocard-r">${glyph}</span></div>
        <div class="tvl-oinfo">
          <div class="tvl-who">${by ? `${avatar(c, by).html}<span class="disp">${esc(by.name)} escolheu</span>` : '<span class="disp">Escolhido no celular</span>'}</div>
          <h1 class="tvl-oname disp ${size}">${esc(g.name)}</h1>
          <div class="tvl-otags">${k[1] ? `<span class="mono">${esc(k[1])}</span>` : ''}<span class="mono">${esc(range(g))}</span></div>
          <div class="tvl-ogo mono">Peguem os celulares <span class="tvl-ogo-arrow">▸</span> começa em <b class="pix">3</b></div>
        </div>
      </div>
    </div>`;
    let left = 3;
    const num = over.querySelector('.tvl-ogo b');
    tickT = setInterval(() => { left--; if (left < 1) { clearInterval(tickT); return; } if (num) num.textContent = left; }, 1000);
    overT = setTimeout(() => { clearInterval(tickT); const o = over.firstElementChild; if (!o) return; o.classList.add('out'); setTimeout(() => { over.innerHTML = ''; }, 460); }, 3200);
  }
  function backToLobby() { clearTimeout(overT); clearInterval(tickT); over.innerHTML = ''; prev = null; announce({ kicker: 'De volta ao lobby', title: 'Escolham o próximo jogo', color: '#ffce1f', ms: 2400 }); }

  return { mount, update, gameSelected, backToLobby, refit: fitTrack };
})();
