'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { ShieldCheck, Plus, Edit2, Trash2, X, ChevronLeft, FileText } from 'lucide-react'
import Link from 'next/link'

interface RiskItem {
  risk: string
  measure: string
  level: '低' | '中' | '高'
}

interface KyActivity {
  id: string
  projectId: string
  activityDate: string
  leader?: string | null
  participants?: string | null
  risks: string
  location?: string | null
  notes?: string | null
  companyId: string
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
}

const LEVEL_COLORS: Record<string, string> = {
  '低': 'bg-green-100 text-green-700',
  '中': 'bg-yellow-100 text-yellow-700',
  '高': 'bg-red-100 text-red-700',
}

const emptyRiskItem = (): RiskItem => ({ risk: '', measure: '', level: '低' })

const emptyForm = () => ({
  projectId: '',
  activityDate: new Date().toISOString().split('T')[0],
  leader: '',
  participants: '',
  location: '',
  notes: '',
  risks: [emptyRiskItem()] as RiskItem[],
})

export default function KyActivityPage() {
  const [activities, setActivities] = useState<KyActivity[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<KyActivity | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/ky-activities').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([a, p]) => {
      setActivities(Array.isArray(a) ? a : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const filtered = activities.filter((a) => {
    if (projectFilter && a.projectId !== projectFilter) return false
    return true
  })

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (a: KyActivity) => {
    setEditTarget(a)
    let risks: RiskItem[] = []
    try {
      risks = JSON.parse(a.risks)
    } catch {
      risks = [emptyRiskItem()]
    }
    setForm({
      projectId: a.projectId,
      activityDate: a.activityDate.split('T')[0],
      leader: a.leader || '',
      participants: a.participants || '',
      location: a.location || '',
      notes: a.notes || '',
      risks: risks.length > 0 ? risks : [emptyRiskItem()],
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        projectId: form.projectId,
        activityDate: form.activityDate,
        leader: form.leader || null,
        participants: form.participants || null,
        location: form.location || null,
        notes: form.notes || null,
        risks: JSON.stringify(form.risks),
      }

      let res: Response
      if (editTarget) {
        res = await fetch(`/api/ky-activities/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/ky-activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await res.json()
        if (editTarget) {
          setActivities((prev) => prev.map((a) => a.id === editTarget.id ? data : a))
        } else {
          setActivities((prev) => [data, ...prev])
        }
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このKY活動記録を削除しますか？')) return
    const res = await fetch(`/api/ky-activities/${id}`, { method: 'DELETE' })
    if (res.ok) setActivities((prev) => prev.filter((a) => a.id !== id))
  }

  const updateRisk = (index: number, field: keyof RiskItem, value: string) => {
    setForm((prev) => {
      const risks = [...prev.risks]
      risks[index] = { ...risks[index], [field]: value }
      return { ...prev, risks }
    })
  }

  const addRiskRow = () => {
    setForm((prev) => ({ ...prev, risks: [...prev.risks, emptyRiskItem()] }))
  }

  const removeRiskRow = (index: number) => {
    setForm((prev) => ({ ...prev, risks: prev.risks.filter((_, i) => i !== index) }))
  }

  const getRisks = (a: KyActivity): RiskItem[] => {
    try { return JSON.parse(a.risks) } catch { return [] }
  }

  return (
    <div>
      <Header title="KY活動記録" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/safety" className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> 安全管理
          </Link>
        </div>

        {/* Filters & Action */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての案件</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
            ))}
          </select>
          <button
            onClick={openAdd}
            className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> KY活動を記録
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件</p>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">KY活動記録がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 text-left">日付</th>
                    <th className="px-4 py-3 text-left">案件</th>
                    <th className="px-4 py-3 text-left">リーダー</th>
                    <th className="px-4 py-3 text-left">場所</th>
                    <th className="px-4 py-3 text-left">危険項目数</th>
                    <th className="px-4 py-3 text-left">リスクレベル</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((a) => {
                    const risks = getRisks(a)
                    const highCount = risks.filter((r) => r.level === '高').length
                    const medCount = risks.filter((r) => r.level === '中').length
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {new Date(a.activityDate).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="text-slate-900">{a.project?.name}</p>
                          <p className="text-xs text-slate-400">{a.project?.projectNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{a.leader || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{a.location || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">{risks.length}項目</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {highCount > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">高×{highCount}</span>
                            )}
                            {medCount > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">中×{medCount}</span>
                            )}
                            {highCount === 0 && medCount === 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">低のみ</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => window.open(`/safety/ky/${a.id}/print`, '_blank')}
                              className="p-1 text-slate-400 hover:text-green-600"
                              title="帳票出力"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(a)} className="p-1 text-slate-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(a.id)} className="p-1 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editTarget ? 'KY活動を編集' : 'KY活動を記録'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
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
                      <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">実施日 *</label>
                  <input
                    type="date"
                    value={form.activityDate}
                    onChange={(e) => setForm({ ...form, activityDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">リーダー</label>
                  <input
                    type="text"
                    value={form.leader}
                    onChange={(e) => setForm({ ...form, leader: e.target.value })}
                    placeholder="KY活動のリーダー名"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">場所</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="作業場所"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">参加者</label>
                <textarea
                  value={form.participants}
                  onChange={(e) => setForm({ ...form, participants: e.target.value })}
                  rows={2}
                  placeholder="参加者名（カンマ区切り）"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Risks Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">危険予知項目 *</label>
                  <button
                    type="button"
                    onClick={addRiskRow}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-500 px-2 py-1 rounded-md"
                  >
                    <Plus className="w-3 h-3" /> 行を追加
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-xs text-slate-500">
                        <th className="px-3 py-2 text-left w-5/12">危険内容</th>
                        <th className="px-3 py-2 text-left w-5/12">対策</th>
                        <th className="px-3 py-2 text-left w-1/12">レベル</th>
                        <th className="px-3 py-2 w-1/12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.risks.map((row, i) => (
                        <tr key={i}>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.risk}
                              onChange={(e) => updateRisk(i, 'risk', e.target.value)}
                              placeholder="例: 高所作業での転落"
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.measure}
                              onChange={(e) => updateRisk(i, 'measure', e.target.value)}
                              placeholder="例: 安全帯を使用する"
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={row.level}
                              onChange={(e) => updateRisk(i, 'level', e.target.value)}
                              className="w-full px-1 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="低">低</option>
                              <option value="中">中</option>
                              <option value="高">高</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {form.risks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRiskRow(i)}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '保存中...' : editTarget ? '更新する' : '記録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
