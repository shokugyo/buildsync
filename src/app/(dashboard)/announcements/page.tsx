'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Pin, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Announcement {
  id: string
  title: string
  content?: string | null
  category: string
  isPinned: boolean
  expiresAt?: string | null
  createdAt: string
  author?: { id: string; name: string } | null
}

const CATEGORY_STYLES: Record<string, string> = {
  'お知らせ': 'bg-blue-100 text-blue-700',
  '重要': 'bg-orange-100 text-orange-700',
  '緊急': 'bg-red-100 text-red-700',
}

const defaultForm = {
  title: '',
  content: '',
  category: 'お知らせ',
  isPinned: false,
  expiresAt: '',
}

export default function AnnouncementsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const isManager = role === '管理者' || role === 'マネージャー'

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/announcements')
      .then((r) => r.json())
      .then((data) => {
        setAnnouncements(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const saved: Announcement = await res.json()
        setAnnouncements((prev) => {
          const next = [saved, ...prev]
          return next.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        })
        setShowModal(false)
        setForm(defaultForm)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) setAnnouncements((prev) => prev.filter((a) => a.id !== id))
  }

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <div>
      <Header title="掲示板" />
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-slate-700">社内掲示板</h2>
          {isManager && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              投稿
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">読み込み中...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-slate-400">掲示板の投稿はありません</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                >
                  <div className="flex items-start gap-3">
                    {a.isPinned && <Pin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[a.category] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {a.category}
                        </span>
                        <span className="font-medium text-slate-900 truncate">{a.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{a.author?.name ?? '不明'}</span>
                        <span>{formatDate(a.createdAt)}</span>
                        {a.expiresAt && <span>〜{formatDate(a.expiresAt)}</span>}
                      </div>
                    </div>
                    {isManager && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                        className="p-1 text-slate-300 hover:text-red-500 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </button>
                {expandedId === a.id && a.content && (
                  <div className="px-5 pb-4 pt-0 border-t border-slate-100">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">投稿する</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="お知らせ">お知らせ</option>
                  <option value="重要">重要</option>
                  <option value="緊急">緊急</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">有効期限</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="isPinned" className="text-sm text-slate-700">ピン留めする</label>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {saving ? '投稿中...' : '投稿する'}
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
