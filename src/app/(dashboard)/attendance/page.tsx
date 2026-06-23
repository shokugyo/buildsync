'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import {
  Plus, Pencil, Trash2, X, LogIn, LogOut, Users, Download, QrCode,
  BarChart2, ClipboardList, CheckCircle, XCircle, Clock, CreditCard, Lock, Unlock,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  projectNumber: string
}

interface Attendance {
  id: string
  projectId: string
  project: { name: string; projectNumber: string }
  workerName: string
  company: string | null
  workDate: string
  entryTime: string | null
  exitTime: string | null
  workContent: string | null
  notes: string | null
  workingHours: number | null
  overtimeHours: number | null
  isLocked: boolean
}

interface WorkerSummary {
  workerName: string
  company: string | null
  days: number
  totalHours: number
  overtimeHours: number
}

interface AttendanceStats {
  month: string
  totalWorkerDays: number
  avgDailyHeadcount: number
  workingDays: number
  totalHours: number
  overtimeHours: number
  top5Workers: WorkerSummary[]
  workerSummary: WorkerSummary[]
}

interface CorrectionRequest {
  id: string
  attendanceId: string
  attendance: {
    workerName: string
    company: string | null
    workDate: string
    entryTime: string | null
    exitTime: string | null
    project: { name: string; projectNumber: string }
  }
  requestedCheckIn: string | null
  requestedCheckOut: string | null
  reason: string
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

const emptyForm = {
  projectId: '',
  workerName: '',
  company: '',
  workDate: new Date().toISOString().split('T')[0],
  entryTime: '',
  exitTime: '',
  workContent: '',
  notes: '',
  overtimeHours: '',
}

const MANAGER_ROLES = ['管理者', '会社管理者', '現場監督']

function calcWorkingHours(entryTime: string, exitTime: string): number | null {
  if (!entryTime || !exitTime) return null
  const [eh, em] = entryTime.split(':').map(Number)
  const [xh, xm] = exitTime.split(':').map(Number)
  const diffMinutes = (xh * 60 + xm) - (eh * 60 + em)
  if (diffMinutes <= 0) return null
  return Math.round((diffMinutes / 60) * 100) / 100
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'records' | 'stats' | 'corrections'>('records')
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Attendance | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [filterProject, setFilterProject] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [searchWorker, setSearchWorker] = useState('')
  const [exportMonth, setExportMonth] = useState(getCurrentMonth)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrProjectId, setQrProjectId] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrCheckInUrl, setQrCheckInUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [userRole, setUserRole] = useState('')

  // Lock state
  const [lockMonth, setLockMonth] = useState(getCurrentMonth)
  const [lockStatus, setLockStatus] = useState<{ locked: boolean; lock?: any } | null>(null)
  const [lockLoading, setLockLoading] = useState(false)
  const [showLockConfirm, setShowLockConfirm] = useState(false)

  // Stats
  const [statsMonth, setStatsMonth] = useState(getCurrentMonth())
  const [statsProjectId, setStatsProjectId] = useState('')
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Corrections
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([])
  const [correctionsLoading, setCorrectionsLoading] = useState(false)
  const [correctionFilter, setCorrectionFilter] = useState('')
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [correctionTarget, setCorrectionTarget] = useState<Attendance | null>(null)
  const [correctionForm, setCorrectionForm] = useState({ requestedCheckIn: '', requestedCheckOut: '', reason: '' })
  const [correctionSaving, setCorrectionSaving] = useState(false)

  const isManager = MANAGER_ROLES.includes(userRole)

  const fetchAttendances = async () => {
    const params = new URLSearchParams()
    if (filterProject) params.set('projectId', filterProject)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)
    const res = await fetch(`/api/attendance?${params}`)
    const data = await res.json()
    setAttendances(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    const params = new URLSearchParams({ month: statsMonth })
    if (statsProjectId) params.set('projectId', statsProjectId)
    const res = await fetch(`/api/attendance/stats?${params}`)
    if (res.ok) setStats(await res.json())
    setStatsLoading(false)
  }

  const fetchCorrections = async () => {
    setCorrectionsLoading(true)
    const params = new URLSearchParams()
    if (correctionFilter) params.set('status', correctionFilter)
    const res = await fetch(`/api/attendance/corrections?${params}`)
    if (res.ok) setCorrections(await res.json())
    setCorrectionsLoading(false)
  }

  const fetchLockStatus = async (month: string) => {
    const res = await fetch(`/api/attendance/lock?month=${month}`)
    if (res.ok) setLockStatus(await res.json())
  }

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : []))
    fetch('/api/auth/session').then(r => r.json()).then(d => setUserRole(d?.user?.role || ''))
  }, [])

  useEffect(() => { fetchAttendances() }, [filterProject, filterDateFrom, filterDateTo])
  useEffect(() => { if (activeTab === 'stats') fetchStats() }, [activeTab, statsMonth, statsProjectId])
  useEffect(() => { if (activeTab === 'corrections') fetchCorrections() }, [activeTab, correctionFilter])
  useEffect(() => { if (isManager) fetchLockStatus(lockMonth) }, [lockMonth, isManager])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  const openEdit = (a: Attendance) => {
    if (a.isLocked) return
    setEditing(a)
    setForm({
      projectId: a.projectId,
      workerName: a.workerName,
      company: a.company || '',
      workDate: a.workDate.split('T')[0],
      entryTime: a.entryTime || '',
      exitTime: a.exitTime || '',
      workContent: a.workContent || '',
      notes: a.notes || '',
      overtimeHours: a.overtimeHours != null ? String(a.overtimeHours) : '',
    })
    setShowModal(true)
  }

  const openCorrectionModal = (a: Attendance) => {
    setCorrectionTarget(a)
    setCorrectionForm({
      requestedCheckIn: a.entryTime || '',
      requestedCheckOut: a.exitTime || '',
      reason: '',
    })
    setShowCorrectionModal(true)
  }

  const computedWorkingHours = calcWorkingHours(form.entryTime, form.exitTime)

  const handleSave = async () => {
    if (!form.projectId || !form.workerName || !form.workDate) return
    setSaving(true)
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/attendance/${editing.id}` : '/api/attendance'
    const payload = {
      ...form,
      workingHours: computedWorkingHours,
      overtimeHours: form.overtimeHours !== '' ? Number(form.overtimeHours) : null,
    }
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    setShowModal(false)
    fetchAttendances()
  }

  const handleDelete = async (id: string, name: string, isLocked: boolean) => {
    if (isLocked) { alert('締め済みの記録は削除できません'); return }
    if (!confirm(`${name} の入退場記録を削除しますか？`)) return
    await fetch(`/api/attendance/${id}`, { method: 'DELETE' })
    fetchAttendances()
  }

  const handleSubmitCorrection = async () => {
    if (!correctionTarget || !correctionForm.reason) return
    setCorrectionSaving(true)
    await fetch('/api/attendance/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendanceId: correctionTarget.id,
        requestedCheckIn: correctionForm.requestedCheckIn || null,
        requestedCheckOut: correctionForm.requestedCheckOut || null,
        reason: correctionForm.reason,
      }),
    })
    setCorrectionSaving(false)
    setShowCorrectionModal(false)
    alert('修正申請を提出しました')
  }

  const handleReviewCorrection = async (id: string, status: '承認' | '却下') => {
    const label = status === '承認' ? '承認' : '却下'
    if (!confirm(`この修正申請を${label}しますか？`)) return
    const res = await fetch(`/api/attendance/corrections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      fetchCorrections()
      if (status === '承認') fetchAttendances()
    } else {
      const data = await res.json()
      alert(data.error || 'エラーが発生しました')
    }
  }

  const handleLock = async () => {
    setLockLoading(true)
    const res = await fetch('/api/attendance/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: lockMonth }),
    })
    if (res.ok) {
      await fetchLockStatus(lockMonth)
      fetchAttendances()
    } else {
      const data = await res.json()
      alert(data.error || '締め処理に失敗しました')
    }
    setLockLoading(false)
    setShowLockConfirm(false)
  }

  const handleUnlock = async () => {
    if (!confirm(`${lockMonth} の締めを解除しますか？`)) return
    setLockLoading(true)
    const res = await fetch(`/api/attendance/lock?month=${lockMonth}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchLockStatus(lockMonth)
      fetchAttendances()
    }
    setLockLoading(false)
  }

  const openQrModal = async (projectId?: string) => {
    const pid = projectId || filterProject
    if (!pid) {
      alert('QRコードを生成するには案件を選択してください')
      return
    }
    setQrProjectId(pid)
    setQrDataUrl('')
    setQrCheckInUrl('')
    setShowQrModal(true)
    setQrLoading(true)
    const res = await fetch(`/api/attendance/qr?projectId=${pid}`)
    if (res.ok) {
      const data = await res.json()
      setQrDataUrl(data.qrDataUrl)
      setQrCheckInUrl(data.checkInUrl)
    }
    setQrLoading(false)
  }

  const filtered = attendances.filter(a =>
    !searchWorker || a.workerName.includes(searchWorker) || (a.company || '').includes(searchWorker)
  )

  const todayStr = new Date().toISOString().split('T')[0]
  const todayCount = attendances.filter(a => a.workDate.startsWith(todayStr)).length
  const selectedProject = projects.find(p => p.id === filterProject)

  const statusBadge = (s: string) => {
    if (s === '申請中') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" />{s}</span>
    if (s === '承認') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />{s}</span>
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" />{s}</span>
  }

  return (
    <div>
      <Header title="入退場管理" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{todayCount}</span>
            </div>
            <p className="text-sm text-slate-500">本日の入場者数</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 rounded-lg p-2">
                <LogIn className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{attendances.length}</span>
            </div>
            <p className="text-sm text-slate-500">総記録件数</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <LogOut className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {new Set(attendances.map(a => a.workerName)).size}
              </span>
            </div>
            <p className="text-sm text-slate-500">延べ作業員数</p>
          </div>
        </div>

        {isManager && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">月次締め処理</span>
            </div>
            <input
              type="month"
              value={lockMonth}
              onChange={e => { setLockMonth(e.target.value); setLockStatus(null) }}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {lockStatus?.locked ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  <Lock className="w-3.5 h-3.5" /> 締め済み
                </span>
                {lockStatus.lock?.lockedBy && (
                  <span className="text-xs text-slate-500">
                    {new Date(lockStatus.lock.lockedAt).toLocaleDateString('ja-JP')} に締め
                  </span>
                )}
                <button
                  onClick={handleUnlock}
                  disabled={lockLoading}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-500 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" /> 締め解除
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLockConfirm(true)}
                disabled={lockLoading || !lockMonth}
                className="flex items-center gap-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" /> 締め処理を実行
              </button>
            )}
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'records' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            入退場記録
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            統計
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'corrections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            申請管理
          </button>
        </div>

        {activeTab === 'records' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="作業員名・会社で検索"
                  value={searchWorker}
                  onChange={e => setSearchWorker(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全案件</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {filterProject && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-slate-500">選択中の案件のQRコード:</span>
                  <button
                    onClick={() => openQrModal(filterProject)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <QrCode className="w-4 h-4" />
                    {selectedProject?.name} のQRを表示
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">入退場記録 ({filtered.length}件)</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={exportMonth}
                    onChange={e => setExportMonth(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Excel出力の対象月"
                  />
                  <a
                    href={`/api/export/attendance/xlsx?month=${exportMonth}${filterProject ? `&projectId=${filterProject}` : ''}`}
                    download
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" /> Excel出力
                  </a>
                  <button
                    onClick={() => openQrModal()}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <QrCode className="w-4 h-4" /> QRコード生成
                  </button>
                  <a
                    href="/api/export/attendance"
                    download
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" /> CSV出力
                  </a>
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    記録追加
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">読み込み中...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500">入退場記録がありません</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">作業日</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">作業員名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">所属会社</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">入場</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">退場</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">勤務時間</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">残業時間</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">作業内容</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(a => (
                        <tr key={a.id} className={`hover:bg-slate-50 ${a.isLocked ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {a.isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                              {new Date(a.workDate).toLocaleDateString('ja-JP')}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <div className="text-xs text-slate-500">{a.project.projectNumber}</div>
                            <div className="truncate max-w-[160px]">{a.project.name}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{a.workerName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{a.company || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {a.entryTime ? (
                              <span className="flex items-center gap-1 text-green-700">
                                <LogIn className="w-3 h-3" /> {a.entryTime}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {a.exitTime ? (
                              <span className="flex items-center gap-1 text-red-600">
                                <LogOut className="w-3 h-3" /> {a.exitTime}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {a.workingHours != null ? `${a.workingHours}h` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {a.overtimeHours != null && a.overtimeHours > 0 ? (
                              <span className="text-orange-600 font-medium">{a.overtimeHours}h</span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                            {a.workContent || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {a.isLocked ? (
                                <span className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> 締め済み</span>
                              ) : (
                                <>
                                  <Link
                                    href={`/attendance/id-card?workerName=${encodeURIComponent(a.workerName)}&company=${encodeURIComponent(a.company || '')}`}
                                    className="text-xs text-purple-600 hover:text-purple-800 border border-purple-300 hover:border-purple-500 px-2 py-0.5 rounded font-medium whitespace-nowrap flex items-center gap-1"
                                    title="ID証印刷"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <CreditCard className="w-3 h-3" /> ID証
                                  </Link>
                                  <button
                                    onClick={() => openCorrectionModal(a)}
                                    className="text-xs text-amber-600 hover:text-amber-800 border border-amber-300 hover:border-amber-500 px-2 py-0.5 rounded font-medium whitespace-nowrap"
                                  >
                                    修正申請
                                  </button>
                                  <button onClick={() => openEdit(a)} className="text-slate-400 hover:text-blue-600">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button onClick={() => handleDelete(a.id, a.workerName, a.isLocked)} className="text-slate-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">月</label>
                  <input
                    type="month"
                    value={statsMonth}
                    onChange={e => setStatsMonth(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">案件（任意）</label>
                  <select
                    value={statsProjectId}
                    onChange={e => setStatsProjectId(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全案件</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={fetchStats}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  集計する
                </button>
              </div>
            </div>

            {statsLoading ? (
              <div className="p-8 text-center text-slate-500">集計中...</div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">延べ人工数</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalWorkerDays}<span className="text-sm font-normal text-slate-500 ml-1">人日</span></p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">平均日別人数</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.avgDailyHeadcount}<span className="text-sm font-normal text-slate-500 ml-1">人</span></p>
                    <p className="text-xs text-slate-400 mt-1">稼働日数: {stats.workingDays}日</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">総勤務時間</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalHours}<span className="text-sm font-normal text-slate-500 ml-1">h</span></p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">残業時間合計</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.overtimeHours}<span className="text-sm font-normal text-orange-400 ml-1">h</span></p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-600" />
                    稼働上位5名
                  </h3>
                  {stats.top5Workers.length === 0 ? (
                    <p className="text-sm text-slate-500">データがありません</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.top5Workers.map((w, i) => (
                        <div key={w.workerName} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate">{w.workerName}</span>
                              {w.company && <span className="text-xs text-slate-400">{w.company}</span>}
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (w.days / (stats.top5Workers[0]?.days || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{w.days}日</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">作業員別集計</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">作業員名</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">所属会社</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">稼働日数</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">総勤務時間</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">残業時間</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.workerSummary.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">データがありません</td>
                          </tr>
                        ) : (
                          stats.workerSummary.map(w => (
                            <tr key={w.workerName} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{w.workerName}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{w.company || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 text-right">{w.days}日</td>
                              <td className="px-4 py-3 text-sm text-slate-900 text-right">{w.totalHours}h</td>
                              <td className="px-4 py-3 text-sm text-right">
                                {w.overtimeHours > 0 ? (
                                  <span className="text-orange-600 font-medium">{w.overtimeHours}h</span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500">「集計する」を押して統計を表示します</div>
            )}
          </div>
        )}

        {activeTab === 'corrections' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-3 items-center">
              <label className="text-sm text-slate-600">ステータス:</label>
              <select
                value={correctionFilter}
                onChange={e => setCorrectionFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全て</option>
                <option value="申請中">申請中</option>
                <option value="承認">承認</option>
                <option value="却下">却下</option>
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">修正申請一覧</h3>
              </div>
              {correctionsLoading ? (
                <div className="p-8 text-center text-slate-500">読み込み中...</div>
              ) : corrections.length === 0 ? (
                <div className="p-8 text-center text-slate-500">修正申請はありません</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">申請日</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">作業員</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">作業日</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">現在の打刻</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">申請内容</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">理由</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {corrections.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                            {c.attendance.workerName}
                            {c.attendance.company && <div className="text-xs text-slate-400">{c.attendance.company}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[120px]">
                            <div className="text-xs text-slate-400">{c.attendance.project.projectNumber}</div>
                            <div className="truncate">{c.attendance.project.name}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(c.attendance.workDate).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            <div className="text-green-700">{c.attendance.entryTime || '-'}</div>
                            <div className="text-red-600">{c.attendance.exitTime || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {c.requestedCheckIn && <div className="text-green-700">入: {c.requestedCheckIn}</div>}
                            {c.requestedCheckOut && <div className="text-red-600">退: {c.requestedCheckOut}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[160px]">
                            <div className="truncate" title={c.reason}>{c.reason}</div>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {statusBadge(c.status)}
                            {c.reviewedBy && <div className="text-xs text-slate-400 mt-1">{c.reviewedBy}</div>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {c.status === '申請中' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleReviewCorrection(c.id, '承認')}
                                  className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 border border-green-300 hover:border-green-500 px-2 py-1 rounded font-medium"
                                >
                                  <CheckCircle className="w-3 h-3" />承認
                                </button>
                                <button
                                  onClick={() => handleReviewCorrection(c.id, '却下')}
                                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 border border-red-300 hover:border-red-500 px-2 py-1 rounded font-medium"
                                >
                                  <XCircle className="w-3 h-3" />却下
                                </button>
                              </div>
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
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editing ? '入退場記録を編集' : '入退場記録を追加'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件 <span className="text-red-500">*</span></label>
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作業員名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.workerName}
                    onChange={e => setForm(f => ({ ...f, workerName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="氏名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所属会社</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="会社名"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">作業日 <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.workDate}
                  onChange={e => setForm(f => ({ ...f, workDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">入場時刻</label>
                  <input
                    type="time"
                    value={form.entryTime}
                    onChange={e => setForm(f => ({ ...f, entryTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">退場時刻</label>
                  <input
                    type="time"
                    value={form.exitTime}
                    onChange={e => setForm(f => ({ ...f, exitTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {computedWorkingHours != null && (
                <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
                  勤務時間: <span className="font-semibold">{computedWorkingHours}時間</span>（自動計算）
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">残業時間（時間）</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.overtimeHours}
                  onChange={e => setForm(f => ({ ...f, overtimeHours: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">作業内容</label>
                <input
                  type="text"
                  value={form.workContent}
                  onChange={e => setForm(f => ({ ...f, workContent: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="当日の作業内容"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.projectId || !form.workerName || !form.workDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectionModal && correctionTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">打刻修正申請</h3>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1">
                <div><span className="font-medium">作業員:</span> {correctionTarget.workerName}</div>
                <div><span className="font-medium">作業日:</span> {new Date(correctionTarget.workDate).toLocaleDateString('ja-JP')}</div>
                <div><span className="font-medium">現在の入場:</span> {correctionTarget.entryTime || '-'}</div>
                <div><span className="font-medium">現在の退場:</span> {correctionTarget.exitTime || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">修正後の入場時刻</label>
                  <input
                    type="time"
                    value={correctionForm.requestedCheckIn}
                    onChange={e => setCorrectionForm(f => ({ ...f, requestedCheckIn: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">修正後の退場時刻</label>
                  <input
                    type="time"
                    value={correctionForm.requestedCheckOut}
                    onChange={e => setCorrectionForm(f => ({ ...f, requestedCheckOut: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">修正理由 <span className="text-red-500">*</span></label>
                <textarea
                  value={correctionForm.reason}
                  onChange={e => setCorrectionForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="修正が必要な理由を記入してください"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowCorrectionModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                キャンセル
              </button>
              <button
                onClick={handleSubmitCorrection}
                disabled={correctionSaving || !correctionForm.reason}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {correctionSaving ? '申請中...' : '申請する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">入退場QRコード</h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              {qrLoading ? (
                <div className="text-slate-500 text-sm py-8">QRコードを生成中...</div>
              ) : qrDataUrl ? (
                <>
                  <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 border border-slate-200 rounded-lg" />
                  <p className="text-xs text-slate-500 text-center break-all">{qrCheckInUrl}</p>
                  <p className="text-sm text-slate-600 text-center">
                    作業員はこのQRコードをスマートフォンで読み取り、入退場を記録できます。
                  </p>
                  <a
                    href={qrDataUrl}
                    download="attendance-qr.png"
                    className="w-full text-center py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                  >
                    画像をダウンロード
                  </a>
                </>
              ) : (
                <div className="text-red-500 text-sm py-8">QRコードの生成に失敗しました</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Lock className="w-4 h-4 text-orange-600" /> 月次締め処理</h3>
              <button onClick={() => setShowLockConfirm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-700"><span className="font-semibold">{lockMonth}</span> の勤怠を締め処理します。</p>
              <p className="text-sm text-slate-600">締め処理後、この月の入退場記録は編集・削除できなくなります。</p>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">締め解除はマネージャーが行えます。</p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowLockConfirm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">キャンセル</button>
              <button
                onClick={handleLock}
                disabled={lockLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {lockLoading ? '処理中...' : '締め処理を実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
