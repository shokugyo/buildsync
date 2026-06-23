'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  CheckCircle2,
  Truck,
  CalendarDays,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  orderNumber: string
  subject: string
  workType?: string | null
  status: string
  orderDate?: string | null
  deliveryDate?: string | null
  amount: number
  taxAmount: number
  totalAmount: number
  confirmedAt?: string | null
  deliveredAt?: string | null
  notes?: string | null
  project: { id: string; name: string; projectNumber: string }
  supplier?: { id: string; name: string } | null
  items: { id: string; name: string; quantity: number; unitPrice: number; amount: number }[]
}

interface Payment {
  id: string
  dueDate?: string | null
  paidDate?: string | null
  totalAmount: number
  status: string
  project: { id: string; name: string; projectNumber: string }
  customer?: { id: string; name: string } | null
}

interface PaymentsResponse {
  invoices: Payment[]
  summary: { totalAmount: number; totalPaid: number; unpaidAmount: number }
}

interface ChatRoom {
  id: string
  name: string
  project: { id: string; name: string }
  messages: { id: string; content: string; sender: { name: string } }[]
  unreadCount: number
}

interface ChatMessage {
  id: string
  content: string
  createdAt: string
  sender: { id: string; name: string; company?: { name: string } }
}

interface WorkTemplate {
  id: string
  name: string
  content: string
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: WorkTemplate[] = [
  {
    id: 'tpl-1',
    name: '通常作業',
    content:
      '本日は通常作業を実施しました。\n・作業内容: \n・進捗状況: \n・明日の予定: ',
  },
  {
    id: 'tpl-2',
    name: '検査立会',
    content: '検査立会を実施しました。\n・検査項目: \n・結果: \n・指摘事項: ',
  },
  {
    id: 'tpl-3',
    name: '資材搬入',
    content: '資材搬入を実施しました。\n・搬入資材: \n・数量: \n・保管場所: ',
  },
]

const STORAGE_KEY = 'supplier_work_templates'

const ORDER_STATUS_COLORS: Record<string, string> = {
  '発注済': 'bg-yellow-100 text-yellow-700',
  '未確認': 'bg-yellow-100 text-yellow-700',
  '受注確認済': 'bg-green-100 text-green-700',
  '受領確認済': 'bg-green-100 text-green-700',
  '完了': 'bg-slate-100 text-slate-600',
  '納品済': 'bg-purple-100 text-purple-700',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  '入金済': 'bg-green-100 text-green-700',
  '未払': 'bg-red-100 text-red-700',
  '請求済': 'bg-blue-100 text-blue-700',
  '未作成': 'bg-slate-100 text-slate-500',
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'orders' | 'payments' | 'reports' | 'chat'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SupplierPortalPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('orders')

  return (
    <div>
      <Header title="協力会社ポータル" />
      <div className="p-6">
        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {(
            [
              { key: 'orders', label: '発注確認', icon: ClipboardList },
              { key: 'payments', label: '支払予定', icon: CalendarDays },
              { key: 'reports', label: '作業報告', icon: FileText },
              { key: 'chat', label: 'メッセージ', icon: MessageSquare },
            ] as { key: Tab; label: string; icon: React.ElementType }[]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'orders' && <OrdersTab session={session} />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'reports' && <WorkReportsTab session={session} />}
        {activeTab === 'chat' && <ChatTab session={session} />}
      </div>
    </div>
  )
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab({ session }: { session: ReturnType<typeof useSession>['data'] }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders?supplierView=true')
      if (res.ok) {
        const data = await res.json()
        setOrders(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleConfirm = async (id: string) => {
    if (!confirm('この発注の受注を確認しますか？')) return
    setActionLoading(id + '_confirm')
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '受注確認済' }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      } else {
        alert('受注確認に失敗しました')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeliver = async (id: string) => {
    if (!confirm('完了報告を送信しますか？')) return
    setActionLoading(id + '_deliver')
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '完了' }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      } else {
        alert('完了報告に失敗しました')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const totalCount = orders.length
  const pendingConfirmCount = orders.filter(
    (o) => !o.confirmedAt && o.status !== '受注確認済' && o.status !== '完了' && o.status !== '納品済'
  ).length
  const confirmedCount = orders.filter(
    (o) => o.status === '受注確認済' || (o.confirmedAt && o.status !== '完了' && o.status !== '納品済')
  ).length
  const completedCount = orders.filter(
    (o) => o.status === '完了' || o.status === '納品済'
  ).length

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">発注件数</p>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">未確認</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingConfirmCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">受注確認済</p>
          <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">完了</p>
          <p className="text-2xl font-bold text-slate-600">{completedCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 p-8">読み込み中...</div>
      ) : orders.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">発注データがありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs font-medium text-slate-500">
                  <th className="px-4 py-3 text-left">発注番号</th>
                  <th className="px-4 py-3 text-left">案件名</th>
                  <th className="px-4 py-3 text-left">内容</th>
                  <th className="px-4 py-3 text-right">金額（税込）</th>
                  <th className="px-4 py-3 text-left">発注日</th>
                  <th className="px-4 py-3 text-left">ステータス</th>
                  <th className="px-4 py-3 text-left">受注確認</th>
                  <th className="px-4 py-3 text-left">完了報告</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 text-xs">
                        {order.project?.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {order.project?.projectNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-xs">{order.subject}</div>
                      {order.workType && (
                        <div className="text-xs text-slate-400">{order.workType}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {order.orderDate ? formatDate(order.orderDate) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ORDER_STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {/* 仕様: 未確認/受注確認済/完了 */}
                        {order.status === '完了' || order.status === '納品済'
                          ? '完了'
                          : order.status === '受注確認済' || order.status === '受領確認済' || order.confirmedAt
                          ? '受注確認済'
                          : '未確認'}
                      </span>
                    </td>
                    {/* 受注確認 */}
                    <td className="px-4 py-3 text-xs">
                      {order.confirmedAt ||
                      order.status === '受注確認済' ||
                      order.status === '受領確認済' ||
                      order.status === '完了' ||
                      order.status === '納品済' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          確認済
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConfirm(order.id)}
                          disabled={actionLoading === order.id + '_confirm'}
                          className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {actionLoading === order.id + '_confirm' ? '処理中...' : '受注確認'}
                        </button>
                      )}
                    </td>
                    {/* 完了報告 */}
                    <td className="px-4 py-3 text-xs">
                      {order.status === '完了' || order.status === '納品済' || order.deliveredAt ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                          <Truck className="w-3.5 h-3.5" />
                          完了済
                        </span>
                      ) : order.confirmedAt ||
                        order.status === '受注確認済' ||
                        order.status === '受領確認済' ? (
                        <button
                          onClick={() => handleDeliver(order.id)}
                          disabled={actionLoading === order.id + '_deliver'}
                          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          <Truck className="w-3 h-3" />
                          {actionLoading === order.id + '_deliver' ? '処理中...' : '完了報告'}
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [data, setData] = useState<PaymentsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPayments = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      const pad = String(m).padStart(2, '0')
      const res = await fetch(`/api/payments?month=${y}-${pad}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments(year, month)
  }, [fetchPayments, year, month])

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const invoices = data?.invoices ?? []
  const thisMonthTotal = invoices.reduce((s, inv) => s + inv.totalAmount, 0)
  const unpaidTotal = invoices
    .filter((inv) => inv.status !== '入金済')
    .reduce((s, inv) => s + inv.totalAmount, 0)

  return (
    <>
      {/* Month Navigator */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 min-w-[120px] text-center">
          {year}年{month}月
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
        {isCurrentMonth && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            今月
          </span>
        )}
      </div>

      {/* Summary Cards */}
      {isCurrentMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-600 mb-1 font-medium">今月の支払予定合計</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(thisMonthTotal)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">支払済</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(thisMonthTotal - unpaidTotal)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">未払い残高</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(unpaidTotal)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-500 p-8">読み込み中...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">この月の支払予定はありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs font-medium text-slate-500">
                  <th className="px-4 py-3 text-left">支払日</th>
                  <th className="px-4 py-3 text-left">案件名</th>
                  <th className="px-4 py-3 text-right">金額（税込）</th>
                  <th className="px-4 py-3 text-left">状態</th>
                  <th className="px-4 py-3 text-left">入金日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">
                      {inv.dueDate ? formatDate(inv.dueDate) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 text-xs">
                        {inv.project?.name}
                      </div>
                      <div className="text-xs text-slate-400">{inv.project?.projectNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          PAYMENT_STATUS_COLORS[inv.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {inv.status === '入金済' ? '支払済' : '未払'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {inv.paidDate ? formatDate(inv.paidDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Work Reports Tab ─────────────────────────────────────────────────────────

function WorkReportsTab({ session }: { session: ReturnType<typeof useSession>['data'] }) {
  const [templates, setTemplates] = useState<WorkTemplate[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [content, setContent] = useState('')
  const [workerCount, setWorkerCount] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [weather, setWeather] = useState('')
  const [nextDayPlan, setNextDayPlan] = useState('')

  // Template management
  const [newTemplateName, setNewTemplateName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  // Load templates from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setTemplates(JSON.parse(raw))
      } else {
        setTemplates(DEFAULT_TEMPLATES)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES))
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES)
    }
  }, [])

  // Fetch projects
  useEffect(() => {
    fetch('/api/projects?limit=100')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.projects ?? []
        setProjects(list)
        if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].id)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveTemplates = (updated: WorkTemplate[]) => {
    setTemplates(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const applyTemplate = (tpl: WorkTemplate) => {
    setContent(tpl.content)
  }

  const addTemplate = () => {
    if (!newTemplateName.trim() || !content.trim()) {
      alert('テンプレート名と内容を入力してください')
      return
    }
    const newTpl: WorkTemplate = {
      id: `tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      content: content.trim(),
    }
    saveTemplates([...templates, newTpl])
    setNewTemplateName('')
  }

  const deleteTemplate = (id: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return
    saveTemplates(templates.filter((t) => t.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !content.trim() || !reportDate) {
      alert('案件、報告日、報告内容は必須です')
      return
    }
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const res = await fetch('/api/work-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          reportDate,
          content,
          workerCount: workerCount !== '' ? Number(workerCount) : null,
          workHours: workHours !== '' ? Number(workHours) : null,
          weather: weather || null,
          nextDayPlan: nextDayPlan || null,
        }),
      })
      if (res.ok) {
        setSubmitMsg('作業報告を送信しました')
        setContent('')
        setWorkerCount('')
        setWorkHours('')
        setWeather('')
        setNextDayPlan('')
      } else {
        const err = await res.json().catch(() => ({}))
        setSubmitMsg(`送信失敗: ${err?.error ?? '不明なエラー'}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Templates Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 lg:col-span-1">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-slate-500" />
          テンプレート
        </h3>
        <div className="space-y-2 mb-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <button
                onClick={() => applyTemplate(tpl)}
                className="flex-1 text-left text-sm text-slate-700 hover:text-blue-600 font-medium truncate"
              >
                {tpl.name}
              </button>
              <button
                onClick={() => deleteTemplate(tpl.id)}
                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {/* Add Template */}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 mb-2">現在の入力内容をテンプレートとして保存</p>
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="テンプレート名"
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addTemplate}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            テンプレートを保存
          </button>
        </div>
      </div>

      {/* Report Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 lg:col-span-2">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          作業報告書
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">案件 *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">案件を選択</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">報告日 *</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">作業人数</label>
              <input
                type="number"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
                placeholder="例: 3"
                min="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">作業時間</label>
              <input
                type="number"
                value={workHours}
                onChange={(e) => setWorkHours(e.target.value)}
                placeholder="例: 8"
                step="0.5"
                min="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">天気</label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択</option>
                {['晴れ', '曇り', '雨', '雪', '強風'].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">報告内容 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="作業内容を入力してください（テンプレートを選択して自動入力も可能）"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">翌日の予定</label>
            <textarea
              value={nextDayPlan}
              onChange={(e) => setNextDayPlan(e.target.value)}
              rows={2}
              placeholder="翌日の作業予定を入力"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {submitMsg && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                submitMsg.startsWith('送信失敗')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {submitMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitting ? '送信中...' : '作業報告を送信'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ session }: { session: ReturnType<typeof useSession>['data'] }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true)
    try {
      const res = await fetch('/api/chat')
      if (res.ok) {
        const data = await res.json()
        setRooms(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoadingRooms(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  const fetchMessages = useCallback(async (roomId: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/chat?roomId=${roomId}`)
      if (res.ok) {
        const data = await res.json()
        const all: ChatMessage[] = Array.isArray(data) ? data : []
        // Show latest 5 messages
        setMessages(all.slice(-5))
      }
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (selectedRoomId) {
      fetchMessages(selectedRoomId)
    }
  }, [fetchMessages, selectedRoomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedRoomId) return
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          roomId: selectedRoomId,
          content: messageInput.trim(),
        }),
      })
      if (res.ok) {
        setMessageInput('')
        await fetchMessages(selectedRoomId)
      } else {
        alert('送信に失敗しました')
      }
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '500px' }}>
      {/* Room List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden lg:col-span-1">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">チャットルーム</h3>
        </div>
        {loadingRooms ? (
          <div className="p-4 text-center text-slate-500 text-sm">読み込み中...</div>
        ) : rooms.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">チャットルームがありません</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-96 lg:max-h-full">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selectedRoomId === room.id
                    ? 'bg-blue-50 border-r-2 border-blue-500'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{room.name}</p>
                    <p className="text-xs text-slate-400 truncate">{room.project?.name}</p>
                    {room.messages[0] && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {room.messages[0].content}
                      </p>
                    )}
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold flex-shrink-0">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Area */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col lg:col-span-2 overflow-hidden">
        {!selectedRoomId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">チャットルームを選択してください</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <p className="font-semibold text-slate-900 text-sm">{selectedRoom?.name}</p>
              <p className="text-xs text-slate-400">{selectedRoom?.project?.name} ・ 最新5件表示</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '320px' }}>
              {loadingMessages ? (
                <div className="text-center text-slate-500 text-sm py-4">読み込み中...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-4">
                  メッセージはありません
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender?.id === (session?.user as any)?.id
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {(msg.sender?.name ?? '?')[0]}
                      </div>
                      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <span className="text-xs text-slate-400">
                          {msg.sender?.name}
                          {msg.sender?.company?.name ? ` (${msg.sender.company.name})` : ''}
                        </span>
                        <div
                          className={`px-3 py-2 rounded-xl text-sm ${
                            isMe
                              ? 'bg-blue-500 text-white rounded-tr-none'
                              : 'bg-slate-100 text-slate-800 rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-xs text-slate-300">
                          {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 p-3 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力 (Ctrl+Enter で送信)"
                  rows={2}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !messageInput.trim()}
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-2.5 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
