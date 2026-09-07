import { useState } from 'react'

const VIDEO_ID = 'JB4WN6Dl1uI'
const THUMBNAIL = `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`
const FALLBACK_THUMBNAIL = `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`

export default function ArabicIntroVideo() {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <div className="arabic-v2-video-player">
        <iframe
          src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="Talweeh Academy Arabic Program introduction"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      className="arabic-v2-video-facade"
      onClick={() => setPlaying(true)}
      aria-label="Play Talweeh Academy Arabic Program introduction"
    >
      <img
        src={THUMBNAIL}
        alt=""
        loading="eager"
        onError={(event) => {
          if (event.currentTarget.src !== FALLBACK_THUMBNAIL) {
            event.currentTarget.src = FALLBACK_THUMBNAIL
          }
        }}
      />

      <span className="arabic-v2-video-shade" aria-hidden="true" />

      <span className="arabic-v2-video-label" aria-hidden="true">
        Talweeh Academy · Arabic
      </span>

      <span className="arabic-v2-video-play" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M8.4 6.6v10.8L17.2 12 8.4 6.6Z" fill="currentColor" />
        </svg>
      </span>
    </button>
  )
}
