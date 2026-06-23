'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Printer, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react'

interface SettlementData {
  project: {
    id: string
    name: string
    projectNumber: string
    contractAmount: number | null
    startDate: string | null
    endDate: string | null
    deliveryDate: string | null
    customer: { id: string; name: string } | null
  }
  contractAmount: number
  totalOrdered: number
  totalInvoiced: number
  totalPaid: number
  grossProfit: number
  grossMarginPct: number
  unpaidAmount: number
}

export default function SettlementPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [data, setData] = useState<SettlementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/settlement`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [projectId])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!data) return <div className="p-8 text-center">データが見つかりません</div>

  const { project, contractAmount, totalOrdered, totalInvoiced, totalPaid, grossProfit, grossMarginPct, unpaidAmount } = data
  const isProfit = grossProfit >= 0

  return (
    <div>
      <Header title="精算管理" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex gap-2">
            <Link
              href={`/projects/${projectId}`}
              className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              案件詳細
            </Link>
            <Link
              href={`/projects/${projectId}/settlement/print`}
              target="_blank"
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              精算書印刷
            </Link>
          </div>
        </div>

        {/* Project info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold">{project.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{project.projectNumber}</p>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            {project.customer && (
              <div>
                <p className="text-slate-500">顧客</p>
                <p className="font-medium">{project.customer.name}</p>
              </div>
            )}
            {project.startDate && (
              <div>
                <p className="text-slate-500">着工日</p>
                <p className="font-medium">{formatDate(project.startDate)}</p>
              </div>
            )}
            {project.endDate && (
              <div>
                <p className="text-slate-500">完工日</p>
                <p className="font-medium">{formatDate(project.endDate)}</p>
              </div>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              請負金額
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(contractAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <BarChart2 className="w-4 h-4" />
              発注合計
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalOrdered)}</p>
          </div>
          <div className={`rounded-xl border p-6 ${isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`flex items-center gap-2 text-sm mb-2 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              粗利
            </div>
            <p className={`text-2xl font-bold ${isProfit ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(grossProfit)}
            </p>
            <p className={`text-sm mt-1 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
              粗利率 {grossMarginPct.toFixed(1)}%
            </p>
          </div>
          <div className={`rounded-xl border p-6 ${unpaidAmount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center gap-2 text-sm mb-2 ${unpaidAmount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
              <DollarSign className="w-4 h-4" />
              未収金
            </div>
            <p className={`text-2xl font-bold ${unpaidAmount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {formatCurrency(unpaidAmount)}
            </p>
            <p className="text-sm text-slate-500 mt-1">請求済 {formatCurrency(totalInvoiced)} / 入金済 {formatCurrency(totalPaid)}</p>
          </div>
        </div>

        {/* Summary table */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">精算サマリ</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">請負金額（税込）</span>
              <span className="font-medium">{formatCurrency(contractAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">発注合計（税込）</span>
              <span className="font-medium">{formatCurrency(totalOrdered)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="font-bold">粗利</span>
              <span className={`font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(grossProfit)} （{grossMarginPct.toFixed(1)}%）
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">請求合計</span>
              <span className="font-medium">{formatCurrency(totalInvoiced)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">入金済</span>
              <span className="font-medium text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-bold">未収金</span>
              <span className={`font-bold ${unpaidAmount > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                {formatCurrency(unpaidAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">関連データ</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/invoices?projectId=${projectId}`} className="border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              請求一覧
            </Link>
            <Link href={`/orders?projectId=${projectId}`} className="border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              発注一覧
            </Link>
            <Link href={`/projects/${projectId}/ledger`} className="border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              原価台帳
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
