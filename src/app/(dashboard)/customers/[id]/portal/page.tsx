'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Link2, Copy, Trash2, Plus, ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Project {
  id: string
  name: string
  projectNumber: string
}

interface PortalToken {
  id: string
  token: string
  url: string
  label: string | null
  expiresAt: string | null
  createdAt: string
  project: Project | null
  isExpired: boolean
}

interface CustomerInfo {
  id: string
  name: string
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDatetime(d: string) {
  return new Date(d).toLocaleString('ja-JP', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CustomerPortalPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tokens, setTokens] = useState<PortalToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Generate modal state
  const [showModal, setShowModal] = useState(false)
  const [genForm, setGenForm] = useState({ projectId: '', expiresInDays: '90', label: '' })
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [newToken, setNewToken] = useState<PortalToken | null>(null)

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/portal/token?customerId=${customerId}`)
      if (!res.ok) {
        const j = await res.json()
        setError(j.error || '読み込みに失敗しました')
        return
      }
      const data = await res.json()
      setCustomer(data.customer)
      setProjects(data.projects)
      setTokens(data.tokens)
    } catch {
      setError('読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/portal/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          projectId: genForm.projectId || undefined,
          expiresInDays: genForm.expiresInDays ? Number(genForm.expiresInDays) : undefined,
          label: genForm.label || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || 'URLの生成に失敗しました')
        return
      }
      setNewToken({
        id: data.id,
        token: data.token,
        url: data.url,
        label: null,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        project: projects.find((p) => p.id === (genForm.projectId || undefined)) || null,
        isExpired: false,
      })
      await loadData()
    } catch {
      setGenError('URLの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このポータルURLを無効にしますか？顧客はアクセスできなくなります。')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/portal/token?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id))
        if (newToken?.id === id) setNewToken(null)
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setNewToken(null)
    setGenForm({ projectId: '', expiresInDays: '90', label: '' })
    setGenError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-700 font-medium mb-2">{error}</p>
          <Link href={`/customers/${customerId}`} className="text-blue-600 text-sm hover:underline">
            顧客詳細に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/customers/${customerId}`}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <p className="text-xs text-slate-400">{customer?.name}</p>
            <h1 className="text-xl font-bold text-slate-900">顧客ポータル管理</h1>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
          <Link2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">顧客ポータルについて</p>
            <p className="text-xs text-blue-600 mt-1">
              ポータルURLを発行すると、顧客はログイン不要で工事の進捗・写真・検査結果を確認できます。
              金額情報は表示されません。URLを知っている人は誰でもアクセスできるため、取り扱いにご注意ください。
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-slate-800">
            発行済みURL
            <span className="ml-2 text-sm font-normal text-slate-400">({tokens.length}件)</span>
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            ポータルURLを生成
          </button>
        </div>

        {/* Token List */}
        {tokens.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
            <Link2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">まだポータルURLが発行されていません</p>
            <p className="text-slate-400 text-xs mt-1">「ポータルURLを生成」ボタンから発行してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((t) => (
              <div
                key={t.id}
                className={`bg-white rounded-xl border shadow-sm p-5 ${t.isExpired ? 'border-red-100 opacity-60' : 'border-slate-100'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {t.isExpired ? (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.isExpired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {t.isExpired ? '期限切れ' : '有効'}
                      </span>
                      {t.project && (
                        <span className="text-xs text-slate-500 truncate">
                          {t.project.projectNumber} {t.project.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={t.url}
                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 font-mono truncate focus:outline-none"
                      />
                      <button
                        onClick={() => handleCopy(t.url, t.id)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedId === t.id ? 'コピー済み' : 'コピー'}
                      </button>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        開く
                      </a>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        発行: {formatDatetime(t.createdAt)}
                      </span>
                      {t.expiresAt && (
                        <span className={t.isExpired ? 'text-red-400' : ''}>
                          有効期限: {formatDate(t.expiresAt)}
                        </span>
                      )}
                      {!t.expiresAt && <span>有効期限: なし</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                    title="このURLを無効化"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">ポータルURLを生成</h2>

              {newToken ? (
                <div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <p className="text-sm font-medium text-green-800">URLを生成しました</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">以下のURLを顧客に共有してください</p>
                    <div className="bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 break-all mb-3">
                      {newToken.url}
                    </div>
                    <button
                      onClick={() => handleCopy(newToken.url, newToken.id)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {copiedId === newToken.id ? 'コピーしました' : 'URLをコピー'}
                    </button>
                  </div>
                  {newToken.expiresAt && (
                    <p className="text-xs text-slate-500 text-center mb-4">
                      有効期限: {formatDate(newToken.expiresAt)}
                    </p>
                  )}
                  <button
                    onClick={handleCloseModal}
                    className="w-full text-sm text-slate-600 hover:text-slate-800 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              ) : (
                <form onSubmit={handleGenerate} className="space-y-4">
                  {/* Project Select */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      案件 <span className="text-slate-400 font-normal">（省略すると最新案件が選択されます）</span>
                    </label>
                    <select
                      value={genForm.projectId}
                      onChange={(e) => setGenForm((f) => ({ ...f, projectId: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">最新の案件を自動選択</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.projectNumber} {p.name}
                        </option>
                      ))}
                    </select>
                    {projects.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">この顧客に案件がありません。先に案件を登録してください。</p>
                    )}
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">有効期間</label>
                    <select
                      value={genForm.expiresInDays}
                      onChange={(e) => setGenForm((f) => ({ ...f, expiresInDays: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="7">7日間</option>
                      <option value="30">30日間</option>
                      <option value="90">90日間</option>
                      <option value="180">180日間</option>
                      <option value="365">1年間</option>
                      <option value="">期限なし</option>
                    </select>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      メモ <span className="text-slate-400 font-normal">（任意）</span>
                    </label>
                    <input
                      type="text"
                      value={genForm.label}
                      onChange={(e) => setGenForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="例：初回送付用"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {genError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{genError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 text-sm text-slate-600 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={generating || projects.length === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {generating ? '生成中...' : 'URLを生成'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
