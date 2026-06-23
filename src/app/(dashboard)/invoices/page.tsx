'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils'
import { Receipt, Plus, X, Trash2, Printer, Pencil, Download, AlertCircle, ChevronDown, ChevronRight, CreditCard, Bell, Eye, Upload } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'

interface LineItem {
  id?: string
  name: string
  quantity: string
  unitPrice: string
  amount: string
  taxRate: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  taxAmount: number
  totalAmount: number
  invoiceDate?: string | null
  dueDate?: string | null
  paidDate?: string | null
  notes?: string | null
  reminderSentAt?: string | null
  reminderCount: number
  project: { id: string; name: string; projectNumber: string }
  customer?: { id: string; name: string } | null
  items: { id: string; name: string; quantity: number; unitPrice: number; amount: number; sortOrder: number; taxRate: number }[]
}

interface PaymentRecord {
  id: string
  invoiceId: string
  amount: number
  paidAt: string
  paymentMethod?: string | null
  notes?: string | null
  createdAt: string
  recorder: { id: string; name: string }
}

const INVOICE_STATUSES = ['未作成', '作成済', '確認中', '承認依頼中', '承認済', '差戻し', '送付済', '入金待ち', '入金済', '取消']

const STATUS_COLORS: Record<string, string> = {
  '未作成': 'bg-slate-100 text-slate-600',
  '作成済': 'bg-slate-100 text-slate-700',
  '確認中': 'bg-yellow-100 text-yellow-700',
  '承認依頼中': 'bg-amber-100 text-amber-700',
  '承認済': 'bg-green-100 text-green-700',
  '差戻し': 'bg-red-100 text-red-700',
  '送付済': 'bg-blue-100 text-blue-700',
  '入金待ち': 'bg-purple-100 text-purple-700',
  '入金済': 'bg-emerald-100 text-emerald-700',
  '取消': 'bg-slate-100 text-slate-400',
}

function defaultItem(): LineItem {
  return { name: '', quantity: '1', unitPrice: '0', amount: '0', taxRate: 10 }
}

const defaultForm = {
  projectId: '',
  customerId: '',
  invoiceDate: '',
  dueDate: '',
  status: '未作成',
  notes: '',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Invoice | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [items, setItems] = useState<LineItem[]>([defaultItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [companyInfo, setCompanyInfo] = useState<{ registrationNumber?: string | null } | null>(null)

  // Payment recording state
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [paymentRecordsLoading, setPaymentRecordsLoading] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', paidAt: '', paymentMethod: '銀行振込', notes: '' })
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  const fetchAll = useCallback(async () => {
    const safeJson = async (r: Response) => { try { return await r.json() } catch { return null } }
    const [inv, proj, cust] = await Promise.all([
      fetch('/api/invoices').then(safeJson),
      fetch('/api/projects').then(safeJson),
      fetch('/api/customers').then(safeJson),
    ])
    setInvoices(Array.isArray(inv) ? inv : [])
    setProjects(Array.isArray(proj) ? proj : [])
    setCustomers(Array.isArray(cust) ? cust : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    fetch('/api/company')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCompanyInfo(data) })
      .catch(() => {})
  }, [])

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
  const subtotal10 = items.filter(it => it.taxRate === 10).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
  const subtotal8 = items.filter(it => it.taxRate === 8).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
  const subtotal0 = items.filter(it => it.taxRate === 0).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
  const tax10 = Math.round(subtotal10 * 0.1)
  const tax8 = Math.round(subtotal8 * 0.08)
  const tax = tax10 + tax8
  const total = subtotal + tax

  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...defaultForm, invoiceDate: new Date().toISOString().split('T')[0] })
    setItems([defaultItem()])
    setError('')
    setShowModal(true)
  }

  const openEdit = (inv: Invoice) => {
    setEditTarget(inv)
    setForm({
      projectId: inv.project.id,
      customerId: inv.customer?.id || '',
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : '',
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
      status: inv.status,
      notes: inv.notes || '',
    })
    setItems(
      inv.items.length > 0
        ? inv.items.map((it) => ({
            id: it.id,
            name: it.name,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
            amount: String(it.amount),
            taxRate: it.taxRate ?? 10,
          }))
        : [defaultItem()]
    )
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.projectId) { setError('案件は必須です'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        customerId: form.customerId || null,
        invoiceDate: form.invoiceDate || null,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        items: items.filter((it) => it.name).map((it) => ({
          name: it.name,
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          amount: parseFloat(it.amount) || 0,
          taxRate: it.taxRate,
        })),
      }
      const url = editTarget ? `/api/invoices/${editTarget.id}` : '/api/invoices'
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { setError('保存に失敗しました'); return }
      const saved = await res.json()
      if (editTarget) {
        setInvoices((prev) => prev.map((i) => i.id === saved.id ? saved : i))
      } else {
        setInvoices((prev) => [saved, ...prev])
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この請求を削除しますか？')) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    setInvoices((prev) => prev.filter((i) => i.id !== id))
  }

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const saved = await res.json()
      setInvoices((prev) => prev.map((i) => i.id === id ? saved : i))
    }
  }

  const sendReminder = async (id: string) => {
    setSendingReminder(id)
    try {
      const res = await fetch(`/api/invoices/${id}/reminder`, { method: 'POST' })
      if (res.ok) await fetchAll()
    } finally {
      setSendingReminder(null)
    }
  }

  const openPaymentModal = async (inv: Invoice) => {
    setPaymentTarget(inv)
    setPaymentForm({ amount: '', paidAt: new Date().toISOString().split('T')[0], paymentMethod: '銀行振込', notes: '' })
    setPaymentError('')
    setPaymentRecordsLoading(true)
    try {
      const res = await fetch(`/api/invoices/${inv.id}/payments`)
      if (res.ok) {
        const data = await res.json()
        setPaymentRecords(Array.isArray(data) ? data : [])
      }
    } finally {
      setPaymentRecordsLoading(false)
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentTarget) return
    if (!paymentForm.amount || !paymentForm.paidAt) { setPaymentError('金額と入金日は必須です'); return }
    setSavingPayment(true)
    setPaymentError('')
    try {
      const res = await fetch(`/api/invoices/${paymentTarget.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          paidAt: paymentForm.paidAt,
          paymentMethod: paymentForm.paymentMethod || null,
          notes: paymentForm.notes || null,
        }),
      })
      if (!res.ok) { setPaymentError('保存に失敗しました'); return }
      const newRecord = await res.json()
      setPaymentRecords(prev => [newRecord, ...prev])
      setPaymentForm({ amount: '', paidAt: new Date().toISOString().split('T')[0], paymentMethod: '銀行振込', notes: '' })
      // Refresh invoices list to reflect potential status change to 入金済
      await fetchAll()
    } finally {
      setSavingPayment(false)
    }
  }

  const isOverdue = (inv: Invoice) =>
    inv.status !== '入金済' && inv.status !== '取消' && !!inv.dueDate && new Date(inv.dueDate) < new Date()

  const filtered = statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices
  const pendingApprovalCount = invoices.filter((i) => i.status === '承認依頼中').length

  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalReceived = invoices.filter((i) => i.status === '入金済').reduce((s, i) => s + i.totalAmount, 0)
  const totalPending = invoices.filter((i) => ['入金待ち', '送付済'].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0)
  const overdueCount = invoices.filter(isOverdue).length

  return (
    <div>
      <Header title="請求管理" />
      <div className="p-6">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">総請求件数</p>
            <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">請求総額（税込）</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalBilled)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">入金待ち</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">期限超過 / 入金済</p>
            <p className="text-lg font-bold">
              <span className="text-red-600">{overdueCount}件</span>
              <span className="text-xs text-slate-400 mx-1">/</span>
              <span className="text-emerald-600">{formatCurrency(totalReceived)}</span>
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex gap-3 mb-4">
          <a
            href="/invoices/approve"
            className="relative flex items-center gap-2 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            承認依頼一覧
            {pendingApprovalCount > 0 && (
              <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{pendingApprovalCount}</span>
            )}
          </a>
        </div>

        {/* Filters + actions */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべてのステータス</option>
            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Upload className="w-4 h-4" /> CSVインポート
            </button>
            <a
              href="/api/export/invoices"
              download
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> CSV出力
            </a>
            <a
              href="/api/export/invoices/xlsx"
              download
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Excel出力
            </a>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 請求を作成
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件</p>

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">請求データがありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-2 py-3 w-6" />
                    <th className="px-4 py-3 text-left">請求番号</th>
                    <th className="px-4 py-3 text-left">案件</th>
                    <th className="px-4 py-3 text-left">請求先</th>
                    <th className="px-4 py-3 text-left">ステータス</th>
                    <th className="px-4 py-3 text-right">税抜金額</th>
                    <th className="px-4 py-3 text-right">税込合計</th>
                    <th className="px-4 py-3 text-left">請求日</th>
                    <th className="px-4 py-3 text-left">支払期限</th>
                    <th className="px-4 py-3 text-left">入金日</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((inv) => {
                    const overdue = isOverdue(inv)
                    return (
                      <>
                        <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${overdue ? 'bg-red-50/40' : ''}`}>
                          <td className="px-2 py-3">
                            <button
                              onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              {expandedId === inv.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 flex items-center gap-1">
                            {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                            {inv.invoiceNumber}
                            {inv.reminderCount > 0 && (
                              <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-medium">{inv.reminderCount}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 text-xs">{inv.project?.name}</p>
                            <p className="text-xs text-slate-400">{inv.project?.projectNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{inv.customer?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <select
                              value={inv.status}
                              onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_COLORS[inv.status] || 'bg-slate-100 text-slate-600'}`}
                            >
                              {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(inv.amount)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                          <td className={`px-4 py-3 text-xs whitespace-nowrap ${overdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                            {formatDate(inv.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {inv.paidDate ? formatDate(inv.paidDate) : (inv.status === '入金済' ? '—' : '')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <a href={`/invoices/${inv.id}`} className="p-1 text-slate-400 hover:text-blue-600" title="詳細">
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => openEdit(inv)} className="p-1 text-slate-400 hover:text-blue-600" title="編集">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <a href={`/invoices/${inv.id}/print`} target="_blank" className="p-1 text-slate-400 hover:text-slate-700" title="印刷">
                                <Printer className="w-3.5 h-3.5" />
                              </a>
                              <a href={`/invoices/${inv.id}/payment-notice/print`} target="_blank" className="p-1 text-slate-400 hover:text-indigo-600 text-xs font-medium" title="支払通知書">
                                支払
                              </a>
                              {inv.status === '入金済' && (
                                <a href={`/invoices/${inv.id}/receipt/print`} target="_blank" className="p-1 text-slate-400 hover:text-emerald-600 text-xs font-medium" title="領収書">
                                  領収
                                </a>
                              )}
                              {(inv.status === '入金待ち' || inv.status === '送付済') && (
                                <button onClick={() => openPaymentModal(inv)} className="p-1 text-slate-400 hover:text-emerald-600" title="入金記録">
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {overdue && (
                                <button
                                  onClick={() => sendReminder(inv.id)}
                                  disabled={sendingReminder === inv.id}
                                  className="p-1 text-slate-400 hover:text-orange-600 disabled:opacity-50"
                                  title="リマインダー送信"
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => handleDelete(inv.id)} className="p-1 text-slate-400 hover:text-red-600" title="削除">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === inv.id && (
                          <tr key={`${inv.id}-detail`} className="bg-slate-50">
                            <td colSpan={11} className="px-8 py-4">
                              {companyInfo?.registrationNumber && (
                                <p className="text-xs text-slate-500 mb-2">
                                  適格請求書発行事業者登録番号: <span className="font-medium text-slate-700">{companyInfo.registrationNumber}</span>
                                </p>
                              )}
                              {inv.items.length > 0 ? (
                                <table className="w-full max-w-2xl text-xs border border-slate-200 rounded">
                                  <thead className="bg-white">
                                    <tr className="text-slate-500">
                                      <th className="px-3 py-2 text-left">品目</th>
                                      <th className="px-3 py-2 text-right">数量</th>
                                      <th className="px-3 py-2 text-right">単価</th>
                                      <th className="px-3 py-2 text-right">税率</th>
                                      <th className="px-3 py-2 text-right">金額</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {inv.items.map((it) => (
                                      <tr key={it.id}>
                                        <td className="px-3 py-1.5">{it.name}</td>
                                        <td className="px-3 py-1.5 text-right">{it.quantity}</td>
                                        <td className="px-3 py-1.5 text-right">{formatCurrency(it.unitPrice)}</td>
                                        <td className="px-3 py-1.5 text-right">{it.taxRate === 0 ? '非課税' : `${it.taxRate}%`}</td>
                                        <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(it.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-white border-t border-slate-200">
                                    {(() => {
                                      const sub10 = inv.items.filter(i => i.taxRate === 10).reduce((s, i) => s + i.amount, 0)
                                      const sub8 = inv.items.filter(i => i.taxRate === 8).reduce((s, i) => s + i.amount, 0)
                                      const sub0 = inv.items.filter(i => i.taxRate === 0).reduce((s, i) => s + i.amount, 0)
                                      const t10 = Math.round(sub10 * 0.1)
                                      const t8 = Math.round(sub8 * 0.08)
                                      return (
                                        <>
                                          {sub10 > 0 && <tr><td colSpan={4} className="px-3 py-1.5 text-right text-slate-500">10%対象額</td><td className="px-3 py-1.5 text-right">{formatCurrency(sub10)}</td></tr>}
                                          {sub10 > 0 && <tr><td colSpan={4} className="px-3 py-1.5 text-right text-slate-500">消費税(10%)</td><td className="px-3 py-1.5 text-right">{formatCurrency(t10)}</td></tr>}
                                          {sub8 > 0 && <tr><td colSpan={4} className="px-3 py-1.5 text-right text-slate-500">8%対象額 ※軽減税率</td><td className="px-3 py-1.5 text-right">{formatCurrency(sub8)}</td></tr>}
                                          {sub8 > 0 && <tr><td colSpan={4} className="px-3 py-1.5 text-right text-slate-500">消費税(8%)</td><td className="px-3 py-1.5 text-right">{formatCurrency(t8)}</td></tr>}
                                          {sub0 > 0 && <tr><td colSpan={4} className="px-3 py-1.5 text-right text-slate-500">非課税額</td><td className="px-3 py-1.5 text-right">{formatCurrency(sub0)}</td></tr>}
                                          <tr><td colSpan={4} className="px-3 py-1.5 text-right text-slate-500">税抜合計</td><td className="px-3 py-1.5 text-right">{formatCurrency(inv.amount)}</td></tr>
                                          <tr><td colSpan={4} className="px-3 py-1.5 text-right text-slate-500">消費税合計</td><td className="px-3 py-1.5 text-right">{formatCurrency(inv.taxAmount)}</td></tr>
                                          <tr className="font-bold"><td colSpan={4} className="px-3 py-1.5 text-right">税込合計</td><td className="px-3 py-1.5 text-right">{formatCurrency(inv.totalAmount)}</td></tr>
                                        </>
                                      )
                                    })()}
                                  </tfoot>
                                </table>
                              ) : (
                                <p className="text-xs text-slate-400">明細なし</p>
                              )}
                              {inv.notes && <p className="text-xs text-slate-500 mt-2">備考: {inv.notes}</p>}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showImportModal && (
        <CsvImportModal
          title="請求"
          importApiUrl="/api/invoices/import"
          templateApiUrl="/api/export/templates/invoices"
          expectedColumns={['案件番号', '請求先', '請求日', '支払期限', '税抜金額', 'ステータス', '備考']}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); fetchAll() }}
        />
      )}

      {/* Payment Recording Modal */}
      {paymentTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-semibold text-slate-900">入金記録</h2>
                <p className="text-xs text-slate-500 mt-0.5">{paymentTarget.invoiceNumber} · 請求額 {formatCurrency(paymentTarget.totalAmount)}</p>
              </div>
              <button onClick={() => setPaymentTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing payment records */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-600 mb-2">入金履歴</p>
              {paymentRecordsLoading ? (
                <p className="text-xs text-slate-400">読み込み中...</p>
              ) : paymentRecords.length === 0 ? (
                <p className="text-xs text-slate-400">入金記録はありません</p>
              ) : (
                <>
                  <ul className="space-y-1.5 mb-2">
                    {paymentRecords.map(rec => (
                      <li key={rec.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium text-slate-700">{formatCurrency(rec.amount)}</span>
                          {rec.paymentMethod && <span className="ml-2 text-slate-500">{rec.paymentMethod}</span>}
                          {rec.notes && <span className="ml-2 text-slate-400">({rec.notes})</span>}
                        </div>
                        <div className="text-slate-400">
                          {formatDate(rec.paidAt)} · {rec.recorder.name}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between text-xs font-medium text-slate-700 pt-1 border-t border-slate-200">
                    <span>入金済合計</span>
                    <span className="text-emerald-600">{formatCurrency(paymentRecords.reduce((s, r) => s + r.amount, 0))}</span>
                  </div>
                </>
              )}
            </div>

            {/* New payment form */}
            <form onSubmit={handleRecordPayment}>
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm font-medium text-slate-700">入金を記録する</p>
                {paymentError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{paymentError}</p>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">金額 <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                      required
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">入金日 <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={paymentForm.paidAt}
                      onChange={e => setPaymentForm(f => ({ ...f, paidAt: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">入金方法</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="銀行振込">銀行振込</option>
                    <option value="現金">現金</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
                <button type="button" onClick={() => setPaymentTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                  閉じる
                </button>
                <button type="submit" disabled={savingPayment}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium">
                  {savingPayment ? '記録中...' : '入金を記録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{editTarget ? '請求を編集' : '請求を作成'}</h2>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">請求先（顧客）</label>
                    <select
                      value={form.customerId}
                      onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未選択</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">請求日</label>
                    <input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">支払期限</label>
                    <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                          <th className="px-3 py-2 text-right w-20">数量</th>
                          <th className="px-3 py-2 text-right w-28">単価</th>
                          <th className="px-3 py-2 text-right w-24">税率</th>
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
                              <select
                                value={it.taxRate}
                                onChange={(e) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, taxRate: Number(e.target.value) } : item))}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value={10}>10%</option>
                                <option value={8}>8%</option>
                                <option value={0}>非課税</option>
                              </select>
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
                    {subtotal10 > 0 && <div className="flex justify-end gap-8 text-slate-500"><span>10%対象額</span><span>{formatCurrency(subtotal10)}</span></div>}
                    {subtotal10 > 0 && <div className="flex justify-end gap-8 text-slate-500"><span>消費税(10%)</span><span>{formatCurrency(tax10)}</span></div>}
                    {subtotal8 > 0 && <div className="flex justify-end gap-8 text-slate-500"><span>8%対象額 ※軽減税率</span><span>{formatCurrency(subtotal8)}</span></div>}
                    {subtotal8 > 0 && <div className="flex justify-end gap-8 text-slate-500"><span>消費税(8%)</span><span>{formatCurrency(tax8)}</span></div>}
                    {subtotal0 > 0 && <div className="flex justify-end gap-8 text-slate-500"><span>非課税額</span><span>{formatCurrency(subtotal0)}</span></div>}
                    <div className="flex justify-end gap-8 text-slate-500"><span>税抜合計</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-end gap-8 text-slate-500"><span>消費税合計</span><span>{formatCurrency(tax)}</span></div>
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
