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

const PLAN_LIMITS = {
  フリー: { projects: 5, users: 3, storage: 500, api: 100 },
  Basic: { projects: 50, users: 10, storage: 5000, api: 1000 },
  Pro: { projects: 200, users: 30, storage: 50000, api: 10000 },
  Enterprise: { projects: 99999, users: 99999, storage: 99999999, api: 99999999 },
}

const PLAN_COLORS: Record<string, string> = {
  フリー: 'bg-slate-100 text-slate-700',
  Basic: 'bg-blue-100 text-blue-700',
  Pro: 'bg-purple-100 text-purple-700',
  Enterprise: 'bg-amber-100 text-amber-700',
}

const FEATURE_MATRIX = [
  { feature: '案件管理', free: true, basic: true, pro: true, enterprise: true },
  { feature: 'スケジュール管理', free: true, basic: true, pro: true, enterprise: true },
  { feature: '写真管理', free: true, basic: true, pro: true, enterprise: true },
  { feature: '請求書・見積書', free: false, basic: true, pro: true, enterprise: true },
  { feature: '協力会社管理', free: false, basic: true, pro: true, enterprise: true },
  { feature: 'Webhook連携', free: false, basic: false, pro: true, enterprise: true },
  { feature: 'APIキー', free: false, basic: false, pro: true, enterprise: true },
  { feature: '監査ログ', free: false, basic: false, pro: true, enterprise: true },
  { feature: 'IPアドレス制限', free: false, basic: false, pro: false, enterprise: true },
  { feature: '専任サポート', free: false, basic: false, pro: false, enterprise: true },
]

function Check({ ok }: { ok: boolean }) {
  if (ok) return <span className="text-green-500 font-bold text-base">✓</span>
  return <span className="text-slate-300 text-base">—</span>
}

function UsageBar({ label, value, limit, unit = '' }: { label: string; value: number; limit: number; unit?: string }) {
  const isUnlimited = limit >= 99999
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((value / limit) * 100))
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-700 font-medium">
          {value.toLocaleString()}{unit}
          {!isUnlimited && <span className="text-slate-400 font-normal"> / {limit.toLocaleString()}{unit}</span>}
          {isUnlimited && <span className="text-slate-400 font-normal"> / 無制限</span>}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        {!isUnlimited && (
          <div
            className={`h-full rounded-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        )}
        {isUnlimited && <div className="h-full rounded-full bg-green-400" style={{ width: '100%' }} />}
      </div>
    </div>
  )
}

export default function PlanSettingsPage() {
  const [plan, setPlan] = useState('Basic')
  const [usage, setUsage] = useState({
    projectCount: 0,
    userCount: 0,
    photoCount: 0,
    storageUsedMB: 0,
    apiCallsThisMonth: 0,
  })
  const [loadingUsage, setLoadingUsage] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/company').then(r => r.json()),
      fetch('/api/settings/usage').then(r => r.json()),
    ]).then(([company, usageData]) => {
      if (company && !company.error) {
        setPlan(company.plan || 'Basic')
      }
      if (usageData && !usageData.error) {
        setUsage(usageData)
      }
      setLoadingUsage(false)
    }).catch(() => setLoadingUsage(false))
  }, [])

  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.Basic
  const planBadgeCls = PLAN_COLORS[plan] || PLAN_COLORS.Basic

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
                    item.href === '/settings/plan' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-base font-semibold text-slate-900">料金プラン</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planBadgeCls}`}>
              {plan}プラン
            </span>
          </div>

          {/* 利用状況 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700">ご利用状況</h3>
            </div>
            <div className="px-5 py-5 space-y-5">
              {loadingUsage ? (
                <p className="text-sm text-slate-400 text-center">読み込み中...</p>
              ) : (
                <>
                  <UsageBar
                    label="案件数"
                    value={usage.projectCount}
                    limit={limits.projects}
                    unit="件"
                  />
                  <UsageBar
                    label="ユーザー数"
                    value={usage.userCount}
                    limit={limits.users}
                    unit="名"
                  />
                  <UsageBar
                    label="ストレージ（写真枚数）"
                    value={usage.photoCount}
                    limit={limits.storage}
                    unit="枚"
                  />
                  <UsageBar
                    label="API呼び出し（今月）"
                    value={usage.apiCallsThisMonth}
                    limit={limits.api}
                    unit="回"
                  />
                </>
              )}
            </div>
          </div>

          {/* Feature matrix */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700">機能比較</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-slate-600 font-medium w-1/2">機能</th>
                    <th className="text-center px-3 py-3 text-slate-600 font-medium">フリー</th>
                    <th className="text-center px-3 py-3 text-blue-700 font-semibold">Basic</th>
                    <th className="text-center px-3 py-3 text-purple-700 font-semibold">Pro</th>
                    <th className="text-center px-3 py-3 text-amber-700 font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_MATRIX.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-5 py-2.5 text-slate-700">{row.feature}</td>
                      <td className="text-center px-3 py-2.5"><Check ok={row.free} /></td>
                      <td className="text-center px-3 py-2.5"><Check ok={row.basic} /></td>
                      <td className="text-center px-3 py-2.5"><Check ok={row.pro} /></td>
                      <td className="text-center px-3 py-2.5"><Check ok={row.enterprise} /></td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-50">
                    <td className="px-5 py-2.5 text-slate-700">案件数上限</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">5件</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">50件</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">200件</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">無制限</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5 text-slate-700">ユーザー数上限</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">3名</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">10名</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">30名</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">無制限</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Upgrade & contact */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
            <h3 className="text-base font-semibold text-slate-900 mb-1">プランをアップグレード</h3>
            <p className="text-sm text-slate-400 mb-5">より多くの機能と上限が必要な場合はお気軽にご相談ください。</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                disabled
                className="bg-red-400 text-white px-6 py-2.5 rounded-lg font-medium text-sm cursor-not-allowed opacity-60"
                title="担当者にお問い合わせください"
              >
                プランをアップグレード
              </button>
              <button className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors">
                カスタマーサポート
              </button>
              <span className="text-sm text-slate-600">お電話はこちら 0120-320-910</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
