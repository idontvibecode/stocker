export default function WelcomePage({ onStart }) {
  return (
    <div className="min-h-screen bg-[#f2f2f0] flex flex-col">

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">

        {/* Icon */}
        <div className="w-24 h-24 bg-amber-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Fork */}
            <line x1="13" y1="8" x2="13" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="10" y1="8" x2="10" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="16" y1="8" x2="16" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 14 Q13 18 16 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <line x1="13" y1="18" x2="13" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            {/* Knife */}
            <path d="M35 8 C35 8 38 12 38 18 L35 20 L35 40" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <line x1="35" y1="20" x2="38" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-black text-zinc-900 tracking-tight leading-none mb-12">
          STOCKER
        </h1>

        {/* Steps */}
        <div className="w-full max-w-sm flex flex-col gap-3 mb-12">
          {[
            { n: '1', icon: '🧊', title: 'Zutaten erfassen',    sub: 'Durch Fotos und Hilfe von KI' },
            { n: '2', icon: '📅', title: 'Woche planen',        sub: 'Mit euren Rezepten' },
            { n: '3', icon: '✅', title: 'Einkaufsliste',       sub: 'Wird automatisch erstellt' },
          ].map(({ n, icon, title, sub }) => (
            <div key={n} className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm border border-zinc-200">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                {icon}
              </div>
              <div className="text-left">
                <p className="font-black text-zinc-900 text-sm leading-tight">{title}</p>
                <p className="text-zinc-400 text-xs font-semibold mt-0.5">{sub}</p>
              </div>
              <div className="ml-auto w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-zinc-400 text-xs font-black">{n}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-12">
        <button
          onClick={onStart}
          className="w-full py-6 bg-amber-500 text-white rounded-3xl text-xl font-black tracking-wide active:bg-amber-600 active:scale-[0.98] transition-all cursor-pointer shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3"
        >
          LOS GEHT'S
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

    </div>
  )
}
