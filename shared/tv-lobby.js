// Lobby da TV: o palco da sala antes de um jogo começar.
// A TV é passiva. Ela mostra quem está na sala, como entrar e o que dá para jogar,
// e reage ao que os celulares fazem. Nada aqui é clicável.
//
// Componentes (cada um cuida de um pedaço do DOM, montado uma vez e atualizado por dentro):
//   RoomStatus     cabeçalho: marca pequena, código da sala, quantos jogadores
//   RoomIdentity   herói da sala vazia: marca grande, frase, código gigante
//   JoinPanel      QR + como entrar (grande sem ninguém, discreto com gente)
//   PlayerList     crachás de quem está na sala (PlayerAvatar = inicial + cor)
//   GameShowcase   vitrine dos jogos (GamePreview = pôster com arte, nome e jogadores)
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
  const artColor = g => (String(g.art || '').match(/#[0-9a-f]{6}|#[0-9a-f]{3}\b/i) || ['#f59e0b'])[0];
  const initial = n => (String(n || '').match(/[A-Za-z0-9\u00C0-\u024F]/) || ['?'])[0].toUpperCase();   // sem \p{L}: o browser da TV é antigo
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const short = u => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');
  function avatar(c, p) {
    const col = c.ci(p.color);
    return { style: `--c:${col.hex};--ink:${col.dark ? '#fff' : '#111'}`, html: `<span class="tvl-av"><span>${esc(initial(p.name))}</span></span>` };
  }

  // ---------- montagem (uma vez) ----------
  function mount(node) {
    root = node;
    root.innerHTML = `
      <header class="tvl-head">
        <div class="tvl-brand tvl-display">Arcade <span>da Casa</span></div>
        <div class="tvl-status">
          <div class="tvl-pill tvl-pill-room">Sala <b class="tvl-code-sm"></b></div>
          <div class="tvl-pill tvl-pill-n"><span class="tvl-dots"></span><span class="tvl-n"></span></div>
        </div>
      </header>
      <main class="tvl-main">
        <section class="tvl-hero">
          <h1 class="tvl-display tvl-title">Arcade <span>da Casa</span></h1>
          <p class="tvl-tag">Todo mundo joga.<br>Cada um no seu celular.</p>
          <div class="tvl-roomlabel">Sala</div>
          <div class="tvl-code tvl-display"></div>
        </section>
        <section class="tvl-people">
          <div class="tvl-chips"></div>
          <div class="tvl-callout"><span class="tvl-count"></span><span class="tvl-sep"></span><span class="tvl-hint"></span></div>
        </section>
        <aside class="tvl-join">
          <div class="tvl-join-k"></div>
          <div class="tvl-qrs"></div>
          <div class="tvl-join-hint"></div>
        </aside>
      </main>
      <footer class="tvl-show">
        <div class="tvl-show-k"><span>Jogos da casa</span><span class="tvl-show-n"></span></div>
        <div class="tvl-track-wrap"><div class="tvl-track"></div></div>
      </footer>
      <div class="tvl-announce"></div>`;
    const q = s => root.querySelector(s);
    el = { codeSm: q('.tvl-code-sm'), dots: q('.tvl-dots'), n: q('.tvl-n'), code: q('.tvl-code'), chips: q('.tvl-chips'), count: q('.tvl-count'), hint: q('.tvl-hint'),
      joinK: q('.tvl-join-k'), qrs: q('.tvl-qrs'), joinHint: q('.tvl-join-hint'), showN: q('.tvl-show-n'), wrap: q('.tvl-track-wrap'), track: q('.tvl-track'), ann: q('.tvl-announce') };
    over = document.getElementById('tvl-over') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'tvl-over' });
    prev = null; netsKey = ''; gamesKey = '';
    if (!trackObs && 'ResizeObserver' in window) { trackObs = new ResizeObserver(() => fitTrack()); trackObs.observe(el.wrap); }
  }

  // ---------- atualização (a cada estado da sala) ----------
  function update(c) {
    const ps = c.C.players, n = ps.length;
    root.dataset.state = n ? 'crowd' : 'empty';
    root.dataset.size = n <= 4 ? 'l' : n <= 8 ? 'm' : 's';
    RoomStatus(c, ps);
    RoomIdentity(c);
    JoinPanel(c, n);
    PlayerList(c, ps);
    GameShowcase(c, n);
    react(c, ps, n);
    prev = { players: ps.map(p => ({ pid: p.pid, name: p.name, color: p.color })), n };
  }

  function RoomStatus(c, ps) {
    el.codeSm.textContent = c.room || '';
    el.n.textContent = ps.length ? plural(ps.length, 'jogador', 'jogadores') : 'Ninguém ainda';
    el.dots.innerHTML = ps.slice(0, 8).map(p => `<i style="background:${c.ci(p.color).hex}"></i>`).join('');
  }

  function RoomIdentity(c) { el.code.textContent = c.room || ''; }

  function JoinPanel(c, n) {
    const nets = (c.meta.nets || []).filter(x => x.qr);
    const key = nets.map(x => x.url).join('|');
    if (key !== netsKey) {
      netsKey = key;
      el.qrs.className = 'tvl-qrs' + (nets.length > 1 ? ' two' : '');
      el.qrs.innerHTML = nets.map(x => `<div class="tvl-qr">${x.qr}<div class="tvl-qr-label">${esc(x.label)}</div><div class="tvl-qr-url">${esc(short(x.url))}</div></div>`).join('')
        || '<div class="tvl-qr-url">Abra o endereço da TV no celular</div>';
    }
    el.joinK.textContent = n ? 'Mais gente? Escaneie' : 'Escaneie para entrar';
    el.joinHint.innerHTML = n ? `ou digite o código <b>${esc(c.room || '')}</b>` : 'A câmera do celular já lê o código';
  }

  // Crachás: um por jogador, chaveados pelo pid. Quem entra aparece com "pop"; quem sai some com "drop".
  function PlayerList(c, ps) {
    const have = new Map([...el.chips.querySelectorAll('.tvl-chip')].map(x => [x.dataset.pid, x]));
    const keep = new Set();
    ps.forEach((p, i) => {
      keep.add(p.pid);
      let chip = have.get(p.pid);
      const av = avatar(c, p);
      if (!chip) {
        chip = document.createElement('div');
        chip.className = 'tvl-chip'; chip.dataset.pid = p.pid;
        chip.innerHTML = `${av.html}<span class="tvl-nm"></span>`;
      }
      chip.style.cssText = av.style;
      chip.classList.toggle('off', p.on === false);
      chip.classList.remove('out');
      const nm = chip.querySelector('.tvl-nm'); if (nm.textContent !== p.name) nm.textContent = p.name;
      const ini = chip.querySelector('.tvl-av span'); if (ini.textContent !== initial(p.name)) ini.textContent = initial(p.name);
      if (el.chips.children[i] !== chip) el.chips.insertBefore(chip, el.chips.children[i] || null);
    });
    have.forEach((chip, pid) => {
      if (keep.has(pid) || chip.classList.contains('out')) return;
      chip.classList.add('out'); setTimeout(() => chip.remove(), 420);
    });
    el.count.textContent = ps.length ? `${plural(ps.length, 'jogador', 'jogadores')} na sala` : '';
    // ainda não dá para jogar nada? A dica é chamar gente, não escolher jogo.
    const need = Math.min(...(c.meta.games || []).map(g => g.minPlayers || 2), Infinity);
    const falta = need - ps.length;
    el.hint.innerHTML = falta > 0 && ps.length
      ? `<span class="tvl-phone">📲</span> ${falta === 1 ? 'Falta' : 'Faltam'} ${plural(falta, 'pessoa', 'pessoas')} para o primeiro jogo`
      : `<span class="tvl-phone">📱</span> Escolha um jogo pelo celular`;
  }

  // Vitrine: pôsteres montados uma vez; a cada estado só muda o que depende de quantos estão na sala.
  function GameShowcase(c, n) {
    const games = c.meta.games || [];
    const key = games.map(g => g.id).join('|');
    if (key !== gamesKey) {
      gamesKey = key;
      el.track.innerHTML = games.map(GamePreview).join('');
      el.showN.textContent = plural(games.length, 'jogo', 'jogos');
      fitTrack();
    }
    for (const g of games) for (const node of el.track.querySelectorAll(`[data-id="${g.id}"]`)) {
      const min = g.minPlayers || 2, max = g.maxPlayers || 8;
      const lock = n > 0 && (n < min || n > max);
      node.classList.toggle('lock', lock);
      const req = node.querySelector('.tvl-req');
      const txt = !lock ? `${min} a ${max} jogadores` : n > max ? `Até ${max} jogadores` : `Mais ${plural(min - n, 'jogador', 'jogadores')}`;
      if (req.textContent !== txt) req.textContent = txt;
    }
  }
  function GamePreview(g) {
    return `<div class="tvl-poster" data-id="${esc(g.id)}" style="--c:${artColor(g)}">
      <div class="tvl-art" style="background:${g.art || 'linear-gradient(135deg,#334155,#0f172a)'}"></div>
      <div class="tvl-emoji">${g.emoji || '🎲'}</div>
      <div class="tvl-gname tvl-display">${esc(g.name)}</div>
      <div class="tvl-req"></div>
    </div>`;
  }
  // Se os pôsteres não cabem na largura, a fila anda devagar e sem fim (conteúdo dobrado para o laço fechar).
  // Se cabem, ficam parados e centralizados. Nada de navegação: é ambiente.
  function fitTrack() {
    if (!el.track || !el.wrap) return;
    const posters = [...el.track.querySelectorAll('.tvl-poster')];
    const singles = posters.filter(p => !p.dataset.dup);
    for (const p of posters) if (p.dataset.dup) p.remove();
    el.track.className = 'tvl-track';
    el.track.style.animation = 'none';
    const w = el.track.scrollWidth, avail = el.wrap.clientWidth;
    if (!singles.length || w <= avail) { el.track.classList.add('still'); return; }
    for (const p of singles) { const d = p.cloneNode(true); d.dataset.dup = '1'; el.track.appendChild(d); }
    el.track.style.setProperty('--dur', `${Math.round(w / 26)}s`);   // ~26 px/s: dá para ler, não distrai
    el.track.style.animation = '';
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
    for (const p of joined) { const col = c.ci(p.color); announce({ kicker: 'Entrou na sala', title: p.name, color: col.hex, ink: col.dark ? '#fff' : '#111' }); glow(col.hex); }
    for (const p of left) announce({ kicker: 'Saiu da sala', title: p.name, color: '#1f2740', ink: '#c9d3ea', ms: 1600 });
    if (n > prev.n) unlocked((c.meta.games || []).filter(g => prev.n < (g.minPlayers || 2) && n >= (g.minPlayers || 2)));
  }
  // Jogos que acabaram de ficar disponíveis: um aviso só, mesmo que vários liberem juntos.
  function unlocked(list) {
    if (!list.length) return;
    for (const g of list) for (const node of el.track.querySelectorAll(`[data-id="${g.id}"]`)) { node.classList.remove('unlocked'); void node.offsetWidth; node.classList.add('unlocked'); }
    const g = list[0];
    const title = list.length === 1 ? `${g.emoji || ''} ${g.name}` : list.length === 2 ? `${list[0].name} e ${list[1].name}` : `${list[0].name}, ${list[1].name} e mais ${list.length - 2}`;
    announce({ kicker: list.length === 1 ? 'Novo jogo liberado' : `${list.length} jogos liberados`, title, color: artColor(g), ink: '#fff', ms: 2600 });
    glow(artColor(g));
  }
  function glow(color) { if (root) root.style.setProperty('--glow', color); }

  // Avisos em fila: um de cada vez, curtos, sem interromper o lobby.
  const queue = []; let showing = false;
  function announce(a) { queue.push(a); pump(); }
  function pump() {
    if (showing || !queue.length || !el.ann) return;
    const a = queue.shift(); showing = true;
    el.ann.innerHTML = `<div class="tvl-ann" style="--c:${a.color};--ink:${a.ink}"><small>${esc(a.kicker)}</small><b>${esc(a.title)}</b></div>`;
    const node = el.ann.firstElementChild;
    setTimeout(() => { node.classList.add('out'); setTimeout(() => { if (node.parentNode) node.remove(); showing = false; pump(); }, 360); }, a.ms || 2200);
  }

  // ---------- alguém escolheu um jogo no celular ----------
  let overT = null;
  function gameSelected(c) {
    const g = c.game(); if (!g || !g.id) return;
    const by = c.C.players.find(p => p.pid === c.C.startedBy);
    const av = by ? avatar(c, by) : null;
    clearTimeout(overT);
    over.innerHTML = `<div class="tvl-over" style="--art:${g.art || '#1e293b'}"><div class="tvl-over-in">
      ${by ? `<div class="tvl-who" style="${av.style}">${av.html}<span>${esc(by.name)}</span><em>escolheu…</em></div>` : `<div class="tvl-who" style="--c:#161d33;--ink:#c9d3ea"><em>Escolhido no celular…</em></div>`}
      <div class="tvl-over-emoji">${g.emoji || '🎲'}</div>
      <div class="tvl-over-name tvl-display">${esc(g.name)}</div>
      <div class="tvl-over-tag">${esc(g.tagline || '')}</div>
      <div class="tvl-over-prep">Preparando partida<i></i><i></i><i></i></div>
    </div></div>`;
    overT = setTimeout(() => { const o = over.firstElementChild; if (!o) return; o.classList.add('out'); setTimeout(() => { over.innerHTML = ''; }, 460); }, 3200);
  }
  function backToLobby() { clearTimeout(overT); over.innerHTML = ''; prev = null; announce({ kicker: 'De volta ao lobby', title: 'Escolham o próximo jogo', color: '#161d33', ink: '#e8ddc7', ms: 2400 }); }

  return { mount, update, gameSelected, backToLobby, refit: fitTrack };
})();
