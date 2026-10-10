// Jogo de fora: um jogo de navegador de outro site, aberto na TV (um PC com Chrome atual),
// com o celular de controle. Serve para qualquer jogo que leia o controle pela Gamepad API.
//
// Para pôr um jogo novo no arcade, crie games/<id>/game.js com só a configuração:
//   module.exports = require('../../shared/ext/game')({ id, name, emoji, upstream, pads, needs, ... });
// O resto é comum a todos:
//   - o servidor faz de proxy em /ext/<id>/ (o jogo abre pelo nosso endereço: ver server.js);
//   - shared/ext/inject.js entra na página do jogo e cria os controles virtuais;
//   - shared/ext/tv.js abre o jogo na TV; shared/ext/phone.js desenha o controle no celular.
//
// Vagas (pads): quantos controles o jogo aceita ao mesmo tempo (1 = só o jogador 1).
// Se a sala tem mais gente que vagas, os primeiros pegam o controle e qualquer um troca
// quem joga pelo celular.
'use strict';
const crypto = require('crypto');

const BUTTONS = 17;           // botões do controle padrão (Gamepad API "standard")
const STALE_MS = 1500;        // celular sem sinal: solta tudo o que estava apertado

function externalGame(cfg) {
  const pads = Math.max(1, Math.min(4, cfg.pads || 1));
  const ext = { upstream: String(cfg.upstream).replace(/\/+$/, ''), needs: cfg.needs || null, pads };
  return {
    ext,
    meta: {
      id: cfg.id, name: cfg.name, emoji: cfg.emoji || '🎮',
      tagline: cfg.tagline || 'Jogo de navegador na TV. Seu celular é o controle.',
      art: cfg.art,
      minPlayers: 1, maxPlayers: pads, spectators: true,   // sala cheia pode: os outros esperam a vez
      howTo: cfg.howTo || [
        'A TV precisa ser um computador com o Chrome atualizado.',
        pads > 1 ? `Até ${pads} pessoas jogam ao mesmo tempo. Cada celular vira um controle.` : 'Uma pessoa joga por vez. O celular dela vira o controle.',
        'Para trocar quem joga, toque em 👥 no celular e escolha a pessoa.',
      ],
    },
    create(api) {
      const matchId = crypto.randomUUID();
      const blank = () => ({ b: 0, a: [0, 0, 0, 0] });
      let seats = Array(pads).fill(null);           // pid de quem está em cada controle
      const state = seats.map(blank);               // o que cada controle está apertando agora
      const at = seats.map(() => 0);                // último sinal de cada controle

      const seatOf = pid => (pid ? seats.indexOf(pid) : -1);
      function release(i) { if (i < 0) return; seats[i] = null; state[i] = blank(); }
      // Vagas livres vão para quem ainda não joga, na ordem de entrada (quem está online primeiro).
      function autoSeat() {
        const free = api.players.filter(p => seatOf(p.pid) < 0).sort((x, y) => (y.on !== false) - (x.on !== false));
        for (let i = 0; i < pads && free.length; i++) if (!seats[i]) seats[i] = free.shift().pid;
      }
      const pub = pid => { const p = pid && api.byPid(pid); return p ? { pid: p.pid, name: p.name, color: p.color, av: p.av, on: p.on } : null; };

      // Celular que parou de mandar (bloqueou a tela, perdeu a rede): o boneco não fica andando sozinho.
      const watch = setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (let i = 0; i < pads; i++) {
          if ((state[i].b || state[i].a.some(v => v)) && now - at[i] > STALE_MS) { state[i] = blank(); changed = true; }
        }
        if (changed) api.stream();
      }, 500);

      return {
        start() { autoSeat(); },
        view(me, type) {
          const out = { matchId, pads, seats: seats.map(pub) };
          if (type === 'tv') { out.state = state; out.path = `/ext/${cfg.id}/`; out.needs = ext.needs; }
          else out.mine = me ? seatOf(me.pid) : -1;
          return out;
        },
        action(p, msg) {
          if (msg.t === 'seat') {                   // pôr alguém (você ou outra pessoa) num controle
            const slot = Number(msg.slot);
            const who = api.byPid(String(msg.pid || ''));
            if (!Number.isInteger(slot) || slot < 0 || slot >= pads || !who) return;
            release(seatOf(who.pid));
            release(slot);
            seats[slot] = who.pid;
            api.setEvent(`${who.name} pegou o controle${pads > 1 ? ' ' + (slot + 1) : ''}.`, who.color);
          } else if (msg.t === 'unseat') {          // largar o controle (ou tirar alguém dele)
            const slot = Number(msg.slot);
            if (Number.isInteger(slot) && slot >= 0 && slot < pads) release(slot);
          }
        },
        input(p, msg) {
          const i = seatOf(p.pid);
          if (i < 0) return;
          const a = Array.isArray(msg.a) ? msg.a : [];
          const axis = v => { const n = Number(v); return Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0; };
          state[i] = { b: (Number(msg.b) >>> 0) & ((1 << BUTTONS) - 1), a: [axis(a[0]), axis(a[1]), axis(a[2]), axis(a[3])] };
          at[i] = Date.now();
          api.stream();
        },
        onPlayerJoin() { autoSeat(); },
        onPlayerLeave(pid) { release(seatOf(pid)); autoSeat(); },
        rekey(oldPid, newPid) { const i = seatOf(oldPid); if (i >= 0) seats[i] = newPid; },
        destroy() { clearInterval(watch); },
        serialize() { return { seats }; },
        restore(d) {
          if (!d || !Array.isArray(d.seats)) return;
          seats = seats.map((_, i) => (d.seats[i] && api.byPid(d.seats[i]) ? d.seats[i] : null));
        },
      };
    },
  };
}

externalGame.BUTTONS = BUTTONS;
module.exports = externalGame;
