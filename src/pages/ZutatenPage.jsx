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

  // Deduplizieren nach Name, alphabetisch sortieren
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
    <div className="flex flex-col gap-5">


      {/* KI-Import */}
      <div className="bg-amber-600 rounded-3xl overflow-hidden shadow-xl shadow-amber-900/30">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">📷</div>
            <div>
              <p className="font-black text-white text-lg leading-tight">Mit KI importieren</p>
              <p className="text-amber-100 text-sm">Foto → KI → JSON → fertig</p>
            </div>
          </div>

          <button
            onClick={promptKopieren}
            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] cursor-pointer ${
              kopiert ? 'bg-white text-amber-700' : 'bg-zinc-950 text-white'
            }`}
          >
            {kopiert ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                PROMPT KOPIERT!
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                KI-PROMPT KOPIEREN
              </>
            )}
          </button>

          <button
            onClick={() => setAnleitung(v => !v)}
            className="w-full text-center text-amber-100 text-sm py-3 cursor-pointer font-semibold"
          >
            {anleitung ? '▲ Anleitung ausblenden' : '▼ Wie funktioniert das?'}
          </button>
        </div>

        {anleitung && (
          <div className="bg-amber-800 px-5 pb-5 space-y-3">
            {[
              ['1', '📷', 'Mach ein Foto von deinem Kühlschrank oder Vorratsschrank'],
              ['2', '🤖', 'Öffne eine KI (ChatGPT, Claude, Gemini …)'],
              ['3', '📋', 'Lade das Foto hoch und füge den kopierten Prompt ein'],
              ['4', '💾', 'Kopiere das JSON aus der Antwort der KI'],
              ['5', '➕', 'Tippe unten auf einen Bereich und füge das JSON ein'],
            ].map(([n, icon, text]) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                <p className="text-amber-100 text-sm"><span className="mr-1">{icon}</span>{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bereich-Buttons */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-black tracking-widest text-zinc-400 px-1">BEREICHE</p>

        {BEREICHE.map(({ id, icon, hint, placeholder }) => {
          const { zutaten, fragen, error } = parsed[id]
          const hasContent = inputs[id].trim().length > 0
          const isOpen     = offener === id
          const count      = zutaten.length

          return (
            <div key={id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-zinc-200">
              <button
                onClick={() => setOffener(isOpen ? null : id)}
                className="w-full flex items-center gap-4 px-5 py-5 active:bg-zinc-50 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  {icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-zinc-900 text-base">{id}</p>
                  <p className={`text-sm mt-0.5 ${hasContent && !error ? 'text-amber-600 font-semibold' : hasContent && error ? 'text-rose-500' : 'text-zinc-400'}`}>
                    {hasContent && !error ? `${count} Zutat${count !== 1 ? 'en' : ''} erkannt` : hasContent && error ? error : hint}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                  isOpen            ? 'bg-zinc-200 text-zinc-600' :
                  hasContent && !error ? 'bg-amber-100 text-amber-600' :
                                      'bg-zinc-950 text-white'
                }`}>
                  {hasContent && !error && !isOpen
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span className={`text-xl font-bold leading-none ${isOpen ? 'rotate-45 inline-block' : ''}`}>+</span>
                  }
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-zinc-100">
                  {/* Format-Hinweis */}
                  <p className="text-[11px] text-zinc-400 font-semibold mt-3 mb-1.5 px-1">
                    Format: Name Menge · z.B. <span className="text-zinc-500">Milch 1L · Eier 6x · Nudeln 500g · Olivenöl 0.5x</span>
                  </p>
                  <textarea
                    ref={el => (refs.current[id] = el)}
                    rows={4}
                    value={inputs[id]}
                    onChange={e => setInputs(prev => ({ ...prev, [id]: e.target.value }))}
                    placeholder={placeholder}
                    className={`w-full text-sm border-2 rounded-2xl px-4 py-3 resize-none focus:outline-none transition-colors ${
                      error && hasContent ? 'border-rose-300 bg-rose-50' : 'border-zinc-200 bg-zinc-50 focus:border-amber-400'
                    }`}
                  />

                  {/* KI-Rückfragen */}
                  {fragen.length > 0 && (
                    <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-1.5">
                      <p className="text-[11px] font-black text-amber-700 tracking-wide">KI HAT RÜCKFRAGEN:</p>
                      {fragen.map((f, i) => (
                        <p key={i} className="text-xs text-amber-800 font-medium">· {f}</p>
                      ))}
                    </div>
                  )}

                  {hasContent && !error && (
                    <>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {zutaten.slice(0, 8).map(z => (
                          <span key={z.name} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                            {z.name}{z.menge ? ` ${formatMenge(z.menge)}` : ''}
                          </span>
                        ))}
                        {zutaten.length > 8 && <span className="text-xs text-zinc-400">+{zutaten.length - 8} weitere</span>}
                      </div>
                      <button
                        onClick={() => setOffener(null)}
                        className="mt-3 w-full py-3.5 bg-zinc-950 text-white rounded-2xl font-black text-sm active:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        BESTÄTIGEN
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
        <div className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-xs font-black tracking-widest text-zinc-400 mb-3">ERKANNTE ZUTATEN — {alleZutaten.length}</p>
          <div className="flex flex-wrap gap-2">
            {alleZutaten.map(z => (
              <span key={z.name} className="bg-zinc-950 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                {z.name}{z.menge ? ` ${formatMenge(z.menge)}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={weiter}
          className="w-full py-5 bg-amber-500 text-white rounded-3xl text-lg font-black tracking-wide active:bg-amber-600 transition-all active:scale-[0.98] shadow-xl shadow-amber-500/30 cursor-pointer flex items-center justify-center gap-3"
        >
          WEITER ZU REZEPTEN
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button
          onClick={allesZuruecksetzen}
          className="w-full py-3.5 text-zinc-400 text-sm font-bold tracking-wide cursor-pointer active:text-rose-500 transition-colors"
        >
          NEU STARTEN
        </button>
      </div>
    </div>
  )
}
