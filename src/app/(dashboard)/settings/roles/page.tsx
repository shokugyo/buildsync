'use client'

import Header from '@/components/Header'
import Link from 'next/link'
import { Shield } from 'lucide-react'

const LEFT_MENU = [
  { label: 'プロフィール情報', href: '/settings' },
  { label: '通知設定', href: '/settings/notifications' },
  { label: 'セキュリティ（2FA）', href: '/settings/security' },
  { label: 'ログイン履歴', href: '/settings/sessions' },
  { label: '自社情報', href: '/settings/company' },
  { label: 'インボイス設定', href: '/settings/invoice' },
  { label: '料金プラン', href: '/settings/plan' },
  { label: '権限管理', href: '/settings/roles' },
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

const ROLES = ['管理者', '経営者', '営業', '現場監督', '事務担当', '協力会社', '職人']

type Permission = '○' | '△' | '×'

interface FeatureRow {
  feature: string
  perms: Permission[]
}

const MATRIX: FeatureRow[] = [
  { feature: '案件閲覧',     perms: ['○', '○', '○', '○', '○', '△', '△'] },
  { feature: '案件登録',     perms: ['○', '△', '○', '△', '△', '×', '×'] },
  { feature: '案件編集',     perms: ['○', '△', '○', '○', '△', '×', '×'] },
  { feature: '工程閲覧',     perms: ['○', '○', '○', '○', '○', '△', '△'] },
  { feature: '工程編集',     perms: ['○', '×', '△', '○', '×', '×', '×'] },
  { feature: 'チャット',     perms: ['○', '△', '○', '○', '○', '○', '○'] },
  { feature: '図面閲覧',     perms: ['○', '△', '○', '○', '△', '△', '△'] },
  { feature: '図面登録',     perms: ['○', '×', '△', '○', '×', '×', '×'] },
  { feature: '写真閲覧',     perms: ['○', '△', '○', '○', '△', '△', '△'] },
  { feature: '写真登録',     perms: ['○', '×', '△', '○', '×', '○', '○'] },
  { feature: '検査登録',     perms: ['○', '×', '×', '○', '×', '×', '×'] },
  { feature: '是正報告',     perms: ['○', '×', '×', '○', '×', '○', '○'] },
  { feature: '発注登録',     perms: ['○', '×', '×', '○', '○', '×', '×'] },
  { feature: '発注承認',     perms: ['○', '△', '×', '△', '△', '×', '×'] },
  { feature: '請求登録',     perms: ['○', '×', '×', '×', '○', '△', '×'] },
  { feature: '原価閲覧',     perms: ['○', '○', '△', '△', '○', '×', '×'] },
  { feature: '粗利閲覧',     perms: ['○', '○', '△', '△', '△', '×', '×'] },
  { feature: 'ユーザー管理', perms: ['○', '×', '×', '×', '×', '×', '×'] },
]

function PermBadge({ perm }: { perm: Permission }) {
  if (perm === '○') {
    return (
      <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-green-700 bg-green-100 rounded">
        ○
      </span>
    )
  }
  if (perm === '△') {
    return (
      <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-yellow-700 bg-yellow-100 rounded">
        △
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-slate-400 bg-slate-100 rounded">
      ×
    </span>
  )
}

export default function RolesPage() {
  return (
    <div>
      <Header title="権限管理" />
      <div className="flex min-h-screen">
        {/* Left sidebar */}
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">プロフィール情報</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings/roles'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">権限マトリクス</h2>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap sticky left-0 bg-slate-50 z-10">
                      機能
                    </th>
                    {ROLES.map((role) => (
                      <th
                        key={role}
                        className="px-3 py-3 text-center text-xs font-medium text-slate-500 whitespace-nowrap"
                      >
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MATRIX.map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap sticky left-0 bg-white">
                        {row.feature}
                      </td>
                      {row.perms.map((perm, i) => (
                        <td key={i} className="px-3 py-3 text-center">
                          <PermBadge perm={perm} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-sm text-slate-600">
            <p className="font-medium text-slate-500">凡例:</p>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-green-700 bg-green-100 rounded">○</span>
              許可
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-yellow-700 bg-yellow-100 rounded">△</span>
              条件付き許可
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-slate-400 bg-slate-100 rounded">×</span>
              不許可
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
