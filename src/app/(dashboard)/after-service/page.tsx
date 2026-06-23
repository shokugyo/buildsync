'use client'

import { useState, useEffect, useCallback } from 'react'
import { Headphones, Plus, X, Filter } from 'lucide-react'

type Customer = { id: string; name: string }
type Project = { id: string; name: string; projectNumber: string }
type AfterServiceRecord = {
  id: string
  customerId: string
  customer: { id: string; name: string }
  projectId: string | null
  project: { id: string; name: string; projectNumber: string } | null
  reportedAt: string
  content: string
  response: string | null
  respondedAt: string | null
  status: string
  companyId: string
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = ['未対応', '対応中', '完了']

const statusColor: Record<string, string> = {
  '未対応': 'bg-red-100 text-red-700',
  '対応中': 'bg-yellow-100 text-yellow-700',
  '完了': 'bg-green-100 text-green-700',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP')
}

function thisMonth(d: string): boolean {
  const now = new Date()
  const date = new Date(d)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export default function AfterServicePage() {
  const [records, setRecords] = useState<AfterServiceRecord[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<AfterServiceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    customerId: '',
    projectId: '',
    reportedAt: '',
    content: '',
    response: '',
    respondedAt: '',
    status: '未対応',
  })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterCustomer) params.set('customerId', filterCustomer)
    const res = await fetch(`/api/after-service?${params}`)
    if (res.ok) setRecords(await res.json())
    setLoading(false)
  }, [filterStatus, filterCustomer])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    fetch('/api/customers?limit=200')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCustomers(Array.isArray(d) ? d : d.customers || []))
    fetch('/api/projects?limit=200')
      .then(r => r.ok ? r.json() : [])
      .then(d => setProjects(Array.isArray(d) ? d : d.projects || []))
  }, [])

  function openAdd() {
    setEditTarget(null)
    setForm({
      customerId: '',
      projectId: '',
      reportedAt: new Date().toISOString().slice(0, 10),
      content: '',
      response: '',
      respondedAt: '',
      status: '未対応',
    })
    setShowModal(true)
  }

  function openEdit(rec: AfterServiceRecord) {
    setEditTarget(rec)
    setForm({
      customerId: rec.customerId,
      projectId: rec.projectId ?? '',
      reportedAt: rec.reportedAt.slice(0, 10),
      content: rec.content,
      response: rec.response ?? '',
      respondedAt: rec.respondedAt ? rec.respondedAt.slice(0, 10) : '',
      status: rec.status,
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      customerId: form.customerId,
      projectId: form.projectId || null,
      reportedAt: form.reportedAt,
      content: form.content,
      response: form.response || null,
      respondedAt: form.respondedAt || null,
      status: form.status,
    }
    if (editTarget) {
      await fetch(`/api/after-service/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/after-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setShowModal(false)
    fetchRecords()
  }

  const unresolvedCount = records.filter(r => r.status === '未対応').length
  const inProgressCount = records.filter(r => r.status === '対応中').length
  const completedThisMonth = records.filter(r => r.status === '完了' && thisMonth(r.respondedAt ?? r.updatedAt)).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">アフターサービス管理</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          依頼を追加
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500 mb-1">未対応</p>
          <p className="text-3xl font-bold text-red-600">{unresolvedCount}</p>
          <p className="text-xs text-gray-400 mt-1">件</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500 mb-1">対応中</p>
          <p className="text-3xl font-bold text-yellow-600">{inProgressCount}</p>
          <p className="text-xs text-gray-400 mt-1">件</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500 mb-1">今月完了</p>
          <p className="text-3xl font-bold text-green-600">{completedThisMonth}</p>
          <p className="text-xs text-gray-400 mt-1">件</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全ステータス</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterCustomer}
          onChange={e => setFilterCustomer(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全顧客</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['報告日', '顧客', '案件', '内容', 'ステータス', '対応内容', '対応完了日', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">読み込み中...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">データがありません</td></tr>
            ) : records.map(rec => (
              <tr key={rec.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(rec.reportedAt)}</td>
                <td className="px-4 py-3 font-medium">{rec.customer?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {rec.project ? `${rec.project.projectNumber} ${rec.project.name}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-xs">
                  <span className="line-clamp-2">{rec.content}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[rec.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {rec.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs">
                  <span className="line-clamp-2">{rec.response ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(rec.respondedAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(rec)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editTarget ? '依頼を編集' : '依頼を追加'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顧客 *</label>
                <select
                  required
                  value={form.customerId}
                  onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">顧客を選択</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">関連案件</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">なし</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">報告日 *</label>
                  <input
                    required
                    type="date"
                    value={form.reportedAt}
                    onChange={e => setForm(f => ({ ...f, reportedAt: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
                <textarea
                  required
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={3}
                  placeholder="依頼・クレーム内容を入力"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対応内容</label>
                <textarea
                  value={form.response}
                  onChange={e => setForm(f => ({ ...f, response: e.target.value }))}
                  rows={2}
                  placeholder="対応内容を入力"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対応完了日</label>
                <input
                  type="date"
                  value={form.respondedAt}
                  onChange={e => setForm(f => ({ ...f, respondedAt: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {editTarget ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
