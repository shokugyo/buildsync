'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { Plus, X, Check, XCircle, Trash2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  projectNumber: string
}

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  expenseDate: string
  receiptUrl: string | null
  status: string
  submittedBy: string
  submitter: { id: string; name: string }
  approver: { id: string; name: string } | null
  approvedAt: string | null
  project: { id: string; name: string; projectNumber: string } | null
  createdAt: string
}

const EXPENSE_CATEGORIES = ['交通費', '宿泊費', '接待費', '消耗品費', '通信費', 'その他']

const STATUS_BADGE: Record<string, string> = {
  '申請中': 'bg-yellow-100 text-yellow-700',
  '承認済': 'bg-green-100 text-green-700',
  '却下': 'bg-red-100 text-red-700',
}

export default function ExpensesPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'mine' | 'pending'>('mine')
  const [myExpenses, setMyExpenses] = useState<Expense[]>([])
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    projectId: '',
    receiptUrl: '',
  })

  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  const isManager = role === '管理者' || role === 'マネージャー'

  const fetchMyExpenses = async () => {
    const res = await fetch('/api/expenses?mine=true')
    const data = await res.json()
    setMyExpenses(Array.isArray(data) ? data : [])
  }

  const fetchPendingExpenses = async () => {
    const res = await fetch('/api/expenses?status=申請中')
    const data = await res.json()
    setPendingExpenses(Array.isArray(data) ? data : [])
  }

  const fetchProjects = async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchMyExpenses()
    fetchProjects()
    if (isManager) fetchPendingExpenses()
  }, [isManager])

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.amount || !form.expenseDate) return
    setSaving(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setShowModal(false)
      setForm({ category: '', description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), projectId: '', receiptUrl: '' })
      fetchMyExpenses()
    }
  }

  const handleApprove = async (id: string) => {
    await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '承認済' }),
    })
    fetchPendingExpenses()
    fetchMyExpenses()
  }

  const handleReject = async (id: string) => {
    await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '却下' }),
    })
    fetchPendingExpenses()
    fetchMyExpenses()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この経費申請を削除しますか？')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    fetchMyExpenses()
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('ja-JP')

  return (
    <div>
      <Header title="経費精算" />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              自分の申請
            </button>
            {isManager && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                承認待ち
                {pendingExpenses.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">{pendingExpenses.length}</span>
                )}
              </button>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            経費を申請
          </button>
        </div>

        {activeTab === 'mine' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {myExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">申請した経費がありません。</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">日付</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">カテゴリ</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">内容</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">金額</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">案件</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">ステータス</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 group">
                      <td className="px-4 py-3 text-slate-600">{formatDate(e.expenseDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{e.category}</td>
                      <td className="px-4 py-3 text-slate-800">{e.description}</td>
                      <td className="px-4 py-3 text-slate-800 text-right font-medium">¥{e.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{e.project ? e.project.name : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[e.status] || 'bg-slate-100 text-slate-600'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e.status === '申請中' && e.submittedBy === userId && (
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'pending' && isManager && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {pendingExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">承認待ちの経費申請はありません。</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">日付</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">カテゴリ</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">内容</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">金額</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">案件</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">申請者</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{formatDate(e.expenseDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{e.category}</td>
                      <td className="px-4 py-3 text-slate-800">{e.description}</td>
                      <td className="px-4 py-3 text-slate-800 text-right font-medium">¥{e.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{e.project ? e.project.name : '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{e.submitter.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(e.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            承認
                          </button>
                          <button
                            onClick={() => handleReject(e.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            却下
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">経費を申請</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ <span className="text-red-500">*</span></label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日付 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="経費の内容を入力..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">金額 <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件（任意）</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件なし</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">領収書URL（任意）</label>
                <input
                  type="url"
                  value={form.receiptUrl}
                  onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.category || !form.description || !form.amount || !form.expenseDate}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '申請中...' : '申請する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
