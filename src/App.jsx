import { useState, useRef } from 'react'
import TabBar from './components/TabBar'
import WelcomePage from './pages/WelcomePage'
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
  const [welcomed, setWelcomed]   = useState(() => !!localStorage.getItem('stocker_welcomed'))
  const [activeTab, setActiveTab] = useState('planen')

  // Swipe: track start position + direction lock (null | 'h' | 'v')
  const gesture = useRef(null)

  const Page = pages[activeTab]

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
    gesture.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: null }
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
    gesture.current = null
    if (Math.abs(dx) < 55) return
    const idx = TAB_ORDER.indexOf(activeTab)
    if (dx < 0 && idx < TAB_ORDER.length - 1) navigateTo(TAB_ORDER[idx + 1])
    else if (dx > 0 && idx > 0)               navigateTo(TAB_ORDER[idx - 1])
  }

  if (!welcomed) {
    return (
      <WelcomePage onStart={() => {
        localStorage.setItem('stocker_welcomed', '1')
        setWelcomed(true)
      }} />
    )
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
      {/* Background sketch illustrations — fork left, knife right */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        {/* Fork — sketched from bottom-left, angled inward */}
        <svg
          className="absolute"
          style={{ bottom: '80px', left: '-30px', opacity: 0.04, transform: 'rotate(25deg)' }}
          width="180" height="520" viewBox="0 0 60 180" fill="none"
        >
          {/* Tine left */}
          <line x1="20" y1="4" x2="20" y2="50" stroke="#1C1917" strokeWidth="2.2" strokeLinecap="round"/>
          {/* Tine center */}
          <line x1="30" y1="4" x2="30" y2="55" stroke="#1C1917" strokeWidth="2.2" strokeLinecap="round"/>
          {/* Tine right */}
          <line x1="40" y1="4" x2="40" y2="50" stroke="#1C1917" strokeWidth="2.2" strokeLinecap="round"/>
          {/* Tine bridge */}
          <path d="M20 50 Q30 62 40 50" stroke="#1C1917" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          {/* Handle */}
          <line x1="30" y1="55" x2="30" y2="176" stroke="#1C1917" strokeWidth="2.8" strokeLinecap="round"/>
          {/* Handle end — rounded bulge */}
          <ellipse cx="30" cy="176" rx="5" ry="3" stroke="#1C1917" strokeWidth="1.8" fill="none"/>
        </svg>

        {/* Knife — sketched from top-right, angled inward */}
        <svg
          className="absolute"
          style={{ top: '-20px', right: '-20px', opacity: 0.04, transform: 'rotate(-20deg)' }}
          width="140" height="480" viewBox="0 0 50 170" fill="none"
        >
          {/* Blade spine */}
          <line x1="25" y1="4" x2="25" y2="70" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Blade edge — curved */}
          <path d="M25 4 C25 4 38 20 38 50 L25 70" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" fill="none"/>
          {/* Bolster */}
          <rect x="20" y="68" width="10" height="8" rx="2" stroke="#1C1917" strokeWidth="1.8" fill="none"/>
          {/* Handle */}
          <line x1="25" y1="76" x2="25" y2="166" stroke="#1C1917" strokeWidth="3" strokeLinecap="round"/>
          {/* Handle rivets */}
          <circle cx="25" cy="90" r="2" stroke="#1C1917" strokeWidth="1.2" fill="none"/>
          <circle cx="25" cy="110" r="2" stroke="#1C1917" strokeWidth="1.2" fill="none"/>
          <circle cx="25" cy="130" r="2" stroke="#1C1917" strokeWidth="1.2" fill="none"/>
          {/* Handle end */}
          <ellipse cx="25" cy="166" rx="5" ry="3" stroke="#1C1917" strokeWidth="1.8" fill="none"/>
        </svg>
      </div>

      {/* Page content */}
      <main
        className="max-w-2xl mx-auto px-4 relative"
        style={{ paddingTop: '20px', paddingBottom: '96px' }}
      >
        <div key={activeTab} className="page-enter">
          <Page navigateTo={navigateTo} weiter={weiter} />
        </div>
      </main>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={navigateTo} />
    </div>
  )
}
