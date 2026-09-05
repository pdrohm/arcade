// Telefone Sem Fio — tela do celular, com quadro de desenho.
(() => {
  const SIZE = 640;                      // resolução interna do desenho (quadrado)
  const CORES = ['#111111', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#8b5a2b', '#ffffff'];
  let styled = false;
  const style = `
    .tsf-wrap { position:relative; width:100%; aspect-ratio:1; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px #0008; touch-action:none; }
    .tsf-wrap canvas { position:absolute; inset:0; width:100%; height:100%; touch-action:none; }
    .tsf-tools { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .tsf-cor { width:38px; height:38px; border-radius:50%; border:3px solid transparent; box-shadow:0 0 0 1px #0008 inset; flex:none; }
    .tsf-cor.sel { border-color:#fff; box-shadow:0 0 0 3px #f59e0b; }
    .tsf-sz { width:44px; height:44px; border-radius:12px; background:#2a3350; display:flex; align-items:center; justify-content:center; flex:none; }
    .tsf-sz.sel { background:#f59e0b; }
    .tsf-sz.off { opacity:.3; }
    .tsf-sz { font-size:22px; }
    .tsf-sz i { display:block; border-radius:50%; background:#fff; }
    .tsf-sz.sel i { background:#111; }
    .tsf-mini { width:100%; aspect-ratio:1; background:#fff; border-radius:16px; object-fit:contain; }
    .tsf-frase { font-size:30px; font-weight:900; line-height:1.2; text-align:center; }
    .tsf-prog { display:flex; gap:6px; flex-wrap:wrap; }
  `;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };

  // ---------- quadro de desenho ----------
  // Ferramentas: caneta, borracha, reta, retângulo, círculo. Desfazer e refazer guardam fotos do quadro.
  let cv = null, cx2 = null, cor = CORES[0], tam = 8, tool = 'pen', desenhando = false;
  let hist = [], redo = [], snap = null, p0 = null, last = null, mountedFor = '', autoSent = '';
  const W = () => (tool === 'eraser' ? tam * 3 : tam);
  function initCanvas(el) {
    cv = el; cx2 = cv.getContext('2d');
    cv.width = SIZE; cv.height = SIZE;
    cx2.fillStyle = '#fff'; cx2.fillRect(0, 0, SIZE, SIZE);
    cx2.lineCap = 'round'; cx2.lineJoin = 'round';
    hist = []; redo = []; tool = 'pen';
    const pos = e => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(SIZE, (e.clientX - r.left) / r.width * SIZE)), Math.max(0, Math.min(SIZE, (e.clientY - r.top) / r.height * SIZE))]; };
    const style = () => { cx2.strokeStyle = tool === 'eraser' ? '#fff' : cor; cx2.fillStyle = cx2.strokeStyle; cx2.lineWidth = W(); };
    const shape = (a, b) => {
      style();
      if (tool === 'line') { cx2.beginPath(); cx2.moveTo(a[0], a[1]); cx2.lineTo(b[0], b[1]); cx2.stroke(); }
      else if (tool === 'rect') { cx2.beginPath(); cx2.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); cx2.stroke(); }
      else if (tool === 'circle') { const rx = Math.abs(b[0] - a[0]) / 2, ry = Math.abs(b[1] - a[1]) / 2; cx2.beginPath(); cx2.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); cx2.stroke(); }
    };
    const down = e => {
      e.preventDefault(); if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { cv.setPointerCapture(e.pointerId); } catch {}
      desenhando = true; redo = [];
      hist.push(cx2.getImageData(0, 0, SIZE, SIZE)); if (hist.length > 30) hist.shift();
      snap = cx2.getImageData(0, 0, SIZE, SIZE);
      p0 = last = pos(e);
      if (tool === 'pen' || tool === 'eraser') { style(); cx2.beginPath(); cx2.arc(p0[0], p0[1], W() / 2, 0, Math.PI * 2); cx2.fill(); }
    };
    const move = e => {
      if (!desenhando) return; e.preventDefault();
      const p = pos(e);
      if (tool === 'pen' || tool === 'eraser') { style(); cx2.beginPath(); cx2.moveTo(last[0], last[1]); cx2.lineTo(p[0], p[1]); cx2.stroke(); last = p; }
      else { cx2.putImageData(snap, 0, 0); shape(p0, p); }   // prévia da forma
    };
    const up = e => { if (!desenhando) return; desenhando = false; if (tool !== 'pen' && tool !== 'eraser' && e && e.clientX !== undefined) { cx2.putImageData(snap, 0, 0); shape(p0, pos(e)); } snap = null; };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', e => { if (desenhando && (tool === 'pen' || tool === 'eraser')) up(e); });
  }
  const undo = () => { if (!cx2 || !hist.length) return; redo.push(cx2.getImageData(0, 0, SIZE, SIZE)); cx2.putImageData(hist.pop(), 0, 0); };
  const redoFn = () => { if (!cx2 || !redo.length) return; hist.push(cx2.getImageData(0, 0, SIZE, SIZE)); cx2.putImageData(redo.pop(), 0, 0); };
  const clear = () => { if (!cx2) return; hist.push(cx2.getImageData(0, 0, SIZE, SIZE)); redo = []; cx2.fillStyle = '#fff'; cx2.fillRect(0, 0, SIZE, SIZE); };
  const exportImg = () => { if (!cv) return ''; const out = document.createElement('canvas'); out.width = 480; out.height = 480; out.getContext('2d').drawImage(cv, 0, 0, 480, 480); return out.toDataURL('image/jpeg', 0.82); };
  const TOOLS = [['pen', '✏️', 'caneta'], ['eraser', '🧽', 'borracha'], ['line', '📏', 'reta'], ['rect', '▭', 'retângulo'], ['circle', '◯', 'círculo']];
  function toolsHtml() {
    return `<div class="tsf-tools">${CORES.map(c => `<div class="tsf-cor ${tool !== 'eraser' && cor === c ? 'sel' : ''}" style="background:${c}" data-a="tcor" data-c="${c}"></div>`).join('')}</div>
      <div class="tsf-tools">${TOOLS.map(([k, ic, nome]) => `<div class="tsf-sz ${tool === k ? 'sel' : ''}" data-a="tool" data-k="${k}" title="${nome}">${ic}</div>`).join('')}
        <span style="flex:1"></span>
        <div class="tsf-sz ${hist.length ? '' : 'off'}" data-a="undo" title="desfazer">↶</div><div class="tsf-sz ${redo.length ? '' : 'off'}" data-a="redo" title="refazer">↷</div><div class="tsf-sz" data-a="limpar" title="limpar tudo">🗑</div></div>
      <div class="tsf-tools"><span class="sub mut">Traço</span>${[4, 8, 16, 28].map(t => `<div class="tsf-sz ${tam === t ? 'sel' : ''}" data-a="tam" data-t="${t}"><i style="width:${Math.min(30, t + 4)}px;height:${Math.min(30, t + 4)}px"></i></div>`).join('')}</div>`;
  }
  function refreshTools(root) { const t = root.querySelector('#tsf-tools'); if (t) { t.innerHTML = toolsHtml(); bindTools(root); } }
  function bindTools(root) {
    root.querySelectorAll('#tsf-tools [data-a]').forEach(el => el.onclick = ev => {
      ev.stopPropagation();
      const a = el.dataset.a;
      if (a === 'tcor') { cor = el.dataset.c; if (tool === 'eraser') tool = 'pen'; }
      else if (a === 'tool') tool = el.dataset.k;
      else if (a === 'tam') tam = Number(el.dataset.t);
      else if (a === 'undo') undo();
      else if (a === 'redo') redoFn();
      else if (a === 'limpar') { if (confirm('Apagar tudo?')) clear(); }
      refreshTools(root);
    });
  }

  ARCADE.register('telefone', {
    phone: {
      // enquanto a pessoa desenha/escreve, a tela não é redesenhada
      key(c) { const G = c.G; return G ? `${G.phase}:${G.step}:${G.me ? G.me.submitted : ''}:${G.reveal ? G.reveal.chain + '-' + G.reveal.upto : ''}` : ''; },

      html(c) {
        ensureStyle();
        const { G, esc, nm } = c;
        if (!G) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const prog = () => `<div class="box"><p class="sub mut" style="margin-bottom:6px" id="tsf-progtxt">Rodada ${G.step + 1} de ${G.total} · ${G.done.length}/${G.order.length} entregaram</p>
          <div class="tsf-prog" id="tsf-prog">${G.order.map(pid => { const p = c.C.players.find(x => x.pid === pid); return p ? `<span class="nm" style="${c.nmStyle(p)};opacity:${G.done.includes(pid) ? 1 : .35}">${G.done.includes(pid) ? '✓ ' : ''}${esc(p.name)}</span>` : ''; }).join('')}</div></div>`;

        if (['write', 'draw', 'describe'].includes(G.phase)) {
          const me = G.me;
          if (!me || me.chain < 0) return `<div class="box center"><p class="sub">Você entrou depois do começo. Espere a próxima partida.</p></div>` + prog();
          if (me.submitted) return `<div class="box center"><div class="big-emoji">✅</div><p class="sub">Entregue! Esperando os outros…</p></div>` + prog();
          let h = c.timerHtml(G.phase === 'draw' ? 'Quando acabar, o desenho é enviado sozinho.' : '', G.turnMs);
          if (G.phase === 'write') {
            h += `<div class="box hi"><p class="sub center" style="margin-bottom:10px">✍️ Escreva uma frase maluca para alguém desenhar</p>
              <input id="tsf-text" maxlength="120" placeholder="${esc(me.sug)}" autocomplete="off">
              <p class="sub mut center" style="margin-top:8px">Sem ideia? Deixe em branco e vai a sugestão: "${esc(me.sug)}"</p></div>
              <button class="btn big ok" data-a="enviarTexto">Enviar frase</button>`;
          } else if (G.phase === 'draw') {
            h += `<div class="box hi"><p class="sub mut center">🎨 Desenhe isto (recebido de ${nm(c.C.players.find(x => x.pid === me.prev.by))}):</p><div class="tsf-frase">${esc(me.prev.content)}</div></div>
              <div class="tsf-wrap"><canvas id="tsf-cv"></canvas></div>
              <div id="tsf-tools">${toolsHtml()}</div>
              <button class="btn big ok" data-a="enviarDesenho">Enviar desenho</button>`;
          } else {
            h += `<div class="box hi"><p class="sub mut center" style="margin-bottom:8px">👀 O que é isto? (desenho de ${nm(c.C.players.find(x => x.pid === me.prev.by))})</p>
              ${me.prev.content ? `<img class="tsf-mini" src="${me.prev.content}">` : '<div class="tsf-mini" style="display:flex;align-items:center;justify-content:center;color:#999">(não deu tempo de desenhar)</div>'}
              <input id="tsf-text" maxlength="120" placeholder="Descreva o desenho…" autocomplete="off" style="margin-top:10px"></div>
              <button class="btn big ok" data-a="enviarTexto">Enviar descrição</button>`;
          }
          return h + prog();
        }

        if (G.phase === 'reveal' || G.phase === 'end') {
          const a = G.album;
          let h = `<div class="box center"><p class="sub mut">Álbum · corrente ${a ? a.chain + 1 : 0} de ${G.chainsCount}</p>${a ? `<p class="sub">Começou com ${nm(c.C.players.find(x => x.pid === a.owner))}</p>` : ''}</div>`;
          if (a) h += a.items.map((it, i) => it.type === 'draw'
            ? `<div class="box"><p class="sub mut">${i + 1}. ${nm(c.C.players.find(x => x.pid === it.by))} desenhou:</p>${it.content ? `<img class="tsf-mini" src="${it.content}">` : '<p class="sub">(sem desenho)</p>'}</div>`
            : `<div class="box"><p class="sub mut">${i + 1}. ${nm(c.C.players.find(x => x.pid === it.by))} ${i === 0 ? 'escreveu' : 'descreveu'}:</p><div class="tsf-frase">${esc(it.content)}</div></div>`).join('');
          if (G.phase === 'reveal') h += `<div class="row"><button class="btn ghost" data-a="prev">⬅️</button><button class="btn big warn" data-a="next" style="flex:3">Próximo ➡️</button></div><p class="sub mut center">Olhem para a TV! Qualquer um pode avançar.</p>`;
          else h += `<button class="btn big ok" data-a="again">🔄 Jogar de novo</button>`;
          return h;
        }
        return '';
      },

      after(c) {
        const G = c.G; if (!G) return;
        const root = document.getElementById('app');
        const canvasEl = document.getElementById('tsf-cv');
        const tag = `${G.phase}:${G.step}`;
        if (canvasEl && mountedFor !== tag) { mountedFor = tag; initCanvas(canvasEl); bindTools(root); }
        const progtxt = document.getElementById('tsf-progtxt');
        if (progtxt) progtxt.textContent = `Rodada ${G.step + 1} de ${G.total} · ${G.done.length}/${G.order.length} entregaram`;
        const prog = document.getElementById('tsf-prog');
        if (prog) prog.innerHTML = G.order.map(pid => { const p = c.C.players.find(x => x.pid === pid); return p ? `<span class="nm" style="${c.nmStyle(p)};opacity:${G.done.includes(pid) ? 1 : .35}">${G.done.includes(pid) ? '✓ ' : ''}${c.esc(p.name)}</span>` : ''; }).join('');
        // tempo acabou: envia o que tem, uma vez só por rodada
        const r = c.remaining();
        if (G.me && !G.me.submitted && r !== null && r <= 0.3 && autoSent !== tag) {
          autoSent = tag;
          if (G.phase === 'draw') c.send({ t: 'submit', image: exportImg() });
          else { const t = document.getElementById('tsf-text'); c.send({ t: 'submit', text: t ? t.value : '' }); }
        }
      },

      act(a, el, c) {
        const send = ARCADE.send;
        switch (a) {
          case 'enviarTexto': { const t = document.getElementById('tsf-text'); return send({ t: 'submit', text: t ? t.value : '' }); }
          case 'enviarDesenho': return send({ t: 'submit', image: exportImg() });
          case 'next': return send({ t: 'next' });
          case 'prev': return send({ t: 'prev' });
          case 'again': return send({ t: 'again' });
        }
      },
    },
  });

  // o cronômetro da tela roda a cada 250 ms; aqui só pegamos carona para o envio automático
  setInterval(() => { const c = ARCADE.ctx(); if (c && c.C && c.C.gameId === 'telefone' && ARCADE.games.telefone) ARCADE.games.telefone.phone.after(c); }, 500);
})();
