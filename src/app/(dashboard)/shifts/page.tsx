'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { ChevronLeft, ChevronRight, Printer, X, Plus } from 'lucide-react'

interface Shift {
  id: string
  userId: string
  user: { id: string; name: string }
  date: string
  startTime: string
  endTime: string
  projectId: string | null
  project: { id: string; name: string; projectNumber: string } | null
  role: string | null
  notes: string | null
}

interface User {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export default function ShiftsPage() {
  const { data: session } = useSession()
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectFilter, setProjectFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ userId: string; date: Date } | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    startTime: '09:00',
    endTime: '18:00',
    projectId: '',
    role: '',
    notes: '',
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchShifts = async () => {
    const params = new URLSearchParams({ weekStart: weekStart.toISOString() })
    if (projectFilter) params.set('projectId', projectFilter)
    const res = await fetch(`/api/shifts?${params}`)
    const data = await res.json()
    setShifts(Array.isArray(data) ? data : [])
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
  }

  const fetchProjects = async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchShifts()
  }, [weekStart, projectFilter])

  useEffect(() => {
    fetchUsers()
    fetchProjects()
  }, [])

  const getShiftForCell = (userId: string, day: Date): Shift | undefined => {
    return shifts.find((s) => s.userId === userId && isSameDay(new Date(s.date), day))
  }

  const handleCellClick = (userId: string, day: Date) => {
    const existing = getShiftForCell(userId, day)
    if (existing) {
      setEditingShift(existing)
      setForm({
        startTime: existing.startTime,
        endTime: existing.endTime,
        projectId: existing.projectId || '',
        role: existing.role || '',
        notes: existing.notes || '',
      })
    } else {
      setEditingShift(null)
      setForm({ startTime: '09:00', endTime: '18:00', projectId: '', role: '', notes: '' })
    }
    setSelectedCell({ userId, date: day })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!selectedCell) return
    setSaving(true)

    if (editingShift) {
      await fetch(`/api/shifts/${editingShift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCell.userId,
          date: selectedCell.date.toISOString(),
          ...form,
        }),
      })
    }

    setSaving(false)
    setShowModal(false)
    fetchShifts()
  }

  const handleDelete = async () => {
    if (!editingShift) return
    if (!confirm('このシフトを削除しますか？')) return
    await fetch(`/api/shifts/${editingShift.id}`, { method: 'DELETE' })
    setShowModal(false)
    fetchShifts()
  }

  const formatHeaderDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  const isToday = (d: Date) => isSameDay(d, new Date())
  const isWeekend = (i: number) => i >= 5

  const weekLabel = `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 〜 ${addDays(weekStart, 6).getMonth() + 1}月${addDays(weekStart, 6).getDate()}日`

  return (
    <div>
      <Header title="シフト管理" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[200px] text-center">{weekLabel}</span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              今週
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全案件</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              シフト表を印刷
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 bg-slate-50 sticky left-0 z-10 min-w-[120px] border-r border-slate-100">
                  メンバー
                </th>
                {weekDays.map((day, i) => (
                  <th
                    key={i}
                    className={`text-center px-3 py-3 text-xs font-medium min-w-[110px] ${
                      isToday(day) ? 'bg-blue-50 text-blue-700' : isWeekend(i) ? 'bg-slate-50 text-slate-400' : 'bg-slate-50 text-slate-500'
                    }`}
                  >
                    <div>{DAY_LABELS[i]}</div>
                    <div className={`text-base font-semibold mt-0.5 ${isToday(day) ? 'text-blue-600' : ''}`}>{formatHeaderDate(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-700 font-medium sticky left-0 bg-white border-r border-slate-100 z-10">
                    {user.name}
                  </td>
                  {weekDays.map((day, i) => {
                    const shift = getShiftForCell(user.id, day)
                    return (
                      <td
                        key={i}
                        onClick={() => handleCellClick(user.id, day)}
                        className={`px-2 py-2 text-center cursor-pointer transition-colors ${
                          isWeekend(i) ? 'bg-slate-50/50' : ''
                        } hover:bg-blue-50 group`}
                      >
                        {shift ? (
                          <div className="bg-blue-100 text-blue-800 rounded-lg px-2 py-1.5 text-xs">
                            <div className="font-medium">{shift.startTime}〜{shift.endTime}</div>
                            {shift.role && <div className="text-blue-600 truncate max-w-[90px]">{shift.role}</div>}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-10 text-slate-200 group-hover:text-blue-300 transition-colors">
                            <Plus className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                    メンバーがいません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedCell && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingShift ? 'シフトを編集' : 'シフトを追加'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">
                  {users.find((u) => u.id === selectedCell.userId)?.name} / {formatHeaderDate(selectedCell.date)}（{DAY_LABELS[selectedCell.date.getDay() === 0 ? 6 : selectedCell.date.getDay() - 1]}）
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始時間</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">終了時間</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件（任意）</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件なし</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">役割（任意）</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="現場監督、作業員など"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考（任意）</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="メモを入力..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-5 border-t border-slate-100">
              <div>
                {editingShift && (
                  <button
                    onClick={handleDelete}
                    className="px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                  >
                    削除
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
