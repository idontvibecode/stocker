import { useState, useMemo } from 'react'
import { ladeVorhandeneZutaten, berechneFehlend } from '../utils/matching'
import { formatMenge } from '../utils/zutaten'
import { kopieren } from '../utils/clipboard'

const WOCHENPLAN_KEY = 'stocker_wochenplan'

// Nur sinnvolle Einkaufsmengen zeigen — Kocheinheiten und "1x" weglassen
function zeigeEinkaufsMenge(menge) {
  if (!menge) return null
  if (!['g', 'ml', 'x'].includes(menge.unit)) return null
  // Stückzahlen immer aufrunden — halbe Paprika gibt es nicht
  const m = menge.unit === 'x' ? { ...menge, amount: Math.ceil(menge.amount) } : menge
  if (m.unit === 'x' && m.amount === 1) return null
  return formatMenge(m)
}

// Supermarkt-Reihenfolge: Keywords → Kategorie-Index
const SUPERMARKT_KATEGORIEN = [
  ['gemüse',    ['zucchini','karotte','zwiebel','knoblauch','paprika','tomate','spinat','salat','gurke','brokkoli','lauch','sellerie','kohl','blumenkohl','rosenkohl','mais','bohne','pilz','champignon','aubergine','porree','fenchel','rübe','rettich','rucola','petersilie','koriander','schnittlauch','ingwer']],
  ['obst',      ['apfel','birne','banane','orange','zitrone','limette','traube','erdbeere','himbeere','kirsche','mango','ananas','pfirsich','pflaume','melone','beere','kiwi','avocado']],
  ['brot',      ['brot','brötchen','toast','baguette','croissant','semmel','ciabatta','laugenbrezel']],
  ['kühlung',   ['milch','sahne','butter','joghurt','käse','quark','frischkäse','ei','eier','schmand','mozzarella','parmesan','gouda','emmentaler','feta','creme','créme']],
  ['trockenwaren', ['nudeln','pasta','spaghetti','spätzle','reis','mehl','zucker','öl','olivenöl','essig','tomaten','konserve','dose','müsli','haferflocken','nutella','marmelade','honig','gewürz','pfeffer','paprikapulver','basilikum','oregano','thymian','lorbeer','kümmel','zimt','vanille','backpulver','hefe','brühe','soße','sauce']],
  ['fleisch',   ['hähnchen','hühnchen','rindfleisch','schweinefleisch','lamm','hackfleisch','wurst','schinken','speck','pute','thunfisch','lachs','fisch','garnele','salami','chorizo']],
  ['tiefkühlung',['tiefkühl','pommes','fischstäbchen']],
  ['snacks',    ['chips','keks','schokolade','riegel','nuss','cracker','popcorn','gummibär']],
]

function supermarktIndex(name) {
  const n = name.toLowerCase()
  for (let i = 0; i < SUPERMARKT_KATEGORIEN.length; i++) {
    if (SUPERMARKT_KATEGORIEN[i][1].some(k => n.includes(k))) return i
  }
  return SUPERMARKT_KATEGORIEN.length // unbekannt ans Ende
}

// Zutaten die meistens im Haushalt vorhanden sind → vormarkiert
const WAHRSCHEINLICH_VORHANDEN = [
  'salz','pfeffer','zucker','mehl','öl','olivenöl','sonnenblumenöl','rapsöl','essig',
  'paprikapulver','basilikum','oregano','thymian','rosmarin','lorbeer','kümmel',
  'zimt','vanille','muskat','curry','kurkuma','chili','cayenne','kreuzkümmel',
  'backpulver','natron','speisestärke','brühe','worcester',
]

function istVormarkiert(name) {
  const n = name.toLowerCase()
  return WAHRSCHEINLICH_VORHANDEN.some(k => n.includes(k))
}

function ladePlan() {
  try { return JSON.parse(localStorage.getItem(WOCHENPLAN_KEY) ?? '{}') } catch { return {} }
}

function generiereMarkdown(liste) {
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const sortiert = [...liste].sort((a, b) => supermarktIndex(a.name) - supermarktIndex(b.name))
  let md = `## Einkaufsliste ${datum}\n\n`
  sortiert.forEach(z => {
    const menge = zeigeEinkaufsMenge(z.fehlendMenge)
    md += `- [ ] ${z.name}${menge ? ` (${menge})` : ''}\n`
  })
  return md
}

export default function EinkaufenPage({ navigateTo }) {
  const [geteilt,  setGeteilt]  = useState(false)

  const vorhandene = useMemo(() => ladeVorhandeneZutaten(), [])
  const plan       = useMemo(() => ladePlan(), [])
  const fehlend    = useMemo(() => berechneFehlend(plan, vorhandene), [plan, vorhandene])

  const [entfernt, setEntfernt] = useState(() =>
    new Set(fehlend.filter(z => istVormarkiert(z.name)).map(z => z.name))
  )

  const liste = fehlend.filter(z => !entfernt.has(z.name))

  const planLeer = Object.values(plan).every(v => !v)

  function toggleItem(name) {
    setEntfernt(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function teilen() {
    const text = generiereMarkdown(liste)
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

  return (
    <div className="flex flex-col gap-5">

      {planLeer ? (
        <div className="bg-white rounded-3xl border-2 border-zinc-200 p-8 text-center">
          <p className="text-5xl mb-4">📅</p>
          <p className="font-black text-zinc-900 text-xl mb-1">Kein Wochenplan</p>
          <p className="text-zinc-400 text-sm mb-6">Zuerst Schritt 2 ausfüllen.</p>
          <button
            onClick={() => navigateTo('planen')}
            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-base cursor-pointer active:bg-amber-600 transition-all"
          >
            ZUM WOCHENPLAN
          </button>
        </div>

      ) : fehlend.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center shadow-sm">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-black text-zinc-900 text-lg">Alles vorhanden!</p>
          <p className="text-zinc-400 text-sm mt-1">Du hast alle Zutaten für diese Woche.</p>
        </div>

      ) : (
        <>
          {/* Interaktive Liste */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="text-xs font-black tracking-widest text-zinc-400">
                EINKAUFSLISTE — {liste.length}
              </p>
              {(() => {
                const vormarkierteNamen = fehlend.filter(z => istVormarkiert(z.name)).map(z => z.name)
                const alleAusgeblendet  = vormarkierteNamen.every(n => entfernt.has(n))
                return vormarkierteNamen.length > 0 && (
                  <button
                    onClick={() => alleAusgeblendet
                      ? setEntfernt(new Set())
                      : setEntfernt(new Set(vormarkierteNamen))
                    }
                    className="text-xs font-bold text-amber-600 cursor-pointer active:text-amber-800"
                  >
                    {alleAusgeblendet ? 'ALLE EINBLENDEN' : 'BASICS AUSBLENDEN'}
                  </button>
                )
              })()}
            </div>

            <div className="flex flex-col">
              {fehlend.map((z, i) => {
                const removed    = entfernt.has(z.name)
                const mengeLabel = zeigeEinkaufsMenge(z.fehlendMenge)
                return (
                  <div key={z.name}>
                    {i > 0 && <div className={`h-px mx-5 ${removed ? 'bg-zinc-50' : 'bg-zinc-100'}`} />}
                    <div className={`flex items-center gap-3 px-5 py-3.5 transition-all ${removed ? 'bg-zinc-50' : ''}`}>
                      <span className={`flex-1 text-sm font-semibold capitalize transition-all ${removed ? 'line-through text-zinc-300' : 'text-zinc-900'}`}>
                        {z.name}
                      </span>
                      {!removed && mengeLabel && (
                        <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                          {mengeLabel}
                        </span>
                      )}
                      {removed && (
                        <span className="text-[10px] font-black text-zinc-300 shrink-0 tracking-wide">
                          NICHT KAUFEN
                        </span>
                      )}
                      <button
                        onClick={() => toggleItem(z.name)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          removed
                            ? 'bg-zinc-200 text-zinc-400 active:bg-amber-100 active:text-amber-600'
                            : 'bg-zinc-100 text-zinc-400 active:bg-rose-100 active:text-rose-500'
                        }`}
                      >
                        {removed
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={teilen}
            className={`w-full py-6 rounded-3xl font-black text-xl tracking-wide active:scale-[0.97] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 shadow-xl ${
              geteilt
                ? 'bg-zinc-800 text-amber-400 shadow-zinc-900/40'
                : 'bg-amber-500 text-white shadow-amber-500/30'
            }`}
          >
            {geteilt ? (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                KOPIERT!
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                PER SIGNAL AN SIMON
              </>
            )}
            <span className={`text-sm font-semibold ${geteilt ? 'text-zinc-500' : 'text-amber-100'}`}>
              {liste.length} Zutaten
            </span>
          </button>
        </>
      )}
    </div>
  )
}
