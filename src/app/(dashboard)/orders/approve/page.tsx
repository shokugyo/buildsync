'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, Clock, XCircle, Send, X, RotateCcw } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  subject: string
  status: string
  amount: number
  totalAmount: number
  orderDate?: string | null
  deliveryDate?: string | null
  notes?: string | null
  project: { id: string; name: string; projectNumber: string }
  supplier?: { id: string; name: string } | null
}

const STATUS_TABS = [
  { value: '下書き', label: '下書き' },
  { value: '承認依頼中', label: '承認依頼中' },
  { value: '承認済', label: '承認済' },
  { value: '差戻し', label: '差戻し' },
  { value: 'all', label: 'すべて' },
]

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    '下書き': 'bg-slate-100 text-slate-600',
    '承認依頼中': 'bg-amber-100 text-amber-700',
    '承認済': 'bg-green-100 text-green-700',
    '差戻し': 'bg-red-100 text-red-700',
    '発注済': 'bg-blue-100 text-blue-700',
    '受領確認済': 'bg-purple-100 text-purple-700',
    '取消': 'bg-slate-100 text-slate-400',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

export default function OrderApprovePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('承認依頼中')
  const [actionModal, setActionModal] = useState<{ order: Order; action: 'approve' | 'reject' | 'request' | 'cancel' } | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchOrders = () => {
    setLoading(true)
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [])

  const filtered = orders.filter(o =>
    statusFilter === 'all' ? true : o.status === statusFilter
  )

  const counts = {
    '下書き': orders.filter(o => o.status === '下書き').length,
    '承認依頼中': orders.filter(o => o.status === '承認依頼中').length,
    '承認済': orders.filter(o => o.status === '承認済').length,
    '差戻し': orders.filter(o => o.status === '差戻し').length,
  }

  const updateStatus = async (order: Order, newStatus: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
        setActionModal(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const actionLabel = (action: string) => ({
    approve: '承認する',
    reject: '差戻す',
    request: '承認依頼を送る',
    cancel: '取消にする',
  }[action] ?? '')

  const actionStatus = (action: string) => ({
    approve: '承認済',
    reject: '差戻し',
    request: '承認依頼中',
    cancel: '取消',
  }[action] ?? '')

  return (
    <div>
      <Header title="発注承認" />
      <div className="p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Object.entries(counts).map(([status, count]) => (
            <div key={status} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs text-slate-500 mb-1">{status}</p>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
            </div>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === tab.value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.value !== 'all' && counts[tab.value as keyof typeof counts] != null && (
                <span className="ml-1 text-xs opacity-70">({counts[tab.value as keyof typeof counts]})</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">該当する発注がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">発注番号</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">件名</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">案件</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">業者</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">金額（税込）</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">発注日</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">ステータス</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-400">{order.orderNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{order.subject}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{order.project.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{order.supplier?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(order.orderDate) || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          {order.status === '下書き' && (
                            <button
                              onClick={() => setActionModal({ order, action: 'request' })}
                              className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded"
                            >
                              <Send className="w-3 h-3" />承認依頼
                            </button>
                          )}
                          {order.status === '承認依頼中' && (
                            <>
                              <button
                                onClick={() => setActionModal({ order, action: 'approve' })}
                                className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                              >
                                <CheckCircle2 className="w-3 h-3" />承認
                              </button>
                              <button
                                onClick={() => setActionModal({ order, action: 'reject' })}
                                className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                              >
                                <XCircle className="w-3 h-3" />差戻し
                              </button>
                            </>
                          )}
                          {order.status === '差戻し' && (
                            <button
                              onClick={() => setActionModal({ order, action: 'request' })}
                              className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded"
                            >
                              <RotateCcw className="w-3 h-3" />再申請
                            </button>
                          )}
                          {order.status === '承認済' && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />承認済
                            </span>
                          )}
                          {(order.status === '下書き' || order.status === '承認依頼中' || order.status === '差戻し') && (
                            <button
                              onClick={() => setActionModal({ order, action: 'cancel' })}
                              className="flex items-center gap-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-500 px-2 py-1 rounded"
                            >
                              <X className="w-3 h-3" />取消
                            </button>
                          )}
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
              <h2 className="font-semibold text-slate-900">{actionLabel(actionModal.action)}</h2>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{actionModal.order.subject}</p>
              <p className="text-xs text-slate-500 mt-0.5">{actionModal.order.project.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(actionModal.order.totalAmount)}（税込）</p>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              この発注を「{actionStatus(actionModal.action)}」にしますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus(actionModal.order, actionStatus(actionModal.action))}
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
