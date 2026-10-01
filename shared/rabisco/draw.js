// Rabisco — quadro de desenho compartilhado (celular que desenha, celulares e TV que assistem).
// O desenho viaja como "traços" (ops) em coordenadas 0..SIZE:
//   { t:'s', id, c, w, p:[x,y,x,y…] }   pedaço de traço livre (vários pedaços com o mesmo id = um traço)
//   { t:'f', id, k:'l'|'r'|'o', c, w, a:[x,y], b:[x,y] }   reta, retângulo, círculo
//   { t:'u' } desfazer · { t:'y' } refazer · { t:'c' } limpar
// A TV da casa é um Chrome 47: nada de parâmetro padrão, desestruturação ou catch sem variável (docs/TV-ANTIGA.md).
'use strict';
window.ARCADE = window.ARCADE || {};
window.ARCADE.draw = (() => {
  const SIZE = 640, FLUSH_MS = 80, MAX_PTS = 160, MAX_BATCH = 40, BIG_W = 24;
  const KIND = { line: 'l', rect: 'r', circle: 'o' };

  function drawOp(g, op, k) {
    g.strokeStyle = g.fillStyle = op.c; g.lineWidth = op.w * k; g.lineCap = 'round'; g.lineJoin = 'round';
    if (op.t === 's') {
      if (op.p.length <= 2) { g.beginPath(); g.arc(op.p[0] * k, op.p[1] * k, op.w * k / 2, 0, Math.PI * 2); g.fill(); return; }
      g.beginPath(); g.moveTo(op.p[0] * k, op.p[1] * k);
      for (let i = 2; i < op.p.length; i += 2) g.lineTo(op.p[i] * k, op.p[i + 1] * k);
      g.stroke(); return;
    }
    const a = op.a, b = op.b;
    g.beginPath();
    if (op.k === 'l') { g.moveTo(a[0] * k, a[1] * k); g.lineTo(b[0] * k, b[1] * k); }
    else if (op.k === 'r') g.rect(Math.min(a[0], b[0]) * k, Math.min(a[1], b[1]) * k, Math.abs(b[0] - a[0]) * k, Math.abs(b[1] - a[1]) * k);
    else if (g.ellipse) g.ellipse((a[0] + b[0]) / 2 * k, (a[1] + b[1]) / 2 * k, Math.max(1, Math.abs(b[0] - a[0]) / 2) * k, Math.max(1, Math.abs(b[1] - a[1]) / 2) * k, 0, 0, Math.PI * 2);
    else { g.save(); g.translate((a[0] + b[0]) / 2 * k, (a[1] + b[1]) / 2 * k); g.scale(Math.max(1, Math.abs(b[0] - a[0]) / 2), Math.max(1, Math.abs(b[1] - a[1]) / 2)); g.arc(0, 0, k, 0, Math.PI * 2); g.restore(); }
    g.stroke();
  }
  // Traços → pilha do que está visível (desfazer tira do fim, refazer devolve, limpar é um marco).
  function stackOf(list) {
    const stack = [];
    let redo = [];
    for (let i = 0; i < list.length; i++) {
      const op = list[i];
      if (op.t === 's') {
        const top = stack[stack.length - 1];
        if (top && top.t === 's' && top.id === op.id) top.p = top.p.concat(op.p);
        else { stack.push({ t: 's', id: op.id, c: op.c, w: op.w, p: op.p.slice() }); redo = []; }
      } else if (op.t === 'f' || op.t === 'c') { stack.push(op); redo = []; }
      else if (op.t === 'u') { if (stack.length) redo.push(stack.pop()); }
      else if (op.t === 'y') { if (redo.length) stack.push(redo.pop()); }
    }
    return { stack, redo };
  }
  function paint(g, stack, size, k) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size);
    let from = 0;
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].t === 'c') { from = i + 1; break; }
    for (let i = from; i < stack.length; i++) drawOp(g, stack[i], k);
  }

  // ---------- quem assiste: segue os traços que o servidor manda ----------
  // sync(board, askFull): board = { turn, seq, from, ops }. Se faltou um pedaço, chama askFull() (no máximo 1x/s).
  function viewer(canvas, size) {
    if (!size) size = SIZE;
    canvas.width = size; canvas.height = size;
    const g = canvas.getContext('2d'), k = size / SIZE;
    const v = { canvas, turn: null, seq: 0, stack: [], redo: [], lastAsk: 0 };
    function repaint() { paint(g, v.stack, size, k); }
    function reset() { v.seq = 0; v.stack = []; v.redo = []; repaint(); }
    function apply(op) {
      const top = v.stack[v.stack.length - 1];
      if (op.t === 's') {
        if (top && top.t === 's' && top.id === op.id) {   // continuação do traço: desenha só o pedaço novo
          const n = top.p.length;
          drawOp(g, { t: 's', c: op.c, w: op.w, p: [top.p[n - 2], top.p[n - 1]].concat(op.p) }, k);
          top.p = top.p.concat(op.p);
        } else { v.stack.push({ t: 's', id: op.id, c: op.c, w: op.w, p: op.p.slice() }); v.redo = []; drawOp(g, op, k); }
      } else if (op.t === 'f') { v.stack.push(op); v.redo = []; drawOp(g, op, k); }
      else if (op.t === 'c') { v.stack.push(op); v.redo = []; g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); }
      else if (op.t === 'u') { if (v.stack.length) { v.redo.push(v.stack.pop()); repaint(); } }
      else if (op.t === 'y') { if (v.redo.length) { const r = v.redo.pop(); v.stack.push(r); if (r.t === 'c') { g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); } else drawOp(g, r, k); } }
    }
    v.sync = (b, askFull) => {
      if (!b) return;
      if (v.turn !== b.turn) { v.turn = b.turn; reset(); }
      if (b.from > v.seq) {
        if (askFull && Date.now() - v.lastAsk > 1000) { v.lastAsk = Date.now(); askFull(); }
        return;
      }
      for (let i = v.seq - b.from; i < b.ops.length; i++) apply(b.ops[i]);
      v.seq = Math.max(v.seq, b.from + b.ops.length);
    };
    v.reset = reset;
    // Usado para refazer o quadro num canvas novo (a tela foi redesenhada) sem pedir nada ao servidor.
    v.adopt = old => { v.turn = old.turn; v.seq = old.seq; v.stack = old.stack; v.redo = old.redo; repaint(); };
    repaint();
    return v;
  }

  // ---------- quem desenha ----------
  // opts.send(ops): manda um lote de traços. opts.onChange(): a pilha mudou (ex.: liberar o botão desfazer).
  // Regras do modo Caos (setRules): gigante, cores, semborracha, umtraco. O servidor confere as mesmas.
  function pad(cv, opts) {
    const g = cv.getContext('2d');
    cv.width = SIZE; cv.height = SIZE;
    const P = { tool: 'pen', color: '#111111', size: 8, rules: null, locked: false };
    let ops = [], pending = [], nextId = 1, stroke = null, sentUpTo = 0, snap = null, p0 = null, last = null, drawing = false;
    const W = () => { let w = P.tool === 'eraser' ? P.size * 3 : P.size; if (P.rules === 'gigante') w = Math.max(w, BIG_W); return w; };
    const C = () => (P.tool === 'eraser' ? '#ffffff' : P.color);
    const repaint = () => paint(g, stackOf(ops).stack, SIZE, 1);
    const push = op => { ops.push(op); pending.push(op); };
    const changed = () => { if (opts.onChange) opts.onChange(); };
    function flush() {
      if (stroke && stroke.p.length > sentUpTo) {          // pedaço novo do traço em andamento
        const p = stroke.p.slice(sentUpTo, sentUpTo + MAX_PTS);
        sentUpTo += p.length;
        push({ t: 's', id: stroke.id, c: stroke.c, w: stroke.w, p });
      }
      while (pending.length) opts.send(pending.splice(0, MAX_BATCH));
    }
    const flushT = setInterval(flush, FLUSH_MS);
    const pos = e => {
      const r = cv.getBoundingClientRect();
      return [Math.round(Math.max(0, Math.min(SIZE, (e.clientX - r.left) / r.width * SIZE))), Math.round(Math.max(0, Math.min(SIZE, (e.clientY - r.top) / r.height * SIZE)))];
    };
    const seg = (a, b) => drawOp(g, { t: 's', c: C(), w: W(), p: [a[0], a[1], b[0], b[1]] }, 1);
    function down(e) {
      e.preventDefault();
      if (P.locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      drawing = true; p0 = last = pos(e);
      if (P.tool === 'pen' || P.tool === 'eraser') {
        stroke = { id: nextId++, c: C(), w: W(), p: [p0[0], p0[1]] }; sentUpTo = 0;
        drawOp(g, stroke, 1);
        flush();                                          // o primeiro ponto sai na hora: quem assiste vê o pingo
      } else snap = g.getImageData(0, 0, SIZE, SIZE);
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = pos(e);
      if (stroke) { if (p[0] === last[0] && p[1] === last[1]) return; seg(last, p); stroke.p.push(p[0], p[1]); last = p; }
      else { g.putImageData(snap, 0, 0); drawOp(g, { t: 'f', k: KIND[P.tool], c: C(), w: W(), a: p0, b: p }, 1); }   // prévia da forma
    }
    function up(e) {
      if (!drawing) return;
      drawing = false;
      if (stroke) { flush(); stroke = null; if (P.rules === 'umtraco') P.locked = true; }
      else {
        const b = e && e.clientX !== undefined ? pos(e) : last;
        g.putImageData(snap, 0, 0); snap = null;
        const op = { t: 'f', id: nextId++, k: KIND[P.tool], c: C(), w: W(), a: p0, b };
        drawOp(g, op, 1); push(op); flush();
      }
      changed();
    }
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', e => { if (drawing && stroke) up(e); });
    repaint();

    const api = {
      get tool() { return P.tool; }, get color() { return P.color; }, get size() { return P.size; },
      get locked() { return P.locked; }, get rules() { return P.rules; },
      set(o) { if (o.tool) P.tool = o.tool; if (o.color) { P.color = o.color; if (P.tool === 'eraser') P.tool = 'pen'; } if (o.size) P.size = o.size; changed(); },
      canUndo() { return P.rules !== 'semborracha' && P.rules !== 'umtraco' && stackOf(ops).stack.length > 0; },
      canRedo() { return P.rules !== 'semborracha' && P.rules !== 'umtraco' && stackOf(ops).redo.length > 0; },
      canErase() { return P.rules !== 'semborracha' && P.rules !== 'umtraco'; },
      undo() { if (api.canUndo()) { push({ t: 'u' }); repaint(); flush(); changed(); } },
      redo() { if (api.canRedo()) { push({ t: 'y' }); repaint(); flush(); changed(); } },
      clear() { if (api.canErase()) { push({ t: 'c' }); repaint(); flush(); changed(); } },
      // Regras do modo Caos para esta vez (null = nenhuma). colors: as três cores liberadas no modo "cores".
      setRules(r, colors) {
        P.rules = r || null;
        if (P.rules === 'umtraco' || P.rules === 'semborracha') P.tool = 'pen';
        if (P.rules === 'gigante') P.size = BIG_W;
        if (P.rules === 'cores' && colors && colors.length && colors.indexOf(P.color) < 0) P.color = colors[0];
        P.locked = P.rules === 'umtraco' && ops.some(o => o.t === 's');
        changed();
      },
      // O celular recarregou no meio da vez: refaz o quadro com o que o servidor já tem.
      load(list) {
        ops = Array.isArray(list) ? list.slice() : []; pending = []; stroke = null;
        for (let i = 0; i < ops.length; i++) if (ops[i].id >= nextId) nextId = ops[i].id + 1;   // id novo não pode colar num traço antigo
        P.locked = P.rules === 'umtraco' && ops.some(o => o.t === 's');
        repaint(); changed();
      },
      flush,
      destroy() { flush(); clearInterval(flushT); cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); },
    };
    return api;
  }

  return { SIZE, BIG_W, drawOp, stackOf, paint, viewer, pad };
})();
