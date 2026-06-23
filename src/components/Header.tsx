'use client'

import { useSession } from 'next-auth/react'
import { Bell, User, Search, X, CheckCheck, Settings } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SearchResult {
  type: 'project' | 'customer' | 'supplier' | 'order' | 'invoice' | 'schedule' | 'photo'
  id: string
  label: string
  sublabel?: string
  url: string
}

interface NotificationItem {
  id: string
  title: string
  content: string
  type: string
  isRead: boolean
  link?: string | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  project: '案件',
  customer: '顧客',
  supplier: '協力会社',
  order: '発注',
  invoice: '請求',
  schedule: '工程',
  photo: '写真',
}

const TYPE_ICONS: Record<string, string> = {
  info: '📋',
  warning: '⚠️',
  success: '✅',
  error: '❌',
  chat: '💬',
  inspection: '🔍',
  order: '📦',
  order_approval: '📦',
  invoice: '🧾',
  payment_due: '💴',
  drawing: '🗺️',
  document: '📄',
  project_status: '🏗️',
  schedule: '📅',
  defect: '⚠️',
  cost_overrun: '💸',
}

export default function Header({ title }: { title?: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUnreadCount = useCallback(() => {
    fetch('/api/notifications/unread-count')
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    pollRef.current = setInterval(fetchUnreadCount, 30000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchUnreadCount])

  const openNotifPanel = useCallback(() => {
    setNotifOpen(true)
    setNotifLoading(true)
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(Array.isArray(data) ? data.slice(0, 10) : [])
        setNotifLoading(false)
      })
      .catch(() => setNotifLoading(false))
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' }).catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  const handleNotifClick = useCallback(async (n: NotificationItem) => {
    if (!n.isRead) {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setNotifOpen(false)
    if (n.link) router.push(n.link)
  }, [router])

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => setSearchResults(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setSearching(false))
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(searchQuery), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [searchQuery, doSearch])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setNotifOpen(false)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [])

  const groupedResults = searchResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  const typeOrder = ['project', 'customer', 'supplier', 'order', 'invoice', 'schedule', 'photo']
  const badgeCount = unreadCount > 99 ? '99+' : unreadCount > 9 ? String(unreadCount) : unreadCount

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold text-slate-900 flex-shrink-0">{title || 'BuildSync'}</h1>

      <div ref={searchRef} className="flex-1 max-w-md relative hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="案件・顧客・協力会社などを検索..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
            {searching ? (
              <p className="text-xs text-slate-400 p-3">検索中...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 p-3">「{searchQuery}」に一致する結果がありません</p>
            ) : (
              <div className="py-1 max-h-96 overflow-y-auto">
                {typeOrder.filter(t => groupedResults[t]?.length).map(type => (
                  <div key={type}>
                    <p className="text-xs font-semibold text-slate-400 px-3 py-1.5 border-b border-slate-50">
                      {TYPE_LABELS[type]}
                    </p>
                    {groupedResults[type].map(r => (
                      <button
                        key={r.id}
                        onClick={() => { router.push(r.url); setSearchOpen(false); setSearchQuery('') }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span className="text-sm text-slate-800 truncate">{r.label}</span>
                        {r.sublabel && <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{r.sublabel}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              if (!notifOpen) openNotifPanel()
              else setNotifOpen(false)
            }}
            className="relative text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] px-0.5 flex items-center justify-center font-medium leading-none">
                {badgeCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">
                  通知{unreadCount > 0 ? `（未読 ${unreadCount}件）` : ''}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    すべて既読にする
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <p className="text-xs text-slate-400 p-4 text-center">読み込み中...</p>
                ) : notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center">通知はありません</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5 flex-shrink-0">{TYPE_ICONS[n.type] || '📢'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                            {n.title}
                            {!n.isRead && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full align-middle ml-1.5" />}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 px-4 py-2">
                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="block text-xs text-center text-blue-600 hover:text-blue-700 font-medium py-1"
                >
                  すべての通知を見る
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          >
            <div className="bg-blue-100 rounded-full p-1.5">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="font-medium text-slate-900">{session?.user?.name}</p>
              <p className="text-slate-500 text-xs">{(session?.user as any)?.role}</p>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-1">
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <User className="w-4 h-4 text-slate-400" />
                プロフィール設定
              </Link>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                アカウント設定
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
