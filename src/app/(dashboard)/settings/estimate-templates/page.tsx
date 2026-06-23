'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Plus, Trash2, X, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TemplateItem {
  description: string
  unit: string
  unitPrice: string
  quantity: string
}

interface EstimateTemplate {
  id: string
  name: string
  category: string | null
  createdAt: string
  items: {
    id: string
    description: string
    unit: string | null
    unitPrice: number
    quantity: number
    sortOrder: number
  }[]
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

function defaultItem(): TemplateItem {
  return { description: '', unit: '', unitPrice: '0', quantity: '1' }
}

export default function EstimateTemplatesPage() {
  const [templates, setTemplates] = useState<EstimateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [items, setItems] = useState<TemplateItem[]>([defaultItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/estimate-templates')
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const openAdd = () => {
    setName('')
    setCategory('')
    setItems([defaultItem()])
    setError('')
    setShowModal(true)
  }

  const updateItem = (idx: number, field: keyof TemplateItem, val: string) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { setError('テンプレート名は必須です'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/estimate-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: category || null,
          items: items.filter((it) => it.description).map((it) => ({
            description: it.description,
            unit: it.unit || null,
            unitPrice: parseFloat(it.unitPrice) || 0,
            quantity: parseFloat(it.quantity) || 1,
          })),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || '作成に失敗しました'); return }
      const created = await res.json()
      setTemplates((prev) => [created, ...prev])
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, templateName: string) => {
    if (!confirm(`「${templateName}」を削除しますか？`)) return
    const res = await fetch(`/api/estimate-templates/${id}`, { method: 'DELETE' })
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id))
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
                    item.href === '/settings/estimate-templates'
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

        <div className="flex-1 p-6 max-w-3xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">見積テンプレート</h2>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> テンプレートを作成
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">読み込み中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">見積テンプレートがありません</p>
              <p className="text-xs text-slate-400 mt-1">よく使う明細をテンプレートとして保存できます</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-slate-900">{t.name}</p>
                      {t.category && <p className="text-xs text-slate-400 mt-0.5">{t.category}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{t.items.length}品目</span>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {t.items.length > 0 && (
                    <table className="w-full text-xs border border-slate-100 rounded overflow-hidden">
                      <thead className="bg-slate-50">
                        <tr className="text-slate-500">
                          <th className="px-3 py-1.5 text-left">品目</th>
                          <th className="px-3 py-1.5 text-left">単位</th>
                          <th className="px-3 py-1.5 text-right">数量</th>
                          <th className="px-3 py-1.5 text-right">単価</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {t.items.map((it) => (
                          <tr key={it.id}>
                            <td className="px-3 py-1.5">{it.description}</td>
                            <td className="px-3 py-1.5 text-slate-400">{it.unit || '-'}</td>
                            <td className="px-3 py-1.5 text-right">{it.quantity}</td>
                            <td className="px-3 py-1.5 text-right">{formatCurrency(it.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">テンプレートを作成</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="px-6 py-4 space-y-4">
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">テンプレート名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例：外壁塗装一式"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例：塗装工事"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">明細</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-xs text-slate-500">
                          <th className="px-3 py-2 text-left">品目</th>
                          <th className="px-3 py-2 text-left w-20">単位</th>
                          <th className="px-3 py-2 text-right w-20">数量</th>
                          <th className="px-3 py-2 text-right w-28">単価</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={it.description}
                                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="品目名"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={it.unit}
                                onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="式"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={it.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                min="0"
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={it.unitPrice}
                                onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                min="0"
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setItems((prev) => [...prev, defaultItem()])}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> 行を追加
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
                >
                  {saving ? '保存中...' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
