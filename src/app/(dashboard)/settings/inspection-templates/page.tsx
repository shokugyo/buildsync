'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react'

interface CheckItem {
  name: string
  required: boolean
}

interface InspectionTemplate {
  id: string
  name: string
  items: CheckItem[]
  createdAt: string
  updatedAt: string
}

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

function TemplateModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void
  onSave: (name: string, items: CheckItem[]) => Promise<void>
  initial?: InspectionTemplate | null
}) {
  const [name, setName] = useState(initial?.name || '')
  const [items, setItems] = useState<CheckItem[]>(
    initial?.items?.length ? initial.items : [{ name: '', required: true }]
  )
  const [saving, setSaving] = useState(false)

  const addItem = () => setItems((prev) => [...prev, { name: '', required: true }])
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof CheckItem, value: string | boolean) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = items.filter((item) => item.name.trim())
    setSaving(true)
    try {
      await onSave(name, validItems)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">
            {initial ? 'テンプレートを編集' : '新規テンプレート'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              テンプレート名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例：竣工検査チェックリスト"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">チェック項目</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                項目を追加
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                    placeholder="項目名"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => updateItem(i, 'required', !item.required)}
                    className={`flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                      item.required
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                    title="必須/任意を切り替え"
                  >
                    {item.required ? '必須' : '任意'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-slate-300 hover:text-red-500 flex-shrink-0"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
            >
              {saving ? '保存中...' : initial ? '更新する' : '作成する'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InspectionTemplatesPage() {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<InspectionTemplate | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/inspection-templates')
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const handleSave = async (name: string, items: CheckItem[]) => {
    if (editTarget) {
      const res = await fetch(`/api/inspection-templates/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        setShowModal(false)
        setEditTarget(null)
      }
    } else {
      const res = await fetch('/api/inspection-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items }),
      })
      if (res.ok) {
        const created = await res.json()
        setTemplates((prev) => [...prev, created])
        setShowModal(false)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return
    const res = await fetch(`/api/inspection-templates/${id}`, { method: 'DELETE' })
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const openEdit = (t: InspectionTemplate) => {
    setEditTarget(t)
    setShowModal(true)
  }

  const openNew = () => {
    setEditTarget(null)
    setShowModal(true)
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        {/* Left sidebar */}
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            プロフィール情報
          </p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings/inspection-templates'
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
        <div className="flex-1 p-6 max-w-3xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">検査テンプレート管理</h2>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新規テンプレート
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-500 p-8">読み込み中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-100">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">テンプレートがありません</p>
              <button
                onClick={openNew}
                className="mt-4 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium mx-auto"
              >
                <Plus className="w-4 h-4" />
                最初のテンプレートを作成
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">
                      テンプレート名
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 w-28">
                      チェック項目数
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 w-36">
                      最終更新日
                    </th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <>
                      <tr
                        key={t.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpanded(t.id)}
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors text-left"
                          >
                            {expanded.has(t.id) ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            {t.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {t.items.length}項目
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {new Date(t.updatedAt).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => openEdit(t)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 border border-blue-200 hover:bg-blue-50 text-blue-600 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 border border-red-200 hover:bg-red-50 text-red-500 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded.has(t.id) && (
                        <tr key={`${t.id}-items`} className="border-b border-slate-100 bg-slate-50/60">
                          <td colSpan={4} className="px-8 py-3">
                            {t.items.length === 0 ? (
                              <p className="text-xs text-slate-400">項目がありません</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {t.items.map((item, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                    <span className="text-xs text-slate-400 w-4 text-right">{i + 1}.</span>
                                    <span>{item.name}</span>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                        item.required
                                          ? 'bg-red-50 text-red-600'
                                          : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {item.required ? '必須' : '任意'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TemplateModal
          onClose={() => {
            setShowModal(false)
            setEditTarget(null)
          }}
          onSave={handleSave}
          initial={editTarget}
        />
      )}
    </div>
  )
}
