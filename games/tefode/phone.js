// Te Fode: controle pessoal de palpites e cartas; a carta própria da rodada de uma fica oculta.
'use strict';
(() => {
  const A = ARCADE;
  let styled = false, lastTurn = '';
  const SUIT = { S: ['♠','Espadas'], H: ['♥','Copas'], D: ['♦','Ouros'], C: ['♣','Paus'] };
  const rank = n => n === 1 ? 'A' : n === 10 ? 'Q' : n === 11 ? 'J' : n === 12 ? 'K' : String(n);
  const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (err) { /* opcional */ } };
  const css = `
    .tf-phone { display:flex; flex-direction:column; gap:12px; color:#faf5e9; }
    .tf-panel { border-radius:18px; padding:16px; background:linear-gradient(145deg,#263c68,#182948); border:1px solid #617197; box-shadow:0 8px 24px rgba(0,0,0,.2); }
    .tf-panel.mine { border-color:#ffbc7d; box-shadow:0 0 0 3px rgba(255,188,125,.25),0 8px 24px rgba(0,0,0,.2); }
    .tf-top { display:flex; justify-content:space-between; align-items:flex-start; gap:9px; }
    .tf-kicker { font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.16em; color:#ffbc7d; }
    .tf-title { font-size:28px; line-height:1.08; font-weight:900; margin:5px 0 0; }
    .tf-tag { display:inline-block; border:1px solid #aa9583; background:#304262; border-radius:99px; padding:5px 10px; font-size:12px; font-weight:800; white-space:nowrap; }
    .tf-score { display:flex; flex-wrap:wrap; gap:6px; margin-top:14px; }
    .tf-score span { display:inline-flex; align-items:center; gap:5px; border-radius:9px; background:rgba(0,0,0,.2); padding:6px 9px; font-size:12px; font-weight:800; }
    .tf-score .mine { background:#ffbc7d; color:#263048; }
    .tf-score .out { opacity:.45; text-decoration:line-through; }
    .tf-hearts { color:#ff6b7d; letter-spacing:1px; } .tf-hearts i { font-style:normal; opacity:.25; color:inherit; }
    .tf-score .mine .tf-hearts { color:#a3243a; }
    .tf-caption { color:#d8dfed; font-size:13px; line-height:1.35; }
    .tf-headline { color:#ffbc7d; font-size:19px; font-weight:900; margin:0 0 8px; }
    .tf-section { font-size:11px; color:#d5ddeb; text-transform:uppercase; letter-spacing:.15em; font-weight:900; margin:0 0 10px; }
    .tf-order { display:flex; gap:6px; overflow-x:auto; padding:2px 0 4px; margin-top:4px; scrollbar-width:none; }
    .tf-order span { flex:none; display:inline-flex; align-items:center; gap:5px; border-radius:99px; padding:5px 10px 5px 5px; background:#172844; font-size:12px; font-weight:800; border:1px solid transparent; }
    .tf-order span i { font-style:normal; display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:#304262; color:#ffbc7d; font-size:11px; }
    .tf-order span.now { border-color:#ffbc7d; }
    .tf-order span.now i { background:#ffbc7d; color:#24304b; }
    .tf-order span.me { background:#ffbc7d; color:#263048; }
    .tf-order span.me i { background:#263048; color:#ffbc7d; }
    .tf-order span.done { opacity:.55; }
    .tf-order b { color:inherit; opacity:.75; font-weight:900; }
    .tf-card { position:relative; flex:none; width:76px; height:108px; background:#fffaf0; color:#192746; border:2px solid #d8d3c7; border-radius:10px; box-shadow:0 5px 0 #aaa8a0,0 8px 17px rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; overflow:visible; }
    .tf-card.red { color:#bf3e3a; } .tf-card.back { background:repeating-linear-gradient(45deg,#e86948,#e86948 5px,#b33d45 5px,#b33d45 10px); border:5px solid #f5e7c9; color:#fff; }
    .tf-card.back:after { content:'?'; display:flex; align-items:center; justify-content:center; width:70%; height:76%; border:2px solid #fff3d7; border-radius:8px; font-weight:900; font-size:44px; background:rgba(80,24,40,.24); }
    .tf-card .symbol { font-size:43px; line-height:1; } .tf-card .corner { position:absolute; top:5px; left:6px; font-weight:900; font-size:14px; line-height:1; text-align:center; }
    .tf-card .suit { position:absolute; bottom:6px; font-size:9px; text-transform:uppercase; font-weight:900; letter-spacing:.07em; }
    .tf-card .mn { position:absolute; top:-9px; right:-8px; padding:2px 6px; border-radius:99px; background:#ffcf72; color:#3a2410; font-size:9px; font-weight:900; letter-spacing:.04em; box-shadow:0 2px 5px rgba(0,0,0,.35); }
    .tf-card .stamp { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) rotate(-18deg); padding:2px 5px; border:2px solid #e2483a; color:#e2483a; background:rgba(255,250,240,.93); border-radius:4px; font-size:10px; font-weight:900; letter-spacing:.05em; }
    .tf-hand { display:flex; justify-content:center; align-items:flex-end; gap:9px; padding:12px 0 9px; flex-wrap:wrap; }
    .tf-hand .tf-card { width:calc((100vw - 78px)/3); max-width:103px; height:146px; font:inherit; transition:transform .15s; }
    .tf-hand.many .tf-card { width:calc((100vw - 96px)/4); height:120px; }
    .tf-hand .tf-card .symbol { font-size:54px; }
    .tf-hand.many .tf-card .symbol { font-size:42px; }
    .tf-hand button.tf-card:not(:disabled) { box-shadow:0 5px 0 #aaa8a0,0 0 0 3px rgba(255,188,125,.65),0 8px 17px rgba(0,0,0,.35); }
    .tf-hand button.tf-card:not(:disabled):active { transform:translateY(-10px) scale(1.03); }
    .tf-hand button.tf-card:disabled { opacity:.7; }
    .tf-cards { display:flex; flex-wrap:wrap; justify-content:center; gap:12px 10px; min-height:100px; align-items:flex-end; padding-top:8px; }
    .tf-play { position:relative; display:flex; flex-direction:column; align-items:center; gap:5px; }
    .tf-play small { font-size:11px; font-weight:800; max-width:80px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .tf-play .ord { position:absolute; top:-8px; left:-8px; z-index:2; width:20px; height:20px; border-radius:50%; background:#182948; border:1.5px solid #ffbc7d; color:#ffbc7d; font-size:11px; font-weight:900; display:flex; align-items:center; justify-content:center; }
    .tf-play.lose { opacity:.55; }
    .tf-play.fresh .tf-card { animation:tf-drop .35s cubic-bezier(.2,1.3,.4,1) both; }
    .tf-vira { display:flex; align-items:center; gap:12px; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,.12); }
    .tf-vira .tf-card { width:50px; height:72px; }
    .tf-vira .tf-card .symbol { font-size:28px; }
    .tf-vira .tf-card .corner { font-size:10px; }
    .tf-vira .tf-card .suit { font-size:7px; }
    .tf-manilha { display:inline-block; margin-top:4px; padding:3px 10px; border-radius:99px; background:#ffcf72; color:#3a2410; font-weight:900; font-size:14px; }
    .tf-bid-choices { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; }
    .tf-btn { min-height:50px; border-radius:12px; border:1px solid #ffbc7d; background:#ffbc7d; color:#24304b; font-size:18px; font-weight:900; cursor:pointer; }
    .tf-btn.wide { width:100%; }
    .tf-btn:active { transform:scale(.97); }
    .tf-btn:disabled { opacity:.5; cursor:default; }
    .tf-btn.no { background:transparent; color:#ff9b8f; border:1px dashed #ff9b8f; text-decoration:line-through; opacity:.8; }
    .tf-btn:focus-visible,.tf-card:focus-visible { outline:3px solid #fff1a8; outline-offset:3px; }
    .tf-warn { margin:0 0 12px; padding:10px 12px; border-radius:12px; background:rgba(138,51,64,.55); border:1px solid #c45a66; font-size:13px; line-height:1.35; }
    .tf-warn b { color:#ffd3d3; }
    .tf-sum { display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:13px; color:#d8dfed; }
    .tf-sum b { color:#ffbc7d; font-size:16px; }
    .tf-event { text-align:center; font-size:13px; color:#d7deec; padding:3px 8px; }
    .tf-reveal { text-align:center; border-color:#ffbc7d; background:radial-gradient(circle at top,#425482,#1b2b4d 70%); animation:tf-rise .45s ease-out both; }
    .tf-reveal.none { border-color:#c45a66; background:radial-gradient(circle at top,#5a3348,#1b2b4d 70%); }
    .tf-reveal .tf-headline { font-size:25px; margin:6px 0; }
    .tf-reveal .tf-cards { padding:14px 0 16px; }
    .tf-reveal .tf-play.winner .tf-card { border-color:#ffcf72; box-shadow:0 0 0 4px rgba(255,207,114,.45),0 8px 25px rgba(0,0,0,.4); animation:tf-win .75s ease-out both; }
    .tf-reveal .tf-play.winner small { color:#ffcf72; }
    .tf-reveal .tf-play .crown { position:absolute; top:-22px; font-size:20px; }
    .tf-reveal-progress { height:5px; margin:14px 10px 2px; border-radius:99px; background:rgba(255,255,255,.18); overflow:hidden; }
    .tf-reveal-progress:after { content:''; display:block; width:100%; height:100%; background:#ffcf72; transform-origin:left; animation:tf-count var(--left,3.8s) linear both; }
    .tf-result-line { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:10px; align-items:center; padding:10px 0; border-top:1px solid rgba(255,255,255,.16); font-size:13px; }
    .tf-result-line:first-of-type { border:0; }
    .tf-result-line.me span:first-child { color:#ffbc7d; font-weight:900; }
    .tf-result-line.out { color:#ff9b8f; }
    .tf-result-line strong { color:#ff9b8f; font-size:18px; }
    .tf-result-line .perfect { color:#a7e6bb; }
    .tf-big { font-size:42px; line-height:1; text-align:center; margin-bottom:4px; }
    @keyframes tf-rise { from { opacity:0; transform:translateY(12px) scale(.98); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes tf-win { from { transform:translateY(0); } 50% { transform:translateY(-12px) rotate(-3deg); } to { transform:translateY(-8px); } }
    @keyframes tf-count { from { transform:scaleX(1); } to { transform:scaleX(0); } }
    @keyframes tf-drop { from { opacity:0; transform:translateY(-24px) rotate(-8deg) scale(.8); } to { opacity:1; transform:none; } }
    @media (max-width:360px) { .tf-title { font-size:24px; } .tf-card { width:62px; height:94px; } }
    @media (prefers-reduced-motion:reduce) { .tf-card,.tf-btn { transition:none; } .tf-reveal,.tf-reveal .tf-play.winner .tf-card,.tf-reveal-progress:after,.tf-play.fresh .tf-card { animation:none; } }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el); styled = true; };
  const card = (x, attrs, G, extra) => {
    if (!x) return '';
    const s = SUIT[x.s] || ['?', 'Carta'];
    const manilha = G && G.manilha === x.n;
    const inner = `<span class="corner">${rank(x.n)}<br>${s[0]}</span><span class="symbol" aria-hidden="true">${s[0]}</span><span class="suit">${s[1]}</span>${manilha ? '<span class="mn">MANILHA</span>' : ''}${extra || ''}`;
    const cls = x.s === 'H' || x.s === 'D' ? 'red' : '';
    const label = `${rank(x.n)} de ${s[1]}${manilha ? ', manilha' : ''}`;
    return attrs ? `<button type="button" class="tf-card ${cls}" aria-label="Jogar ${label}" ${attrs}>${inner}</button>` : `<div class="tf-card ${cls}" role="img" aria-label="${label}">${inner}</div>`;
  };
  const hearts = (pen, max) => {
    const left = Math.max(0, max - (pen || 0));
    return `<span class="tf-hearts" aria-label="${left} vidas">${'♥'.repeat(left)}<i>${'♥'.repeat(max - left)}</i></span>`;
  };
  A.register('tefode', {
    phone: {
      key(c) {
        const G = c.G; if (!G) return '';
        return [G.phase,G.round,G.handSize,G.turn,G.trick,G.trickWinner,G.dealer,G.lead,
          (G.hand || []).map(x => x.id + (x.ok ? '*' : '')).join(','),
          (G.table || []).map(x => x.pid + ':' + x.card.id).join(','),
          (G.visibleOthers || []).map(x => x.pid + ':' + x.card.id).join(','),
          JSON.stringify(G.bids),JSON.stringify(G.wins),JSON.stringify(G.penalties),
          (G.winners || []).join(','),c.C.event && c.C.event.text,
          G.phase === 'setup' ? (c.C.players || []).map(p => p.pid + ':' + p.name).join(',') : ''].join('|');
      },
      html(c) {
        ensure();
        const G = c.G, you = c.you, esc = c.esc; if (!G || !you) return '';
        const players = c.C.players || [], me = you.pid, isActive = (G.active || []).indexOf(me) >= 0;
        const max = G.maxPenalties || 5;
        const name = pid => { const p = players.find(x => x.pid === pid); return p ? esc(p.name) : 'Jogador'; };
        const event = c.C.event ? `<div class="tf-event">${c.hl(c.C.event.text)}</div>` : '';
        const out = pid => G.phase !== 'setup' && (G.active || []).indexOf(pid) < 0;
        const score = `<div class="tf-score">${(G.order && G.order.length ? G.order : players.map(p => p.pid)).map(pid => `<span class="${pid === me ? 'mine' : ''} ${out(pid) ? 'out' : ''}">${name(pid)} ${out(pid) ? '☠' : hearts(G.penalties && G.penalties[pid], max)}</span>`).join('')}</div>`;
        const title = G.phase === 'setup' ? 'A mesa espera' : G.phase === 'end' ? 'Fim de jogo' : `Rodada ${G.round}`;
        const head = `<div class="tf-panel"><div class="tf-top"><div><div class="tf-kicker">Te F0d3 · ${max} vidas</div><h2 class="tf-title">${title}</h2></div><span class="tf-tag">${G.phase === 'setup' ? `${players.length}/4–7` : `${G.handSize} ${G.handSize === 1 ? 'carta' : 'cartas'}`}</span></div>${score}</div>`;
        if (G.phase === 'setup') {
          const ready = players.length >= 4 && players.length <= 7;
          return `<div class="tf-phone">${head}<div class="tf-panel"><p class="tf-headline">Palpite certo, nenhuma vida perdida.</p><p class="tf-caption">${esc(G.rules || 'Diga quantas vazas vai ganhar. Cada erro custa uma vida. Na rodada de uma carta, você só vê as cartas dos outros.')}</p></div><button type="button" class="tf-btn wide" data-a="begin" ${ready ? '' : 'disabled'}>Começar</button>${ready ? '' : '<p class="tf-caption" style="text-align:center">São necessárias 4 a 7 pessoas.</p>'}${event}</div>`;
        }
        if (G.phase === 'end' || G.phase === 'result') {
          const winners = (G.winners || []).map(name).join(' e ');
          const iWon = (G.winners || []).indexOf(me) >= 0;
          const mineRow = (G.roundResults || []).find(r => r.pid === me);
          const line = G.phase === 'end' ? `${winners || 'A mesa'} venceu!` : !mineRow ? `Rodada ${G.round} encerrada` : mineRow.out ? 'F0d3u! Você saiu.' : mineRow.added === 0 ? 'Na mosca! ✓' : `Errou por ${mineRow.added}`;
          const big = G.phase === 'end' ? (iWon ? '🏆' : '🂠') : !mineRow ? '' : mineRow.out ? '☠' : mineRow.added === 0 ? '🎯' : '💔';
          const details = (G.roundResults || []).map(row => `<div class="tf-result-line ${row.pid === me ? 'me' : ''} ${row.out ? 'out' : ''}"><span>${name(row.pid)}${row.out ? ' ☠' : ''}</span><span>${row.won}/${row.bid} vazas</span><strong class="${row.added === 0 ? 'perfect' : ''}">${row.added === 0 ? '✓' : `−${row.added} ♥`}</strong></div>`).join('');
          return `<div class="tf-phone">${head}<div class="tf-panel">${big ? `<div class="tf-big">${big}</div>` : ''}<p class="tf-kicker">${G.phase === 'end' ? 'Resultado final' : 'Resultado da rodada'}</p><h2 class="tf-title">${line}</h2><p class="tf-caption" style="margin-top:6px">Vazas ganhas / palpite · vidas perdidas</p>${details}</div><button type="button" class="tf-btn wide" data-a="${G.phase === 'end' ? 'again' : 'next'}">${G.phase === 'end' ? 'Jogar de novo' : 'Próxima rodada'}</button>${event}</div>`;
        }
        const seq = G.seq || [];
        const orderStrip = seq.length ? `<div class="tf-order" aria-label="Ordem da vez">${seq.map((pid, i) => {
          const done = G.phase === 'bid' ? G.bids && G.bids[pid] !== undefined : (G.table || []).some(x => x.pid === pid);
          const info = G.phase === 'bid' ? (G.bids && G.bids[pid] !== undefined ? ` <b>${G.bids[pid]}</b>` : '') : '';
          return `<span class="${pid === me ? 'me' : ''} ${pid === G.turn ? 'now' : ''} ${done && pid !== G.turn ? 'done' : ''}"><i>${i + 1}</i>${pid === me ? 'Você' : name(pid)}${info}</span>`;
        }).join('')}</div>` : '';
        if (G.phase === 'reveal' && G.reveal) {
          const winner = G.reveal.winner, cancelled = G.reveal.cancelled || [];
          const headline = winner === me ? 'Você levou a vaza!' : winner ? `${name(winner)} levou a vaza!` : 'Ninguém levou a vaza!';
          const table = (G.table || []).map((x, i) => `<div class="tf-play ${x.pid === winner ? 'winner' : 'lose'}">${x.pid === winner ? '<span class="crown">👑</span>' : ''}<span class="ord">${i + 1}</span>${card(x.card, '', G, cancelled.indexOf(x.pid) >= 0 ? '<span class="stamp">ANULOU</span>' : '')}<small>${x.pid === me ? 'Você' : name(x.pid)}</small></div>`).join('');
          const left = Math.max(.1, Math.min(5, (G.reveal.endsAt - Date.now()) / 1000));
          const myWins = G.wins && G.wins[me] || 0, myBid = G.bids && G.bids[me];
          return `<div class="tf-phone">${head}<div class="tf-panel tf-reveal ${winner ? '' : 'none'}" role="status" aria-live="polite"><p class="tf-kicker">Vaza ${G.reveal.trick} de ${G.handSize}</p><h2 class="tf-headline">${headline}</h2><p class="tf-caption">${winner ? (cancelled.length ? 'Cartas iguais se anularam. A mais forte que sobrou levou.' : 'A carta vencedora ficou em destaque.') : 'As cartas mais fortes se anularam.'}</p><div class="tf-cards">${table}</div>${isActive && myBid !== undefined ? `<p class="tf-caption">Você: <b>${myWins}</b> de ${myBid} vaza${myBid === 1 ? '' : 's'}.</p>` : ''}<div class="tf-reveal-progress" style="--left:${left}s" aria-hidden="true"></div></div>${event}</div>`;
        }
        const bidMine = G.phase === 'bid' && G.turn === me;
        const mine = G.phase === 'play' && G.turn === me;
        const others = G.handSize === 1 ? (G.visibleOthers || []).map(x => `<div class="tf-play">${card(x.card, '', G)}<small>${name(x.pid)}</small></div>`).join('') : '';
        const last = G.table && G.table.length ? G.table[G.table.length - 1].pid : null;
        const table = (G.table || []).map((x, i) => `<div class="tf-play ${x.pid === last ? 'fresh' : ''}"><span class="ord">${i + 1}</span>${card(x.card, '', G)}<small>${x.pid === me ? 'Você' : name(x.pid)}</small></div>`).join('');
        const myPos = seq.indexOf(me), turnPos = seq.indexOf(G.turn);
        const wait = myPos > turnPos && turnPos >= 0 ? myPos - turnPos : 0;
        const status = bidMine ? 'Seu palpite' : mine ? 'Sua vez de jogar' : G.phase === 'bid' ? `Palpite de ${name(G.turn)}` : `Vez de ${name(G.turn)}`;
        const statusSub = !isActive ? '' : bidMine || mine ? '' : wait === 1 ? 'Você é a próxima pessoa.' : wait > 1 ? `Faltam ${wait} pessoas até você.` : myPos >= 0 && myPos < turnPos ? (G.phase === 'bid' ? 'Você já deu seu palpite.' : 'Você já jogou nesta vaza.') : '';
        const numbers = Array.from({ length: G.handSize + 1 }, (_, i) => i);
        const allowed = G.availableBids || numbers;
        const forbidden = bidMine && G.forbiddenBid !== null && G.forbiddenBid !== undefined ? G.forbiddenBid : null;
        const bidChoices = bidMine ? `<div class="tf-panel mine"><p class="tf-section">Quantas vazas você vai ganhar?</p>${forbidden !== null ? `<p class="tf-warn">Você é a última pessoa. <b>Não pode dizer ${forbidden}</b>: a soma dos palpites ficaria igual a ${G.handSize} carta${G.handSize === 1 ? '' : 's'}, e alguém sempre tem que errar.</p>` : ''}<div class="tf-bid-choices">${numbers.map(n => allowed.indexOf(n) >= 0 ? `<button type="button" class="tf-btn" data-a="bid" data-n="${n}">${n}</button>` : `<button type="button" class="tf-btn no" disabled aria-label="${n} não é permitido">${n}</button>`).join('')}</div><div class="tf-sum"><span>Soma até agora</span><b>${G.bidTotal || 0} de ${G.handSize}</b></div></div>` : '';
        const many = (G.hand || []).length > 3;
        const hand = !isActive ? '<p class="tf-caption">Você saiu desta partida. Acompanhe a mesa.</p>' : G.handSize === 1 ? `${G.ownHidden ? '<div class="tf-hand"><div class="tf-card back" role="img" aria-label="Sua carta está escondida de você"></div></div>' : ''}<p class="tf-caption" style="text-align:center">Sua carta é surpresa. Veja as cartas dos outros.</p>${mine ? '<button type="button" class="tf-btn wide" data-a="card">Jogar minha carta</button>' : ''}` : `<div class="tf-hand ${many ? 'many' : ''}">${(G.hand || []).map(x => card(x, `data-a="card" data-id="${esc(x.id)}" ${x.ok && mine ? '' : 'disabled'}`, G)).join('')}</div><p class="tf-caption" style="text-align:center">${mine ? 'Toque na carta que quer jogar.' : G.phase === 'bid' ? 'Olhe suas cartas e pense no palpite.' : 'Aguarde sua vez.'}</p>`;
        const vira = G.vira ? `<div class="tf-vira">${card(G.vira)}<div><p class="tf-section" style="margin:0">Vira</p><span class="tf-manilha">Manilha: ${rank(G.manilha)}</span><p class="tf-caption" style="margin-top:4px">As quatro cartas ${rank(G.manilha)} ganham de todas. ♣ &gt; ♥ &gt; ♠ &gt; ♦</p></div></div>` : '';
        const myBid = G.bids && G.bids[me];
        return `<div class="tf-phone">${head}<div class="tf-panel ${bidMine || mine ? 'mine' : ''}"><div class="tf-top"><div><p class="tf-section">${G.phase === 'bid' ? 'Palpites' : `Vaza ${G.trick + 1} de ${G.handSize}`}</p><p class="tf-headline" style="margin:0">${isActive ? status : 'Acompanhe a mesa'}</p>${statusSub ? `<p class="tf-caption">${statusSub}</p>` : ''}</div><span class="tf-tag">${G.phase === 'bid' ? `Soma: ${G.bidTotal || 0}/${G.handSize}` : myBid !== undefined && isActive ? `Você: ${G.wins && G.wins[me] || 0}/${myBid}` : `Soma: ${G.bidTotal || 0}`}</span></div>${orderStrip}${vira}</div>${bidChoices}${G.phase === 'play' ? `<div class="tf-panel"><p class="tf-section">Na mesa</p><div class="tf-cards">${table || '<p class="tf-caption">A primeira carta aparece aqui.</p>'}</div></div>` : ''}${G.handSize === 1 && others ? `<div class="tf-panel"><p class="tf-section">Cartas dos outros</p><div class="tf-cards">${others}</div></div>` : ''}${(G.phase === 'play' || G.phase === 'bid') && isActive ? `<div class="tf-panel"><p class="tf-section">Sua carta${G.handSize === 1 ? '' : 's'}</p>${hand}</div>` : ''}${event}</div>`;
      },
      after(c) {
        const G = c.G; if (!G || !c.you) return;
        const key = `${G.phase}:${G.round}:${G.trick}:${G.turn}`;
        const mine = (G.phase === 'bid' || G.phase === 'play') && G.turn === c.you.pid;
        if (mine && key !== lastTurn) { lastTurn = key; A.beep(660,.1,'sine',.15); vibrate([60, 40, 60]); }
        if (!mine) lastTurn = '';
      },
      act(a, el) {
        if (a === 'begin' || a === 'next' || a === 'again') A.send({t:a});
        else if (a === 'bid') { vibrate(15); A.send({t:'bid',n:Number(el.dataset.n)}); }
        else if (a === 'card') { vibrate(15); A.send(el.dataset.id === undefined ? {t:'card'} : {t:'card',id:el.dataset.id}); }
      },
    },
  });
})();
