// Celular do BALLISTIX: o controle vem pronto de shared/bash/phone.js (analógico num eixo só + botões).
(() => {
  const go = () => window.BashPhone.register('ballistix', { title: 'Ballistix', color: '#ff8a1f' });
  if (window.BashPhone) go(); else { const s = document.createElement('script'); s.src = '/shared/bash/phone.js'; s.onload = go; document.head.appendChild(s); }
})();
