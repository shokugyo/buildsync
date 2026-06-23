'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Plus, Trash2, X, ChevronDown, ChevronRight, LayoutTemplate } from 'lucide-react'

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

interface ScheduleTemplateItem {
  name: string
  offsetDays: number
  durationDays: number
  category: string
}

interface ChecklistItem {
  content: string
  category: string
}

interface ProjectTemplate {
  id: string
  name: string
  description: string | null
  workType: string | null
  createdAt: string
  scheduleTemplates: (ScheduleTemplateItem & { id: string })[]
  checklistTemplates: (ChecklistItem & { id: string })[]
}

function TemplateModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [workType, setWorkType] = useState('')
  const [scheduleItems, setScheduleItems] = useState<ScheduleTemplateItem[]>([
    { name: '', offsetDays: 0, durationDays: 1, category: '' },
  ])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    { content: '', category: '' },
  ])
  const [saving, setSaving] = useState(false)

  const addSchedule = () =>
    setScheduleItems(prev => [...prev, { name: '', offsetDays: 0, durationDays: 1, category: '' }])
  const removeSchedule = (i: number) => setScheduleItems(prev => prev.filter((_, idx) => idx !== i))
  const updateSchedule = (i: number, field: keyof ScheduleTemplateItem, value: string | number) =>
    setScheduleItems(prev => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))

  const addChecklist = () => setChecklistItems(prev => [...prev, { content: '', category: '' }])
  const removeChecklist = (i: number) => setChecklistItems(prev => prev.filter((_, idx) => idx !== i))
  const updateChecklist = (i: number, field: keyof ChecklistItem, value: string) =>
    setChecklistItems(prev => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name,
        description: description || null,
        workType: workType || null,
        scheduleTemplates: scheduleItems.filter(s => s.name.trim()),
        checklistTemplates: checklistItems.filter(c => c.content.trim()),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">新規プロジェクトテンプレート</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">テンプレート名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="例：新築工事標準"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">工種</label>
              <input
                type="text"
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                placeholder="例：新築、リフォーム"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="テンプレートの説明"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">工程テンプレート</label>
              <button type="button" onClick={addSchedule} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" />工程を追加
              </button>
            </div>
            <div className="space-y-2">
              {scheduleItems.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={s.name}
                    onChange={e => updateSchedule(i, 'name', e.target.value)}
                    placeholder="工程名"
                    className="col-span-4 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-xs text-slate-500 whitespace-nowrap">開始+</span>
                    <input
                      type="number"
                      value={s.offsetDays}
                      onChange={e => updateSchedule(i, 'offsetDays', Number(e.target.value))}
                      min={0}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500">日</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-xs text-slate-500 whitespace-nowrap">期間</span>
                    <input
                      type="number"
                      value={s.durationDays}
                      onChange={e => updateSchedule(i, 'durationDays', Number(e.target.value))}
                      min={1}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500">日</span>
                  </div>
                  <input
                    type="text"
                    value={s.category}
                    onChange={e => updateSchedule(i, 'category', e.target.value)}
                    placeholder="カテゴリ"
                    className="col-span-1 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => removeSchedule(i)} className="col-span-1 text-slate-300 hover:text-red-500 flex justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">チェックリストテンプレート</label>
              <button type="button" onClick={addChecklist} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" />項目を追加
              </button>
            </div>
            <div className="space-y-2">
              {checklistItems.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={c.content}
                    onChange={e => updateChecklist(i, 'content', e.target.value)}
                    placeholder="チェック項目"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={c.category}
                    onChange={e => updateChecklist(i, 'category', e.target.value)}
                    placeholder="カテゴリ"
                    className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => removeChecklist(i)} className="text-slate-300 hover:text-red-500 flex-shrink-0">
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
              {saving ? '保存中...' : '作成する'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectTemplatesPage() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/project-templates')
      .then(r => r.json())
      .then(data => {
        setTemplates(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const handleSave = async (data: any) => {
    const res = await fetch('/api/project-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created = await res.json()
      setTemplates(prev => [created, ...prev])
      setShowModal(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return
    const res = await fetch(`/api/project-templates/${id}`, { method: 'DELETE' })
    if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">プロフィール情報</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings/project-templates'
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

        <div className="flex-1 p-6 max-w-4xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">プロジェクトテンプレート管理</h2>
            </div>
            <button
              onClick={() => setShowModal(true)}
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
              <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">テンプレートがありません</p>
              <button
                onClick={() => setShowModal(true)}
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
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">テンプレート名</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 w-28">工種</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 w-24">工程数</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 w-24">チェック数</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <>
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                            {t.description && (
                              <span className="text-xs text-slate-400 font-normal ml-1">{t.description}</span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{t.workType || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{t.scheduleTemplates.length}件</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{t.checklistTemplates.length}件</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-red-200 hover:bg-red-50 text-red-500 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                            削除
                          </button>
                        </td>
                      </tr>
                      {expanded.has(t.id) && (
                        <tr key={`${t.id}-detail`} className="border-b border-slate-100 bg-slate-50/60">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">工程</p>
                                {t.scheduleTemplates.length === 0 ? (
                                  <p className="text-xs text-slate-400">工程がありません</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {t.scheduleTemplates.map((s, i) => (
                                      <li key={i} className="text-xs text-slate-700 flex gap-2">
                                        <span className="text-slate-400 w-4">{i + 1}.</span>
                                        <span className="font-medium">{s.name}</span>
                                        <span className="text-slate-400">+{s.offsetDays}日〜{s.durationDays}日間</span>
                                        {s.category && <span className="text-slate-400">[{s.category}]</span>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">チェックリスト</p>
                                {t.checklistTemplates.length === 0 ? (
                                  <p className="text-xs text-slate-400">項目がありません</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {t.checklistTemplates.map((c, i) => (
                                      <li key={i} className="text-xs text-slate-700 flex gap-2">
                                        <span className="text-slate-400 w-4">{i + 1}.</span>
                                        <span>{c.content}</span>
                                        {c.category && <span className="text-slate-400">[{c.category}]</span>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
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
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
