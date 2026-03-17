const kategorieConfig = {
  vegetarisch:   { bg: '#f0fdf4', text: '#15803d' },
  vegan:         { bg: '#f7fee7', text: '#4d7c0f' },
  fleischhaltig: { bg: '#fff1f2', text: '#be123c' },
  fischhaltig:   { bg: '#f0f9ff', text: '#0369a1' },
}

const aufwandDots = {
  einfach:   { count: 1, color: '#22c55e' },
  mittel:    { count: 2, color: '#D97706' },
  aufwändig: { count: 3, color: '#ef4444' },
}

export default function RezeptCard({ rezept, match }) {
  const kat  = kategorieConfig[rezept.kategorie] ?? { bg: '#F7F3EE', text: '#78716C' }
  const auf  = aufwandDots[rezept.aufwand] ?? aufwandDots.mittel
  const vorhandeneNamen = new Set((match?.vorhanden ?? []).map(z => z.name))

  const borderColor = match?.stufe === 'hoch'   ? '#bbf7d0' :
                      match?.stufe === 'mittel'  ? '#fde68a' : '#E8E2D9'

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ border: `1px solid ${borderColor}` }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm leading-snug" style={{ color: '#1C1917' }}>{rezept.name}</h3>
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: kat.bg, color: kat.text }}>
          {rezept.kategorie}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs" style={{ color: '#A8A29E' }}>
        <span className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {rezept.zeit} Min.
        </span>
        <span className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: i < auf.count ? auf.color : '#E8E2D9'
            }} />
          ))}
        </span>
        {match && match.prozent > 0 && (
          <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{
            backgroundColor: match.stufe === 'hoch' ? '#f0fdf4' : match.stufe === 'mittel' ? '#fffbeb' : '#F7F3EE',
            color:           match.stufe === 'hoch' ? '#15803d' : match.stufe === 'mittel' ? '#92400e' : '#78716C',
          }}>
            {match.prozent}%
          </span>
        )}
      </div>

      <div className="h-px" style={{ backgroundColor: '#F7F3EE' }} />

      {/* Zutaten */}
      <ul className="flex flex-wrap gap-x-2 gap-y-1.5">
        {rezept.zutaten.map(z => {
          const vorhanden = vorhandeneNamen.has(z.name)
          return (
            <li key={z.name} className="flex items-center gap-1 text-xs" style={{
              color: vorhanden ? '#15803d' : '#A8A29E',
              fontWeight: vorhanden ? 500 : 400,
            }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                backgroundColor: vorhanden ? '#22c55e' : '#E8E2D9'
              }} />
              {z.name}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
