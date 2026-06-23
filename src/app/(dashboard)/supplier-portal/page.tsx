'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, Truck } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  subject: string
  workType?: string | null
  status: string
  orderDate?: string | null
  deliveryDate?: string | null
  amount: number
  taxAmount: number
  totalAmount: number
  confirmedAt?: string | null
  deliveredAt?: string | null
  notes?: string | null
  project: { id: string; name: string; projectNumber: string }
  supplier?: { id: string; name: string } | null
  items: { id: string; name: string; quantity: number; unitPrice: number; amount: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  '発注済': 'bg-blue-100 text-blue-700',
  '受領確認済': 'bg-green-100 text-green-700',
  '納品済': 'bg-purple-100 text-purple-700',
  '完了': 'bg-slate-100 text-slate-600',
}

export default function SupplierPortalPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders?supplierView=true')
      if (res.ok) {
        const data = await res.json()
        setOrders(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleConfirm = async (id: string) => {
    if (!confirm('この発注の受注を確認しますか？')) return
    setActionLoading(id + '_confirm')
    try {
      const res = await fetch(`/api/orders/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeliver = async (id: string) => {
    if (!confirm('納品完了を報告しますか？')) return
    setActionLoading(id + '_deliver')
    try {
      const res = await fetch(`/api/orders/${id}/deliver`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const totalCount = orders.length
  const pendingConfirmCount = orders.filter(o => !o.confirmedAt && o.status === '発注済').length
  const orderedCount = orders.filter(o => o.status === '発注済').length
  const deliveredCount = orders.filter(o => o.status === '納品済' || o.status === '完了').length

  return (
    <div>
      <Header title="協力会社ポータル" />
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">発注件数</p>
            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">承認待ち</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingConfirmCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">発注済</p>
            <p className="text-2xl font-bold text-blue-600">{orderedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">納品済</p>
            <p className="text-2xl font-bold text-purple-600">{deliveredCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">発注データがありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 text-left">発注番号</th>
                    <th className="px-4 py-3 text-left">案件名</th>
                    <th className="px-4 py-3 text-left">内容</th>
                    <th className="px-4 py-3 text-right">金額（税込）</th>
                    <th className="px-4 py-3 text-left">発注日</th>
                    <th className="px-4 py-3 text-left">ステータス</th>
                    <th className="px-4 py-3 text-left">受注確認</th>
                    <th className="px-4 py-3 text-left">納品報告</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{order.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 text-xs">{order.project?.name}</div>
                        <div className="text-xs text-slate-400">{order.project?.projectNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 text-xs">{order.subject}</div>
                        {order.workType && <div className="text-xs text-slate-400">{order.workType}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {order.orderDate ? formatDate(order.orderDate) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {order.confirmedAt ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />確認済
                          </span>
                        ) : order.status === '発注済' ? (
                          <button
                            onClick={() => handleConfirm(order.id)}
                            disabled={actionLoading === order.id + '_confirm'}
                            className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-2 py-1 rounded text-xs font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {actionLoading === order.id + '_confirm' ? '処理中...' : '受注確認'}
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {order.deliveredAt ? (
                          <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                            <Truck className="w-3.5 h-3.5" />納品済
                          </span>
                        ) : order.status === '発注済' && order.confirmedAt ? (
                          <button
                            onClick={() => handleDeliver(order.id)}
                            disabled={actionLoading === order.id + '_deliver'}
                            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2 py-1 rounded text-xs font-medium"
                          >
                            <Truck className="w-3 h-3" />
                            {actionLoading === order.id + '_deliver' ? '処理中...' : '納品完了'}
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
