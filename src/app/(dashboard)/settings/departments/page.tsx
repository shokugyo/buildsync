'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Building2, X } from 'lucide-react'

const LEFT_MENU = [
  { label: 'プロフィール情報', href: '/settings' },
  { label: '通知設定', href: '/settings/notifications' },
  { label: 'セキュリティ（2FA）', href: '/settings/security' },
  { label: 'ログイン履歴', href: '/settings/sessions' },
  { label: '自社情報', href: '/settings/company' },
  { label: '部門管理', href: '/settings/departments' },
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

interface Department {
  id: string
  name: string
  code: string | null
  managerId: string | null
  manager: { id: string; name: string } | null
  createdAt: string
}

interface UserOption {
  id: string
  name: string
}

const emptyForm = { name: '', code: '', managerId: '' }

export default function DepartmentsPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === '管理者'

  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/departments')
      if (res.ok) setDepartments(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : (data.users ?? []))
    }
  }

  useEffect(() => {
    fetchDepartments()
    fetchUsers()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (dept: Department) => {
    setEditing(dept)
    setForm({ name: dept.name, code: dept.code ?? '', managerId: dept.managerId ?? '' })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('部門名は必須です')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        managerId: form.managerId || null,
      }
      const res = editing
        ? await fetch(`/api/departments/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (res.ok) {
        await fetchDepartments()
        closeModal()
      } else {
        const data = await res.json()
        setError(data.error || '保存に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchDepartments()
      }
    } finally {
      setDeleteConfirm(null)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        {/* Left sidebar */}
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings/departments'
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

        {/* Main content */}
        <div className="flex-1 p-6 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">部門管理</h2>
              <p className="text-sm text-slate-400 mt-0.5">社内の部門・部署を管理します</p>
            </div>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                部門を追加
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">読み込み中...</div>
          ) : departments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 flex flex-col items-center gap-3">
              <Building2 className="w-10 h-10 text-slate-300" />
              <p className="text-slate-400 text-sm">部門がまだ登録されていません</p>
              {isAdmin && (
                <button
                  onClick={openAdd}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-1"
                >
                  <Plus className="w-4 h-4" />
                  最初の部門を追加
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">部門名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">コード</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">マネージャー</th>
                    {isAdmin && (
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, idx) => (
                    <tr
                      key={dept.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${idx === departments.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{dept.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {dept.code ? (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{dept.code}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {dept.manager ? dept.manager.name : <span className="text-slate-300">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(dept)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              title="編集"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(dept.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? '部門を編集' : '部門を追加'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  部門名 <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-medium ml-1">必須</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：営業部、工事部"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  部門コード <span className="text-xs text-slate-400 ml-1">任意</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="例：SALES、CONST-01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  マネージャー <span className="text-xs text-slate-400 ml-1">任意</span>
                </label>
                <select
                  value={form.managerId}
                  onChange={(e) => setForm(f => ({ ...f, managerId: e.target.value }))}
                  className={`${inputCls} bg-white`}
                >
                  <option value="">未設定</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors"
              >
                {saving ? '保存中...' : editing ? '更新する' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-2">部門を削除</h3>
              <p className="text-sm text-slate-500">
                この部門を削除しますか？この操作は元に戻せません。
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
