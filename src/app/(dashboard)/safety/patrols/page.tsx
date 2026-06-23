'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Plus, X, ChevronDown, ChevronRight, Trash2, Edit2, Printer } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface CheckItem {
  item: string
  result: '良好' | '要改善' | '不適合'
  comment: string
}

interface SafetyPatrol {
  id: string
  patrolDate: string
  overallResult: string
  correctionRequired: boolean
  notes: string | null
  checkItems: string
  project: { id: string; name: string; projectNumber: string }
  patroller: { id: string; name: string }
  createdAt: string
}

const DEFAULT_CHECK_ITEMS: CheckItem[] = [
  { item: '整理整頓', result: '良好', comment: '' },
  { item: '安全通路確保', result: '良好', comment: '' },
  { item: '保護具着用', result: '良好', comment: '' },
  { item: '安全標識', result: '良好', comment: '' },
  { item: '危険箇所措置', result: '良好', comment: '' },
  { item: '機械設備点検', result: '良好', comment: '' },
  { item: '足場・仮設設備', result: '良好', comment: '' },
  { item: '電気設備安全', result: '良好', comment: '' },
  { item: '火気管理', result: '良好', comment: '' },
  { item: '廃棄物管理', result: '良好', comment: '' },
]

const RESULT_OPTIONS: Array<'良好' | '要改善' | '不適合'> = ['良好', '要改善', '不適合']

function resultBadge(result: string) {
  if (result === '良好') return 'bg-green-100 text-green-700'
  if (result === '要改善') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const defaultForm = {
  projectId: '',
  patrolDate: new Date().toISOString().split('T')[0],
  patrolledBy: '',
  overallResult: '良好' as '良好' | '要改善' | '不適合',
  notes: '',
  correctionRequired: false,
}

export default function SafetyPatrolsPage() {
  const [patrols, setPatrols] = useState<SafetyPatrol[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<{ id: string; name: string; projectNumber: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<SafetyPatrol | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [checkItems, setCheckItems] = useState<CheckItem[]>(DEFAULT_CHECK_ITEMS)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterProjectId, setFilterProjectId] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/safety-patrols').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/auth/session').then((r) => r.json()),
    ]).then(([p, proj, u, sess]) => {
      setPatrols(Array.isArray(p) ? p : [])
      setProjects(Array.isArray(proj) ? proj : [])
      setUsers(Array.isArray(u) ? u : [])
      if (sess?.user?.id) setCurrentUserId(sess.user.id)
      setLoading(false)
    })
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm({ ...defaultForm, patrolledBy: currentUserId })
    setCheckItems(DEFAULT_CHECK_ITEMS)
    setShowModal(true)
  }

  const openEdit = (patrol: SafetyPatrol) => {
    setEditTarget(patrol)
    let items: CheckItem[] = DEFAULT_CHECK_ITEMS
    try {
      items = JSON.parse(patrol.checkItems)
    } catch {}
    setCheckItems(items)
    setForm({
      projectId: patrol.project.id,
      patrolDate: patrol.patrolDate.split('T')[0],
      patrolledBy: patrol.patroller.id,
      overallResult: patrol.overallResult as '良好' | '要改善' | '不適合',
      notes: patrol.notes || '',
      correctionRequired: patrol.correctionRequired,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, checkItems }
      const url = editTarget ? `/api/safety-patrols/${editTarget.id}` : '/api/safety-patrols'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editTarget) {
          setPatrols((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
        } else {
          setPatrols((prev) => [saved, ...prev])
        }
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このパトロール記録を削除しますか？')) return
    const res = await fetch(`/api/safety-patrols/${id}`, { method: 'DELETE' })
    if (res.ok) setPatrols((prev) => prev.filter((p) => p.id !== id))
  }

  const updateCheckItem = (index: number, field: keyof CheckItem, value: string) => {
    setCheckItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const filteredPatrols = filterProjectId
    ? patrols.filter((p) => p.project.id === filterProjectId)
    : patrols

  return (
    <div>
      <Header title="安全パトロール記録" />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての案件</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectNumber} - {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> 新規パトロール
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">日付</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">パトロール者</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">総合判定</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">是正必要</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatrols.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                      パトロール記録がありません
                    </td>
                  </tr>
                )}
                {filteredPatrols.map((patrol) => {
                  const isExpanded = expandedId === patrol.id
                  let items: CheckItem[] = []
                  try {
                    items = JSON.parse(patrol.checkItems)
                  } catch {}

                  return (
                    <>
                      <tr
                        key={patrol.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : patrol.id)}
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">{formatDate(patrol.patrolDate)}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                          {patrol.project.projectNumber} - {patrol.project.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{patrol.patroller.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${resultBadge(patrol.overallResult)}`}
                          >
                            {patrol.overallResult}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {patrol.correctionRequired ? (
                            <span className="text-red-600 font-medium">要</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <Link
                              href={`/safety/patrols/${patrol.id}/print`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-slate-400 hover:text-green-600"
                              title="報告書印刷"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(patrol) }}
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(patrol.id) }}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${patrol.id}-detail`}>
                          <td colSpan={6} className="px-6 pb-4 bg-slate-50">
                            <div className="mt-2">
                              <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">チェック項目</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      <th className="text-left py-1.5 pr-4 text-xs text-slate-500 font-medium">項目</th>
                                      <th className="text-left py-1.5 pr-4 text-xs text-slate-500 font-medium">結果</th>
                                      <th className="text-left py-1.5 text-xs text-slate-500 font-medium">コメント</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, i) => (
                                      <tr key={i} className="border-b border-slate-100 last:border-0">
                                        <td className="py-1.5 pr-4 text-slate-700">{item.item}</td>
                                        <td className="py-1.5 pr-4">
                                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${resultBadge(item.result)}`}>
                                            {item.result}
                                          </span>
                                        </td>
                                        <td className="py-1.5 text-slate-600">{item.comment || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {patrol.notes && (
                                <p className="mt-3 text-sm text-slate-600">
                                  <span className="font-medium">備考:</span> {patrol.notes}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editTarget ? '安全パトロール記録を編集' : '新規安全パトロール記録'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectNumber} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">パトロール日 *</label>
                  <input
                    type="date"
                    value={form.patrolDate}
                    onChange={(e) => setForm({ ...form, patrolDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">パトロール者 *</label>
                  <select
                    value={form.patrolledBy}
                    onChange={(e) => setForm({ ...form, patrolledBy: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">総合判定</label>
                  <select
                    value={form.overallResult}
                    onChange={(e) => setForm({ ...form, overallResult: e.target.value as '良好' | '要改善' | '不適合' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RESULT_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Check Items Table */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">チェック項目</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">項目名</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-32">結果</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">コメント</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {checkItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-slate-700">{item.item}</td>
                          <td className="px-3 py-2">
                            <select
                              value={item.result}
                              onChange={(e) => updateCheckItem(index, 'result', e.target.value)}
                              className={`w-full px-2 py-1 border rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${resultBadge(item.result)}`}
                            >
                              {RESULT_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.comment}
                              onChange={(e) => updateCheckItem(index, 'comment', e.target.value)}
                              placeholder="コメント"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="correctionRequired"
                  checked={form.correctionRequired}
                  onChange={(e) => setForm({ ...form, correctionRequired: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="correctionRequired" className="text-sm font-medium text-slate-700">
                  是正措置が必要
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {saving ? '保存中...' : editTarget ? '更新する' : '登録する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
