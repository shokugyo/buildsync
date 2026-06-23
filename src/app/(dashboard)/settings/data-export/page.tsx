'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Download, FileJson, FileText, AlertTriangle } from 'lucide-react'

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

interface Counts {
  projects: number
  customers: number
  suppliers: number
  orders: number
  invoices: number
  schedules: number
  attendance: number
}

const CSV_EXPORTS = [
  { key: 'projects', label: '案件一覧', type: 'projects', description: '案件の基本情報' },
  { key: 'customers', label: '顧客一覧', type: 'customers', description: '顧客情報（顧客名・連絡先）' },
  { key: 'suppliers', label: '協力会社一覧', type: 'suppliers', description: '協力会社情報' },
]

// 選択エクスポート用データ種別定義
const EXPORT_TARGETS = [
  { id: 'projects', label: '案件データ', apiPath: '/api/export/projects' },
  { id: 'schedules', label: '工程データ', apiPath: '/api/export/schedules' },
  { id: 'photos', label: '写真データ', apiPath: '/api/export/photos' },
  { id: 'orders', label: '発注データ', apiPath: '/api/export/orders' },
  { id: 'invoices', label: '請求データ', apiPath: '/api/export/invoices' },
  { id: 'budgets', label: '原価データ', apiPath: '/api/export/budgets' },
  { id: 'customers', label: '顧客データ', apiPath: '/api/export/customers' },
  { id: 'suppliers', label: '協力会社データ', apiPath: '/api/export/suppliers' },
  { id: 'work-reports', label: '作業報告', apiPath: '/api/export/work-reports' },
]

export default function DataExportPage() {
  const pathname = usePathname()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [countsLoading, setCountsLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [lastExport, setLastExport] = useState<string | null>(null)

  // 選択エクスポート用状態
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('buildsync_last_export')
    if (stored) setLastExport(stored)

    const fetchCounts = async () => {
      try {
        const [projects, customers, suppliers, orders, invoices] = await Promise.all([
          fetch('/api/projects').then(r => r.json()),
          fetch('/api/customers').then(r => r.json()),
          fetch('/api/suppliers').then(r => r.json()),
          fetch('/api/orders').then(r => r.json()),
          fetch('/api/invoices').then(r => r.json()),
        ])
        setCounts({
          projects: Array.isArray(projects) ? projects.length : (projects?.total ?? 0),
          customers: Array.isArray(customers) ? customers.length : (customers?.total ?? 0),
          suppliers: Array.isArray(suppliers) ? suppliers.length : (suppliers?.total ?? 0),
          orders: Array.isArray(orders) ? orders.length : (orders?.total ?? 0),
          invoices: Array.isArray(invoices) ? invoices.length : (invoices?.total ?? 0),
          schedules: 0,
          attendance: 0,
        })
      } catch {
        setCounts(null)
      } finally {
        setCountsLoading(false)
      }
    }
    fetchCounts()
  }, [])

  const handleFullExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/export/company-data')
      if (!res.ok) {
        alert('エクスポートに失敗しました')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const today = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `buildsync-export-${today}.json`
      a.click()
      URL.revokeObjectURL(url)

      const now = new Date().toLocaleString('ja-JP')
      localStorage.setItem('buildsync_last_export', now)
      setLastExport(now)
    } finally {
      setExporting(false)
    }
  }

  const handleCsvExport = (type: string) => {
    window.location.href = `/api/export?type=${type}`
  }

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAllTargets = () => {
    if (selectedTargets.size === EXPORT_TARGETS.length) {
      setSelectedTargets(new Set())
    } else {
      setSelectedTargets(new Set(EXPORT_TARGETS.map(t => t.id)))
    }
  }

  const handleDeleteCompanyData = () => {
    if (deleteInput !== 'DELETE') {
      alert('「DELETE」と正確に入力してください')
      return
    }
    // 実際の削除APIは未実装のためアラートのみ
    alert('会社データの削除をリクエストしました。管理者にご連絡ください。')
    setDeleteConfirmOpen(false)
    setDeleteInput('')
  }

  const DATA_ROWS = [
    { label: '案件', key: 'projects' },
    { label: '顧客', key: 'customers' },
    { label: '協力会社', key: 'suppliers' },
    { label: '発注', key: 'orders' },
    { label: '請求書', key: 'invoices' },
    { label: '工程', key: 'schedules' },
    { label: '入退場', key: 'attendance' },
  ] as const

  const selectedList = EXPORT_TARGETS.filter(t => selectedTargets.has(t.id))

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

        <div className="flex-1 p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">データエクスポート</h2>
            <p className="text-sm text-slate-500 mt-0.5">会社のデータをエクスポートできます</p>
          </div>

          {/* 全データJSONエクスポート */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-blue-600" />
                  全データをエクスポート
                </h3>
                <p className="text-sm text-slate-500 mt-1">エクスポートには全ての案件・顧客・協力会社データが含まれます</p>
                {lastExport && (
                  <p className="text-xs text-slate-400 mt-1">最終エクスポート: {lastExport}</p>
                )}
              </div>
              <button
                onClick={handleFullExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'エクスポート中...' : 'JSONダウンロード'}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">含まれるデータ</p>
              {countsLoading ? (
                <div className="text-sm text-slate-400">読み込み中...</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DATA_ROWS.map(({ label, key }) => (
                    <div key={key} className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {counts ? (counts[key] ?? '-') : '-'}
                        <span className="text-xs font-normal text-slate-400 ml-1">件</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 選択エクスポート */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-slate-600" />
              エクスポート対象を選択
            </h3>
            <p className="text-sm text-slate-500 mb-4">ダウンロードするデータ種別を選択してください</p>

            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedTargets.size === EXPORT_TARGETS.length}
                onChange={toggleAllTargets}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-slate-700 cursor-pointer">
                すべて選択
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {EXPORT_TARGETS.map((target) => (
                <label
                  key={target.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedTargets.has(target.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTargets.has(target.id)}
                    onChange={() => toggleTarget(target.id)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-800">{target.label}</span>
                </label>
              ))}
            </div>

            {selectedList.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  選択中のデータ（{selectedList.length}件）— 個別ダウンロード
                </p>
                <div className="space-y-2">
                  {selectedList.map((target) => (
                    <div key={target.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-700">{target.label}</span>
                      <a
                        href={target.apiPath}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSVダウンロード
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 個別CSVエクスポート（既存） */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-slate-600" />
              個別CSVエクスポート
            </h3>
            <div className="space-y-3">
              {CSV_EXPORTS.map(item => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                  <button
                    onClick={() => handleCsvExport(item.type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 会計システム連携 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
            <h3 className="font-semibold text-slate-900 mb-3">会計システム連携</h3>
            <div className="flex gap-3 mb-3">
              <a
                href="/api/export/accounting?format=yayoi"
                download
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                弥生会計形式 CSV
              </a>
              <a
                href="/api/export/accounting?format=freee"
                download
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                freee形式 CSV
              </a>
            </div>
            <p className="text-xs text-slate-500">発注・請求データを会計ソフト取込用CSVで出力します</p>
          </div>

          {/* 危険ゾーン */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
            <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              危険な操作
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              以下の操作は取り消せません。実行前に必ずデータをエクスポートしてください。
            </p>

            {!deleteConfirmOpen ? (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                会社データを全て削除する
              </button>
            ) : (
              <div className="border border-red-200 rounded-xl p-4 bg-red-50">
                <p className="text-sm font-semibold text-red-800 mb-1">本当に削除しますか？</p>
                <p className="text-xs text-red-600 mb-3">
                  この操作は取り消せません。確認のため、下のフィールドに <strong>DELETE</strong> と入力してください。
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE と入力"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3 bg-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteCompanyData}
                    disabled={deleteInput !== 'DELETE'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    削除する
                  </button>
                  <button
                    onClick={() => { setDeleteConfirmOpen(false); setDeleteInput('') }}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
