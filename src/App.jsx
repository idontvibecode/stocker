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
  const touchStart = useRef(null)

  const Page = pages[activeTab]

  function navigateTo(tab) {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function weiter() {
    const next = TAB_ORDER[TAB_ORDER.indexOf(activeTab) + 1]
    if (next) navigateTo(next)
  }

  function handleTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function handleTouchEnd(e) {
    if (!touchStart.current) return
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') { touchStart.current = null; return }

    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null

    // Only fire if clearly horizontal (1.5× wider than tall) and ≥ 60 px
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 60) {
      const idx = TAB_ORDER.indexOf(activeTab)
      if (dx < 0 && idx < TAB_ORDER.length - 1) navigateTo(TAB_ORDER[idx + 1])
      else if (dx > 0 && idx > 0)               navigateTo(TAB_ORDER[idx - 1])
    }
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
    <div className="min-h-screen" style={{ backgroundColor: '#F7F3EE' }}>

      {/* Top brand bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2.5"
        style={{ backgroundColor: '#1A2E23', height: '48px' }}
      >
        {/* Logo */}
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
          <line x1="13" y1="8"  x2="13" y2="18" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="10" y1="8"  x2="10" y2="14" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="16" y1="8"  x2="16" y2="14" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M10 14 Q13 18 16 14" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          <line x1="13" y1="18" x2="13" y2="40" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M35 8 C35 8 38 12 38 18 L35 20 L35 40" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <line x1="35" y1="20" x2="38" y2="18" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
        </svg>
        <span className="font-display text-xl" style={{ color: '#fff', letterSpacing: '0.01em' }}>
          Stocker
        </span>
      </header>

      {/* Page content – swipe area */}
      <main
        className="max-w-2xl mx-auto px-4"
        style={{ paddingTop: '68px', paddingBottom: '96px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
