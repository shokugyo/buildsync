'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import {
  ArrowLeft, Edit2, Save, X, Trash2, MapPin, Tag, Camera,
  Calendar, User, Building2, Globe, CheckSquare
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
  uploader: { id: string; name: string }
}

const SHOOTING_TYPES = ['着工前', '工事中', '完了', '検査', 'その他']
const CATEGORIES = ['一般', '着工前', '基礎工事', '躯体工事', '仕上げ工事', '設備工事', '完了', '検査', 'その他']

export default function PhotoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Photo>>({})
  const [blackboard, setBlackboard] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/photos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPhoto(data)
        setForm(data)
        try {
          setBlackboard(data.blackboardData ? JSON.parse(data.blackboardData) : {})
        } catch {
          setBlackboard({})
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const startEdit = () => {
    setForm({ ...photo })
    try {
      setBlackboard(photo?.blackboardData ? JSON.parse(photo.blackboardData) : {})
    } catch {
      setBlackboard({})
    }
    setEditing(true)
  }

  const cancelEdit = () => {
    setForm({ ...photo })
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: form.comment,
          location: form.location,
          tags: form.tags,
          shootingType: form.shootingType,
          category: form.category,
          blackboardData: Object.keys(blackboard).length > 0 ? JSON.stringify(blackboard) : null,
        }),
      })
      const updated = await res.json()
      setPhoto(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この写真を削除しますか？')) return
    await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    router.push('/photos')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="p-8 text-center text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!photo) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="p-8 text-center text-slate-500">写真が見つかりません</div>
      </div>
    )
  }

  let parsedBlackboard: Record<string, string> = {}
  try {
    parsedBlackboard = photo.blackboardData ? JSON.parse(photo.blackboardData) : {}
  } catch {
    parsedBlackboard = {}
  }

  const tagList = photo.tags ? photo.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/photos" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Camera className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-bold text-slate-800">写真詳細</h1>
          <div className="ml-auto flex items-center gap-2">
            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                <Edit2 className="w-4 h-4" /> 編集
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" /> キャンセル
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Photo */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <img
              src={photo.filePath}
              alt={photo.comment || '工事写真'}
              className="w-full object-contain max-h-96 bg-slate-100"
            />
            {photo.is360 && (
              <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> 360度写真
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> 案件
                  </p>
                  <Link
                    href={`/projects/${photo.project.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    [{photo.project.projectNumber}] {photo.project.name}
                  </Link>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> 撮影者
                  </p>
                  <p className="font-medium text-slate-800">{photo.uploader.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> 撮影日時
                  </p>
                  <p className="font-medium text-slate-800">
                    {new Date(photo.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                    <Camera className="w-3 h-3" /> 撮影種別
                  </p>
                  {editing ? (
                    <select
                      value={form.shootingType || ''}
                      onChange={(e) => setForm({ ...form, shootingType: e.target.value })}
                      className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                    >
                      <option value="">未選択</option>
                      {SHOOTING_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  ) : (
                    <p className="font-medium text-slate-800">{photo.shootingType || '-'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-1">カテゴリ</p>
                  {editing ? (
                    <select
                      value={form.category || '一般'}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                    >
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {photo.category || '一般'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> 撮影箇所
                </p>
                {editing ? (
                  <input
                    type="text"
                    value={form.location || ''}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                  />
                ) : (
                  <p className="text-slate-800">{photo.location || '-'}</p>
                )}
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1">コメント</p>
                {editing ? (
                  <textarea
                    value={form.comment || ''}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    rows={3}
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                  />
                ) : (
                  <p className="text-slate-800 whitespace-pre-wrap">{photo.comment || '-'}</p>
                )}
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> タグ
                </p>
                {editing ? (
                  <input
                    type="text"
                    value={form.tags || ''}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="カンマ区切りで入力"
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                  />
                ) : tagList.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tagList.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">-</p>
                )}
              </div>

              {photo.latitude && photo.longitude && (
                <div>
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> GPS座標
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${photo.latitude},${photo.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                  </a>
                </div>
              )}
            </div>

            {/* Blackboard data */}
            {(Object.keys(parsedBlackboard).length > 0 || editing) && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-slate-500" /> 電子黒板情報
                </h3>
                {editing ? (
                  <div className="space-y-2">
                    {['工事名', '工種', '測点・場所', '施工内容', '施工会社', '撮影日', '備考'].map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 w-24 shrink-0">{key}</label>
                        <input
                          type="text"
                          value={blackboard[key] || ''}
                          onChange={(e) => setBlackboard({ ...blackboard, [key]: e.target.value })}
                          className="border border-slate-200 rounded px-2 py-1 text-sm flex-1"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(parsedBlackboard).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-slate-400 text-xs">{k}</p>
                        <p className="text-slate-800">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
