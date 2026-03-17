// Clipboard-Fallback für HTTP-Kontexte (z.B. lokales Netzwerk ohne HTTPS)
export async function kopieren(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback via execCommand (funktioniert auch über HTTP)
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  }
}
