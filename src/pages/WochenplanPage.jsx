import { useState, useMemo } from 'react'
import rezepteData from '../data/rezepte.json'
import { ladeVorhandeneZutaten, berechneMatch, berechneVorratNachPlan, matchStufe } from '../utils/matching'

const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const STORAGE_KEY = 'stocker_wochenplan'

const tagKurz = { Montag:'Mo', Dienstag:'Di', Mittwoch:'Mi', Donnerstag:'Do', Freitag:'Fr', Samstag:'Sa', Sonntag:'So' }

const matchStyle = {
  hoch:    { bar: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700', border: 'border-l-emerald-400' },
  mittel:  { bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700',     border: 'border-l-amber-400' },
  niedrig: { bar: 'bg-zinc-200',    badge: 'bg-zinc-100 text-zinc-500',      border: 'border-l-zinc-300' },
}

function ladeWochenplan() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : Object.fromEntries(TAGE.map((t) => [t, null]))
  } catch {
    return Object.fromEntries(TAGE.map((t) => [t, null]))
  }
}

export default function WochenplanPage({ weiter }) {
  const [plan, setPlan] = useState(ladeWochenplan)
  const [auswahlTag, setAuswahlTag] = useState(null)
  const [suche, setSuche] = useState('')

  const vorhandene         = useMemo(() => ladeVorhandeneZutaten(), [])
  const vorhandeneNachPlan = useMemo(() => berechneVorratNachPlan(plan, vorhandene), [plan, vorhandene])

  function speichern(neuerPlan) {
    setPlan(neuerPlan)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(neuerPlan))
  }

  function rezeptZuweisen(tag, rezept) {
    speichern({ ...plan, [tag]: rezept })
    setAuswahlTag(null)
    setSuche('')
  }

  function rezeptEntfernen(tag) {
    speichern({ ...plan, [tag]: null })
  }

  const gefilterteRezepte = useMemo(() => rezepteData
    .filter((r) => r.name.toLowerCase().includes(suche.toLowerCase()))
    .map((r) => {
      const { prozent } = berechneMatch(r, vorhandeneNachPlan)
      return { ...r, prozent, stufe: matchStufe(prozent) }
    })
    .sort((a, b) => b.prozent - a.prozent),
    [suche, vorhandeneNachPlan]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {TAGE.map((tag) => {
          const rezept = plan[tag]
          const match = rezept
            ? (() => { const { prozent } = berechneMatch(rezept, vorhandeneNachPlan); return { prozent, stufe: matchStufe(prozent) } })()
            : null
          const ms = match ? matchStyle[match.stufe] : null

          return (
            <div key={tag} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
              {/* Tag-Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-100">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{tagKurz[tag]}</span>
                <span className="text-xs text-zinc-300 hidden sm:block">{tag}</span>
              </div>

              {rezept ? (
                <div className={`flex-1 p-3 border-l-4 ${ms.border} flex flex-col gap-2`}>
                  <p className="text-sm font-semibold text-zinc-800 leading-snug">{rezept.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-zinc-400">⏱ {rezept.zeit} Min.</span>
                    {vorhandeneNachPlan.length > 0 && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ms.badge}`}>
                        {match.prozent}%
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-auto pt-1">
                    <button onClick={() => setAuswahlTag(tag)} className="text-[11px] font-medium text-emerald-600 hover:text-emerald-800 cursor-pointer transition-colors">
                      ändern
                    </button>
                    <button onClick={() => rezeptEntfernen(tag)} className="text-[11px] font-medium text-zinc-400 hover:text-rose-500 cursor-pointer transition-colors">
                      entfernen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-2.5">
                  <button
                    onClick={() => setAuswahlTag(tag)}
                    className="w-full h-full min-h-[80px] flex items-center justify-center text-xs text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border-2 border-dashed border-zinc-200 hover:border-emerald-300 transition-all cursor-pointer"
                  >
                    + hinzufügen
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {auswahlTag && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setAuswahlTag(null); setSuche('') } }}
        >
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[75vh]">
            {/* Handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
              <div>
                <p className="text-xs text-zinc-400 font-medium">Rezept wählen für</p>
                <h2 className="font-semibold text-zinc-900">{auswahlTag}</h2>
              </div>
              <button
                onClick={() => { setAuswahlTag(null); setSuche('') }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 text-lg leading-none cursor-pointer transition-colors"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-3 border-b border-zinc-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Suchen…"
                  value={suche}
                  onChange={(e) => setSuche(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-zinc-50"
                />
              </div>
            </div>

            <ul className="overflow-y-auto flex-1 divide-y divide-zinc-50 px-2 py-1">
              {gefilterteRezepte.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => rezeptZuweisen(auswahlTag, r)}
                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{r.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">⏱ {r.zeit} Min. · {r.kategorie}</p>
                    </div>
                    {vorhandeneNachPlan.length > 0 && r.prozent > 0 && (
                      <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full ${
                        r.stufe === 'hoch' ? 'bg-emerald-50 text-emerald-700' :
                        r.stufe === 'mittel' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {r.prozent}%
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Weiter-Button */}
      <button
        onClick={weiter}
        className="w-full py-4 bg-emerald-700 text-white rounded-2xl text-base font-bold active:bg-emerald-800 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
      >
        Zur Einkaufsliste
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}
