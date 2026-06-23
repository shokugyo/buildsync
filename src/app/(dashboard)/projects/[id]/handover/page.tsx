'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, BookOpen, CheckCircle2, Circle, Printer,
  Plus, X, Upload, AlertTriangle, ExternalLink, Trash2
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface CompletionDoc {
  id: string
  category: string
  name: string
  fileUrl: string
  fileName: string
  notes: string | null
  createdAt: string
  uploader: { id: string; name: string }
}

const REQUIRED_CATEGORIES = [
  { key: '竣工図面', label: '竣工図面', description: '完成した建物・設備の図面一式' },
  { key: '検査記録', label: '検査記録', description: '各種検査の記録・証明書類' },
  { key: '保証書', label: '保証書', description: '施工・設備等の保証書' },
  { key: '取扱説明書', label: '取扱説明書', description: '設備機器の取扱説明書' },
  { key: 'その他', label: 'その他', description: 'その他の引渡し書類' },
]

interface AddDocFormState {
  category: string
  name: string
  fileUrl: string
  fileName: string
  notes: string
}

const DEFAULT_FORM: AddDocFormState = {
  category: '竣工図面',
  name: '',
  fileUrl: '',
  fileName: '',
  notes: '',
}

export default function HandoverPage() {
  const params = useParams()
  const projectId = params.id as string

  const [docs, setDocs] = useState<CompletionDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddDocFormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchDocs = () => {
    fetch(`/api/projects/${projectId}/completion-docs`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDocs(data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDocs()
  }, [projectId])

  const categoryMap = docs.reduce<Record<string, CompletionDoc[]>>((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = []
    acc[doc.category].push(doc)
    return acc
  }, {})

  const preparedCount = REQUIRED_CATEGORIES.filter(cat => (categoryMap[cat.key]?.length ?? 0) > 0).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.fileUrl || !form.fileName) {
      setError('名称、ファイルURL、ファイル名は必須です')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/completion-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '追加に失敗しました')
      }
      const newDoc = await res.json()
      setDocs(prev => [newDoc, ...prev])
      setForm(DEFAULT_FORM)
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message || '追加に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('この書類を削除しますか？')) return
    setDeleting(docId)
    try {
      const res = await fetch(`/api/projects/${projectId}/completion-docs/${docId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== docId))
      }
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              案件詳細に戻る
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-slate-900">引渡し書類</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/handover/print`}
              target="_blank"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              印刷
            </Link>
            <button
              onClick={() => { setShowAddForm(true); setError(null) }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              書類を追加
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Summary card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">書類準備状況</h3>
            <span className="text-xs text-slate-500">
              {preparedCount} / {REQUIRED_CATEGORIES.length} カテゴリ完備
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full mb-4">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(preparedCount / REQUIRED_CATEGORIES.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REQUIRED_CATEGORIES.map((cat) => {
              const count = categoryMap[cat.key]?.length ?? 0
              const ready = count > 0
              return (
                <div
                  key={cat.key}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                    ready
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {ready ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="font-medium">{cat.label}</span>
                  {ready && <span className="ml-auto text-green-600">{count}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Add form */}
        {showAddForm && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                書類を追加
              </h3>
              <button
                onClick={() => { setShowAddForm(false); setError(null) }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">カテゴリ *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {REQUIRED_CATEGORIES.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">書類名 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：竣工図面一式"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ファイルURL *</label>
                  <input
                    type="url"
                    value={form.fileUrl}
                    onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ファイル名 *</label>
                  <input
                    type="text"
                    value={form.fileName}
                    onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))}
                    placeholder="例：竣工図面.pdf"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">備考</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="補足事項があれば..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setError(null) }}
                  className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {submitting ? '追加中...' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Document list by category */}
        {REQUIRED_CATEGORIES.map((cat) => {
          const catDocs = categoryMap[cat.key] ?? []
          const ready = catDocs.length > 0
          return (
            <div key={cat.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between ${ready ? 'bg-green-50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  {ready ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-900">{cat.label}</span>
                  <span className="text-xs text-slate-500">— {cat.description}</span>
                </div>
                {catDocs.length > 0 && (
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    {catDocs.length} 件
                  </span>
                )}
              </div>

              {catDocs.length === 0 ? (
                <div className="px-5 py-4 text-sm text-slate-400 italic">
                  未登録
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {catDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500 truncate">{doc.fileName}</span>
                          <span className="text-xs text-slate-400">
                            {formatDate(doc.createdAt)} · {doc.uploader.name}
                          </span>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-slate-500 mt-0.5">{doc.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors"
                          title="ファイルを開く"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleting === doc.id}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Print link */}
        <div className="text-center pb-4">
          <Link
            href={`/projects/${projectId}/handover/print`}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Printer className="w-4 h-4" />
            工事完了引渡書を印刷・PDF出力
          </Link>
        </div>
      </div>
    </div>
  )
}
