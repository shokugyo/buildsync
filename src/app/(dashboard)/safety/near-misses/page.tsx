'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { AlertTriangle, Plus, Edit2, Trash2, X, ChevronLeft, FileText, Eye } from 'lucide-react'
import Link from 'next/link'

interface NearMiss {
  id: string
  projectId: string
  reporterId: string
  occurredAt: string
  location?: string | null
  situation: string
  cause?: string | null
  countermeasure?: string | null
  severity: string
  status: string
  companyId: string
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  reporter: { id: string; name: string }
}

const SEVERITY_COLORS: Record<string, string> = {
  '低': 'bg-green-100 text-green-700',
  '中': 'bg-yellow-100 text-yellow-700',
  '高': 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  '報告済': 'bg-blue-100 text-blue-700',
  '対応中': 'bg-yellow-100 text-yellow-700',
  '対応完了': 'bg-green-100 text-green-700',
}

const STATUSES = ['報告済', '対応中', '対応完了']
const SEVERITIES = ['低', '中', '高']

const emptyForm = () => ({
  projectId: '',
  occurredAt: new Date().toISOString().slice(0, 16),
  location: '',
  situation: '',
  cause: '',
  countermeasure: '',
  severity: '低',
})

export default function NearMissPage() {
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<NearMiss | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/near-misses').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([n, p]) => {
      setNearMisses(Array.isArray(n) ? n : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const filtered = nearMisses.filter((n) => {
    if (projectFilter && n.projectId !== projectFilter) return false
    if (severityFilter && n.severity !== severityFilter) return false
    if (statusFilter && n.status !== statusFilter) return false
    return true
  })

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (n: NearMiss) => {
    setEditTarget(n)
    setForm({
      projectId: n.projectId,
      occurredAt: n.occurredAt.slice(0, 16),
      location: n.location || '',
      situation: n.situation,
      cause: n.cause || '',
      countermeasure: n.countermeasure || '',
      severity: n.severity,
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        projectId: form.projectId,
        occurredAt: form.occurredAt,
        location: form.location || null,
        situation: form.situation,
        cause: form.cause || null,
        countermeasure: form.countermeasure || null,
        severity: form.severity,
      }

      let res: Response
      if (editTarget) {
        res = await fetch(`/api/near-misses/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/near-misses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await res.json()
        if (editTarget) {
          setNearMisses((prev) => prev.map((n) => n.id === editTarget.id ? data : n))
        } else {
          setNearMisses((prev) => [data, ...prev])
        }
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このヒヤリハット報告を削除しますか？')) return
    const res = await fetch(`/api/near-misses/${id}`, { method: 'DELETE' })
    if (res.ok) setNearMisses((prev) => prev.filter((n) => n.id !== id))
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id)
    try {
      const res = await fetch(`/api/near-misses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setNearMisses((prev) => prev.map((n) => n.id === id ? { ...n, status } : n))
      }
    } finally {
      setUpdatingStatus(null)
    }
  }

  return (
    <div>
      <Header title="ヒヤリハット報告" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/safety" className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> 安全管理
          </Link>
        </div>

        {/* Filters & Action */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての案件</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての重大度</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての状態</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={openAdd}
            className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> ヒヤリハットを報告
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件</p>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">ヒヤリハット報告がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 text-left">発生日時</th>
                    <th className="px-4 py-3 text-left">案件</th>
                    <th className="px-4 py-3 text-left">場所</th>
                    <th className="px-4 py-3 text-left">状況</th>
                    <th className="px-4 py-3 text-left">重大度</th>
                    <th className="px-4 py-3 text-left">状態</th>
                    <th className="px-4 py-3 text-left">報告者</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                        {new Date(n.occurredAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="text-slate-900">{n.project?.name}</p>
                        <p className="text-xs text-slate-400">{n.project?.projectNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{n.location || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-xs">
                        <p className="truncate">{n.situation}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[n.severity] || 'bg-slate-100 text-slate-600'}`}>
                          {n.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={n.status}
                          onChange={(e) => updateStatus(n.id, e.target.value)}
                          disabled={updatingStatus === n.id}
                          className={`text-xs px-2 py-1 rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 ${STATUS_COLORS[n.status] || 'bg-slate-100 text-slate-600'} border-transparent`}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{n.reporter?.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/safety/near-misses/${n.id}`} className="p-1 text-slate-400 hover:text-blue-600" title="詳細">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => window.open(`/safety/near-misses/${n.id}/print`, '_blank')}
                            className="p-1 text-slate-400 hover:text-green-600"
                            title="帳票出力"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(n)} className="p-1 text-slate-400 hover:text-blue-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(n.id)} className="p-1 text-slate-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editTarget ? 'ヒヤリハットを編集' : 'ヒヤリハットを報告'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">発生日時</label>
                  <input
                    type="datetime-local"
                    value={form.occurredAt}
                    onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">重大度</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">場所</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="発生場所"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">状況説明 *</label>
                <textarea
                  value={form.situation}
                  onChange={(e) => setForm({ ...form, situation: e.target.value })}
                  required
                  rows={3}
                  placeholder="何が起きたかを具体的に記述してください"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">原因</label>
                <textarea
                  value={form.cause}
                  onChange={(e) => setForm({ ...form, cause: e.target.value })}
                  rows={2}
                  placeholder="発生原因の分析"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">対策</label>
                <textarea
                  value={form.countermeasure}
                  onChange={(e) => setForm({ ...form, countermeasure: e.target.value })}
                  rows={2}
                  placeholder="再発防止のための対策"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '保存中...' : editTarget ? '更新する' : '報告する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
