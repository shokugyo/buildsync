'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Info } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

function InfoIcon() {
  return <Info className="w-3 h-3 text-slate-400 inline ml-0.5 cursor-help" />
}

const LABEL_OPTIONS = ['案件ラベル1', '案件ラベル2', '案件ラベル3', '案件ラベル4', '案件ラベル5']
const COLORS = ['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function LabelsAnalyticsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedLabel, setSelectedLabel] = useState('いずれも含まない案件')
  const [period, setPeriod] = useState('直近365日間')
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProjects(data)
    }).catch(() => {})
  }, [])

  const projectsWithLabels = projects.map(p => {
    const labels = p.labels ? p.labels.split(',').map((l: string) => l.trim()).filter(Boolean) : []
    return { ...p, labelList: labels }
  })

  const noLabel = projectsWithLabels.filter(p => p.labelList.length === 0).length
  const singleLabel = projectsWithLabels.filter(p => p.labelList.length === 1).length
  const multiLabel = projectsWithLabels.filter(p => p.labelList.length > 1).length
  const totalSelections = projectsWithLabels.reduce((s, p) => s + p.labelList.length, 0)

  // PieChart: 選択なし / 1件 / 複数
  const selectionDistPie = [
    { name: '選択なし', value: noLabel },
    { name: '1件', value: singleLabel },
    ...(multiLabel > 0 ? [{ name: '複数', value: multiLabel }] : []),
  ].filter(d => d.value > 0)

  // All months from createdAt
  const allMonths = Array.from(new Set(
    projectsWithLabels.map(p => {
      const d = new Date(p.createdAt)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  )).sort()

  // 案件ごとの選択数 月次推移 cross-tab
  const selectionCountByMonth: Record<string, Record<number, number>> = {}
  projectsWithLabels.forEach(p => {
    const d = new Date(p.createdAt)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!selectionCountByMonth[month]) selectionCountByMonth[month] = {}
    const cnt = p.labelList.length
    selectionCountByMonth[month][cnt] = (selectionCountByMonth[month][cnt] || 0) + 1
  })
  const allSelectionCounts = Array.from(new Set(projectsWithLabels.map(p => p.labelList.length))).sort((a, b) => a - b)

  // 選択数別 分布 PieChart
  const labelCounts: Record<string, number> = {}
  projectsWithLabels.forEach(p => {
    p.labelList.forEach((l: string) => {
      labelCounts[l] = (labelCounts[l] || 0) + 1
    })
  })
  const labelDistPie = Object.entries(labelCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))

  // 選択数別 月次推移 cross-tab
  const labelByMonth: Record<string, Record<string, number>> = {}
  projectsWithLabels.forEach(p => {
    const d = new Date(p.createdAt)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    p.labelList.forEach((l: string) => {
      if (!labelByMonth[l]) labelByMonth[l] = {}
      labelByMonth[l][month] = (labelByMonth[l][month] || 0) + 1
    })
  })
  const allLabelKeys = Array.from(new Set(projectsWithLabels.flatMap((p: any) => p.labelList)))

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">案件ラベル登録</h2>
        </div>

        <div className="p-6">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">チェック対象案件ラベル</span>
            <select value={selectedLabel} onChange={e => setSelectedLabel(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
              {LABEL_OPTIONS.map(l => <option key={l}>{l}</option>)}
              <option>いずれも含まない案件</option>
            </select>
            <span className="text-xs text-slate-500 ml-1">マイルストーン名</span>
            <div className="flex items-center gap-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs text-slate-600">
              <span>着工日</span>
              <button className="text-slate-400 hover:text-slate-600 ml-1">×</button>
            </div>
            <span className="text-xs text-slate-500 ml-1">期間</span>
            <select value={period} onChange={e => setPeriod(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
              <option>直近365日間</option><option>直近90日間</option><option>直近30日間</option>
            </select>
            <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">案件種別　任意の値 である</span>
            <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">案件フロー　任意の値 である</span>
          </div>

          {/* Date + description */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xl font-bold text-slate-900">{today}</p>
              <p className="text-xs text-slate-400 mt-1">データ更新日 <InfoIcon /></p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-slate-600 space-y-1">
              <p>・案件ラベルの登録状況を確認したり、登録漏れのチェックができるダッシュボードです</p>
              <p>・確認を行いたい案件ラベルを画面上部の「チェック対象案件ラベル」から選択します</p>
              <p>・「案件ごとの選択数」のグラフ・表で、案件ラベルが選択されていなかったり、複数選択している案件を確認することが可能です（案件数のクリックで一覧が表示されます）</p>
              <p>・「選択数別」のグラフ・表で、各選択肢がどのくらい選択・利用されているかも確認することが可能です</p>
            </div>
          </div>

          {/* 対象案件数 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
            <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
            <p className="text-xs text-slate-400 mt-1">対象案件数 <InfoIcon /></p>
          </div>

          {/* 4 metric cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{noLabel}</p>
              <p className="text-xs text-slate-400 mt-1">未選択案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{singleLabel}</p>
              <p className="text-xs text-slate-400 mt-1">単一選択済案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{multiLabel}</p>
              <p className="text-xs text-slate-400 mt-1">複数選択済案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{totalSelections}</p>
              <p className="text-xs text-slate-400 mt-1">選択数 <InfoIcon /></p>
            </div>
          </div>

          {/* Row 1: 案件ごとの選択数 分布 (pie) + 月次推移 (table) */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">案件ごとの選択数 分布 <InfoIcon /></h3>
              {selectionDistPie.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={selectionDistPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}>
                      {selectionDistPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">案件ごとの選択数 月次推移 <InfoIcon /></h3>
              </div>
              {allMonths.length === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-12 h-12 border border-slate-200 rounded grid grid-cols-2 gap-0.5 p-1 opacity-30">
                    {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-300 rounded-sm" />)}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">期間</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">合計</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right font-semibold text-slate-500">{m}</th>)}
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-3 py-2 text-left text-slate-400 font-normal">入力選択数</th>
                        <th className="px-3 py-2 text-right text-slate-400 font-normal">案件数</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right text-slate-400 font-normal">案件数</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {allSelectionCounts.map(cnt => (
                        <tr key={cnt} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{cnt === 0 ? '選択なし' : `${cnt}件`}</td>
                          <td className="px-3 py-2 text-right">{projectsWithLabels.filter(p => p.labelList.length === cnt).length}</td>
                          {allMonths.map(m => <td key={m} className="px-3 py-2 text-right">{selectionCountByMonth[m]?.[cnt] || 0}</td>)}
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-700">合計</td>
                        <td className="px-3 py-2 text-right font-semibold">{projects.length}</td>
                        {allMonths.map(m => <td key={m} className="px-3 py-2 text-right font-semibold">{Object.values(selectionCountByMonth[m] || {}).reduce((s, v) => s + v, 0)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: 選択数別 分布 (pie) + 月次推移 (table) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">選択数別 分布 <InfoIcon /></h3>
              {labelDistPie.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={labelDistPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}>
                      {labelDistPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">選択数別 月次推移 <InfoIcon /></h3>
              </div>
              {allLabelKeys.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">期間</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">合計</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right font-semibold text-slate-500">{m}</th>)}
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-3 py-2 text-left text-slate-400 font-normal">案件ラベル選択数</th>
                        <th className="px-3 py-2 text-right text-slate-400 font-normal">選択数</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right text-slate-400 font-normal">選択数</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {allLabelKeys.map(l => (
                        <tr key={l} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{l}</td>
                          <td className="px-3 py-2 text-right">{labelCounts[l] || 0}</td>
                          {allMonths.map(m => <td key={m} className="px-3 py-2 text-right">{labelByMonth[l]?.[m] || 0}</td>)}
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-700">合計</td>
                        <td className="px-3 py-2 text-right font-semibold">{totalSelections}</td>
                        {allMonths.map(m => (
                          <td key={m} className="px-3 py-2 text-right font-semibold">
                            {allLabelKeys.reduce((s, l) => s + (labelByMonth[l]?.[m] || 0), 0)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
