/* ═══ Wāḥa Forest — shared behaviour for the Qurʾān page mockups ═══
   Injects the site top bar, header and footer (placeholders #waha-top / #waha-foot),
   and wires the light/dark toggle, scroll reveals and a few helpers. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LOGO = '../public/brand/talweeh-arabic-gold-ui.webp';
  const SOCIAL = {
    'X / Twitter': 'M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z',
    YouTube: 'M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15V9l5.8 3-5.8 3z',
    Telegram: 'M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.1l-4.8-1.5c-1-.3-1.1-1 .2-1.6L20.5 2.8c.9-.3 1.7.2 1.4 1.5z',
  };
  const SOCIAL_HREF = { 'X / Twitter': 'https://x.com/Talweeh_Academy', YouTube: 'https://www.youtube.com/@Talweeh.Academy', Telegram: 'https://t.me/talweeh_academy', Instagram: 'https://www.instagram.com/talweeh.academy/' };
  const socials = () => '<div class="socials">' + Object.entries(SOCIAL).filter(([l]) => SOCIAL_HREF[l]).map(([l, d]) => `<a href="${SOCIAL_HREF[l]}" target="_blank" rel="noreferrer" aria-label="${l}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></a>`).join('') + '</div>';

  // Which nav item is highlighted: <body data-nav="Courses">. Defaults to Quran.
  const ACTIVE = document.body.dataset.nav || 'Quran';
  // Media menu opens the media layout named by <body data-media="…"> (default Riwāq).
  const MEDIA_HUB = document.body.dataset.media || 'media-waha-riwaq.html';
  const NAV = [['Quran', 'quran-waha-index.html'], ['Courses', 'courses-waha-maktabah.html', 1], ['Media', MEDIA_HUB, 1], ['Alimiyyah', document.body.dataset.alim || 'alimiyyah-waha-minhaj.html'], ['Arabic', document.body.dataset.arabic || 'arabic-waha-lughah.html'], ['Hadith Specialization', document.body.dataset.hadith || 'hadith-waha-isnad.html'], ['About', '#', 1]];
  // Dropdown menus (same groups as the site's navLinks in src/pages/_shared.jsx).
  const LIB = 'courses-waha-combined.html';
  const mcat = (label, slug) => [label, `${MEDIA_HUB}?cat=${slug}`];
  const cat = (label, slug) => [label, `${LIB}?cat=${slug}`];
  const MENUS = {
    Courses: [
      ['Browse courses', [['All Courses', LIB], ['Live · Alimiyyah', '#'], ['On Demand', LIB + '?access=paid'], ['Free', LIB + '?access=free'], ['Specialization', '#']]],
      ['On-Demand Subjects', [cat('Fiqh', 'fiqh'), cat('Uṣūl al-Fiqh', 'usul-al-fiqh'), cat('Ḥadīth', 'hadith'), cat('Ḥadīth Sciences', 'hadith-sciences'), cat('ʿAqīdah & Uṣūl al-Dīn', 'aqidah-usul-al-din')]],
      ['Language, Qurʾān & Adab', [cat('Arabic Language', 'arabic-language'), cat('Naḥw & Ṣarf', 'nahw-sarf'), cat('Qurʾān & Tafsīr', 'quran-tafsir'), cat('Tajwīd', 'tajwid'), cat('Adab, Akhlāq & Tazkiyah', 'adab-akhlaq-tazkiyah')]],
    ],
  };
  MENUS.Media = [
    ['Media library', [['All media', MEDIA_HUB], ['Watch page', 'media-waha-majlis.html'], ['Articles', '#']]],
    ['Topics', [mcat('Uṣūl al-Ḥadīth', 'usul-al-hadith'), mcat('Uṣūl al-Fiqh', 'usul-al-fiqh'), mcat('Fiqh', 'fiqh'), mcat('Arabic', 'arabic')]],
    ['Reminders', [mcat('Tips for Students', 'tips-for-students'), mcat('General Naṣīḥah', 'general-naseeha'), mcat('Podcasts', 'podcasts')]],
  ];
  const top = $('#waha-top');
  if (top) top.outerHTML = `
<div class="aurora" aria-hidden="true"><i></i><i></i></div>
<div class="topbar"><div class="wrap"><a class="portal" href="https://legacy.talweehacademy.com">Legacy Portal →</a><div class="tr"><span>Connect</span>${socials()}</div></div></div>
<header class="site-head"><div class="bar glass">
  <a class="brand" href="landing-waha-forest.html"><img src="${LOGO}" alt="" /><span class="wm"><strong>Talweeh Academy</strong><small>Structured Islamic Academia</small></span></a>
  <nav class="nav">${NAV.map(([l, href, caret]) => MENUS[l]
    ? `<div class="dd-nav"><button type="button" class="${l === ACTIVE ? 'on' : ''}" aria-expanded="false" aria-haspopup="true">${l} <span class="caret">▾</span></button><div class="dd-panel glass">${MENUS[l].map(([h, links]) => `<section><h6>${h}</h6>${links.map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</section>`).join('')}</div></div>`
    : `<a${l === ACTIVE ? ' class="on"' : ''} href="${href}">${l}${caret ? ' <span class="caret">▾</span>' : ''}</a>`).join('')}</nav>
  <button class="theme-btn" id="themeBtn" type="button" aria-label="Switch to dark mode" title="Light / dark"><span class="moon">☾</span><span class="sun">☀</span></button>
  <a class="btn btn-g head-cta" href="https://legacy.talweehacademy.com">Legacy Portal</a>
</div></header>`;

  const foot = $('#waha-foot');
  if (foot) foot.outerHTML = `
<footer><div class="wrap">
  <div class="fg"><div class="fb"><img src="assets/talweeh-seal-gold.png" alt="Talweeh Academy seal" /><div><strong>Talweeh Academy</strong><span>Structured Islamic Academia</span><p>Study with clarity, structure, and purpose.</p></div></div>
  <div class="fcol"><h5>Explore</h5><a href="#">Courses</a><a href="#">Arabic</a><a href="#">Quran</a><a href="#">Alimiyyah</a></div>
  <div class="fcol"><h5>Academy</h5><a href="#">About Us</a><a href="#">Instructors</a><a href="#">Articles</a></div>
  <div class="fcol"><h5>Student</h5><a href="https://legacy.talweehacademy.com">Legacy Portal</a><a href="#">Contact</a><a href="#">Terms &amp; Conditions</a></div>
  <div class="fcol"><h5>Follow Talweeh</h5>${socials()}</div></div>
  <div class="fbot"><span>© All rights reserved by Talweeh Academy 2025</span><button class="totop" type="button" onclick="scrollTo({top:0,behavior:'smooth'})" aria-label="Scroll to top">↑</button></div>
</div></footer>`;

  /* light / dark — same key as landing-waha-forest.html */
  const root = document.documentElement, KEY = 'talweeh-waha-forest-theme', btn = $('#themeBtn');
  const apply = (t) => { if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme'); btn && btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); };
  apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  btn && btn.addEventListener('click', () => { const t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; apply(t); try { localStorage.setItem(KEY, t); } catch (e) {} });

  /* dropdowns: open on hover (desktop) or click; Esc / outside click closes */
  $$('.dd-nav').forEach((d) => {
    const b = d.querySelector('button'), set = (o) => { d.classList.toggle('open', o); b.setAttribute('aria-expanded', o); };
    b.addEventListener('click', (e) => { e.stopPropagation(); set(!d.classList.contains('open')); });
    d.addEventListener('mouseenter', () => matchMedia('(hover:hover)').matches && set(true));
    d.addEventListener('mouseleave', () => matchMedia('(hover:hover)').matches && set(false));
    document.addEventListener('click', (e) => { if (!d.contains(e.target)) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  });

  /* header shadow once scrolled */
  const head = $('.site-head');
  const onScroll = () => head && head.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* helpers for the page scripts */
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  window.Waha = {
    $, $$,
    arNum: (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]),
    marker: (n) => `<span class="am" aria-label="Ayah ${n}"><span>${String(n).replace(/\d/g, (d) => AR_DIGITS[d])}</span></span>`,
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    surah: (n) => { const s = window.QURAN_SURAHS[n - 1]; return { n: s[0], ar: s[1], en: s[2], meaning: s[3], ayahs: s[4], type: s[5] }; },
    /* call after the page has rendered its dynamic content */
    reveal() {
      $$('[data-stagger]').forEach((p) => [...p.children].forEach((c, i) => c.style.setProperty('--i', i)));
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -8% 0px' });
      $$('[data-r]:not(.in),[data-stagger]:not(.in)').forEach((el) => io.observe(el));
    },
    /* open/close a drawer with the shared overlay */
    drawer(id, open) {
      const d = $('#' + id), o = $('#overlay');
      $$('.drawer.open').forEach((x) => x !== d && x.classList.remove('open'));
      d.classList.toggle('open', open); o && o.classList.toggle('open', open);
    },
    /* fake recitation: steps through ayahs, highlighting each — mockup only, no audio */
    player({ onAyah, count, label }) {
      const el = $('#player'), pp = $('#pp'), prog = $('#prog i'), now = $('#nowAyah');
      let i = 0, t = null, playing = false;
      const icon = () => { pp.innerHTML = playing ? '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>'; };
      const paint = () => { now.textContent = label(i + 1); prog.style.width = ((i + 1) / count * 100) + '%'; onAyah(i + 1); };
      const tick = () => { i = (i + 1) % count; paint(); };
      const api = {
        play(from) { if (from) i = from - 1; el.classList.remove('off'); playing = true; clearInterval(t); t = setInterval(tick, 3200); paint(); icon(); },
        pause() { playing = false; clearInterval(t); icon(); },
        toggle() { playing ? api.pause() : api.play(); },
        get playing() { return playing; }, get ayah() { return i + 1; },
      };
      pp.addEventListener('click', api.toggle); icon();
      return api;
    },
  };

  /* Esc closes any open drawer */
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { $$('.drawer.open').forEach((d) => d.classList.remove('open')); $('#overlay')?.classList.remove('open'); } });
  document.addEventListener('click', (e) => { if (e.target.id === 'overlay') { $$('.drawer.open').forEach((d) => d.classList.remove('open')); e.target.classList.remove('open'); } });
})();
