'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
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
  paidDate?: string | null
  notes?: string | null
  project: { id: string; name: string; projectNumber: string }
  customer?: { id: string; name: string } | null
  items: InvoiceItem[]
}

interface PaymentRecord {
  id: string
  amount: number
  paidAt: string
  paymentMethod?: string | null
  notes?: string | null
  recorder: { id: string; name: string }
}

interface Company {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  registrationNumber?: string | null
  sealUrl?: string | null
}

export default function ReceiptPrintPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${params.id}`).then(r => r.json()),
      fetch(`/api/invoices/${params.id}/payments`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([inv, pmt, comp]) => {
      setInvoice(inv)
      setPayments(Array.isArray(pmt) ? pmt : [])
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!invoice) return <div className="p-8 text-center">請求書が見つかりません</div>

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const receiptAmount = paidTotal > 0 ? paidTotal : invoice.totalAmount
  const receiptDate = payments.length > 0
    ? payments[payments.length - 1].paidAt
    : (invoice.paidDate || new Date().toISOString())

  const taxExcluded = Math.round(receiptAmount / 1.1)
  const taxAmount = receiptAmount - taxExcluded

  const projectName = invoice.project?.name || '工事'

  return (
    <div className="bg-white min-h-screen p-10 max-w-2xl mx-auto font-sans print:p-0">
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
        <button
          onClick={() => window.history.back()}
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          戻る
        </button>
      </div>

      <div className="border border-slate-200 p-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-[0.5em]">領　収　書</h1>
        </div>

        <div className="mb-8">
          <p className="text-2xl font-bold border-b-2 border-slate-900 pb-2 inline-block">
            {invoice.customer?.name || '（宛名）'} 殿
          </p>
        </div>

        <div className="border-2 border-slate-900 rounded p-6 mb-8 text-center">
          <p className="text-sm text-slate-500 mb-1">金額</p>
          <p className="text-4xl font-bold tracking-wide">
            ¥ {receiptAmount.toLocaleString()}
          </p>
        </div>

        <div className="mb-8">
          <p className="text-sm text-slate-600">
            <span className="font-medium">但し </span>
            {projectName}工事代として
          </p>
        </div>

        <div className="border border-slate-200 rounded mb-8 text-sm overflow-hidden">
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2.5 text-slate-500 bg-slate-50 w-36">税抜金額</td>
                <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(taxExcluded)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-500 bg-slate-50">消費税（10%）</td>
                <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(taxAmount)}</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2.5 bg-slate-50">合計</td>
                <td className="px-4 py-2.5 text-right">{formatCurrency(receiptAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {payments.length > 0 && (
          <div className="mb-8 text-sm">
            <p className="font-medium text-slate-700 mb-2">入金内訳</p>
            <ul className="space-y-1">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between text-slate-600 text-xs bg-slate-50 rounded px-3 py-1.5">
                  <span>{formatDate(p.paidAt)}{p.paymentMethod ? `　${p.paymentMethod}` : ''}</span>
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between items-start mt-10">
          <div className="text-sm text-slate-600 space-y-1">
            <p>発行日: {formatDate(receiptDate)}</p>
            <p className="text-xs text-slate-400">請求番号: {invoice.invoiceNumber}</p>
          </div>

          <div className="text-right text-sm space-y-1">
            <p className="font-bold text-base">{company?.name || ''}</p>
            {company?.address && <p className="text-slate-600">{company.address}</p>}
            {company?.phone && <p className="text-slate-600">TEL: {company.phone}</p>}
            {company?.registrationNumber && (
              <p className="text-slate-600 text-xs">登録番号: {company.registrationNumber}</p>
            )}
            <div className="mt-3 flex justify-end">
              {company?.sealUrl ? (
                <img src={company.sealUrl} alt="印鑑" className="w-20 h-20 object-contain" />
              ) : (
                <div className="w-20 h-20 border-2 border-slate-300 rounded-full flex items-center justify-center">
                  <span className="text-slate-300 text-xs">印</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {company?.name}
        </div>
      </div>
    </div>
  )
}
