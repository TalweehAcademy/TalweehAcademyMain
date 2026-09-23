/* ═══ Wāḥa Forest — Hadith Specialization helpers shared by the hadith-waha-*.html mockups ═══
   Needs hadith-data.js, courses-data.js (the standalone courses) and waha-quran.js.
   All copy is the live page's (src/pages/hadith-specialization.jsx). */
(function () {
  const H = window.HADITH;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strand = (k) => H.STRANDS.find((s) => s.k === k);
  const year = (y) => H.COURSES.filter((c) => c.year === y);
  const catalog = (c) => (c.catalogSlug ? (window.COURSES || []).find((x) => x.slug === c.catalogSlug) : null);
  const lessons = (c) => (c.catalogSlug ? (window.COURSE_DETAILS?.[c.catalogSlug]?.lessons || []) : []);
  const money = (x) => (x?.free ? 'Free' : x?.price ? `$${(x.price / 100).toFixed(x.price % 100 ? 2 : 0)} USD` : '');
  const courseUrl = (x) => `course-waha-majlis.html?slug=${encodeURIComponent(x.slug)}`;
  const standaloneCount = new Set(H.COURSES.filter((c) => c.catalogSlug).map((c) => c.catalogSlug)).size;

  // Overview, note, outcomes and — when the course is also sold on its own — the standalone course.
  function detail(c, { lessonLimit = 8, dark = false } = {}) {
    const x = catalog(c), L = lessons(c);
    return `<div class="hdet${dark ? ' dark' : ''}">
      <div class="hdet-ov"><span class="hlabel">Course overview</span><p>${esc(c.overview)}</p>${c.note ? `<p class="hnote">${esc(c.note)}</p>` : ''}</div>
      ${c.outcomes?.length ? `<div class="hdet-out"><span class="hlabel">Learning outcomes</span><ul>${c.outcomes.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
      ${x ? `<div class="hstand"><div class="hstand-h">${x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy" />` : ''}<div><span class="hlabel">Standalone Talweeh course</span><strong>${esc(x.title)}</strong><small>${esc(x.instructor)}${L.length ? ` · ${L.length} lessons` : ''}</small></div>
        <a class="btn btn-g btn-sm" href="${courseUrl(x)}">Enroll in standalone course${money(x) ? ` · ${money(x)}` : ''} →</a></div>
        ${L.length ? `<ol class="hless">${L.slice(0, lessonLimit).map((l, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b>${esc(l.t)}</li>`).join('')}${L.length > lessonLimit ? `<li class="hmore"><a href="${courseUrl(x)}">+ ${L.length - lessonLimit} more lessons on the course page →</a></li>` : ''}</ol>` : '<p class="hnote">This standalone course is available, but its lesson list has not been published yet.</p>'}</div>` : ''}
    </div>`;
  }
  const facts = [['Duration', '2 years'], ['Curriculum', `${H.COURSES.length} courses`], ['Level', 'Advanced']];
  const instructors = (cls = '') => `<div class="hinst ${cls}">${H.INSTRUCTORS.map(([n, d], i) => `<a class="card" href="#"><span class="hi-n">0${i + 1}</span><div><h3>${esc(n)}</h3><p>${esc(d)}</p><small>Read instructor bio →</small></div></a>`).join('')}</div>`;
  const enrol = (label = 'For enrollment') => `<a class="btn btn-g" href="${H.ENROL}">${label} →</a>`;
  const cta = () => `<section class="hcta" data-r><div class="ar">وَمَا آتَاكُمُ الرَّسُولُ فَخُذُوهُ</div><span class="kicker">Enrollment</span><h2>Interested in the Hadith Specialization?</h2><p>Contact Talweeh Academy for enrollment information and program inquiries.</p><div class="acts">${enrol()}<a class="btn btn-glass" href="courses-waha-combined.html?cat=hadith-sciences">Browse the standalone courses</a></div><small>Enrollment inquiries: ${esc(H.EMAIL)}</small></section>`;
  const overview = () => H.OVERVIEW.map((p) => `<p>${esc(p)}</p>`).join('');
  window.WahaHadith = { H, esc, strand, year, catalog, lessons, money, courseUrl, detail, facts, instructors, enrol, cta, overview, standaloneCount };
})();
