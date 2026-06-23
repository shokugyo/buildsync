'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'

interface WeeklyData {
  weekStart: string
  weekEnd: string
  projects: { count: number }
  schedules: { completedCount: number }
  defects: { newCount: number; resolvedCount: number }
  workReports: { count: number }
  orders: { count: number; total: number }
  attendance: { workerDays: number }
}

function getLastMonday(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const y = weekStart.getFullYear()
  const m = String(weekStart.getMonth() + 1).padStart(2, '0')
  const d1 = String(weekStart.getDate()).padStart(2, '0')
  const d2 = String(weekEnd.getDate()).padStart(2, '0')
  return `${y}年${m}月${d1}日〜${d2}日`
}

function formatCurrency(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`
}

export default function WeeklyReportPage() {
  const [weekStart, setWeekStart] = useState<Date>(getLastMonday)
  const [data, setData] = useState<WeeklyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/weekly?weekStart=${toDateStr(weekStart)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [weekStart])

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const cards = data ? [
    { label: '案件更新', value: `${data.projects.count}件`, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '工程完了', value: `${data.schedules.completedCount}件`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '新規指摘', value: `${data.defects.newCount}件`, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '指摘解決', value: `${data.defects.resolvedCount}件`, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: '作業報告', value: `${data.workReports.count}件`, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '発注', value: `${data.orders.count}件 / ${formatCurrency(data.orders.total)}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: '出勤者数', value: `${data.attendance.workerDays}人日`, color: 'text-teal-600', bg: 'bg-teal-50' },
  ] : []

  return (
    <div>
      <Header title="週報" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={prevWeek}
              className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              前週
            </button>
            <span className="text-base font-semibold text-slate-800">{formatWeekLabel(weekStart)}</span>
            <button
              onClick={nextWeek}
              className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              次週
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            印刷
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">読み込み中...</div>
        ) : !data ? (
          <div className="text-center text-slate-500 py-16">データの取得に失敗しました</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cards.map(card => (
              <div key={card.label} className={`${card.bg} rounded-xl p-5 border border-slate-100`}>
                <p className="text-xs font-medium text-slate-500 mb-2">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
