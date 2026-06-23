'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'

interface ScheduleItem {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  status: string
  category?: string | null
  notes?: string | null
  project: { id: string; name: string; projectNumber: string }
  assignee?: { id: string; name: string } | null
}

interface PopoverInfo {
  schedule: ScheduleItem
  x: number
  y: number
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function getStatusBarColor(status: string): string {
  switch (status) {
    case '完了':
      return 'bg-green-500'
    case '遅延':
      return 'bg-red-500'
    case '進行中':
      return 'bg-blue-400'
    case '未着手':
    default:
      return 'bg-blue-500'
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const h = d.getHours()
  const m = d.getMinutes()
  if (h === 0 && m === 0) return ''
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [popover, setPopover] = useState<PopoverInfo | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const fetchSchedules = useCallback(() => {
    setLoading(true)
    // Fetch schedules that start within this month
    // Also include schedules that span into this month (startDate <= end of month)
    // We fetch all and filter client-side for simplicity, but use date params for the month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const from = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`
    const to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    fetch(`/api/schedules?startDateFrom=${from}&startDateTo=${to}`)
      .then((r) => r.json())
      .then((data) => {
        setSchedules(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year, month])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const prevMonth = () => {
    if (month === 0) {
      setYear(y => y - 1)
      setMonth(11)
    } else {
      setMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setYear(y => y + 1)
      setMonth(0)
    } else {
      setMonth(m => m + 1)
    }
  }

  // Build calendar grid
  // First day of month
  const firstOfMonth = new Date(year, month, 1)
  const firstDow = firstOfMonth.getDay() // 0=Sun

  // Last day of month
  const lastOfMonth = new Date(year, month + 1, 0)
  const totalDays = lastOfMonth.getDate()

  // Total cells: pad with prev month days
  const totalCells = Math.ceil((firstDow + totalDays) / 7) * 7

  // Build cells
  const cells: { date: Date; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstDow
    const date = new Date(year, month, 1 + dayOffset)
    cells.push({
      date,
      isCurrentMonth: date.getMonth() === month,
    })
  }

  // Build a map: dateKey -> schedules
  const scheduleMap = new Map<string, ScheduleItem[]>()
  for (const s of schedules) {
    const startDate = new Date(s.startDate)
    const key = `${startDate.getFullYear()}-${startDate.getMonth()}-${startDate.getDate()}`
    if (!scheduleMap.has(key)) scheduleMap.set(key, [])
    scheduleMap.get(key)!.push(s)
  }

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  const handleEventClick = (e: React.MouseEvent, schedule: ScheduleItem) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPopover({
      schedule,
      x: rect.left,
      y: rect.bottom + window.scrollY + 4,
    })
  }

  const weeks: { date: Date; isCurrentMonth: boolean }[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="工程カレンダー" />

      <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 pb-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          {/* Month navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              ◀ 前月
            </button>
            <h2 className="text-lg font-semibold text-slate-900 min-w-[120px] text-center">
              {year}年{month + 1}月
            </h2>
            <button
              onClick={nextMonth}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              翌月 ▶
            </button>
            <button
              onClick={() => {
                setYear(today.getFullYear())
                setMonth(today.getMonth())
              }}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              今月
            </button>
          </div>

          {/* Link back to list/gantt */}
          <Link
            href="/schedule"
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors text-slate-600"
          >
            リスト表示
          </Link>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">読み込み中...</div>
          ) : (
            <table className="w-full h-full border-collapse table-fixed">
              <thead>
                <tr>
                  {WEEKDAY_LABELS.map((label, i) => (
                    <th
                      key={label}
                      className={`py-2 text-xs font-semibold text-center border-b border-slate-200 ${
                        i === 0
                          ? 'text-red-500'
                          : i === 6
                          ? 'text-blue-500'
                          : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi} className="h-24">
                    {week.map(({ date, isCurrentMonth }, di) => {
                      const dow = date.getDay()
                      const todayCell = isToday(date)
                      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
                      const daySchedules = scheduleMap.get(key) || []
                      const visibleSchedules = daySchedules.slice(0, 3)
                      const extraCount = daySchedules.length - 3

                      return (
                        <td
                          key={di}
                          className={`border border-slate-100 align-top p-1 cursor-default ${
                            !isCurrentMonth ? 'bg-slate-50' : ''
                          } ${dow === 0 ? 'bg-red-50/30' : ''} ${dow === 6 ? 'bg-blue-50/30' : ''}`}
                          onClick={() => setPopover(null)}
                        >
                          {/* Day number */}
                          <div className="flex items-center justify-end mb-1">
                            <span
                              className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                                todayCell
                                  ? 'bg-blue-600 text-white font-bold'
                                  : !isCurrentMonth
                                  ? 'text-slate-300'
                                  : dow === 0
                                  ? 'text-red-400'
                                  : dow === 6
                                  ? 'text-blue-400'
                                  : 'text-slate-700'
                              }`}
                            >
                              {date.getDate()}
                            </span>
                          </div>

                          {/* Events */}
                          <div className="space-y-0.5">
                            {visibleSchedules.map((s) => {
                              const time = formatTime(s.startDate)
                              return (
                                <button
                                  key={s.id}
                                  onClick={(e) => handleEventClick(e, s)}
                                  className={`w-full text-left text-xs text-white rounded px-1 py-0.5 truncate leading-tight ${getStatusBarColor(s.status)} hover:opacity-80 transition-opacity`}
                                  title={s.name}
                                >
                                  {time && <span className="opacity-80 mr-0.5">{time}</span>}
                                  {s.name}
                                </button>
                              )
                            })}
                            {extraCount > 0 && (
                              <div className="text-xs text-slate-400 pl-1">+{extraCount}件</div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 flex-shrink-0">
          <span className="text-xs text-slate-400">凡例:</span>
          {[
            { label: '未着手・進行中', color: 'bg-blue-500' },
            { label: '完了', color: 'bg-green-500' },
            { label: '遅延', color: 'bg-red-500' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Popover */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-64"
          style={{ top: popover.y, left: Math.min(popover.x, window.innerWidth - 272) }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{popover.schedule.name}</p>
            <button
              onClick={() => setPopover(null)}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${getStatusBarColor(popover.schedule.status)}`}>
                {popover.schedule.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              <span className="font-medium">案件:</span> {popover.schedule.project.projectNumber} {popover.schedule.project.name}
            </p>
            <p className="text-xs text-slate-500">
              <span className="font-medium">開始:</span>{' '}
              {new Date(popover.schedule.startDate).toLocaleDateString('ja-JP')}
            </p>
            <p className="text-xs text-slate-500">
              <span className="font-medium">終了:</span>{' '}
              {new Date(popover.schedule.endDate).toLocaleDateString('ja-JP')}
            </p>
            {popover.schedule.assignee && (
              <p className="text-xs text-slate-500">
                <span className="font-medium">担当:</span> {popover.schedule.assignee.name}
              </p>
            )}
            {popover.schedule.progress > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${popover.schedule.progress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{popover.schedule.progress}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
