// Top 10 — tela do celular. O celular é a mesa: título da carta, botão FALEI, botão DUVIDO,
// a lista revelada e a votação. Tudo funciona igual quando não tem TV na sala.
// No modo mediador (um celular só) esta mesma tela conduz a mesa inteira: os nomes são
// digitados aqui, o FALEI é tocado pelo jogador da vez e o ✅/❌ sai daqui também.
'use strict';
(() => {
  let styled = false, lastFx = 0, turnTag = '', lastTick = -1, pickDoubt = false;
  // Visual "fliperama de papel" (shared/ui.css). Cor da festa: #ff7ab8, texto sempre em tinta.
  const style = `
    .t10-hero { background:#ff7ab8; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:16px; background-image:radial-gradient(rgba(15,15,20,.16) 1.2px, transparent 1.3px); background-size:9px 9px; }
    .t10-hero h2 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:.95; margin-top:12px; }
    .t10-hero p { font-size:15px; font-weight:600; line-height:1.35; margin-top:8px; }
    .t10-cat { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; padding:5px 9px; text-transform:uppercase; }
    .t10-title { font-size:27px; font-weight:900; font-stretch:112%; line-height:1.12; margin-top:12px; }
    .t10-src { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-top:8px; }
    .t10-locked { margin-top:12px; padding:8px 10px; background:#0f0f14; color:#ffce1f; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; text-align:center; }
    .t10-lbl { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#55555e; margin-bottom:10px; }
    .t10-lbl .mut { letter-spacing:.02em; text-transform:none; font-family:'Archivo',sans-serif; font-weight:600; font-size:13px; }
    .t10-count { display:flex; align-items:center; justify-content:center; gap:14px; }
    .t10-count b { font-family:'Pixelify Sans',monospace; font-size:56px; font-weight:700; line-height:1; }
    .t10-count span { font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; text-align:left; }
    .t10-over { display:inline-block; margin-top:4px; background:#f0443a; color:#0f0f14; border:2px solid #0f0f14; padding:1px 5px; }
    .t10-t { font-family:'Pixelify Sans',monospace; font-size:72px; font-weight:700; line-height:1; text-align:center; background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; padding:10px 0 4px; }
    .t10-t.low { background:#f0443a; animation:pulse .5s infinite alternate; }
    .t10-list { display:flex; flex-direction:column; gap:6px; }
    .t10-it { display:flex; align-items:center; gap:12px; padding:9px 12px; background:#fff; border:3px solid #0f0f14; font-size:18px; font-weight:800; }
    .t10-it i { font-style:normal; font-family:'Pixelify Sans',monospace; font-weight:700; min-width:30px; font-size:20px; }
    .t10-it.top { background:#ffce1f; }
    .t10-verdict { text-align:center; padding:18px 12px; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; }
    .t10-verdict b { display:block; font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:30px; line-height:1; }
    .t10-verdict span { display:block; font-size:16px; font-weight:700; line-height:1.35; margin-top:8px; }
    .t10-verdict.ok { background:#35d07f; }
    .t10-verdict.no { background:#f0443a; }
    .t10-hp { font-size:20px; letter-spacing:2px; white-space:nowrap; }
    .t10-h { color:#f0443a; -webkit-text-stroke:1px #0f0f14; }
    .t10-h.off { color:#e4e2d9; }
    .t10-out { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.06em; padding:3px 6px; }
    .t10-opt { display:flex; flex-wrap:wrap; gap:8px; }
    .t10-o { padding:11px 14px; background:#fff; border:3px solid #0f0f14; font-weight:900; font-size:17px; min-width:52px; text-align:center; cursor:pointer; }
    .t10-o.sel { background:#ffce1f; box-shadow:3px 3px 0 #0f0f14; }
    .t10-o.off { background:#e4e2d9; color:#55555e; border-style:dashed; }
    .t10-said { display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-family:'Pixelify Sans',monospace; font-weight:700; }
    .t10-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#fff; border:3px solid #0f0f14; }
    .t10-row b { flex:1; font-size:18px; }
    .t10-row.t10-now { background:#ffce1f; }
    .t10-row.dead { background:#e4e2d9; }
    .t10-mode { display:flex; gap:10px; }
    .t10-mode > div { flex:1; padding:14px 10px; background:#fff; border:3px solid #0f0f14; font-weight:900; font-stretch:112%; text-transform:uppercase; font-size:16px; text-align:center; line-height:1.15; cursor:pointer; }
    .t10-mode > div.sel { background:#ffce1f; box-shadow:4px 4px 0 #0f0f14; }
    .t10-mode small { display:block; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.02em; text-transform:none; margin-top:6px; }
    .t10-chip { display:inline-flex; align-items:center; gap:10px; padding:6px 6px 6px 10px; background:#fff; font-weight:800; font-size:17px; border:3px solid #0f0f14; }
    .t10-chip i { font-style:normal; width:14px; height:14px; border:2px solid #0f0f14; }
    .t10-chip b { color:#0f0f14; background:#f0443a; border:2px solid #0f0f14; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; }
    .t10-add { display:flex; flex-direction:column; gap:10px; }
    .t10-add input { width:100%; min-width:0; }
    .t10-pick { display:flex; flex-direction:column; gap:10px; }
    .t10-pick .btn { display:flex; align-items:center; gap:12px; justify-content:flex-start; text-align:left; padding:12px 14px; }
    .t10-pick .btn small { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.04em; border:2px solid #0f0f14; padding:3px 5px; }
    .t10-turn { text-align:center; }
    .t10-turn.mine { background:#35d07f; }
    .t10-turn.alert { background:#ffce1f; }
    .t10-turn h3 { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:26px; line-height:1; }
    .t10-turn p { font-size:15px; font-weight:600; line-height:1.35; margin-top:8px; }
    .t10-turn .k { display:inline-block; background:#0f0f14; color:#f1f0ea; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.08em; padding:4px 8px; text-transform:uppercase; margin-bottom:10px; }
    .t10-ev { text-align:center; font-weight:700; font-size:16px; line-height:1.4; }
    .pl.dead { opacity:.4; }
  `;
  const ensure = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const hearts = (G, pid) => {
    const r = quem(G, pid);
    const n = r ? r.lives : 0;
    if (n <= 0) return '<span class="t10-out">FORA</span>';
    return `<span class="t10-h">${'♥'.repeat(n)}</span><span class="t10-h off">${'♥'.repeat(Math.max(0, (G.maxLives || 4) - n))}</span>`;
  };
  // a mesa vem pronta do servidor: vale para nome digitado e para celular conectado
  const quem = (G, pid) => (G.roster || []).find(r => r.pid === pid) || null;
  const cracha = (c, r) => r ? `<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle">${c.avatar(r, 26)}<span class="nm" style="${c.nmStyle({ color: r.color })}">${c.esc(r.name)}</span></span>` : '';
  const nomeDe = (c, G, pid) => cracha(c, quem(G, pid));
  const pix = n => `<span class="pix">${n}</span>`;

  ARCADE.register('top10', {
    phone: {
      key(c) {
        const G = c.G; if (!G || !c.you) return '';
        const d = G.doubt ? `${G.doubt.by}:${G.doubt.target}:${Object.keys(G.doubt.votes).length}` : '';
        return [G.phase, G.round, G.cur, G.saidCount, G.last || '', d, G.result ? 1 : 0, G.winner || '',
          (G.roster || []).map(r => r.pid + r.lives).join(''),
          pickDoubt ? 1 : 0,
          G.phase === 'setup' ? JSON.stringify(G.cfg) + ':' + c.C.players.length : ''].join('|');
      },

      html(c) {
        ensure();
        const G = c.G, esc = c.esc;
        if (!G || !c.you) return '';
        const me = c.you.pid, mine = G.mine || {};
        const solo = !!G.solo;

        // ---------- regras ----------
        if (G.phase === 'setup') {
          const cfg = G.cfg, nomes = cfg.names || [];
          const opt = (a, vals, cur, fmt) => `<div class="t10-opt">${vals.map(v => `<div class="t10-o ${v === cur ? 'sel' : ''}" data-a="${a}" data-v="${v}">${fmt ? fmt(v) : v}</div>`).join('')}</div>`;
          const cores = (c.meta.colors || []);
          const podeSolo = nomes.length >= 2, podeCel = c.C.players.length >= 2;
          const pode = cfg.solo ? podeSolo : podeCel;
          return `<div class="t10-hero"><span class="t10-cat">Regras</span><h2>Top 10</h2><p>Qualquer um pode mudar. Vale para todos.</p></div>
            <div class="box"><p class="t10-lbl">Como vocês vão jogar</p>
              <div class="t10-mode">
                <div class="${cfg.solo ? '' : 'sel'}" data-a="cfgSolo" data-v="0">Um celular<br>por pessoa<small>cada um aperta o seu</small></div>
                <div class="${cfg.solo ? 'sel' : ''}" data-a="cfgSolo" data-v="1">Modo<br>mediador<small>um celular só conduz</small></div>
              </div></div>
            ${cfg.solo ? `<div class="box"><p class="t10-lbl">Quem está na mesa <span class="mut">(${nomes.length} de ${G.maxNames})</span></p>
              ${nomes.length ? `<div class="t10-opt" style="margin-bottom:12px">${nomes.map((n, i) => {
                const hex = cores.length ? c.ci(cores[i % cores.length].key).hex : '#888';
                return `<span class="t10-chip"><i style="background:${hex}"></i>${esc(n)}<b data-a="tiraNome" data-n="${esc(n)}">✕</b></span>`;
              }).join('')}</div>` : '<p class="sub mut" style="margin-bottom:10px">Digite o nome de cada pessoa da mesa, na ordem em que vão jogar.</p>'}
              ${nomes.length < G.maxNames ? `<div class="t10-add"><input id="t10-nome" placeholder="Nome (ex.: Pedro)" maxlength="20" autocomplete="off" autocapitalize="words" enterkeyhint="done">
                <button class="btn ok" data-a="poeNome">+ Adicionar à mesa</button></div>` : '<p class="sub mut">A mesa está cheia.</p>'}
              <p class="sub mut" style="margin-top:10px;font-size:15px">Você toca tudo: FALEI por quem respondeu, DUVIDO dizendo quem duvidou, e VALIA/NÃO VALIA no fim. Pode se incluir na lista e jogar também — ninguém vê a lista antes da revelação.</p></div>`
            : ''}
            <div class="box"><p class="t10-lbl">Vidas de cada um</p>${opt('cfgLives', G.livesOpts, cfg.lives, v => `<span class="t10-h">${'♥'.repeat(v)}</span>`)}</div>
            <div class="box"><p class="t10-lbl">Tempo para responder</p>${opt('cfgTime', G.turnSecs, cfg.turnSec, v => v ? pix(v + 's') : 'sem tempo')}
              <p class="sub mut" style="margin-top:10px;font-size:15px">Sem responder a tempo, a carta revela e quem estava na vez perde uma vida.</p></div>
            <div class="box"><p class="t10-lbl">Temas das cartas <span class="mut">(${cfg.cats.length})</span></p>
              <div class="t10-opt">${G.cats.map(k => `<div class="t10-o ${cfg.cats.includes(k.id) ? 'sel' : 'off'}" data-a="cfgCat" data-id="${k.id}">${k.emoji} ${esc(k.name)}</div>`).join('')}</div>
              <button class="btn ghost" data-a="cfgReset" style="margin-top:12px">↺ Regras padrão</button></div>
            <button class="btn big ok" data-a="begin" ${pode ? '' : 'disabled'}>Começar</button>
            ${pode ? '' : `<p class="sub center mut">${cfg.solo ? 'Coloque pelo menos 2 nomes na mesa.' : 'Precisa de pelo menos 2 celulares na sala — ou use o modo mediador.'}</p>`}
            ${!cfg.solo && c.C.players.length === 2 ? '<p class="sub center mut">Em dupla não sobra júri: no DUVIDO os dois votam, e se discordarem a resposta vale.</p>' : ''}
            <p class="t10-ev">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- fim de jogo ----------
        if (G.phase === 'end') {
          const w = quem(G, G.winner);
          return `<div class="box t10-turn alert"><span class="k">Fim de jogo</span>
              <h3>${w ? `${esc(w.name)} venceu!` : 'Fim de jogo.'}</h3>
              <p>${w && w.pid === me ? 'Você aguentou até o fim!' : 'Boa partida.'}</p></div>
            ${lista(c, G)}${mesa(c, G)}
            <button class="btn big ok" data-a="again">Jogar de novo</button>`;
        }

        // ---------- cabeçalho da carta (vale para play, reveal e result) ----------
        let h = `<div class="t10-hero"><span class="t10-cat">${G.card ? G.card.catEmoji + ' ' + esc(G.card.catName) : ''} · carta ${pix(G.round)}</span>
          <div class="t10-title">${G.card ? esc(G.card.t) : ''}</div>
          ${G.card && G.card.src ? `<p class="t10-src">fonte: ${esc(G.card.src)}</p>` : ''}
          ${G.phase === 'play' ? '<div class="t10-locked">A lista está escondida de todo mundo</div>' : ''}</div>`;

        // ---------- depois do DUVIDO ----------
        if (G.phase === 'reveal') {
          const by = quem(G, G.doubt.by), alvo = quem(G, G.doubt.target);
          h += `<div class="box t10-turn alert"><span class="k">Duvidou!</span>
              <p style="margin-top:0">${cracha(c, by)} duvidou da resposta de ${cracha(c, alvo)}</p></div>
            ${solo ? '' : '<div class="t10-t" id="t10-t">–</div>'}
            ${lista(c, G)}`;
          if (mine.canJudge) {                              // modo mediador: quem decide é este celular
            h += `<div class="box center"><p class="sub" style="font-size:19px;font-weight:800">A resposta de ${cracha(c, alvo)} está nessa lista?</p>
                <p class="sub mut" style="margin-top:6px">Quem errar perde uma vida: ${alvo ? esc(alvo.name) : ''} se não estava, ${by ? esc(by.name) : ''} se estava.</p></div>
              <div class="row"><button class="btn big ok" data-a="valia">Valia</button><button class="btn big no" data-a="naovalia">Não valia</button></div>`;
          } else if (mine.canVote) {
            const v = mine.myVote, duelo = G.doubt.voters.length === 2 && G.doubt.voters.includes(G.doubt.target);
            const pergunta = duelo && me === G.doubt.target ? 'A sua resposta está nessa lista?' : `A resposta de ${cracha(c, alvo)} está nessa lista?`;
            h += v === null
              ? `<div class="box center"><p class="sub" style="font-size:19px;font-weight:800">${pergunta}</p></div>
                 <div class="row"><button class="btn big ok" data-a="sim">Valia</button><button class="btn big no" data-a="nao">Não valia</button></div>`
              : `<div class="box center"><p class="sub">Você votou <b>${v ? 'VALIA' : 'NÃO VALIA'}</b>. Esperando ${duelo ? 'o outro' : 'os outros'}… ${pix(Object.keys(G.doubt.votes).length + '/' + G.doubt.voters.length)}</p></div>`;
            h += duelo
              ? '<p class="sub center mut">Em dupla os dois votam, com a lista à vista. Se discordarem, vale — quem duvida é que tem de provar.</p>'
              : '<p class="sub center mut">Empate conta como "valia". Quem não votar é ignorado.</p>';
          } else {
            h += `<div class="box center"><p class="sub" style="font-weight:800">${me === G.doubt.target ? 'Duvidaram de você!' : 'Você duvidou!'} A turma está julgando…</p>
              <p class="sub mut" style="margin-top:6px">${pix(Object.keys(G.doubt.votes).length)} de ${pix(G.doubt.voters.length)} já votaram</p></div>`;
          }
          return h + mesa(c, G);
        }

        // ---------- resultado da carta ----------
        if (G.phase === 'result') {
          const R = G.result, alvo = quem(G, R.target), by = quem(G, R.by), loser = quem(G, R.loser);
          h += R.timeout
            ? `<div class="t10-verdict no"><b>Tempo esgotado!</b><span>${alvo ? esc(alvo.name) : 'Ninguém'} não respondeu a tempo.</span></div>`
            : R.valid
              ? `<div class="t10-verdict ok"><b>Valia!</b><span>A resposta de ${alvo ? esc(alvo.name) : ''} estava na lista. ${by ? esc(by.name) : ''} duvidou à toa.</span></div>`
              : `<div class="t10-verdict no"><b>Não valia!</b><span>${alvo ? esc(alvo.name) : ''} chutou e ${by ? esc(by.name) : ''} pegou.</span></div>`;
          h += `<div class="box center"><p class="sub" style="font-size:19px;font-weight:800">${cracha(c, loser)} perdeu uma vida</p>
              <div class="t10-hp" style="margin-top:8px">${loser ? hearts(G, loser.pid) : ''}</div>
              ${R.timeout || !R.by || solo ? '' : `<p class="t10-lbl" style="margin:10px 0 0">votação: ${pix(R.sim)} valia · ${pix(R.nao)} não valia</p>`}</div>
            ${lista(c, G)}
            <button class="btn big warn" data-a="next">Próxima carta →</button>`;
          return h + mesa(c, G);
        }

        // ---------- rodando ----------
        const curR = quem(G, G.cur), lastR = quem(G, G.last);
        h += `<div class="box t10-count"><b>${G.saidCount}</b><span>${G.saidCount === 1 ? 'resposta<br>já dita' : 'respostas<br>já ditas'}${G.saidCount >= 10 ? '<br><span class="t10-over">passou de 10!</span>' : ''}</span></div>`;
        if (G.turnSec) h += `<div class="t10-t" id="t10-t">–</div>`;

        if (solo) {                                         // um celular só: esta tela conduz a mesa
          if (pickDoubt) {
            const alvos = (G.roster || []).filter(r => r.lives > 0 && r.pid !== G.last);
            h += `<div class="box t10-turn" style="background:#f0443a"><h3>Quem duvidou?</h3>
                <p>de ${cracha(c, lastR)} · quem duvidar à toa perde uma vida</p></div>
              <div class="t10-pick">${alvos.map(r => `<button class="btn" data-a="duvidoQuem" data-pid="${r.pid}">
                ${c.avatar(r, 28)}${esc(r.name)}${r.pid === G.cur ? ' <small>ERA A VEZ</small>' : ''}</button>`).join('')}</div>
              <button class="btn ghost" data-a="duvidoCancela">← Deixa pra lá</button>`;
            return h + mesa(c, G);
          }
          h += `<div class="box t10-turn mine"><span class="k">Modo mediador · você toca por todo mundo</span>
              <div style="font-size:24px;font-weight:900">${cracha(c, curR)}</div>
              <p>fala um item do Top 10 em voz alta</p></div>
            <button class="btn big ok" data-a="falei" style="font-size:28px;padding:26px">Falei</button>`;
          if (G.last) h += `<button class="btn big no" data-a="duvidoAbrir" style="font-size:21px;padding:20px">Duvidaram de ${esc(lastR ? lastR.name : '')}</button>`;
          else h += '<p class="sub center mut">Primeira resposta da carta: ainda não dá para duvidar de ninguém.</p>';
          h += '<button class="btn ghost" data-a="pular">Pular a carta (já jogamos essa)</button>';
        } else if (mine.myTurn) {
          h += `<div class="box t10-turn mine"><h3>É a sua vez!</h3>
              <p>Fale em voz alta um item que você acha que está nesse Top 10 — e aperte FALEI.</p></div>
            <button class="btn big ok" data-a="falei" style="font-size:28px;padding:26px">Falei</button>`;
        } else if (!mine.alive && mine.inGame) {
          h += `<div class="box t10-turn" style="background:#e4e2d9"><h3>Você está fora</h3>
            <p>Continue de olho: você ainda vota nas duvidadas.</p></div>`;
        } else if (!mine.inGame) {
          h += `<div class="box t10-turn"><h3>Você entrou depois</h3>
            <p>Assista esta partida — na próxima você joga. Pode votar nas duvidadas.</p></div>`;
        } else {
          h += `<div class="box t10-turn"><span class="k">Vez de</span><div>${cracha(c, curR)}</div>
            <p>Escute a resposta. Achou furada? Duvide.</p></div>`;
        }

        if (!solo) {
          if (mine.canDoubt) h += `<button class="btn big no" data-a="duvido" style="font-size:21px;padding:20px">Duvido de ${esc(lastR ? lastR.name : '')}</button>`;
          else if (G.last && G.last === me) h += '<p class="sub center mut">Sua resposta está na mesa: alguém pode duvidar dela.</p>';
          else if (!G.last) h += '<p class="sub center mut">Primeira resposta da carta: ainda não dá para duvidar de ninguém.</p>';
          h += '<button class="btn ghost" data-a="pular">Pular a carta (já jogamos essa)</button>';
        }

        if (G.said.length) {
          h += `<div class="box"><p class="t10-lbl">Quem já respondeu nesta carta</p>
            <div class="t10-said">${G.said.map((pid, i) => `${i + 1}. ${nomeDe(c, G, pid)}`).join(' ')}</div></div>`;
        }
        return h + mesa(c, G);
      },

      after(c) {
        const G = c.G; if (!G || !c.you) return;
        // caixa de nome no menu do modo mediador: foco e Enter
        const i = document.getElementById('t10-nome');
        if (i && !i._t10) { i._t10 = true; i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ARCADE.games.top10.phone.act('poeNome', null, c); } }); }
        const f = G.fx;
        if (f && f.id !== lastFx) {
          const first = lastFx === 0;
          lastFx = f.id;
          if (!first) {
            if (f.k === 'said') c.beep(760, .07, 'square', .13);
            else if (f.k === 'newcard') { c.chord([523, 659, 784]); c.turnover(`<div class="round">carta ${f.round}</div><div class="who2 sm" style="background:#ff7ab8;color:#0f0f14">${c.esc(G.card ? G.card.t : '')}</div>`, 2200, 40); }
            else if (f.k === 'doubt') { c.chord([880, 660, 440]); c.turnover('<div class="who2" style="background:#ffce1f">Duvido!</div><div class="mine" style="color:#0f0f14">a lista vai ser revelada</div>', 1600, [120, 60, 120]); }
            else if (f.k === 'result') c.chord(f.valid ? [523, 659, 784] : [392, 294, 196]);
            else if (f.k === 'life' && f.pid === c.you.pid) { c.beep(160, .35, 'sawtooth', .25); c.turnover('<div class="who2" style="background:#f0443a">−1 vida</div><div class="round">você perdeu uma vida</div>', 1400, [120, 60, 120]); }
            else if (f.k === 'out' && f.pid === c.you.pid) { c.chord([392, 294, 196]); c.turnover('<div class="who2" style="background:#0f0f14;color:#f1f0ea">Fora!</div><div class="round">você foi eliminado</div><div class="mine" style="color:#0f0f14">Agora é só assistir (e votar)</div>', 2400, [200, 80, 200]); }
            else if (f.k === 'win' && f.pid === c.you.pid) c.chord([523, 659, 784, 1046, 1318]);
          }
        }
        // aviso de tela cheia quando a vez vira minha (só faz sentido com um celular por pessoa)
        const tag = `${G.round}:${G.saidCount}:${G.cur}`;
        if (!G.solo && G.phase === 'play' && G.cur === c.you.pid && turnTag !== tag) {
          turnTag = tag;
          c.turnover(`<div class="round">${c.esc(G.card ? G.card.t : '')}</div><div class="who2" style="background:#35d07f">Sua vez!</div><small>${G.saidCount} já foram ditas</small>`, 1200, [90, 60, 90]);
          c.beep(1046, .12, 'triangle', .2);
        } else if (G.cur !== c.you.pid) turnTag = tag;
        tick(c);
      },

      act(a, el, c) {
        const send = ARCADE.send, cfg = c && c.G ? c.G.cfg : null;
        switch (a) {
          case 'cfgLives': return send({ t: 'config', cfg: { lives: Number(el.dataset.v) } });
          case 'cfgTime': return send({ t: 'config', cfg: { turnSec: Number(el.dataset.v) } });
          case 'cfgSolo': return send({ t: 'config', cfg: { solo: el.dataset.v === '1' } });
          case 'poeNome': {
            const i = document.getElementById('t10-nome');
            const v = i && i.value.trim();
            if (!v) return;
            const nomes = (cfg.names || []).slice();
            if (nomes.some(n => n.toLowerCase() === v.toLowerCase())) { i.value = ''; return ARCADE.toast('Esse nome já está na mesa.'); }
            if (nomes.length >= c.G.maxNames) return ARCADE.toast('A mesa está cheia.');
            nomes.push(v); i.value = '';
            return send({ t: 'config', cfg: { names: nomes } });
          }
          case 'tiraNome': return send({ t: 'config', cfg: { names: (cfg.names || []).filter(n => n !== el.dataset.n) } });
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
          case 'pular': return confirm('Trocar esta carta por outra? Ninguém perde vida e a vez continua na mesma pessoa.') && send({ t: 'skip' });
          case 'duvidoAbrir': pickDoubt = true; return ARCADE.redraw();
          case 'duvidoCancela': pickDoubt = false; return ARCADE.redraw();
          case 'duvidoQuem': pickDoubt = false; return send({ t: 'doubt', by: el.dataset.pid });
          case 'sim': return send({ t: 'vote', ok: true });
          case 'nao': return send({ t: 'vote', ok: false });
          case 'valia': return send({ t: 'judge', ok: true });
          case 'naovalia': return send({ t: 'judge', ok: false });
          case 'next': return send({ t: 'next' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });

  // a lista revelada (numerada, do 1º ao 10º)
  function lista(c, G) {
    if (!G.card || !G.card.items) return '';
    return `<div class="box"><p class="t10-lbl">A lista era esta</p>
      <div class="t10-list">${G.card.items.map((it, i) => `<div class="t10-it ${i < 3 ? 'top' : ''}"><i>${i + 1}º</i>${c.esc(it)}</div>`).join('')}</div></div>`;
  }
  // a mesa: ordem, vidas e de quem é a vez (nomes digitados ou celulares, dá no mesmo)
  function mesa(c, G) {
    const rs = G.roster || [];
    return `<div class="box"><p class="t10-lbl">Ordem e vidas</p>
      <div class="t10-list">${rs.map(r => `<div class="t10-row ${r.pid === G.cur ? 't10-now' : ''} ${r.lives <= 0 ? 'dead' : ''}">
        ${c.avatar(r, 30)}<b><span class="nm" style="${c.nmStyle({ color: r.color })}">${c.esc(r.name)}</span>${r.on === false ? ' 📵' : ''}</b>
        <span class="t10-hp">${hearts(G, r.pid)}</span></div>`).join('')}</div></div>
      <p class="t10-ev">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
  }
  // relógio grande do celular: conta sozinho e tica nos últimos segundos da sua vez
  function tick(c) {
    const el = document.getElementById('t10-t'); if (!el || !c.G) return;
    const r = c.remaining();
    if (r === null) { el.textContent = '–'; el.classList.remove('low'); return; }
    const n = Math.ceil(r);
    el.textContent = String(n);
    el.classList.toggle('low', r <= 5.05);
    const meu = c.G.phase === 'play' && (c.G.solo || (c.you && c.G.cur === c.you.pid));
    if (meu && r > 0 && r <= 3.05 && n !== lastTick) { lastTick = n; c.beep(1046, .06, 'square', .14); }
    if (r > 3.2) lastTick = -1;
  }
  // o relógio precisa andar mesmo sem estado novo do servidor
  setInterval(() => {
    const c = ARCADE.ctx();
    if (c && c.C && c.C.gameId === 'top10' && c.G) tick(c);
  }, 300);
})();
