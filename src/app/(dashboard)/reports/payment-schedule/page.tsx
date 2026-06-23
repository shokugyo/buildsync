'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { formatCurrency } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'

interface OrderEntry {
  id: string
  orderNumber: string
  subject: string
  totalAmount: number
  orderDate: string
  supplier?: { id: string; name: string } | null
  project: { id: string; name: string; projectNumber: string }
}

interface DayData {
  orders: OrderEntry[]
  totalAmount: number
}

export default function PaymentSchedulePage() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [byDate, setByDate] = useState<Record<string, DayData>>({})
  const [monthTotal, setMonthTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (m: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/payment-schedule?month=${m}`)
      if (res.ok) {
        const data = await res.json()
        setByDate(data.byDate || {})
        setMonthTotal(data.monthTotal || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(month) }, [month, fetchData])

  const [year, mon] = month.split('-').map(Number)
  const firstDay = new Date(year, mon - 1, 1)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const startWeekday = firstDay.getDay()

  const calendarCells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  const dayKey = (d: number) =>
    `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const allOrders = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, data]) => data.orders.map(o => ({ ...o, _date: date })))

  return (
    <div>
      <Header title="支払スケジュール" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <CalendarDays className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">月合計支払予定額</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthTotal)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">発注件数</p>
            <p className="text-lg font-bold text-slate-700">{allOrders.length}件</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500 border-b border-slate-200">
                {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-slate-100">
                {calendarCells.map((day, idx) => {
                  const key = day ? dayKey(day) : null
                  const data = key ? byDate[key] : null
                  const isToday = day === now.getDate() && mon === now.getMonth() + 1 && year === now.getFullYear()
                  return (
                    <div
                      key={idx}
                      className={`min-h-[72px] p-1.5 border-b border-slate-100 ${!day ? 'bg-slate-50' : ''} ${idx % 7 === 0 ? 'text-red-500' : idx % 7 === 6 ? 'text-blue-500' : ''}`}
                    >
                      {day && (
                        <>
                          <span className={`text-xs font-medium inline-block w-5 h-5 text-center leading-5 rounded-full ${isToday ? 'bg-blue-600 text-white' : ''}`}>
                            {day}
                          </span>
                          {data && (
                            <div className="mt-1">
                              <div className="text-xs font-bold text-orange-600 truncate">{formatCurrency(data.totalAmount)}</div>
                              <div className="text-xs text-slate-400">{data.orders.length}件</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {allOrders.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">この月の発注データがありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">発注一覧</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-medium text-slate-500">
                        <th className="px-4 py-3 text-left">日付</th>
                        <th className="px-4 py-3 text-left">協力会社名</th>
                        <th className="px-4 py-3 text-left">発注番号</th>
                        <th className="px-4 py-3 text-left">案件</th>
                        <th className="px-4 py-3 text-right">金額（税込）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{order._date}</td>
                          <td className="px-4 py-3 text-slate-700">{order.supplier?.name || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{order.orderNumber}</td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-700">{order.project.name}</p>
                            <p className="text-xs text-slate-400">{order.project.projectNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(order.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">月合計</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(monthTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
