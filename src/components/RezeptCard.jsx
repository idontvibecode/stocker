const kategorieConfig = {
  vegetarisch:  { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  vegan:        { bg: 'bg-lime-50',     text: 'text-lime-700'    },
  fleischhaltig:{ bg: 'bg-rose-50',     text: 'text-rose-700'    },
  fischhaltig:  { bg: 'bg-sky-50',      text: 'text-sky-700'     },
}

const aufwandDots = {
  einfach:   { count: 1, color: 'bg-emerald-400' },
  mittel:    { count: 2, color: 'bg-amber-400'   },
  aufwändig: { count: 3, color: 'bg-rose-400'    },
}

const matchBorder = {
  hoch:    'border-emerald-200',
  mittel:  'border-amber-200',
  niedrig: 'border-zinc-100',
}

export default function RezeptCard({ rezept, match }) {
  const kat  = kategorieConfig[rezept.kategorie] ?? { bg: 'bg-zinc-100', text: 'text-zinc-600' }
  const auf  = aufwandDots[rezept.aufwand] ?? aufwandDots.mittel
  const border = matchBorder[match?.stufe] ?? matchBorder.niedrig
  const vorhandeneNamen = new Set((match?.vorhanden ?? []).map(z => z.name))

  return (
    <div className={`bg-white rounded-2xl border ${border} p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-zinc-900 text-sm leading-snug">{rezept.name}</h3>
        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${kat.bg} ${kat.text}`}>
          {rezept.kategorie}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {rezept.zeit} Min.
        </span>
        <span className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < auf.count ? auf.color : 'bg-zinc-200'}`} />
          ))}
        </span>
        {match && match.prozent > 0 && (
          <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            match.stufe === 'hoch'   ? 'bg-emerald-50 text-emerald-700' :
            match.stufe === 'mittel' ? 'bg-amber-50 text-amber-700' :
                                      'bg-zinc-100 text-zinc-500'
          }`}>
            {match.prozent}%
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-100" />

      {/* Zutaten */}
      <ul className="flex flex-wrap gap-x-2 gap-y-1.5">
        {rezept.zutaten.map(z => {
          const vorhanden = vorhandeneNamen.has(z.name)
          return (
            <li key={z.name} className={`flex items-center gap-1 text-xs ${vorhanden ? 'text-emerald-600 font-medium' : 'text-zinc-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${vorhanden ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
              {z.name}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
