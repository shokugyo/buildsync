'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'

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

type LoginSession = {
  id: string
  ipAddress: string | null
  browser: string | null
  userAgent: string | null
  lastAccess: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<LoginSession[]>([])
  const [loading, setLoading] = useState(true)
  const [logoutAll, setLogoutAll] = useState(false)

  useEffect(() => {
    fetch('/api/login-sessions')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleLogoutAll = async () => {
    if (!confirm('全てのデバイスからログアウトしますか？')) return
    await fetch('/api/login-sessions', { method: 'DELETE' })
    setSessions([])
    setLogoutAll(true)
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        {/* Left sidebar */}
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings/sessions' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">ログイン端末情報（近況31日間）</h2>
          <p className="text-sm text-slate-400 mb-6">アプリ/利用されたブラウザごとに直近の利用アクセスが記録されます</p>

          {logoutAll && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
              全てのデバイスからログアウトしました
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">読み込み中...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">ログイン履歴がありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">IPアドレス</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">ブラウザー/アプリ（バージョン）</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">ユーザーエージェント</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">最終アクセス日時</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-700">{s.ipAddress || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{s.browser || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{s.userAgent || '-'}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {new Date(s.lastAccess).toLocaleString('ja-JP', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleLogoutAll}
              className="border border-red-400 text-red-500 hover:bg-red-50 px-8 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              全てのデバイスからログアウトする
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
