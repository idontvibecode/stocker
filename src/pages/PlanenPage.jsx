import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import rezepteData from '../data/rezepte.json'
import { ladeVorhandeneZutaten, berechneMatch, matchStufe, berechneVorratNachPlan } from '../utils/matching'
import PdfModal from '../components/PdfModal'

const TAGE       = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']
const KURZ       = { Montag:'Mo', Dienstag:'Di', Mittwoch:'Mi', Donnerstag:'Do', Freitag:'Fr', Samstag:'Sa', Sonntag:'So' }
const KATEGORIEN = ['alle','vegetarisch','vegan','fleischhaltig','fischhaltig']
const STORAGE_KEY = 'stocker_wochenplan'

// Today in TAGE order (Mo=0 … So=6)
const HEUTE_TAG = TAGE[(new Date().getDay() + 6) % 7]

const katStyle = {
  vegetarisch:   { bg: '#f0fdf4', text: '#15803d' },
  vegan:         { bg: '#f7fee7', text: '#4d7c0f' },
  fleischhaltig: { bg: '#fff1f2', text: '#be123c' },
  fischhaltig:   { bg: '#f0f9ff', text: '#0369a1' },
}

// Dark badge backgrounds for assigned day rows (white text readable)
const katDayBadge = {
  vegetarisch:   '#166534',
  vegan:         '#3f6212',
  fleischhaltig: '#9f1239',
  fischhaltig:   '#075985',
}

function ladePlan() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function speicherePlan(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export default function PlanenPage() {
  const [plan, setPlan]             = useState(ladePlan)
  const [selectedTag, setSelected]  = useState(null)
  const [filter, setFilter]         = useState('alle')
  const [suche, setSuche]           = useState('')
  const [sortierung, setSortierung] = useState(() => ladeVorhandeneZutaten().length > 0 ? 'match' : 'alpha')
  const [personenProRezept, setPersonenProRezept] = useState({})
  const [stepperOffen, setStepperOffen] = useState(null)
  const [pdfRezept, setPdfRezept] = useState(null)
  const stepperTimer = useRef(null)

  const stepperSchliessen = useCallback(() => {
    clearTimeout(stepperTimer.current)
    stepperTimer.current = setTimeout(() => setStepperOffen(null), 3000)
  }, [])

  useEffect(() => {
    if (!stepperOffen) return
    const handler = () => { clearTimeout(stepperTimer.current); setStepperOffen(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [stepperOffen])

  function getPersonen(id) { return personenProRezept[id] ?? 2 }

  function stepperAendern(id, fn) {
    setPersonenProRezept(prev => ({ ...prev, [id]: Math.max(1, Math.min(12, fn(prev[id] ?? 2))) }))
    stepperSchliessen()
  }

  const vorhandene = useMemo(() => ladeVorhandeneZutaten(), [])
  const hasZutaten = vorhandene.length > 0
  const vorhandeneNachPlan = useMemo(
    () => berechneVorratNachPlan(plan, vorhandene, selectedTag),
    [plan, vorhandene, selectedTag]
  )

  const rezepteMitMatch = useMemo(() =>
    rezepteData.map(r => {
      const { prozent, vorhanden, fehlend } = berechneMatch(r, vorhandeneNachPlan)
      return { ...r, prozent, stufe: matchStufe(prozent), vorhanden, fehlend }
    }).sort((a, b) => b.prozent - a.prozent),
  [vorhandeneNachPlan])

  const gefiltert = rezepteMitMatch
    .filter(r => {
      const katOk   = filter === 'alle' || r.kategorie === filter
      const sucheOk = r.name.toLowerCase().includes(suche.toLowerCase())
      return katOk && sucheOk
    })
    .sort((a, b) => {
      if (sortierung === 'zeit_asc') return a.zeit - b.zeit
      if (sortierung === 'alpha' || (!hasZutaten && sortierung === 'match')) return a.name.localeCompare(b.name, 'de')
      return 0
    })

  function zuweisen(rezept) {
    if (!selectedTag) return
    const eintrag = { ...rezept, personen: getPersonen(rezept.id) }
    const neu = { ...plan, [selectedTag]: eintrag }
    setPlan(neu)
    speicherePlan(neu)
    setStepperOffen(null)
    const nextLeer = TAGE.find(t => !neu[t] && t !== selectedTag)
    setSelected(nextLeer ?? null)
  }

  function entfernen(tag) {
    const neu = { ...plan, [tag]: null }
    setPlan(neu)
    speicherePlan(neu)
    if (selectedTag === tag) setSelected(null)
  }

  const belegteTagCount = TAGE.filter(t => plan[t]).length

  return (
    <div className="flex flex-col gap-4">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl" style={{ color: '#1C1917', letterSpacing: '-0.01em' }}>
          Wochenplan
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#78716C' }}>
          {belegteTagCount === 0
            ? 'Wähle Rezepte für jeden Tag'
            : belegteTagCount === 7
            ? 'Woche vollständig geplant'
            : `${belegteTagCount} von 7 Tagen geplant`}
        </p>
      </div>

      {/* ── Wochenübersicht ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden card-shadow">
        {TAGE.map((tag, i) => {
          const rezept   = plan[tag]
          const selected = selectedTag === tag
          const isHeute  = tag === HEUTE_TAG

          const badgeBg = selected
            ? '#D97706'
            : rezept
            ? (katDayBadge[rezept.kategorie] ?? '#1A2E23')
            : isHeute
            ? '#fffbeb'
            : '#F7F3EE'

          const badgeColor = selected || rezept ? '#fff' : isHeute ? '#D97706' : '#A8A29E'

          return (
            <div key={tag}>
              {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: '#F7F3EE' }} />}
              <button
                onClick={() => setSelected(selected ? null : tag)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
                style={{ backgroundColor: selected ? '#fffbeb' : 'transparent' }}
              >
                {/* Day badge */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold transition-all"
                  style={{ backgroundColor: badgeBg, color: badgeColor }}
                >
                  {KURZ[tag]}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  {rezept ? (
                    <>
                      <p className="font-medium text-sm truncate" style={{ color: '#1C1917' }}>
                        {rezept.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#A8A29E' }}>
                        {isHeute && <span style={{ color: '#D97706' }}>Heute · </span>}
                        {rezept.zeit} Min. · {rezept.personen ?? 2} Pers.
                      </p>
                    </>
                  ) : isHeute ? (
                    <p className="text-sm">
                      <span className="font-semibold" style={{ color: '#D97706' }}>Heute</span>
                      <span style={{ color: '#A8A29E' }}> – noch leer</span>
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: '#A8A29E' }}>Noch nicht geplant</p>
                  )}
                </div>

                {/* Action */}
                {rezept && !selected ? (
                  <button
                    onClick={e => { e.stopPropagation(); entfernen(tag) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    style={{ backgroundColor: '#F7F3EE', color: '#A8A29E' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                ) : (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ backgroundColor: selected ? '#D97706' : '#F7F3EE', color: selected ? '#fff' : '#A8A29E' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      {selected
                        ? <polyline points="18 15 12 9 6 15"/>
                        : <polyline points="6 9 12 15 18 9"/>}
                    </svg>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Recipe section (only when a day is selected) ────────────── */}
      {selectedTag && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium px-0.5" style={{ color: '#A8A29E' }}>
            Rezepte für <span className="font-semibold" style={{ color: '#1C1917' }}>{selectedTag}</span>
          </p>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rezept suchen…"
              value={suche}
              onChange={e => setSuche(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none bg-white"
              style={{ border: '1px solid #E8E2D9', color: '#1C1917' }}
            />
          </div>

          {/* Filter + Sort chips */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {KATEGORIEN.map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                style={filter === k
                  ? { backgroundColor: '#1A2E23', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#78716C', border: '1px solid #E8E2D9' }
                }
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
            <div className="w-px shrink-0 mx-1" style={{ backgroundColor: '#E8E2D9' }} />
            {[
              { key: 'match',    label: 'Match'   },
              { key: 'zeit_asc', label: 'Schnell' },
              { key: 'alpha',    label: 'A–Z'     },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortierung(s.key)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                style={sortierung === s.key
                  ? { backgroundColor: '#D97706', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#78716C', border: '1px solid #E8E2D9' }
                }
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ── Recipe cards ──────────────────────────────────────────── */}
          <style>{`
            @keyframes foil {
              0%   { background-position: 0% 50%; }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            .favorit-karte {
              background: linear-gradient(
                118deg,
                #fff9e6 0%, #d1fae5 20%, #ede9fe 40%,
                #fef3c7 60%, #d1fae5 80%, #fff9e6 100%
              ) !important;
              background-size: 400% 400% !important;
              animation: foil 4s ease infinite;
              box-shadow: 0 0 0 1px rgba(180,140,60,0.3), 0 2px 14px rgba(180,140,60,0.12) !important;
            }
          `}</style>

          <div className="flex flex-col gap-2.5">
            {gefiltert.map(r => {
              const kat = katStyle[r.kategorie] ?? { bg: '#F7F3EE', text: '#78716C' }
              const bereitsZugewiesen = Object.entries(plan).find(([, rez]) => rez?.id === r.id)
              const matchStrip = r.stufe === 'hoch' ? '#86efac' : r.stufe === 'mittel' ? '#fde68a' : '#E8E2D9'

              return (
                <div
                  key={r.id}
                  className={`rounded-2xl overflow-hidden card-shadow card-hover${r.favorit ? ' favorit-karte' : ''}`}
                  style={r.favorit ? {} : { border: '1px solid #E8E2D9', backgroundColor: '#fff' }}
                >
                  <div className="flex">
                    {/* Match accent strip */}
                    {!r.favorit && (
                      <div className="w-1 shrink-0" style={{ backgroundColor: matchStrip }} />
                    )}

                    {/* Content */}
                    <div className="flex items-center gap-3 p-3 flex-1 min-w-0">

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {/* Name row */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <p className="font-semibold text-sm truncate flex-1" style={{ color: '#1C1917' }}>
                            {r.name}
                          </p>
                          {r.favorit && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#D97706" stroke="none">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Category chip with colored dot */}
                          <span
                            className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: kat.bg, color: kat.text }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
                              style={{ backgroundColor: kat.text, opacity: 0.65 }}
                            />
                            {r.kategorie}
                          </span>

                          {/* Time with clock icon */}
                          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#A8A29E' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {r.zeit} Min.
                          </span>

                          {/* Match % – inline colored number, no chip */}
                          {vorhandene.length > 0 && (
                            <span
                              className="text-[10px] font-semibold tabular-nums"
                              style={{
                                color: r.stufe === 'hoch' ? '#15803d' : r.stufe === 'mittel' ? '#92400e' : '#A8A29E',
                              }}
                            >
                              {r.prozent}%
                            </span>
                          )}

                          {/* PDF button */}
                          {r.pdf && (
                            <button
                              onClick={e => { e.stopPropagation(); setPdfRezept(r) }}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-70"
                              style={{ backgroundColor: '#F7F3EE', color: '#78716C' }}
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                              <span className="text-[10px] font-medium">PDF</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      {bereitsZugewiesen ? (
                        <div
                          className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl"
                          style={{ backgroundColor: '#F7F3EE' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span className="text-xs font-medium" style={{ color: '#78716C' }}>
                            {bereitsZugewiesen[0].slice(0, 2)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {stepperOffen === r.id ? (
                            <div
                              className="flex items-center rounded-xl px-1 gap-0"
                              style={{ backgroundColor: '#F7F3EE' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p - 1) }}
                                className="w-7 h-7 flex items-center justify-center font-medium cursor-pointer"
                                style={{ color: '#78716C' }}
                              >−</button>
                              <span className="text-sm font-semibold w-4 text-center tabular-nums" style={{ color: '#1C1917' }}>
                                {getPersonen(r.id)}
                              </span>
                              <button
                                onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p + 1) }}
                                className="w-7 h-7 flex items-center justify-center font-medium cursor-pointer"
                                style={{ color: '#78716C' }}
                              >+</button>
                            </div>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); setStepperOffen(r.id); stepperSchliessen() }}
                              className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 cursor-pointer transition-colors"
                              style={{ backgroundColor: '#F7F3EE' }}
                            >
                              <span className="text-sm font-semibold leading-none" style={{ color: '#1C1917' }}>
                                {getPersonen(r.id)}
                              </span>
                              <span className="text-[9px] leading-none mt-0.5" style={{ color: '#A8A29E' }}>Pers.</span>
                            </button>
                          )}
                          <button
                            onClick={() => zuweisen(r)}
                            className="h-9 px-3 rounded-xl font-medium text-xs transition-all active:scale-[0.95] cursor-pointer flex items-center gap-1.5"
                            style={{ backgroundColor: '#D97706', color: '#fff' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            {KURZ[selectedTag]}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {gefiltert.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: '#A8A29E' }}>Keine Rezepte gefunden</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no day selected */}
      {!selectedTag && (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: '#F7F3EE' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8BFB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: '#78716C' }}>Tag antippen</p>
          <p className="text-xs mt-1" style={{ color: '#A8A29E' }}>Dann ein Rezept zuweisen</p>
        </div>
      )}

      <PdfModal rezept={pdfRezept} onClose={() => setPdfRezept(null)} />
    </div>
  )
}
