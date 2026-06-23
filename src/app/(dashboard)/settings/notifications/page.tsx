'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
        </div>
      </div>
    </div>
  )
}
