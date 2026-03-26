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
      {/* Page content */}
      <main
        className="max-w-2xl mx-auto px-4 relative"
        style={{ paddingTop: '20px', paddingBottom: '96px' }}
      >
        {/* Brand stamp — like a wax seal pressed into paper */}
        <div className="flex justify-end mb-1 pointer-events-none select-none">
          <div
            className="relative flex items-center justify-center"
            style={{ width: '42px', height: '42px' }}
          >
            {/* Outer ring — dotted, like an old restaurant stamp */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: '1.5px dashed rgba(26,46,35,0.25)',
              }}
            />
            {/* Inner seal */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: '#1A2E23',
                boxShadow: '0 1px 4px rgba(26,46,35,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                {/* Fork — amber */}
                <line x1="15" y1="10" x2="15" y2="20" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
                <line x1="12" y1="10" x2="12" y2="16" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
                <line x1="18" y1="10" x2="18" y2="16" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
                <path d="M12 16 Q15 20 18 16" stroke="#D97706" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <line x1="15" y1="20" x2="15" y2="38" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
                {/* Knife — cream white */}
                <path d="M33 10 C33 10 36 14 36 20 L33 22 L33 38" stroke="#F7F3EE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <line x1="33" y1="22" x2="36" y2="20" stroke="#F7F3EE" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
        <div key={activeTab} className="page-enter">
          <Page navigateTo={navigateTo} weiter={weiter} />
        </div>
      </main>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={navigateTo} />
    </div>
  )
}
