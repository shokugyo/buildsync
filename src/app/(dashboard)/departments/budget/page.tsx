'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'

interface Department {
  id: string
  name: string
}

interface DepartmentBudget {
  id: string
  departmentId: string
  year: number
  month: number | null
  category: string
  budgetAmount: number
  actualAmount: number
}

function formatCurrency(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`
}

function consumptionColor(pct: number) {
  if (pct <= 80) return 'bg-emerald-50 text-emerald-700'
  if (pct <= 100) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

const CATEGORIES = ['人件費', '交通費', '通信費', '備品費', '外注費', 'その他']

interface ModalProps {
  departmentId: string
  year: number
  onClose: () => void
  onSaved: () => void
  editing?: DepartmentBudget | null
}

function BudgetModal({ departmentId, year, onClose, onSaved, editing }: ModalProps) {
  const [form, setForm] = useState({
    category: editing?.category ?? CATEGORIES[0],
    budgetAmount: editing ? String(editing.budgetAmount) : '',
    actualAmount: editing ? String(editing.actualAmount) : '0',
    month: editing?.month != null ? String(editing.month) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category || !form.budgetAmount) {
      setError('カテゴリと予算額は必須です')
      return
    }
    setSaving(true)
    setError('')
    try {
      const url = editing
        ? `/api/departments/${departmentId}/budget/${editing.id}`
        : `/api/departments/${departmentId}/budget`
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          category: form.category,
          budgetAmount: parseFloat(form.budgetAmount),
          actualAmount: parseFloat(form.actualAmount || '0'),
          month: form.month ? parseInt(form.month) : null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || '保存に失敗しました')
      } else {
        onSaved()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">{editing ? '予算を編集' : '予算を追加'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">カテゴリ</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">月（省略時: 年間）</label>
            <select
              value={form.month}
              onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">年間</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}月</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">予算額</label>
            <input
              type="number"
              value={form.budgetAmount}
              onChange={e => setForm(f => ({ ...f, budgetAmount: e.target.value }))}
              min={0}
              placeholder="0"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">実績</label>
            <input
              type="number"
              value={form.actualAmount}
              onChange={e => setForm(f => ({ ...f, actualAmount: e.target.value }))}
              min={0}
              placeholder="0"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">キャンセル</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DepartmentBudgetPage() {
  const currentYear = new Date().getFullYear()
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [year, setYear] = useState(currentYear)
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DepartmentBudget | null>(null)

  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then((d: Department[]) => {
        setDepartments(d)
        if (d.length > 0) setSelectedDeptId(d[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedDeptId) return
    setLoading(true)
    fetch(`/api/departments/${selectedDeptId}/budget?year=${year}`)
      .then(r => r.json())
      .then(d => { setBudgets(d.budgets ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedDeptId, year])

  const handleDelete = async (id: string) => {
    if (!confirm('この予算を削除しますか?')) return
    const res = await fetch(`/api/departments/${selectedDeptId}/budget/${id}`, { method: 'DELETE' })
    if (res.ok) setBudgets(b => b.filter(x => x.id !== id))
  }

  const handleSaved = () => {
    if (!selectedDeptId) return
    fetch(`/api/departments/${selectedDeptId}/budget?year=${year}`)
      .then(r => r.json())
      .then(d => setBudgets(d.budgets ?? []))
  }

  const totalBudget = budgets.reduce((s, b) => s + b.budgetAmount, 0)
  const totalActual = budgets.reduce((s, b) => s + b.actualAmount, 0)
  const totalDiff = totalBudget - totalActual
  const totalPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0

  return (
    <div>
      <Header title="部署別予算管理" />
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">部署</label>
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.length === 0 && <option value="">部署なし</option>}
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">年度</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value, 10))}
              min={2000}
              max={2100}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="ml-auto">
            <button
              onClick={() => { setEditing(null); setShowModal(true) }}
              disabled={!selectedDeptId}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              予算を追加
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">読み込み中...</div>
        ) : !selectedDeptId ? (
          <div className="text-center text-slate-500 py-16">部署を選択してください</div>
        ) : budgets.length === 0 ? (
          <div className="text-center text-slate-500 py-16">予算データがありません</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: '予算合計', value: formatCurrency(totalBudget), color: 'text-blue-600' },
                { label: '実績合計', value: formatCurrency(totalActual), color: 'text-slate-700' },
                { label: '差異', value: formatCurrency(totalDiff), color: totalDiff >= 0 ? 'text-emerald-600' : 'text-red-600' },
                { label: '消化率', value: `${totalPct.toFixed(1)}%`, color: totalPct <= 80 ? 'text-emerald-600' : totalPct <= 100 ? 'text-amber-600' : 'text-red-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-4 py-3 text-left font-medium text-xs">カテゴリ</th>
                      <th className="px-4 py-3 text-left font-medium text-xs">月</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">予算額</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">実績</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">差異</th>
                      <th className="px-4 py-3 text-right font-medium text-xs">消化率</th>
                      <th className="px-4 py-3 text-center font-medium text-xs">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map((b, i) => {
                      const diff = b.budgetAmount - b.actualAmount
                      const pct = b.budgetAmount > 0 ? (b.actualAmount / b.budgetAmount) * 100 : 0
                      return (
                        <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-3 font-medium text-slate-800">{b.category}</td>
                          <td className="px-4 py-3 text-slate-600">{b.month != null ? `${b.month}月` : '年間'}</td>
                          <td className="px-4 py-3 text-right text-blue-700 font-medium">{formatCurrency(b.budgetAmount)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(b.actualAmount)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${diff >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${consumptionColor(pct)}`}>
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => { setEditing(b); setShowModal(true) }}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="編集"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(b.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-slate-800 text-white font-bold">
                      <td className="px-4 py-3 text-xs" colSpan={2}>合計</td>
                      <td className="px-4 py-3 text-right text-blue-300">{formatCurrency(totalBudget)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(totalActual)}</td>
                      <td className={`px-4 py-3 text-right ${totalDiff >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                        {totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${consumptionColor(totalPct)}`}>
                          {totalPct.toFixed(1)}%
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && selectedDeptId && (
        <BudgetModal
          departmentId={selectedDeptId}
          year={year}
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
