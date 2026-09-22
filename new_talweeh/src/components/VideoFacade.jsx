/* eslint-disable react/prop-types */
import { extractVideoId } from '../utils/youtube'
import TalweehMediaPlayer from './TalweehMediaPlayer'

export default function VideoFacade({ src, title, thumbnail }) {
  const videoId = extractVideoId(src)

  if (!videoId) return null

  return (
    <TalweehMediaPlayer
      videoId={videoId}
      title={title || 'Talweeh Academy video'}
      thumbnail={
        thumbnail ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      }
    />
  )
}