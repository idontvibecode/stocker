import { useState, useEffect, useRef } from 'react'
import { kopieren } from '../utils/clipboard'
import { parseZutatenInput, formatMenge, parseMenge } from '../utils/zutaten'

const BEREICHE = [
  { id: 'Kühlschrank',   icon: '🧊', hint: 'Frisches, Milchprodukte, Reste',    placeholder: 'Milch 1L\nEier 6x\nButter 250g\nJoghurt 2x\nKäse 200g' },
  { id: 'Gefrierfach',   icon: '❄️', hint: 'Tiefkühlkost, Fleisch, Gemüse',     placeholder: 'Hähnchen 500g\nErbsen 400g\nPommes 1x' },
  { id: 'Vorratsschrank',icon: '🗄️', hint: 'Pasta, Dosen, Gewürze, Öle',        placeholder: 'Nudeln 500g\nReis 1kg\nTomaten 2x\nOlivenöl 0.5x' },
  { id: 'Sonstiges',     icon: '📦', hint: 'Obst, Brot, Anderes',               placeholder: 'Äpfel 6x\nBrot 1x\nZwiebeln 1kg' },
]
const STORAGE_KEY = 'stocker_zutaten_inputs'
const EDITS_KEY   = 'stocker_zutaten_edits'

const KI_PROMPT = `Analysiere das Foto und liste alle sichtbaren Lebensmittel mit Mengenangabe auf.

WICHTIG: Falls du etwas nicht sicher erkennst, stelle zuerst deine Fragen auf Deutsch – kein JSON, nur Klartext. Warte auf meine Antworten, bevor du das JSON lieferst.

Sobald du alles weißt (oder wenn alles klar ist), antworte ausschließlich mit rohem JSON – kein Markdown, keine Codeblöcke, kein Text davor oder danach:
{"zutaten": [{"name": "Milch", "menge": "1L"}, {"name": "Eier", "menge": "6x"}]}

Mengenformat:
- Gewicht: 500g, 1kg, 250g
- Flüssigkeit: 200ml, 1L, 0.5L
- Stückzahl: 3x, 1x
- Halbvoll/angebrochen: 0.5x, 0.5L, 0.5kg

Nutze einfache deutsche Bezeichnungen (z.B. "Milch" statt "Vollmilch 3,5%").`

function mengeZuStr(menge) {
  if (!menge) return ''
  const { amount, unit } = menge
  if (unit === 'g'  && amount >= 1000) return `${+(amount / 1000).toFixed(2).replace(/\.?0+$/, '')}kg`
  if (unit === 'ml' && amount >= 1000) return `${+(amount / 1000).toFixed(2).replace(/\.?0+$/, '')}L`
  if (unit === 'x') return `${amount}x`
  return `${amount}${unit}`
}

function ladeInputs() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : Object.fromEntries(BEREICHE.map(b => [b.id, '']))
  } catch {
    return Object.fromEntries(BEREICHE.map(b => [b.id, '']))
  }
}

function ladeEdits() {
  try {
    const s = localStorage.getItem(EDITS_KEY)
    if (!s) return { deleted: [], overrides: {}, extra: [] }
    const e = JSON.parse(s)
    return {
      deleted:   Array.isArray(e.deleted)                       ? e.deleted   : [],
      overrides: e.overrides && typeof e.overrides === 'object' ? e.overrides : {},
      extra:     Array.isArray(e.extra)                         ? e.extra     : [],
    }
  } catch {
    return { deleted: [], overrides: {}, extra: [] }
  }
}

export default function ZutatenPage({ weiter }) {
  const [inputs, setInputs]   = useState(ladeInputs)
  const [edits, setEdits]     = useState(ladeEdits)
  const [offener, setOffener] = useState(null)
  const [kopiert, setKopiert] = useState(false)
  const [anleitung, setAnleitung] = useState(false)
  const [editChip, setEditChip]   = useState(null) // {key: string|null, name: string, mengeStr: string}
  const refs = useRef({})

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs)) }, [inputs])
  useEffect(() => { localStorage.setItem(EDITS_KEY,   JSON.stringify(edits))  }, [edits])

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
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(EDITS_KEY)
    localStorage.removeItem('stocker_wochenplan')
    localStorage.removeItem('stocker_einkaufsliste_abgehakt')
    setInputs(Object.fromEntries(BEREICHE.map(b => [b.id, ''])))
    setEdits({ deleted: [], overrides: {}, extra: [] })
    setOffener(null)
    setEditChip(null)
  }

  // ── Chip-Edits ───────────────────────────────────────────────────────────────

  function chipSpeichern() {
    if (!editChip) return
    const name = editChip.name.trim()
    if (!name) { setEditChip(null); return }
    const menge = editChip.mengeStr.trim() ? parseMenge(editChip.mengeStr.trim()) : null

    if (editChip.key === null) {
      setEdits(prev => ({ ...prev, extra: [...prev.extra.filter(e => e.name.toLowerCase() !== name.toLowerCase()), { name, menge }] }))
    } else {
      setEdits(prev => ({ ...prev, overrides: { ...prev.overrides, [editChip.key]: { name, menge } } }))
    }
    setEditChip(null)
  }

  function chipLoeschen(key) {
    setEdits(prev => ({
      ...prev,
      deleted: prev.deleted.includes(key) ? prev.deleted : [...prev.deleted, key],
      overrides: Object.fromEntries(Object.entries(prev.overrides).filter(([k]) => k !== key)),
    }))
    setEditChip(null)
  }

  function extraLoeschen(name) {
    setEdits(prev => ({ ...prev, extra: prev.extra.filter(e => e.name.toLowerCase() !== name.toLowerCase()) }))
    setEditChip(null)
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const parsed = Object.fromEntries(BEREICHE.map(b => [b.id, parseZutatenInput(inputs[b.id])]))

  const alleZutaten = (() => {
    const map = new Map()
    BEREICHE.forEach(b => {
      parsed[b.id].forEach(z => {
        const key = z.name.toLowerCase()
        if (edits.deleted.includes(key)) return
        if (!map.has(key)) map.set(key, edits.overrides[key] ?? z)
      })
    })
    edits.extra.forEach(z => {
      const key = z.name.toLowerCase()
      if (!map.has(key)) map.set(key, z)
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  })()

  function chipLabel(z) {
    const m = z.menge ? formatMenge(z.menge) : null
    return m ? `${m} ${z.name}` : z.name
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl" style={{ color: '#1C1917', letterSpacing: '-0.01em' }}>
          Zutaten
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#78716C' }}>
          {alleZutaten.length > 0
            ? `${alleZutaten.length} Zutaten erfasst`
            : 'Kühlschrank & Vorrat eintragen'}
        </p>
      </div>

      {/* KI-Import */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1A2E23' }}>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              📷
            </div>
            <div>
              <p className="font-medium text-white text-sm">Mit KI importieren</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Foto → KI → JSON einfügen</p>
            </div>
          </div>

          <button
            onClick={promptKopieren}
            className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer"
            style={kopiert
              ? { backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }
              : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }
            }
          >
            {kopiert ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Prompt kopiert!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                KI-Prompt kopieren
              </>
            )}
          </button>

          <button
            onClick={() => setAnleitung(v => !v)}
            className="w-full text-center text-xs py-2.5 cursor-pointer font-medium flex items-center justify-center gap-1.5"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {anleitung ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
            </svg>
            {anleitung ? 'Anleitung ausblenden' : 'Wie funktioniert das?'}
          </button>
        </div>

        {anleitung && (
          <div className="px-4 pb-4 pt-2 space-y-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              ['📷', 'Mach ein Foto von deinem Kühlschrank'],
              ['🤖', 'Öffne ChatGPT, Claude oder Gemini'],
              ['📋', 'Foto hochladen + kopierten Prompt einfügen'],
              ['❓', 'Bei Rückfragen der KI direkt dort antworten'],
              ['💾', 'JSON aus der finalen Antwort kopieren'],
              ['➕', 'Unten auf Bereich tippen und JSON einfügen'],
            ].map(([icon, text], i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-base">{icon}</span>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bereiche */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium px-1" style={{ color: '#A8A29E' }}>Bereiche</p>

        {BEREICHE.map(({ id, icon, hint, placeholder }) => {
          const zutaten  = parsed[id]
          const hasContent = inputs[id].trim().length > 0
          const isOpen     = offener === id
          const count      = zutaten.length

          return (
            <div key={id} className="bg-white rounded-2xl overflow-hidden card-shadow">
              <button
                onClick={() => setOffener(isOpen ? null : id)}
                className="w-full flex items-center gap-3 px-4 py-4 transition-colors cursor-pointer active:bg-stone-50"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: '#F7F3EE' }}>
                  {icon}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm" style={{ color: '#1C1917' }}>{id}</p>
                  <p className="text-xs mt-0.5 truncate" style={{
                    color: hasContent ? '#16a34a' : '#78716C'
                  }}>
                    {hasContent ? `${count} Zutat${count !== 1 ? 'en' : ''} erkannt` : hint}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0" style={{
                  backgroundColor: isOpen ? '#F7F3EE' : hasContent ? '#dcfce7' : '#1A2E23',
                  color: isOpen ? '#78716C' : hasContent ? '#16a34a' : '#fff',
                }}>
                  {hasContent && !isOpen
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span className={`text-lg font-light leading-none ${isOpen ? 'rotate-45 inline-block' : ''}`}>+</span>
                  }
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid #F7F3EE' }}>
                  <p className="text-[11px] mt-3 mb-1.5 px-0.5" style={{ color: '#A8A29E' }}>
                    Format: <span style={{ color: '#78716C' }}>Milch 1L · Eier 6x · Nudeln 500g</span>
                  </p>
                  <textarea
                    ref={el => (refs.current[id] = el)}
                    rows={4}
                    value={inputs[id]}
                    onChange={e => setInputs(prev => ({ ...prev, [id]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full text-sm rounded-xl px-3 py-2.5 resize-none focus:outline-none transition-colors"
                    style={{ border: '1px solid #E8E2D9', backgroundColor: '#F7F3EE', color: '#1C1917' }}
                  />

                  {hasContent && (
                    <>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {zutaten.slice(0, 8).map(z => (
                          <span key={z.name} className="text-xs px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: '#F7F3EE', color: '#78716C' }}>
                            {chipLabel(z)}
                          </span>
                        ))}
                        {zutaten.length > 8 && (
                          <span className="text-xs self-center" style={{ color: '#A8A29E' }}>+{zutaten.length - 8} weitere</span>
                        )}
                      </div>
                      <button
                        onClick={() => setOffener(null)}
                        className="mt-3 w-full py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                        style={{ backgroundColor: '#1A2E23', color: '#fff' }}
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

      {/* Zutaten-Summary mit Edit */}
      {alleZutaten.length > 0 && (
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium" style={{ color: '#A8A29E' }}>Erkannte Zutaten</p>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#F7F3EE', color: '#78716C' }}>
                {alleZutaten.length}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: '#C4BCBA' }}>Tippen zum Bearbeiten</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {alleZutaten.map(z => {
              const key = z.name.toLowerCase()
              const isEditing = editChip?.key === key
              return (
                <button
                  key={key}
                  onClick={() => setEditChip(isEditing ? null : { key, name: z.name, mengeStr: mengeZuStr(z.menge) })}
                  className="text-xs px-2.5 py-1 rounded-full transition-all active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: '#1A2E23',
                    color: '#fff',
                    outline: isEditing ? '2px solid #D97706' : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  {chipLabel(z)}
                </button>
              )
            })}

            <button
              onClick={() => setEditChip(editChip?.key === null ? null : { key: null, name: '', mengeStr: '' })}
              className="text-xs px-2.5 py-1 rounded-full transition-all active:scale-95 cursor-pointer font-medium"
              style={{
                backgroundColor: editChip?.key === null ? '#D97706' : 'transparent',
                color: editChip?.key === null ? '#fff' : '#A8A29E',
                border: '1.5px dashed #C4BCBA',
              }}
            >
              + Hinzufügen
            </button>
          </div>

          {/* Inline-Edit Panel */}
          {editChip && (
            <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#F7F3EE', border: '1px solid #E8E2D9' }}>
              <p className="text-[11px] mb-2 font-medium" style={{ color: '#78716C' }}>
                {editChip.key === null ? 'Neue Zutat' : 'Zutat bearbeiten'}
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus={editChip.key !== null}
                  type="text"
                  value={editChip.mengeStr}
                  onChange={e => setEditChip(prev => ({ ...prev, mengeStr: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') chipSpeichern(); if (e.key === 'Escape') setEditChip(null) }}
                  placeholder="Menge"
                  className="w-20 text-sm px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid #E8E2D9', backgroundColor: '#fff', color: '#1C1917' }}
                />
                <input
                  autoFocus={editChip.key === null}
                  type="text"
                  value={editChip.name}
                  onChange={e => setEditChip(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') chipSpeichern(); if (e.key === 'Escape') setEditChip(null) }}
                  placeholder="Name (z.B. Milch)"
                  className="flex-1 text-sm px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid #E8E2D9', backgroundColor: '#fff', color: '#1C1917' }}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={chipSpeichern}
                  className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: '#1A2E23', color: '#fff' }}
                >
                  Speichern
                </button>
                {editChip.key !== null && (
                  <button
                    onClick={() => {
                      const isExtra = edits.extra.some(e => e.name.toLowerCase() === editChip.key)
                      if (isExtra) extraLoeschen(editChip.name)
                      else chipLoeschen(editChip.key)
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
                    style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                  >
                    Löschen
                  </button>
                )}
                <button
                  onClick={() => setEditChip(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: '#E8E2D9', color: '#78716C' }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={weiter}
          className="w-full py-3.5 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          style={{ backgroundColor: '#1A2E23', color: '#fff' }}
        >
          Zum Wochenplan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button
          onClick={allesZuruecksetzen}
          className="w-full py-2.5 text-xs cursor-pointer transition-colors"
          style={{ color: '#C4BCBA' }}
        >
          Neu starten
        </button>
      </div>
    </div>
  )
}
