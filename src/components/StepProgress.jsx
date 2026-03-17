const STEPS = [
  { id: 'zutaten',   label: 'Zutaten' },
  { id: 'planen',    label: 'Planen'  },
  { id: 'einkaufen', label: 'Einkauf' },
]

export default function StepProgress({ activeTab, onTabChange }) {
  const activeIdx = STEPS.findIndex(s => s.id === activeTab)
  const hasPrev   = activeIdx > 0
  const hasNext   = activeIdx < STEPS.length - 1

  return (
    <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 gap-3">
      {/* Zurück */}
      <button
        onClick={() => hasPrev && onTabChange(STEPS[activeIdx - 1].id)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
          hasPrev ? 'bg-zinc-800 text-white cursor-pointer active:bg-zinc-700' : 'opacity-0 pointer-events-none'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      {/* Schritt-Indikatoren */}
      <div className="flex items-center flex-1 justify-center">
        {STEPS.map((step, i) => {
          const done    = i < activeIdx
          const current = i === activeIdx
          return (
            <div key={step.id} className="flex items-center">
              <button onClick={() => onTabChange(step.id)} className="flex flex-col items-center gap-1 cursor-pointer">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  done    ? 'bg-amber-500 text-white' :
                  current ? 'bg-amber-400 text-zinc-900 ring-4 ring-amber-400/20' :
                            'bg-zinc-700 text-zinc-500'
                }`}>
                  {done
                    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
                    : i + 1}
                </div>
                <span className={`text-[10px] font-black tracking-wider ${
                  current ? 'text-amber-400' : done ? 'text-amber-600' : 'text-zinc-600'
                }`}>
                  {step.label.toUpperCase()}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-10 h-px mx-2 mb-4 ${i < activeIdx ? 'bg-amber-600' : 'bg-zinc-700'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Weiter */}
      <button
        onClick={() => hasNext && onTabChange(STEPS[activeIdx + 1].id)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
          hasNext ? 'bg-zinc-800 text-white cursor-pointer active:bg-zinc-700' : 'opacity-0 pointer-events-none'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}
