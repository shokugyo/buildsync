'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'

const LEFT_MENU = [
  { label: 'プロフィール情報', href: '/settings' },
  { label: '通知設定', href: '/settings/notifications' },
  { label: 'セキュリティ（2FA）', href: '/settings/security' },
  { label: 'ログイン履歴', href: '/settings/sessions' },
  { label: '自社情報', href: '/settings/company' },
  { label: 'インボイス設定', href: '/settings/invoice' },
  { label: '料金プラン', href: '/settings/plan' },
  { label: 'Webhook設定', href: '/settings/webhooks' },
  { label: 'APIキー', href: '/settings/api-keys' },
  { label: '検査テンプレート', href: '/settings/inspection-templates' },
  { label: 'プロジェクトテンプレート', href: '/settings/project-templates' },
  { label: 'メールテンプレート', href: '/settings/email-templates' },
  { label: '見積テンプレート', href: '/settings/estimate-templates' },
  { label: 'メンバー管理', href: '/settings/users' },
  { label: '工程マスタ', href: '/settings/schedule-masters' },
  { label: '監査ログ', href: '/settings/audit-logs' },
  { label: 'データエクスポート', href: '/settings/data-export' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
]

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  target: string
  targetId: string | null
  detail: string | null
  companyId: string
  createdAt: string
}

interface User {
  id: string
  name: string
}

interface BeforeAfter {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

function parseDetail(detail: string | null): { text: string; beforeAfter: BeforeAfter | null } {
  if (!detail) return { text: '-', beforeAfter: null }
  try {
    const parsed = JSON.parse(detail)
    if (parsed && (parsed.before !== undefined || parsed.after !== undefined)) {
      return { text: '', beforeAfter: parsed as BeforeAfter }
    }
    // JSONだが before/after 構造でない場合はそのまま表示
    return { text: JSON.stringify(parsed, null, 2), beforeAfter: null }
  } catch {
    return { text: detail, beforeAfter: null }
  }
}

function BeforeAfterPanel({ data }: { data: BeforeAfter }) {
  const allKeys = Array.from(new Set([
    ...Object.keys(data.before ?? {}),
    ...Object.keys(data.after ?? {}),
  ]))

  return (
    <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-3 py-1.5 text-slate-500 font-medium w-1/3">フィールド</th>
            <th className="text-left px-3 py-1.5 text-red-600 font-medium w-1/3">変更前</th>
            <th className="text-left px-3 py-1.5 text-green-600 font-medium w-1/3">変更後</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {allKeys.map((key) => {
            const before = data.before?.[key]
            const after = data.after?.[key]
            const changed = JSON.stringify(before) !== JSON.stringify(after)
            return (
              <tr key={key} className={changed ? 'bg-amber-50' : ''}>
                <td className="px-3 py-1.5 text-slate-600 font-mono">{key}</td>
                <td className="px-3 py-1.5 text-red-700 font-mono">
                  {before === undefined ? <span className="text-slate-300">-</span> : String(before)}
                </td>
                <td className="px-3 py-1.5 text-green-700 font-mono">
                  {after === undefined ? <span className="text-slate-300">-</span> : String(after)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetailCell({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const { text, beforeAfter } = parseDetail(log.detail)

  if (!beforeAfter) {
    return <span className="text-slate-500 text-xs">{text}</span>
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        変更前後を{expanded ? '閉じる' : '表示'}
      </button>
      {expanded && <BeforeAfterPanel data={beforeAfter} />}
    </div>
  )
}

export default function AuditLogsPage() {
  const pathname = usePathname()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])

  const [filterAction, setFilterAction] = useState('')
  const [filterTarget, setFilterTarget] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '50' })
    if (filterAction) params.set('action', filterAction)
    if (filterTarget) params.set('target', filterTarget)
    if (filterUserId) params.set('userId', filterUserId)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)

    const res = await fetch(`/api/audit-logs?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.totalPages)
    }
    setLoading(false)
  }, [filterAction, filterTarget, filterUserId, filterDateFrom, filterDateTo])

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsers(data) })
  }, [])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs(1)
  }

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    if (filterAction) params.set('action', filterAction)
    if (filterTarget) params.set('target', filterTarget)
    if (filterUserId) params.set('userId', filterUserId)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)
    const query = params.toString()
    window.location.href = `/api/export/audit-logs${query ? `?${query}` : ''}`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    pathname === item.href ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">監査ログ</h2>
              <p className="text-sm text-slate-500 mt-0.5">システムへの操作履歴を確認できます</p>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSVエクスポート
            </button>
          </div>

          <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">アクション</label>
                <select
                  value={filterAction}
                  onChange={e => setFilterAction(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">対象</label>
                <input
                  type="text"
                  value={filterTarget}
                  onChange={e => setFilterTarget(e.target.value)}
                  placeholder="案件、発注..."
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ユーザー</label>
                <select
                  value={filterUserId}
                  onChange={e => setFilterUserId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">開始日</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">終了日</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                検索
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">合計 {total.toLocaleString()} 件</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">読み込み中...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">ログがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">日時</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">ユーザー名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">アクション</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">対象</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{log.userName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACTION_BADGE[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{log.target}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <DetailCell log={log} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600">{page} / {totalPages}</span>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
