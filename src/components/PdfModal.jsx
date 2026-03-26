import { useEffect } from 'react'

export default function PdfModal({ rezept, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!rezept) return null

  const pdfUrl = `${import.meta.env.BASE_URL}pdfs/${rezept.pdf}`

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'rgba(26,46,35,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col flex-1 m-3 rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#F7F3EE', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ backgroundColor: '#1A2E23' }}>
          <p className="font-medium text-sm truncate pr-4" style={{ color: '#F7F3EE' }}>{rezept.name}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0 cursor-pointer transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'rgba(247,243,238,0.15)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7F3EE" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* PDF iframe */}
        <iframe
          src={pdfUrl}
          className="flex-1 w-full border-0"
          title={rezept.name}
        />

        {/* Footer */}
        <div className="px-4 py-3 shrink-0 flex justify-end" style={{ borderTop: '1px solid #E8E2D9' }}>
          <button
            onClick={() => window.open(pdfUrl, '_blank')}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#D97706', color: '#fff' }}
          >
            In neuem Tab öffnen
          </button>
        </div>
      </div>
    </div>
  )
}
