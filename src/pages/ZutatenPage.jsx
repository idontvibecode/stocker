import { useState, useEffect, useRef } from 'react'
import { kopieren } from '../utils/clipboard'
import { parseZutatenInput, extraheKiFragen, formatMenge } from '../utils/zutaten'

const BEREICHE = [
  {
    id: 'Kühlschrank',
    icon: '🧊',
    hint: 'Frisches, Milchprodukte, Reste',
    placeholder: 'Milch 1L\nEier 6x\nButter 250g\nJoghurt 2x\nKäse 200g',
  },
  {
    id: 'Gefrierfach',
    icon: '❄️',
    hint: 'Tiefkühlkost, Fleisch, Gemüse',
    placeholder: 'Hähnchen 500g\nErbsen 400g\nPommes 1x\nFischstäbchen 0.5x',
  },
  {
    id: 'Vorratsschrank',
    icon: '🗄️',
    hint: 'Pasta, Dosen, Gewürze, Öle',
    placeholder: 'Nudeln 500g\nReis 1kg\nTomaten 2x\nOlivenöl 0.5x\nSalz 1x',
  },
  {
    id: 'Sonstiges',
    icon: '📦',
    hint: 'Obst, Brot, Anderes',
    placeholder: 'Äpfel 6x\nBrot 1x\nZwiebeln 1kg\nKnoblauch 1x',
  },
]
const STORAGE_KEY = 'stocker_zutaten_inputs'

const KI_PROMPT = `Analysiere das Foto und liste alle sichtbaren Lebensmittel mit Mengenangabe auf.

Antworte NUR mit folgendem JSON-Format – kein Text, keine Erklärung:
{"zutaten": [{"name": "Milch", "menge": "1L"}, {"name": "Eier", "menge": "6x"}], "fragen": []}

Mengenformat:
- Gewicht: 500g, 1kg, 250g
- Flüssigkeit: 200ml, 1L, 0.5L
- Stückzahl: 3x, 1x
- Halbvoll/angebrochen: 0.5x, 0.5L, 0.5kg

Falls du etwas nicht sicher erkennen kannst, füge eine Frage in "fragen" ein.
Beispiel: {"fragen": ["Was ist das gelbe Glas im hinteren Bereich?"]}

Nutze einfache deutsche Bezeichnungen (z.B. "Milch" statt "Vollmilch 3,5%").`

function parseZutaten(s) {
  return { zutaten: parseZutatenInput(s), fragen: extraheKiFragen(s), error: null }
}

function ladeInputs() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : Object.fromEntries(BEREICHE.map(b => [b.id, '']))
  } catch {
    return Object.fromEntries(BEREICHE.map(b => [b.id, '']))
  }
}

export default function ZutatenPage({ weiter }) {
  const [inputs, setInputs]        = useState(ladeInputs)
  const [offener, setOffener]      = useState(null)
  const [kopiert, setKopiert]      = useState(false)
  const [anleitung, setAnleitung]  = useState(false)
  const refs                       = useRef({})

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
  }, [inputs])

  useEffect(() => {
    if (offener) setTimeout(() => refs.current[offener]?.focus(), 120)
  }, [offener])

  async function promptKopieren() {
    await kopieren(KI_PROMPT)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2500)
  }

  function allesZuruecksetzen() {
    if (!window.confirm('Wirklich alles zurücksetzen?\n\nZutaten, Wochenplan und Einkaufsliste werden gelöscht.')) return
    localStorage.removeItem('stocker_zutaten_inputs')
    localStorage.removeItem('stocker_wochenplan')
    localStorage.removeItem('stocker_einkaufsliste_abgehakt')
    setInputs(Object.fromEntries(BEREICHE.map(b => [b.id, ''])))
    setOffener(null)
  }

  const parsed = Object.fromEntries(BEREICHE.map(b => [b.id, parseZutaten(inputs[b.id])]))

  const alleZutaten = (() => {
    const map = new Map()
    BEREICHE.forEach(b => {
      parsed[b.id].zutaten.forEach(z => {
        const key = z.name.toLowerCase()
        if (!map.has(key)) map.set(key, z)
      })
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  })()

  return (
    <div className="flex flex-col gap-4">

      {/* KI-Import */}
      <div className="bg-zinc-950 rounded-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-xl shrink-0">📷</div>
            <div>
              <p className="font-semibold text-white text-sm">Mit KI importieren</p>
              <p className="text-zinc-500 text-xs mt-0.5">Foto → KI → JSON einfügen</p>
            </div>
          </div>

          <button
            onClick={promptKopieren}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer ${
              kopiert
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500 text-white'
            }`}
          >
            {kopiert ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Prompt kopiert!
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                KI-Prompt kopieren
              </>
            )}
          </button>

          <button
            onClick={() => setAnleitung(v => !v)}
            className="w-full text-center text-zinc-500 text-xs py-2.5 cursor-pointer font-medium flex items-center justify-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {anleitung ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
            </svg>
            {anleitung ? 'Anleitung ausblenden' : 'Wie funktioniert das?'}
          </button>
        </div>

        {anleitung && (
          <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-2.5">
            {[
              ['📷', 'Mach ein Foto von deinem Kühlschrank'],
              ['🤖', 'Öffne ChatGPT, Claude oder Gemini'],
              ['📋', 'Foto hochladen + kopierten Prompt einfügen'],
              ['💾', 'JSON aus der Antwort kopieren'],
              ['➕', 'Unten auf Bereich tippen und JSON einfügen'],
            ].map(([icon, text], i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-base leading-tight">{icon}</span>
                <p className="text-zinc-400 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bereiche */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-zinc-400 px-1">Bereiche</p>

        {BEREICHE.map(({ id, icon, hint, placeholder }) => {
          const { zutaten, fragen, error } = parsed[id]
          const hasContent = inputs[id].trim().length > 0
          const isOpen     = offener === id
          const count      = zutaten.length

          return (
            <div key={id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setOffener(isOpen ? null : id)}
                className="w-full flex items-center gap-3 px-4 py-4 active:bg-zinc-50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                  {icon}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-zinc-900 text-sm">{id}</p>
                  <p className={`text-xs mt-0.5 truncate ${
                    hasContent && !error ? 'text-emerald-600' :
                    hasContent && error  ? 'text-rose-500' :
                                          'text-zinc-400'
                  }`}>
                    {hasContent && !error
                      ? `${count} Zutat${count !== 1 ? 'en' : ''} erkannt`
                      : hasContent && error ? error : hint}
                  </p>
                </div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                  isOpen                ? 'bg-zinc-100 text-zinc-500' :
                  hasContent && !error  ? 'bg-emerald-100 text-emerald-600' :
                                          'bg-zinc-950 text-white'
                }`}>
                  {hasContent && !error && !isOpen
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span className={`text-lg font-medium leading-none ${isOpen ? 'rotate-45 inline-block' : ''}`}>+</span>
                  }
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-zinc-100">
                  <p className="text-[11px] text-zinc-400 mt-3 mb-1.5 px-0.5">
                    Format: <span className="text-zinc-500">Milch 1L · Eier 6x · Nudeln 500g</span>
                  </p>
                  <textarea
                    ref={el => (refs.current[id] = el)}
                    rows={4}
                    value={inputs[id]}
                    onChange={e => setInputs(prev => ({ ...prev, [id]: e.target.value }))}
                    placeholder={placeholder}
                    className={`w-full text-sm border rounded-xl px-3 py-2.5 resize-none focus:outline-none transition-colors ${
                      error && hasContent
                        ? 'border-rose-200 bg-rose-50'
                        : 'border-zinc-200 bg-zinc-50 focus:border-amber-400 focus:bg-white'
                    }`}
                  />

                  {fragen.length > 0 && (
                    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
                      <p className="text-[11px] font-semibold text-amber-700">KI-Rückfragen:</p>
                      {fragen.map((f, i) => (
                        <p key={i} className="text-xs text-amber-700">· {f}</p>
                      ))}
                    </div>
                  )}

                  {hasContent && !error && (
                    <>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {zutaten.slice(0, 8).map(z => (
                          <span key={z.name} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
                            {z.name}{z.menge ? ` ${formatMenge(z.menge)}` : ''}
                          </span>
                        ))}
                        {zutaten.length > 8 && (
                          <span className="text-xs text-zinc-400 self-center">+{zutaten.length - 8} weitere</span>
                        )}
                      </div>
                      <button
                        onClick={() => setOffener(null)}
                        className="mt-3 w-full py-3 bg-zinc-950 text-white rounded-xl font-semibold text-sm active:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Bestätigen
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Zutaten-Summary */}
      {alleZutaten.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 mb-3">
            Erkannte Zutaten
            <span className="ml-1.5 bg-zinc-100 text-zinc-500 text-[11px] px-1.5 py-0.5 rounded-full">{alleZutaten.length}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {alleZutaten.map(z => (
              <span key={z.name} className="bg-zinc-950 text-white text-xs px-2.5 py-1 rounded-full">
                {z.name}{z.menge ? ` ${formatMenge(z.menge)}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={weiter}
          className="w-full py-4 bg-amber-500 text-white rounded-2xl text-sm font-semibold tracking-wide active:bg-amber-600 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          Weiter zu Rezepten
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button
          onClick={allesZuruecksetzen}
          className="w-full py-3 text-zinc-400 text-xs font-medium cursor-pointer active:text-rose-500 transition-colors"
        >
          Neu starten
        </button>
      </div>
    </div>
  )
}
