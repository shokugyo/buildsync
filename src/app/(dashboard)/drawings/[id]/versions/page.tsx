'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, History, GitCompare, RotateCcw, FileImage } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

interface DrawingVersion {
  id: string
  drawingId: string
  version: number
  fileUrl: string
  fileName: string
  notes?: string | null
  createdAt: string
  uploader: { id: string; name: string }
}

interface Drawing {
  id: string
  name: string
  drawingType: string
  drawingNumber?: string | null
  version: number
  filePath: string
  project: { name: string; projectNumber: string }
}

export default function DrawingVersionsPage() {
  const params = useParams()
  const router = useRouter()
  const drawingId = params.id as string

  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [versions, setVersions] = useState<DrawingVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedA, setSelectedA] = useState<string | null>(null)
  const [selectedB, setSelectedB] = useState<string | null>(null)
  const [reverting, setReverting] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/drawings/${drawingId}/versions`).then(r => r.json()),
      fetch(`/api/drawings?latestOnly=false`).then(r => r.json()),
    ]).then(([vers, drawings]) => {
      if (Array.isArray(vers)) {
        setVersions(vers)
        if (vers.length >= 1) setSelectedA(vers[0].id)
        if (vers.length >= 2) setSelectedB(vers[1].id)
      } else {
        setError('バージョン情報の取得に失敗しました')
      }
      if (Array.isArray(drawings)) {
        const d = drawings.find((x: Drawing) => x.id === drawingId)
        if (d) setDrawing(d)
      }
      setLoading(false)
    }).catch(() => {
      setError('データの取得に失敗しました')
      setLoading(false)
    })
  }, [drawingId])

  const handleRevert = async (versionId: string) => {
    const ver = versions.find(v => v.id === versionId)
    if (!ver) return
    if (!confirm(`v${ver.version} (${ver.fileName}) に戻しますか？`)) return
    setReverting(versionId)
    try {
      const res = await fetch(`/api/drawings/${drawingId}/versions/${versionId}`, {
        method: 'PATCH',
      })
      if (res.ok) {
        alert(`v${ver.version} に戻しました`)
      } else {
        alert('エラーが発生しました')
      }
    } finally {
      setReverting(null)
    }
  }

  const isImage = (path: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(path)

  const versionA = versions.find(v => v.id === selectedA) || null
  const versionB = versions.find(v => v.id === selectedB) || null

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
        <button onClick={() => router.back()} className="text-blue-600 hover:underline text-sm">戻る</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.push('/drawings')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> 図面管理に戻る
          </button>
        </div>
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="font-semibold text-slate-900">
              バージョン履歴 — {drawing?.name || drawingId}
            </h1>
            {drawing && (
              <p className="text-sm text-slate-500">
                {drawing.project.projectNumber} · {drawing.drawingType}
                {drawing.drawingNumber ? ` · No.${drawing.drawingNumber}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {versions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">バージョン履歴がありません</p>
          </div>
        ) : (
          <>
            {/* Version list */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h2 className="font-medium text-slate-800 text-sm">バージョン一覧 ({versions.length}件)</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {versions.map((ver, idx) => {
                  const isCurrent = idx === 0
                  const isA = selectedA === ver.id
                  const isB = selectedB === ver.id
                  return (
                    <div key={ver.id} className="px-4 py-3 flex items-center gap-3">
                      {/* Version selection radios */}
                      <div className="flex flex-col gap-1 flex-shrink-0 w-20">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="versionA"
                            checked={isA}
                            onChange={() => setSelectedA(ver.id)}
                            className="accent-blue-600"
                          />
                          <span className="text-blue-600 font-medium">A</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="versionB"
                            checked={isB}
                            onChange={() => setSelectedB(ver.id)}
                            className="accent-orange-500"
                          />
                          <span className="text-orange-500 font-medium">B</span>
                        </label>
                      </div>

                      {/* Thumbnail */}
                      <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {isImage(ver.fileUrl) ? (
                          <img src={ver.fileUrl} alt={`v${ver.version}`} className="w-full h-full object-cover" />
                        ) : (
                          <FileImage className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-slate-800 text-sm">v{ver.version}</span>
                          {isCurrent && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">現行版</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">{ver.fileName}</p>
                        {ver.notes && <p className="text-xs text-slate-400 mt-0.5">{ver.notes}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {ver.uploader.name} · {formatDateTime(ver.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={ver.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                          title="別タブで開く"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {!isCurrent && (
                          <button
                            onClick={() => handleRevert(ver.id)}
                            disabled={reverting === ver.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            title="このバージョンに戻す"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {reverting === ver.id ? '処理中...' : 'このバージョンに戻す'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Comparison panel */}
            {versions.length >= 2 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-slate-500" />
                  <h2 className="font-medium text-slate-800 text-sm">バージョン比較</h2>
                  {versionA && versionB && (
                    <span className="text-xs text-slate-500">
                      v{versionA.version} vs v{versionB.version}
                    </span>
                  )}
                </div>

                {/* Side-by-side images */}
                <div className="grid grid-cols-2 divide-x divide-slate-200">
                  {[
                    { ver: versionA, label: 'A', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                    { ver: versionB, label: 'B', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                  ].map(({ ver, label, color, bg, border }) => (
                    <div key={label} className="flex flex-col">
                      {/* Version label header */}
                      <div className={`${bg} border-b ${border} px-4 py-2 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${color}`}>{label}</span>
                          {ver ? (
                            <>
                              <span className="font-semibold text-slate-700 text-sm">v{ver.version}</span>
                              {versions.indexOf(ver) === 0 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">現行版</span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-sm">未選択</span>
                          )}
                        </div>
                        {ver && (
                          <a
                            href={ver.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${color} hover:opacity-70`}
                            title="別タブで開く"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Image */}
                      <div className="bg-slate-900 flex items-center justify-center" style={{ minHeight: '360px' }}>
                        {ver ? (
                          isImage(ver.fileUrl) ? (
                            <img
                              src={ver.fileUrl}
                              alt={`v${ver.version}`}
                              className="max-w-full max-h-96 object-contain"
                            />
                          ) : (
                            <div className="text-center p-8">
                              <FileImage className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                              <p className="text-slate-400 text-sm mb-3">プレビューできません</p>
                              <a
                                href={ver.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-sm flex items-center gap-1 justify-center"
                              >
                                <ExternalLink className="w-4 h-4" /> 別タブで開く
                              </a>
                            </div>
                          )
                        ) : (
                          <p className="text-slate-500 text-sm">バージョンを選択してください</p>
                        )}
                      </div>

                      {/* Metadata */}
                      {ver && (
                        <div className="p-4 space-y-2 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div>
                              <span className="text-slate-400">ファイル名</span>
                              <p className="font-medium text-slate-700 truncate" title={ver.fileName}>{ver.fileName}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">アップロード日時</span>
                              <p className="font-medium text-slate-700">{formatDateTime(ver.createdAt)}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">アップロード者</span>
                              <p className="font-medium text-slate-700">{ver.uploader.name}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">バージョン</span>
                              <p className="font-medium text-slate-700">v{ver.version}</p>
                            </div>
                          </div>
                          {ver.notes && (
                            <div className="text-xs">
                              <span className="text-slate-400">メモ</span>
                              <p className="text-slate-600 mt-0.5">{ver.notes}</p>
                            </div>
                          )}
                          {versions.indexOf(ver) !== 0 && (
                            <button
                              onClick={() => handleRevert(ver.id)}
                              disabled={reverting === ver.id}
                              className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {reverting === ver.id ? '処理中...' : 'このバージョンに戻す'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
