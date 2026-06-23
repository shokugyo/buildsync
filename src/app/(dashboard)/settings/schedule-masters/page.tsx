'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Plus, Trash2, GripVertical, X } from 'lucide-react'

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

interface MasterItem {
  id: string
  type: string
  value: string
  label: string
  sortOrder: number
}

export default function ScheduleMastersPage() {
  const [items, setItems] = useState<MasterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: '', value: '' })
  const [saving, setSaving] = useState(false)
  const [activeType, setActiveType] = useState<'schedule_category' | 'work_type'>('schedule_category')

  const typeLabels: Record<string, string> = {
    schedule_category: '工程カテゴリ',
    work_type: '工種',
  }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/master?type=${activeType}`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
  }, [activeType])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) return
    setSaving(true)
    const value = form.value.trim() || form.label.trim()
    const res = await fetch('/api/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: activeType,
        value,
        label: form.label.trim(),
        sortOrder: items.length,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setItems(prev => [...prev, created])
      setForm({ label: '', value: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`「${label}」を削除しますか？`)) return
    const res = await fetch(`/api/master/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const updated = [...items]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setItems(updated)
    await Promise.all([
      fetch(`/api/master/${updated[index - 1].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: index - 1 }),
      }),
      fetch(`/api/master/${updated[index].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: index }),
      }),
    ])
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定メニュー</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings/schedule-masters'
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

        <div className="flex-1 p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">工程マスタ管理</h2>
            <button
              onClick={() => { setShowForm(true); setForm({ label: '', value: '' }) }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 追加
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {(['schedule_category', 'work_type'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  activeType === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 mb-4">
            {activeType === 'schedule_category'
              ? '工程表のカテゴリとして使用されます。工程追加フォームの「工種・カテゴリ」に表示されます。'
              : '工種マスタです。発注・工程などの工種選択に使用されます。'}
          </p>

          {showForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-900">{typeLabels[activeType]}を追加</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="表示名を入力（例：基礎工事）"
                  required
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={saving || !form.label.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {saving ? '追加中...' : '追加'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                {typeLabels[activeType]}が登録されていません。追加ボタンから登録してください。
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="text-slate-300 hover:text-slate-500 disabled:opacity-20 cursor-grab active:cursor-grabbing"
                      title="上に移動"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-400 w-6 text-right">{idx + 1}</span>
                    <span className="flex-1 text-sm text-slate-800 font-medium">{item.label}</span>
                    {item.value !== item.label && (
                      <span className="text-xs text-slate-400 font-mono">{item.value}</span>
                    )}
                    <button
                      onClick={() => handleDelete(item.id, item.label)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
