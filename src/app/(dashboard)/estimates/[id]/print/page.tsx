'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface EstimateItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

interface Estimate {
  id: string
  estimateNumber: string
  estimateDate?: string | null
  validUntil?: string | null
  amount: number
  taxAmount: number
  totalAmount: number
  status: string
  notes?: string | null
  project: {
    id?: string
    name: string
    projectNumber: string
    address?: string | null
    customer?: { name: string } | null
  }
  items: EstimateItem[]
}

interface Company {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  registrationNumber?: string | null
}

export default function EstimatePrintPage() {
  const params = useParams()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/estimates/${params.id}`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([est, comp]) => {
      setEstimate(est)
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!estimate) return <div className="p-8 text-center">見積書が見つかりません</div>

  return (
    <div className="bg-white min-h-screen p-10 max-w-3xl mx-auto font-sans print:p-0">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; }
        }
      `}</style>

      {/* Print / Back buttons */}
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          印刷 / PDF保存
        </button>
        <button
          onClick={() => window.history.back()}
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          戻る
        </button>
      </div>

      {/* Estimate document */}
      <div className="border border-slate-200 p-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-widest">御　見　積　書</h1>
        </div>

        {/* Parties */}
        <div className="flex justify-between mb-8">
          {/* Customer (left) */}
          <div className="w-1/2">
            <p className="text-xl font-bold border-b-2 border-slate-900 pb-1 mb-3">
              {estimate.project?.customer?.name
                ? `${estimate.project.customer.name} 御中`
                : '御中'}
            </p>
            <div className="text-sm text-slate-600 mt-4">
              <p>下記のとおりお見積り申し上げます。</p>
            </div>
          </div>

          {/* Company info (right) */}
          <div className="text-right text-sm space-y-1">
            <p className="font-bold text-base">{company?.name || ''}</p>
            {company?.address && <p className="text-slate-600">{company.address}</p>}
            {company?.phone && <p className="text-slate-600">TEL: {company.phone}</p>}
            {company?.email && <p className="text-slate-600">{company.email}</p>}
            {company?.registrationNumber && (
              <p className="text-slate-600">登録番号: {company.registrationNumber}</p>
            )}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
              <p className="text-slate-500">見積番号: {estimate.estimateNumber}</p>
              {estimate.estimateDate && <p className="text-slate-500">見積日: {formatDate(estimate.estimateDate)}</p>}
              {estimate.validUntil && <p className="text-slate-500">有効期限: {formatDate(estimate.validUntil)}</p>}
            </div>
          </div>
        </div>

        {/* Total amount highlight */}
        <div className="mb-6 border-2 border-slate-900 rounded p-4 text-center">
          <p className="text-sm text-slate-500 mb-1">お見積金額（税込）</p>
          <p className="text-4xl font-bold text-slate-900">{formatCurrency(estimate.totalAmount)}</p>
        </div>

        {/* Project info */}
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-3 text-sm">
          <span className="font-medium">工事件名: </span>
          <span>{estimate.project?.name}</span>
          {estimate.project?.projectNumber && (
            <span className="ml-3 text-slate-500">({estimate.project.projectNumber})</span>
          )}
          {estimate.project?.address && (
            <span className="ml-3 text-slate-500">{estimate.project.address}</span>
          )}
        </div>

        {/* Line items table */}
        {estimate.items.length > 0 ? (
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
              {estimate.items.map((item) => (
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
                <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(estimate.amount)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right text-slate-600">消費税（10%）</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(estimate.taxAmount)}</td>
              </tr>
              <tr className="bg-slate-900 text-white">
                <th colSpan={3} className="border border-slate-900 px-3 py-3 text-right font-bold">合計（税込）</th>
                <th className="border border-slate-900 px-3 py-3 text-right font-bold text-lg">
                  {formatCurrency(estimate.totalAmount)}
                </th>
              </tr>
            </tfoot>
          </table>
        ) : (
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-4 py-2 text-left">摘要</th>
                <th className="border border-slate-300 px-4 py-2 text-right w-40">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-4 py-3">工事費</td>
                <td className="border border-slate-300 px-4 py-3 text-right">{formatCurrency(estimate.amount)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-4 py-2 text-slate-600">消費税（10%）</td>
                <td className="border border-slate-300 px-4 py-2 text-right text-slate-600">{formatCurrency(estimate.taxAmount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-900 px-4 py-3 text-left font-bold">合計（税込）</th>
                <th className="border border-slate-900 px-4 py-3 text-right font-bold text-lg">
                  {formatCurrency(estimate.totalAmount)}
                </th>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Notes */}
        {estimate.notes && (
          <div className="border border-slate-300 rounded p-4 text-sm mb-6">
            <p className="font-medium mb-1">備考</p>
            <p className="text-slate-600 whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {company?.name} — 上記金額にてご承認いただけますよう、よろしくお願い申し上げます。
        </div>
      </div>
    </div>
  )
}
