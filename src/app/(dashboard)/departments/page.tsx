'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Building2, Plus, Pencil, Trash2, X, Save, Users, BarChart2 } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
  code?: string | null
  managerId?: string | null
  manager?: { id: string; name: string } | null
  createdAt: string
  _count?: { departmentBudgets: number }
}

const defaultForm = { name: '', code: '', managerId: '' }

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Department | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([depts, us]) => {
      setDepartments(Array.isArray(depts) ? depts : [])
      setUsers(Array.isArray(us) ? us : [])
      setLoading(false)
    })
  }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (dept: Department) => {
    setEditTarget(dept)
    setForm({ name: dept.name, code: dept.code || '', managerId: dept.managerId || '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('部門名は必須です'); return }
    setSaving(true)
    setError('')
    const url = editTarget ? `/api/departments/${editTarget.id}` : '/api/departments'
    const method = editTarget ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        code: form.code.trim() || null,
        managerId: form.managerId || null,
      }),
    })
    if (res.ok) {
      const saved = await res.json()
      if (editTarget) {
        setDepartments(prev => prev.map(d => d.id === saved.id ? saved : d))
      } else {
        setDepartments(prev => [...prev, saved])
      }
      setShowModal(false)
    } else {
      const data = await res.json()
      setError(data.error || '保存に失敗しました')
    }
    setSaving(false)
  }

  const handleDelete = async (dept: Department) => {
    if (!confirm(`「${dept.name}」を削除しますか？`)) return
    const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDepartments(prev => prev.filter(d => d.id !== dept.id))
    }
  }

  if (loading) return <div className="p-8 text-center">読み込み中...</div>

  return (
    <div>
      <Header title="部門管理" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">部門数</p>
              <p className="text-2xl font-bold">{departments.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="bg-emerald-100 rounded-lg p-2">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">管理者設定済み</p>
              <p className="text-2xl font-bold">{departments.filter(d => d.managerId).length}</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="font-semibold">部門一覧</h2>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              部門追加
            </button>
          </div>

          {departments.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">部門が登録されていません</p>
              <button
                onClick={openCreate}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                最初の部門を追加
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">部門名</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">コード</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">管理者</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map(dept => (
                  <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{dept.name}</td>
                    <td className="px-4 py-3 text-slate-500">{dept.code || '—'}</td>
                    <td className="px-4 py-3">
                      {dept.manager ? (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {dept.manager.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">未設定</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/departments/budget?departmentId=${dept.id}`}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="予算管理"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEdit(dept)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="編集"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{editTarget ? '部門編集' : '部門追加'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                部門名 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 工事部"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">部門コード</label>
              <input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: KOJI-01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">管理者</label>
              <select
                value={form.managerId}
                onChange={e => setForm({ ...form, managerId: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">未設定</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="border border-slate-300 px-4 py-2 rounded-lg text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
