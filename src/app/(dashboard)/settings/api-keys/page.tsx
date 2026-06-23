'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Plus, X, Trash2, Key, Copy, Check, AlertTriangle } from 'lucide-react'

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

type ApiKey = {
  id: string
  name: string
  key: string
  lastUsedAt: string | null
  expiresAt: string | null
  enabled: boolean
  createdAt: string
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', expiresAt: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newKey, setNewKey] = useState<{ id: string; name: string; key: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = () => {
    fetch('/api/api-keys')
      .then(r => r.json())
      .then(data => {
        setApiKeys(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const openAdd = () => {
    setForm({ name: '', expiresAt: '' })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, expiresAt: form.expiresAt || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        setShowModal(false)
        setNewKey({ id: data.id, name: data.name, key: data.key })
        fetchKeys()
      } else {
        const err = await res.json()
        setError(err.error || '作成に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) setApiKeys(prev => prev.filter(k => k.id !== id))
  }

  const handleCopy = () => {
    if (newKey?.key) {
      navigator.clipboard.writeText(newKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ja-JP')
  }

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
                    item.href === '/settings/api-keys' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-4xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">APIキー管理</h2>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
            APIキーを使用して、外部システムからBuildSync APIにアクセスできます。
            キーは発行時に一度だけ表示されます。安全な場所に保管してください。
          </div>

          <div className="flex justify-end mb-4">
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> APIキーを発行
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-500 p-8">読み込み中...</div>
          ) : apiKeys.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Key className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">APIキーが登録されていません</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">名前</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">キー</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">作成日</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">最終使用</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">有効期限</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map(k => (
                    <tr key={k.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{k.key}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(k.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(k.lastUsedAt)}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {k.expiresAt ? (
                          <span className={new Date(k.expiresAt) < new Date() ? 'text-red-600' : ''}>
                            {formatDate(k.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-slate-400">無制限</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(k.id, k.name)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">APIキーを発行</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">名前 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="例：本番環境用、Slack連携用"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">有効期限（任意）</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">未設定の場合、無制限に有効です</p>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">
                  {saving ? '発行中...' : '発行する'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time key display modal */}
      {newKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">APIキーが発行されました</h2>
              <button onClick={() => { setNewKey(null); setCopied(false) }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">このキーは一度しか表示されません。今すぐコピーして安全な場所に保管してください。</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-1">名前: <span className="font-medium text-slate-900">{newKey.name}</span></p>
              <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
                <code className="flex-1 text-green-400 text-sm font-mono break-all">{newKey.key}</code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'コピー済' : 'コピー'}
                </button>
              </div>
            </div>
            <button
              onClick={() => { setNewKey(null); setCopied(false) }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
