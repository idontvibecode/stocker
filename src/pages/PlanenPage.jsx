import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import rezepteData from '../data/rezepte.json'
import { ladeVorhandeneZutaten, berechneMatch, matchStufe, berechneVorratNachPlan } from '../utils/matching'
import PdfModal from '../components/PdfModal'

const TAGE        = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']
const KURZ        = { Montag:'Mo', Dienstag:'Di', Mittwoch:'Mi', Donnerstag:'Do', Freitag:'Fr', Samstag:'Sa', Sonntag:'So' }
const KATEGORIEN  = ['alle','vegetarisch','vegan','fleischhaltig','fischhaltig']
const STORAGE_KEY = 'stocker_wochenplan'

// Tomorrow in TAGE order (Mo=0 … So=6)
const HEUTE_IDX     = (new Date().getDay() + 6) % 7
const NAECHSTER_IDX = (HEUTE_IDX + 1) % 7
const NAECHSTER_TAG = TAGE[NAECHSTER_IDX]

// Category palette
const katStyle = {
  vegetarisch:   { bg: '#f0fdf4', text: '#15803d' },
  vegan:         { bg: '#f7fee7', text: '#4d7c0f' },
  fleischhaltig: { bg: '#fff1f2', text: '#be123c' },
  fischhaltig:   { bg: '#f0f9ff', text: '#0369a1' },
}

// Very subtle card tint per category — like different recipe-card papers
const katCardBg = {
  vegetarisch:   '#f6fdf8',
  vegan:         '#f8fdf3',
  fleischhaltig: '#fdf6f7',
  fischhaltig:   '#f5f8fd',
}

// Dark day-badge backgrounds when recipe is assigned
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
  const [plan, setPlan]                       = useState(ladePlan)
  const [selectedTag, setSelected]            = useState(null)
  const [filter, setFilter]                   = useState('alle')
  const [suche, setSuche]                     = useState('')
  const [sortierung, setSortierung]           = useState(() => ladeVorhandeneZutaten().length > 0 ? 'match' : 'alpha')
  const [personenProRezept, setPersonenProRezept] = useState({})
  const [stepperOffen, setStepperOffen]       = useState(null)
  const [pdfRezept, setPdfRezept]             = useState(null)
  const [assignedTag, setAssignedTag]         = useState(null) // badge-pop trigger
  const [bonAppetit, setBonAppetit]           = useState(false)
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

  const belegteTagCount    = TAGE.filter(t => plan[t]).length
  const naechsterOffenerTag = useMemo(() => {
    for (let i = 0; i < 7; i++) {
      const tag = TAGE[(NAECHSTER_IDX + i) % 7]
      if (!plan[tag]) return tag
    }
    return NAECHSTER_TAG
  }, [plan])

  function zuweisen(rezept) {
    if (!selectedTag) return
    const vorherCount = TAGE.filter(t => plan[t]).length
    const eintrag = { ...rezept, personen: getPersonen(rezept.id) }
    const neu = { ...plan, [selectedTag]: eintrag }
    setPlan(neu)
    speicherePlan(neu)
    setStepperOffen(null)

    // Badge pop on the just-assigned day
    setAssignedTag(selectedTag)
    setTimeout(() => setAssignedTag(null), 420)

    // Bon Appétit when the week is completed for the first time
    const nachherCount = TAGE.filter(t => neu[t]).length
    if (vorherCount < 7 && nachherCount === 7) {
      setBonAppetit(true)
      setTimeout(() => setBonAppetit(false), 2600)
    }

    const nextLeer = TAGE.find(t => !neu[t] && t !== selectedTag)
    setSelected(nextLeer ?? null)
  }

  function entfernen(tag) {
    const neu = { ...plan, [tag]: null }
    setPlan(neu)
    speicherePlan(neu)
    if (selectedTag === tag) setSelected(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl" style={{ color: '#1C1917', letterSpacing: '-0.01em' }}>
          Wochenkarte
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#78716C' }}>
          {belegteTagCount === 0
            ? 'Was kommt diese Woche auf den Tisch?'
            : belegteTagCount === 7
            ? 'Die Woche steht — guten Appetit!'
            : `${belegteTagCount} von 7 Tagen geplant`}
        </p>
      </div>

      {/* ── Wochenkarte (the menu board) ─────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden card-shadow" style={{ backgroundColor: '#fff' }}>

        {/* Board header — like the chalkboard strip at the top of a menu board */}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: '#1A2E23' }}>
          <span className="font-display text-base" style={{ color: '#F7F3EE', letterSpacing: '-0.005em' }}>
            Diese Woche
          </span>
          {belegteTagCount > 0 && (
            <div className="flex items-center gap-1.5">
              {/* Segmented progress — 7 small blocks */}
              {TAGE.map(t => (
                <div key={t} className="w-2 h-2 rounded-sm transition-all"
                  style={{ backgroundColor: plan[t] ? '#D97706' : 'rgba(255,255,255,0.18)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Day rows */}
        {TAGE.map((tag, i) => {
          const rezept      = plan[tag]
          const selected    = selectedTag === tag
          const isNaechster = tag === NAECHSTER_TAG
          const isPop       = assignedTag === tag

          const badgeBg = selected
            ? '#D97706'
            : rezept
            ? (katDayBadge[rezept.kategorie] ?? '#1A2E23')
            : isNaechster ? '#fffbeb' : '#F7F3EE'

          const badgeColor = selected || rezept ? '#fff' : isNaechster ? '#D97706' : '#A8A29E'

          return (
            <div key={tag}>
              {i > 0 && (
                <div className="mx-4 border-t border-dashed" style={{ borderColor: '#EDE8E1' }} />
              )}
              <button
                onClick={() => setSelected(selected ? null : tag)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer"
                style={{ backgroundColor: selected ? '#fffbeb' : 'transparent' }}
              >
                {/* Day badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold transition-all ${isPop ? 'badge-pop' : ''}`}
                  style={{ backgroundColor: badgeBg, color: badgeColor }}
                >
                  {KURZ[tag]}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  {rezept ? (
                    <>
                      <p className="font-display text-sm truncate" style={{ color: '#1C1917', letterSpacing: '-0.005em' }}>
                        {rezept.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#A8A29E' }}>
                        {isNaechster && <span style={{ color: '#D97706' }}>Morgen · </span>}
                        {rezept.zeit} Min. · {rezept.personen ?? 2} Pers.
                      </p>
                    </>
                  ) : isNaechster ? (
                    <p className="text-sm">
                      <span className="font-semibold" style={{ color: '#D97706' }}>Morgen</span>
                      <span style={{ color: '#A8A29E' }}> – noch frei</span>
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: '#C4BCBA' }}>Noch frei</p>
                  )}
                </div>

                {/* Remove / chevron */}
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

      {/* ── Recipe section ───────────────────────────────────────────────── */}
      {selectedTag && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium px-0.5" style={{ color: '#A8A29E' }}>
            Was gibt's am{' '}
            <span className="font-semibold" style={{ color: '#1C1917' }}>{selectedTag}</span>?
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

          {/* Filter + Sort */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {KATEGORIEN.map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                style={filter === k
                  ? { backgroundColor: '#1A2E23', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#78716C', border: '1px solid #E8E2D9' }}
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
                  : { backgroundColor: '#fff', color: '#78716C', border: '1px solid #E8E2D9' }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ── Recipe cards (Karteikarten) ──────────────────────────────── */}
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
            {gefiltert.map((r, index) => {
              const kat              = katStyle[r.kategorie] ?? { bg: '#F7F3EE', text: '#78716C' }
              const bereitsZugewiesen = Object.entries(plan).find(([, rez]) => rez?.id === r.id)
              const cardBg           = katCardBg[r.kategorie] ?? '#FEFCF8'

              return (
                <div
                  key={r.id}
                  className={`card-stagger rounded-2xl overflow-hidden card-shadow card-hover${r.favorit ? ' favorit-karte' : ''}`}
                  style={r.favorit ? {} : {
                    borderTop:    `3px solid ${kat.text}`,
                    borderRight:  '1px solid #E8E2D9',
                    borderBottom: '1px solid #E8E2D9',
                    borderLeft:   '1px solid #E8E2D9',
                    backgroundColor: cardBg,
                    animationDelay: `${index * 35}ms`,
                  }}
                >
                  <div className="flex items-center gap-3 p-3">

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + Chef's Pick badge */}
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                        <p className="font-semibold text-sm truncate flex-1" style={{ color: '#1C1917' }}>
                          {r.name}
                        </p>
                        {r.favorit && (
                          <span
                            className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#1A2E23', border: '1px solid rgba(217,119,6,0.4)' }}
                          >
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="#D97706" stroke="none">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            <span className="text-[8px] font-bold uppercase" style={{ color: '#D97706', letterSpacing: '0.08em' }}>
                              Chef's Pick
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category chip with dot */}
                        <span
                          className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: kat.bg, color: kat.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
                            style={{ backgroundColor: kat.text, opacity: 0.65 }} />
                          {r.kategorie}
                        </span>

                        {/* Time */}
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#A8A29E' }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {r.zeit} Min.
                        </span>

                        {/* Match % */}
                        {vorhandene.length > 0 && (
                          <span className="text-[10px] font-semibold tabular-nums" style={{
                            color: r.stufe === 'hoch' ? '#15803d' : r.stufe === 'mittel' ? '#92400e' : '#A8A29E',
                          }}>
                            {r.prozent}%
                          </span>
                        )}

                        {/* PDF */}
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
                      <div className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl"
                        style={{ backgroundColor: '#F7F3EE' }}>
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
                          <div className="flex items-center rounded-xl px-1 gap-0"
                            style={{ backgroundColor: '#F7F3EE' }}
                            onClick={e => e.stopPropagation()}>
                            <button
                              onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p - 1) }}
                              className="w-7 h-7 flex items-center justify-center font-medium cursor-pointer"
                              style={{ color: '#78716C' }}>−</button>
                            <span className="text-sm font-semibold w-4 text-center tabular-nums" style={{ color: '#1C1917' }}>
                              {getPersonen(r.id)}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p + 1) }}
                              className="w-7 h-7 flex items-center justify-center font-medium cursor-pointer"
                              style={{ color: '#78716C' }}>+</button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setStepperOffen(r.id); stepperSchliessen() }}
                            className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 cursor-pointer transition-colors"
                            style={{ backgroundColor: '#F7F3EE' }}>
                            <span className="text-sm font-semibold leading-none" style={{ color: '#1C1917' }}>
                              {getPersonen(r.id)}
                            </span>
                            <span className="text-[9px] leading-none mt-0.5" style={{ color: '#A8A29E' }}>Pers.</span>
                          </button>
                        )}
                        <button
                          onClick={() => zuweisen(r)}
                          className="h-9 px-3 rounded-xl font-medium text-xs transition-all active:scale-[0.95] cursor-pointer flex items-center gap-1.5"
                          style={{ backgroundColor: '#D97706', color: '#fff' }}>
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

      {/* ── Empty state (no day selected) ────────────────────────────────── */}
      {!selectedTag && (
        <button
          onClick={() => setSelected(naechsterOffenerTag)}
          className="text-center py-10 w-full cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: '#F7F3EE' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8BFB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: '#78716C' }}>Tag auswählen</p>
          <p className="text-xs mt-1.5 font-medium" style={{ color: '#D97706' }}>
            {naechsterOffenerTag} öffnen →
          </p>
        </button>
      )}

      {/* ── Bon Appétit overlay ───────────────────────────────────────────── */}
      {bonAppetit && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="bon-appetit px-8 py-5 rounded-2xl text-center card-shadow-md"
            style={{ backgroundColor: '#1A2E23' }}>
            <p className="font-display text-3xl italic" style={{ color: '#D97706', letterSpacing: '-0.01em' }}>
              Bon Appétit!
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Die Woche ist vollständig geplant
            </p>
          </div>
        </div>
      )}

      <PdfModal rezept={pdfRezept} onClose={() => setPdfRezept(null)} />
    </div>
  )
}
