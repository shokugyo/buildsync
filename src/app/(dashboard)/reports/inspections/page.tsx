'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from '@/components/Header'
import { CheckSquare, TrendingUp, AlertTriangle, CheckCircle2, Activity, Target, BarChart2 } from 'lucide-react'

interface InspectionRow {
  id: string
  date: string | null
  type: string
  name: string
  inspector: string | null
  result: string
  defectCount: number
  openDefects: number
  resolvedDefects: number
  project: { id: string; name: string; projectNumber: string }
}

interface Summary {
  total: number
  passRate: number
  openDefects: number
  resolvedDefects: number
}

interface TrendPoint {
  month: string
  passRate: number
  total: number
}

type SortKey = 'name' | 'count' | 'passRate' | 'defectDensity' | 'correctionRate'
type SortDir = 'asc' | 'desc'

function resultBadge(result: string) {
  if (result === '合格') return 'bg-green-100 text-green-700'
  if (result === '不合格') return 'bg-red-100 text-red-700'
  if (result === '実施中') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-600'
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const viewBoxW = 600
  const viewBoxH = 200
  const padL = 44
  const padR = 16
  const padT = 16
  const padB = 36
  const chartW = viewBoxW - padL - padR
  const chartH = viewBoxH - padT - padB
  const n = trend.length

  if (n === 0) return null

  const xStep = chartW / (n - 1 || 1)
  const points = trend.map((t, i) => ({
    x: padL + i * xStep,
    y: padT + chartH - (t.passRate / 100) * chartH,
    ...t,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} className="w-full" style={{ height: 200 }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padT + chartH - (v / 100) * chartH
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={viewBoxW - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {v}%
            </text>
          </g>
        )
      })}

      {/* Line path */}
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {points.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={4} fill="#3b82f6" stroke="white" strokeWidth="2" />
          <text x={p.x} y={viewBoxH - 8} textAnchor="middle" fontSize="10" fill="#64748b">
            {p.month.slice(5)}月
          </text>
          <title>
            {p.month}: {p.passRate}% ({p.total}件)
          </title>
        </g>
      ))}
    </svg>
  )
}

interface ProjectKpi {
  id: string
  name: string
  projectNumber: string
  count: number
  passRate: number
  defectDensity: number
  correctionRate: number
  totalDefects: number
  resolvedDefects: number
}

function ProjectKpiTable({ rows }: { rows: InspectionRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('passRate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const projectKpis = useMemo<ProjectKpi[]>(() => {
    const map = new Map<string, ProjectKpi>()
    for (const row of rows) {
      const pid = row.project.id
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: row.project.name,
          projectNumber: row.project.projectNumber,
          count: 0,
          passRate: 0,
          defectDensity: 0,
          correctionRate: 0,
          totalDefects: 0,
          resolvedDefects: 0,
        })
      }
      const kpi = map.get(pid)!
      kpi.count++
      if (row.result === '合格') kpi.passRate++
      kpi.totalDefects += row.defectCount
      kpi.resolvedDefects += row.resolvedDefects
    }
    return Array.from(map.values()).map((kpi) => ({
      ...kpi,
      passRate: kpi.count > 0 ? Math.round((kpi.passRate / kpi.count) * 100) : 0,
      defectDensity: kpi.count > 0 ? Math.round((kpi.totalDefects / kpi.count) * 100) / 100 : 0,
      correctionRate:
        kpi.totalDefects > 0 ? Math.round((kpi.resolvedDefects / kpi.totalDefects) * 100) : 0,
    }))
  }, [rows])

  const sorted = useMemo(() => {
    return [...projectKpis].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
  }, [projectKpis, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-slate-400">
      {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  )

  if (projectKpis.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">案件別KPIランキング</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th
                className="text-left px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('name')}
              >
                案件名 <SortIcon k="name" />
              </th>
              <th
                className="text-center px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('count')}
              >
                検査回数 <SortIcon k="count" />
              </th>
              <th
                className="text-center px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('passRate')}
              >
                合格率 <SortIcon k="passRate" />
              </th>
              <th
                className="text-center px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('defectDensity')}
              >
                不具合密度 <SortIcon k="defectDensity" />
              </th>
              <th
                className="text-center px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('correctionRate')}
              >
                是正率 <SortIcon k="correctionRate" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((kpi, idx) => (
              <tr key={kpi.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-800 font-medium">
                  <span className="text-xs text-slate-400 mr-1.5">#{idx + 1}</span>
                  {kpi.projectNumber} {kpi.name}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{kpi.count}回</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      kpi.passRate >= 80
                        ? 'bg-green-100 text-green-700'
                        : kpi.passRate >= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {kpi.passRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-600">
                  {kpi.defectDensity.toFixed(2)}
                  <span className="text-xs text-slate-400 ml-1">件/検査</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      kpi.correctionRate >= 80
                        ? 'bg-green-100 text-green-700'
                        : kpi.correctionRate >= 50
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {kpi.correctionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function InspectionReportPage() {
  const [projects, setProjects] = useState<{ id: string; name: string; projectNumber: string }[]>([])
  const [projectId, setProjectId] = useState('')
  const [month, setMonth] = useState('')
  const [rows, setRows] = useState<InspectionRow[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, passRate: 0, openDefects: 0, resolvedDefects: 0 })
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (projectId) params.set('projectId', projectId)
    if (month) params.set('month', month)
    fetch(`/api/reports/inspections?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d.rows) ? d.rows : [])
        setSummary(d.summary ?? { total: 0, passRate: 0, openDefects: 0, resolvedDefects: 0 })
        setTrend(Array.isArray(d.trend) ? d.trend : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId, month])

  useEffect(() => {
    load()
  }, [load])

  // Derived KPIs
  const totalDefects = rows.reduce((s, r) => s + r.defectCount, 0)
  const defectDensity =
    summary.total > 0 ? Math.round((totalDefects / summary.total) * 100) / 100 : 0
  const correctionRate =
    totalDefects > 0
      ? Math.round((summary.resolvedDefects / totalDefects) * 100)
      : 0
  const avgDefectsPerInspection = defectDensity

  return (
    <div>
      <Header title="検査レポート" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての案件</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectNumber} - {p.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {month && (
            <button
              onClick={() => setMonth('')}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              月指定解除
            </button>
          )}
        </div>

        {/* KPI Cards - Row 1: existing */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<CheckSquare className="w-5 h-5 text-blue-600" />}
            label="検査件数"
            value={summary.total}
            color="bg-blue-50"
          />
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            label="合格率"
            value={`${summary.passRate}%`}
            color="bg-green-50"
          />
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="未解決指摘"
            value={summary.openDefects}
            color="bg-red-50"
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5 text-slate-500" />}
            label="解決済指摘"
            value={summary.resolvedDefects}
            color="bg-slate-50"
          />
        </div>

        {/* KPI Cards - Row 2: new */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard
            icon={<Activity className="w-5 h-5 text-purple-600" />}
            label="不具合密度"
            value={defectDensity.toFixed(2)}
            sub="件 / 検査"
            color="bg-purple-50"
          />
          <SummaryCard
            icon={<Target className="w-5 h-5 text-teal-600" />}
            label="是正率"
            value={`${correctionRate}%`}
            sub="解決済 / 全指摘"
            color="bg-teal-50"
          />
          <SummaryCard
            icon={<BarChart2 className="w-5 h-5 text-orange-500" />}
            label="1検査あたり平均指摘"
            value={avgDefectsPerInspection.toFixed(2)}
            sub="件 / 検査"
            color="bg-orange-50"
          />
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">合格率トレンド（直近6ヶ月）</h3>
          {trend.length > 0 ? (
            <TrendChart trend={trend} />
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">データがありません</p>
          )}
        </div>

        {/* Project KPI Ranking */}
        {!loading && rows.length > 0 && <ProjectKpiTable rows={rows} />}

        {/* Inspection List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">検査一覧</h3>
          </div>
          {loading ? (
            <p className="text-center text-slate-400 text-sm py-10">読み込み中...</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">検査データがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">検査日</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">案件</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">種別</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">検査名</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">検査者</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">結果</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">指摘件数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {row.date ? new Date(row.date).toLocaleDateString('ja-JP') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.project.projectNumber} {row.project.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.type}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-slate-600">{row.inspector ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${resultBadge(row.result)}`}>
                          {row.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.defectCount > 0 ? (
                          <span className="text-xs">
                            <span className="text-red-600 font-medium">{row.openDefects}</span>
                            <span className="text-slate-400"> / {row.defectCount}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
