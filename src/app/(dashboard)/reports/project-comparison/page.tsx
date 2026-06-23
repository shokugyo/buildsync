'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'

interface Project {
  id: string
  name: string
  projectNumber: string
  status: string
}

interface Metrics {
  id: string
  name: string
  projectNumber: string
  status: string
  contractAmount: number
  totalOrdered: number
  grossProfit: number
  grossProfitRate: number
  scheduleCompletionRate: number
  defectCount: number
}

function formatCurrency(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`
}

type RowConfig = {
  label: string
  key: keyof Metrics
  format: (v: number) => string
  higherIsBetter: boolean
}

const ROWS: RowConfig[] = [
  { label: '請負金額', key: 'contractAmount', format: formatCurrency, higherIsBetter: true },
  { label: '発注合計', key: 'totalOrdered', format: formatCurrency, higherIsBetter: false },
  { label: '粗利', key: 'grossProfit', format: formatCurrency, higherIsBetter: true },
  { label: '粗利率%', key: 'grossProfitRate', format: v => `${v.toFixed(1)}%`, higherIsBetter: true },
  { label: '工程完了率%', key: 'scheduleCompletionRate', format: v => `${v.toFixed(1)}%`, higherIsBetter: true },
  { label: '指摘件数', key: 'defectCount', format: v => `${v}件`, higherIsBetter: false },
]

export default function ProjectComparisonPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [metrics, setMetrics] = useState<Metrics[]>([])
  const [loading, setLoading] = useState(false)
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(Array.isArray(d) ? d : []))
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 5) {
        next.add(id)
      }
      return next
    })
  }

  const compare = async () => {
    if (selected.size === 0) return
    setComparing(true)
    try {
      const ids = Array.from(selected).join(',')
      const res = await fetch(`/api/reports/project-comparison?ids=${ids}`)
      const data = await res.json()
      setMetrics(Array.isArray(data) ? data : [])
      setLoading(false)
    } finally {
      setComparing(false)
    }
  }

  const getCellClass = (row: RowConfig, colIdx: number) => {
    if (metrics.length < 2) return ''
    const values = metrics.map(m => m[row.key] as number)
    const val = values[colIdx]
    const best = row.higherIsBetter ? Math.max(...values) : Math.min(...values)
    const worst = row.higherIsBetter ? Math.min(...values) : Math.max(...values)
    if (val === best && val !== worst) return 'bg-emerald-50 text-emerald-700 font-semibold'
    if (val === worst && val !== best) return 'bg-red-50 text-red-700 font-semibold'
    return ''
  }

  return (
    <div>
      <Header title="案件比較レポート" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">案件を選択（最大5件）</h2>
              <span className="text-xs text-slate-400">{selected.size}/5</span>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto mb-4">
              {projects.map(p => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selected.has(p.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                  } ${!selected.has(p.id) && selected.size >= 5 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    disabled={!selected.has(p.id) && selected.size >= 5}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.projectNumber}</p>
                  </div>
                </label>
              ))}
              {projects.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">案件がありません</p>
              )}
            </div>
            <button
              onClick={compare}
              disabled={selected.size === 0 || comparing}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {comparing ? '比較中...' : '比較する'}
            </button>
          </div>

          <div className="lg:col-span-2">
            {metrics.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center text-slate-400 text-sm">
                案件を選択して「比較する」を押してください
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-700 text-white">
                        <th className="px-4 py-3 text-left text-xs font-medium w-32">指標</th>
                        {metrics.map(m => (
                          <th key={m.id} className="px-4 py-3 text-center text-xs font-medium min-w-32">
                            <div className="truncate max-w-32">{m.name}</div>
                            <div className="text-slate-300 font-normal">{m.projectNumber}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ROWS.map((row, ri) => (
                        <tr key={row.key} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">{row.label}</td>
                          {metrics.map((m, ci) => (
                            <td
                              key={m.id}
                              className={`px-4 py-3 text-center text-sm ${getCellClass(row, ci)}`}
                            >
                              {row.format(m[row.key] as number)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-100" /> 最良値</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-100" /> 最悪値</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
