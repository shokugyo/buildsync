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

export default function OrderAcceptancePage() {
  const params = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/orders/${params.id}`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([ord, comp]) => {
      setOrder(ord)
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!order) return <div className="p-8 text-center">注文請書が見つかりません</div>

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const companyAddr = [company?.postalCode ? `〒${company.postalCode}` : null, company?.address || company?.address1].filter(Boolean).join(' ')

  return (
    <div className="bg-white min-h-screen p-10 max-w-3xl mx-auto font-sans print:p-0">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="no-print mb-6 flex gap-3">
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

      <div className="border border-slate-200 p-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-widest">注　文　請　書</h1>
          <p className="text-sm text-slate-500 mt-2">{today}</p>
        </div>

        <div className="flex justify-between mb-10 gap-4">
          <div className="w-1/2">
            <p className="text-lg font-bold border-b-2 border-slate-900 pb-1 mb-2">
              {company?.name ? `${company.name} 御中` : '発注者 御中'}
            </p>
            {companyAddr && <p className="text-sm text-slate-500 mt-1">{companyAddr}</p>}
            {company?.phone && <p className="text-sm text-slate-500">TEL: {company.phone}</p>}
            <p className="text-sm text-slate-600 mt-4">下記のとおり注文を承りましたので、ここに請書を提出いたします。</p>
          </div>

          <div className="text-right text-sm space-y-1">
            <p className="font-bold text-base">{order.supplier?.name || '（受注者）'}</p>
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

        <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-4 text-sm space-y-1">
          <div>
            <span className="font-medium">件名: </span>
            <span>{order.subject}</span>
          </div>
          <div>
            <span className="font-medium">工事件名: </span>
            <span>{order.project?.name}</span>
            {order.project?.projectNumber && (
              <span className="ml-3 text-slate-500">({order.project.projectNumber})</span>
            )}
            {order.project?.address && (
              <span className="ml-3 text-slate-500">{order.project.address}</span>
            )}
          </div>
          {order.workType && (
            <div>
              <span className="font-medium">工種: </span>
              <span className="text-slate-600">{order.workType}</span>
            </div>
          )}
          {order.paymentTerms && (
            <div>
              <span className="font-medium">支払条件: </span>
              <span className="text-slate-600">{order.paymentTerms}</span>
            </div>
          )}
        </div>

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

        {order.notes && (
          <div className="border border-slate-300 rounded p-4 text-sm mb-6">
            <p className="font-medium mb-1">備考</p>
            <p className="text-slate-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        <div className="mt-8 border border-slate-300 rounded p-4 text-center">
          <p className="text-base font-bold text-slate-900">上記の通り注文を承諾いたします。</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <div className="border border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-600 mb-1">発注者（甲）</p>
            <p className="text-sm font-bold text-slate-900 mb-6">{company?.name || ''}</p>
            <p className="text-xs text-slate-400 mb-1">代表者印</p>
            <div className="h-20 border-b border-slate-200" />
          </div>
          <div className="border border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-600 mb-1">受注者（乙）</p>
            <p className="text-sm font-bold text-slate-900 mb-6">{order.supplier?.name || '（受注者名）'}</p>
            <p className="text-xs text-slate-400 mb-1">代表者印</p>
            <div className="h-20 border-b border-slate-200" />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {order.supplier?.name || ''} — 注文請書 / 発注番号: {order.orderNumber}
        </div>
      </div>
    </div>
  )
}
