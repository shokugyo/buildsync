'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatCurrency } from '@/lib/utils'
import { Download, TrendingUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Project {
  id: string
  projectNumber: string
  name: string
  status: string
  contractAmount?: number | null
  customer?: { name: string } | null
}

interface Budget {
  projectId: string
  category: string
  budgetAmount: number
  orderedAmount: number
  invoicedAmount: number
  paidAmount: number
}

interface GrossRow {
  id: string
  projectNumber: string
  name: string
  status: string
  contractAmount: number
  totalOrdered: number
  grossMargin: number
  grossRate: number
  customer: string
}

function EvalBadge({ rate }: { rate: number }) {
  if (rate >= 20) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" />
        良好
      </span>
    )
  }
  if (rate >= 10) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        注意
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" />
      要確認
    </span>
  )
}

export default function GrossProfitPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/costs').then((r) => r.json()),
    ]).then(([p, b]) => {
      setProjects(Array.isArray(p) ? p : [])
      setBudgets(Array.isArray(b) ? b : [])
      setLoading(false)
    })
  }, [])

  const rows: GrossRow[] = projects.map((proj) => {
    const projBudgets = budgets.filter((b) => b.projectId === proj.id)
    const totalOrdered = projBudgets.reduce((s, b) => s + b.orderedAmount, 0)
    const contractAmount = proj.contractAmount ?? 0
    const grossMargin = contractAmount - totalOrdered
    const grossRate = contractAmount > 0 ? (grossMargin / contractAmount) * 100 : 0
    return {
      id: proj.id,
      projectNumber: proj.projectNumber,
      name: proj.name,
      status: proj.status,
      contractAmount,
      totalOrdered,
      grossMargin,
      grossRate,
      customer: proj.customer?.name ?? '-',
    }
  })

  const totalContract = rows.reduce((s, r) => s + r.contractAmount, 0)
  const totalOrdered = rows.reduce((s, r) => s + r.totalOrdered, 0)
  const totalGross = rows.reduce((s, r) => s + r.grossMargin, 0)
  const avgRate =
    rows.length > 0 ? rows.reduce((s, r) => s + r.grossRate, 0) / rows.length : 0

  const barData = rows
    .filter((r) => r.contractAmount > 0 || r.totalOrdered > 0)
    .map((r) => ({
      name: r.projectNumber,
      契約金額: r.contractAmount,
      発注済金額: r.totalOrdered,
    }))

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `¥${(value / 1_000_000).toFixed(0)}M`
    if (value >= 1_000) return `¥${(value / 1_000).toFixed(0)}K`
    return `¥${value}`
  }

  return (
    <div>
      <Header title="粗利管理" />
      <div className="p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">総契約金額</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalContract)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">総発注額</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalOrdered)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">総粗利見込</p>
            <p className={`text-lg font-bold ${totalGross < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalGross)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">平均粗利率</p>
            <p className={`text-lg font-bold ${avgRate < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {avgRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Bar chart */}
        {barData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
            <h2 className="font-semibold text-slate-900 mb-4">案件別 契約金額 vs 発注済金額</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="契約金額" fill="#3b82f6" />
                <Bar dataKey="発注済金額" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CSV button */}
        <div className="flex justify-end mb-4">
          <a
            href="/api/export/gross-profit"
            download
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> CSV出力
          </a>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">案件別粗利一覧</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">読み込み中...</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-slate-400">データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件番号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">契約金額</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">発注済合計</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">粗利見込</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">粗利率%</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">評価</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.projectNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(row.contractAmount)}</td>
                      <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(row.totalOrdered)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.grossMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(row.grossMargin)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${row.grossRate < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {row.contractAmount > 0 ? `${row.grossRate.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <EvalBadge rate={row.grossRate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
