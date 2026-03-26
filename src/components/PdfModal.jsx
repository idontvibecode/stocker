import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PdfModal({ rezept, onClose }) {
  const [numPages, setNumPages] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Seiten zurücksetzen wenn Rezept wechselt
  useEffect(() => { setNumPages(null) }, [rezept])

  if (!rezept) return null

  const pdfUrl = `${import.meta.env.BASE_URL}pdfs/${rezept.pdf}`

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'rgba(26,46,35,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col m-3 rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#F7F3EE', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', maxHeight: 'calc(100vh - 24px)' }}
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

        {/* PDF-Seiten */}
        <div
          ref={containerRef}
          className="overflow-y-auto"
          style={{ flex: '1 1 0', minHeight: 0, backgroundColor: '#e5e7eb' }}
        >
          {containerWidth > 0 && (
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm" style={{ color: '#78716C' }}>Lädt…</p>
                </div>
              }
              error={
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm" style={{ color: '#78716C' }}>PDF konnte nicht geladen werden.</p>
                </div>
              }
            >
              {numPages && Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  width={containerWidth}
                  className="block"
                />
              ))}
            </Document>
          )}
        </div>

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
