'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Check, XCircle, Banknote } from 'lucide-react'

interface AdvancePayment {
  id: string
  purpose: string
  amount: number
  status: string
  createdAt: string
  approvedAt: string | null
  settledAt: string | null
  requester: { id: string; name: string }
  approver: { id: string; name: string } | null
  project: { id: string; name: string; projectNumber: string } | null
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

const STATUS_COLORS: Record<string, string> = {
  申請中: 'bg-yellow-100 text-yellow-700',
  承認済: 'bg-green-100 text-green-700',
  却下: 'bg-red-100 text-red-700',
  精算済: 'bg-slate-100 text-slate-600',
}

const defaultForm = { purpose: '', amount: '', projectId: '' }

export default function AdvancePaymentsPage() {
  const [tab, setTab] = useState<'mine' | 'pending' | 'approved'>('mine')
  const [items, setItems] = useState<AdvancePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchItems = async (t: typeof tab) => {
    setLoading(true)
    let url = '/api/advance-payments?'
    if (t === 'mine') url += 'mine=true'
    else if (t === 'pending') url += 'status=申請中'
    else url += 'status=承認済'
    const data = await fetch(url).then(r => r.json())
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems(tab)
  }, [tab])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : []))
  }, [])

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'settle') => {
    const labels: Record<string, string> = { approve: '承認', reject: '却下', settle: '精算完了' }
    if (!confirm(`この申請を${labels[action]}しますか？`)) return
    const res = await fetch(`/api/advance-payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === id ? updated : i))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/advance-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowModal(false)
        setForm(defaultForm)
        fetchItems(tab)
      } else {
        const d = await res.json()
        setError(d.error || '登録に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { key: 'mine' as const, label: '自分の申請' },
    { key: 'pending' as const, label: '承認待ち' },
    { key: 'approved' as const, label: '精算待ち' },
  ]

  return (
    <div>
      <Header title="仮払い管理" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setForm(defaultForm); setError(''); setShowModal(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 申請
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">データがありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">申請日</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">案件</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">目的</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">金額</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">申請者</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">ステータス</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.project ? `${item.project.projectNumber} ${item.project.name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.purpose}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                        ¥{item.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.requester.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {item.status === '申請中' && (
                            <>
                              <button
                                onClick={() => handleAction(item.id, 'approve')}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded"
                              >
                                <Check className="w-3 h-3" /> 承認
                              </button>
                              <button
                                onClick={() => handleAction(item.id, 'reject')}
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded"
                              >
                                <XCircle className="w-3 h-3" /> 却下
                              </button>
                            </>
                          )}
                          {item.status === '承認済' && (
                            <button
                              onClick={() => handleAction(item.id, 'settle')}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                            >
                              <Check className="w-3 h-3" /> 精算完了
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">仮払い申請</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">目的 *</label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={e => setForm({ ...form, purpose: e.target.value })}
                  required
                  placeholder="交通費・材料費など"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">金額 *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  required
                  min="1"
                  placeholder="10000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件（任意）</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm({ ...form, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件を選択しない</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  キャンセル
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '申請中...' : '申請する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
