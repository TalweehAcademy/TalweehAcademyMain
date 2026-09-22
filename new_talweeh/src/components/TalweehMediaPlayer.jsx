import { useEffect, useMemo, useRef, useState } from 'react'
import '../media-player-v14.css'
import '../media-player-v15.css'
import '../media-v17.css'

let ytApiPromise

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2]
const PLAYBACK_RATE_STORAGE_KEY = 'talweeh-media-playback-rate'
const SEEK_SECONDS = 10

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
      <path
        d="M7.5 6.2h3.3v11.6H7.5V6.2Zm5.7 0h3.3v11.6h-3.3V6.2Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.1 6.4v11.2l9-5.6-9-5.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function VolumeIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 9.3v5.4H8l4.3 3.4V5.9L8 9.3H4.5Z"
        fill="currentColor"
      />

      {muted ? (
        <path
          d="m15.2 9.1 4.1 5.8m0-5.8-4.1 5.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M15.3 9.1a4.3 4.3 0 0 1 0 5.8M17.6 7.2a6.9 6.9 0 0 1 0 9.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5a7 7 0 1 1-6.2 3.75L4 7v5h5L7.2 10.2A5.1 5.1 0 1 0 12 6.9V5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SeekIcon({ forward = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g
        transform={forward ? 'matrix(-1 0 0 1 24 0)' : undefined}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8.2 4.7H4.6V1.1" />
        <path d="M4.9 4.5A9 9 0 1 1 3.1 13" />
      </g>

      <text
        x="12"
        y="14.6"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontFamily="inherit"
        fontSize="7"
        fontWeight="800"
      >
        10
      </text>
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

function getSavedPlaybackRate() {
  if (typeof window === 'undefined') return 1

  try {
    const saved = Number(
      window.localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY),
    )

    return SPEEDS.includes(saved) ? saved : 1
  } catch {
    return 1
  }
}

export default function TalweehMediaPlayer({
  videoId,
  title,
  thumbnail,
}) {
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
  const [playbackRate, setPlaybackRate] = useState(
    getSavedPlaybackRate,
  )
  const [controlsVisible, setControlsVisible] = useState(true)

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

    setReady(false)
    setPlaying(false)
    setEnded(false)
    setPosterVisible(true)
    setCurrentTime(0)
    setDuration(0)

    initializedRef.current = false

    loadYouTubeApi()
      .then((YT) => {
        if (
          cancelled ||
          initializedRef.current ||
          !iframeRef.current
        ) {
          return
        }

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
              const next = Number(event.data)

              if (!cancelled && SPEEDS.includes(next)) {
                setPlaybackRate(next)
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

          if (total) {
            setDuration(total)
          }
        }, 300)
      })
      .catch(() => {})

    return () => {
      cancelled = true

      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }

      try {
        playerRef.current?.destroy?.()
      } catch {}

      playerRef.current = null
      initializedRef.current = false
    }
  }, [videoId])

  const progress = useMemo(
    () =>
      duration
        ? Math.min(
            100,
            Math.max(0, (currentTime / duration) * 100),
          )
        : 0,
    [currentTime, duration],
  )

  function focusPlayer() {
    window.requestAnimationFrame(() => {
      shellRef.current?.focus?.({ preventScroll: true })
    })
  }

  function play() {
    if (!ready || !playerRef.current) return

    setPosterVisible(false)
    setEnded(false)

    playerRef.current.playVideo()
    focusPlayer()
  }

  function togglePlayback() {
    if (!ready || !playerRef.current) return

    if (playing) {
      playerRef.current.pauseVideo()
    } else {
      play()
    }
  }

  function replay() {
    if (!ready || !playerRef.current) return

    setEnded(false)
    setPosterVisible(false)
    setCurrentTime(0)

    playerRef.current.seekTo(0, true)
    playerRef.current.playVideo()

    focusPlayer()
  }

  function seek(event) {
    const next = Number(event.target.value)

    setCurrentTime(next)

    try {
      playerRef.current?.seekTo?.(next, true)
    } catch {}
  }

  function seekBy(amount) {
    const player = playerRef.current

    if (!ready || !player?.seekTo) return

    let now = currentTime

    try {
      now = Number(player.getCurrentTime?.()) || currentTime
    } catch {}

    const maximum = duration || Number.MAX_SAFE_INTEGER
    const next = Math.min(
      maximum,
      Math.max(0, now + amount),
    )

    setCurrentTime(next)

    try {
      player.seekTo(next, true)
    } catch {}
  }

  function toggleMute() {
    const player = playerRef.current

    if (!player) return

    if (muted) {
      player.unMute()
    } else {
      player.mute()
    }

    setMuted(!muted)
  }

  function changeSpeed(event) {
    const next = Number(event.target.value)

    if (!SPEEDS.includes(next)) return

    setPlaybackRate(next)

    try {
      window.localStorage.setItem(
        PLAYBACK_RATE_STORAGE_KEY,
        String(next),
      )
    } catch {}

    try {
      playerRef.current?.setPlaybackRate?.(next)
    } catch {}
  }

  function handleKeyboard(event) {
    const target = event.target

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      seekBy(-SEEK_SECONDS)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      seekBy(SEEK_SECONDS)
    }
  }

  async function toggleFullscreen() {
    const shell = shellRef.current

    if (!shell) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await shell.requestFullscreen()
      }
    } catch {}
  }

  return (
    <>
      <style>{`
        .tmx-player.tmx-player--premium {
          position: relative !important;
          overflow: hidden !important;
          isolation: isolate !important;
          border: 1px solid rgba(224, 159, 62, .38) !important;
          border-radius: 18px !important;
          background: #102116 !important;
          box-shadow:
            0 18px 48px rgba(16, 33, 22, .18),
            0 0 0 1px rgba(255,255,255,.025) inset !important;
        }

        .tmx-player.tmx-player--premium:focus {
          outline: none !important;
        }

        .tmx-player.tmx-player--premium:focus-visible {
          outline: 2px solid rgba(224, 159, 62, .72) !important;
          outline-offset: 3px !important;
        }

        .tmx-player--premium .tmx-player__posterShade {
          background:
            linear-gradient(
              180deg,
              rgba(10, 24, 15, .12) 0%,
              rgba(10, 24, 15, .28) 50%,
              rgba(10, 24, 15, .86) 100%
            ) !important;
        }

        .tmx-player--premium .tmx-player__brand {
          border: 1px solid rgba(224, 159, 62, .42) !important;
          background: rgba(12, 30, 19, .78) !important;
          color: #f4e3c4 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,.16) !important;
          backdrop-filter: blur(8px) !important;
        }

        .tmx-player--premium .tmx-player__brandMark {
          background: linear-gradient(135deg, #e8b65c, #c9872f) !important;
          color: #17351f !important;
          box-shadow: 0 0 0 1px rgba(255,255,255,.16) inset !important;
        }

        .tmx-player--premium .tmx-player__bigPlay {
          background:
            linear-gradient(135deg, #e8b65c, #cf8e35) !important;
          color: #17351f !important;
          border: 1px solid rgba(255, 229, 180, .62) !important;
          box-shadow:
            0 12px 34px rgba(0,0,0,.25),
            0 0 0 6px rgba(224,159,62,.10) !important;
          transition:
            transform .18s ease,
            box-shadow .18s ease !important;
        }

        .tmx-player--premium .tmx-player__poster:hover .tmx-player__bigPlay {
          transform: scale(1.06) !important;
          box-shadow:
            0 14px 38px rgba(0,0,0,.28),
            0 0 0 9px rgba(224,159,62,.12) !important;
        }

        .tmx-player--premium .tmx-player__posterTitle {
          color: #fffaf0 !important;
          text-shadow: 0 2px 12px rgba(0,0,0,.42) !important;
        }

        .tmx-player--premium .tmx-player__controls {
          background:
            linear-gradient(
              180deg,
              rgba(12, 30, 19, .94),
              rgba(8, 22, 14, .98)
            ) !important;
          border-top: 1px solid rgba(224,159,62,.24) !important;
          box-shadow: 0 -12px 30px rgba(0,0,0,.12) !important;
        }

        .tmx-player--premium .tmx-player__button {
          color: #f4e3c4 !important;
          border-radius: 10px !important;
          transition:
            color .16s ease,
            background .16s ease,
            transform .16s ease !important;
        }

        .tmx-player--premium .tmx-player__button:hover {
          color: #e8b65c !important;
          background: rgba(224,159,62,.10) !important;
          transform: translateY(-1px) !important;
        }

        .tmx-player--premium .tmx-player__button--play {
          color: #f4e3c4 !important;
        }

        .tmx-player--premium .tmx-player__time,
        .tmx-player--premium .tmx-player__duration {
          color: rgba(255, 250, 240, .78) !important;
        }

        .tmx-player--premium .tmx-progress {
          accent-color: #e09f3e !important;
        }

        .tmx-player--premium .tmx-v17-speed {
          border: 1px solid rgba(224,159,62,.44) !important;
          background-color: rgba(255,255,255,.055) !important;
          color: #f1d9b1 !important;
        }

        .tmx-player--premium .tmx-seek-button {
          /* Premium circular ±10 second controls */
          position: relative !important;
          width: 46px !important;
          min-width: 46px !important;
          height: 46px !important;

          padding: 0 !important;
          margin: 0 2px !important;

          display: inline-grid !important;
          place-items: center !important;

          border: 1px solid rgba(224, 159, 62, .58) !important;
          border-radius: 50% !important;

          background:
            linear-gradient(
              180deg,
              rgba(24, 58, 37, .92),
              rgba(8, 29, 18, .98)
            ) !important;

          color: #f4e3c4 !important;

          box-shadow:
            0 4px 12px rgba(0,0,0,.16),
            inset 0 0 0 1px rgba(255,255,255,.025) !important;

          flex: 0 0 46px !important;

          transform: none !important;
        }

        .tmx-player--premium .tmx-seek-button:hover {
          color: #f1c46f !important;

          border-color: rgba(232, 182, 92, .9) !important;

          background:
            linear-gradient(
              180deg,
              rgba(31, 72, 46, .98),
              rgba(10, 37, 22, 1)
            ) !important;

          transform: translateY(-1px) !important;
        }

        .tmx-player--premium .tmx-seek-button svg {
          width: 27px !important;
          height: 27px !important;
          overflow: visible !important;
        }

        /* Reference-style premium control bar */
        .tmx-player--premium .tmx-player__controls {
          box-sizing: border-box !important;

          min-height: 70px !important;
          height: 70px !important;

          padding: 9px 16px !important;
          gap: 10px !important;

          display: flex !important;
          align-items: center !important;

          background:
            linear-gradient(
              90deg,
              #071c11 0%,
              #0d2b1b 48%,
              #071c11 100%
            ) !important;

          border-top: 1px solid rgba(224,159,62,.72) !important;

          box-shadow:
            0 -8px 24px rgba(0,0,0,.12),
            inset 0 1px 0 rgba(255,255,255,.025) !important;
        }

        /* Main play button becomes the larger outlined pill/circle */
        .tmx-player--premium .tmx-player__button--play {
          width: 58px !important;
          min-width: 58px !important;
          height: 46px !important;

          display: inline-grid !important;
          place-items: center !important;

          padding: 0 !important;

          border: 1px solid rgba(224,159,62,.65) !important;
          border-radius: 999px !important;

          background: rgba(8, 31, 19, .82) !important;

          color: #f4e3c4 !important;

          flex: 0 0 58px !important;
        }

        .tmx-player--premium .tmx-player__button--play svg {
          width: 24px !important;
          height: 24px !important;
        }

        /* Current time */
        .tmx-player--premium .tmx-player__time {
          min-width: 42px !important;

          margin-left: 5px !important;

          color: #fff7e8 !important;

          font-size: 13px !important;
          font-weight: 600 !important;

          white-space: nowrap !important;
        }

        /* Progress takes the available middle space */
        .tmx-player--premium .tmx-player__progress {
          flex: 1 1 auto !important;
          min-width: 100px !important;

          margin: 0 6px !important;
        }

        /* Duration */
        .tmx-player--premium .tmx-player__duration {
          min-width: 45px !important;

          color: #fff7e8 !important;

          font-size: 13px !important;
          font-weight: 600 !important;

          white-space: nowrap !important;
        }

        /* Larger premium speed pill */
        .tmx-player--premium .tmx-v17-speedWrap {
          flex: 0 0 auto !important;
        }

        .tmx-player--premium .tmx-v17-speed {
          width: 76px !important;
          min-width: 76px !important;
          height: 44px !important;

          padding: 0 27px 0 13px !important;

          border: 1px solid rgba(224,159,62,.62) !important;
          border-radius: 999px !important;

          color: #f5dfb6 !important;

          font-size: 13px !important;
          font-weight: 800 !important;
        }

        /* Right-side volume/fullscreen */
        .tmx-player--premium .tmx-player__controls > .tmx-player__button:not(.tmx-player__button--play):not(.tmx-seek-button) {
          width: 40px !important;
          min-width: 40px !important;
          height: 40px !important;

          display: inline-grid !important;
          place-items: center !important;

          padding: 0 !important;

          color: #f4e3c4 !important;

          flex: 0 0 40px !important;
        }

        .tmx-player--premium .tmx-player__controls > .tmx-player__button:not(.tmx-player__button--play):not(.tmx-seek-button) svg {
          width: 22px !important;
          height: 22px !important;
        }

        @media (max-width: 620px) {
          .tmx-player.tmx-player--premium {
            border-radius: 13px !important;
          }

          .tmx-player--premium .tmx-seek-button {
            width: 32px !important;
            min-width: 32px !important;
          }

          .tmx-player--premium .tmx-seek-button svg {
            width: 18px !important;
            height: 18px !important;
          }
        }

        /* FINAL CONTROL BAR LAYOUT OVERRIDES */
        .tmx-player--premium .tmx-player__controls {
          display: grid !important;

          grid-template-columns:
            58px
            46px
            46px
            auto
            minmax(180px, 1fr)
            auto
            76px
            40px
            40px !important;

          align-items: center !important;
          column-gap: 10px !important;

          width: 100% !important;
          min-height: 70px !important;
          padding: 9px 16px !important;
        }

        .tmx-player--premium .tmx-player__progress {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          margin: 0 !important;
          flex: none !important;
        }

        /* The wrapper fills the grid column, so the range input must fill it too.
           Older player stylesheets otherwise leave the input at a fixed width. */
        .tmx-player--premium .tmx-player__progress .tmx-progress {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          margin: 0 !important;
        }

        .tmx-player--premium .tmx-player__time,
        .tmx-player--premium .tmx-player__duration {
          width: auto !important;
          min-width: max-content !important;
          margin: 0 !important;
        }

        /* Keep every control usable when the single desktop row no longer fits. */
        @media (max-width: 760px) {
          .tmx-player--premium .tmx-player__controls {
            height: auto !important;
            min-height: 106px !important;
            padding: 8px 10px !important;
            column-gap: 7px !important;
            row-gap: 7px !important;

            grid-template-columns:
              48px
              36px
              36px
              minmax(64px, 1fr)
              36px
              36px !important;

            grid-template-areas:
              "play back forward speed volume fullscreen"
              "time progress progress progress progress duration" !important;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(1) {
            grid-area: play;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(2) {
            grid-area: back;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(3) {
            grid-area: forward;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(4) {
            grid-area: time;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(5) {
            grid-area: progress;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(6) {
            grid-area: duration;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(7) {
            grid-area: speed;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(8) {
            grid-area: volume;
          }

          .tmx-player--premium .tmx-player__controls > :nth-child(9) {
            grid-area: fullscreen;
          }

          .tmx-player--premium .tmx-player__button--play {
            width: 48px !important;
            min-width: 48px !important;
          }

          .tmx-player--premium .tmx-seek-button {
            width: 36px !important;
            min-width: 36px !important;
            height: 40px !important;
          }

          .tmx-player--premium .tmx-v17-speedWrap,
          .tmx-player--premium .tmx-v17-speed {
            width: 100% !important;
            min-width: 0 !important;
          }

          .tmx-player--premium .tmx-player__controls > .tmx-player__button:not(.tmx-player__button--play):not(.tmx-seek-button) {
            width: 36px !important;
            min-width: 36px !important;
          }

          .tmx-player--premium .tmx-player__time {
            justify-self: start !important;
          }

          .tmx-player--premium .tmx-player__duration {
            justify-self: end !important;
          }
        }

        /* Auto-hide controls when pointer leaves player */
        .tmx-player--premium .tmx-player__controls {
          opacity: 1 !important;
          transform: translateY(0) !important;

          transition:
            opacity 180ms ease,
            transform 220ms ease !important;
        }

        .tmx-player--premium.tmx-controls-hidden .tmx-player__controls {
          opacity: 0 !important;
          transform: translateY(100%) !important;

          pointer-events: none !important;
        }

        .tmx-player--premium.tmx-controls-visible .tmx-player__controls {
          opacity: 1 !important;
          transform: translateY(0) !important;

          pointer-events: auto !important;
        }

        .tmx-player--premium.tmx-controls-hidden {
          cursor: none !important;
        }

        .tmx-player--premium.tmx-controls-visible {
          cursor: default !important;
        }
      `}</style>

      <div
        className={`tmx-player tmx-player--premium ${
          controlsVisible ? 'tmx-controls-visible' : 'tmx-controls-hidden'
        }`}
        ref={shellRef}
        tabIndex={0}
        onKeyDown={handleKeyboard}
        onMouseEnter={() => setControlsVisible(true)}
        onMouseMove={() => setControlsVisible(true)}
        onMouseLeave={() => setControlsVisible(false)}
        aria-label={`${title} video player`}
      >
        <iframe
          ref={iframeRef}
          className="tmx-player__iframe"
          src={iframeSrc}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex="-1"
        />

        <div
          className="tmx-player__mask tmx-player__mask--top"
          aria-hidden="true"
        />

        <div
          className="tmx-player__mask tmx-player__mask--bottom"
          aria-hidden="true"
        />

        {posterVisible && (
          <button
            type="button"
            className="tmx-player__poster"
            onClick={ended ? replay : play}
            aria-label={
              ended ? `Replay ${title}` : `Play ${title}`
            }
          >
            <img src={thumbnail} alt="" />

            <span
              className="tmx-player__posterShade"
              aria-hidden="true"
            />

            <span className="tmx-player__brand">
              <span className="tmx-player__brandMark">
                T
              </span>
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

          <button
            type="button"
            className="tmx-player__button tmx-seek-button"
            onClick={() => seekBy(-SEEK_SECONDS)}
            aria-label="Go back 10 seconds"
            title="Back 10 seconds"
            disabled={!ready}
          >
            <SeekIcon />
          </button>

          <button
            type="button"
            className="tmx-player__button tmx-seek-button"
            onClick={() => seekBy(SEEK_SECONDS)}
            aria-label="Go forward 10 seconds"
            title="Forward 10 seconds"
            disabled={!ready}
          >
            <SeekIcon forward />
          </button>

          <span className="tmx-player__time">
            {formatTime(currentTime)}
          </span>

          <div className="tmx-player__progress">
            <input
              className="tmx-progress"
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={seek}
              aria-label="Video progress"
              disabled={!ready || !duration}
              style={{
                '--tmx-progress': `${progress}%`,
              }}
            />
          </div>

          <span className="tmx-player__duration">
            {formatTime(duration)}
          </span>

          <label className="tmx-v17-speedWrap">
            <span className="sr-only">Playback speed</span>

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
            disabled={!ready}
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
    </>
  )
}
