import { useEffect, useMemo, useRef, useState } from 'react'
import '../media-player-v14.css'
import '../media-player-v15.css'
import '../media-v17.css'

let ytApiPromise

function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browser required'))
  }

  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady()
      resolve(window.YT)
    }

    if (!document.querySelector('script[data-tmx-youtube-api="true"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.tmxYoutubeApi = 'true'
      script.onerror = () => reject(new Error('Unable to load YouTube API'))
      document.head.appendChild(script)
    }
  })

  return ytApiPromise
}

function PlayIcon({ pause = false }) {
  return pause ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 6.2h3.3v11.6H7.5V6.2Zm5.7 0h3.3v11.6h-3.3V6.2Z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.1 6.4v11.2l9-5.6-9-5.6Z" fill="currentColor" />
    </svg>
  )
}

function VolumeIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 9.3v5.4H8l4.3 3.4V5.9L8 9.3H4.5Z" fill="currentColor" />
      {muted ? (
        <path d="m15.2 9.1 4.1 5.8m0-5.8-4.1 5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M15.3 9.1a4.3 4.3 0 0 1 0 5.8M17.6 7.2a6.9 6.9 0 0 1 0 9.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5a7 7 0 1 1-6.2 3.75L4 7v5h5L7.2 10.2A5.1 5.1 0 1 0 12 6.9V5Z" fill="currentColor" />
    </svg>
  )
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, '0')

  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}`
    : `${minutes}:${secs}`
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2]

export default function TalweehMediaPlayer({ videoId, title, thumbnail }) {
  const iframeRef = useRef(null)
  const shellRef = useRef(null)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const initializedRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [posterVisible, setPosterVisible] = useState(true)
  const [ended, setEnded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams({
      enablejsapi: '1',
      autoplay: '0',
      controls: '0',
      disablekb: '1',
      fs: '0',
      iv_load_policy: '3',
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
      cc_load_policy: '0',
    })

    if (typeof window !== 'undefined') {
      params.set('origin', window.location.origin)
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
  }, [videoId])

  useEffect(() => {
    let cancelled = false

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || initializedRef.current || !iframeRef.current) return

        initializedRef.current = true

        const player = new YT.Player(iframeRef.current, {
          events: {
            onReady: (event) => {
              if (cancelled) return
              playerRef.current = event.target
              setReady(true)
              setDuration(event.target.getDuration() || 0)
              event.target.setVolume(100)
              try {
                event.target.setPlaybackRate(playbackRate)
              } catch {}
            },

            onStateChange: (event) => {
              if (cancelled) return

              if (event.data === YT.PlayerState.PLAYING) {
                setPlaying(true)
                setEnded(false)
                setPosterVisible(false)
                setDuration(event.target.getDuration() || 0)
              } else if (event.data === YT.PlayerState.PAUSED) {
                setPlaying(false)
              } else if (event.data === YT.PlayerState.ENDED) {
                setPlaying(false)
                setEnded(true)
                setPosterVisible(true)
                setCurrentTime(0)
              }
            },

            onPlaybackRateChange: (event) => {
              if (!cancelled && Number(event.data)) {
                setPlaybackRate(Number(event.data))
              }
            },
          },
        })

        playerRef.current = player

        timerRef.current = window.setInterval(() => {
          const active = playerRef.current
          if (!active?.getCurrentTime) return

          const now = active.getCurrentTime() || 0
          const total = active.getDuration?.() || 0

          setCurrentTime(now)
          if (total) setDuration(total)
        }, 300)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [videoId])

  const progress = useMemo(
    () => (duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0),
    [currentTime, duration],
  )

  function play() {
    if (!ready || !playerRef.current) return
    setPosterVisible(false)
    setEnded(false)
    playerRef.current.playVideo()
  }

  function togglePlayback() {
    if (!ready || !playerRef.current) return
    if (playing) playerRef.current.pauseVideo()
    else play()
  }

  function replay() {
    if (!ready || !playerRef.current) return
    setEnded(false)
    setPosterVisible(false)
    playerRef.current.seekTo(0, true)
    playerRef.current.playVideo()
  }

  function seek(event) {
    const next = Number(event.target.value)
    setCurrentTime(next)
    playerRef.current?.seekTo?.(next, true)
  }

  function toggleMute() {
    const player = playerRef.current
    if (!player) return

    if (muted) player.unMute()
    else player.mute()

    setMuted(!muted)
  }

  function changeSpeed(event) {
    const next = Number(event.target.value)
    setPlaybackRate(next)

    try {
      playerRef.current?.setPlaybackRate?.(next)
    } catch {}
  }

  async function toggleFullscreen() {
    const shell = shellRef.current
    if (!shell) return

    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await shell.requestFullscreen()
    } catch {}
  }

  return (
    <div className="tmx-player" ref={shellRef}>
      <iframe
        ref={iframeRef}
        className="tmx-player__iframe"
        src={iframeSrc}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex="-1"
      />

      <div className="tmx-player__mask tmx-player__mask--top" aria-hidden="true" />
      <div className="tmx-player__mask tmx-player__mask--bottom" aria-hidden="true" />

      {posterVisible && (
        <button
          type="button"
          className="tmx-player__poster"
          onClick={ended ? replay : play}
          aria-label={ended ? `Replay ${title}` : `Play ${title}`}
        >
          <img src={thumbnail} alt="" />
          <span className="tmx-player__posterShade" />

          <span className="tmx-player__brand">
            <span className="tmx-player__brandMark">T</span>
            Talweeh Academy
          </span>

          <span className="tmx-player__bigPlay">
            {ended ? <ReplayIcon /> : <PlayIcon />}
          </span>

          <span className="tmx-player__posterTitle">
            {ended ? 'Watch again' : title}
          </span>
        </button>
      )}

      {!posterVisible && (
        <button
          type="button"
          className="tmx-player__stage"
          onClick={togglePlayback}
          aria-label={playing ? 'Pause video' : 'Play video'}
        />
      )}

      <div className="tmx-player__controls">
        <button
          type="button"
          className="tmx-player__button tmx-player__button--play"
          onClick={togglePlayback}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={!ready}
        >
          <PlayIcon pause={playing} />
        </button>

        <span className="tmx-player__time">{formatTime(currentTime)}</span>

        <input
          className="tmx-player__progress"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={seek}
          aria-label="Video progress"
          style={{ '--tmx-progress': `${progress}%` }}
        />

        <span className="tmx-player__time tmx-player__duration">
          {formatTime(duration)}
        </span>

        <label className="tmx-v17-speedWrap">

          <select
            className="tmx-v17-speed"
            value={playbackRate}
            onChange={changeSpeed}
            aria-label="Playback speed"
            disabled={!ready}
          >
            {SPEEDS.map((speed) => (
              <option value={speed} key={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="tmx-player__button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          <VolumeIcon muted={muted} />
        </button>

        <button
          type="button"
          className="tmx-player__button"
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
        >
          <FullscreenIcon />
        </button>
      </div>
    </div>
  )
}
