const kategorieConfig = {
  vegetarisch: { bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-400' },
  vegan:       { bg: 'bg-lime-50',     text: 'text-lime-700',     dot: 'bg-lime-400' },
  fleischhaltig:{ bg: 'bg-rose-50',   text: 'text-rose-700',     dot: 'bg-rose-400' },
  fischhaltig: { bg: 'bg-sky-50',     text: 'text-sky-700',      dot: 'bg-sky-400' },
}

const aufwandConfig = {
  einfach:   { color: 'text-emerald-600', dots: [true,  false, false] },
  mittel:    { color: 'text-amber-500',   dots: [true,  true,  false] },
  aufwändig: { color: 'text-rose-500',    dots: [true,  true,  true]  },
}

const matchConfig = {
  hoch:    { border: 'border-emerald-300', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  mittel:  { border: 'border-amber-300',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  niedrig: { border: 'border-zinc-200',    badge: '' },
}

export default function RezeptCard({ rezept, match }) {
  const kat = kategorieConfig[rezept.kategorie] ?? { bg: 'bg-zinc-50', text: 'text-zinc-600', dot: 'bg-zinc-400' }
  const auf = aufwandConfig[rezept.aufwand] ?? aufwandConfig.mittel
  const mc  = matchConfig[match?.stufe] ?? matchConfig.niedrig
  const hatMatch = match && match.prozent > 0
  const vorhandeneNamen = new Set((match?.vorhanden ?? []).map((z) => z.name))

  return (
    <div className={`bg-white rounded-2xl border-2 ${mc.border} p-4 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-zinc-900 text-[15px] leading-snug">{rezept.name}</h3>
        <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${kat.bg} ${kat.text}`}>
          {rezept.kategorie}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {rezept.zeit} Min.
        </span>
        <span className={`flex items-center gap-1 font-medium ${auf.color}`}>
          {auf.dots.map((on, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${on ? auf.color.replace('text-','bg-') : 'bg-zinc-200'}`} />
          ))}
          {rezept.aufwand}
        </span>
        {hatMatch && (
          <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${mc.badge}`}>
            {match.prozent}%
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-100" />

      {/* Zutaten */}
      <ul className="flex flex-wrap gap-x-2 gap-y-1.5">
        {rezept.zutaten.map((z) => {
          const vorhanden = vorhandeneNamen.has(z.name)
          return (
            <li key={z.name} className={`flex items-center gap-1 text-xs ${vorhanden ? 'text-emerald-700 font-medium' : 'text-zinc-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${vorhanden ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
              {z.name}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
