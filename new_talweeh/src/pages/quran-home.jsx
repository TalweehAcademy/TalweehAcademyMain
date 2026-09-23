/* eslint-disable react/prop-types */
// Qurʾān home ("Fihris", from mockups/quran-waha-index.html): search, continue reading,
// shortcuts, a "Commonly read" pop-up, and the full surah / juz index. Every link opens
// the Qurʾān pages: surahs and search results open the reader (src/pages/quran.jsx, ?surah=&ayah=);
// the tiles open Read Mode (/quran/read), Study (/quran/study) and Listen (/quran/listen).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WahaPage, useWahaMotion } from '../components/WahaShell'
import { QURAN_SURAHS, QURAN_JUZ_STARTS } from '../data/quranIndex'
import '../quran-home-v1.css'

const ALQURAN_SEARCH = 'https://api.alquran.cloud/v1/search'
// A surah with a published Talweeh study package (src/quran-study-static) to land on from "Study".
const STUDY_SURAH = 81

const surahOf = (n) => {
  const s = QURAN_SURAHS[n - 1]
  return { n: s[0], ar: s[1], en: s[2], meaning: s[3], ayahs: s[4], type: s[5] }
}
const readerUrl = (surah, extra = {}) => {
  const params = new URLSearchParams({ surah: String(surah) })
  for (const [k, v] of Object.entries(extra)) params.set(k, String(v))
  return `/quran?${params}`
}
const isArabic = (q) => /[\u0600-\u06FF]/.test(q)
const parseRef = (q) => {
  const m = q.trim().match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/)
  if (!m) return null
  const surah = Number(m[1]), ayah = Number(m[2])
  if (surah < 1 || surah > 114 || ayah < 1 || ayah > QURAN_SURAHS[surah - 1][4]) return null
  return { surah, ayah }
}

// Last surah opened in the reader (it saves settings under this key).
function lastReadSurah() {
  try {
    const n = Number(JSON.parse(localStorage.getItem('qmr-settings-v2') || '{}').chapterNumber)
    return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null
  } catch {
    return null
  }
}

const COMMON = [
  { surah: 1 },
  { surah: 18, tag: 'Friday' },
  { surah: 36 },
  { surah: 55 },
  { surah: 56 },
  { surah: 67, tag: 'Nightly' },
  { passage: true, ar: 'آية الكرسي', en: 'Āyat al-Kursī', ref: 'Al-Baqarah 2:255', to: readerUrl(2, { ayah: 255 }) },
  { passage: true, ar: 'خواتيم البقرة', en: 'Closing āyāt of Al-Baqarah', ref: 'Al-Baqarah 2:285–286', to: readerUrl(2, { ayah: 285 }) },
  { passage: true, ar: 'المعوذات', en: 'Al-Ikhlāṣ, Al-Falaq, An-Nās', ref: 'Surahs 112–114', to: readerUrl(112) },
]

const Icon = {
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  book: <svg viewBox="0 0 24 24"><path d="M3 5.5C5.7 4.8 8 5.3 11 7v12c-3-1.7-5.3-2.2-8-1.5zM21 5.5c-2.7-.7-5-.2-8 1.5v12c3-1.7 5.3-2.2 8-1.5z" /></svg>,
  pen: <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>,
  listen: <svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H4zM17 14h3v6h-3z" /></svg>,
  star: <svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></svg>,
  close: <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>,
}

function useTextSearch(query) {
  const [state, setState] = useState({ status: 'idle', matches: [], total: 0 })
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3 || parseRef(q) || /^\d+$/.test(q)) { setState({ status: 'idle', matches: [], total: 0 }); return undefined }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, status: 'loading' }))
      try {
        const edition = isArabic(q) ? 'quran-simple-clean' : 'en.sahih'
        const res = await fetch(`${ALQURAN_SEARCH}/${encodeURIComponent(q)}/all/${edition}`, { signal: controller.signal })
        const json = await res.json().catch(() => ({}))
        const matches = Array.isArray(json?.data?.matches) ? json.data.matches : []
        setState({ status: 'done', matches: matches.slice(0, 8), total: json?.data?.count || matches.length })
      } catch (err) {
        if (err.name !== 'AbortError') setState({ status: 'error', matches: [], total: 0 })
      }
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])
  return state
}

function HeroSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const ref = parseRef(q)
  const text = useTextSearch(q)
  const surahHits = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t || ref) return []
    return QURAN_SURAHS.filter((s) => String(s[0]) === t || s[2].toLowerCase().includes(t) || s[3].toLowerCase().includes(t) || s[1].includes(q.trim())).slice(0, 5)
  }, [q, ref])

  useEffect(() => {
    const close = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (ref) navigate(readerUrl(ref.surah, { ayah: ref.ayah }))
    else if (surahHits.length === 1) navigate(readerUrl(surahHits[0][0]))
    else setOpen(true)
  }

  const showPanel = open && q.trim()
  return (
    <div className="qh-search-wrap" ref={boxRef}>
      <form className="qh-search wh-glass" onSubmit={submit} role="search">
        {Icon.search}
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          placeholder="Search Arabic, translation, surah name, or enter 2:255" aria-label="Search the Qurʾān" autoComplete="off" />
        <button className="wh-btn wh-btn-g" type="submit">Search</button>
      </form>
      {showPanel && (
        <div className="qh-results wh-glass">
          {ref && (
            <Link className="qh-res" to={readerUrl(ref.surah, { ayah: ref.ayah })}>
              <small>{ref.surah}:{ref.ayah} · {surahOf(ref.surah).en}</small><p className="qh-res-title">Jump directly to this āyah →</p>
            </Link>
          )}
          {surahHits.length > 0 && <div className="qh-res-h">Surahs</div>}
          {surahHits.map((s) => (
            <Link key={s[0]} className="qh-res qh-res-surah" to={readerUrl(s[0])}>
              <span className="qh-res-n">{s[0]}</span><span><strong>{s[2]}</strong><small>{s[3]} · {s[4]} āyāt</small></span><span className="qh-ar">{s[1]}</span>
            </Link>
          ))}
          {text.status === 'loading' && <p className="qh-res-note">Searching the text…</p>}
          {text.matches.length > 0 && <div className="qh-res-h">In the text · {text.total} match{text.total === 1 ? '' : 'es'}</div>}
          {text.matches.map((m) => (
            <Link key={`${m.surah?.number}:${m.numberInSurah}`} className="qh-res" to={readerUrl(m.surah?.number, { ayah: m.numberInSurah })}>
              <small>{m.surah?.number}:{m.numberInSurah} · {m.surah?.englishName}</small>
              <p className={isArabic(m.text || '') ? 'qh-ar qh-res-ar' : ''}>{m.text}</p>
            </Link>
          ))}
          {text.status === 'error' && <p className="qh-res-note">Text search is unavailable right now. Try a surah name or a reference like 2:255.</p>}
          {!ref && !surahHits.length && text.status === 'done' && !text.matches.length && <p className="qh-res-note">No matches for “{q.trim()}”.</p>}
          {!ref && !surahHits.length && text.status === 'idle' && q.trim().length < 3 && <p className="qh-res-note">Keep typing, or enter a reference such as 2:255.</p>}
        </div>
      )}
    </div>
  )
}

function CommonlyRead({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined
    const key = (e) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [open, onClose])
  return (
    <>
      <div className={`qh-ov${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div className={`qh-cm${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Commonly read" aria-hidden={!open}>
        <div className="qh-cm-h">
          <div><span className="qh-kicker">Commonly read</span><h3>Surahs &amp; passages</h3></div>
          <button className="qh-ib" type="button" onClick={onClose} aria-label="Close">{Icon.close}</button>
        </div>
        <div className="qh-cgrid">
          {COMMON.map((c) => {
            if (c.passage) return <Link key={c.en} className="qh-cc qh-cc-pass" to={c.to} tabIndex={open ? 0 : -1}><span className="qh-ar">{c.ar}</span><strong>{c.en}</strong><small>{c.ref}</small></Link>
            const s = surahOf(c.surah)
            return (
              <Link key={s.n} className="qh-cc" to={readerUrl(s.n)} tabIndex={open ? 0 : -1}>
                {c.tag && <span className="qh-tag">{c.tag}</span>}
                <span className="qh-ar">{s.ar}</span><strong>{s.n}. {s.en}</strong><small>{s.meaning} · {s.ayahs} āyāt</small>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

function QuranIndex() {
  const [tab, setTab] = useState('surah')
  const [rev, setRev] = useState('')
  const [q, setQ] = useState('')
  const t = q.trim().toLowerCase()
  const surahs = QURAN_SURAHS.filter((s) => (!rev || s[5] === rev) && (!t || String(s[0]) === t || s[2].toLowerCase().includes(t) || s[3].toLowerCase().includes(t) || s[1].includes(q.trim())))
  const juz = QURAN_JUZ_STARTS.filter(([j, c]) => !t || String(j) === t || surahOf(c).en.toLowerCase().includes(t))
  return (
    <section className="qh-index" id="index">
      <div className="qh-ih" data-r>
        <div><span className="qh-kicker">Fihris · Index</span><h2>Browse the Qurʾān</h2></div>
        <div className="qh-tools">
          <div className="qh-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'surah'} className={tab === 'surah' ? 'on' : ''} onClick={() => setTab('surah')}>Surah</button>
            <button type="button" role="tab" aria-selected={tab === 'juz'} className={tab === 'juz' ? 'on' : ''} onClick={() => setTab('juz')}>Juz</button>
          </div>
          {tab === 'surah' && (
            <div className="qh-tabs">
              {[['', 'All'], ['Meccan', 'Meccan'], ['Medinan', 'Medinan']].map(([v, l]) => <button key={l} type="button" className={rev === v ? 'on' : ''} onClick={() => setRev(v)}>{l}</button>)}
            </div>
          )}
          <label className="qh-filter">{Icon.search}<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'surah' ? 'Filter surahs' : 'Filter juz'} aria-label="Filter" /></label>
        </div>
      </div>
      <div className="qh-grid" key={`${tab}-${rev}`}>
        {tab === 'surah' && surahs.map((s) => (
          <Link key={s[0]} className="qh-sc" to={readerUrl(s[0])}>
            <span className="qh-dia"><b>{s[0]}</b></span>
            <span className="qh-sc-t"><strong>{s[2]}</strong><small>{s[3]}</small></span>
            <span className="qh-sc-r"><span className="qh-ar">{s[1]}</span><small><i className={s[5] === 'Medinan' ? 'm' : ''} />{s[4]} āyāt</small></span>
          </Link>
        ))}
        {tab === 'juz' && juz.map(([j, c, a]) => (
          <Link key={j} className="qh-jz" to={readerUrl(c, { ayah: a })}>
            <small>Juz</small><b>{j}</b><span className="qh-ar">{surahOf(c).ar}</span><small>Starts at {surahOf(c).en} {c}:{a}</small>
          </Link>
        ))}
        {((tab === 'surah' && !surahs.length) || (tab === 'juz' && !juz.length)) && <p className="qh-empty">Nothing matches that filter.</p>}
      </div>
    </section>
  )
}

export default function QuranHomePage() {
  const rootRef = useRef(null)
  const [commonOpen, setCommonOpen] = useState(false)
  const closeCommon = useCallback(() => setCommonOpen(false), [])
  const last = useMemo(() => lastReadSurah(), [])
  const cont = surahOf(last || 1)
  useWahaMotion(rootRef)

  return (
    <WahaPage className="qh" rootRef={rootRef} overlays={<CommonlyRead open={commonOpen} onClose={closeCommon} />}>
      <div className="wh-wrap">
        <section className="qh-hero">
          <div className="qh-hero-ar" data-r>ٱلْقُرْءَانُ ٱلْكَرِيمُ</div>
          <h1 data-r>The Noble Qurʾān</h1>
          <p className="qh-lead" data-r>Read, listen and study with seventeen English translations, word-by-word meanings, a choice of reciters, and Talweeh study notes.</p>
          <div data-r><HeroSearch /></div>
        </section>

        <div className="qh-row2">
          <div className="qh-cont" data-r="scale">
            <div className="qh-cont-ar">{cont.ar}</div>
            <div>
              <span className="qh-kicker">{last ? 'Continue reading' : 'Begin reading'}</span>
              <h3>Surah {cont.en}</h3>
              <div className="qh-cont-meta">{cont.meaning} · {cont.ayahs} āyāt · {cont.type === 'Meccan' ? 'Makkī' : 'Madanī'}</div>
            </div>
            <div className="qh-acts">
              <Link className="wh-btn wh-btn-g" to={readerUrl(cont.n)}>{last ? 'Continue' : 'Start reading'} →</Link>
              <Link className="wh-btn wh-btn-glass" to={`/quran/read?surah=${cont.n}`}>Open in Read Mode</Link>
            </div>
          </div>
          <div className="qh-feats" data-stagger>
            <Link className="qh-ft wh-glass" to={`/quran/read?surah=${cont.n}`}><span className="qh-i">{Icon.book}</span><h4>Read Mode</h4><p>Madinah &amp; IndoPak muṣḥaf styles, five riwāyāt.</p></Link>
            <Link className="qh-ft wh-glass" to={`/quran/study?surah=${STUDY_SURAH}`}><span className="qh-i">{Icon.pen}</span><h4>Study &amp; Sources</h4><p>Iʿrāb, tafsīr, dictionaries and qirāʾāt per āyah.</p></Link>
            <Link className="qh-ft wh-glass" to={`/quran/listen?surah=${cont.n}`}><span className="qh-i">{Icon.listen}</span><h4>Listen</h4><p>Recitation that the text follows, with range repeat.</p></Link>
            <button className="qh-ft wh-glass" type="button" onClick={() => setCommonOpen(true)} aria-haspopup="dialog"><span className="qh-i">{Icon.star}</span><h4>Commonly read</h4><p>Al-Kahf, Yāsīn, Al-Mulk, Āyat al-Kursī and more.</p></button>
          </div>
        </div>

        <QuranIndex />
      </div>
    </WahaPage>
  )
}
