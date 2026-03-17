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
    <div className="flex items-center px-4 h-10 gap-2" style={{ backgroundColor: '#1A2E23' }}>
      {/* Zurück */}
      <button
        onClick={() => hasPrev && onTabChange(STEPS[activeIdx - 1].id)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          hasPrev ? 'cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      {/* Steps */}
      <div className="flex items-center flex-1 justify-center">
        {STEPS.map((step, i) => {
          const done    = i < activeIdx
          const current = i === activeIdx
          return (
            <div key={step.id} className="flex items-center">
              <button onClick={() => onTabChange(step.id)} className="flex items-center gap-1.5 px-2.5 py-1 cursor-pointer rounded-md">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold transition-all shrink-0`}
                  style={{
                    backgroundColor: done ? '#D97706' : current ? '#fff' : 'rgba(255,255,255,0.15)',
                    color: done ? '#fff' : current ? '#1A2E23' : 'rgba(255,255,255,0.4)',
                  }}>
                  {done
                    ? <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
                    : i + 1}
                </div>
                <span className="text-[11px] font-medium"
                  style={{ color: current ? '#fff' : done ? '#D97706' : 'rgba(255,255,255,0.35)' }}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-5 h-px mx-1" style={{ backgroundColor: i < activeIdx ? '#D97706' : 'rgba(255,255,255,0.15)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Weiter */}
      <button
        onClick={() => hasNext && onTabChange(STEPS[activeIdx + 1].id)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          hasNext ? 'cursor-pointer' : 'opacity-0 pointer-events-none'
        }`}
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}
