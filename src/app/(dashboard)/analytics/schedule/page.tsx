'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Info } from 'lucide-react'

function InfoIcon() {
  return <Info className="w-3 h-3 text-slate-400 inline ml-0.5 cursor-help" />
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">
      {label}
    </span>
  )
}

export default function ScheduleAlertPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()).catch(() => []),
    ]).then(([proj]) => {
      if (Array.isArray(proj)) setProjects(proj)
    })
  }, [])

  const activeProjects = projects.filter(p => ['着工前', '施工中', '完工（精算前）'].includes(p.status))
  const waitingStart = projects.filter(p => p.status === '着工前')
  const inSchedule = projects.filter(p => {
    if (!p.startDate || !p.endDate) return false
    const now = new Date()
    return new Date(p.startDate) <= now && new Date(p.endDate) >= now
  })

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">日程工程 マイアラート</h2>
        </div>

        <div className="p-6">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-5 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">担当役割事業者</span>
            <FilterChip label="案件管理者 である" />
            <FilterChip label="担当役割事業者 任意の値 である" />
            <span className="text-xs text-slate-500 ml-2">工程管理表</span>
            <FilterChip label="自分が工程の担当者 である" />
            <span className="text-xs text-slate-500 ml-2">工期了付け</span>
            <FilterChip label="完成日" />
            <FilterChip label="案件種別 任意の値 である" />
            <FilterChip label="案件フロー 契約前 または 着工前 または 進行中 である" />
            <FilterChip label="工程表公開状況 任意の値 である" />
            <FilterChip label="工程状況 任意の値 である" />
            <FilterChip label="工程担当者 任意の値 である" />
          </div>

          {/* Description */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5 text-xs text-slate-600 space-y-1">
            <p>・自分自身が関与する案件と、その案件に続く工程のアラート数を表示します</p>
            <p>・想定案件における案件情報・設数で管理対象の絞り込みを必要に応じて変更してください</p>
            <p>・案件内の全ての小工程以外に集計対象を広げる場合は、工程管理担者で絞り替えてください</p>
            <p>・バーチャートには、工期が正しく入力されていない案件は表示されません</p>
          </div>

          {/* Data updated date */}
          <div className="mb-5">
            <p className="text-2xl font-bold text-slate-900">{today}</p>
            <p className="text-xs text-slate-400">データ更新日 <InfoIcon /></p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{projects.length}</p>
              <p className="text-xs text-slate-400 mt-1">管理中案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{waitingStart.length}</p>
              <p className="text-xs text-slate-400 mt-1">着工待ち案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{inSchedule.length}</p>
              <p className="text-xs text-slate-400 mt-1">工期内案件数 <InfoIcon /></p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-400 mt-1">1週間内工程当たり数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-red-500">0</p>
              <p className="text-xs text-slate-400 mt-1">作業未完了工程数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-red-500">0</p>
              <p className="text-xs text-slate-400 mt-1">報告未実施工程数 <InfoIcon /></p>
            </div>
          </div>

          {/* Gantt chart */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">管理中案件 工期 <InfoIcon /></h3>
            </div>
            {projects.filter(p => p.startDate && p.endDate).length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-300">データがありません</div>
            ) : (
              <div className="p-4 overflow-x-auto">
                {(() => {
                  const withDates = projects.filter(p => p.startDate && p.endDate)
                  const allDates = withDates.flatMap(p => [new Date(p.startDate), new Date(p.endDate)])
                  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
                  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
                  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div className="min-w-[600px]">
                      {withDates.map(p => {
                        const start = (new Date(p.startDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
                        const duration = (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)
                        const left = `${(start / totalDays) * 100}%`
                        const width = `${Math.max(2, (duration / totalDays) * 100)}%`
                        return (
                          <div key={p.id} className="flex items-center gap-3 mb-2">
                            <div className="text-xs text-blue-600 hover:underline cursor-pointer w-36 truncate">{p.name}</div>
                            <div className="flex-1 relative h-6 bg-slate-100 rounded">
                              <div
                                className="absolute top-1 h-4 bg-yellow-400 rounded"
                                style={{ left, width }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
