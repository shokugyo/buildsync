'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency, getStatusColor, PROJECT_STATUSES } from '@/lib/utils'
import Header from '@/components/Header'
import { Plus, Search, Filter, Building2, Trash2, ExternalLink, Download, List, LayoutGrid, ChevronDown, FileText, HelpCircle, Upload, LayoutTemplate, X, Calendar, CheckSquare, Bookmark, Columns, ArrowRight, MapPin } from 'lucide-react'
import { useSavedFilters } from '@/hooks/useSavedFilters'

interface Project {
  id: string
  projectNumber: string
  name: string
  status: string
  customer?: { name: string } | null
  manager?: { id: string; name: string } | null
  company?: { name: string } | null
  contractAmount?: number | null
  startDate?: string | null
  deliveryDate?: string | null
  workType?: string | null
  propertyType?: string | null
  salesId?: string | null
  labels?: string | null
  address?: string | null
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="20,5 36,18 4,18" />
      <rect x="8" y="18" width="24" height="17" />
      <rect x="14" y="25" width="6" height="10" />
    </svg>
  )
}

function ApartmentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="20" width="30" height="15" />
      <line x1="5" y1="20" x2="35" y2="20" />
      <rect x="5" y="5" width="30" height="15" />
      <rect x="10" y="8" width="5" height="5" />
      <rect x="25" y="8" width="5" height="5" />
      <rect x="10" y="23" width="5" height="5" />
      <rect x="25" y="23" width="5" height="5" />
      <rect x="16" y="28" width="8" height="7" />
    </svg>
  )
}

function MansionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="3" width="20" height="34" />
      <line x1="10" y1="12" x2="30" y2="12" />
      <line x1="10" y1="21" x2="30" y2="21" />
      <line x1="10" y1="30" x2="30" y2="30" />
      <rect x="14" y="5" width="4" height="4" />
      <rect x="22" y="5" width="4" height="4" />
      <rect x="14" y="14" width="4" height="4" />
      <rect x="22" y="14" width="4" height="4" />
      <rect x="14" y="23" width="4" height="4" />
      <rect x="22" y="23" width="4" height="4" />
      <rect x="16" y="32" width="8" height="5" />
    </svg>
  )
}

function getBuildingIcon(workType?: string | null) {
  if (!workType) return HouseIcon
  if (workType.includes('マンション')) return MansionIcon
  if (workType.includes('アパート')) return ApartmentIcon
  return HouseIcon
}

const SCOPE_TABS = ['すべての案件', '担当案件'] as const

const KANBAN_STATUSES = ['引合', '商談中', '着工前', '施工中', '検査中', '是正中', '完工']

const KANBAN_STATUS_COLORS: Record<string, string> = {
  '引合': 'border-l-slate-400',
  '商談中': 'border-l-purple-400',
  '着工前': 'border-l-yellow-400',
  '施工中': 'border-l-blue-500',
  '検査中': 'border-l-orange-400',
  '是正中': 'border-l-red-400',
  '完工': 'border-l-green-500',
}

const KANBAN_COLUMN_BG: Record<string, string> = {
  '引合': 'bg-slate-50',
  '商談中': 'bg-purple-50',
  '着工前': 'bg-yellow-50',
  '施工中': 'bg-blue-50',
  '検査中': 'bg-orange-50',
  '是正中': 'bg-red-50',
  '完工': 'bg-green-50',
}

function KanbanBoard({
  projects,
  onMoveNext,
  onCardClick,
}: {
  projects: Project[]
  onMoveNext: (id: string, status: string) => void
  onCardClick: (id: string) => void
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {KANBAN_STATUSES.map((status) => {
        const cols = projects.filter(p => p.status === status)
        const isLast = status === KANBAN_STATUSES[KANBAN_STATUSES.length - 1]
        return (
          <div
            key={status}
            className={`flex-shrink-0 w-64 rounded-xl border border-slate-200 ${KANBAN_COLUMN_BG[status] || 'bg-slate-50'} flex flex-col`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-700">{status}</span>
              <span className="text-xs bg-white border border-slate-200 text-slate-600 rounded-full px-2 py-0.5 font-medium">
                {cols.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(100vh - 360px)' }}>
              {cols.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">案件なし</p>
              )}
              {cols.map(project => (
                <div
                  key={project.id}
                  className={`bg-white rounded-lg border border-slate-200 border-l-4 ${KANBAN_STATUS_COLORS[status] || 'border-l-slate-300'} p-3 cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => onCardClick(project.id)}
                >
                  <p className="text-sm font-semibold text-slate-900 leading-snug mb-1.5 line-clamp-2">{project.name}</p>
                  {project.customer?.name && (
                    <p className="text-xs text-slate-500 mb-0.5 truncate">{project.customer.name}</p>
                  )}
                  {project.manager?.name && (
                    <p className="text-xs text-slate-400 mb-1.5 truncate">担当: {project.manager.name}</p>
                  )}
                  {project.deliveryDate && (
                    <p className="text-xs text-slate-400 mb-1.5">工期: {formatDate(project.deliveryDate)}</p>
                  )}
                  {!isLast && (
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveNext(project.id, status) }}
                        className="flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded px-1.5 py-0.5 transition-colors"
                        title="次のステータスへ"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'panel' | 'board'>('list')
  const [scopeTab, setScopeTab] = useState<typeof SCOPE_TABS[number]>('すべての案件')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<string>('')
  const csvRef = useRef<HTMLInputElement>(null)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [customerFilter, setCustomerFilter] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState('')
  const [startDateFrom, setStartDateFrom] = useState('')
  const [startDateTo, setStartDateTo] = useState('')
  const [endDateFrom, setEndDateFrom] = useState('')
  const [endDateTo, setEndDateTo] = useState('')
  const [users, setUsers] = useState<{id: string; name: string}[]>([])
  const [customers, setCustomers] = useState<{id: string; name: string}[]>([])
  const [projectNumberFilter, setProjectNumberFilter] = useState('')
  const [salesFilter, setSalesFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [projectTemplates, setProjectTemplates] = useState<any[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const { presets, savePreset, deletePreset, applyPreset } = useSavedFilters('saved_filters_projects')

  useEffect(() => {
    const saved = localStorage.getItem('projects-view-mode')
    if (saved === 'panel' || saved === 'list' || saved === 'board') setViewMode(saved)
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      if (s?.user?.id) setCurrentUserId(s.user.id)
    })
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ]).then(([u, c]) => {
      setUsers(Array.isArray(u) ? u.map((usr: any) => ({ id: usr.id, name: usr.name })) : [])
      setCustomers(Array.isArray(c) ? c.map((cust: any) => ({ id: cust.id, name: cust.name })) : [])
    })
  }, [])

  const setView = (mode: 'list' | 'panel' | 'board') => {
    setViewMode(mode)
    localStorage.setItem('projects-view-mode', mode)
  }

  const handleMoveToNextStatus = async (projectId: string, currentStatus: string) => {
    const idx = PROJECT_STATUSES.indexOf(currentStatus)
    if (idx === -1 || idx >= PROJECT_STATUSES.length - 1) return
    const nextStatus = PROJECT_STATUSES[idx + 1]
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (res.ok) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: nextStatus } : p))
    }
  }

  const fetchProjects = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (customerFilter) params.set('customerId', customerFilter)
    if (managerFilter) params.set('managerId', managerFilter)
    if (salesFilter) params.set('salesId', salesFilter)
    if (workTypeFilter) params.set('workType', workTypeFilter)
    if (startDateFrom) params.set('startDateFrom', startDateFrom)
    if (startDateTo) params.set('startDateTo', startDateTo)
    if (endDateFrom) params.set('endDateFrom', endDateFrom)
    if (endDateTo) params.set('endDateTo', endDateTo)

    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, customerFilter, managerFilter, salesFilter, workTypeFilter, startDateFrom, startDateTo, endDateFrom, endDateTo])

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const filteredProjects = projects.filter(p => {
    if (scopeTab === '担当案件' && currentUserId && p.manager?.id !== currentUserId) return false
    if (projectNumberFilter && !p.projectNumber.toLowerCase().includes(projectNumberFilter.toLowerCase())) return false
    if (tagFilter && !(p.labels || '').toLowerCase().includes(tagFilter.toLowerCase())) return false
    return true
  })

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImporting(true)
    setCsvResult('')
    try {
      const text = await file.text()
      const res = await fetch('/api/import?type=projects', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      })
      const result = await res.json()
      if (res.ok) {
        setCsvResult(`取込完了: ${result.imported}件登録${result.skipped ? `、${result.skipped}件スキップ` : ''}${result.errors?.length ? `、${result.errors.length}件エラー` : ''}`)
        const refreshed = await fetch('/api/projects').then(r => r.json())
        setProjects(Array.isArray(refreshed) ? refreshed : [])
      } else {
        setCsvResult(result.error || '取込に失敗しました')
      }
    } finally {
      setCsvImporting(false)
      if (csvRef.current) csvRef.current.value = ''
    }
  }

  const openTemplateModal = async () => {
    setShowTemplateModal(true)
    if (projectTemplates.length === 0) {
      setTemplatesLoading(true)
      const data = await fetch('/api/project-templates').then(r => r.json())
      setProjectTemplates(Array.isArray(data) ? data : [])
      setTemplatesLoading(false)
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkStatus) return
    setBulkUpdating(true)
    await fetch('/api/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), status: bulkStatus }),
    })
    setSelectedIds(new Set())
    setBulkStatus('')
    setBulkUpdating(false)
    fetchProjects()
  }

  const handleBulkArchive = async () => {
    if (!confirm(`選択した${selectedIds.size}件の案件をアーカイブしますか？`)) return
    setBulkUpdating(true)
    await fetch('/api/projects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: 'archive' }),
    })
    setSelectedIds(new Set())
    setBulkUpdating(false)
    fetchProjects()
  }

  const hasActiveFilter = !!(search || statusFilter || customerFilter || managerFilter || salesFilter || workTypeFilter || startDateFrom || startDateTo || endDateFrom || endDateTo || projectNumberFilter || tagFilter)

  const handleSaveFilter = () => {
    const name = prompt('フィルタ名を入力してください')
    if (!name) return
    savePreset(name, {
      search, statusFilter, customerFilter, managerFilter, salesFilter,
      workTypeFilter, startDateFrom, startDateTo, endDateFrom, endDateTo,
      projectNumberFilter, tagFilter,
    })
  }

  const handleApplyPreset = (preset: ReturnType<typeof applyPreset>) => {
    setSearch(preset.search || '')
    setStatusFilter(preset.statusFilter || '')
    setCustomerFilter(preset.customerFilter || '')
    setManagerFilter(preset.managerFilter || '')
    setSalesFilter(preset.salesFilter || '')
    setWorkTypeFilter(preset.workTypeFilter || '')
    setStartDateFrom(preset.startDateFrom || '')
    setStartDateTo(preset.startDateTo || '')
    setEndDateFrom(preset.endDateFrom || '')
    setEndDateTo(preset.endDateTo || '')
    setProjectNumberFilter(preset.projectNumberFilter || '')
    setTagFilter(preset.tagFilter || '')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="案件管理" />
      <div className="p-6 flex-1">
        {/* Top action bar */}
        <div className="flex items-center gap-2 mb-5">
          <button className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            案件作成
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>
          <button
            onClick={openTemplateModal}
            className="flex items-center gap-1.5 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            テンプレートから作成
          </button>
          <button className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <FileText className="w-4 h-4" />
            報告
          </button>
          <button className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <HelpCircle className="w-4 h-4" />
            サポート
          </button>
          <div className="flex-1" />
          <button
            onClick={() => csvRef.current?.click()}
            disabled={csvImporting}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {csvImporting ? '取込中...' : 'CSV取込'}
          </button>
          <input ref={csvRef} type="file" accept=".csv,text/csv" onChange={handleCsvImport} className="hidden" />
          <a
            href="/api/export/projects"
            download
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV出力
          </a>
          <a
            href="/api/export/projects/xlsx"
            download
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel出力
          </a>
        </div>

        {csvResult && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${csvResult.includes('エラー') || csvResult.includes('失敗') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {csvResult}
            <button onClick={() => setCsvResult('')} className="ml-2 text-xs opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {statusFilter === 'アーカイブ' && (
          <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-2">
            <span className="font-medium">アーカイブ済み案件を表示中</span>
            <span className="text-purple-400">—</span>
            <span>通常の一覧には表示されない案件です</span>
          </div>
        )}

        {presets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-slate-500">保存済フィルタ:</span>
            {presets.map((preset) => (
              <span key={preset.name} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-0.5 text-xs">
                <button onClick={() => handleApplyPreset(applyPreset(preset))} className="hover:underline">{preset.name}</button>
                <button onClick={() => deletePreset(preset.name)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="案件名・番号で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">すべての状態</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="アーカイブ">アーカイブ</option>
            </select>
          </div>
          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('panel')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'panel' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              パネル
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="w-4 h-4" />
              リスト
            </button>
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${
                viewMode === 'board' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Columns className="w-4 h-4" />
              ボード
            </button>
          </div>
        </div>

        {/* 詳細フィルタ toggle */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <Filter className="w-3 h-3" />
            詳細フィルタ {showAdvancedFilter ? '▲' : '▼'}
          </button>
          {hasActiveFilter && (
            <button
              onClick={handleSaveFilter}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Bookmark className="w-3 h-3" />
              フィルタを保存
            </button>
          )}
        </div>

        {showAdvancedFilter && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs text-slate-500 mb-1">案件番号</label>
              <input
                type="text"
                placeholder="例：P-001"
                value={projectNumberFilter}
                onChange={e => setProjectNumberFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">営業担当</label>
              <select
                value={salesFilter}
                onChange={e => setSalesFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">タグ</label>
              <input
                type="text"
                placeholder="タグで絞り込み"
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">顧客</label>
              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべての顧客</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">現場監督</label>
              <select
                value={managerFilter}
                onChange={e => setManagerFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">工事種別</label>
              <select
                value={workTypeFilter}
                onChange={e => setWorkTypeFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {['新築', '改修', 'リフォーム', '修繕', 'その他'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">着工日（から）</label>
              <input type="date" value={startDateFrom} onChange={e => setStartDateFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">着工日（まで）</label>
              <input type="date" value={startDateTo} onChange={e => setStartDateTo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">完工予定日（から）</label>
              <input type="date" value={endDateFrom} onChange={e => setEndDateFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">完工予定日（まで）</label>
              <input type="date" value={endDateTo} onChange={e => setEndDateTo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setProjectNumberFilter(''); setSalesFilter(''); setTagFilter(''); setCustomerFilter(''); setManagerFilter(''); setWorkTypeFilter(''); setStartDateFrom(''); setStartDateTo(''); setEndDateFrom(''); setEndDateTo('') }}
                className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5 border border-slate-200 rounded-lg"
              >
                詳細条件クリア
              </button>
            </div>
          </div>
        )}

        {/* Scope tabs */}
        <div className="flex gap-0 border-b border-slate-200 mb-4">
          {SCOPE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setScopeTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                scopeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-500 mb-4">{filteredProjects.length}件</p>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-800">{selectedIds.size}件選択中</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="border border-blue-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ステータスを変更</option>
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={!bulkStatus || bulkUpdating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              {bulkUpdating ? '更新中...' : '一括更新'}
            </button>
            <button
              onClick={handleBulkArchive}
              disabled={bulkUpdating}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              選択した案件をアーカイブ
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              選択解除
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : viewMode === 'board' ? (
          <KanbanBoard
            projects={filteredProjects}
            onMoveNext={handleMoveToNextStatus}
            onCardClick={(id) => router.push(`/projects/${id}`)}
          />
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">案件が見つかりません</p>
          </div>
        ) : viewMode === 'panel' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => {
              const Icon = getBuildingIcon(project.workType)
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative"
                >
                  {/* Status badges */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    {project.workType && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                        {project.workType}
                      </span>
                    )}
                  </div>

                  {/* Icon + property type */}
                  <div className="mb-3 flex flex-col items-start">
                    <Icon className="w-12 h-12 text-blue-400 group-hover:text-blue-500 transition-colors" />
                    {project.propertyType && (
                      <span className="text-xs text-slate-500 mt-0.5">{project.propertyType}</span>
                    )}
                  </div>

                  {/* Company name */}
                  {project.company?.name && (
                    <p className="text-xs text-slate-400 mb-0.5 truncate">{project.company.name}</p>
                  )}

                  {/* Customer */}
                  {project.customer?.name && (
                    <p className="text-xs text-slate-400 mb-0.5 truncate">{project.customer.name}</p>
                  )}

                  {/* Project name */}
                  <p className="text-sm font-semibold text-slate-900 truncate leading-snug mb-2">
                    {project.name}
                  </p>

                  {/* Date range */}
                  <p className="text-xs text-slate-400">
                    {project.startDate ? formatDate(project.startDate) : '---'}
                    {' ～ '}
                    {project.deliveryDate ? formatDate(project.deliveryDate) : '---'}
                  </p>

                  {/* Map link */}
                  {(project.address || project.name) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address || project.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <MapPin className="w-3 h-3" /> 地図
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-3 py-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selectedIds.size === filteredProjects.length && filteredProjects.length > 0}
                        onChange={e => e.target.checked ? setSelectedIds(new Set(filteredProjects.map(p => p.id))) : setSelectedIds(new Set())}
                      />
                    </th>
                    <th className="px-3 py-3 text-left">案件名</th>
                    <th className="px-3 py-3 text-left">運営管理</th>
                    <th className="px-3 py-3 text-left">提示ランク</th>
                    <th className="px-3 py-3 text-left">住所</th>
                    <th className="px-3 py-3 text-left">元請名</th>
                    <th className="px-3 py-3 text-left">着工日</th>
                    <th className="px-3 py-3 text-left">完成日</th>
                    <th className="px-3 py-3 text-left">ラベル</th>
                    <th className="px-3 py-3 text-left">アラート</th>
                    <th className="px-3 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={selectedIds.has(project.id)}
                          onChange={e => {
                            const next = new Set(selectedIds)
                            e.target.checked ? next.add(project.id) : next.delete(project.id)
                            setSelectedIds(next)
                          }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-blue-600 hover:text-blue-700 line-clamp-1">{project.name}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getStatusColor(project.status)}`}>{project.status}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{project.workType || '-'}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">-</td>
                      <td className="px-3 py-3 text-xs text-slate-600 max-w-[160px]">
                        <span className="truncate block">{project.address || '-'}</span>
                        {(project.address || project.name) && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address || project.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline mt-0.5"
                          >
                            <MapPin className="w-3 h-3" /> 地図
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-900">{project.company?.name || project.customer?.name || '-'}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{formatDate(project.startDate)}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{formatDate(project.deliveryDate)}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">-</td>
                      <td className="px-3 py-3 text-xs text-slate-500">-</td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => handleDelete(e, project.id, project.name)} className="p-1 text-slate-300 hover:text-red-500 rounded" title="削除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-3 px-6">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mb-1">
          <a href="#" className="hover:text-slate-600">BUILDSYNCガイド</a>
          <a href="#" className="hover:text-slate-600">プライバシーポリシー</a>
          <a href="#" className="hover:text-slate-600">BUILDSYNCからのお知らせ</a>
        </div>
        <p className="text-center text-xs text-slate-300">
          © 2020-Present BUILDSYNC Inc. This information is confidential and was prepared by BUILDSYNC Inc. for the use of our client. It is not to be relied on by any 3rd party.
        </p>
      </footer>

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-900">テンプレートから案件作成</h2>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {templatesLoading ? (
              <div className="text-center py-8 text-slate-500">読み込み中...</div>
            ) : projectTemplates.length === 0 ? (
              <div className="text-center py-8">
                <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">テンプレートがありません</p>
                <Link
                  href="/settings/project-templates"
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                  onClick={() => setShowTemplateModal(false)}
                >
                  テンプレートを作成する
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {projectTemplates.map(t => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        router.push(`/projects/new?templateId=${t.id}`)
                        setShowTemplateModal(false)
                      }}
                      className="w-full text-left border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg px-4 py-3 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{t.name}</p>
                          {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                          {t.workType && <p className="text-xs text-slate-400 mt-0.5">工種: {t.workType}</p>}
                        </div>
                        <div className="flex gap-3 text-xs text-slate-400 ml-4 flex-shrink-0">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t.scheduleTemplates?.length || 0}工程
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            {t.checklistTemplates?.length || 0}項目
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
