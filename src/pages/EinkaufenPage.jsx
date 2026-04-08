import { useState, useMemo } from 'react'
import { ladeVorhandeneZutaten, berechneFehlend } from '../utils/matching'
import { formatMenge } from '../utils/zutaten'
import { kopieren } from '../utils/clipboard'

const WOCHENPLAN_KEY = 'stocker_wochenplan'
const EXTRA_KEY      = 'stocker_einkaufen_extra'

// Extra-Items: [{ name: "Brot", menge: "1 Laib" }, ...]
const VORSCHLAEGE = {
  'Frühstück & Snacks': [
    'Brot', 'Butter', 'Aufschnitt (fleischig)', 'Aufschnitt (vegan)', 'Eier',
    'Griechischer Joghurt', 'Milch', 'Müsli', 'Bananen',
    'Gummibärchen', 'Cookies', 'Äpfel',
  ],
  'Haushalt': [
    'Klopapier', 'Cewa', 'Müllbeutel 25L', 'Taschentücher',
  ],
}

function ladeExtra() {
  try { return JSON.parse(localStorage.getItem(EXTRA_KEY) ?? '[]') } catch { return [] }
}
function speichereExtra(arr) {
  localStorage.setItem(EXTRA_KEY, JSON.stringify(arr))
}

const KOCHEINHEIT_LABEL = { el: 'EL', tl: 'TL', zehen: 'Zehen', bund: 'Bund', prise: 'Prise' }

function zeigeEinkaufsMenge(menge) {
  if (!menge) return null
  const m = menge.unit === 'x' ? { ...menge, amount: Math.ceil(menge.amount) } : menge
  if (m.unit === 'x' && m.amount === 1) return null
  // Kocheinheiten lesbar formatieren (z.B. "2 EL" statt "2el")
  if (KOCHEINHEIT_LABEL[m.unit]) return `${m.amount} ${KOCHEINHEIT_LABEL[m.unit]}`
  return formatMenge(m)
}

const SUPERMARKT_KATEGORIEN = [
  ['gemüse',    ['zucchini','karotte','zwiebel','knoblauch','paprika','tomate','spinat','salat','gurke','brokkoli','lauch','sellerie','kohl','blumenkohl','rosenkohl','mais','bohne','pilz','champignon','aubergine','porree','fenchel','rübe','rettich','rucola','petersilie','koriander','schnittlauch','ingwer']],
  ['obst',      ['apfel','birne','banane','orange','zitrone','limette','traube','erdbeere','himbeere','kirsche','mango','ananas','pfirsich','pflaume','melone','beere','kiwi','avocado']],
  ['brot',      ['brot','brötchen','toast','baguette','croissant','semmel','ciabatta','laugenbrezel','aufschnitt']],
  ['kühlung',   ['milch','sahne','butter','joghurt','käse','quark','frischkäse','ei','eier','schmand','mozzarella','parmesan','gouda','emmentaler','feta','creme','créme']],
  ['trockenwaren', ['nudeln','pasta','spaghetti','spätzle','reis','mehl','zucker','öl','olivenöl','essig','tomaten','konserve','dose','müsli','haferflocken','nutella','marmelade','honig','gewürz','pfeffer','paprikapulver','basilikum','oregano','thymian','lorbeer','kümmel','zimt','vanille','backpulver','hefe','brühe','soße','sauce']],
  ['fleisch',   ['hähnchen','hühnchen','rindfleisch','schweinefleisch','lamm','hackfleisch','wurst','schinken','speck','pute','thunfisch','lachs','fisch','garnele','salami','chorizo']],
  ['tiefkühlung',['tiefkühl','pommes','fischstäbchen']],
  ['snacks',    ['chips','keks','schokolade','riegel','nuss','cracker','popcorn','gummibär','gummibärchen','cookies','cookie']],
  ['haushalt',  ['klopapier','cewa','müllbeutel','taschentücher','spülmittel','waschmittel','schwamm','alufolie','frischhaltefolie']],
]

function supermarktIndex(name) {
  const n = name.toLowerCase()
  for (let i = 0; i < SUPERMARKT_KATEGORIEN.length; i++) {
    if (SUPERMARKT_KATEGORIEN[i][1].some(k => n.includes(k))) return i
  }
  return SUPERMARKT_KATEGORIEN.length
}

const WAHRSCHEINLICH_VORHANDEN = [
  'salz','pfeffer','zucker','mehl','öl','olivenöl','sonnenblumenöl','rapsöl','essig',
  'paprikapulver','basilikum','oregano','thymian','rosmarin','lorbeer','kümmel',
  'zimt','vanille','muskat','curry','kurkuma','chili','cayenne','kreuzkümmel',
  'backpulver','natron','speisestärke','brühe','worcester',
]

function istVormarkiert(name) {
  return WAHRSCHEINLICH_VORHANDEN.some(k => name.toLowerCase().includes(k))
}

function ladePlan() {
  try { return JSON.parse(localStorage.getItem(WOCHENPLAN_KEY) ?? '{}') } catch { return {} }
}

function generiereMarkdown(alleItems) {
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const sortiert = [...alleItems].sort((a, b) => supermarktIndex(a.name) - supermarktIndex(b.name))
  let md = `## Einkaufsliste ${datum}\n\n`
  sortiert.forEach(item => {
    const menge = item.mengeLabel || ''
    md += `- [ ] ${item.name}${menge ? ` (${menge})` : ''}\n`
  })
  return md
}

export default function EinkaufenPage({ navigateTo }) {
  const [geteilt, setGeteilt]           = useState(false)
  const [extraItems, setExtraItems]     = useState(ladeExtra)
  const [eingabe, setEingabe]           = useState('')
  const [eingabeMenge, setEingabeMenge] = useState('')
  const [editingItem, setEditingItem]   = useState(null) // { name, newName, newMenge }

  const vorhandene = useMemo(() => ladeVorhandeneZutaten(), [])
  const plan       = useMemo(() => ladePlan(), [])
  const fehlend    = useMemo(() => berechneFehlend(plan, vorhandene), [plan, vorhandene])

  const [entfernt, setEntfernt] = useState(() =>
    new Set(fehlend.filter(z => istVormarkiert(z.name)).map(z => z.name))
  )

  const planLeer = Object.values(plan).every(v => !v)

  // Zusammengeführte Liste: Rezept-Items + Extra-Items
  const alleListen = useMemo(() => {
    const rezeptItems = fehlend.map(z => ({
      name: z.name,
      mengeLabel: zeigeEinkaufsMenge(z.fehlendMenge),
      quelle: 'rezept',
    }))
    const extra = extraItems.map(item => ({
      name: item.name,
      mengeLabel: item.menge || null,
      quelle: 'extra',
    }))
    return [...rezeptItems, ...extra]
  }, [fehlend, extraItems])

  // Aktive Items (nicht durchgestrichen) — für Export/Zähler
  const aktiv = alleListen.filter(z => !entfernt.has(z.name))

  // Namen für Duplikat-Check bei Vorschlägen
  const alleNamen = useMemo(
    () => new Set(alleListen.map(z => z.name)),
    [alleListen]
  )

  function extraHinzufuegen(name, menge) {
    const bereinigt = name.trim()
    if (!bereinigt || alleNamen.has(bereinigt)) return
    const neu = [...extraItems, { name: bereinigt, menge: menge?.trim() || '' }]
    setExtraItems(neu)
    speichereExtra(neu)
    setEingabe('')
    setEingabeMenge('')
  }

  function extraBearbeiten(oldName, newName, newMenge) {
    const bereinigt = newName.trim()
    if (!bereinigt) return
    const neu = extraItems.map(item =>
      item.name === oldName ? { name: bereinigt, menge: newMenge?.trim() || '' } : item
    )
    setExtraItems(neu)
    speichereExtra(neu)
    setEditingItem(null)
  }

  function extraEntfernen(name) {
    setEntfernt(prev => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
    const neu = extraItems.filter(item => item.name !== name)
    setExtraItems(neu)
    speichereExtra(neu)
  }

  function toggleItem(name) {
    setEntfernt(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // Vorschlag-Klick: Name ins Eingabefeld setzen (statt sofort hinzufügen)
  function vorschlagWaehlen(name) {
    setEingabe(name)
    setEingabeMenge('')
  }

  async function teilen() {
    const text = generiereMarkdown(aktiv)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Einkaufsliste', text })
      } else {
        await kopieren(text)
      }
      setGeteilt(true)
      setTimeout(() => setGeteilt(false), 3000)
    } catch {
      await kopieren(text)
      setGeteilt(true)
      setTimeout(() => setGeteilt(false), 3000)
    }
  }

  const hatItems = alleListen.length > 0

  return (
    <div className="flex flex-col gap-4">

      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl" style={{ color: '#1C1917', letterSpacing: '-0.01em' }}>
          Küchenzettel
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#78716C' }}>
          {aktiv.length > 0
            ? `${aktiv.length} ${aktiv.length === 1 ? 'Sache' : 'Sachen'} auf der Liste`
            : planLeer
            ? 'Noch kein Wochenplan'
            : 'Alles vorhanden — Küche ist versorgt!'}
        </p>
      </div>

      {/* Dezenter Hinweis wenn kein Wochenplan */}
      {planLeer && (
        <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 card-shadow">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#F7F3EE' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#1C1917' }}>Kein Wochenplan</p>
            <p className="text-xs" style={{ color: '#A8A29E' }}>Eigene Punkte kannst du trotzdem hinzufügen.</p>
          </div>
          <button
            onClick={() => navigateTo('planen')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-all shrink-0"
            style={{ backgroundColor: '#D97706', color: '#fff' }}
          >
            Planen
          </button>
        </div>
      )}

      {/* Alles vorhanden (nur wenn Plan existiert, keine fehlenden Rezept-Zutaten, keine Extras) */}
      {!planLeer && fehlend.length === 0 && extraItems.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center card-shadow">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#f0fdf4' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="font-display text-lg mb-1" style={{ color: '#1C1917' }}>Alles vorhanden!</p>
          <p className="text-sm" style={{ color: '#78716C' }}>Die Küche ist bestens versorgt.</p>
        </div>
      )}

      {/* Hauptliste — Rezept-Zutaten + Extra-Items gemischt */}
      {hatItems && (
        <div className="bg-white rounded-2xl overflow-hidden card-shadow">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium" style={{ color: '#A8A29E' }}>Was du brauchst</p>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#F7F3EE', color: '#78716C' }}>
                {aktiv.length}
              </span>
            </div>
            {(() => {
              const vormarkierteNamen = fehlend.filter(z => istVormarkiert(z.name)).map(z => z.name)
              const alleAusgeblendet  = vormarkierteNamen.every(n => entfernt.has(n))
              return vormarkierteNamen.length > 0 && (
                <button
                  onClick={() => alleAusgeblendet
                    ? setEntfernt(new Set())
                    : setEntfernt(new Set(vormarkierteNamen))
                  }
                  className="text-xs font-medium cursor-pointer transition-colors"
                  style={{ color: '#D97706' }}
                >
                  {alleAusgeblendet ? 'Basics einblenden' : 'Basics ausblenden'}
                </button>
              )
            })()}
          </div>

          <div className="flex flex-col">
            {alleListen.map((item, i) => {
              const removed = entfernt.has(item.name)
              const isExtra = item.quelle === 'extra'
              return (
                <div key={item.name}>
                  {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: removed ? '#fafaf9' : '#F7F3EE' }} />}
                  <div className="flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{ backgroundColor: removed ? '#fafaf9' : 'transparent' }}>

                    {/* Edit-Modus für Extra-Items */}
                    {isExtra && editingItem?.name === item.name ? (
                      <>
                        <input
                          autoFocus
                          value={editingItem.newName}
                          onChange={e => setEditingItem({ ...editingItem, newName: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && extraBearbeiten(item.name, editingItem.newName, editingItem.newMenge)}
                          className="flex-1 text-sm rounded-lg px-2 py-1 outline-none"
                          style={{ backgroundColor: '#F7F3EE', border: '1.5px solid #D97706', color: '#1C1917' }}
                        />
                        <input
                          value={editingItem.newMenge}
                          onChange={e => setEditingItem({ ...editingItem, newMenge: e.target.value })}
                          placeholder="Menge"
                          className="w-16 text-sm rounded-lg px-2 py-1 outline-none text-center"
                          style={{ backgroundColor: '#F7F3EE', border: '1.5px solid #E7E5E4', color: '#1C1917' }}
                        />
                        <button
                          onClick={() => extraBearbeiten(item.name, editingItem.newName, editingItem.newMenge)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ backgroundColor: '#D97706', color: '#fff' }}
                          title="Speichern"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ backgroundColor: '#F7F3EE', color: '#A8A29E' }}
                          title="Abbrechen"
                        >
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm capitalize transition-all relative"
                          style={{
                            color: removed ? '#D4CFC8' : '#1C1917',
                            fontWeight: removed ? 400 : 500,
                          }}>
                          {item.name}
                          {removed && (
                            <span
                              className="strikethrough-line absolute left-0 top-1/2 w-full"
                              style={{ height: '1.5px', backgroundColor: '#D4CFC8' }}
                            />
                          )}
                        </span>
                        {!removed && item.mengeLabel && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: '#fffbeb', color: '#92400e' }}>
                            {item.mengeLabel}
                          </span>
                        )}
                        {removed && !isExtra && (
                          <span className="text-[10px] shrink-0" style={{ color: '#D4CFC8' }}>nicht kaufen</span>
                        )}

                        {/* Rezept-Items: Toggle durchstreichen/wiederherstellen */}
                        {!isExtra && (
                          <button
                            onClick={() => toggleItem(item.name)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer"
                            style={{ backgroundColor: '#F7F3EE', color: '#A8A29E' }}
                          >
                            {removed
                              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            }
                          </button>
                        )}

                        {/* Extra-Items: Edit + Delete */}
                        {isExtra && (
                          <>
                            <button
                              onClick={() => setEditingItem({ name: item.name, newName: item.name, newMenge: item.mengeLabel || '' })}
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer"
                              style={{ backgroundColor: '#F7F3EE', color: '#A8A29E' }}
                              title="Bearbeiten"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => extraEntfernen(item.name)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer"
                              style={{ backgroundColor: '#F7F3EE', color: '#A8A29E' }}
                              title="Entfernen"
                            >
                              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                              </svg>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Share-Button */}
      {aktiv.length > 0 && (
        <>
          <button
            onClick={teilen}
            className="w-full py-4 rounded-2xl font-medium text-base tracking-wide active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center gap-2.5"
            style={geteilt
              ? { backgroundColor: '#1A2E23', color: '#6ee7b7' }
              : { backgroundColor: '#1A2E23', color: '#fff' }
            }
          >
            {geteilt ? (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Kopiert!
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Per Signal an Simon
              </>
            )}
          </button>
        </>
      )}

      {/* Eigene Punkte hinzufügen — immer sichtbar */}
      <div className="bg-white rounded-2xl card-shadow p-4 flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A8A29E' }}>Eigene Punkte hinzufügen</p>

        <form onSubmit={e => { e.preventDefault(); extraHinzufuegen(eingabe, eingabeMenge) }} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={eingabe}
              onChange={e => setEingabe(e.target.value)}
              placeholder="Produkt, z.B. Orangensaft"
              className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none transition-all"
              style={{ backgroundColor: '#F7F3EE', border: '1.5px solid #E7E5E4', color: '#1C1917' }}
            />
            <input
              type="text"
              value={eingabeMenge}
              onChange={e => setEingabeMenge(e.target.value)}
              placeholder="Menge"
              className="w-20 text-sm rounded-xl px-3 py-2.5 outline-none transition-all text-center"
              style={{ backgroundColor: '#F7F3EE', border: '1.5px solid #E7E5E4', color: '#1C1917' }}
            />
            <button
              type="submit"
              disabled={!eingabe.trim()}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1C1917', color: '#fff' }}
            >
              +
            </button>
          </div>
        </form>

        {/* Vorschläge — Klick füllt das Eingabefeld, damit man Menge ergänzen kann */}
        {Object.entries(VORSCHLAEGE).map(([kategorie, items]) => {
          const verfuegbar = items.filter(name => !alleNamen.has(name))
          if (verfuegbar.length === 0) return null
          return (
            <div key={kategorie} className="flex flex-col gap-2">
              <p className="text-[11px] font-medium" style={{ color: '#A8A29E' }}>{kategorie}</p>
              <div className="flex flex-wrap gap-1.5">
                {verfuegbar.map(name => (
                  <button
                    key={name}
                    onClick={() => vorschlagWaehlen(name)}
                    className="text-xs font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer"
                    style={eingabe === name
                      ? { backgroundColor: '#1C1917', color: '#fff', borderColor: '#1C1917' }
                      : { backgroundColor: '#F7F3EE', color: '#78716C', borderColor: '#E7E5E4' }
                    }
                  >
                    {name}
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
