// Telefone Sem Fio — tela do celular, com quadro de desenho.
'use strict';
(() => {
  const SIZE = 640;                      // resolução interna do desenho (quadrado)
  const CORES = ['#111111', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#8b5a2b', '#ffffff'];
  let styled = false;
  // Visual "fliperama de papel" (shared/ui.css): quadro branco com borda de tinta, botões quadrados com sombra dura.
  const style = `
    .tsf-wrap { position:relative; width:100%; aspect-ratio:1; background:#fff; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; overflow:hidden; touch-action:none; }
    .tsf-wrap canvas { position:absolute; inset:0; width:100%; height:100%; touch-action:none; }
    .tsf-tools { display:grid; gap:6px; align-items:center; }
    .tsf-tools.cores { grid-template-columns:repeat(10,1fr); }
    .tsf-tools.ferr { grid-template-columns:repeat(8,1fr); }
    .tsf-tools.tam { grid-template-columns:repeat(8,1fr); }
    .tsf-tools .lb { grid-column:span 2; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; padding-right:6px; }
    .tsf-cor { aspect-ratio:1; border:3px solid #0f0f14; cursor:pointer; }
    .tsf-cor.sel { outline:3px solid #0f0f14; outline-offset:2px; }
    .tsf-sz { aspect-ratio:1; min-height:38px; background:#fff; border:3px solid #0f0f14; box-shadow:3px 3px 0 #0f0f14; display:flex; align-items:center; justify-content:center; color:#0f0f14; cursor:pointer; transition:transform .06s, box-shadow .06s; }
    .tsf-sz svg { width:60%; height:60%; fill:none; stroke:#0f0f14; stroke-width:2.6; stroke-linecap:square; stroke-linejoin:miter; }
    .tsf-sz.sel { background:#ffce1f; transform:translate(3px,3px); box-shadow:none; }
    .tsf-sz:active { transform:translate(3px,3px); box-shadow:none; }
    .tsf-sz.off { opacity:.3; box-shadow:none; }
    .tsf-sz.gap { margin-left:4px; }
    .tsf-sz i { display:block; border-radius:50%; background:#0f0f14; }
    .tsf-mini { display:block; width:100%; aspect-ratio:1; background:#fff; border:3px solid #0f0f14; object-fit:contain; }
    .tsf-frase { font-size:28px; font-weight:900; font-stretch:112%; line-height:1.15; text-align:center; overflow-wrap:anywhere; }
    .tsf-lb { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; display:flex; align-items:center; flex-wrap:wrap; gap:6px; }
    .tsf-lb.c { justify-content:center; text-align:center; }
    .tsf-lb .nm { font-family:'Archivo',sans-serif; font-size:15px; letter-spacing:0; text-transform:none; }
    .tsf-prog { display:flex; gap:6px; flex-wrap:wrap; }
    .tsf-prog .nm { font-size:15px; }
    .tsf-prog .nm.wait { background:#fff; color:#55555e; border-style:dashed; }
    .tsf-done { width:72px; height:72px; margin:0 auto 12px; background:#35d07f; border:3px solid #0f0f14; box-shadow:5px 5px 0 #0f0f14; display:flex; align-items:center; justify-content:center; font-family:'Pixelify Sans',monospace; font-size:44px; font-weight:700; }
    .tsf-h { font-family:'Archivo',sans-serif; font-weight:900; font-stretch:125%; text-transform:uppercase; font-size:24px; line-height:1; }
    .tsf-step { display:flex; flex-direction:column; gap:10px; }
    .tsf-save { position:relative; cursor:pointer; }
    .tsf-savehint { position:absolute; right:8px; bottom:8px; background:#0f0f14; color:#ffce1f; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:5px 8px; pointer-events:none; }
  `;
  const ensureStyle = () => { if (styled) return; const el = document.createElement('style'); el.textContent = style; document.head.appendChild(el); styled = true; };

  // ---------- quadro de desenho ----------
  // Ferramentas: caneta, borracha, reta, retângulo, círculo. Desfazer e refazer guardam fotos do quadro.
  let cv = null, cx2 = null, cor = CORES[0], tam = 8, tool = 'pen', desenhando = false;
  let hist = [], redo = [], snap = null, p0 = null, last = null, mountedFor = '', autoSent = '';
  let draftT = null, textEl = null;
  // rascunho: a cada traço (ou letra) o celular guarda no servidor o estado atual.
  // Se a pessoa esquecer de tocar em Enviar (ou o celular apagar), vai o último rascunho.
  function sendDraft() {
    draftT = null;
    const c = ARCADE.ctx(), G = c && c.G;
    if (!G || !G.me || G.me.submitted) return;
    if (G.phase === 'draw') { if (cv) ARCADE.send({ t: 'input', kind: 'draft', image: exportImg() }); }
    else if (G.phase === 'write' || G.phase === 'describe') { const t = document.getElementById('tsf-text'); if (t) ARCADE.send({ t: 'input', kind: 'draft', text: t.value }); }
  }
  const scheduleDraft = ms => { clearTimeout(draftT); draftT = setTimeout(sendDraft, ms || 700); };
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
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
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
    const up = e => { if (!desenhando) return; desenhando = false; if (tool !== 'pen' && tool !== 'eraser' && e && e.clientX !== undefined) { cx2.putImageData(snap, 0, 0); shape(p0, pos(e)); } snap = null; scheduleDraft(); };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', e => { if (desenhando && (tool === 'pen' || tool === 'eraser')) up(e); });
  }
  const undo = () => { if (!cx2 || !hist.length) return; redo.push(cx2.getImageData(0, 0, SIZE, SIZE)); cx2.putImageData(hist.pop(), 0, 0); };
  const redoFn = () => { if (!cx2 || !redo.length) return; hist.push(cx2.getImageData(0, 0, SIZE, SIZE)); cx2.putImageData(redo.pop(), 0, 0); };
  const clear = () => { if (!cx2) return; hist.push(cx2.getImageData(0, 0, SIZE, SIZE)); redo = []; cx2.fillStyle = '#fff'; cx2.fillRect(0, 0, SIZE, SIZE); };
  const exportImg = () => { if (!cv) return ''; const out = document.createElement('canvas'); out.width = 480; out.height = 480; out.getContext('2d').drawImage(cv, 0, 0, 480, 480); return out.toDataURL('image/jpeg', 0.82); };
  // ícones de traço (SVG em tinta), no lugar dos emojis
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    pen: ic('<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>'),
    eraser: ic('<path d="M3 15l9-9 7 7-6 6H7z"/><path d="M13 19h8"/>'),
    line: ic('<path d="M5 19L19 5"/>'),
    rect: ic('<rect x="4" y="6" width="16" height="12"/>'),
    circle: ic('<circle cx="12" cy="12" r="8"/>'),
    undo: ic('<path d="M9 4L4 9l5 5"/><path d="M4 9h10a5 5 0 0 1 0 10h-4"/>'),
    redo: ic('<path d="M15 4l5 5-5 5"/><path d="M20 9H10a5 5 0 0 0 0 10h4"/>'),
    trash: ic('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'),
  };
  const TOOLS = [['pen', ICON.pen, 'caneta'], ['eraser', ICON.eraser, 'borracha'], ['line', ICON.line, 'reta'], ['rect', ICON.rect, 'retângulo'], ['circle', ICON.circle, 'círculo']];
  function toolsHtml() {
    return `<div class="tsf-tools cores">${CORES.map(c => `<div class="tsf-cor ${tool !== 'eraser' && cor === c ? 'sel' : ''}" style="background:${c}" data-a="tcor" data-c="${c}"></div>`).join('')}</div>
      <div class="tsf-tools ferr" style="margin-top:10px">${TOOLS.map(function (t) { const k = t[0], icone = t[1], nome = t[2]; return `<div class="tsf-sz ${tool === k ? 'sel' : ''}" data-a="tool" data-k="${k}" title="${nome}">${icone}</div>`; }).join('')}
        <div class="tsf-sz ${hist.length ? '' : 'off'}" data-a="undo" title="desfazer">${ICON.undo}</div><div class="tsf-sz ${redo.length ? '' : 'off'}" data-a="redo" title="refazer">${ICON.redo}</div><div class="tsf-sz" data-a="limpar" title="limpar tudo">${ICON.trash}</div></div>
      <div class="tsf-tools tam" style="margin-top:10px"><span class="lb">Traço</span>${[4, 8, 16, 28].map(t => `<div class="tsf-sz ${tam === t ? 'sel' : ''}" data-a="tam" data-t="${t}"><i style="width:${Math.min(26, t + 3)}px;height:${Math.min(26, t + 3)}px"></i></div>`).join('')}</div>`;
  }
  function refreshTools(root) { const t = root.querySelector('#tsf-tools'); if (t) { t.innerHTML = toolsHtml(); bindTools(root); } }
  function bindTools(root) {
    Array.prototype.slice.call(root.querySelectorAll('#tsf-tools [data-a]')).forEach(el => el.onclick = ev => {
      ev.stopPropagation();
      const a = el.dataset.a;
      if (a === 'tcor') { cor = el.dataset.c; if (tool === 'eraser') tool = 'pen'; }
      else if (a === 'tool') tool = el.dataset.k;
      else if (a === 'tam') tam = Number(el.dataset.t);
      else if (a === 'undo') undo();
      else if (a === 'redo') redoFn();
      else if (a === 'limpar') { if (confirm('Apagar tudo?')) clear(); }
      if (a === 'undo' || a === 'redo' || a === 'limpar') scheduleDraft();
      refreshTools(root);
    });
  }

  // quem já entregou: crachá na cor da pessoa (letra em tinta); quem falta: crachá branco tracejado
  const progTxt = G => `Rodada ${G.step + 1} de ${G.total} · ${G.done.length}/${G.order.length} entregaram`;
  const progHtml = c => { const G = c.G; return G.order.map(pid => { const p = c.C.players.find(x => x.pid === pid); if (!p) return ''; const ok = G.done.includes(pid); return `<span class="nm${ok ? '' : ' wait'}" style="${ok ? `background:${c.ci(p.color).hex};color:#0f0f14` : ''}">${ok ? '✓ ' : ''}${c.esc(p.name)}</span>`; }).join(''); };

  // Toque para salvar (shared/client.js, data-copyimg): o ajudante lê a imagem com fetch, e a política de
  // segurança do site não deixa buscar endereço data:. Por isso cada imagem salvável ganha uma cópia em
  // <canvas> escondida, que vem antes da <img> e é a que o ajudante usa.
  function canvasCopies() {
    Array.prototype.slice.call(document.querySelectorAll('[data-copyimg]')).forEach(w => {
      const img = w.querySelector('img');
      if (!img || w.querySelector('canvas')) return;
      const make = () => {
        if (w.querySelector('canvas') || !img.naturalWidth) return;
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight; cv.style.display = 'none';
        cv.getContext('2d').drawImage(img, 0, 0);
        w.insertBefore(cv, w.firstChild);
      };
      if (img.complete) make(); else img.addEventListener('load', make);
    });
  }

  ARCADE.register('telefone', {
    phone: {
      // enquanto a pessoa desenha/escreve, a tela não é redesenhada
      key(c) { const G = c.G; return G ? `${G.phase}:${G.step}:${G.me ? G.me.submitted : ''}:${G.reveal ? G.reveal.chain + '-' + G.reveal.upto : ''}` : ''; },

      html(c) {
        ensureStyle();
        const G = c.G, esc = c.esc;
        const chip = p => p ? `<span class="nm" style="background:${c.ci(p.color).hex};color:#0f0f14">${esc(p.name)}</span>` : '';
        const nm = p => p ? `<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle">${c.avatar(p, 26)}${chip(p)}</span>` : '';
        if (!G) return '<div class="box center"><p class="sub">Preparando…</p></div>';
        const prog = () => `<div class="box"><p class="tsf-lb" style="margin-bottom:8px" id="tsf-progtxt">${progTxt(G)}</p>
          <div class="tsf-prog" id="tsf-prog">${progHtml(c)}</div></div>`;

        if (['write', 'draw', 'describe'].includes(G.phase)) {
          const me = G.me;
          if (!me || me.chain < 0) return `<div class="box center"><p class="sub">Você entrou depois do começo. Espere a próxima partida.</p></div>` + prog();
          if (me.submitted) return `<div class="box center"><div class="tsf-done">✓</div><div class="tsf-h">Entregue!</div><p class="sub mut" style="margin-top:6px">Esperando os outros…</p></div>` + prog();
          let h = c.timerHtml(G.phase === 'draw' ? 'Quando acabar, o desenho é enviado sozinho.' : '', G.turnMs);
          if (G.phase === 'write') {
            h += `<div class="box hi"><p class="tsf-h center" style="font-size:20px;margin-bottom:12px">Escreva uma frase maluca para alguém desenhar</p>
              <input id="tsf-text" maxlength="120" placeholder="${esc(me.sug)}" autocomplete="off">
              <p class="sub center" style="margin-top:10px;font-size:15px">Sem ideia? Deixe em branco e vai a sugestão: "${esc(me.sug)}"</p></div>
              <button class="btn big ok" data-a="enviarTexto">Enviar frase</button>`;
          } else if (G.phase === 'draw') {
            h += `<div class="box hi tsf-step"><p class="tsf-lb c">Desenhe isto · de ${nm(c.C.players.find(x => x.pid === me.prev.by))}</p><div class="tsf-frase">${esc(me.prev.content)}</div></div>
              <div class="tsf-wrap"><canvas id="tsf-cv"></canvas></div>
              <div id="tsf-tools">${toolsHtml()}</div>
              <button class="btn big ok" data-a="enviarDesenho">Enviar desenho</button>`;
          } else {
            h += `<div class="box hi tsf-step"><p class="tsf-lb c">O que é isto? · desenho de ${nm(c.C.players.find(x => x.pid === me.prev.by))}</p>
              ${me.prev.content ? `<img class="tsf-mini" src="${me.prev.content}">` : '<div class="tsf-mini" style="display:flex;align-items:center;justify-content:center;color:#55555e;font-weight:700">(não deu tempo de desenhar)</div>'}
              <input id="tsf-text" maxlength="120" placeholder="Descreva o desenho…" autocomplete="off"></div>
              <button class="btn big ok" data-a="enviarTexto">Enviar descrição</button>`;
          }
          return h + prog();
        }

        if (G.phase === 'reveal' || G.phase === 'end') {
          const a = G.album;
          let h = `<div class="box center" style="background:#b08cff"><p class="tsf-lb c">Álbum · corrente ${a ? a.chain + 1 : 0} de ${G.chainsCount}</p>${a ? `<p class="tsf-lb c" style="margin-top:8px">Começou com ${nm(c.C.players.find(x => x.pid === a.owner))}</p>` : ''}</div>`;
          if (a) h += a.items.map((it, i) => it.type === 'draw'
            ? `<div class="box tsf-step"><p class="tsf-lb">${i + 1} · ${nm(c.C.players.find(x => x.pid === it.by))} desenhou:</p>${it.content ? `<div class="tsf-save" data-copyimg="telefone-${a.chain + 1}-${i + 1}"><img class="tsf-mini" src="${it.content}" alt="Desenho"><span class="tsf-savehint">Toque para salvar</span></div>` : '<p class="sub mut">(sem desenho)</p>'}</div>`
            : `<div class="box tsf-step"><p class="tsf-lb">${i + 1} · ${nm(c.C.players.find(x => x.pid === it.by))} ${i === 0 ? 'escreveu' : 'descreveu'}:</p><div class="tsf-frase">${esc(it.content)}</div></div>`).join('');
          if (G.phase === 'reveal') h += `<div class="row"><button class="btn" data-a="prev" aria-label="Voltar">◀</button><button class="btn big warn" data-a="next" style="flex:3">Próximo ▶</button></div><p class="sub mut center">Olhem para a TV! Qualquer um pode avançar.</p>`;
          else h += `<button class="btn big ok" data-a="again">Jogar de novo</button>`;
          return h;
        }
        return '';
      },

      after(c) {
        canvasCopies();
        const G = c.G; if (!G) return;
        const root = document.getElementById('app');
        const canvasEl = document.getElementById('tsf-cv');
        const tag = `${G.phase}:${G.step}`;
        if (canvasEl && (mountedFor !== tag || canvasEl !== cv)) {
          mountedFor = tag; initCanvas(canvasEl); bindTools(root);
          // tela recarregou no meio do desenho: volta do último rascunho salvo
          if (G.me && G.me.draft) { const img = new Image(); img.onload = () => { if (cv === canvasEl) cx2.drawImage(img, 0, 0, SIZE, SIZE); }; img.src = G.me.draft; }
        }
        const tEl = document.getElementById('tsf-text');
        if (tEl && tEl !== textEl) {
          textEl = tEl;
          if (G.me && G.me.draft && !tEl.value) tEl.value = G.me.draft;
          tEl.addEventListener('input', () => scheduleDraft(800));
        }
        const progtxt = document.getElementById('tsf-progtxt');
        if (progtxt) progtxt.textContent = progTxt(G);
        const prog = document.getElementById('tsf-prog');
        if (prog) prog.innerHTML = progHtml(c);
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
