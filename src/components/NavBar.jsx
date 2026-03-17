function IconZutaten({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
    </svg>
  )
}

function IconPlanen({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="14" x2="8.01" y2="14" strokeWidth="2"/>
      <line x1="12" y1="14" x2="12.01" y2="14" strokeWidth="2"/>
      <line x1="16" y1="14" x2="16.01" y2="14" strokeWidth="2"/>
    </svg>
  )
}

function IconEinkauf({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

const tabs = [
  { id: 'zutaten',   label: 'Zutaten', Icon: IconZutaten },
  { id: 'planen',    label: 'Planen',  Icon: IconPlanen },
  { id: 'einkaufen', label: 'Einkauf', Icon: IconEinkauf },
]

export default function NavBar({ activeTab, onTabChange }) {
  return (
    <>
      {/* Desktop */}
      <nav className="hidden sm:block bg-zinc-950">
        <div className="max-w-2xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
              <svg width="15" height="15" viewBox="0 0 48 48" fill="none">
                <line x1="13" y1="8" x2="13" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="10" y1="8" x2="10" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="16" y1="8" x2="16" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M10 14 Q13 18 16 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <line x1="13" y1="18" x2="13" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M35 8 C35 8 38 12 38 18 L35 20 L35 40" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">Stocker</span>
          </div>
          <div className="flex gap-0.5">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon active={activeTab === id} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Top */}
      <nav className="sm:hidden bg-zinc-950">
        <div className="px-4 flex items-center h-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 48 48" fill="none">
                <line x1="13" y1="8" x2="13" y2="18" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="10" y1="8" x2="10" y2="14" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="16" y1="8" x2="16" y2="14" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M10 14 Q13 18 16 14" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <line x1="13" y1="18" x2="13" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M35 8 C35 8 38 12 38 18 L35 20 L35 40" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Stocker</span>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800/80">
        <div className="flex pb-safe">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 cursor-pointer transition-colors ${
                activeTab === id ? 'text-white' : 'text-zinc-600'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeTab === id ? 'bg-zinc-800' : ''}`}>
                <Icon active={activeTab === id} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${activeTab === id ? 'text-amber-400' : 'text-zinc-600'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
