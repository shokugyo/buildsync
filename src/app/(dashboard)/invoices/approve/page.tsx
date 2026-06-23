'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, XCircle, X, Receipt } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  taxAmount: number
  totalAmount: number
  invoiceDate?: string | null
  dueDate?: string | null
  notes?: string | null
  project: { id: string; name: string; projectNumber: string }
  customer?: { id: string; name: string } | null
}

export default function InvoiceApprovePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState<{ invoice: Invoice; action: 'approve' | 'reject' } | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchInvoices = () => {
    setLoading(true)
    fetch('/api/invoices')
      .then((r) => r.json())
      .then((d) => {
        const all = Array.isArray(d) ? d : []
        setInvoices(all.filter((inv: Invoice) => inv.status === '承認依頼中'))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchInvoices() }, [])

  const updateStatus = async (invoice: Invoice, newStatus: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id))
        setActionModal(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = invoices.length

  return (
    <div>
      <Header title="請求承認" />
      <div className="p-6">
        {/* Back link + heading */}
        <div className="flex items-center gap-3 mb-6">
          <a
            href="/invoices"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            ← 請求一覧へ戻る
          </a>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {pendingCount}件 承認待ち
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">承認待ちの請求はありません</p>
            <a
              href="/invoices"
              className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
            >
              請求一覧へ戻る
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">請求番号</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">案件名</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">請求先</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">税込合計</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">支払期限</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 text-sm">{inv.project.name}</p>
                        <p className="text-xs text-slate-400">{inv.project.projectNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{inv.customer?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(inv.dueDate) || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setActionModal({ invoice: inv, action: 'approve' })}
                            className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                          >
                            <CheckCircle2 className="w-3 h-3" />承認
                          </button>
                          <button
                            onClick={() => setActionModal({ invoice: inv, action: 'reject' })}
                            className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                          >
                            <XCircle className="w-3 h-3" />差戻し
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

      {/* Action confirmation modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {actionModal.action === 'approve' ? '承認する' : '差戻す'}
              </h2>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{actionModal.invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500 mt-0.5">{actionModal.invoice.project.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                請求先: {actionModal.invoice.customer?.name ?? '-'}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1">
                {formatCurrency(actionModal.invoice.totalAmount)}（税込）
              </p>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              この請求を「{actionModal.action === 'approve' ? '承認済' : '差戻し'}」にしますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  updateStatus(
                    actionModal.invoice,
                    actionModal.action === 'approve' ? '承認済' : '差戻し'
                  )
                }
                disabled={saving}
                className={`flex-1 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium ${
                  actionModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {saving ? '処理中...' : actionModal.action === 'approve' ? '承認する' : '差戻す'}
              </button>
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
