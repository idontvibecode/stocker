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
    <div className="flex items-center bg-zinc-950 px-4 h-11 gap-2">
      {/* Zurück */}
      <button
        onClick={() => hasPrev && onTabChange(STEPS[activeIdx - 1].id)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          hasPrev ? 'text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      {/* Steps */}
      <div className="flex items-center flex-1 justify-center gap-0">
        {STEPS.map((step, i) => {
          const done    = i < activeIdx
          const current = i === activeIdx
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => onTabChange(step.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md cursor-pointer group"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all flex-shrink-0 ${
                  done    ? 'bg-amber-500 text-white' :
                  current ? 'bg-white text-zinc-900' :
                            'bg-zinc-700 text-zinc-500'
                }`}>
                  {done
                    ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
                    : i + 1}
                </div>
                <span className={`text-[11px] font-medium transition-colors ${
                  current ? 'text-white' : done ? 'text-amber-500' : 'text-zinc-600'
                }`}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px ${i < activeIdx ? 'bg-amber-500' : 'bg-zinc-700'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Weiter */}
      <button
        onClick={() => hasNext && onTabChange(STEPS[activeIdx + 1].id)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          hasNext ? 'text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}
