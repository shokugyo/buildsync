'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchProcessing, setBatchProcessing] = useState(false)

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const markAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const handleClick = async (n: any) => {
    if (!n.isRead) await markAsRead(n.id)
    if (n.link) router.push(n.link)
  }

  const markAllAsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const deleteAll = async () => {
    if (!confirm('すべての通知を削除しますか？')) return
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifications([])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const handleBatchRead = async () => {
    setBatchProcessing(true)
    await fetch('/api/notifications/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: 'read' }),
    })
    setNotifications((prev) =>
      prev.map((n) => selectedIds.has(n.id) ? { ...n, isRead: true } : n)
    )
    setSelectedIds(new Set())
    setBatchProcessing(false)
  }

  const handleBatchDelete = async () => {
    if (!confirm(`選択した${selectedIds.size}件の通知を削除しますか？`)) return
    setBatchProcessing(true)
    await fetch('/api/notifications/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: 'delete' }),
    })
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
    setBatchProcessing(false)
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div>
      <Header title="通知" />
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="text-slate-700 font-medium">
              {unreadCount > 0 ? `未読 ${unreadCount}件` : '通知'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <CheckCheck className="w-4 h-4" />
                すべて既読にする
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={deleteAll}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-600 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                すべて削除
              </button>
            )}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-800">{selectedIds.size}件選択中</span>
            <button
              onClick={handleBatchRead}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              選択を既読にする
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              選択を削除
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
          <div className="text-center text-slate-500 py-12">読み込み中...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">通知はありません</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 px-1">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={selectedIds.size === notifications.length && notifications.length > 0}
                onChange={toggleSelectAll}
              />
              <span className="text-xs text-slate-500">全選択</span>
            </div>
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`bg-white rounded-xl border p-4 transition-colors ${
                    n.isRead ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 mt-1 flex-shrink-0"
                      checked={selectedIds.has(n.id)}
                      onChange={() => toggleSelect(n.id)}
                    />
                    <span
                      className={`text-xl mt-0.5 ${n.link ? 'cursor-pointer' : ''}`}
                      onClick={() => n.link && handleClick(n)}
                    >
                      {TYPE_ICONS[n.type] || '📢'}
                    </span>
                    <div
                      className={`flex-1 min-w-0 ${n.link ? 'cursor-pointer' : ''}`}
                      onClick={() => n.link && handleClick(n)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                          {n.title}
                          {!n.isRead && (
                            <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full align-middle" />
                          )}
                        </p>
                        <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                          {formatDate(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{n.content}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                        >
                          既読
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
