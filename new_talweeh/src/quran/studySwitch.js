// Whether the Qurʾān pages show Study & Sources: switched on and off in the Academic System (Website CMS → Qurʾān
// pages), which the build writes into src/data/homeFeed.json (scripts/sync-home-feed.mjs). Off when it says nothing:
// the study is written in the library site and published through the portal, and is hidden until a sūrah is complete.
// Off: no Study tile, tab, button or badge, and /quran/study opens the reader; the reader, Read Mode and Listen are
// unaffected, and the published sūrahs' files (src/quran-study-static) stay.
import HOME_FEED from '../data/homeFeed.json'

export const STUDY_ON = HOME_FEED?.quran?.studyOn === true
// The books' own passages (al-Durr, Darwīsh, al-Taḥrīr, the dictionaries), switched on and off on their own: off, the
// study shows only Talweeh's notes (no Sources button, no book passages in Study, no Tafsīr or Dictionaries tabs).
export const SOURCES_ON = STUDY_ON && HOME_FEED?.quran?.sourcesOn === true
