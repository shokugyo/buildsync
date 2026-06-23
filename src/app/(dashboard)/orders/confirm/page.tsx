'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, Clock, XCircle, Building2, Phone, Mail, User, ChevronDown, ChevronUp, X } from 'lucide-react'

interface OrderWithConfirm {
  id: string
  orderNumber: string
  subject: string
  status: string
  amount: number
  totalAmount: number
  orderDate?: string | null
  deliveryDate?: string | null
  notes?: string | null
  confirmedAt?: string | null
  confirmationNote?: string | null
  project: { id: string; name: string; projectNumber: string; address?: string | null }
  supplier?: { id: string; name: string; contact?: string | null; phone?: string | null; email?: string | null } | null
}

const STATUS_FILTER_OPTIONS = [
  { value: '発注済', label: '受注確認待ち' },
  { value: '受領確認済', label: '確認済み' },
  { value: 'all', label: 'すべて' },
]

export default function OrderConfirmPage() {
  const [orders, setOrders] = useState<OrderWithConfirm[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('発注済')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<OrderWithConfirm | null>(null)
  const [confirmNote, setConfirmNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchOrders = (status: string) => {
    setLoading(true)
    fetch(`/api/orders/confirm?status=${status}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(Array.isArray(d) ? d : [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchOrders(statusFilter)
  }, [statusFilter])

  const handleConfirm = async () => {
    if (!confirmModal) return
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${confirmModal.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationNote: confirmNote }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
        setConfirmModal(null)
        setConfirmNote('')
        if (statusFilter === '発注済') {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id))
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUnconfirm = async (order: OrderWithConfirm) => {
    if (!confirm('受注確認を取り消しますか？')) return
    const res = await fetch(`/api/orders/${order.id}/confirm`, { method: 'DELETE' })
    if (res.ok) {
      const updated = await res.json()
      if (statusFilter === '受領確認済') {
        setOrders((prev) => prev.filter((o) => o.id !== order.id))
      } else {
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      }
    }
  }

  const pending = orders.filter((o) => o.status === '発注済').length
  const confirmed = orders.filter((o) => o.status === '受領確認済').length

  return (
    <div>
      <Header title="協力会社受注確認" />
      <div className="p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">確認待ち</p>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">{statusFilter === 'all' ? pending : statusFilter === '発注済' ? orders.length : pending}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">確認済み</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{statusFilter === 'all' ? confirmed : statusFilter === '受領確認済' ? orders.length : confirmed}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:col-span-1 col-span-2">
            <p className="text-xs text-slate-500 mb-1">表示中の発注数</p>
            <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {statusFilter === '発注済' ? '確認待ちの発注はありません' : '該当する発注がありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-slate-400">{order.orderNumber}</span>
                        {order.status === '受領確認済' ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> 受注確認済
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> 確認待ち
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900">{order.subject}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {order.project.projectNumber} — {order.project.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-xs text-slate-400">税込</p>
                    </div>
                  </div>

                  {/* Supplier info */}
                  {order.supplier && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{order.supplier.name}</span>
                        </div>
                        {order.supplier.contact && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{order.supplier.contact}</span>
                          </div>
                        )}
                        {order.supplier.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${order.supplier.phone}`} className="hover:text-blue-600">{order.supplier.phone}</a>
                          </div>
                        )}
                        {order.supplier.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`mailto:${order.supplier.email}`} className="hover:text-blue-600 truncate">{order.supplier.email}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates row */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    {order.orderDate && <span>発注日: {formatDate(order.orderDate)}</span>}
                    {order.deliveryDate && <span>納期: {formatDate(order.deliveryDate)}</span>}
                    {order.confirmedAt && (
                      <span className="text-green-600">受注確認日: {formatDate(order.confirmedAt)}</span>
                    )}
                  </div>

                  {/* Confirmation note */}
                  {order.confirmationNote && (
                    <p className="mt-2 text-sm text-slate-500 bg-green-50 px-3 py-1.5 rounded-lg">
                      確認メモ: {order.confirmationNote}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      {expandedId === order.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      詳細
                    </button>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/orders/${order.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg"
                      >
                        発注書印刷
                      </a>
                      {order.status === '受領確認済' ? (
                        <button
                          onClick={() => handleUnconfirm(order)}
                          className="flex items-center gap-1 text-xs border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg"
                        >
                          <XCircle className="w-3.5 h-3.5" /> 確認取消
                        </button>
                      ) : (
                        <button
                          onClick={() => { setConfirmModal(order); setConfirmNote('') }}
                          className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> 受注確認済にする
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === order.id && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm space-y-2">
                    {order.project.address && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 w-20 shrink-0">工事場所</span>
                        <span className="text-slate-700">{order.project.address}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-20 shrink-0">金額（税抜）</span>
                      <span className="text-slate-700">{formatCurrency(order.amount)}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-20 shrink-0">税込合計</span>
                      <span className="text-slate-700 font-medium">{formatCurrency(order.totalAmount)}</span>
                    </div>
                    {order.notes && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 w-20 shrink-0">備考</span>
                        <span className="text-slate-700 whitespace-pre-wrap">{order.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">受注確認を記録</h2>
              <button onClick={() => setConfirmModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900">{confirmModal.subject}</p>
              <p className="text-xs text-slate-500 mt-0.5">{confirmModal.supplier?.name || '業者未設定'}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">確認メモ（任意）</label>
              <textarea
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                rows={3}
                placeholder="確認日時、確認者名、連絡内容など"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              ステータスが「受領確認済」に変更されます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                {saving ? '保存中...' : '受注確認済にする'}
              </button>
              <button
                onClick={() => setConfirmModal(null)}
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
