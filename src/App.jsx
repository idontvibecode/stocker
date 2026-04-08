import { useState, useRef } from 'react'
import TabBar from './components/TabBar'
import ZutatenPage from './pages/ZutatenPage'
import PlanenPage from './pages/PlanenPage'
import EinkaufenPage from './pages/EinkaufenPage'

const TAB_ORDER = ['zutaten', 'planen', 'einkaufen']

const pages = {
  zutaten:   ZutatenPage,
  planen:    PlanenPage,
  einkaufen: EinkaufenPage,
}

export default function App() {
  const [activeTab, setActiveTab] = useState('planen')

  // Swipe: track start position + direction lock (null | 'h' | 'v')
  const gesture = useRef(null)

  function navigateTo(tab) {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function weiter() {
    const next = TAB_ORDER[TAB_ORDER.indexOf(activeTab) + 1]
    if (next) navigateTo(next)
  }

  function onTouchStart(e) {
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    gesture.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: null, t: Date.now() }
  }

  function onTouchMove(e) {
    if (!gesture.current || gesture.current.dir) return
    const dx = Math.abs(e.touches[0].clientX - gesture.current.x)
    const dy = Math.abs(e.touches[0].clientY - gesture.current.y)
    // Lock direction once we've moved ≥ 8 px
    if (dx + dy < 8) return
    gesture.current.dir = dx > dy ? 'h' : 'v'
  }

  function onTouchEnd(e) {
    if (!gesture.current || gesture.current.dir !== 'h') { gesture.current = null; return }
    const dx = e.changedTouches[0].clientX - gesture.current.x
    const dt = Date.now() - gesture.current.t
    gesture.current = null
    if (Math.abs(dx) < 100 || Math.abs(dx) / dt < 0.3) return
    const idx = TAB_ORDER.indexOf(activeTab)
    if (dx < 0 && idx < TAB_ORDER.length - 1) navigateTo(TAB_ORDER[idx + 1])
    else if (dx > 0 && idx > 0)               navigateTo(TAB_ORDER[idx - 1])
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F7F3EE' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { gesture.current = null }}
    >
      {/* Background sketch — original logo fork & knife, blown up large */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        {/* Fork (logo shape) — from bottom-left, angled inward */}
        <svg
          className="absolute"
          style={{ bottom: '60px', left: '-24px', opacity: 0.045, transform: 'rotate(22deg)' }}
          width="160" height="500" viewBox="0 0 48 48" fill="none"
          preserveAspectRatio="none"
        >
          <line x1="13" y1="8" x2="13" y2="18" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="10" y1="8" x2="10" y2="14" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="16" y1="8" x2="16" y2="14" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M10 14 Q13 18 16 14" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <line x1="13" y1="18" x2="13" y2="40" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>

        {/* Knife (logo shape) — from top-right, angled inward */}
        <svg
          className="absolute"
          style={{ top: '-40px', right: '-16px', opacity: 0.045, transform: 'rotate(-18deg)' }}
          width="130" height="460" viewBox="0 0 48 48" fill="none"
          preserveAspectRatio="none"
        >
          <path d="M35 8 C35 8 38 12 38 18 L35 20 L35 40" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <line x1="35" y1="20" x2="38" y2="18" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Page content — alle 3 Pages gleichzeitig gemountet, inaktive per display:none versteckt */}
      <main
        className="max-w-2xl mx-auto px-4 relative"
        style={{ paddingTop: '20px', paddingBottom: '96px' }}
      >
        {TAB_ORDER.map(tab => {
          const P = pages[tab]
          return (
            <div key={tab} className={tab === activeTab ? 'page-enter' : ''} style={{ display: tab === activeTab ? '' : 'none' }}>
              <P navigateTo={navigateTo} weiter={weiter} />
            </div>
          )
        })}
      </main>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={navigateTo} />
    </div>
  )
}
