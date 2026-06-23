'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Info, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart, Legend,
} from 'recharts'

type Tab = 'preparation' | 'progress' | 'correction'

function InfoIcon() {
  return <Info className="w-3 h-3 text-slate-400 inline ml-0.5 cursor-help" />
}

function EmptyChart() {
  return (
    <div className="h-40 flex flex-col items-center justify-center text-slate-300">
      <BarChart2 className="w-10 h-10 mb-2" />
      <span className="text-xs">データがありません</span>
    </div>
  )
}

function FilterChip({ label, removable, onRemove }: { label: string; removable?: boolean; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">
      {label}
      {removable && (
        <button onClick={onRemove} className="text-slate-400 hover:text-slate-600 ml-0.5">×</button>
      )}
    </span>
  )
}

export default function InspectionAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('preparation')
  const [stats, setStats] = useState({
    noInspectionProjects: 0, noAssigneeInspections: 0, noScheduleDateInspections: 0,
    overdueProjects: 0, totalInspections: 0, completedInspections: 0, overdueIncomplete: 0,
    residualCorrections: 0,
  })
  const [projects, setProjects] = useState<any[]>([])
  const [inspections, setInspections] = useState<any[]>([])
  const [roleFilter, setRoleFilter] = useState('工事')

  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const dateTo = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  useEffect(() => {
    Promise.all([
      fetch('/api/inspections').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
    ]).then(([insp, proj]) => {
      const inspArr = Array.isArray(insp) ? insp : []
      const projArr = Array.isArray(proj) ? proj : []
      setInspections(inspArr)
      setProjects(projArr)
      const now = new Date()
      setStats({
        noInspectionProjects: 0,
        noAssigneeInspections: inspArr.filter((i: any) => !i.inspectorId).length,
        noScheduleDateInspections: inspArr.filter((i: any) => !i.scheduledDate).length,
        overdueProjects: inspArr.filter((i: any) => i.scheduledDate && new Date(i.scheduledDate) < now && i.status !== '完了').length,
        totalInspections: inspArr.length,
        completedInspections: inspArr.filter((i: any) => i.status === '完了').length,
        overdueIncomplete: inspArr.filter((i: any) => i.scheduledDate && new Date(i.scheduledDate) < now && i.status !== '完了').length,
        residualCorrections: inspArr.filter((i: any) => i.hasCorrection).length,
      })
    })
  }, [])

  // Dummy monthly correction data for chart
  const correctionData = [
    { month: '2025/11', total: 200, corrections: 40, rate: 0 },
    { month: '2025/08', total: 80, corrections: 12, rate: 0 },
    { month: '2025/09', total: 70, corrections: 10, rate: 0 },
    { month: '2025/10', total: 65, corrections: 8, rate: 0 },
    { month: '2025/11', total: 60, corrections: 7, rate: 0 },
    { month: '2025/12', total: 180, corrections: 25, rate: 0 },
    { month: '2026/01', total: 170, corrections: 22, rate: 0 },
    { month: '2026/02', total: 30, corrections: 3, rate: 0 },
    { month: '2026/03', total: 75, corrections: 8, rate: 0 },
    { month: '2026/04', total: 60, corrections: 6, rate: 0 },
    { month: '2025/05', total: 40, corrections: 4, rate: 0 },
    { month: '2026/06', total: 0, corrections: 0, rate: 0 },
  ]

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="min-h-screen bg-slate-50">
        {/* Sub-nav tabs */}
        <div className="bg-white border-b border-slate-200 px-6 flex gap-0">
          {[
            { key: 'preparation', label: '検査準備' },
            { key: 'progress', label: '検査進捗' },
            { key: 'correction', label: '是正分析' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-5 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-slate-500">
                {tab === 'correction' ? '集計対象' : tab === 'preparation' ? '着工日' : '完了期間'}
              </span>
              {tab === 'correction' ? (
                <>
                  <span className="bg-slate-100 rounded px-2 py-0.5 text-xs text-slate-700">検査実施日</span>
                  <span className="text-xs text-slate-400">着手日</span>
                  <span className="bg-slate-100 rounded px-2 py-0.5 text-xs text-slate-700">2025/07/01 - 2026/06/30</span>
                  <span className="text-xs text-slate-500 ml-1">集計項目分類別</span>
                  <span className="bg-slate-100 rounded px-2 py-0.5 text-xs text-slate-700">検査別告書</span>
                  <span className="text-xs text-slate-500 ml-1">集計案件ラベル別</span>
                  <FilterChip label="案件ラベル1" removable />
                  <FilterChip label="案件フロー　任意の値 である" />
                  <FilterChip label="案件種別　任意の値 である" />
                  {[1, 2, 3, 4, 5].map(n => (
                    <FilterChip key={n} label={`案件ラベル${n}　任意の値 である`} />
                  ))}
                  <FilterChip label="検査名　任意の値 である" />
                </>
              ) : (
                <>
                  <span className="bg-slate-100 rounded px-2 py-0.5 text-xs text-slate-700">{dateFrom} - {dateTo}</span>
                  <FilterChip label={tab === 'preparation' ? '契約前 または 着工前 または 進行中 である' : '進行中 である'} />
                  <FilterChip label="案件種別　任意の値 である" />
                  {[1, 2, 3, 4, 5].map(n => (
                    <FilterChip key={n} label={`案件ラベル${n}　任意の値 である`} />
                  ))}
                  {tab === 'preparation' && roleFilter && (
                    <FilterChip label={roleFilter} removable onRemove={() => setRoleFilter('')} />
                  )}
                </>
              )}
            </div>
            {tab === 'correction' && (
              <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-slate-100">
                <FilterChip label="検査状態　任意の値 である" />
                <FilterChip label="検査担当者　任意の値 である" />
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">
                  是正未対応　<span className="text-slate-400">00</span>　0
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">
                  初回完了　0
                </span>
              </div>
            )}
          </div>

          {/* Data updated date */}
          <div className="mb-5">
            <p className="text-2xl font-bold text-slate-900">{today}</p>
            <p className="text-xs text-slate-400">データ更新日 <InfoIcon /></p>
          </div>

          {/* ---- 検査準備 tab ---- */}
          {tab === 'preparation' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">着工1週間前</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-400">案件なし</p>
                    <p className="text-xs text-slate-400 mt-1">検査設定完了率 <InfoIcon /></p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.noInspectionProjects}</p>
                    <p className="text-xs text-slate-400 mt-1">検査が未追加の案件 <InfoIcon /></p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.noAssigneeInspections}</p>
                    <p className="text-xs text-slate-400 mt-1">検査担当者が未設定の案件 <InfoIcon /></p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.noScheduleDateInspections}</p>
                    <p className="text-xs text-slate-400 mt-1">予定日が未設定の案件 <InfoIcon /></p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">着工日超過</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-red-500">{stats.overdueProjects}</p>
                    <p className="text-xs text-slate-400 mt-1">検査設定が未完了の案件 <InfoIcon /></p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-slate-700">着工日別</h3>
                  <span className="text-xs text-slate-400">検査準備状況 <InfoIcon /></span>
                </div>
                <EmptyChart />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-slate-700">担当役割別</h3>
                  <span className="text-xs text-slate-400">検査設定状況 <InfoIcon /></span>
                </div>
                <div className="h-20 flex items-center justify-center text-xs text-slate-300">データがありません</div>
              </div>
            </>
          )}

          {/* ---- 検査進捗 tab ---- */}
          {tab === 'progress' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">検査と是正の対応状況</h3>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-400">
                      {stats.totalInspections === 0 ? '検査なし' : `${Math.round((stats.completedInspections / stats.totalInspections) * 100)}%`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">検査開始比率 <InfoIcon /></p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.noAssigneeInspections}</p>
                    <p className="text-xs text-slate-400 mt-1">検査担当者が未設定の検査 <InfoIcon /></p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.noScheduleDateInspections}</p>
                    <p className="text-xs text-slate-400 mt-1">予定日が未設定の検査 <InfoIcon /></p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.overdueIncomplete}</p>
                    <p className="text-xs text-slate-400 mt-1">未完了の検査(予定日超過) <InfoIcon /></p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.residualCorrections}</p>
                    <p className="text-xs text-slate-400 mt-1">残是正 <InfoIcon /></p>
                  </div>
                </div>
              </div>

              {/* 完成日別 chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">完成日別</h3>
                  <span className="text-xs text-slate-400">完成日別の検査進捗 <InfoIcon /></span>
                </div>
                {stats.totalInspections === 0 ? (
                  <div className="h-36 flex flex-col items-center justify-center">
                    <div className="flex gap-4 text-xs text-slate-400 mb-3">
                      <span><span className="inline-block w-3 h-3 rounded-full bg-red-400 mr-1" />未検査</span>
                      <span><span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1" />検査中</span>
                      <span><span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-1" />検査済</span>
                    </div>
                    <BarChart2 className="w-10 h-10 text-slate-200" />
                    <p className="text-xs text-slate-300 mt-1">データがありません</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={[]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'uninspected' ? '未検査' : v === 'inspecting' ? '検査中' : '検査済'} />
                      <Bar dataKey="uninspected" stackId="a" fill="#f87171" />
                      <Bar dataKey="inspecting" stackId="a" fill="#60a5fa" />
                      <Bar dataKey="completed" stackId="a" fill="#4ade80" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* 案件別 table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">案件別</h3>
                  <span className="text-xs text-slate-400">案件別の検査進捗 <InfoIcon /></span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {['案件名', '着工日', '完成日', '全検査', '検査担当者未設定', '予定日未設定', '担当者・予定日設定完了', '未完了(予定日超過)', '検査済', '残是正'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-slate-300">一致する結果はありません</td>
                        </tr>
                      ) : (
                        projects.slice(0, 10).map(p => {
                          const pInsp = inspections.filter((i: any) => i.projectId === p.id)
                          const noAssignee = pInsp.filter((i: any) => !i.inspectorId).length
                          const noDate = pInsp.filter((i: any) => !i.scheduledDate).length
                          const complete = pInsp.filter((i: any) => i.inspectorId && i.scheduledDate).length
                          const overdue = pInsp.filter((i: any) => i.scheduledDate && new Date(i.scheduledDate) < new Date() && i.status !== '完了').length
                          const done = pInsp.filter((i: any) => i.status === '完了').length
                          const corrections = pInsp.filter((i: any) => i.hasCorrection).length
                          return (
                            <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                              <td className="px-3 py-2 text-slate-600">{p.startDate ? new Date(p.startDate).toLocaleDateString('ja-JP') : '-'}</td>
                              <td className="px-3 py-2 text-slate-600">{p.endDate ? new Date(p.endDate).toLocaleDateString('ja-JP') : '-'}</td>
                              <td className="px-3 py-2 text-center">{pInsp.length}</td>
                              <td className="px-3 py-2 text-center">{noAssignee}</td>
                              <td className="px-3 py-2 text-center">{noDate}</td>
                              <td className="px-3 py-2 text-center">{complete}</td>
                              <td className="px-3 py-2 text-center text-red-500">{overdue}</td>
                              <td className="px-3 py-2 text-center text-green-600">{done}</td>
                              <td className="px-3 py-2 text-center">{corrections}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ---- 是正分析 tab ---- */}
          {tab === 'correction' && (
            <>
              {/* 月別 chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">月別</h3>
                  <span className="text-xs text-slate-400">是正検出率の推移 <InfoIcon /></span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={correctionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }}
                      formatter={(v) => v === 'total' ? '支援検査件数' : v === 'corrections' ? '是正検出' : '是正検出率'} />
                    <Bar yAxisId="left" dataKey="total" fill="#3b82f6" name="total" />
                    <Bar yAxisId="left" dataKey="corrections" fill="#1d4ed8" name="corrections" />
                    <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#ef4444" dot={{ r: 3 }} name="rate" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 検査項目別 */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">検査項目別</h3>
                  <span className="text-xs text-slate-400">検査項目別の是正検出率 <InfoIcon /></span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  {/* Left: inspection list */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">項目名</p>
                    {inspections.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-xs text-slate-300">
                        <BarChart2 className="w-8 h-8" />
                      </div>
                    ) : (
                      <ol className="space-y-1">
                        {inspections.slice(0, 12).map((i, idx) => (
                          <li key={i.id} className="text-xs text-slate-700 flex gap-2">
                            <span className="text-slate-400 w-4">{idx + 1}</span>
                            <span className="truncate">{i.name}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  {/* Right: rate table */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">検査項目名</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400">
                          <th className="text-left pb-1">検査項目名</th>
                          <th className="text-right pb-1">是正検出率</th>
                          <th className="text-right pb-1">是正検出数</th>
                          <th className="text-right pb-1">実施検査項目数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspections.length === 0 ? (
                          <tr><td colSpan={4} className="py-8 text-center text-slate-300">データがありません</td></tr>
                        ) : (
                          inspections.slice(0, 12).map((i: any) => (
                            <tr key={i.id} className="border-t border-slate-50">
                              <td className="py-1 truncate max-w-[150px]">{i.name}</td>
                              <td className="py-1 text-right">0.0%</td>
                              <td className="py-1 text-right">0</td>
                              <td className="py-1 text-right">{i.items?.length || 0}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
