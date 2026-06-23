'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Download } from 'lucide-react'

interface OvertimeSummary {
  workerName: string
  workDays: number
  regularHours: number
  overtimeHours: number
  totalHours: number
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function OvertimePage() {
  const [month, setMonth] = useState(currentMonth())
  const [rows, setRows] = useState<OvertimeSummary[]>([])
  const [loading, setLoading] = useState(false)

  const load = async (m: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance/overtime?month=${m}`)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(month) }, [month])

  const handleExport = () => {
    window.location.href = `/api/export/overtime/xlsx?month=${month}`
  }

  const totalDays = rows.reduce((s, r) => s + r.workDays, 0)
  const totalRegular = rows.reduce((s, r) => s + r.regularHours, 0)
  const totalOvertime = rows.reduce((s, r) => s + r.overtimeHours, 0)
  const totalAll = rows.reduce((s, r) => s + r.totalHours, 0)

  return (
    <div>
      <Header title="残業管理" />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">対象月</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium ml-auto"
          >
            <Download className="w-4 h-4" />
            Excel出力
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">氏名</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">勤務日数</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">通常時間</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">残業時間</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">合計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        データがありません
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.workerName}
                        className={r.overtimeHours > 45 ? 'bg-red-50' : 'hover:bg-slate-50'}
                      >
                        <td className={`px-4 py-3 font-medium ${r.overtimeHours > 45 ? 'text-red-700' : 'text-slate-900'}`}>
                          {r.workerName}
                          {r.overtimeHours > 45 && (
                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">超過</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{r.workDays}日</td>
                        <td className="px-4 py-3 text-right text-slate-700">{r.regularHours}h</td>
                        <td className={`px-4 py-3 text-right font-medium ${r.overtimeHours > 45 ? 'text-red-600' : 'text-slate-700'}`}>
                          {r.overtimeHours}h
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{r.totalHours}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">合計</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">{totalDays}日</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                        {Math.round(totalRegular * 100) / 100}h
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                        {Math.round(totalOvertime * 100) / 100}h
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                        {Math.round(totalAll * 100) / 100}h
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {rows.some((r) => r.overtimeHours > 45) && (
          <p className="mt-3 text-xs text-red-500">
            * 赤色の行は残業時間が月45時間を超えています
          </p>
        )}
      </div>
    </div>
  )
}
