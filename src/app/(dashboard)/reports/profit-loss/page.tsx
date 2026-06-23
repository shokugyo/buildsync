'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Download } from 'lucide-react'

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

interface MonthData {
  month: number
  revenue: number
  cost: number
  grossProfit: number
  grossMarginPct: number
}

interface ReportData {
  year: number
  months: MonthData[]
  annual: {
    revenue: number
    cost: number
    grossProfit: number
    grossMarginPct: number
  }
}

function formatCurrency(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`
}

function marginColor(pct: number) {
  if (pct >= 30) return '#16a34a'
  if (pct >= 15) return '#d97706'
  return '#dc2626'
}

function marginBg(pct: number) {
  if (pct >= 30) return '#f0fdf4'
  if (pct >= 15) return '#fffbeb'
  return '#fef2f2'
}

export default function ProfitLossPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/profit-loss?year=${year}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/export/profit-loss/xlsx?year=${year}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `profit-loss-${year}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  const maxRevenue = data ? Math.max(...data.months.map(m => Math.max(m.revenue, m.cost)), 1) : 1

  const BAR_HEIGHT = 160
  const BAR_GROUP_WIDTH = 56
  const BAR_WIDTH = 18
  const SVG_WIDTH = 12 * BAR_GROUP_WIDTH + 60
  const SVG_HEIGHT = BAR_HEIGHT + 60

  return (
    <div>
      <Header title="月次収支レポート" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">年度</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value, 10))}
              min={2000}
              max={2100}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'エクスポート中...' : 'Excelエクスポート'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">読み込み中...</div>
        ) : !data ? (
          <div className="text-center text-slate-500 py-16">データの取得に失敗しました</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: '年間売上', value: formatCurrency(data.annual.revenue), color: 'text-blue-600' },
                { label: '年間原価', value: formatCurrency(data.annual.cost), color: 'text-orange-600' },
                { label: '年間粗利', value: formatCurrency(data.annual.grossProfit), color: data.annual.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
                { label: '年間粗利率', value: `${data.annual.grossMarginPct.toFixed(1)}%`, color: data.annual.grossMarginPct >= 30 ? 'text-emerald-600' : data.annual.grossMarginPct >= 15 ? 'text-amber-600' : 'text-red-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* SVG Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6 overflow-x-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-xs text-slate-600">売上</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-orange-400" />
                  <span className="text-xs text-slate-600">原価</span>
                </div>
              </div>
              <svg
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                style={{ display: 'block', minWidth: SVG_WIDTH }}
              >
                {/* Y-axis gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                  const y = 10 + BAR_HEIGHT * (1 - ratio)
                  const value = maxRevenue * ratio
                  return (
                    <g key={ratio}>
                      <line x1={40} y1={y} x2={SVG_WIDTH} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                      <text x={36} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
                        {value >= 1000000
                          ? `${(value / 1000000).toFixed(0)}M`
                          : value >= 10000
                          ? `${(value / 10000).toFixed(0)}万`
                          : value.toFixed(0)}
                      </text>
                    </g>
                  )
                })}

                {/* Bars */}
                {data.months.map((m, i) => {
                  const x = 44 + i * BAR_GROUP_WIDTH
                  const revH = maxRevenue > 0 ? (m.revenue / maxRevenue) * BAR_HEIGHT : 0
                  const costH = maxRevenue > 0 ? (m.cost / maxRevenue) * BAR_HEIGHT : 0
                  const revY = 10 + BAR_HEIGHT - revH
                  const costY = 10 + BAR_HEIGHT - costH

                  return (
                    <g key={m.month}>
                      <rect x={x} y={revY} width={BAR_WIDTH} height={revH} fill="#3b82f6" rx={2} />
                      <rect x={x + BAR_WIDTH + 4} y={costY} width={BAR_WIDTH} height={costH} fill="#fb923c" rx={2} />
                      <text
                        x={x + BAR_WIDTH + 2}
                        y={10 + BAR_HEIGHT + 16}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#64748b"
                      >
                        {MONTH_LABELS[m.month - 1]}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-4 py-3 text-left font-medium text-xs">月</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">売上</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">原価</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">粗利</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">粗利率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.months.map((m, i) => (
                      <tr key={m.month} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-medium text-slate-700">{MONTH_LABELS[m.month - 1]}</td>
                        <td className="px-4 py-3 text-right text-blue-700 font-medium">{formatCurrency(m.revenue)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(m.cost)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${m.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {formatCurrency(m.grossProfit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.revenue > 0 ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                color: marginColor(m.grossMarginPct),
                                background: marginBg(m.grossMarginPct),
                              }}
                            >
                              {m.grossMarginPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Annual total row */}
                    <tr className="bg-slate-800 text-white font-bold">
                      <td className="px-4 py-3 text-xs">年間合計</td>
                      <td className="px-4 py-3 text-right text-blue-300">{formatCurrency(data.annual.revenue)}</td>
                      <td className="px-4 py-3 text-right text-orange-300">{formatCurrency(data.annual.cost)}</td>
                      <td className={`px-4 py-3 text-right ${data.annual.grossProfit >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                        {formatCurrency(data.annual.grossProfit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            color: marginColor(data.annual.grossMarginPct),
                            background: marginBg(data.annual.grossMarginPct),
                          }}
                        >
                          {data.annual.grossMarginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
