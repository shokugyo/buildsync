'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, X } from 'lucide-react'

type Project = { id: string; name: string; projectNumber: string }
type Supplier = { id: string; name: string }
type Material = {
  id: string
  name: string
  unit: string
  quantity: number
  unitPrice: number | null
  status: string
  scheduledAt: string | null
  deliveredAt: string | null
  notes: string | null
  project: { id: string; name: string; projectNumber: string }
  supplier: { id: string; name: string } | null
}

const STATUS_OPTIONS = ['未発注', '発注済', '納品済']

const statusColor: Record<string, string> = {
  '未発注': 'bg-gray-100 text-gray-700',
  '発注済': 'bg-blue-100 text-blue-700',
  '納品済': 'bg-green-100 text-green-700',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('ja-JP')
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP')
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', unit: '', quantity: '', unitPrice: '', supplierId: '',
    projectId: '', scheduledAt: '', notes: '', status: '未発注',
  })

  const fetchMaterials = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterProject) params.set('projectId', filterProject)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/materials?${params}`)
    if (res.ok) setMaterials(await res.json())
    setLoading(false)
  }, [filterProject, filterStatus])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  useEffect(() => {
    fetch('/api/projects?limit=200').then(r => r.ok ? r.json() : []).then(d => setProjects(Array.isArray(d) ? d : d.projects || []))
    fetch('/api/suppliers').then(r => r.ok ? r.json() : []).then(d => setSuppliers(Array.isArray(d) ? d : []))
  }, [])

  const totalCost = materials.reduce((sum, m) => sum + m.quantity * (m.unitPrice ?? 0), 0)

  function openAdd() {
    setEditTarget(null)
    setForm({ name: '', unit: '', quantity: '', unitPrice: '', supplierId: '', projectId: filterProject, scheduledAt: '', notes: '', status: '未発注' })
    setShowModal(true)
  }

  function openEdit(m: Material) {
    setEditTarget(m)
    setForm({
      name: m.name,
      unit: m.unit,
      quantity: String(m.quantity),
      unitPrice: m.unitPrice != null ? String(m.unitPrice) : '',
      supplierId: m.supplier?.id ?? '',
      projectId: m.project.id,
      scheduledAt: m.scheduledAt ? m.scheduledAt.slice(0, 10) : '',
      notes: m.notes ?? '',
      status: m.status,
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name,
      unit: form.unit,
      quantity: form.quantity,
      unitPrice: form.unitPrice || null,
      supplierId: form.supplierId || null,
      projectId: form.projectId,
      scheduledAt: form.scheduledAt || null,
      notes: form.notes || null,
      status: form.status,
    }
    if (editTarget) {
      await fetch(`/api/materials/${editTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setShowModal(false)
    fetchMaterials()
  }

  async function updateStatus(id: string, status: string) {
    const extra = status === '納品済' ? { deliveredAt: new Date().toISOString() } : {}
    await fetch(`/api/materials/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, ...extra }) })
    fetchMaterials()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    fetchMaterials()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">材料管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          材料を追加
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4 flex items-center gap-6">
        <div>
          <p className="text-sm text-gray-500">合計金額</p>
          <p className="text-2xl font-bold text-gray-900">¥{totalCost.toLocaleString('ja-JP')}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">件数</p>
          <p className="text-2xl font-bold text-gray-900">{materials.length}件</p>
        </div>
        {STATUS_OPTIONS.map(s => (
          <div key={s}>
            <p className="text-sm text-gray-500">{s}</p>
            <p className="text-xl font-semibold text-gray-800">{materials.filter(m => m.status === s).length}件</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">全案件</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">全ステータス</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['材料名', '単位', '数量', '単価', '合計金額', '協力会社', '案件', '予定日', 'ステータス', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">読み込み中...</td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">データがありません</td></tr>
            ) : materials.map(m => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <button onClick={() => openEdit(m)} className="text-blue-600 hover:underline">{m.name}</button>
                </td>
                <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                <td className="px-4 py-3 text-right">{m.quantity}</td>
                <td className="px-4 py-3 text-right">{m.unitPrice != null ? `¥${fmt(m.unitPrice)}` : '—'}</td>
                <td className="px-4 py-3 text-right font-medium">¥{fmt(m.quantity * (m.unitPrice ?? 0))}</td>
                <td className="px-4 py-3 text-gray-600">{m.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{m.project.name}</td>
                <td className="px-4 py-3 text-gray-600">{fmtDate(m.scheduledAt)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[m.status] ?? 'bg-gray-100 text-gray-700'}`}>{m.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {m.status === '未発注' && (
                      <button onClick={() => updateStatus(m.id, '発注済')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">発注済にする</button>
                    )}
                    {m.status === '発注済' && (
                      <button onClick={() => updateStatus(m.id, '納品済')} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">納品済にする</button>
                    )}
                    <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 hover:text-red-700 px-1">削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editTarget ? '材料を編集' : '材料を追加'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">材料名 *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">単位 *</label>
                  <input required value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="個, m, kg" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量 *</label>
                  <input required type="number" step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">単価</label>
                  <input type="number" step="any" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">案件 *</label>
                <select required value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">選択してください</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">協力会社</label>
                <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">未選択</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">予定日</label>
                  <input type="date" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
