'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExternalLink, CheckCircle, XCircle, RefreshCw, Send, Building2, MessageSquare, Cloud } from 'lucide-react'

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
  { label: '外部連携', href: '/settings/integrations' },
  { label: 'SSO設定', href: '/settings/sso' },
  { label: 'データエクスポート', href: '/settings/data-export' },
  { label: 'バッチ処理', href: '/settings/batch' },
  { label: '言語設定', href: '/settings/language' },
]

export default function IntegrationsPage() {
  const pathname = usePathname()
  const [accountingServices, setAccountingServices] = useState<any[]>([])
  const [syncPreview, setSyncPreview] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [smsStatus, setSmsStatus] = useState<any>(null)
  const [testPhone, setTestPhone] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState('')
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // クラウドストレージ連携
  const [storageServices, setStorageServices] = useState<any[]>([])
  const [storageConnecting, setStorageConnecting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/integrations/accounting').then(r => r.json()).then(d => setAccountingServices(d.services || []))
    fetch('/api/notifications/sms').then(r => r.json()).then(setSmsStatus)
    fetch('/api/integrations/storage').then(r => r.json()).then(d => setStorageServices(d.services || []))
  }, [])

  const handleConnect = async (service: string) => {
    const res = await fetch('/api/integrations/accounting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'connect', service }),
    })
    const data = await res.json()
    if (data.authUrl && data.authUrl !== '#') window.open(data.authUrl, '_blank')
    alert(data.message)
  }

  const handleSyncPreview = async () => {
    const res = await fetch('/api/integrations/accounting?action=sync-preview')
    const data = await res.json()
    setSyncPreview(data)
  }

  const handleSync = async () => {
    if (!selectedService) { alert('連携サービスを選択してください'); return }
    if (!syncPreview) { alert('先にプレビューを取得してください'); return }
    setSyncing(true)
    try {
      const items = [...(syncPreview.orders || []), ...(syncPreview.invoices || [])]
      const res = await fetch('/api/integrations/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', service: selectedService, items }),
      })
      const data = await res.json()
      setSyncResult(data.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleStorageConnect = async (serviceId: string) => {
    setStorageConnecting(serviceId)
    try {
      const res = await fetch('/api/integrations/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', serviceId }),
      })
      const data = await res.json()
      if (data.authUrl) window.open(data.authUrl, '_blank')
      alert(data.message)
    } finally {
      setStorageConnecting(null)
    }
  }

  const handleSmsTest = async () => {
    setSmsSending(true)
    setSmsResult(null)
    try {
      const res = await fetch('/api/notifications/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', phone: testPhone || undefined }),
      })
      const data = await res.json()
      setSmsResult(data.success ? `送信成功 (SID: ${data.sid})` : `送信失敗: ${data.error}`)
    } finally {
      setSmsSending(false)
    }
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map(item => (
              <li key={item.href}>
                <Link href={item.href} className={`block px-2 py-1.5 rounded text-sm transition-colors ${pathname === item.href ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'}`}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">外部システム連携</h2>
            <p className="text-sm text-slate-500 mt-0.5">会計ソフト・SMS通知などの外部サービスと連携します</p>
          </div>

          {/* 会計システム連携 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-blue-600" />
              会計システムAPI連携
            </h3>
            <p className="text-sm text-slate-500 mb-4">発注・請求データをリアルタイムで会計ソフトに同期します</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {accountingServices.map(svc => (
                <div key={svc.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800 text-sm">{svc.logo} {svc.name}</span>
                    {svc.connected
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <XCircle className="w-4 h-4 text-slate-300" />
                    }
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{svc.description}</p>
                  <button
                    onClick={() => handleConnect(svc.id)}
                    className="w-full text-xs px-2 py-1.5 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    {svc.connected ? '再接続' : '連携設定'}
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">データ同期</p>
              <div className="flex items-center gap-3 mb-3">
                <select
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">サービスを選択</option>
                  {accountingServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={handleSyncPreview} className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-sm transition-colors">
                  プレビュー
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing || !syncPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded text-sm transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? '同期中...' : '同期実行'}
                </button>
              </div>

              {syncPreview && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-slate-700 mb-1">同期対象: {syncPreview.total}件</p>
                  <p className="text-slate-500">発注: {syncPreview.orders?.length}件 / 請求: {syncPreview.invoices?.length}件</p>
                </div>
              )}
              {syncResult && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{syncResult}</div>
              )}
            </div>
          </div>

          {/* SMS通知 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-green-600" />
              SMS通知設定
            </h3>
            <p className="text-sm text-slate-500 mb-4">Twilioを使ったSMS通知を設定します</p>

            {smsStatus && (
              <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm ${smsStatus.configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {smsStatus.configured ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{smsStatus.provider}: {smsStatus.mode}</span>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-slate-700 mb-1">必要な環境変数</p>
              {['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'].map(v => (
                <code key={v} className="block text-xs font-mono text-slate-600 py-0.5">{v}=your_value</code>
              ))}
              <p className="text-xs text-slate-500 mt-1">未設定の場合はモードとして動作し、実際のSMSは送信されません</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="tel"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="電話番号（空白=自分の番号）"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSmsTest}
                disabled={smsSending}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded text-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {smsSending ? '送信中...' : 'テスト送信'}
              </button>
            </div>
            {smsResult && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${smsResult.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {smsResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
