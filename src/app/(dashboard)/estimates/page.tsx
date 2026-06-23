'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ClipboardList, Plus, X, Trash2, Search, Filter, Printer, Pencil, ChevronDown, ChevronRight, ClipboardCheck, ShoppingCart, BookTemplate, CheckCircle, XCircle, SendHorizonal, Eye } from 'lucide-react'

const ESTIMATE_STATUSES = ['作成中', '承認依頼中', '承認済', '提出済', '契約済', '失注', '差戻し', '却下']
const APPROVER_ROLES = ['管理者', '会社管理者', '部門長']

const STATUS_COLORS: Record<string, string> = {
  '作成中': 'bg-slate-100 text-slate-600',
  '承認依頼中': 'bg-amber-100 text-amber-700',
  '承認済': 'bg-green-100 text-green-700',
  '提出済': 'bg-blue-100 text-blue-700',
  '契約済': 'bg-purple-100 text-purple-700',
  '失注': 'bg-red-100 text-red-700',
  '差戻し': 'bg-red-100 text-red-700',
  '却下': 'bg-red-100 text-red-700',
}

interface EstimateTemplateItem {
  id: string
  description: string
  unit: string | null
  unitPrice: number
  quantity: number
  sortOrder: number
}

interface EstimateTemplate {
  id: string
  name: string
  category: string | null
  items: EstimateTemplateItem[]
}

interface LineItem {
  id?: string
  name: string
  quantity: string
  unitPrice: string
  amount: string
}

interface Estimate {
  id: string
  estimateNumber: string
  estimateDate?: string | null
  validUntil?: string | null
  amount: number
  taxAmount: number
  totalAmount: number
  status: string
  notes?: string | null
  createdAt: string
  createdBy?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedBy?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  project: { name: string; projectNumber: string; customer?: { name: string } | null }
  items: { id: string; name: string; quantity: number; unitPrice: number; amount: number; sortOrder: number }[]
}

function defaultItem(): LineItem {
  return { name: '', quantity: '1', unitPrice: '0', amount: '0' }
}

const defaultForm = {
  projectId: '', estimateDate: '', validUntil: '', status: '作成中', notes: '',
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Estimate | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [items, setItems] = useState<LineItem[]>([defaultItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'valid' | 'expired'>('all')
  const [converting, setConverting] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [estimateTemplates, setEstimateTemplates] = useState<EstimateTemplate[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Estimate | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const safeJson = async (r: Response) => { try { return await r.json() } catch { return null } }
    const [est, proj, me] = await Promise.all([
      fetch('/api/estimates').then(safeJson),
      fetch('/api/projects').then(safeJson),
      fetch('/api/auth/session').then(safeJson),
    ])
    setEstimates(Array.isArray(est) ? est : [])
    setProjects(Array.isArray(proj) ? proj : [])
    setUserRole(me?.user?.role || '')
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const isApprover = APPROVER_ROLES.includes(userRole)

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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isExpired = (est: Estimate) => {
    if (!est.validUntil) return false
    return new Date(est.validUntil) < today
  }

  const filtered = estimates.filter((e) => {
    if (search && !e.estimateNumber.includes(search) && !e.project.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && e.status !== statusFilter) return false
    if (expiryFilter === 'expired' && !isExpired(e)) return false
    if (expiryFilter === 'valid' && isExpired(e)) return false
    return true
  })

  const totalAmount = filtered.reduce((s, e) => s + e.totalAmount, 0)
  const contractedAmount = filtered.filter((e) => e.status === '契約済').reduce((s, e) => s + e.totalAmount, 0)

  const openAdd = () => {
    setEditTarget(null)
    setForm({ ...defaultForm, estimateDate: new Date().toISOString().split('T')[0] })
    setItems([defaultItem()])
    setError('')
    setShowModal(true)
  }

  const openEdit = (e: Estimate) => {
    setEditTarget(e)
    setForm({
      projectId: '',
      estimateDate: e.estimateDate ? e.estimateDate.split('T')[0] : '',
      validUntil: e.validUntil ? e.validUntil.split('T')[0] : '',
      status: e.status,
      notes: e.notes || '',
    })
    setItems(
      e.items.length > 0
        ? e.items.map((it) => ({
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

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!editTarget && !form.projectId) { setError('案件は必須です'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        projectId: form.projectId || undefined,
        estimateDate: form.estimateDate || null,
        validUntil: form.validUntil || null,
        notes: form.notes || null,
        items: items.filter((it) => it.name).map((it) => ({
          name: it.name,
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          amount: parseFloat(it.amount) || 0,
        })),
      }
      if (editTarget) {
        const res = await fetch(`/api/estimates/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { setError('更新に失敗しました'); return }
        const updated = await res.json()
        setEstimates((prev) => prev.map((e) => e.id === updated.id ? updated : e))
      } else {
        const res = await fetch('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { setError('作成に失敗しました'); return }
        const created = await res.json()
        setEstimates((prev) => [created, ...prev])
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この見積を削除しますか？')) return
    const res = await fetch(`/api/estimates/${id}`, { method: 'DELETE' })
    if (res.ok) setEstimates((prev) => prev.filter((e) => e.id !== id))
  }

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/estimates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setEstimates((prev) => prev.map((e) => e.id === id ? { ...e, status } : e))
  }

  const handleRequestApproval = async (est: Estimate) => {
    setActionLoading(est.id)
    const res = await fetch(`/api/estimates/${est.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '承認依頼中' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEstimates((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    }
    setActionLoading(null)
  }

  const handleApprove = async (est: Estimate) => {
    if (!confirm(`見積 ${est.estimateNumber} を承認しますか？`)) return
    setActionLoading(est.id)
    const res = await fetch(`/api/estimates/${est.id}/approve`, { method: 'POST' })
    if (res.ok) {
      const updated = await res.json()
      setEstimates((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    } else {
      const data = await res.json()
      alert(data.error || '承認に失敗しました')
    }
    setActionLoading(null)
  }

  const openRejectModal = (est: Estimate) => {
    setRejectTarget(est)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setActionLoading(rejectTarget.id)
    const res = await fetch(`/api/estimates/${rejectTarget.id}/approve`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEstimates((prev) => prev.map((e) => e.id === updated.id ? updated : e))
      setShowRejectModal(false)
    } else {
      const data = await res.json()
      alert(data.error || '却下に失敗しました')
    }
    setActionLoading(null)
  }

  const openTemplatePicker = async () => {
    if (!templatesLoaded) {
      const res = await fetch('/api/estimate-templates')
      const data = await res.json()
      setEstimateTemplates(Array.isArray(data) ? data : [])
      setTemplatesLoaded(true)
    }
    setShowTemplatePicker(true)
  }

  const applyTemplate = (template: EstimateTemplate) => {
    const newItems = template.items.map((it) => ({
      name: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      amount: String(Math.round(it.quantity * it.unitPrice)),
    }))
    setItems((prev) => {
      const filtered = prev.filter((it) => it.name || parseFloat(it.unitPrice) > 0)
      return [...filtered, ...newItems]
    })
    setShowTemplatePicker(false)
  }

  const handleConvertToOrder = async (est: Estimate) => {
    if (!confirm(`見積書 ${est.estimateNumber} から発注書を作成しますか？`)) return
    setConverting(est.id)
    try {
      const res = await fetch(`/api/estimates/${est.id}/convert-to-order`, { method: 'POST' })
      if (res.ok) {
        setSuccessMessage('発注書を作成しました')
        setTimeout(() => setSuccessMessage(''), 4000)
      } else {
        const data = await res.json()
        alert(data.error || '発注変換に失敗しました')
      }
    } finally {
      setConverting(null)
    }
  }

  return (
    <div>
      <Header title="見積管理" />
      <div className="p-6">
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            {successMessage}
            <a href="/orders" className="ml-2 underline hover:no-underline">発注一覧を見る</a>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">見積件数</p>
            <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">見積合計（税込）</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">契約済合計</p>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(contractedAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">受注率</p>
            <p className="text-2xl font-bold text-green-600">
              {totalAmount > 0 ? Math.round((contractedAmount / totalAmount) * 100) : 0}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="見積番号・案件名で検索"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">すべての状態</option>
              {ESTIMATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value as 'all' | 'valid' | 'expired')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">有効期限: すべて</option>
            <option value="valid">有効</option>
            <option value="expired">期限切れ</option>
          </select>
          {isApprover && (
            <Link href="/estimates/approve"
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium relative">
              <ClipboardCheck className="w-4 h-4" /> 承認キュー
              {estimates.filter(e => e.status === '承認依頼中').length > 0 && (
                <span className="ml-1 bg-white text-amber-600 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {estimates.filter(e => e.status === '承認依頼中').length}
                </span>
              )}
            </Link>
          )}
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> 見積を作成
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">見積がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-2 py-3 w-6" />
                    <th className="px-4 py-3 text-left">見積番号</th>
                    <th className="px-4 py-3 text-left">案件</th>
                    <th className="px-4 py-3 text-left">顧客</th>
                    <th className="px-4 py-3 text-left">見積日</th>
                    <th className="px-4 py-3 text-left">有効期限</th>
                    <th className="px-4 py-3 text-right">税込合計</th>
                    <th className="px-4 py-3 text-left">状態</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((est) => (
                    <>
                      <tr key={est.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-2 py-3">
                          <button onClick={() => setExpandedId(expandedId === est.id ? null : est.id)} className="text-slate-400 hover:text-slate-600">
                            {expandedId === est.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{est.estimateNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{est.project.name}</p>
                          <p className="text-xs text-slate-400">{est.project.projectNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{est.project.customer?.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(est.estimateDate)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <span className={isExpired(est) ? 'text-red-600 font-medium' : 'text-slate-500'}>
                            {formatDate(est.validUntil) || '-'}
                          </span>
                          {isExpired(est) && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">期限切れ</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-right">{formatCurrency(est.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <select value={est.status} onChange={(e) => handleStatusChange(est.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_COLORS[est.status] || 'bg-slate-100 text-slate-600'}`}>
                            {ESTIMATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 items-center flex-wrap">
                            {est.status === '作成中' && (
                              <button
                                onClick={() => handleRequestApproval(est)}
                                disabled={actionLoading === est.id}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded hover:bg-amber-100 disabled:opacity-50 whitespace-nowrap"
                                title="承認を申請"
                              >
                                <SendHorizonal className="w-3 h-3" /> 申請
                              </button>
                            )}
                            {isApprover && est.status === '承認依頼中' && (
                              <>
                                <button
                                  onClick={() => handleApprove(est)}
                                  disabled={actionLoading === est.id}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100 disabled:opacity-50 whitespace-nowrap"
                                  title="承認"
                                >
                                  <CheckCircle className="w-3 h-3" /> 承認
                                </button>
                                <button
                                  onClick={() => openRejectModal(est)}
                                  disabled={actionLoading === est.id}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-700 border border-red-300 rounded hover:bg-red-100 disabled:opacity-50 whitespace-nowrap"
                                  title="却下"
                                >
                                  <XCircle className="w-3 h-3" /> 却下
                                </button>
                              </>
                            )}
                            <Link href={`/estimates/${est.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="詳細"><Eye className="w-3.5 h-3.5" /></Link>
                            <button onClick={() => openEdit(est)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="編集"><Pencil className="w-3.5 h-3.5" /></button>
                            <a href={`/estimates/${est.id}/print`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-green-600 rounded" title="帳票出力"><Printer className="w-4 h-4" /></a>
                            <Link
                              href={`/orders?fromEstimateId=${est.id}`}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-50 text-orange-700 border border-orange-300 rounded hover:bg-orange-100 whitespace-nowrap"
                              title="発注書作成"
                            >
                              <ShoppingCart className="w-3 h-3" /> 発注書作成
                            </Link>
                            {(est.status === '承認済' || est.status === '受注') && (
                              <button
                                onClick={() => handleConvertToOrder(est)}
                                disabled={converting === est.id}
                                className="p-1.5 text-slate-400 hover:text-orange-600 rounded disabled:opacity-50"
                                title="発注変換"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(est.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="削除"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === est.id && (
                        <tr key={`${est.id}-detail`} className="bg-slate-50">
                          <td colSpan={9} className="px-8 py-4">
                            {est.items.length > 0 ? (
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
                                  {est.items.map((it) => (
                                    <tr key={it.id}>
                                      <td className="px-3 py-1.5">{it.name}</td>
                                      <td className="px-3 py-1.5 text-right">{it.quantity}</td>
                                      <td className="px-3 py-1.5 text-right">{formatCurrency(it.unitPrice)}</td>
                                      <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(it.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-white border-t border-slate-200">
                                  <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">税抜合計</td><td className="px-3 py-1.5 text-right">{formatCurrency(est.amount)}</td></tr>
                                  <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">消費税(10%)</td><td className="px-3 py-1.5 text-right">{formatCurrency(est.taxAmount)}</td></tr>
                                  <tr className="font-bold"><td colSpan={3} className="px-3 py-1.5 text-right">税込合計</td><td className="px-3 py-1.5 text-right">{formatCurrency(est.totalAmount)}</td></tr>
                                </tfoot>
                              </table>
                            ) : (
                              <p className="text-xs text-slate-400">明細なし</p>
                            )}
                            {est.notes && <p className="text-xs text-slate-500 mt-2">備考: {est.notes}</p>}
                            {est.approvedBy && <p className="text-xs text-green-600 mt-1">承認者: {est.approvedBy} {est.approvedAt ? `(${formatDate(est.approvedAt)})` : ''}</p>}
                            {est.rejectedBy && <p className="text-xs text-red-600 mt-1">却下者: {est.rejectedBy} {est.rejectedAt ? `(${formatDate(est.rejectedAt)})` : ''}{est.rejectionReason ? ` — ${est.rejectionReason}` : ''}</p>}
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

      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">テンプレートを選択</h3>
              <button onClick={() => setShowTemplatePicker(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {estimateTemplates.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">見積テンプレートがありません</p>
              ) : (
                estimateTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-slate-900 text-sm">{t.name}</p>
                      {t.category && <span className="text-xs text-slate-400">{t.category}</span>}
                    </div>
                    <p className="text-xs text-slate-500">{t.items.length}品目</p>
                    {t.items.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {t.items.slice(0, 3).map((it) => (
                          <li key={it.id} className="text-xs text-slate-600">{it.description}</li>
                        ))}
                        {t.items.length > 3 && <li className="text-xs text-slate-400">...他{t.items.length - 3}品目</li>}
                      </ul>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{editTarget ? '見積を編集' : '見積を作成'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                {!editTarget && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">案件 <span className="text-red-500">*</span></label>
                    <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">選択してください</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">見積日</label>
                    <input type="date" value={form.estimateDate} onChange={(e) => setForm({ ...form, estimateDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">有効期限</label>
                    <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {ESTIMATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">明細</label>
                    <button
                      type="button"
                      onClick={openTemplatePicker}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg"
                    >
                      <BookTemplate className="w-3.5 h-3.5" /> テンプレートから追加
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-xs text-slate-500">
                          <th className="px-3 py-2 text-left">品目</th>
                          <th className="px-3 py-2 text-right w-20">数量</th>
                          <th className="px-3 py-2 text-right w-28">単価</th>
                          <th className="px-3 py-2 text-right w-28">金額</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1.5">
                              <input type="text" value={it.name} onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="品目名" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} min="0"
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} min="0"
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={it.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} min="0"
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-2 py-1.5">
                              <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                      <button type="button" onClick={() => setItems((prev) => [...prev, defaultItem()])}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> 行を追加
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm space-y-0.5">
                    <div className="flex justify-end gap-8 text-slate-500"><span>税抜合計</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-end gap-8 text-slate-500"><span>消費税(10%)</span><span>{formatCurrency(tax)}</span></div>
                    <div className="flex justify-end gap-8 font-bold text-slate-900"><span>税込合計</span><span>{formatCurrency(total)}</span></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">キャンセル</button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                  {saving ? '保存中...' : editTarget ? '更新する' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectModal && rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">見積を却下</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-slate-600">見積 <span className="font-medium">{rejectTarget.estimateNumber}</span> を却下します。</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">却下理由</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="却下理由を入力してください（任意）"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">キャンセル</button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectTarget.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium"
              >
                {actionLoading === rejectTarget.id ? '処理中...' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
