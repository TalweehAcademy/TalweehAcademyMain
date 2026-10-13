// "Find your starting point" (/start): four questions, then the course to start with. Courses are placed as the
// academy teaches them (owner, 2026-10-12), not by the curriculum document's text levels; data/roadmap.js shows the
// Talweeh courses at the same levels, so keep the two in step when a course is added or moved.
// Levels are the answers to "Where are you now?": 0 very beginner, 1 beginner, 2 intermediate, 3 upper-intermediate,
// 4 advanced. Per science:
//   seq    the order of study; { soon } is a course not on the site yet, { group } short courses taken in any order
//   start  the starting point for each level: a course slug, { soon }, or null (nothing at that level yet)
//   side   other courses offered at that level;  fb  a science to start with instead;  note  what the result says
//   review courses offered as a review when there is nothing at that level yet
// A slug that isn't in the published catalogue is skipped, so a course appears here once it is published.
import { PUBLIC_COURSES } from './publicCourseIndex'
import { ARB } from './arabicWaha'

export const COURSE = new Map(PUBLIC_COURSES.map((c) => [c.slug, c]))
const live = (x) => typeof x === 'string' && COURSE.has(x)
// A course not on the site yet: SOON('Name') in seq or start shows it as coming soon.
const SOON = (soon) => ({ soon }) // eslint-disable-line no-unused-vars

export const GOALS = [
  { k: 'quran', b: 'Understand the Qurʾān in its own language', s: 'Read the Qurʾān in Arabic, not only in translation' },
  { k: 'arabic', b: 'Learn classical Arabic properly', s: 'Grammar, morphology and reading, step by step' },
  { k: 'one', b: 'Study one science', s: 'Fiqh, ʿAqīdah, Ḥadīth, Tafsīr, Tajwīd and more' },
  { k: 'path', b: 'Take the full path of a student of knowledge', s: 'Every science in order, as in a seminary' },
  { k: 'unsure', b: 'I’m not sure yet', s: 'Show me a good place to begin' },
]
export const SUBJECTS = [['fiqh', 'Ḥanafī Fiqh'], ['usul', 'Uṣūl al-Fiqh'], ['aqidah', 'ʿAqīdah'], ['hadith', 'Ḥadīth'], ['mustalah', 'Ḥadīth sciences'], ['tafsir', 'Tafsīr'], ['tajwid', 'Tajwīd'], ['nahw', 'Arabic grammar'], ['adab', 'Poetry & adab']]
export const LEVELS = [
  { b: 'Very beginner', s: 'I can read the Arabic letters, but haven’t studied the language.' },
  { b: 'Beginner', s: 'I read Arabic and have studied a little grammar.', e: 'e.g. Arabic 101 or al-Ājurrūmiyyah' },
  { b: 'Intermediate', s: 'I’ve studied two levels of naḥw and ṣarf.', e: 'e.g. al-Shadharah al-Dhahabiyyah and Binā’ al-Afʿāl; ready for al-Tuḥfah' },
  { b: 'Upper-intermediate', s: 'A good amount of Arabic, and books in other sciences too.', e: 'e.g. al-Tuḥfah, Taṣrīf al-ʿIzzī, Nūr al-Īḍāḥ, Uṣūl al-Shāshī' },
  { b: 'Advanced', s: 'I’ve studied at a seminary and am close to graduating, or have graduated.', e: 'e.g. Qaṭr al-Nadā, al-Hidāyah, Nukhbat al-Fikar' },
]
export const MODES = [
  { k: 'live', b: 'Live classes with a teacher', s: 'A set timetable, a class and a teacher you can ask' },
  { k: 'self', b: 'At my own pace', s: 'Recorded lessons, start any time' },
  { k: 'either', b: 'Either is fine', s: 'Show me the best fit' },
]
export const PROGRAMMES = {
  alim: { t: 'ʿĀlimiyyah', s: 'Live, guided classes through the core sciences with instructors', to: '/alimiyyah' },
  arabic: { t: 'Arabic Program', s: 'Two years, five modules; the first two mostly live', to: '/arabic' },
  hadith: { t: 'Ḥadīth Specialization', s: 'A two-year programme in the ḥadīth sciences', to: '/hadith-specialization' },
}
export const MODULES = ARB.MODULES.map((m) => ({ n: m.n, name: m.name, d: m.duration, f: m.format, texts: m.texts.map((t) => t.t) }))

const CHAPTERS = ['takwin-al-asanid', 'tadwin-al-sunnah', 'al-athbat-wal-faharis', 'al-jarh-wa-l-tadil', 'talweeh-od-24-ruwatalhadith', 'makanat-al-sunnah', 'takhri-j-al-h-adi-th-q2zxxj']
const BAYQUNI = 'talweeh-od-33-manzumahalbayquni'
const AR101 = 'arabic-101-5kqdyb', SARF101 = 'sarf-101-5lvy2y', SHADHARAH = 'al-shadharah-al-dhahabiyyah-5lvflh', QASAS = 'qasas-al-nabiyyin-ibrahim-alayhi-al-salam-5lvny9', NAWAWI = 'al-arbaun-an-nawawiyyah-5wa71u'
const AR_FIRST = 'Talweeh teaches this science from intermediate level, so start with Arabic first.'
const nothing = (what) => `Talweeh’s ${what}, so there’s nothing at your level yet.`

export const PLAN = {
  nahw: {
    name: 'Arabic', roadmap: 'nahw',
    seq: ['arabic-crash-course', { group: [AR101, SARF101], name: 'Arabic 101 · Ṣarf 101' }, { group: [SHADHARAH, QASAS], name: 'al-Shadharah al-Dhahabiyyah · Qaṣaṣ al-Nabiyyīn: Ibrāhīm' }, 'al-tuhfat-al-saniyyah', 'mutammimah-al-ajurrumiyyah', 'sharh-qatr-al-nada-wa-ball-al-sada'],
    start: ['arabic-crash-course', SHADHARAH, 'al-tuhfat-al-saniyyah', 'mutammimah-al-ajurrumiyyah', 'sharh-qatr-al-nada-wa-ball-al-sada'],
    side: { 0: [AR101, SARF101], 1: [QASAS], 2: ['al-irab-an-qawaid-al-irab', 'min-adab-al-islam'], 3: ['al-irab-an-qawaid-al-irab', 'min-adab-al-islam'] },
    note: { 0: 'You haven’t studied the language yet, so begin with the free Crash Course.' },
  },
  mustalah: {
    name: 'Ḥadīth sciences', roadmap: 'mustalah',
    seq: [BAYQUNI, 'introduction-to-usul-al-hadith', 'nukhbat-al-fikr', { group: CHAPTERS, name: 'Chapters of ʿUlūm al-Ḥadīth (short courses)' }, 'tadrib-al-rawi'],
    start: [BAYQUNI, BAYQUNI, 'introduction-to-usul-al-hadith', 'takwin-al-asanid', 'tadrib-al-rawi'],
    side: { 1: ['introduction-to-usul-al-hadith'], 2: ['nukhbat-al-fikr'], 3: CHAPTERS.slice(1), 4: CHAPTERS },
    note: { 3: 'The chapter courses each take one part of ʿUlūm al-Ḥadīth further; take them in any order, then Tadrīb al-Rāwī.' },
  },
  hadith: {
    name: 'Ḥadīth', roadmap: 'hadith',
    seq: [NAWAWI, 'al-shamail-al-muhammadiyyah', 'al-adab-al-mufrad', { group: ['introduction-to-al-muwattayn', 'muwatta-muhammad'], name: 'Introduction to al-Muwaṭṭaʾayn · Muwaṭṭaʾ Muḥammad' }],
    start: [NAWAWI, NAWAWI, 'al-shamail-al-muhammadiyyah', 'al-adab-al-mufrad', 'introduction-to-al-muwattayn'],
    side: { 4: ['muwatta-muhammad'] },
    note: { 4: 'The two Muwaṭṭaʾ courses go together: start with the introduction, then Muwaṭṭaʾ Muḥammad.' },
  },
  tafsir: { name: 'Tafsīr', roadmap: 'tafsir', seq: ['tafsir-of-juz-amma'], start: [null, null, 'tafsir-of-juz-amma', 'tafsir-of-juz-amma', 'tafsir-of-juz-amma'], fb: { 0: 'nahw', 1: 'nahw' }, note: { 0: AR_FIRST, 1: AR_FIRST } },
  tajwid: {
    name: 'Tajwīd', roadmap: 'tajwid', seq: ['tajwid-mastery-level-one'], start: ['tajwid-mastery-level-one', 'tajwid-mastery-level-one', null, null, null],
    note: { 2: nothing('Tajwīd course is for beginners'), 3: nothing('Tajwīd course is for beginners'), 4: nothing('Tajwīd course is for beginners') }, review: ['tajwid-mastery-level-one'],
  },
  adab: {
    name: 'Poetry & adab', roadmap: 'adab', seq: ['arabic-crash-course', 'taiyyah-of-al-ilbiri', 'lamiyyat-abi-talib'], start: [null, 'taiyyah-of-al-ilbiri', 'lamiyyat-abi-talib', null, null],
    fb: { 0: 'nahw' }, review: ['taiyyah-of-al-ilbiri', 'lamiyyat-abi-talib'],
    note: { 0: 'The poems begin once you know some Arabic, so start with the free Arabic Crash Course, then al-Tāʾiyyah.', 3: nothing('poetry courses so far are al-Tāʾiyyah and Lāmiyyat Abī Ṭālib'), 4: nothing('poetry courses so far are al-Tāʾiyyah and Lāmiyyat Abī Ṭālib') },
  },
  fiqh: {
    name: 'Ḥanafī Fiqh', roadmap: 'fiqh', seq: ['introduction-to-hanafi-fiqh', 'nur-al-idah', 'mukhtasar-al-quduri-qism-al-ibadat', 'mukhtasar-al-quduri-al-uqubat'],
    start: ['introduction-to-hanafi-fiqh', 'nur-al-idah', 'mukhtasar-al-quduri-qism-al-ibadat', null, null],
    side: { 0: ['nur-al-idah'], 1: ['introduction-to-hanafi-fiqh'], 2: ['mukhtasar-al-quduri-al-uqubat'] }, review: ['mukhtasar-al-quduri-qism-al-ibadat', 'mukhtasar-al-quduri-al-uqubat'],
    note: { 3: nothing('fiqh courses go up to Mukhtaṣar al-Qudūrī so far'), 4: nothing('fiqh courses go up to Mukhtaṣar al-Qudūrī so far') },
  },
  usul: {
    name: 'Uṣūl al-Fiqh', roadmap: 'usul', seq: ['introduction-to-usul-al-fiqh', 'hanafi-usul-al-fiqh-101', 'usul-al-shashi', 'sharh-al-waraqat-of-al-mahalli', 'musallam-al-thubut'],
    start: ['introduction-to-usul-al-fiqh', 'hanafi-usul-al-fiqh-101', 'usul-al-shashi', null, 'musallam-al-thubut'],
    side: { 0: ['hanafi-usul-al-fiqh-101'], 1: ['introduction-to-usul-al-fiqh'], 2: ['sharh-al-waraqat-of-al-mahalli'] }, review: ['usul-al-shashi', 'sharh-al-waraqat-of-al-mahalli'],
    note: { 3: 'Talweeh has no Uṣūl al-Fiqh course at your level yet. Uṣūl al-Shāshī and Sharḥ al-Waraqāt work as a review; Musallam al-Thubūt comes after.' },
  },
  aqidah: {
    name: 'ʿAqīdah', roadmap: 'aqidah', seq: ['introduction-to-usul-al-din'], start: ['introduction-to-usul-al-din', 'introduction-to-usul-al-din', null, null, null], review: [],
    note: { 2: nothing('ʿAqīdah course so far is the Introduction to Uṣūl al-Dīn'), 3: nothing('ʿAqīdah course so far is the Introduction to Uṣūl al-Dīn'), 4: nothing('ʿAqīdah course so far is the Introduction to Uṣūl al-Dīn') },
  },
}

// Arabic (and the Qurʾān) go to the Arabic Program, live or on demand: beginners take the whole programme from Module 1,
// others join at the module for their level; the Arabic assessment (/arabic/assessment, one stage per module) confirms it.
const MODULE_FOR = [1, 1, 3, 4, 5]
const isArabic = (a) => a.goal === 'arabic' || a.goal === 'quran' || (a.goal === 'one' && a.sub === 'nahw')
const goalSci = (a) => (a.goal === 'one' ? a.sub : a.goal === 'unsure' ? null : 'nahw')

export const countOf = (k) => new Set([...PLAN[k].seq.flatMap((x) => x.group || [x]), ...Object.values(PLAN[k].side || {}).flat()].filter(live)).size

// One science at one level → { sci, start, soon, note, side, from, ready }. `ready` is the course to come back to.
export function place(k, u, depth = 0) {
  const p = PLAN[k], s = p.start[u], note = p.note?.[u] || ''
  const sAvail = live(s) ? s : null
  if (!sAvail && !s?.soon && p.fb?.[u] && depth < 2) {
    const r = place(p.fb[u], u, depth + 1)
    return { ...r, note: note || r.note, from: k, ready: p.seq.find((x) => live(x) && x !== r.start) }
  }
  if (s?.soon) {
    const meanwhile = p.fb?.[u] ? place(p.fb[u], u, depth + 1).start : (p.side?.[u] || []).find(live) || null
    return { sci: k, start: meanwhile, soon: s.soon, note: note || `${s.soon} is coming soon.`, side: (p.side?.[u] || []).filter(live) }
  }
  return { sci: k, start: sAvail, note, side: (p.side?.[u] || []).filter(live) }
}

export function recommend(a) {
  const u = a.level, r = { start: null, soon: null, alts: [], path: null, prog: null, module: null, why: '' }
  const add = (slug, label) => { if (live(slug) && slug !== r.start && !r.alts.some((x) => x.slug === slug) && r.alts.length < 2) r.alts.push({ slug, label }) }
  const lv = LEVELS[u].b.toLowerCase()
  if (a.goal === 'unsure') {
    const picks = [['arabic-crash-course', 'tajwid-mastery-level-one', 'introduction-to-hanafi-fiqh'], [AR101, BAYQUNI, NAWAWI], ['tafsir-of-juz-amma', 'al-shamail-al-muhammadiyyah', 'introduction-to-usul-al-hadith'], ['tafsir-of-juz-amma', 'al-adab-al-mufrad', 'nukhbat-al-fikr'], ['introduction-to-al-muwattayn', 'muwatta-muhammad', 'tadrib-al-rawi']][u].filter(live)
    r.start = picks[0]; picks.slice(1).forEach((x) => add(x, 'Also a good start'))
    r.why = `You’re not sure yet, so start with a course that suits your level (${lv}), and branch out from there.`
    r.path = u <= 1 ? 'nahw' : u <= 3 ? 'tafsir' : 'hadith'
  } else {
    const k = goalSci(a), pl = place(k, u)
    r.start = pl.start; r.soon = pl.soon; r.ready = pl.ready
    r.path = pl.from && PLAN[pl.from].seq.includes(pl.start) ? pl.from : pl.sci
    r.why = pl.note || `At ${lv} level, this is where ${PLAN[pl.sci].name} starts for you.`
    if (r.ready) add(r.ready, `${PLAN[pl.from].name} · when you’re ready`)
    if (!pl.start && !pl.soon) { (PLAN[k].review || [PLAN[k].seq.find(live)]).forEach((x) => add(x, 'As a review')); r.prog = PROGRAMMES.alim; r.further = true }
    if (a.goal === 'quran') add(u >= 2 ? 'tafsir-of-juz-amma' : 'tajwid-mastery-level-one', 'Alongside')
    if (a.goal === 'path') ['fiqh', 'usul', 'aqidah'].forEach((s) => { const c = place(s, u).start; if (c) add(c, `${PLAN[s].name} · same stage`) })
    pl.side.forEach((x) => add(x, 'Also at your level'))
  }
  if (isArabic(a)) {
    r.module = MODULES[MODULE_FOR[u] - 1]
    r.alts = [{ slug: r.start, label: 'Or one course on its own' }, ...r.alts.filter((x) => x.slug !== r.start)].filter((x) => live(x.slug)).slice(0, 2)
    r.start = null; r.soon = null; r.why = ''
    return r
  }
  if (a.mode !== 'self' && !r.prog) {
    const k = goalSci(a)
    r.prog = a.goal === 'path' ? PROGRAMMES.alim : ((k === 'mustalah' || k === 'hadith') && u >= 2) ? PROGRAMMES.hadith : PROGRAMMES.alim
  }
  return r
}

// The short code in a result link (/start#one-fiqh-1-self) and back.
export const encode = (a) => [a.goal, a.sub, a.level, a.mode].filter((x) => x !== undefined).join('-')
export function decode(hash) {
  const p = (hash || '').replace(/^#/, '').split('-')
  const goal = p.shift()
  if (!GOALS.some((g) => g.k === goal)) return null
  const sub = goal === 'one' ? p.shift() : undefined
  if (goal === 'one' && !PLAN[sub]) return null
  const level = Number(p.shift()), mode = p.shift()
  if (!(level >= 0 && level <= 4) || !MODES.some((m) => m.k === mode)) return null
  return { goal, ...(sub ? { sub } : {}), level, mode }
}
