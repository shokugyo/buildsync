'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate } from '@/lib/utils'
import { AlertTriangle, Search, Edit2, Trash2, X, Plus, Printer, CheckCircle, RotateCcw, ClipboardCheck, Camera, Download } from 'lucide-react'
import Link from 'next/link'

interface Defect {
  id: string
  content: string
  location?: string | null
  status: string
  dueDate?: string | null
  createdAt: string
  photoIds?: string | null
  beforePhotoIds?: string | null
  afterPhotoIds?: string | null
  project: { id: string; name: string; projectNumber: string }
  assignee?: { id: string; name: string } | null
}

interface Photo {
  id: string
  filePath: string
  comment?: string | null
  tags?: string | null
}

const DEFECT_STATUSES = ['未対応', '対応中', '確認待ち', '確認済', '差戻し', '再是正中']

const STATUS_COLORS: Record<string, string> = {
  '未対応': 'bg-red-100 text-red-700',
  '対応中': 'bg-yellow-100 text-yellow-700',
  '確認待ち': 'bg-blue-100 text-blue-700',
  '確認済': 'bg-green-100 text-green-700',
  '差戻し': 'bg-orange-100 text-orange-700',
  '再是正中': 'bg-purple-100 text-purple-700',
}

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  // Edit modal
  const [editTarget, setEditTarget] = useState<Defect | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ content: '', location: '', assigneeId: '', dueDate: '', status: '未対応' })
  const [editSelectedPhotoIds, setEditSelectedPhotoIds] = useState<string[]>([])
  const [editBeforePhotoIds, setEditBeforePhotoIds] = useState<string[]>([])
  const [editAfterPhotoIds, setEditAfterPhotoIds] = useState<string[]>([])

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ projectId: '', content: '', location: '', assigneeId: '', dueDate: '', status: '未対応' })
  const [addSelectedPhotoIds, setAddSelectedPhotoIds] = useState<string[]>([])
  const [addBeforePhotoIds, setAddBeforePhotoIds] = useState<string[]>([])
  const [addAfterPhotoIds, setAddAfterPhotoIds] = useState<string[]>([])

  // Photos
  const [projectPhotos, setProjectPhotos] = useState<Photo[]>([])

  // 是正報告 modal (SC-504)
  const [reportTarget, setReportTarget] = useState<Defect | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportNote, setReportNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [transitioning, setTransitioning] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/defects').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([d, p, u]) => {
      setDefects(Array.isArray(d) ? d : [])
      setProjects(Array.isArray(p) ? p : [])
      setUsers(Array.isArray(u) ? u : [])
      setLoading(false)
    })
  }, [])

  const filtered = defects.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false
    if (projectFilter && d.project?.id !== projectFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return d.content.toLowerCase().includes(q) || (d.location || '').toLowerCase().includes(q)
    }
    return true
  })

  const fetchProjectPhotos = async (projectId: string) => {
    if (!projectId) { setProjectPhotos([]); return }
    const res = await fetch(`/api/photos?projectId=${projectId}`)
    const data = await res.json()
    setProjectPhotos(Array.isArray(data) ? data : [])
  }

  const openEdit = (d: Defect) => {
    setEditTarget(d)
    setForm({
      content: d.content,
      location: d.location || '',
      assigneeId: d.assignee?.id || '',
      dueDate: d.dueDate ? d.dueDate.split('T')[0] : '',
      status: d.status,
    })
    setEditSelectedPhotoIds(d.photoIds ? d.photoIds.split(',').filter(Boolean) : [])
    setEditBeforePhotoIds(d.beforePhotoIds ? d.beforePhotoIds.split(',').filter(Boolean) : [])
    setEditAfterPhotoIds(d.afterPhotoIds ? d.afterPhotoIds.split(',').filter(Boolean) : [])
    fetchProjectPhotos(d.project.id)
    setShowModal(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/defects/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: form.content,
          location: form.location || null,
          assigneeId: form.assigneeId || null,
          dueDate: form.dueDate || null,
          status: form.status,
          photoIds: editSelectedPhotoIds.length > 0 ? editSelectedPhotoIds.join(',') : null,
          beforePhotoIds: editBeforePhotoIds.length > 0 ? editBeforePhotoIds.join(',') : null,
          afterPhotoIds: editAfterPhotoIds.length > 0 ? editAfterPhotoIds.join(',') : null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setDefects((prev) => prev.map((d) => d.id === editTarget.id ? { ...d, ...updated } : d))
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: addForm.projectId,
          content: addForm.content,
          location: addForm.location || null,
          assigneeId: addForm.assigneeId || null,
          dueDate: addForm.dueDate || null,
          status: addForm.status,
          photoIds: addSelectedPhotoIds.length > 0 ? addSelectedPhotoIds.join(',') : null,
          beforePhotoIds: addBeforePhotoIds.length > 0 ? addBeforePhotoIds.join(',') : null,
          afterPhotoIds: addAfterPhotoIds.length > 0 ? addAfterPhotoIds.join(',') : null,
        }),
      })
      if (res.ok) {
        const refreshed = await fetch('/api/defects').then((r) => r.json())
        setDefects(Array.isArray(refreshed) ? refreshed : [])
        setShowAddModal(false)
        setAddForm({ projectId: '', content: '', location: '', assigneeId: '', dueDate: '', status: '未対応' })
        setAddSelectedPhotoIds([])
        setProjectPhotos([])
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この是正事項を削除しますか？')) return
    const res = await fetch(`/api/defects/${id}`, { method: 'DELETE' })
    if (res.ok) setDefects((prev) => prev.filter((d) => d.id !== id))
  }

  const quickStatus = async (id: string, status: string) => {
    setTransitioning(id)
    try {
      const res = await fetch(`/api/defects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setDefects((prev) => prev.map((d) => d.id === id ? { ...d, status } : d))
      }
    } finally {
      setTransitioning(null)
    }
  }

  const openReport = (d: Defect) => {
    setReportTarget(d)
    setReportNote('')
    setShowReportModal(true)
  }

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/defects/${reportTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '確認待ち' }),
      })
      if (res.ok) {
        setDefects((prev) => prev.map((d) => d.id === reportTarget.id ? { ...d, status: '確認待ち' } : d))
        setShowReportModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const statusCounts = DEFECT_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = defects.filter((d) => d.status === s).length
    return acc
  }, {})

  const overdue = defects.filter((d) =>
    d.dueDate && new Date(d.dueDate) < new Date() && !['確認待ち', '確認済'].includes(d.status)
  ).length

  return (
    <div>
      <Header title="是正管理" />
      <div className="p-6">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">総件数</p>
            <p className="text-2xl font-bold text-slate-900">{defects.length}</p>
          </div>
          {DEFECT_STATUSES.map((s) => (
            <div key={s} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs text-slate-500 mb-1">{s}</p>
              <p className={`text-2xl font-bold ${
                s === '未対応' ? 'text-red-600'
                : s === '対応中' ? 'text-yellow-600'
                : s === '確認待ち' ? 'text-blue-600'
                : s === '確認済' ? 'text-green-600'
                : s === '差戻し' ? 'text-orange-600'
                : s === '再是正中' ? 'text-purple-600'
                : 'text-slate-600'
              }`}>
                {statusCounts[s] || 0}
              </p>
            </div>
          ))}
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-4">
            <p className="text-xs text-red-500 mb-1">期限超過</p>
            <p className="text-2xl font-bold text-red-600">{overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="内容・場所で検索"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">すべての状態</option>
            {DEFECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">すべての案件</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/api/export/defects${projectFilter ? `?projectId=${projectFilter}` : ''}`}
              className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
              <Download className="w-4 h-4" /> CSV出力
            </Link>
            <Link href={`/defects/print${projectFilter ? `?projectId=${projectFilter}` : ''}`} target="_blank"
              className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
              <Printer className="w-4 h-4" /> PDF出力
            </Link>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> 是正を追加
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件</p>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">是正事項がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 text-left">内容</th>
                    <th className="px-4 py-3 text-left">案件</th>
                    <th className="px-4 py-3 text-left">場所</th>
                    <th className="px-4 py-3 text-left">担当者</th>
                    <th className="px-4 py-3 text-left">期限</th>
                    <th className="px-4 py-3 text-left">状態</th>
                    <th className="px-4 py-3 text-left">アクション</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((d) => {
                    const isOverdue = d.dueDate && new Date(d.dueDate) < new Date() && !['確認待ち', '確認済'].includes(d.status)
                    const busy = transitioning === d.id
                    return (
                      <tr key={d.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3 text-sm text-slate-900 max-w-xs">
                          <p className="truncate font-medium">{d.content}</p>
                          {d.photoIds && d.photoIds.split(',').filter(Boolean).length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-slate-400 mt-0.5">
                              <Camera className="w-3 h-3" /> {d.photoIds.split(',').filter(Boolean).length}枚
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="text-slate-900">{d.project?.name}</p>
                          <p className="text-xs text-slate-400">{d.project?.projectNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{d.location || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{d.assignee?.name || '-'}</td>
                        <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                          {formatDate(d.dueDate)}
                          {isOverdue && <span className="ml-1 text-xs">⚠</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || 'bg-slate-100 text-slate-600'}`}>
                            {d.status}
                          </span>
                        </td>
                        {/* SC-504 是正ワークフロー */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.status === '未対応' && (
                              <button
                                onClick={() => quickStatus(d.id, '対応中')}
                                disabled={busy}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-md transition-colors disabled:opacity-50"
                              >
                                <ClipboardCheck className="w-3 h-3" /> 対応着手
                              </button>
                            )}
                            {d.status === '対応中' && (
                              <button
                                onClick={() => openReport(d)}
                                disabled={busy}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors disabled:opacity-50"
                              >
                                <ClipboardCheck className="w-3 h-3" /> 完了報告
                              </button>
                            )}
                            {d.status === '確認待ち' && (
                              <>
                                <button
                                  onClick={() => quickStatus(d.id, '確認済')}
                                  disabled={busy}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-md transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3 h-3" /> 確認済
                                </button>
                                <button
                                  onClick={() => quickStatus(d.id, '差戻し')}
                                  disabled={busy}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md transition-colors disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3 h-3" /> 差戻し
                                </button>
                              </>
                            )}
                            {d.status === '差戻し' && (
                              <button
                                onClick={() => quickStatus(d.id, '再是正中')}
                                disabled={busy}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className="w-3 h-3" /> 再是正開始
                              </button>
                            )}
                            {d.status === '再是正中' && (
                              <button
                                onClick={() => openReport(d)}
                                disabled={busy}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors disabled:opacity-50"
                              >
                                <ClipboardCheck className="w-3 h-3" /> 再完了報告
                              </button>
                            )}
                            {d.status === '確認済' && (
                              <span className="text-xs text-slate-400">完了</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(d)} className="p-1 text-slate-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(d.id)} className="p-1 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 是正報告 Modal (SC-504) */}
      {showReportModal && reportTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">是正報告を提出</h2>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">指摘内容</p>
              <p className="text-sm text-slate-900 font-medium">{reportTarget.content}</p>
              {reportTarget.location && <p className="text-xs text-slate-500 mt-1">場所: {reportTarget.location}</p>}
            </div>
            <form onSubmit={handleReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">是正内容・対応報告</label>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  rows={4}
                  placeholder="実施した是正作業の内容を記入してください"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                報告後、ステータスが「確認待ち」に変更されます。監督者が確認後「確認済」になります。
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  キャンセル
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '提出中...' : '是正報告を提出'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">是正事項を編集</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容 *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">場所</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">未割当</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">期限</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DEFECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {projectPhotos.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">
                      <Camera className="inline w-4 h-4 mr-1" />指摘写真（是正前）
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-red-200 rounded-lg p-2 bg-red-50">
                      {projectPhotos.map((photo) => {
                        const checked = editBeforePhotoIds.includes(photo.id)
                        return (
                          <label key={photo.id} className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${checked ? 'border-red-500' : 'border-transparent'}`}>
                            <input type="checkbox" className="sr-only" checked={checked}
                              onChange={() => setEditBeforePhotoIds(prev => checked ? prev.filter(id => id !== photo.id) : [...prev, photo.id])} />
                            <img src={photo.filePath} alt={photo.comment || ''} className="w-full h-14 object-cover" />
                            {checked && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-red-600" /></div>}
                          </label>
                        )
                      })}
                    </div>
                    {editBeforePhotoIds.length > 0 && <p className="text-xs text-red-600 mt-1">{editBeforePhotoIds.length}枚選択中</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      <Camera className="inline w-4 h-4 mr-1" />是正後写真
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-green-200 rounded-lg p-2 bg-green-50">
                      {projectPhotos.map((photo) => {
                        const checked = editAfterPhotoIds.includes(photo.id)
                        return (
                          <label key={photo.id} className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${checked ? 'border-green-500' : 'border-transparent'}`}>
                            <input type="checkbox" className="sr-only" checked={checked}
                              onChange={() => setEditAfterPhotoIds(prev => checked ? prev.filter(id => id !== photo.id) : [...prev, photo.id])} />
                            <img src={photo.filePath} alt={photo.comment || ''} className="w-full h-14 object-cover" />
                            {checked && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div>}
                          </label>
                        )
                      })}
                    </div>
                    {editAfterPhotoIds.length > 0 && <p className="text-xs text-green-600 mt-1">{editAfterPhotoIds.length}枚選択中</p>}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">キャンセル</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '更新中...' : '更新する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">是正事項を追加</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                <select value={addForm.projectId} onChange={(e) => { setAddForm({ ...addForm, projectId: e.target.value }); setAddSelectedPhotoIds([]); fetchProjectPhotos(e.target.value) }} required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">選択してください</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容 *</label>
                <textarea value={addForm.content} onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
                  required rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">場所</label>
                  <input type="text" value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <select value={addForm.assigneeId} onChange={(e) => setAddForm({ ...addForm, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">未割当</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">期限</label>
                  <input type="date" value={addForm.dueDate} onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                  <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DEFECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {projectPhotos.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">
                      <Camera className="inline w-4 h-4 mr-1" />指摘写真（是正前）
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-red-200 rounded-lg p-2 bg-red-50">
                      {projectPhotos.map((photo) => {
                        const checked = addBeforePhotoIds.includes(photo.id)
                        return (
                          <label key={photo.id} className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${checked ? 'border-red-500' : 'border-transparent'}`}>
                            <input type="checkbox" className="sr-only" checked={checked}
                              onChange={() => setAddBeforePhotoIds(prev => checked ? prev.filter(id => id !== photo.id) : [...prev, photo.id])} />
                            <img src={photo.filePath} alt={photo.comment || ''} className="w-full h-14 object-cover" />
                            {checked && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-red-600" /></div>}
                          </label>
                        )
                      })}
                    </div>
                    {addBeforePhotoIds.length > 0 && <p className="text-xs text-red-600 mt-1">{addBeforePhotoIds.length}枚選択中</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      <Camera className="inline w-4 h-4 mr-1" />是正後写真
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-green-200 rounded-lg p-2 bg-green-50">
                      {projectPhotos.map((photo) => {
                        const checked = addAfterPhotoIds.includes(photo.id)
                        return (
                          <label key={photo.id} className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${checked ? 'border-green-500' : 'border-transparent'}`}>
                            <input type="checkbox" className="sr-only" checked={checked}
                              onChange={() => setAddAfterPhotoIds(prev => checked ? prev.filter(id => id !== photo.id) : [...prev, photo.id])} />
                            <img src={photo.filePath} alt={photo.comment || ''} className="w-full h-14 object-cover" />
                            {checked && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div>}
                          </label>
                        )
                      })}
                    </div>
                    {addAfterPhotoIds.length > 0 && <p className="text-xs text-green-600 mt-1">{addAfterPhotoIds.length}枚選択中</p>}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">キャンセル</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '追加中...' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
