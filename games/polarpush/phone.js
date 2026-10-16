(() => {
  const go = () => window.BashPhone.register('polarpush', { title: 'POLAR PUSH', color: '#7dd3fc' });
  if (window.BashPhone) go(); else { const s = document.createElement('script'); s.src = '/shared/bash/phone.js'; s.onload = go; document.head.appendChild(s); }
})();
