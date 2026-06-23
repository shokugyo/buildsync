'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { Award, Plus, Trash2, Search, AlertTriangle, X } from 'lucide-react'

interface WorkerCertification {
  id: string
  workerName: string
  certName: string
  certNumber: string | null
  issuedAt: string | null
  expiresAt: string | null
  issuedBy: string | null
  createdAt: string
}

function getExpiryStatus(expiresAt: string | null): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiresAt) return 'none'
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'expired'
  if (diffDays <= 90) return 'soon'
  return 'ok'
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<WorkerCertification[]>([])
  const [loading, setLoading] = useState(true)
  const [workerNameFilter, setWorkerNameFilter] = useState('')
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    workerName: '',
    certName: '',
    certNumber: '',
    issuedAt: '',
    expiresAt: '',
    issuedBy: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchCertifications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (workerNameFilter) params.set('workerName', workerNameFilter)
    if (expiringSoonOnly) params.set('expiringSoon', 'true')
    const res = await fetch(`/api/certifications?${params}`)
    if (res.ok) {
      setCertifications(await res.json())
    }
    setLoading(false)
  }, [workerNameFilter, expiringSoonOnly])

  useEffect(() => {
    fetchCertifications()
  }, [fetchCertifications])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerName: form.workerName,
        certName: form.certName,
        certNumber: form.certNumber || null,
        issuedAt: form.issuedAt || null,
        expiresAt: form.expiresAt || null,
        issuedBy: form.issuedBy || null,
      }),
    })
    if (res.ok) {
      setShowModal(false)
      setForm({ workerName: '', certName: '', certNumber: '', issuedAt: '', expiresAt: '', issuedBy: '' })
      fetchCertifications()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この資格証明を削除しますか？')) return
    setDeleting(id)
    const res = await fetch(`/api/certifications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCertifications((prev) => prev.filter((c) => c.id !== id))
    }
    setDeleting(null)
  }

  const expiryBadge = (expiresAt: string | null) => {
    const status = getExpiryStatus(expiresAt)
    if (status === 'none') return <span className="text-slate-400">-</span>
    const classes = {
      expired: 'text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs font-medium',
      soon: 'text-orange-700 bg-orange-100 px-2 py-0.5 rounded text-xs font-medium',
      ok: 'text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-medium',
      none: '',
    }
    return (
      <span className={classes[status]}>
        {formatDate(expiresAt)}
        {status === 'expired' && ' (期限切れ)'}
        {status === 'soon' && ' (期限切れ間近)'}
      </span>
    )
  }

  return (
    <div>
      <Header title="作業員資格証明管理" />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="作業員名で検索"
              value={workerNameFilter}
              onChange={(e) => setWorkerNameFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={expiringSoonOnly}
              onChange={(e) => setExpiringSoonOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-slate-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              期限切れ間近のみ表示（90日以内）
            </span>
          </label>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors ml-auto"
          >
            <Plus className="w-4 h-4" />
            資格を追加
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">読み込み中...</div>
        ) : certifications.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">資格証明がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">作業員名</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">資格名</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">資格番号</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">取得日</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">有効期限</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">発行機関</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">状態</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((cert) => {
                  const status = getExpiryStatus(cert.expiresAt)
                  const rowBg =
                    status === 'expired'
                      ? 'bg-red-50'
                      : status === 'soon'
                      ? 'bg-orange-50'
                      : ''
                  return (
                    <tr key={cert.id} className={`border-b border-slate-50 hover:opacity-90 transition-colors ${rowBg}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{cert.workerName}</td>
                      <td className="px-4 py-3 text-slate-700">{cert.certName}</td>
                      <td className="px-4 py-3 text-slate-600">{cert.certNumber || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(cert.issuedAt)}</td>
                      <td className="px-4 py-3">{expiryBadge(cert.expiresAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{cert.issuedBy || '-'}</td>
                      <td className="px-4 py-3">
                        {status === 'expired' && (
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">期限切れ</span>
                        )}
                        {status === 'soon' && (
                          <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded">期限切れ間近</span>
                        )}
                        {(status === 'ok' || status === 'none') && (
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">有効</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(cert.id)}
                          disabled={deleting === cert.id}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">資格を追加</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  作業員名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.workerName}
                  onChange={(e) => setForm({ ...form, workerName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  資格名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.certName}
                  onChange={(e) => setForm({ ...form, certName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">資格番号</label>
                <input
                  type="text"
                  value={form.certNumber}
                  onChange={(e) => setForm({ ...form, certNumber: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">取得日</label>
                  <input
                    type="date"
                    value={form.issuedAt}
                    onChange={(e) => setForm({ ...form, issuedAt: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">有効期限</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">発行機関</label>
                <input
                  type="text"
                  value={form.issuedBy}
                  onChange={(e) => setForm({ ...form, issuedBy: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
