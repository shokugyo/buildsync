'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import {
  Building2,
  ShoppingCart,
  Receipt,
  Calendar,
  AlertTriangle,
  PieChart,
  FileSpreadsheet,
} from 'lucide-react'

interface MonthlyData {
  month: string
  projects: {
    total: number
    new: number
    completed: number
  }
  orders: {
    count: number
    amount: number
  }
  invoices: {
    count: number
    amount: number
    paid: number
  }
  defects: {
    openTotal: number
    resolvedThisMonth: number
    totalThisMonth: number
  }
  schedules: {
    total: number
    completed: number
    delayed: number
  }
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatManEn(amount: number) {
  return (amount / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })
}

function calcPercent(numerator: number, denominator: number) {
  if (denominator === 0) return '0.0'
  return ((numerator / denominator) * 100).toFixed(1)
}

interface KpiCardProps {
  icon: React.ReactNode
  title: string
  color: string
  metrics: { label: string; value: string | number; sub?: string; color?: string }[]
}

function KpiCard({ icon, title, color, metrics }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="space-y-3">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{m.label}</span>
            <div className="text-right">
              <span className={`text-lg font-bold ${m.color || 'text-slate-800'}`}>
                {m.value}
              </span>
              {m.sub && <span className="text-xs text-slate-400 ml-1">{m.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [data, setData] = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchReport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/monthly?month=${month}`)
      if (!res.ok) {
        setError('データの取得に失敗しました')
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    window.location.href = `/api/export/reports/monthly/xlsx?month=${month}`
  }

  const scheduleCompletionRate =
    data ? calcPercent(data.schedules.completed, data.schedules.total) : '0.0'

  const defectResolutionRate =
    data
      ? calcPercent(data.defects.resolvedThisMonth, data.defects.totalThisMonth)
      : '0.0'

  return (
    <div>
      <Header title="月次サマリーレポート" />
      <div className="p-6 max-w-5xl">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">対象月</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
            >
              {loading ? '集計中...' : '集計'}
            </button>
            {data && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-green-200 hover:bg-green-50 text-green-700 rounded-lg text-sm font-medium"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excelエクスポート
              </button>
            )}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        {data && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-700">
                {data.month.replace('-', '年')}月 月次サマリー
              </h2>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 案件 */}
              <KpiCard
                icon={<Building2 className="w-4 h-4 text-blue-600" />}
                title="案件"
                color="bg-blue-50"
                metrics={[
                  { label: '総数', value: data.projects.total, sub: '件', color: 'text-blue-700' },
                  { label: '新規（今月）', value: data.projects.new, sub: '件', color: 'text-green-600' },
                  { label: '完了（今月）', value: data.projects.completed, sub: '件', color: 'text-slate-700' },
                ]}
              />

              {/* 受注 */}
              <KpiCard
                icon={<ShoppingCart className="w-4 h-4 text-orange-600" />}
                title="受注（今月）"
                color="bg-orange-50"
                metrics={[
                  { label: '発注件数', value: data.orders.count, sub: '件', color: 'text-orange-700' },
                  {
                    label: '発注金額',
                    value: formatManEn(data.orders.amount),
                    sub: '万円',
                    color: 'text-orange-700',
                  },
                ]}
              />

              {/* 請求 */}
              <KpiCard
                icon={<Receipt className="w-4 h-4 text-purple-600" />}
                title="請求（今月）"
                color="bg-purple-50"
                metrics={[
                  { label: '請求件数', value: data.invoices.count, sub: '件', color: 'text-purple-700' },
                  {
                    label: '請求金額',
                    value: formatManEn(data.invoices.amount),
                    sub: '万円',
                    color: 'text-purple-700',
                  },
                  {
                    label: '入金済',
                    value: data.invoices.paid,
                    sub: '件',
                    color: data.invoices.paid > 0 ? 'text-green-600' : 'text-slate-500',
                  },
                ]}
              />

              {/* 工程 */}
              <KpiCard
                icon={<Calendar className="w-4 h-4 text-teal-600" />}
                title="工程"
                color="bg-teal-50"
                metrics={[
                  {
                    label: '完了率',
                    value: `${scheduleCompletionRate}%`,
                    color: 'text-teal-700',
                  },
                  {
                    label: '遅延数',
                    value: data.schedules.delayed,
                    sub: '件',
                    color: data.schedules.delayed > 0 ? 'text-red-600' : 'text-slate-700',
                  },
                  {
                    label: '完了タスク',
                    value: `${data.schedules.completed} / ${data.schedules.total}`,
                    color: 'text-slate-700',
                  },
                ]}
              />

              {/* 品質 */}
              <KpiCard
                icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                title="品質（是正）"
                color="bg-red-50"
                metrics={[
                  {
                    label: '未対応指摘',
                    value: data.defects.openTotal,
                    sub: '件',
                    color: data.defects.openTotal > 0 ? 'text-red-600' : 'text-slate-700',
                  },
                  {
                    label: '今月指摘',
                    value: data.defects.totalThisMonth,
                    sub: '件',
                    color: 'text-slate-700',
                  },
                  {
                    label: '是正率（今月）',
                    value: `${defectResolutionRate}%`,
                    color: 'text-slate-700',
                  },
                ]}
              />

              {/* Summary */}
              <KpiCard
                icon={<PieChart className="w-4 h-4 text-slate-600" />}
                title="サマリー"
                color="bg-slate-100"
                metrics={[
                  {
                    label: '総案件数',
                    value: data.projects.total,
                    sub: '件',
                    color: 'text-slate-700',
                  },
                  {
                    label: '今月売上（発注）',
                    value: `${formatManEn(data.orders.amount)}万円`,
                    color: 'text-slate-700',
                  },
                  {
                    label: '工程完了率',
                    value: `${scheduleCompletionRate}%`,
                    color: 'text-slate-700',
                  },
                ]}
              />
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="text-center py-16 text-slate-400">
            <PieChart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">対象月を選択して「集計」ボタンを押してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
