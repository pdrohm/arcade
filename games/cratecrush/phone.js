// Celular do Crate Crush: o controle vem pronto do shell dos jogos de arena.
(() => {
  const go = () => window.BashPhone.register('cratecrush', { title: 'CRATE CRUSH', color: '#e8a33d' });
  if (window.BashPhone) go(); else { const s = document.createElement('script'); s.src = '/shared/bash/phone.js'; s.onload = go; document.head.appendChild(s); }
})();
