// Parst eine Mengenangabe wie "500g", "1L", "0.5x", "6", "200 ml"
export function parseMenge(str) {
  if (!str && str !== 0) return null
  const s = String(str).trim().replace(',', '.')
  const m = s.match(/^([\d.]+)\s*(g|kg|ml|l|L|x|stück|st\.?|packung|pkg|dose|zehen|bund|tl|el|prise)?$/i)
  if (!m) return null

  let amount = parseFloat(m[1])
  if (isNaN(amount)) return null
  let unit = (m[2] || 'x').toLowerCase()

  if (unit === 'kg')                         { amount *= 1000; unit = 'g' }
  else if (unit === 'l')                     { amount *= 1000; unit = 'ml' }
  else if (['stück','st','st.'].includes(unit)) unit = 'x'
  else if (['packung','pkg','dose'].includes(unit)) unit = 'x'
  else if (['zehen','bund','tl','el','prise'].includes(unit)) unit = unit // Kocheinheiten, nur anzeigen

  return { amount, unit }
}

export function formatMenge(menge) {
  if (!menge) return ''
  const { amount, unit } = menge
  if (unit === 'g'  && amount >= 1000) return `${+(amount / 1000).toFixed(2)}kg`
  if (unit === 'ml' && amount >= 1000) return `${+(amount / 1000).toFixed(2)}L`
  if (unit === 'x') return `${amount}×`
  return `${amount}${unit}`
}

// Parst eine Zeile wie "Sahne 0.5x" oder "Nudeln 500g" → {name, menge}
export function parseZutatMitMenge(text) {
  const t = text.trim()
  const m = t.match(/^(.+?)\s+([\d.,]+\s*(?:g|kg|ml|l|L|x|stück|st\.?|packung|pkg|dose|zehen|bund|tl|el|prise)?)$/i)
  if (!m) return { name: t, menge: null }
  return { name: m[1].trim(), menge: parseMenge(m[2]) }
}

// Parst Freitext oder KI-JSON → [{name, menge}]
export function parseZutatenInput(input) {
  if (!input.trim()) return []

  // KI-JSON versuchen
  try {
    const p = JSON.parse(input)
    if (Array.isArray(p.zutaten)) {
      return p.zutaten.map(z => {
        if (typeof z === 'string') return parseZutatMitMenge(z)
        if (typeof z === 'object' && z.name) {
          const menge = z.menge != null
            ? (typeof z.menge === 'string' || typeof z.menge === 'number'
                ? parseMenge(String(z.menge))
                : z.menge)
            : null
          return { name: String(z.name).trim(), menge }
        }
        return null
      }).filter(Boolean)
    }
  } catch {}

  // Freitext: Komma, Semikolon oder Zeilenumbruch
  return input
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseZutatMitMenge)
}

// Extrahiert KI-Rückfragen aus JSON-Input (falls vorhanden)
export function extraheKiFragen(input) {
  try {
    const p = JSON.parse(input.trim())
    if (Array.isArray(p.fragen) && p.fragen.length > 0) return p.fragen
  } catch {}
  return []
}

// Vergleicht benötigte Menge mit vorhandener → null wenn nicht vergleichbar
// Gibt zurück: { ausreichend: bool, fehlend: Menge | null }
export function vergleicheMengen(benoetigt, vorhanden) {
  if (!benoetigt || !vorhanden) return null
  if (benoetigt.unit !== vorhanden.unit) return null
  // Kocheinheiten (zehen, tl, etc.) nur binär
  if (!['g','ml','x'].includes(benoetigt.unit)) return null

  if (vorhanden.amount >= benoetigt.amount) {
    return { ausreichend: true, fehlend: null }
  }
  return {
    ausreichend: false,
    fehlend: { amount: +(benoetigt.amount - vorhanden.amount).toFixed(2), unit: benoetigt.unit }
  }
}
