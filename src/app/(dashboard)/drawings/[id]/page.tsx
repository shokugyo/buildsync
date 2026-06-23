'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft, MapPin, History, CheckCircle, Circle, X, Plus, ExternalLink, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react'

interface DrawingPin {
  id: string
  x: number
  y: number
  comment: string
  resolvedAt: string | null
  createdAt: string
  author: { id: string; name: string; email: string }
}

interface Drawing {
  id: string
  name: string
  drawingType: string
  drawingNumber?: string | null
  version: number
  isLatest: boolean
  filePath: string
  description?: string | null
  createdAt: string
  updatedAt: string
  uploader: { id: true; name: string }
  project: { id: string; name: string; projectNumber: string }
  pins: DrawingPin[]
}

export default function DrawingViewerPage() {
  const params = useParams()
  const router = useRouter()
  const drawingId = params.id as string

  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [loading, setLoading] = useState(true)
  const [pins, setPins] = useState<DrawingPin[]>([])
  const [addingPin, setAddingPin] = useState(false)
  const [newPinComment, setNewPinComment] = useState('')
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [selectedPin, setSelectedPin] = useState<DrawingPin | null>(null)
  const [zoom, setZoom] = useState(1)
  const [savingPin, setSavingPin] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/drawings/${drawingId}`)
      .then(r => r.json())
      .then(data => {
        setDrawing(data)
        setPins(data.pins || [])
        setLoading(false)
      })
  }, [drawingId])

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addingPin || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingPin({ x, y })
  }

  const handleSavePin = async () => {
    if (!pendingPin || !newPinComment.trim()) return
    setSavingPin(true)
    const res = await fetch(`/api/drawings/${drawingId}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: pendingPin.x, y: pendingPin.y, comment: newPinComment.trim() }),
    })
    if (res.ok) {
      const newPin = await res.json()
      setPins(prev => [...prev, newPin])
      setPendingPin(null)
      setNewPinComment('')
      setAddingPin(false)
    }
    setSavingPin(false)
  }

  const handleResolvePin = async (pin: DrawingPin) => {
    const res = await fetch(`/api/drawings/${drawingId}/pins/${pin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvedAt: pin.resolvedAt ? null : new Date().toISOString() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPins(prev => prev.map(p => p.id === updated.id ? updated : p))
      if (selectedPin?.id === pin.id) setSelectedPin(updated)
    }
  }

  const handleDeletePin = async (pinId: string) => {
    if (!confirm('このピンを削除しますか？')) return
    await fetch(`/api/drawings/${drawingId}/pins/${pinId}`, { method: 'DELETE' })
    setPins(prev => prev.filter(p => p.id !== pinId))
    if (selectedPin?.id === pinId) setSelectedPin(null)
  }

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!drawing) return <div className="p-8 text-center">図面が見つかりません</div>

  const openPins = pins.filter(p => !p.resolvedAt)
  const resolvedPins = pins.filter(p => p.resolvedAt)

  return (
    <div>
      <Header title="図面ビューア" />
      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Back + meta */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex gap-2">
            <Link
              href={`/drawings/${drawingId}/versions`}
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <History className="w-4 h-4" />
              バージョン履歴
            </Link>
            <a
              href={drawing.filePath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <ExternalLink className="w-4 h-4" />
              原寸で開く
            </a>
          </div>
        </div>

        {/* Drawing info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{drawing.name}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
              <span>{drawing.drawingType}</span>
              {drawing.drawingNumber && <span>図面番号: {drawing.drawingNumber}</span>}
              <span>Ver.{drawing.version}</span>
              <Link href={`/projects/${drawing.project?.id}`} className="text-blue-600 hover:underline">
                {drawing.project?.name}
              </Link>
            </div>
            {drawing.description && <p className="text-sm text-slate-600 mt-1">{drawing.description}</p>}
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>アップロード: {drawing.uploader?.name}</p>
            <p>{formatDate(drawing.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Image viewer */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-slate-50">
                <button
                  onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                  className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"
                  title="ズームイン"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"
                  title="ズームアウト"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"
                  title="リセット"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 ml-1">{Math.round(zoom * 100)}%</span>
                <div className="flex-1" />
                <button
                  onClick={() => { setAddingPin(!addingPin); setPendingPin(null); setNewPinComment('') }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    addingPin
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  {addingPin ? 'キャンセル' : 'ピンを追加'}
                </button>
              </div>

              {/* Image / PDF viewer */}
              {drawing.filePath.toLowerCase().endsWith('.pdf') ? (
                <div className="bg-slate-100" style={{ height: '70vh' }}>
                  <iframe
                    src={drawing.filePath}
                    title={drawing.name}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div
                  ref={containerRef}
                  className={`overflow-auto bg-slate-100 ${addingPin ? 'cursor-crosshair' : ''}`}
                  style={{ maxHeight: '70vh' }}
                >
                  <div
                    className="relative inline-block"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.1s' }}
                    onClick={handleImageClick}
                  >
                    <img
                      ref={imgRef}
                      src={drawing.filePath}
                      alt={drawing.name}
                      className="block max-w-full"
                      style={{ userSelect: 'none' }}
                      draggable={false}
                    />
                    {/* Existing pins */}
                    {pins.map(pin => (
                      <button
                        key={pin.id}
                        onClick={e => { e.stopPropagation(); setSelectedPin(selectedPin?.id === pin.id ? null : pin) }}
                        className={`absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110 ${
                          pin.resolvedAt ? 'text-emerald-500' : 'text-red-500'
                        } ${selectedPin?.id === pin.id ? 'scale-125 z-20' : 'z-10'}`}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        title={pin.comment}
                      >
                        <MapPin className="w-6 h-6 drop-shadow-md" fill="currentColor" />
                      </button>
                    ))}
                    {/* Pending pin */}
                    {pendingPin && (
                      <div
                        className="absolute -translate-x-1/2 -translate-y-full text-blue-500 z-20 pointer-events-none"
                        style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                      >
                        <MapPin className="w-6 h-6 drop-shadow-md animate-bounce" fill="currentColor" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pin input */}
              {addingPin && pendingPin && (
                <div className="p-3 border-t border-slate-200 bg-blue-50 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <input
                    autoFocus
                    value={newPinComment}
                    onChange={e => setNewPinComment(e.target.value)}
                    placeholder="コメントを入力..."
                    onKeyDown={e => e.key === 'Enter' && handleSavePin()}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={handleSavePin}
                    disabled={!newPinComment.trim() || savingPin}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingPin ? '保存中...' : '追加'}
                  </button>
                  <button onClick={() => { setPendingPin(null); setNewPinComment('') }} className="p-1.5 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {addingPin && !pendingPin && (
                <div className="p-2 border-t border-slate-200 bg-blue-50 text-center text-sm text-blue-600">
                  図面上をクリックしてピンを配置してください
                </div>
              )}
            </div>
          </div>

          {/* Pin sidebar */}
          <div className="space-y-4">
            {/* Selected pin detail */}
            {selectedPin && (
              <div className="bg-white rounded-xl border border-blue-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">ピン詳細</h4>
                  <button onClick={() => setSelectedPin(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-700 mb-2">{selectedPin.comment}</p>
                <p className="text-xs text-slate-500 mb-3">{selectedPin.author?.name} · {formatDateTime(selectedPin.createdAt)}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolvePin(selectedPin)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${
                      selectedPin.resolvedAt
                        ? 'border border-slate-300 text-slate-600'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {selectedPin.resolvedAt ? '再オープン' : '解決済み'}
                  </button>
                  <button
                    onClick={() => handleDeletePin(selectedPin.id)}
                    className="px-2 py-1.5 rounded-lg text-xs text-red-600 border border-red-200 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            )}

            {/* Open pins */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <Circle className="w-4 h-4 text-red-500" />
                未解決 ({openPins.length})
              </h4>
              {openPins.length === 0 ? (
                <p className="text-xs text-slate-400">なし</p>
              ) : (
                <ul className="space-y-2">
                  {openPins.map(pin => (
                    <li key={pin.id}>
                      <button
                        onClick={() => setSelectedPin(pin)}
                        className={`w-full text-left p-2 rounded-lg text-xs hover:bg-slate-50 transition-colors ${
                          selectedPin?.id === pin.id ? 'bg-blue-50 border border-blue-200' : 'border border-slate-100'
                        }`}
                      >
                        <p className="text-slate-700 font-medium truncate">{pin.comment}</p>
                        <p className="text-slate-400 mt-0.5">{pin.author?.name}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Resolved pins */}
            {resolvedPins.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  解決済み ({resolvedPins.length})
                </h4>
                <ul className="space-y-2">
                  {resolvedPins.map(pin => (
                    <li key={pin.id}>
                      <button
                        onClick={() => setSelectedPin(pin)}
                        className={`w-full text-left p-2 rounded-lg text-xs hover:bg-slate-50 transition-colors opacity-60 ${
                          selectedPin?.id === pin.id ? 'bg-blue-50 border border-blue-200 opacity-100' : 'border border-slate-100'
                        }`}
                      >
                        <p className="text-slate-700 font-medium truncate line-through">{pin.comment}</p>
                        <p className="text-slate-400 mt-0.5">{pin.author?.name}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
