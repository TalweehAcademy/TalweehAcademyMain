/* eslint-disable react/prop-types */
// Lesson video player for the whole site (free courses, home lessons, Media, articles, Arabic pages): the YouTube
// IFrame player (youtube-nocookie, controls hidden) inside an emerald frame with Talweeh controls — play/pause,
// back/forward 10 seconds (buttons, ← → and J/L), playback speed 0.5×–2× (menu and < >), seek bar with buffer and
// hover time, volume/mute (M) and full screen (F).
//
// One tap plays. Phones (iPhone above all) only let a video start with sound from the tap itself, so YouTube is made
// ready while the player is on or near the screen and the tap calls it straight away; calling it a second later, once
// a script has loaded, is refused and left YouTube's own paused screen behind (it took two taps). When a page asks to
// start a video without a tap (the next lesson, a link that opens a video) and the phone refuses, it starts muted with
// "Tap for sound". Paused or finished, our own cover sits over the video instead of YouTube's title, logo and "More
// videos". YouTube also lays its title, logo and a big pause sign over the first seconds of playing, so the video's
// picture stays over it for those seconds (the sound has already begun) and then fades into the moving picture.
// A parent can start a video from its own tap through the ref: ref.current.play(videoId).
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useScrollLock } from '../hooks/useScrollLock'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const RATE_KEY = 'talweeh-video-rate'
const HINT_KEY = 'talweeh-video-turn-hint'

// Several players can share a page: body-level keys go to the one last started (or the only one mounted), and
// starting one pauses the rest.
const mounted = new Set()
let activeHost = null

let apiPromise = null
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve() }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return apiPromise
}

const fmt = (t) => {
  t = Math.max(0, Math.floor(t || 0))
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  return (h ? `${h}:${String(m).padStart(2, '0')}` : m) + ':' + String(s).padStart(2, '0')
}
const readRate = () => { try { return Number(localStorage.getItem(RATE_KEY)) || 1 } catch { return 1 } }
const touchScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches

const I = {
  play: <svg viewBox="0 0 24 24" className="fill"><path d="M8 5.5v13l11-6.5z" /></svg>,
  pause: <svg viewBox="0 0 24 24" className="fill"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  back: <svg viewBox="0 0 24 24"><path d="M11 5 5 12l6 7M19 5l-6 7 6 7" /></svg>,
  fwd: <svg viewBox="0 0 24 24"><path d="m13 5 6 7-6 7M5 5l6 7-6 7" /></svg>,
  vol: <svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></svg>,
  mute: <svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10zM17 9l5 6M22 9l-5 6" /></svg>,
  fs: <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>,
  close: <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  turn: <svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M3 14a9 9 0 0 0 7 7M21 10a9 9 0 0 0-7-7" /></svg>,
}

// warmOnView: get YouTube ready when the player nears the screen (off for a player kept in a closed sheet; its
// parent calls ref.current.warm() when the videos come into view instead).
const WahaVideoPlayer = forwardRef(function WahaVideoPlayer({ videoId, title, kicker, autoplay = false, onEnded, warmOnView = true }, ref) {
  const hostRef = useRef(null)
  const mountRef = useRef(null)
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const loadedRef = useRef(null) // the video the YouTube player holds
  const pendingRef = useRef(null) // what to do once it is ready: { id, play, gesture }
  const endedRef = useRef(onEnded)
  const [started, setStarted] = useState(false)
  const [state, setState] = useState(-1) // YouTube: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  const [time, setTime] = useState({ t: 0, d: 0, b: 0 })
  const [rate, setRateState] = useState(readRate)
  const [menu, setMenu] = useState(false)
  const [muted, setMuted] = useState(false)
  const [quietStart, setQuietStart] = useState(false) // started muted because the phone refused sound
  const [volume, setVolume] = useState(100)
  const [flash, setFlash] = useState(null)
  const [hover, setHover] = useState({ x: 0, t: 0 })
  const [shownId, setShownId] = useState(videoId) // the video on the cover (a parent may switch it through play())
  const [lead, setLead] = useState(null) // { k, ms } while the picture covers YouTube's opening labels
  const leadArmed = useRef(0) // how long to cover when playing next begins (ms), 0 for not at all
  const leadTimer = useRef(null)
  const arm = (ms = 2600) => { leadArmed.current = ms }
  endedRef.current = onEnded
  const playing = state === 1

  const tick = useCallback(() => {
    const p = playerRef.current
    if (!readyRef.current || !p?.getDuration) return
    setTime({ t: p.getCurrentTime() || 0, d: p.getDuration() || 0, b: p.getVideoLoadedFraction?.() || 0 })
  }, [])

  // A start without a tap the phone refused: carry on muted, and say how to turn the sound on.
  const watchRefusal = useCallback(() => {
    setTimeout(() => {
      const p = playerRef.current
      if (!p?.getPlayerState) return
      const s = p.getPlayerState()
      if (s !== 1 && s !== 3 && pendingRef.current === null) { p.mute(); setMuted(true); setQuietStart(true); p.playVideo() }
    }, 1400)
  }, [])

  // Load YouTube and the player, cued and silent, so that a tap can start it at once.
  const ensurePlayer = useCallback(() => {
    if (playerRef.current) return
    playerRef.current = { pending: true }
    loadYouTubeApi().then(() => {
      if (!mountRef.current) return
      loadedRef.current = pendingRef.current?.id || videoId
      playerRef.current = new window.YT.Player(mountRef.current, {
        host: 'https://www.youtube-nocookie.com',
        videoId: loadedRef.current,
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0 },
        events: {
          onReady: (e) => {
            readyRef.current = true
            e.target.setPlaybackRate(readRate())
            const job = pendingRef.current
            pendingRef.current = null
            if (job?.play) { e.target.playVideo(); if (!job.gesture || touchScreen()) watchRefusal() }
          },
          onStateChange: (e) => {
            setState(e.data)
            if (e.data === 1 && leadArmed.current) {
              const ms = leadArmed.current
              leadArmed.current = 0
              setLead({ k: Date.now(), ms })
              clearTimeout(leadTimer.current)
              leadTimer.current = setTimeout(() => setLead(null), ms)
            }
            if (e.data === 1) {
              activeHost = hostRef.current
              mounted.forEach((other) => { if (other !== playerRef) try { if (other.current?.getPlayerState?.() === 1) other.current.pauseVideo() } catch { /* not ready */ } })
            }
            if (e.data === 0) endedRef.current?.()
          },
        },
      })
    })
  }, [videoId, watchRefusal])

  // Start a video. From a tap (gesture) this must reach YouTube before anything waits, or a phone refuses the sound.
  const start = useCallback((id = videoId, gesture = true) => {
    setStarted(true)
    setShownId(id)
    arm()
    activeHost = hostRef.current
    const p = playerRef.current
    if (p && readyRef.current) {
      if (loadedRef.current !== id) { loadedRef.current = id; p.loadVideoById(id) } else p.playVideo()
      if (!gesture) watchRefusal()
    } else {
      // Not ready yet (tapped the moment the page opened): play as soon as it is.
      pendingRef.current = { id, play: true, gesture }
      if (p && !p.pending && loadedRef.current !== id) { /* cued another video; onReady loads this one */ }
      ensurePlayer()
    }
    hostRef.current?.querySelector('.cw-vp-screen')?.focus({ preventScroll: true })
  }, [videoId, ensurePlayer, watchRefusal])

  useImperativeHandle(ref, () => ({
    play: (id) => start(id || videoId, true),
    pause: () => { try { playerRef.current?.pauseVideo?.() } catch { /* not ready */ } },
    warm: () => ensurePlayer(),
  }), [start, ensurePlayer, videoId])

  // Get ready when the player comes near the screen.
  useEffect(() => {
    const el = hostRef.current
    if (!el || !warmOnView) return undefined
    if (typeof IntersectionObserver === 'undefined') { ensurePlayer(); return undefined }
    const io = new IntersectionObserver((entries) => { if (entries.some((x) => x.isIntersecting)) { ensurePlayer(); io.disconnect() } }, { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ensurePlayer, warmOnView])

  // A new video from the page (next lesson, another Media video): play it if asked, else show it ready to play.
  useEffect(() => {
    setTime({ t: 0, d: 0, b: 0 })
    setShownId(videoId)
    const p = playerRef.current
    if (p && readyRef.current) {
      if (loadedRef.current === videoId) return // the page already started it from a tap (ref.current.play)
      loadedRef.current = videoId
      if (autoplay) { setStarted(true); arm(); p.loadVideoById(videoId); watchRefusal() } else { p.cueVideoById(videoId); setStarted(false) }
    } else if (autoplay) start(videoId, false)
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [playing, tick])
  useEffect(() => {
    mounted.add(playerRef)
    return () => {
      mounted.delete(playerRef)
      if (activeHost === hostRef.current) activeHost = null
      clearTimeout(leadTimer.current)
      try { playerRef.current?.destroy?.() } catch { /* already gone */ }
    }
  }, [])

  const say = (text, side = '') => { setFlash({ text, side, k: Date.now() }) }
  useEffect(() => { if (!flash) return undefined; const id = setTimeout(() => setFlash(null), 650); return () => clearTimeout(id) }, [flash])

  const toggle = () => {
    const p = playerRef.current
    if (!started || !readyRef.current) return start(shownId)
    if (quietStart) { p.unMute(); setMuted(false); setQuietStart(false); return }
    if (p.getPlayerState() === 1) p.pauseVideo(); else { arm(1500); p.playVideo() }
  }
  const skip = (sec) => {
    const p = playerRef.current; if (!readyRef.current) return
    p.seekTo(Math.max(0, Math.min((p.getDuration() || 0) - 0.5, (p.getCurrentTime() || 0) + sec)), true)
    tick(); say(sec < 0 ? '« 10 s' : '10 s »', sec < 0 ? 'l' : 'r')
  }
  const setRate = (r) => {
    setRateState(r); try { localStorage.setItem(RATE_KEY, String(r)) } catch { /* private mode */ }
    if (readyRef.current) playerRef.current.setPlaybackRate(r)
    say(r === 1 ? 'Normal speed' : `${r}×`)
  }
  const toggleMute = () => {
    const p = playerRef.current; if (!readyRef.current) return
    if (p.isMuted()) { p.unMute(); setMuted(false); setQuietStart(false) } else { p.mute(); setMuted(true) }
  }

  // Full screen, as on YouTube. Where the browser can make the frame full screen (computers, Android, iPad) it does,
  // and turns to landscape where allowed. iPhone can't full-screen part of a page, so the frame covers the screen
  // itself: the site's header and bars are hidden and everything around the player is lifted above them.
  const [fs, setFs] = useState(false)
  const [, setFsTick] = useState(0)
  const lifted = useRef([])
  const nativeFs = () => document.fullscreenElement || document.webkitFullscreenElement
  const enterFs = () => {
    const el = hostRef.current
    if (!el) return
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (req && !/iPhone|iPod/.test(navigator.userAgent)) {
      Promise.resolve(req.call(el)).then(() => screen.orientation?.lock?.('landscape')).catch(() => {})
      return
    }
    // Ancestors with a transform, filter, containment or their own layer would trap the frame under the header.
    lifted.current = []
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.transform !== 'none' || cs.filter !== 'none' || cs.backdropFilter !== 'none' || cs.webkitBackdropFilter !== 'none' || cs.contain !== 'none' || cs.containerType !== 'normal' || cs.zIndex !== 'auto') {
        lifted.current.push([a, a.getAttribute('style')])
        a.style.transform = 'none'; a.style.filter = 'none'; a.style.backdropFilter = 'none'; a.style.webkitBackdropFilter = 'none'; a.style.contain = 'none'
        if (cs.zIndex !== 'auto') a.style.zIndex = '2147483000'
      }
    }
    document.documentElement.classList.add('vp-full')
    setFs(true)
  }
  const exitFs = () => {
    if (nativeFs()) { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); try { screen.orientation?.unlock?.() } catch { /* not supported */ } }
    lifted.current.forEach(([a, st]) => { if (st == null) a.removeAttribute('style'); else a.setAttribute('style', st) })
    lifted.current = []
    document.documentElement.classList.remove('vp-full')
    setFs(false)
  }
  const isFull = () => fs || (nativeFs() && nativeFs() === hostRef.current)
  const fullscreen = () => { if (isFull()) exitFs(); else enterFs() }
  useScrollLock(fs)
  useEffect(() => () => document.documentElement.classList.remove('vp-full'), [])
  useEffect(() => {
    const onChange = () => { if (!nativeFs()) { try { screen.orientation?.unlock?.() } catch { /* not supported */ } } setFsTick((n) => n + 1) }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('webkitfullscreenchange', onChange) }
  }, [])
  // Phones: turning to landscape while a video plays goes full screen; turning back leaves it.
  const autoFs = useRef(false)
  useEffect(() => {
    if (!touchScreen()) return undefined
    const land = window.matchMedia('(orientation: landscape)')
    const onTurn = () => {
      if (land.matches && playing && !isFull()) { autoFs.current = true; enterFs() }
      else if (!land.matches && autoFs.current && isFull()) { autoFs.current = false; exitFs() }
    }
    land.addEventListener('change', onTurn)
    return () => land.removeEventListener('change', onTurn)
  })
  // Full screen on a phone held upright: once, a short note that turning it gives a bigger picture.
  const [turnHint, setTurnHint] = useState(false)
  useEffect(() => {
    if (!fs || !touchScreen() || !window.matchMedia('(orientation: portrait)').matches) return undefined
    try { if (sessionStorage.getItem(HINT_KEY)) return undefined; sessionStorage.setItem(HINT_KEY, '1') } catch { /* private mode */ }
    setTurnHint(true)
    const id = setTimeout(() => setTurnHint(false), 4000)
    return () => clearTimeout(id)
  }, [fs])
  // In full screen the controls fade 3 seconds after the last touch while the video plays; a tap brings them back.
  const full = isFull()
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef(null)
  const wake = useCallback(() => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), 3000)
  }, [])
  useEffect(() => { if (full && playing) wake(); else { clearTimeout(idleTimer.current); setIdle(false) } return () => clearTimeout(idleTimer.current) }, [full, playing, wake])
  const hidden = full && playing && idle

  // Keyboard: when the player has focus, or nothing else does.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target instanceof Element ? e.target : document.body
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (t === document.body) { if (activeHost ? activeHost !== hostRef.current : mounted.size > 1) return }
      else if (!hostRef.current?.contains(t)) return
      const k = e.key
      if (k === 'ArrowLeft' || k === 'j' || k === 'J') { e.preventDefault(); skip(-10) }
      else if (k === 'ArrowRight' || k === 'l' || k === 'L') { e.preventDefault(); skip(10) }
      else if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); toggle() }
      else if (k === '>' || k === '.') setRate(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(rate) + 1)] || 2)
      else if (k === '<' || k === ',') setRate(SPEEDS[Math.max(0, SPEEDS.indexOf(rate) - 1)] || 0.5)
      else if (k === 'f' || k === 'F') fullscreen()
      else if (k === 'Escape' && fs) exitFs()
      else if (k === 'm' || k === 'M') toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    if (!menu) return undefined
    const close = (e) => { if (!e.target.closest?.('.cw-vp-speed')) setMenu(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])

  // The seek bar follows a finger or the mouse: press anywhere on it and drag; the video jumps there on release.
  const [drag, setDragState] = useState(null) // fraction while dragging (shown)
  const dragRef = useRef(null) // the same, read at once: a quick tap lifts the finger before React has re-rendered
  const setDrag = (f) => { dragRef.current = f; setDragState(f) }
  const seekFrac = (e) => { const r = e.currentTarget.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) }
  const seekDown = (e) => {
    if (!readyRef.current || !time.d) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* old browser */ }
    const f = seekFrac(e); setDrag(f); setHover({ x: f, t: f * time.d }); if (full) wake()
  }
  const seekMove = (e) => {
    const f = seekFrac(e)
    if (dragRef.current !== null) { setDrag(f); if (full) wake() }
    setHover({ x: f, t: f * time.d })
  }
  const seekUp = (e) => {
    const f = dragRef.current
    if (f === null) return
    const to = (e && e.clientX ? seekFrac(e) : f) * time.d
    playerRef.current.seekTo(to, true)
    setTime((x) => ({ ...x, t: to }))
    setDrag(null)
    setTimeout(tick, 120)
  }
  const frac = drag !== null ? drag : time.d ? time.t / time.d : 0
  // Tapping the picture. Full screen works as on YouTube: a tap shows or hides the controls (with play/pause in the
  // middle); paused, a tap carries on. Otherwise a tap plays or pauses.
  const tapScreen = () => {
    if (!full) { toggle(); return }
    if (hidden) { wake(); return }
    if (playing) { clearTimeout(idleTimer.current); setIdle(true); return }
    toggle()
  }
  // Paused, our cover hides YouTube's labels (title, logo, "More videos") over the picture. In full screen those sit at
  // the screen's edges, behind our solid top and bottom bars, so the paused picture itself stays in view.
  const cover = started && !full && (state === 2 || state === 0)
  const thumb = `https://i.ytimg.com/vi/${shownId}/hqdefault.jpg`

  return (
    <div className={`cw-vp${playing ? ' playing' : ''}${fs ? ' is-fs' : ''}${hidden ? ' is-idle' : ''}`} ref={hostRef} onPointerMove={full ? wake : undefined}>
      <div className="cw-vp-screen" tabIndex={0} aria-label="Lesson video — space to play, arrow keys skip 10 seconds">
        <div className="cw-vp-yt"><div ref={mountRef} /></div>
        <div className="cw-vp-click" onClick={tapScreen} onDoubleClick={fullscreen} aria-hidden="true" />
        {!started && (
          <button type="button" className="cw-vp-poster" style={{ backgroundImage: `url(${thumb})` }} onClick={() => start(shownId)} aria-label={`Play ${title}`}>
            <span className="big">{I.play}</span>
            <span className="cap"><small>{kicker}</small><strong>{title}</strong></span>
          </button>
        )}
        {cover && (
          <button type="button" className="cw-vp-poster is-paused" style={{ backgroundImage: `url(${thumb})` }} onClick={() => { if (full) wake(); arm(state === 0 ? 2600 : 1500); if (state === 0) playerRef.current.seekTo(0, true); playerRef.current.playVideo() }} aria-label={state === 0 ? `Watch ${title} again` : `Carry on with ${title}`}>
            <span className="big">{I.play}</span>
            <span className="cap"><small>{state === 0 ? 'Watch again' : `Paused · ${fmt(time.t)}`}</small><strong>{title}</strong></span>
          </button>
        )}
        {lead && playing && <div key={lead.k} className={`cw-vp-lead${full ? ' fit' : ''}`} style={{ backgroundImage: `url(${thumb})`, animationDuration: `${lead.ms}ms` }} aria-hidden="true"><span className="cw-vp-eq"><i /><i /><i /></span></div>}
        {quietStart && playing && <button type="button" className="cw-vp-sound" onClick={toggleMute}>{I.mute}Tap for sound</button>}
        {full && started && <button type="button" className="cw-vp-mid" onClick={() => { wake(); toggle() }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? I.pause : I.play}</button>}
        {fs && <div className="cw-vp-top"><button type="button" className="b" onClick={exitFs} aria-label="Leave full screen">{I.close}</button><span>{title}</span></div>}
        {turnHint && <div className="cw-vp-turn" aria-hidden="true">{I.turn}Turn your phone for a bigger picture</div>}
        {flash && <div key={flash.k} className={`cw-vp-flash ${flash.side}`}>{flash.text}</div>}
      </div>
      <div className="cw-vp-bar">
        <button type="button" className="b pp" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? I.pause : I.play}</button>
        <button type="button" className="b skip" onClick={() => skip(-10)} aria-label="Back 10 seconds" title="Back 10 s (←)">{I.back}<span>10</span></button>
        <button type="button" className="b skip" onClick={() => skip(10)} aria-label="Forward 10 seconds" title="Forward 10 s (→)"><span>10</span>{I.fwd}</button>
        <span className="cw-vp-time">{fmt(time.t)} / {fmt(time.d)}</span>
        <div className="cw-vp-prog" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(time.d)} aria-valuenow={Math.round(time.t)} tabIndex={-1}
          onPointerDown={seekDown} onPointerMove={seekMove} onPointerUp={seekUp} onPointerCancel={() => setDrag(null)}
          data-drag={drag !== null || undefined}>
          <span className="tr"><span className="bf" style={{ width: `${time.b * 100}%` }} /><span className="pl" style={{ width: `${frac * 100}%` }} /></span>
          <span className="kn" style={{ left: `${frac * 100}%` }} /><span className="tip" style={{ left: `${(drag !== null ? drag : hover.x) * 100}%` }}>{fmt(drag !== null ? drag * time.d : hover.t)}</span>
        </div>
        <div className="cw-vp-speed">
          <button type="button" className="b" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Playback speed">{rate === 1 ? '1' : rate}×</button>
          {menu && (
            <div className="cw-vp-menu" role="menu"><small>Speed</small>
              {SPEEDS.map((r) => <button type="button" key={r} role="menuitemradio" aria-checked={r === rate} className={r === rate ? 'on' : ''} onClick={() => { setRate(r); setMenu(false) }}>{r === 1 ? 'Normal' : `${r}×`}</button>)}
            </div>
          )}
        </div>
        <span className="cw-vp-vol">
          <button type="button" className="b" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? I.mute : I.vol}</button>
          <input type="range" min="0" max="100" value={volume} aria-label="Volume" onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (readyRef.current) { playerRef.current.setVolume(v); playerRef.current.unMute() } setMuted(false); setQuietStart(false) }} />
        </span>
        <button type="button" className="b" onClick={fullscreen} aria-label={full ? 'Leave full screen' : 'Full screen'} title="Full screen (F)">{I.fs}</button>
      </div>
    </div>
  )
})

export default WahaVideoPlayer
