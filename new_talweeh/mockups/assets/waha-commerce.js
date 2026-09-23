/* ═══ Wāḥa Forest — study list (cart) + checkout helpers for cart-waha.html and checkout-waha.html ═══
   Needs courses-data.js, waha-quran.js and waha-courses.js. The study list is the same one the
   course mockups fill with "Add to study list" (localStorage "waha-study-list", course slugs).
   Mirrors the live /cart and /checkout (src/pages/cart.jsx, src/components/CheckoutExperience.jsx):
   each course carries one enrolment option; savings and promo codes are checked before Stripe. */
(function () {
  const KEY = 'waha-study-list';
  const esc = window.WahaCourses.esc;
  const C = window.COURSES;
  const bySlug = (s) => C.find((c) => c.slug === s);
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} window.WahaCourses.bindStudyList?.(); };
  const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)} USD`;
  const short = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

  // A first visit with an empty list gets two sample courses so the page has something to show
  // (?empty=1 shows the empty state instead).
  const SAMPLE = ['nukhbat-al-fikr', 'takhri-j-al-h-adi-th-q2zxxj'];
  function items() {
    const q = new URLSearchParams(location.search);
    if (q.get('empty') === '1') return [];
    let list = read().filter((s) => bySlug(s) && !bySlug(s).free);
    if (!list.length && !sessionStorage.getItem('waha-sample-seeded')) {
      list = SAMPLE.filter((s) => bySlug(s)); write(list);
      try { sessionStorage.setItem('waha-sample-seeded', '1'); } catch (e) {}
    }
    return list.map(bySlug);
  }

  // Every paid course carries its catalog price as one enrolment option. The live site reads the
  // options (one-time or subscription, access length) from the Talweeh commerce catalog.
  const option = (c) => ({ label: 'Full course', billing: 'One-time · Permanent access', cents: c.price });

  // Multi-course savings: example tiers for the mockup; the live tiers come from the Talweeh server.
  const TIERS = [{ count: 2, pct: 10 }, { count: 3, pct: 15 }, { count: 5, pct: 20 }];
  function bundle(n) {
    const now = [...TIERS].reverse().find((t) => n >= t.count) || null;
    const next = TIERS.find((t) => n < t.count) || null;
    return { pct: now ? now.pct : 0, next, need: next ? next.count - n : 0 };
  }
  const COUPONS = { TALWEEH10: 10, RAMADAN: 20 };   // mockup codes

  // Related courses: same category first, then same teacher, not already on the list.
  function related(list, n = 6) {
    const cats = new Set(list.map((c) => c.cat)), who = new Set(list.map((c) => c.instructor)), have = new Set(list.map((c) => c.slug));
    return C.filter((c) => !c.free && !have.has(c.slug))
      .map((c) => ({ c, s: (cats.has(c.cat) ? 8 : 0) + (who.has(c.instructor) ? 5 : 0) + Math.min(3, (c.lessons || 0) / 10) }))
      .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.c);
  }

  const steps = (at) => `<ol class="csteps" aria-label="Enrolment steps">${['Study list', 'Secure checkout', 'Begin studying'].map((s, i) => `<li class="${i < at ? 'done' : i === at ? 'on' : ''}"><b>${i < at ? '✓' : i + 1}</b><span>${s}</span></li>`).join('')}</ol>`;

  const recCard = (c, { added = false, label = 'Add to study list' } = {}) => `
    <article class="rec">
      <a class="rp" href="course-waha-majlis.html?slug=${encodeURIComponent(c.slug)}"><img src="${esc(c.poster)}" alt="${esc(c.title)} course poster" loading="lazy" /></a>
      <div class="rb"><small>${esc(c.instructor)}</small><strong>${esc(c.title)}</strong><span>${esc(c.catLabel)}${c.lessons ? ` · ${c.lessons} lessons` : ''}</span>
        <div class="rf"><b>${short(c.price)}</b><button type="button" class="btn ${added ? 'btn-glass' : 'btn-g'} btn-sm" data-addrec="${esc(c.slug)}" ${added ? 'disabled' : ''}>${added ? '✓ Added' : label}</button></div></div>
    </article>`;

  window.WahaCommerce = { KEY, read, write, bySlug, items, option, money, short, bundle, COUPONS, related, steps, recCard, esc };
})();
