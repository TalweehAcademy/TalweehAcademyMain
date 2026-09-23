/* eslint-disable react/prop-types */
// Listen ("Samāʿ", from mockups/quran-waha-listen.html) at /quran/listen?surah=&ayah=&reciter=.
// Real recitation from MP3Quran with per-āyah timings, so the current āyah follows the voice;
// ayah queue, range repeat, and a searchable list of every reciter that has timing data.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { audioUrl, getReciters, getTimings, getTranslation, getUthmani, surahInfo } from '../quran/quranData'
import { AyahMarker, Icon, SurahPicker } from '../quran/QuranUI'
import '../quran-pages-v1.css'

const RECITER_KEY = 'talweeh-listen-reciter'
const STYLE_LABEL = { Murattal: 'Murattal', Mujawwad: 'Mujawwad', Muallim: 'Muʿallim' }
const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')
// Search ignores case, "al-"-style prefixes, hyphens, Arabic diacritics and hamza forms.
// …and doubled letters, so “Husary” finds “Hussary” and “Minshawi” finds “Minshawy”-style spellings.
const foldEn = (t) => String(t).toLowerCase().replace(/\b(al|ar|as|ash|an|ad|at|az)-/g, '').replace(/[^a-z ]/g, '').replace(/(.)\1+/g, '$1').replace(/y\b/g, 'i')
const foldAr = (t) => String(t).replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/(^|\s)ال/g, '$1')
const isArabic = (t) => /[\u0600-\u06FF]/.test(t)
const initial = (ar) => (String(ar).replace(/^(عبد|أبو|محمد)\s+/, '').trim()[0] || 'ق')

function Highlight({ text, q }) {
  if (!q || isArabic(q)) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  return i < 0 ? text : <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

export default function QuranListenPage() {
  const [params, setParams] = useSearchParams()
  const surah = Math.min(114, Math.max(1, Number(params.get('surah')) || 67))
  const startAyah = Number(params.get('ayah')) || 1
  const info = surahInfo(surah)

  const [reciters, setReciters] = useState([])
  const [recErr, setRecErr] = useState('')
  const [readId, setReadId] = useState(() => Number(params.get('reciter')) || Number(localStorage.getItem(RECITER_KEY)) || 0)
  const [text, setText] = useState([])
  const [tr, setTr] = useState([])
  const [timings, setTimings] = useState([])
  const [msg, setMsg] = useState('')
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(startAyah)
  const [pos, setPos] = useState({ t: 0, d: 0 })
  const [range, setRange] = useState({ from: 1, to: Math.min(4, info.ayahs), active: false, repeat: true })
  const [nextSurah, setNextSurah] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const audioRef = useRef(null)
  const pendingSeek = useRef(null)
  const listRef = useRef(null)

  /* reciters */
  useEffect(() => {
    getReciters().then((list) => {
      setReciters(list)
      setReadId((id) => (list.some((r) => r.id === id) ? id : (list.find((r) => /alafas/i.test(r.nameEn)) || list[0])?.id || 0))
    }).catch(() => setRecErr('The reciter list could not be loaded. Check your connection and refresh.'))
  }, [])
  const reciter = reciters.find((r) => r.id === readId)
  useEffect(() => { if (readId) try { localStorage.setItem(RECITER_KEY, String(readId)) } catch { /* ignore */ } }, [readId])

  /* surah text */
  useEffect(() => {
    let live = true
    setText([]); setTr([]); setCur(startAyah)
    setRange((r) => ({ ...r, from: 1, to: Math.min(4, info.ayahs), active: false }))
    getUthmani(surah).then((rows) => live && setText(rows)).catch(() => live && setMsg('The text of this surah could not be loaded.'))
    getTranslation(surah).then((t) => live && setTr(t)).catch(() => {})
    return () => { live = false }
  }, [surah]) // eslint-disable-line react-hooks/exhaustive-deps

  /* audio + timings for reciter × surah */
  useEffect(() => {
    if (!reciter) return undefined
    let live = true
    const a = audioRef.current
    a.pause(); setPlaying(false); setTimings([]); setMsg('')
    a.src = audioUrl(reciter, surah)
    a.load()
    getTimings(reciter.id, surah).then((t) => {
      if (!live) return
      setTimings(t)
      if (!t.length) setMsg('This reciter has no āyah timings for this surah — audio plays, but the text won’t follow.')
      const want = pendingSeek.current ?? (startAyah > 1 ? startAyah : null)
      pendingSeek.current = null
      const hit = want && t.find((x) => x.ayah === want)
      if (hit) { a.currentTime = hit.from; setCur(want) }
    }).catch(() => live && setMsg('Āyah timings are unavailable right now — audio plays, but the text won’t follow.'))
    return () => { live = false }
  }, [reciter, surah]) // eslint-disable-line react-hooks/exhaustive-deps

  /* keep URL shareable */
  useEffect(() => {
    if (!readId) return
    const next = new URLSearchParams({ surah: String(surah), reciter: String(readId) })
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [surah, readId]) // eslint-disable-line react-hooks/exhaustive-deps

  const timingOf = useCallback((n) => timings.find((x) => x.ayah === n), [timings])
  const seekAyah = (n, play = true) => {
    const a = audioRef.current, t = timingOf(n)
    setCur(n)
    if (t) a.currentTime = t.from
    if (play) a.play().catch(() => setMsg('Press play to start the recitation.'))
  }

  const onTime = () => {
    const a = audioRef.current, t = a.currentTime
    setPos({ t, d: a.duration || 0 })
    if (!timings.length) return
    let n = timings[0].ayah
    for (const x of timings) { if (x.from <= t + 0.05) n = x.ayah; else break }
    if (n !== cur) setCur(n)
    if (range.active) {
      const end = timingOf(range.to)
      if (end && t >= end.to - 0.05) {
        if (range.repeat) a.currentTime = timingOf(range.from)?.from || 0
        else { a.pause(); setRange((r) => ({ ...r, active: false })) }
      }
    }
  }
  const onEnded = () => {
    setPlaying(false)
    if (range.active && range.repeat) { seekAyah(range.from); return }
    if (nextSurah && surah < 114) { autoPlay.current = true; setParams({ surah: String(surah + 1), reciter: String(readId) }) }
  }
  // Keep playing across a surah or reciter change once the new audio is ready.
  const autoPlay = useRef(false)
  const onCanPlay = () => { if (autoPlay.current) { autoPlay.current = false; audioRef.current.play().catch(() => {}) } }

  // Keep the current āyah in view in the queue.
  useEffect(() => {
    const li = listRef.current?.querySelector('.on')
    if (li) { const l = listRef.current; l.scrollTop = Math.max(0, li.offsetTop - l.offsetTop - l.clientHeight / 2 + li.offsetHeight / 2) }
  }, [cur])

  const toggle = () => { const a = audioRef.current; if (a.paused) a.play().catch(() => setMsg('The audio could not start. Try another reciter.')); else a.pause() }
  const step = (d) => seekAyah(Math.min(info.ayahs, Math.max(1, cur + d)), playing)
  const curRow = text[cur - 1]

  /* reciter search */
  const [rq, setRq] = useState('')
  const [style, setStyle] = useState('')
  const [rewaya, setRewaya] = useState('')
  const [showAll, setShowAll] = useState(false)
  const rewayat = useMemo(() => [...new Set(reciters.map((r) => r.rewaya).filter(Boolean))], [reciters])
  const matches = useMemo(() => {
    const q = rq.trim()
    return reciters.filter((r) => (!style || r.style === style) && (!rewaya || r.rewaya === rewaya) && (!q || (isArabic(q) ? foldAr(r.nameAr).includes(foldAr(q).trim()) : foldEn(`${r.nameEn} ${r.moshaf}`).includes(foldEn(q).trim()))))
  }, [reciters, rq, style, rewaya])
  const [rc, setRc] = useState(0)
  useEffect(() => { const i = matches.findIndex((r) => r.id === readId); setRc(i < 0 ? 0 : i) }, [matches, readId])
  const [narrow, setNarrow] = useState(() => window.innerWidth < 700)
  useEffect(() => { const r = () => setNarrow(window.innerWidth < 700); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])
  const choose = (id) => { if (id === readId) return; autoPlay.current = playing; pendingSeek.current = cur; setReadId(id) }
  const shown = showAll ? matches : matches.slice(0, 30)
  const recName = (r) => r ? (r.nameEn || r.nameAr) + (r.style !== 'Murattal' ? ` (${STYLE_LABEL[r.style]})` : '') : '…'

  return (
    <WahaPage className="qp" overlays={<SurahPicker open={pickerOpen} onClose={() => setPickerOpen(false)} withJuz={false} current={surah} title="Choose a surah to listen to"
      onPick={({ surah: s, ayah }) => { setPickerOpen(false); pendingSeek.current = ayah > 1 ? ayah : null; setParams({ surah: String(s), reciter: String(readId) }) }} />}>
      <audio ref={audioRef} preload="metadata" onTimeUpdate={onTime} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={onEnded} onCanPlay={onCanPlay}
        onError={() => reciter && setMsg('This reciter’s audio for this surah is unavailable. Choose another reciter.')} />
      <div className="wh-wrap">
        <div className="qp-stage">
          <section className={`qp-now${playing ? ' playing' : ''}`}>
            <span className="qp-kicker">Now reciting</span>
            <h1>Surah {info.en} <em>· {recName(reciter)}</em> <button className="qp-chg" type="button" onClick={() => document.getElementById('qp-reciters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Change ▾</button></h1>
            <div className="qp-ring">
              <div className="ay" key={cur}>
                {curRow ? <><p className="qp-qt">{curRow.text} <AyahMarker n={cur} /></p>{tr[cur - 1] && <p className="tr">{tr[cur - 1]}</p>}</> : <p className="tr">Loading…</p>}
              </div>
            </div>
            <div className="qp-eq" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
            <div className="qp-transport">
              <button className="qp-ib" type="button" onClick={() => step(-1)} disabled={cur <= 1} aria-label="Previous āyah">{Icon.skipPrev}</button>
              <button className="qp-bigpp" type="button" onClick={toggle} disabled={!reciter} aria-label={playing ? 'Pause' : 'Play'}>{playing ? Icon.pause : Icon.play}</button>
              <button className="qp-ib" type="button" onClick={() => step(1)} disabled={cur >= info.ayahs} aria-label="Next āyah">{Icon.skipNext}</button>
            </div>
            <div className="qp-scrub">
              <span>{surah}:{cur}</span>
              <span className="t" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(pos.d)} aria-valuenow={Math.round(pos.t)} tabIndex={0}
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(), a = audioRef.current; if (a.duration) a.currentTime = ((e.clientX - r.left) / r.width) * a.duration }}
                onKeyDown={(e) => { const a = audioRef.current; if (e.key === 'ArrowRight') a.currentTime += 5; if (e.key === 'ArrowLeft') a.currentTime -= 5 }}>
                <i style={{ width: pos.d ? `${(pos.t / pos.d) * 100}%` : 0 }} />
              </span>
              <span>{fmt(pos.t)} / {fmt(pos.d)}</span>
            </div>
            {(msg || recErr) && <p className="msg">{recErr || msg}</p>}
          </section>

          <div className="qp-side">
            <section className="qp-queue wh-glass">
              <h3>Āyah queue <button type="button" onClick={() => setPickerOpen(true)}>{info.en} · change ▾</button></h3>
              <ol className="qp-ql" ref={listRef}>
                {text.map((r) => <li key={r.a} className={r.a === cur ? 'on' : ''} onClick={() => seekAyah(r.a)}><b>{r.a}</b><span className="qp-qt">{r.text}</span></li>)}
              </ol>
            </section>
            <section className="qp-rng wh-glass">
              <h4>Play a range of āyāt</h4>
              <div className="row">
                <input type="number" min={1} max={info.ayahs} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: Math.min(info.ayahs, Math.max(1, Number(e.target.value) || 1)) }))} aria-label="From āyah" />
                <span>to</span>
                <input type="number" min={1} max={info.ayahs} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: Math.min(info.ayahs, Math.max(1, Number(e.target.value) || 1)) }))} aria-label="To āyah" />
                <button className="wh-btn wh-btn-g" type="button" style={{ padding: '10px 16px', fontSize: 13 }} disabled={!timings.length}
                  onClick={() => { setRange((r) => ({ ...r, active: true, to: Math.max(r.from, r.to) })); seekAyah(range.from) }}>{range.active ? 'Playing range' : 'Play range'}</button>
              </div>
              <div className="dg"><span>Repeat range</span><button type="button" className={`qp-sw${range.repeat ? ' on' : ''}`} onClick={() => setRange((r) => ({ ...r, repeat: !r.repeat }))} aria-pressed={range.repeat} aria-label="Repeat range" /></div>
              <div className="dg"><span>Continue to next surah</span><button type="button" className={`qp-sw${nextSurah ? ' on' : ''}`} onClick={() => setNextSurah((v) => !v)} aria-pressed={nextSurah} aria-label="Continue to next surah" /></div>
            </section>
          </div>
        </div>

        <section className="qp-rec-sec" id="qp-reciters">
          <div className="qp-sh"><span className="qp-kicker">Reciters</span><h2>Choose a reciter</h2><p>Recitations stream from MP3Quran with āyah timings, so the text follows the voice.</p></div>
          <div className="qp-rsearch wh-glass">
            <label className="qp-search">{Icon.search}<input value={rq} onChange={(e) => setRq(e.target.value)} placeholder="Search reciters — English or Arabic, e.g. “Husary” or “المنشاوي”" aria-label="Search reciters" /></label>
            <div className="qp-seg">{[['', 'All'], ['Murattal', 'Murattal'], ['Mujawwad', 'Mujawwad'], ['Muallim', 'Muʿallim']].map(([v, l]) => <button key={l} type="button" className={style === v ? 'on' : ''} onClick={() => setStyle(v)}>{l}</button>)}</div>
            {rewayat.length > 1 && <select value={rewaya} onChange={(e) => setRewaya(e.target.value)} aria-label="Riwāyah"><option value="">All riwāyāt</option>{rewayat.map((r) => <option key={r} value={r}>{r}</option>)}</select>}
            <span className="cnt">{reciters.length ? `${matches.length} of ${reciters.length} reciters` : 'Loading reciters…'}</span>
          </div>

          {matches.length > 0 && (
            <>
              <div className="qp-cover">
                {matches.map((r, j) => {
                  let o = j - rc; const N = matches.length
                  if (o > N / 2) o -= N; if (o < -N / 2) o += N
                  const a = Math.abs(o)
                  if (a > 3) return null
                  return (
                    <article key={r.id} className="qp-rc wh-glass" onClick={() => (a ? setRc(j) : choose(r.id))}
                      style={{ transform: `translateX(${o * (narrow ? 70 : 230)}px) translateZ(${-a * 140}px) rotateY(${-o * 24}deg)`, opacity: a > 2 ? 0 : a ? (a > 1 ? 0.25 : 0.55) : 1, filter: a ? 'blur(2px) saturate(.7)' : 'none', zIndex: 10 - a, pointerEvents: a > 2 ? 'none' : undefined }}>
                      <div className="av">{initial(r.nameAr)}</div>
                      <h4>{r.nameEn || r.nameAr}</h4><span className="qp-ar">{r.nameAr}</span>
                      <small>{STYLE_LABEL[r.style]} · {r.rewaya}</small>
                      <span className={`pick${r.id === readId ? ' is-sel' : ''}`}>{r.id === readId ? 'Selected' : a ? 'View' : 'Select reciter'}</span>
                    </article>
                  )
                })}
              </div>
              {matches.length > 1 && <div className="qp-cv-ctl"><button className="wh-glass" type="button" onClick={() => setRc((c) => (c - 1 + matches.length) % matches.length)} aria-label="Previous reciter">‹</button><button className="wh-glass" type="button" onClick={() => setRc((c) => (c + 1) % matches.length)} aria-label="Next reciter">›</button></div>}
            </>
          )}

          <div className="qp-rgrid">
            {shown.map((r) => (
              <button key={r.id} type="button" className={`qp-rrow qp-card${r.id === readId ? ' on' : ''}`} onClick={() => choose(r.id)}>
                <span className="av">{initial(r.nameAr)}</span>
                <span style={{ minWidth: 0 }}><strong><Highlight text={r.nameEn || r.nameAr} q={rq.trim()} /><span className="qp-ar">{r.nameAr}</span></strong><span className="meta"><span className="st">{STYLE_LABEL[r.style]}</span><small>{r.rewaya}</small></span></span>
              </button>
            ))}
            {reciters.length > 0 && !matches.length && <p className="qp-rempty">No reciter matches “{rq.trim()}”. Try part of a name, or search in Arabic.</p>}
          </div>
          {matches.length > shown.length && <div className="qp-more"><button className="wh-btn wh-btn-glass" type="button" onClick={() => setShowAll(true)}>Show all {matches.length} reciters</button></div>}
        </section>
      </div>
    </WahaPage>
  )
}
