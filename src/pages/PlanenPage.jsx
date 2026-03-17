import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import rezepteData from '../data/rezepte.json'
import { ladeVorhandeneZutaten, berechneMatch, matchStufe, berechneVorratNachPlan } from '../utils/matching'

const TAGE      = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']
const KURZ      = { Montag:'Mo', Dienstag:'Di', Mittwoch:'Mi', Donnerstag:'Do', Freitag:'Fr', Samstag:'Sa', Sonntag:'So' }
const KATEGORIEN = ['alle','vegetarisch','vegan','fleischhaltig','fischhaltig']
const STORAGE_KEY = 'stocker_wochenplan'

const katStyle = {
  vegetarisch:    'bg-emerald-50 text-emerald-700',
  vegan:          'bg-lime-50 text-lime-700',
  fleischhaltig:  'bg-rose-50 text-rose-700',
  fischhaltig:    'bg-sky-50 text-sky-700',
}

function ladePlan() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function speicherePlan(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export default function PlanenPage({ weiter }) {
  const [plan, setPlan]            = useState(ladePlan)
  const [selectedTag, setSelected] = useState(null)
  const [filter, setFilter]        = useState('alle')
  const [suche, setSuche]          = useState('')
  const [sortierung, setSortierung] = useState('match')
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
      if (sortierung === 'alpha')    return a.name.localeCompare(b.name, 'de')
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
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">Diese Woche</p>
          {belegteTagCount > 0 && (
            <span className="text-xs text-zinc-400">
              <span className="text-zinc-700 font-semibold">{belegteTagCount}</span>/7 Tage
            </span>
          )}
        </div>
        {TAGE.map((tag, i) => {
          const rezept   = plan[tag]
          const selected = selectedTag === tag
          return (
            <div key={tag}>
              {i > 0 && <div className="h-px bg-zinc-100 mx-4" />}
              <button
                onClick={() => setSelected(selected ? null : tag)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${selected ? 'bg-amber-50' : 'active:bg-zinc-50'}`}
              >
                {/* Tag-Badge */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold transition-all ${
                  selected ? 'bg-amber-500 text-white' :
                  rezept   ? 'bg-zinc-900 text-white'  :
                             'bg-zinc-100 text-zinc-400'
                }`}>
                  {KURZ[tag]}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  {rezept ? (
                    <>
                      <p className="font-medium text-zinc-900 text-sm truncate">{rezept.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{rezept.zeit} Min. · {rezept.personen ?? 2} Pers.</p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-400">Noch nicht geplant</p>
                  )}
                </div>

                {/* Aktion */}
                {rezept && !selected ? (
                  <button
                    onClick={e => { e.stopPropagation(); entfernen(tag) }}
                    className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 active:bg-rose-50 active:text-rose-400 transition-colors cursor-pointer shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ) : (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    selected ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
        className={`w-full py-4 rounded-2xl text-sm font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
          belegteTagCount > 0
            ? 'bg-amber-500 text-white'
            : 'bg-zinc-200 text-zinc-400'
        }`}
      >
        Zur Einkaufsliste
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Rezepte-Sektion */}
      {selectedTag && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-zinc-400 px-0.5">
            Rezepte für <span className="text-zinc-700 font-semibold">{selectedTag}</span>
          </p>

          {/* Suche */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rezept suchen…"
              value={suche}
              onChange={e => setSuche(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-white"
            />
          </div>

          {/* Filter + Sortierung in einer Zeile */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {KATEGORIEN.map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  filter === k ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-500 border border-zinc-200'
                }`}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
            <div className="w-px bg-zinc-200 shrink-0 mx-1" />
            {[
              { key: 'match',    label: 'Match' },
              { key: 'zeit_asc', label: 'Schnell' },
              { key: 'alpha',    label: 'A–Z' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortierung(s.key)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  sortierung === s.key ? 'bg-amber-500 text-white' : 'bg-white text-zinc-500 border border-zinc-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Rezept-Karten — 1 Spalte, luftiger */}
          <div className="flex flex-col gap-2">
            {gefiltert.map(r => {
              const bereitsZugewiesen = Object.entries(plan).find(([, rez]) => rez?.id === r.id)

              return (
                <div key={r.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${
                  r.stufe === 'hoch' ? 'border-emerald-200' : r.stufe === 'mittel' ? 'border-amber-100' : 'border-zinc-100'
                }`}>
                  <div className="flex items-center gap-3 p-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-zinc-900 text-sm truncate">{r.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${katStyle[r.kategorie] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {r.kategorie}
                        </span>
                        <span className="text-[11px] text-zinc-400">{r.zeit} Min.</span>
                        {vorhandene.length > 0 && (
                          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                            r.stufe === 'hoch'   ? 'bg-emerald-50 text-emerald-700' :
                            r.stufe === 'mittel' ? 'bg-amber-50 text-amber-600' :
                                                  'bg-zinc-100 text-zinc-400'
                          }`}>
                            {r.prozent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Aktion */}
                    {bereitsZugewiesen ? (
                      <div className="flex items-center gap-1.5 shrink-0 bg-zinc-100 rounded-xl px-3 py-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span className="text-xs font-medium text-zinc-500">{bereitsZugewiesen[0].slice(0,2)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Personen-Stepper */}
                        {stepperOffen === r.id ? (
                          <div className="flex items-center bg-zinc-100 rounded-xl px-1 gap-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p - 1) }}
                              className="w-7 h-7 flex items-center justify-center text-zinc-500 font-medium active:text-zinc-900 cursor-pointer"
                            >−</button>
                            <span className="text-sm font-semibold text-zinc-800 w-4 text-center tabular-nums">{getPersonen(r.id)}</span>
                            <button
                              onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p + 1) }}
                              className="w-7 h-7 flex items-center justify-center text-zinc-500 font-medium active:text-zinc-900 cursor-pointer"
                            >+</button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setStepperOffen(r.id); stepperSchliessen() }}
                            className="w-9 h-9 bg-zinc-100 rounded-xl flex flex-col items-center justify-center shrink-0 cursor-pointer active:bg-zinc-200 transition-colors"
                          >
                            <span className="text-sm font-semibold text-zinc-700 leading-none">{getPersonen(r.id)}</span>
                            <span className="text-[9px] text-zinc-400 leading-none mt-0.5">Pers.</span>
                          </button>
                        )}
                        {/* Hinzufügen */}
                        <button
                          onClick={() => zuweisen(r)}
                          className="h-9 px-3 bg-amber-500 text-white rounded-xl font-semibold text-xs active:bg-amber-600 transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1.5"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
        <div className="text-center py-6">
          <p className="text-zinc-400 text-sm">Tag antippen um Rezepte zuzuweisen</p>
        </div>
      )}
    </div>
  )
}
