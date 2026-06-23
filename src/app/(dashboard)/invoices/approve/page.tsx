'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, XCircle, X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

interface ApprovalRecord {
  id: string
  level: number
  action: string
  comment?: string | null
  createdAt: string
  approver: { id: string; name: string }
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
  notes?: string | null
  rejectReason?: string | null
  project: { id: string; name: string; projectNumber: string }
  customer?: { id: string; name: string } | null
  approvals?: ApprovalRecord[]
}

const THRESHOLD = 1_000_000

export default function InvoiceApprovePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [approvalHistories, setApprovalHistories] = useState<Record<string, ApprovalRecord[]>>({})

  // Modal state
  const [actionModal, setActionModal] = useState<{
    invoice: Invoice
    action: '承認' | '差し戻し'
  } | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchApprovalHistory = async (invoiceId: string) => {
    if (approvalHistories[invoiceId]) return
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/approve`)
      if (res.ok) {
        const data = await res.json()
        setApprovalHistories((prev) => ({ ...prev, [invoiceId]: Array.isArray(data) ? data : [] }))
      }
    } catch {
      // ignore
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchApprovalHistory(id)
    }
  }

  const openModal = (invoice: Invoice, action: '承認' | '差し戻し') => {
    setActionModal({ invoice, action })
    setComment('')
    setResultMsg(null)
  }

  const handleAction = async () => {
    if (!actionModal) return
    if (actionModal.action === '差し戻し' && !comment.trim()) {
      setResultMsg({ type: 'error', text: '差し戻し理由を入力してください' })
      return
    }
    setSaving(true)
    setResultMsg(null)
    try {
      const res = await fetch(`/api/invoices/${actionModal.invoice.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          comment: comment.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResultMsg({ type: 'error', text: data.error || '処理に失敗しました' })
        return
      }

      // レベル1完了・まだ承認依頼中のケース
      const isStillPending = data.status === '承認依頼中'
      const msg = data._message as string | undefined

      if (isStillPending) {
        // リストを更新（まだ残る）
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === data.id ? { ...data } : inv))
        )
        setApprovalHistories((prev) => {
          const { [data.id]: _, ...rest } = prev
          return rest
        })
        setActionModal(null)
        alert(msg || 'レベル1承認が完了しました。レベル2の承認が必要です。')
      } else {
        // 承認済 or 差し戻し → リストから除外
        setInvoices((prev) => prev.filter((inv) => inv.id !== data.id))
        setApprovalHistories((prev) => {
          const { [data.id]: _, ...rest } = prev
          return rest
        })
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
                    <th className="px-2 py-2.5 w-8" />
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">請求番号</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">案件名</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">請求先</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">税込合計</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">支払期限</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const needsTwo = inv.totalAmount >= THRESHOLD
                    const history = approvalHistories[inv.id] || []
                    const level1Done = history.some((a) => a.level === 1 && a.action === '承認')
                    const isExpanded = expandedId === inv.id
                    return (
                      <>
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="px-2 py-3">
                            <button
                              onClick={() => toggleExpand(inv.id)}
                              className="text-slate-400 hover:text-slate-600"
                              title="承認履歴"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 text-sm">{inv.project.name}</p>
                            <p className="text-xs text-slate-400">{inv.project.projectNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {inv.customer?.name ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-slate-900">
                              {formatCurrency(inv.totalAmount)}
                            </span>
                            {needsTwo && (
                              <span className="ml-2 inline-flex items-center gap-0.5 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3" />
                                2段階承認が必要です
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(inv.dueDate) || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {needsTwo && level1Done ? (
                                <span className="text-xs text-amber-600 font-medium mr-1">Lv.2待ち</span>
                              ) : null}
                              <button
                                onClick={() => openModal(inv, '承認')}
                                className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {needsTwo && !level1Done ? 'Lv.1承認' : needsTwo && level1Done ? 'Lv.2承認' : '承認'}
                              </button>
                              <button
                                onClick={() => openModal(inv, '差し戻し')}
                                className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                              >
                                <XCircle className="w-3 h-3" />差戻し
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${inv.id}-history`} className="bg-slate-50">
                            <td colSpan={7} className="px-8 py-4">
                              <p className="text-xs font-semibold text-slate-600 mb-2">承認履歴</p>
                              {history.length === 0 ? (
                                <p className="text-xs text-slate-400">承認履歴はまだありません</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {history.map((h) => (
                                    <li
                                      key={h.id}
                                      className="flex items-start gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-slate-100"
                                    >
                                      <span
                                        className={`mt-0.5 inline-block px-1.5 py-0.5 rounded-full font-medium text-xs ${
                                          h.action === '承認'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        Lv.{h.level} {h.action}
                                      </span>
                                      <div className="flex-1">
                                        <span className="font-medium text-slate-700">{h.approver.name}</span>
                                        {h.comment && (
                                          <p className="text-slate-500 mt-0.5">{h.comment}</p>
                                        )}
                                      </div>
                                      <span className="text-slate-400 whitespace-nowrap">
                                        {formatDate(h.createdAt)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
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

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {actionModal.action === '承認' ? '承認する' : '差戻す'}
              </h2>
              <button
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">
                {actionModal.invoice.invoiceNumber}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{actionModal.invoice.project.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                請求先: {actionModal.invoice.customer?.name ?? '-'}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-1">
                {formatCurrency(actionModal.invoice.totalAmount)}（税込）
              </p>
              {actionModal.invoice.totalAmount >= THRESHOLD && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  100万円以上のため2段階承認が必要です
                </p>
              )}
            </div>

            {/* コメント入力（差し戻しは必須、承認は任意） */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                コメント
                {actionModal.action === '差し戻し' && (
                  <span className="text-red-500 ml-1">*必須</span>
                )}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={
                  actionModal.action === '差し戻し'
                    ? '差し戻し理由を入力してください'
                    : 'コメント（任意）'
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {resultMsg && (
              <p
                className={`text-sm px-3 py-2 rounded mb-3 ${
                  resultMsg.type === 'error'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {resultMsg.text}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={saving}
                className={`flex-1 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium ${
                  actionModal.action === '承認'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {saving
                  ? '処理中...'
                  : actionModal.action === '承認'
                  ? '承認する'
                  : '差戻す'}
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
