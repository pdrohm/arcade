// Pife / Cacheta: a mão e a escolha da batida ficam no celular de cada jogador.
'use strict';
(() => {
  const A = ARCADE;
  const SUITS = { S: ['♠', 'Espadas'], H: ['♥', 'Copas'], D: ['♦', 'Ouros'], C: ['♣', 'Paus'] };
  const rank = n => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[n] || String(n);
  let styled = false;
  let mode = 'discard';
  let picked = null;
  let groups = [[], [], []];
  let signature = '';
  let lastTurn = '';
  const css = `
    .pf-phone{display:flex;flex-direction:column;gap:14px;color:#0f0f14}
    .pf-panel{background:#fff;border:3px solid #0f0f14;padding:14px;box-shadow:5px 5px 0 #0f0f14}
    .pf-panel.pf-top{background-color:#f0443a;background-image:radial-gradient(rgba(15,15,20,.16) 1.2px,transparent 1.3px);background-size:9px 9px}
    .pf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .pf-kicker{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700}
    .pf-title{font-size:28px;font-size:clamp(22px,7.2vw,28px);line-height:.95;margin:6px 0 0;font-weight:900;font-stretch:125%;text-transform:uppercase}
    .pf-pill{display:inline-block;flex:none;background:#fff;border:2px solid #0f0f14;padding:5px 8px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
    .pf-status{display:inline-block;margin-top:14px;padding:6px 10px;background:#0f0f14;color:#f1f0ea;font-size:18px;font-weight:900;font-stretch:115%;text-transform:uppercase;line-height:1.05}
    .pf-status.mine{background:#ffce1f;color:#0f0f14;border:3px solid #0f0f14}
    .pf-note{font-size:14px;color:#3a3a42;line-height:1.4;margin-top:8px;font-weight:600}
    .pf-top .pf-note{color:#0f0f14}
    .pf-label{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#55555e;font-weight:700;margin-bottom:11px}
    .pf-label b{font-family:'Pixelify Sans',monospace;color:#0f0f14;font-size:15px}
    .pf-table{display:flex;align-items:center;gap:22px;justify-content:center}
    .pf-pile{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:80px}
    .pf-pile small{font-family:'JetBrains Mono',monospace;font-size:11px;color:#0f0f14;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.04em}
    .pf-pile small b{font-family:'Pixelify Sans',monospace;font-size:14px}
    .pf-back{position:relative;width:68px;height:98px;border-radius:6px;border:3px solid #0f0f14;background:repeating-linear-gradient(45deg,#0f0f14 0 5px,#23232b 5px 10px);box-shadow:4px 4px 0 #0f0f14}
    .pf-back:after{content:'';position:absolute;top:6px;left:6px;right:6px;bottom:6px;border:2px solid #ffce1f}
    .pf-back.empty{opacity:.32;box-shadow:none}
    .pf-hand{display:flex;gap:8px;overflow-x:auto;padding:16px 4px 14px;margin:0 -4px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
    .pf-hand::-webkit-scrollbar{height:6px}.pf-hand::-webkit-scrollbar-thumb{background:#0f0f14}
    .pf-card{position:relative;flex:none;width:69px;height:99px;border:3px solid #0f0f14;border-radius:6px;background:#fff;color:#0f0f14;box-shadow:4px 4px 0 #0f0f14;cursor:pointer;scroll-snap-align:center;text-align:left;padding:6px;touch-action:manipulation;font-family:inherit;transition:transform .08s}
    .pf-card.red{color:#d02a20}.pf-card.joker{background:#fff4c2;color:#7a3fd0}
    .pf-card .corner{position:absolute;top:5px;left:6px;font-family:'Pixelify Sans',monospace;font-size:18px;font-weight:700;line-height:1}
    .pf-card .middle{display:block;text-align:center;font-size:38px;line-height:1;margin-top:26px}
    .pf-card .foot{position:absolute;bottom:4px;right:5px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700}
    .pf-card.selected{transform:translateY(-12px);background:#ffce1f;box-shadow:4px 4px 0 #0f0f14}
    .pf-card.grouped{opacity:.4;box-shadow:none}.pf-card:disabled{cursor:default}
    .pf-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .pf-action{border:3px solid #0f0f14;background:#fff;color:#0f0f14;padding:13px 8px;border-radius:0;font-family:inherit;font-size:16px;font-weight:900;font-stretch:115%;text-transform:uppercase;line-height:1.1;cursor:pointer;min-height:54px;box-shadow:4px 4px 0 #0f0f14;transition:transform .06s,box-shadow .06s}
    .pf-action:active{transform:translate(3px,3px);box-shadow:1px 1px 0 #0f0f14}
    .pf-action.primary{background:#ffce1f}
    .pf-action.ghost{background:#fff}.pf-action.wide{grid-column:1/-1}
    .pf-action:disabled{opacity:.4;cursor:default;box-shadow:none;transform:none}
    .pf-choice{display:flex;gap:10px}.pf-choice .pf-action{flex:1}
    .pf-groups{display:grid;gap:8px;margin-top:2px}
    .pf-group{display:flex;align-items:center;gap:10px;border:3px solid #0f0f14;padding:8px 10px;background:#f1f0ea;min-height:46px;font-size:15px;font-weight:700}
    .pf-group.valid{background:#35d07f}.pf-group.invalid{background:#f0443a}
    .pf-group b{font-family:'JetBrains Mono',monospace;font-size:12px;text-transform:uppercase;white-space:nowrap;background:#0f0f14;color:#f1f0ea;padding:3px 6px}
    .pf-group span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .pf-roster{display:flex;flex-wrap:wrap;gap:8px}.pf-roster span{display:inline-block;white-space:nowrap;padding:5px 9px;border:2px solid #0f0f14;background:#fff;font-size:14px;font-weight:800}
    .pf-roster span i{display:inline;font-style:normal;font-family:'Pixelify Sans',monospace;font-size:16px}
    .pf-roster .pf-now{background:#ffce1f}
    .pf-event{text-align:center;font-size:14px;font-weight:700;color:#0f0f14;padding:2px 6px}
    /* rodada: tela deitada em cima de tudo (a barra do app fica por baixo; "Sair" está na barra do jogo) */
    .pf-land{position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;z-index:50;background:#f1f0ea;color:#0f0f14;display:flex;flex-direction:column;gap:8px;padding:8px 10px 10px;padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right));overflow:hidden;touch-action:manipulation}
    @media (orientation:portrait){.pf-land{width:100vh;width:100dvh;height:100vw;left:100vw;transform-origin:0 0;transform:rotate(90deg);padding-left:max(10px,env(safe-area-inset-top));padding-right:max(10px,env(safe-area-inset-bottom))}}
    .pf-bar{flex:none;display:flex;align-items:center;gap:8px;min-width:0;height:40px}
    .pf-brand{flex:none;background:#0f0f14;color:#f1f0ea;padding:6px 9px;font-size:17px;font-weight:900;font-stretch:125%;text-transform:uppercase;line-height:1}
    .pf-round{flex:none;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
    .pf-round b{font-family:'Pixelify Sans',monospace;font-size:15px}
    .pf-bar .pf-status{flex:none;margin:0;font-size:15px;padding:5px 9px}
    .pf-bar .pf-status.mine{padding:3px 8px}
    .pf-barnote{flex:1;min-width:0;font-size:13px;font-weight:600;color:#3a3a42;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pf-bar .pf-pill{flex:none}
    .pf-exit{flex:none;height:34px;padding:0 10px;border:3px solid #0f0f14;background:#fff;color:#0f0f14;font-family:inherit;font-weight:900;font-size:13px;line-height:1;font-stretch:115%;text-transform:uppercase;box-shadow:3px 3px 0 #0f0f14;cursor:pointer}
    .pf-exit:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #0f0f14}
    .pf-mid{flex:1;min-height:0;display:flex;gap:12px;align-items:stretch}
    .pf-tbl{flex:none;display:flex;align-items:center;gap:14px;padding:8px 14px;background-color:#f0443a;background-image:radial-gradient(rgba(15,15,20,.16) 1.2px,transparent 1.3px);background-size:9px 9px;border:3px solid #0f0f14;box-shadow:4px 4px 0 #0f0f14}
    .pf-land.mine .pf-tbl{background-color:#ffce1f}
    .pf-tbl .pf-pile{min-width:0;gap:5px}
    .pf-tbl .pf-back,.pf-tbl .pf-card{width:54px;height:78px;padding:4px;cursor:default}
    .pf-tbl .pf-card .corner{font-size:15px;top:4px;left:5px}.pf-tbl .pf-card .middle{font-size:28px;margin-top:20px}.pf-tbl .pf-card .foot{display:none}
    .pf-tbl .pf-pile small{background:#fff;border:2px solid #0f0f14;padding:2px 5px;font-size:10px}
    .pf-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden}
    .pf-info .pf-event{text-align:left;padding:0;font-size:13px}
    .pf-info .pf-groups{gap:6px;margin:0}
    .pf-info .pf-group{min-height:34px;padding:4px 8px;font-size:14px}
    .pf-act{flex:none;width:168px;display:flex;flex-direction:column;justify-content:center;gap:9px}
    .pf-act .pf-action{min-height:42px;padding:8px;font-size:14px}
    .pf-land .pf-hand{flex:none;position:relative;display:flex;justify-content:center;gap:6px;overflow:visible;padding:14px 0 0;margin:0;scroll-snap-type:none}
    .pf-land .pf-card{flex:0 1 84px;min-width:0;width:auto;height:auto;aspect-ratio:69/99;touch-action:none;padding:6px}
    .pf-land .pf-card .middle{font-size:34px;margin-top:22px}
    .pf-land .pf-card.dragging{z-index:3;transition:none;background:#ffce1f;box-shadow:7px 7px 0 #0f0f14}
    .pf-tbl.drop-ok{outline:4px dashed #0f0f14;outline-offset:3px}
    .pf-land .pf-tbl.drop-on{background-color:#35d07f;box-shadow:7px 7px 0 #0f0f14}
    .pf-tbl.drop-no{opacity:.55}
    .pf-toss{position:absolute;top:-30px;left:50%;z-index:4;width:136px;margin-left:-68px;padding:10px 4px;white-space:nowrap;border:3px solid #0f0f14;background:#ffce1f;color:#0f0f14;font-family:inherit;font-weight:900;font-size:14px;line-height:1;font-stretch:110%;text-transform:uppercase;box-shadow:4px 4px 0 #0f0f14;cursor:pointer;touch-action:manipulation}
    .pf-toss:active{transform:translate(3px,3px);box-shadow:1px 1px 0 #0f0f14}
    .pf-hint{margin:0;font-size:13px;font-weight:700;line-height:1.3}
    .pf-drop{position:absolute;top:6px;bottom:-4px;width:6px;background:#0f0f14;border-left:2px solid #ffce1f;border-right:2px solid #ffce1f;pointer-events:none}
    @media (max-width:700px) and (orientation:landscape),(max-height:700px) and (orientation:portrait){.pf-barnote{display:none}.pf-bar .pf-pill{display:none}}
    @media (max-width:370px){.pf-title{font-size:23px}}
    @media (prefers-reduced-motion:reduce){.pf-card{transition:none}}
  `;
  const ensure = () => { if (styled) return; const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); styled = true; };
  const cardName = x => x.joker ? 'Coringa' : `${rank(x.n)} de ${(SUITS[x.s] || ['?', 'Naipe'])[1]}`;
  const shortName = x => x.joker ? '★ Coringa' : `${rank(x.n)}${(SUITS[x.s] || ['?'])[0]}`;
  const card = (x, attrs = '', cls = '') => {
    if (!x) return '<div class="pf-back empty" role="img" aria-label="Descarte vazio"></div>';
    const suit = (SUITS[x.s] || ['?'])[0], red = x.s === 'H' || x.s === 'D';
    const inner = x.joker ? '<span class="corner">★</span><span class="middle">★</span><span class="foot">CORINGA</span>' : `<span class="corner">${rank(x.n)}<br>${suit}</span><span class="middle" aria-hidden="true">${suit}</span><span class="foot">${rank(x.n)} ${suit}</span>`;
    return attrs ? `<button type="button" class="pf-card ${red ? 'red' : ''} ${x.joker ? 'joker' : ''} ${cls}" aria-label="${cardName(x)}" ${attrs}>${inner}</button>` : `<div class="pf-card ${red ? 'red' : ''} ${x.joker ? 'joker' : ''}" role="img" aria-label="${cardName(x)}">${inner}</div>`;
  };
  const button = (action, label, extra = '', disabled = false) => `<button type="button" class="pf-action ${extra}" data-a="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  const validGroup = (cards, jokers) => {
    if (cards.length !== 3) return false;
    const natural = cards.filter(x => !x.joker), wild = cards.length - natural.length;
    if (wild > 1 || (wild && !jokers) || natural.length < 2) return false;
    const set = natural.every(x => x.n === natural[0].n) && new Set(natural.map(x => x.s)).size === natural.length;
    const run = natural.every(x => x.s === natural[0].s) && [false, true].some(high => {
      const nums = natural.map(x => x.n === 1 && high ? 14 : x.n);
      if (new Set(nums).size !== nums.length) return false;
      const low = Math.min(...nums);
      // O coringa pode preencher uma posição antes ou depois das cartas naturais.
      for (let start = low - (3 - nums.length); start <= low; start++) {
        if (start >= 1 && start + 2 <= 14 && nums.every(n => n >= start && n <= start + 2)) return true;
      }
      return false;
    });
    return set || run;
  };
  const reset = () => { mode = 'discard'; picked = null; groups = [[], [], []]; };
  const renderBody = c => {
    const G = c.G, me = c.you.pid, esc = c.esc, players = c.C.players || [];
    const name = pid => { const p = players.find(x => x.pid === pid); return p ? esc(p.name) : 'Jogador'; };
    const mine = G.turn === me, draw = G.step === 'draw', discard = G.step === 'discard';
    const hand = G.hand || [], assigned = groups.flat();
    const selected = hand.find(x => x.id === picked);
    const ungrouped = hand.filter(x => !assigned.includes(x.id));
    const knockReady = groups.every(g => validGroup(g.map(id => hand.find(x => x.id === id)), G.cfg && G.cfg.jokers)) && ungrouped.length === 1;
    const header = `<div class="pf-panel pf-top"><div class="pf-head"><div><div class="pf-kicker">Pife · Cacheta</div><h2 class="pf-title">${G.phase === 'setup' ? 'Prepare a mesa' : G.phase === 'end' ? 'Fim de jogo' : G.phase === 'round' ? 'Rodada fechada' : `Rodada ${G.round || 1}`}</h2></div><span class="pf-pill">${G.cfg && G.cfg.jokers ? '★ Com coringa' : 'Sem coringa'}</span></div>${G.phase === 'play' ? `<p class="pf-status ${mine ? 'mine' : ''}">${mine ? draw ? 'Sua vez: compre' : mode === 'knock' ? 'Monte a batida' : 'Sua vez: descarte' : `Vez de ${name(G.turn)}`}</p><p class="pf-note">${mine ? draw ? 'Escolha o monte fechado ou o descarte.' : mode === 'knock' ? 'Toque em 3 cartas para cada jogo. A carta que sobrar vai para o descarte.' : 'Toque em uma carta e depois em Descartar. Você também pode bater.' : 'Sua mão fica só no seu celular.'}</p>` : ''}</div>`;
    const event = c.C.event ? `<div class="pf-event">${c.hl(c.C.event.text)}</div>` : '';
    if (G.phase === 'setup') {
      return `${header}<div class="pf-panel"><p class="pf-label">Regra do coringa</p><div class="pf-choice">${button('jokersOn', '★ Com coringa', G.cfg && G.cfg.jokers ? 'primary' : 'ghost')}${button('jokersOff', 'Sem coringa', G.cfg && !G.cfg.jokers ? 'primary' : 'ghost')}</div><p class="pf-note">De 2 a 10 pessoas. Cada pessoa recebe 9 cartas. Forme 3 jogos de 3 cartas e bata.</p></div><div class="pf-actions">${button('begin', 'Começar partida', 'primary wide', players.length < 2 || players.length > 10)}</div>${event}`;
    }
    if (G.phase === 'round' || G.phase === 'end') {
      const win = G.phase === 'end' ? G.winner : G.roundWinner;
      const scores = G.scores || {};
      return `${header}<div class="pf-panel"><p class="pf-status mine" style="margin-top:0">${win === me ? 'Você bateu!' : `${name(win)} bateu!`}</p><p class="pf-note">${G.phase === 'end' ? 'A partida terminou.' : 'Veja o placar e jogue outra rodada.'}</p></div><div class="pf-panel"><p class="pf-label">Placar</p><div class="pf-roster">${players.map(p => `<span class="${p.pid === win ? 'pf-now' : ''}">${esc(p.name)} · <i>${scores[p.pid] || 0}</i></span>`).join('')}</div></div><div class="pf-actions">${button(G.phase === 'end' ? 'again' : 'next', G.phase === 'end' ? 'Jogar de novo' : 'Próxima rodada', 'primary wide')}</div>${event}`;
    }
    // Durante a rodada a tela fica sempre deitada (no celular em pé, o bloco gira 90°): mão grande embaixo, mesa em cima.
    const statusTxt = mine ? draw ? 'Sua vez: compre' : mode === 'knock' ? 'Monte a batida' : 'Sua vez: descarte' : `Vez de ${name(G.turn)}`;
    const noteTxt = mode === 'knock' && mine && discard ? `Jogo ${Math.min(3, groups.findIndex(g => g.length < 3) + 1 || 3)} de 3 · ${assigned.length}/9 cartas · a carta que sobrar vai para o descarte`
      : mine && draw ? 'Compre do monte ou pegue o descarte.'
      : mine && discard ? selected ? `Escolhida: ${shortName(selected)}` : 'Arraste uma carta para a mesa para descartar.'
      : 'Segure e arraste as cartas para arrumar a mão.';
    const bar = `<div class="pf-bar"><span class="pf-brand">Pife</span><span class="pf-round mono">Rodada <b>${G.round || 1}</b></span><span class="pf-status ${mine ? 'mine' : ''}">${statusTxt}</span><span class="pf-barnote">${noteTxt}</span><span class="pf-pill">${G.cfg && G.cfg.jokers ? '★ Coringa' : 'Sem coringa'}</span><button type="button" class="pf-exit" data-a="pfExit" aria-label="Sair do jogo">Sair</button></div>`;
    const table = `<div class="pf-tbl"><div class="pf-pile"><div class="pf-back ${G.deckN ? '' : 'empty'}"></div><small>Monte · <b>${G.deckN || 0}</b></small></div><div class="pf-pile">${card(G.discardTop)}<small>Descarte · <b>${G.discardN || 0}</b></small></div></div>`;
    const tossBtn = mine && discard && mode === 'discard' && selected ? `<button type="button" class="pf-toss" data-a="discardCard">Descartar</button>` : '';
    const handHtml = `<div class="pf-hand" data-n="${hand.length}">${hand.map(x => card(x, `data-a="pickCard" data-id="${esc(x.id)}"`, `${picked === x.id ? 'selected' : ''} ${assigned.includes(x.id) ? 'grouped' : ''}`)).join('')}${tossBtn}</div>`;
    let actions = '';
    if (mine && draw) actions = `${button('drawStock', 'Comprar do monte', 'primary', !G.deckN && !(G.discardN > 1))}${button('drawDiscard', 'Pegar descarte', '', !G.discardTop)}`;
    if (mine && discard && mode === 'discard') actions = `<p class="pf-hint">Arraste uma carta até a mesa, ou toque nela e em <b>Descartar</b>.</p>${button('knockMode', 'Bater', 'ghost', !G.canKnock)}`;
    if (mine && discard && mode === 'knock') {
      const desc = ungrouped.length === 1 ? shortName(ungrouped[0]) : '—';
      actions = `${button('knockSubmit', `Bater · ${desc}`, 'primary', !knockReady)}${button('knockUndo', 'Desfazer', 'ghost', !assigned.length)}${button('knockCancel', 'Cancelar', 'ghost')}`;
    }
    const groupHtml = mode === 'knock' && mine && discard ? `<div class="pf-groups">${groups.map((group, i) => `<div class="pf-group ${group.length === 3 ? validGroup(group.map(id => hand.find(x => x.id === id)), G.cfg && G.cfg.jokers) ? 'valid' : 'invalid' : ''}"><b>Jogo ${i + 1}</b><span>${group.length ? group.map(id => { const x = hand.find(y => y.id === id); return x ? shortName(x) : '?'; }).join(' · ') : 'Escolha 3 cartas'}${group.length === 3 ? validGroup(group.map(id => hand.find(x => x.id === id)), G.cfg && G.cfg.jokers) ? ' ✓' : ' · não vale' : ''}</span></div>`).join('')}</div>` : '';
    const roster = `<div class="pf-roster">${(G.order || []).map(o => `<span class="${o.pid === G.turn ? 'pf-now' : ''}">${name(o.pid)} · <i>${o.n}</i></span>`).join('')}</div>`;
    return `<div class="pf-land ${mine ? 'mine' : ''}">${bar}<div class="pf-mid">${table}<div class="pf-info">${groupHtml || roster + event}</div>${actions ? `<div class="pf-act">${actions}</div>` : ''}</div>${handHtml}</div>`;
  };
  const refresh = c => {
    const root = document.getElementById('pife-phone'); if (!root) return;
    root.innerHTML = renderBody(c);
    root.querySelectorAll('[data-a]').forEach(el => { el.onclick = ev => { ev.stopPropagation(); phone.act(el.dataset.a, el, c); }; });
    bindDrag(c);
  };
  // Arrastar cartas da mão. Para o lado: muda a carta de lugar (arrumar a mão). Para cima, até a mesa:
  // descarta (só na sua vez, depois de comprar). A direção sai dos primeiros ~10px do movimento.
  // A tela pode estar girada 90° (celular em pé): a conta da tela para a mão é a mesma do controle em
  // shared/ext/phone.js — o x da mão anda com o y da tela, e o "para cima" da mão é o x da tela para a esquerda.
  let drag = null, eatClick = 0;
  const turned = () => !!document.querySelector('.pf-land') && window.matchMedia('(orientation:portrait)').matches;
  const local = (dx, dy) => turned() ? [dy, -dx] : [dx, dy];
  const canToss = c => { const G = c.G; return !!(G && c.you && G.phase === 'play' && G.turn === c.you.pid && G.step === 'discard' && mode !== 'knock'); };
  const inside = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  function bindDrag(c) {
    const box = document.querySelector('.pf-land .pf-hand'); if (!box || box.dataset.bound) return;
    box.dataset.bound = '1';
    const tbl = document.querySelector('.pf-land .pf-tbl');
    const cards = () => Array.prototype.slice.call(box.querySelectorAll('.pf-card'));
    const marker = document.createElement('i'); marker.className = 'pf-drop';
    const slotAt = x => { let i = 0; for (const el of cards()) { if (el === drag.el) continue; if (el.offsetLeft + el.offsetWidth / 2 < x) i++; } return i; };
    const lift = () => { drag.held = true; drag.el.classList.add('dragging'); try { navigator.vibrate && navigator.vibrate(15); } catch (_) {} };
    const overTable = () => {
      if (!tbl) return false;
      const r = drag.el.getBoundingClientRect();
      return inside(tbl.getBoundingClientRect(), r.left + r.width / 2, r.top + r.height / 2) || drag.ly < -box.offsetHeight * .75;
    };
    const move = (x, y) => {
      if (!drag) return;
      const l = local(x - drag.x, y - drag.y), lx = l[0], ly = l[1];
      if (!drag.mode) {
        if (Math.abs(lx) < 10 && Math.abs(ly) < 10) return;
        clearTimeout(drag.hold); if (!drag.held) lift();
        drag.mode = ly < 0 && -ly > Math.abs(lx) ? 'toss' : 'sort';
        if (drag.mode === 'sort') box.appendChild(marker);
        else if (tbl) tbl.classList.add(canToss(c) ? 'drop-ok' : 'drop-no');
      }
      drag.lx = lx; drag.ly = ly;
      if (drag.mode === 'toss') {
        drag.el.style.transform = `translate(${lx}px,${ly}px) rotate(-4deg)`;
        if (tbl) tbl.classList.toggle('drop-on', canToss(c) && overTable());
        return;
      }
      drag.el.style.transform = `translate(${lx}px,-14px)`;
      const center = drag.el.offsetLeft + drag.el.offsetWidth / 2 + lx;
      drag.slot = slotAt(center);
      const rest = cards().filter(el => el !== drag.el);
      const ref = rest[drag.slot], prev = rest[drag.slot - 1];
      marker.style.left = (ref ? ref.offsetLeft - 5 : prev.offsetLeft + prev.offsetWidth + 2) + 'px';
    };
    const snapBack = el => {
      el.style.transition = 'transform .18s ease-out'; el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; el.classList.remove('dragging'); }, 200);
    };
    const end = () => {
      if (!drag) return;
      clearTimeout(drag.hold);
      const d = drag; drag = null;
      if (marker.parentNode) marker.parentNode.removeChild(marker);
      if (tbl) tbl.classList.remove('drop-ok', 'drop-no', 'drop-on');
      if (!d.mode) { if (d.held) { eatClick = Date.now() + 400; d.el.classList.remove('dragging'); } return; }
      eatClick = Date.now() + 400;
      const hand = c.G.hand || [], from = hand.findIndex(x => String(x.id) === d.el.dataset.id);
      if (d.mode === 'toss') {
        drag = d;  // overTable() lê a posição atual
        const hit = canToss(c) && overTable(); drag = null;
        if (!hit || from < 0) return snapBack(d.el);
        // a carta voa até o descarte e só então vai para o servidor
        const pile = tbl.querySelector('.pf-pile:last-child > :first-child') || tbl;
        const a = d.el.getBoundingClientRect(), b = pile.getBoundingClientRect();
        const l = local(b.left + b.width / 2 - (a.left + a.width / 2), b.top + b.height / 2 - (a.top + a.height / 2));
        d.el.style.transition = 'transform .22s ease-in';
        d.el.style.transform = `translate(${d.lx + l[0]}px,${d.ly + l[1]}px) scale(.72)`;
        picked = null;
        setTimeout(() => A.send({ t: 'discard', id: hand[from].id }), 220);
        return;
      }
      d.el.classList.remove('dragging'); d.el.style.transform = '';
      if (from < 0 || d.slot === undefined) return;
      const next = hand.filter((x, i) => i !== from); next.splice(d.slot, 0, hand[from]);
      if (next.every((x, i) => x === hand[i])) return;
      c.G.hand = next;                       // já mostra na nova ordem; o servidor guarda a mesma ordem
      A.send({ t: 'reorder', ids: next.map(x => x.id) });
      refresh(c);
    };
    const start = (target, x, y, id) => {
      const el = target && target.closest && target.closest('.pf-card'); if (!el || drag) return;
      drag = { el, x, y, id, mode: null, held: false };
      drag.hold = setTimeout(() => { if (drag && !drag.mode) lift(); }, 280);
    };
    const touchOf = ev => { for (const t of ev.changedTouches) if (drag && t.identifier === drag.id) return t; return null; };
    box.addEventListener('touchstart', ev => { const t = ev.changedTouches[0]; if (t) start(ev.target, t.clientX, t.clientY, t.identifier); }, { passive: true });
    box.addEventListener('touchmove', ev => { const t = touchOf(ev); if (!t) return; move(t.clientX, t.clientY); if (drag && drag.mode) ev.preventDefault(); }, { passive: false });
    box.addEventListener('touchend', ev => { if (touchOf(ev)) end(); });
    box.addEventListener('touchcancel', ev => { if (touchOf(ev)) end(); });
    // mouse (computador): mesma coisa
    box.addEventListener('mousedown', ev => {
      if (ev.button !== 0 || drag || ev.target.closest('.pf-toss')) return;
      start(ev.target, ev.clientX, ev.clientY, 'mouse');
      const mm = e => move(e.clientX, e.clientY);
      const mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); end(); };
      window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
    });
    box.addEventListener('click', ev => { if (Date.now() < eatClick && !ev.target.closest('.pf-toss')) { ev.stopPropagation(); ev.preventDefault(); } }, true);
    // botão DESCARTAR em cima da carta escolhida
    const toss = box.querySelector('.pf-toss'), sel = box.querySelector('.pf-card.selected');
    if (toss && sel) toss.style.left = Math.max(70, Math.min(box.offsetWidth - 70, sel.offsetLeft + sel.offsetWidth / 2)) + 'px';
  }
  const phone = {
    key(c) {
      const G = c.G; if (!G) return '';
      return [G.phase, G.round, G.turn, G.step, G.deckN, G.discardTop && G.discardTop.id, G.cfg && G.cfg.jokers,
        (G.hand || []).map(x => x.id).join(','), JSON.stringify(G.order || []), JSON.stringify(G.scores || {}), G.roundWinner, G.winner,
        c.C.event && c.C.event.text, (c.C.players || []).map(p => p.pid + p.name).join(',')].join('|');
    },
    html(c) {
      ensure(); if (!c.G || !c.you) return '';
      const G = c.G, sig = `${G.phase}:${G.round}:${G.turn}:${G.step}:${(G.hand || []).map(x => x.id).sort((a, b) => a - b).join(',')}`;
      if (sig !== signature) { signature = sig; reset(); }
      return `<div id="pife-phone" class="pf-phone">${renderBody(c)}</div>`;
    },
    after(c) {
      const G = c.G;
      if (!G || !c.you) return;
      bindDrag(c);
      const mine = G.phase === 'play' && G.turn === c.you.pid;
      const tag = `${G.round}:${G.turn}`;
      if (mine && tag !== lastTurn) { lastTurn = tag; A.beep(670, .12, 'sine', .15); try { navigator.vibrate && navigator.vibrate([50, 35, 50]); } catch (_) {} }
      if (!mine) lastTurn = '';
    },
    act(a, el, c) {
      if (a === 'jokersOn' || a === 'jokersOff') A.send({ t: 'config', cfg: { jokers: a === 'jokersOn' } });
      else if (a === 'begin' || a === 'next' || a === 'again') A.send({ t: a });
      else if (a === 'drawStock' || a === 'drawDiscard') A.send({ t: 'draw', from: a === 'drawStock' ? 'stock' : 'discard' });
      else if (a === 'pickCard') {
        const item = (c.G.hand || []).find(x => String(x.id) === el.dataset.id);
        if (!item) return;
        const id = item.id;
        if (mode === 'knock') {
          if (groups.flat().includes(id)) groups = groups.map(g => g.filter(x => x !== id));
          else { const group = groups.find(g => g.length < 3); if (group) group.push(id); }
        } else picked = picked === id ? null : id;
        refresh(c);
      }
      else if (a === 'pfExit') { const b = document.querySelector('.exit-btn'); if (b) b.click(); }
      else if (a === 'discardCard' && picked !== null) { A.send({ t: 'discard', id: picked }); picked = null; }
      else if (a === 'knockMode') { mode = 'knock'; picked = null; groups = [[], [], []]; refresh(c); }
      else if (a === 'knockUndo') { const group = [...groups].reverse().find(g => g.length); if (group) group.pop(); refresh(c); }
      else if (a === 'knockCancel') { reset(); refresh(c); }
      else if (a === 'knockSubmit') {
        const ungrouped = (c.G.hand || []).filter(x => !groups.flat().includes(x.id));
        if (groups.every(g => g.length === 3) && ungrouped.length === 1) A.send({ t: 'knock', discardId: ungrouped[0].id, groups: groups.map(g => [...g]) });
      }
    },
  };
  A.register('pife', { phone });
})();
