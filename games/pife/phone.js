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
    .pf-phone{--pf-ink:#f7f0dc;--pf-gold:#efc878;display:flex;flex-direction:column;gap:12px;color:var(--pf-ink)}
    .pf-panel{background:linear-gradient(145deg,#164e3f,#10362f);border:1px solid #557363;border-radius:18px;padding:15px;box-shadow:0 8px 24px #0003}
    .pf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .pf-kicker{color:var(--pf-gold);font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:900}
    .pf-title{font-size:27px;line-height:1.1;margin:4px 0 0}
    .pf-pill{display:inline-block;flex:none;background:#ffffff18;border:1px solid #ffffff38;padding:6px 10px;border-radius:99px;font-size:12px;font-weight:800}
    .pf-status{font-size:19px;font-weight:900;color:var(--pf-gold);margin-top:14px}
    .pf-note{font-size:13px;color:#d6e1d4;line-height:1.4;margin-top:7px}
    .pf-label{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--pf-gold);font-weight:900;margin-bottom:11px}
    .pf-table{display:flex;align-items:center;gap:15px;justify-content:center}
    .pf-pile{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:80px}
    .pf-pile small{font-size:12px;color:#d6e1d4;font-weight:800;text-align:center}
    .pf-back{width:68px;height:98px;border-radius:10px;border:5px solid #e8e3d3;background:repeating-linear-gradient(45deg,#143c66 0 5px,#2474a0 5px 10px);box-shadow:0 5px 10px #0005}
    .pf-back.empty{opacity:.32}
    .pf-hand{display:flex;gap:7px;overflow-x:auto;padding:14px 4px 18px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
    .pf-hand::-webkit-scrollbar{height:5px}.pf-hand::-webkit-scrollbar-thumb{background:#ffffff44;border-radius:5px}
    .pf-card{position:relative;flex:none;width:69px;height:99px;border:2px solid #f8f5eb;border-radius:10px;background:#fcfaf0;color:#1e2932;box-shadow:0 5px 11px #0006;cursor:pointer;scroll-snap-align:center;text-align:left;padding:6px;touch-action:manipulation}
    .pf-card.red{color:#c42b38}.pf-card.joker{background:linear-gradient(145deg,#fff7cd,#f1d1f2);color:#6c297c}
    .pf-card .corner{position:absolute;top:5px;left:6px;font-size:17px;font-weight:900;line-height:1}
    .pf-card .middle{display:block;text-align:center;font-size:39px;line-height:1;margin-top:26px}
    .pf-card .foot{position:absolute;bottom:5px;right:6px;font-size:10px;font-weight:900}
    .pf-card.selected{transform:translateY(-11px);box-shadow:0 0 0 3px var(--pf-gold),0 12px 18px #0008}
    .pf-card.grouped{opacity:.46}.pf-card:disabled{cursor:default}
    .pf-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .pf-action{border:1px solid #a8bbae;background:#24654c;color:#fff9e8;padding:13px 8px;border-radius:12px;font-size:15px;font-weight:900;cursor:pointer;min-height:48px}
    .pf-action.primary{background:var(--pf-gold);border-color:var(--pf-gold);color:#203027}
    .pf-action.ghost{background:#ffffff13}.pf-action.wide{grid-column:1/-1}
    .pf-action:disabled{opacity:.38;cursor:default}
    .pf-choice{display:flex;gap:8px}.pf-choice .pf-action{flex:1}
    .pf-groups{display:grid;gap:7px;margin-top:10px}
    .pf-group{display:flex;align-items:center;gap:8px;border:1px solid #ffffff35;border-radius:10px;padding:8px;background:#0002;min-height:43px;font-size:13px}
    .pf-group.valid{border-color:#76ce95}.pf-group.invalid{border-color:#f0897e}
    .pf-group b{color:var(--pf-gold);white-space:nowrap}.pf-group span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .pf-roster{display:flex;flex-wrap:wrap;gap:7px}.pf-roster span{padding:5px 9px;border-radius:99px;background:#ffffff17;font-size:12px;font-weight:800}.pf-roster .now{outline:2px solid var(--pf-gold)}
    .pf-event{text-align:center;font-size:13px;color:#d6e1d4;padding:2px 6px}
    @media (orientation:landscape) and (max-height:600px){body.phone:has(.pf-phone) #app{max-width:none;padding:8px 12px}body.phone:has(.pf-phone) .head{display:none}.pf-phone{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:8px}.pf-phone>.pf-panel:first-child,.pf-phone>.pf-event{grid-column:1/-1}.pf-phone>.pf-panel{min-width:0}.pf-hand{padding:8px 4px 12px}.pf-card{width:clamp(66px,22vh,104px);height:clamp(96px,32vh,150px)}.pf-card .middle{font-size:clamp(35px,10vh,65px);margin-top:22px}.pf-actions{display:flex;flex-direction:column}.pf-action.wide{grid-column:auto}}
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
    const header = `<div class="pf-panel"><div class="pf-head"><div><div class="pf-kicker">Pife · Cacheta</div><h2 class="pf-title">${G.phase === 'setup' ? 'Prepare a mesa' : G.phase === 'end' ? 'Fim de jogo' : G.phase === 'round' ? 'Rodada fechada' : `Rodada ${G.round || 1}`}</h2></div><span class="pf-pill">${G.cfg && G.cfg.jokers ? '★ Com coringa' : 'Sem coringa'}</span></div>${G.phase === 'play' ? `<p class="pf-status">${mine ? draw ? 'Sua vez: compre' : mode === 'knock' ? 'Monte a batida' : 'Sua vez: descarte' : `Vez de ${name(G.turn)}`}</p><p class="pf-note">${mine ? draw ? 'Escolha o monte fechado ou o descarte.' : mode === 'knock' ? 'Toque em 3 cartas para cada jogo. A carta que sobrar vai para o descarte.' : 'Toque em uma carta e depois em Descartar. Você também pode bater.' : 'Sua mão fica só no seu celular.'}</p>` : ''}</div>`;
    const event = c.C.event ? `<div class="pf-event">${c.hl(c.C.event.text)}</div>` : '';
    if (G.phase === 'setup') {
      return `${header}<div class="pf-panel"><p class="pf-label">Regra do coringa</p><div class="pf-choice">${button('jokersOn', '★ Com coringa', G.cfg && G.cfg.jokers ? 'primary' : 'ghost')}${button('jokersOff', 'Sem coringa', G.cfg && !G.cfg.jokers ? 'primary' : 'ghost')}</div><p class="pf-note">De 2 a 10 pessoas. Cada pessoa recebe 9 cartas. Forme 3 jogos de 3 cartas e bata.</p></div><div class="pf-actions">${button('begin', 'Começar partida', 'primary wide', players.length < 2 || players.length > 10)}</div>${event}`;
    }
    if (G.phase === 'round' || G.phase === 'end') {
      const win = G.phase === 'end' ? G.winner : G.roundWinner;
      const scores = G.scores || {};
      return `${header}<div class="pf-panel"><p class="pf-status">${win === me ? 'Você bateu! 🏆' : `${name(win)} bateu!`}</p><p class="pf-note">${G.phase === 'end' ? 'A partida terminou.' : 'Veja o placar e jogue outra rodada.'}</p></div><div class="pf-panel"><p class="pf-label">Placar</p><div class="pf-roster">${players.map(p => `<span>${esc(p.name)} · ${scores[p.pid] || 0}</span>`).join('')}</div></div><div class="pf-actions">${button(G.phase === 'end' ? 'again' : 'next', G.phase === 'end' ? 'Jogar de novo' : 'Próxima rodada', 'primary wide')}</div>${event}`;
    }
    const table = `<div class="pf-panel"><p class="pf-label">Mesa</p><div class="pf-table"><div class="pf-pile"><div class="pf-back ${G.deckN ? '' : 'empty'}"></div><small>Monte · ${G.deckN || 0}</small></div><div class="pf-pile">${card(G.discardTop)}<small>Descarte</small></div></div></div>`;
    const handHtml = `<div class="pf-panel"><p class="pf-label">Sua mão · ${hand.length} cartas</p><div class="pf-hand">${hand.map(x => card(x, `data-a="pickCard" data-id="${esc(x.id)}"`, `${picked === x.id ? 'selected' : ''} ${assigned.includes(x.id) ? 'grouped' : ''}`)).join('')}</div><p class="pf-note">${mode === 'knock' && mine && discard ? `Jogo ${Math.min(3, groups.findIndex(g => g.length < 3) + 1 || 3)} de 3 · ${assigned.length}/9 cartas` : mine && discard ? selected ? `Escolhida: ${shortName(selected)}` : 'Escolha a carta que quer descartar.' : 'Organize suas cartas enquanto espera.'}</p></div>`;
    let actions = '';
    if (mine && draw) actions = `${button('drawStock', 'Comprar do monte', 'primary', !G.deckN && !(G.discardN > 1))}${button('drawDiscard', 'Pegar descarte', '', !G.discardTop)}`;
    if (mine && discard && mode === 'discard') actions = `${button('discardCard', 'Descartar carta', 'primary', !selected)}${button('knockMode', 'Bater', 'ghost', !G.canKnock)}`;
    if (mine && discard && mode === 'knock') {
      const desc = ungrouped.length === 1 ? shortName(ungrouped[0]) : '—';
      actions = `${button('knockSubmit', `Bater · descartar ${desc}`, 'primary wide', !knockReady)}${button('knockUndo', 'Desfazer última', 'ghost', !assigned.length)}${button('knockCancel', 'Cancelar batida', 'ghost')}`;
    }
    const groupHtml = mode === 'knock' && mine && discard ? `<div class="pf-panel"><p class="pf-label">Seus 3 jogos</p><div class="pf-groups">${groups.map((group, i) => `<div class="pf-group ${group.length === 3 ? validGroup(group.map(id => hand.find(x => x.id === id)), G.cfg && G.cfg.jokers) ? 'valid' : 'invalid' : ''}"><b>Jogo ${i + 1}</b><span>${group.length ? group.map(id => { const x = hand.find(y => y.id === id); return x ? shortName(x) : '?'; }).join(' · ') : 'Escolha 3 cartas'}${group.length === 3 ? validGroup(group.map(id => hand.find(x => x.id === id)), G.cfg && G.cfg.jokers) ? ' ✓' : ' · não vale' : ''}</span></div>`).join('')}</div><p class="pf-note">Valem 3 do mesmo número, ou 3 em sequência do mesmo naipe.</p></div>` : '';
    const roster = `<div class="pf-panel"><p class="pf-label">Jogadores</p><div class="pf-roster">${(G.order || []).map(o => `<span class="${o.pid === G.turn ? 'now' : ''}">${name(o.pid)} · ${o.n} cartas</span>`).join('')}</div></div>`;
    return `${header}${table}${handHtml}${groupHtml}${actions ? `<div class="pf-actions">${actions}</div>` : ''}${roster}${event}`;
  };
  const refresh = c => {
    const root = document.getElementById('pife-phone'); if (!root) return;
    root.innerHTML = renderBody(c);
    root.querySelectorAll('[data-a]').forEach(el => { el.onclick = ev => { ev.stopPropagation(); phone.act(el.dataset.a, el, c); }; });
  };
  const phone = {
    key(c) {
      const G = c.G; if (!G) return '';
      return [G.phase, G.round, G.turn, G.step, G.deckN, G.discardTop && G.discardTop.id, G.cfg && G.cfg.jokers,
        (G.hand || []).map(x => x.id).join(','), JSON.stringify(G.order || []), JSON.stringify(G.scores || {}), G.roundWinner, G.winner,
        c.C.event && c.C.event.text, (c.C.players || []).map(p => p.pid + p.name).join(',')].join('|');
    },
    html(c) {
      ensure(); if (!c.G || !c.you) return '';
      const G = c.G, sig = `${G.phase}:${G.round}:${G.turn}:${G.step}:${(G.hand || []).map(x => x.id).join(',')}`;
      if (sig !== signature) { signature = sig; reset(); }
      return `<div id="pife-phone" class="pf-phone">${renderBody(c)}</div>`;
    },
    after(c) {
      const G = c.G; if (!G || !c.you) return;
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
