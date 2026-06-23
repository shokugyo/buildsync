'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { ClipboardList, Search, Filter, Download, X } from 'lucide-react'

interface AuditLog {
  id: string
  userName: string
  action: string
  target: string
  targetId: string | null
  detail: string | null
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: '作成',
  UPDATE: '更新',
  DELETE: '削除',
  LOGIN: 'ログイン',
  LOGOUT: 'ログアウト',
  UPLOAD: 'アップロード',
  APPROVE: '承認',
  REJECT: '差戻し',
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-slate-100 text-slate-700',
  LOGOUT: 'bg-slate-100 text-slate-600',
  UPLOAD: 'bg-purple-100 text-purple-700',
  APPROVE: 'bg-emerald-100 text-emerald-700',
  REJECT: 'bg-orange-100 text-orange-700',
}

export default function AuditPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const role = (session?.user as any)?.role

  const fetchLogs = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterUserId) params.set('userId', filterUserId)
    if (filterAction) params.set('action', filterAction)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)
    if (keyword) params.set('keyword', keyword)
    const res = await fetch(`/api/audit?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    }
  }

  useEffect(() => {
    if (role === '管理者') {
      fetchUsers()
      fetchLogs()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs()
  }

  const handleClearFilters = () => {
    setKeyword('')
    setFilterUserId('')
    setFilterAction('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  // Re-fetch when select filters change (not keyword/date, those need form submit)
  useEffect(() => {
    if (role === '管理者') fetchLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUserId, filterAction, filterDateFrom, filterDateTo])

  if (role !== '管理者') {
    return (
      <div>
        <Header title="操作ログ" />
        <div className="p-6 text-center text-slate-500">管理者のみアクセスできます</div>
      </div>
    )
  }

  const hasActiveFilters = keyword || filterUserId || filterAction || filterDateFrom || filterDateTo

  return (
    <div>
      <Header title="操作ログ" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            {/* Keyword search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-slate-500 mb-1">キーワード検索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="ユーザー名、対象、詳細で検索"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* User filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">ユーザー</label>
              <select
                value={filterUserId}
                onChange={e => setFilterUserId(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全ユーザー</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Action filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">操作種別</label>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全操作</option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">開始日</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">終了日</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search button */}
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Filter className="w-4 h-4" />
              検索
            </button>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
              >
                <X className="w-4 h-4" />
                クリア
              </button>
            )}
          </form>
        </div>

        {/* Log Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">操作ログ ({logs.length}件)</h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">200件まで表示</p>
              <a
                href="/api/export/audit"
                download
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                CSV出力
              </a>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">読み込み中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">操作ログがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">日時</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ユーザー</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">対象</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">{log.userName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{log.target}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{log.detail || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
