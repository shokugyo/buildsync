'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Header from '@/components/Header'
import { formatDate, getStatusColor } from '@/lib/utils'
import { Plus, Edit2, Trash2, X, ChevronRight, ChevronDown, Printer, Download, Copy, Bell, Layers } from 'lucide-react'
import Link from 'next/link'

// ========== WBS型定義 ==========
interface WBSNode {
  id: string
  name: string
  type: 'project' | 'category' | 'task'
  children?: WBSNode[]
  item?: ScheduleItem
  totalTasks?: number
  completedTasks?: number
  wbsCode?: string
}

// ========== 日本の祝日 ==========
const JP_HOLIDAYS: string[] = [
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05','2025-05-06',
  '2025-07-21','2025-08-11','2025-09-15','2025-09-23','2025-10-13',
  '2025-11-03','2025-11-23','2025-11-24','2025-12-23',
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
  '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
]

interface ScheduleItem {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  status: string
  category?: string | null
  notes?: string | null
  project: { id: string; name: string; projectNumber: string }
  assignee?: { id: string; name: string; company?: { id: string; name: string } | null } | null
}

interface ScheduleDependency {
  id: string
  scheduleId: string
  predecessorId: string
  predecessor: { id: string; name: string; startDate: string; endDate: string; status: string }
}

interface Group {
  key: string
  tasks: ScheduleItem[]
}

const SCHEDULE_STATUSES = ['未着手', '作業中', '完了', '延期', '中止', '要確認']

const CONSTRUCTION_CATEGORIES = [
  '地業工事', '基礎工事', '仮設工事', 'ガス工事', '木工事', '形鋼工事',
  '電気工事', '雑工事', '屋根工事', '仕上工事', '給水工事', '外壁工事',
  '塗装工事', '家具工事', '内装工事', '外構工事', '左官工事', 'タイル工事',
  '検査', 'その他',
]

const DAY_WIDTH = 20
const ROW_HEIGHT = 32
const CATEGORY_ROW_HEIGHT = 28
const LEFT_W = 200
const HEADER_ROWS = 4
const HEADER_HEIGHT = HEADER_ROWS * 24
const TOTAL_DAYS = 120

const TIMELINE_DAYS = 90
const TIMELINE_DAY_W = 24

function getTimelineBarColor(status: string): string {
  if (status === '完了') return '#22c55e'
  if (status === '作業中') return '#3b82f6'
  if (status === '延期') return '#f97316'
  if (status === '中止') return '#ef4444'
  if (status === '要確認') return '#eab308'
  return '#94a3b8'
}

function TimelineView({
  schedules,
  today,
  timelineStart,
}: {
  schedules: ScheduleItem[]
  today: Date
  timelineStart: Date
}) {
  const days: Date[] = []
  for (let i = 0; i < TIMELINE_DAYS; i++) {
    days.push(addDays(timelineStart, i))
  }

  const weekLabels: { label: string; left: number; width: number }[] = []
  let wi = 0
  while (wi < TIMELINE_DAYS) {
    const d = days[wi]
    const dow = d.getDay()
    const remaining = 7 - dow
    const span = Math.min(remaining, TIMELINE_DAYS - wi)
    weekLabels.push({
      label: `${d.getMonth() + 1}/${d.getDate()}週`,
      left: wi * TIMELINE_DAY_W,
      width: span * TIMELINE_DAY_W,
    })
    wi += span
  }

  const todayLeft = Math.floor((today.getTime() - timelineStart.getTime()) / 86400000) * TIMELINE_DAY_W
  const totalWidth = TIMELINE_DAYS * TIMELINE_DAY_W
  const LEFT_PANEL = 200

  return (
    <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white">
      <div style={{ display: 'flex', minHeight: '100%' }}>
        <div style={{ width: LEFT_PANEL, minWidth: LEFT_PANEL, flexShrink: 0, borderRight: '2px solid #cbd5e1' }}>
          <div style={{ height: 32, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} />
          {schedules.map((s) => (
            <div
              key={s.id}
              style={{
                height: 36,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 8px',
              }}
            >
              <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.project.projectNumber}
              </span>
              <span style={{ fontSize: 12, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.name}>
                {s.name}
              </span>
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto', flex: 1 }}>
          <div style={{ width: totalWidth, position: 'relative' }}>
            <div style={{ height: 32, borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'relative' }}>
              {weekLabels.map((wl, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: wl.left,
                    width: wl.width,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#64748b',
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600,
                  }}
                >
                  {wl.label}
                </div>
              ))}
              {todayLeft >= 0 && todayLeft < totalWidth && (
                <div
                  style={{
                    position: 'absolute',
                    left: todayLeft,
                    top: 0,
                    width: 2,
                    height: 32,
                    background: '#ef4444',
                    zIndex: 10,
                  }}
                />
              )}
            </div>

            <div style={{ position: 'relative' }}>
              {todayLeft >= 0 && todayLeft < totalWidth && (
                <div
                  style={{
                    position: 'absolute',
                    left: todayLeft,
                    top: 0,
                    width: 2,
                    height: schedules.length * 36,
                    background: 'rgba(239, 68, 68, 0.3)',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {schedules.map((s) => {
                const start = startOfDay(new Date(s.startDate))
                const end = startOfDay(new Date(s.endDate))
                const barLeft = Math.floor((start.getTime() - timelineStart.getTime()) / 86400000) * TIMELINE_DAY_W
                const barWidth = Math.max(TIMELINE_DAY_W, Math.ceil((end.getTime() - start.getTime()) / 86400000 + 1) * TIMELINE_DAY_W)
                const inView = barLeft + barWidth >= 0 && barLeft < totalWidth
                return (
                  <div
                    key={s.id}
                    style={{
                      height: 36,
                      borderBottom: '1px solid #f1f5f9',
                      position: 'relative',
                      background: '#fff',
                    }}
                  >
                    {inView && (
                      <div
                        style={{
                          position: 'absolute',
                          left: Math.max(0, barLeft),
                          width: barWidth - Math.max(0, -barLeft),
                          top: 8,
                          height: 20,
                          background: getTimelineBarColor(s.status),
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 4,
                          overflow: 'hidden',
                          zIndex: 5,
                        }}
                        title={`${s.name} (${s.startDate.split('T')[0]} ~ ${s.endDate.split('T')[0]})`}
                      >
                        <span style={{ fontSize: 9, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.name}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ROKUYO = ['先勝', '友引', '先負', '仏滅', '大安', '赤口']
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function getRokuyo(date: Date): string {
  return ROKUYO[(date.getMonth() + 1 + date.getDate()) % 6]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getBarLeft(date: Date, viewStart: Date): number {
  return Math.floor((date.getTime() - viewStart.getTime()) / 86400000) * DAY_WIDTH
}

function getBarWidth(startDate: Date, endDate: Date): number {
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1)
  return days * DAY_WIDTH
}

function computeCriticalPath(schedules: ScheduleItem[], deps: ScheduleDependency[]): Set<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 後続タスクを持つタスクIDのセット（predecessorId として登録されているもの）
  const hasDependents = new Set(deps.map((d) => d.predecessorId))

  const critical = new Set<string>()
  for (const s of schedules) {
    const endDate = new Date(s.endDate)
    endDate.setHours(0, 0, 0, 0)
    // 遅延中（今日より前に終了予定で未完了）かつ後続タスクがある
    if (endDate < today && s.status !== '完了' && hasDependents.has(s.id)) {
      critical.add(s.id)
    }
  }
  return critical
}

function isDelayed(s: ScheduleItem, today: Date): boolean {
  const endDate = new Date(s.endDate)
  endDate.setHours(0, 0, 0, 0)
  return endDate < today && s.status !== '完了'
}

function getDelayDays(s: ScheduleItem, today: Date): number {
  const endDate = new Date(s.endDate)
  endDate.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - endDate.getTime()) / 86400000)
}

const defaultForm = {
  projectId: '',
  name: '',
  startDate: '',
  endDate: '',
  progress: '0',
  status: '未着手',
  notes: '',
  assigneeId: '',
  category: '',
  customCategory: '',
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'gantt' | 'list' | 'timeline' | 'wbs' | 'calendar' | 'supplier' | 'today'>('gantt')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth())
  const [projects, setProjects] = useState<{ id: string; name: string; projectNumber: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [masterCategories, setMasterCategories] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ScheduleItem | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [filterProjectId, setFilterProjectId] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copySourceProjectId, setCopySourceProjectId] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateTab, setTemplateTab] = useState<'template' | 'project'>('template')
  const [scheduleTemplates, setScheduleTemplates] = useState<{ id: string; name: string; workType?: string | null; scheduleTemplates: { id: string; name: string; offsetDays: number; durationDays: number; category?: string | null }[] }[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateSourceProjectId, setTemplateSourceProjectId] = useState('')
  const [templateSourceSchedules, setTemplateSourceSchedules] = useState<ScheduleItem[]>([])
  const [templateAdding, setTemplateAdding] = useState(false)
  const [templateMessage, setTemplateMessage] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [dependencies, setDependencies] = useState<ScheduleDependency[]>([])
  const [newPredecessorId, setNewPredecessorId] = useState('')
  const [depLoading, setDepLoading] = useState(false)
  const [filterAssigneeId, setFilterAssigneeId] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [allDeps, setAllDeps] = useState<ScheduleDependency[]>([])
  const dragRef = useRef<{ taskId: string; origStart: Date; origEnd: Date; startX: number } | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragDayDelta, setDragDayDelta] = useState(0)

  const criticalIds = useMemo(() => computeCriticalPath(schedules, allDeps), [schedules, allDeps])

  const today = startOfDay(new Date())
  const [viewStart, setViewStart] = useState<Date>(() => addDays(today, -14))
  const [timelineStart, setTimelineStart] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - 1)
    return startOfDay(d)
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      setDragDayDelta(Math.round(dx / DAY_WIDTH))
    }
    const handleMouseUp = async (e: MouseEvent) => {
      if (!dragRef.current) return
      const { taskId, origStart, origEnd } = dragRef.current
      const dx = e.clientX - dragRef.current.startX
      const dayDelta = Math.round(dx / DAY_WIDTH)
      dragRef.current = null
      setDragTaskId(null)
      setDragDayDelta(0)
      if (dayDelta === 0) return
      const fmt = (d: Date) => d.toISOString().split('T')[0]
      const newStart = addDays(origStart, dayDelta)
      const newEnd = addDays(origEnd, dayDelta)
      const res = await fetch(`/api/schedules/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: fmt(newStart), endDate: fmt(newEnd) }),
      })
      if (res.ok) {
        const saved = await res.json()
        setSchedules((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const fetchSchedules = useCallback(() => {
    fetch('/api/schedules')
      .then((r) => r.json())
      .then((s) => setSchedules(Array.isArray(s) ? s : []))
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/schedules').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/master?type=schedule_category').then((r) => r.json()),
      fetch('/api/schedules/dependencies').then((r) => r.json()),
    ]).then(([s, p, u, m, d]) => {
      setSchedules(Array.isArray(s) ? s : [])
      setProjects(Array.isArray(p) ? p : [])
      setUsers(Array.isArray(u) ? u : [])
      setMasterCategories(Array.isArray(m) ? m.map((item: any) => item.label) : [])
      setAllDeps(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  const scrollToToday = useCallback(() => {
    const newStart = addDays(today, -14)
    setViewStart(newStart)
    setTimeout(() => {
      if (scrollRef.current) {
        const todayOffset = Math.floor((today.getTime() - newStart.getTime()) / 86400000) * DAY_WIDTH
        scrollRef.current.scrollLeft = Math.max(0, todayOffset - 100)
      }
    }, 50)
  }, [today])

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setDependencies([])
    setNewPredecessorId('')
    setShowModal(true)
  }

  const openEdit = (s: ScheduleItem) => {
    setEditTarget(s)
    const cat = s.category || ''
    const isPreset = CONSTRUCTION_CATEGORIES.includes(cat)
    setForm({
      projectId: s.project.id,
      name: s.name,
      startDate: s.startDate.split('T')[0],
      endDate: s.endDate.split('T')[0],
      progress: String(s.progress),
      status: s.status,
      notes: s.notes || '',
      assigneeId: s.assignee?.id || '',
      category: isPreset ? cat : (cat ? 'custom' : ''),
      customCategory: isPreset ? '' : cat,
    })
    setDependencies([])
    setNewPredecessorId('')
    setDepLoading(true)
    fetch(`/api/schedules/${s.id}/dependencies`)
      .then((r) => r.json())
      .then((d) => setDependencies(Array.isArray(d) ? d : []))
      .finally(() => setDepLoading(false))
    setShowModal(true)
  }

  const handleAddPredecessor = async () => {
    if (!editTarget || !newPredecessorId) return
    const res = await fetch(`/api/schedules/${editTarget.id}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predecessorId: newPredecessorId }),
    })
    if (res.ok) {
      const dep = await res.json()
      setDependencies((prev) => [...prev, dep])
      setNewPredecessorId('')
    }
  }

  const handleRemovePredecessor = async (predecessorId: string) => {
    if (!editTarget) return
    const res = await fetch(`/api/schedules/${editTarget.id}/dependencies`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predecessorId }),
    })
    if (res.ok) {
      setDependencies((prev) => prev.filter((d) => d.predecessorId !== predecessorId))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const resolvedCategory =
        form.category === 'custom' ? form.customCategory :
        form.category === '' ? null :
        form.category
      const payload = {
        ...form,
        progress: Number(form.progress),
        category: resolvedCategory || null,
        assigneeId: form.assigneeId || null,
      }
      const url = editTarget ? `/api/schedules/${editTarget.id}` : '/api/schedules'
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editTarget) {
          setSchedules((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))
        } else {
          setSchedules((prev) => [...prev, saved])
        }
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSendNotification = async () => {
    if (!filterProjectId) return
    setSendingNotif(true)
    try {
      await fetch('/api/schedules/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: filterProjectId }),
      })
      alert('工程変更通知を関係者へ送信しました')
    } finally {
      setSendingNotif(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この工程を削除しますか？')) return
    const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
    if (res.ok) setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const handleCopySchedules = async () => {
    if (!copySourceProjectId || !filterProjectId) return
    if (!confirm(`選択した案件の工程を現在の案件にコピーしますか？`)) return
    const res = await fetch('/api/schedules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceProjectId: copySourceProjectId, targetProjectId: filterProjectId }),
    })
    if (res.ok) {
      setShowCopyModal(false)
      fetchSchedules()
    }
  }

  const openTemplateModal = () => {
    setTemplateTab('template')
    setSelectedTemplateId('')
    setTemplateSourceProjectId('')
    setTemplateSourceSchedules([])
    setTemplateMessage('')
    if (scheduleTemplates.length === 0) {
      fetch('/api/schedule-templates').then(r => r.json()).then(d => {
        setScheduleTemplates(Array.isArray(d) ? d : [])
      })
    }
    setShowTemplateModal(true)
  }

  const handleTemplateProjectChange = async (projectId: string) => {
    setTemplateSourceProjectId(projectId)
    setTemplateSourceSchedules([])
    if (!projectId) return
    const data = await fetch('/api/schedules').then(r => r.json())
    const allSchedules: ScheduleItem[] = Array.isArray(data) ? data : []
    setTemplateSourceSchedules(allSchedules.filter(s => s.project.id === projectId))
  }

  const handleAddFromTemplate = async () => {
    if (!filterProjectId) {
      alert('まず案件を選択してください（右上の案件フィルタ）')
      return
    }
    if (templateTab === 'template' && !selectedTemplateId) return
    if (templateTab === 'project' && !templateSourceProjectId) return

    setTemplateAdding(true)
    setTemplateMessage('')
    try {
      const body = templateTab === 'template'
        ? { templateId: selectedTemplateId, targetProjectId: filterProjectId }
        : { sourceProjectId: templateSourceProjectId, targetProjectId: filterProjectId }
      const res = await fetch('/api/schedules/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setTemplateMessage(`${data.created}件の工程を追加しました`)
        fetchSchedules()
        setTimeout(() => {
          setShowTemplateModal(false)
          setTemplateMessage('')
        }, 1500)
      }
    } finally {
      setTemplateAdding(false)
    }
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter and group
  const filteredSchedules = schedules
    .filter((s) => !filterProjectId || s.project.id === filterProjectId)
    .filter((s) => !filterAssigneeId || s.assignee?.id === filterAssigneeId)
    .filter((s) => !filterCategory || s.category === filterCategory)
    .filter((s) => !filterStatus || s.status === filterStatus)

  const groupsMap = new Map<string, ScheduleItem[]>()
  for (const s of filteredSchedules) {
    const key = s.category || `${s.project.projectNumber} - ${s.project.name}`
    if (!groupsMap.has(key)) groupsMap.set(key, [])
    groupsMap.get(key)!.push(s)
  }
  const groups: Group[] = Array.from(groupsMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .map(([key, tasks]) => ({ key, tasks }))

  // Build days array
  const days: Date[] = []
  for (let i = 0; i < TOTAL_DAYS; i++) {
    days.push(addDays(viewStart, i))
  }

  // Group days by month for header
  const monthGroups: { label: string; count: number }[] = []
  let currentMonth = ''
  let currentCount = 0
  for (const d of days) {
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    if (label !== currentMonth) {
      if (currentMonth) monthGroups.push({ label: currentMonth, count: currentCount })
      currentMonth = label
      currentCount = 1
    } else {
      currentCount++
    }
  }
  if (currentMonth) monthGroups.push({ label: currentMonth, count: currentCount })

  const todayOffset = Math.floor((today.getTime() - viewStart.getTime()) / 86400000) * DAY_WIDTH
  const showTodayLine = todayOffset >= 0 && todayOffset < TOTAL_DAYS * DAY_WIDTH

  // Calculate total chart height for today line
  const totalRows = groups.reduce((acc, g) => {
    const collapsed = collapsedGroups.has(g.key)
    return acc + 1 + (collapsed ? 0 : g.tasks.length)
  }, 0)
  const chartHeight = HEADER_HEIGHT + groups.length * CATEGORY_ROW_HEIGHT + (totalRows - groups.length) * ROW_HEIGHT

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="工程管理" />
      <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 pb-2">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          {/* View tabs */}
          <div className="flex items-center border-b border-slate-200">
            <button
              onClick={() => setView('gantt')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                view === 'gantt'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              バーチャート
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                view === 'list'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              リスト
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                view === 'timeline'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              タイムライン
            </button>
            <button
              onClick={() => setView('supplier')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                view === 'supplier'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              協力会社別
            </button>
            <button
              onClick={() => setView('today')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                view === 'today'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              本日作業
            </button>
            <button
              onClick={() => setView('wbs')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                view === 'wbs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              WBS
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                view === 'calendar'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              カレンダー
            </button>
          </div>

          <div className="flex items-center gap-2">
            {view === 'gantt' && (
              <>
                <button
                  onClick={() => setViewStart((d) => addDays(d, -14))}
                  className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                >
                  ◀
                </button>
                <button
                  onClick={scrollToToday}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 font-medium"
                >
                  今日
                </button>
                <button
                  onClick={() => setViewStart((d) => addDays(d, 14))}
                  className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                >
                  ▶
                </button>
              </>
            )}
            {view === 'timeline' && (
              <>
                <button
                  onClick={() => setTimelineStart(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                >
                  前月
                </button>
                <button
                  onClick={() => setTimelineStart(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                >
                  次月
                </button>
              </>
            )}
            {view === 'calendar' && (
              <>
                <button
                  onClick={() => {
                    if (calendarMonth === 0) { setCalendarYear(y => y - 1); setCalendarMonth(11) }
                    else setCalendarMonth(m => m - 1)
                  }}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                >
                  前月
                </button>
                <button
                  onClick={() => { setCalendarYear(new Date().getFullYear()); setCalendarMonth(new Date().getMonth()) }}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 font-medium"
                >
                  今月
                </button>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) { setCalendarYear(y => y + 1); setCalendarMonth(0) }
                    else setCalendarMonth(m => m + 1)
                  }}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                >
                  次月
                </button>
                <span className="text-sm font-semibold text-slate-700 ml-1">
                  {calendarYear}年{calendarMonth + 1}月
                </span>
              </>
            )}
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての案件</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectNumber} - {p.name}
                </option>
              ))}
            </select>
            <select
              value={filterAssigneeId}
              onChange={(e) => setFilterAssigneeId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">担当者: すべて</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">工種: すべて</option>
              {Array.from(new Set([...CONSTRUCTION_CATEGORIES, ...masterCategories])).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">状態: すべて</option>
              {SCHEDULE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Link
              href={`/schedule/print${filterProjectId ? `?projectId=${filterProjectId}` : ''}`}
              target="_blank"
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> ガントチャート印刷
            </Link>
            <Link
              href={`/schedule/print?ownerView=1${filterProjectId ? `&projectId=${filterProjectId}` : ''}`}
              target="_blank"
              className="flex items-center gap-1.5 bg-white border border-green-300 hover:bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> 施主用印刷
            </Link>
            <a
              href={`/api/export/schedules${filterProjectId ? `?projectId=${filterProjectId}` : ''}`}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> CSV出力
            </a>
            <a
              href={`/api/export/schedules/xlsx${filterProjectId ? `?projectId=${filterProjectId}` : ''}`}
              download
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Excel出力
            </a>
            <a
              href={`/api/calendar/export${filterProjectId ? `?projectId=${filterProjectId}` : ''}`}
              download="buildsync.ics"
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> カレンダーエクスポート
            </a>
            {filterProjectId && (
              <>
                <button
                  onClick={handleSendNotification}
                  disabled={sendingNotif}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" /> {sendingNotif ? '送信中...' : '通知送信'}
                </button>
                <button
                  onClick={() => setShowCopyModal(true)}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <Copy className="w-4 h-4" /> 工程コピー
                </button>
              </>
            )}
            <button
              onClick={openTemplateModal}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Layers className="w-4 h-4" /> テンプレートから追加
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> 工程を追加
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : view === 'timeline' ? (
          <TimelineView schedules={filteredSchedules} today={today} timelineStart={timelineStart} />
        ) : view === 'list' ? (
          /* ---- LIST VIEW ---- */
          <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">工程名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">工種</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">開始日</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">終了日</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">担当者</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">進捗</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">状態</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-500">{s.project.projectNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.category || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(s.startDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(s.endDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{s.assignee?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`rounded-full h-1.5 ${s.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${s.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 w-8">{s.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1 text-slate-400 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : view === 'supplier' ? (
          /* ---- 協力会社別 VIEW ---- */
          <div className="flex-1 overflow-auto">
            {(() => {
              const supplierMap = new Map<string, ScheduleItem[]>()
              for (const s of filteredSchedules) {
                const key = s.assignee?.company?.name || s.assignee?.name || '担当未設定'
                if (!supplierMap.has(key)) supplierMap.set(key, [])
                supplierMap.get(key)!.push(s)
              }
              const supplierGroups = Array.from(supplierMap.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ja'))
              return supplierGroups.length === 0 ? (
                <div className="text-center text-slate-400 p-12">工程がありません</div>
              ) : (
                <div className="space-y-4">
                  {supplierGroups.map(([companyName, tasks]) => (
                    <div key={companyName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700">{companyName}</h3>
                        <span className="text-xs text-slate-400">{tasks.length}件</span>
                      </div>
                      <table className="w-full">
                        <tbody className="divide-y divide-slate-100">
                          {tasks.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-xs text-slate-400 w-24">{s.project.projectNumber}</td>
                              <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{s.name}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-500">{s.category || '-'}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(s.startDate)} 〜 {formatDate(s.endDate)}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-500">{s.assignee?.name || '-'}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>{s.status}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2 w-24">
                                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                    <div className={`rounded-full h-1.5 ${s.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${s.progress}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-500 w-7">{s.progress}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEdit(s)} className="p-1 text-slate-300 hover:text-blue-500"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDelete(s.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        ) : view === 'today' ? (
          /* ---- 本日作業 VIEW ---- */
          <div className="flex-1 overflow-auto">
            {(() => {
              const todayStr = today.toISOString().split('T')[0]
              const todayTasks = filteredSchedules.filter(s => {
                const start = s.startDate.split('T')[0]
                const end = s.endDate.split('T')[0]
                return start <= todayStr && end >= todayStr
              })
              return todayTasks.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
                  <p className="text-slate-400 text-sm">本日の作業工程はありません</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-800">本日の作業</span>
                    <span className="text-xs text-blue-500">{today.toLocaleDateString('ja-JP')}</span>
                    <span className="ml-auto text-xs text-blue-500">{todayTasks.length}件</span>
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">案件</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">工程名</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">工種</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">担当者</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">会社</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">進捗</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">状態</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {todayTasks.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-xs text-slate-500">{s.project.projectNumber}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{s.category || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-700">{s.assignee?.name || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{s.assignee?.company?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 w-24">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                <div className={`rounded-full h-1.5 ${s.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${s.progress}%` }} />
                              </div>
                              <span className="text-xs text-slate-500 w-7">{s.progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>{s.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(s)} className="p-1 text-slate-300 hover:text-blue-500"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDelete(s.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        ) : view === 'wbs' ? (
          /* ---- WBS VIEW ---- */
          (() => {
            // プロジェクト → カテゴリ → タスクのツリーを構築
            const projectMap = new Map<string, { proj: ScheduleItem['project']; catMap: Map<string, ScheduleItem[]> }>()
            for (const s of filteredSchedules) {
              if (!projectMap.has(s.project.id)) {
                projectMap.set(s.project.id, { proj: s.project, catMap: new Map() })
              }
              const catKey = s.category || '未分類'
              const { catMap } = projectMap.get(s.project.id)!
              if (!catMap.has(catKey)) catMap.set(catKey, [])
              catMap.get(catKey)!.push(s)
            }

            const wbsTree: WBSNode[] = Array.from(projectMap.entries()).map(([projId, { proj, catMap }], pi) => {
              const catNodes: WBSNode[] = Array.from(catMap.entries()).map(([cat, tasks], ci) => {
                const taskNodes: WBSNode[] = tasks.map((t, ti) => ({
                  id: t.id,
                  name: t.name,
                  type: 'task' as const,
                  item: t,
                  wbsCode: `${pi + 1}.${ci + 1}.${ti + 1}`,
                }))
                return {
                  id: `${projId}__${cat}`,
                  name: cat,
                  type: 'category' as const,
                  children: taskNodes,
                  totalTasks: tasks.length,
                  completedTasks: tasks.filter(t => t.status === '完了').length,
                }
              })
              return {
                id: projId,
                name: proj.name,
                type: 'project' as const,
                children: catNodes,
                totalTasks: Array.from(catMap.values()).flat().length,
                completedTasks: Array.from(catMap.values()).flat().filter(t => t.status === '完了').length,
              }
            })

            const toggleNode = (id: string) => {
              setExpandedNodes(prev => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }

            return (
              <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-100">
                {wbsTree.length === 0 ? (
                  <div className="text-center text-slate-400 p-12">工程がありません</div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase w-8">WBS</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">工程名</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase w-28">開始日</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase w-28">終了日</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase w-32">進捗</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase w-24">担当者</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase w-20">状態</th>
                        <th className="px-3 py-2 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {wbsTree.map((projNode, pi) => {
                        const projExpanded = expandedNodes.has(projNode.id)
                        return [
                          // プロジェクト行
                          <tr key={projNode.id} className="bg-slate-100 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => toggleNode(projNode.id)}>
                            <td className="px-3 py-2 text-xs text-slate-500 font-mono">{pi + 1}</td>
                            <td className="px-3 py-2" colSpan={5}>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">{projExpanded ? '▼' : '▶'}</span>
                                <span className="font-bold text-sm text-slate-800">{projNode.name}</span>
                                <span className="text-xs text-slate-400 ml-1">({(projNode.children?.[0]?.item?.project?.projectNumber) ?? ''})</span>
                                <span className="ml-auto text-xs text-slate-500">{projNode.completedTasks}/{projNode.totalTasks}件完了</span>
                              </div>
                            </td>
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2" />
                          </tr>,
                          // カテゴリ行・タスク行
                          ...(projExpanded ? (projNode.children ?? []).map((catNode, ci) => {
                            const catExpanded = expandedNodes.has(catNode.id)
                            return [
                              <tr key={catNode.id} className="bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100" onClick={() => toggleNode(catNode.id)}>
                                <td className="px-3 py-2 text-xs text-slate-400 font-mono pl-6">{pi + 1}.{ci + 1}</td>
                                <td className="px-3 py-2 pl-8" colSpan={5}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-xs">{catExpanded ? '▼' : '▶'}</span>
                                    <span className="font-medium text-sm text-slate-700">{catNode.name}</span>
                                    <span className="ml-auto text-xs text-slate-400">{catNode.completedTasks}/{catNode.totalTasks}件</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2" />
                                <td className="px-3 py-2" />
                              </tr>,
                              ...(catExpanded ? (catNode.children ?? []).map((taskNode, ti) => {
                                const t = taskNode.item!
                                return (
                                  <tr key={taskNode.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                                    <td className="px-3 py-2 text-xs text-slate-300 font-mono pl-10">{pi + 1}.{ci + 1}.{ti + 1}</td>
                                    <td className="px-3 py-2 pl-12 text-sm text-slate-800">{t.name}</td>
                                    <td className="px-3 py-2 text-xs text-slate-500">{t.startDate.split('T')[0]}</td>
                                    <td className="px-3 py-2 text-xs text-slate-500">{t.endDate.split('T')[0]}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                          <div className={`rounded-full h-1.5 ${t.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${t.progress}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-500 w-7 text-right">{t.progress}%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600">{t.assignee?.name || '-'}</td>
                                    <td className="px-3 py-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(t.status)}`}>{t.status}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                                        <button onClick={() => openEdit(t)} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDelete(t.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              }) : []),
                            ]
                          }).flat() : []),
                        ]
                      }).flat()}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })()
        ) : view === 'calendar' ? (
          /* ---- カレンダー VIEW ---- */
          (() => {
            const firstDay = new Date(calendarYear, calendarMonth, 1)
            const lastDay = new Date(calendarYear, calendarMonth + 1, 0)
            const startDow = firstDay.getDay() // 0=日
            const totalDays = lastDay.getDate()

            // 当月の工程を取得
            const monthStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`
            const monthSchedules = filteredSchedules.filter(s => {
              const start = s.startDate.split('T')[0]
              const end = s.endDate.split('T')[0]
              return start.startsWith(monthStr) || end.startsWith(monthStr) ||
                (start <= `${monthStr}-01` && end >= lastDay.toISOString().split('T')[0])
            })

            // カレンダーセルを生成（6週 × 7日）
            const cells: (number | null)[] = []
            for (let i = 0; i < startDow; i++) cells.push(null)
            for (let d = 1; d <= totalDays; d++) cells.push(d)
            while (cells.length % 7 !== 0) cells.push(null)
            const weeks: (number | null)[][] = []
            for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

            const todayStr2 = new Date().toISOString().split('T')[0]

            const getCalBadgeColor = (status: string) => {
              if (status === '完了') return 'bg-green-100 text-green-800'
              if (status === '作業中') return 'bg-blue-100 text-blue-800'
              if (status === '延期') return 'bg-orange-100 text-orange-800'
              if (status === '中止') return 'bg-red-100 text-red-800'
              if (status === '要確認') return 'bg-yellow-100 text-yellow-800'
              return 'bg-slate-100 text-slate-600'
            }

            return (
              <div className="flex-1 overflow-auto">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 border-b border-slate-200">
                    {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
                      <div key={w} className={`py-2 text-center text-xs font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>{w}</div>
                    ))}
                  </div>
                  {/* 週行 */}
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 border-b border-slate-100" style={{ minHeight: 100 }}>
                      {week.map((day, di) => {
                        if (day === null) {
                          return <div key={di} className="bg-slate-50 border-r border-slate-100 last:border-r-0" />
                        }
                        const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const isToday2 = dateStr === todayStr2
                        const isHoliday = JP_HOLIDAYS.includes(dateStr)
                        const isSun = di === 0
                        const isSat = di === 6

                        // この日に開始・終了する工程
                        const startTasks = monthSchedules.filter(s => s.startDate.split('T')[0] === dateStr)
                        const endTasks = monthSchedules.filter(s => s.endDate.split('T')[0] === dateStr && s.startDate.split('T')[0] !== dateStr)

                        let cellBg = 'bg-white'
                        if (isSun || isHoliday) cellBg = 'bg-red-50'
                        else if (isSat) cellBg = 'bg-blue-50'

                        return (
                          <div key={di} className={`${cellBg} border-r border-slate-100 last:border-r-0 p-1 relative`} style={{ minHeight: 100 }}>
                            <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday2 ? 'bg-blue-600 text-white' : isSun || isHoliday ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-slate-700'}`}>
                              {day}
                            </div>
                            <div className="space-y-0.5">
                              {startTasks.map(s => (
                                <button
                                  key={`start-${s.id}`}
                                  onClick={() => openEdit(s)}
                                  className={`w-full text-left text-xs px-1 py-0.5 rounded truncate ${getCalBadgeColor(s.status)}`}
                                  title={`開始: ${s.name}`}
                                >
                                  ▶ {s.name}
                                </button>
                              ))}
                              {endTasks.map(s => (
                                <button
                                  key={`end-${s.id}`}
                                  onClick={() => openEdit(s)}
                                  className={`w-full text-left text-xs px-1 py-0.5 rounded truncate ${getCalBadgeColor(s.status)} opacity-80`}
                                  title={`終了: ${s.name}`}
                                >
                                  ■ {s.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()
        ) : (
          /* ---- GANTT VIEW ---- */
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white"
            style={{ position: 'relative' }}
          >
            <div
              style={{
                width: LEFT_W + TOTAL_DAYS * DAY_WIDTH,
                minHeight: chartHeight,
                position: 'relative',
              }}
            >
              {/* ===== HEADER (sticky top) ===== */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  display: 'flex',
                  width: LEFT_W + TOTAL_DAYS * DAY_WIDTH,
                }}
              >
                {/* Top-left corner (sticky both) */}
                <div
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 40,
                    width: LEFT_W,
                    minWidth: LEFT_W,
                    flexShrink: 0,
                    background: '#f8fafc',
                    borderRight: '2px solid #cbd5e1',
                    borderBottom: '1px solid #e2e8f0',
                    height: HEADER_HEIGHT,
                  }}
                />

                {/* Calendar header columns */}
                <div style={{ flex: 1, position: 'relative', height: HEADER_HEIGHT, background: '#f8fafc' }}>
                  {/* Row 1: Month labels */}
                  <div style={{ display: 'flex', height: 24, borderBottom: '1px solid #e2e8f0' }}>
                    {monthGroups.map((mg, i) => (
                      <div
                        key={i}
                        style={{
                          width: mg.count * DAY_WIDTH,
                          minWidth: mg.count * DAY_WIDTH,
                          borderRight: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#475569',
                          background: '#f1f5f9',
                          flexShrink: 0,
                        }}
                      >
                        {mg.label}
                      </div>
                    ))}
                  </div>

                  {/* Row 2: Date numbers */}
                  <div style={{ display: 'flex', height: 24, borderBottom: '1px solid #e2e8f0' }}>
                    {days.map((d, i) => {
                      const isToday = d.getTime() === today.getTime()
                      return (
                        <div
                          key={i}
                          style={{
                            width: DAY_WIDTH,
                            minWidth: DAY_WIDTH,
                            borderRight: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: isToday ? 700 : 400,
                            color: isToday ? '#ea580c' : '#64748b',
                            background: isToday ? '#fff7ed' : d.getDay() === 0 ? '#fef2f2' : d.getDay() === 6 ? '#eff6ff' : '#f8fafc',
                            flexShrink: 0,
                          }}
                        >
                          {d.getDate()}
                        </div>
                      )
                    })}
                  </div>

                  {/* Row 3: Weekday */}
                  <div style={{ display: 'flex', height: 24, borderBottom: '1px solid #e2e8f0' }}>
                    {days.map((d, i) => {
                      const isToday = d.getTime() === today.getTime()
                      const dow = d.getDay()
                      return (
                        <div
                          key={i}
                          style={{
                            width: DAY_WIDTH,
                            minWidth: DAY_WIDTH,
                            borderRight: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            color: isToday ? '#ea580c' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#64748b',
                            fontWeight: isToday ? 700 : 400,
                            background: isToday ? '#fff7ed' : dow === 0 ? '#fef2f2' : dow === 6 ? '#eff6ff' : '#f8fafc',
                            flexShrink: 0,
                          }}
                        >
                          {WEEKDAYS[dow]}
                        </div>
                      )
                    })}
                  </div>

                  {/* Row 4: Rokuyo */}
                  <div style={{ display: 'flex', height: 24, borderBottom: '1px solid #cbd5e1' }}>
                    {days.map((d, i) => {
                      const isToday = d.getTime() === today.getTime()
                      const rk = getRokuyo(d)
                      const dow = d.getDay()
                      return (
                        <div
                          key={i}
                          style={{
                            width: DAY_WIDTH,
                            minWidth: DAY_WIDTH,
                            borderRight: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            color: rk === '大安' ? '#16a34a' : rk === '仏滅' ? '#f87171' : isToday ? '#ea580c' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#94a3b8',
                            background: isToday ? '#fff7ed' : dow === 0 ? '#fef2f2' : dow === 6 ? '#eff6ff' : '#f8fafc',
                            flexShrink: 0,
                          }}
                        >
                          {rk}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ===== TODAY LINE ===== */}
              {showTodayLine && (
                <div
                  style={{
                    position: 'absolute',
                    top: HEADER_HEIGHT,
                    left: LEFT_W + todayOffset + DAY_WIDTH / 2,
                    width: 2,
                    height: chartHeight - HEADER_HEIGHT,
                    background: 'rgba(234, 88, 12, 0.45)',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* ===== SVG DEPENDENCY ARROWS OVERLAY ===== */}
              {(() => {
                // タスクIDからY座標を計算するマップを構築
                const taskRowY = new Map<string, number>()
                let y = HEADER_HEIGHT
                for (const group of groups) {
                  y += CATEGORY_ROW_HEIGHT
                  const collapsed = collapsedGroups.has(group.key)
                  if (!collapsed) {
                    for (const task of group.tasks) {
                      taskRowY.set(task.id, y + ROW_HEIGHT / 2)
                      y += ROW_HEIGHT
                    }
                  }
                }

                // タスクIDから開始/終了日を引くマップ
                const taskMap = new Map<string, ScheduleItem>()
                for (const s of schedules) taskMap.set(s.id, s)

                const arrows: { x1: number; y1: number; x2: number; y2: number; critical: boolean }[] = []
                for (const dep of allDeps) {
                  const pred = taskMap.get(dep.predecessorId)
                  const succ = taskMap.get(dep.scheduleId)
                  if (!pred || !succ) continue
                  const predY = taskRowY.get(dep.predecessorId)
                  const succY = taskRowY.get(dep.scheduleId)
                  if (predY === undefined || succY === undefined) continue

                  const predEnd = startOfDay(new Date(pred.endDate))
                  const succStart = startOfDay(new Date(succ.startDate))

                  const x1 = LEFT_W + getBarLeft(predEnd, viewStart) + getBarWidth(startOfDay(new Date(pred.startDate)), predEnd)
                  const x2 = LEFT_W + getBarLeft(succStart, viewStart)

                  const isCrit = criticalIds.has(dep.predecessorId)
                  arrows.push({ x1, y1: predY, x2, y2: succY, critical: isCrit })
                }

                if (arrows.length === 0) return null

                return (
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: LEFT_W + TOTAL_DAYS * DAY_WIDTH,
                      height: chartHeight,
                      pointerEvents: 'none',
                      zIndex: 15,
                      overflow: 'visible',
                    }}
                  >
                    <defs>
                      <marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill="#cbd5e1" />
                      </marker>
                      <marker id="arrow-critical" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
                      </marker>
                    </defs>
                    {arrows.map((a, i) => {
                      const midX = (a.x1 + a.x2) / 2
                      const color = a.critical ? '#ef4444' : '#cbd5e1'
                      const markerId = a.critical ? 'arrow-critical' : 'arrow-normal'
                      return (
                        <path
                          key={i}
                          d={`M ${a.x1} ${a.y1} C ${midX} ${a.y1}, ${midX} ${a.y2}, ${a.x2} ${a.y2}`}
                          stroke={color}
                          strokeWidth={a.critical ? 2 : 1.5}
                          fill="none"
                          markerEnd={`url(#${markerId})`}
                          strokeDasharray={a.critical ? undefined : '4 2'}
                          opacity={0.85}
                        />
                      )
                    })}
                  </svg>
                )
              })()}

              {/* ===== ROWS ===== */}
              <div style={{ position: 'relative', marginTop: 0 }}>
                {groups.map((group) => {
                  const collapsed = collapsedGroups.has(group.key)
                  return (
                    <div key={group.key}>
                      {/* Category header row */}
                      <div
                        style={{
                          display: 'flex',
                          height: CATEGORY_ROW_HEIGHT,
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {/* Left panel - sticky */}
                        <div
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            width: LEFT_W,
                            minWidth: LEFT_W,
                            background: '#f1f5f9',
                            borderRight: '2px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 8,
                            paddingRight: 8,
                            gap: 4,
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                          onClick={() => toggleGroup(group.key)}
                        >
                          {collapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          )}
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#334155',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {group.key}
                          </span>
                          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto', flexShrink: 0 }}>
                            {group.tasks.length}
                          </span>
                        </div>

                        {/* Right panel - category row background */}
                        <div style={{ flex: 1, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', height: '100%' }}>
                            {days.map((d, i) => {
                              const dow = d.getDay()
                              return (
                                <div
                                  key={i}
                                  style={{
                                    width: DAY_WIDTH,
                                    minWidth: DAY_WIDTH,
                                    borderRight: '1px solid #f1f5f9',
                                    background: dow === 0 ? '#fef2f2' : dow === 6 ? '#eff6ff' : '#f8fafc',
                                    flexShrink: 0,
                                  }}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Task rows */}
                      {!collapsed &&
                        group.tasks.map((task) => {
                          const taskStart = startOfDay(new Date(task.startDate))
                          const taskEnd = startOfDay(new Date(task.endDate))
                          const barLeft = getBarLeft(taskStart, viewStart)
                          const barWidth = getBarWidth(taskStart, taskEnd)
                          const inView = barLeft + barWidth >= 0 && barLeft < TOTAL_DAYS * DAY_WIDTH

                          return (
                            <div
                              key={task.id}
                              style={{
                                display: 'flex',
                                height: ROW_HEIGHT,
                                borderBottom: '1px solid #f1f5f9',
                              }}
                              className="group/row"
                            >
                              {/* Left panel - task name */}
                              <div
                                style={{
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 10,
                                  width: LEFT_W,
                                  minWidth: LEFT_W,
                                  background: '#fff',
                                  borderRight: '2px solid #cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  paddingLeft: 20,
                                  paddingRight: 4,
                                  gap: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: '#334155',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                  }}
                                  title={task.name}
                                >
                                  {task.name}
                                </span>
                                <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 flex-shrink-0">
                                  <button
                                    onClick={() => openEdit(task)}
                                    className="p-0.5 text-slate-400 hover:text-blue-600"
                                    title="編集"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-0.5 text-slate-400 hover:text-red-600"
                                    title="削除"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Right panel - bar */}
                              <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
                                {/* Column backgrounds */}
                                <div style={{ display: 'flex', height: '100%', position: 'absolute', left: 0, top: 0 }}>
                                  {days.map((d, i) => {
                                    const dow = d.getDay()
                                    return (
                                      <div
                                        key={i}
                                        style={{
                                          width: DAY_WIDTH,
                                          minWidth: DAY_WIDTH,
                                          borderRight: '1px solid #f8fafc',
                                          background: dow === 0 ? '#fef9f9' : dow === 6 ? '#f5f9ff' : '#fff',
                                          flexShrink: 0,
                                        }}
                                      />
                                    )
                                  })}
                                </div>

                                {/* Gantt bar */}
                                {inView && (() => {
                                  const delayed = isDelayed(task, today)
                                  const isCritical = criticalIds.has(task.id)
                                  const delayDays = delayed ? getDelayDays(task, today) : 0
                                  const isDragging = dragTaskId === task.id
                                  let barBg = isDragging ? '#f59e0b' : '#fbbf24'
                                  if (delayed) barBg = isDragging ? '#dc2626' : '#ef4444'
                                  const titleText = delayed
                                    ? `${task.name} (${task.startDate.split('T')[0]} ~ ${task.endDate.split('T')[0]}) ⚠ 遅延: ${delayDays}日 — ドラッグで日程変更`
                                    : `${task.name} (${task.startDate.split('T')[0]} ~ ${task.endDate.split('T')[0]}) — ドラッグで日程変更`
                                  return (
                                    <div
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        dragRef.current = {
                                          taskId: task.id,
                                          origStart: taskStart,
                                          origEnd: taskEnd,
                                          startX: e.clientX,
                                        }
                                        setDragTaskId(task.id)
                                        setDragDayDelta(0)
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        left: barLeft + (isDragging ? dragDayDelta * DAY_WIDTH : 0),
                                        width: barWidth,
                                        height: 18,
                                        background: barBg,
                                        borderRadius: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        paddingLeft: 4,
                                        paddingRight: 4,
                                        overflow: 'hidden',
                                        zIndex: isDragging ? 20 : 5,
                                        cursor: 'grab',
                                        userSelect: 'none',
                                        boxShadow: isDragging
                                          ? '0 2px 8px rgba(0,0,0,0.25)'
                                          : isCritical
                                          ? '0 0 0 2px #ef4444'
                                          : delayed
                                          ? '0 0 0 1.5px #b91c1c'
                                          : undefined,
                                        outline: isCritical ? '2px solid #ef4444' : undefined,
                                      }}
                                      title={titleText}
                                    >
                                      {delayed && (
                                        <span style={{ fontSize: 9, marginRight: 2, flexShrink: 0 }}>⚠</span>
                                      )}
                                      <span
                                        style={{
                                          fontSize: 9,
                                          color: '#fff',
                                          fontWeight: 600,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {task.name}
                                      </span>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )
                })}

                {groups.length === 0 && (
                  <div
                    style={{
                      display: 'flex',
                      height: LEFT_W,
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: 14,
                    }}
                  >
                    工程データがありません
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">テンプレートから工程を追加</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-5">
              <button
                onClick={() => setTemplateTab('template')}
                className={`py-2.5 px-3 text-sm font-medium border-b-2 -mb-px transition-colors ${templateTab === 'template' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                テンプレートから
              </button>
              <button
                onClick={() => setTemplateTab('project')}
                className={`py-2.5 px-3 text-sm font-medium border-b-2 -mb-px transition-colors ${templateTab === 'project' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                他案件から複製
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {templateTab === 'template' ? (
                <div className="space-y-3">
                  {scheduleTemplates.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      工程テンプレートが登録されていません。<br />
                      設定 &gt; 工程マスタ から登録できます。
                    </div>
                  ) : (
                    scheduleTemplates.map((tmpl) => (
                      <label
                        key={tmpl.id}
                        className={`block border rounded-lg p-3 cursor-pointer transition-colors ${selectedTemplateId === tmpl.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={tmpl.id}
                          checked={selectedTemplateId === tmpl.id}
                          onChange={() => setSelectedTemplateId(tmpl.id)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-slate-900">{tmpl.name}</span>
                          <span className="text-xs text-slate-400">{tmpl.scheduleTemplates.length}工程</span>
                        </div>
                        {tmpl.workType && <span className="text-xs text-slate-500">{tmpl.workType}</span>}
                        {tmpl.scheduleTemplates.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {tmpl.scheduleTemplates.slice(0, 5).map((st) => (
                              <li key={st.id} className="text-xs text-slate-500 flex gap-2">
                                <span className="text-slate-400 w-16 shrink-0">+{st.offsetDays}日目</span>
                                <span className="truncate">{st.name}</span>
                                <span className="text-slate-400 shrink-0">{st.durationDays}日</span>
                              </li>
                            ))}
                            {tmpl.scheduleTemplates.length > 5 && (
                              <li className="text-xs text-slate-400">他 {tmpl.scheduleTemplates.length - 5} 件...</li>
                            )}
                          </ul>
                        )}
                      </label>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">複製元の案件</label>
                    <select
                      value={templateSourceProjectId}
                      onChange={(e) => handleTemplateProjectChange(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">案件を選択...</option>
                      {projects.filter(p => p.id !== filterProjectId).map(p => (
                        <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  {templateSourceProjectId && (
                    <div>
                      {templateSourceSchedules.length === 0 ? (
                        <p className="text-sm text-slate-400">この案件に工程はありません</p>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500 mb-2">{templateSourceSchedules.length}件の工程が複製されます（日付は今日起算でオフセット）</p>
                          <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                            {templateSourceSchedules.map(s => (
                              <li key={s.id} className="px-3 py-2 text-xs flex items-center gap-2">
                                <span className="text-slate-400 w-20 shrink-0">{s.startDate.split('T')[0]}</span>
                                <span className="flex-1 truncate text-slate-700">{s.name}</span>
                                <span className="text-slate-400 shrink-0">{s.category || ''}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                {!filterProjectId && (
                  <p className="text-xs text-amber-600">※ 追加先の案件を右上のフィルタで選択してください</p>
                )}
                {templateMessage && (
                  <p className="text-xs text-green-600">{templateMessage}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddFromTemplate}
                  disabled={
                    templateAdding ||
                    !filterProjectId ||
                    (templateTab === 'template' && !selectedTemplateId) ||
                    (templateTab === 'project' && (!templateSourceProjectId || templateSourceSchedules.length === 0))
                  }
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
                >
                  {templateAdding ? '追加中...' : 'この工程セットを追加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96">
            <h3 className="text-base font-semibold mb-4">他の案件から工程をコピー</h3>
            <p className="text-sm text-slate-600 mb-3">コピー元の案件を選択してください。既存の工程は削除されません。</p>
            <select
              value={copySourceProjectId}
              onChange={e => setCopySourceProjectId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="">案件を選択...</option>
              {projects.filter(p => p.id !== filterProjectId).map(p => (
                <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCopyModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">キャンセル</button>
              <button onClick={handleCopySchedules} disabled={!copySourceProjectId} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">コピー</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{editTarget ? '工程を編集' : '工程を追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">工程名 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">工種・カテゴリ</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value, customCategory: '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {Array.from(new Set([...CONSTRUCTION_CATEGORIES, ...masterCategories])).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="custom">その他（入力）</option>
                </select>
                {form.category === 'custom' && (
                  <input
                    type="text"
                    value={form.customCategory}
                    onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    placeholder="カテゴリ名を入力"
                    className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始日 *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">終了日 *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                <select
                  value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">進捗 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(e) => setForm({ ...form, progress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SCHEDULE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Predecessor Dependencies - only shown when editing */}
              {editTarget && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">前工程（依存タスク）</label>
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                    {depLoading ? (
                      <p className="text-xs text-slate-400">読み込み中...</p>
                    ) : dependencies.length === 0 ? (
                      <p className="text-xs text-slate-400">前工程が設定されていません</p>
                    ) : (
                      <ul className="space-y-1">
                        {dependencies.map((dep) => (
                          <li key={dep.predecessorId} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1">
                            <span className="text-slate-700 truncate">
                              {dep.predecessor.name}
                              <span className="text-xs text-slate-400 ml-2">
                                {dep.predecessor.startDate.split('T')[0]} 〜 {dep.predecessor.endDate.split('T')[0]}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePredecessor(dep.predecessorId)}
                              className="ml-2 text-slate-400 hover:text-red-600 flex-shrink-0"
                              title="削除"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        value={newPredecessorId}
                        onChange={(e) => setNewPredecessorId(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">前工程を選択...</option>
                        {schedules
                          .filter(
                            (s) =>
                              s.project.id === form.projectId &&
                              s.id !== editTarget.id &&
                              !dependencies.some((d) => d.predecessorId === s.id)
                          )
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddPredecessor}
                        disabled={!newPredecessorId}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white text-sm rounded"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {saving ? '保存中...' : editTarget ? '更新する' : '追加する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
