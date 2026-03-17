import { useState } from 'react'
import StepProgress from './components/StepProgress'
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
  const [activeTab, setActiveTab] = useState('zutaten')
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
    <div className="min-h-screen bg-[#f5f4f0]">
      <StepProgress activeTab={activeTab} onTabChange={navigateTo} />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        <div key={activeTab} className="page-enter">
          <Page navigateTo={navigateTo} weiter={weiter} />
        </div>
      </main>
    </div>
  )
}
