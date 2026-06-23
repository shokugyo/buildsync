'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate } from '@/lib/utils'
import { FileImage, Plus, Upload, X, Search, Filter, Trash2, Edit2, ExternalLink, History, MapPin, CheckCircle, Circle, MessageSquare, Clock, Box, ChevronDown } from 'lucide-react'

const DRAWING_TYPES = ['平面図', '立面図', '断面図', '配置図', '詳細図', '設備図', '電気図', '構造図', '施工図', '竣工図', 'BIMモデル', '3Dモデル', 'CIMモデル', 'その他']

const BIM_EXTENSIONS = ['.ifc', '.rvt', '.dwg', '.dxf', '.nwd', '.fbx']
const BIM_VIEWERS = [
  { name: 'IFC.js Viewer（無料）', url: 'https://ifcjs.github.io/web-ifc-viewer/example/index.html' },
  { name: 'xeokit (xeoglBIM)', url: 'https://xeokit.io/demo.html' },
  { name: 'Autodesk Viewer', url: 'https://viewer.autodesk.com/' },
]

interface Drawing {
  id: string
  name: string
  drawingType: string
  drawingNumber?: string | null
  version: number
  isLatest: boolean
  filePath: string
  fileType?: string | null
  isBim?: boolean
  description?: string | null
  createdAt: string
  uploader: { name: string }
  project: { name: string; projectNumber: string }
}

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

interface DrawingPin {
  id: string
  drawingId: string
  x: number
  y: number
  comment: string
  authorId: string
  author: { id: string; name: string; email: string }
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

const defaultForm = { projectId: '', name: '', drawingType: 'その他', drawingNumber: '', description: '' }

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Drawing | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ path: string; name: string; isBim: boolean } | null>(null)
  const [bimViewerOpen, setBimViewerOpen] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [latestOnly, setLatestOnly] = useState(true)
  const [previewDrawing, setPreviewDrawing] = useState<Drawing | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Pin state
  const [pins, setPins] = useState<DrawingPin[]>([])
  const [pinsLoading, setPinsLoading] = useState(false)
  const [selectedPin, setSelectedPin] = useState<DrawingPin | null>(null)
  const [addingPin, setAddingPin] = useState<{ x: number; y: number } | null>(null)
  const [newPinComment, setNewPinComment] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [pinMode, setPinMode] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Version state
  const [versions, setVersions] = useState<DrawingVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showVersionForm, setShowVersionForm] = useState(false)
  const [versionFileUrl, setVersionFileUrl] = useState('')
  const [versionFileName, setVersionFileName] = useState('')
  const [versionNotes, setVersionNotes] = useState('')
  const [savingVersion, setSavingVersion] = useState(false)
  const [uploadingVersion, setUploadingVersion] = useState(false)
  const versionFileRef = useRef<HTMLInputElement>(null)
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/drawings?latestOnly=${latestOnly}`).then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([d, p]) => {
      setDrawings(Array.isArray(d) ? d : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [latestOnly])

  const refetch = async () => {
    const d = await fetch(`/api/drawings?latestOnly=${latestOnly}`).then(r => r.json())
    setDrawings(Array.isArray(d) ? d : [])
  }

  const fetchPins = useCallback(async (drawingId: string) => {
    setPinsLoading(true)
    try {
      const res = await fetch(`/api/drawings/${drawingId}/pins`)
      if (res.ok) {
        const data = await res.json()
        setPins(Array.isArray(data) ? data : [])
      }
    } finally {
      setPinsLoading(false)
    }
  }, [])

  const fetchVersions = useCallback(async (drawingId: string) => {
    setVersionsLoading(true)
    try {
      const res = await fetch(`/api/drawings/${drawingId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(Array.isArray(data) ? data : [])
      }
    } finally {
      setVersionsLoading(false)
    }
  }, [])

  const openPreview = (drawing: Drawing) => {
    setPreviewDrawing(drawing)
    setPins([])
    setSelectedPin(null)
    setAddingPin(null)
    setNewPinComment('')
    setPinMode(false)
    setVersions([])
    setShowVersions(false)
    setShowVersionForm(false)
    setVersionFileUrl('')
    setVersionFileName('')
    setVersionNotes('')
    setPreviewFileUrl(null)
    if (isImage(drawing.filePath)) {
      fetchPins(drawing.id)
    }
    fetchVersions(drawing.id)
  }

  const closePreview = () => {
    setPreviewDrawing(null)
    setPins([])
    setSelectedPin(null)
    setAddingPin(null)
    setNewPinComment('')
    setPinMode(false)
    setVersions([])
    setShowVersions(false)
    setShowVersionForm(false)
    setVersionFileUrl('')
    setVersionFileName('')
    setVersionNotes('')
    setPreviewFileUrl(null)
  }

  const filtered = drawings.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.drawingNumber?.includes(search)) return false
    if (projectFilter && d.project.projectNumber !== projectFilter) return false
    if (typeFilter && d.drawingType !== typeFilter) return false
    return true
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setUploadedFile({ path: data.path, name: file.name, isBim: isBimFile(file.name) })
      }
    } finally {
      setUploading(false)
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setUploadedFile(null)
    setShowModal(true)
  }

  const openEdit = (d: Drawing) => {
    setEditTarget(d)
    setForm({
      projectId: '',
      name: d.name,
      drawingType: d.drawingType,
      drawingNumber: d.drawingNumber || '',
      description: d.description || '',
    })
    setUploadedFile(null)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget && !uploadedFile) { alert('ファイルをアップロードしてください'); return }
    setSaving(true)
    try {
      if (editTarget) {
        const res = await fetch(`/api/drawings/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, drawingType: form.drawingType, drawingNumber: form.drawingNumber, description: form.description }),
        })
        if (res.ok) { await refetch(); setShowModal(false) }
      } else {
        const res = await fetch('/api/drawings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, filePath: uploadedFile!.path, isBim: uploadedFile!.isBim }),
        })
        if (res.ok) { await refetch(); setShowModal(false) }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この図面を削除しますか？')) return
    const res = await fetch(`/api/drawings/${id}`, { method: 'DELETE' })
    if (res.ok) setDrawings(prev => prev.filter(d => d.id !== id))
  }

  // Pin interactions
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode || !previewDrawing) return
    if ((e.target as HTMLElement).closest('[data-pin]')) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setAddingPin({ x, y })
    setNewPinComment('')
    setSelectedPin(null)
  }

  const handleCreatePin = async () => {
    if (!addingPin || !newPinComment.trim() || !previewDrawing) return
    setSavingPin(true)
    try {
      const res = await fetch(`/api/drawings/${previewDrawing.id}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: addingPin.x, y: addingPin.y, comment: newPinComment }),
      })
      if (res.ok) {
        const pin = await res.json()
        setPins(prev => [...prev, pin])
        setAddingPin(null)
        setNewPinComment('')
        setPinMode(false)
      }
    } finally {
      setSavingPin(false)
    }
  }

  const handleResolvePin = async (pin: DrawingPin) => {
    if (!previewDrawing) return
    const newResolvedAt = pin.resolvedAt ? null : new Date().toISOString()
    const res = await fetch(`/api/drawings/${previewDrawing.id}/pins/${pin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvedAt: newResolvedAt }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPins(prev => prev.map(p => p.id === pin.id ? updated : p))
      if (selectedPin?.id === pin.id) setSelectedPin(updated)
    }
  }

  const handleDeletePin = async (pin: DrawingPin) => {
    if (!previewDrawing) return
    if (!confirm('このピンを削除しますか？')) return
    const res = await fetch(`/api/drawings/${previewDrawing.id}/pins/${pin.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setPins(prev => prev.filter(p => p.id !== pin.id))
      if (selectedPin?.id === pin.id) setSelectedPin(null)
    }
  }

  const handleVersionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVersion(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setVersionFileUrl(data.path)
        setVersionFileName(file.name)
      }
    } finally {
      setUploadingVersion(false)
    }
  }

  const handleAddVersion = async () => {
    if (!previewDrawing || !versionFileUrl || !versionFileName) return
    setSavingVersion(true)
    try {
      const res = await fetch(`/api/drawings/${previewDrawing.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: versionFileUrl, fileName: versionFileName, notes: versionNotes || undefined }),
      })
      if (res.ok) {
        const newVer = await res.json()
        setVersions(prev => [newVer, ...prev])
        setShowVersionForm(false)
        setVersionFileUrl('')
        setVersionFileName('')
        setVersionNotes('')
        // Update preview drawing filePath in local state
        setPreviewDrawing(prev => prev ? { ...prev, filePath: versionFileUrl } : prev)
        await refetch()
      }
    } finally {
      setSavingVersion(false)
    }
  }

  const isImage = (path: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(path)
  const isPdf = (path: string) => /\.pdf$/i.test(path)
  const isBimFile = (path: string) => BIM_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext))

  const unresolvedCount = pins.filter(p => !p.resolvedAt).length

  return (
    <div>
      <Header title="図面管理" />
      <div className="p-6">
        {/* BIM/CIM Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 text-sm">
          <p className="font-semibold text-purple-800">BIM/CIM対応</p>
          <p className="text-purple-700">IFC・Revit・DWG形式のBIMファイルをアップロード可能です。外部ビューアと連携して3D閲覧ができます。</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="図面名・図面番号で検索"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての案件</option>
              {projects.map(p => <option key={p.projectNumber} value={p.projectNumber}>{p.projectNumber} - {p.name}</option>)}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての種別</option>
            {DRAWING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={latestOnly}
              onChange={e => setLatestOnly(e.target.checked)}
              className="rounded"
            />
            最新版のみ
          </label>
          <button
            onClick={openAdd}
            className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 図面を登録
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件</p>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12">
            <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">図面がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(drawing => (
              <div key={drawing.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group">
                {/* Preview area */}
                <div
                  className="h-40 bg-slate-100 flex items-center justify-center relative cursor-pointer"
                  onClick={() => openPreview(drawing)}
                >
                  {isImage(drawing.filePath) ? (
                    <img src={drawing.filePath} alt={drawing.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {(drawing.isBim || isBimFile(drawing.filePath)) ? (
                        <Box className="w-12 h-12 text-purple-300" />
                      ) : (
                        <FileImage className="w-12 h-12 text-slate-300" />
                      )}
                      <span className="text-xs text-slate-400">
                        {isPdf(drawing.filePath) ? 'PDF' : (drawing.isBim || isBimFile(drawing.filePath)) ? 'BIM' : 'ファイル'}
                      </span>
                    </div>
                  )}
                  {!drawing.isLatest && (
                    <div className="absolute top-2 left-2 bg-slate-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <History className="w-3 h-3" /> 旧版
                    </div>
                  )}
                  {drawing.isLatest && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">最新</div>
                  )}
                  {(drawing.isBim || isBimFile(drawing.filePath)) && (
                    <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Box className="w-3 h-3" /> BIM
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <a
                      href={drawing.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/90 p-1 rounded text-slate-600 hover:text-blue-600"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Link
                      href={`/drawings/${drawing.id}`}
                      className="bg-white/90 p-1 rounded text-slate-600 hover:text-purple-600"
                      onClick={e => e.stopPropagation()}
                      title="図面ビューア"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/drawings/${drawing.id}/versions`}
                      className="bg-white/90 p-1 rounded text-slate-600 hover:text-blue-600"
                      onClick={e => e.stopPropagation()}
                      title="バージョン履歴"
                    >
                      <History className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mb-1 inline-block">{drawing.drawingType}</span>
                      <p className="font-medium text-slate-900 text-sm truncate">{drawing.name}</p>
                      {drawing.drawingNumber && <p className="text-xs text-slate-500">No. {drawing.drawingNumber}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEdit(drawing)} className="p-1 text-slate-400 hover:text-blue-600">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(drawing.id)} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{drawing.project.projectNumber}</p>
                  <p className="text-xs text-slate-400">v{drawing.version} · {drawing.uploader.name} · {formatDate(drawing.createdAt)}</p>
                  <Link
                    href={`/drawings/${drawing.id}/versions`}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <History className="w-3 h-3" /> バージョン履歴
                  </Link>
                  {(drawing.isBim || isBimFile(drawing.filePath)) && (
                    <div className="relative mt-2">
                      <button
                        onClick={e => { e.stopPropagation(); setBimViewerOpen(bimViewerOpen === drawing.id ? null : drawing.id) }}
                        className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded font-medium"
                      >
                        <Box className="w-3 h-3" /> 3Dビューアで開く <ChevronDown className="w-3 h-3" />
                      </button>
                      {bimViewerOpen === drawing.id && (
                        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-48" onClick={e => e.stopPropagation()}>
                          {BIM_VIEWERS.map(viewer => (
                            <a
                              key={viewer.url}
                              href={viewer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 first:rounded-t-lg last:rounded-b-lg"
                              onClick={() => setBimViewerOpen(null)}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {viewer.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawing Detail / Pin Modal */}
      {previewDrawing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="relative bg-white rounded-xl w-full max-w-6xl max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">{previewDrawing.name}</h2>
                  <p className="text-xs text-slate-500">{previewDrawing.project.projectNumber} · v{previewDrawing.version}</p>
                </div>
                {isImage(previewDrawing.filePath) && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => { setPinMode(m => !m); setAddingPin(null); setSelectedPin(null) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        pinMode
                          ? 'bg-orange-100 text-orange-700 border border-orange-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {pinMode ? 'クリックで配置' : 'ピンを追加'}
                    </button>
                    {pins.length > 0 && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {unresolvedCount > 0 ? (
                          <span className="text-red-600 font-medium">{unresolvedCount}件未解決</span>
                        ) : (
                          <span className="text-green-600">全て解決済</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDrawing.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={closePreview} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Image / File area */}
              <div className="flex-1 overflow-auto bg-slate-900 flex items-center justify-center relative">
                {isImage(previewDrawing.filePath) ? (
                  <div
                    className={`relative inline-block ${pinMode ? 'cursor-crosshair' : 'cursor-default'}`}
                    onClick={handleImageClick}
                  >
                    <img
                      ref={imgRef}
                      src={previewDrawing.filePath}
                      alt={previewDrawing.name}
                      className="max-h-[75vh] max-w-full select-none"
                      draggable={false}
                    />

                    {/* Render pins */}
                    {pins.map(pin => (
                      <button
                        key={pin.id}
                        data-pin="true"
                        onClick={e => { e.stopPropagation(); setSelectedPin(pin === selectedPin ? null : pin); setAddingPin(null) }}
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-full flex items-end justify-center focus:outline-none group/pin"
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        title={pin.comment}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover/pin:scale-125 ${
                          pin.resolvedAt ? 'bg-green-500' : 'bg-red-500'
                        } ${selectedPin?.id === pin.id ? 'scale-125 ring-2 ring-white' : ''}`}>
                          <span className="text-white text-[8px] font-bold leading-none">
                            {pin.resolvedAt ? '✓' : '!'}
                          </span>
                        </div>
                      </button>
                    ))}

                    {/* Ghost pin while placing */}
                    {addingPin && (
                      <div
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-full flex items-end justify-center pointer-events-none"
                        style={{ left: `${addingPin.x}%`, top: `${addingPin.y}%` }}
                      >
                        <div className="w-5 h-5 rounded-full border-2 border-white shadow-lg bg-blue-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-12">
                    <FileImage className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">このファイルはプレビューできません</p>
                    <a href={previewDrawing.filePath} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 justify-center">
                      <ExternalLink className="w-4 h-4" /> 別タブで開く
                    </a>
                  </div>
                )}
              </div>

              {/* Sidebar: tabs for pins (image only) + versions */}
              <div className="w-72 border-l border-slate-200 flex flex-col bg-white flex-shrink-0">
                {/* Tab buttons */}
                <div className="flex border-b border-slate-100 flex-shrink-0">
                  {isImage(previewDrawing.filePath) && (
                    <button
                      onClick={() => setShowVersions(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${!showVersions ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <MapPin className="w-3.5 h-3.5" /> ピン
                    </button>
                  )}
                  <button
                    onClick={() => setShowVersions(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${showVersions || !isImage(previewDrawing.filePath) ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Clock className="w-3.5 h-3.5" /> バージョン履歴
                  </button>
                </div>

                {/* Pin panel */}
                {!showVersions && isImage(previewDrawing.filePath) && (
                  <>
                    <div className="flex-1 overflow-y-auto">
                      {pinsLoading ? (
                        <p className="text-xs text-slate-400 p-3">読み込み中...</p>
                      ) : pins.length === 0 ? (
                        <div className="p-4 text-center">
                          <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">ピンがありません</p>
                          <p className="text-xs text-slate-400 mt-1">「ピンを追加」で図面上にコメントを配置できます</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {pins.map((pin, idx) => (
                            <li
                              key={pin.id}
                              className={`px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${selectedPin?.id === pin.id ? 'bg-blue-50' : ''}`}
                              onClick={() => setSelectedPin(pin === selectedPin ? null : pin)}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${pin.resolvedAt ? 'bg-green-500' : 'bg-red-500'}`}>
                                  <span className="text-white text-[7px] font-bold">{idx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs leading-snug ${pin.resolvedAt ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                    {pin.comment}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{pin.author.name} · {formatDate(pin.createdAt)}</p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Selected pin detail */}
                    {selectedPin && (
                      <div className="border-t border-slate-200 p-3 flex-shrink-0 bg-slate-50">
                        <p className="text-xs font-medium text-slate-700 mb-1">ピン詳細</p>
                        <p className="text-xs text-slate-600 mb-2 leading-relaxed">{selectedPin.comment}</p>
                        <p className="text-[10px] text-slate-400 mb-3">
                          {selectedPin.author.name} · {formatDate(selectedPin.createdAt)}
                          {selectedPin.resolvedAt && (
                            <span className="ml-1 text-green-600">解決済</span>
                          )}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolvePin(selectedPin)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
                              selectedPin.resolvedAt
                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {selectedPin.resolvedAt ? (
                              <><Circle className="w-3 h-3" /> 未解決に戻す</>
                            ) : (
                              <><CheckCircle className="w-3 h-3" /> 解決済みにする</>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeletePin(selectedPin)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Version history panel */}
                {(showVersions || !isImage(previewDrawing.filePath)) && (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto">
                      {versionsLoading ? (
                        <p className="text-xs text-slate-400 p-3">読み込み中...</p>
                      ) : versions.length === 0 ? (
                        <div className="p-4 text-center">
                          <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">バージョン履歴がありません</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {versions.map((ver, idx) => {
                            const isCurrent = idx === 0
                            const isPreviewingThis = previewFileUrl === ver.fileUrl || (previewFileUrl === null && isCurrent)
                            return (
                              <li key={ver.id} className={`px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${isPreviewingThis ? 'bg-blue-50' : ''}`}
                                onClick={() => setPreviewFileUrl(isCurrent ? null : ver.fileUrl)}>
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-xs font-semibold text-slate-700">v{ver.version}</span>
                                      {isCurrent && (
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">現行版</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">{ver.fileName}</p>
                                    {ver.notes && <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{ver.notes}</p>}
                                    <p className="text-[10px] text-slate-400 mt-0.5">{ver.uploader.name} · {formatDate(ver.createdAt)}</p>
                                  </div>
                                  <a
                                    href={ver.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="p-1 text-slate-300 hover:text-blue-600 flex-shrink-0"
                                    title="別タブで開く"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    {/* Add version form */}
                    <div className="border-t border-slate-200 flex-shrink-0">
                      {!showVersionForm ? (
                        <button
                          onClick={() => setShowVersionForm(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> 新バージョンをアップロード
                        </button>
                      ) : (
                        <div className="p-3 space-y-2">
                          <p className="text-xs font-medium text-slate-700">新バージョンを追加</p>
                          <div
                            onClick={() => versionFileRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                          >
                            {versionFileName ? (
                              <p className="text-xs text-green-600 font-medium truncate">{versionFileName}</p>
                            ) : uploadingVersion ? (
                              <p className="text-xs text-slate-500">アップロード中...</p>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                                <p className="text-xs text-slate-500">クリックしてファイルを選択</p>
                              </>
                            )}
                          </div>
                          <input ref={versionFileRef} type="file" onChange={handleVersionFileUpload} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.ifc,.rvt,.dwg,.dxf,.nwd,.fbx" className="hidden" />
                          <textarea
                            value={versionNotes}
                            onChange={e => setVersionNotes(e.target.value)}
                            rows={2}
                            placeholder="変更内容・メモ（任意）"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddVersion}
                              disabled={!versionFileUrl || savingVersion || uploadingVersion}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-1.5 rounded text-xs font-medium"
                            >
                              {savingVersion ? '保存中...' : '追加'}
                            </button>
                            <button
                              onClick={() => { setShowVersionForm(false); setVersionFileUrl(''); setVersionFileName(''); setVersionNotes('') }}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs font-medium"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* New pin comment input (floats over modal) */}
            {addingPin && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-80 z-10">
                <p className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  コメントを入力
                </p>
                <textarea
                  autoFocus
                  value={newPinComment}
                  onChange={e => setNewPinComment(e.target.value)}
                  rows={3}
                  placeholder="ここにコメントを入力..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreatePin() }
                    if (e.key === 'Escape') { setAddingPin(null); setNewPinComment('') }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreatePin}
                    disabled={!newPinComment.trim() || savingPin}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-1.5 rounded-lg text-xs font-medium"
                  >
                    {savingPin ? '追加中...' : 'ピンを追加'}
                  </button>
                  <button
                    onClick={() => { setAddingPin(null); setNewPinComment('') }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg text-xs font-medium"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{editTarget ? '図面を編集' : '図面を登録'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editTarget && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select
                    value={form.projectId}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">図面名 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 1階平面図"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">図面種別</label>
                <select
                  value={form.drawingType}
                  onChange={e => setForm({ ...form, drawingType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DRAWING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">図面番号</label>
                <input
                  type="text"
                  value={form.drawingNumber}
                  onChange={e => setForm({ ...form, drawingNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: DWG-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!editTarget && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ファイル *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    {uploadedFile ? (
                      <p className="text-sm text-green-600 font-medium">{uploadedFile.name}</p>
                    ) : uploading ? (
                      <p className="text-sm text-slate-500">アップロード中...</p>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">クリックしてファイルを選択</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, 画像, BIM（IFC・RVT・DWG・DXF）対応</p>
                      </>
                    )}
                  </div>
                  {uploadedFile?.isBim && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                      <Box className="w-3.5 h-3.5" />
                      BIMファイルとして登録されます
                    </div>
                  )}
                  <input ref={fileRef} type="file" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.ifc,.rvt,.dwg,.dxf,.nwd,.fbx" className="hidden" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {saving ? '保存中...' : editTarget ? '更新する' : '登録する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
