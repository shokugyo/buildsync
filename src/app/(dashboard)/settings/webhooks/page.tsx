'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Plus, X, Trash2, Webhook, CheckCircle, XCircle, Send, ChevronDown, ChevronUp } from 'lucide-react'

const EVENT_OPTIONS = [
  { value: 'project.created', label: '案件作成' },
  { value: 'project.status_changed', label: '案件ステータス変更' },
  { value: 'order.approved', label: '発注承認' },
  { value: 'order.rejected', label: '発注却下' },
  { value: 'invoice.approved', label: '請求書承認' },
  { value: 'payment.recorded', label: '入金記録' },
  { value: 'defect.registered', label: '不具合登録' },
  { value: 'defect.resolved', label: '不具合解決' },
]

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

type WebhookLog = {
  id: string
  event: string
  statusCode: number | null
  success: boolean
  sentAt: string
}

type WebhookConfig = {
  id: string
  url: string
  events: string
  secret?: string | null
  enabled: boolean
  createdAt: string
  logs: WebhookLog[]
}

const defaultForm = { url: '', events: [] as string[], secret: '' }

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<WebhookConfig | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; statusCode: number | null; message: string }>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})

  const fetchWebhooks = () => {
    fetch('/api/webhooks?config=true')
      .then(r => r.json())
      .then(data => {
        setWebhooks(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (w: WebhookConfig) => {
    setEditTarget(w)
    let events: string[] = []
    try { events = JSON.parse(w.events) } catch { events = [] }
    setForm({ url: w.url, events, secret: w.secret || '' })
    setError('')
    setShowModal(true)
  }

  const toggleEvent = (ev: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(ev) ? prev.events.filter(e => e !== ev) : [...prev.events, ev],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editTarget) {
        const res = await fetch(`/api/webhooks/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: form.url, events: form.events, secret: form.secret || null }),
        })
        if (res.ok) {
          fetchWebhooks()
          setShowModal(false)
        } else {
          const err = await res.json()
          setError(err.error || '保存に失敗しました')
        }
      } else {
        const res = await fetch('/api/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: form.url, events: form.events, secret: form.secret || null, config: true }),
        })
        if (res.ok) {
          fetchWebhooks()
          setShowModal(false)
        } else {
          const err = await res.json()
          setError(err.error || '保存に失敗しました')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このWebhookを削除しますか？')) return
    const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    if (res.ok) setWebhooks(prev => prev.filter(w => w.id !== id))
  }

  const handleToggleEnabled = async (w: WebhookConfig) => {
    const res = await fetch(`/api/webhooks/${w.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !w.enabled }),
    })
    if (res.ok) {
      fetchWebhooks()
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
      const data = await res.json()
      setTestResults(prev => ({
        ...prev,
        [id]: {
          success: data.success,
          statusCode: data.statusCode,
          message: data.success ? `成功 (HTTP ${data.statusCode})` : `失敗 (${data.statusCode ? `HTTP ${data.statusCode}` : data.responseBody || 'エラー'})`,
        },
      }))
      fetchWebhooks()
    } catch {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, statusCode: null, message: '送信エラー' },
      }))
    } finally {
      setTestingId(null)
    }
  }

  const toggleLogs = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }))
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
                    item.href === '/settings/webhooks' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-4xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Webhook設定</h2>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
            Webhookを設定すると、指定したイベント発生時に外部URLへHTTP POSTリクエストを送信します。
            Slack・LINE WORKS・社内システムとの連携に活用できます。
          </div>

          <div className="flex justify-end mb-4">
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 追加
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-500 p-8">読み込み中...</div>
          ) : webhooks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Webhook className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Webhookが登録されていません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map(w => {
                let events: string[] = []
                try { events = JSON.parse(w.events) } catch { events = [] }
                const testResult = testResults[w.id]
                const logsExpanded = expandedLogs[w.id]

                return (
                  <div key={w.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {w.enabled ? (
                              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> 有効
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> 無効
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 font-mono truncate mb-2">{w.url}</p>
                          <div className="flex flex-wrap gap-1">
                            {events.map((ev: string) => (
                              <span key={ev} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {EVENT_OPTIONS.find(o => o.value === ev)?.label || ev}
                              </span>
                            ))}
                            {events.length === 0 && <span className="text-xs text-slate-400">イベント未設定</span>}
                          </div>
                          {testResult && (
                            <div className={`mt-2 text-xs px-2 py-1 rounded ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              テスト結果: {testResult.message}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleEnabled(w)}
                            className="text-xs border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded text-slate-600"
                          >
                            {w.enabled ? '無効化' : '有効化'}
                          </button>
                          <button
                            onClick={() => openEdit(w)}
                            className="text-xs border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded text-slate-600"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleTest(w.id)}
                            disabled={testingId === w.id}
                            className="flex items-center gap-1 text-xs border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded text-blue-600 disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            {testingId === w.id ? '送信中...' : 'テスト送信'}
                          </button>
                          <button onClick={() => handleDelete(w.id)} className="text-slate-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Logs */}
                    {w.logs && w.logs.length > 0 && (
                      <div className="border-t border-slate-100">
                        <button
                          onClick={() => toggleLogs(w.id)}
                          className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-slate-50"
                        >
                          <span>最近の配信ログ ({w.logs.length}件)</span>
                          {logsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {logsExpanded && (
                          <div className="px-4 pb-3 space-y-1">
                            {w.logs.map(log => (
                              <div key={log.id} className="flex items-center gap-3 text-xs py-1 border-b border-slate-50 last:border-0">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-slate-500 font-mono">{new Date(log.sentAt).toLocaleString('ja-JP')}</span>
                                <span className="text-slate-600">{log.event}</span>
                                {log.statusCode && (
                                  <span className={`px-1.5 py-0.5 rounded font-mono ${log.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    HTTP {log.statusCode}
                                  </span>
                                )}
                                <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                                  {log.success ? '成功' : '失敗'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{editTarget ? 'Webhookを編集' : 'Webhookを追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  required
                  placeholder="https://hooks.slack.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">送信するイベント</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.events.includes(opt.value)}
                        onChange={() => toggleEvent(opt.value)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">シークレット（任意）</label>
                <input
                  type="text"
                  value={form.secret}
                  onChange={e => setForm({ ...form, secret: e.target.value })}
                  placeholder="署名検証用のシークレットキー"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">設定するとX-BuildSync-Signatureヘッダーで署名を送信します</p>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">
                  {saving ? '保存中...' : editTarget ? '更新する' : '追加する'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
