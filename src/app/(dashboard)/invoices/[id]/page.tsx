'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Printer, CheckCircle, XCircle, Clock, AlertCircle, CreditCard } from 'lucide-react'

interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod?: string | null
  notes?: string | null
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
  project: { id: string; name: string; projectNumber: string; address?: string | null }
  customer?: { id: string; name: string } | null
  items: InvoiceItem[]
  payments?: Payment[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  '未請求': { label: '未請求', color: 'bg-slate-100 text-slate-700', icon: Clock },
  '請求済': { label: '請求済', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  '承認依頼中': { label: '承認依頼中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  '承認済': { label: '承認済', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  '入金済': { label: '入金済', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  '差戻し': { label: '差戻し', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('振込')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setInvoice(data)
        setPaymentAmount(String(data.totalAmount || ''))
        setLoading(false)
      })
  }, [params.id])

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return
    setSaving(true)
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setInvoice(updated)
    }
    setSaving(false)
  }

  const handleRecordPayment = async () => {
    if (!invoice) return
    setSaving(true)
    const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(paymentAmount),
        paymentDate,
        paymentMethod,
        notes: paymentNotes || null,
      }),
    })
    if (res.ok) {
      setShowPaymentModal(false)
      const updated = await fetch(`/api/invoices/${invoice.id}`).then(r => r.json())
      setInvoice(updated)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!invoice) return <div className="p-8 text-center">請求書が見つかりません</div>

  const statusCfg = STATUS_CONFIG[invoice.status] || { label: invoice.status, color: 'bg-slate-100 text-slate-700', icon: Clock }
  const StatusIcon = statusCfg.icon

  return (
    <div>
      <Header title="請求詳細" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex gap-2">
            <Link
              href={`/invoices/${invoice.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              印刷
            </Link>
            {invoice.status !== '入金済' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700"
              >
                <CreditCard className="w-4 h-4" />
                入金記録
              </button>
            )}
          </div>
        </div>

        {/* Main info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">{invoice.invoiceNumber}</p>
              <h2 className="text-xl font-bold mt-1">{invoice.project?.name}</h2>
              {invoice.customer && <p className="text-slate-600 mt-0.5">{invoice.customer.name}</p>}
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusCfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusCfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">案件番号</p>
              <p className="font-medium">{invoice.project?.projectNumber}</p>
            </div>
            {invoice.project?.address && (
              <div>
                <p className="text-slate-500">現場住所</p>
                <p className="font-medium">{invoice.project.address}</p>
              </div>
            )}
            {invoice.invoiceDate && (
              <div>
                <p className="text-slate-500">請求日</p>
                <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
              </div>
            )}
            {invoice.dueDate && (
              <div>
                <p className="text-slate-500">支払期限</p>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
            )}
            {invoice.paidDate && (
              <div>
                <p className="text-slate-500">入金日</p>
                <p className="font-medium text-emerald-600">{formatDate(invoice.paidDate)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Amount breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">金額</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">税抜金額</span>
              <span className="font-medium">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">消費税（10%）</span>
              <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-bold text-base">請求金額（税込）</span>
              <span className="font-bold text-xl text-blue-600">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        {invoice.items.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-4">明細</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">品目</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-16">数量</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-28">単価</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-28">金額</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-2">備考</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Status workflow */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">ステータス変更</h3>
          <div className="flex flex-wrap gap-2">
            {['未請求', '承認依頼中', '承認済', '請求済', '入金済', '差戻し'].map(s => (
              <button
                key={s}
                disabled={saving || invoice.status === s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  invoice.status === s
                    ? 'bg-slate-900 text-white border-slate-900 cursor-default'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg">入金記録</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">入金額</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">入金日</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">支払方法</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option>振込</option>
                <option>現金</option>
                <option>小切手</option>
                <option>その他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
              <textarea
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="border border-slate-300 px-4 py-2 rounded-lg text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={saving}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '記録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
