/* ═══ Wāḥa Forest — Courses mockups: shared helpers + the lesson video player ═══
   Data: assets/courses-data.js (generated from new_talweeh/src/data). */
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const price = (c) => (c.free ? 'Free' : '$' + (c.price / 100).toFixed(c.price % 100 ? 2 : 0));
  const courseUrl = (slug, page) => `${page || document.body.dataset.coursePage || 'course-waha-theatre.html'}?slug=${encodeURIComponent(slug)}`;
  const counts = () => {
    const m = {};
    for (const c of window.COURSES) m[c.cat] = (m[c.cat] || 0) + 1;
    return m;
  };
  const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const card = (c) => `
    <a class="cc" href="${courseUrl(c.slug)}">
      <span class="pv"><img src="${esc(c.poster)}" alt="${esc(c.title)} course poster" loading="lazy" />${c.free ? '<span class="badge-free">Free</span><span class="play">' + PLAY + '</span>' : ''}</span>
      <span class="bd"><span class="cat">${esc(c.catLabel)}</span><h3>${esc(c.title)}</h3><span class="by">${esc(c.instructor)}</span>
      <span class="meta"><span>${c.lessons ? c.lessons + ' lessons' : 'Curriculum coming soon'}</span><span class="price${c.free ? ' free' : ''}">${price(c)}</span></span></span>
    </a>`;
  const match = (c, q) => !q || [c.title, c.instructor, c.catLabel, c.desc, c.ar].join(' ').toLowerCase().includes(q.toLowerCase());

  /* ── lesson video player ──────────────────────────────────────────
     YouTube IFrame API underneath (controls hidden), our own emerald/gold controls on top:
     play/pause, back/forward 10 s (buttons, ← → and J/L keys), speed menu (0.5×–2×, < > keys),
     progress with buffer + hover time, volume/mute (M), fullscreen (F). */
  let apiReady;
  const loadApi = () => apiReady || (apiReady = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  }));
  const fmt = (t) => { t = Math.max(0, Math.floor(t || 0)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
  const I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M11 5 5 12l6 7M19 5l-6 7 6 7"/></svg>',
    fwd: '<svg viewBox="0 0 24 24"><path d="m13 5 6 7-6 7M5 5l6 7-6 7"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10zM17 9l5 6M22 9l-5 6"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 1l2.6 6.4L21 5l-2.4 6.4L23 12l-4.4 1.6L21 19l-6.4-2.4L12 23l-2.6-6.4L3 19l2.4-5.4L1 12l4.4-.6L3 5l6.4 2.4z"/></svg>',
  };
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  class WahaPlayer {
    constructor(host, { onEnded } = {}) {
      WahaPlayer.all.push(this);
      this.host = host; this.onEnded = onEnded; this.rate = Number(localStorage.getItem('waha-rate')) || 1;
      host.classList.add('vp');
      host.innerHTML = `
        <div class="vp-screen" tabindex="0" aria-label="Lesson video — space to play, arrows to skip 10 seconds">
          <div class="vp-yt"></div><div class="vp-click"></div>
          <div class="vp-poster"><span class="big">${I.play}</span><span class="cap"><small></small><strong></strong></span></div>
          <div class="vp-flash"></div>
        </div>
        <div class="vp-bar">
          <button class="b pp fill" data-a="toggle" aria-label="Play">${I.play}</button>
          <button class="b skip" data-a="back" aria-label="Back 10 seconds" title="Back 10 s (←)">${I.back}<span>10</span></button>
          <button class="b skip" data-a="fwd" aria-label="Forward 10 seconds" title="Forward 10 s (→)"><span>10</span>${I.fwd}</button>
          <span class="vp-time"><span class="cur">0:00</span> / <span class="dur">0:00</span></span>
          <div class="vp-prog" role="slider" aria-label="Seek" tabindex="-1"><span class="tr"><span class="bf"></span><span class="pl"></span></span><span class="kn"></span><span class="tip">0:00</span></div>
          <div class="vp-speed"><button class="b" data-a="speed" aria-haspopup="menu" aria-label="Playback speed">1×</button>
            <div class="vp-menu" role="menu"><small>Speed</small>${SPEEDS.map((r) => `<button role="menuitemradio" data-rate="${r}">${r === 1 ? 'Normal' : r + '×'}</button>`).join('')}</div></div>
          <span class="vp-vol"><button class="b" data-a="mute" aria-label="Mute">${I.vol}</button><input type="range" min="0" max="100" value="100" aria-label="Volume" /></span>
          <button class="b" data-a="fs" aria-label="Full screen" title="Full screen (F)">${I.fs}</button>
        </div>`;
      const $ = (s) => host.querySelector(s);
      this.el = { screen: $('.vp-screen'), yt: $('.vp-yt'), poster: $('.vp-poster'), flash: $('.vp-flash'), pp: $('.pp'), cur: $('.cur'), dur: $('.dur'), prog: $('.vp-prog'), pl: $('.pl'), bf: $('.bf'), kn: $('.kn'), tip: $('.tip'), speedBtn: $('[data-a=speed]'), menu: $('.vp-menu'), vol: $('.vp-vol input'), muteBtn: $('[data-a=mute]') };
      this.paintRate();
      host.addEventListener('click', (e) => {
        const b = e.target.closest('[data-a],[data-rate]'); if (!b) return;
        if (b.dataset.rate) { this.setRate(Number(b.dataset.rate)); this.el.menu.classList.remove('open'); return; }
        ({ toggle: () => this.toggle(), back: () => this.skip(-10), fwd: () => this.skip(10), speed: () => this.el.menu.classList.toggle('open'), mute: () => this.toggleMute(), fs: () => this.fullscreen() })[b.dataset.a]?.();
      });
      document.addEventListener('click', (e) => { if (!(e.target instanceof Element) || !e.target.closest('.vp-speed')) this.el.menu.classList.remove('open'); });
      $('.vp-click').addEventListener('click', () => this.toggle());
      $('.vp-click').addEventListener('dblclick', () => this.fullscreen());
      this.el.poster.addEventListener('click', () => this.start());
      this.el.vol.addEventListener('input', (e) => { if (this.p) { this.p.setVolume(Number(e.target.value)); this.p.unMute(); this.paintMute(); } });
      const seekAt = (e) => { const r = this.el.prog.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
      this.el.prog.addEventListener('mousemove', (e) => { const f = seekAt(e); this.el.tip.style.left = f * 100 + '%'; this.el.tip.textContent = fmt(f * (this.duration || 0)); });
      this.el.prog.addEventListener('click', (e) => { if (this.p && this.duration) this.p.seekTo(seekAt(e) * this.duration, true); this.tick(); });
      // keyboard: works when the player (or anything inside it) has focus, or nothing else is focused
      document.addEventListener('keydown', (e) => {
        const t = e.target instanceof Element ? e.target : document.body;
        if (this.dead || e.metaKey || e.ctrlKey || e.altKey) return;
        if (t === document.body) { if (WahaPlayer.active ? WahaPlayer.active !== this : WahaPlayer.all.length > 1) return; }
        else if (!host.contains(t)) return;
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'j' || k === 'J') { e.preventDefault(); this.skip(-10); }
        else if (k === 'ArrowRight' || k === 'l' || k === 'L') { e.preventDefault(); this.skip(10); }
        else if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); this.toggle(); }
        else if (k === '>' || k === '.') this.setRate(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(this.rate) + 1)] || 2);
        else if (k === '<' || k === ',') this.setRate(SPEEDS[Math.max(0, SPEEDS.indexOf(this.rate) - 1)] || 0.5);
        else if (k === 'f' || k === 'F') this.fullscreen();
        else if (k === 'm' || k === 'M') this.toggleMute();
      });
    }
    load(videoId, { title = '', kicker = '', autoplay = false } = {}) {
      this.videoId = videoId; this.duration = 0;
      this.el.poster.style.display = '';
      this.el.poster.style.backgroundImage = `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)`;
      this.el.poster.querySelector('small').textContent = kicker;
      this.el.poster.querySelector('strong').textContent = title;
      this.el.pl.style.width = '0'; this.el.bf.style.width = '0'; this.el.cur.textContent = '0:00'; this.el.dur.textContent = '0:00';
      if (this.p) { this.p.cueVideoById(videoId); if (autoplay) this.start(); }
      else if (autoplay) this.start();
    }
    async start() {
      WahaPlayer.active = this;
      this.el.poster.style.display = 'none';
      await loadApi();
      if (!this.p) {
        await new Promise((resolve) => {
          this.p = new YT.Player(this.el.yt, {
            host: 'https://www.youtube-nocookie.com', videoId: this.videoId,
            playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0 },
            events: {
              onReady: () => { this.p.setPlaybackRate(this.rate); resolve(); },
              onStateChange: (e) => this.onState(e.data),
            },
          });
        });
      } else if (this.p.getVideoData().video_id !== this.videoId) this.p.loadVideoById(this.videoId);
      this.p.playVideo();
      this.el.screen.focus({ preventScroll: true });
    }
    onState(s) {
      const playing = s === 1;
      // several players on a page: the one playing takes the keyboard and pauses the rest
      if (playing) { WahaPlayer.active = this; WahaPlayer.all.forEach((o) => { if (o !== this && o.p?.getPlayerState?.() === 1) o.p.pauseVideo(); }); }
      this.el.pp.innerHTML = playing ? I.pause : I.play;
      this.el.pp.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      this.host.classList.toggle('playing', playing);
      clearInterval(this.timer);
      if (playing) this.timer = setInterval(() => this.tick(), 250);
      this.tick();
      if (s === 0 && this.onEnded) this.onEnded();
    }
    tick() {
      if (!this.p || !this.p.getDuration) return;
      const d = this.p.getDuration() || 0, t = this.p.getCurrentTime() || 0;
      this.duration = d;
      this.el.cur.textContent = fmt(t); this.el.dur.textContent = fmt(d);
      const f = d ? t / d : 0;
      this.el.pl.style.width = f * 100 + '%'; this.el.kn.style.left = f * 100 + '%';
      this.el.bf.style.width = (this.p.getVideoLoadedFraction() || 0) * 100 + '%';
    }
    toggle() {
      if (!this.p) return this.start();
      this.p.getPlayerState() === 1 ? this.p.pauseVideo() : this.p.playVideo();
    }
    skip(sec) {
      if (!this.p) return;
      const t = Math.max(0, Math.min((this.p.getDuration() || 0) - 0.5, (this.p.getCurrentTime() || 0) + sec));
      this.p.seekTo(t, true); this.tick();
      this.flash(sec < 0 ? '« 10 s' : '10 s »', sec < 0 ? 'l' : 'r');
    }
    setRate(r) {
      this.rate = r; try { localStorage.setItem('waha-rate', r); } catch (e) {}
      if (this.p && this.p.setPlaybackRate) this.p.setPlaybackRate(r);
      this.paintRate(); this.flash(r === 1 ? 'Normal speed' : r + '×');
    }
    paintRate() {
      this.el.speedBtn.textContent = (this.rate === 1 ? '1' : this.rate) + '×';
      this.el.menu.querySelectorAll('[data-rate]').forEach((b) => b.classList.toggle('on', Number(b.dataset.rate) === this.rate));
    }
    toggleMute() { if (!this.p) return; this.p.isMuted() ? this.p.unMute() : this.p.mute(); setTimeout(() => this.paintMute(), 50); }
    paintMute() { const m = this.p && this.p.isMuted(); this.el.muteBtn.innerHTML = m ? I.mute : I.vol; this.el.muteBtn.setAttribute('aria-label', m ? 'Unmute' : 'Mute'); }
    fullscreen() { document.fullscreenElement ? document.exitFullscreen() : this.host.requestFullscreen?.(); }
    flash(text, side = '') {
      const f = this.el.flash; f.textContent = text; f.className = 'vp-flash on ' + side;
      clearTimeout(this.ft); this.ft = setTimeout(() => f.classList.remove('on'), 650);
    }
  }

  WahaPlayer.all = []; WahaPlayer.active = null;
  WahaPlayer.prototype.pause = function () { try { this.p?.pauseVideo(); } catch (e) {} };
  WahaPlayer.prototype.destroy = function () {
    this.dead = true; clearInterval(this.timer);
    try { this.p?.destroy(); } catch (e) {}
    WahaPlayer.all = WahaPlayer.all.filter((o) => o !== this);
    if (WahaPlayer.active === this) WahaPlayer.active = null;
    this.host.innerHTML = ''; this.host.classList.remove('vp', 'playing');
  };

  /* ── study list (the enrolment cart) ──────────────────────────────
     One button on paid courses — "Add to study list". Adding opens a confirmation with the
     running total: continue to checkout, or keep browsing. Stored in localStorage. */
  const LIST_KEY = 'waha-study-list';
  const readList = () => { try { return JSON.parse(localStorage.getItem(LIST_KEY)) || []; } catch (e) { return []; } };
  const writeList = (l) => { try { localStorage.setItem(LIST_KEY, JSON.stringify(l)); } catch (e) {} paintCount(); };
  const byslug = (slug) => window.COURSES.find((c) => c.slug === slug);
  function paintCount() {
    const n = readList().length, bar = document.querySelector('.site-head .bar');
    if (!bar) return;
    let pill = bar.querySelector('.sl-pill');
    if (!pill) {
      pill = document.createElement('button'); pill.type = 'button'; pill.className = 'sl-pill';
      pill.addEventListener('click', () => openDialog());
      bar.insertBefore(pill, bar.querySelector('.head-cta'));
    }
    pill.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 5.5C6.7 4.8 9 5.3 12 7v12c-3-1.7-5.3-2.2-8-1.5zM20 5.5c-2.7-.7-5-.2-8 1.5v12c3-1.7 5.3-2.2 8-1.5z"/></svg><span>Study list</span>${n ? `<b>${n}</b>` : ''}`;
    pill.setAttribute('aria-label', `Study list, ${n} course${n === 1 ? '' : 's'}`);
  }
  function dialogEl() {
    let d = document.getElementById('sl-dialog');
    if (d) return d;
    d = document.createElement('div'); d.id = 'sl-dialog';
    d.innerHTML = `<div class="sl-ov" data-close></div><div class="sl-box glass" role="dialog" aria-modal="true" aria-labelledby="sl-h"></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
      const rm = e.target.closest('[data-rm]');
      if (rm) { writeList(readList().filter((x) => x !== rm.dataset.rm)); paintButtons(); openDialog(); }
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return d;
  }
  function close() { document.getElementById('sl-dialog')?.classList.remove('open'); }
  function openDialog(added) {
    const d = dialogEl(), list = readList().map(byslug).filter(Boolean);
    const total = list.reduce((n, c) => n + c.price, 0);
    const c = added && byslug(added);
    d.querySelector('.sl-box').innerHTML = `
      <button class="sl-x" type="button" data-close aria-label="Close">✕</button>
      ${c ? `<div class="sl-added"><span class="sl-tick">✓</span><div><span class="kicker">Added to your study list</span><h3 id="sl-h">${esc(c.title)}</h3><p>${esc(c.instructor)} · ${c.lessons || ''} lessons · ${price(c)}</p></div></div>`
          : `<span class="kicker">Your study list</span><h3 id="sl-h">${list.length ? list.length + ' course' + (list.length === 1 ? '' : 's') + ' ready to enrol' : 'Your study list is empty'}</h3>`}
      ${list.length ? `<ul class="sl-items">${list.map((x) => `<li><img src="${esc(x.poster)}" alt="" /><span><strong>${esc(x.title)}</strong><small>${esc(x.catLabel)}</small></span><b>${price(x)}</b><button type="button" data-rm="${x.slug}" aria-label="Remove ${esc(x.title)}">✕</button></li>`).join('')}</ul>
        <div class="sl-total"><span>Total</span><b>$${(total / 100).toFixed(total % 100 ? 2 : 0)}</b></div>` : '<p class="sl-empty">Add a course with “Add to study list” and it will wait here until you enrol.</p>'}
      <div class="sl-acts">${list.length ? '<a class="btn btn-g" href="cart-waha.html">Proceed to enrolment →</a>' : ''}<a class="btn btn-glass" href="${document.body.dataset.catalog || 'courses-waha-maktabah.html'}">Keep browsing courses</a></div>
      <p class="sl-note">Enrolment completes at checkout; lessons open in your Student Portal.</p>`;
    d.classList.add('open');
    d.querySelector('.sl-box .btn')?.focus();
  }
  function paintButtons() {
    const list = readList();
    document.querySelectorAll('[data-add]').forEach((b) => {
      const inList = list.includes(b.dataset.add);
      b.classList.toggle('in-list', inList);
      b.innerHTML = inList ? '✓ In your study list' : 'Add to study list';
      b.setAttribute('aria-pressed', inList);
    });
  }
  let bound = false;
  function bindStudyList() {
    paintCount(); paintButtons();
    if (bound) return; bound = true;
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      const list = readList(), slug = b.dataset.add;
      if (!list.includes(slug)) writeList([...list, slug]);
      paintButtons(); openDialog(list.includes(slug) ? null : slug);
    });
  }


  window.WahaCourses = { esc, price, courseUrl, counts, card, match, PLAY, WahaPlayer, bindStudyList, refreshStudyButtons: paintButtons };
})();
