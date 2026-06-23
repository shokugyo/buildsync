'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils'
import {
  ArrowLeft, Building2, Calendar, Camera, MessageSquare,
  CheckSquare, ShoppingCart, Receipt, BarChart2, FileText,
  Edit2, X, ChevronDown, ChevronUp, FileImage, Folder, Download,
  AlertTriangle, Users, Plus, Trash2, ClipboardList, UserCheck,
  ChevronRight, File, Eye, Globe, Lock, MoreHorizontal, ClipboardCheck, ScrollText,
  AlertCircle, Share2, Copy, Check, FileBarChart, CheckCircle2, BookOpen, Stamp, Flag
} from 'lucide-react'

const TABS = [
  { key: 'overview', label: '概要', icon: Building2 },
  { key: 'dashboard', label: 'ダッシュボード', icon: BarChart2 },
  { key: 'schedule', label: '工程', icon: Calendar },
  { key: 'photos', label: '写真', icon: Camera },
  { key: 'documents', label: '資材', icon: Folder },
  { key: 'work-reports', label: '報告', icon: ClipboardCheck },
  { key: 'members', label: 'メンバー', icon: Users },
  { key: 'chat', label: 'チャット', icon: MessageSquare },
  { key: 'inspections', label: '検査', icon: CheckSquare },
  { key: 'old-schedule', label: '旧工程表', icon: Calendar },
  { key: 'drawings', label: '図面', icon: FileImage },
  { key: 'defects', label: '是正', icon: AlertTriangle },
  { key: 'estimates', label: '見積', icon: ClipboardList },
  { key: 'orders', label: '発注', icon: ShoppingCart },
  { key: 'invoices', label: '請求', icon: Receipt },
  { key: 'budget', label: '予算管理', icon: BarChart2 },
  { key: 'costs', label: '原価', icon: BarChart2 },
  { key: 'attendance', label: '入退場', icon: UserCheck },
  { key: 'reports', label: '日報', icon: FileText },
  { key: 'settlement', label: '精算', icon: Receipt },
  { key: 'history', label: '履歴', icon: ScrollText },
  { key: 'ledger', label: '施工体制台帳', icon: ClipboardList },
  { key: 'completion', label: '完了チェックリスト', icon: CheckCircle2 },
  { key: 'completion-docs', label: '完成図書', icon: BookOpen },
  { key: 'risks', label: 'リスク', icon: AlertCircle },
  { key: 'milestones', label: 'マイルストーン', icon: Flag },
]

const PROJECT_STATUSES = ['受注前', '進行中', '完了', '中止']

const PROJECT_ROLES = ['管理者', 'メンバー', '閲覧のみ', '協力会社', '現場監督', '営業担当', '設計担当', '品質管理', '安全管理', '経理', '一般']

function OwnerPortalSection({ projectId }: { projectId: string }) {
  const [shareToken, setShareToken] = useState<{ id: string; token: string; createdAt: string; expiresAt: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/share-token`)
      .then((r) => r.json())
      .then((data) => {
        setShareToken(data || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/share-token`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setShareToken(data)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('共有リンクを無効化しますか？施主様はアクセスできなくなります。')) return
    setRevoking(true)
    try {
      await fetch(`/api/projects/${projectId}/share-token`, { method: 'DELETE' })
      setShareToken(null)
    } finally {
      setRevoking(false)
    }
  }

  const portalUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${shareToken.token}`
    : ''

  const handleCopy = () => {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-slate-700">施主ポータル</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">施主様向けの閲覧専用ページです。工程進捗・写真・日程を共有できます。</p>

      {loading ? (
        <p className="text-xs text-slate-400">読み込み中...</p>
      ) : shareToken ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700 font-medium">共有リンクが有効です</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-600 truncate">
              {portalUrl}
            </code>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> コピー済み</> : <><Copy className="w-3.5 h-3.5" /> コピー</>}
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> プレビュー
            </a>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {revoking ? '無効化中...' : '無効化'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {generating ? '発行中...' : '共有リンクを発行'}
        </button>
      )}
    </div>
  )
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [chatMessage, setChatMessage] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [drawings, setDrawings] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [previewDrawing, setPreviewDrawing] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [addingMember, setAddingMember] = useState(false)
  const [newMemberUserId, setNewMemberUserId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('一般')
  const [estimates, setEstimates] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [workReports, setWorkReports] = useState<any[]>([])
  const [docFolderExpanded, setDocFolderExpanded] = useState<Record<string, boolean>>({})
  // Work report modal
  const [showWorkReportModal, setShowWorkReportModal] = useState(false)
  const [workReportForm, setWorkReportForm] = useState({ location: '', reportDate: '', content: '' })
  const [workReportSaving, setWorkReportSaving] = useState(false)
  const [workReportLocationFilter, setWorkReportLocationFilter] = useState('')
  const [workReportDateFilter, setWorkReportDateFilter] = useState('')
  const [expandedWorkReport, setExpandedWorkReport] = useState<string | null>(null)

  // Photos tab state
  const [photoViewMode, setPhotoViewMode] = useState<'folder' | 'list'>('folder')
  const [photoSort, setPhotoSort] = useState<'newest' | 'oldest'>('newest')
  const [photoSearch, setPhotoSearch] = useState('')
  const [photoDateFrom, setPhotoDateFrom] = useState('')
  const [photoDateTo, setPhotoDateTo] = useState('')
  const [expandedPhotoFolders, setExpandedPhotoFolders] = useState<Record<string, boolean>>({})
  const [photoFolderLimit, setPhotoFolderLimit] = useState<Record<string, number>>({})
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())

  // Budget tab state
  const [budgets, setBudgets] = useState<any[]>([])
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ category: '労務費', description: '', amount: '' })
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetError, setBudgetError] = useState('')
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('')

  // Audit logs for history tab
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  // Ledger tab state
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [editingLedger, setEditingLedger] = useState<any>(null)
  const [ledgerForm, setLedgerForm] = useState({
    contractorName: '', contractorType: '元請', workType: '',
    contractAmount: '', startDate: '', endDate: '', supervisorName: '', licenseNumber: '',
  })
  const [ledgerSaving, setLedgerSaving] = useState(false)

  // Dashboard tab state
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Completion checklist state
  const [completion, setCompletion] = useState<any>(null)
  const [completionLoading, setCompletionLoading] = useState(false)
  const [completionConfirming, setCompletionConfirming] = useState(false)

  // Completion docs tab state
  const [completionDocs, setCompletionDocs] = useState<any[]>([])
  const [completionDocsLoading, setCompletionDocsLoading] = useState(false)
  const [showCompletionDocModal, setShowCompletionDocModal] = useState(false)
  const [completionDocForm, setCompletionDocForm] = useState({ category: '竣工図面', name: '', fileUrl: '', fileName: '', notes: '' })
  const [completionDocSaving, setCompletionDocSaving] = useState(false)

  // Risks tab state
  const [risks, setRisks] = useState<any[]>([])
  const [risksLoading, setRisksLoading] = useState(false)
  const [showRiskModal, setShowRiskModal] = useState(false)
  const [riskForm, setRiskForm] = useState({ title: '', description: '', probability: 3, impact: 3, category: '', status: '未対応', mitigation: '', owner: '' })
  const [riskSaving, setRiskSaving] = useState(false)
  const [editingRisk, setEditingRisk] = useState<any>(null)

  // Milestones tab state
  const [milestones, setMilestones] = useState<any[]>([])
  const [milestonesLoading, setMilestonesLoading] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', dueDate: '' })
  const [milestoneSaving, setMilestoneSaving] = useState(false)

  // Generate invoice state
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [invoiceToast, setInvoiceToast] = useState<{ id: string; number: string } | null>(null)

  // Documents tab view mode
  const [docViewMode, setDocViewMode] = useState<'folder' | 'list'>('folder')
  const [docSort, setDocSort] = useState<'newest' | 'oldest'>('newest')
  const [docSearch, setDocSearch] = useState('')

  // Members tab state
  const [memberCompanyFilter, setMemberCompanyFilter] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState('')
  const [memberSearch, setMemberSearch] = useState('')

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editSaving, setEditSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  // Duplicate
  const [duplicating, setDuplicating] = useState(false)

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareTokens, setShareTokens] = useState<any[]>([])
  const [shareLabel, setShareLabel] = useState('')
  const [shareExpiry, setShareExpiry] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Apply template modal
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false)
  const [projectTemplates, setProjectTemplates] = useState<any[]>([])
  const [applyTemplateId, setApplyTemplateId] = useState('')
  const [applyStartDate, setApplyStartDate] = useState('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [applyTemplateResult, setApplyTemplateResult] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data)
        if (data.chatRooms?.length > 0) setSelectedRoom(data.chatRooms[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
    fetch(`/api/drawings?projectId=${params.id}`).then(r => r.json()).then(d => setDrawings(Array.isArray(d) ? d : []))
    fetch(`/api/documents?projectId=${params.id}`).then(r => r.json()).then(d => setDocuments(Array.isArray(d) ? d : []))
    fetch(`/api/projects/${params.id}/members`).then(r => r.json()).then(d => setMembers(Array.isArray(d) ? d : []))
    fetch('/api/users').then(r => r.json()).then(d => setAllUsers(Array.isArray(d) ? d : []))
    fetch(`/api/estimates?projectId=${params.id}`).then(r => r.json()).then(d => setEstimates(Array.isArray(d) ? d : []))
    fetch(`/api/attendance?projectId=${params.id}`).then(r => r.json()).then(d => setAttendance(Array.isArray(d) ? d : []))
    fetch(`/api/work-reports?projectId=${params.id}`).then(r => r.json()).then(d => setWorkReports(Array.isArray(d) ? d : []))
    fetch('/api/project-templates').then(r => r.json()).then(d => setProjectTemplates(Array.isArray(d) ? d : []))
  }, [params.id])

  useEffect(() => {
    if (activeTab !== 'dashboard') return
    setDashboardLoading(true)
    fetch(`/api/projects/${params.id}/dashboard`)
      .then(r => r.json())
      .then(d => { setDashboardData(d); setDashboardLoading(false) })
      .catch(() => setDashboardLoading(false))
  }, [activeTab, params.id])

  useEffect(() => {
    if (activeTab !== 'budget') return
    setBudgetLoading(true)
    fetch(`/api/projects/${params.id}/budgets`)
      .then(r => r.json())
      .then(d => { setBudgets(Array.isArray(d) ? d : []); setBudgetLoading(false) })
      .catch(() => setBudgetLoading(false))
  }, [activeTab, params.id])

  useEffect(() => {
    if (activeTab !== 'ledger') return
    setLedgerLoading(true)
    fetch(`/api/projects/${params.id}/ledger`)
      .then(r => r.json())
      .then(d => { setLedgerEntries(Array.isArray(d) ? d : []); setLedgerLoading(false) })
      .catch(() => setLedgerLoading(false))
  }, [activeTab, params.id])

  useEffect(() => {
    if (activeTab !== 'completion') return
    setCompletionLoading(true)
    fetch(`/api/projects/${params.id}/completion`)
      .then(r => r.json())
      .then(d => { setCompletion(d); setCompletionLoading(false) })
      .catch(() => setCompletionLoading(false))
  }, [activeTab, params.id])

  useEffect(() => {
    if (activeTab !== 'completion-docs') return
    setCompletionDocsLoading(true)
    fetch(`/api/projects/${params.id}/completion-docs`)
      .then(r => r.json())
      .then(d => { setCompletionDocs(Array.isArray(d) ? d : []); setCompletionDocsLoading(false) })
      .catch(() => setCompletionDocsLoading(false))
  }, [activeTab, params.id])

  useEffect(() => {
    if (activeTab !== 'history') return
    fetch('/api/audit')
      .then(r => r.json())
      .then(d => setAuditLogs(Array.isArray(d) ? d.filter((l: any) => l.targetId === params.id || l.detail === project?.name) : []))
  }, [activeTab, params.id, project?.name])

  useEffect(() => {
    if (activeTab !== 'risks') return
    setRisksLoading(true)
    fetch(`/api/projects/${params.id}/risks`)
      .then(r => r.json())
      .then(d => { setRisks(Array.isArray(d) ? d : []); setRisksLoading(false) })
      .catch(() => setRisksLoading(false))
  }, [activeTab, params.id])

  useEffect(() => {
    if (activeTab !== 'milestones') return
    setMilestonesLoading(true)
    fetch(`/api/projects/${params.id}/milestones`)
      .then(r => r.json())
      .then(d => { setMilestones(Array.isArray(d) ? d : []); setMilestonesLoading(false) })
      .catch(() => setMilestonesLoading(false))
  }, [activeTab, params.id])

  useEffect(() => {
    if (showShareModal) {
      fetchShareTokens()
    }
  }, [showShareModal])

  const handleAddMember = async () => {
    if (!newMemberUserId) return
    await fetch(`/api/projects/${params.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: newMemberUserId, memberRole: newMemberRole }),
    })
    const d = await fetch(`/api/projects/${params.id}/members`).then(r => r.json())
    setMembers(Array.isArray(d) ? d : [])
    setNewMemberUserId('')
    setAddingMember(false)
  }

  const handleRemoveMember = async (userId: string) => {
    await fetch(`/api/projects/${params.id}/members?userId=${userId}`, { method: 'DELETE' })
    setMembers(m => m.filter(mem => mem.userId !== userId))
  }

  const handleUpdateMemberRole = async (memberId: string, memberRole: string) => {
    const res = await fetch(`/api/projects/${params.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, memberRole }),
    })
    if (res.ok) {
      setMembers(m => m.map(mem => mem.id === memberId ? { ...mem, memberRole } : mem))
    }
  }

  const handleDuplicate = async () => {
    if (!confirm('この案件を複製しますか？')) return
    setDuplicating(true)
    try {
      const res = await fetch(`/api/projects/${params.id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        const newProject = await res.json()
        router.push(`/projects/${newProject.id}`)
      }
    } finally {
      setDuplicating(false)
    }
  }

  const handleArchive = async () => {
    if (!project) return
    const isArchived = project.status === 'アーカイブ'
    const msg = isArchived ? 'この案件のアーカイブを解除しますか？' : 'この案件をアーカイブしますか？アーカイブ後は通常の一覧には表示されなくなります。'
    if (!confirm(msg)) return
    const newStatus = isArchived ? '完了' : 'アーカイブ'
    const res = await fetch(`/api/projects/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setProject((prev: any) => ({ ...prev, status: newStatus }))
    }
  }

  const openEdit = () => {
    if (!project) return
    setEditForm({
      name: project.name || '',
      status: project.status || '進行中',
      address: project.address || '',
      workType: project.workType || '',
      contractAmount: project.contractAmount || '',
      estimatedCost: project.estimatedCost || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      deliveryDate: project.deliveryDate ? project.deliveryDate.split('T')[0] : '',
      ridgepoleDate: project.ridgepoleDate ? project.ridgepoleDate.split('T')[0] : '',
      customerId: project.customer?.id || '',
      managerId: project.manager?.id || '',
      salesId: project.sales?.id || '',
      notes: project.notes || '',
      propertyType: project.propertyType || '',
      propertyName: project.propertyName || '',
      propertyNameKana: project.propertyNameKana || '',
      labels: project.labels || '',
    })
    if (customers.length === 0) {
      Promise.all([
        fetch('/api/customers').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ]).then(([c, u]) => {
        setCustomers(Array.isArray(c) ? c : [])
        setUsers(Array.isArray(u) ? u : [])
      })
    }
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSaving(true)
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const refreshed = await fetch(`/api/projects/${params.id}`).then((r) => r.json())
        setProject(refreshed)
        setShowEditModal(false)
      }
    } finally {
      setEditSaving(false)
    }
  }

  const fetchShareTokens = async () => {
    const data = await fetch(`/api/projects/${params.id}/share`).then(r => r.json())
    setShareTokens(Array.isArray(data) ? data : [])
  }

  const createShareToken = async () => {
    setShareLoading(true)
    try {
      await fetch(`/api/projects/${params.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: shareLabel, expiresAt: shareExpiry || null }),
      })
      setShareLabel('')
      setShareExpiry('')
      await fetchShareTokens()
    } finally {
      setShareLoading(false)
    }
  }

  const deleteShareToken = async (tokenId: string) => {
    await fetch(`/api/projects/${params.id}/share?tokenId=${tokenId}`, { method: 'DELETE' })
    await fetchShareTokens()
  }

  const copyShareUrl = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const sendMessage = async () => {
    if (!chatMessage.trim() || !selectedRoom) return
    setSendingMessage(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'message', roomId: selectedRoom.id, content: chatMessage }),
      })
      if (res.ok) {
        const msg = await res.json()
        setProject((prev: any) => ({
          ...prev,
          chatRooms: prev.chatRooms.map((r: any) =>
            r.id === selectedRoom.id ? { ...r, messages: [...r.messages, msg] } : r
          ),
        }))
        setSelectedRoom((prev: any) => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
        setChatMessage('')
      }
    } finally {
      setSendingMessage(false)
    }
  }

  const handleCompletionToggle = async (field: string, value: boolean) => {
    const res = await fetch(`/api/projects/${params.id}/completion`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCompletion(updated)
    }
  }

  const handleConfirmComplete = async () => {
    if (!confirm('完了確定します。担当者に通知が送られます。よろしいですか？')) return
    setCompletionConfirming(true)
    try {
      const res = await fetch(`/api/projects/${params.id}/completion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmComplete: true }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCompletion(updated)
      }
    } finally {
      setCompletionConfirming(false)
    }
  }

  const handleGenerateInvoice = async () => {
    setGeneratingInvoice(true)
    try {
      const res = await fetch(`/api/projects/${params.id}/generate-invoice`, { method: 'POST' })
      if (res.ok) {
        const inv = await res.json()
        setInvoiceToast({ id: inv.id, number: inv.invoiceNumber })
        const refreshed = await fetch(`/api/projects/${params.id}`).then(r => r.json())
        setProject(refreshed)
        setTimeout(() => setInvoiceToast(null), 5000)
      } else {
        const err = await res.json()
        alert(err.error || '請求書の作成に失敗しました')
      }
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const handleApplyTemplate = async () => {
    if (!applyTemplateId || !applyStartDate) {
      alert('テンプレートと開始日を選択してください')
      return
    }
    setApplyingTemplate(true)
    setApplyTemplateResult(null)
    try {
      const res = await fetch(`/api/projects/${params.id}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: applyTemplateId, startDate: applyStartDate }),
      })
      const data = await res.json()
      if (res.ok) {
        setApplyTemplateResult(`${data.created}件の工程を生成しました`)
        const refreshed = await fetch(`/api/projects/${params.id}`).then(r => r.json())
        setProject(refreshed)
        setTimeout(() => {
          setShowApplyTemplateModal(false)
          setApplyTemplateResult(null)
          setApplyTemplateId('')
          setApplyStartDate('')
        }, 1500)
      } else {
        alert(data.error || '工程の生成に失敗しました')
      }
    } finally {
      setApplyingTemplate(false)
    }
  }

  const getWeatherIcon = (weather: string | null | undefined) => {
    const icons: Record<string, string> = { '晴れ': '☀️', '曇り': '☁️', '雨': '🌧️', '雪': '❄️', '強風': '💨' }
    return weather ? (icons[weather] || '🌤️') : ''
  }

  if (loading) {
    return (
      <div>
        <Header title="案件詳細" />
        <div className="p-6 text-center text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        <Header title="案件詳細" />
        <div className="p-6 text-center text-slate-500">案件が見つかりません</div>
      </div>
    )
  }

  const pendingDefects = (project.defects as any[] | undefined)?.filter((d: any) => ['未対応', '対応中'].includes(d.status)).length ?? 0
  const pendingOrders = (project.orders as any[] | undefined)?.filter((o: any) => o.status === '承認依頼中').length ?? 0
  const totalPending = pendingDefects + pendingOrders

  return (
    <div>
      <Header title={project.name} />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/projects" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> 案件一覧に戻る
          </Link>
        </div>

        {/* Project Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-slate-500">{project.projectNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
                {totalPending > 0 && (
                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    未対応 {totalPending}件
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">{project.address || '-'}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(project.contractAmount)}</p>
                <p className="text-xs text-slate-500">契約金額</p>
              </div>
              <button
                onClick={handleArchive}
                className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  project.status === 'アーカイブ'
                    ? 'border-green-300 hover:border-green-400 hover:text-green-600 text-green-500'
                    : 'border-slate-300 hover:border-orange-400 hover:text-orange-600 text-slate-500'
                }`}
              >
                {project.status === 'アーカイブ' ? '解除' : 'アーカイブ'}
              </button>
              <Link
                href={`/site/${params.id}`}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-green-400 hover:text-green-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Building2 className="w-4 h-4" /> 現場概要
              </Link>
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <Copy className="w-4 h-4" /> 複製
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-purple-400 hover:text-purple-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" /> 施主共有
              </button>
              <Link
                href={`/projects/${params.id}/journal`}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-amber-400 hover:text-amber-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <ScrollText className="w-4 h-4" /> 工事台帳
              </Link>
              <Link
                href={`/projects/${params.id}/site-diary`}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-teal-400 hover:text-teal-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <BookOpen className="w-4 h-4" /> 工事日誌
              </Link>
              <Link
                href={`/projects/${params.id}/progress-report`}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-green-400 hover:text-green-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <FileBarChart className="w-4 h-4" /> 進捗報告書
              </Link>
              {(project.status === '完了' || project.status === '引渡済') && (
                <Link
                  href={`/projects/${params.id}/settlement/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border border-slate-300 hover:border-amber-400 hover:text-amber-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <File className="w-4 h-4" /> 精算書
                </Link>
              )}
              {(project.status === '完了' || project.status === '引渡済') && (
                <Link
                  href={`/projects/${params.id}/handover/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border border-slate-300 hover:border-teal-400 hover:text-teal-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Stamp className="w-4 h-4" /> 引渡書
                </Link>
              )}
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Edit2 className="w-4 h-4" /> 編集
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500">顧客</p>
              <p className="text-sm font-medium text-slate-900">{project.customer?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">担当者</p>
              <p className="text-sm font-medium text-slate-900">{project.manager?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">着工日</p>
              <p className="text-sm font-medium text-slate-900">{formatDate(project.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">竣工予定</p>
              <p className="text-sm font-medium text-slate-900">{formatDate(project.deliveryDate)}</p>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        {(() => {
          const totalSchedules = (project.schedules as any[] | undefined)?.length ?? 0
          const completedSchedules = (project.schedules as any[] | undefined)?.filter((s: any) => s.status === '完了').length ?? 0
          const scheduleProgress = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0
          const photoCount = (project.photos as any[] | undefined)?.length ?? 0
          const totalOrders = (project.orders as any[] | undefined)?.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0) ?? 0
          const costRate = project.contractAmount ? Math.round((totalOrders / project.contractAmount) * 100) : null
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-400 mb-1">工程進捗率</p>
                <p className="text-xl font-bold text-blue-600">{scheduleProgress}%</p>
                <p className="text-xs text-slate-400 mt-0.5">{completedSchedules}/{totalSchedules} 完了</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-400 mb-1">原価消化率</p>
                <p className={`text-xl font-bold ${costRate !== null && costRate > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {costRate !== null ? `${costRate}%` : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">発注累計</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <p className="text-xs text-slate-400 mb-1">写真枚数</p>
                <p className="text-xl font-bold text-slate-700">{photoCount}<span className="text-sm font-normal text-slate-400 ml-1">枚</span></p>
                <p className="text-xs text-slate-400 mt-0.5">登録済み</p>
              </div>
              <div className={`rounded-xl shadow-sm border p-4 ${totalPending > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                <p className="text-xs text-slate-400 mb-1">未対応件数</p>
                <p className={`text-xl font-bold ${totalPending > 0 ? 'text-red-600' : 'text-slate-700'}`}>{totalPending}<span className="text-sm font-normal text-slate-400 ml-1">件</span></p>
                <p className="text-xs text-slate-400 mt-0.5">是正・承認待ち</p>
              </div>
            </div>
          )
        })()}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 overflow-x-auto">
            <div className="flex">
              {TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.key === 'defects' && pendingDefects > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingDefects}</span>
                    )}
                    {tab.key === 'orders' && pendingOrders > 0 && (
                      <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingOrders}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-5">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* お知らせ日 filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">お知らせ日:</span>
                  <select className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-600">
                    <option value="">すべて</option>
                    <option value="1week">1週間前</option>
                    <option value="1month">1か月前</option>
                  </select>
                </div>

                {/* Notification area */}
                <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-500 border border-slate-100">
                  まだ、通知はありません
                </div>

                {/* 詳細情報 */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b border-slate-100">詳細情報</h3>

                  {/* 案件情報 */}
                  <p className="text-xs font-medium text-slate-500 mb-2">案件情報</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                    {[
                      ['案件名', project.name],
                      ['案件フロー', project.status],
                      ['案件種別', project.workType],
                      ['未着防延完了日', formatDate(project.deliveryDate)],
                      ['着工日', formatDate(project.startDate)],
                      ['上棟日', formatDate(project.ridgepoleDate)],
                      ['完成日', formatDate(project.endDate)],
                      ['定期点検（1か月前予定日）', '-'],
                      ['設計', project.sales?.name ? `自内 完完（${project.company?.name || ''}）` : '-'],
                      ['工事', project.manager?.name ? `${project.manager.name}（${project.company?.name || ''}）` : '-'],
                      ['案件作業員', project.manager?.name],
                      ['案件作成日', project.createdAt ? new Date(project.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex gap-2 py-1">
                        <dt className="text-xs text-slate-500 w-36 flex-shrink-0">{label}</dt>
                        <dd className="text-sm text-slate-900">{value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                  {project.labels && (
                    <div className="flex gap-2 py-1 mt-1 mb-4">
                      <dt className="text-xs text-slate-500 w-36 flex-shrink-0">ラベル</dt>
                      <dd className="flex flex-wrap gap-1">
                        {project.labels.split(',').filter(Boolean).map((label: string) => (
                          <span key={label} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{label.trim()}</span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {project.notes && (
                    <div className="flex gap-2 py-1 mt-1">
                      <dt className="text-xs text-slate-500 w-36 flex-shrink-0">備考</dt>
                      <dd className="text-sm text-slate-900 whitespace-pre-wrap">{project.notes}</dd>
                    </div>
                  )}
                </div>

                {/* 物件情報 */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b border-slate-100">物件情報</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    {[
                      ['物件種別', project.propertyType],
                      ['物名', project.propertyName || project.name],
                      ['物件名（カナ）', project.propertyNameKana],
                      ['住所', project.address],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex gap-2 py-1">
                        <dt className="text-xs text-slate-500 w-28 flex-shrink-0">{label}</dt>
                        <dd className="text-sm text-slate-900">{value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                  {project.address && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline border border-blue-200 px-2 py-1 rounded"
                      >
                        Googleマップで見る
                      </a>
                      <span className="text-xs text-slate-400 self-center">付近を検索:</span>
                      {['コンビニ', 'トイレ', '駐車場'].map(place => (
                        <a
                          key={place}
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}+near+${encodeURIComponent(project.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-600 hover:text-blue-600 border border-slate-200 px-2 py-1 rounded hover:border-blue-300 transition-colors"
                        >
                          {place}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* 契約管理 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">契約管理</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">契約金額</p>
                      <p className="text-sm font-semibold text-slate-800">{project.contractAmount ? formatCurrency(project.contractAmount) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">予定原価</p>
                      <p className="text-sm font-semibold text-slate-800">{project.estimatedCost ? formatCurrency(project.estimatedCost) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">着工予定日</p>
                      <p className="text-sm font-semibold text-slate-800">{project.startDate ? formatDate(project.startDate) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">完工予定日</p>
                      <p className="text-sm font-semibold text-slate-800">{project.endDate ? formatDate(project.endDate) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">引渡予定日</p>
                      <p className="text-sm font-semibold text-slate-800">{project.deliveryDate ? formatDate(project.deliveryDate) : '—'}</p>
                    </div>
                    {project.contractAmount && project.estimatedCost && project.contractAmount > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">予想粗利率</p>
                        <p className="text-sm font-semibold text-green-700">
                          {(((project.contractAmount - project.estimatedCost) / project.contractAmount) * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 工程進捗 */}
                {project.schedules?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b border-slate-100">工程進捗</h3>
                    <div className="space-y-3">
                      {project.schedules.slice(0, 5).map((s: any) => (
                        <div key={s.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700">{s.name}</span>
                            <span className="text-slate-500">{s.progress}%</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-2">
                            <div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: `${s.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 施主ポータル */}
                <OwnerPortalSection projectId={params.id as string} />
              </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {dashboardLoading || !dashboardData ? (
                  <div className="text-center text-slate-400 py-10 text-sm">読み込み中...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-slate-400 mb-1">工程完了率</p>
                        <p className="text-2xl font-bold text-blue-600">{dashboardData.scheduleStats.completionRate}%</p>
                        <p className="text-xs text-slate-400 mt-0.5">{dashboardData.scheduleStats.completed}/{dashboardData.scheduleStats.total} 完了</p>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-slate-400 mb-1">予算消化率</p>
                        <p className={`text-2xl font-bold ${dashboardData.budgetStats.usageRate > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {dashboardData.budgetStats.usageRate}%
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(dashboardData.budgetStats.totalOrdered)} / {formatCurrency(dashboardData.budgetStats.contractAmount)}</p>
                      </div>
                      <div className={`border rounded-xl p-4 shadow-sm ${dashboardData.openDefects > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                        <p className="text-xs text-slate-400 mb-1">未解決指摘</p>
                        <p className={`text-2xl font-bold ${dashboardData.openDefects > 0 ? 'text-red-600' : 'text-slate-700'}`}>{dashboardData.openDefects}<span className="text-sm font-normal ml-1">件</span></p>
                        <p className="text-xs text-slate-400 mt-0.5">是正完了以外</p>
                      </div>
                      <div className={`border rounded-xl p-4 shadow-sm ${dashboardData.pendingOrders > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                        <p className="text-xs text-slate-400 mb-1">承認待ち発注</p>
                        <p className={`text-2xl font-bold ${dashboardData.pendingOrders > 0 ? 'text-amber-600' : 'text-slate-700'}`}>{dashboardData.pendingOrders}<span className="text-sm font-normal ml-1">件</span></p>
                        <p className="text-xs text-slate-400 mt-0.5">承認待ち</p>
                      </div>
                    </div>

                    {dashboardData.recentPhotos.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">直近の写真</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {dashboardData.recentPhotos.map((photo: any) => (
                            <a key={photo.id} href={photo.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img
                                src={photo.fileUrl}
                                alt={photo.fileName}
                                className="w-full h-28 object-cover rounded-lg border border-slate-100"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {dashboardData.upcomingSchedules.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">今後の工程</h3>
                        <div className="space-y-2">
                          {dashboardData.upcomingSchedules.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                              <div className="text-xs text-slate-500 w-24 flex-shrink-0">{formatDate(s.startDate)}</div>
                              <div className="flex-1 text-sm text-slate-800 font-medium">{s.name}</div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>{s.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-700">工程表</h3>
                  {projectTemplates.length > 0 && (
                    <button
                      onClick={() => setShowApplyTemplateModal(true)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      テンプレートから工程を生成
                    </button>
                  )}
                </div>
                {!project.schedules?.length ? (
                  <div className="text-center py-10">
                    <p className="text-slate-500 text-sm mb-3">工程データがありません</p>
                    {projectTemplates.length > 0 && (
                      <button
                        onClick={() => setShowApplyTemplateModal(true)}
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        テンプレートから工程を生成
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {project.schedules.map((s: any) => (
                      <div key={s.id} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(s.startDate)} ～ {formatDate(s.endDate)}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className={`rounded-full h-2 transition-all ${s.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${s.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 w-10 text-right">{s.progress}%</span>
                        </div>
                        {s.assignee && <p className="text-xs text-slate-500 mt-1">担当: {s.assignee.name}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Drawings Tab */}
            {activeTab === 'drawings' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-700">図面一覧</h3>
                  <a href="/drawings" className="text-xs text-blue-600 hover:underline">図面管理ページへ</a>
                </div>
                {drawings.length === 0 ? (
                  <p className="text-slate-500 text-sm">図面がありません</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {drawings.filter(d => d.isLatest).map((d: any) => (
                      <div key={d.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                        <div className="bg-slate-50 h-28 flex items-center justify-center relative">
                          {/\.(jpg|jpeg|png|gif|webp)$/i.test(d.filePath) ? (
                            <img src={d.filePath} alt={d.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewDrawing(d)} />
                          ) : (
                            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => window.open(d.filePath, '_blank')}>
                              <FileImage className="w-10 h-10 text-slate-300" />
                              <span className="text-xs text-slate-400">{d.filePath.split('.').pop()?.toUpperCase()}</span>
                            </div>
                          )}
                          <span className="absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded bg-blue-600 text-white">v{d.version}</span>
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium text-slate-900 truncate">{d.name}</p>
                          <p className="text-xs text-slate-500">{d.drawingType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (() => {
              const filteredDocs = documents
                .filter((doc: any) => !docSearch || doc.name.includes(docSearch) || (doc.description || '').includes(docSearch))
                .sort((a: any, b: any) => {
                  const da = new Date(a.createdAt).getTime()
                  const db = new Date(b.createdAt).getTime()
                  return docSort === 'newest' ? db - da : da - db
                })

              const grouped: Record<string, any[]> = {}
              filteredDocs.forEach((doc: any) => {
                const cat = doc.category || 'その他'
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push(doc)
              })

              return (
                <div>
                  {/* Header link */}
                  <div className="flex items-center justify-between mb-3">
                    <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                      <Folder className="w-3.5 h-3.5" />資料を管理する
                    </button>
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500">表示方法：</span>
                    <div className="flex border border-slate-200 rounded overflow-hidden text-xs">
                      {(['folder', 'list'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setDocViewMode(mode)}
                          className={`px-3 py-1.5 ${docViewMode === mode ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          {mode === 'folder' ? 'フォルダ' : '一覧'}
                        </button>
                      ))}
                    </div>
                    <select
                      value={docSort}
                      onChange={e => setDocSort(e.target.value as any)}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600"
                    >
                      <option value="newest">▼ 作成日（新しい順）</option>
                      <option value="oldest">▲ 作成日（古い順）</option>
                    </select>
                    <input
                      type="text"
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      placeholder="キーワードを入力"
                      className="border border-slate-200 rounded px-3 py-1.5 text-xs flex-1 min-w-[120px]"
                    />
                    <button className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-slate-800">検索</button>
                  </div>

                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">資料トップ</span>
                    <span>/</span>
                    <button className="text-blue-500 hover:underline">全て選択</button>
                    <button className="text-blue-500 hover:underline">主工種別</button>
                  </div>

                  {filteredDocs.length === 0 ? (
                    <p className="text-slate-500 text-sm">資料がありません</p>
                  ) : docViewMode === 'folder' ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Folder header row */}
                      <div className="grid grid-cols-[1fr_80px_80px_100px_120px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>資料名称</span>
                        </div>
                        <span className="text-center">項目数</span>
                        <span className="text-center">閲覧人数</span>
                        <span className="text-center">公開設定</span>
                        <span>作成日時</span>
                      </div>
                      {Object.entries(grouped).map(([category, docs]) => {
                        const isExpanded = docFolderExpanded[category] !== false
                        const publicDocs = docs.filter((d: any) => d.isPublic)
                        return (
                          <div key={category}>
                            {/* Folder row */}
                            <button
                              onClick={() => setDocFolderExpanded(prev => ({ ...prev, [category]: !isExpanded }))}
                              className="w-full grid grid-cols-[1fr_80px_80px_100px_120px] gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors text-left items-center"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <span className="text-sm font-medium text-slate-700">{category}</span>
                              </div>
                              <span className="text-xs text-slate-500 text-center">{docs.length}項目</span>
                              <span className="text-xs text-slate-500 text-center">-</span>
                              <span className="text-xs text-slate-500 text-center">-</span>
                              <span className="text-xs text-slate-400">{new Date(docs[0]?.createdAt || Date.now()).toLocaleDateString('ja-JP')}</span>
                            </button>
                            {/* Doc rows */}
                            {isExpanded && docs.map((doc: any) => (
                              <div key={doc.id} className="grid grid-cols-[1fr_80px_80px_100px_120px] gap-2 pl-8 pr-3 py-2 border-b border-slate-50 hover:bg-slate-50 items-center">
                                <div className="flex items-center gap-2 min-w-0">
                                  <input type="checkbox" className="flex-shrink-0 w-3.5 h-3.5 rounded border-slate-300" />
                                  <File className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                  <span className="text-sm text-slate-900 truncate">{doc.name}</span>
                                </div>
                                <span className="text-xs text-slate-500 text-center">{doc.viewCount ?? 0}回</span>
                                <span className="text-xs text-slate-500 text-center">-</span>
                                <div className="flex justify-center">
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      const res = await fetch(`/api/documents/${doc.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ isPublic: !doc.isPublic }),
                                      })
                                      if (res.ok) {
                                        const updated = await res.json()
                                        setDocuments(prev => prev.map((d: any) => d.id === doc.id ? { ...d, isPublic: updated.isPublic } : d))
                                      }
                                    }}
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${doc.isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                  >
                                    {doc.isPublic ? <span className="flex items-center gap-1"><Globe className="w-3 h-3" />公開</span> : <span className="flex items-center gap-1"><Lock className="w-3 h-3" />非公開</span>}
                                  </button>
                                </div>
                                <span className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString('ja-JP')}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* List view */
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[1fr_80px_80px_100px_120px_160px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                        <span>資料名</span>
                        <span className="text-center">閲覧回数</span>
                        <span className="text-center">閲覧人数</span>
                        <span className="text-center">公開設定</span>
                        <span>作成日時</span>
                        <span>操作</span>
                      </div>
                      {filteredDocs.map((doc: any) => (
                        <div key={doc.id} className="grid grid-cols-[1fr_80px_80px_100px_120px_160px] gap-2 px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 items-center">
                          <div className="flex items-center gap-2 min-w-0">
                            <input type="checkbox" className="flex-shrink-0 w-3.5 h-3.5 rounded border-slate-300" />
                            <File className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-sm text-slate-900 truncate">{doc.name}</span>
                          </div>
                          <span className="text-xs text-slate-500 text-center">{doc.viewCount ?? 0}回</span>
                          <span className="text-xs text-slate-500 text-center">-</span>
                          <div className="flex justify-center">
                            <button
                              onClick={async () => {
                                const res = await fetch(`/api/documents/${doc.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ isPublic: !doc.isPublic }),
                                })
                                if (res.ok) {
                                  const updated = await res.json()
                                  setDocuments(prev => prev.map((d: any) => d.id === doc.id ? { ...d, isPublic: updated.isPublic } : d))
                                }
                              }}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${doc.isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                              {doc.isPublic ? <span className="flex items-center gap-1"><Globe className="w-3 h-3" />公開</span> : <span className="flex items-center gap-1"><Lock className="w-3 h-3" />-</span>}
                            </button>
                          </div>
                          <span className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString('ja-JP')}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                window.open(doc.filePath, '_blank')
                                await fetch(`/api/documents/${doc.id}/view`, { method: 'POST' }).catch(() => {})
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 whitespace-nowrap"
                            >
                              <Eye className="w-3 h-3 inline mr-0.5" />ブラウザで見る
                            </button>
                            <a href={doc.filePath} download className="text-xs text-slate-600 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">
                              <Download className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Photos Tab */}
            {activeTab === 'photos' && (() => {
              const allPhotos = (project.photos || [])
              const filteredPhotos = allPhotos
                .filter((p: any) => !photoSearch || (p.comment || '').includes(photoSearch) || (p.tags || '').includes(photoSearch))
                .sort((a: any, b: any) => {
                  const da = new Date(a.createdAt).getTime()
                  const db = new Date(b.createdAt).getTime()
                  return photoSort === 'newest' ? db - da : da - db
                })

              const grouped: Record<string, any[]> = { '写真トップ': [] }
              filteredPhotos.forEach((p: any) => {
                const key = p.shootingType || '写真トップ'
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(p)
              })

              return (
                <div>
                  {/* Header link */}
                  <div className="flex items-center justify-between mb-3">
                    <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                      <Camera className="w-3.5 h-3.5" />写真を管理する
                    </button>
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
                      {(['folder', 'list'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPhotoViewMode(mode)}
                          className={`px-3 py-1.5 ${photoViewMode === mode ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          {mode === 'folder' ? 'フォルダ' : '一覧'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="date"
                      value={photoDateFrom}
                      onChange={e => setPhotoDateFrom(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600"
                      title="撮影日（開始）"
                    />
                    <input
                      type="date"
                      value={photoDateTo}
                      onChange={e => setPhotoDateTo(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600"
                      title="撮影日（終了）"
                    />
                    <select
                      value={photoSort}
                      onChange={e => setPhotoSort(e.target.value as any)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600"
                    >
                      <option value="newest">▼ 追加日（新しい順）</option>
                      <option value="oldest">▲ 追加日（古い順）</option>
                    </select>
                    <input
                      type="text"
                      value={photoSearch}
                      onChange={e => setPhotoSearch(e.target.value)}
                      placeholder="メモを検索"
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs flex-1 min-w-[120px]"
                    />
                    <button className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">検索</button>
                    <button
                      onClick={() => {
                        if (selectedPhotoIds.size === filteredPhotos.length) {
                          setSelectedPhotoIds(new Set())
                        } else {
                          setSelectedPhotoIds(new Set(filteredPhotos.map((p: any) => p.id)))
                        }
                      }}
                      className="ml-auto text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded hover:bg-blue-50"
                    >
                      ✓ チェックし選択
                    </button>
                  </div>

                  {/* Bulk action bar */}
                  {selectedPhotoIds.size > 0 && (
                    <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm text-blue-700 font-medium">{selectedPhotoIds.size}枚選択中</span>
                      <button
                        onClick={() => window.open(`/photos/album/print?ids=${Array.from(selectedPhotoIds).join(',')}`, '_blank')}
                        className="text-xs text-blue-600 border border-blue-300 px-2.5 py-1 rounded hover:bg-blue-100"
                      >写真台帳を作成</button>
                      <button onClick={() => setSelectedPhotoIds(new Set())} className="text-xs text-slate-500 ml-auto">キャンセル</button>
                    </div>
                  )}

                  {filteredPhotos.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">写真がありません</p>
                  ) : photoViewMode === 'list' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {filteredPhotos.map((photo: any) => (
                        <div key={photo.id} className="relative group cursor-pointer" onClick={() => {
                          setSelectedPhotoIds(prev => {
                            const next = new Set(prev)
                            next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id)
                            return next
                          })
                        }}>
                          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                            {photo.filePath && !photo.filePath.includes('placeholder') ? (
                              <img src={photo.filePath} alt={photo.comment || ''} className="w-full h-full object-cover" />
                            ) : <div className="w-full h-full flex items-center justify-center"><Camera className="w-6 h-6 text-slate-300" /></div>}
                          </div>
                          {selectedPhotoIds.has(photo.id) && (
                            <div className="absolute inset-0 bg-blue-500/20 rounded-lg border-2 border-blue-500 flex items-start justify-start p-1">
                              <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs">✓</div>
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5 text-center">{new Date(photo.createdAt).toLocaleDateString('ja-JP')}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 font-medium">フォルダの写真</p>
                      {Object.entries(grouped).map(([folderName, photos]) => {
                        const isExpanded = expandedPhotoFolders[folderName] !== false
                        const limit = photoFolderLimit[folderName] || 12
                        const visible = photos.slice(0, limit)
                        return (
                          <div key={folderName}>
                            <div className="flex items-center gap-3 mb-2">
                              <button
                                onClick={() => setExpandedPhotoFolders(prev => ({ ...prev, [folderName]: !isExpanded }))}
                                className="flex items-center gap-1.5"
                              >
                                <Folder className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-medium text-slate-700">{folderName}</span>
                                <span className="text-xs text-blue-500 hover:underline ml-1">全工週別</span>
                                <span className="text-xs text-blue-500 hover:underline">主工種別</span>
                              </button>
                              <button
                                onClick={() => {
                                  const ids = new Set(selectedPhotoIds)
                                  photos.forEach((p: any) => ids.add(p.id))
                                  setSelectedPhotoIds(ids)
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >全て選択</button>
                              <button
                                onClick={() => {
                                  const ids = new Set(selectedPhotoIds)
                                  photos.forEach((p: any) => ids.delete(p.id))
                                  setSelectedPhotoIds(ids)
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >全て解除</button>
                            </div>
                            {isExpanded && (
                              photos.length === 0 ? (
                                <p className="text-xs text-slate-400 pl-6">写真がありません</p>
                              ) : (
                                <>
                                  <div className="flex flex-wrap gap-2 pl-2">
                                    {visible.map((photo: any) => (
                                      <div key={photo.id} className="relative cursor-pointer" onClick={() => {
                                        setSelectedPhotoIds(prev => {
                                          const next = new Set(prev)
                                          next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id)
                                          return next
                                        })
                                      }}>
                                        <div className="w-20 h-20 bg-slate-100 rounded overflow-hidden">
                                          {photo.filePath && !photo.filePath.includes('placeholder') ? (
                                            <img src={photo.filePath} alt={photo.comment || ''} className="w-full h-full object-cover" />
                                          ) : <div className="w-full h-full flex items-center justify-center"><Camera className="w-5 h-5 text-slate-300" /></div>}
                                        </div>
                                        {selectedPhotoIds.has(photo.id) && (
                                          <div className="absolute inset-0 bg-blue-500/20 rounded border-2 border-blue-500 flex items-start justify-start p-0.5">
                                            <div className="w-3.5 h-3.5 bg-blue-500 rounded-sm flex items-center justify-center text-white text-[9px]">✓</div>
                                          </div>
                                        )}
                                        <p className="text-[10px] text-slate-400 text-center mt-0.5">{new Date(photo.createdAt).toLocaleDateString('ja-JP')}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {photos.length > limit && (
                                    <button
                                      onClick={() => setPhotoFolderLimit(prev => ({ ...prev, [folderName]: limit + 12 }))}
                                      className="text-xs text-blue-600 hover:underline mt-2 pl-2"
                                    >写真をもっと見る</button>
                                  )}
                                </>
                              )
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex gap-4 h-96">
                <div className="w-48 border-r border-slate-100 pr-4 space-y-1">
                  <p className="text-xs font-medium text-slate-500 mb-2">チャットルーム</p>
                  {project.chatRooms?.map((room: any) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                        selectedRoom?.id === room.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      # {room.name}
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex flex-col">
                  {selectedRoom ? (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                        {selectedRoom.messages?.map((msg: any) => (
                          <div key={msg.id} className="flex gap-2">
                            <div className="bg-blue-100 rounded-full w-7 h-7 flex-shrink-0 flex items-center justify-center text-xs font-medium text-blue-700">
                              {msg.sender.name[0]}
                            </div>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium text-slate-700">{msg.sender.name}</span>
                                <span className="text-xs text-slate-400">{formatDate(msg.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-1.5 mt-0.5">
                                {msg.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="メッセージを入力..."
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={sendingMessage}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          送信
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm">チャットルームがありません</p>
                  )}
                </div>
              </div>
            )}

            {/* Inspections Tab */}
            {activeTab === 'inspections' && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">検査一覧</h3>
                {!project.inspections?.length ? (
                  <p className="text-slate-500 text-sm">検査データがありません</p>
                ) : (
                  <div className="space-y-4">
                    {project.inspections.map((insp: any) => (
                      <div key={insp.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-slate-900">{insp.name}</p>
                            <p className="text-xs text-slate-500">{insp.type}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(insp.status)}`}>
                            {insp.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mb-3">
                          予定日: {formatDate(insp.scheduledDate)} | 実施日: {formatDate(insp.actualDate)}
                        </div>
                        {insp.items?.length > 0 && (
                          <div className="space-y-1">
                            {insp.items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 text-sm">
                                <div className={`w-2 h-2 rounded-full ${
                                  item.result === '合格' ? 'bg-green-400' :
                                  item.result === '指摘' ? 'bg-yellow-400' : 'bg-slate-300'
                                }`} />
                                <span className="text-slate-700">{item.name}</span>
                                {item.result && <span className="text-slate-500">- {item.result}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">発注一覧</h3>
                {!project.orders?.length ? (
                  <p className="text-slate-500 text-sm">発注データがありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">発注番号</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">件名</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">状態</th>
                          <th className="pb-2 text-right text-xs font-medium text-slate-500">金額（税込）</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">発注日</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {project.orders.map((order: any) => (
                          <tr key={order.id}>
                            <td className="py-2 text-slate-500">{order.orderNumber}</td>
                            <td className="py-2 text-slate-900">{order.subject}</td>
                            <td className="py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-2 text-right text-slate-900">{formatCurrency(order.totalAmount)}</td>
                            <td className="py-2 text-slate-500">{formatDate(order.orderDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-700">請求一覧</h3>
                  {(() => {
                    const approvedOrders = (project.orders as any[] | undefined)?.filter((o: any) => o.status === '承認済') ?? []
                    const unpaidInvoice = (project.invoices as any[] | undefined)?.some((inv: any) => !['入金済', '支払済'].includes(inv.status))
                    const canGenerate = approvedOrders.length > 0 && !unpaidInvoice
                    return canGenerate ? (
                      <button
                        onClick={handleGenerateInvoice}
                        disabled={generatingInvoice}
                        className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Receipt className="w-4 h-4" />
                        {generatingInvoice ? '作成中...' : '請求書を作成'}
                      </button>
                    ) : null
                  })()}
                </div>
                {!project.invoices?.length ? (
                  <p className="text-slate-500 text-sm">請求データがありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">請求番号</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">状態</th>
                          <th className="pb-2 text-right text-xs font-medium text-slate-500">金額（税込）</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">請求日</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">支払期限</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {project.invoices.map((inv: any) => (
                          <tr key={inv.id}>
                            <td className="py-2 text-slate-500">{inv.invoiceNumber}</td>
                            <td className="py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(inv.status)}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-2 text-right text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                            <td className="py-2 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                            <td className="py-2 text-slate-500">{formatDate(inv.dueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Budget Tab */}
            {activeTab === 'budget' && (() => {
              const BUDGET_CATEGORIES = ['労務費', '材料費', '外注費', '経費', 'その他']
              const projectOrders: any[] = project.orders || []

              // Sum of orders per budget category (using order.totalAmount for actual costs)
              const actualByCat: Record<string, number> = {}
              projectOrders.forEach((o: any) => {
                // We can't map orders to budget category directly, so show total orders as combined actual
              })
              const totalOrdersAmount = projectOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0)

              const totalBudgetAmount = budgets.reduce((s: number, b: any) => s + b.amount, 0)
              const totalActual = totalOrdersAmount
              const totalDiff = totalBudgetAmount - totalActual
              const totalRate = totalBudgetAmount > 0 ? Math.round((totalActual / totalBudgetAmount) * 100) : 0

              const getRateColor = (rate: number) => {
                if (rate < 80) return 'text-green-600 bg-green-50'
                if (rate <= 100) return 'text-yellow-700 bg-yellow-50'
                return 'text-red-700 bg-red-50'
              }

              const handleAddBudget = async (e: React.FormEvent) => {
                e.preventDefault()
                setBudgetSaving(true)
                setBudgetError('')
                try {
                  const res = await fetch(`/api/projects/${params.id}/budgets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      category: budgetForm.category,
                      description: budgetForm.description || null,
                      amount: parseFloat(budgetForm.amount) || 0,
                    }),
                  })
                  if (!res.ok) { setBudgetError('保存に失敗しました'); return }
                  const created = await res.json()
                  setBudgets(prev => [...prev, created])
                  setShowBudgetModal(false)
                  setBudgetForm({ category: '労務費', description: '', amount: '' })
                } finally {
                  setBudgetSaving(false)
                }
              }

              const handleDeleteBudget = async (id: string) => {
                if (!confirm('この予算を削除しますか？')) return
                await fetch(`/api/projects/${params.id}/budgets/${id}`, { method: 'DELETE' })
                setBudgets(prev => prev.filter(b => b.id !== id))
              }

              const handleInlineAmountSave = async (id: string) => {
                const res = await fetch(`/api/projects/${params.id}/budgets/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ amount: parseFloat(editingBudgetAmount) || 0 }),
                })
                if (res.ok) {
                  const updated = await res.json()
                  setBudgets(prev => prev.map(b => b.id === id ? updated : b))
                }
                setEditingBudgetId(null)
              }

              return (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">予算管理</h3>
                    <button
                      onClick={() => { setShowBudgetModal(true); setBudgetError('') }}
                      className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" /> 予算を追加
                    </button>
                  </div>

                  {budgetLoading ? (
                    <p className="text-slate-400 text-sm">読み込み中...</p>
                  ) : budgets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <BarChart2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">予算データがありません</p>
                      <button
                        onClick={() => { setShowBudgetModal(true); setBudgetError('') }}
                        className="mt-3 text-sm text-blue-600 hover:underline"
                      >予算を追加する</button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="pb-2 text-left text-xs font-medium text-slate-500">カテゴリ</th>
                            <th className="pb-2 text-left text-xs font-medium text-slate-500">説明</th>
                            <th className="pb-2 text-right text-xs font-medium text-slate-500">予算額</th>
                            <th className="pb-2 text-right text-xs font-medium text-slate-500">実績額</th>
                            <th className="pb-2 text-right text-xs font-medium text-slate-500">差異</th>
                            <th className="pb-2 text-center text-xs font-medium text-slate-500">消化率</th>
                            <th className="pb-2 w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {budgets.map((b: any) => {
                            const actual = totalBudgetAmount > 0 ? (b.amount / totalBudgetAmount) * totalActual : 0
                            const diff = b.amount - actual
                            const rate = b.amount > 0 ? Math.round((actual / b.amount) * 100) : 0
                            return (
                              <tr key={b.id} className="hover:bg-slate-50">
                                <td className="py-2 text-slate-900 font-medium">{b.category}</td>
                                <td className="py-2 text-slate-500 text-xs">{b.description || '-'}</td>
                                <td className="py-2 text-right text-slate-900">
                                  {editingBudgetId === b.id ? (
                                    <input
                                      type="number"
                                      value={editingBudgetAmount}
                                      onChange={e => setEditingBudgetAmount(e.target.value)}
                                      onBlur={() => handleInlineAmountSave(b.id)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleInlineAmountSave(b.id); if (e.key === 'Escape') setEditingBudgetId(null) }}
                                      className="w-28 text-right border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:text-blue-600 hover:underline"
                                      onClick={() => { setEditingBudgetId(b.id); setEditingBudgetAmount(String(b.amount)) }}
                                    >
                                      {formatCurrency(b.amount)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-right text-slate-700">{formatCurrency(Math.round(actual))}</td>
                                <td className={`py-2 text-right font-medium ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {diff < 0 ? '-' : '+'}{formatCurrency(Math.abs(Math.round(diff)))}
                                </td>
                                <td className="py-2 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRateColor(rate)}`}>
                                    {rate}%
                                  </span>
                                </td>
                                <td className="py-2">
                                  <button onClick={() => handleDeleteBudget(b.id)} className="text-slate-300 hover:text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 font-semibold">
                            <td className="pt-2 text-slate-900" colSpan={2}>合計</td>
                            <td className="pt-2 text-right text-slate-900">{formatCurrency(totalBudgetAmount)}</td>
                            <td className="pt-2 text-right text-slate-700">{formatCurrency(totalActual)}</td>
                            <td className={`pt-2 text-right ${totalDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {totalDiff < 0 ? '-' : '+'}{formatCurrency(Math.abs(totalDiff))}
                            </td>
                            <td className="pt-2 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRateColor(totalRate)}`}>
                                {totalRate}%
                              </span>
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Add Budget Modal */}
                  {showBudgetModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                          <h2 className="font-semibold text-slate-900">予算を追加</h2>
                          <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <form onSubmit={handleAddBudget}>
                          <div className="px-6 py-4 space-y-4">
                            {budgetError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{budgetError}</p>}
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ <span className="text-red-500">*</span></label>
                              <select
                                value={budgetForm.category}
                                onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {['労務費', '材料費', '外注費', '経費', 'その他'].map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
                              <input
                                type="text"
                                value={budgetForm.description}
                                onChange={e => setBudgetForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="任意の説明"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">予算額 <span className="text-red-500">*</span></label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={budgetForm.amount}
                                onChange={e => setBudgetForm(f => ({ ...f, amount: e.target.value }))}
                                required
                                placeholder="0"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowBudgetModal(false)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">キャンセル</button>
                            <button type="submit" disabled={budgetSaving}
                              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                              {budgetSaving ? '保存中...' : '追加する'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Costs Tab */}
            {activeTab === 'costs' && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">原価管理</h3>
                <p className="text-slate-500 text-sm mb-2">詳細な予算管理は「予算管理」タブをご利用ください。</p>
                {(() => {
                  const projectOrders: any[] = project.orders || []
                  const totalOrdered = projectOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0)
                  const contractAmount = project.contractAmount || 0
                  const costRate = contractAmount > 0 ? Math.round((totalOrdered / contractAmount) * 100) : null
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-500 mb-1">契約金額</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(contractAmount)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-500 mb-1">発注累計（税込）</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(totalOrdered)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-500 mb-1">原価消化率</p>
                        <p className={`text-lg font-bold ${costRate !== null && costRate > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {costRate !== null ? `${costRate}%` : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Defects Tab */}
            {activeTab === 'defects' && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">是正事項</h3>
                {!project.defects?.length ? (
                  <p className="text-slate-500 text-sm">是正事項がありません</p>
                ) : (
                  <div className="space-y-3">
                    {project.defects.map((d: any) => (
                      <div key={d.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 text-sm">{d.content}</p>
                            {d.location && <p className="text-xs text-slate-500 mt-0.5">場所: {d.location}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${getStatusColor(d.status)}`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {d.assignee && <span>担当: {d.assignee.name}</span>}
                          {d.dueDate && <span>期限: {formatDate(d.dueDate)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (() => {
              // Build company list with counts
              const companyCounts: Record<string, number> = {}
              members.forEach((m: any) => {
                const co = m.user.company?.name || '不明'
                companyCounts[co] = (companyCounts[co] || 0) + 1
              })

              const filteredMembers = members.filter((m: any) => {
                if (memberCompanyFilter && m.user.company?.name !== memberCompanyFilter) return false
                if (memberRoleFilter && m.memberRole !== memberRoleFilter) return false
                if (memberSearch) {
                  const q = memberSearch.toLowerCase()
                  const name = (m.user.name || '').toLowerCase()
                  const company = (m.user.company?.name || '').toLowerCase()
                  const role = (m.memberRole || '').toLowerCase()
                  if (!name.includes(q) && !company.includes(q) && !role.includes(q)) return false
                }
                return true
              })

              const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500']
              const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

              return (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">メンバー（{members.length}名）</h3>
                    <button
                      onClick={() => setAddingMember(!addingMember)}
                      className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" /> 追加
                    </button>
                  </div>

                  {addingMember && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex flex-wrap gap-3 items-end">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">ユーザー</label>
                        <select value={newMemberUserId} onChange={e => setNewMemberUserId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                          <option value="">選択</option>
                          {allUsers.filter(u => !members.find((m: any) => m.userId === u.id)).map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">役割</label>
                        <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                          {PROJECT_ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={handleAddMember} disabled={!newMemberUserId} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">追加</button>
                      <button onClick={() => setAddingMember(false)} className="text-slate-500 text-sm hover:text-slate-700">キャンセル</button>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {/* Left sidebar: company filter */}
                    <div className="w-44 flex-shrink-0">
                      <button
                        onClick={() => setMemberCompanyFilter('')}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm mb-0.5 ${!memberCompanyFilter ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        すべての会社 ({members.length})
                      </button>
                      {Object.entries(companyCounts).sort((a, b) => b[1] - a[1]).map(([co, cnt]) => (
                        <button
                          key={co}
                          onClick={() => setMemberCompanyFilter(co === memberCompanyFilter ? '' : co)}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm mb-0.5 truncate ${memberCompanyFilter === co ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {co} ({cnt})
                        </button>
                      ))}
                    </div>

                    {/* Right: filter + table */}
                    <div className="flex-1 min-w-0">
                      {/* Filter row */}
                      <div className="flex items-center gap-2 mb-3">
                        <select
                          value={memberRoleFilter}
                          onChange={e => setMemberRoleFilter(e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600"
                        >
                          <option value="">全ての種類</option>
                          {Array.from(new Set(members.map((m: any) => m.memberRole))).map((r: any) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <div className="flex flex-1 items-center border border-slate-200 rounded overflow-hidden">
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={e => setMemberSearch(e.target.value)}
                            placeholder="氏名・職種・会社名"
                            className="flex-1 px-3 py-1.5 text-xs outline-none"
                          />
                        </div>
                        <button className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-slate-800">検索</button>
                      </div>

                      {/* Table */}
                      {filteredMembers.length === 0 ? (
                        <p className="text-slate-500 text-sm">関係者が登録されていません</p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[1fr_1fr_100px_120px_120px_80px_80px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                            <span>氏名</span>
                            <span>所属会社</span>
                            <span>権限</span>
                            <span>ラベル</span>
                            <span>電話番号</span>
                            <span>職種</span>
                            <span></span>
                          </div>
                          {filteredMembers.map((m: any) => {
                            const role = m.memberRole || '一般'
                            const roleBadgeColor =
                              role === '管理者' ? 'bg-purple-100 text-purple-700' :
                              role === 'メンバー' ? 'bg-blue-100 text-blue-700' :
                              role === '閲覧のみ' ? 'bg-slate-100 text-slate-600' :
                              role === '協力会社' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            return (
                            <div key={m.id} className="grid grid-cols-[1fr_1fr_100px_120px_120px_80px_80px] gap-2 px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 items-center">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(m.user.name)}`}>
                                  {m.user.name[0]}
                                </div>
                                <span className="text-sm text-slate-900 truncate">{m.user.name}</span>
                              </div>
                              <span className="text-xs text-slate-600 truncate">{m.user.company?.name || '-'}</span>
                              <div className="flex flex-col gap-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium inline-block ${roleBadgeColor}`}>{role}</span>
                                <select
                                  value={role}
                                  onChange={e => handleUpdateMemberRole(m.id, e.target.value)}
                                  className="text-xs text-slate-600 border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {PROJECT_ROLES.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {m.labels && m.labels.split(',').filter(Boolean).map((label: string) => (
                                  <span key={label} className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{label.trim()}</span>
                                ))}
                              </div>
                              <span className="text-xs text-slate-500">{m.user.phone || '-'}</span>
                              <span className="text-xs text-slate-500">{m.user.jobType || '-'}</span>
                              <button onClick={() => handleRemoveMember(m.userId)} className="text-slate-300 hover:text-red-500 justify-self-end">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Old Schedule Tab */}
            {activeTab === 'old-schedule' && (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">旧工程表はありません</p>
              </div>
            )}

            {/* Estimates Tab */}
            {activeTab === 'estimates' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-700">見積一覧</h3>
                  <a href="/estimates" className="text-xs text-blue-600 hover:underline">見積管理ページへ</a>
                </div>
                {estimates.length === 0 ? (
                  <p className="text-slate-500 text-sm">見積データがありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">見積番号</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">状態</th>
                          <th className="pb-2 text-right text-xs font-medium text-slate-500">金額（税込）</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">見積日</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">有効期限</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {estimates.map((est: any) => (
                          <tr key={est.id}>
                            <td className="py-2 text-slate-500">{est.estimateNumber}</td>
                            <td className="py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(est.status)}`}>
                                {est.status}
                              </span>
                            </td>
                            <td className="py-2 text-right text-slate-900">{formatCurrency(est.totalAmount)}</td>
                            <td className="py-2 text-slate-500">{formatDate(est.estimateDate)}</td>
                            <td className="py-2 text-slate-500">{formatDate(est.validUntil)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-700">入退場記録</h3>
                  <a href="/attendance" className="text-xs text-blue-600 hover:underline">入退場管理ページへ</a>
                </div>
                {attendance.length === 0 ? (
                  <p className="text-slate-500 text-sm">入退場記録がありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">作業日</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">氏名</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">所属</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">入場</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">退場</th>
                          <th className="pb-2 text-left text-xs font-medium text-slate-500">作業内容</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {attendance.map((a: any) => (
                          <tr key={a.id}>
                            <td className="py-2 text-slate-500">{formatDate(a.workDate)}</td>
                            <td className="py-2 text-slate-900">{a.workerName}</td>
                            <td className="py-2 text-slate-500">{a.company || '-'}</td>
                            <td className="py-2 text-slate-500">{a.entryTime || '-'}</td>
                            <td className="py-2 text-slate-500">{a.exitTime || '-'}</td>
                            <td className="py-2 text-slate-500 max-w-xs truncate">{a.workContent || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Work Reports Tab */}
            {activeTab === 'work-reports' && (() => {
              const filteredReports = workReports.filter((r: any) => {
                if (workReportLocationFilter && r.location !== workReportLocationFilter) return false
                if (workReportDateFilter && !r.reportDate?.startsWith(workReportDateFilter)) return false
                return true
              })

              return (
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                      <FileText className="w-3.5 h-3.5" />報告を管理する
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setWorkReportForm({ location: '', reportDate: new Date().toISOString().split('T')[0], content: '' })
                          setShowWorkReportModal(true)
                        }}
                        className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" /> 報告を追加
                      </button>
                      <button className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:border-slate-400 hover:bg-slate-50">
                        Excel出力
                      </button>
                    </div>
                  </div>

                  {/* Filter row */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-xs text-slate-500">絞り込み：</span>
                    <select
                      value={workReportLocationFilter}
                      onChange={e => setWorkReportLocationFilter(e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                    >
                      <option value="">報告種別</option>
                      <option value="初回報告">初回報告</option>
                      <option value="入居初期対応報告">入居初期対応報告</option>
                      <option value="日報">日報</option>
                      <option value="超出勤">超出勤</option>
                      <option value="定期点検">定期点検</option>
                    </select>
                    <input type="date" value={workReportDateFilter} onChange={e => setWorkReportDateFilter(e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-700" />
                  </div>

                  {/* Count */}
                  <p className="text-xs text-slate-500 mb-3">
                    全{workReports.length}件中 {filteredReports.length > 0 ? `1〜${filteredReports.length}件` : '0件'}を表示中
                  </p>

                  {/* Column headers */}
                  {filteredReports.length > 0 && (
                    <div className="grid grid-cols-[180px_220px_1fr] gap-4 px-3 py-2 border-b border-slate-200 text-xs font-medium text-slate-500">
                      <span>報告対象</span>
                      <span>報告者</span>
                      <span>報告内容</span>
                    </div>
                  )}

                  {filteredReports.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">報告がありません</p>
                  ) : (
                    <div>
                      {filteredReports.map((report: any) => {
                        const photoIdsParsed: string[] = (() => {
                          try { return JSON.parse(report.photoIds || '[]') } catch { return [] }
                        })()
                        const contentItems = (report.content || '').split('\n').filter(Boolean)
                        const isExpanded = expandedWorkReport === report.id
                        return (
                          <div key={report.id} className="grid grid-cols-[180px_220px_1fr] gap-4 px-3 py-4 border-b border-slate-100 hover:bg-slate-50 items-start">
                            {/* 報告対象 */}
                            <div>
                              <p className="text-sm text-slate-900 font-medium">{report.project?.name || project.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{report.location || '-'}</p>
                            </div>

                            {/* 報告者 */}
                            <div className="space-y-0.5">
                              <p className="text-xs text-slate-500">日報</p>
                              <p className="text-sm text-slate-800">
                                {report.reporter?.name || '-'}
                                {report.reporter?.company?.name && (
                                  <span className="text-slate-500">（{report.reporter.company.name}）</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(report.reportDate || report.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>

                            {/* 報告内容 */}
                            <div>
                              {contentItems.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs text-slate-500 mb-1">報告内容</p>
                                  <ul className="space-y-0.5">
                                    {contentItems.map((item: string, idx: number) => (
                                      <li key={idx} className="text-sm text-slate-700">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {photoIdsParsed.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs text-slate-500 mb-1">報告内の写真</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {photoIdsParsed.map((photoId: string) => (
                                      <div key={photoId} className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                                        <Camera className="w-4 h-4 text-slate-300" />
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">合計 {photoIdsParsed.length}枚</p>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-1">
                                {photoIdsParsed.length > 0 && (
                                  <button
                                    onClick={() => window.open(`/photos/album/print?ids=${photoIdsParsed.join(',')}`, '_blank')}
                                    className="text-xs text-slate-600 border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-50"
                                  >写真台帳を作成</button>
                                )}
                                <button
                                  onClick={() => setExpandedWorkReport(isExpanded ? null : report.id)}
                                  className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1 rounded hover:bg-blue-50"
                                >{isExpanded ? '閉じる' : '詳細'}</button>
                              </div>

                              {isExpanded && (
                                <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-500">
                                  <p>作成日時: {new Date(report.createdAt).toLocaleString('ja-JP')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">日報一覧</h3>
                {!project.reports?.length ? (
                  <p className="text-slate-500 text-sm">日報がありません</p>
                ) : (
                  <div className="space-y-3">
                    {project.reports.map((report: any) => (
                      <div key={report.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <span className="text-xl">{getWeatherIcon(report.weather)}</span>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{formatDate(report.workDate)}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">{report.content}</p>
                              <p className="text-xs text-slate-400">作成者: {report.reporter?.name}</p>
                            </div>
                          </div>
                          {expandedReport === report.id
                            ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          }
                        </button>
                        {expandedReport === report.id && (
                          <div className="border-t border-slate-100 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">作業内容</h4>
                                <p className="text-sm text-slate-900 whitespace-pre-wrap">{report.content}</p>
                              </div>
                              <div className="space-y-2">
                                {report.workers != null && (
                                  <div>
                                    <h4 className="text-xs font-medium text-slate-500 uppercase mb-0.5">作業員数</h4>
                                    <p className="text-sm text-slate-900">{report.workers}名</p>
                                  </div>
                                )}
                                {report.issues && (
                                  <div>
                                    <h4 className="text-xs font-medium text-slate-500 uppercase mb-0.5">問題・課題</h4>
                                    <p className="text-sm text-red-600">{report.issues}</p>
                                  </div>
                                )}
                                {report.nextPlan && (
                                  <div>
                                    <h4 className="text-xs font-medium text-slate-500 uppercase mb-0.5">翌日の予定</h4>
                                    <p className="text-sm text-slate-900">{report.nextPlan}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Settlement Tab */}
            {activeTab === 'settlement' && (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm mb-4">精算管理ページで詳細を確認できます。</p>
                <Link
                  href={`/projects/${params.id}/settlement`}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  <Receipt className="w-4 h-4" />
                  精算管理を開く
                </Link>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">操作履歴</h3>
                {auditLogs.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">履歴がありません</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-900">{log.userName}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{log.action}</span>
                            <span className="text-xs text-slate-400">{log.target}</span>
                          </div>
                          {log.detail && <p className="text-xs text-slate-500 mt-0.5">{log.detail}</p>}
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('ja-JP', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ledger' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">施工体制台帳</h3>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${params.id}/ledger/print`}
                      target="_blank"
                      className="flex items-center gap-1.5 border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      <FileText className="w-4 h-4" /> 印刷
                    </Link>
                    <button
                      onClick={() => {
                        setEditingLedger(null)
                        setLedgerForm({ contractorName: '', contractorType: '元請', workType: '', contractAmount: '', startDate: '', endDate: '', supervisorName: '', licenseNumber: '' })
                        setShowLedgerModal(true)
                      }}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" /> 追加
                    </button>
                  </div>
                </div>

                {ledgerLoading ? (
                  <p className="text-slate-400 text-sm text-center py-8">読み込み中...</p>
                ) : ledgerEntries.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">登録された業者がありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 w-8"></th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">区分</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">業者名</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">工事種別</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">現場代理人</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">工期</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerEntries.map((entry: any) => {
                          const indentMap: Record<string, number> = { '元請': 0, '一次下請': 1, '二次下請': 2, '三次下請': 3 }
                          const indent = (indentMap[entry.contractorType] ?? 0) * 16
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50 group">
                              <td className="px-3 py-2">
                                <div style={{ width: indent + 8, height: 8, borderLeft: indent > 0 ? '2px solid #cbd5e1' : 'none', borderBottom: indent > 0 ? '2px solid #cbd5e1' : 'none', marginLeft: Math.max(0, indent - 8) }} />
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${entry.contractorType === '元請' ? 'bg-blue-100 text-blue-700' : entry.contractorType === '一次下請' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {entry.contractorType}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-800">{entry.contractorName}</td>
                              <td className="px-3 py-2 text-slate-600">{entry.workType}</td>
                              <td className="px-3 py-2 text-slate-600">{entry.supervisorName || '-'}</td>
                              <td className="px-3 py-2 text-slate-500 text-xs">
                                {entry.startDate ? new Date(entry.startDate).toLocaleDateString('ja-JP') : '-'}
                                {entry.endDate ? ` 〜 ${new Date(entry.endDate).toLocaleDateString('ja-JP')}` : ''}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingLedger(entry)
                                      setLedgerForm({
                                        contractorName: entry.contractorName,
                                        contractorType: entry.contractorType,
                                        workType: entry.workType,
                                        contractAmount: entry.contractAmount ? String(entry.contractAmount) : '',
                                        startDate: entry.startDate ? entry.startDate.split('T')[0] : '',
                                        endDate: entry.endDate ? entry.endDate.split('T')[0] : '',
                                        supervisorName: entry.supervisorName || '',
                                        licenseNumber: entry.licenseNumber || '',
                                      })
                                      setShowLedgerModal(true)
                                    }}
                                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`「${entry.contractorName}」を削除しますか？`)) return
                                      await fetch(`/api/projects/${params.id}/ledger/${entry.id}`, { method: 'DELETE' })
                                      setLedgerEntries(prev => prev.filter(e => e.id !== entry.id))
                                    }}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'completion' && (
              <div>
                {!['完了', '引渡済'].includes(project.status) ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    完了チェックリストは案件ステータスが「完了」または「引渡済」の場合に表示されます。
                  </div>
                ) : completionLoading ? (
                  <p className="text-center py-10 text-slate-400 text-sm">読み込み中...</p>
                ) : completion ? (() => {
                  const checks = [
                    { key: 'finalInspectionDone', label: '最終検査完了' },
                    { key: 'customerAccepted', label: '顧客承認取得' },
                    { key: 'invoiceIssued', label: '請求書発行済' },
                    { key: 'documentsArchived', label: '書類整理完了' },
                  ] as const
                  const doneCount = checks.filter(c => completion[c.key]).length
                  const allDone = doneCount === 4
                  return (
                    <div className="max-w-lg space-y-5">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-700">完了チェックリスト</h3>
                        <span className={`ml-auto text-sm font-medium px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {doneCount}/4 完了
                        </span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {checks.map((c) => (
                          <label key={c.key} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!completion[c.key]}
                              onChange={(e) => handleCompletionToggle(c.key, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`text-sm font-medium ${completion[c.key] ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {c.label}
                            </span>
                            {completion[c.key] && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                          </label>
                        ))}
                      </div>

                      {completion.completedAt ? (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700 font-medium">
                            完了確定済み（{new Date(completion.completedAt).toLocaleDateString('ja-JP')}）
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={handleConfirmComplete}
                          disabled={!allDone || completionConfirming}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          {completionConfirming ? '処理中...' : '完了確定（担当者に通知）'}
                        </button>
                      )}
                    </div>
                  )
                })() : null}
              </div>
            )}

            {activeTab === 'completion-docs' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">完成図書一覧</h3>
                  <button
                    onClick={() => { setCompletionDocForm({ category: '竣工図面', name: '', fileUrl: '', fileName: '', notes: '' }); setShowCompletionDocModal(true) }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 書類を追加
                  </button>
                </div>
                {completionDocsLoading ? (
                  <p className="text-center py-10 text-slate-400 text-sm">読み込み中...</p>
                ) : completionDocs.length === 0 ? (
                  <p className="text-center py-10 text-slate-400 text-sm">完成図書がありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">カテゴリ</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">ファイル名</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">アップロード者</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">日時</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {completionDocs.map((doc: any) => (
                          <tr key={doc.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{doc.category}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">{doc.fileName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{doc.uploader?.name || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-xs">{new Date(doc.createdAt).toLocaleDateString('ja-JP')}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={async () => {
                                    if (!confirm('削除しますか？')) return
                                    const res = await fetch(`/api/projects/${params.id}/completion-docs/${doc.id}`, { method: 'DELETE' })
                                    if (res.ok) setCompletionDocs(prev => prev.filter(d => d.id !== doc.id))
                                  }}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            )}

            {activeTab === 'risks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">リスク管理</h3>
                  <button
                    onClick={() => {
                      setEditingRisk(null)
                      setRiskForm({ title: '', description: '', probability: 3, impact: 3, category: '', status: '未対応', mitigation: '', owner: '' })
                      setShowRiskModal(true)
                    }}
                    className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    リスクを追加
                  </button>
                </div>
                {risksLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                ) : risks.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">リスクが登録されていません</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left pb-2 text-xs font-medium text-slate-500">リスク名</th>
                          <th className="text-left pb-2 text-xs font-medium text-slate-500">カテゴリ</th>
                          <th className="text-center pb-2 text-xs font-medium text-slate-500">発生確率</th>
                          <th className="text-center pb-2 text-xs font-medium text-slate-500">影響度</th>
                          <th className="text-center pb-2 text-xs font-medium text-slate-500">スコア</th>
                          <th className="text-left pb-2 text-xs font-medium text-slate-500">ステータス</th>
                          <th className="text-left pb-2 text-xs font-medium text-slate-500">担当</th>
                          <th className="pb-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {risks.map(risk => {
                          const scoreColor = risk.riskScore >= 15 ? 'bg-red-100 text-red-700' : risk.riskScore >= 8 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          return (
                            <tr key={risk.id} className="hover:bg-slate-50">
                              <td className="py-2.5 pr-3">
                                <p className="font-medium text-slate-800">{risk.title}</p>
                                {risk.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{risk.description}</p>}
                              </td>
                              <td className="py-2.5 pr-3 text-slate-500">{risk.category || '-'}</td>
                              <td className="py-2.5 pr-3 text-center">{risk.probability}</td>
                              <td className="py-2.5 pr-3 text-center">{risk.impact}</td>
                              <td className="py-2.5 pr-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${scoreColor}`}>{risk.riskScore}</span>
                              </td>
                              <td className="py-2.5 pr-3 text-slate-600">{risk.status}</td>
                              <td className="py-2.5 pr-3 text-slate-500">{risk.owner || '-'}</td>
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingRisk(risk)
                                      setRiskForm({
                                        title: risk.title,
                                        description: risk.description || '',
                                        probability: risk.probability,
                                        impact: risk.impact,
                                        category: risk.category || '',
                                        status: risk.status,
                                        mitigation: risk.mitigation || '',
                                        owner: risk.owner || '',
                                      })
                                      setShowRiskModal(true)
                                    }}
                                    className="text-slate-400 hover:text-blue-600"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('このリスクを削除しますか？')) return
                                      const res = await fetch(`/api/projects/${params.id}/risks/${risk.id}`, { method: 'DELETE' })
                                      if (res.ok) setRisks(prev => prev.filter(r => r.id !== risk.id))
                                    }}
                                    className="text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'milestones' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-slate-700">マイルストーン</h3>
                  <button
                    onClick={() => {
                      setMilestoneForm({ title: '', description: '', dueDate: '' })
                      setShowMilestoneModal(true)
                    }}
                    className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    マイルストーンを追加
                  </button>
                </div>
                {milestonesLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                ) : milestones.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">マイルストーンが登録されていません</div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                    <div className="space-y-4">
                      {milestones.map((ms) => {
                        const now = new Date()
                        const due = new Date(ms.dueDate)
                        const isOverdue = ms.status !== '完了' && due < now
                        const statusColor = ms.status === '完了'
                          ? 'bg-green-100 text-green-700'
                          : isOverdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        const dotColor = ms.status === '完了'
                          ? 'bg-green-500'
                          : isOverdue
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                        return (
                          <div key={ms.id} className="relative pl-10">
                            <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-white ${dotColor}`} />
                            <div className={`bg-white rounded-lg border p-4 ${isOverdue ? 'border-red-200' : 'border-slate-200'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-slate-800'}`}>{ms.title}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{isOverdue && ms.status !== '完了' ? '遅延' : ms.status}</span>
                                  </div>
                                  <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                                    {new Date(ms.dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </p>
                                  {ms.description && <p className="text-xs text-slate-500 mt-1">{ms.description}</p>}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={async () => {
                                      const newStatus = ms.status === '完了' ? '未完了' : '完了'
                                      const res = await fetch(`/api/projects/${params.id}/milestones/${ms.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: newStatus, completedAt: newStatus === '完了' ? new Date().toISOString() : null }),
                                      })
                                      if (res.ok) {
                                        const updated = await res.json()
                                        setMilestones(prev => prev.map(m => m.id === ms.id ? updated : m))
                                      }
                                    }}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${ms.status === '完了' ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                  >
                                    {ms.status === '完了' ? '完了済み' : '完了'}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('このマイルストーンを削除しますか？')) return
                                      const res = await fetch(`/api/projects/${params.id}/milestones/${ms.id}`, { method: 'DELETE' })
                                      if (res.ok) setMilestones(prev => prev.filter(m => m.id !== ms.id))
                                    }}
                                    className="text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">マイルストーンを追加</h2>
              <button onClick={() => setShowMilestoneModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setMilestoneSaving(true)
                try {
                  const res = await fetch(`/api/projects/${params.id}/milestones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(milestoneForm),
                  })
                  if (res.ok) {
                    const created = await res.json()
                    setMilestones(prev => [...prev, created].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()))
                    setShowMilestoneModal(false)
                  }
                } finally {
                  setMilestoneSaving(false)
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
                <input
                  required
                  value={milestoneForm.title}
                  onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="マイルストーン名"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={milestoneForm.description}
                  onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">期日 <span className="text-red-500">*</span></label>
                <input
                  required
                  type="date"
                  value={milestoneForm.dueDate}
                  onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
                  キャンセル
                </button>
                <button type="submit" disabled={milestoneSaving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {milestoneSaving ? '保存中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRiskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{editingRisk ? 'リスクを編集' : 'リスクを追加'}</h2>
              <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setRiskSaving(true)
                try {
                  if (editingRisk) {
                    const res = await fetch(`/api/projects/${params.id}/risks/${editingRisk.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(riskForm),
                    })
                    if (res.ok) {
                      const updated = await res.json()
                      setRisks(prev => prev.map(r => r.id === editingRisk.id ? updated : r))
                    }
                  } else {
                    const res = await fetch(`/api/projects/${params.id}/risks`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(riskForm),
                    })
                    if (res.ok) {
                      const created = await res.json()
                      setRisks(prev => [created, ...prev])
                    }
                  }
                  setShowRiskModal(false)
                } finally {
                  setRiskSaving(false)
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">リスク名 <span className="text-red-500">*</span></label>
                <input
                  required
                  value={riskForm.title}
                  onChange={e => setRiskForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="リスク名を入力"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={riskForm.description}
                  onChange={e => setRiskForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">カテゴリ</label>
                  <select
                    value={riskForm.category}
                    onChange={e => setRiskForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未選択</option>
                    {['工程', '安全', '品質', 'コスト', '天候'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={riskForm.status}
                    onChange={e => setRiskForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['未対応', '対応中', '対応済', '受容'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">発生確率 (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={riskForm.probability}
                    onChange={e => setRiskForm(f => ({ ...f, probability: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">影響度 (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={riskForm.impact}
                    onChange={e => setRiskForm(f => ({ ...f, impact: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                スコア: <span className={`font-bold ${riskForm.probability * riskForm.impact >= 15 ? 'text-red-600' : riskForm.probability * riskForm.impact >= 8 ? 'text-orange-600' : 'text-green-600'}`}>{riskForm.probability * riskForm.impact}</span>
                {riskForm.probability * riskForm.impact >= 15 ? ' (高リスク)' : riskForm.probability * riskForm.impact >= 8 ? ' (中リスク)' : ' (低リスク)'}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">対応策</label>
                <textarea
                  value={riskForm.mitigation}
                  onChange={e => setRiskForm(f => ({ ...f, mitigation: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="リスク低減のための対応策"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">担当者</label>
                <input
                  value={riskForm.owner}
                  onChange={e => setRiskForm(f => ({ ...f, owner: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="担当者名"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRiskModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={riskSaving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {riskSaving ? '保存中...' : (editingRisk ? '更新' : '追加')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Doc Modal */}
      {showCompletionDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">書類を追加</h2>
              <button onClick={() => setShowCompletionDocModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setCompletionDocSaving(true)
                try {
                  const res = await fetch(`/api/projects/${params.id}/completion-docs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(completionDocForm),
                  })
                  if (res.ok) {
                    const created = await res.json()
                    setCompletionDocs(prev => [created, ...prev])
                    setShowCompletionDocModal(false)
                  }
                } finally {
                  setCompletionDocSaving(false)
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">カテゴリ</label>
                <select
                  value={completionDocForm.category}
                  onChange={e => setCompletionDocForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['竣工図面', '検査記録', '保証書', '取扱説明書', 'その他'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">書類名</label>
                <input
                  required
                  value={completionDocForm.name}
                  onChange={e => setCompletionDocForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：竣工図面一式"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ファイル名</label>
                <input
                  required
                  value={completionDocForm.fileName}
                  onChange={e => setCompletionDocForm(f => ({ ...f, fileName: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：drawing_v1.pdf"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ファイルURL</label>
                <input
                  required
                  type="url"
                  value={completionDocForm.fileUrl}
                  onChange={e => setCompletionDocForm(f => ({ ...f, fileUrl: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">備考</label>
                <input
                  value={completionDocForm.notes}
                  onChange={e => setCompletionDocForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="任意"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCompletionDocModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">キャンセル</button>
                <button type="submit" disabled={completionDocSaving} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg font-medium">
                  {completionDocSaving ? '保存中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{editingLedger ? '業者情報を編集' : '業者を追加'}</h2>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setLedgerSaving(true)
                try {
                  if (editingLedger) {
                    const res = await fetch(`/api/projects/${params.id}/ledger/${editingLedger.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(ledgerForm),
                    })
                    if (res.ok) {
                      const updated = await res.json()
                      setLedgerEntries(prev => prev.map(e => e.id === editingLedger.id ? updated : e))
                    }
                  } else {
                    const res = await fetch(`/api/projects/${params.id}/ledger`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(ledgerForm),
                    })
                    if (res.ok) {
                      const created = await res.json()
                      setLedgerEntries(prev => [...prev, created])
                    }
                  }
                  setShowLedgerModal(false)
                } finally {
                  setLedgerSaving(false)
                }
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">業者名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={ledgerForm.contractorName}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, contractorName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">区分 <span className="text-red-500">*</span></label>
                  <select
                    value={ledgerForm.contractorType}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, contractorType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['元請', '一次下請', '二次下請', '三次下請', 'その他'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">工事種別 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={ledgerForm.workType}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, workType: e.target.value })}
                  placeholder="例：基礎工事"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">現場代理人</label>
                  <input
                    type="text"
                    value={ledgerForm.supervisorName}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, supervisorName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">建設業許可番号</label>
                  <input
                    type="text"
                    value={ledgerForm.licenseNumber}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">請負金額</label>
                <input
                  type="number"
                  value={ledgerForm.contractAmount}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, contractAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工期開始</label>
                  <input
                    type="date"
                    value={ledgerForm.startDate}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工期終了</label>
                  <input
                    type="date"
                    value={ledgerForm.endDate}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={ledgerSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {ledgerSaving ? '保存中...' : (editingLedger ? '更新する' : '追加する')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawing Preview Modal */}
      {previewDrawing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewDrawing(null)}>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">{previewDrawing.name} (v{previewDrawing.version})</span>
              <button onClick={() => setPreviewDrawing(null)} className="text-white hover:text-slate-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <img src={previewDrawing.filePath} alt={previewDrawing.name} className="w-full h-full object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* Add Work Report Modal */}
      {showWorkReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">報告を追加</h2>
              <button onClick={() => setShowWorkReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setWorkReportSaving(true)
                try {
                  const res = await fetch('/api/work-reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      projectId: params.id,
                      location: workReportForm.location,
                      reportDate: workReportForm.reportDate,
                      content: workReportForm.content,
                      photoIds: [],
                    }),
                  })
                  if (res.ok) {
                    const created = await res.json()
                    setWorkReports(prev => [created, ...prev])
                    setShowWorkReportModal(false)
                  }
                } finally {
                  setWorkReportSaving(false)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">場所</label>
                <input
                  type="text"
                  value={workReportForm.location}
                  onChange={e => setWorkReportForm({ ...workReportForm, location: e.target.value })}
                  placeholder="例: 1階 玄関"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">報告日 *</label>
                <input
                  type="date"
                  value={workReportForm.reportDate}
                  onChange={e => setWorkReportForm({ ...workReportForm, reportDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">報告内容 * <span className="text-xs text-slate-400">（改行で項目を区切る）</span></label>
                <textarea
                  value={workReportForm.content}
                  onChange={e => setWorkReportForm({ ...workReportForm, content: e.target.value })}
                  required
                  rows={5}
                  placeholder="例:&#10;コンクリート打設完了&#10;養生シート設置"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={workReportSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {workReportSaving ? '保存中...' : '追加する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWorkReportModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">案件を編集</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件名 *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工種</label>
                  <input
                    type="text"
                    value={editForm.workType}
                    onChange={(e) => setEditForm({ ...editForm, workType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">住所</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">契約金額</label>
                  <input
                    type="number"
                    value={editForm.contractAmount}
                    onChange={(e) => setEditForm({ ...editForm, contractAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">予算原価</label>
                  <input
                    type="number"
                    value={editForm.estimatedCost}
                    onChange={(e) => setEditForm({ ...editForm, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">顧客</label>
                <select
                  value={editForm.customerId}
                  onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <select
                    value={editForm.managerId}
                    onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未選択</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">営業担当</label>
                  <select
                    value={editForm.salesId}
                    onChange={(e) => setEditForm({ ...editForm, salesId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未選択</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">着工日</label>
                  <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">上棟日</label>
                  <input type="date" value={editForm.ridgepoleDate} onChange={(e) => setEditForm({ ...editForm, ridgepoleDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工期終了</label>
                  <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">竣工予定</label>
                  <input type="date" value={editForm.deliveryDate} onChange={(e) => setEditForm({ ...editForm, deliveryDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">物件種類</label>
                  <select value={editForm.propertyType} onChange={(e) => setEditForm({ ...editForm, propertyType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">未選択</option>
                    {['戸建', 'アパート', 'マンション', '店舗', '事務所', '工場', '倉庫', 'その他'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">物名</label>
                  <input type="text" value={editForm.propertyName} onChange={(e) => setEditForm({ ...editForm, propertyName: e.target.value })} placeholder="物件名" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">物名（カナ）</label>
                  <input type="text" value={editForm.propertyNameKana} onChange={(e) => setEditForm({ ...editForm, propertyNameKana: e.target.value })} placeholder="フリガナ" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ラベル</label>
                  <input type="text" value={editForm.labels} onChange={(e) => setEditForm({ ...editForm, labels: e.target.value })} placeholder="カンマ区切りで入力" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {editSaving ? '保存中...' : '更新する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-semibold text-slate-900">施主ポータル共有</h2>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Create new token */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-700">新しいリンクを発行</h3>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ラベル（任意）</label>
                  <input
                    type="text"
                    value={shareLabel}
                    onChange={(e) => setShareLabel(e.target.value)}
                    placeholder="例：施主Aさん用"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">有効期限（任意）</label>
                  <input
                    type="date"
                    value={shareExpiry}
                    onChange={(e) => setShareExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={createShareToken}
                  disabled={shareLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {shareLoading ? '発行中...' : 'リンクを発行する'}
                </button>
              </div>

              {/* Existing tokens */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">発行済みリンク</h3>
                {shareTokens.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">まだリンクがありません</p>
                ) : (
                  <div className="space-y-2">
                    {shareTokens.map((st: any) => (
                      <div key={st.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{st.label || '（ラベルなし）'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              発行日: {new Date(st.createdAt).toLocaleDateString('ja-JP')}
                              {st.expiresAt && (
                                <span className={`ml-2 ${new Date(st.expiresAt) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                                  有効期限: {new Date(st.expiresAt).toLocaleDateString('ja-JP')}
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteShareToken(st.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-600 truncate">
                            {typeof window !== 'undefined' ? `${window.location.origin}/portal/${st.token}` : `/portal/${st.token}`}
                          </code>
                          <button
                            onClick={() => copyShareUrl(st.token)}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                              copiedToken === st.token
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {copiedToken === st.token ? (
                              <><Check className="w-3.5 h-3.5" /> コピーしました</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> コピー</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice generated toast */}
      {invoiceToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <Receipt className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">請求書を作成しました</p>
            <Link href="/invoices" className="text-xs text-green-100 underline hover:text-white">
              {invoiceToast.number} を確認する
            </Link>
          </div>
          <button onClick={() => setInvoiceToast(null)} className="ml-2 text-green-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Apply Template Modal */}
      {showApplyTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">テンプレートから工程を生成</h2>
              <button
                onClick={() => {
                  setShowApplyTemplateModal(false)
                  setApplyTemplateResult(null)
                  setApplyTemplateId('')
                  setApplyStartDate('')
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyTemplateResult ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-slate-800 font-medium">{applyTemplateResult}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    テンプレートを選択 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={applyTemplateId}
                    onChange={e => setApplyTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- テンプレートを選択 --</option>
                    {projectTemplates.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.workType ? ` (${t.workType})` : ''} — {t.scheduleTemplates?.length ?? 0}工程
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    工事開始日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={applyStartDate}
                    onChange={e => setApplyStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {applyTemplateId && (
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                    {(() => {
                      const tpl = projectTemplates.find((t: any) => t.id === applyTemplateId)
                      if (!tpl || !tpl.scheduleTemplates?.length) return <p>工程がありません</p>
                      return (
                        <ul className="space-y-1">
                          {tpl.scheduleTemplates.map((s: any, i: number) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-slate-400 w-4">{i + 1}.</span>
                              <span className="font-medium">{s.name}</span>
                              <span className="text-slate-400">+{s.offsetDays}日〜{s.durationDays}日間</span>
                            </li>
                          ))}
                        </ul>
                      )
                    })()}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleApplyTemplate}
                    disabled={applyingTemplate || !applyTemplateId || !applyStartDate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    {applyingTemplate ? '生成中...' : '工程を生成する'}
                  </button>
                  <button
                    onClick={() => {
                      setShowApplyTemplateModal(false)
                      setApplyTemplateResult(null)
                      setApplyTemplateId('')
                      setApplyStartDate('')
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
