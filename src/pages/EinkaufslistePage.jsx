import { useState, useMemo } from 'react'
import { ladeVorhandeneZutaten, istVorhanden } from '../utils/matching'

const WOCHENPLAN_KEY  = 'stocker_wochenplan'
const ABGEHAKT_KEY    = 'stocker_einkaufsliste_abgehakt'
const EXTRA_KEY       = 'stocker_einkaufsliste_extra'

const VORSCHLAEGE = {
  'Frühstück & Snacks': [
    'Brot', 'Aufschnitt (fleischig)', 'Aufschnitt (vegan)', 'Eier',
    'Griechischer Joghurt', 'Milch', 'Müsli', 'Bananen',
    'Gummibärchen', 'Cookies', 'Äpfel',
  ],
  'Haushalt': [
    'Klopapier', 'Cewa', 'Müllbeutel 25L', 'Taschentücher',
  ],
}

function ladeWochenplan() {
  try { return JSON.parse(localStorage.getItem(WOCHENPLAN_KEY) ?? '{}') } catch { return {} }
}
function ladeAbgehakt() {
  try { return new Set(JSON.parse(localStorage.getItem(ABGEHAKT_KEY) ?? '[]')) } catch { return new Set() }
}
function speichereAbgehakt(set) {
  localStorage.setItem(ABGEHAKT_KEY, JSON.stringify([...set]))
}
function ladeExtra() {
  try { return JSON.parse(localStorage.getItem(EXTRA_KEY) ?? '[]') } catch { return [] }
}
function speichereExtra(arr) {
  localStorage.setItem(EXTRA_KEY, JSON.stringify(arr))
}

export default function EinkaufslistePage({ navigateTo }) {
  const [abgehakt, setAbgehakt]   = useState(ladeAbgehakt)
  const [extraItems, setExtraItems] = useState(ladeExtra)
  const [eingabe, setEingabe]     = useState('')
  const vorhandene = useMemo(() => ladeVorhandeneZutaten(), [])
  const plan       = useMemo(() => ladeWochenplan(), [])

  const { fehlend, benoetigt } = useMemo(() => {
    const alle = new Map()
    Object.entries(plan).forEach(([tag, rezept]) => {
      if (!rezept) return
      rezept.zutaten.forEach((z) => {
        const key = z.name.toLowerCase()
        if (!alle.has(key)) alle.set(key, { name: z.name, mengen: [], tage: [] })
        const e = alle.get(key)
        if (z.menge && !e.mengen.includes(z.menge)) e.mengen.push(z.menge)
        if (!e.tage.includes(tag)) e.tage.push(tag)
      })
    })
    const benoetigt = [...alle.values()]
    const fehlend   = benoetigt.filter((z) => !istVorhanden(z.name, vorhandene))
    return { fehlend, benoetigt }
  }, [plan, vorhandene])

  // Alle angezeigten Listeneinträge: Rezept-Fehlende + Extra
  const alleEintraege = useMemo(() => {
    const rezeptItems = fehlend.map((z) => ({ ...z, quelle: 'rezept' }))
    const extra = extraItems.map((name) => ({ name, mengen: [], tage: [], quelle: 'extra' }))
    return [...rezeptItems, ...extra]
  }, [fehlend, extraItems])

  const offen    = alleEintraege.filter((z) => !abgehakt.has(z.name))
  const erledigt = alleEintraege.filter((z) =>  abgehakt.has(z.name))

  // Vorschläge filtern: nur zeigen was noch nicht in der Liste ist
  const bereitsInListe = useMemo(
    () => new Set(alleEintraege.map((z) => z.name)),
    [alleEintraege]
  )

  function toggleAbgehakt(name) {
    setAbgehakt((prev) => {
      const neu = new Set(prev)
      neu.has(name) ? neu.delete(name) : neu.add(name)
      speichereAbgehakt(neu)
      return neu
    })
  }

  function extraHinzufuegen(name) {
    const bereinigt = name.trim()
    if (!bereinigt) return
    if (bereitsInListe.has(bereinigt)) return
    const neu = [...extraItems, bereinigt]
    setExtraItems(neu)
    speichereExtra(neu)
    setEingabe('')
  }

  function extraEntfernen(name) {
    // Aus abgehakt entfernen
    setAbgehakt((prev) => {
      const neu = new Set(prev)
      neu.delete(name)
      speichereAbgehakt(neu)
      return neu
    })
    const neu = extraItems.filter((n) => n !== name)
    setExtraItems(neu)
    speichereExtra(neu)
  }

  function alleZuruecksetzen() {
    setAbgehakt(new Set())
    speichereAbgehakt(new Set())
  }

  const gesamtFehlend = alleEintraege.length
  const fortschritt   = gesamtFehlend > 0 ? Math.round((erledigt.length / gesamtFehlend) * 100) : 100
  const planLeer      = benoetigt.length === 0 && extraItems.length === 0

  if (planLeer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <span className="text-5xl">📅</span>
        <p className="text-zinc-500 font-medium">Kein Wochenplan vorhanden</p>
        <p className="text-sm text-zinc-400">Fülle zuerst den Wochenplan mit Rezepten.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Fortschritts-Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              {gesamtFehlend === 0 ? 'Alles vorhanden!' : `${offen.length} von ${gesamtFehlend} noch zu kaufen`}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">{benoetigt.length} Zutaten im Wochenplan</p>
          </div>
          {erledigt.length > 0 && (
            <button
              onClick={alleZuruecksetzen}
              className="text-xs text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer font-medium"
            >
              Zurücksetzen
            </button>
          )}
        </div>
        {gesamtFehlend > 0 && (
          <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${fortschritt}%` }}
            />
          </div>
        )}
        {gesamtFehlend === 0 && benoetigt.length > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <span className="text-emerald-500">✓</span>
            <p className="text-sm text-emerald-700 font-medium">Alle {benoetigt.length} Zutaten sind vorhanden.</p>
          </div>
        )}
      </div>

      {/* Offene Einträge */}
      {offen.length > 0 && (
        <ul className="flex flex-col gap-2">
          {offen.map((z) => (
            <li key={z.name} className="flex items-center gap-2">
              <button
                onClick={() => toggleAbgehakt(z.name)}
                className="flex-1 flex items-center gap-3 bg-white border border-zinc-200 rounded-2xl px-4 py-3.5 hover:bg-zinc-50 active:scale-[0.99] transition-all cursor-pointer text-left shadow-sm group"
              >
                <span className="w-5 h-5 rounded-full border-2 border-zinc-300 group-hover:border-emerald-400 flex-shrink-0 transition-colors" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-zinc-800">{z.name}</span>
                  {z.mengen.length > 0 && (
                    <span className="text-xs text-zinc-400 ml-2">{z.mengen.join(' / ')}</span>
                  )}
                </div>
                {z.tage.length > 0 && (
                  <span className="text-[11px] text-zinc-300 shrink-0">{z.tage.map(t => t.slice(0,2)).join(', ')}</span>
                )}
              </button>
              {z.quelle === 'extra' && (
                <button
                  onClick={() => extraEntfernen(z.name)}
                  className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-rose-400 transition-colors rounded-xl cursor-pointer flex-shrink-0"
                  title="Entfernen"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Erledigte Einträge */}
      {erledigt.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
            Erledigt ({erledigt.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {erledigt.map((z) => (
              <li key={z.name} className="flex items-center gap-2">
                <button
                  onClick={() => toggleAbgehakt(z.name)}
                  className="flex-1 flex items-center gap-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 hover:bg-white transition-all cursor-pointer text-left opacity-60"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1.5 6 4.5 9 10.5 3"/>
                    </svg>
                  </span>
                  <span className="text-sm text-zinc-500 line-through">{z.name}</span>
                </button>
                {z.quelle === 'extra' && (
                  <button
                    onClick={() => extraEntfernen(z.name)}
                    className="w-8 h-8 flex items-center justify-center text-zinc-200 hover:text-rose-400 transition-colors rounded-xl cursor-pointer flex-shrink-0"
                    title="Entfernen"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bereits vorhandene Zutaten */}
      {benoetigt.length > fehlend.length && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2.5">
            Bereits vorhanden ({benoetigt.length - fehlend.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {benoetigt.filter((z) => istVorhanden(z.name, vorhandene)).map((z) => (
              <span key={z.name} className="text-xs font-medium bg-white text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full shadow-sm">
                {z.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Eigene Punkte hinzufügen */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-col gap-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Eigene Punkte</p>

        {/* Freitext-Eingabe */}
        <form
          onSubmit={(e) => { e.preventDefault(); extraHinzufuegen(eingabe) }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            placeholder="z.B. Orangensaft …"
            className="flex-1 text-sm bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 outline-none focus:border-zinc-400 focus:bg-white transition-all placeholder:text-zinc-300"
          />
          <button
            type="submit"
            disabled={!eingabe.trim()}
            className="px-4 py-2.5 bg-zinc-800 text-white text-sm font-medium rounded-xl hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            +
          </button>
        </form>

        {/* Vorschläge */}
        {Object.entries(VORSCHLAEGE).map(([kategorie, items]) => {
          const verfuegbar = items.filter((name) => !bereitsInListe.has(name))
          if (verfuegbar.length === 0) return null
          return (
            <div key={kategorie} className="flex flex-col gap-2">
              <p className="text-[11px] text-zinc-400 font-medium">{kategorie}</p>
              <div className="flex flex-wrap gap-1.5">
                {verfuegbar.map((name) => (
                  <button
                    key={name}
                    onClick={() => extraHinzufuegen(name)}
                    className="text-xs font-medium bg-zinc-50 text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-full hover:bg-zinc-800 hover:text-white hover:border-zinc-800 transition-all cursor-pointer"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
