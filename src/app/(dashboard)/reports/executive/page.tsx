'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart2,
  CreditCard,
  Layers,
  Download,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (Math.abs(v) >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}億円`
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}万円`
  return `¥${v.toLocaleString('ja-JP')}`
}

function fmtFull(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`
}

function pct(v: number) {
  return `${v.toFixed(1)}%`
}

function marginColor(p: number) {
  if (p >= 30) return 'text-emerald-600'
  if (p >= 15) return 'text-amber-600'
  return 'text-red-600'
}

function marginBgColor(p: number) {
  if (p >= 30) return 'bg-emerald-50 border-emerald-200'
  if (p >= 15) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

interface BarChartData {
  month: number
  revenue: number
  cost: number
  grossProfit: number
}

function SvgBarChart({ data, currentMonth }: { data: BarChartData[]; currentMonth: number }) {
  const W = 660
  const H = 220
  const PAD_L = 70
  const PAD_R = 20
  const PAD_T = 16
  const PAD_B = 36
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.cost)), 1)
  const barW = Math.floor((chartW / 12) * 0.35)
  const groupW = chartW / 12

  // Y-axis ticks
  const TICKS = 4
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (maxVal / TICKS) * i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      {/* Y grid & labels */}
      {ticks.map((t, i) => {
        const y = PAD_T + chartH - (t / maxVal) * chartH
        return (
          <g key={i}>
            <line x1={PAD_L} x2={PAD_L + chartW} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
              {t >= 1_000_000 ? `${(t / 10_000).toFixed(0)}万` : t > 0 ? String(Math.round(t)) : '0'}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const cx = PAD_L + i * groupW + groupW / 2
        const revH = (d.revenue / maxVal) * chartH
        const costH = (d.cost / maxVal) * chartH
        const isCurrentMonth = d.month === currentMonth
        return (
          <g key={i}>
            {/* Highlight current month */}
            {isCurrentMonth && (
              <rect
                x={PAD_L + i * groupW + 2}
                y={PAD_T}
                width={groupW - 4}
                height={chartH}
                fill="#eff6ff"
                rx={2}
              />
            )}
            {/* Revenue bar */}
            <rect
              x={cx - barW - 2}
              y={PAD_T + chartH - revH}
              width={barW}
              height={revH}
              fill="#3b82f6"
              rx={2}
              opacity={isCurrentMonth ? 1 : 0.75}
            />
            {/* Cost bar */}
            <rect
              x={cx + 2}
              y={PAD_T + chartH - costH}
              width={barW}
              height={costH}
              fill="#f59e0b"
              rx={2}
              opacity={isCurrentMonth ? 1 : 0.75}
            />
            {/* Month label */}
            <text
              x={cx}
              y={PAD_T + chartH + 14}
              textAnchor="middle"
              fontSize={10}
              fill={isCurrentMonth ? '#3b82f6' : '#64748b'}
              fontWeight={isCurrentMonth ? 'bold' : 'normal'}
            >
              {MONTH_LABELS[i]}
            </text>
          </g>
        )
      })}

      {/* Axes */}
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + chartH} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={PAD_L} x2={PAD_L + chartW} y1={PAD_T + chartH} y2={PAD_T + chartH} stroke="#cbd5e1" strokeWidth={1} />

      {/* Legend */}
      <rect x={PAD_L} y={H - 10} width={10} height={8} fill="#3b82f6" rx={1} />
      <text x={PAD_L + 14} y={H - 3} fontSize={10} fill="#64748b">売上</text>
      <rect x={PAD_L + 50} y={H - 10} width={10} height={8} fill="#f59e0b" rx={1} />
      <text x={PAD_L + 64} y={H - 3} fontSize={10} fill="#64748b">原価</text>
    </svg>
  )
}

// ── Gross-margin line chart ────────────────────────────────────────────────────

function SvgMarginChart({ data, currentMonth }: { data: BarChartData[]; currentMonth: number }) {
  const W = 660
  const H = 130
  const PAD_L = 50
  const PAD_R = 20
  const PAD_T = 10
  const PAD_B = 28
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const margins = data.map(d => (d.revenue > 0 ? (d.grossProfit / d.revenue) * 100 : 0))
  const maxM = Math.max(Math.max(...margins), 50)

  const pts = data.map((d, i) => {
    const x = PAD_L + (i / 11) * chartW
    const m = margins[i]
    const y = PAD_T + chartH - (m / maxM) * chartH
    return { x, y, m }
  })

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      {/* 0% line */}
      {(() => {
        const y0 = PAD_T + chartH
        return <line x1={PAD_L} x2={PAD_L + chartW} y1={y0} y2={y0} stroke="#e2e8f0" strokeWidth={1} />
      })()}

      {/* 30% guide */}
      {(() => {
        const y30 = PAD_T + chartH - (30 / maxM) * chartH
        return (
          <g>
            <line x1={PAD_L} x2={PAD_L + chartW} y1={y30} y2={y30} stroke="#bbf7d0" strokeWidth={1} strokeDasharray="4 3" />
            <text x={PAD_L - 6} y={y30 + 4} textAnchor="end" fontSize={9} fill="#6ee7b7">30%</text>
          </g>
        )
      })()}

      {/* Filled area */}
      <path
        d={`${pathD} L${(PAD_L + chartW).toFixed(1)},${(PAD_T + chartH).toFixed(1)} L${PAD_L},${(PAD_T + chartH).toFixed(1)} Z`}
        fill="#3b82f6"
        fillOpacity={0.08}
      />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

      {/* Dots + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={data[i].month === currentMonth ? 5 : 3}
            fill={data[i].month === currentMonth ? '#3b82f6' : '#93c5fd'}
            stroke="white"
            strokeWidth={1.5}
          />
          {data[i].month === currentMonth && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={10} fill="#3b82f6" fontWeight="bold">
              {pct(p.m)}
            </text>
          )}
        </g>
      ))}

      {/* Month labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={PAD_T + chartH + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">
          {MONTH_LABELS[i]}
        </text>
      ))}

      {/* Y label */}
      <text x={0} y={PAD_T + chartH / 2} textAnchor="middle" fontSize={9} fill="#94a3b8" transform={`rotate(-90, 10, ${PAD_T + chartH / 2})`}>
        粗利率
      </text>
    </svg>
  )
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface MonthlyData {
  month: number
  revenue: number
  cost: number
  grossProfit: number
  grossMarginPct: number
}

interface Kpi {
  monthRevenue: number
  monthCost: number
  monthGrossProfit: number
  monthGrossMarginPct: number
  activeCount: number
  ytdRevenue: number
  ytdCost: number
  ytdGrossProfit: number
  ytdGrossMarginPct: number
}

interface TopProject {
  name: string
  projectNumber: string
  revenue: number
}

interface UpcomingPayment {
  id: string
  invoiceNumber: string
  projectName: string
  dueDate: string
  amount: number
}

interface ExecutiveData {
  year: number
  currentMonth: number
  kpi: Kpi
  monthly: MonthlyData[]
  top5Projects: TopProject[]
  upcomingPayments: UpcomingPayment[]
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<ExecutiveData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/executive?year=${year}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year])

  const kpi = data?.kpi
  const monthly = data?.monthly ?? []
  const top5 = data?.top5Projects ?? []
  const payments = data?.upcomingPayments ?? []
  const currentMonth = data?.currentMonth ?? new Date().getMonth() + 1

  // Max revenue for top-5 bar
  const maxRev = Math.max(...top5.map(p => p.revenue), 1)

  return (
    <div>
      <Header title="経営ダッシュボード" />
      <div className="p-6 space-y-6">

        {/* Year selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">対象年度</span>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          </div>
          <a
            href={`/api/export/profit-loss/xlsx?year=${year}`}
            className="flex items-center gap-1.5 bg-white border border-green-200 hover:bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Excel出力
          </a>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">読み込み中...</div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500">データを取得できませんでした</div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 今月売上 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs text-slate-500">今月売上</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{fmt(kpi!.monthRevenue)}</p>
                <p className="text-xs text-slate-400 mt-1">{currentMonth}月 請求金額合計</p>
              </div>

              {/* 今月粗利 */}
              <div className={`bg-white rounded-xl shadow-sm border p-5 ${marginBgColor(kpi!.monthGrossMarginPct)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <BarChart2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-xs text-slate-500">今月粗利</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{fmt(kpi!.monthGrossProfit)}</p>
                <p className={`text-sm font-semibold mt-1 ${marginColor(kpi!.monthGrossMarginPct)}`}>
                  粗利率 {pct(kpi!.monthGrossMarginPct)}
                </p>
              </div>

              {/* 稼働案件数 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs text-slate-500">稼働案件数</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{kpi!.activeCount}<span className="text-base font-normal text-slate-500 ml-1">件</span></p>
                <p className="text-xs text-slate-400 mt-1">進行中の案件</p>
              </div>

              {/* YTD粗利率 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Layers className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-xs text-slate-500">YTD粗利率</span>
                </div>
                <p className={`text-2xl font-bold ${marginColor(kpi!.ytdGrossMarginPct)}`}>
                  {pct(kpi!.ytdGrossMarginPct)}
                </p>
                <p className="text-xs text-slate-400 mt-1">年初来累計</p>
              </div>
            </div>

            {/* ── YTD Summary row ── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">YTD売上合計</p>
                <p className="text-xl font-bold text-slate-900">{fmt(kpi!.ytdRevenue)}</p>
                <p className="text-xs text-slate-400">{fmtFull(kpi!.ytdRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">YTD原価合計</p>
                <p className="text-xl font-bold text-slate-900">{fmt(kpi!.ytdCost)}</p>
                <p className="text-xs text-slate-400">{fmtFull(kpi!.ytdCost)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">YTD粗利合計</p>
                <p className={`text-xl font-bold ${kpi!.ytdGrossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {kpi!.ytdGrossProfit >= 0 ? '+' : ''}{fmt(kpi!.ytdGrossProfit)}
                </p>
                <p className="text-xs text-slate-400">{fmtFull(kpi!.ytdGrossProfit)}</p>
              </div>
            </div>

            {/* ── Charts ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                月次売上・原価推移（{year}年）
              </h2>
              <SvgBarChart data={monthly} currentMonth={currentMonth} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">
                月次粗利率推移（{year}年）
              </h2>
              <p className="text-xs text-slate-400 mb-3">緑の破線は目標粗利率 30%</p>
              <SvgMarginChart data={monthly} currentMonth={currentMonth} />
            </div>

            {/* ── Monthly Table ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">月次損益サマリー（{year}年）</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500">
                      <th className="px-4 py-2.5 text-left font-medium">月</th>
                      <th className="px-4 py-2.5 text-right font-medium">売上</th>
                      <th className="px-4 py-2.5 text-right font-medium">原価</th>
                      <th className="px-4 py-2.5 text-right font-medium">粗利</th>
                      <th className="px-4 py-2.5 text-right font-medium">粗利率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map(m => {
                      const isCurrent = m.month === currentMonth && year === currentYear
                      return (
                        <tr
                          key={m.month}
                          className={`border-t border-slate-50 hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-blue-50' : ''}`}
                        >
                          <td className={`px-4 py-2.5 font-medium ${isCurrent ? 'text-blue-600' : 'text-slate-700'}`}>
                            {MONTH_LABELS[m.month - 1]}
                            {isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">今月</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{m.revenue > 0 ? fmtFull(m.revenue) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{m.cost > 0 ? fmtFull(m.cost) : '—'}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${m.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {m.revenue > 0 ? fmtFull(m.grossProfit) : '—'}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${m.revenue > 0 ? marginColor(m.grossMarginPct) : 'text-slate-300'}`}>
                            {m.revenue > 0 ? pct(m.grossMarginPct) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <td className="px-4 py-2.5 text-slate-700">年計</td>
                      <td className="px-4 py-2.5 text-right text-slate-900">{fmtFull(kpi!.ytdRevenue)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-900">{fmtFull(kpi!.ytdCost)}</td>
                      <td className={`px-4 py-2.5 text-right ${kpi!.ytdGrossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {fmtFull(kpi!.ytdGrossProfit)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${marginColor(kpi!.ytdGrossMarginPct)}`}>
                        {pct(kpi!.ytdGrossMarginPct)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── Bottom section: Top 5 + Upcoming Payments ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top 5 projects */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">
                  売上上位5案件（{year}年）
                </h2>
                {top5.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">データがありません</p>
                ) : (
                  <div className="space-y-3">
                    {top5.map((p, i) => {
                      const barPct = (p.revenue / maxRev) * 100
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                                <p className="text-xs text-slate-400">{p.projectNumber}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-800 ml-4 flex-shrink-0">
                              {fmt(p.revenue)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${barPct}%`,
                                backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][i],
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming payments */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-700">未回収請求（直近10件）</h2>
                </div>
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">未回収の請求書はありません</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map(pay => {
                      const due = new Date(pay.dueDate)
                      const daysUntil = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
                      const isOverdue = daysUntil < 0
                      const isClose = daysUntil >= 0 && daysUntil <= 7
                      return (
                        <div
                          key={pay.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                            isOverdue
                              ? 'bg-red-50 border-red-200'
                              : isClose
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-700 truncate">{pay.projectName}</p>
                            <p className="text-xs text-slate-400">{pay.invoiceNumber} · {pay.dueDate}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-bold text-slate-800">{fmt(pay.amount)}</p>
                            <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isClose ? 'text-amber-600' : 'text-slate-400'}`}>
                              {isOverdue ? `${Math.abs(daysUntil)}日超過` : daysUntil === 0 ? '今日期限' : `あと${daysUntil}日`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
