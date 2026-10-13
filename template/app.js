(() => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* shared illustrations (box + truck) injected on every page */
  document.body.insertAdjacentHTML('afterbegin', `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <symbol id="box" viewBox="0 0 120 110">
      <polygon points="8,30 60,8 112,30 60,52" fill="#f0c07a"/>
      <polygon points="8,30 60,52 60,104 8,80" fill="#d9a05b"/>
      <polygon points="112,30 60,52 60,104 112,80" fill="#e8b36c"/>
      <polygon points="50,14 70,6 100,20 80,28" fill="#c9924f" opacity=".55"/>
      <polygon points="18,50 36,58 36,74 18,66" fill="#7fb6e8"/>
    </symbol>
    <symbol id="truck" viewBox="0 0 120 90">
      <rect x="4" y="14" width="68" height="46" rx="5" fill="#fff" stroke="#e3e3e6"/>
      <path d="M72 26h24l16 18v20H72z" fill="#e2412b"/><path d="M80 31h14l10 12H80z" fill="#cfe3f5"/>
      <rect x="8" y="60" width="104" height="8" fill="#b83221"/>
      <circle cx="30" cy="72" r="11" fill="#2b2b2e"/><circle cx="30" cy="72" r="4.5" fill="#bbb"/>
      <circle cx="92" cy="72" r="11" fill="#2b2b2e"/><circle cx="92" cy="72" r="4.5" fill="#bbb"/>
      <rect x="14" y="26" width="40" height="8" rx="4" fill="#f4673b" opacity=".85"/>
    </symbol></defs></svg>
    <div class="toast" id="toast"></div>`);

  const toast = msg => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 1600);
  };
  $$('[data-soon]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); toast(el.dataset.soon + ' coming soon'); }));
  $$('[data-back]').forEach(el => el.addEventListener('click', () => history.length > 1 ? history.back() : location.href = 'index.html'));

  const page = document.body.className;

  /* ================= HOME ================= */
  if (page === 'home') {
    const search = $('#searchInput');
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      $$('.recent').forEach(c => c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none');
    });
    $('#fab').addEventListener('click', () => { search.focus(); toast('Start a new delivery'); });
    $$('.tab[data-tab="Shipment"]').forEach(t => t.addEventListener('click', e => {
      e.preventDefault(); $('#recentList').scrollIntoView({behavior: 'smooth'});
      $$('.tab').forEach(x => x.classList.remove('active')); t.classList.add('active');
    }));
  }

  /* ================= TRACKING ================= */
  if (page === 'tracking') {
    const path = $('#routePath'), car = $('#car'), len = path.getTotalLength();
    let t = 0.04, dir = 1;
    const place = () => { const p = path.getPointAtLength(len * t); car.setAttribute('transform', `translate(${p.x} ${p.y})`); };
    place();
    setInterval(() => { t += 0.006 * dir; if (t > 0.55) dir = -1; if (t < 0.04) dir = 1; place(); }, 100);
    $('#callBtn').addEventListener('click', () => toast('Calling Khalid Omor…'));
  }

  /* ================= CHAT ================= */
  if (page === 'chat') {
    const msgs = $('#msgs'), input = $('#chatInput');
    const clock = () => new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
    const add = (text, who, time = clock()) => {
      const m = document.createElement('div'); m.className = 'm ' + who;
      if (who === 'them') m.innerHTML = '<div class="who2"><span class="avatar xs"></span>Khalid Omor</div>';
      const p = document.createElement('p'); p.textContent = text;
      const tm = document.createElement('time'); tm.textContent = time;
      m.append(p, tm); msgs.append(m); msgs.scrollTop = msgs.scrollHeight;
    };
    [['Hey Khalid, just checking - has my parcel left Riyadh yet?', 'me', '9:15 AM'],
     ["Yes, it's on the way now 🚚 I've just departed from Diriyah.", 'them', '9:18 AM'],
     ['Great! When can I expect the delivery?', 'me', '9:15 AM']].forEach(a => add(...a));

    const replies = {
      'share live location': 'Sharing my live location now 📍',
      'call courier': "Sure, I'll call you in a minute.",
      'delivery time update': 'Estimated arrival is tomorrow around 2:30 PM.'
    };
    const send = text => {
      text = text.trim(); if (!text) return;
      add(text, 'me'); input.value = '';
      setTimeout(() => add(replies[text.toLowerCase()] || 'Got it, thanks for the message!', 'them'), 900);
    };
    $('#composer').addEventListener('submit', e => { e.preventDefault(); send(input.value); });
    $$('#chips button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
    $('#callTop').addEventListener('click', () => toast('Calling Khalid Omor…'));
    $('#videoTop').addEventListener('click', () => toast('Starting video call…'));
  }
})();
