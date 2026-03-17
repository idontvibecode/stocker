import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import rezepteData from '../data/rezepte.json'
import { ladeVorhandeneZutaten, berechneMatch, matchStufe, berechneVorratNachPlan } from '../utils/matching'

const TAGE      = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']
const KURZ      = { Montag:'Mo', Dienstag:'Di', Mittwoch:'Mi', Donnerstag:'Do', Freitag:'Fr', Samstag:'Sa', Sonntag:'So' }
const KATEGORIEN = ['alle','vegetarisch','vegan','fleischhaltig','fischhaltig']
const STORAGE_KEY = 'stocker_wochenplan'

const katStyle = {
  vegetarisch:    'bg-emerald-100 text-emerald-800',
  vegan:          'bg-lime-100 text-lime-800',
  fleischhaltig:  'bg-rose-100 text-rose-800',
  fischhaltig:    'bg-sky-100 text-sky-800',
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
  const [sortierung, setSortierung] = useState('match') // 'match' | 'zeit_asc' | 'zeit_desc'
  const [personenProRezept, setPersonenProRezept] = useState({}) // { [id]: zahl }
  const [stepperOffen, setStepperOffen] = useState(null) // rezept.id oder null
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

  // Verbleibender Vorrat nach Abzug aller anderen bereits geplanten Tage
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
      return 0 // 'match': Reihenfolge kommt schon von rezepteMitMatch
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
    <div className="flex flex-col gap-5">


      {/* Wochenübersicht — vertikale Liste, alles auf einen Blick */}
      <div className="bg-white rounded-3xl border-2 border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-black tracking-widest text-zinc-400">DIESE WOCHE</p>
        </div>
        {TAGE.map((tag, i) => {
          const rezept   = plan[tag]
          const selected = selectedTag === tag
          return (
            <div key={tag}>
              {i > 0 && <div className="h-px bg-zinc-100 mx-5" />}
              <button
                onClick={() => setSelected(selected ? null : tag)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 transition-all cursor-pointer active:bg-zinc-50 ${selected ? 'bg-amber-50' : ''}`}
              >
                {/* Tag-Kürzel */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm transition-all ${
                  selected ? 'bg-amber-500 text-white' :
                  rezept   ? 'bg-zinc-900 text-white'  :
                             'bg-zinc-100 text-zinc-400'
                }`}>
                  {KURZ[tag]}
                </div>

                {/* Rezept-Info */}
                <div className="flex-1 text-left min-w-0">
                  {rezept ? (
                    <>
                      <p className="font-bold text-zinc-900 text-sm truncate">{rezept.name}</p>
                      <p className="text-xs text-zinc-400 font-semibold">⏱ {rezept.zeit} Min. · {rezept.personen ?? 2} Pers.</p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-400 font-semibold">Noch nicht geplant</p>
                  )}
                </div>

                {/* Aktion */}
                {rezept && !selected ? (
                  <button
                    onClick={e => { e.stopPropagation(); entfernen(tag) }}
                    className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 active:bg-rose-100 active:text-rose-500 transition-colors cursor-pointer shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    selected ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      {selected ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                    </svg>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* CTA — direkt nach der Wochenübersicht */}
      <button
        onClick={weiter}
        className={`w-full py-5 rounded-3xl text-lg font-black tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 shadow-xl ${
          belegteTagCount > 0
            ? 'bg-amber-500 text-white shadow-amber-500/30'
            : 'bg-zinc-200 text-zinc-400 shadow-none'
        }`}
      >
        ZUR EINKAUFSLISTE
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Rezepte-Sektion */}
      {selectedTag && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"/>
            <p className="text-xs font-black tracking-widest text-zinc-500">
              REZEPTE FÜR {selectedTag.toUpperCase()}
            </p>
          </div>

          {/* Suche */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rezept suchen…"
              value={suche}
              onChange={e => setSuche(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 border-2 border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-amber-400 bg-white"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {KATEGORIEN.map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer ${
                  filter === k ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-500 border-2 border-zinc-200'
                }`}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sortierung */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 shrink-0">SORTIEREN:</span>
            <div className="flex gap-1.5">
              {[
                { key: 'match',    label: 'Beste Übereinstimmung' },
                { key: 'zeit_asc', label: '⏱ Schnellste zuerst' },
                { key: 'alpha',    label: 'A – Z' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortierung(s.key)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    sortierung === s.key ? 'bg-amber-500 text-white' : 'bg-white text-zinc-500 border-2 border-zinc-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Karten */}
          <div className="grid grid-cols-2 gap-3">
            {gefiltert.map(r => {
              const vorNamen = new Set(r.vorhanden.map(z => z.name))
              const bereitsZugewiesen = Object.entries(plan).find(([, rez]) => rez?.id === r.id)

              return (
                <div key={r.id} className={`bg-white rounded-3xl border-2 overflow-hidden shadow-sm ${
                  r.stufe === 'hoch' ? 'border-amber-300' : r.stufe === 'mittel' ? 'border-zinc-300' : 'border-zinc-200'
                }`}>
                  <div className="p-3 pb-2">
                    <div className="mb-1.5">
                      <h3 className="font-black text-zinc-900 text-sm leading-tight">{r.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${katStyle[r.kategorie] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {r.kategorie.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-semibold">⏱ {r.zeit}'</span>
                      {vorhandene.length > 0 && (
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                          r.stufe === 'hoch'   ? 'bg-amber-100 text-amber-700' :
                          r.stufe === 'mittel' ? 'bg-zinc-100 text-zinc-600'   : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          {r.prozent}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    {bereitsZugewiesen ? (
                      <div className="w-full py-3.5 bg-zinc-100 rounded-2xl flex items-center justify-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span className="text-sm font-black text-zinc-500">GEPLANT FÜR {bereitsZugewiesen[0].toUpperCase()}</span>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-stretch">
                        {/* Hinzufügen-Button */}
                        <button
                          onClick={() => zuweisen(r)}
                          className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black text-sm active:bg-amber-600 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          FÜR {selectedTag.toUpperCase()}
                        </button>
                        {/* Personen-Badge / Stepper */}
                        {stepperOffen === r.id ? (
                          <div className="flex items-center bg-zinc-100 rounded-2xl px-1.5 gap-0 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p - 1) }}
                              className="w-7 h-7 flex items-center justify-center text-zinc-500 font-black text-base active:text-zinc-900 cursor-pointer"
                            >−</button>
                            <span className="text-sm font-black text-zinc-800 w-4 text-center tabular-nums">{getPersonen(r.id)}</span>
                            <button
                              onClick={e => { e.stopPropagation(); stepperAendern(r.id, p => p + 1) }}
                              className="w-7 h-7 flex items-center justify-center text-zinc-500 font-black text-base active:text-zinc-900 cursor-pointer"
                            >+</button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setStepperOffen(r.id); stepperSchliessen() }}
                            className="w-12 bg-zinc-100 rounded-2xl flex flex-col items-center justify-center shrink-0 cursor-pointer active:bg-zinc-200 transition-colors"
                          >
                            <span className="text-base font-black text-zinc-700 leading-none">{getPersonen(r.id)}</span>
                            <span className="text-[9px] font-bold text-zinc-400 leading-none mt-0.5">Pers.</span>
                          </button>
                        )}
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
          <p className="text-zinc-400 font-semibold text-sm">↑ Tag antippen um Rezepte zu sehen</p>
        </div>
      )}
    </div>
  )
}
