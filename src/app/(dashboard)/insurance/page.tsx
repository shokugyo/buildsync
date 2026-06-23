'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Pencil, Trash2, ShieldCheck, Printer } from 'lucide-react'

type Insurance = {
  id: string
  name: string
  insurerName: string
  policyNumber?: string
  insuredType: string
  projectId?: string
  project?: { id: string; name: string; projectNumber: string }
  startDate?: string
  endDate?: string
  premium?: number
  coverage?: number
  notes?: string
  companyId: string
  createdAt: string
}

type Project = { id: string; name: string; projectNumber: string }

const INSURED_TYPES = ['火災保険', '賠償責任保険', '建設工事保険', '労災上乗せ保険', '車両保険', 'その他']

function getRowClass(endDate?: string) {
  if (!endDate) return ''
  const end = new Date(endDate)
  const now = new Date()
  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'bg-red-50'
  if (diff <= 30) return 'bg-orange-50'
  return ''
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

function formatMoney(val?: number) {
  if (val == null) return '-'
  return val.toLocaleString('ja-JP') + '円'
}

const emptyForm = {
  name: '',
  insurerName: '',
  policyNumber: '',
  insuredType: '火災保険',
  projectId: '',
  startDate: '',
  endDate: '',
  premium: '',
  coverage: '',
  notes: '',
}

export default function InsurancePage() {
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Insurance | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  async function fetchInsurances() {
    const params = new URLSearchParams()
    if (filterExpiring) params.set('expiringOnly', 'true')
    const res = await fetch(`/api/insurance?${params}`)
    if (res.ok) setInsurances(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/projects').then(r => r.ok ? r.json() : []).then(setProjects)
  }, [])

  useEffect(() => {
    fetchInsurances()
  }, [filterExpiring])

  const filtered = insurances.filter(i => !filterType || i.insuredType === filterType)

  function openCreate() {
    setEditingItem(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(item: Insurance) {
    setEditingItem(item)
    setForm({
      name: item.name,
      insurerName: item.insurerName,
      policyNumber: item.policyNumber || '',
      insuredType: item.insuredType,
      projectId: item.projectId || '',
      startDate: item.startDate ? item.startDate.slice(0, 10) : '',
      endDate: item.endDate ? item.endDate.slice(0, 10) : '',
      premium: item.premium != null ? String(item.premium) : '',
      coverage: item.coverage != null ? String(item.coverage) : '',
      notes: item.notes || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const url = editingItem ? `/api/insurance/${editingItem.id}` : '/api/insurance'
    const method = editingItem ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) {
      setShowModal(false)
      fetchInsurances()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/insurance/${id}`, { method: 'DELETE' })
    fetchInsurances()
  }

  return (
    <div className="flex flex-col h-full">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          @page { size: A4 landscape; margin: 15mm; }
        }
        .print-only { display: none; }
      `}</style>
      <div className="no-print"><Header title="保険管理" /></div>
      <div className="print-only text-center py-4 border-b border-slate-300 mb-4">
        <h1 className="text-2xl font-bold">保険一覧</h1>
        <p className="text-sm text-slate-500 mt-1">印刷日：{new Date().toLocaleDateString('ja-JP')}</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="no-print flex flex-wrap gap-3 mb-4 items-center">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">すべての種別</option>
            {INSURED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filterExpiring}
              onChange={e => setFilterExpiring(e.target.checked)}
              className="rounded"
            />
            期限切れ間近のみ（30日以内）
          </label>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700"
          >
            <Printer className="w-4 h-4" />
            リスト印刷
          </button>
          <button
            onClick={openCreate}
            className="no-print ml-auto flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            保険を登録
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">保険情報がありません</div>
        ) : (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">保険名</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">保険会社</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">証券番号</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">種別</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">案件</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">開始日</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">満期日</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">保険料</th>
                  <th className="no-print px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50 ${getRowClass(item.endDate)}`}>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.insurerName}</td>
                    <td className="px-4 py-3 text-slate-500">{item.policyNumber || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">{item.insuredType}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.project ? item.project.name : '-'}</td>
                    <td className="px-4 py-3">{formatDate(item.startDate)}</td>
                    <td className="px-4 py-3">
                      {item.endDate ? (
                        <span className={(() => {
                          const diff = (new Date(item.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                          if (diff < 0) return 'text-red-600 font-medium'
                          if (diff <= 30) return 'text-orange-600 font-medium'
                          return ''
                        })()}>
                          {formatDate(item.endDate)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">{formatMoney(item.premium)}</td>
                    <td className="no-print px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="no-print fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">{editingItem ? '保険を編集' : '保険を登録'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">保険名 <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="例: 工事保険2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">保険会社 <span className="text-red-500">*</span></label>
                <input
                  value={form.insurerName}
                  onChange={e => setForm(f => ({ ...f, insurerName: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="例: 東京海上日動"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">証券番号</label>
                <input
                  value={form.policyNumber}
                  onChange={e => setForm(f => ({ ...f, policyNumber: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">種別 <span className="text-red-500">*</span></label>
                <select
                  value={form.insuredType}
                  onChange={e => setForm(f => ({ ...f, insuredType: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {INSURED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">関連案件</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">なし</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">開始日</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">満期日</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">保険料（円）</label>
                  <input
                    type="number"
                    value={form.premium}
                    onChange={e => setForm(f => ({ ...f, premium: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">保険金額（円）</label>
                  <input
                    type="number"
                    value={form.coverage}
                    onChange={e => setForm(f => ({ ...f, coverage: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">キャンセル</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.insurerName || !form.insuredType}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
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
