/* ═══ Wāḥa Forest — media helpers shared by the media-waha-*.html mockups ═══
   Needs media-data.js, waha-quran.js and waha-courses.js (for esc + WahaPlayer). */
(function () {
  const { esc } = window.WahaCourses;
  const MEDIA = window.MEDIA;
  const AR = { 'usul-al-hadith': 'أُصُولُ الحَدِيث', 'usul-al-fiqh': 'أُصُولُ الفِقْه', fiqh: 'الفِقْه', arabic: 'العَرَبِيَّة', 'tips-for-students': 'نَصَائِح', 'general-naseeha': 'نَصِيحَة', podcasts: 'مَجَالِس' };
  const LABEL = { 'usul-al-hadith': 'Uṣūl al-Ḥadīth', 'usul-al-fiqh': 'Uṣūl al-Fiqh', fiqh: 'Fiqh', arabic: 'Arabic', 'tips-for-students': 'Tips for Students', 'general-naseeha': 'General Naṣīḥah', podcasts: 'Podcasts' };
  const CATS = window.MEDIA_CATEGORIES.filter((c) => c.slug !== 'all').map((c) => ({ slug: c.slug, label: LABEL[c.slug] || c.label, ar: AR[c.slug] || '' }));
  const catLabel = (slug) => (slug === 'all' ? 'All media' : LABEL[slug] || slug);
  const inCat = (m, cat) => !cat || cat === 'all' || m.cats.includes(cat);
  const count = (cat) => MEDIA.filter((m) => inCat(m, cat)).length;
  const speakers = [...new Set(MEDIA.map((m) => m.speaker))];
  const text = (m) => `${m.title} ${m.speaker} ${m.short} ${m.cats.map(catLabel).join(' ')} ${m.course ? m.course.title : ''}`.toLowerCase();
  function match(m, { cat = 'all', q = '', speaker = '', course = false } = {}) {
    if (!inCat(m, cat)) return false;
    if (speaker && m.speaker !== speaker) return false;
    if (course && !m.course) return false;
    const needle = q.trim().toLowerCase();
    return !needle || text(m).includes(needle);
  }
  const bySlug = (slug) => MEDIA.find((m) => m.slug === slug);
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const paras = (t) => String(t || '').split(/\n\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
  const watchUrl = (m) => `media-waha-majlis.html?v=${encodeURIComponent(m.slug)}`;
  const courseUrl = (c) => `course-waha-majlis.html?slug=${encodeURIComponent(c.slug)}`;
  const related = (m, n = 6) => MEDIA.filter((x) => x.slug !== m.slug && x.cats.some((c) => m.cats.includes(c))).slice(0, n);
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  const YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.1 7.2a2.8 2.8 0 0 0-2-2C16.3 4.7 12 4.7 12 4.7s-4.3 0-6.1.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 3.4 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.8.5 6.1.5 6.1.5s4.3 0 6.1-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-4.8 29 29 0 0 0-.5-4.8ZM10.2 15.4V8.6l5.8 3.4-5.8 3.4Z"/></svg>';
  const SUB = 'https://www.youtube.com/@Talweeh.Academy?sub_confirmation=1';

  // A video card: thumbnail, topic, title, speaker (and the course it comes from).
  const card = (m, { cls = '', tag = 'a' } = {}) => `
    <${tag} class="mc ${cls}" ${tag === 'a' ? `href="${watchUrl(m)}"` : 'type="button"'} data-v="${esc(m.slug)}">
      <span class="mc-th"><img src="${thumb(m.id)}" alt="" loading="lazy" /><span class="mc-pl">${PLAY}</span><span class="mc-now">Now playing</span></span>
      <span class="mc-b"><small>${esc(catLabel(m.cats[0]))}</small><strong>${esc(m.title)}</strong><span class="mc-sp">${esc(m.speaker)}</span>${m.course ? `<span class="mc-co">From ${esc(m.course.title)}</span>` : ''}</span>
    </${tag}>`;

  // "Taken from a course" call-out and the YouTube subscribe button.
  const courseCta = (m) => (m.course ? `<a class="mcta" href="${courseUrl(m.course)}"><span class="mcta-i">📜</span><span><small>Excerpt from the course</small><strong>${esc(m.course.title)}</strong></span><b>${m.course.free ? 'Watch free →' : 'View course →'}</b></a>` : '');
  const subscribe = `<a class="msub" href="${SUB}" target="_blank" rel="noreferrer">${YT}<span><strong>Subscribe</strong><small>Talweeh Academy</small></span></a>`;

  window.WahaMedia = { MEDIA, CATS, catLabel, count, speakers, match, bySlug, thumb, paras, watchUrl, courseUrl, related, card, courseCta, subscribe, PLAY, YT, SUB, esc };
})();
