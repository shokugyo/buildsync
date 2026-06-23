'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { BookOpen, Camera, Filter, Printer, ChevronDown } from 'lucide-react'

interface Photo {
  id: string
  filePath: string
  comment?: string | null
  tags?: string | null
  location?: string | null
  shootingType?: string | null
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

const CATEGORIES = ['すべて', '一般', '着工前', '基礎工事', '躯体工事', '仕上げ工事', '設備工事', '完了', '検査', 'その他']

export default function PhotoAlbumPage() {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('すべて')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedProject) params.set('projectId', selectedProject)
    fetch(`/api/photos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPhotos(Array.isArray(data) ? data : [])
        setSelectedIds(new Set())
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [selectedProject])

  const filteredPhotos = useMemo(() => {
    if (selectedCategory === 'すべて') return photos
    return photos.filter((p) => (p.category || '一般') === selectedCategory)
  }, [photos, selectedCategory])

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, Photo[]> = {}
    for (const photo of filteredPhotos) {
      const date = new Date(photo.createdAt).toLocaleDateString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
      if (!map[date]) map[date] = []
      map[date].push(photo)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredPhotos])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPhotos.map((p) => p.id)))
    }
  }

  const handlePrint = () => {
    const ids = selectedIds.size > 0
      ? Array.from(selectedIds)
      : filteredPhotos.map((p) => p.id)
    if (ids.length === 0) return
    window.open(`/photos/album/print?ids=${ids.join(',')}`, '_blank')
  }

  const allSelected = filteredPhotos.length > 0 && selectedIds.size === filteredPhotos.length

  return (
    <div>
      <Header title="工事写真台帳" />
      <div className="p-6 space-y-5">
        {/* Title bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">工事写真台帳</h2>
          </div>
          <button
            onClick={handlePrint}
            disabled={filteredPhotos.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            {selectedIds.size > 0 ? `選択した${selectedIds.size}枚を印刷` : '台帳を印刷'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-[200px]">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="flex-1 focus:outline-none text-slate-700 bg-transparent"
            >
              <option value="">すべての工事</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredPhotos.length > 0 && (
            <button
              onClick={selectAll}
              className="ml-auto text-xs text-blue-600 hover:underline"
            >
              {allSelected ? '選択解除' : 'すべて選択'}
            </button>
          )}
        </div>

        {/* Photo count */}
        {!loading && (
          <p className="text-xs text-slate-500">
            {filteredPhotos.length}枚の写真
            {selectedIds.size > 0 && ` (${selectedIds.size}枚選択中)`}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400 text-sm">読み込み中...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Camera className="w-12 h-12 text-slate-200" />
            <p className="text-slate-400 text-sm">写真がありません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, datePhotos]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {date}
                  </span>
                  <span className="text-xs text-slate-400">{datePhotos.length}枚</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {datePhotos.map((photo) => {
                    const selected = selectedIds.has(photo.id)
                    return (
                      <div
                        key={photo.id}
                        onClick={() => toggleSelect(photo.id)}
                        className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group ${
                          selected
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        {/* Photo image */}
                        <div className="bg-slate-100 aspect-square">
                          {photo.filePath && !photo.filePath.includes('placeholder') ? (
                            <img
                              src={photo.filePath}
                              alt={photo.comment || '工事写真'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Selection indicator */}
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selected
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white/80 border-slate-300 opacity-0 group-hover:opacity-100'
                        }`}>
                          {selected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Info overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          {photo.category && photo.category !== '一般' && (
                            <span className="block text-xs text-white/80 truncate">{photo.category}</span>
                          )}
                          {photo.comment && (
                            <span className="block text-xs text-white truncate">{photo.comment}</span>
                          )}
                          <span className="block text-xs text-white/60 truncate">
                            {photo.project.name}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
        }
      `}</style>
    </div>
  )
}
