'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Bell,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  MessageSquare,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react'
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils'

const ALL_WIDGETS = [
  { id: 'summary_cards', label: 'サマリーカード（案件・タスク・通知）', defaultEnabled: true },
  { id: 'project_progress', label: '案件進捗リスト', defaultEnabled: true },
  { id: 'recent_activity', label: '最近のアクティビティ', defaultEnabled: true },
  { id: 'schedule_today', label: '本日の工程', defaultEnabled: true },
  { id: 'cost_overview', label: '原価サマリー', defaultEnabled: false },
  { id: 'inspection_status', label: '検査・是正ステータス', defaultEnabled: false },
  { id: 'unread_chat', label: '未読チャット', defaultEnabled: true },
  // Legacy widget IDs kept for backward compatibility
  { id: 'active_projects', label: 'プロジェクトサマリー（旧）', defaultEnabled: false },
  { id: 'recent_schedules', label: '本日の予定（旧）', defaultEnabled: false },
  { id: 'pending_orders', label: '要対応タスク（旧）', defaultEnabled: false },
  { id: 'recent_chats', label: '未読チャット（旧）', defaultEnabled: false },
  { id: 'notifications', label: '通知（旧）', defaultEnabled: false },
  { id: 'weather', label: '天気ウィジェット', defaultEnabled: false },
]

const DEFAULT_WIDGETS = ALL_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id)

interface DashboardClientProps {
  initialWidgets: string[]
  data: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    pendingDefects: number
    invoicedTotal: number
    paidTotal: number
    orderedTotal: number
    approvedOrders: number
    grossProfit: number
    grossProfitRate: number
    totalEstimates: number
    contractedEstimates: number
    orderRate: number
    todaySchedules: any[]
    todayInspections: any[]
    recentChats: { id: string; projectName: string; projectId: string; lastMessage: string; lastSenderName: string; lastAt: string; unreadCount: number }[]
    pendingInspections: number
    pendingOrders: number
    pendingInvoices: number
    pendingEstimates: number
    unreadNotifCount: number
    notifications: any[]
    recentAudit: any[]
    projectRows: any[]
    projects: any[]
    defects: any[]
  }
}

export default function DashboardClient({ initialWidgets, data }: DashboardClientProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  // Resolve initial widget list: server pref > localStorage > defaults
  const resolveInitial = (): string[] => {
    if (initialWidgets.length > 0) return initialWidgets
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('dashboardWidgets') : null
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_WIDGETS
  }

  const [widgets, setWidgets] = useState<string[]>(resolveInitial)
  const [draftWidgets, setDraftWidgets] = useState<string[]>(resolveInitial)
  const [saving, setSaving] = useState(false)

  const openPanel = () => {
    setDraftWidgets([...widgets])
    setPanelOpen(true)
  }

  const toggleWidget = (id: string) => {
    setDraftWidgets(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    )
  }

  const moveUp = (id: string) => {
    setDraftWidgets(prev => {
      const idx = prev.indexOf(id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDown = (id: string) => {
    setDraftWidgets(prev => {
      const idx = prev.indexOf(id)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Persist to localStorage as well as server
      try {
        localStorage.setItem('dashboardWidgets', JSON.stringify(draftWidgets))
      } catch {}
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardWidgets: draftWidgets }),
      })
      setWidgets([...draftWidgets])
      setPanelOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const orderedVisible = widgets.filter(id => ALL_WIDGETS.some(w => w.id === id))

  const renderWidget = (id: string) => {
    const { data: d } = { data }
    switch (id) {
      // New canonical widget IDs (spec Feature 1)
      case 'summary_cards':
        return <ActiveProjectsWidget key={id} data={d} />
      case 'project_progress':
        return (
          <PendingOrdersWidget
            key={id}
            pendingOrders={d.pendingOrders}
            pendingInvoices={d.pendingInvoices}
            pendingEstimates={d.pendingEstimates}
            pendingDefects={d.pendingDefects}
            pendingInspections={d.pendingInspections}
            unreadNotifCount={d.unreadNotifCount}
          />
        )
      case 'recent_activity':
        return d.recentAudit.length > 0 ? <RecentActivityWidget key={id} logs={d.recentAudit} /> : null
      case 'schedule_today':
        return (d.todaySchedules.length > 0 || d.todayInspections.length > 0) ? (
          <RecentSchedulesWidget key={id} schedules={d.todaySchedules} inspections={d.todayInspections} />
        ) : null
      case 'cost_overview':
        return d.projectRows.length > 0 ? <CostOverviewWidget key={id} rows={d.projectRows} /> : null
      case 'inspection_status':
        return <InspectionStatusWidget key={id} pendingDefects={d.pendingDefects} pendingInspections={d.pendingInspections} />
      case 'unread_chat':
        return <UnreadChatsWidget key={id} chats={d.recentChats} />
      // Legacy widget IDs (backward compatibility)
      case 'active_projects':
        return <ActiveProjectsWidget key={id} data={d} />
      case 'recent_schedules':
        return (d.todaySchedules.length > 0 || d.todayInspections.length > 0) ? (
          <RecentSchedulesWidget key={id} schedules={d.todaySchedules} inspections={d.todayInspections} />
        ) : null
      case 'recent_chats':
        return <UnreadChatsWidget key={id} chats={d.recentChats} />
      case 'pending_orders':
        return (
          <PendingOrdersWidget
            key={id}
            pendingOrders={d.pendingOrders}
            pendingInvoices={d.pendingInvoices}
            pendingEstimates={d.pendingEstimates}
            pendingDefects={d.pendingDefects}
            pendingInspections={d.pendingInspections}
            unreadNotifCount={d.unreadNotifCount}
          />
        )
      case 'notifications':
        return <NotificationsWidget key={id} notifications={d.notifications} />
      case 'weather':
        return <WeatherWidget key={id} />
      default:
        return null
    }
  }

  const allDraftOrdered = [
    ...draftWidgets,
    ...ALL_WIDGETS.map(w => w.id).filter(id => !draftWidgets.includes(id)),
  ]

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-6 pt-4 pb-0">
        <div />
        <button
          onClick={openPanel}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors bg-white"
        >
          <Settings className="w-4 h-4" />
          カスタマイズ
        </button>
      </div>

      <div className="p-6 space-y-6">
        {orderedVisible.map(id => renderWidget(id))}

        {/* recent projects always shown below main widgets */}
        <RecentProjectsAndNotifs
          projects={data.projects}
          notifications={data.notifications}
          showNotifications={!orderedVisible.includes('notifications')}
        />

        {data.defects.length > 0 && <DefectsWidget defects={data.defects} />}
      </div>

      {panelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setPanelOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600" />
                <h2 className="font-semibold text-slate-900">ダッシュボードカスタマイズ</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs text-slate-500 mb-3">表示するウィジェットを選択し、順序を変更できます。</p>
              <ul className="space-y-2">
                {allDraftOrdered.map((id, idx) => {
                  const widget = ALL_WIDGETS.find(w => w.id === id)
                  if (!widget) return null
                  const isVisible = draftWidgets.includes(id)
                  const visibleIdx = draftWidgets.indexOf(id)
                  return (
                    <li
                      key={id}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        isVisible ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
                      }`}
                    >
                      <button
                        onClick={() => toggleWidget(id)}
                        className={`flex-shrink-0 transition-colors ${isVisible ? 'text-blue-600 hover:text-blue-700' : 'text-slate-300 hover:text-slate-400'}`}
                        title={isVisible ? '非表示にする' : '表示する'}
                      >
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <span className="flex-1 text-sm text-slate-700">{widget.label}</span>
                      {isVisible && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveUp(id)}
                            disabled={visibleIdx === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveDown(id)}
                            disabled={visibleIdx === draftWidgets.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ActiveProjectsWidget({ data }: { data: DashboardClientProps['data'] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{data.totalProjects}</span>
          </div>
          <p className="text-sm text-slate-500">総案件数</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-100 rounded-lg p-2">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{data.activeProjects}</span>
          </div>
          <p className="text-sm text-slate-500">施工中</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{data.completedProjects}</span>
          </div>
          <p className="text-sm text-slate-500">完工</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-100 rounded-lg p-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{data.pendingDefects}</span>
          </div>
          <p className="text-sm text-slate-500">未対応の是正事項</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">経営サマリー</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-slate-500">売上実績（請求額）</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(data.invoicedTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">入金済: {formatCurrency(data.paidTotal)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <p className="text-xs text-slate-500">原価実績（発注額）</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(data.orderedTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">発注済: {formatCurrency(data.approvedOrders)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-500" />
              <p className="text-xs text-slate-500">粗利</p>
            </div>
            <p className={`text-xl font-bold ${data.grossProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(data.grossProfit)}
            </p>
            <p className="text-xs text-slate-400 mt-1">粗利率: {data.grossProfitRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-slate-500">見積受注率</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{data.orderRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">{data.contractedEstimates} / {data.totalEstimates} 件</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentSchedulesWidget({ schedules, inspections = [] }: { schedules: any[]; inspections?: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">本日の予定</h2>
        </div>
        <Link href="/schedule" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          工程管理へ <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {schedules.map((s: any) => (
          <Link key={`sch-${s.id}`} href={`/projects/${s.project.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{s.name}</p>
              <p className="text-xs text-slate-500">{s.project.name}（{s.project.projectNumber}）</p>
            </div>
            {s.assignee && <span className="text-xs text-slate-400 flex-shrink-0">{s.assignee.name}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
              s.status === '完了' ? 'bg-green-100 text-green-700' :
              s.status === '作業中' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            }`}>{s.status}</span>
          </Link>
        ))}
        {inspections.map((insp: any) => (
          <Link key={`insp-${insp.id}`} href={`/inspections/${insp.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{insp.name}</p>
              <p className="text-xs text-slate-500">
                {insp.project?.name}（{insp.project?.projectNumber}）
                {insp.scheduledDate && ` · ${new Date(insp.scheduledDate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
            {insp.inspector && <span className="text-xs text-slate-400 flex-shrink-0">{insp.inspector.name}</span>}
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-orange-100 text-orange-700">検査</span>
          </Link>
        ))}
        {schedules.length === 0 && inspections.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-500">本日の予定はありません</p>
        )}
      </div>
    </div>
  )
}

function PendingOrdersWidget({
  pendingOrders,
  pendingInvoices,
  pendingEstimates,
  pendingDefects,
  pendingInspections,
  unreadNotifCount,
}: {
  pendingOrders: number
  pendingInvoices: number
  pendingEstimates: number
  pendingDefects: number
  pendingInspections: number
  unreadNotifCount: number
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 p-5 border-b border-slate-100">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="font-semibold text-slate-900">要対応タスク</h2>
        {unreadNotifCount > 0 && (
          <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">未読通知 {unreadNotifCount}</span>
        )}
      </div>
      <div className="divide-y divide-slate-50">
        {[
          { label: '承認待ち発注', count: pendingOrders, href: '/orders/approve', color: 'text-yellow-700 bg-yellow-100' },
          { label: '承認待ち請求', count: pendingInvoices, href: '/invoices/approve', color: 'text-yellow-700 bg-yellow-100' },
          { label: '承認待ち見積', count: pendingEstimates, href: '/estimates/approve', color: 'text-yellow-700 bg-yellow-100' },
          { label: '未対応是正', count: pendingDefects, href: '/defects', color: 'text-red-700 bg-red-100' },
          { label: '未実施検査', count: pendingInspections, href: '/inspections', color: 'text-blue-700 bg-blue-100' },
        ].map(item => (
          <Link key={item.label} href={item.href} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
            <span className="text-sm text-slate-700">{item.label}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.count > 0 ? item.color : 'text-slate-400 bg-slate-100'}`}>
              {item.count}件
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function NotificationsWidget({ notifications }: { notifications: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">通知</h2>
        <Bell className="w-4 h-4 text-slate-400" />
      </div>
      <div className="divide-y divide-slate-50">
        {notifications.map((notif: any) => (
          <div key={notif.id} className={`p-4 ${notif.isRead ? '' : 'bg-blue-50'}`}>
            <div className="flex items-start gap-2">
              {!notif.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
              <div className={notif.isRead ? 'pl-4' : ''}>
                <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.content}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(notif.createdAt)}</p>
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="p-4 text-sm text-slate-500 text-center">通知はありません</p>
        )}
      </div>
    </div>
  )
}

function CostOverviewWidget({ rows }: { rows: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">案件別採算</h2>
        <Link href="/costs" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          原価管理へ <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">売上</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">原価</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">粗利</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">粗利率</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm">
                  <div className="text-xs text-slate-500">{p.projectNumber}</div>
                  <div className="font-medium text-slate-900 truncate max-w-[200px]">{p.name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-900">{formatCurrency(p.sales)}</td>
                <td className="px-4 py-3 text-sm text-right text-slate-900">{formatCurrency(p.cost)}</td>
                <td className={`px-4 py-3 text-sm text-right font-medium ${p.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(p.profit)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.rate >= 20 ? 'bg-green-500' : p.rate >= 0 ? 'bg-yellow-400' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.max(p.rate, 0), 100)}%` }}
                      />
                    </div>
                    <span className={p.rate >= 20 ? 'text-green-700' : p.rate >= 0 ? 'text-yellow-600' : 'text-red-600'}>
                      {p.rate.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RecentActivityWidget({ logs }: { logs: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">最近の操作</h2>
        </div>
        <Link href="/audit" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          すべて見る <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {logs.map((log: any) => (
          <div key={log.id} className="flex items-start gap-3 px-5 py-3">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-slate-600">{log.userName.slice(0, 1)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">
                <span className="font-medium">{log.userName}</span>が{log.target}を{log.action}
              </p>
              <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentProjectsAndNotifs({
  projects,
  notifications,
  showNotifications,
}: {
  projects: any[]
  notifications: any[]
  showNotifications: boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">最近の案件</h2>
          <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            すべて見る <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-500">{project.projectNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <p className="font-medium text-slate-900 truncate">{project.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {project.customer?.name} | 担当: {project.manager?.name || '-'}
                </p>
                {project.address && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{project.address}</p>
                )}
                {(project.startDate || project.endDate) && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {project.startDate ? formatDate(project.startDate) : '-'} 〜 {project.endDate ? formatDate(project.endDate) : '-'}
                  </p>
                )}
                <p className="text-xs text-slate-300 mt-0.5">更新: {formatDate(project.updatedAt)}</p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className="text-sm font-medium text-slate-900">{formatCurrency(project.contractAmount)}</p>
                <p className="text-xs text-slate-500">{formatDate(project.deliveryDate)}</p>
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="p-4 text-sm text-slate-500 text-center">案件がありません</p>
          )}
        </div>
      </div>

      {showNotifications && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">通知</h2>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {notifications.map((notif: any) => (
              <div key={notif.id} className={`p-4 ${notif.isRead ? '' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-2">
                  {!notif.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                  <div className={notif.isRead ? 'pl-4' : ''}>
                    <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.content}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(notif.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="p-4 text-sm text-slate-500 text-center">通知はありません</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const WEATHER_OPTIONS = [
  { value: '晴', label: '☀️晴' },
  { value: '曇晴', label: '🌤️曇晴' },
  { value: '曇', label: '☁️曇' },
  { value: '雨', label: '🌧️雨' },
  { value: '雷雨', label: '⛈️雷雨' },
  { value: '雪', label: '❄️雪' },
  { value: '強風', label: '💨強風' },
]

interface WeatherEntry {
  date: string
  weather: string
  temperature: string
  location: string
}

function WeatherWidget() {
  const todayKey = new Date().toISOString().slice(0, 10)
  const storageKey = 'weather_entry_' + todayKey

  const [entry, setEntry] = useState<WeatherEntry | null>(null)
  const [form, setForm] = useState({ weather: '晴', temperature: '', location: '' })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setEntry(JSON.parse(stored))
    } catch {}
  }, [storageKey])

  const handleSave = () => {
    if (!form.weather) return
    const newEntry: WeatherEntry = { date: todayKey, weather: form.weather, temperature: form.temperature, location: form.location }
    localStorage.setItem(storageKey, JSON.stringify(newEntry))
    setEntry(newEntry)
  }

  const handleQuickSet = (weather: string) => {
    const newEntry: WeatherEntry = { date: todayKey, weather, temperature: '', location: '' }
    localStorage.setItem(storageKey, JSON.stringify(newEntry))
    setEntry(newEntry)
  }

  if (!mounted) return null

  const selectedOption = WEATHER_OPTIONS.find(o => o.value === (entry?.weather || form.weather))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">天気ウィジェット</h2>
        <span className="text-xs text-slate-400">{todayKey}</span>
      </div>
      <div className="p-5">
        {entry ? (
          <div className="flex items-center gap-4">
            <div className="text-5xl">{WEATHER_OPTIONS.find(o => o.value === entry.weather)?.label.slice(0, 2)}</div>
            <div>
              <p className="text-lg font-bold text-slate-900">{entry.weather}</p>
              {entry.temperature && <p className="text-sm text-slate-500">{entry.temperature}°C</p>}
              {entry.location && <p className="text-xs text-slate-400">{entry.location}</p>}
            </div>
            <button
              onClick={() => setEntry(null)}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline"
            >
              変更
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleQuickSet(opt.value)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs text-slate-400 font-medium">詳細入力</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={form.weather}
                  onChange={e => setForm(prev => ({ ...prev, weather: e.target.value }))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {WEATHER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="気温 °C"
                  value={form.temperature}
                  onChange={e => setForm(prev => ({ ...prev, temperature: e.target.value }))}
                  className="w-28 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="場所"
                  value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-36 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  今日の天気を記録
                </button>
              </div>
            </div>
          </div>
        )}
        {!entry && (
          <p className="text-xs text-slate-400 mt-2">未記録 — 上のボタンでクイック入力できます</p>
        )}
      </div>
    </div>
  )
}

function InspectionStatusWidget({ pendingDefects, pendingInspections }: { pendingDefects: number; pendingInspections: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 p-5 border-b border-slate-100">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <h2 className="font-semibold text-slate-900">検査・是正ステータス</h2>
      </div>
      <div className="divide-y divide-slate-50">
        <Link href="/inspections" className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
          <span className="text-sm text-slate-700">未実施検査</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pendingInspections > 0 ? 'text-blue-700 bg-blue-100' : 'text-slate-400 bg-slate-100'}`}>
            {pendingInspections}件
          </span>
        </Link>
        <Link href="/defects" className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
          <span className="text-sm text-slate-700">未対応是正</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pendingDefects > 0 ? 'text-red-700 bg-red-100' : 'text-slate-400 bg-slate-100'}`}>
            {pendingDefects}件
          </span>
        </Link>
      </div>
    </div>
  )
}

function DefectsWidget({ defects }: { defects: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">未対応の是正事項</h2>
        <Link href="/defects" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          すべて見る <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">内容</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">場所</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">期限</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {defects.map((defect: any) => (
              <tr key={defect.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-900">{defect.project.projectNumber}</td>
                <td className="px-4 py-3 text-sm text-slate-900">{defect.content}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{defect.location || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDate(defect.dueDate)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(defect.status)}`}>
                    {defect.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UnreadChatsWidget({ chats }: { chats: { id: string; projectName: string; projectId: string; lastMessage: string; lastSenderName: string; lastAt: string; unreadCount: number }[] }) {
  const totalUnread = chats.reduce((s, c) => s + c.unreadCount, 0)
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">未読チャット</h2>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
          )}
        </div>
        <Link href="/chat" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          チャットへ <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {chats.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 text-center">未読メッセージはありません</p>
        ) : (
          chats.map(c => (
            <Link key={c.id} href={`/chat?roomId=${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{c.projectName}</p>
                <p className="text-xs text-slate-500 truncate">{c.lastSenderName}: {c.lastMessage}</p>
              </div>
              {c.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">{c.unreadCount}</span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
