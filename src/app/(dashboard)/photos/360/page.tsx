'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Camera, ArrowLeft, X } from 'lucide-react'

interface Photo {
  id: string
  filePath: string
  comment?: string | null
  tags?: string | null
  location?: string | null
  shootingType?: string | null
  is360?: boolean
  category?: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  uploader: { name: string }
}

function Photo360Modal({
  photo,
  onClose,
}: {
  photo: Photo
  onClose: () => void
}) {
  const [rotateY, setRotateY] = useState(0)
  const [rotateX, setRotateX] = useState(0)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setRotateY((prev) => prev + dx * 0.4)
    setRotateX((prev) => Math.max(-60, Math.min(60, prev - dy * 0.3)))
  }
  const onMouseUp = () => { dragging.current = false }

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    dragging.current = true
    lastPos.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const t = e.touches[0]
    const dx = t.clientX - lastPos.current.x
    const dy = t.clientY - lastPos.current.y
    lastPos.current = { x: t.clientX, y: t.clientY }
    setRotateY((prev) => prev + dx * 0.4)
    setRotateX((prev) => Math.max(-60, Math.min(60, prev - dy * 0.3)))
  }
  const onTouchEnd = () => { dragging.current = false }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 select-none">
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="flex items-center gap-2">
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">360°</span>
          <span className="text-white text-sm font-medium">360°写真 - ドラッグして回転</span>
        </div>
        <button onClick={onClose} className="text-white hover:text-slate-300 ml-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ perspective: '800px' }}
      >
        <div
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: dragging.current ? 'none' : 'transform 0.1s ease-out',
            width: '90vw',
            maxWidth: '1000px',
          }}
        >
          {photo.filePath && !photo.filePath.includes('placeholder') ? (
            <img
              src={photo.filePath}
              alt={photo.comment || '360°写真'}
              className="w-full rounded-lg"
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400 py-20">
              <Camera className="w-16 h-16" />
              <p>写真ファイルなし</p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 flex items-center gap-4">
        {photo.comment && <p className="text-sm text-white/80">{photo.comment}</p>}
        {photo.location && <p className="text-xs text-white/60">場所: {photo.location}</p>}
        <span className="text-xs text-white/40 ml-auto">
          {photo.uploader?.name} · {new Date(photo.createdAt).toLocaleDateString('ja-JP')}
        </span>
      </div>
    </div>
  )
}

export default function Photos360Page() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  useEffect(() => {
    fetch('/api/photos')
      .then((r) => r.json())
      .then((data: Photo[]) => {
        const filtered = Array.isArray(data) ? data.filter((p) => p.is360) : []
        setPhotos(filtered)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <Header title="360°写真管理" />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/photos"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            写真ページに戻る
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">360°</span>
            <h2 className="text-lg font-semibold text-slate-900">360度写真一覧</h2>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : photos.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-1">360°写真がありません</p>
            <p className="text-sm text-slate-400">
              写真追加時に「360度写真として登録する」にチェックを入れてください
            </p>
            <Link
              href="/photos"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />写真ページへ
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">{photos.length}件の360°写真</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative cursor-pointer rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="aspect-square relative">
                    {photo.filePath && !photo.filePath.includes('placeholder') ? (
                      <img
                        src={photo.filePath}
                        alt={photo.comment || '360°写真'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute top-2 left-2">
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                        360°
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {photo.project?.name || '案件なし'}
                    </p>
                    {photo.comment && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{photo.comment}</p>
                    )}
                    {photo.location && (
                      <p className="text-[11px] text-slate-400 truncate">{photo.location}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(photo.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedPhoto && (
        <Photo360Modal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </div>
  )
}
