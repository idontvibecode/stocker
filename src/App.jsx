import { useState } from 'react'
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

  const Page = pages[activeTab]

  function navigateTo(tab) {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function weiter() {
    const next = TAB_ORDER[TAB_ORDER.indexOf(activeTab) + 1]
    if (next) navigateTo(next)
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
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center"
        style={{ backgroundColor: '#1A2E23', height: '48px' }}
      >
        <span className="font-display text-xl" style={{ color: '#fff', letterSpacing: '0.01em' }}>
          Stocker
        </span>
      </header>

      {/* Page content */}
      <main
        className="max-w-2xl mx-auto px-4"
        style={{ paddingTop: '68px', paddingBottom: '96px' }}
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
