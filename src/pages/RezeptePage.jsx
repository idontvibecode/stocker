import { useState, useMemo } from 'react'
import rezepteData from '../data/rezepte.json'
import { ladeVorhandeneZutaten, berechneMatch, berechneVorratNachPlan, matchStufe } from '../utils/matching'

const KATEGORIEN = ['alle', 'vegetarisch', 'vegan', 'fleischhaltig', 'fischhaltig']
const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const WOCHENPLAN_KEY = 'stocker_wochenplan'

function ladeWochenplan() {
  try { return JSON.parse(localStorage.getItem(WOCHENPLAN_KEY) ?? '{}') } catch { return {} }
}
function speichereWochenplan(plan) {
  localStorage.setItem(WOCHENPLAN_KEY, JSON.stringify(plan))
}

const kategorieConfig = {
  vegetarisch:   { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  vegan:         { bg: 'bg-lime-50',    text: 'text-lime-700' },
  fleischhaltig: { bg: 'bg-rose-50',    text: 'text-rose-700' },
  fischhaltig:   { bg: 'bg-sky-50',     text: 'text-sky-700' },
}

const matchConfig = {
  hoch:    { ring: 'ring-2 ring-emerald-300', badge: 'bg-emerald-50 text-emerald-700' },
  mittel:  { ring: 'ring-2 ring-amber-300',   badge: 'bg-amber-50 text-amber-700' },
  niedrig: { ring: '',                         badge: 'bg-zinc-100 text-zinc-500' },
}

export default function RezeptePage({ weiter, navigateTo }) {
  const [filter, setFilter]         = useState('alle')
  const [suche, setSuche]           = useState('')
  const [tagPicker, setTagPicker]   = useState(null)   // rezept-Objekt für das gerade ein Tag gewählt wird
  const [toast, setToast]           = useState(null)   // { name, tag }
  const [plan, setPlan]             = useState(ladeWochenplan)

  const vorhandene        = useMemo(() => ladeVorhandeneZutaten(), [])
  const vorhandeneNachPlan = useMemo(() => berechneVorratNachPlan(plan, vorhandene), [plan, vorhandene])

  const rezepteMitMatch = useMemo(() =>
    rezepteData.map((r) => {
      const { prozent, vorhanden, fehlend } = berechneMatch(r, vorhandeneNachPlan)
      return { rezept: r, match: { prozent, vorhanden, fehlend, stufe: matchStufe(prozent) } }
    }).sort((a, b) => b.match.prozent - a.match.prozent),
    [vorhandeneNachPlan]
  )

  const gefiltert = rezepteMitMatch.filter(({ rezept }) => {
    const kategorieOk = filter === 'alle' || rezept.kategorie === filter
    const sucheOk = rezept.name.toLowerCase().includes(suche.toLowerCase())
    return kategorieOk && sucheOk
  })

  const hatZutaten = vorhandene.length > 0

  function rezeptHinzufuegen(rezept, tag) {
    const neuerPlan = { ...plan, [tag]: rezept }
    speichereWochenplan(neuerPlan)
    setPlan(neuerPlan)
    setTagPicker(null)
    setToast({ name: rezept.name, tag })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="pt-1 pb-1">
        <h1 className="text-2xl font-bold text-zinc-900">Rezeptvorschläge</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {hatZutaten
            ? `Sortiert nach Übereinstimmung mit deinen ${vorhandene.length} Zutaten.`
            : 'Füge Zutaten hinzu für personalisierte Vorschläge.'}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Rezept suchen…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="pl-9 pr-3 py-3 border border-zinc-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {KATEGORIEN.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filter === k
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-zinc-200'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Rezept-Karten */}
      {gefiltert.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">Keine Rezepte gefunden.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {gefiltert.map(({ rezept, match }) => {
            const kat = kategorieConfig[rezept.kategorie] ?? { bg: 'bg-zinc-50', text: 'text-zinc-600' }
            const mc  = hatZutaten ? (matchConfig[match.stufe] ?? matchConfig.niedrig) : matchConfig.niedrig
            const vorhandeneNamen = new Set((match?.vorhanden ?? []).map((z) => z.name))

            return (
              <div key={rezept.id} className={`bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden ${mc.ring}`}>
                {/* Karten-Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-zinc-900 text-base leading-snug">{rezept.name}</h3>
                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${kat.bg} ${kat.text}`}>
                      {rezept.kategorie}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
                    <span>⏱ {rezept.zeit} Min.</span>
                    <span>·</span>
                    <span>{rezept.aufwand}</span>
                    {hatZutaten && match.prozent > 0 && (
                      <span className={`ml-auto font-bold px-2.5 py-1 rounded-full text-[11px] ${mc.badge}`}>
                        {match.prozent}% vorhanden
                      </span>
                    )}
                  </div>

                  {/* Zutaten */}
                  <div className="flex flex-wrap gap-1.5">
                    {rezept.zutaten.map((z) => {
                      const vorhanden = vorhandeneNamen.has(z.name)
                      return (
                        <span
                          key={z.name}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            vorhanden
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                              : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                          }`}
                        >
                          {z.name}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* CTA */}
                <div className="px-3 pb-3">
                  <button
                    onClick={() => setTagPicker(rezept)}
                    className="w-full py-3 bg-emerald-700 text-white rounded-xl text-sm font-bold active:bg-emerald-800 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Zum Wochenplan hinzufügen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Weiter-Button */}
      <div className="pt-2 pb-2">
        <button
          onClick={weiter}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl text-base font-bold active:bg-zinc-700 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          Zum Wochenplan
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Tag-Picker Bottom Sheet */}
      {tagPicker && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setTagPicker(null) }}
        >
          <div className="bg-white w-full rounded-t-3xl shadow-2xl pb-safe">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>
            <div className="px-5 py-3 border-b border-zinc-100">
              <p className="text-xs text-zinc-400 font-medium">Rezept einplanen</p>
              <p className="font-bold text-zinc-900 text-base mt-0.5">{tagPicker.name}</p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {TAGE.map((tag) => {
                const belegt = plan[tag] != null
                return (
                  <button
                    key={tag}
                    onClick={() => rezeptHinzufuegen(tagPicker, tag)}
                    className={`py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] cursor-pointer flex items-center justify-between px-4 ${
                      belegt
                        ? 'bg-zinc-50 text-zinc-500 border border-zinc-200'
                        : 'bg-emerald-700 text-white'
                    }`}
                  >
                    <span>{tag}</span>
                    {belegt && <span className="text-[10px] text-zinc-400">belegt</span>}
                  </button>
                )
              })}
            </div>
            <div className="px-3 pb-4">
              <button
                onClick={() => setTagPicker(null)}
                className="w-full py-3 text-zinc-400 text-sm font-medium cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 whitespace-nowrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {toast.name} → {toast.tag}
        </div>
      )}
    </div>
  )
}
