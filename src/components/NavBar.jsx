function IconZutaten({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active && <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" opacity="0.12"/>}
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
    </svg>
  )
}

function IconPlanen({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active && <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" opacity="0.12"/>}
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="14" x2="8.01" y2="14" strokeWidth="2.5"/>
      <line x1="12" y1="14" x2="12.01" y2="14" strokeWidth="2.5"/>
      <line x1="16" y1="14" x2="16.01" y2="14" strokeWidth="2.5"/>
    </svg>
  )
}

function IconEinkauf({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active && <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="currentColor" opacity="0.12"/>}
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
      <nav className="hidden sm:block bg-zinc-950 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-sm">🍳</div>
            <span className="text-white font-black text-lg tracking-tight">Stocker</span>
          </div>
          <div className="flex gap-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === id
                    ? 'bg-amber-500 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
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
        <div className="px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-xs">🍳</div>
            <span className="text-white font-black text-base tracking-tight">Stocker</span>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom — terminal style: dark with bright active */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800">
        <div className="flex pb-safe">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 cursor-pointer transition-all ${
                activeTab === id ? 'text-amber-400' : 'text-zinc-500'
              }`}
            >
              <Icon active={activeTab === id} />
              <span className={`text-[11px] font-bold tracking-wide ${activeTab === id ? 'text-amber-400' : 'text-zinc-500'}`}>
                {label.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
