'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Bell, ChevronDown, ChevronUp } from 'lucide-react'

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

interface NotifItem {
  key: string
  label: string
  desc: string
  defaultEnabled: boolean
}

interface NotifSection {
  title: string
  items: NotifItem[]
}

const NOTIF_SECTIONS: NotifSection[] = [
  {
    title: 'コミュニケーション',
    items: [
      { key: 'chat_mention', label: 'チャットメンション', desc: '@メンションされたとき', defaultEnabled: true },
    ],
  },
  {
    title: 'タスク',
    items: [
      { key: 'task_assigned', label: 'タスクアサイン', desc: 'タスクが割り当てられたとき', defaultEnabled: true },
    ],
  },
  {
    title: '検査・是正',
    items: [
      { key: 'inspection_result', label: '検査結果', desc: '検査が記録されたとき', defaultEnabled: true },
      { key: 'defect_reported', label: '是正依頼', desc: '是正が登録されたとき', defaultEnabled: true },
      { key: 'inspection_reminder', label: '検査リマインダー', desc: '検査予定の3日前', defaultEnabled: true },
    ],
  },
  {
    title: '発注・請求・支払',
    items: [
      { key: 'order_approval', label: '発注承認依頼', desc: '発注の承認が必要なとき', defaultEnabled: true },
      { key: 'order_approved', label: '発注承認完了', desc: '発注が承認されたとき', defaultEnabled: true },
      { key: 'invoice_approval', label: '請求承認依頼', desc: '請求の承認が必要なとき', defaultEnabled: true },
      { key: 'payment_due', label: '支払期限通知', desc: '支払期限が3日以内のとき', defaultEnabled: true },
      { key: 'budget_overrun', label: '予算超過通知', desc: '発注額が予算を超えたとき', defaultEnabled: true },
    ],
  },
  {
    title: '工程',
    items: [
      { key: 'schedule_delay', label: '工程遅延通知', desc: '工程が期限を超過したとき', defaultEnabled: true },
      { key: 'schedule_change', label: '工程変更通知', desc: '工程の日程が変更されたとき', defaultEnabled: true },
    ],
  },
  {
    title: '機器・設備',
    items: [
      { key: 'equipment_inspection', label: '機器点検通知', desc: '機器の点検期限が近いとき', defaultEnabled: true },
    ],
  },
  {
    title: '日報・報告',
    items: [
      { key: 'daily_report', label: '日報提出通知', desc: '作業報告が提出されたとき', defaultEnabled: true },
      { key: 'report_approved', label: '日報承認通知', desc: '作業報告が承認/差し戻しされたとき', defaultEnabled: true },
    ],
  },
  {
    title: 'アフターサービス・書類',
    items: [
      { key: 'after_service_pending', label: 'アフターサービス通知', desc: '未対応のアフターサービスがあるとき', defaultEnabled: true },
      { key: 'document_uploaded', label: '書類アップロード', desc: '書類がアップロードされたとき', defaultEnabled: false },
    ],
  },
  {
    title: 'プロジェクト・システム',
    items: [
      { key: 'project_member_added', label: 'プロジェクト参加', desc: 'プロジェクトに追加されたとき', defaultEnabled: true },
    ],
  },
]

export default function NotificationsSettingsPage() {
  const [scheduleExpanded, setScheduleExpanded] = useState(false)
  const [hasEmail, setHasEmail] = useState(false)
  // Per-type in-app enabled state
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    NOTIF_SECTIONS.flatMap(s => s.items).forEach(item => { init[item.key] = item.defaultEnabled })
    return init
  })
  // Per-type email enabled state
  const [emailEnabled, setEmailEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    NOTIF_SECTIONS.flatMap(s => s.items).forEach(item => { init[item.key] = true })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const toggleApp = (key: string) => setEnabled(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleEmail = (key: string) => setEmailEnabled(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const allItems = NOTIF_SECTIONS.flatMap(s => s.items)
      const types = [
        ...allItems.map(item => ({ type: item.key, enabled: enabled[item.key] ?? item.defaultEnabled })),
        ...allItems.map(item => ({ type: `${item.key}:email`, enabled: emailEnabled[item.key] ?? true })),
      ]
      for (const t of types) {
        await fetch('/api/notification-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(t),
        })
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetch('/api/notification-settings').then(r => r.json()).then((data: { settings?: { type: string; enabled: boolean; emailEnabled: boolean }[]; hasEmail?: boolean }) => {
      if (!data || !Array.isArray(data.settings)) return
      setHasEmail(!!data.hasEmail)
      const nextApp: Record<string, boolean> = {}
      const nextEmail: Record<string, boolean> = {}
      data.settings.forEach(s => {
        nextApp[s.type] = s.enabled
        nextEmail[s.type] = s.emailEnabled
      })
      setEnabled(prev => {
        const next = { ...prev }
        Object.entries(nextApp).forEach(([k, v]) => { if (k in next) next[k] = v })
        return next
      })
      setEmailEnabled(prev => {
        const next = { ...prev }
        Object.entries(nextEmail).forEach(([k, v]) => { if (k in next) next[k] = v })
        return next
      })
    })
  }, [])

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
                    item.href === '/settings/notifications' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
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
          {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">通知設定を保存しました</div>}

          {/* 通知設定の説明 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
            <h3 className="font-semibold text-slate-900 mb-3">通知</h3>
            <p className="text-sm text-slate-600 mb-1">BUILDSYNCから届く通知をアプリ内・メールで受け取れます。</p>
            {!hasEmail && (
              <p className="text-sm text-amber-600 mt-2">
                メール通知を受け取るには、<Link href="/settings" className="underline">プロフィール設定</Link>で通知メールアドレスを設定してください。
              </p>
            )}
          </div>

          {/* 予定の確認 section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setScheduleExpanded(!scheduleExpanded)}
            >
              <h3 className="font-semibold text-slate-900">通知種別ごとの設定</h3>
              {scheduleExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <p className="text-xs text-slate-400 mt-1">
              通知種別ごとに、アプリ内通知とメール通知をそれぞれON/OFFできます
            </p>

            {scheduleExpanded && (
              <div className="mt-4 space-y-5">
                {/* Column headers */}
                <div className="flex items-center gap-2 pl-2 pb-1 border-b border-slate-100">
                  <span className="flex-1 text-xs font-semibold text-slate-500">通知名</span>
                  <span className="w-20 text-center text-xs font-semibold text-slate-500">アプリ内</span>
                  <span className="w-20 text-center text-xs font-semibold text-slate-500">メール通知</span>
                </div>
                {NOTIF_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <p className="text-xs font-medium text-slate-500 mb-2">{section.title}</p>
                    <div className="space-y-2 pl-2">
                      {section.items.map((item) => (
                        <div key={item.key} className="flex items-center gap-2">
                          <div className="flex-1">
                            <span className="text-sm text-slate-700">{item.label}</span>
                            <p className="text-xs text-slate-400">{item.desc}</p>
                          </div>
                          {/* In-app toggle */}
                          <div className="w-20 flex justify-center">
                            <input
                              type="checkbox"
                              checked={enabled[item.key] ?? item.defaultEnabled}
                              onChange={() => toggleApp(item.key)}
                              className="rounded border-slate-300 text-orange-500 cursor-pointer"
                            />
                          </div>
                          {/* Email toggle */}
                          <div className="w-20 flex justify-center">
                            <input
                              type="checkbox"
                              checked={emailEnabled[item.key] ?? true}
                              onChange={() => toggleEmail(item.key)}
                              disabled={!hasEmail}
                              title={!hasEmail ? '通知メールアドレスを設定してください' : undefined}
                              className="rounded border-slate-300 text-blue-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!scheduleExpanded && (
              <button
                onClick={() => setScheduleExpanded(true)}
                className="mt-2 text-sm text-slate-500 hover:text-blue-600"
              >
                ▼ 表示
              </button>
            )}
          </div>

          <div className="flex justify-center mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white px-10 py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>

          {/* プッシュ通知テストセクション */}
          <PushNotificationTest />
        </div>
      </div>
    </div>
  )
}

type NotifPermission = 'default' | 'granted' | 'denied'

function PushNotificationTest() {
  const [permission, setPermission] = useState<NotifPermission>('default')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [swRegistered, setSwRegistered] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [vapidConfigured, setVapidConfigured] = useState(false)

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission as NotifPermission)
    }
    // Check SW registration status
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/sw.js').then(reg => {
        if (reg) setSwRegistered(true)
      })
    }
    // Check VAPID configuration
    fetch('/api/notifications/push/vapid')
      .then(r => r.json())
      .then((data: { configured?: boolean }) => {
        setVapidConfigured(!!data.configured)
      })
      .catch(() => {})
  }, [])

  const handleRegisterSW = async () => {
    if (!('serviceWorker' in navigator)) {
      setResult('このブラウザはService Workerに対応していません')
      return
    }
    setSending(true)
    setResult(null)
    try {
      await navigator.serviceWorker.register('/sw.js')
      setSwRegistered(true)
      setResult('Service Workerを登録しました')
    } catch {
      setResult('Service Workerの登録に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const handleSubscribe = async () => {
    if (!swRegistered) {
      setResult('先にService Workerを登録してください')
      return
    }
    if (!('PushManager' in window)) {
      setResult('このブラウザはWeb Pushに対応していません')
      return
    }
    setSending(true)
    setResult(null)
    try {
      // Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm as NotifPermission)
      if (perm !== 'granted') {
        setResult('通知の許可が必要です')
        setSending(false)
        return
      }

      // Get VAPID public key
      const vapidRes = await fetch('/api/notifications/push/vapid')
      const vapidData = await vapidRes.json() as { publicKey: string }
      const publicKey = vapidData.publicKey

      // Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey === 'DEMO_KEY' ? undefined : (urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer),
      })

      // Save subscription to server
      await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
      setSubscribed(true)
      setResult('Web Push通知を購読しました')
    } catch (err) {
      setResult(`購読に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSending(false)
    }
  }

  const handleBrowserTest = async () => {
    if (typeof Notification === 'undefined') {
      setResult('このブラウザはWeb通知に対応していません')
      return
    }

    setSending(true)
    setResult(null)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as NotifPermission)
      if (perm === 'granted') {
        new Notification('BuildSync', { body: 'テスト通知です' })
        setResult('テスト通知を送信しました')
      } else if (perm === 'denied') {
        setResult('通知がブロックされています。ブラウザの設定から許可してください。')
      } else {
        setResult('通知の許可が得られませんでした')
      }
    } catch {
      setResult('通知の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const handleServerPushTest = async () => {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'BuildSync', body: 'サーバーからのテスト通知です' }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(`サーバープッシュ送信完了: ${data.message ?? 'OK'}`)
      } else {
        setResult(`エラー: ${data.error ?? '送信に失敗しました'}`)
      }
    } catch {
      setResult('サーバープッシュ送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const permLabel =
    permission === 'granted' ? '許可済' :
    permission === 'denied' ? 'ブロック' :
    '未許可'

  const permColor =
    permission === 'granted' ? 'text-green-600 bg-green-50 border-green-200' :
    permission === 'denied' ? 'text-red-600 bg-red-50 border-red-200' :
    'text-amber-600 bg-amber-50 border-amber-200'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900">プッシュ通知テスト</h3>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        ブラウザのプッシュ通知やサーバーからのプッシュ通知をテスト送信できます。
      </p>

      {/* 設定状態 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">通知許可:</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${permColor}`}>
            {permLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Service Worker:</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${swRegistered ? 'text-green-600 bg-green-50 border-green-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
            {swRegistered ? '登録済' : '未登録'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">VAPIDキー:</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${vapidConfigured ? 'text-green-600 bg-green-50 border-green-200' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
            {vapidConfigured ? '設定済' : '未設定（モック）'}
          </span>
        </div>
        {subscribed && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">購読:</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded border text-green-600 bg-green-50 border-green-200">購読中</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRegisterSW}
          disabled={sending || swRegistered}
          className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Service Worker登録
        </button>
        <button
          onClick={handleSubscribe}
          disabled={sending || subscribed}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          購読
        </button>
        <button
          onClick={handleBrowserTest}
          disabled={sending}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Bell className="w-4 h-4" />
          ブラウザ通知テスト
        </button>
        <button
          onClick={handleServerPushTest}
          disabled={sending}
          className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
        >
          サーバープッシュテスト
        </button>
      </div>

      {result && (
        <div className={`mt-3 text-sm px-3 py-2 rounded-lg border ${
          result.includes('完了') || result.includes('しました') || result.includes('購読')
            ? 'text-green-700 bg-green-50 border-green-200'
            : 'text-red-700 bg-red-50 border-red-200'
        }`}>
          {result}
        </div>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
