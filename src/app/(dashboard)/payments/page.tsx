'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CreditCard, AlertCircle, X } from 'lucide-react'

interface PaymentInvoice {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  taxAmount: number
  totalAmount: number
  invoiceDate?: string | null
  dueDate?: string | null
  paidDate?: string | null
  project: { id: string; name: string; projectNumber: string }
  customer?: { id: string; name: string } | null
  payments: { id: string; amount: number; paidAt: string; paymentMethod?: string | null }[]
}

interface Summary {
  totalAmount: number
  totalPaid: number
  unpaidAmount: number
}

interface PaymentModal {
  invoiceId: string
  invoiceNumber: string
  totalAmount: number
}

function getPaymentStatusBadge(inv: PaymentInvoice) {
  const now = new Date()
  const isOverdue = inv.status !== '入金済' && inv.status !== '取消' && !!inv.dueDate && new Date(inv.dueDate) < now

  if (inv.status === '入金済') {
    return <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">支払済</span>
  }
  if (isOverdue) {
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-900 text-white"><AlertCircle className="w-3 h-3" />期限超過</span>
  }
  return <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">未払</span>
}

export default function PaymentsPage() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [month, setMonth] = useState(defaultMonth)
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([])
  const [summary, setSummary] = useState<Summary>({ totalAmount: 0, totalPaid: 0, unpaidAmount: 0 })
  const [loading, setLoading] = useState(true)

  // Payment modal state
  const [modal, setModal] = useState<PaymentModal | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payMethod, setPayMethod] = useState('振込')
  const [payNotes, setPayNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fetchData = useCallback(async (selectedMonth: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments?month=${selectedMonth}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(Array.isArray(data.invoices) ? data.invoices : [])
        setSummary(data.summary || { totalAmount: 0, totalPaid: 0, unpaidAmount: 0 })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(month)
  }, [fetchData, month])

  const openModal = (inv: PaymentInvoice) => {
    setModal({ invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, totalAmount: inv.totalAmount })
    setPayAmount(String(inv.totalAmount))
    setPayDate(new Date().toISOString().slice(0, 10))
    setPayMethod('振込')
    setPayNotes('')
    setSaveError('')
  }

  const closeModal = () => {
    setModal(null)
    setSaveError('')
  }

  const handleSavePayment = async () => {
    if (!modal) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/invoices/${modal.invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          paidAt: payDate,
          paymentMethod: payMethod,
          notes: payNotes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveError(err.error || '保存に失敗しました')
        return
      }
      closeModal()
      fetchData(month)
    } catch {
      setSaveError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="支払管理" />
      <div className="p-6">
        {/* Month filter */}
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm font-medium text-slate-700">対象月</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">支払予定合計</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">支払済合計</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">未払残高</p>
            <p className={`text-xl font-bold ${summary.unpaidAmount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatCurrency(summary.unpaidAmount)}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">該当月の支払データがありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 text-left">請求書番号</th>
                    <th className="px-4 py-3 text-left">取引先名</th>
                    <th className="px-4 py-3 text-left">案件名</th>
                    <th className="px-4 py-3 text-right">請求金額</th>
                    <th className="px-4 py-3 text-left">支払期限</th>
                    <th className="px-4 py-3 text-left">状態</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => {
                    const isOverdue = inv.status !== '入金済' && inv.status !== '取消' && !!inv.dueDate && new Date(inv.dueDate) < new Date()
                    const isPaid = inv.status === '入金済' || inv.status === '取消'
                    return (
                      <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/40' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{inv.customer?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 text-xs">{inv.project?.name}</p>
                          <p className="text-xs text-slate-400">{inv.project?.projectNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                        <td className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-4 py-3">
                          {getPaymentStatusBadge(inv)}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <button
                              onClick={() => openModal(inv)}
                              className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-md hover:bg-emerald-700 transition-colors font-medium"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              支払済にする
                            </button>
                          )}
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

      {/* Payment Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">入金記録</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">請求書番号: <span className="font-mono font-medium text-slate-700">{modal.invoiceNumber}</span></p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">入金金額 (円)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">入金日</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">支払方法</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="振込">振込</option>
                  <option value="現金">現金</option>
                  <option value="小切手">小切手</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">備考 (任意)</label>
                <textarea
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="メモがあれば入力..."
                />
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-xs text-red-600">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSavePayment}
                disabled={saving || !payAmount || !payDate}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '入金記録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
