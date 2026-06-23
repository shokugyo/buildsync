'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wrench, Plus, X, AlertTriangle } from 'lucide-react'

type Project = { id: string; name: string; projectNumber: string }
type Equipment = {
  id: string
  name: string
  type: string
  serialNumber: string | null
  status: string
  projectId: string | null
  assignedFrom: string | null
  assignedTo: string | null
  lastInspectedAt: string | null
  nextInspectionAt: string | null
  notes: string | null
  project: { id: string; name: string; projectNumber: string } | null
}

const STATUS_OPTIONS = ['利用可能', '使用中', 'メンテナンス中', '廃棄']

const statusColor: Record<string, string> = {
  '利用可能': 'bg-green-100 text-green-700',
  '使用中': 'bg-blue-100 text-blue-700',
  'メンテナンス中': 'bg-yellow-100 text-yellow-700',
  '廃棄': 'bg-gray-100 text-gray-500',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP')
}

function isInspectionSoon(nextInspectionAt: string | null): boolean {
  if (!nextInspectionAt) return false
  const diff = new Date(nextInspectionAt).getTime() - Date.now()
  return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000
}

function isInspectionOverdue(nextInspectionAt: string | null): boolean {
  if (!nextInspectionAt) return false
  return new Date(nextInspectionAt).getTime() < Date.now()
}

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', type: '', serialNumber: '', status: '利用可能',
    projectId: '', assignedFrom: '', assignedTo: '',
    lastInspectedAt: '', nextInspectionAt: '', notes: '',
  })

  const fetchEquipments = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/equipment?${params}`)
    if (res.ok) setEquipments(await res.json())
    setLoading(false)
  }, [filterStatus])

  useEffect(() => {
    fetchEquipments()
  }, [fetchEquipments])

  useEffect(() => {
    fetch('/api/projects?limit=200').then(r => r.ok ? r.json() : []).then(d => setProjects(Array.isArray(d) ? d : d.projects || []))
  }, [])

  function openAdd() {
    setEditTarget(null)
    setForm({ name: '', type: '', serialNumber: '', status: '利用可能', projectId: '', assignedFrom: '', assignedTo: '', lastInspectedAt: '', nextInspectionAt: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(eq: Equipment) {
    setEditTarget(eq)
    setForm({
      name: eq.name,
      type: eq.type,
      serialNumber: eq.serialNumber ?? '',
      status: eq.status,
      projectId: eq.projectId ?? '',
      assignedFrom: eq.assignedFrom ? eq.assignedFrom.slice(0, 10) : '',
      assignedTo: eq.assignedTo ? eq.assignedTo.slice(0, 10) : '',
      lastInspectedAt: eq.lastInspectedAt ? eq.lastInspectedAt.slice(0, 10) : '',
      nextInspectionAt: eq.nextInspectionAt ? eq.nextInspectionAt.slice(0, 10) : '',
      notes: eq.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name,
      type: form.type,
      serialNumber: form.serialNumber || null,
      status: form.status,
      projectId: form.projectId || null,
      assignedFrom: form.assignedFrom || null,
      assignedTo: form.assignedTo || null,
      lastInspectedAt: form.lastInspectedAt || null,
      nextInspectionAt: form.nextInspectionAt || null,
      notes: form.notes || null,
    }
    if (editTarget) {
      await fetch(`/api/equipment/${editTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setShowModal(false)
    fetchEquipments()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/equipment/${id}`, { method: 'DELETE' })
    fetchEquipments()
  }

  const soonCount = equipments.filter(e => isInspectionSoon(e.nextInspectionAt)).length
  const overdueCount = equipments.filter(e => isInspectionOverdue(e.nextInspectionAt)).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">機器・設備管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          機器を追加
        </button>
      </div>

      {(soonCount > 0 || overdueCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              点検期限超過: {overdueCount}件
            </div>
          )}
          {soonCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              点検期限近づき (30日以内): {soonCount}件
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">全ステータス</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['機器名', '種別', 'シリアル番号', 'ステータス', '現場', '使用期間', '次回点検日', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">読み込み中...</td></tr>
            ) : equipments.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">データがありません</td></tr>
            ) : equipments.map(eq => {
              const soon = isInspectionSoon(eq.nextInspectionAt)
              const overdue = isInspectionOverdue(eq.nextInspectionAt)
              return (
                <tr key={eq.id} className={`border-b ${overdue ? 'bg-red-50 hover:bg-red-100' : soon ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 font-medium">
                    <button onClick={() => openEdit(eq)} className="text-blue-600 hover:underline">{eq.name}</button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{eq.type}</td>
                  <td className="px-4 py-3 text-gray-500">{eq.serialNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[eq.status] ?? 'bg-gray-100 text-gray-700'}`}>{eq.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{eq.project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {eq.assignedFrom || eq.assignedTo ? `${fmtDate(eq.assignedFrom)} 〜 ${fmtDate(eq.assignedTo)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {eq.nextInspectionAt ? (
                      <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : soon ? 'text-orange-500 font-medium' : 'text-gray-600'}`}>
                        {(soon || overdue) && <AlertTriangle className="w-3 h-3" />}
                        {fmtDate(eq.nextInspectionAt)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(eq.id)} className="text-xs text-red-500 hover:text-red-700">削除</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editTarget ? '機器を編集' : '機器を追加'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">機器名 *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">種別 *</label>
                  <input required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="クレーン, 足場, 発電機..." className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">シリアル番号</label>
                  <input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用現場</label>
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">未割当</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">使用開始日</label>
                  <input type="date" value={form.assignedFrom} onChange={e => setForm(f => ({ ...f, assignedFrom: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">使用終了日</label>
                  <input type="date" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最終点検日</label>
                  <input type="date" value={form.lastInspectedAt} onChange={e => setForm(f => ({ ...f, lastInspectedAt: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">次回点検日</label>
                  <input type="date" value={form.nextInspectionAt} onChange={e => setForm(f => ({ ...f, nextInspectionAt: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">キャンセル</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editTarget ? '更新' : '追加'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
