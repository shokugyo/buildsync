'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Calendar, Flag, ChevronDown, RefreshCw } from 'lucide-react'

type Task = {
  id: string
  title: string
  description?: string
  projectId?: string
  project?: { id: string; name: string; projectNumber: string }
  assignedTo?: string
  assignee?: { id: string; name: string; avatarPath?: string }
  createdBy: string
  creator: { id: string; name: string }
  dueDate?: string
  priority: string
  status: string
  companyId: string
  createdAt: string
  completedAt?: string
  isRecurring?: boolean
  recurringPattern?: string
  recurringEndDate?: string
}

type Project = { id: string; name: string; projectNumber: string }
type User = { id: string; name: string }

const STATUSES = ['未着手', '進行中', '完了']
const PRIORITIES = ['低', '中', '高', '緊急']

const priorityColor: Record<string, string> = {
  低: 'bg-slate-100 text-slate-600',
  中: 'bg-blue-100 text-blue-700',
  高: 'bg-orange-100 text-orange-700',
  緊急: 'bg-red-100 text-red-700',
}

const statusBg: Record<string, string> = {
  未着手: 'bg-slate-50 border-slate-200',
  進行中: 'bg-blue-50 border-blue-200',
  完了: 'bg-green-50 border-green-200',
}

const statusHeader: Record<string, string> = {
  未着手: 'text-slate-700',
  進行中: 'text-blue-700',
  完了: 'text-green-700',
}

function Avatar({ name, avatarPath }: { name: string; avatarPath?: string }) {
  if (avatarPath) {
    return <img src={avatarPath} alt={name} className="w-6 h-6 rounded-full object-cover" />
  }
  return (
    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {name.charAt(0)}
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [filterProject, setFilterProject] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalStatus, setModalStatus] = useState('未着手')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: '',
    dueDate: '',
    priority: '中',
    status: '未着手',
    isRecurring: false,
    recurringFrequency: 'daily',
    recurringDayOfWeek: 1,
    recurringDayOfMonth: 1,
    recurringEndDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/projects?limit=200').then(r => r.json()).catch(() => []),
      fetch('/api/users').then(r => r.json()).catch(() => []),
    ]).then(([t, p, u]) => {
      setTasks(Array.isArray(t) ? t : [])
      setProjects(Array.isArray(p) ? p : (p?.projects ?? []))
      setUsers(Array.isArray(u) ? u : [])
      setLoading(false)
    })
  }, [])

  const openAddModal = (status: string) => {
    setEditingTask(null)
    setModalStatus(status)
    setForm({ title: '', description: '', projectId: '', assignedTo: '', dueDate: '', priority: '中', status, isRecurring: false, recurringFrequency: 'daily', recurringDayOfWeek: 1, recurringDayOfMonth: 1, recurringEndDate: '' })
    setShowModal(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setModalStatus(task.status)
    let recurringFrequency = 'daily'
    let recurringDayOfWeek = 1
    let recurringDayOfMonth = 1
    if (task.recurringPattern) {
      try {
        const p = JSON.parse(task.recurringPattern)
        recurringFrequency = p.frequency || 'daily'
        recurringDayOfWeek = p.dayOfWeek ?? 1
        recurringDayOfMonth = p.dayOfMonth ?? 1
      } catch {}
    }
    setForm({
      title: task.title,
      description: task.description || '',
      projectId: task.projectId || '',
      assignedTo: task.assignedTo || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      priority: task.priority,
      status: task.status,
      isRecurring: task.isRecurring || false,
      recurringFrequency,
      recurringDayOfWeek,
      recurringDayOfMonth,
      recurringEndDate: task.recurringEndDate ? task.recurringEndDate.slice(0, 10) : '',
    })
    setDetailTask(null)
    setShowModal(true)
  }

  const buildPayload = () => {
    const payload: any = {
      title: form.title,
      description: form.description,
      projectId: form.projectId,
      assignedTo: form.assignedTo,
      dueDate: form.dueDate,
      priority: form.priority,
      status: form.status,
      isRecurring: form.isRecurring,
      recurringPattern: null as string | null,
      recurringEndDate: form.recurringEndDate || null,
    }
    if (form.isRecurring) {
      const pattern: any = { frequency: form.recurringFrequency }
      if (form.recurringFrequency === 'weekly') pattern.dayOfWeek = Number(form.recurringDayOfWeek)
      if (form.recurringFrequency === 'monthly') pattern.dayOfMonth = Number(form.recurringDayOfMonth)
      payload.recurringPattern = JSON.stringify(pattern)
    }
    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const updated = await res.json()
          setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t))
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          setTasks(prev => [created, ...prev])
        }
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (task: Task, newStatus: string) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    }
  }

  const handleDelete = async (task: Task) => {
    if (!confirm('このタスクを削除しますか？')) return
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== task.id))
      setDetailTask(null)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (filterProject && t.projectId !== filterProject) return false
    if (filterAssignee && t.assignedTo !== filterAssignee) return false
    return true
  })

  const tasksByStatus = (status: string) => filteredTasks.filter(t => t.status === status)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header title="タスク管理" />
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全案件</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全担当者</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <span className="text-sm text-slate-500 ml-auto">{filteredTasks.length} 件</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATUSES.map(status => (
            <div key={status} className={`rounded-xl border ${statusBg[status]} p-4 flex flex-col gap-3 min-h-[400px]`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className={`font-semibold text-sm ${statusHeader[status]}`}>
                  {status}
                  <span className="ml-2 bg-white rounded-full px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                    {tasksByStatus(status).length}
                  </span>
                </h2>
                <button
                  onClick={() => openAddModal(status)}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                  title="タスクを追加"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => openAddModal(status)}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                タスクを追加
              </button>

              <div className="flex flex-col gap-2">
                {tasksByStatus(status).map(task => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg shadow-sm border border-slate-100 p-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setDetailTask(task)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-800 leading-snug flex-1">{task.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.isRecurring && <span title="繰り返しタスク"><RefreshCw className="w-3 h-3 text-blue-400" /></span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColor[task.priority] || 'bg-slate-100 text-slate-600'}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    {task.project && (
                      <p className="text-xs text-slate-400 mb-1.5 truncate">{task.project.name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {task.dueDate ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        </div>
                      ) : <span />}
                      {task.assignee && (
                        <Avatar name={task.assignee.name} avatarPath={task.assignee.avatarPath} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{editingTask ? 'タスクを編集' : 'タスクを追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="タスク名を入力"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">優先度</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">案件</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">担当者</label>
                <select
                  value={form.assignedTo}
                  onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未割り当て</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">期日</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">繰り返し</span>
                </label>
                {form.isRecurring && (
                  <div className="mt-2 space-y-2 pl-6">
                    <select
                      value={form.recurringFrequency}
                      onChange={e => setForm(f => ({ ...f, recurringFrequency: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">毎日</option>
                      <option value="weekly">毎週</option>
                      <option value="monthly">毎月</option>
                    </select>
                    {form.recurringFrequency === 'weekly' && (
                      <select
                        value={form.recurringDayOfWeek}
                        onChange={e => setForm(f => ({ ...f, recurringDayOfWeek: Number(e.target.value) }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'].map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                    )}
                    {form.recurringFrequency === 'monthly' && (
                      <select
                        value={form.recurringDayOfMonth}
                        onChange={e => setForm(f => ({ ...f, recurringDayOfMonth: Number(e.target.value) }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}日</option>
                        ))}
                      </select>
                    )}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">終了日（任意）</label>
                      <input
                        type="date"
                        value={form.recurringEndDate}
                        onChange={e => setForm(f => ({ ...f, recurringEndDate: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : (editingTask ? '更新' : '作成')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 flex-1 pr-4">{detailTask.title}</h2>
              <button onClick={() => setDetailTask(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColor[detailTask.priority] || 'bg-slate-100 text-slate-600'}`}>
                  {detailTask.priority}
                </span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{detailTask.status}</span>
              </div>
              {detailTask.description && (
                <p className="text-sm text-slate-600">{detailTask.description}</p>
              )}
              {detailTask.project && (
                <p className="text-sm text-slate-600"><span className="font-medium">案件:</span> {detailTask.project.name}</p>
              )}
              {detailTask.assignee && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium">担当者:</span>
                  <Avatar name={detailTask.assignee.name} avatarPath={detailTask.assignee.avatarPath} />
                  <span>{detailTask.assignee.name}</span>
                </div>
              )}
              {detailTask.dueDate && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">期日:</span> {new Date(detailTask.dueDate).toLocaleDateString('ja-JP')}
                </p>
              )}
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">ステータスを変更</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={async () => {
                        await handleStatusChange(detailTask, s)
                        setDetailTask(prev => prev ? { ...prev, status: s } : null)
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        detailTask.status === s
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 pb-5 pt-1">
              <button
                onClick={() => handleDelete(detailTask)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                削除
              </button>
              <button
                onClick={() => openEditModal(detailTask)}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                編集
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
