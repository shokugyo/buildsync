'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

export default function BoardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date()

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
    ]).then(([p, o, i]) => {
      setProjects(Array.isArray(p) ? p : [])
      setOrders(Array.isArray(o) ? o : [])
      setInvoices(Array.isArray(i) ? i : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // KPI calculations
  const activeProjects = projects.filter(p => p.status !== '引合' && p.status !== '失注')
  const juchu_count = activeProjects.length
  const juchu_amount = activeProjects.reduce((s, p) => s + (p.contractAmount || 0), 0)

  const hasshu_amount = orders
    .filter(o => o.status === '発注済' || o.status === '受領確認済')
    .reduce((s, o) => s + (o.totalAmount || 0), 0)

  const seikyu_amount = invoices
    .filter(i => i.status !== '未作成' && i.status !== '取消')
    .reduce((s, i) => s + (i.totalAmount || 0), 0)

  const nyukin_amount = invoices
    .filter(i => i.status === '入金済')
    .reduce((s, i) => s + (i.totalAmount || 0), 0)

  const gross_profit = juchu_amount - hasshu_amount
  const gross_margin_rate = juchu_amount > 0 ? (gross_profit / juchu_amount) * 100 : 0

  // Monthly project data (group by startDate month)
  const monthlyData: Record<string, { month: string; 進行中: number; 完了: number }> = {}
  projects.forEach(p => {
    if (!p.startDate) return
    const d = new Date(p.startDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) monthlyData[key] = { month: key, 進行中: 0, 完了: 0 }
    if (p.status === '完了' || p.status === '完工') monthlyData[key]['完了']++
    else if (p.status !== '引合' && p.status !== '失注') monthlyData[key]['進行中']++
  })
  const monthlyChartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-12)

  // Status distribution for pie chart
  const statusCounts: Record<string, number> = {}
  projects.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  // Top 10 projects by contractAmount
  const top10 = [...projects]
    .filter(p => p.contractAmount)
    .sort((a, b) => (b.contractAmount || 0) - (a.contractAmount || 0))
    .slice(0, 10)
    .map(p => {
      const projOrders = orders
        .filter(o => o.projectId === p.id && (o.status === '発注済' || o.status === '受領確認済'))
        .reduce((s: number, o: any) => s + (o.totalAmount || 0), 0)
      const grossMargin = p.contractAmount > 0 ? ((p.contractAmount - projOrders) / p.contractAmount) * 100 : 0
      return { ...p, grossMargin }
    })

  const kpiCards = [
    { label: '受注件数', value: `${juchu_count}件`, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '受注金額合計', value: formatCurrency(juchu_amount), color: 'text-green-600', bg: 'bg-green-50' },
    { label: '発注済金額', value: formatCurrency(hasshu_amount), color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '請求済金額', value: formatCurrency(seikyu_amount), color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '入金済金額', value: formatCurrency(nyukin_amount), color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: '総粗利見込', value: formatCurrency(gross_profit), color: gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: gross_profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
  ]

  return (
    <div>
      <Header title="経営ボード" />
      <div className="p-6">
        {/* Title + Date */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">経営ボード</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} 現在
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">平均粗利率</p>
            <p className={`text-2xl font-bold ${gross_margin_rate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {gross_margin_rate.toFixed(1)}%
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : (
          <>
            {/* KPI Cards 3x2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {kpiCards.map((card) => (
                <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-white`}>
                  <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Bar chart - monthly breakdown */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">月別案件状況（着工月ベース）</h3>
                {monthlyChartData.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">データがありません</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="進行中" fill="#3b82f6" />
                      <Bar dataKey="完了" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pie chart - status distribution */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">案件ステータス分布</h3>
                {pieData.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">データがありません</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          fontSize={10}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1">
                      {pieData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-slate-600">{entry.name}</span>
                          </div>
                          <span className="text-slate-900 font-medium">{entry.value}件</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Top 10 projects table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">受注金額上位10件</h3>
              </div>
              {top10.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">データがありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-medium text-slate-500">
                        <th className="px-4 py-3 text-left">案件名</th>
                        <th className="px-4 py-3 text-left">ステータス</th>
                        <th className="px-4 py-3 text-right">受注金額</th>
                        <th className="px-4 py-3 text-right">粗利率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {top10.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-900 font-medium truncate max-w-[200px]">{p.name}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(p.contractAmount)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${p.grossMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {p.grossMargin.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
