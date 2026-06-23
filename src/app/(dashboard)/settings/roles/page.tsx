'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Shield, Save, RotateCcw } from 'lucide-react'

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

const DEFAULT_MATRIX: FeatureRow[] = [
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

const PAGE_PERMISSIONS = [
  { page: 'ダッシュボード', path: '/dashboard', roles: ['管理者', '経営者', '営業', '現場監督', '事務担当', '協力会社', '職人'] },
  { page: '案件管理', path: '/projects', roles: ['管理者', '経営者', '営業', '現場監督', '事務担当'] },
  { page: '発注管理', path: '/orders', roles: ['管理者', '経営者', '現場監督', '事務担当'] },
  { page: '請求管理', path: '/invoices', roles: ['管理者', '経営者', '事務担当'] },
  { page: '原価管理', path: '/costs', roles: ['管理者', '経営者'] },
  { page: '工程管理', path: '/schedule', roles: ['管理者', '経営者', '現場監督', '協力会社'] },
  { page: '写真管理', path: '/photos', roles: ['管理者', '経営者', '現場監督', '協力会社', '職人'] },
  { page: '作業報告', path: '/work-reports', roles: ['管理者', '現場監督', '職人'] },
  { page: '設定', path: '/settings', roles: ['管理者'] },
]

const PERM_CYCLE: Permission[] = ['○', '△', '×']

const STORAGE_KEY = 'buildsync_custom_role_permissions'

function PermBadge({ perm, onClick }: { perm: Permission; onClick?: () => void }) {
  if (perm === '○') {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-green-700 bg-green-100 rounded ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        ○
      </span>
    )
  }
  if (perm === '△') {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-yellow-700 bg-yellow-100 rounded ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        △
      </span>
    )
  }
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-slate-400 bg-slate-100 rounded ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
    >
      ×
    </span>
  )
}

type TabType = 'matrix' | 'pages'

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('matrix')
  const [matrix, setMatrix] = useState<FeatureRow[]>(() =>
    DEFAULT_MATRIX.map(row => ({ ...row, perms: [...row.perms] }))
  )
  const [saved, setSaved] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FeatureRow[]
        setMatrix(parsed)
      } catch {
        // ignore parse error
      }
    }
  }, [])

  const cyclePerm = (rowIndex: number, colIndex: number) => {
    setMatrix(prev => {
      const next = prev.map(row => ({ ...row, perms: [...row.perms] }))
      const current = next[rowIndex].perms[colIndex]
      const currentIdx = PERM_CYCLE.indexOf(current)
      next[rowIndex].perms[colIndex] = PERM_CYCLE[(currentIdx + 1) % PERM_CYCLE.length]
      return next
    })
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (!confirm('デフォルトの権限設定に戻しますか？')) return
    const reset = DEFAULT_MATRIX.map(row => ({ ...row, perms: [...row.perms] }))
    setMatrix(reset)
    localStorage.removeItem(STORAGE_KEY)
  }

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
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">権限管理</h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'matrix'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              権限マトリクス
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'pages'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              ページアクセス権限
            </button>
          </div>

          {activeTab === 'matrix' && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs text-slate-500">各セルをクリックすると権限を切り替えられます</p>
                <div className="ml-auto flex items-center gap-2">
                  {saved && (
                    <span className="text-xs text-green-600 font-medium">保存しました</span>
                  )}
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    デフォルトに戻す
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
                  >
                    <Save className="w-3.5 h-3.5" />
                    カスタム権限を保存
                  </button>
                </div>
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
                      {matrix.map((row, rowIdx) => (
                        <tr key={row.feature} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap sticky left-0 bg-white">
                            {row.feature}
                          </td>
                          {row.perms.map((perm, colIdx) => (
                            <td key={colIdx} className="px-3 py-3 text-center">
                              <PermBadge perm={perm} onClick={() => cyclePerm(rowIdx, colIdx)} />
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
            </>
          )}

          {activeTab === 'pages' && (
            <>
              <p className="text-xs text-slate-500 mb-3">各ページにアクセスできるロールの一覧です</p>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap w-32">ページ名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap w-36">パス</th>
                        {ROLES.map(role => (
                          <th key={role} className="px-3 py-3 text-center text-xs font-medium text-slate-500 whitespace-nowrap">
                            {role}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {PAGE_PERMISSIONS.map((page) => (
                        <tr key={page.path} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{page.page}</td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{page.path}</td>
                          {ROLES.map(role => (
                            <td key={role} className="px-3 py-3 text-center">
                              {page.roles.includes(role) ? (
                                <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-green-700 bg-green-100 rounded">○</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-slate-400 bg-slate-100 rounded">×</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm text-slate-600">
                <p className="font-medium text-slate-500">凡例:</p>
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-green-700 bg-green-100 rounded">○</span>
                  アクセス可
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold text-slate-400 bg-slate-100 rounded">×</span>
                  アクセス不可
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
