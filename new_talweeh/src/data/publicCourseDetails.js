// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Each loader is a literal dynamic import so Vite emits one course-data chunk
// per public course. Only the requested course is downloaded by the browser.

const COURSE_LOADERS = {
  "introduction-to-al-muwattayn": () => import('./public-course-details/introduction-to-al-muwattayn.js'),
  "muwatta-muhammad": () => import('./public-course-details/muwatta-muhammad.js'),
  "takhri-j-al-h-adi-th-q2zxxj": () => import('./public-course-details/takhri-j-al-h-adi-th-q2zxxj.js'),
  "al-adab-al-mufrad": () => import('./public-course-details/al-adab-al-mufrad.js'),
  "al-shamail-al-muhammadiyyah": () => import('./public-course-details/al-shamail-al-muhammadiyyah.js'),
  "al-tuhfat-al-saniyyah": () => import('./public-course-details/al-tuhfat-al-saniyyah.js'),
  "al-athbat-wal-faharis": () => import('./public-course-details/al-athbat-wal-faharis.js'),
  "al-irab-an-qawaid-al-irab": () => import('./public-course-details/al-irab-an-qawaid-al-irab.js'),
  "al-jarh-wa-l-tadil": () => import('./public-course-details/al-jarh-wa-l-tadil.js'),
  "arabic-crash-course": () => import('./public-course-details/arabic-crash-course.js'),
  "introduction-to-hanafi-fiqh": () => import('./public-course-details/introduction-to-hanafi-fiqh.js'),
  "introduction-to-usul-al-din": () => import('./public-course-details/introduction-to-usul-al-din.js'),
  "introduction-to-usul-al-fiqh": () => import('./public-course-details/introduction-to-usul-al-fiqh.js'),
  "introduction-to-usul-al-hadith": () => import('./public-course-details/introduction-to-usul-al-hadith.js'),
  "lamiyyat-abi-talib": () => import('./public-course-details/lamiyyat-abi-talib.js'),
  "makanat-al-sunnah": () => import('./public-course-details/makanat-al-sunnah.js'),
  "min-adab-al-islam": () => import('./public-course-details/min-adab-al-islam.js'),
  "mukhtasar-al-quduri-al-uqubat": () => import('./public-course-details/mukhtasar-al-quduri-al-uqubat.js'),
  "mukhtasar-al-quduri-qism-al-ibadat": () => import('./public-course-details/mukhtasar-al-quduri-qism-al-ibadat.js'),
  "musallam-al-thubut": () => import('./public-course-details/musallam-al-thubut.js'),
  "mutammimah-al-ajurrumiyyah": () => import('./public-course-details/mutammimah-al-ajurrumiyyah.js'),
  "nukhbat-al-fikr": () => import('./public-course-details/nukhbat-al-fikr.js'),
  "nur-al-idah": () => import('./public-course-details/nur-al-idah.js'),
  "sharh-qatr-al-nada-wa-ball-al-sada": () => import('./public-course-details/sharh-qatr-al-nada-wa-ball-al-sada.js'),
  "sharh-al-waraqat-of-al-mahalli": () => import('./public-course-details/sharh-al-waraqat-of-al-mahalli.js'),
  "tadrib-al-rawi": () => import('./public-course-details/tadrib-al-rawi.js'),
  "tadwin-al-sunnah": () => import('./public-course-details/tadwin-al-sunnah.js'),
  "tafsir-of-juz-amma": () => import('./public-course-details/tafsir-of-juz-amma.js'),
  "tajwid-mastery-level-one": () => import('./public-course-details/tajwid-mastery-level-one.js'),
  "takwin-al-asanid": () => import('./public-course-details/takwin-al-asanid.js'),
  "taiyyah-of-al-ilbiri": () => import('./public-course-details/taiyyah-of-al-ilbiri.js'),
  "usul-al-shashi": () => import('./public-course-details/usul-al-shashi.js'),
  "hanafi-usul-al-fiqh-101": () => import('./public-course-details/hanafi-usul-al-fiqh-101.js'),
}

export async function loadPublicCourse(slug) {
  const loader = COURSE_LOADERS[String(slug || '')]
  if (!loader) return null
  const module = await loader()
  return module.default || null
}
