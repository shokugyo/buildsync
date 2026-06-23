'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate } from '@/lib/utils'
import {
  Camera, Plus, Filter, X, Upload, ZoomIn, Edit2, Trash2, Eye,
  LayoutTemplate, Download as DownloadIcon, LayoutGrid, Rows3, CheckSquare,
  BookOpen, Download, ChevronDown, ChevronRight, MapPin, Navigation, Tag,
  Sparkles, Tags,
} from 'lucide-react'

interface Photo {
  id: string
  filePath: string
  comment?: string | null
  tags?: string | null
  location?: string | null
  shootingType?: string | null
  blackboardData?: string | null
  latitude?: number | null
  longitude?: number | null
  is360?: boolean
  category?: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  uploader: { name: string }
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

const SHOOTING_TYPES = ['着工前', '工事中', '完了', '検査', 'その他']
const DEFAULT_CATEGORIES = ['一般', '着工前', '基礎工事', '躯体工事', '仕上げ工事', '設備工事', '完了', '検査', 'その他']

const AI_TAG_SUGGESTIONS = [
  '完了箇所', '安全管理', '材料搬入', '基礎工事', '内装工事', '外構工事',
  '検査前', '不具合・指摘', '足場設置', '電気工事'
]

const PHOTO_TAG_CATEGORIES = [
  '完了箇所', '安全管理', '材料搬入', '施工前', '施工中', '施工後',
  '不具合', '検査', '看板・標識'
]

function getAiTagSuggestions() {
  return [...AI_TAG_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2))
}

const defaultForm = {
  projectId: '',
  comment: '',
  location: '',
  shootingType: '工事中',
  tags: '',
  blackboardData: '',
  latitude: '',
  longitude: '',
  is360: false,
  category: '一般',
}

type ViewMode = 'group' | 'grid' | 'category'
type SortOrder = 'desc' | 'asc'

function Photo360Viewer({
  photo,
  onClose,
  onEdit,
  onDelete,
}: {
  photo: Photo
  onClose: () => void
  onEdit: (p: Photo) => void
  onDelete: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
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

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 select-none">
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="flex items-center gap-2">
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">360°</span>
          <span className="text-white text-sm font-medium">360°写真 - ドラッグして回転</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(photo)}
            className="text-white hover:text-slate-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
          >
            <Edit2 className="w-4 h-4 inline mr-1" />編集
          </button>
          <button
            onClick={() => { if (confirm('この写真を削除しますか？')) onDelete(photo.id) }}
            className="text-white hover:text-red-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
          >
            <Trash2 className="w-4 h-4 inline mr-1" />削除
          </button>
          <button onClick={onClose} className="text-white hover:text-slate-300 ml-2">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
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
        {photo.latitude != null && photo.longitude != null && (
          <a
            href={`https://maps.google.com/?q=${photo.latitude},${photo.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
          >
            <MapPin className="w-3.5 h-3.5" />
            {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)} - Google Maps
          </a>
        )}
        <span className="text-xs text-white/40 ml-auto">{photo.uploader?.name} · {new Date(photo.createdAt).toLocaleDateString('ja-JP')}</span>
      </div>
    </div>
  )
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Photo | null>(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('group')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState(defaultForm)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blackboardPhoto, setBlackboardPhoto] = useState<Photo | null>(null)
  const [photo360, setPhoto360] = useState<Photo | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // AIタグ提案
  const [aiTagTarget, setAiTagTarget] = useState<Photo | null>(null)
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([])
  const [aiTagLoading, setAiTagLoading] = useState(false)
  const [aiSelectedTags, setAiSelectedTags] = useState<Set<string>>(new Set())

  // バルクタグ付け
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [bulkTagLoading, setBulkTagLoading] = useState(false)

  // タグフィルター
  const [tagFilter, setTagFilter] = useState('')

  const [showBlackboard, setShowBlackboard] = useState(false)
  const [blackboard, setBlackboard] = useState({
    constructionName: '',
    workType: '',
    location: '',
    workContent: '',
    company: '',
    shootingDate: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [bbKoushu, setBbKoushu] = useState('')
  const [bbSekouJokyo, setBbSekouJokyo] = useState('')
  const [bbBui, setBbBui] = useState('')
  const [bbTachiaisha, setBbTachiaisha] = useState('')
  const [bbBikou, setBbBikou] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/photos').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/photos/categories').then((r) => r.json()),
    ]).then(([p, pr, cats]) => {
      setPhotos(Array.isArray(p) ? p : [])
      setProjects(Array.isArray(pr) ? pr : [])
      setCategories(Array.isArray(cats) ? cats : [])
      setLoading(false)
    })
  }, [])

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]))

  const filtered = photos
    .filter((p) => {
      if (projectFilter && p.project?.projectNumber !== projectFilter) return false
      if (typeFilter && p.shootingType !== typeFilter) return false
      if (categoryFilter && (p.category || '一般') !== categoryFilter) return false
      if (tagFilter) {
        const tags = (p.tags || '').split(',').map((t) => t.trim())
        if (!tags.includes(tagFilter)) return false
      }
      return true
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt).getTime()
      const db = new Date(b.createdAt).getTime()
      return sortOrder === 'desc' ? db - da : da - db
    })

  const groupedByType = (() => {
    const groups: Record<string, Photo[]> = {}
    filtered.forEach((p) => {
      const key = p.shootingType || 'その他'
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    return groups
  })()

  const groupedByCategory = (() => {
    const groups: Record<string, Photo[]> = {}
    filtered.forEach((p) => {
      const key = p.category || '一般'
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    return groups
  })()

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectGroup = (groupKey: string, groupPhotos: Photo[]) => {
    const groupIds = groupPhotos.map((p) => p.id)
    const allSelected = groupIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) groupIds.forEach((id) => next.delete(id))
      else groupIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const openAiTagModal = (photo: Photo) => {
    setAiTagTarget(photo)
    setAiSelectedTags(new Set())
    setAiTagLoading(true)
    setAiSuggestedTags([])
    // モックAI処理（500ms後に提案を返す）
    setTimeout(() => {
      setAiSuggestedTags(getAiTagSuggestions())
      setAiTagLoading(false)
    }, 500)
  }

  const applyAiTags = async () => {
    if (!aiTagTarget || aiSelectedTags.size === 0) return
    const existingTags = (aiTagTarget.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
    const newTags = Array.from(aiSelectedTags)
    const merged = Array.from(new Set([...existingTags, ...newTags])).join(', ')
    const res = await fetch(`/api/photos/${aiTagTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: merged }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    }
    setAiTagTarget(null)
    setAiSelectedTags(new Set())
  }

  const handleBulkTag = async () => {
    if (!bulkTagInput.trim() || selectedIds.size === 0) return
    setBulkTagLoading(true)
    const newTags = bulkTagInput.split(',').map((t) => t.trim()).filter(Boolean)
    await Promise.all(
      Array.from(selectedIds).map(async (id) => {
        const photo = photos.find((p) => p.id === id)
        if (!photo) return
        const existingTags = (photo.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
        const merged = Array.from(new Set([...existingTags, ...newTags])).join(', ')
        const res = await fetch(`/api/photos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: merged }),
        })
        if (res.ok) {
          const updated = await res.json()
          setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        }
      })
    )
    setBulkTagLoading(false)
    setShowBulkTagModal(false)
    setBulkTagInput('')
    setSelectedIds(new Set())
  }

  const toggleCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openAlbumPrint = () => {
    const ids = Array.from(selectedIds).join(',')
    window.open(`/photos/album/print?ids=${ids}`, '_blank')
  }

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size}枚の写真を削除しますか？`)) return
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map((id) => fetch(`/api/photos/${id}`, { method: 'DELETE' })))
    setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)))
    setSelectedIds(new Set())
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadError('')
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadError('')
    setShowBlackboard(false)
    setBlackboard({
      constructionName: '',
      workType: '',
      location: '',
      workContent: '',
      company: '',
      shootingDate: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setShowModal(true)
  }

  const openEdit = (photo: Photo) => {
    setEditTarget(photo)
    setForm({
      projectId: '',
      comment: photo.comment || '',
      location: photo.location || '',
      shootingType: photo.shootingType || '工事中',
      tags: photo.tags || '',
      blackboardData: photo.blackboardData || '',
      latitude: photo.latitude != null ? String(photo.latitude) : '',
      longitude: photo.longitude != null ? String(photo.longitude) : '',
      is360: photo.is360 ?? false,
      category: photo.category || '一般',
    })
    if (photo.blackboardData) {
      try {
        const bd = JSON.parse(photo.blackboardData)
        setShowBlackboard(true)
        setBlackboard({
          constructionName: bd.constructionName || '',
          workType: bd.workType || '',
          location: bd.location || '',
          workContent: bd.workContent || '',
          company: bd.company || '',
          shootingDate: bd.shootingDate || new Date().toISOString().slice(0, 10),
          notes: bd.notes || '',
        })
      } catch {
        setShowBlackboard(false)
        setBlackboard({ constructionName: '', workType: '', location: '', workContent: '', company: '', shootingDate: new Date().toISOString().slice(0, 10), notes: '' })
      }
    } else {
      setShowBlackboard(false)
      setBlackboard({ constructionName: '', workType: '', location: '', workContent: '', company: '', shootingDate: new Date().toISOString().slice(0, 10), notes: '' })
    }
    setSelectedFile(null)
    setPreviewUrl(photo.filePath && !photo.filePath.includes('placeholder') ? photo.filePath : null)
    setUploadError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget && !form.projectId) { setUploadError('案件を選択してください'); return }
    setUploading(true)
    setUploadError('')

    const bbAnyFilled = bbKoushu || bbSekouJokyo || bbBui || bbTachiaisha || bbBikou
    const blackboardData = bbAnyFilled
      ? JSON.stringify({ koushu: bbKoushu, sekouJokyo: bbSekouJokyo, bui: bbBui, tachiaisha: bbTachiaisha, bikou: bbBikou })
      : null

    try {
      if (editTarget) {
        const res = await fetch(`/api/photos/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment: form.comment,
            location: form.location,
            shootingType: form.shootingType,
            tags: form.tags,
            blackboardData,
            latitude: form.latitude !== '' ? parseFloat(form.latitude as string) : null,
            longitude: form.longitude !== '' ? parseFloat(form.longitude as string) : null,
            is360: form.is360,
            category: form.category,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          closeModal()
        }
        return
      }

      let filePath = `/uploads/photos/placeholder-${Date.now()}.jpg`

      if (selectedFile) {
        const fd = new FormData()
        fd.append('file', selectedFile)
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!upRes.ok) {
          const err = await upRes.json()
          setUploadError(err.error || 'アップロードに失敗しました')
          return
        }
        const { filePath: fp } = await upRes.json()
        filePath = fp
      }

      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          filePath,
          blackboardData,
          latitude: form.latitude !== '' ? parseFloat(form.latitude as string) : null,
          longitude: form.longitude !== '' ? parseFloat(form.longitude as string) : null,
        }),
      })
      if (res.ok) {
        const photo = await res.json()
        setPhotos((prev) => [photo, ...prev])
        closeModal()
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この写真を削除しますか？')) return
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      if (previewPhoto?.id === id) setPreviewPhoto(null)
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadError('')
    setForm(defaultForm)
    setBbKoushu(''); setBbSekouJokyo(''); setBbBui(''); setBbTachiaisha(''); setBbBikou('')
  }

  const getGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('このブラウザでは位置情報の取得に対応していません')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(pos.coords.latitude.toFixed(6)),
          longitude: String(pos.coords.longitude.toFixed(6)),
        }))
        setGpsLoading(false)
      },
      () => {
        alert('位置情報の取得に失敗しました')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const openBlackboard = (photo: Photo) => {
    setPreviewPhoto(null)
    setBlackboardPhoto(photo)
    setTimeout(() => drawBlackboard(photo), 100)
  }

  const drawBlackboard = (photo: Photo) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const bw = Math.min(img.width * 0.38, 360)
      const bh = bw * 0.55
      const bx = img.width - bw - 12
      const by = img.height - bh - 12

      ctx.fillStyle = 'rgba(0, 60, 0, 0.88)'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, bh, 6)
      ctx.fill()
      ctx.stroke()

      const pad = bw * 0.05
      const fontSize = Math.max(bw * 0.065, 11)
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'top'

      const rows = [
        { label: '工事件名', value: photo.project?.name || '' },
        { label: '撮影種別', value: photo.shootingType || '' },
        { label: '撮影場所', value: photo.location || '' },
        { label: '撮影日時', value: new Date(photo.createdAt).toLocaleDateString('ja-JP') },
        { label: '撮影者', value: photo.uploader?.name || '' },
      ]

      const rowH = (bh - pad * 2) / rows.length
      rows.forEach((row, i) => {
        const y = by + pad + i * rowH
        ctx.fillStyle = '#aaffaa'
        ctx.font = `${fontSize * 0.75}px sans-serif`
        ctx.fillText(row.label, bx + pad, y)
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${fontSize}px sans-serif`
        const maxW = bw - pad * 2
        let text = row.value
        while (text.length > 0 && ctx.measureText(text).width > maxW) text = text.slice(0, -1)
        ctx.fillText(text, bx + pad, y + fontSize * 0.75 + 2)
      })
    }
    img.onerror = () => {
      canvas.width = 640
      canvas.height = 480
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, 640, 480)
      ctx.fillStyle = '#ffffff'
      ctx.font = '18px sans-serif'
      ctx.fillText('画像を読み込めませんでした', 20, 240)
    }
    img.src = photo.filePath
  }

  const downloadBlackboard = () => {
    const canvas = canvasRef.current
    if (!canvas || !blackboardPhoto) return
    const link = document.createElement('a')
    link.download = `blackboard_${blackboardPhoto.id}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
  }

  const CategoryBadge = ({ category }: { category?: string | null }) => {
    const cat = category || '一般'
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded leading-none">
        <Tag className="w-2.5 h-2.5" />{cat}
      </span>
    )
  }

  const PhotoThumbnail = ({ photo, size = 'normal' }: { photo: Photo; size?: 'normal' | 'compact' }) => {
    const isSelected = selectedIds.has(photo.id)
    const showCheckbox = selectedIds.size > 0 || isSelected
    const dimW = size === 'compact' ? 'w-[90px]' : 'w-[100px]'
    const dimH = size === 'compact' ? 'h-[68px]' : 'h-[75px]'

    const handleClick = () => {
      if (photo.is360) {
        setPhoto360(photo)
      } else {
        setPreviewPhoto(photo)
      }
    }

    return (
      <div className="flex-shrink-0 relative group">
        <div
          className={`${dimW} ${dimH} relative cursor-pointer rounded overflow-hidden border-2 ${isSelected ? 'border-blue-500' : 'border-transparent'}`}
          onClick={handleClick}
        >
          {photo.filePath && !photo.filePath.includes('placeholder') ? (
            <img src={photo.filePath} alt={photo.comment || '工事写真'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <Camera className="w-6 h-6 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          {photo.is360 && (
            <div className="absolute bottom-1 right-1 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">
              360°
            </div>
          )}
          {photo.category && photo.category !== '一般' && (
            <div className="absolute top-1 right-1 bg-purple-600/80 text-white text-[8px] font-medium px-1 py-0.5 rounded leading-none">
              {photo.category}
            </div>
          )}
        </div>
        <div
          className={`absolute top-1 left-1 z-10 transition-opacity ${showCheckbox ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id) }}
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-slate-400'}`}>
            {isSelected && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 truncate" style={{ width: size === 'compact' ? 90 : 100 }}>
          {new Date(photo.createdAt).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
        </p>
      </div>
    )
  }

  const GroupSection = ({ groupKey, groupPhotos, labelPrefix }: { groupKey: string; groupPhotos: Photo[]; labelPrefix: string }) => {
    const isCollapsed = collapsedGroups.has(groupKey)
    const allSelected = groupPhotos.every((p) => selectedIds.has(p.id))
    const someSelected = groupPhotos.some((p) => selectedIds.has(p.id))
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 ${allSelected ? 'bg-blue-500 border-blue-500' : someSelected ? 'bg-blue-200 border-blue-400' : 'bg-white border-slate-400'}`}
            onClick={() => toggleSelectGroup(groupKey, groupPhotos)}
          >
            {allSelected && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
            {someSelected && !allSelected && <span className="text-blue-600 text-[10px] leading-none font-bold">-</span>}
          </div>
          <button
            className="flex items-center gap-2 flex-1 text-left"
            onClick={() => toggleCollapse(groupKey)}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            <span className="text-sm font-semibold text-slate-700">{labelPrefix}: {groupKey}</span>
            <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{groupPhotos.length}枚</span>
          </button>
        </div>
        {!isCollapsed && (
          <div className="p-3">
            {groupPhotos.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">写真がありません</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {groupPhotos.map((photo) => (
                  <PhotoThumbnail key={photo.id} photo={photo} size="normal" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <Header title="写真管理" />
      <div className="p-6">
        {/* View Mode Tabs */}
        <div className="flex items-center border-b border-slate-200 mb-4">
          <button
            onClick={() => setViewMode('group')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'group' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Rows3 className="w-4 h-4" />グループ表示
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'grid' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid className="w-4 h-4" />グリッド
          </button>
          <button
            onClick={() => setViewMode('category')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'category' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Tag className="w-4 h-4" />カテゴリ別
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての案件</option>
              {projects.map((p) => (
                <option key={p.id} value={p.projectNumber}>{p.projectNumber} - {p.name}</option>
              ))}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての種別</option>
            {SHOOTING_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべてのカテゴリ</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">タグで絞り込み</option>
            {PHOTO_TAG_CATEGORIES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">新着順</option>
            <option value="asc">古い順</option>
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const project = projects.find((p) => p.projectNumber === projectFilter)
                const url = project ? `/photos/print?projectId=${project.id}` : '/photos/print'
                window.open(url, '_blank')
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" /> 写真帳出力
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> 写真を追加
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{selectedIds.size}枚選択中</span>
            <button
              onClick={openAlbumPrint}
              className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg"
            >
              <BookOpen className="w-4 h-4" />写真台帳を作成
            </button>
            <button
              onClick={() => setShowBulkTagModal(true)}
              className="flex items-center gap-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg"
            >
              <Tags className="w-4 h-4" />一括タグ付け
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />削除
            </button>
            <button
              onClick={clearSelection}
              className="ml-auto text-sm text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              キャンセル
            </button>
          </div>
        )}

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件</p>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">写真がありません</p>
          </div>
        ) : viewMode === 'group' ? (
          <div className="space-y-4">
            {Object.entries(groupedByType).map(([groupKey, groupPhotos]) => (
              <GroupSection key={groupKey} groupKey={groupKey} groupPhotos={groupPhotos} labelPrefix="撮影種別" />
            ))}
          </div>
        ) : viewMode === 'category' ? (
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([groupKey, groupPhotos]) => (
              <GroupSection key={groupKey} groupKey={groupKey} groupPhotos={groupPhotos} labelPrefix="カテゴリ" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap gap-2">
              {filtered.map((photo) => (
                <PhotoThumbnail key={photo.id} photo={photo} size="compact" />
              ))}
            </div>
          </div>
        )}

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setPreviewPhoto(null)}
          >
            <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-10 right-0 flex items-center gap-2">
                <Link
                  href={`/photos/${previewPhoto.id}`}
                  className="text-white hover:text-blue-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                >
                  <Eye className="w-4 h-4 inline mr-1" />詳細
                </Link>
                <button
                  onClick={() => openBlackboard(previewPhoto)}
                  className="text-white hover:text-green-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                >
                  <LayoutTemplate className="w-4 h-4 inline mr-1" />電子黒板
                </button>
                <button
                  onClick={() => { openAiTagModal(previewPhoto); setPreviewPhoto(null) }}
                  className="text-white hover:text-purple-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                >
                  <Sparkles className="w-4 h-4 inline mr-1" />AIタグ
                </button>
                <button
                  onClick={() => { openEdit(previewPhoto); setPreviewPhoto(null) }}
                  className="text-white hover:text-slate-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />編集
                </button>
                <button
                  onClick={() => { handleDelete(previewPhoto.id); setPreviewPhoto(null) }}
                  className="text-white hover:text-red-300 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />削除
                </button>
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="text-white hover:text-slate-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="bg-slate-900 flex items-center justify-center min-h-64">
                  {previewPhoto.filePath && !previewPhoto.filePath.includes('placeholder') ? (
                    <img
                      src={previewPhoto.filePath}
                      alt={previewPhoto.comment || '工事写真'}
                      className="max-h-[70vh] max-w-full object-contain"
                    />
                  ) : (
                    <div className="py-20 flex flex-col items-center gap-3 text-slate-600">
                      <Camera className="w-16 h-16" />
                      <p className="text-sm">写真ファイルなし</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {previewPhoto.shootingType && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {previewPhoto.shootingType}
                      </span>
                    )}
                    {previewPhoto.is360 && (
                      <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded font-bold">
                        360°
                      </span>
                    )}
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" />{previewPhoto.category || '一般'}
                    </span>
                    <span className="text-xs text-slate-500">{previewPhoto.project?.projectNumber}</span>
                  </div>
                  {previewPhoto.comment && <p className="text-sm text-slate-700 mb-1">{previewPhoto.comment}</p>}
                  {previewPhoto.location && <p className="text-xs text-slate-500 mb-1">場所: {previewPhoto.location}</p>}
                  {previewPhoto.tags && <p className="text-xs text-slate-400 mb-1">タグ: {previewPhoto.tags}</p>}
                  {previewPhoto.latitude != null && previewPhoto.longitude != null && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span className="text-xs text-slate-500">
                        {previewPhoto.latitude.toFixed(6)}, {previewPhoto.longitude.toFixed(6)}
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${previewPhoto.latitude},${previewPhoto.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline ml-1"
                      >
                        Google Maps
                      </a>
                    </div>
                  )}
                  {previewPhoto.blackboardData && (() => {
                    try {
                      const bd = JSON.parse(previewPhoto.blackboardData)
                      return (
                        <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                          <p className="text-xs font-semibold text-slate-600 mb-1">黒板情報</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500">
                            {bd.koushu && <span>工種: {bd.koushu}</span>}
                            {bd.sekouJokyo && <span>施工状況: {bd.sekouJokyo}</span>}
                            {bd.bui && <span>部位: {bd.bui}</span>}
                            {bd.tachiaisha && <span>立会者: {bd.tachiaisha}</span>}
                            {bd.bikou && <span className="col-span-2">備考: {bd.bikou}</span>}
                          </div>
                        </div>
                      )
                    } catch { return null }
                  })()}
                  <p className="text-xs text-slate-400 mt-1">
                    {previewPhoto.uploader?.name} · {formatDate(previewPhoto.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">{editTarget ? '写真を編集' : '写真を追加'}</h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editTarget && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">写真ファイル</label>
                    <div
                      className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      {previewUrl ? (
                        <div className="relative">
                          <img src={previewUrl} alt="プレビュー" className="max-h-40 mx-auto rounded object-contain" />
                          <p className="text-xs text-slate-500 mt-2">{selectedFile?.name}</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">クリックして写真を選択</p>
                          <p className="text-xs text-slate-400 mt-1">JPEG、PNG、GIF、WebP（最大10MB）</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}

                {editTarget && previewUrl && !previewUrl.startsWith('blob:') && (
                  <div className="rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="現在の写真" className="max-h-40 w-full object-contain bg-slate-100" />
                  </div>
                )}

                {uploadError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{uploadError}</p>
                )}

                {!editTarget && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">案件 <span className="text-red-500">*</span></label>
                    <select
                      value={form.projectId}
                      onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">選択してください</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
                  <select
                    value={form.category as string}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">撮影種別</label>
                  <select
                    value={form.shootingType}
                    onChange={(e) => setForm({ ...form, shootingType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SHOOTING_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">撮影場所</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 1階玄関、外壁西面"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">コメント</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="施工状況など"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">タグ</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="カンマ区切りでタグを入力"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">GPS座標（任意）</label>
                    <button
                      type="button"
                      onClick={getGpsLocation}
                      disabled={gpsLoading}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      {gpsLoading ? '取得中...' : '現在地を取得'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={form.latitude as string}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="緯度 (例: 35.6895)"
                    />
                    <input
                      type="number"
                      step="any"
                      value={form.longitude as string}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="経度 (例: 139.6917)"
                    />
                  </div>
                  {form.latitude && form.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${form.latitude},${form.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />Google Mapsで確認
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is360"
                    checked={form.is360 as boolean}
                    onChange={(e) => setForm({ ...form, is360: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                  />
                  <label htmlFor="is360" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">360°</span>
                    360度写真として登録する
                  </label>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-3">電子黒板情報（任意）</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">工種</label>
                      <input type="text" value={bbKoushu} onChange={(e) => setBbKoushu(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 鉄筋工事" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">施工状況</label>
                      <input type="text" value={bbSekouJokyo} onChange={(e) => setBbSekouJokyo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 配筋検査" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">部位</label>
                      <input type="text" value={bbBui} onChange={(e) => setBbBui(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 1階基礎" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">立会者</label>
                      <input type="text" value={bbTachiaisha} onChange={(e) => setBbTachiaisha(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 田中 太郎" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">備考</label>
                      <input type="text" value={bbBikou} onChange={(e) => setBbBikou(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="備考" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    {uploading ? 'アップロード中...' : editTarget ? '更新する' : '追加する'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
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

      {/* AIタグ提案モーダル */}
      {aiTagTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-slate-900">AIタグ自動提案</h2>
              </div>
              <button onClick={() => setAiTagTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">AIが写真の内容を分析し、適切なタグを提案します。</p>
            {aiTagLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center text-slate-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="text-sm">AIが分析中...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-700">提案タグ（クリックで選択）:</p>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestedTags.map((tag) => {
                    const selected = aiSelectedTags.has(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => setAiSelectedTags((prev) => {
                          const next = new Set(prev)
                          if (next.has(tag)) next.delete(tag)
                          else next.add(tag)
                          return next
                        })}
                        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${selected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'}`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={applyAiTags}
                    disabled={aiSelectedTags.size === 0}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    選択したタグを適用 ({aiSelectedTags.size})
                  </button>
                  <button
                    onClick={() => setAiTagTarget(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* バルクタグ付けモーダル */}
      {showBulkTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-slate-900">一括タグ付け</h2>
              </div>
              <button onClick={() => setShowBulkTagModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-1">{selectedIds.size}枚の写真にタグを追加します。</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">タグ（カンマ区切り）</label>
                <input
                  type="text"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="完了箇所, 安全管理"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">定義済みタグから選択:</p>
                <div className="flex flex-wrap gap-1.5">
                  {PHOTO_TAG_CATEGORIES.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = bulkTagInput.split(',').map((t) => t.trim()).filter(Boolean)
                        if (!current.includes(tag)) {
                          setBulkTagInput(current.length > 0 ? `${bulkTagInput}, ${tag}` : tag)
                        }
                      }}
                      className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 border border-slate-200 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleBulkTag}
                  disabled={!bulkTagInput.trim() || bulkTagLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {bulkTagLoading ? '処理中...' : 'タグを追加'}
                </button>
                <button
                  onClick={() => setShowBulkTagModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {photo360 && (
        <Photo360Viewer photo={photo360} onClose={() => setPhoto360(null)} onEdit={(p) => { setPhoto360(null); openEdit(p) }} onDelete={(id) => { handleDelete(id); setPhoto360(null) }} />
      )}

      {blackboardPhoto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">電子黒板プレビュー</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadBlackboard}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <DownloadIcon className="w-4 h-4" /> 画像を保存
                </button>
                <button
                  onClick={() => setBlackboardPhoto(null)}
                  className="text-white hover:text-slate-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[75vh] object-contain rounded"
                style={{ display: 'block' }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              電子黒板情報（工事件名・撮影種別・場所・日時・撮影者）がオーバーレイされています
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
