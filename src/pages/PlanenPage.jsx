import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import rezepteData from '../data/rezepte.json'
import { ladeVorhandeneZutaten, berechneMatch, matchStufe, berechneVorratNachPlan } from '../utils/matching'

const TAGE      = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']
const KURZ      = { Montag:'Mo', Dienstag:'Di', Mittwoch:'Mi', Donnerstag:'Do', Freitag:'Fr', Samstag:'Sa', Sonntag:'So' }
const KATEGORIEN = ['alle','vegetarisch','vegan','fleischhaltig','fischhaltig']
const STORAGE_KEY = 'stocker_wochenplan'

const katStyle = {
  vegetarisch:   { bg: '#f0fdf4', text: '#15803d' },
  vegan:         { bg: '#f7fee7', text: '#4d7c0f' },
  fleischhaltig: { bg: '#fff1f2', text: '#be123c' },
  fischhaltig:   { bg: '#f0f9ff', text: '#0369a1' },
}

function ladePlan() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function speicherePlan(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export default function PlanenPage({ weiter }) {
  const [plan, setPlan]             = useState(ladePlan)
  const [selectedTag, setSelected]  = useState(null)
  const [filter, setFilter]         = useState('alle')
  const [suche, setSuche]           = useState('')
  const [sortierung, setSortierung] = useState(() => ladeVorhandeneZutaten().length > 0 ? 'match' : 'alpha')
  const [personenProRezept, setPersonenProRezept] = useState({})
  const [stepperOffen, setStepperOffen] = useState(null)
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

      {/* Wochenübersicht */}
      <div className="bg-white rounded-2xl overflow-hidden card-shadow">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: '#A8A29E' }}>Diese Woche</p>
          {belegteTagCount > 0 && (
            <span className="text-xs" style={{ color: '#A8A29E' }}>
              <span className="font-semibold" style={{ color: '#1C1917' }}>{belegteTagCount}</span>/7
            </span>
          )}
        </div>

        {TAGE.map((tag, i) => {
          const rezept   = plan[tag]
          const selected = selectedTag === tag
          return (
            <div key={tag}>
              {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: '#F7F3EE' }} />}
              <button
                onClick={() => setSelected(selected ? null : tag)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
                style={{ backgroundColor: selected ? '#fffbeb' : 'transparent' }}
              >
                {/* Tag-Badge */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: selected ? '#D97706' : rezept ? '#1A2E23' : '#F7F3EE',
                    color: selected ? '#fff' : rezept ? '#fff' : '#A8A29E',
                  }}>
                  {KURZ[tag]}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  {rezept ? (
                    <>
                      <p className="font-medium text-sm truncate" style={{ color: '#1C1917' }}>{rezept.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#A8A29E' }}>{rezept.zeit} Min. · {rezept.personen ?? 2} Pers.</p>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: '#A8A29E' }}>Noch nicht geplant</p>
                  )}
                </div>

                {/* Aktion */}
                {rezept && !selected ? (
                  <button
                    onClick={e => { e.stopPropagation(); entfernen(tag) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    style={{ backgroundColor: '#F7F3EE', color: '#A8A29E' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ) : (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ backgroundColor: selected ? '#D97706' : '#F7F3EE', color: selected ? '#fff' : '#A8A29E' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      {selected ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                    </svg>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <button
        onClick={weiter}
        className="w-full py-4 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        style={{
          backgroundColor: belegteTagCount > 0 ? '#D97706' : '#E8E2D9',
          color: belegteTagCount > 0 ? '#fff' : '#A8A29E',
        }}
      >
        Zur Einkaufsliste
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Rezepte-Sektion */}
      {selectedTag && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium px-0.5" style={{ color: '#A8A29E' }}>
            Rezepte für <span className="font-semibold" style={{ color: '#1C1917' }}>{selectedTag}</span>
          </p>

          {/* Suche */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rezept suchen…"
              value={suche}
              onChange={e => setSuche(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-colors bg-white"
              style={{ border: '1px solid #E8E2D9', color: '#1C1917' }}
            />
          </div>

          {/* Filter + Sort */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {KATEGORIEN.map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
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
              { key: 'match',    label: 'Match' },
              { key: 'zeit_asc', label: 'Schnell' },
              { key: 'alpha',    label: 'A–Z' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortierung(s.key)}
                className="shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
                style={sortierung === s.key
                  ? { backgroundColor: '#D97706', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#78716C', border: '1px solid #E8E2D9' }
                }
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Rezept-Karten */}
          <div className="flex flex-col gap-2">
            {gefiltert.map(r => {
              const kat = katStyle[r.kategorie] ?? { bg: '#F7F3EE', text: '#78716C' }
              const bereitsZugewiesen = Object.entries(plan).find(([, rez]) => rez?.id === r.id)
              const borderColor = r.stufe === 'hoch' ? '#bbf7d0' : r.stufe === 'mittel' ? '#fde68a' : '#E8E2D9'

              return (
                <div key={r.id} className="bg-white rounded-2xl overflow-hidden card-shadow"
                  style={{ border: `1px solid ${borderColor}` }}>
                  <div className="flex items-center gap-3 p-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <p className="font-medium text-sm truncate" style={{ color: '#1C1917' }}>{r.name}</p>
                        {r.favorit && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#D97706" stroke="none" className="shrink-0">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: kat.bg, color: kat.text }}>
                          {r.kategorie}
                        </span>
                        <span className="text-[11px]" style={{ color: '#A8A29E' }}>{r.zeit} Min.</span>
                        {vorhandene.length > 0 && (
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{
                            backgroundColor: r.stufe === 'hoch' ? '#f0fdf4' : r.stufe === 'mittel' ? '#fffbeb' : '#F7F3EE',
                            color:           r.stufe === 'hoch' ? '#15803d' : r.stufe === 'mittel' ? '#92400e' : '#A8A29E',
                          }}>
                            {r.prozent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Aktion */}
                    {bereitsZugewiesen ? (
                      <div className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl"
                        style={{ backgroundColor: '#F7F3EE' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span className="text-xs font-medium" style={{ color: '#78716C' }}>{bereitsZugewiesen[0].slice(0, 2)}</span>
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
                            <span className="text-sm font-semibold w-4 text-center tabular-nums" style={{ color: '#1C1917' }}>{getPersonen(r.id)}</span>
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
                            <span className="text-sm font-semibold leading-none" style={{ color: '#1C1917' }}>{getPersonen(r.id)}</span>
                            <span className="text-[9px] leading-none mt-0.5" style={{ color: '#A8A29E' }}>Pers.</span>
                          </button>
                        )}
                        <button
                          onClick={() => zuweisen(r)}
                          className="h-9 px-3 rounded-xl font-medium text-xs transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1.5"
                          style={{ backgroundColor: '#D97706', color: '#fff' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          {KURZ[selectedTag]}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!selectedTag && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: '#A8A29E' }}>Tag antippen um Rezepte zuzuweisen</p>
        </div>
      )}
    </div>
  )
}
