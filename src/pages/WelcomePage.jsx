export default function WelcomePage({ onStart }) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col">

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">

        {/* Icon */}
        <div className="w-20 h-20 bg-zinc-950 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="13" y1="8" x2="13" y2="18" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="10" y1="8" x2="10" y2="14" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="16" y1="8" x2="16" y2="14" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 14 Q13 18 16 14" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <line x1="13" y1="18" x2="13" y2="40" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M35 8 C35 8 38 12 38 18 L35 20 L35 40" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <line x1="35" y1="20" x2="38" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-2">
          Stocker
        </h1>
        <p className="text-zinc-400 text-base font-normal mb-10">
          Mahlzeiten planen. Einkauf erledigt.
        </p>

        {/* Steps */}
        <div className="w-full max-w-sm flex flex-col gap-2 mb-10">
          {[
            { n: 1, icon: '🧊', title: 'Zutaten erfassen',  sub: 'Kühlschrank & Vorrat eintragen' },
            { n: 2, icon: '📅', title: 'Woche planen',      sub: 'Rezepte für jeden Tag wählen' },
            { n: 3, icon: '✅', title: 'Einkaufsliste',     sub: 'Wird automatisch erstellt' },
          ].map(({ n, icon, title, sub }) => (
            <div key={n} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm">
              <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center text-lg shrink-0">
                {icon}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-zinc-900 text-sm">{title}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{sub}</p>
              </div>
              <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                <span className="text-zinc-400 text-[10px] font-semibold">{n}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-12">
        <button
          onClick={onStart}
          className="w-full py-4 bg-zinc-950 text-white rounded-2xl text-base font-semibold tracking-wide active:bg-zinc-800 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          Jetzt starten
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <p className="text-center text-zinc-400 text-xs mt-3">Komplett lokal · Keine Anmeldung</p>
      </div>

    </div>
  )
}
