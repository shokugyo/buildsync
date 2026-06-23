'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

type Tool = {
  id: string
  name: string
  toolNumber?: string
  category: string
  quantity: number
  available: number
  location?: string
  projectId?: string
  project?: { id: string; name: string; projectNumber: string }
  condition: string
  notes?: string
  companyId: string
  createdAt: string
}

type Project = { id: string; name: string; projectNumber: string }

const CONDITIONS = ['良好', '要修理', '廃棄']
const CATEGORIES = ['電動工具', '手工具', '測定器具', '安全器具', '重機械', 'その他']

const conditionBadge: Record<string, string> = {
  良好: 'bg-green-100 text-green-700',
  要修理: 'bg-orange-100 text-orange-700',
  廃棄: 'bg-red-100 text-red-700',
}

const emptyForm = {
  name: '',
  toolNumber: '',
  category: '手工具',
  quantity: '1',
  available: '1',
  location: '',
  projectId: '',
  condition: '良好',
  notes: '',
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  async function fetchTools() {
    const params = new URLSearchParams()
    if (filterCategory) params.set('category', filterCategory)
    const res = await fetch(`/api/tools?${params}`)
    if (res.ok) setTools(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchTools()
  }, [filterCategory])

  useEffect(() => {
    fetch('/api/projects').then(r => r.ok ? r.json() : []).then(setProjects)
  }, [])

  function openAdd() {
    setEditingTool(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(t: Tool) {
    setEditingTool(t)
    setForm({
      name: t.name,
      toolNumber: t.toolNumber || '',
      category: t.category,
      quantity: String(t.quantity),
      available: String(t.available),
      location: t.location || '',
      projectId: t.projectId || '',
      condition: t.condition,
      notes: t.notes || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const url = editingTool ? `/api/tools/${editingTool.id}` : '/api/tools'
    const method = editingTool ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await fetchTools()
      setShowModal(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('この工具を削除しますか？')) return
    const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' })
    if (res.ok) await fetchTools()
  }

  async function handleLend(tool: Tool) {
    if (tool.available <= 0) return
    await fetch(`/api/tools/${tool.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: tool.available - 1 }),
    })
    await fetchTools()
  }

  async function handleReturn(tool: Tool) {
    if (tool.available >= tool.quantity) return
    await fetch(`/api/tools/${tool.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: tool.available + 1 }),
    })
    await fetchTools()
  }

  const filtered = tools.filter(t =>
    !search || t.name.includes(search) || (t.toolNumber && t.toolNumber.includes(search))
  )

  return (
    <div className="flex flex-col h-full">
      <Header title="工具管理" />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="工具名・番号で検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48"
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">すべてのカテゴリ</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            工具を追加
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">工具名</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">番号</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">カテゴリ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">数量</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">貸出中</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">在庫</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">保管場所</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">状態</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">工具が登録されていません</td>
                  </tr>
                )}
                {filtered.map(t => {
                  const lent = t.quantity - t.available
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                      <td className="px-4 py-3 text-slate-600">{t.toolNumber || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.category}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{t.quantity}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${lent > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{lent}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${t.available > 0 ? 'text-green-600' : 'text-red-600'}`}>{t.available}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.location || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conditionBadge[t.condition] || 'bg-slate-100 text-slate-600'}`}>
                          {t.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleLend(t)}
                            disabled={t.available <= 0}
                            title="貸出"
                            className="p-1.5 text-slate-400 hover:text-orange-600 rounded disabled:opacity-30"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReturn(t)}
                            disabled={t.available >= t.quantity}
                            title="返却"
                            className="p-1.5 text-slate-400 hover:text-green-600 rounded disabled:opacity-30"
                          >
                            <ArrowUpFromLine className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold">{editingTool ? '工具を編集' : '工具を追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工具名 *</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">管理番号</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.toolNumber}
                    onChange={e => setForm({ ...form, toolNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ *</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value })}
                  >
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">数量</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">在庫数</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.available}
                    onChange={e => setForm({ ...form, available: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保管場所</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">現場</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.projectId}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                  >
                    <option value="">-</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
