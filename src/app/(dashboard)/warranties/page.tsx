'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, AlertTriangle, ShieldCheck, Printer } from 'lucide-react'

type Warranty = {
  id: string
  projectId: string
  project: { id: string; name: string; projectNumber: string }
  title: string
  category: string
  startDate: string
  endDate: string
  contractor?: string
  notes?: string
  createdAt: string
}

type Project = { id: string; name: string; projectNumber: string }

const CATEGORIES = ['躯体', '設備', '防水', '塗装', 'その他']

function getDaysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function getRowColor(daysRemaining: number): string {
  if (daysRemaining < 0) return 'bg-red-50'
  if (daysRemaining <= 90) return 'bg-orange-50'
  return ''
}

function getDaysLabel(days: number): { text: string; className: string } {
  if (days < 0) return { text: `${Math.abs(days)}日超過`, className: 'text-red-600 font-semibold' }
  if (days <= 90) return { text: `残り${days}日`, className: 'text-orange-600 font-semibold' }
  return { text: `残り${days}日`, className: 'text-slate-600' }
}

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null)
  const [form, setForm] = useState({
    projectId: '',
    title: '',
    category: '躯体',
    startDate: '',
    endDate: '',
    contractor: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/warranties').then(r => r.json()),
      fetch('/api/projects?limit=200').then(r => r.json()).catch(() => []),
    ]).then(([w, p]) => {
      setWarranties(Array.isArray(w) ? w : [])
      setProjects(Array.isArray(p) ? p : (p?.projects ?? []))
      setLoading(false)
    })
  }, [])

  const openAdd = () => {
    setEditingWarranty(null)
    setForm({ projectId: '', title: '', category: '躯体', startDate: '', endDate: '', contractor: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (w: Warranty) => {
    setEditingWarranty(w)
    setForm({
      projectId: w.projectId,
      title: w.title,
      category: w.category,
      startDate: w.startDate.slice(0, 10),
      endDate: w.endDate.slice(0, 10),
      contractor: w.contractor || '',
      notes: w.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingWarranty) {
        const res = await fetch(`/api/warranties/${editingWarranty.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const updated = await res.json()
          setWarranties(prev => prev.map(w => w.id === editingWarranty.id ? updated : w))
        }
      } else {
        const res = await fetch('/api/warranties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const created = await res.json()
          setWarranties(prev => [created, ...prev])
        }
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (w: Warranty) => {
    if (!confirm('この保証を削除しますか？')) return
    const res = await fetch(`/api/warranties/${w.id}`, { method: 'DELETE' })
    if (res.ok) setWarranties(prev => prev.filter(x => x.id !== w.id))
  }

  const filtered = warranties.filter(w => {
    if (filterProject && w.projectId !== filterProject) return false
    return true
  })

  const expiredCount = filtered.filter(w => getDaysRemaining(w.endDate) < 0).length
  const warningCount = filtered.filter(w => { const d = getDaysRemaining(w.endDate); return d >= 0 && d <= 90 }).length

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          @page { size: A4; margin: 15mm; }
        }
        .print-only { display: none; }
      `}</style>
      <div className="no-print"><Header title="工事保証管理" /></div>
      <div className="print-only text-center py-4 border-b border-slate-300 mb-4">
        <h1 className="text-2xl font-bold">工事保証一覧</h1>
        <p className="text-sm text-slate-500 mt-1">印刷日：{new Date().toLocaleDateString('ja-JP')}</p>
      </div>
      <div className="p-6 flex-1">
        <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">保証登録数</div>
            <div className="text-2xl font-bold text-slate-800">{filtered.length}<span className="text-sm font-normal text-slate-500 ml-1">件</span></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">有効中</div>
            <div className="text-2xl font-bold text-green-600">{filtered.length - expiredCount}<span className="text-sm font-normal text-slate-500 ml-1">件</span></div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <div className="text-xs text-red-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />期限切れ</div>
            <div className="text-2xl font-bold text-red-600">{expiredCount}<span className="text-sm font-normal text-red-400 ml-1">件</span></div>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
            <div className="text-xs text-orange-500 mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />要注意 (90日以内)</div>
            <div className="text-2xl font-bold text-orange-600">{warningCount}<span className="text-sm font-normal text-orange-400 ml-1">件</span></div>
          </div>
        </div>

        <div className="no-print flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全案件</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="text-sm text-slate-500 ml-auto">{filtered.length} 件</span>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            リスト印刷
          </button>
          <button
            onClick={openAdd}
            className="no-print flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            保証を登録
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">案件名</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">保証項目</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">カテゴリ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">保証期間</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">残り日数</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">施工会社</th>
                  <th className="no-print px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">保証が登録されていません</td>
                  </tr>
                ) : (
                  filtered.map(w => {
                    const days = getDaysRemaining(w.endDate)
                    const daysLabel = getDaysLabel(days)
                    const rowColor = getRowColor(days)
                    return (
                      <tr key={w.id} className={`border-b border-slate-50 hover:brightness-95 transition-all ${rowColor}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{w.project.name}</p>
                          <p className="text-xs text-slate-400">{w.project.projectNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEdit(w)}
                            className="text-slate-800 hover:text-blue-600 font-medium text-left"
                          >
                            {w.title}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{w.category}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {new Date(w.startDate).toLocaleDateString('ja-JP')} 〜 {new Date(w.endDate).toLocaleDateString('ja-JP')}
                        </td>
                        <td className={`px-4 py-3 ${daysLabel.className}`}>
                          {days < 0 && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                          {daysLabel.text}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{w.contractor || '—'}</td>
                        <td className="no-print px-4 py-3">
                          <button
                            onClick={() => handleDelete(w)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="no-print fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">{editingWarranty ? '保証を編集' : '保証を登録'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">案件 <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件を選択</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">保証項目 <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：外壁防水保証"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">カテゴリ <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">開始日 <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">終了日 <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">施工会社</label>
                <input
                  value={form.contractor}
                  onChange={e => setForm(f => ({ ...f, contractor: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="施工会社名"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : (editingWarranty ? '更新' : '登録')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
