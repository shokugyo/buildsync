'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Download, Settings, X } from 'lucide-react'

interface LaborCostRow {
  workerName: string
  workDays: number
  totalHours: number
  hourlyRate: number
  totalCost: number
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

interface WorkerUser {
  id: string
  name: string
  hourlyRate: number
}

interface RateModal {
  userId: string
  userName: string
  currentRate: number
}

function formatCurrency(n: number) {
  return n.toLocaleString('ja-JP') + ' 円'
}

export default function LaborCostsPage() {
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [month, setMonth] = useState(defaultMonth)
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [rows, setRows] = useState<LaborCostRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Hourly rate editor state
  const [users, setUsers] = useState<WorkerUser[]>([])
  const [rateModal, setRateModal] = useState<RateModal | null>(null)
  const [newRate, setNewRate] = useState('')
  const [rateSaving, setRateSaving] = useState(false)
  const [rateError, setRateError] = useState('')

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))

    fetch('/api/users')
      .then((r) => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          // Filter users that have hourlyRate info (admins get full list)
          setUsers(data.filter((u) => u.id && u.name).map((u) => ({
            id: u.id,
            name: u.name,
            hourlyRate: typeof u.hourlyRate === 'number' ? u.hourlyRate : 2000,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const handleSearch = async () => {
    if (!month) return
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams({ month })
    if (projectId) params.set('projectId', projectId)
    const data = await fetch(`/api/labor-costs?${params}`).then((r) => r.json())
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const handleExport = () => {
    const params = new URLSearchParams({ month })
    if (projectId) params.set('projectId', projectId)
    window.location.href = `/api/export/labor-costs/xlsx?${params}`
  }

  const openRateModal = (user: WorkerUser) => {
    setRateModal({ userId: user.id, userName: user.name, currentRate: user.hourlyRate })
    setNewRate(String(user.hourlyRate))
    setRateError('')
  }

  const closeRateModal = () => {
    setRateModal(null)
    setRateError('')
  }

  const handleSaveRate = async () => {
    if (!rateModal) return
    setRateSaving(true)
    setRateError('')
    try {
      const res = await fetch(`/api/users/${rateModal.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourlyRate: Number(newRate) }),
      })
      if (!res.ok) {
        const err = await res.json()
        setRateError(err.error || '更新に失敗しました')
        return
      }
      const updated = await res.json()
      // Update local users list
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, hourlyRate: updated.hourlyRate } : u))
      )
      closeRateModal()
      // Re-fetch labor costs if already searched
      if (searched) {
        handleSearch()
      }
    } catch {
      setRateError('更新に失敗しました')
    } finally {
      setRateSaving(false)
    }
  }

  const totalCost = rows.reduce((acc, r) => acc + r.totalCost, 0)
  const totalDays = rows.reduce((acc, r) => acc + r.workDays, 0)
  const totalHours = rows.reduce((acc, r) => acc + r.totalHours, 0)

  return (
    <div className="flex flex-col h-full">
      <Header title="労務費" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">対象月</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">案件</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全案件</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectNumber} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              集計
            </button>
            {searched && rows.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Excel出力
              </button>
            )}
          </div>
        </div>

        {/* Hourly Rate Settings */}
        {users.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">時間単価設定</span>
              </div>
              <span className="text-xs text-slate-400">各作業員の時給を設定します</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2">氏名</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-2">現在の時給</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-800">{user.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-600 text-right">{formatCurrency(user.hourlyRate)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => openRateModal(user)}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                        >
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            集計中...
          </div>
        ) : searched ? (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-slate-500">該当する勤怠データがありません</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">氏名</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">勤務日数</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">総労働時間</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">時給</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">労務費</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.workerName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{row.workDays} 日</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{row.totalHours} h</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(row.hourlyRate)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">{formatCurrency(row.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">合計</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">{totalDays} 日</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">{Math.round(totalHours * 100) / 100} h</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-700 text-right">{formatCurrency(totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        ) : null}
      </div>

      {/* Hourly Rate Edit Modal */}
      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">時間単価設定</h2>
              <button onClick={closeRateModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              <span className="font-medium text-slate-800">{rateModal.userName}</span> の時給を設定します
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">時給 (円)</label>
              <input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="100"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">現在: {formatCurrency(rateModal.currentRate)}</p>
            </div>

            {rateError && (
              <p className="mt-3 text-xs text-red-600">{rateError}</p>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={closeRateModal}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveRate}
                disabled={rateSaving || !newRate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rateSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
