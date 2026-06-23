'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, XCircle, X, ArrowLeft } from 'lucide-react'

interface Estimate {
  id: string
  estimateNumber: string
  estimateDate?: string | null
  validUntil?: string | null
  totalAmount: number
  status: string
  project: { id: string; name: string; projectNumber: string }
}

export default function EstimateApprovePage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState<{ estimate: Estimate; action: 'approve' | 'reject' } | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchEstimates = () => {
    setLoading(true)
    fetch('/api/estimates?status=承認依頼中')
      .then(r => r.json())
      .then(d => { setEstimates(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchEstimates() }, [])

  const updateStatus = async (estimate: Estimate, newStatus: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setEstimates(prev => prev.filter(e => e.id !== estimate.id))
        setActionModal(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const actionLabel = (action: 'approve' | 'reject') =>
    action === 'approve' ? '承認する' : '差戻す'

  const actionStatus = (action: 'approve' | 'reject') =>
    action === 'approve' ? '承認済' : '差戻し'

  return (
    <div>
      <Header title="見積承認" />
      <div className="p-6">
        <div className="mb-6">
          <Link href="/estimates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            見積一覧に戻る
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : estimates.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">承認待ちの見積はありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-sm text-slate-500">
                承認依頼中の見積：<span className="font-semibold text-slate-900">{estimates.length}件</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">見積番号</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">案件名</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">金額（税込）</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">見積日</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">有効期限</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estimates.map(estimate => (
                    <tr key={estimate.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{estimate.estimateNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{estimate.project.name}</p>
                        <p className="text-xs text-slate-400">{estimate.project.projectNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(estimate.totalAmount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(estimate.estimateDate) || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(estimate.validUntil) || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setActionModal({ estimate, action: 'approve' })}
                            className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                          >
                            <CheckCircle2 className="w-3 h-3" />承認
                          </button>
                          <button
                            onClick={() => setActionModal({ estimate, action: 'reject' })}
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

      {/* Confirmation modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{actionLabel(actionModal.action)}</h2>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{actionModal.estimate.estimateNumber}</p>
              <p className="text-xs text-slate-500 mt-0.5">{actionModal.estimate.project.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(actionModal.estimate.totalAmount)}（税込）</p>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              この見積を「{actionStatus(actionModal.action)}」にしますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus(actionModal.estimate, actionStatus(actionModal.action))}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                {saving ? '処理中...' : actionLabel(actionModal.action)}
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
