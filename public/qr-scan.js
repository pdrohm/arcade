// Ler o QR da TV com a câmera do celular.
// Só o celular carrega este arquivo (a TV nunca), então pode usar JS moderno.
//
// Dois jeitos de decodificar, nesta ordem:
//   1. BarcodeDetector — vem no próprio Chrome do Android, não baixa nada e é o mais rápido.
//   2. jsQR (public/vendor/jsqr.js) — 250 kB, baixado só na hora em que o primeiro
//      jeito não existe (iPhone, Firefox). Fica em cache depois da primeira vez.
//
// A câmera só abre em "origem segura": https, localhost ou 127.0.0.1. O IP do Wi-Fi de casa
// (http://192.168.x.x) NÃO conta, e nesse caso o browser nem cria navigator.mediaDevices.
// Quem chega pelo endereço da internet (https) tem o botão; quem chega pelo IP do Wi-Fi não vê
// botão nenhum (index.html esconde) e usa a câmera normal do celular, que não é página web e lê
// o QR do mesmo jeito.
'use strict';
window.QRSCAN = (() => {
  const SEGURO = window.isSecureContext !== false;
  const TEM_CAMERA = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const disponivel = () => SEGURO && TEM_CAMERA;

  // O QR da TV é um endereço tipo http://casa:3000/ABCD. Aceitamos só o formato de sala:
  // nada de mandar o celular para um endereço qualquer que alguém tenha colado por aí.
  const ROOM_RE = /^\/(?:tv\/)?([a-z0-9]{4})\/?$/i;
  function codigoDe(texto) {
    const s = String(texto || '').trim();
    if (/^[a-z0-9]{4}$/i.test(s)) return s.toUpperCase();
    let u;
    try { u = new URL(s); } catch (err) { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const m = u.pathname.match(ROOM_RE);
    return m ? m[1].toUpperCase() : null;
  }

  let aberto = null;   // { fechar } enquanto a câmera está ligada

  // Carrega o jsQR uma vez só e devolve sempre a mesma promessa.
  let jsqrP = null;
  function carregarJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (jsqrP) return jsqrP;
    jsqrP = new Promise((ok, falhou) => {
      const s = document.createElement('script');
      s.src = '/vendor/jsqr.js';
      s.onload = () => (window.jsQR ? ok(window.jsQR) : falhou(new Error('jsQR não carregou')));
      s.onerror = () => { jsqrP = null; falhou(new Error('jsQR não carregou')); };
      document.head.appendChild(s);
    });
    return jsqrP;
  }

  // Devolve uma função ler(video, canvas) -> texto ou null.
  function leitor() {
    const Nativo = window.BarcodeDetector;
    const nativoP = Nativo && Nativo.getSupportedFormats
      ? Nativo.getSupportedFormats().then(fs => (fs.indexOf('qr_code') >= 0 ? new Nativo({ formats: ['qr_code'] }) : null)).catch(() => null)
      : Promise.resolve(null);
    return nativoP.then(det => {
      if (det) return video => det.detect(video).then(cs => (cs && cs.length ? cs[0].rawValue : null)).catch(() => null);
      return carregarJsQR().then(jsQR => (video, canvas) => {
        // A imagem da câmera é grande demais para decodificar 8x por segundo: encolhe para 480 px de largura.
        const larg = Math.min(480, video.videoWidth || 0);
        if (!larg) return null;
        const alt = Math.round(larg * (video.videoHeight / video.videoWidth));
        if (canvas.width !== larg) { canvas.width = larg; canvas.height = alt; }
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, larg, alt);
        const r = jsQR(ctx.getImageData(0, 0, larg, alt).data, larg, alt, { inversionAttempts: 'dontInvert' });
        return r && r.data ? r.data : null;
      });
    });
  }

  function motivo(err) {
    const n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Você precisa deixar o Arcade usar a câmera. Abra os ajustes do site e libere a câmera.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Não achei nenhuma câmera neste aparelho.';
    if (n === 'NotReadableError') return 'A câmera está ocupada por outro aplicativo. Feche o outro e tente de novo.';
    return 'Não consegui abrir a câmera. Digite o código da TV.';
  }

  // Abre a tela cheia da câmera. Chama aoLer(codigo) quando encontra um QR de sala.
  function open(aoLer) {
    if (aberto) return;
    const tela = document.createElement('div');
    tela.className = 'qrs';
    tela.innerHTML =
      '<div class="qrs-cam"><video playsinline muted autoplay></video><div class="qrs-mira"></div></div>' +
      '<div class="qrs-baixo"><p class="qrs-msg">Abrindo a câmera…</p>' +
      '<button class="btn ghost qrs-fechar" type="button">Cancelar</button></div>';
    document.body.appendChild(tela);
    const video = tela.querySelector('video');
    const msg = tela.querySelector('.qrs-msg');
    const canvas = document.createElement('canvas');
    let parado = false, timer = null, fluxo = null;

    function fechar() {
      if (parado) return;
      parado = true;
      aberto = null;
      if (timer) clearTimeout(timer);
      if (fluxo) fluxo.getTracks().forEach(t => t.stop());
      video.srcObject = null;
      tela.remove();
    }
    aberto = { fechar };
    tela.querySelector('.qrs-fechar').onclick = fechar;

    if (!disponivel()) {
      msg.textContent = SEGURO
        ? 'Este browser não abre a câmera aqui dentro. Use a câmera normal do celular no QR da TV.'
        : 'Neste endereço o browser não entrega a câmera para a página. Saia daqui e aponte a câmera normal do celular para o QR da TV: ela abre a sala sozinha.';
      tela.querySelector('.qrs-cam').style.display = 'none';
      return;
    }

    // facingMode "environment" pede a câmera de trás; se o aparelho só tem uma, usa a que tem.
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(s => {
        if (parado) { s.getTracks().forEach(t => t.stop()); return Promise.reject(new Error('cancelado')); }
        fluxo = s;
        video.srcObject = s;
        msg.textContent = 'Aponte para o QR code da TV.';
        return video.play().catch(() => {}).then(leitor);
      })
      .then(ler => {
        if (parado || !ler) return;
        const passo = () => {
          if (parado) return;
          Promise.resolve()
            .then(() => (video.readyState >= 2 ? ler(video, canvas) : null))
            .then(texto => {
              if (parado) return;
              const codigo = texto ? codigoDe(texto) : null;
              if (codigo) { fechar(); return aoLer(codigo); }
              if (texto) msg.textContent = 'Esse QR não é de uma sala do Arcade.';
              timer = setTimeout(passo, 120);
            })
            .catch(() => { if (!parado) timer = setTimeout(passo, 300); });
        };
        passo();
      })
      .catch(err => {
        if (parado || (err && err.message === 'cancelado')) return;
        msg.textContent = motivo(err);
        tela.querySelector('.qrs-cam').style.display = 'none';
      });
  }

  return { open, disponivel, codigoDe, fechar: () => { if (aberto) aberto.fechar(); } };
})();
