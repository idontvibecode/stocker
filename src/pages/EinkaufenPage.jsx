import { useState, useMemo } from 'react'
import { ladeVorhandeneZutaten, berechneFehlend } from '../utils/matching'
import { formatMenge } from '../utils/zutaten'
import { kopieren } from '../utils/clipboard'

const WOCHENPLAN_KEY = 'stocker_wochenplan'

function zeigeEinkaufsMenge(menge) {
  if (!menge) return null
  if (!['g', 'ml', 'x'].includes(menge.unit)) return null
  const m = menge.unit === 'x' ? { ...menge, amount: Math.ceil(menge.amount) } : menge
  if (m.unit === 'x' && m.amount === 1) return null
  return formatMenge(m)
}

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
  const [geteilt, setGeteilt] = useState(false)

  const vorhandene = useMemo(() => ladeVorhandeneZutaten(), [])
  const plan       = useMemo(() => ladePlan(), [])
  const fehlend    = useMemo(() => berechneFehlend(plan, vorhandene), [plan, vorhandene])

  const [entfernt, setEntfernt] = useState(() =>
    new Set(fehlend.filter(z => istVormarkiert(z.name)).map(z => z.name))
  )

  const liste    = fehlend.filter(z => !entfernt.has(z.name))
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
    <div className="flex flex-col gap-4">

      {planLeer ? (
        <div className="bg-white rounded-2xl p-8 text-center card-shadow">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#F7F3EE' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p className="font-medium text-base mb-1" style={{ color: '#1C1917' }}>Kein Wochenplan</p>
          <p className="text-sm mb-5" style={{ color: '#78716C' }}>Zuerst Schritt 2 ausfüllen.</p>
          <button
            onClick={() => navigateTo('planen')}
            className="w-full py-3 rounded-xl font-medium text-sm cursor-pointer transition-all"
            style={{ backgroundColor: '#D97706', color: '#fff' }}
          >
            Zum Wochenplan
          </button>
        </div>

      ) : fehlend.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center card-shadow">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#f0fdf4' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="font-medium text-base mb-1" style={{ color: '#1C1917' }}>Alles vorhanden!</p>
          <p className="text-sm" style={{ color: '#78716C' }}>Du hast alle Zutaten für diese Woche.</p>
        </div>

      ) : (
        <>
          {/* Liste */}
          <div className="bg-white rounded-2xl overflow-hidden card-shadow">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium" style={{ color: '#A8A29E' }}>Einkaufsliste</p>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: '#F7F3EE', color: '#78716C' }}>
                  {liste.length}
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
              {fehlend.map((z, i) => {
                const removed    = entfernt.has(z.name)
                const mengeLabel = zeigeEinkaufsMenge(z.fehlendMenge)
                return (
                  <div key={z.name}>
                    {i > 0 && <div className="h-px mx-4" style={{ backgroundColor: removed ? '#fafaf9' : '#F7F3EE' }} />}
                    <div className="flex items-center gap-3 px-4 py-3 transition-colors"
                      style={{ backgroundColor: removed ? '#fafaf9' : 'transparent' }}>
                      <span className="flex-1 text-sm capitalize transition-all"
                        style={{
                          textDecoration: removed ? 'line-through' : 'none',
                          color: removed ? '#D4CFC8' : '#1C1917',
                          fontWeight: removed ? 400 : 500,
                        }}>
                        {z.name}
                      </span>
                      {!removed && mengeLabel && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: '#fffbeb', color: '#92400e' }}>
                          {mengeLabel}
                        </span>
                      )}
                      {removed && (
                        <span className="text-[10px] shrink-0" style={{ color: '#D4CFC8' }}>nicht kaufen</span>
                      )}
                      <button
                        onClick={() => toggleItem(z.name)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer"
                        style={removed
                          ? { backgroundColor: '#F7F3EE', color: '#A8A29E' }
                          : { backgroundColor: '#F7F3EE', color: '#A8A29E' }
                        }
                      >
                        {removed
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Share */}
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
          <p className="text-center text-xs -mt-2" style={{ color: '#A8A29E' }}>{liste.length} Zutaten</p>
        </>
      )}
    </div>
  )
}
