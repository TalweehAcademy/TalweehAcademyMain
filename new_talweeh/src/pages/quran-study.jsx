/* eslint-disable react/prop-types */
// Study ("Dirāsah", from mockups/quran-waha-study.html) at /quran/study?surah=&ayah=.
// Surah header + Sūrah study topics, then the āyāt with study buttons: hover for a preview,
// click to open a movable / resizable study window. Study content is the Talweeh study package
// (src/quran-study-static via ../quran/studyData); text, translation and word data are live.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { QURAN_SURAHS, QURAN_JUZ_STARTS } from '../data/quranIndex'
import { arNum, getTranslation, getUthmani, getWords, surahInfo } from '../quran/quranData'
import { STUDY_SURAHS, hasStudy, loadStudy } from '../quran/studyData'
import { AyahMarker, Icon, useEscape, useHoverCard } from '../quran/QuranUI'
import '../quran-pages-v1.css'

// Order follows SOURCE_FEATURE_META in QuranPortalStudyBridge.jsx.
const CATS = [['irab', 'Iʿrāb'], ['tafsir', 'Tafsīr'], ['dictionaries', 'Dictionaries'], ['rabt', 'Rabṭ'], ['fawaid', 'Fawāʾid'], ['qiraat', 'Qirāʾāt'], ['translation', 'Bracket notes'], ['words', 'Words']]
const plain = (s) => String(s || '').replace(/\s+/g, ' ').trim()
const normLabel = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const juzOf = (n) => QURAN_JUZ_STARTS.filter(([, s]) => s <= n).pop()?.[0] || 1

/* ── one āyah's study options per category (each option = one source) ── */
function options(ay, c, S, sourcesOnly) {
  if (!S) return c === 'words' && ay.words.length ? [{ label: 'Words', title: 'Word by word' }] : []
  const st = ay.st
  const psg = (id) => { const p = S.passages[id]; return p && { label: p.book, sub: p.author, loc: p.locator, ar: p.arabic, by: p.author + (p.heading ? ' · ' + p.heading : ''), title: p.book } }
  const books = (f) => (ay.src[f] || []).map(psg).filter(Boolean)
  if (c === 'irab') {
    const words = Object.entries(S.wordIrab).filter(([wk]) => wk.startsWith(ay.k + ':')).map(([, r]) => r)
    if (sourcesOnly) return books('irab')
    return [
      ...st.irab.map((x) => ({ label: 'Talweeh iʿrāb', sub: 'Study notes', ar: x.arabic, en: x.english, title: 'Talweeh iʿrāb' })),
      ...(words.length ? [{ label: 'Word by word', sub: `${words.length} word${words.length > 1 ? 's' : ''}`, words, title: 'Iʿrāb of each word', ar: words.map((w) => `${w.word}: ${w.conclusion}`).join(' · ') }] : []),
      ...books('irab'),
    ]
  }
  if (c === 'tafsir') return books('tafsir')
  if (c === 'dictionaries') return [...new Set(st.vocab.map((v) => v.root))].filter((id) => S.roots[id]).map((id) => ({ label: S.roots[id].root, sub: `${S.roots[id].dicts.length} dictionaries`, root: id, ar: S.roots[id].dicts[0]?.arabic, title: `Root ${S.roots[id].root}` }))
  if (sourcesOnly) return []
  if (c === 'rabt') return st.rabt.map((x, i) => ({ label: `Rabṭ${st.rabt.length > 1 ? ' ' + (i + 1) : ''}`, sub: 'Connection to what precedes', ar: x.arabic, en: x.english, title: 'Rabṭ' }))
  if (c === 'fawaid') return st.fawaid.map((x, i) => ({ label: `Fāʾidah ${i + 1}`, sub: 'Talweeh', ar: x.arabic, en: x.english, title: `Fāʾidah ${i + 1}` }))
  if (c === 'translation') return st.tr.flatMap((t) => t.brackets).map((b) => ({ label: b.text, sub: 'Supplied wording', ar: b.reference, en: b.reason, title: `“${b.text}”` }))
  if (c === 'words') return ay.words.length ? [{ label: 'Words', title: 'Word by word' }] : []
  return []
}
const countOf = (ay, c, S, so) => (c === 'words' ? 0 : options(ay, c, S, so).length)
const EMPTY = { tr: [], rabt: [], irab: [], fawaid: [], vocab: [] }

/* ── floating study window: drag, resize, shrink to a corner, enlarge ── */
const WIN_KEY = 'talweeh-study-window'
function useStudyWindow() {
  const [win, setWin] = useState(() => { try { return { mode: 'normal', r: null, ...JSON.parse(localStorage.getItem(WIN_KEY)) } } catch { return { mode: 'normal', r: null } } })
  const [anim, setAnim] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [, force] = useState(0)
  useEffect(() => { try { localStorage.setItem(WIN_KEY, JSON.stringify(win)) } catch { /* ignore */ } }, [win])
  useEffect(() => { const r = () => force((n) => n + 1); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])
  const vw = window.innerWidth, vh = window.innerHeight
  const clamp = (r) => { const w = Math.max(320, Math.min(r.w, vw - 16)), h = Math.max(260, Math.min(r.h, vh - 16)); return { w, h, x: Math.min(Math.max(r.x, 80 - w), vw - 80), y: Math.min(Math.max(r.y, 8), vh - 48) } }
  const centred = () => { const w = Math.min(720, vw - 32), h = Math.min(640, vh - 110); return { x: (vw - w) / 2, y: Math.max(76, (vh - h) / 2 + 20), w, h } }
  const rect = win.mode === 'max' ? { x: vw * 0.03, y: vh * 0.03, w: vw * 0.94, h: vh * 0.94 }
    : win.mode === 'mini' ? (() => { const w = Math.min(380, vw - 32), h = Math.min(430, vh - 32); return { x: vw - w - 16, y: vh - h - 16, w, h } })()
    : clamp(win.r || centred())
  const setMode = (m) => { setAnim(true); setTimeout(() => setAnim(false), 420); setWin((s) => ({ ...s, mode: s.mode === m ? 'normal' : m })) }
  const dragHandler = (resize) => (e) => {
    if (e.button !== 0 || e.target.closest('button') || window.innerWidth <= 560) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* synthetic */ }
    const start = { px: e.clientX, py: e.clientY, r: rect }, el = e.currentTarget
    setDragging(true)
    setWin((s) => ({ ...s, mode: 'normal', r: start.r }))
    const move = (ev) => {
      const dx = ev.clientX - start.px, dy = ev.clientY - start.py
      setWin((s) => ({ ...s, r: clamp(resize ? { ...start.r, w: start.r.w + dx, h: start.r.h + dy } : { ...start.r, x: start.r.x + dx, y: start.r.y + dy }) }))
    }
    const up = () => { setDragging(false); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up) }
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up)
  }
  const style = { '--x': `${Math.round(rect.x)}px`, '--y': `${Math.round(rect.y)}px`, '--w': `${Math.round(rect.w)}px`, '--h': `${Math.round(rect.h)}px` }
  return { mode: win.mode, anim, dragging, style, setMode, onBarDown: dragHandler(false), onResizeDown: dragHandler(true) }
}

function Block({ o }) {
  return (
    <div className="qp-blk">
      {o.title && <h4>{o.title}{o.loc && <small>{o.loc}</small>}</h4>}
      {o.by && <div className="by">{o.by}</div>}
      {o.ar && <div className="arx">{o.ar}</div>}
      {o.en && <div className="enx">{o.en}</div>}
      {!o.ar && !o.en && <div className="enx" style={{ color: 'var(--c-mut)' }}>No text entered for this note yet.</div>}
    </div>
  )
}

function StudyWindow({ open, ay, cat, S, sourcesOnly, onCat, onClose, onStep, canPrev, canNext, surahName, initialOpt }) {
  const w = useStudyWindow()
  const [opt, setOpt] = useState(0)
  const [dict, setDict] = useState(0)
  useEffect(() => { setOpt(initialOpt || 0); setDict(0) }, [ay?.k, cat, initialOpt])
  useEscape(open, onClose)
  if (!ay) return <aside className="qp-sd" aria-hidden="true" />
  const list = options(ay, cat, S, sourcesOnly)
  const o = list[Math.min(opt, list.length - 1)]
  let body = null
  if (cat === 'words') {
    body = <div className="qp-wbw">{ay.words.map((wd, i) => <div key={i} className="qp-wb"><b>{wd.ar}</b><span>{wd.en}</span><i>{wd.tl}</i></div>)}</div>
  } else if (!o) {
    body = <div className="qp-empty">Nothing published in this category for this āyah yet.</div>
  } else if (cat === 'dictionaries') {
    const r = S.roots[o.root], d = r.dicts[Math.min(dict, r.dicts.length - 1)]
    body = <>
      <div className="qp-pick"><span>Root</span><div className="qp-opts ar">{list.map((x, i) => <button key={x.root} type="button" className={i === opt ? 'on' : ''} onClick={() => { setOpt(i); setDict(0) }}>{x.label}</button>)}</div></div>
      <div className="qp-pick"><span>Dictionary</span><select className="qp-seldd" value={dict} onChange={(e) => setDict(Number(e.target.value))}>{r.dicts.map((x, i) => <option key={x.name} value={i}>{x.name}</option>)}</select></div>
      <Block o={{ title: `${d.name} · ${r.root}`, ar: d.arabic }} />
    </>
  } else {
    body = <>
      {list.length > 1 && <div className="qp-pick"><span>{cat === 'translation' ? 'Phrase' : 'Source'}</span><div className="qp-opts">{list.map((x, i) => <button key={i} type="button" className={i === opt ? 'on' : ''} onClick={() => setOpt(i)}>{x.label}{x.sub && <small>{x.sub}</small>}</button>)}</div></div>}
      {o.words ? o.words.map((wd, i) => (
        <div key={i} className="qp-blk"><h4><span className="qp-ar" style={{ fontSize: 22 }}>{wd.word}</span><small>{wd.tl}</small></h4>{wd.facts.length > 0 && <div className="facts">{wd.facts.map((f) => <span key={f}>{f}</span>)}</div>}<div className="arx">{wd.conclusion}</div></div>
      )) : <Block o={o} />}
    </>
  }
  return (
    <aside className={`qp-sd${open ? ' open' : ''}${w.mode === 'mini' ? ' mini' : ''}${w.mode === 'max' ? ' max' : ''}${w.anim ? ' anim' : ''}${w.dragging ? ' dragging' : ''}`} style={w.style} role="dialog" aria-label="Study window" aria-hidden={!open}>
      <div className="qp-sd-bar" onPointerDown={w.onBarDown} onDoubleClick={(e) => { if (!e.target.closest('button')) w.setMode('max') }} title="Drag to move · double-click to enlarge">
        <span className="grip" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
        <span className="ttl"><span className="tl">Study · {surahName} </span>{ay.k}</span>
        <div className="qp-wc">
          <button type="button" onClick={() => onStep(-1)} disabled={!canPrev} aria-label="Previous āyah" title="Previous āyah">{Icon.prev}</button>
          <button type="button" onClick={() => onStep(1)} disabled={!canNext} aria-label="Next āyah" title="Next āyah">{Icon.next}</button>
          <span className="sep" />
          <button type="button" onClick={() => w.setMode('mini')} aria-label={w.mode === 'mini' ? 'Restore' : 'Shrink to corner'} title={w.mode === 'mini' ? 'Restore' : 'Shrink to corner'}>{w.mode === 'mini' ? Icon.enlarge : Icon.shrink}</button>
          <button type="button" className="qp-max" onClick={() => w.setMode('max')} aria-label={w.mode === 'max' ? 'Restore size' : 'Enlarge'} title={w.mode === 'max' ? 'Restore size' : 'Enlarge'}>{w.mode === 'max' ? Icon.restore : Icon.enlarge}</button>
          <span className="sep" />
          <button type="button" className="x" onClick={onClose} aria-label="Close" title="Close (Esc)">{Icon.close}</button>
        </div>
      </div>
      <div className="qp-sd-h">
        <div className="qp-abox"><p className="qp-qt">{ay.ar} <AyahMarker n={ay.a} /></p>{ay.sahih && <p className="ptr">{ay.sahih}</p>}</div>
        <div className="qp-tabs" role="tablist">
          {CATS.map(([id, l]) => {
            const n = countOf(ay, id, S, sourcesOnly), enabled = id === 'words' ? ay.words.length > 0 : n > 0
            return <button key={id} type="button" role="tab" className={id === cat ? 'on' : ''} disabled={!enabled} onClick={() => onCat(id)}>{l}{n > 0 && <span>{n}</span>}</button>
          })}
        </div>
      </div>
      <div className="qp-sd-b" key={`${ay.k}-${cat}-${opt}-${dict}`}>{body}</div>
      <span className="qp-rz" onPointerDown={w.onResizeDown} aria-hidden="true" title="Drag to resize" />
    </aside>
  )
}

function SurahStudy({ S }) {
  const topics = S.topics.filter((t) => t.arabic || t.english)
  const [topic, setTopic] = useState(topics.find((t) => t.id === 'introduction')?.id || topics[0]?.id)
  const [openCard, setOpenCard] = useState(true)
  const [full, setFull] = useState(false)
  useEffect(() => setFull(false), [topic])
  const t = S.topics.find((x) => x.id === topic)
  let ar = null
  if (t?.arabic) {
    const lines = t.arabic.split('\n').map((l) => l.trim()).filter(Boolean)
    if (t.id === 'ayat' || t.id === 'nuzul') ar = <div className="qp-kv">{lines.map((l, i) => { const c = l.indexOf(':'); return <div key={i}><b>{l.slice(0, c)}</b><span>{l.slice(c + 1).trim()}</span></div> })}</div>
    else if (t.id === 'topics' && lines.every((l) => /^\d+[.)]/.test(l))) ar = <ol className="qp-themes">{lines.map((l, i) => <li key={i}><i>{arNum(i + 1)}</i><span>{l.replace(/^\d+[.)]\s*/, '')}</span></li>)}</ol>
    else ar = <><div className={`qp-arp${!full && t.arabic.length > 420 ? ' clip' : ''}`}>{t.arabic}</div>{!full && t.arabic.length > 420 && <button className="qp-textbtn" type="button" onClick={() => setFull(true)}>Read more ▾</button>}</>
  }
  if (!topics.length) return null
  return (
    <section className="qp-ss qp-card">
      <div className="qp-ss-h"><h3>Sūrah study <small>{S.nameAr}</small></h3><button type="button" onClick={() => setOpenCard((o) => !o)} aria-expanded={openCard}>{openCard ? 'Hide ▴' : 'Show ▾'}</button></div>
      {openCard && (
        <div className="qp-ss-grid">
          <div className="qp-ss-tabs" role="tablist" aria-orientation="vertical">
            {S.topics.map((x) => <button key={x.id} type="button" role="tab" className={x.id === topic ? 'on' : ''} disabled={!x.arabic && !x.english} title={!x.arabic && !x.english ? 'Not added yet' : undefined} onClick={() => setTopic(x.id)}><small>{x.en}</small><b>{x.ar}</b></button>)}
          </div>
          {t && (
            <div className="qp-ss-body" key={topic}>
              <h4 className="qp-ss-pt">{t.en} <span>{t.ar}</span></h4>
              {ar}
              {t.english ? <p className="qp-ss-en">{t.english}</p> : <p className="qp-ss-en qp-ss-none">English for this topic has not been added yet.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function SurahDropdown({ current, onPick, onClose }) {
  const [q, setQ] = useState('')
  const [onlyStudy, setOnlyStudy] = useState(false)
  const t = q.trim().toLowerCase()
  const list = QURAN_SURAHS.filter((s) => (!onlyStudy || hasStudy(s[0])) && (!t || String(s[0]) === t || s[2].toLowerCase().includes(t) || s[3].toLowerCase().includes(t) || s[1].includes(q.trim())))
  const listRef = useRef(null)
  useEffect(() => { const on = listRef.current?.querySelector('.on'); if (on) listRef.current.scrollTop = on.offsetTop - 110 }, [])
  useEscape(true, onClose)
  return (
    <div className="qp-dd" role="listbox" onPointerDown={(e) => e.stopPropagation()}>
      <label className="qp-search">{Icon.search}<input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search surah name or number" /></label>
      <div className="fil"><button type="button" className={!onlyStudy ? 'on' : ''} onClick={() => setOnlyStudy(false)}>All surahs</button><button type="button" className={onlyStudy ? 'on' : ''} onClick={() => setOnlyStudy(true)}>With study notes</button></div>
      <div className="list" ref={listRef}>
        {list.map((s) => <button key={s[0]} type="button" className={s[0] === current ? 'on' : ''} onClick={() => onPick(s[0])}><b>{s[0]}</b><span>{s[2]}<small>{s[3]} · {s[4]} āyāt</small></span><span className="r">{hasStudy(s[0]) && <span className="qp-badge">Study</span>}<span className="qp-ar">{s[1]}</span></span></button>)}
      </div>
    </div>
  )
}

export default function QuranStudyPage() {
  const [params, setParams] = useSearchParams()
  const surah = Math.min(114, Math.max(1, Number(params.get('surah')) || STUDY_SURAHS[STUDY_SURAHS.length - 1] || 1))
  const target = Number(params.get('ayah')) || 0
  const info = surahInfo(surah)
  const [data, setData] = useState({ status: 'loading' })
  const [S, setS] = useState(null)
  const [lang, setLang] = useState('both')
  const [sourcesOnly, setSourcesOnly] = useState(false)
  const [ddOpen, setDdOpen] = useState(false)
  const [open, setOpen] = useState(null) // { a, cat, opt }
  const hc = useHoverCard()
  const hoverTimer = useRef(null)

  useEffect(() => {
    let live = true
    setData({ status: 'loading' }); setS(null); setOpen(null)
    Promise.all([getUthmani(surah), getTranslation(surah).catch(() => []), getWords(surah).catch(() => new Map()), loadStudy(surah).catch(() => null)])
      .then(([text, tr, words, study]) => { if (live) { setS(study); setData({ status: 'ready', text, tr, words }) } })
      .catch(() => live && setData({ status: 'error' }))
    return () => { live = false }
  }, [surah])

  const ayahs = useMemo(() => {
    if (data.status !== 'ready') return []
    return data.text.map((r) => {
      const k = `${surah}:${r.a}`
      return { a: r.a, k, ar: r.text, sahih: data.tr[r.a - 1] || '', words: data.words.get(r.a) || [], st: S?.ayahs[k] || EMPTY, src: S?.links[k] || {} }
    })
  }, [data, S, surah])

  // ?ayah= scrolls to and highlights that āyah.
  useEffect(() => {
    if (!target || !ayahs.length) return
    const el = document.getElementById(`ay-${target}`)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
  }, [target, ayahs.length])

  const pickSurah = (n) => { setDdOpen(false); setParams({ surah: String(n) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  useEffect(() => {
    if (!ddOpen) return undefined
    const close = () => setDdOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [ddOpen])

  const openAy = open ? ayahs[open.a - 1] : null
  const openWin = (a, cat, opt = 0) => { hc.hide(); setOpen({ a, cat, opt }) }
  const closeWin = useCallback(() => setOpen(null), [])
  const studied = S ? ayahs.filter((ay) => ay.st.irab.length || ay.st.rabt.length || ay.st.fawaid.length || ay.st.vocab.length || Object.keys(ay.src).length).length : 0

  /* hover cards */
  const chipPreview = (el, ay, c) => {
    const list = options(ay, c, S, sourcesOnly), o = list[0], label = CATS.find(([x]) => x === c)[1]
    hc.show(<>
      <div className="pv-k"><strong>{label} · {ay.k}</strong><small>{list.length > 1 ? `${list.length} sources` : '1 source'}</small></div>
      {c === 'dictionaries' ? <><div className="pv-src">Roots: {list.map((x) => x.label).join(' · ')}</div><div className="pv">{plain(o.ar)}</div></>
        : <><div className="pv-src">{o.title || o.label}</div>{o.ar && <div className="pv">{plain(o.ar)}</div>}{o.en && <div className="pv en">{plain(o.en)}</div>}</>}
      <span className="hint">Click to open in the study window →</span>
    </>, el)
  }
  const wordCard = (el, ay, i) => {
    const wd = ay.words[i]; if (!wd) return
    const ir = S?.wordIrab[`${ay.k}:${i + 1}`], v = ay.st.vocab.find((x) => x.w === i + 1), root = v && S?.roots[v.root]
    hc.show(<>
      <div className="wd">{wd.ar}</div><div className="mn">{wd.en}</div><div className="tl">{wd.tl}</div>
      {(root || ir) && <div className="row">{root && <span className="rt">الجذر: {root.root}</span>}{ir?.facts.slice(0, 4).map((f) => <span key={f}>{f}</span>)}</div>}
      {ir?.conclusion && <div className="ar">{ir.conclusion}</div>}
    </>, el)
  }
  const bracketCard = (el, note, orig) => hc.show(<>
    <strong className="t">{orig}</strong>{note.reason && <div className="en">{note.reason}</div>}{note.reference && <div className="ar">{note.reference}</div>}<span className="hint">Click the highlighted phrase to open</span>
  </>, el)

  const Translation = ({ ay, t }) => {
    const parts = []
    let last = 0
    t.text.replace(/(\[([^\]]+)\]|\(([^)]+)\))/g, (orig, _m, sq, rd, idx) => {
      if (idx > last) parts.push(t.text.slice(last, idx))
      const note = t.brackets.find((b) => normLabel(b.text) === normLabel(sq || rd))
      const bi = ay.st.tr.flatMap((x) => x.brackets).indexOf(note)
      parts.push(note
        ? <button key={idx} type="button" className="qp-br" onMouseEnter={(e) => bracketCard(e.currentTarget, note, orig)} onMouseLeave={hc.hide} onFocus={(e) => bracketCard(e.currentTarget, note, orig)} onBlur={hc.hide} onClick={() => openWin(ay.a, 'translation', bi)}>{orig}</button>
        : <span key={idx} className="qp-br-q">{orig}</span>)
      last = idx + orig.length
      return orig
    })
    if (last < t.text.length) parts.push(t.text.slice(last))
    return <p className="tr"><span className="lab">Talweeh</span>{parts}</p>
  }

  return (
    <WahaPage className={`qp${lang === 'english' ? ' lang-en' : lang === 'arabic' ? ' lang-ar' : ''}`} overlays={<>
      <StudyWindow open={!!open} ay={openAy} cat={open?.cat} S={S} sourcesOnly={sourcesOnly} initialOpt={open?.opt}
        onCat={(c) => setOpen((o) => ({ ...o, cat: c, opt: 0 }))} onClose={closeWin}
        onStep={(d) => setOpen((o) => ({ ...o, a: Math.min(ayahs.length, Math.max(1, o.a + d)), opt: 0 }))}
        canPrev={open?.a > 1} canNext={open?.a < ayahs.length} surahName={info.en} />
      {hc.element}
    </>}>
      <div className="wh-wrap">
        <div className="qp-study">
          <section className="qp-hero">
            <div className={`qp-head${S ? '' : ' solo'}`}>
              <div style={{ minWidth: 0 }}>
                <button className="qp-sbtn" type="button" aria-haspopup="listbox" aria-expanded={ddOpen} onPointerDown={(e) => e.stopPropagation()} onClick={() => setDdOpen((o) => !o)}>
                  <span className="num">{surah}</span>
                  <span><small>Surah {surah} · Study</small><strong>{info.en}<i>▾</i></strong><span className="sub">{info.meaning}</span></span>
                </button>
                <div className="qp-facts">
                  <span>{info.type === 'Meccan' ? 'Makkī' : 'Madanī'}</span><span><b>{info.ayahs}</b> āyāt</span><span>Juz <b>{juzOf(surah)}</b></span>
                  {S ? <span className="gold">Study notes on <b>{studied}</b> of {info.ayahs} āyāt</span> : <span>No study notes yet</span>}
                </div>
              </div>
              <div className="qp-ar big">{info.ar}</div>
              {ddOpen && <SurahDropdown current={surah} onPick={pickSurah} onClose={() => setDdOpen(false)} />}
            </div>
            {S && <SurahStudy key={surah} S={S} />}
          </section>

          <div className="qp-modes">
            <div className="qp-seg light">
              <Link to={`/quran?surah=${surah}`} className="qp-seglink">Reader</Link>
              <button type="button" className={!sourcesOnly ? 'on' : ''} onClick={() => setSourcesOnly(false)}>Study</button>
              <button type="button" className={sourcesOnly ? 'on' : ''} onClick={() => setSourcesOnly(true)}>Sources</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}><span className="lbl">Study language</span>
              <div className="qp-seg light">{[['english', 'English'], ['arabic', 'Arabic'], ['both', 'Both']].map(([v, l]) => <button key={v} type="button" className={lang === v ? 'on' : ''} onClick={() => setLang(v)}>{l}</button>)}</div>
            </div>
          </div>

          {!S && data.status === 'ready' && (
            <div className="qp-note qp-card">
              Talweeh study notes haven’t been published for {info.en} yet — you can still read it with word-by-word meanings.
              {' '}Study notes are available for {STUDY_SURAHS.map((n, i) => <span key={n}>{i ? ', ' : ''}<a href={`/quran/study?surah=${n}`} onClick={(e) => { e.preventDefault(); pickSurah(n) }}>{surahInfo(n).en}</a></span>)}.
            </div>
          )}
          {data.status === 'loading' && <p className="qp-status">Loading {info.en}…</p>}
          {data.status === 'error' && <p className="qp-status err">This surah could not be loaded. Check your connection and try again.</p>}

          <ol className="qp-ayl">
            {ayahs.map((ay) => {
              const chips = CATS.filter(([c]) => c !== 'words' && countOf(ay, c, S, sourcesOnly))
              return (
                <li key={ay.a} id={`ay-${ay.a}`} className={`qp-ay qp-card${open?.a === ay.a ? ' sel' : ''}${target === ay.a ? ' target' : ''}`}>
                  <div className="top"><span className="k">{ay.k}</span></div>
                  <p className="qp-qt">
                    {ay.words.length ? ay.words.map((wd, i) => {
                      const has = S && (S.wordIrab[`${ay.k}:${i + 1}`] || ay.st.vocab.some((v) => v.w === i + 1))
                      return <span key={i}><span className={`qp-w${has ? ' has' : ''}`} onMouseEnter={(e) => wordCard(e.currentTarget, ay, i)} onMouseLeave={hc.hide}>{wd.ar}</span>{' '}</span>
                    }) : ay.ar} <AyahMarker n={ay.a} />
                  </p>
                  {ay.st.tr.map((t, i) => <Translation key={i} ay={ay} t={t} />)}
                  {ay.sahih && <p className="sah"><span className="lab">Saheeh Intl.</span>{ay.sahih}</p>}
                  {chips.length > 0 && (
                    <div className="qp-chips">
                      {chips.map(([c, l]) => (
                        <button key={c} type="button" className={`qp-chip${c === 'fawaid' || c === 'translation' ? ' warm' : ''}${open?.a === ay.a && open?.cat === c ? ' on' : ''}`}
                          onMouseEnter={(e) => { const el = e.currentTarget; clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => chipPreview(el, ay, c), 180) }}
                          onMouseLeave={() => { clearTimeout(hoverTimer.current); hc.hide() }}
                          onClick={() => { clearTimeout(hoverTimer.current); openWin(ay.a, c) }}>
                          {l}<b>{countOf(ay, c, S, sourcesOnly)}</b>
                        </button>
                      ))}
                      {ay.words.length > 0 && <button type="button" className={`qp-chip${open?.a === ay.a && open?.cat === 'words' ? ' on' : ''}`} onClick={() => openWin(ay.a, 'words')}>Words</button>}
                    </div>
                  )}
                  {!chips.length && ay.words.length > 0 && <div className="qp-chips"><button type="button" className="qp-chip" onClick={() => openWin(ay.a, 'words')}>Words</button></div>}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </WahaPage>
  )
}
