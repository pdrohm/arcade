// Imagem e Ação — tela do celular.
'use strict';
(() => {
  let reveal = false, lastRound = -1, ovTurn = null, ovRound = null;

  const style = `
    .ia-word { font-size:46px; font-weight:900; text-align:center; padding:26px 10px; border-radius:14px; background:#0b0e17; border:2px dashed #2a3350; text-transform:uppercase; line-height:1.1; word-break:break-word; }
    .ia-word.hid { color:#e5e7eb; font-size:22px; font-weight:600; text-transform:none; }
    .ia-cat { border-radius:14px; padding:18px; text-align:center; font-weight:900; font-size:26px; }
    .ia-dice { width:110px; height:110px; margin:0 auto; border-radius:18px; background:#fff; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); padding:12px; gap:4px; }
    .ia-dice i { border-radius:50%; background:#111; visibility:hidden; }
    .ia-dice.shake { animation:iashake .12s infinite; }
    @keyframes iashake { 0%{transform:rotate(-8deg)} 100%{transform:rotate(8deg)} }
    .ia-teams { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ia-team { border-radius:16px; padding:18px 12px; text-align:center; font-weight:900; font-size:22px; color:#111; border:4px solid transparent; }
    .ia-team.sel { border-color:#fff; box-shadow:0 0 0 3px #0008; }
    .ia-team small { display:block; font-weight:700; font-size:14px; opacity:.85; margin-top:6px; }
  `;
  let styled = false;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };
  const dice = (n, shake) => {
    const map = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const on = new Set(map[n] || []);
    return `<div class="ia-dice ${shake ? 'shake' : ''}">${Array.from({ length: 9 }, (_, i) => `<i style="visibility:${on.has(i) ? 'visible' : 'hidden'}"></i>`).join('')}</div>`;
  };

  ARCADE.register('imagemeacao', {
    phone: {
      html(c) {
        ensureStyle();
        const G = c.G, esc = c.esc, nm = c.nm;
        if (!G || !G.teamList) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const ti = k => G.teamList.find(x => x.key === k);
        const t = G.teams[G.turn];
        const mine = G.teams.find(x => x.key === G.myTeam);
        const isMyTurn = !!(t && mine && t.key === mine.key);
        const drawerP = tt => { const pid = tt && G.drawers[tt.key]; return pid ? c.C.players.find(x => x.pid === pid) : null; };
        const dOf = tt => { const p = drawerP(tt); return p ? p.name : null; };
        const offline = tt => { const p = drawerP(tt); return p && p.on === false ? `<div class="box center" style="border-color:#ef4444"><div class="big-emoji">📵</div><p class="sub"><b>${esc(p.name)}</b> está sem conexão. A vez é dele: ninguém joga no lugar.</p></div>` : ''; };
        if (G.round !== lastRound) { reveal = false; lastRound = G.round; }

        // ---------- escolher equipe ----------
        if (G.phase === 'setup') {
          return `<div class="box"><p class="sub center">Escolha sua equipe. Dentro dela, a ordem de desenhar é a ordem de entrada.</p></div>
            <div class="ia-teams">${G.teamList.map(k => {
              const tt = G.teams.find(x => x.key === k.key);
              return `<div class="ia-team ${G.myTeam === k.key ? 'sel' : ''}" style="background:${k.hex}" data-a="time" data-k="${k.key}">${k.name}
                <small>${tt ? tt.players.map(pid => { const p = c.C.players.find(x => x.pid === pid); return p ? esc(p.name) : ''; }).filter(Boolean).join(', ') : 'vazia'}</small></div>`;
            }).join('')}</div>
            <button class="btn big ok" data-a="begin" ${G.teams.length < 2 ? 'disabled' : ''}>▶ Começar o jogo</button>
            ${G.teams.length < 2 ? '<p class="sub center mut">Precisa de 2 equipes ou mais.</p>' : ''}
            <p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>`;
        }

        // ---------- vitória ----------
        if (G.phase === 'win') {
          const k = ti(G.winner);
          return `<div class="box center"><div class="big-emoji">🏆</div><h2 style="margin:8px 0;font-size:30px;color:${k.hex}">Equipe ${k.name} venceu!</h2></div>
            <button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
        }

        const k = t ? ti(t.key) : null;
        let h = `<div class="box"><div style="display:flex;align-items:center;gap:12px">
          <span class="dot" style="background:${k.hex};width:30px;height:30px"></span>
          <div><p class="sub mut">Vez da equipe</p><b style="font-size:24px;color:${k.hex}">${k.name}</b></div>
          <div style="margin-left:auto;text-align:right"><p class="sub mut">Casa ${t.pos}${G.target !== null ? ` → <b>${G.target}</b>` : ''}</p>
          ${dOf(t) ? `<p class="sub">✏️ ${esc(dOf(t))}</p>` : ''}</div></div></div>`;

        if (G.phase === 'rolling') return h + `<div class="box center"><p class="sub">Rolando…</p>${dice(null, true)}</div>`;

        if (G.phase === 'roll') {
          if (isMyTurn && G.amDrawer) h += `<div class="box hi center"><p class="sub">🎨 É a sua vez de desenhar!</p>${dice(G.dice)}</div><button class="btn big warn" data-a="roll">🎲 Jogar o dado</button>`;
          else if (isMyTurn) h += `<div class="box center"><p class="sub">Sua equipe joga agora</p><h2 style="margin:8px 0;font-size:26px">✏️ ${esc(dOf(t) || '?')}</h2><p class="sub">Ele joga o dado e desenha. Você adivinha!</p></div>` + offline(t);
          else h += `<div class="box center"><p class="sub">Esperando a equipe <b style="color:${k.hex}">${k.name}</b> jogar o dado…</p></div>`;
        } else if (G.phase === 'allplay') {
          const cat = G.categories[G.card.cat];
          h += `<div class="ia-cat" style="background:#fff;color:#111">⚡ TODOS JOGAM</div>
            <div class="ia-cat" style="background:${cat.color};color:${cat.text}">${cat.name}</div>
            <p class="sub center">Todas as equipes desenham. Quem acertar primeiro anda <b>${G.dice}</b> casa${G.dice === 1 ? '' : 's'}!</p>`;
          if (G.amDrawer) {
            h += `<p class="sub center">✏️ Você desenha pela equipe ${mine ? ti(mine.key).name : ''}.</p>`;
            h += reveal ? `<div class="ia-word" data-a="esconder">${esc(G.card.word)}</div>` : `<div class="ia-word hid" data-a="ver">👆 Toque para ver a palavra<br><small>(só quem vai desenhar!)</small></div>`;
          } else h += `<div class="box center"><p class="sub">✏️ <b>${esc(dOf(mine) || 'Alguém')}</b> desenha pela sua equipe. Você adivinha!</p></div>` + offline(mine);
          if (!c.C.timerEnd) {
            if (isMyTurn && G.amDrawer) h += `<button class="btn big ok" data-a="timer">⏱ Valendo! Começar</button><button class="btn ghost" data-a="swap">🔁 Trocar carta</button>`;
            else h += `<p class="sub center mut">Esperando ${esc(dOf(t) || 'a equipe ' + k.name)} começar…</p>`;
          } else {
            h += c.timerHtml('', G.roundMs) + `<button class="btn big ok" data-a="allwin">🙋 Acertamos!</button>`;
            if (isMyTurn && G.amDrawer) h += `<button class="btn ghost" data-a="allnone">Ninguém acertou → passar a vez</button>`;
          }
        } else {  // draw | judge
          const cat = G.categories[G.card.cat];
          h += `<div class="ia-cat" style="background:${cat.color};color:${cat.text}">${cat.name}</div>`;
          if (isMyTurn && G.amDrawer) {
            h += reveal ? `<div class="ia-word" data-a="esconder">${esc(G.card.word)}</div>` : `<div class="ia-word hid" data-a="ver">👆 Toque para ver a palavra<br><small>(só você desenha!)</small></div>`;
            if (G.phase === 'draw' && !c.C.timerEnd) h += `<button class="btn big ok" data-a="timer">⏱ Começar a desenhar</button><button class="btn ghost" data-a="swap">🔁 Trocar carta</button>`;
            else {
              h += G.timeUp ? `<div class="big-emoji">⏰</div><p class="sub center">Tempo esgotado!</p>` : c.timerHtml('', G.roundMs);
              h += `<div class="row"><button class="btn big ok" data-a="ok">✔ Acertou</button><button class="btn big no" data-a="fail">✘ Errou</button></div>`;
            }
          } else if (isMyTurn) {
            h += offline(t) + `<div class="box center"><div class="big-emoji">🙈</div><p class="sub"><b>${esc(dOf(t) || 'Alguém')}</b> está desenhando pela sua equipe.<br>Adivinhe! Você não vê a palavra.</p></div>`;
            h += G.timeUp ? '<p class="sub center">⏰ Tempo esgotado</p>' : c.timerHtml('', G.roundMs);
          } else {
            h += `<div class="box center"><div class="big-emoji">🤫</div><p class="sub">A equipe <b style="color:${k.hex}">${k.name}</b> está desenhando.<br>Olhe para a TV!</p></div>`;
            h += G.timeUp ? '<p class="sub center">⏰ Tempo esgotado</p>' : c.timerHtml('', G.roundMs);
          }
        }

        h += `<p class="sub center">${c.C.event ? c.hl(c.C.event.text) : ''}</p>
          <div class="box">${G.teams.map(tt => {
            const kk = ti(tt.key);
            return `<div class="pl" style="border-color:${tt === t ? '#fff' : 'transparent'}"><span class="dot" style="background:${kk.hex}"></span><b>${kk.name}</b><span>casa ${tt.pos}</span></div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 6px 10px 14px">${tt.players.map((pid, i) => {
                const p = c.C.players.find(x => x.pid === pid);
                const now = G.drawers[tt.key] === pid;
                return p ? `<span class="nm" style="${now ? 'background:#fbbf24;color:#111' : 'background:#ffffff12;color:#cbd5e1'};font-size:15px">${i + 1}. ${esc(p.name)}${now ? ' ✏️' : ''}${p.on === false ? ' 📵' : ''}</span>` : '';
              }).join('')}</div>`;
          }).join('')}</div>`;
        return h;
      },

      after(c) {
        const G = c.G;
        if (!G || !G.teams || !['roll', 'draw', 'allplay'].includes(G.phase)) { ovTurn = G ? G.turn : null; ovRound = G ? G.round : null; return; }
        const first = ovTurn === null;
        const mudou = !first && (G.turn !== ovTurn || G.round !== ovRound);
        ovTurn = G.turn; ovRound = G.round;
        if (!mudou || G.phase !== 'roll') return;
        const t = G.teams[G.turn]; if (!t) return;
        const k = G.teamList.find(x => x.key === t.key);
        const pid = G.drawers[t.key], p = pid && c.C.players.find(x => x.pid === pid);
        const euDesenho = c.you && pid === c.you.pid;
        c.turnover(`<div class="round">Rodada ${G.round}</div>
          <div><small>🎨 AGORA DESENHA A EQUIPE</small><span class="who2" style="background:${k.hex};color:#111">${k.name}</span></div>
          ${p ? `<div><small>✏️ QUEM DESENHA</small><span class="who2 sm" style="background:#fff;color:#111">${c.esc(p.name)}</span></div>` : ''}
          ${euDesenho ? '<div class="mine">✏️ É você quem desenha!</div>' : ''}`,
          3000, euDesenho ? [90, 60, 90] : 60);
      },

      act(a, el) {
        const send = ARCADE.send;
        switch (a) {
          case 'time': return send({ t: 'team', key: el.dataset.k });
          case 'begin': return send({ t: 'begin' });
          case 'roll': return send({ t: 'roll' });
          case 'timer': return send({ t: 'timer' });
          case 'swap': reveal = false; return send({ t: 'swap' });
          case 'ver': reveal = true; return ARCADE.redraw();
          case 'esconder': reveal = false; return ARCADE.redraw();
          case 'ok': return send({ t: 'result', ok: true });
          case 'fail': return send({ t: 'result', ok: false });
          case 'allwin': return send({ t: 'allwin' });
          case 'allnone': return send({ t: 'allnone' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });
})();
