'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Edit2, Trash2, ChevronRight, Printer } from 'lucide-react'

interface WorkOrder {
  id: string
  orderNumber: string
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: string | null
  completedAt?: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  assignee?: { id: string; name: string } | null
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

interface User {
  id: string
  name: string
}

const STATUS_LIST = ['未着手', '進行中', '完了'] as const
const PRIORITY_LIST = ['低', '中', '高'] as const

const STATUS_COLORS: Record<string, string> = {
  未着手: 'bg-slate-100 text-slate-600',
  進行中: 'bg-blue-100 text-blue-700',
  完了: 'bg-green-100 text-green-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  低: 'bg-slate-100 text-slate-500',
  中: 'bg-yellow-100 text-yellow-700',
  高: 'bg-red-100 text-red-600',
}

const STATUS_NEXT: Record<string, string> = {
  未着手: '進行中',
  進行中: '完了',
}

const defaultForm = {
  projectId: '',
  title: '',
  description: '',
  assignedTo: '',
  dueDate: '',
  priority: '中',
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchWorkOrders = async (status?: string) => {
    const url = status ? `/api/work-orders?status=${encodeURIComponent(status)}` : '/api/work-orders'
    const data = await fetch(url).then((r) => r.json())
    setWorkOrders(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/work-orders').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([orders, projs, usrs]) => {
      setWorkOrders(Array.isArray(orders) ? orders : [])
      setProjects(Array.isArray(projs) ? projs : [])
      setUsers(Array.isArray(usrs) ? usrs : [])
      setLoading(false)
    })
  }, [])

  const handleStatusFilterChange = (s: string) => {
    setStatusFilter(s)
    fetchWorkOrders(s || undefined)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (wo: WorkOrder) => {
    setEditTarget(wo)
    setForm({
      projectId: wo.project.id,
      title: wo.title,
      description: wo.description || '',
      assignedTo: wo.assignee?.id || '',
      dueDate: wo.dueDate ? wo.dueDate.slice(0, 10) : '',
      priority: wo.priority,
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo || null,
        description: form.description || null,
      }
      const url = editTarget ? `/api/work-orders/${editTarget.id}` : '/api/work-orders'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editTarget) {
          setWorkOrders((prev) => prev.map((w) => (w.id === saved.id ? saved : w)))
        } else {
          setWorkOrders((prev) => [saved, ...prev])
        }
        setShowModal(false)
      } else {
        const d = await res.json()
        setError(d.error || '保存に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この作業指示書を削除しますか？')) return
    const res = await fetch(`/api/work-orders/${id}`, { method: 'DELETE' })
    if (res.ok) setWorkOrders((prev) => prev.filter((w) => w.id !== id))
  }

  const handleStatusAdvance = async (wo: WorkOrder) => {
    const next = STATUS_NEXT[wo.status]
    if (!next) return
    const res = await fetch(`/api/work-orders/${wo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      const updated = await res.json()
      setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
    }
  }

  const counts = {
    未着手: workOrders.filter((w) => w.status === '未着手').length,
    進行中: workOrders.filter((w) => w.status === '進行中').length,
    完了: workOrders.filter((w) => w.status === '完了').length,
  }

  return (
    <div>
      <Header title="作業指示書" />
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">未着手</p>
            <p className="text-2xl font-bold text-slate-700">{counts['未着手']}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">進行中</p>
            <p className="text-2xl font-bold text-blue-600">{counts['進行中']}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">完了</p>
            <p className="text-2xl font-bold text-green-600">{counts['完了']}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">ステータス：</span>
            {['', ...STATUS_LIST].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusFilterChange(s)}
                className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {s || '全て'}
              </button>
            ))}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 作業指示書を作成
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : workOrders.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <p className="text-slate-500">作業指示書がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">指示番号</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">タイトル</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">案件</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">担当者</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">優先度</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">ステータス</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">期日</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{wo.orderNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 max-w-xs">
                        <div className="truncate">{wo.title}</div>
                        {wo.description && (
                          <div className="text-xs text-slate-400 truncate mt-0.5">{wo.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">
                        <div>{wo.project.name}</div>
                        <div className="text-slate-400">{wo.project.projectNumber}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{wo.assignee?.name || '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[wo.priority] || ''}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[wo.status] || ''}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString('ja-JP') : '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {STATUS_NEXT[wo.status] && (
                            <button
                              onClick={() => handleStatusAdvance(wo)}
                              title={`→ ${STATUS_NEXT[wo.status]}`}
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/work-orders/print?id=${wo.id}`, '_blank')}
                            title="印刷"
                            className="p-1 text-slate-400 hover:text-slate-700"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(wo)} className="p-1 text-slate-400 hover:text-blue-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(wo.id)} className="p-1 text-slate-400 hover:text-red-600">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editTarget ? '作業指示書を編集' : '作業指示書を作成'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件を選択</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">タイトル *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未割り当て</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">優先度</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITY_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">期日</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
              )}
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
                  {saving ? '保存中...' : editTarget ? '更新する' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
