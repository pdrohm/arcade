// Truco: a mão fica no celular de cada pessoa. A TV recebe apenas as cartas já jogadas.
'use strict';
(() => {
  const A = ARCADE;
  const variants = { paulista: 'Paulista', mineiro: 'Mineiro', gaucho: 'Gaudério' };
  const calls = { truco: 'Truco!', envido: 'Envido', real_envido: 'Real envido', falta_envido: 'Falta envido', flor: 'Flor', contra_flor: 'Contra flor', contra_flor_resto: 'Contra flor ao resto' };
  const suits = {
    french: { S: ['♠', 'Espadas'], H: ['♥', 'Copas'], D: ['♦', 'Ouros'], C: ['♣', 'Paus'] },
    spanish: { E: ['E', 'Espadas'], B: ['B', 'Bastos'], O: ['O', 'Ouros'], C: ['C', 'Copas'] },
  };
  const TRUCO_NAMES = {
    paulista: { 3: 'Truco!', 6: 'Seis!', 9: 'Nove!', 12: 'Doze!' },
    mineiro: { 4: 'Truco!', 6: 'Seis!', 10: 'Dez!', 12: 'Doze!' },
    gaucho: { 2: 'Truco!', 3: 'Retruco!', 4: 'Vale quatro!' },
  };
  let styled = false, lastTurn = '', picked = null;
  const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (err) { /* opcional */ } };
  const css = `
    .tr-phone { color:#0f0f14; display:flex; flex-direction:column; gap:14px; }
    .tr-panel { background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:14px; }
    .tr-panel.tr-head { background-color:#f0443a; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .tr-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    .tr-kicker { font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.08em; color:#0f0f14; font-size:12px; font-weight:700; }
    .tr-title { font-size:30px; line-height:.95; margin:6px 0 0; font-weight:900; font-stretch:125%; text-transform:uppercase; letter-spacing:-.01em; }
    .tr-score { display:flex; align-items:stretch; margin-top:14px; }
    .tr-score-side { flex:1; text-align:center; padding:8px 5px; min-width:0; background:#fff; border:3px solid #0f0f14; }
    .tr-score-side small { display:block; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .tr-score-side b { display:block; font-family:'Pixelify Sans',monospace; font-size:34px; font-weight:700; line-height:1.05; }
    .tr-score-side.mine { background:#ffce1f; }
    .tr-score-mid { display:flex; align-items:center; padding:0 8px; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; }
    .tr-strip { display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin-top:12px; }
    .tr-pill { display:inline-flex; align-items:center; border:2px solid #0f0f14; padding:4px 8px; background:#fff; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; white-space:nowrap; }
    .tr-turn { display:inline-block; font-size:20px; font-weight:900; font-stretch:125%; text-transform:uppercase; line-height:1.05; margin:8px 0 2px; }
    .tr-turn.mine { background:#ffce1f; border:3px solid #0f0f14; padding:4px 8px; }
    .tr-caption { font-size:14px; color:#3a3a42; line-height:1.4; }
    .tr-section-title { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin:0 0 10px; }
    .tr-table { display:flex; justify-content:center; flex-wrap:wrap; gap:10px; min-height:95px; align-items:center; }
    .tr-played { display:flex; flex-direction:column; align-items:center; gap:5px; min-width:58px; }
    .tr-played small { font-size:12px; font-weight:800; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tr-played.winner .tr-card { box-shadow:0 0 0 3px #ffce1f,5px 5px 0 3px #0f0f14; transform:translateY(-5px); }
    .tr-played.dim { opacity:.5; }
    .tr-reveal { position:relative; overflow:hidden; text-align:center; border:3px solid #0f0f14; background:#ffce1f; padding:14px 16px 18px; box-shadow:5px 5px 0 #0f0f14; }
    .tr-reveal.tie { background:#e4e2d9; }
    .tr-reveal .result-small { display:block; font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    .tr-reveal .result-main { display:block; margin-top:6px; font-size:22px; line-height:1.05; font-weight:900; font-stretch:125%; text-transform:uppercase; }
    .tr-reveal .result-detail { display:block; margin-top:6px; font-size:14px; font-weight:700; }
    .tr-reveal .result-time { position:absolute; bottom:0; left:0; right:0; height:7px; background:#fff; border-top:2px solid #0f0f14; }
    .tr-reveal .result-time:after { content:''; display:block; height:100%; background:#0f0f14; transform-origin:left; animation:tr-reveal-time var(--reveal-left) linear forwards; }
    @keyframes tr-reveal-time { to { transform:scaleX(0); } }
    @keyframes tr-reveal-enter { from { opacity:0; transform:translateY(10px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    @media (prefers-reduced-motion:no-preference) { .tr-reveal { animation:tr-reveal-enter .38s ease-out both; } .tr-played.winner .tr-card { animation:tr-reveal-enter .4s ease-out both; } }
    .tr-empty { font-size:14px; color:#55555e; text-align:center; }
    .tr-card { position:relative; flex:none; width:74px; height:108px; border-radius:6px; background:#fff; color:#0f0f14; border:2.5px solid #0f0f14; box-shadow:3px 3px 0 #0f0f14; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; padding:0; }
    .tr-card.red { color:#d02a20; } .tr-card.spanish { background:#fff; }
    .tr-card.spanish .tr-art { display:block; width:100%; height:100%; object-fit:fill; pointer-events:none; }
    .tr-card.spanish .tr-value { position:absolute; top:4px; left:4px; min-width:25px; height:27px; padding:0 3px; display:flex; align-items:center; justify-content:center; border:2px solid #0f0f14; background:#fff; color:#0f0f14; font-family:'Pixelify Sans',monospace; font-size:17px; line-height:1; font-weight:700; }
    .tr-card.spanish .tr-face { position:absolute; right:3px; bottom:5px; padding:2px 4px; background:#0f0f14; color:#fff; font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.03em; font-weight:700; text-transform:uppercase; }
    .tr-card.back { background:#fff url('/cards/spanish/back.webp') center / 100% 100% no-repeat; }
    .tr-card .corner { position:absolute; top:5px; left:6px; font-size:13px; font-weight:900; line-height:1; text-align:center; }
    .tr-card .center { font-size:35px; line-height:1; }
    .tr-card .name { font-family:'JetBrains Mono',monospace; font-size:8px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; margin-top:5px; }
    .tr-card .number { font-size:19px; font-weight:900; line-height:1; }
    .tr-card .mirror { position:absolute; right:6px; bottom:5px; transform:rotate(180deg); font-size:13px; font-weight:900; }
    .tr-hand { display:flex; justify-content:center; align-items:flex-end; gap:10px; padding:18px 0 9px; }
    .tr-hand .tr-card { width:calc((100vw - 90px)/3); max-width:103px; height:148px; cursor:pointer; touch-action:manipulation; box-shadow:4px 4px 0 #0f0f14; }
    .tr-hand .tr-card.spanish { height:auto; aspect-ratio:208 / 320; }
    .tr-hand .tr-card .center { font-size:46px; }
    .tr-hand .tr-card .number { font-size:27px; }
    .tr-hand button.tr-card { font:inherit; color:#0f0f14; }
    .tr-hand button.tr-card.red { color:#d02a20; }
    .tr-hand .tr-card:disabled { opacity:.6; cursor:default; box-shadow:none; }
    .tr-hand .tr-card:not(:disabled):active { transform:translateY(-8px); }
    .tr-hand .tr-card:focus-visible, .tr-action:focus-visible, .tr-choice:focus-visible { outline:3px solid #3db4f2; outline-offset:3px; }
    .tr-help { text-align:center; color:#55555e; font-size:13px; margin:8px 0 0; }
    .tr-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .tr-action { min-height:52px; border:3px solid #0f0f14; border-radius:0; background:#ffce1f; color:#0f0f14; box-shadow:4px 4px 0 #0f0f14; font-family:inherit; font-size:16px; font-weight:900; font-stretch:115%; text-transform:uppercase; letter-spacing:-.01em; padding:10px; cursor:pointer; transition:transform .06s, box-shadow .06s; }
    .tr-action.secondary { background:#fff; }
    .tr-action.ok { background:#35d07f; }
    .tr-action.danger { background:#f0443a; }
    .tr-action.wide { grid-column:1 / -1; }
    .tr-action:active,.tr-choice:active { transform:translate(3px,3px); box-shadow:1px 1px 0 #0f0f14; }
    .tr-action:disabled { opacity:.4; box-shadow:none; cursor:default; }
    .tr-choices { display:grid; gap:10px; }
    .tr-choice { display:flex; justify-content:space-between; align-items:center; width:100%; border:3px solid #0f0f14; border-radius:0; background:#fff; color:#0f0f14; box-shadow:4px 4px 0 #0f0f14; padding:13px 15px; font-family:inherit; font-weight:900; font-stretch:115%; text-transform:uppercase; font-size:17px; cursor:pointer; text-align:left; transition:transform .06s, box-shadow .06s; }
    .tr-choice.selected { background:#ffce1f; }
    .tr-event { text-align:center; font-size:14px; color:#0f0f14; padding:2px 8px 8px; }
    .tr-card .top { position:absolute; top:4px; right:4px; padding:2px 4px; background:#0f0f14; color:#ffce1f; font-family:'JetBrains Mono',monospace; font-size:8px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; }
    .tr-hand .tr-card { transition:transform .18s, box-shadow .18s; }
    .tr-hand .tr-card.picked { transform:translateY(-14px); box-shadow:0 0 0 4px #ffce1f,6px 6px 0 4px #0f0f14; }
    .tr-hand .tr-card.out { transform:translateY(-120px) scale(.6); opacity:0; transition:transform .3s ease-in, opacity .3s; }
    .tr-order { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
    .tr-order span { padding:4px 8px; font-size:13px; font-weight:800; background:#fff; border:2px solid #0f0f14; }
    .tr-order span.tr-now { background:#ffce1f; box-shadow:3px 3px 0 #0f0f14; }
    .tr-order span.me { text-decoration:underline; text-decoration-thickness:2px; }
    .tr-order span.done { opacity:.45; }
    .tr-board { position:relative; height:272px; border:3px solid #0f0f14; background-color:#f0443a; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .tr-board .spot { position:absolute; display:flex; flex-direction:column; align-items:center; gap:4px; transform:translate(-50%,-50%); }
    .tr-board .spot small { padding:1px 5px; background:#fff; border:2px solid #0f0f14; font-size:11px; font-weight:800; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tr-board .spot .tr-card { width:58px; height:86px; }
    .tr-board .spot .tr-card .center { font-size:26px; } .tr-board .spot .tr-card .number,.tr-board .spot .tr-card .name,.tr-board .spot .tr-card .mirror { display:none; }
    .tr-board .slot { width:58px; height:86px; border-radius:6px; border:2.5px dashed rgba(15,15,20,.45); }
    .tr-board .spot.tr-now .slot { border-style:solid; border-color:#0f0f14; background:#ffce1f; }
    .tr-board .spot.tr-now small { background:#ffce1f; }
    .tr-board .spot.winner .tr-card { box-shadow:0 0 0 3px #ffce1f,4px 4px 0 3px #0f0f14; }
    .tr-board .spot.dim { opacity:.5; }
    .tr-hist { display:flex; align-items:center; gap:8px; padding:7px 0; border-top:2px solid #e4e2d9; font-size:12px; }
    .tr-hist:first-of-type { border-top:0; }
    .tr-hist em { font-style:normal; font-family:'JetBrains Mono',monospace; font-weight:700; text-transform:uppercase; color:#55555e; width:56px; flex:none; }
    .tr-hist .tr-card { width:34px; height:50px; border-width:2px; border-radius:4px; box-shadow:2px 2px 0 #0f0f14; }
    .tr-hist .tr-card .center { font-size:16px; } .tr-hist .tr-card .number,.tr-hist .tr-card .name,.tr-hist .tr-card .mirror,.tr-hist .tr-card .tr-face { display:none; }
    .tr-hist .tr-card .corner { font-size:9px; top:2px; left:3px; } .tr-hist .tr-card.spanish .tr-value { font-size:10px; min-width:14px; height:15px; top:1px; left:1px; border-width:1px; }
    .tr-hist b { margin-left:auto; padding:2px 6px; border:2px solid #0f0f14; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; }
    @media (max-width:360px) { .tr-card { width:62px; height:95px; } .tr-title { font-size:26px; } .tr-action { font-size:14px; } }
    @media (prefers-reduced-motion:reduce) { .tr-hand .tr-card,.tr-action,.tr-choice,.tr-reveal,.tr-reveal .result-time:after,.tr-played.winner .tr-card { animation:none; transition:none; } }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el); styled = true; };
  const isSpanish = G => G.cfg && G.cfg.variant === 'gaucho';
  const rank = n => n === 1 ? 'A' : n === 10 ? 'Q' : n === 11 ? 'J' : n === 12 ? 'K' : String(n);
  const spanishName = n => n === 10 ? 'Sota' : n === 11 ? 'Cavalo' : n === 12 ? 'Rei' : String(n);
  const card = (x, G, attrs) => {
    if (!x) return '';
    const sp = isSpanish(G), suit = (sp ? suits.spanish : suits.french)[x.s] || ['?', 'Carta'];
    const red = !sp && (x.s === 'H' || x.s === 'D');
    const label = `${sp ? spanishName(x.n) : rank(x.n)} de ${suit[1]}`;
    const shown = rank(x.n);
    const inner = sp
      ? `<img class="tr-art" src="/cards/spanish/${x.s}${x.n}.webp" alt="" draggable="false"><span class="tr-value" aria-hidden="true">${x.n}</span>${x.n >= 10 ? `<span class="tr-face" aria-hidden="true">${spanishName(x.n)}</span>` : ''}`
      : `<span class="corner">${shown}<br>${suit[0]}</span><span class="number">${shown}</span><span class="center" aria-hidden="true">${suit[0]}</span><span class="name">${suit[1]}</span><span class="mirror" aria-hidden="true">${shown}</span>`;
    const top = x.top ? `<span class="top">${sp ? 'forte' : 'manilha'}</span>` : '';
    return attrs ? `<button type="button" class="tr-card ${sp ? 'spanish' : ''} ${red ? 'red' : ''}" aria-label="Jogar ${label}" ${attrs}>${inner}${top}</button>` : `<div class="tr-card ${sp ? 'spanish' : ''} ${red ? 'red' : ''}" role="img" aria-label="${label}">${inner}${top}</div>`;
  };
  const action = (a, text, cls) => `<button type="button" class="tr-action ${cls || ''}" data-a="${a}">${text}</button>`;

  A.register('truco', {
    phone: {
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase, G.cfg && G.cfg.variant, G.round, G.turn, G.trick, G.stake, G.scores.join(','), JSON.stringify(G.bid), JSON.stringify(G.special), JSON.stringify(G.reveal), G.iron, G.ownHidden,
          (G.hand || []).map(x => x.id + (x.ok ? '*' : '')).join(','), (G.table || []).map(x => x.pid + ':' + x.card.id).join(','),
          (G.partnerHand || []).map(x => x.id).join(','), G.counts && G.counts[c.you && c.you.pid],
          (G.tricks || []).join(','), (G.availableCalls || []).join(','), G.roundWinner, G.winner, c.C.event && c.C.event.text,
          G.phase === 'setup' ? (c.C.players || []).map(p => p.pid + ':' + p.name).join(',') : '', (G.seats || []).join(','), G.target,
          JSON.stringify(G.history || []), G.trickLead].join('|');
      },
      html(c) {
        ensure();
        const G = c.G, you = c.you, esc = c.esc;
        if (!G || !you) return '';
        const me = you.pid, myTeam = G.teams[me], players = c.C.players || [];
        const player = pid => players.find(p => p.pid === pid);
        const name = pid => player(pid) ? esc(player(pid).name) : 'Jogador';
        const teamNames = team => players.filter(p => G.teams[p.pid] === team).map(p => esc(p.name)).join(' + ') || `Dupla ${team + 1}`;
        const event = c.C.event ? `<div class="tr-event">${c.hl(c.C.event.text)}</div>` : '';
        const score = `<div class="tr-score"><div class="tr-score-side ${myTeam === 0 ? 'mine' : ''}"><small>${teamNames(0)}</small><b>${G.scores[0]}</b></div><div class="tr-score-mid">×</div><div class="tr-score-side ${myTeam === 1 ? 'mine' : ''}"><small>${teamNames(1)}</small><b>${G.scores[1]}</b></div></div>`;
        const header = `<div class="tr-panel tr-head"><div class="tr-top"><div><div class="tr-kicker">Truco ${variants[G.cfg.variant] || ''}</div><h2 class="tr-title">${G.phase === 'setup' ? 'Escolha a regra' : G.phase === 'end' ? 'Fim de jogo' : `Mão ${G.round}`}</h2></div><span class="tr-pill">até ${G.target}</span></div>${score}</div>`;
        if (G.phase === 'setup') {
          const ready = players.length === 2 || players.length === 4;
          const seats = G.seats && G.seats.length === players.length ? G.seats : players.map(p => p.pid);
          const preview = seats.length === 4 ? `<b>Dupla 1:</b> ${name(seats[0])} + ${name(seats[2])}<br><b>Dupla 2:</b> ${name(seats[1])} + ${name(seats[3])}` : seats.length === 2 ? `${name(seats[0])} × ${name(seats[1])}` : 'Entrem com 2 ou 4 pessoas.';
          const targets = G.cfg.variant === 'gaucho' ? `<div class="tr-panel"><p class="tr-section-title">Joga até</p><div class="tr-actions">${[12, 24].map(t => `<button type="button" class="tr-action ${G.target === t ? '' : 'secondary'}" data-a="target" data-v="${t}">${t} pontos</button>`).join('')}</div></div>` : '';
          return `<div class="tr-phone">${header}<div class="tr-panel"><p class="tr-section-title">Região</p><div class="tr-choices">${Object.keys(variants).map(v => `<button type="button" class="tr-choice ${G.cfg.variant === v ? 'selected' : ''}" data-a="variant" data-v="${v}"><span>${variants[v]}</span><span>${G.cfg.variant === v ? '✓' : '→'}</span></button>`).join('')}</div></div>${targets}<div class="tr-panel"><p class="tr-section-title">${players.length === 4 ? 'Duplas' : 'Lugares'}</p><p class="tr-caption">${preview}</p>${players.length >= 2 ? '<div class="tr-actions" style="margin-top:12px"><button type="button" class="tr-action secondary wide" data-a="shuffle">Sortear lugares</button></div>' : ''}<p class="tr-caption" style="margin-top:9px">${esc(G.rules || 'Cada pessoa usa o celular para ver sua mão. A TV mostra a mesa e o placar.')}</p></div><div class="tr-actions"><button type="button" class="tr-action wide" data-a="begin" ${ready ? '' : 'disabled'}>Começar partida</button></div>${event}</div>`;
        }
        if (G.phase === 'round' || G.phase === 'end') {
          const team = G.phase === 'end' ? G.winner : G.roundWinner;
          return `<div class="tr-phone">${header}<div class="tr-panel" style="text-align:center"><div class="tr-kicker">${G.phase === 'end' ? 'Partida encerrada' : `Mão ${G.round} encerrada`}</div><h2 class="tr-title" style="margin-top:9px">${team === null || team === undefined ? 'Mão empatada' : `${team === myTeam ? 'Sua dupla venceu!' : 'A outra dupla venceu'}`}</h2><p class="tr-caption" style="margin-top:9px">${team === null || team === undefined ? 'Sem pontos nesta mão.' : teamNames(team)}</p></div><div class="tr-actions">${action(G.phase === 'end' ? 'again' : 'next', G.phase === 'end' ? 'Jogar de novo' : 'Próxima mão', 'wide')}</div>${event}</div>`;
        }
        if (G.phase === 'eleven') {
          const special = G.special || {}, ourChoice = special.team === myTeam;
          const title = `Mão de ${special.threshold || (G.cfg.variant === 'mineiro' ? 10 : 11)}`;
          const own = (G.hand || []).map(x => card(x, G)).join('');
          const partner = (G.partnerHand || []).map(x => card(x, G)).join('');
          return `<div class="tr-phone">${header}<div class="tr-panel"><p class="tr-kicker">${title}</p><h2 class="tr-title">${ourChoice ? 'Sua dupla decide' : 'A outra dupla decide'}</h2><p class="tr-caption" style="margin-top:10px">${ourChoice ? `Jogar vale ${special.stake || 3} pontos. Correr entrega ${special.runPoints || 1} ${special.runPoints === 1 ? 'ponto' : 'pontos'}.` : 'Aguarde a decisão no celular deles.'}</p></div>${ourChoice ? `<div class="tr-panel"><p class="tr-section-title">Sua mão</p><div class="tr-hand">${own}</div>${partner ? `<p class="tr-section-title" style="margin-top:12px">Mão do parceiro</p><div class="tr-hand">${partner}</div>` : ''}</div><div class="tr-actions">${action('eleven_play', 'Jogar a mão', 'ok wide')}${action('eleven_run', 'Correr', 'danger wide')}</div>` : ''}${event}</div>`;
        }
        const mine = G.turn === me;
        const bid = G.bid;
        const bidMine = bid && bid.toTeam === myTeam;
        const reveal = G.phase === 'reveal' ? G.reveal : null;
        const turnText = reveal ? 'Resultado da vaza' : G.iron ? mine ? 'Sua vez · carta surpresa' : `Vez de ${name(G.turn)} · mão de ferro` : bid ? bidMine ? 'Sua dupla responde' : 'A outra dupla responde' : mine ? 'Sua vez de jogar' : `Vez de ${name(G.turn)}`;
        const resultText = reveal && (reveal.winner === null ? 'Vaza empatada!' : reveal.kind === 'match' ? reveal.winner === myTeam ? 'Sua dupla venceu o jogo!' : 'A outra dupla venceu o jogo' : reveal.kind === 'hand' ? reveal.winner === myTeam ? 'Sua dupla ganhou a mão!' : 'A outra dupla ganhou a mão' : reveal.winner === myTeam ? 'Sua dupla ganhou a vaza!' : 'A outra dupla ganhou a vaza');
        const revealLeft = reveal ? Math.max(.1, Math.min(5, (reveal.endsAt - Date.now()) / 1000)) : 0;
        const result = reveal ? `<div class="tr-reveal ${reveal.winner === null ? 'tie' : ''}" style="--reveal-left:${revealLeft}s" role="status" aria-live="polite"><span class="result-small">${reveal.kind === 'trick' ? `Vaza ${reveal.trick} de 3` : reveal.kind === 'match' ? 'Fim de jogo' : 'Mão encerrada'}</span><strong class="result-main">${resultText}</strong><span class="result-detail">${reveal.points ? `+${reveal.points} ${reveal.points === 1 ? 'ponto' : 'pontos'} para ${teamNames(reveal.winner)}` : 'Veja as cartas antes da próxima vaza.'}</span><span class="result-time" aria-hidden="true"></span></div>` : '';
        const tricks = (G.tricks || []).map((w, i) => `<span class="tr-pill">Vaza ${i + 1}: ${w === null ? 'empate' : w === myTeam ? 'sua dupla' : 'outra dupla'}</span>`).join('');
        const table = (G.table || []).length ? G.table.map(x => `<div class="tr-played ${reveal && reveal.winner !== null ? G.teams[x.pid] === reveal.winner ? 'winner' : 'dim' : ''}">${card(x.card, G)}<small>${name(x.pid)}</small></div>`).join('') : '<p class="tr-empty">A mesa espera a primeira carta.</p>';
        const n = (G.order || []).length, myAt = G.order.indexOf(me);
        const nextStake = (G.availableCalls || []).indexOf('truco') >= 0 ? (({ paulista: [1, 3, 6, 9, 12], mineiro: [2, 4, 6, 10, 12], gaucho: [1, 2, 3, 4] })[G.cfg.variant] || []).filter(v => v > G.stake)[0] : null;
        const callName = o => o === 'truco' ? `${(TRUCO_NAMES[G.cfg.variant] || {})[nextStake] || 'Truco!'} (vale ${nextStake})` : calls[o] || esc(o);
        const raiseName = o => /^\d+$/.test(o) ? `${(TRUCO_NAMES[G.cfg.variant] || {})[o] || 'Aumentar'} (vale ${esc(o)})` : calls[o] || esc(o);
        // mesa vista do meu lugar: eu embaixo, parceiro em cima, adversários dos lados
        const spots = n === 2 ? [[50, 78], [50, 22]] : [[50, 80], [14, 50], [50, 20], [86, 50]];
        const onTable = {}; (G.table || []).forEach(x => { onTable[x.pid] = x.card; });
        const best = reveal && reveal.best ? reveal.best : [];
        const board = myAt < 0 ? '' : `<div class="tr-board">${G.order.map((pid, i) => {
          const at = spots[(i - myAt + n) % n] || [50, 50], x = onTable[pid];
          const cls = reveal && x && reveal.winner !== null ? best.indexOf(pid) >= 0 ? 'winner' : 'dim' : G.turn === pid && G.phase === 'play' && !bid ? 'tr-now' : '';
          return `<div class="spot ${cls}" style="left:${at[0]}%;top:${at[1]}%">${x ? card(x, G) : '<div class="slot"></div>'}<small>${pid === me ? 'Você' : name(pid)}${n === 4 && pid !== me && G.teams[pid] === myTeam ? ' · parceiro' : ''}</small></div>`;
        }).join('')}</div>`;
        const leadAt = G.order.indexOf(G.trickLead || G.turn);
        const orderStrip = G.phase === 'play' && leadAt >= 0 ? `<div class="tr-order">${G.order.map((pid, i) => G.order[(leadAt + i) % n]).map((pid, i) =>
          `<span class="${pid === G.turn && !bid ? 'tr-now' : ''} ${pid === me ? 'me' : ''} ${onTable[pid] ? 'done' : ''}">${i + 1}º ${pid === me ? 'Você' : name(pid)}${onTable[pid] ? ' ✓' : ''}</span>`).join('')}</div>` : '';
        const hist = (G.history || []).map((h, i) => `<div class="tr-hist"><em>Vaza ${i + 1}</em>${h.plays.map(x => card(x.card, G)).join('')}<b>${h.winner === null ? 'empate' : h.winner === myTeam ? (n === 2 ? 'você' : 'sua dupla') : 'outra'}</b></div>`).join('');
        const envido = G.myFlor !== null && G.myFlor !== undefined ? `<span class="tr-pill">Flor: ${G.myFlor}</span>` : G.myEnvido !== null && G.myEnvido !== undefined ? `<span class="tr-pill">Seu envido: ${G.myEnvido}</span>` : '';
        let actions = '';
        if (bidMine) actions = `${action('accept', 'Aceitar', 'ok')}${action('reject', 'Correr', 'danger')}${(bid.options || []).map(o => `<button type="button" class="tr-action secondary wide" data-a="raise" data-v="${esc(o)}">${raiseName(o)}</button>`).join('')}`;
        else if (!bid && !G.iron) actions = (G.availableCalls || []).map(o => `<button type="button" class="tr-action secondary" data-a="call" data-v="${esc(o)}">${callName(o)}</button>`).join('');
        const bidText = bid ? `${calls[bid.level] || calls[bid.kind] || 'Pedido'} · ${bidMine ? 'aceite, corra ou aumente' : 'aguarde a resposta'}` : '';
        const handHtml = G.iron ? `<div class="tr-hand">${Array(Math.min(3, G.counts && G.counts[me] || 0) + 1).join('<div class="tr-card back" role="img" aria-label="Carta virada para baixo"></div>')}</div>${mine ? action('card', 'Jogar próxima carta', 'wide') : ''}` : `<div class="tr-hand">${(G.hand || []).map(x => card(x, G, `data-a="card" data-id="${esc(x.id)}" ${x.ok && !bid ? '' : 'disabled'}`)).join('')}</div>`;
        return `<div class="tr-phone">${header}${result}<div class="tr-panel"><div class="tr-top"><div><p class="tr-section-title">Mesa · vaza ${G.trick + 1} de 3</p><p class="tr-turn ${mine || bidMine ? 'mine' : ''}">${turnText}</p></div><span class="tr-pill">Vale ${G.stake}</span></div><div class="tr-strip">${tricks}${G.vira ? `<span class="tr-pill">Vira: ${rank(G.vira.n)} · manilha: ${rank(G.manilha || 0)}</span>` : ''}${envido}${G.iron ? '<span class="tr-pill">Mão de ferro</span>' : ''}</div>${bidText ? `<p class="tr-caption" style="margin-top:10px">${bidText}</p>` : ''}${orderStrip}</div><div class="tr-panel"><p class="tr-section-title">Cartas na mesa</p>${board || `<div class="tr-table">${table}</div>`}</div><div class="tr-panel"><p class="tr-section-title">${G.iron ? 'Suas cartas escondidas' : 'Sua mão'}</p>${handHtml}<p class="tr-help">${reveal ? 'A próxima jogada abre em instantes.' : G.iron ? 'Ninguém vê a própria mão. As cartas saem na ordem.' : mine && !bid ? 'Toque na carta e toque de novo para jogar.' : bidMine ? 'Responda ao pedido acima.' : 'Sua mão só aparece neste celular.'}</p></div>${actions ? `<div class="tr-actions">${actions}</div>` : ''}${hist ? `<div class="tr-panel"><p class="tr-section-title">Vazas desta mão</p>${hist}</div>` : ''}${event}</div>`;
      },
      after(c) {
        const G = c.G; if (!G || !c.you) return;
        const turn = `${G.round}:${G.trick}:${G.turn}:${G.bid && G.bid.kind}`;
        const mine = G.phase === 'eleven' && G.special && G.special.team === G.teams[c.you.pid] || G.phase === 'play' && (G.turn === c.you.pid || G.bid && G.bid.toTeam === G.teams[c.you.pid]);
        if (mine && turn !== lastTurn) { lastTurn = turn; picked = null; A.beep(680, .1, 'sine', .14); vibrate([60, 40, 60]); }
        if (!mine) lastTurn = '';
      },
      act(a, el) {
        if (a === 'variant') A.send({ t: 'config', variant: el.dataset.v });
        else if (a === 'begin' || a === 'next' || a === 'again' || a === 'accept' || a === 'reject') A.send({ t: a });
        else if (a === 'eleven_play' || a === 'eleven_run') A.send({ t: a });
        else if (a === 'target') A.send({ t: 'config', target: Number(el.dataset.v) });
        else if (a === 'shuffle') A.send({ t: 'shuffle' });
        else if (a === 'card' && el.dataset.id === undefined) A.send({ t: 'card' });
        else if (a === 'card') {
          // dois toques: o primeiro levanta a carta, o segundo joga (evita jogar a carta errada sem querer)
          if (picked !== el.dataset.id) {
            Array.prototype.slice.call(document.querySelectorAll('.tr-hand .tr-card.picked')).forEach(x => x.classList.remove('picked'));
            el.classList.add('picked'); picked = el.dataset.id; vibrate(10); return;
          }
          picked = null; el.classList.add('out'); vibrate(25);
          A.send({ t: 'card', id: el.dataset.id });
        }
        else if (a === 'call') A.send({ t: 'call', kind: el.dataset.v });
        else if (a === 'raise') A.send({ t: 'raise', level: el.dataset.v });
      },
    },
  });
})();
