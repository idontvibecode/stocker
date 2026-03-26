export default function WelcomePage({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3EE' }}>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 card-shadow-md"
          style={{ backgroundColor: '#1A2E23' }}>
          <svg width="38" height="38" viewBox="0 0 48 48" fill="none">
            <line x1="13" y1="8" x2="13" y2="18" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="10" y1="8" x2="10" y2="14" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="16" y1="8" x2="16" y2="14" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 14 Q13 18 16 14" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <line x1="13" y1="18" x2="13" y2="40" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M35 8 C35 8 38 12 38 18 L35 20 L35 40" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <line x1="35" y1="20" x2="38" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl mb-3" style={{ color: '#1C1917' }}>
          Stocker
        </h1>
        <p className="text-base mb-10" style={{ color: '#78716C' }}>
          Mahlzeiten planen. Einkauf erledigt.
        </p>

        {/* Features */}
        <div className="w-full max-w-sm flex flex-col gap-2 mb-10">
          {[
            { icon: '🧊', title: 'Zutaten erfassen',  sub: 'Kühlschrank & Vorrat eintragen' },
            { icon: '📅', title: 'Woche planen',      sub: 'Rezepte für jeden Tag wählen'   },
            { icon: '✅', title: 'Einkaufsliste',     sub: 'Wird automatisch erstellt'       },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 card-shadow">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: '#F7F3EE' }}>
                {icon}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm" style={{ color: '#1C1917' }}>{title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#78716C' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-12">
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl text-base font-medium tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          style={{ backgroundColor: '#1A2E23', color: '#fff' }}
        >
          Jetzt starten
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <p className="text-center text-xs mt-3" style={{ color: '#A8A29E' }}>
          Komplett lokal · Keine Anmeldung
        </p>
      </div>

    </div>
  )
}
