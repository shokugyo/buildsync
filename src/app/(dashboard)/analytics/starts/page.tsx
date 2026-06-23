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

function FilterChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">
      {label}
    </span>
  )
}

const TYPE_COLORS: Record<string, string> = {
  '新築': '#f87171',
  'リフォーム': '#fbbf24',
  'その他': '#60a5fa',
  '改修': '#34d399',
  '解体': '#a78bfa',
}

function getColor(type: string, idx: number): string {
  return TYPE_COLORS[type] || ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'][idx % 5]
}

export default function StartsAnalyticsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [periodMode, setPeriodMode] = useState('今年')
  const [groupMode, setGroupMode] = useState('着工種別')
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProjects(data)
    }).catch(() => {})
  }, [])

  const withStart = projects.filter(p => p.startDate)
  const noStartDate = projects.filter(p => !p.startDate)

  // Group by propertyType for distribution (horizontal bars)
  const typeGroups: Record<string, number> = {}
  withStart.forEach(p => {
    const t = p.propertyType || 'その他'
    typeGroups[t] = (typeGroups[t] || 0) + 1
  })
  const distributionData = Object.entries(typeGroups).map(([name, value]) => ({ name, value }))

  // Group by month for stacked trend chart
  const monthGroups: Record<string, Record<string, number>> = {}
  withStart.forEach(p => {
    const date = new Date(p.startDate)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthGroups[month]) monthGroups[month] = {}
    const t = p.propertyType || 'その他'
    monthGroups[month][t] = (monthGroups[month][t] || 0) + 1
  })
  const trendData = Object.entries(monthGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, types]) => ({ month, ...types, total: Object.values(types).reduce((s, v) => s + v, 0) }))

  const allTypes = Array.from(new Set(withStart.map((p: any) => p.propertyType || 'その他')))

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">着工推移</h2>
        </div>

        <div className="p-6">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 mr-2">
              <span className="text-xs text-slate-500">着工日</span>
              <select value={periodMode} onChange={e => setPeriodMode(e.target.value)} className="text-xs border border-slate-300 rounded px-1 py-0.5 bg-white">
                <option>今年</option><option>先月</option><option>今月</option><option>先四半期</option>
              </select>
            </div>
            <div className="flex items-center gap-1 mr-2">
              <span className="text-xs text-slate-500">集計区分担当</span>
              <select value={groupMode} onChange={e => setGroupMode(e.target.value)} className="text-xs border border-slate-300 rounded px-1 py-0.5 bg-white">
                <option>着工種別</option><option>設計担当</option><option>工事担当</option>
              </select>
            </div>
            {['案件種別', '案件フロー', '設業', '設計', '工事', '案件ラベル1', '案件ラベル2', '案件ラベル3', '案件ラベル4', '案件ラベル5'].map(f => (
              <FilterChip key={f} label={`${f}　任意の値 である`} />
            ))}
          </div>

          {/* Top metrics */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-2xl font-bold text-slate-900">{today}</p>
              <p className="text-xs text-slate-400 mt-1">データ更新日 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-blue-600">{withStart.length}</p>
              <p className="text-xs text-slate-400 mt-1">着工数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-red-500">{noStartDate.length}</p>
              <p className="text-xs text-slate-400 mt-1">着工日未入力案件数 <InfoIcon /></p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* 着工分布 - horizontal bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">着工分布 <InfoIcon /></h3>
              {distributionData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" />
                  <p className="text-sm">該当なし</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, distributionData.length * 50)}>
                  <BarChart data={distributionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} label={{ value: '着工数', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                    <Tooltip />
                    <Bar dataKey="value" name="着工数">
                      {distributionData.map((entry, i) => (
                        <rect key={i} fill={getColor(entry.name, i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 着工推移 - stacked bar by month */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">着工推移 <InfoIcon /></h3>
              {trendData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" />
                  <p className="text-sm">該当なし</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {allTypes.map((t, i) => (
                      <Bar key={t} dataKey={t} stackId="a" fill={getColor(t, i)} name={t} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 着工推移表 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">着工推移表 <InfoIcon /></h3>
            </div>
            {withStart.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">一致する結果はありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">着工種別</th>
                      {trendData.map(d => <th key={d.month} className="px-3 py-2 text-right font-semibold text-slate-500">{d.month}</th>)}
                      <th className="px-3 py-2 text-right font-semibold text-slate-500">合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTypes.map((t, ti) => (
                      <tr key={t} className="border-t border-slate-100">
                        <td className="px-3 py-2 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: getColor(t, ti) }} />
                          {t}
                        </td>
                        {trendData.map(d => <td key={d.month} className="px-3 py-2 text-right">{(d as any)[t] || 0}</td>)}
                        <td className="px-3 py-2 text-right font-semibold">{withStart.filter(p => (p.propertyType || 'その他') === t).length}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-700">合計</td>
                      {trendData.map(d => <td key={d.month} className="px-3 py-2 text-right font-semibold">{d.total}</td>)}
                      <td className="px-3 py-2 text-right font-semibold">{withStart.length}</td>
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
