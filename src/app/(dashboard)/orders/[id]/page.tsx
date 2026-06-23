'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Printer, CheckCircle, XCircle, Clock, Truck } from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
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
  project: { id: string; name: string; projectNumber: string; address?: string | null }
  supplier?: { id: string; name: string } | null
  items: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  '未発注': { label: '未発注', color: 'bg-slate-100 text-slate-700', icon: Clock },
  '承認依頼中': { label: '承認依頼中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  '承認済': { label: '承認済', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  '発注済': { label: '発注済', color: 'bg-blue-100 text-blue-700', icon: Truck },
  '納品済': { label: '納品済', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  '完了': { label: '完了', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  '差戻し': { label: '差戻し', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then(r => r.json())
      .then(data => { setOrder(data); setLoading(false) })
  }, [params.id])

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    setSaving(true)
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setOrder(updated)
    }
    setSaving(false)
  }

  const handleDeliver = async () => {
    if (!order) return
    setSaving(true)
    const res = await fetch(`/api/orders/${order.id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveredAt: new Date().toISOString() }),
    })
    if (res.ok) {
      const updated = await fetch(`/api/orders/${order.id}`).then(r => r.json())
      setOrder(updated)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!order) return <div className="p-8 text-center">発注が見つかりません</div>

  const statusCfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-700', icon: Clock }
  const StatusIcon = statusCfg.icon

  return (
    <div>
      <Header title="発注詳細" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex gap-2">
            <Link
              href={`/orders/${order.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              発注書印刷
            </Link>
            <Link
              href={`/orders/${order.id}/acceptance`}
              target="_blank"
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              注文請書
            </Link>
            {order.status === '発注済' && (
              <button
                onClick={handleDeliver}
                disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <Truck className="w-4 h-4" />
                納品済にする
              </button>
            )}
          </div>
        </div>

        {/* Main info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">{order.orderNumber}</p>
              <h2 className="text-xl font-bold mt-1">{order.subject}</h2>
              {order.supplier && <p className="text-slate-600 mt-0.5">{order.supplier.name}</p>}
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusCfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusCfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">案件</p>
              <Link href={`/projects/${order.project?.id}`} className="font-medium text-blue-600 hover:underline">
                {order.project?.name}
              </Link>
            </div>
            <div>
              <p className="text-slate-500">案件番号</p>
              <p className="font-medium">{order.project?.projectNumber}</p>
            </div>
            {order.workType && (
              <div>
                <p className="text-slate-500">工種</p>
                <p className="font-medium">{order.workType}</p>
              </div>
            )}
            {order.orderDate && (
              <div>
                <p className="text-slate-500">発注日</p>
                <p className="font-medium">{formatDate(order.orderDate)}</p>
              </div>
            )}
            {order.deliveryDate && (
              <div>
                <p className="text-slate-500">納期</p>
                <p className="font-medium">{formatDate(order.deliveryDate)}</p>
              </div>
            )}
            {order.paymentTerms && (
              <div>
                <p className="text-slate-500">支払条件</p>
                <p className="font-medium">{order.paymentTerms}</p>
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
              <span className="font-medium">{formatCurrency(order.amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">消費税（10%）</span>
              <span className="font-medium">{formatCurrency(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-bold text-base">発注金額（税込）</span>
              <span className="font-bold text-xl text-blue-600">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        {order.items.length > 0 && (
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
                {order.items.map(item => (
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
        {order.notes && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-2">備考</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* Status workflow */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">ステータス変更</h3>
          <div className="flex flex-wrap gap-2">
            {['未発注', '承認依頼中', '承認済', '発注済', '納品済', '完了', '差戻し'].map(s => (
              <button
                key={s}
                disabled={saving || order.status === s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  order.status === s
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
    </div>
  )
}
