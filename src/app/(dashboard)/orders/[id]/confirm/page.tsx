'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

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
  confirmedAt?: string | null
  project: { id: string; name: string; projectNumber: string; address?: string | null }
  supplier?: { id: string; name: string; address?: string | null; phone?: string | null; email?: string | null } | null
  items: OrderItem[]
}

interface Company {
  name?: string | null
  postalCode?: string | null
  address?: string | null
  address1?: string | null
  address2?: string | null
  phone?: string | null
  email?: string | null
  registrationNumber?: string | null
  representativeName?: string | null
}

export default function OrderConfirmPrintPage() {
  const params = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDate, setConfirmDate] = useState('')
  const [confirmedBy, setConfirmedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/orders/${params.id}`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([ord, comp]) => {
      setOrder(ord)
      setCompany(comp)
      setLoading(false)
      const today = new Date().toISOString().slice(0, 10)
      setConfirmDate(today)
      if (ord?.supplier?.name) setConfirmedBy(ord.supplier.name)
    })
  }, [params.id])

  const handleSubmitConfirm = async () => {
    if (!order) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationNote: `請書日: ${confirmDate}${confirmedBy ? ` / 会社名: ${confirmedBy}` : ''}${notes ? ` / ${notes}` : ''}`,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setSubmitError(data.error || '送信に失敗しました')
      }
    } catch {
      setSubmitError('通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!order) return <div className="p-8 text-center">注文請書が見つかりません</div>

  const companyAddr = [
    company?.postalCode ? `〒${company.postalCode}` : null,
    company?.address || company?.address1,
  ].filter(Boolean).join(' ')

  return (
    <div className="bg-white min-h-screen p-10 max-w-3xl mx-auto font-sans print:p-0">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4 portrait; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print mb-6 space-y-4">
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            印刷 / PDF保存
          </button>
          <a
            href={`/orders/${params.id}/print`}
            target="_blank"
            className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700"
          >
            発注書を開く
          </a>
          <button
            onClick={() => window.history.back()}
            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            戻る
          </button>
        </div>

        {/* Confirmation input form */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">受注確認情報（印刷前に入力）</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">請書日</label>
              <input
                type="date"
                value={confirmDate}
                onChange={e => setConfirmDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">受注会社名</label>
              <input
                type="text"
                value={confirmedBy}
                onChange={e => setConfirmedBy(e.target.value)}
                placeholder="会社名"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">備考</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="備考（任意）"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {submitted ? (
            <p className="text-sm text-green-700 font-medium">注文請書を受理しました。ステータスが更新されました。</p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmitConfirm}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
              >
                {submitting ? '送信中...' : '受注確認を記録する'}
              </button>
              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Document body */}
      <div className="border border-slate-200 p-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest">注　文　請　書</h1>
          <p className="text-sm text-slate-500 mt-2">
            {confirmDate
              ? new Date(confirmDate + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
              : new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
            }
          </p>
          <p className="text-xs text-slate-400 mt-1">（RP-008）</p>
        </div>

        {/* Parties */}
        <div className="flex justify-between mb-8 gap-4">
          {/* Orderer (left) */}
          <div className="w-1/2">
            <p className="text-lg font-bold border-b-2 border-slate-900 pb-1 mb-2">
              {company?.name ? `${company.name} 御中` : '発注者 御中'}
            </p>
            {companyAddr && <p className="text-sm text-slate-500 mt-1">{companyAddr}</p>}
            {company?.phone && <p className="text-sm text-slate-500">TEL: {company.phone}</p>}
            {company?.representativeName && (
              <p className="text-sm text-slate-500">担当: {company.representativeName}</p>
            )}
            <p className="text-sm text-slate-600 mt-4">
              下記のとおり注文を請け負いましたので、ここに請書を提出いたします。
            </p>
          </div>

          {/* Supplier (right) */}
          <div className="text-right text-sm space-y-1">
            <p className="font-bold text-base">{confirmedBy || order.supplier?.name || '（受注会社名）'}</p>
            {order.supplier?.address && <p className="text-slate-600">{order.supplier.address}</p>}
            {order.supplier?.phone && <p className="text-slate-600">TEL: {order.supplier.phone}</p>}
            {order.supplier?.email && <p className="text-slate-600">{order.supplier.email}</p>}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
              <p className="text-slate-500">発注番号: {order.orderNumber}</p>
              {order.orderDate && <p className="text-slate-500">発注日: {formatDate(order.orderDate)}</p>}
              {order.deliveryDate && <p className="text-slate-500">納期: {formatDate(order.deliveryDate)}</p>}
            </div>
          </div>
        </div>

        {/* Project/subject info */}
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-4 text-sm space-y-1">
          <div>
            <span className="font-medium">工事件名: </span>
            <span className="font-bold">{order.project?.name}</span>
            {order.project?.projectNumber && (
              <span className="ml-3 text-slate-500">({order.project.projectNumber})</span>
            )}
            {order.project?.address && (
              <span className="ml-3 text-slate-500">{order.project.address}</span>
            )}
          </div>
          <div>
            <span className="font-medium">件名: </span>
            <span>{order.subject}</span>
          </div>
          {order.workType && (
            <div>
              <span className="font-medium">工種: </span>
              <span className="text-slate-600">{order.workType}</span>
            </div>
          )}
          {order.deliveryDate && (
            <div>
              <span className="font-medium">工期（納期）: </span>
              <span className="text-slate-600">{formatDate(order.deliveryDate)}</span>
            </div>
          )}
          {order.paymentTerms && (
            <div>
              <span className="font-medium">支払条件: </span>
              <span className="text-slate-600">{order.paymentTerms}</span>
            </div>
          )}
        </div>

        {/* Line items */}
        {order.items.length > 0 ? (
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left">品目</th>
                <th className="border border-slate-300 px-3 py-2 text-right w-16">数量</th>
                <th className="border border-slate-300 px-3 py-2 text-right w-28">単価</th>
                <th className="border border-slate-300 px-3 py-2 text-right w-28">金額</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-3 py-2">{item.name}</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">{item.quantity}</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right text-slate-600">税抜合計</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(order.amount)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right text-slate-600">消費税（10%）</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(order.taxAmount)}</td>
              </tr>
              <tr className="bg-slate-900 text-white">
                <th colSpan={3} className="border border-slate-900 px-3 py-3 text-right font-bold">請負金額（税込）</th>
                <th className="border border-slate-900 px-3 py-3 text-right font-bold text-lg">
                  {formatCurrency(order.totalAmount)}
                </th>
              </tr>
            </tfoot>
          </table>
        ) : (
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-4 py-2 text-left">請負件名</th>
                <th className="border border-slate-300 px-4 py-2 text-right w-40">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-4 py-3">{order.subject}</td>
                <td className="border border-slate-300 px-4 py-3 text-right">{formatCurrency(order.amount)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-4 py-2 text-slate-600">消費税（10%）</td>
                <td className="border border-slate-300 px-4 py-2 text-right text-slate-600">{formatCurrency(order.taxAmount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-900 px-4 py-3 text-left font-bold">請負金額（税込）</th>
                <th className="border border-slate-900 px-4 py-3 text-right font-bold text-lg">
                  {formatCurrency(order.totalAmount)}
                </th>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="border border-slate-300 rounded p-4 text-sm mb-6">
            <p className="font-medium mb-1">備考</p>
            <p className="text-slate-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* Acceptance statement */}
        <div className="mt-8 border-2 border-slate-900 rounded p-4 text-center">
          <p className="text-base font-bold text-slate-900">上記の注文を請け負いました。</p>
        </div>

        {/* Signature area */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div className="border border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-600 mb-1">発注者（甲）</p>
            <p className="text-sm font-bold text-slate-900 mb-6">{company?.name || ''}</p>
            {company?.address && <p className="text-xs text-slate-500 mb-4">{companyAddr}</p>}
            <p className="text-xs text-slate-400 mb-1">代表者印</p>
            <div className="h-20 border-b border-slate-200" />
          </div>
          <div className="border border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-600 mb-1">受注者（乙）</p>
            <p className="text-sm font-bold text-slate-900 mb-6">{confirmedBy || order.supplier?.name || '（受注会社名）'}</p>
            {order.supplier?.address && <p className="text-xs text-slate-500 mb-4">{order.supplier.address}</p>}
            <p className="text-xs text-slate-400 mb-1">代表者印</p>
            <div className="h-20 border-b border-slate-200" />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {order.supplier?.name || confirmedBy || ''} — 注文請書（RP-008） / 発注番号: {order.orderNumber}
        </div>
      </div>
    </div>
  )
}
