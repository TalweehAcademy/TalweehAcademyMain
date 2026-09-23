/* ═══ Wāḥa Forest — Arabic-program helpers shared by the arabic-waha-*.html mockups ═══
   Needs arabic-data.js, waha-quran.js and waha-courses.js (WahaPlayer). All copy is the live
   site's (src/content/arabicProgram.js). */
(function () {
  const R = window.ARB;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bold = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // FAQ / objective text: blank lines, "- " bullets and **sub-heads**, as the live accordion renders them
  function md(text) {
    let html = '', list = false;
    String(text || '').split('\n').forEach((raw) => {
      const line = raw.trim();
      if (line.startsWith('- ')) { if (!list) { html += '<ul>'; list = true; } html += `<li>${bold(line.slice(2))}</li>`; return; }
      if (list) { html += '</ul>'; list = false; }
      if (!line) return;
      if (/^\*\*[^*]+\*\*$/.test(line)) html += `<h5>${esc(line.slice(2, -2))}</h5>`;
      else html += `<p>${bold(line)}</p>`;
    });
    return html + (list ? '</ul>' : '');
  }
  // Accordion: [{title|q, text|a}] — first open by default
  const accordion = (items, { open = 0, cls = '' } = {}) => `<div class="racc ${cls}">${items.map((it, i) => `
    <div class="racc-i${i === open ? ' open' : ''}"><button type="button" aria-expanded="${i === open}"><span>${esc(it.title || it.q)}</span><i aria-hidden="true"></i></button><div class="racc-a"><div>${md(it.text || it.a)}</div></div></div>`).join('')}</div>`;
  function bindAccordions(root = document) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('.racc-i > button'); if (!b) return;
      const item = b.parentElement, was = item.classList.contains('open');
      item.parentElement.querySelectorAll(':scope > .racc-i.open').forEach((x) => { x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
      if (!was) { item.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
    });
  }
  const track = (k) => R.TRACKS.find((t) => t.k === k);
  const textChip = (t) => `<span class="rtext t-${t.track}"><strong>${esc(t.t)}</strong>${t.code ? `<em>${esc(t.code)}</em>` : ''}${t.note ? `<small>${esc(t.note)}</small>` : ''}</span>`;
  const fact = (label) => R.FACTS.find((f) => f.label === label)?.value || '';
  const facts = (cls = '') => `<dl class="rfacts ${cls}">${R.FACTS.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`;
  const member = (label = 'Become a Member') => `<a class="btn btn-g" href="${R.LINKS.membership}" target="_blank" rel="noreferrer">${label} →</a>`;
  const calendar = `<a class="btn btn-glass" href="../public${R.LINKS.calendarPdf}" target="_blank" rel="noreferrer">Program calendar (PDF)</a>`;
  const proud = () => `<div class="rproud" data-stagger>${R.PROUD.map((c) => `<a class="card" href="${/^https?:/.test(c.href) ? c.href : '#'}" ${/^https?:/.test(c.href) ? 'target="_blank" rel="noreferrer"' : ''}><h4>${esc(c.title)}</h4><p>${esc(c.text)}</p><b>→</b></a>`).join('')}</div>`;
  const cta = () => `<section class="rcta" data-r><img src="../public/legacy-assets/talweeharabic/2025/12/bismilla-e1755384561119-300.webp" alt="Bismillah al-Rahman al-Rahim" /><span class="kicker">Next cohort · ${esc(fact('Next cohort'))}</span><h2>Unlock the Language of the Qur’an<br />Beyond Translation</h2><p>${esc(R.INVITATION)}</p><div class="acts">${member()}${calendar}<a class="btn btn-glass" href="${R.LINKS.telegram}" target="_blank" rel="noreferrer">Talweeh Society on Telegram</a></div></section>`;
  const OBJ_AR = { 'Reading and writing': 'القِرَاءَةُ وَالكِتَابَة', Speaking: 'المُحَادَثَة', 'Syntax (النحو)': 'النَّحْو', 'Morphology (الصرف)': 'الصَّرْف', 'Rhetoric (البلاغة)': 'البَلَاغَة', 'Application in Adab and Tafsir': 'الأَدَبُ وَالتَّفْسِير' };
  const objTitle = (t) => t.replace(/\s*\([^)]*\)\s*$/, '');
  const player = (host, id, opts = {}) => { const p = new window.WahaCourses.WahaPlayer(host, opts); p.load(id, { title: opts.title || '', kicker: opts.kicker || '' }); return p; };
  window.WahaArabic = { R, esc, md, accordion, bindAccordions, track, textChip, fact, facts, member, calendar, proud, cta, OBJ_AR, objTitle, player };
})();
