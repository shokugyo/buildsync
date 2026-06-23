'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { Database, Bell, Info, Trash2, Play, RefreshCw } from 'lucide-react'

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
  { label: 'システム設定', href: '/settings/system', adminOnly: true },
]

interface RecordCounts {
  projects: number
  users: number
  schedules: number
  equipment: number
  invoices: number
  orders: number
  suppliers: number
  customers: number
  documents: number
  inspections: number
}

export default function SystemSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = (session?.user as any)?.role

  const [counts, setCounts] = useState<RecordCounts | null>(null)
  const [countsLoading, setCountsLoading] = useState(true)

  const [dueCheckRunning, setDueCheckRunning] = useState(false)
  const [dueCheckResult, setDueCheckResult] = useState<any>(null)
  const [dueCheckError, setDueCheckError] = useState('')

  const [dbOptLoading, setDbOptLoading] = useState(false)
  const [cacheClearing, setCacheClearing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || role !== '管理者') {
      router.replace('/settings')
    }
  }, [session, status, role, router])

  useEffect(() => {
    if (role !== '管理者') return
    fetch('/api/system/record-counts')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setCounts(data)
        setCountsLoading(false)
      })
      .catch(() => setCountsLoading(false))
  }, [role])

  const handleDueCheck = async () => {
    setDueCheckRunning(true)
    setDueCheckResult(null)
    setDueCheckError('')
    try {
      const res = await fetch('/api/notifications/due-check', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setDueCheckResult(data)
      } else {
        setDueCheckError(data.error || '実行に失敗しました')
      }
    } catch {
      setDueCheckError('通信エラーが発生しました')
    } finally {
      setDueCheckRunning(false)
    }
  }

  const handleDbOptimize = async () => {
    setDbOptLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setDbOptLoading(false)
    alert('データベース最適化が完了しました（プレースホルダー）')
  }

  const handleCacheClear = async () => {
    setCacheClearing(true)
    await new Promise(r => setTimeout(r, 800))
    setCacheClearing(false)
    alert('キャッシュをクリアしました（プレースホルダー）')
  }

  if (status === 'loading' || !session || role !== '管理者') {
    return null
  }

  const sysInfo = [
    { label: 'アプリバージョン', value: '1.0.0' },
    { label: 'Next.jsバージョン', value: '14.0.4' },
    { label: 'データベース', value: 'SQLite (Prisma)' },
    { label: '最終更新日', value: '2025-06-20' },
  ]

  const countLabels: { key: keyof RecordCounts; label: string }[] = [
    { key: 'projects', label: '案件' },
    { key: 'users', label: 'ユーザー' },
    { key: 'schedules', label: '工程' },
    { key: 'equipment', label: '機器' },
    { key: 'invoices', label: '請求書' },
    { key: 'orders', label: '発注' },
    { key: 'suppliers', label: '仕入先' },
    { key: 'customers', label: '顧客' },
    { key: 'documents', label: '書類' },
    { key: 'inspections', label: '点検' },
  ]

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.filter(item => !item.adminOnly || role === '管理者').map((item) => (
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

        <div className="flex-1 p-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">システム設定</h2>

          <div className="space-y-6">
            {/* データ管理 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">データ管理</h3>
              </div>
              <div className="p-5">
                <div className="mb-4">
                  <button
                    onClick={handleDbOptimize}
                    disabled={dbOptLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${dbOptLoading ? 'animate-spin' : ''}`} />
                    {dbOptLoading ? '実行中...' : 'データベース最適化'}
                  </button>
                </div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">レコード件数</h4>
                {countsLoading ? (
                  <p className="text-sm text-slate-400">読み込み中...</p>
                ) : counts ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {countLabels.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-500">{label}</span>
                        <span className="text-sm font-semibold text-slate-800">{counts[key].toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">取得できませんでした</p>
                )}
              </div>
            </div>

            {/* 通知設定 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">通知設定</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-500 mb-4">
                  支払期限・予算超過・工程遅延・機器点検・アフターサービスの期限チェックを手動で実行します。
                </p>
                <button
                  onClick={handleDueCheck}
                  disabled={dueCheckRunning}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Play className={`w-4 h-4 ${dueCheckRunning ? 'animate-pulse' : ''}`} />
                  {dueCheckRunning ? '実行中...' : '期限チェックを今すぐ実行'}
                </button>
                {dueCheckError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {dueCheckError}
                  </div>
                )}
                {dueCheckResult && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                    <p className="font-medium mb-1">実行完了</p>
                    <ul className="space-y-0.5 text-xs">
                      <li>支払期限通知: {dueCheckResult.notified ?? 0}件送信 / {dueCheckResult.invoiceCount ?? 0}件対象</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* システム情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">システム情報</h3>
              </div>
              <div className="p-5">
                <dl className="space-y-2">
                  {sysInfo.map(({ label, value }) => (
                    <div key={label} className="flex gap-4 text-sm">
                      <dt className="text-slate-500 w-44 flex-shrink-0">{label}</dt>
                      <dd className="text-slate-900 font-mono">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* キャッシュクリア */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">キャッシュクリア</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-500 mb-4">
                  サーバーサイドのキャッシュをクリアします。表示の不整合が発生した場合にお試しください。
                </p>
                <button
                  onClick={handleCacheClear}
                  disabled={cacheClearing}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {cacheClearing ? 'クリア中...' : 'キャッシュをクリア'}
                </button>
                <p className="text-xs text-slate-400 mt-2">※ この操作はページのキャッシュのみ対象です。データは削除されません。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
