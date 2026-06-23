'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer, ArrowLeft, Camera } from 'lucide-react'

interface Photo {
  id: string
  filePath: string
  comment?: string | null
  tags?: string | null
  location?: string | null
  shootingType?: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  uploader: { name: string }
}

export default function AlbumPrintPage() {
  const searchParams = useSearchParams()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam.split(',').filter(Boolean)

  useEffect(() => {
    if (ids.length === 0) {
      setError('写真が選択されていません')
      setLoading(false)
      return
    }
    fetch(`/api/photos?ids=${idsParam}`)
      .then((r) => r.json())
      .then((data) => {
        setPhotos(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('写真の取得に失敗しました')
        setLoading(false)
      })
  }, [idsParam])

  useEffect(() => {
    if (!loading && photos.length > 0) {
      const timer = setTimeout(() => {
        window.print()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [loading, photos])

  // Group photos into pages of 4 (2x2)
  const pages: Photo[][] = []
  for (let i = 0; i < photos.length; i += 4) {
    pages.push(photos.slice(i, i + 4))
  }

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const projectName = photos[0]?.project?.name || ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error}</p>
        <button onClick={() => window.close()} className="text-blue-600 hover:underline text-sm">閉じる</button>
      </div>
    )
  }

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
        }
        @page {
          margin: 15mm;
          size: A4 portrait;
        }
      `}</style>

      {/* Action Buttons (no-print) */}
      <div className="no-print fixed top-4 left-4 right-4 flex items-center justify-between z-50 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
        <div className="text-sm font-medium text-slate-700">
          写真台帳 — {photos.length}枚
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Printer className="w-4 h-4" /> 印刷 / PDF保存
        </button>
      </div>

      {/* Printable Content */}
      <div className="pt-20 no-print-padding print:pt-0">
        {pages.map((pagePhotos, pageIdx) => (
          <div
            key={pageIdx}
            className="print-page bg-white"
            style={{ minHeight: '297mm', padding: '0', marginBottom: '8px' }}
          >
            {/* Page Header */}
            <div className="border-b-2 border-slate-800 pb-2 mb-4 px-4 pt-4 print:px-0 print:pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">写真台帳</h1>
                  {projectName && (
                    <p className="text-sm text-slate-600 mt-0.5">工事名: {projectName}</p>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>作成日: {today}</p>
                  <p>ページ {pageIdx + 1} / {pages.length}</p>
                </div>
              </div>
            </div>

            {/* 2x2 Photo Grid */}
            <div className="grid grid-cols-2 gap-4 px-4 print:px-0" style={{ gridTemplateRows: 'repeat(2, 1fr)' }}>
              {pagePhotos.map((photo) => (
                <div key={photo.id} className="border border-slate-300 rounded overflow-hidden">
                  {/* Photo */}
                  <div className="bg-slate-100" style={{ height: '200px' }}>
                    {photo.filePath && !photo.filePath.includes('placeholder') ? (
                      <img
                        src={photo.filePath}
                        alt={photo.comment || '工事写真'}
                        className="w-full h-full object-cover"
                        style={{ display: 'block' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                  </div>
                  {/* Photo Info */}
                  <div className="p-2 bg-white text-xs space-y-0.5">
                    <div className="grid grid-cols-2 gap-x-2">
                      <div>
                        <span className="text-slate-400">日付: </span>
                        <span className="text-slate-700">
                          {new Date(photo.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">撮影種別: </span>
                        <span className="text-slate-700">{photo.shootingType || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">場所: </span>
                      <span className="text-slate-700">{photo.location || '-'}</span>
                    </div>
                    {photo.comment && (
                      <div>
                        <span className="text-slate-400">コメント: </span>
                        <span className="text-slate-700">{photo.comment}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Fill empty cells if last page is not full */}
              {pagePhotos.length < 4 && Array.from({ length: 4 - pagePhotos.length }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-dashed border-slate-200 rounded" style={{ height: '248px' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
