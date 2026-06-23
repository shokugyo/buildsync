'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer, ArrowLeft, Camera, CheckSquare, Square, Columns, LayoutGrid, Grid3X3 } from 'lucide-react'

interface Photo {
  id: string
  filePath: string
  comment?: string | null
  tags?: string | null
  location?: string | null
  shootingType?: string | null
  category?: string
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  uploader: { name: string }
}

type LayoutOption = 2 | 4 | 6

function PhotoReportContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''

  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [layout, setLayout] = useState<LayoutOption>(4)
  const [showCover, setShowCover] = useState(true)
  const [companyName, setCompanyName] = useState('BuildSync 株式会社')

  useEffect(() => {
    const url = projectId ? `/api/photos?projectId=${projectId}` : '/api/photos'
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : []
        setPhotos(arr)
        setSelectedIds(new Set(arr.map((p: Photo) => p.id)))
        setLoading(false)
      })
      .catch(() => {
        setError('写真の取得に失敗しました')
        setLoading(false)
      })
  }, [projectId])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(photos.map(p => p.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const printPhotos = selectionMode
    ? photos.filter(p => selectedIds.has(p.id))
    : photos

  const pages: Photo[][] = []
  for (let i = 0; i < printPhotos.length; i += layout) {
    pages.push(printPhotos.slice(i, i + layout))
  }

  const projectName = photos[0]?.project?.name || ''
  const projectNumber = photos[0]?.project?.projectNumber || ''

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const dateRange = (() => {
    if (printPhotos.length === 0) return ''
    const dates = printPhotos.map(p => new Date(p.createdAt).getTime())
    const min = new Date(Math.min(...dates)).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
    const max = new Date(Math.max(...dates)).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
    return min === max ? min : `${min} 〜 ${max}`
  })()

  const gridCols = layout === 2 ? '1fr 1fr' : layout === 4 ? '1fr 1fr' : '1fr 1fr 1fr'
  const gridRows = layout === 2 ? '1fr' : layout === 4 ? '1fr 1fr' : '1fr 1fr'
  const photoHeight = layout === 2 ? '300px' : layout === 4 ? '155px' : '110px'
  const totalPages = (showCover ? 1 : 0) + pages.length

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
        <button onClick={() => window.close()} className="text-blue-600 hover:underline text-sm">
          閉じる
        </button>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Camera className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">
          {projectId ? 'この案件に写真がありません' : '写真がありません'}
        </p>
        <button onClick={() => window.history.back()} className="text-blue-600 hover:underline text-sm">
          戻る
        </button>
      </div>
    )
  }

  return (
    <>
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
          margin: 12mm;
          size: A4 portrait;
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Action bar (no-print) */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> 戻る
          </button>
          <div className="text-sm font-medium text-slate-700">
            工事写真帳 — {projectName || 'すべての案件'} ({selectionMode ? `${selectedIds.size}/` : ''}{photos.length}枚)
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> 印刷 / PDF保存
          </button>
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-4 px-4 pb-3 border-t border-slate-100 pt-2.5">
          {/* Layout options */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">レイアウト:</span>
            {([2, 4, 6] as LayoutOption[]).map(n => (
              <button
                key={n}
                onClick={() => setLayout(n)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  layout === n
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                {n === 2 ? <Columns className="w-3 h-3" /> : n === 4 ? <LayoutGrid className="w-3 h-3" /> : <Grid3X3 className="w-3 h-3" />}
                {n}枚/ページ
              </button>
            ))}
          </div>

          {/* Cover page toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCover}
              onChange={e => setShowCover(e.target.checked)}
              className="rounded"
            />
            表紙ページ
          </label>

          {/* Company name input */}
          {showCover && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">会社名:</span>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="border border-slate-300 rounded px-2 py-0.5 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Selection mode toggle */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                setSelectionMode(m => !m)
                if (!selectionMode) selectAll()
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors ${
                selectionMode
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
              }`}
            >
              {selectionMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              写真の選択
            </button>
            {selectionMode && (
              <>
                <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">全選択</button>
                <button onClick={deselectAll} className="text-xs text-slate-500 hover:underline">全解除</button>
              </>
            )}
          </div>
        </div>

        {/* Photo selection grid */}
        {selectionMode && (
          <div className="border-t border-slate-100 px-4 py-3 max-h-56 overflow-y-auto bg-slate-50">
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
              {photos.map(photo => {
                const checked = selectedIds.has(photo.id)
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo.id)}
                    className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all ${
                      checked ? 'border-blue-500' : 'border-transparent opacity-50'
                    }`}
                    title={photo.comment || photo.shootingType || ''}
                  >
                    {photo.filePath && !photo.filePath.includes('placeholder') ? (
                      <img src={photo.filePath} alt="" className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-200 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    {checked && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">✓</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">{selectedIds.size}枚選択中</p>
          </div>
        )}
      </div>

      {/* Printable pages */}
      <div style={{ paddingTop: selectionMode ? '280px' : '100px' }}>

        {/* Cover page */}
        {showCover && (
          <div
            className="print-page bg-white"
            style={{ minHeight: '277mm', padding: '0', marginBottom: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
          >
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '28pt', fontWeight: 800, color: '#1e3a5f', letterSpacing: '0.12em', marginBottom: '24px' }}>
                工事写真帳
              </div>
              {projectName && (
                <div style={{ fontSize: '16pt', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                  {projectNumber ? `[${projectNumber}] ` : ''}{projectName}
                </div>
              )}
              {dateRange && (
                <div style={{ fontSize: '12pt', color: '#6b7280', marginBottom: '32px' }}>
                  撮影期間: {dateRange}
                </div>
              )}
              <div style={{ borderTop: '2px solid #1e3a5f', width: '120px', margin: '32px auto' }} />
              <div style={{ fontSize: '12pt', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>
                {companyName}
              </div>
              <div style={{ fontSize: '10pt', color: '#9ca3af' }}>
                作成日: {today}
              </div>
              <div style={{ fontSize: '10pt', color: '#9ca3af', marginTop: '8px' }}>
                総写真枚数: {printPhotos.length}枚 / {pages.length}ページ
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: '16px', width: '100%', textAlign: 'center', fontSize: '7pt', color: '#d1d5db' }}>
              BuildSync 工事写真管理システム
            </div>
          </div>
        )}

        {pages.map((pagePhotos, pageIdx) => {
          const pageNum = (showCover ? 1 : 0) + pageIdx + 1
          return (
            <div
              key={pageIdx}
              className="print-page bg-white"
              style={{ minHeight: '277mm', padding: '0', marginBottom: '8px' }}
            >
              {/* Page Header */}
              <div
                style={{
                  borderBottom: '2px solid #1e3a5f',
                  padding: '8px 0 6px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: '14pt',
                      fontWeight: 800,
                      color: '#1e3a5f',
                      margin: 0,
                      letterSpacing: '0.08em',
                    }}
                  >
                    工事写真帳
                  </h1>
                  {projectName && (
                    <p style={{ fontSize: '9pt', color: '#4b5563', margin: '2px 0 0', fontWeight: 600 }}>
                      工事名: {projectNumber ? `[${projectNumber}] ` : ''}{projectName}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '9pt', color: '#6b7280' }}>
                  <div>{companyName}</div>
                  <div>作成日: {today}</div>
                  <div style={{ fontWeight: 700, color: '#1e3a5f' }}>
                    {pageNum} / {totalPages} ページ
                  </div>
                </div>
              </div>

              {/* Photo Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gridTemplateRows: gridRows,
                  gap: '8px',
                  flex: 1,
                }}
              >
                {pagePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      border: '1px solid #d1d5db',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Photo area */}
                    <div
                      style={{
                        background: '#f3f4f6',
                        height: photoHeight,
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {photo.filePath && !photo.filePath.includes('placeholder') ? (
                        <img
                          src={photo.filePath}
                          alt={photo.comment || '工事写真'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: '8px',
                            color: '#9ca3af',
                          }}
                        >
                          <Camera
                            style={{ width: '36px', height: '36px', color: '#d1d5db' }}
                          />
                          <span style={{ fontSize: '8pt' }}>写真なし</span>
                        </div>
                      )}
                    </div>

                    {/* Caption area */}
                    <div
                      style={{
                        padding: layout === 6 ? '3px 5px' : '5px 7px',
                        background: '#ffffff',
                        borderTop: '1px solid #e5e7eb',
                        fontSize: layout === 6 ? '7pt' : '8pt',
                        color: '#374151',
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '2px 8px',
                          marginBottom: '2px',
                        }}
                      >
                        <div>
                          <span style={{ color: '#9ca3af' }}>種別: </span>
                          <span style={{ fontWeight: 600 }}>{photo.shootingType || photo.category || '−'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>日付: </span>
                          <span>
                            {new Date(photo.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginBottom: '2px' }}>
                        <span style={{ color: '#9ca3af' }}>ファイル: </span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {photo.filePath ? photo.filePath.split('/').pop() : '−'}
                        </span>
                      </div>
                      {photo.location && (
                        <div style={{ marginBottom: '2px' }}>
                          <span style={{ color: '#9ca3af' }}>場所: </span>
                          <span>{photo.location}</span>
                        </div>
                      )}
                      {photo.comment && (
                        <div
                          style={{
                            color: '#374151',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: layout === 6 ? 1 : 2,
                            WebkitBoxOrient: 'vertical' as const,
                          }}
                        >
                          <span style={{ color: '#9ca3af' }}>コメント: </span>
                          {photo.comment}
                        </div>
                      )}
                      <div style={{ color: '#9ca3af', fontSize: '7pt', marginTop: '2px' }}>
                        撮影者: {photo.uploader?.name || '−'}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Fill empty cells on last page */}
                {pagePhotos.length < layout &&
                  Array.from({ length: layout - pagePhotos.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      style={{
                        border: '1px dashed #e5e7eb',
                        minHeight: photoHeight,
                      }}
                    />
                  ))}
              </div>

              {/* Page Footer */}
              <div
                style={{
                  borderTop: '1px solid #e5e7eb',
                  marginTop: '8px',
                  paddingTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '7pt',
                  color: '#9ca3af',
                }}
              >
                <span>BuildSync 工事写真管理システム</span>
                <span>総写真枚数: {printPhotos.length}枚</span>
                <span>
                  ページ {pageNum} / {totalPages}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function PhotoPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      }
    >
      <PhotoReportContent />
    </Suspense>
  )
}
