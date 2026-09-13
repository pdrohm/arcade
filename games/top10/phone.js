// Top 10 — tela do celular. O celular é a mesa: título da carta, botão FALEI, botão DUVIDO,
// a lista revelada e a votação. Tudo funciona igual quando não tem TV na sala.
'use strict';
(() => {
  let styled = false, lastFx = 0, turnTag = '', lastTick = -1;
  const style = `
    .t10-cat { display:inline-block; padding:6px 14px; border-radius:99px; background:#f59e0b; color:#1c1200; font-weight:900; font-size:15px; letter-spacing:.5px; }
    .t10-title { font-size:30px; font-weight:900; line-height:1.15; margin-top:10px; }
    .t10-src { font-size:14px; color:#9aa6c0; font-weight:700; margin-top:8px; }
    .t10-locked { display:flex; align-items:center; gap:10px; justify-content:center; margin-top:12px; padding:10px; border-radius:12px; background:#0b0e17; color:#cbd5e1; font-weight:800; font-size:15px; }
    .t10-count { display:flex; align-items:baseline; justify-content:center; gap:10px; }
    .t10-count b { font-size:52px; font-weight:900; line-height:1; color:#facc15; font-variant-numeric:tabular-nums; }
    .t10-count span { font-size:16px; color:#9aa6c0; font-weight:700; }
    .t10-over { color:#fb923c; }
    .t10-t { font-size:66px; font-weight:900; line-height:1; text-align:center; font-variant-numeric:tabular-nums; }
    .t10-t.low { color:#ef4444; animation:pulse .5s infinite alternate; }
    .t10-list { display:flex; flex-direction:column; gap:6px; }
    .t10-it { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:12px; background:#0b0e17; font-size:19px; font-weight:800; }
    .t10-it i { font-style:normal; font-weight:900; color:#f59e0b; min-width:28px; font-size:17px; }
    .t10-it.top { background:#3b2f00; }
    .t10-verdict { text-align:center; padding:18px 12px; border-radius:18px; font-weight:900; font-size:24px; line-height:1.25; }
    .t10-verdict.ok { background:#052e1a; border:3px solid #22c55e; color:#86efac; }
    .t10-verdict.no { background:#3b0a0a; border:3px solid #ef4444; color:#fca5a5; }
    .t10-hp { font-size:22px; letter-spacing:2px; }
    .t10-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .t10-o { padding:12px 16px; border-radius:12px; background:#2a3350; font-weight:900; font-size:18px; min-width:56px; text-align:center; }
    .t10-o.sel { background:#f59e0b; color:#111; }
    .t10-o.off { opacity:.35; }
    .t10-said { display:flex; flex-wrap:wrap; gap:6px; }
    .pl.dead { opacity:.4; }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const hearts = (G, pid) => {
    const n = G.lives[pid] === undefined ? 0 : G.lives[pid];
    if (n <= 0) return '💀';
    return '❤️'.repeat(n) + `<span style="opacity:.2">${'🖤'.repeat(Math.max(0, (G.maxLives || 4) - n))}</span>`;
  };

  ARCADE.register('top10', {
    phone: {
      key(c) {
        const G = c.G; if (!G || !c.you) return '';
        const d = G.doubt ? `${G.doubt.by}:${G.doubt.target}:${Object.keys(G.doubt.votes).length}` : '';
        return [G.phase, G.round, G.cur, G.saidCount, G.last || '', d, G.result ? 1 : 0, G.winner || '',
          G.order.map(p => G.lives[p] || 0).join(''),
          G.phase === 'setup' ? JSON.stringify(G.cfg) : ''].join('|');
      },

      html(c) {
        ensure();
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G || !c.you) return '';
        const me = c.you.pid, mine = G.mine || {};
        const ply = pid => c.C.players.find(p => p.pid === pid) || null;

        // ---------- regras ----------
        if (G.phase === 'setup') {
          const cfg = G.cfg;
          const opt = (a, vals, cur, fmt) => `<div class="t10-opt">${vals.map(v => `<div class="t10-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          return `<div class="box center"><h2 style="font-size:26px">⚙️ Regras do Top 10</h2><p class="sub mut" style="margin-top:6px">Qualquer um pode mudar. Vale para todos.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Vidas de cada um</p>${opt('cfgLives', G.livesOpts, cfg.lives, v => '❤️'.repeat(v))}</div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Tempo para responder</p>${opt('cfgTime', G.turnSecs, cfg.turnSec, v => v ? v + 's' : 'sem tempo')}
              <p class="sub mut" style="margin-top:8px;font-size:15px">Sem responder a tempo, a carta revela e você perde uma vida.</p></div>
            <div class="box"><p class="sub" style="margin-bottom:8px">Temas das cartas <span class="mut">(${cfg.cats.length})</span></p>
              <div class="t10-opt">${G.cats.map(k => `<div class="t10-o ${cfg.cats.includes(k.id) ? 'sel' : 'off'}" data-a="cfgCat" data-id="${k.id}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:12px">↺ Regras padrão</button></div>
            <button class="btn big ok" data-a="begin" ${c.C.players.length >= 2 ? '' : 'disabled'}>▶ Começar</button>
            ${c.C.players.length >= 2 ? '' : '<p class="sub center mut">Precisa de pelo menos 2 jogadores.</p>'}
            ${c.C.players.length === 2 ? '<p class="sub center mut">Em dupla não sobra júri: no DUVIDO os dois votam, e se discordarem a resposta vale.</p>' : ''}
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- fim de jogo ----------
        if (G.phase === 'end') {
          const w = ply(G.winner);
          return `<div class="box center"><div class="big-emoji">🏆</div>
              <h2 style="font-size:28px;margin-top:8px">${w ? `${nm(w)} venceu!` : 'Fim de jogo.'}</h2>
              <p class="sub mut" style="margin-top:6px">${w && w.pid === me ? 'Você aguentou até o fim! 🎉' : 'Boa partida.'}</p></div>
            ${lista(c, G)}
            <div class="box">${c.playersHtml({ info: p => (p.pid === G.winner ? '🏆' : '💀') })}</div>
            <button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
        }

        // ---------- cabeçalho da carta (vale para play, reveal e result) ----------
        let h = `<div class="box"><span class="t10-cat">${G.card ? G.card.catEmoji + ' ' + esc(G.card.catName) : ''}</span>
          <div class="t10-title">${G.card ? esc(G.card.t) : ''}</div>
          ${G.card && G.card.src ? `<p class="t10-src">fonte: ${esc(G.card.src)}</p>` : ''}
          ${G.phase === 'play' ? '<div class="t10-locked">🔒 a lista está escondida de todo mundo</div>' : ''}</div>`;

        // ---------- votação depois do DUVIDO ----------
        if (G.phase === 'reveal') {
          const by = ply(G.doubt.by), alvo = ply(G.doubt.target);
          h += `<div class="box center" style="border-color:#f59e0b">
              <div style="font-size:26px;font-weight:900">🚨 Duvidou!</div>
              <p class="sub" style="margin-top:8px">${by ? nm(by) : ''} duvidou da resposta de ${alvo ? nm(alvo) : ''}</p></div>
            <div class="t10-t" id="t10-t">–</div>
            ${lista(c, G)}`;
          if (mine.canVote) {
            const v = mine.myVote, duelo = G.doubt.voters.length === 2 && G.doubt.voters.includes(G.doubt.target);
            const pergunta = duelo && me === G.doubt.target ? 'A sua resposta está nessa lista?' : `A resposta de ${alvo ? nm(alvo) : 'quem falou'} está nessa lista?`;
            h += v === null
              ? `<div class="box center"><p class="sub" style="font-size:19px">${pergunta}</p></div>
                 <div class="row"><button class="btn big ok" data-a="sim">✅ Valia</button><button class="btn big no" data-a="nao">❌ Não valia</button></div>`
              : `<div class="box center"><p class="sub">Você votou <b>${v ? '✅ Valia' : '❌ Não valia'}</b>. Esperando ${duelo ? 'o outro' : 'os outros'}… (${Object.keys(G.doubt.votes).length}/${G.doubt.voters.length})</p></div>`;
            h += duelo
              ? '<p class="sub center mut">Em dupla os dois votam, com a lista à vista. Se discordarem, vale — quem duvida é que tem de provar.</p>'
              : '<p class="sub center mut">Empate conta como "valia". Quem não votar é ignorado.</p>';
          } else {
            h += `<div class="box center"><p class="sub">${me === G.doubt.target ? 'Duvidaram de você!' : 'Você duvidou!'} A turma está julgando…</p>
              <p class="sub mut" style="margin-top:6px">${Object.keys(G.doubt.votes).length} de ${G.doubt.voters.length} já votaram</p></div>`;
          }
          return h + placar(c, G);
        }

        // ---------- resultado da carta ----------
        if (G.phase === 'result') {
          const R = G.result, alvo = ply(R.target), by = ply(R.by), loser = ply(R.loser);
          h += R.timeout
            ? `<div class="t10-verdict no">⏰ Tempo esgotado!<br><span style="font-size:18px;font-weight:700">${alvo ? esc(alvo.name) : 'Ninguém'} não respondeu a tempo.</span></div>`
            : R.valid
              ? `<div class="t10-verdict ok">✅ Valia!<br><span style="font-size:18px;font-weight:700">A resposta de ${alvo ? esc(alvo.name) : ''} estava na lista. ${by ? esc(by.name) : ''} duvidou à toa.</span></div>`
              : `<div class="t10-verdict no">❌ Não valia!<br><span style="font-size:18px;font-weight:700">${alvo ? esc(alvo.name) : ''} chutou e ${by ? esc(by.name) : ''} pegou.</span></div>`;
          h += `<div class="box center"><p class="sub" style="font-size:20px">${loser ? nm(loser) : ''} perdeu uma vida</p>
              <div class="t10-hp" style="margin-top:6px">${loser ? hearts(G, loser.pid) : ''}</div>
              ${R.timeout || !R.by ? '' : `<p class="sub mut" style="margin-top:8px">votação: ${R.sim} valia · ${R.nao} não valia</p>`}</div>
            ${lista(c, G)}
            <button class="btn big warn" data-a="next">➡️ Próxima carta</button>`;
          return h + placar(c, G);
        }

        // ---------- rodando ----------
        const curP = ply(G.cur), lastP = ply(G.last);
        h += `<div class="box center t10-count"><b>${G.saidCount}</b><span>${G.saidCount === 1 ? 'resposta já dita' : 'respostas já ditas'}${G.saidCount >= 10 ? ' <b class="t10-over" style="font-size:16px">· passou de 10!</b>' : ''}</span></div>`;
        if (G.turnSec) h += `<div class="t10-t" id="t10-t">–</div>`;

        if (mine.myTurn) {
          h += `<div class="box center" style="border-color:#22c55e"><div style="font-size:24px;font-weight:900">🗣️ É a sua vez!</div>
              <p class="sub mut" style="margin-top:6px">Fale em voz alta um item que você acha que está nesse Top 10 — e aperte FALEI.</p></div>
            <button class="btn big ok" data-a="falei" style="font-size:26px;padding:26px">✅ FALEI</button>`;
        } else if (!mine.alive) {
          h += `<div class="box center"><div class="big-emoji">💀</div><h2 style="font-size:24px;margin-top:8px">Você está fora</h2>
            <p class="sub mut" style="margin-top:6px">Continue de olho: você ainda vota nas duvidadas.</p></div>`;
        } else if (!mine.inGame) {
          h += `<div class="box center"><div class="big-emoji">👀</div><h2 style="font-size:24px;margin-top:8px">Você entrou depois</h2>
            <p class="sub mut" style="margin-top:6px">Assista esta partida — na próxima você joga. Pode votar nas duvidadas.</p></div>`;
        } else {
          h += `<div class="box center"><p class="sub">Vez de</p><div style="margin-top:8px">${curP ? nm(curP) : '—'}</div>
            <p class="sub mut" style="margin-top:10px">Escute a resposta. Achou furada? Duvide.</p></div>`;
        }

        if (mine.canDoubt) h += `<button class="btn big no" data-a="duvido" style="font-size:22px;padding:22px">🚨 DUVIDO de ${esc(lastP ? lastP.name : '')}</button>`;
        else if (G.last && G.last === me) h += `<p class="sub center mut">Sua resposta está na mesa: alguém pode duvidar dela.</p>`;
        else if (!G.last) h += `<p class="sub center mut">Primeira resposta da carta: ainda não dá para duvidar de ninguém.</p>`;

        if (G.said.length) {
          h += `<div class="box"><p class="sub mut" style="margin-bottom:8px">Quem já respondeu nesta carta</p>
            <div class="t10-said">${G.said.map((pid, i) => { const p = ply(pid); return p ? `<span class="nm" style="${c.nmStyle(p)}">${i + 1}. ${esc(p.name)}</span>` : ''; }).join('')}</div></div>`;
        }
        return h + placar(c, G);
      },

      after(c) {
        const G = c.G; if (!G || !c.you) return;
        const f = G.fx;
        if (f && f.id !== lastFx) {
          const first = lastFx === 0;
          lastFx = f.id;
          if (!first) {
            if (f.k === 'said') c.beep(760, .07, 'square', .13);
            else if (f.k === 'newcard') { c.chord([523, 659, 784]); c.turnover(`<div class="round">carta ${f.round}</div><div class="who2" style="background:#f59e0b;color:#111">${c.esc(G.card ? G.card.t : '')}</div>`, 2200, 40); }
            else if (f.k === 'doubt') { c.chord([880, 660, 440]); c.turnover('<div class="round">🚨 duvidou!</div><div class="mine">a lista vai ser revelada</div>', 1600, [120, 60, 120]); }
            else if (f.k === 'result') c.chord(f.valid ? [523, 659, 784] : [392, 294, 196]);
            else if (f.k === 'life' && f.pid === c.you.pid) { c.beep(160, .35, 'sawtooth', .25); c.turnover('<div class="round">💔 você perdeu uma vida</div>', 1400, [120, 60, 120]); }
            else if (f.k === 'out' && f.pid === c.you.pid) { c.chord([392, 294, 196]); c.turnover('<div class="round">💀 você foi eliminado</div><div class="mine" style="color:#ef4444">Agora é só assistir (e votar)</div>', 2400, [200, 80, 200]); }
            else if (f.k === 'win' && f.pid === c.you.pid) c.chord([523, 659, 784, 1046, 1318]);
          }
        }
        // aviso de tela cheia quando a vez vira minha
        const tag = `${G.round}:${G.saidCount}:${G.cur}`;
        if (G.phase === 'play' && G.cur === c.you.pid && turnTag !== tag) {
          turnTag = tag;
          c.turnover(`<div class="round">${c.esc(G.card ? G.card.t : '')}</div><div class="mine">🗣️ É a sua vez!</div><small>${G.saidCount} já foram ditas</small>`, 1200, [90, 60, 90]);
          c.beep(1046, .12, 'triangle', .2);
        } else if (G.cur !== c.you.pid) turnTag = tag;
        tick(c);
      },

      act(a, el, c) {
        const send = ARCADE.send, cfg = c && c.G ? c.G.cfg : null;
        switch (a) {
          case 'cfgLives': return send({ t: 'config', cfg: { lives: Number(el.dataset.v) } });
          case 'cfgTime': return send({ t: 'config', cfg: { turnSec: Number(el.dataset.v) } });
          case 'cfgCat': {
            const id = el.dataset.id;
            const list = cfg.cats.includes(id) ? cfg.cats.filter(x => x !== id) : [...cfg.cats, id];
            if (!list.length) return ARCADE.toast('Deixe pelo menos um tema.');
            return send({ t: 'config', cfg: { cats: list } });
          }
          case 'cfgReset': if (confirm('Voltar às regras padrão?')) send({ t: 'config', cfg: { reset: true } }); return;
          case 'begin': return send({ t: 'begin' });
          case 'falei': { ARCADE.beep(880, .09, 'square', .18); return send({ t: 'said' }); }
          case 'duvido': return confirm('Duvidar da última resposta? Se ela valia, você perde uma vida.') && send({ t: 'doubt' });
          case 'sim': return send({ t: 'vote', ok: true });
          case 'nao': return send({ t: 'vote', ok: false });
          case 'next': return send({ t: 'next' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });

  // a lista revelada (numerada, do 1º ao 10º)
  function lista(c, G) {
    if (!G.card || !G.card.items) return '';
    return `<div class="box"><p class="sub mut" style="margin-bottom:8px">A lista era esta 👇</p>
      <div class="t10-list">${G.card.items.map((it, i) => `<div class="t10-it ${i < 3 ? 'top' : ''}"><i>${i + 1}º</i>${c.esc(it)}</div>`).join('')}</div></div>`;
  }
  function placar(c, G) {
    return `<div class="box"><p class="sub mut" style="margin-bottom:8px">Ordem e vidas</p>${c.playersHtml({
      cls: p => ((G.lives[p.pid] || 0) <= 0 && G.order.includes(p.pid) ? 'dead' : ''),
      border: p => (p.pid === G.cur ? '#f59e0b' : 'transparent'),
      info: p => (G.order.includes(p.pid) ? hearts(G, p.pid) : '👀'),
    })}</div>
    <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
  }
  // relógio grande do celular: conta sozinho e tica nos últimos segundos da sua vez
  function tick(c) {
    const el = document.getElementById('t10-t'); if (!el || !c.G) return;
    const r = c.remaining();
    if (r === null) { el.textContent = '–'; el.classList.remove('low'); return; }
    const n = Math.ceil(r);
    el.textContent = String(n);
    el.classList.toggle('low', r <= 5.05);
    const meu = c.G.phase === 'play' && c.you && c.G.cur === c.you.pid;
    if (meu && r > 0 && r <= 3.05 && n !== lastTick) { lastTick = n; c.beep(1046, .06, 'square', .14); }
    if (r > 3.2) lastTick = -1;
  }
  // o relógio precisa andar mesmo sem estado novo do servidor
  setInterval(() => {
    const c = ARCADE.ctx();
    if (c && c.C && c.C.gameId === 'top10' && c.G) tick(c);
  }, 300);
})();
