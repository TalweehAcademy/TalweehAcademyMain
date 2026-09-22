import TalweehMediaPlayer from './TalweehMediaPlayer'

const VIDEO_ID = 'JB4WN6Dl1uI'
const THUMBNAIL = `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`

export default function ArabicIntroVideo() {
  return (
    <TalweehMediaPlayer
      videoId={VIDEO_ID}
      title="Talweeh Academy Arabic Program introduction"
      thumbnail={THUMBNAIL}
    />
  )
}