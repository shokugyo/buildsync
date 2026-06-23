'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, X, Trash2, ChevronDown, ChevronRight, Printer, Pencil, Download, FileText, CheckCircle2, Bookmark, Eye, Upload } from 'lucide-react'
import { useSavedFilters } from '@/hooks/useSavedFilters'
import CsvImportModal from '@/components/CsvImportModal'

interface LineItem {
  id?: string
  name: string
  quantity: string
  unitPrice: string
  amount: string
}

interface Order {
  id: string
  orderNumber: string
  subject: string
  workType?: string | null
  status: string
  orderDate?: string | null
  deliveryDate?: string | null
  paymentTerms?: string | null
  amount: number
  taxAmount: number
  totalAmount: number
  notes?: string | null
  confirmedAt?: string | null
  project: { id: string; name: string; projectNumber: string }
  supplier?: { id: string; name: string } | null
  items: { id: string; name: string; quantity: number; unitPrice: number; amount: number; sortOrder: number }[]
  approvals?: {
    id: string
    level: number
    action: string
    comment?: string | null
    createdAt: string
    approver: { id: string; name: string }
  }[]
}

interface Project { id: string; name: string; projectNumber: string }
interface Supplier { id: string; name: string }

const ORDER_STATUSES = ['下書き', '承認依頼中', '承認済', '差戻し', '発注済', '完了']

const STATUS_COLORS: Record<string, string> = {
  '下書き': 'bg-slate-100 text-slate-600',
  '承認依頼中': 'bg-yellow-100 text-yellow-700',
  '承認済': 'bg-green-100 text-green-700',
  '差戻し': 'bg-red-100 text-red-700',
  '発注済': 'bg-blue-100 text-blue-700',
  '完了': 'bg-purple-100 text-purple-700',
}

const PAYMENT_TERMS = ['当月末払い', '翌月末払い', '翌々月末払い', '都度払い', 'その他']

function defaultItem(): LineItem {
  return { name: '', quantity: '1', unitPrice: '0', amount: '0' }
}

const WORK_TYPES = ['新築工事', 'リフォーム工事', '改修工事', '修繕工事', '解体工事', 'その他']

const defaultForm = {
  projectId: '',
  supplierId: '',
  subject: '',
  workType: '',
  orderDate: '',
  deliveryDate: '',
  paymentTerms: '',
  notes: '',
  status: '下書き',
}

const SUPPLIER_ROLES = ['協力会社管理者', '協力会社作業者']

export default function OrdersPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Order | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [items, setItems] = useState<LineItem[]>([defaultItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  const [expandedApprovalsId, setExpandedApprovalsId] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  const isSupplierUser = SUPPLIER_ROLES.includes((session?.user as any)?.role)
  const { presets, savePreset, deletePreset, applyPreset } = useSavedFilters('saved_filters_orders')

  const hasActiveFilter = !!(keyword || statusFilter || projectFilter || supplierFilter || workTypeFilter || amountMin || amountMax)

  const handleSaveFilter = () => {
    const name = prompt('フィルタ名を入力してください')
    if (!name) return
    savePreset(name, { keyword, statusFilter, projectFilter, supplierFilter, workTypeFilter, amountMin, amountMax })
  }

  const handleApplyPreset = (filters: Record<string, string>) => {
    setKeyword(filters.keyword || '')
    setStatusFilter(filters.statusFilter || '')
    setProjectFilter(filters.projectFilter || '')
    setSupplierFilter(filters.supplierFilter || '')
    setWorkTypeFilter(filters.workTypeFilter || '')
    setAmountMin(filters.amountMin || '')
    setAmountMax(filters.amountMax || '')
  }

  const fetchAll = useCallback(async () => {
    const safeJson = async (res: Response) => {
      try { return await res.json() } catch { return null }
    }
    const [ordersRes, projectsRes, suppliersRes] = await Promise.all([
      fetch('/api/orders').then(safeJson),
      fetch('/api/projects').then(safeJson),
      fetch('/api/suppliers').then(safeJson),
    ])
    setOrders(Array.isArray(ordersRes) ? ordersRes : [])
    setProjects(Array.isArray(projectsRes) ? projectsRes : [])
    setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const updateItem = (idx: number, field: keyof LineItem, val: string) => {
    setItems((prev) => {
      const next = prev.map((it, i) => i === idx ? { ...it, [field]: val } : it)
      if (field === 'quantity' || field === 'unitPrice') {
        const it = next[idx]
        const q = parseFloat(it.quantity) || 0
        const u = parseFloat(it.unitPrice) || 0
        next[idx] = { ...it, amount: (q * u).toFixed(0) }
      }
      return next
    })
  }

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setItems([defaultItem()])
    setError('')
    setShowModal(true)
  }

  const openEdit = (o: Order) => {
    setEditTarget(o)
    setForm({
      projectId: o.project.id,
      supplierId: o.supplier?.id || '',
      subject: o.subject,
      workType: o.workType || '',
      orderDate: o.orderDate ? o.orderDate.slice(0, 10) : '',
      deliveryDate: o.deliveryDate ? o.deliveryDate.slice(0, 10) : '',
      paymentTerms: o.paymentTerms || '',
      notes: o.notes || '',
      status: o.status,
    })
    setItems(
      o.items.length > 0
        ? o.items.map((it) => ({
            id: it.id,
            name: it.name,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
            amount: String(it.amount),
          }))
        : [defaultItem()]
    )
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.projectId || !form.subject) { setError('案件と件名は必須です'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        supplierId: form.supplierId || null,
        orderDate: form.orderDate || null,
        deliveryDate: form.deliveryDate || null,
        paymentTerms: form.paymentTerms || null,
        items: items.filter((it) => it.name).map((it) => ({
          name: it.name,
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          amount: parseFloat(it.amount) || 0,
        })),
      }
      const url = editTarget ? `/api/orders/${editTarget.id}` : '/api/orders'
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || '保存に失敗しました')
        return
      }
      const saved = await res.json()
      if (editTarget) {
        setOrders((prev) => prev.map((o) => o.id === saved.id ? saved : o))
      } else {
        setOrders((prev) => [saved, ...prev])
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この発注を削除しますか？')) return
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    setOrders((prev) => prev.filter((o) => o.id !== id))
  }

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o))
    }
  }

  const handleApprove = async (orderId: string, action: '承認' | '差し戻し', comment?: string) => {
    const res = await fetch(`/api/orders/${orderId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment }),
    })
    if (res.ok) {
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    }
  }

  const handleSupplierConfirm = async (id: string) => {
    if (!confirm('この発注の受注を確認しますか？')) return
    const res = await fetch(`/api/orders/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const updated = await res.json()
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o))
    }
  }

  const supplierNames = Array.from(new Set(orders.map(o => o.supplier?.name).filter(Boolean))) as string[]

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (projectFilter && o.project?.id !== projectFilter) return false
    if (supplierFilter && o.supplier?.name !== supplierFilter) return false
    if (workTypeFilter && o.workType !== workTypeFilter) return false
    if (amountMin && o.totalAmount < parseFloat(amountMin)) return false
    if (amountMax && o.totalAmount > parseFloat(amountMax)) return false
    if (keyword) {
      const q = keyword.toLowerCase()
      if (
        !o.subject.toLowerCase().includes(q) &&
        !o.orderNumber.toLowerCase().includes(q) &&
        !(o.project?.name || '').toLowerCase().includes(q) &&
        !(o.supplier?.name || '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const totalAmount = filtered.reduce((s, o) => s + o.totalAmount, 0)
  const pendingCount = orders.filter((o) => o.status === '承認依頼中').length

  return (
    <div>
      <Header title="発注管理" />
      <div className="p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">発注総件数</p>
            <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">承認待ち</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">発注済</p>
            <p className="text-2xl font-bold text-blue-600">{orders.filter((o) => o.status === '発注済').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">合計金額（税込）</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(orders.reduce((s, o) => s + o.totalAmount, 0))}</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex gap-3 mb-4">
          <a href="/orders/approve" className="relative flex items-center gap-2 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            承認依頼一覧
            {pendingCount > 0 && (
              <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{pendingCount}</span>
            )}
          </a>
          <a href="/orders/confirm" className="flex items-center gap-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            発注確認一覧
          </a>
        </div>

        {presets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-slate-500">保存済フィルタ:</span>
            {presets.map((preset) => (
              <span key={preset.name} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-0.5 text-xs">
                <button onClick={() => handleApplyPreset(applyPreset(preset))} className="hover:underline">{preset.name}</button>
                <button onClick={() => deletePreset(preset.name)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="件名・発注番号・案件・業者で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべてのステータス</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての案件</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>)}
          </select>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての発注先</option>
            {supplierNames.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての工種</option>
            {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <input
            type="number"
            placeholder="金額 下限"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400 text-sm self-center">〜</span>
          <input
            type="number"
            placeholder="金額 上限"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="ml-auto flex gap-2">
            {hasActiveFilter && (
              <button
                onClick={handleSaveFilter}
                className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                フィルタを保存
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Upload className="w-4 h-4" /> CSVインポート
            </button>
            <a
              href="/api/export/orders"
              download
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> CSV出力
            </a>
            <a
              href="/api/export/orders/xlsx"
              download
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Excel出力
            </a>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 発注を作成
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件 / 合計 {formatCurrency(totalAmount)}</p>

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <p className="text-slate-500">発注データがありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-2 py-3 w-6" />
                    <th className="px-4 py-3 text-left">発注番号</th>
                    <th className="px-4 py-3 text-left">件名</th>
                    <th className="px-4 py-3 text-left">案件</th>
                    <th className="px-4 py-3 text-left">業者</th>
                    <th className="px-4 py-3 text-left">発注日</th>
                    <th className="px-4 py-3 text-left">納期</th>
                    <th className="px-4 py-3 text-right">金額（税込）</th>
                    <th className="px-4 py-3 text-left">ステータス</th>
                    <th className="px-4 py-3 text-left">受注確認</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((order) => (
                    <>
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-2 py-3">
                          <button
                            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {expandedId === order.id
                              ? <ChevronDown className="w-4 h-4" />
                              : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{order.orderNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{order.subject}</div>
                          {order.workType && <div className="text-xs text-slate-400">{order.workType}</div>}
                          {order.paymentTerms && <div className="text-xs text-slate-400">{order.paymentTerms}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{order.project?.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{order.supplier?.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{order.orderDate ? formatDate(order.orderDate) : '-'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{order.deliveryDate ? formatDate(order.deliveryDate) : '-'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {order.confirmedAt ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />確認済
                            </span>
                          ) : isSupplierUser && (order.status === '発注済') ? (
                            <button
                              onClick={() => handleSupplierConfirm(order.id)}
                              className="inline-flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded font-medium"
                            >
                              <CheckCircle2 className="w-3 h-3" />受注確認
                            </button>
                          ) : order.status === '発注済' || order.status === '受領確認済' ? (
                            <span className="text-orange-500">未確認</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <a href={`/orders/${order.id}`} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="詳細">
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            {!isSupplierUser && (
                              <button
                                onClick={() => openEdit(order)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="編集"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <a
                              href={`/orders/${order.id}/print`}
                              target="_blank"
                              className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                              title="発注書印刷"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`/orders/${order.id}/acceptance`}
                              target="_blank"
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="注文請書"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                            {!isSupplierUser && (
                              <button
                                onClick={() => handleDelete(order.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === order.id && (
                        <tr key={`${order.id}-detail`} className="bg-slate-50">
                          <td colSpan={11} className="px-8 py-4">
                            <div className="text-xs text-slate-600 space-y-2">
                              {order.items.length > 0 ? (
                                <table className="w-full max-w-2xl text-xs border border-slate-200 rounded">
                                  <thead className="bg-white">
                                    <tr className="text-slate-500">
                                      <th className="px-3 py-2 text-left">品目</th>
                                      <th className="px-3 py-2 text-right">数量</th>
                                      <th className="px-3 py-2 text-right">単価</th>
                                      <th className="px-3 py-2 text-right">金額</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {order.items.map((it) => (
                                      <tr key={it.id}>
                                        <td className="px-3 py-1.5">{it.name}</td>
                                        <td className="px-3 py-1.5 text-right">{it.quantity}</td>
                                        <td className="px-3 py-1.5 text-right">{formatCurrency(it.unitPrice)}</td>
                                        <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(it.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-white border-t border-slate-200">
                                    <tr>
                                      <td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">税抜合計</td>
                                      <td className="px-3 py-1.5 text-right">{formatCurrency(order.amount)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">消費税(10%)</td>
                                      <td className="px-3 py-1.5 text-right">{formatCurrency(order.taxAmount)}</td>
                                    </tr>
                                    <tr className="font-bold">
                                      <td colSpan={3} className="px-3 py-1.5 text-right">税込合計</td>
                                      <td className="px-3 py-1.5 text-right">{formatCurrency(order.totalAmount)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              ) : (
                                <p className="text-slate-400">明細なし</p>
                              )}
                              {order.workType && <p>工種: {order.workType}</p>}
                              {order.paymentTerms && <p>支払条件: {order.paymentTerms}</p>}
                              {order.notes && <p>備考: {order.notes}</p>}

                              {/* 承認フロー */}
                              {!isSupplierUser && order.status === '承認依頼中' && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-xs text-yellow-700 font-medium mb-2">
                                    承認が必要です（{order.totalAmount >= 500000 ? '50万円以上: 2名の承認が必要' : '50万円未満: 1名の承認が必要'}）
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApprove(order.id, '承認')}
                                      className="inline-flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-medium"
                                    >
                                      承認
                                    </button>
                                    <button
                                      onClick={() => { setRejectTargetId(order.id); setRejectComment(''); setShowRejectModal(true) }}
                                      className="inline-flex items-center gap-1 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-medium"
                                    >
                                      差し戻し
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* 承認履歴アコーディオン */}
                              {order.approvals && order.approvals.length > 0 && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => setExpandedApprovalsId(expandedApprovalsId === order.id ? null : order.id)}
                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
                                  >
                                    {expandedApprovalsId === order.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    承認履歴 ({order.approvals.length}件)
                                  </button>
                                  {expandedApprovalsId === order.id && (
                                    <div className="mt-2 space-y-1">
                                      {order.approvals.map((appr) => (
                                        <div key={appr.id} className="flex items-start gap-3 text-xs bg-white border border-slate-200 rounded px-3 py-2">
                                          <span className={`shrink-0 px-1.5 py-0.5 rounded-full font-medium ${appr.action === '承認' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {appr.action}
                                          </span>
                                          <span className="shrink-0 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">Lv{appr.level}</span>
                                          <span className="text-slate-700 font-medium">{appr.approver.name}</span>
                                          <span className="text-slate-400">{new Date(appr.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                          {appr.comment && <span className="text-slate-500 ml-1">— {appr.comment}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 差し戻しコメントモーダル */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">差し戻し理由</h2>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">コメント（任意）</label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={3}
                placeholder="差し戻し理由を入力してください"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  if (rejectTargetId) {
                    await handleApprove(rejectTargetId, '差し戻し', rejectComment)
                    setShowRejectModal(false)
                    setRejectTargetId(null)
                    setRejectComment('')
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                差し戻す
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <CsvImportModal
          title="発注"
          importApiUrl="/api/orders/import"
          templateApiUrl="/api/export/templates/orders"
          expectedColumns={['件名', '案件番号', '発注先', '工種', '発注日', '納期', '税抜金額', '備考']}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); fetchAll() }}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{editTarget ? '発注を編集' : '発注を作成'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">案件 <span className="text-red-500">*</span></label>
                    <select
                      value={form.projectId}
                      onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">選択してください</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">業者</label>
                    <select
                      value={form.supplierId}
                      onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未選択</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">件名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例：外壁工事一式"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工種</label>
                  <select
                    value={form.workType}
                    onChange={(e) => setForm({ ...form, workType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未設定</option>
                    {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">発注日</label>
                    <input
                      type="date"
                      value={form.orderDate}
                      onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">納期</label>
                    <input
                      type="date"
                      value={form.deliveryDate}
                      onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">支払条件</label>
                    <select
                      value={form.paymentTerms}
                      onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未設定</option>
                      {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Line items */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">明細</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-xs text-slate-500">
                          <th className="px-3 py-2 text-left">品目</th>
                          <th className="px-3 py-2 text-right w-24">数量</th>
                          <th className="px-3 py-2 text-right w-28">単価</th>
                          <th className="px-3 py-2 text-right w-28">金額</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={it.name}
                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="品目名"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={it.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min="0"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={it.unitPrice}
                                onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min="0"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={it.amount}
                                onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min="0"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setItems((prev) => [...prev, defaultItem()])}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> 行を追加
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm space-y-0.5">
                    <div className="flex justify-end gap-8 text-slate-500">
                      <span>税抜合計</span><span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-end gap-8 text-slate-500">
                      <span>消費税(10%)</span><span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-end gap-8 font-bold text-slate-900">
                      <span>税込合計</span><span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
                >
                  {saving ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
