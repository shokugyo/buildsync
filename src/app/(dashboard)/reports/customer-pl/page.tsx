'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Download } from 'lucide-react'

interface CustomerRow {
  customerId: string
  customerName: string
  projectCount: number
  revenue: number
  cost: number
  grossProfit: number
  margin: number
}

function formatCurrency(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`
}

function marginColor(pct: number) {
  if (pct >= 30) return 'text-emerald-700'
  if (pct >= 15) return 'text-amber-600'
  return 'text-red-600'
}

function marginBadge(pct: number) {
  if (pct >= 30) return 'bg-emerald-50 text-emerald-700'
  if (pct >= 15) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

export default function CustomerPLPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/customer-pl?year=${year}`)
      .then(r => r.json())
      .then(d => { setRows(d.rows ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/export/customer-pl/xlsx?year=${year}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `customer-pl-${year}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)
  const totalGrossProfit = totalRevenue - totalCost
  const totalMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0
  const totalProjects = rows.reduce((s, r) => s + r.projectCount, 0)

  return (
    <div>
      <Header title="顧客別収支レポート" />
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
            disabled={exporting || loading || rows.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'エクスポート中...' : 'Excelエクスポート'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">読み込み中...</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-slate-500 py-16">データがありません</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: '顧客数', value: String(rows.length) + '社', color: 'text-slate-700' },
                { label: '売上合計', value: formatCurrency(totalRevenue), color: 'text-blue-600' },
                { label: '粗利合計', value: formatCurrency(totalGrossProfit), color: totalGrossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
                { label: '平均粗利率', value: `${totalMargin.toFixed(1)}%`, color: marginColor(totalMargin) },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-4 py-3 text-left font-medium text-xs">顧客名</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">案件数</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">売上合計</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">原価合計</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">粗利</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">粗利率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.customerId} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.customerName}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.projectCount}</td>
                        <td className="px-4 py-3 text-right text-blue-700 font-medium">{formatCurrency(row.revenue)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.cost)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${row.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {formatCurrency(row.grossProfit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.revenue > 0 ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${marginBadge(row.margin)}`}>
                              {row.margin.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-800 text-white font-bold">
                      <td className="px-4 py-3 text-xs">合計</td>
                      <td className="px-4 py-3 text-right text-slate-300">{totalProjects}</td>
                      <td className="px-4 py-3 text-right text-blue-300">{formatCurrency(totalRevenue)}</td>
                      <td className="px-4 py-3 text-right text-orange-300">{formatCurrency(totalCost)}</td>
                      <td className={`px-4 py-3 text-right ${totalGrossProfit >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                        {formatCurrency(totalGrossProfit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${marginBadge(totalMargin)}`}>
                          {totalMargin.toFixed(1)}%
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
