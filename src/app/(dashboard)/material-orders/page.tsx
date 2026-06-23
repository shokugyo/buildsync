'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, X, Download, ChevronRight } from 'lucide-react'

type Project = { id: string; name: string; projectNumber: string }

type MaterialOrder = {
  id: string
  projectId: string
  name: string
  quantity: number
  unit: string
  unitPrice: number | null
  totalAmount: number | null
  orderedAt: string | null
  deliveredAt: string | null
  supplier: string | null
  status: string
  notes: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
}

const STATUS_OPTIONS = ['未発注', '発注済', '納品済']

const STATUS_NEXT: Record<string, string> = {
  '未発注': '発注済',
  '発注済': '納品済',
  '納品済': '納品済',
}

const statusColor: Record<string, string> = {
  '未発注': 'bg-gray-100 text-gray-700',
  '発注済': 'bg-blue-100 text-blue-700',
  '納品済': 'bg-green-100 text-green-700',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '-'
  return n.toLocaleString('ja-JP') + '円'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ja-JP')
}

const EMPTY_FORM = {
  name: '',
  quantity: '',
  unit: '個',
  unitPrice: '',
  orderedAt: '',
  deliveredAt: '',
  supplier: '',
  status: '未発注',
  notes: '',
}

export default function MaterialOrdersPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [orders, setOrders] = useState<MaterialOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState<MaterialOrder | null>(null)

  // Load projects
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.projects ?? []
        setProjects(list)
        if (list.length > 0) setSelectedProjectId(list[0].id)
      })
      .catch(() => {})
  }, [])

  // Load orders when project changes
  const loadOrders = useCallback(() => {
    if (!selectedProjectId) return
    setLoading(true)
    fetch(`/api/material-orders?projectId=${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [selectedProjectId])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Summary counts
  const countByStatus = (s: string) => orders.filter((o) => o.status === s).length
  const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0)

  // Open modal for create
  function openCreateModal() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  // Open modal for edit
  function openEditModal(order: MaterialOrder) {
    setEditTarget(order)
    setForm({
      name: order.name,
      quantity: String(order.quantity),
      unit: order.unit,
      unitPrice: order.unitPrice != null ? String(order.unitPrice) : '',
      orderedAt: order.orderedAt ? order.orderedAt.slice(0, 10) : '',
      deliveredAt: order.deliveredAt ? order.deliveredAt.slice(0, 10) : '',
      supplier: order.supplier ?? '',
      status: order.status,
      notes: order.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const body = {
      projectId: selectedProjectId,
      name: form.name,
      quantity: form.quantity,
      unit: form.unit,
      unitPrice: form.unitPrice !== '' ? form.unitPrice : null,
      orderedAt: form.orderedAt || null,
      deliveredAt: form.deliveredAt || null,
      supplier: form.supplier || null,
      status: form.status,
      notes: form.notes || null,
    }

    try {
      if (editTarget) {
        const res = await fetch(`/api/material-orders/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('更新失敗')
      } else {
        const res = await fetch('/api/material-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('作成失敗')
      }
      setShowModal(false)
      loadOrders()
    } catch (err) {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この資材発注を削除しますか？')) return
    await fetch(`/api/material-orders/${id}`, { method: 'DELETE' })
    loadOrders()
  }

  async function handleAdvanceStatus(order: MaterialOrder) {
    const next = STATUS_NEXT[order.status]
    if (next === order.status) return
    const body: any = { status: next }
    if (next === '発注済' && !order.orderedAt) body.orderedAt = new Date().toISOString()
    if (next === '納品済' && !order.deliveredAt) body.deliveredAt = new Date().toISOString()
    await fetch(`/api/material-orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    loadOrders()
  }

  async function handleExcelExport() {
    const xlsx = await import('xlsx')
    const wsData = [
      ['資材名', '数量', '単位', '単価', '合計金額', '仕入先', '発注日', '納品日', 'ステータス', '備考'],
      ...orders.map((o) => [
        o.name,
        o.quantity,
        o.unit,
        o.unitPrice ?? '',
        o.totalAmount ?? '',
        o.supplier ?? '',
        o.orderedAt ? fmtDate(o.orderedAt) : '',
        o.deliveredAt ? fmtDate(o.deliveredAt) : '',
        o.status,
        o.notes ?? '',
      ]),
    ]
    const ws = xlsx.utils.aoa_to_sheet(wsData)
    const wb = xlsx.utils.book_new()
    const projectName = projects.find((p) => p.id === selectedProjectId)?.name ?? '案件'
    xlsx.utils.book_append_sheet(wb, ws, '資材発注一覧')
    xlsx.writeFile(wb, `資材発注_${projectName}.xlsx`)
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-blue-600 w-6 h-6" />
          <h1 className="text-2xl font-bold text-gray-900">資材発注管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExcelExport}
            disabled={orders.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Excel出力
          </button>
          <button
            onClick={openCreateModal}
            disabled={!selectedProjectId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            資材を追加
          </button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">案件選択:</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.projectNumber}] {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {selectedProjectId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">未発注</p>
            <p className="text-2xl font-bold text-gray-700">{countByStatus('未発注')}</p>
            <p className="text-xs text-gray-400">件</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">発注済</p>
            <p className="text-2xl font-bold text-blue-600">{countByStatus('発注済')}</p>
            <p className="text-xs text-gray-400">件</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">納品済</p>
            <p className="text-2xl font-bold text-green-600">{countByStatus('納品済')}</p>
            <p className="text-xs text-gray-400">件</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">合計金額</p>
            <p className="text-lg font-bold text-gray-900">{fmt(totalAmount)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {selectedProjectId ? '資材発注データがありません。「資材を追加」から登録してください。' : '案件を選択してください'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">資材名</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">数量</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">単位</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">単価</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">合計</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">仕入先</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">発注日</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">納品日</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {order.name}
                      {order.notes && (
                        <p className="text-xs text-gray-400 font-normal truncate max-w-xs">{order.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{order.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{order.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {order.unitPrice != null ? order.unitPrice.toLocaleString() + '円' : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      {order.totalAmount != null ? order.totalAmount.toLocaleString() + '円' : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.supplier ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(order.orderedAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(order.deliveredAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {order.status !== '納品済' && (
                          <button
                            onClick={() => handleAdvanceStatus(order)}
                            title={`→ ${STATUS_NEXT[order.status]}`}
                            className="p-1 rounded text-blue-500 hover:bg-blue-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(order)}
                          className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="px-2 py-1 text-xs text-red-600 border border-red-100 rounded hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? '資材発注を編集' : '資材を追加'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  資材名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: セメント 25kg袋"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="個"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">単価（円）</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="単価を入力すると合計が自動計算されます"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">仕入先</label>
                <input
                  value={form.supplier}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: ○○建材株式会社"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">発注日</label>
                  <input
                    type="date"
                    value={form.orderedAt}
                    onChange={(e) => setForm((f) => ({ ...f, orderedAt: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">納品日</label>
                  <input
                    type="date"
                    value={form.deliveredAt}
                    onChange={(e) => setForm((f) => ({ ...f, deliveredAt: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : editTarget ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
