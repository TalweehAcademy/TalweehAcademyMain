/* eslint-disable react/prop-types */
// Lesson video player for free courses: the YouTube IFrame player (youtube-nocookie, controls
// hidden) inside an emerald frame with Talweeh controls — play/pause, back/forward 10 seconds
// (buttons, ← → and J/L), playback speed 0.5×–2× (menu and < >), seek bar with buffer and hover
// time, volume/mute (M) and full screen (F). The YouTube script only loads once a lesson is played.
import { useCallback, useEffect, useRef, useState } from 'react'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const RATE_KEY = 'talweeh-video-rate'

// Several players can share a page (the homepage lectures): body-level keys go to the one last
// started (or the only one mounted), and starting one pauses the rest.
const mounted = new Set()
let activeHost = null

let apiPromise = null
function loadYouTubeApi() {
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

const I = {
  play: <svg viewBox="0 0 24 24" className="fill"><path d="M8 5.5v13l11-6.5z" /></svg>,
  pause: <svg viewBox="0 0 24 24" className="fill"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  back: <svg viewBox="0 0 24 24"><path d="M11 5 5 12l6 7M19 5l-6 7 6 7" /></svg>,
  fwd: <svg viewBox="0 0 24 24"><path d="m13 5 6 7-6 7M5 5l6 7-6 7" /></svg>,
  vol: <svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></svg>,
  mute: <svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10zM17 9l5 6M22 9l-5 6" /></svg>,
  fs: <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>,
}

export default function WahaVideoPlayer({ videoId, title, kicker, autoplay = false, onEnded }) {
  const hostRef = useRef(null)
  const mountRef = useRef(null)
  const playerRef = useRef(null)
  const endedRef = useRef(onEnded)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState({ t: 0, d: 0, b: 0 })
  const [rate, setRateState] = useState(() => Number(localStorage.getItem(RATE_KEY)) || 1)
  const [menu, setMenu] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [flash, setFlash] = useState(null)
  const [hover, setHover] = useState({ x: 0, t: 0 })
  endedRef.current = onEnded

  const tick = useCallback(() => {
    const p = playerRef.current
    if (!p?.getDuration) return
    setTime({ t: p.getCurrentTime() || 0, d: p.getDuration() || 0, b: p.getVideoLoadedFraction?.() || 0 })
  }, [])

  // Start (or switch) the video.
  const start = useCallback(async () => {
    setStarted(true)
    activeHost = hostRef.current
    await loadYouTubeApi()
    if (!playerRef.current) {
      await new Promise((resolve) => {
        playerRef.current = new window.YT.Player(mountRef.current, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0 },
          events: {
            onReady: (e) => { e.target.setPlaybackRate(rate); resolve() },
            onStateChange: (e) => {
              setPlaying(e.data === 1)
              if (e.data === 1) {
                activeHost = hostRef.current
                mounted.forEach((other) => { if (other !== playerRef) try { if (other.current?.getPlayerState?.() === 1) other.current.pauseVideo() } catch { /* not ready */ } })
              }
              if (e.data === 0) endedRef.current?.()
            },
          },
        })
      })
    } else if (playerRef.current.getVideoData?.().video_id !== videoId) {
      playerRef.current.loadVideoById(videoId)
    }
    playerRef.current.playVideo()
    hostRef.current?.querySelector('.cw-vp-screen')?.focus({ preventScroll: true })
  }, [videoId, rate])

  // New lesson: reset, and play straight away if asked.
  useEffect(() => {
    setTime({ t: 0, d: 0, b: 0 })
    if (playerRef.current) {
      if (autoplay) playerRef.current.loadVideoById(videoId)
      else { playerRef.current.cueVideoById(videoId); setStarted(false) }
    } else if (autoplay) start()
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
      try { playerRef.current?.destroy() } catch { /* already gone */ }
    }
  }, [])

  const say = (text, side = '') => { setFlash({ text, side, k: Date.now() }) }
  useEffect(() => { if (!flash) return undefined; const id = setTimeout(() => setFlash(null), 650); return () => clearTimeout(id) }, [flash])

  const toggle = () => { const p = playerRef.current; if (!p) return start(); p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo() }
  const skip = (sec) => {
    const p = playerRef.current; if (!p) return
    p.seekTo(Math.max(0, Math.min((p.getDuration() || 0) - 0.5, (p.getCurrentTime() || 0) + sec)), true)
    tick(); say(sec < 0 ? '« 10 s' : '10 s »', sec < 0 ? 'l' : 'r')
  }
  const setRate = (r) => {
    setRateState(r); try { localStorage.setItem(RATE_KEY, String(r)) } catch { /* private mode */ }
    playerRef.current?.setPlaybackRate?.(r); say(r === 1 ? 'Normal speed' : `${r}×`)
  }
  const toggleMute = () => { const p = playerRef.current; if (!p) return; if (p.isMuted()) { p.unMute(); setMuted(false) } else { p.mute(); setMuted(true) } }
  const fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else hostRef.current?.requestFullscreen?.() }

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

  const frac = time.d ? time.t / time.d : 0
  const seekFrac = (e) => { const r = e.currentTarget.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) }

  return (
    <div className={`cw-vp${playing ? ' playing' : ''}`} ref={hostRef}>
      <div className="cw-vp-screen" tabIndex={0} aria-label="Lesson video — space to play, arrow keys skip 10 seconds">
        <div className="cw-vp-yt"><div ref={mountRef} /></div>
        <div className="cw-vp-click" onClick={toggle} onDoubleClick={fullscreen} aria-hidden="true" />
        {!started && (
          <button type="button" className="cw-vp-poster" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }} onClick={start} aria-label={`Play ${title}`}>
            <span className="big">{I.play}</span>
            <span className="cap"><small>{kicker}</small><strong>{title}</strong></span>
          </button>
        )}
        {flash && <div key={flash.k} className={`cw-vp-flash ${flash.side}`}>{flash.text}</div>}
      </div>
      <div className="cw-vp-bar">
        <button type="button" className="b pp" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? I.pause : I.play}</button>
        <button type="button" className="b skip" onClick={() => skip(-10)} aria-label="Back 10 seconds" title="Back 10 s (←)">{I.back}<span>10</span></button>
        <button type="button" className="b skip" onClick={() => skip(10)} aria-label="Forward 10 seconds" title="Forward 10 s (→)"><span>10</span>{I.fwd}</button>
        <span className="cw-vp-time">{fmt(time.t)} / {fmt(time.d)}</span>
        <div className="cw-vp-prog" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(time.d)} aria-valuenow={Math.round(time.t)} tabIndex={-1}
          onMouseMove={(e) => { const f = seekFrac(e); setHover({ x: f, t: f * time.d }) }}
          onClick={(e) => { if (playerRef.current && time.d) { playerRef.current.seekTo(seekFrac(e) * time.d, true); tick() } }}>
          <span className="tr"><span className="bf" style={{ width: `${time.b * 100}%` }} /><span className="pl" style={{ width: `${frac * 100}%` }} /></span>
          <span className="kn" style={{ left: `${frac * 100}%` }} /><span className="tip" style={{ left: `${hover.x * 100}%` }}>{fmt(hover.t)}</span>
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
          <input type="range" min="0" max="100" value={volume} aria-label="Volume" onChange={(e) => { const v = Number(e.target.value); setVolume(v); playerRef.current?.setVolume(v); playerRef.current?.unMute(); setMuted(false) }} />
        </span>
        <button type="button" className="b" onClick={fullscreen} aria-label="Full screen" title="Full screen (F)">{I.fs}</button>
      </div>
    </div>
  )
}
