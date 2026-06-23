'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Info } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

function InfoIcon() {
  return <Info className="w-3 h-3 text-slate-400 inline ml-0.5 cursor-help" />
}

const MILESTONE_OPTIONS = [
  { label: '着工日', field: 'startDate' },
  { label: '完成日', field: 'endDate' },
  { label: '引渡日', field: 'deliveryDate' },
]

const STATUS_COLORS = {
  '入力済(経過済)': '#10b981',
  '入力済(未到来)': '#22d3ee',
  '未入力': '#f87171',
}

function getStatus(project: any, field: string, today: Date): string {
  const dateStr = project[field]
  if (!dateStr) return '未入力'
  const d = new Date(dateStr)
  return d < today ? '入力済(経過済)' : '入力済(未到来)'
}

export default function MilestonesAnalyticsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedMilestone, setSelectedMilestone] = useState('完成日')
  const [periodMode, setPeriodMode] = useState('今年')
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProjects(data)
    }).catch(() => {})
  }, [])

  const field = MILESTONE_OPTIONS.find(m => m.label === selectedMilestone)?.field || 'endDate'

  const classified = projects.map(p => ({
    ...p,
    milestoneStatus: getStatus(p, field, today),
  }))

  const countByStatus = {
    '入力済(経過済)': classified.filter(p => p.milestoneStatus === '入力済(経過済)').length,
    '入力済(未到来)': classified.filter(p => p.milestoneStatus === '入力済(未到来)').length,
    '未入力': classified.filter(p => p.milestoneStatus === '未入力').length,
  }
  const total = projects.length

  // Percentages for 構成比 bar
  const pct = {
    '入力済(経過済)': total > 0 ? (countByStatus['入力済(経過済)'] / total) * 100 : 0,
    '入力済(未到来)': total > 0 ? (countByStatus['入力済(未到来)'] / total) * 100 : 0,
    '未入力': total > 0 ? (countByStatus['未入力'] / total) * 100 : 0,
  }

  // Monthly trend: group by milestone date month (or createdAt for 未入力)
  const monthGroups: Record<string, Record<string, number>> = {}
  classified.forEach(p => {
    const dateStr = p[field] || p.createdAt
    const d = new Date(dateStr)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthGroups[month]) monthGroups[month] = {}
    monthGroups[month][p.milestoneStatus] = (monthGroups[month][p.milestoneStatus] || 0) + 1
  })
  const trendData = Object.entries(monthGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, statuses]) => ({ month, ...statuses }))

  const allMonths = trendData.map(d => d.month)

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">マイルストーン入力</h2>
        </div>

        <div className="p-6">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">合計期間</span>
            <select value={periodMode} onChange={e => setPeriodMode(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
              <option>今年</option><option>先月</option><option>今月</option><option>先四半期</option>
            </select>
            <span className="text-xs text-slate-500 ml-1">合計手法</span>
            <div className="flex items-center gap-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs text-slate-600">
              <span>着工日</span>
              <button className="text-slate-400 hover:text-slate-600 ml-1">×</button>
            </div>
            <span className="text-xs text-slate-500 ml-1">チェック対象マイルストーン</span>
            <div className="flex items-center gap-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs">
              <select value={selectedMilestone} onChange={e => setSelectedMilestone(e.target.value)} className="text-xs border-none outline-none bg-transparent">
                {MILESTONE_OPTIONS.map(m => <option key={m.label}>{m.label}</option>)}
              </select>
              <button className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">入力ステータス　任意の値 である</span>
            <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">案件種別　任意の値 である</span>
            <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 max-w-xs truncate">案件フロー　契約前 または 着工前 または 進行中 または...</span>
            {['案件ラベル1', '案件ラベル2', '案件ラベル3', '案件ラベル4', '案件ラベル5'].map(l => (
              <span key={l} className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">{l}　任意の値 である</span>
            ))}
          </div>

          {/* Date + Legend */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xl font-bold text-slate-900">{todayStr}</p>
              <p className="text-xs text-slate-400 mt-1">データ更新日 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-slate-600 pb-1">ステータス名（凡例）</th>
                    <th className="text-left font-semibold text-slate-600 pb-1">ステータスの詳細</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  <tr>
                    <td className="py-0.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm inline-block bg-emerald-500" />
                        入力済(経過済)
                      </span>
                    </td>
                    <td className="py-0.5 text-slate-500">経過済の日付が入力されています</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm inline-block bg-cyan-400" />
                        入力済(未到来)
                      </span>
                    </td>
                    <td className="py-0.5 text-slate-500">未来の日付が入力されています</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm inline-block bg-red-400" />
                        未入力
                      </span>
                    </td>
                    <td className="py-0.5 text-slate-500">日付が入力されていません</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 入力ステータス 構成比 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">入力ステータス 構成比 <InfoIcon /></h3>
            {total === 0 ? (
              <div className="h-16 flex items-center justify-center text-slate-300 text-sm">該当なし</div>
            ) : (
              <div>
                <div className="flex h-10 rounded overflow-hidden mb-1">
                  {pct['入力済(経過済)'] > 0 && (
                    <div className="flex items-center justify-center text-white text-xs font-semibold bg-emerald-500" style={{ width: `${pct['入力済(経過済)']}%` }}>
                      {pct['入力済(経過済)'].toFixed(0)}%
                    </div>
                  )}
                  {pct['入力済(未到来)'] > 0 && (
                    <div className="flex items-center justify-center text-white text-xs font-semibold bg-cyan-400" style={{ width: `${pct['入力済(未到来)']}%` }}>
                      {pct['入力済(未到来)'].toFixed(0)}%
                    </div>
                  )}
                  {pct['未入力'] > 0 && (
                    <div className="flex items-center justify-center text-white text-xs font-semibold bg-red-400" style={{ width: `${pct['未入力']}%` }}>
                      {pct['未入力'].toFixed(0)}%
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-xs text-slate-400 px-0.5">
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                    <span key={v}>{v}%</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1 text-center">総数に占める割合</p>
                <div className="flex gap-4 justify-center mt-2 text-xs">
                  {(Object.entries(STATUS_COLORS) as [string, string][]).map(([status, color]) => (
                    <span key={status} className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
                      {status}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 入力ステータス推移 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">入力ステータス推移 <InfoIcon /></h3>
            {trendData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: '先月（基準月付）', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} label={{ value: '案件数', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="入力済(経過済)" stackId="a" fill="#10b981" name="入力済(経過済)" />
                  <Bar dataKey="入力済(未到来)" stackId="a" fill="#22d3ee" name="入力済(未到来)" />
                  <Bar dataKey="未入力" stackId="a" fill="#f87171" name="未入力" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 入力ステータス推移表 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">入力ステータス推移表 <InfoIcon /></h3>
            </div>
            {trendData.length === 0 ? (
              <div className="p-6 flex justify-center">
                <div className="w-12 h-12 border border-slate-200 rounded grid grid-cols-2 gap-0.5 p-1 opacity-30">
                  {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-300 rounded-sm" />)}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">先月（基準月付）</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-500">合計</th>
                      {allMonths.map(m => <th key={m} className="px-3 py-2 text-right font-semibold text-slate-500">{m}</th>)}
                    </tr>
                    <tr className="border-t border-slate-100">
                      <th className="px-3 py-2 text-left text-slate-400 font-normal">入力ステータス</th>
                      <th className="px-3 py-2 text-right text-slate-400 font-normal">案件数</th>
                      {allMonths.map(m => <th key={m} className="px-3 py-2 text-right text-slate-400 font-normal">案件数</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(['入力済(経過済)', '入力済(未到来)', '未入力'] as const).map(status => (
                      <tr key={status} className="border-t border-slate-100">
                        <td className="px-3 py-2 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: STATUS_COLORS[status] }} />
                          {status}
                        </td>
                        <td className="px-3 py-2 text-right">{countByStatus[status]}</td>
                        {allMonths.map(m => <td key={m} className="px-3 py-2 text-right">{(trendData.find(d => d.month === m) as any)?.[status] || 0}</td>)}
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-700">合計</td>
                      <td className="px-3 py-2 text-right font-semibold">{total}</td>
                      {allMonths.map(m => (
                        <td key={m} className="px-3 py-2 text-right font-semibold">
                          {Object.entries(trendData.find(d => d.month === m) || {}).filter(([k]) => k !== 'month').reduce((s, [, v]) => s + (Number(v) || 0), 0)}
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
  )
}
