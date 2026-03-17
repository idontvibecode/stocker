import { parseZutatenInput, parseMenge, vergleicheMengen } from './zutaten'

const STORAGE_KEY = 'stocker_zutaten_inputs'

export function ladeVorhandeneZutaten() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const inputs = JSON.parse(saved)
    const alle = Object.values(inputs).flatMap(text => parseZutatenInput(text))
    // Gleiche Zutat aus mehreren Bereichen zusammenführen (Mengen addieren)
    const map = new Map()
    alle.forEach(z => {
      if (!z) return
      const key = z.name.toLowerCase().trim()
      if (!key) return
      if (!map.has(key)) {
        map.set(key, { name: key, menge: z.menge ? { ...z.menge } : null })
      } else if (z.menge) {
        const existing = map.get(key)
        if (!existing.menge) {
          existing.menge = { ...z.menge }
        } else if (existing.menge.unit === z.menge.unit) {
          existing.menge = { amount: +(existing.menge.amount + z.menge.amount).toFixed(2), unit: existing.menge.unit }
        }
      }
    })
    return [...map.values()]
  } catch {
    return []
  }
}

// Findet passende vorhandene Zutat per Teilstring-Match
function findeVorhandene(zutatName, vorhandene) {
  const name = zutatName.toLowerCase()
  return vorhandene.find(v => name.includes(v.name) || v.name.includes(name)) ?? null
}

// Prüft ob eine Zutat vorhanden ist (nur Name)
export function istVorhanden(zutatName, vorhandene) {
  return findeVorhandene(zutatName, vorhandene) !== null
}

export function berechneMatch(rezept, vorhandene) {
  if (vorhandene.length === 0) return { prozent: 0, vorhanden: [], fehlend: rezept.zutaten }

  const vorhanden = []
  const fehlend = []

  rezept.zutaten.forEach(z => {
    const match = findeVorhandene(z.name, vorhandene)
    if (!match) {
      fehlend.push(z)
      return
    }
    const benMenge = typeof z.menge === 'string' ? parseMenge(z.menge) : z.menge
    const vergleich = vergleicheMengen(benMenge, match.menge)
    // null = nicht vergleichbar (z.B. unterschiedliche Einheiten) → als vorhanden werten
    if (vergleich === null || vergleich.ausreichend) {
      vorhanden.push(z)
    } else {
      fehlend.push({ ...z, fehlendMenge: vergleich.fehlend })
    }
  })

  const prozent = Math.round((vorhanden.length / rezept.zutaten.length) * 100)
  return { prozent, vorhanden, fehlend }
}

export function matchStufe(prozent) {
  if (prozent >= 80) return 'hoch'
  if (prozent >= 50) return 'mittel'
  return 'niedrig'
}

function skaliereMenge(m, faktor) {
  if (!m || faktor === 1) return m
  return { amount: +(m.amount * faktor).toFixed(2), unit: m.unit }
}

function skalierungsFaktor(rezept) {
  if (rezept.personen && rezept.portionen && rezept.portionen > 0) {
    return rezept.personen / rezept.portionen
  }
  return 1
}

// Berechnet verbleibenden Vorrat nach Abzug des Plans (optional: einen Tag ausschließen)
export function berechneVorratNachPlan(plan, vorhandene, ausnahmeTag = null) {
  const verbrauch = new Map()
  Object.entries(plan).forEach(([tag, rezept]) => {
    if (!rezept || tag === ausnahmeTag) return
    const faktor = skalierungsFaktor(rezept)
    rezept.zutaten.forEach(z => {
      const key = z.name.toLowerCase()
      const m = typeof z.menge === 'string' ? parseMenge(z.menge) : z.menge
      if (!m) return
      const ms = skaliereMenge(m, faktor)
      if (!verbrauch.has(key)) {
        verbrauch.set(key, { ...ms })
      } else {
        const e = verbrauch.get(key)
        if (e.unit === ms.unit) e.amount = +(e.amount + ms.amount).toFixed(2)
      }
    })
  })
  return vorhandene.map(z => {
    const v = verbrauch.get(z.name.toLowerCase())
    if (!v || !z.menge || v.unit !== z.menge.unit) return z
    return { ...z, menge: { amount: Math.max(0, +(z.menge.amount - v.amount).toFixed(2)), unit: z.menge.unit } }
  })
}

// Berechnet die vollständige Fehlmenge für die Einkaufsliste
export function berechneFehlend(plan, vorhandene) {
  // Benötigte Mengen aus allen Rezepten summieren (mit Personenskalierung)
  const benoetigt = new Map()
  Object.values(plan).forEach(rezept => {
    if (!rezept) return
    const faktor = skalierungsFaktor(rezept)
    rezept.zutaten.forEach(z => {
      const key = z.name.toLowerCase()
      if (!benoetigt.has(key)) {
        benoetigt.set(key, { name: z.name, menge: null })
      }
      const e = benoetigt.get(key)
      const m = typeof z.menge === 'string' ? parseMenge(z.menge) : z.menge
      const ms = skaliereMenge(m, faktor)
      if (ms) {
        if (!e.menge) {
          e.menge = { ...ms }
        } else if (e.menge.unit === ms.unit) {
          e.menge = { amount: +(e.menge.amount + ms.amount).toFixed(2), unit: e.menge.unit }
        }
      }
    })
  })

  const result = []
  benoetigt.forEach(({ name, menge }) => {
    const match = findeVorhandene(name, vorhandene)
    if (!match) {
      result.push({ name, fehlendMenge: menge })
      return
    }
    const vergleich = vergleicheMengen(menge, match.menge)
    if (vergleich === null) return // vorhanden, kein Mengenvergleich möglich → als ausreichend werten
    if (!vergleich.ausreichend) {
      result.push({ name, fehlendMenge: vergleich.fehlend })
    }
  })

  return result
}
