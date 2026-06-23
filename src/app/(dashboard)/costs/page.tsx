'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatCurrency } from '@/lib/utils'
import { BarChart2, Plus, Edit2, Trash2, X, TrendingUp, Download, Printer } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

interface Budget {
  id: string
  category: string
  budgetAmount: number
  orderedAmount: number
  invoicedAmount: number
  paidAmount: number
  project: { id: string; name: string; projectNumber: string; contractAmount?: number | null }
}

interface GrossMarginRow {
  projectId: string
  projectNumber: string
  projectName: string
  contractAmount: number
  totalOrdered: number
  grossMargin: number
  grossMarginRate: number
  isOver: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const defaultForm = {
  projectId: '',
  category: '',
  budgetAmount: '',
  orderedAmount: '0',
  invoicedAmount: '0',
  paidAmount: '0',
}

interface TrendDataPoint {
  label: string
  budget: number
  actual: number
}

export default function CostsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Budget | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/costs').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/costs/trend').then((r) => r.json()),
    ]).then(([b, p, t]) => {
      setBudgets(Array.isArray(b) ? b : [])
      setProjects(Array.isArray(p) ? p : [])
      setTrendData(Array.isArray(t) ? t : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const selectedProjectId = projects.find((p) => p.projectNumber === projectFilter)?.id
    const url = selectedProjectId ? `/api/costs/trend?projectId=${selectedProjectId}` : '/api/costs/trend'
    fetch(url).then((r) => r.json()).then((t) => {
      if (Array.isArray(t)) setTrendData(t)
    })
  }, [projectFilter, projects])

  const filtered = projectFilter
    ? budgets.filter((b) => b.project?.projectNumber === projectFilter)
    : budgets

  // 粗利管理：案件ごとに集計
  const grossMarginRows: GrossMarginRow[] = (() => {
    const projectIds = Array.from(new Set(budgets.map((b) => b.project?.id).filter(Boolean))) as string[]
    return projectIds.map((pid) => {
      const rows = budgets.filter((b) => b.project?.id === pid)
      const proj = rows[0]?.project
      const contractAmount = proj?.contractAmount ?? 0
      const totalOrdered = rows.reduce((s, b) => s + b.orderedAmount, 0)
      const grossMargin = contractAmount - totalOrdered
      const grossMarginRate = contractAmount > 0 ? (grossMargin / contractAmount) * 100 : 0
      return {
        projectId: pid,
        projectNumber: proj?.projectNumber ?? '',
        projectName: proj?.name ?? '',
        contractAmount,
        totalOrdered,
        grossMargin,
        grossMarginRate,
        isOver: totalOrdered > contractAmount,
      }
    })
  })()

  // サマリーカード（全データ対象）
  const totalRevenue = grossMarginRows.reduce((s, r) => s + r.contractAmount, 0)
  const totalOrderedAll = grossMarginRows.reduce((s, r) => s + r.totalOrdered, 0)
  const totalGrossMargin = totalRevenue - totalOrderedAll
  const avgGrossMarginRate =
    grossMarginRows.length > 0
      ? grossMarginRows.reduce((s, r) => s + r.grossMarginRate, 0) / grossMarginRows.length
      : 0

  const barData = filtered.map((b) => ({
    name: b.category,
    予算: b.budgetAmount,
    発注: b.orderedAmount,
    請求: b.invoicedAmount,
  }))

  const pieData = filtered.map((b) => ({ name: b.category, value: b.budgetAmount }))

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `¥${(value / 1000000).toFixed(0)}M`
    if (value >= 1000) return `¥${(value / 1000).toFixed(0)}K`
    return `¥${value}`
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ ...defaultForm, projectId: projects.find((p) => p.projectNumber === projectFilter)?.id || '' })
    setShowModal(true)
  }

  const openEdit = (b: Budget) => {
    setEditTarget(b)
    setForm({
      projectId: b.project.id,
      category: b.category,
      budgetAmount: String(b.budgetAmount),
      orderedAmount: String(b.orderedAmount),
      invoicedAmount: String(b.invoicedAmount),
      paidAmount: String(b.paidAmount),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        budgetAmount: Number(form.budgetAmount),
        orderedAmount: Number(form.orderedAmount),
        invoicedAmount: Number(form.invoicedAmount),
        paidAmount: Number(form.paidAmount),
      }
      const url = editTarget ? `/api/costs/${editTarget.id}` : '/api/costs'
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editTarget) {
          setBudgets((prev) => prev.map((b) => (b.id === saved.id ? saved : b)))
        } else {
          setBudgets((prev) => [...prev, saved])
        }
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この予算行を削除しますか？')) return
    const res = await fetch(`/api/costs/${id}`, { method: 'DELETE' })
    if (res.ok) setBudgets((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div>
      <Header title="原価管理" />
      <div className="p-6">
        {/* Summary Cards（粗利管理） */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">総売上</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">総発注額</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalOrderedAll)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">粗利見込合計</p>
            <p className={`text-lg font-bold ${totalGrossMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalGrossMargin)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">平均粗利率</p>
            <p className={`text-lg font-bold ${avgGrossMarginRate < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {avgGrossMarginRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* 原価推移グラフ (SVG) */}
        {trendData.length > 0 && (() => {
          const maxVal = Math.max(...trendData.flatMap((d) => [d.budget, d.actual]), 1)
          const chartW = 600
          const chartH = 300
          const padL = 70
          const padR = 20
          const padT = 20
          const padB = 50
          const innerW = chartW - padL - padR
          const innerH = chartH - padT - padB
          const numMonths = trendData.length
          const groupW = innerW / numMonths
          const barW = Math.min(groupW * 0.32, 30)
          const yTicks = 5

          const toY = (v: number) => padT + innerH - (v / maxVal) * innerH
          const formatManEn = (v: number) => {
            if (v >= 10000000) return `${(v / 10000000).toFixed(0)}千万`
            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}百万`
            if (v >= 10000) return `${(v / 10000).toFixed(0)}万`
            return `${v}`
          }

          return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
              <h2 className="font-semibold text-slate-900 mb-4">月別原価推移（予算 vs 実績）</h2>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" className="overflow-visible">
                {/* Y-axis grid lines and labels */}
                {Array.from({ length: yTicks + 1 }).map((_, i) => {
                  const val = (maxVal / yTicks) * i
                  const y = toY(val)
                  return (
                    <g key={i}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                      <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                        {formatManEn(val)}
                      </text>
                    </g>
                  )
                })}

                {/* Y-axis label */}
                <text x={10} y={chartH / 2} textAnchor="middle" fontSize="10" fill="#64748b" transform={`rotate(-90, 10, ${chartH / 2})`}>
                  万円
                </text>

                {/* Bars and X labels */}
                {trendData.map((d, i) => {
                  const cx = padL + i * groupW + groupW / 2
                  const bY = toY(d.budget)
                  const aY = toY(d.actual)
                  const bH = Math.max(0, padT + innerH - bY)
                  const aH = Math.max(0, padT + innerH - aY)

                  return (
                    <g key={d.label}>
                      {/* Budget bar (blue) */}
                      <rect
                        x={cx - barW - 2}
                        y={bY}
                        width={barW}
                        height={bH}
                        fill="#3b82f6"
                        rx="2"
                        opacity="0.85"
                      />
                      {/* Actual bar (orange) */}
                      <rect
                        x={cx + 2}
                        y={aY}
                        width={barW}
                        height={aH}
                        fill="#f97316"
                        rx="2"
                        opacity="0.85"
                      />
                      {/* X label */}
                      <text x={cx} y={padT + innerH + 18} textAnchor="middle" fontSize="11" fill="#64748b">
                        {d.label}
                      </text>
                    </g>
                  )
                })}

                {/* Axes */}
                <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1={padL} y1={padT + innerH} x2={chartW - padR} y2={padT + innerH} stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Legend */}
                <rect x={padL} y={chartH - 14} width={10} height={10} fill="#3b82f6" rx="2" />
                <text x={padL + 14} y={chartH - 5} fontSize="11" fill="#475569">予算</text>
                <rect x={padL + 60} y={chartH - 14} width={10} height={10} fill="#f97316" rx="2" />
                <text x={padL + 74} y={chartH - 5} fontSize="11" fill="#475569">実績（発注額）</text>
              </svg>
            </div>
          )
        })()}

        {/* 差異分析サマリーカード */}
        {(() => {
          const totalBudgetAll = budgets.reduce((s, b) => s + b.budgetAmount, 0)
          const totalOrderedBudget = budgets.reduce((s, b) => s + b.orderedAmount, 0)
          const totalVarianceAll = totalBudgetAll - totalOrderedBudget
          const avgConsumptionRate =
            budgets.length > 0
              ? budgets.reduce((s, b) => s + (b.budgetAmount > 0 ? (b.orderedAmount / b.budgetAmount) * 100 : 0), 0) / budgets.length
              : 0
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">総予算額</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalBudgetAll)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">総発注額</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(totalOrderedBudget)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">総差異（予算 - 発注）</p>
                <p className={`text-lg font-bold ${totalVarianceAll < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalVarianceAll)}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">平均消化率</p>
                <p className={`text-lg font-bold ${avgConsumptionRate > 100 ? 'text-red-600' : avgConsumptionRate > 90 ? 'text-orange-500' : 'text-emerald-600'}`}>
                  {avgConsumptionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          )
        })()}

        {/* 粗利管理テーブル */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">案件別粗利管理</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">読み込み中...</div>
          ) : grossMarginRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400">データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件番号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件名</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">契約金額（売上）</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">発注済金額</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">粗利見込</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">粗利率</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grossMarginRows.map((row) => (
                    <tr key={row.projectId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.projectNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.projectName}</td>
                      <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(row.contractAmount)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.isOver ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatCurrency(row.totalOrdered)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${row.grossMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(row.grossMargin)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${row.grossMarginRate < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {row.contractAmount > 0 ? `${row.grossMarginRate.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.isOver ? (
                          <span className="inline-block text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            超過
                          </span>
                        ) : (
                          <span className="inline-block text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            正常
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての案件</option>
            {projects.map((p) => (
              <option key={p.id} value={p.projectNumber}>{p.projectNumber} - {p.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <a
              href="/api/export/costs"
              download
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              CSV出力
            </a>
            <a
              href="/costs/print"
              target="_blank"
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              印刷
            </a>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> 予算行を追加
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : (
          <>
            {/* Charts */}
            {filtered.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                  <h2 className="font-semibold text-slate-900 mb-4">工種別予算・発注・請求比較</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="予算" fill="#94a3b8" />
                      <Bar dataKey="発注" fill="#3b82f6" />
                      <Bar dataKey="請求" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                  <h2 className="font-semibold text-slate-900 mb-4">予算配分</h2>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400">
                      データなし
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Budget Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">原価データがありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">工種</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">予算額</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">発注額</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">予算消化率</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">差異</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">予測完工原価</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">請求額</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">支払額</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((b) => {
                        const variance = b.budgetAmount - b.orderedAmount
                        const pct = b.budgetAmount > 0 ? (b.orderedAmount / b.budgetAmount) * 100 : 0
                        const forecastCost = b.orderedAmount
                        const pctColor = pct > 100 ? 'text-red-600' : pct > 80 ? 'text-orange-500' : 'text-green-600'
                        const isOver = b.orderedAmount > b.budgetAmount
                        const isNearOver = !isOver && pct > 90
                        const rowBg = isOver ? 'bg-red-50 hover:bg-red-100' : isNearOver ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-slate-50'
                        return (
                          <tr key={b.id} className={`transition-colors ${rowBg}`}>
                            <td className="px-4 py-3 text-sm text-slate-500">{b.project?.projectNumber}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{b.category}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">{formatCurrency(b.budgetAmount)}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">{formatCurrency(b.orderedAmount)}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`font-medium ${pctColor}`}>{pct.toFixed(1)}%</span>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-orange-400' : 'bg-green-400'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(variance)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">{formatCurrency(forecastCost)}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">{formatCurrency(b.invoicedAmount)}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-900">{formatCurrency(b.paidAmount)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(b)} className="p-1 text-slate-400 hover:text-blue-600">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(b.id)} className="p-1 text-slate-400 hover:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      {(() => {
                        const totalBudget = filtered.reduce((s, b) => s + b.budgetAmount, 0)
                        const totalOrdered = filtered.reduce((s, b) => s + b.orderedAmount, 0)
                        const totalVariance = totalBudget - totalOrdered
                        const totalPct = totalBudget > 0 ? (totalOrdered / totalBudget) * 100 : 0
                        const totalInvoiced = filtered.reduce((s, b) => s + b.invoicedAmount, 0)
                        const totalPaid = filtered.reduce((s, b) => s + b.paidAmount, 0)
                        return (
                          <tr className="font-semibold text-slate-900">
                            <td className="px-4 py-3 text-sm" colSpan={2}>合計</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalBudget)}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalOrdered)}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={totalPct > 100 ? 'text-red-600' : totalPct > 80 ? 'text-orange-500' : 'text-green-600'}>
                                {totalPct.toFixed(1)}%
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(totalVariance)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalOrdered)}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalInvoiced)}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalPaid)}</td>
                            <td />
                          </tr>
                        )
                      })()}
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{editTarget ? '予算行を編集' : '予算行を追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">工種 *</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  placeholder="例: 仮設工事、基礎工事"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">予算額 *</label>
                <input
                  type="number"
                  value={form.budgetAmount}
                  onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">発注額</label>
                  <input
                    type="number"
                    value={form.orderedAmount}
                    onChange={(e) => setForm({ ...form, orderedAmount: e.target.value })}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">請求額</label>
                  <input
                    type="number"
                    value={form.invoicedAmount}
                    onChange={(e) => setForm({ ...form, invoicedAmount: e.target.value })}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">支払額</label>
                  <input
                    type="number"
                    value={form.paidAmount}
                    onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {saving ? '保存中...' : editTarget ? '更新する' : '追加する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
