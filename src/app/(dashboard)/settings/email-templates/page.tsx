'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Save, RotateCcw, Mail } from 'lucide-react'
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
  { label: '検査テンプレート', href: '/settings/inspection-templates' },
  { label: 'プロジェクトテンプレート', href: '/settings/project-templates' },
  { label: 'メールテンプレート', href: '/settings/email-templates' },
  { label: '見積テンプレート', href: '/settings/estimate-templates' },
  { label: 'メンバー管理', href: '/settings/users' },
  { label: '工程マスタ', href: '/settings/schedule-masters' },
  { label: '監査ログ', href: '/settings/audit-logs' },
  { label: 'データエクスポート', href: '/settings/data-export' },
]

const TEMPLATE_LABELS: Record<string, string> = {
  project_created: '案件登録通知',
  order_approval: '発注承認依頼',
  order_confirmed: '発注承認済み通知',
  inspection_scheduled: '検査予定通知',
  defect_registered: '是正事項登録通知',
  account_invited: 'アカウント招待',
}

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  project_created: ['{{projectName}}', '{{projectNumber}}', '{{createdAt}}', '{{projectUrl}}', '{{userName}}'],
  order_approval: ['{{orderNumber}}', '{{orderSubject}}', '{{amount}}', '{{supplierName}}', '{{orderUrl}}', '{{userName}}'],
  order_confirmed: ['{{orderNumber}}', '{{orderSubject}}', '{{approverName}}', '{{orderUrl}}', '{{userName}}'],
  inspection_scheduled: ['{{inspectionName}}', '{{projectName}}', '{{scheduledDate}}', '{{inspectionUrl}}', '{{userName}}'],
  defect_registered: ['{{projectName}}', '{{defectContent}}', '{{dueDate}}', '{{defectUrl}}', '{{userName}}'],
  account_invited: ['{{userName}}', '{{email}}', '{{password}}', '{{loginUrl}}'],
}

interface Template {
  type: string
  subject: string
  body: string
  isCustom: boolean
}

export default function EmailTemplatesPage() {
  const pathname = usePathname()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState<string>('project_created')
  const [form, setForm] = useState({ subject: '', body: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings/email-templates')
      .then(r => r.json())
      .then(data => {
        setTemplates(data)
        const first = data.find((t: Template) => t.type === selected) || data[0]
        if (first) setForm({ subject: first.subject, body: first.body })
        setLoading(false)
      })
  }, [])

  const handleSelect = (type: string) => {
    setSelected(type)
    setSuccess(false)
    setError('')
    const t = templates.find(t => t.type === type)
    if (t) setForm({ subject: t.subject, body: t.body })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/settings/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selected, subject: form.subject, body: form.body }),
      })
      if (res.ok) {
        setTemplates(prev => prev.map(t => t.type === selected ? { ...t, ...form, isCustom: true } : t))
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const d = await res.json()
        setError(d.error || '保存に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('このテンプレートをデフォルトに戻しますか？')) return
    setResetting(true)
    try {
      await fetch(`/api/settings/email-templates?type=${selected}`, { method: 'DELETE' })
      const res = await fetch('/api/settings/email-templates')
      const data = await res.json()
      setTemplates(data)
      const t = data.find((t: Template) => t.type === selected)
      if (t) setForm({ subject: t.subject, body: t.body })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setResetting(false)
    }
  }

  const currentTemplate = templates.find(t => t.type === selected)

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map(item => (
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

        <div className="flex-1 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">メール通知テンプレート</h2>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">読み込み中...</div>
          ) : (
            <div className="flex gap-6">
              <div className="w-52 flex-shrink-0">
                <ul className="space-y-0.5">
                  {templates.map(t => (
                    <li key={t.type}>
                      <button
                        onClick={() => handleSelect(t.type)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                          selected === t.type ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{TEMPLATE_LABELS[t.type] || t.type}</span>
                        {t.isCustom && (
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${selected === t.type ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                            カスタム
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex-1 max-w-2xl">
                {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">保存しました</div>}
                {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
                  <h3 className="font-semibold text-slate-900 mb-4">{TEMPLATE_LABELS[selected] || selected}</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">件名</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">本文（HTML）</label>
                    <textarea
                      value={form.body}
                      onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                      rows={12}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? '保存中...' : '保存する'}
                    </button>
                    {currentTemplate?.isCustom && (
                      <button
                        onClick={handleReset}
                        disabled={resetting}
                        className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        デフォルトに戻す
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">利用可能な変数</p>
                  <div className="flex flex-wrap gap-2">
                    {(TEMPLATE_VARIABLES[selected] || []).map(v => (
                      <span
                        key={v}
                        className="text-xs font-mono bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                        onClick={() => {
                          const ta = document.querySelector('textarea') as HTMLTextAreaElement
                          if (!ta) return
                          const start = ta.selectionStart
                          const end = ta.selectionEnd
                          const newBody = form.body.substring(0, start) + v + form.body.substring(end)
                          setForm(f => ({ ...f, body: newBody }))
                          setTimeout(() => {
                            ta.focus()
                            ta.setSelectionRange(start + v.length, start + v.length)
                          }, 0)
                        }}
                        title="クリックして挿入"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">変数をクリックするとカーソル位置に挿入されます</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
