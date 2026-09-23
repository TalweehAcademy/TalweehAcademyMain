/* ═══ Wāḥa Forest — ʿĀlimiyyah helpers shared by the alimiyyah-waha-*.html mockups ═══
   Needs alimiyyah-data.js and waha-quran.js. The copy is the live page's (src/pages/alimiyyah.jsx). */
(function () {
  const A = window.ALIM;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ORD = ['الأُولَى', 'الثَّانِيَة', 'الثَّالِثَة', 'الرَّابِعَة', 'الخَامِسَة', 'السَّادِسَة', 'السَّابِعَة', 'الثَّامِنَة', 'التَّاسِعَة', 'العَاشِرَة'];
  const yearAr = (n) => `السَّنَةُ ${ORD[n - 1]}`;
  const fam = (k) => A.FAMILIES.find((f) => f.k === k);
  const total = A.YEARS.reduce((n, y) => n + y.subjects.length, 0);
  const famCount = (y, k) => y.subjects.filter((s) => s.fam === k).length;

  // A subject: title, detail line, discipline chip coloured by family.
  const subject = (s, { num } = {}) => `<li class="asub f-${s.fam}">${num != null ? `<span class="asub-n">${String(num).padStart(2, '0')}</span>` : ''}<div><strong>${esc(s.t)}</strong>${s.d ? `<small>${esc(s.d)}</small>` : ''}</div><span class="adisc">${esc(s.disc)}</span></li>`;
  // Family legend / filter chips.
  const famChips = (on = '', { counts } = {}) => `<button type="button" class="chip${!on ? ' on' : ''}" data-fam="">All subjects${counts ? `<b>${total}</b>` : ''}</button>` +
    A.FAMILIES.map((f) => `<button type="button" class="chip fchip f-${f.k}${on === f.k ? ' on' : ''}" data-fam="${f.k}"><i></i>${esc(f.label)}${counts ? `<b>${A.YEARS.reduce((n, y) => n + famCount(y, f.k), 0)}</b>` : ''}</button>`).join('');

  // Sections that every variation shares, in the live page's words.
  const BENEFITS = [['01 / Connect', 'Learn together, live', 'Interactive classes connect you with real-time instruction and opportunities to engage with your learning.'], ['02 / Revisit', 'Make room for study', 'High-quality recorded lessons support flexible learning at your own pace. Recordings are available for selected sessions.'], ['03 / Serve', 'Study with purpose', 'Connect the depth of the traditional curriculum with practical, contemporary applications and the needs of Muslim communities in the West.']];
  const benefits = () => `<section class="abenefits" data-stagger>${BENEFITS.map(([k, h, p]) => `<article class="card"><span class="kicker">${k}</span><h3>${h}</h3><p>${p}</p></article>`).join('')}</section>`;
  const mission = () => `<section class="amission"><div data-r><span class="kicker">More than academic achievement</span><h2>Sound scholarship.<br /><em>Exemplary character.</em></h2></div>
    <div data-r><p>Talweeh Academy’s seminary prepares students to grow as grounded scholars, educators, researchers, and community leaders—equipped to address the intellectual and spiritual needs of their communities.</p><p>Its vision brings knowledge and character together. True scholarship calls for sound knowledge, righteous action, discipline, self-purification, and refined Islamic etiquette.</p></div></section>`;
  const VAL_AR = { 'ʿIlm': 'عِلْم', 'ʿAmal': 'عَمَل', Discipline: 'اِنْضِبَاط', Tazkiyah: 'تَزْكِيَة', Adab: 'أَدَب' };
  const values = (cls = '') => `<section class="avalues ${cls}" aria-label="The five foundations of our approach" data-stagger>${A.VALUES.map((v, i) => `<article><span class="vi">0${i + 1}</span><span class="va">${VAL_AR[v.term] || ''}</span><p class="vt">${esc(v.term)}</p><h3>${esc(v.title)}</h3><p>${esc(v.body)}</p></article>`).join('')}</section>`;
  const apply = () => `<section class="aapply" data-r><div class="ar">وَقُلْ رَبِّ زِدْنِي عِلْمًا</div><span class="kicker">Begin with intention</span><h2>Your path to knowledge<br />starts with a first step.</h2><p>Applications are now open. Explore the curriculum and complete the application form to learn more about joining the seminary.</p><div class="acts"><a class="btn btn-g" href="${A.APPLY}" target="_blank" rel="noreferrer">Apply to Talweeh Academy →</a><a class="btn btn-glass" href="${A.ENROL}">For enrollment</a></div></section>`;
  const facts = [['Duration', 'Full year'], ['Format', 'Online · Part-time'], ['Learning', 'Live + recorded lessons']];

  window.WahaAlim = { A, esc, ORD, yearAr, fam, total, famCount, subject, famChips, benefits, mission, values, apply, facts, VAL_AR };
})();
