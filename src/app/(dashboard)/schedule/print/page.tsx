'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Schedule {
  id: string
  name: string
  category?: string | null
  startDate: string
  endDate: string
  progress: number
  status: string
  notes?: string | null
  assignee?: { name: string } | null
  project: { id: string; name: string; projectNumber: string }
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getStatusBarColor(status: string): string {
  switch (status) {
    case '完了': return '#22c55e'
    case '遅延': return '#ef4444'
    case '進行中': return '#f59e0b'
    default: return '#3b82f6'
  }
}

function getStatusProgressColor(status: string): string {
  switch (status) {
    case '完了': return '#16a34a'
    case '遅延': return '#dc2626'
    case '進行中': return '#d97706'
    default: return '#1d4ed8'
  }
}

function GanttPrintContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const monthParam = searchParams.get('month') // YYYY-MM
  const ownerView = searchParams.get('ownerView') === '1'

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [projectName, setProjectName] = useState('')
  const [company, setCompany] = useState<{ name?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = projectId ? `/api/schedules?projectId=${projectId}` : '/api/schedules'
    Promise.all([
      fetch(url).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([s, c]) => {
      const list: Schedule[] = Array.isArray(s) ? s : []
      setSchedules(list)
      if (list.length > 0) setProjectName(list[0].project?.name || '')
      setCompany(c)
      setLoading(false)
    })
  }, [projectId])

  if (loading) return <div className="p-8 text-center text-slate-500">読み込み中...</div>

  // Determine date range
  let viewStart: Date
  let totalDays: number

  if (monthParam) {
    const [y, m] = monthParam.split('-').map(Number)
    viewStart = new Date(y, m - 1, 1)
    const lastDay = new Date(y, m, 0)
    totalDays = lastDay.getDate()
  } else if (schedules.length > 0) {
    const allStarts = schedules.map(s => new Date(s.startDate))
    const allEnds = schedules.map(s => new Date(s.endDate))
    const minDate = startOfDay(new Date(Math.min(...allStarts.map(d => d.getTime()))))
    const maxDate = startOfDay(new Date(Math.max(...allEnds.map(d => d.getTime()))))
    viewStart = addDays(minDate, -1)
    totalDays = Math.min(
      Math.max(30, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 3),
      90
    )
  } else {
    viewStart = startOfDay(new Date())
    totalDays = 30
  }

  const days: Date[] = []
  for (let i = 0; i < totalDays; i++) {
    days.push(addDays(viewStart, i))
  }

  // Group by category
  const groupsMap = new Map<string, Schedule[]>()
  for (const s of schedules) {
    const key = s.category || `${s.project.projectNumber} - ${s.project.name}`
    if (!groupsMap.has(key)) groupsMap.set(key, [])
    groupsMap.get(key)!.push(s)
  }
  const groups = Array.from(groupsMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .map(([key, tasks]) => ({ key, tasks }))

  // Month header groups
  const monthGroups: { label: string; count: number }[] = []
  let curMonth = ''
  let curCount = 0
  for (const d of days) {
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    if (label !== curMonth) {
      if (curMonth) monthGroups.push({ label: curMonth, count: curCount })
      curMonth = label
      curCount = 1
    } else {
      curCount++
    }
  }
  if (curMonth) monthGroups.push({ label: curMonth, count: curCount })

  const today = startOfDay(new Date())

  // Cell width in px — narrow for many days, wider for fewer
  const DAY_W = totalDays <= 31 ? 22 : totalDays <= 60 ? 16 : 12
  const LEFT_W = 160

  return (
    <div className="bg-white min-h-screen font-sans" style={{ fontSize: 11 }}>
      <style>{`
        @media print {
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
          .page-container { padding: 0; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Toolbar - hidden on print */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-slate-200 bg-white sticky top-0 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {ownerView ? '施主用印刷（業者名なし）' : '自社用印刷'}
        </button>
        {ownerView ? (
          <a
            href={`/schedule/print${projectId ? `?projectId=${projectId}` : ''}${monthParam ? `${projectId ? '&' : '?'}month=${monthParam}` : ''}`}
            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            自社用に切替
          </a>
        ) : (
          <a
            href={`/schedule/print?ownerView=1${projectId ? `&projectId=${projectId}` : ''}${monthParam ? `&month=${monthParam}` : ''}`}
            className="border border-green-400 text-green-700 bg-green-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100"
          >
            施主用印刷（業者名なし）
          </a>
        )}
        <button
          onClick={() => window.history.back()}
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          戻る
        </button>
        {ownerView && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">施主用（業者名非表示）</span>
        )}
        <div className="flex items-center gap-4 ml-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span style={{ display:'inline-block', width:12, height:12, background:'#3b82f6', borderRadius:2 }} /> 未着手</span>
          <span className="flex items-center gap-1"><span style={{ display:'inline-block', width:12, height:12, background:'#f59e0b', borderRadius:2 }} /> 進行中</span>
          <span className="flex items-center gap-1"><span style={{ display:'inline-block', width:12, height:12, background:'#22c55e', borderRadius:2 }} /> 完了</span>
          <span className="flex items-center gap-1"><span style={{ display:'inline-block', width:12, height:12, background:'#ef4444', borderRadius:2 }} /> 遅延</span>
        </div>
      </div>

      <div className="page-container p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>工　程　表（ガントチャート）</h1>
            {projectName && <p style={{ fontSize: 12, color: '#475569' }}>案件：{projectName}</p>}
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#475569' }}>
            {!ownerView && <p style={{ fontWeight: 700 }}>{company?.name || ''}</p>}
            <p>出力日：{new Date().toLocaleDateString('ja-JP')}</p>
          </div>
        </div>

        {/* Legend (print only) */}
        <div style={{ display: 'none' }} className="print-legend">
          <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 10 }}>
            {[['未着手', '#3b82f6'], ['進行中', '#f59e0b'], ['完了', '#22c55e'], ['遅延', '#ef4444']].map(([label, color]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 2 }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Gantt Chart */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              width: LEFT_W + totalDays * DAY_W,
              fontSize: 10,
            }}
          >
            <colgroup>
              <col style={{ width: LEFT_W }} />
              {days.map((_, i) => (
                <col key={i} style={{ width: DAY_W }} />
              ))}
            </colgroup>
            <thead>
              {/* Row 1: Month groups */}
              <tr>
                <th
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    padding: '2px 4px',
                    textAlign: 'left',
                    fontWeight: 700,
                    color: '#334155',
                    fontSize: 10,
                  }}
                >
                  工程名
                </th>
                {monthGroups.map((mg, i) => (
                  <th
                    key={i}
                    colSpan={mg.count}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#e2e8f0',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#334155',
                      fontSize: 10,
                      padding: '2px 0',
                    }}
                  >
                    {mg.label}
                  </th>
                ))}
              </tr>
              {/* Row 2: Day numbers */}
              <tr>
                <th
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    padding: '2px 4px',
                    textAlign: 'left',
                    fontSize: 9,
                    color: '#64748b',
                  }}
                >
                  担当者
                </th>
                {days.map((d, i) => {
                  const dow = d.getDay()
                  const isToday = d.getTime() === today.getTime()
                  const bg = isToday ? '#fed7aa' : dow === 0 ? '#fee2e2' : dow === 6 ? '#dbeafe' : '#f8fafc'
                  const color = isToday ? '#c2410c' : dow === 0 ? '#dc2626' : dow === 6 ? '#2563eb' : '#64748b'
                  return (
                    <th
                      key={i}
                      style={{
                        border: '1px solid #cbd5e1',
                        background: bg,
                        color,
                        fontWeight: isToday ? 700 : 400,
                        textAlign: 'center',
                        padding: '1px 0',
                        fontSize: 9,
                      }}
                    >
                      {d.getDate()}
                    </th>
                  )
                })}
              </tr>
              {/* Row 3: Weekday */}
              <tr>
                <th
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    padding: '2px 4px',
                    fontSize: 9,
                    color: '#94a3b8',
                  }}
                />
                {days.map((d, i) => {
                  const dow = d.getDay()
                  const isToday = d.getTime() === today.getTime()
                  const bg = isToday ? '#fed7aa' : dow === 0 ? '#fee2e2' : dow === 6 ? '#dbeafe' : '#f8fafc'
                  const color = isToday ? '#c2410c' : dow === 0 ? '#dc2626' : dow === 6 ? '#2563eb' : '#94a3b8'
                  return (
                    <th
                      key={i}
                      style={{
                        border: '1px solid #cbd5e1',
                        background: bg,
                        color,
                        fontWeight: isToday ? 700 : 400,
                        textAlign: 'center',
                        padding: '1px 0',
                        fontSize: 8,
                      }}
                    >
                      {WEEKDAYS[dow]}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalDays + 1}
                    style={{ textAlign: 'center', padding: 20, color: '#94a3b8', border: '1px solid #cbd5e1' }}
                  >
                    工程データがありません
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <>
                    {/* Category header */}
                    <tr key={`cat-${group.key}`}>
                      <td
                        colSpan={totalDays + 1}
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#f1f5f9',
                          fontWeight: 700,
                          fontSize: 10,
                          color: '#334155',
                          padding: '3px 6px',
                        }}
                      >
                        {group.key}
                      </td>
                    </tr>
                    {/* Task rows */}
                    {group.tasks.map((task) => {
                      const taskStart = startOfDay(new Date(task.startDate))
                      const taskEnd = startOfDay(new Date(task.endDate))
                      const barColor = getStatusBarColor(task.status)
                      const progressColor = getStatusProgressColor(task.status)

                      return (
                        <tr key={task.id} style={{ height: 24 }}>
                          {/* Left column */}
                          <td
                            style={{
                              border: '1px solid #e2e8f0',
                              padding: '2px 4px 2px 12px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: LEFT_W,
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.name}
                            </div>
                            {!ownerView && task.assignee?.name && (
                              <div style={{ color: '#64748b', fontSize: 8 }}>{task.assignee.name}</div>
                            )}
                          </td>

                          {/* Day cells */}
                          {days.map((d, i) => {
                            const dow = d.getDay()
                            const isToday = d.getTime() === today.getTime()
                            const cellBg = isToday ? '#fff7ed' : dow === 0 ? '#fef9f9' : dow === 6 ? '#f5f9ff' : '#fff'

                            // Check if this day is within the task's date range
                            const dTime = d.getTime()
                            const inTask = dTime >= taskStart.getTime() && dTime <= taskEnd.getTime()
                            const isFirst = dTime === taskStart.getTime()
                            const isLast = dTime === taskEnd.getTime()

                            if (!inTask) {
                              return (
                                <td
                                  key={i}
                                  style={{
                                    border: '1px solid #f1f5f9',
                                    background: cellBg,
                                    padding: 0,
                                  }}
                                />
                              )
                            }

                            // Compute how far into the bar the progress fill extends (per-cell)
                            const taskTotalDays = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / 86400000) + 1)
                            const dayIndex = Math.floor((dTime - taskStart.getTime()) / 86400000)
                            const progressDays = (task.progress / 100) * taskTotalDays
                            const fillFraction = Math.min(1, Math.max(0, progressDays - dayIndex))

                            return (
                              <td
                                key={i}
                                style={{
                                  border: '1px solid #f1f5f9',
                                  background: cellBg,
                                  padding: '3px 0',
                                  position: 'relative',
                                  overflow: 'hidden',
                                }}
                              >
                                {/* Bar background */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 3,
                                    bottom: 3,
                                    left: isFirst ? 2 : 0,
                                    right: isLast ? 2 : 0,
                                    background: barColor,
                                    opacity: 0.35,
                                    borderRadius: isFirst && isLast ? 3 : isFirst ? '3px 0 0 3px' : isLast ? '0 3px 3px 0' : 0,
                                  }}
                                />
                                {/* Progress fill */}
                                {fillFraction > 0 && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 3,
                                      bottom: 3,
                                      left: isFirst ? 2 : 0,
                                      width: `${fillFraction * 100}%`,
                                      background: progressColor,
                                      opacity: 0.85,
                                      borderRadius: isFirst && isLast && fillFraction >= 1 ? 3 : isFirst ? '3px 0 0 3px' : 0,
                                    }}
                                  />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 9, color: '#94a3b8', textAlign: 'right' }}>
          合計 {schedules.length} 件{!ownerView && company?.name ? ` — ${company.name}` : ''} — 出力日時：{new Date().toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  )
}

export default function SchedulePrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">読み込み中...</div>}>
      <GanttPrintContent />
    </Suspense>
  )
}
