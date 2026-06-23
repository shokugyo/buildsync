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

export default function InvoiceSettingsPage() {
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [businessType, setBusinessType] = useState<'taxable' | 'exempt'>('taxable')

  useEffect(() => {
    fetch('/api/company')
      .then(res => res.json())
      .then(data => {
        setRegistrationNumber(data.registrationNumber ?? null)
      })
      .catch(() => {
        setRegistrationNumber(null)
      })
      .finally(() => setLoading(false))
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
                    item.href === '/settings/invoice' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">適格請求書発行事業者の登録番号の設定</h2>

            <p className="text-sm text-slate-600 mb-2 leading-relaxed">
              登録番号とは、インボイス制度にて消費税適格請求書発行事業者の登録を受けようとする事業者が、
              税務署に対して行う申請書（消費税適格請求書発行事業者の登録申請書）を提出し、税務署長の登録を受けた場合に
              事業者に通知される番号です。
            </p>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              登録番号をBUILDSYNCにてご登録いただきますと、請求書・発注書などの各書類に自動的に印字されます。
            </p>

            {/* Registration Number display */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-2">適格請求書発行事業者 登録番号</p>
              {loading ? (
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                    {registrationNumber ? registrationNumber : (
                      <span className="text-slate-400">未登録</span>
                    )}
                  </div>
                  <Link
                    href="/settings/company"
                    className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap font-medium"
                  >
                    自社情報で編集
                  </Link>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">
                登録番号は「自社情報」ページから編集できます。設定した番号は請求書・発注書に自動的に印字されます。
              </p>
            </div>

            {/* Confirmation note */}
            {registrationNumber && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-sm text-blue-700">
                登録番号 <span className="font-medium">{registrationNumber}</span> は請求書・発注書に印字されます。
              </div>
            )}

            {/* Business type (informational only) */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">事業者の種類（参考）</p>
              <div className="space-y-3 pl-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="radio"
                    name="business_type"
                    checked={businessType === 'taxable'}
                    onChange={() => setBusinessType('taxable')}
                    className="text-blue-600"
                  />
                  課税事業者の方
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="radio"
                    name="business_type"
                    checked={businessType === 'exempt'}
                    onChange={() => setBusinessType('exempt')}
                    className="text-blue-600"
                  />
                  免税事業者の方
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                ※ 免税事業者の方は登録番号の取得・登録は不要です。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
