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
  notes?: string | null
  project: { id: string; name: string; projectNumber: string; address?: string | null }
  customer?: { id: string; name: string } | null
  items: InvoiceItem[]
}

interface Company {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  registrationNumber?: string | null
  bankName?: string | null
  bankBranch?: string | null
  bankAccountType?: string | null
  bankAccountNumber?: string | null
  bankAccountName?: string | null
}

export default function PaymentNoticePrintPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${params.id}`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([inv, comp]) => {
      setInvoice(inv)
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!invoice) return <div className="p-8 text-center">請求書が見つかりません</div>

  const issueDate = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-white min-h-screen p-10 max-w-3xl mx-auto font-sans print:p-0">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; }
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

      <div className="border border-slate-200 p-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-widest">支払通知書</h1>
        </div>

        <div className="flex justify-between mb-8">
          <div className="w-1/2">
            <p className="text-xl font-bold border-b-2 border-slate-900 pb-1 mb-3">
              {invoice.customer?.name || '（支払先）'} 御中
            </p>
            <p className="text-sm text-slate-600 mt-4">上記の通りお支払いいたします。</p>
          </div>

          <div className="text-right text-sm space-y-1">
            <p className="font-bold text-base">{company?.name || ''}</p>
            {company?.address && <p className="text-slate-600">{company.address}</p>}
            {company?.phone && <p className="text-slate-600">TEL: {company.phone}</p>}
            {company?.email && <p className="text-slate-600">{company.email}</p>}
            {company?.registrationNumber && (
              <p className="text-slate-600">登録番号: {company.registrationNumber}</p>
            )}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
              <p className="text-slate-500">発行日: {formatDate(issueDate)}</p>
              <p className="text-slate-500">支払通知番号: {invoice.invoiceNumber}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-3 text-sm">
          <span className="font-medium">工事件名: </span>
          <span>{invoice.project?.name}</span>
          {invoice.project?.projectNumber && (
            <span className="ml-3 text-slate-500">({invoice.project.projectNumber})</span>
          )}
          {invoice.project?.address && (
            <span className="ml-3 text-slate-500">{invoice.project.address}</span>
          )}
        </div>

        {invoice.items.length > 0 ? (
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left">品目</th>
                <th className="border border-slate-300 px-3 py-2 text-right w-28">金額</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-3 py-2">{item.name}</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-right text-slate-600">小計</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(invoice.amount)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-right text-slate-600">消費税（10%）</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatCurrency(invoice.taxAmount)}</td>
              </tr>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-900 px-3 py-3 text-right font-bold">お支払金額（税込）</th>
                <th className="border border-slate-900 px-3 py-3 text-right font-bold text-lg">
                  {formatCurrency(invoice.totalAmount)}
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
                <td className="border border-slate-300 px-4 py-3">工事代金</td>
                <td className="border border-slate-300 px-4 py-3 text-right">{formatCurrency(invoice.amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-4 py-2 text-right text-slate-600">小計</td>
                <td className="border border-slate-300 px-4 py-2 text-right">{formatCurrency(invoice.amount)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-4 py-2 text-right text-slate-600">消費税（10%）</td>
                <td className="border border-slate-300 px-4 py-2 text-right">{formatCurrency(invoice.taxAmount)}</td>
              </tr>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-900 px-4 py-3 text-right font-bold">お支払金額（税込）</th>
                <th className="border border-slate-900 px-4 py-3 text-right font-bold text-lg">
                  {formatCurrency(invoice.totalAmount)}
                </th>
              </tr>
            </tfoot>
          </table>
        )}

        {invoice.dueDate && (
          <div className="border border-slate-300 rounded p-4 text-sm mb-6">
            <p className="font-medium mb-1">支払予定日</p>
            <p className="text-slate-700 text-base font-semibold">{formatDate(invoice.dueDate)}</p>
          </div>
        )}

        <div className="border border-slate-300 rounded p-4 text-sm mb-6">
          <p className="font-medium mb-2">振込先</p>
          {(company?.bankName || company?.bankBranch || company?.bankAccountNumber) ? (
            <div className="text-slate-600 space-y-0.5">
              {company.bankName && (
                <p>
                  {company.bankName}
                  {company.bankBranch && `　${company.bankBranch}`}
                </p>
              )}
              {(company?.bankAccountType || company?.bankAccountNumber) && (
                <p>
                  {company.bankAccountType && `${company.bankAccountType}　`}
                  {company.bankAccountNumber}
                </p>
              )}
              {company?.bankAccountName && <p>口座名義: {company.bankAccountName}</p>}
            </div>
          ) : (
            <p className="text-slate-400">（振込先未設定）</p>
          )}
        </div>

        {invoice.notes && (
          <div className="border border-slate-300 rounded p-4 text-sm mb-6">
            <p className="font-medium mb-1">備考</p>
            <p className="text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        <div className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {company?.name}
        </div>
      </div>
    </div>
  )
}
