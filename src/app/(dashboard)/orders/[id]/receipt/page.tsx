'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function OrderReceiptPage() {
  const params = useParams()
  const [order, setOrder] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
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

  useEffect(() => {
    if (!loading && order) setTimeout(() => window.print(), 300)
  }, [loading, order])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!order) return <div className="p-8 text-center">注文請書が見つかりません</div>

  return (
    <div className="bg-white min-h-screen p-10 max-w-3xl mx-auto font-sans print:p-0">
      <style>{`
        @media print { body { margin: 0; } .no-print { display: none !important; } }
      `}</style>

      <div className="no-print mb-6 flex gap-3">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          印刷 / PDF保存
        </button>
        <button onClick={() => window.history.back()} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
          戻る
        </button>
      </div>

      <div className="border border-slate-200 p-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-widest">注　文　請　書</h1>
        </div>

        {/* Supplier info (right side = supplier = sender of receipt) */}
        <div className="flex justify-between mb-10">
          <div className="w-1/2">
            <p className="text-xl font-bold border-b-2 border-slate-900 pb-1 mb-2">
              {company?.name ? `${company.name} 御中` : '発注元御中'}
            </p>
            <p className="text-sm text-slate-600 mt-4">下記のとおり注文をお受けいたしました。</p>
          </div>
          <div className="text-right text-sm space-y-1">
            <p className="font-bold text-base">{order.supplier?.name || '（受注者）'}</p>
            {order.supplier?.address && <p className="text-slate-600">{order.supplier.address}</p>}
            {order.supplier?.phone && <p className="text-slate-600">TEL: {order.supplier.phone}</p>}
            {order.supplier?.email && <p className="text-slate-600">{order.supplier.email}</p>}
            <p className="mt-2 text-slate-500">発注番号: {order.orderNumber}</p>
            <p className="text-slate-500">発注日: {formatDate(order.orderDate)}</p>
            {order.deliveryDate && <p className="text-slate-500">納期: {formatDate(order.deliveryDate)}</p>}
          </div>
        </div>

        <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-4 text-sm">
          <span className="font-medium">工事件名: </span>
          <span>{order.project?.name}</span>
          {order.project?.address && <span className="ml-4 text-slate-500">{order.project.address}</span>}
        </div>

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
              <th className="border border-slate-900 px-4 py-3 text-right font-bold text-lg">{formatCurrency(order.totalAmount)}</th>
            </tr>
          </tfoot>
        </table>

        {order.notes && (
          <div className="border border-slate-300 rounded p-4 text-sm mb-6">
            <p className="font-medium mb-1">備考</p>
            <p className="text-slate-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div className="border border-slate-300 p-4">
            <p className="text-sm font-medium mb-8">発注者 確認印</p>
            <div className="h-16" />
          </div>
          <div className="border border-slate-300 p-4">
            <p className="text-sm font-medium mb-8">受注者 確認印</p>
            <div className="h-16" />
          </div>
        </div>

        <div className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {order.supplier?.name || ''} — 注文請書
        </div>
      </div>
    </div>
  )
}
