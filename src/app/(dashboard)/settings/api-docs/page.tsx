'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { usePathname } from 'next/navigation'

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
  { label: 'API仕様書', href: '/settings/api-docs' },
  { label: '検査テンプレート', href: '/settings/inspection-templates' },
  { label: 'プロジェクトテンプレート', href: '/settings/project-templates' },
  { label: 'メールテンプレート', href: '/settings/email-templates' },
  { label: '見積テンプレート', href: '/settings/estimate-templates' },
  { label: 'メンバー管理', href: '/settings/users' },
  { label: '工程マスタ', href: '/settings/schedule-masters' },
  { label: '監査ログ', href: '/settings/audit-logs' },
  { label: 'データエクスポート', href: '/settings/data-export' },
]

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  summary: string
  description?: string
  params?: { name: string; type: string; required: boolean; description: string }[]
  body?: { name: string; type: string; required: boolean; description: string }[]
  response?: string
}

interface ApiGroup {
  tag: string
  description: string
  endpoints: Endpoint[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
}

const API_GROUPS: ApiGroup[] = [
  {
    tag: '認証',
    description: '認証・セッション管理',
    endpoints: [
      { method: 'POST', path: '/api/auth/signin', summary: 'ログイン', description: 'メールアドレスとパスワードでログイン', body: [{ name: 'email', type: 'string', required: true, description: 'メールアドレス' }, { name: 'password', type: 'string', required: true, description: 'パスワード' }], response: '{ token: string }' },
      { method: 'POST', path: '/api/auth/forgot-password', summary: 'パスワードリセット送信', body: [{ name: 'email', type: 'string', required: true, description: 'メールアドレス' }] },
    ],
  },
  {
    tag: '案件',
    description: '案件（プロジェクト）の管理',
    endpoints: [
      { method: 'GET', path: '/api/projects', summary: '案件一覧取得', params: [{ name: 'status', type: 'string', required: false, description: '状態フィルター' }, { name: 'q', type: 'string', required: false, description: '検索キーワード' }], response: 'Project[]' },
      { method: 'POST', path: '/api/projects', summary: '案件作成', body: [{ name: 'name', type: 'string', required: true, description: '案件名' }, { name: 'customerId', type: 'string', required: false, description: '顧客ID' }, { name: 'startDate', type: 'string', required: false, description: '着工日 (ISO8601)' }], response: 'Project' },
      { method: 'GET', path: '/api/projects/{id}', summary: '案件詳細取得', response: 'Project' },
      { method: 'PUT', path: '/api/projects/{id}', summary: '案件更新', response: 'Project' },
      { method: 'DELETE', path: '/api/projects/{id}', summary: '案件削除' },
    ],
  },
  {
    tag: '顧客',
    description: '顧客情報の管理',
    endpoints: [
      { method: 'GET', path: '/api/customers', summary: '顧客一覧取得', response: 'Customer[]' },
      { method: 'POST', path: '/api/customers', summary: '顧客作成', body: [{ name: 'name', type: 'string', required: true, description: '顧客名' }, { name: 'email', type: 'string', required: false, description: 'メール' }, { name: 'phone', type: 'string', required: false, description: '電話番号' }], response: 'Customer' },
      { method: 'GET', path: '/api/customers/{id}', summary: '顧客詳細取得', response: 'Customer' },
      { method: 'PUT', path: '/api/customers/{id}', summary: '顧客更新', response: 'Customer' },
      { method: 'DELETE', path: '/api/customers/{id}', summary: '顧客削除' },
    ],
  },
  {
    tag: '発注',
    description: '発注書・発注管理',
    endpoints: [
      { method: 'GET', path: '/api/orders', summary: '発注一覧取得', params: [{ name: 'projectId', type: 'string', required: false, description: '案件ID' }, { name: 'status', type: 'string', required: false, description: '状態フィルター' }], response: 'Order[]' },
      { method: 'POST', path: '/api/orders', summary: '発注作成', response: 'Order' },
      { method: 'GET', path: '/api/orders/{id}', summary: '発注詳細取得', response: 'Order' },
      { method: 'PATCH', path: '/api/orders/{id}', summary: '発注更新', response: 'Order' },
      { method: 'POST', path: '/api/orders/{id}/approve', summary: '発注承認・差し戻し', body: [{ name: 'action', type: "'approve' | 'reject'", required: true, description: '承認または差し戻し' }, { name: 'comment', type: 'string', required: false, description: 'コメント' }], response: 'Order' },
    ],
  },
  {
    tag: '請求書',
    description: '請求書の管理・送付',
    endpoints: [
      { method: 'GET', path: '/api/invoices', summary: '請求書一覧取得', response: 'Invoice[]' },
      { method: 'POST', path: '/api/invoices', summary: '請求書作成', response: 'Invoice' },
      { method: 'GET', path: '/api/invoices/{id}', summary: '請求書詳細取得', response: 'Invoice' },
      { method: 'PATCH', path: '/api/invoices/{id}', summary: '請求書更新', response: 'Invoice' },
      { method: 'DELETE', path: '/api/invoices/{id}', summary: '請求書削除' },
      { method: 'GET', path: '/api/invoices/{id}/verify', summary: '改ざん検知チェック（電子帳簿保存法）', response: '{ verified: boolean, hash: string }' },
      { method: 'POST', path: '/api/invoices/{id}/seal', summary: 'ハッシュシール（電子帳簿保存法）', response: '{ hash: string, createdAt: string }' },
    ],
  },
  {
    tag: '工程',
    description: '工程スケジュール管理',
    endpoints: [
      { method: 'GET', path: '/api/schedules', summary: '工程一覧取得', params: [{ name: 'projectId', type: 'string', required: false, description: '案件ID' }], response: 'Schedule[]' },
      { method: 'POST', path: '/api/schedules', summary: '工程作成', response: 'Schedule' },
      { method: 'PUT', path: '/api/schedules/{id}', summary: '工程更新', response: 'Schedule' },
      { method: 'DELETE', path: '/api/schedules/{id}', summary: '工程削除' },
      { method: 'GET', path: '/api/schedules/dependencies', summary: '依存関係一覧取得', response: 'ScheduleDependency[]' },
    ],
  },
  {
    tag: '写真',
    description: '現場写真の管理',
    endpoints: [
      { method: 'GET', path: '/api/photos', summary: '写真一覧取得', params: [{ name: 'projectId', type: 'string', required: false, description: '案件ID' }], response: 'Photo[]' },
      { method: 'POST', path: '/api/photos', summary: '写真アップロード・登録', response: 'Photo' },
      { method: 'PATCH', path: '/api/photos/{id}', summary: '写真情報更新（タグ・コメント）', response: 'Photo' },
      { method: 'DELETE', path: '/api/photos/{id}', summary: '写真削除' },
    ],
  },
  {
    tag: '作業報告',
    description: '作業報告書の提出・承認',
    endpoints: [
      { method: 'GET', path: '/api/work-reports', summary: '作業報告一覧取得', response: 'WorkReport[]' },
      { method: 'POST', path: '/api/work-reports', summary: '作業報告作成', response: 'WorkReport' },
      { method: 'PATCH', path: '/api/work-reports/{id}', summary: '作業報告更新・承認', body: [{ name: 'action', type: "'approve' | 'reject'", required: false, description: '承認/差し戻し' }], response: 'WorkReport' },
      { method: 'DELETE', path: '/api/work-reports/{id}', summary: '作業報告削除' },
    ],
  },
  {
    tag: '公開API (v1)',
    description: 'APIキー認証による外部連携API（X-API-Key ヘッダー必須）',
    endpoints: [
      { method: 'GET', path: '/api/v1/projects', summary: '案件一覧', description: 'X-API-Key ヘッダーで認証。ページネーション対応。', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号（デフォルト: 1）' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'status', type: 'string', required: false, description: '状態フィルター' }], response: '{ data: Project[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/tasks', summary: 'タスク一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'projectId', type: 'string', required: false, description: '案件ID' }, { name: 'status', type: 'string', required: false, description: '状態フィルター' }], response: '{ data: Task[], pagination: { page, limit, total, totalPages } }' },
      { method: 'POST', path: '/api/v1/tasks', summary: 'タスク作成', body: [{ name: 'title', type: 'string', required: true, description: 'タイトル' }, { name: 'projectId', type: 'string', required: false, description: '案件ID' }, { name: 'assignedTo', type: 'string', required: false, description: '担当者ID' }, { name: 'dueDate', type: 'string', required: false, description: '期日 (ISO8601)' }, { name: 'priority', type: 'string', required: false, description: '優先度' }, { name: 'status', type: 'string', required: false, description: '状態' }], response: '{ data: Task }' },
      { method: 'GET', path: '/api/v1/customers', summary: '顧客一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'search', type: 'string', required: false, description: '名前・メール部分一致検索' }], response: '{ data: Customer[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/schedules', summary: '工程一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'projectId', type: 'string', required: false, description: '案件ID' }], response: '{ data: Schedule[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/drawings', summary: '図面一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'projectId', type: 'string', required: false, description: '案件ID' }], response: '{ data: Drawing[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/photos', summary: '写真一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'projectId', type: 'string', required: false, description: '案件ID' }], response: '{ data: Photo[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/orders', summary: '発注一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'status', type: 'string', required: false, description: '状態フィルター' }], response: '{ data: Order[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/invoices', summary: '請求一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'status', type: 'string', required: false, description: '状態フィルター' }], response: '{ data: Invoice[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/costs', summary: '原価一覧（予算）', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'projectId', type: 'string', required: false, description: '案件ID' }], response: '{ data: Budget[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/users', summary: 'ユーザー一覧（自社のみ）', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }], response: '{ data: User[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/notifications', summary: '通知一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'unreadOnly', type: 'boolean', required: false, description: '未読のみ (true/false)' }], response: '{ data: Notification[], pagination: { page, limit, total, totalPages } }' },
      { method: 'GET', path: '/api/v1/audit-logs', summary: '操作ログ一覧', params: [{ name: 'page', type: 'number', required: false, description: 'ページ番号' }, { name: 'limit', type: 'number', required: false, description: '件数（最大100）' }, { name: 'action', type: 'string', required: false, description: 'アクション種別' }, { name: 'from', type: 'string', required: false, description: '開始日 (ISO8601)' }, { name: 'to', type: 'string', required: false, description: '終了日 (ISO8601)' }], response: '{ data: AuditLog[], pagination: { page, limit, total, totalPages } }' },
    ],
  },
  {
    tag: 'エクスポート',
    description: 'データエクスポート（CSV・JSON）',
    endpoints: [
      { method: 'GET', path: '/api/export/company-data', summary: '全社データJSON一括エクスポート', response: 'JSON blob' },
      { method: 'GET', path: '/api/export/accounting', summary: '会計システム連携CSV', params: [{ name: 'format', type: "'yayoi' | 'freee'", required: false, description: '出力フォーマット' }, { name: 'from', type: 'string', required: false, description: '開始日' }, { name: 'to', type: 'string', required: false, description: '終了日' }], response: 'CSV' },
      { method: 'POST', path: '/api/export/custom', summary: 'カスタムレポートCSV', body: [{ name: 'source', type: 'string', required: true, description: 'データソース' }, { name: 'fields', type: 'string[]', required: true, description: '出力フィールド' }], response: 'CSV' },
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-slate-400 hover:text-slate-600 transition-colors"
      title="コピー"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-left transition-colors"
      >
        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono w-16 text-center flex-shrink-0 ${METHOD_COLORS[ep.method]}`}>
          {ep.method}
        </span>
        <span className="font-mono text-sm text-slate-700 flex-1">{ep.path}</span>
        <span className="text-sm text-slate-500 flex-1">{ep.summary}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 bg-slate-50 border-t border-slate-200">
          {ep.description && <p className="text-sm text-slate-600 mt-3 mb-3">{ep.description}</p>}

          {ep.params && ep.params.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">クエリパラメータ</p>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-400"><th className="pb-1 pr-3 font-medium">名前</th><th className="pb-1 pr-3 font-medium">型</th><th className="pb-1 pr-3 font-medium">必須</th><th className="pb-1 font-medium">説明</th></tr></thead>
                <tbody>
                  {ep.params.map(p => (
                    <tr key={p.name} className="border-t border-slate-200">
                      <td className="py-1.5 pr-3 font-mono text-blue-700">{p.name}</td>
                      <td className="py-1.5 pr-3 text-slate-500 font-mono">{p.type}</td>
                      <td className="py-1.5 pr-3">{p.required ? <span className="text-red-500">必須</span> : <span className="text-slate-400">任意</span>}</td>
                      <td className="py-1.5 text-slate-600">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ep.body && ep.body.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">リクエストボディ (JSON)</p>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-400"><th className="pb-1 pr-3 font-medium">名前</th><th className="pb-1 pr-3 font-medium">型</th><th className="pb-1 pr-3 font-medium">必須</th><th className="pb-1 font-medium">説明</th></tr></thead>
                <tbody>
                  {ep.body.map(p => (
                    <tr key={p.name} className="border-t border-slate-200">
                      <td className="py-1.5 pr-3 font-mono text-green-700">{p.name}</td>
                      <td className="py-1.5 pr-3 text-slate-500 font-mono">{p.type}</td>
                      <td className="py-1.5 pr-3">{p.required ? <span className="text-red-500">必須</span> : <span className="text-slate-400">任意</span>}</td>
                      <td className="py-1.5 text-slate-600">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ep.response && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">レスポンス</p>
              <code className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono">{ep.response}</code>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <code className="text-xs bg-slate-800 text-green-400 px-3 py-1.5 rounded font-mono flex-1 overflow-x-auto">
              {ep.method} {ep.path}
            </code>
            <CopyButton text={`${ep.method} ${ep.path}`} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApiDocsPage() {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(API_GROUPS.map(g => g.tag)))

  const toggleGroup = (tag: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(tag)) { next.delete(tag) } else { next.add(tag) }
      return next
    })
  }

  const filtered = API_GROUPS.map(g => ({
    ...g,
    endpoints: g.endpoints.filter(ep =>
      !search || ep.path.toLowerCase().includes(search.toLowerCase()) || ep.summary.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(g => g.endpoints.length > 0)

  const totalEndpoints = API_GROUPS.reduce((sum, g) => sum + g.endpoints.length, 0)

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
                    pathname === item.href ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-4xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">API仕様書</h2>
            <p className="text-sm text-slate-500 mt-0.5">BuildSync REST API リファレンス — 全{totalEndpoints}エンドポイント</p>
          </div>

          {/* Base URL */}
          <div className="bg-slate-800 text-green-400 rounded-lg px-4 py-3 mb-4 font-mono text-sm flex items-center justify-between">
            <span>Base URL: <span className="text-white">https://your-domain.vercel.app</span></span>
            <CopyButton text="https://your-domain.vercel.app" />
          </div>

          {/* Auth note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-800">
            <p className="font-semibold mb-1">認証について</p>
            <p>内部API（/api/*）はセッションCookie認証が必要です。</p>
            <p className="mt-1">外部API（/api/v1/*）は <code className="bg-blue-100 px-1 rounded font-mono">X-API-Key: your_api_key</code> ヘッダーで認証します。APIキーは <Link href="/settings/api-keys" className="underline">APIキー設定</Link> から発行できます。</p>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="エンドポイントを検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5 bg-white"
          />

          {/* Endpoint groups */}
          <div className="space-y-4">
            {filtered.map(group => (
              <div key={group.tag} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.tag)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  {openGroups.has(group.tag) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-semibold text-slate-900">{group.tag}</span>
                  <span className="text-sm text-slate-500">{group.description}</span>
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{group.endpoints.length}</span>
                </button>
                {openGroups.has(group.tag) && (
                  <div className="px-4 pb-4 space-y-2">
                    {group.endpoints.map(ep => (
                      <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
