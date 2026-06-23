'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Plus, Trash2, Mail, Clock, ToggleLeft, ToggleRight } from 'lucide-react'

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
  { label: 'レポートスケジュール', href: '/settings/report-schedules' },
  { label: 'メンバー管理', href: '/settings/users' },
  { label: '工程マスタ', href: '/settings/schedule-masters' },
  { label: '監査ログ', href: '/settings/audit-logs' },
  { label: 'データエクスポート', href: '/settings/data-export' },
]

const REPORT_TYPES = [
  { value: 'profit_loss', label: '損益レポート' },
  { value: 'weekly', label: '週次レポート' },
  { value: 'project_comparison', label: 'プロジェクト比較レポート' },
]

const FREQUENCIES = [
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
]

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
]

type ReportSchedule = {
  id: string
  name: string
  reportType: string
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  recipients: string
  enabled: boolean
  lastSentAt: string | null
  createdAt: string
}

const defaultForm = {
  name: '',
  reportType: 'profit_loss',
  frequency: 'weekly',
  dayOfWeek: 1,
  dayOfMonth: 1,
  recipients: '',
}

export default function ReportSchedulesPage() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchSchedules() {
    setLoading(true)
    try {
      const res = await fetch('/api/reports/schedule')
      if (res.ok) {
        const data = await res.json()
        setSchedules(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body: any = {
        name: form.name,
        reportType: form.reportType,
        frequency: form.frequency,
        recipients: form.recipients,
      }
      if (form.frequency === 'weekly') body.dayOfWeek = form.dayOfWeek
      if (form.frequency === 'monthly') body.dayOfMonth = form.dayOfMonth

      const res = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || '作成に失敗しました')
        return
      }
      setShowModal(false)
      setForm(defaultForm)
      await fetchSchedules()
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(schedule: ReportSchedule) {
    const res = await fetch(`/api/reports/schedule/${schedule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !schedule.enabled }),
    })
    if (res.ok) {
      setSchedules(prev =>
        prev.map(s => (s.id === schedule.id ? { ...s, enabled: !s.enabled } : s))
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このスケジュールを削除しますか？')) return
    const res = await fetch(`/api/reports/schedule/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSchedules(prev => prev.filter(s => s.id !== id))
    }
  }

  function reportTypeLabel(type: string) {
    return REPORT_TYPES.find(r => r.value === type)?.label ?? type
  }

  function frequencyLabel(freq: string, dayOfWeek: number | null, dayOfMonth: number | null) {
    if (freq === 'daily') return '毎日'
    if (freq === 'weekly') {
      const day = DAY_OF_WEEK_OPTIONS.find(d => d.value === dayOfWeek)?.label ?? ''
      return `毎週 ${day}`
    }
    if (freq === 'monthly') return `毎月 ${dayOfMonth}日`
    return freq
  }

  function recipientList(json: string): string[] {
    try {
      return JSON.parse(json)
    } catch {
      return []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <nav className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {LEFT_MENU.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 text-sm border-b border-gray-100 last:border-0 hover:bg-blue-50 transition-colors ${
                  item.href === '/settings/report-schedules'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">レポートスケジュール</h1>
              <p className="text-sm text-gray-500 mt-1">
                レポートを定期的にメールで自動送信するスケジュールを設定します
              </p>
            </div>
            <button
              onClick={() => { setShowModal(true); setError(''); setForm(defaultForm) }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              スケジュールを追加
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
              読み込み中...
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">スケジュールはまだありません</p>
              <p className="text-gray-400 text-xs mt-1">「スケジュールを追加」から作成してください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div
                  key={schedule.id}
                  className="bg-white rounded-lg border border-gray-200 p-5 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{schedule.name}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          schedule.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {schedule.enabled ? '有効' : '無効'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                      <span>
                        <span className="text-gray-400">種類: </span>
                        {reportTypeLabel(schedule.reportType)}
                      </span>
                      <span>
                        <span className="text-gray-400">頻度: </span>
                        {frequencyLabel(schedule.frequency, schedule.dayOfWeek, schedule.dayOfMonth)}
                      </span>
                    </div>
                    <div className="flex items-start gap-1 mt-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-gray-500 break-all">
                        {recipientList(schedule.recipients).join(', ') || '—'}
                      </span>
                    </div>
                    {schedule.lastSentAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        最終送信: {new Date(schedule.lastSentAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleEnabled(schedule)}
                      title={schedule.enabled ? '無効にする' : '有効にする'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        schedule.enabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {schedule.enabled ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">スケジュールを追加</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スケジュール名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 月次損益レポート"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  レポート種類 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.reportType}
                  onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REPORT_TYPES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  送信頻度 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {form.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    送信曜日 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.dayOfWeek}
                    onChange={e => setForm(f => ({ ...f, dayOfWeek: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DAY_OF_WEEK_OPTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    送信日（毎月） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={form.dayOfMonth}
                    onChange={e => setForm(f => ({ ...f, dayOfMonth: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">1〜28 の範囲で指定してください</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  送信先メールアドレス <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={form.recipients}
                  onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: user@example.com, manager@example.com"
                />
                <p className="text-xs text-gray-400 mt-1">カンマ区切りで複数入力できます</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {saving ? '作成中...' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
