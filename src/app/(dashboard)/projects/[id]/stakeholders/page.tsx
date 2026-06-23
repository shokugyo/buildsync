'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { ArrowLeft, Users, Plus, Trash2, Edit2, X, Save, Search } from 'lucide-react'

interface Member {
  userId: string
  memberRole: string
  user: { id: string; name: string; email: string; role: string }
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

const MEMBER_ROLES = ['監督', '営業', '設計', '品質管理', '経理', '協力会社', '閲覧者']

const ROLE_COLORS: Record<string, string> = {
  '監督': 'bg-blue-100 text-blue-700',
  '営業': 'bg-green-100 text-green-700',
  '設計': 'bg-purple-100 text-purple-700',
  '品質管理': 'bg-orange-100 text-orange-700',
  '経理': 'bg-yellow-100 text-yellow-700',
  '協力会社': 'bg-slate-100 text-slate-600',
  '閲覧者': 'bg-gray-100 text-gray-500',
}

export default function StakeholdersPage() {
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState('閲覧者')
  const [userSearch, setUserSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/projects/${id}/members`).then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([proj, mem, users]) => {
      setProject(proj && !proj.error ? proj : null)
      setMembers(Array.isArray(mem) ? mem : [])
      setAllUsers(Array.isArray(users) ? users : [])
      setLoading(false)
    })
  }, [id])

  const nonMembers = allUsers.filter(u => !members.find(m => m.userId === u.id))
  const filteredNonMembers = nonMembers.filter(u =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filtered = members.filter(m => {
    if (roleFilter && m.memberRole !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
    }
    return true
  })

  const handleAdd = async () => {
    if (!addUserId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: addUserId, memberRole: addRole }),
      })
      if (res.ok) {
        const refreshed = await fetch(`/api/projects/${id}/members`).then(r => r.json())
        setMembers(Array.isArray(refreshed) ? refreshed : [])
        setShowAddModal(false)
        setAddUserId('')
        setAddRole('閲覧者')
        setUserSearch('')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return
    const res = await fetch(`/api/projects/${id}/members?userId=${userId}`, { method: 'DELETE' })
    if (res.ok) setMembers(prev => prev.filter(m => m.userId !== userId))
  }

  const handleEditRole = async (userId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, memberRole: editRole }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.userId === userId ? { ...m, memberRole: editRole } : m))
        setEditingMemberId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const roleGroups = MEMBER_ROLES.reduce((acc, role) => {
    const count = members.filter(m => m.memberRole === role).length
    if (count > 0) acc[role] = count
    return acc
  }, {} as Record<string, number>)

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="p-8 text-center text-slate-500">読み込み中...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/projects/${id}`} className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Users className="w-5 h-5 text-slate-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">関係者一覧</h1>
            {project && <p className="text-xs text-slate-500">[{project.projectNumber}] {project.name}</p>}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> メンバー追加
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{members.length}</p>
            <p className="text-xs text-slate-500 mt-1">関係者合計</p>
          </div>
          {Object.entries(roleGroups).slice(0, 3).map(([role, count]) => (
            <div key={role} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{count}</p>
              <p className="text-xs text-slate-500 mt-1">{role}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="名前・メールで検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全役割</option>
            {MEMBER_ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Members list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">関係者が登録されていません</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs text-slate-500">
                  <th className="px-4 py-3 text-left">氏名</th>
                  <th className="px-4 py-3 text-left">メール</th>
                  <th className="px-4 py-3 text-left">システム権限</th>
                  <th className="px-4 py-3 text-left">案件役割</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(m => (
                  <tr key={m.userId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.user.name}</td>
                    <td className="px-4 py-3 text-slate-500">{m.user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{m.user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      {editingMemberId === m.userId ? (
                        <div className="flex items-center gap-2">
                          <select value={editRole} onChange={e => setEditRole(e.target.value)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs">
                            {MEMBER_ROLES.map(r => <option key={r}>{r}</option>)}
                          </select>
                          <button onClick={() => handleEditRole(m.userId)} disabled={saving}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingMemberId(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.memberRole] || 'bg-slate-100 text-slate-600'}`}>
                          {m.memberRole}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {editingMemberId !== m.userId && (
                          <button onClick={() => { setEditingMemberId(m.userId); setEditRole(m.memberRole) }}
                            className="p-1 text-slate-400 hover:text-blue-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleRemove(m.userId)}
                          className="p-1 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">メンバーを追加</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ユーザー検索</label>
                  <input
                    type="text"
                    placeholder="名前またはメールで検索"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {filteredNonMembers.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">追加できるユーザーがいません</p>
                  ) : filteredNonMembers.map(u => (
                    <label key={u.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 ${addUserId === u.id ? 'bg-blue-50' : ''}`}>
                      <input type="radio" name="userId" value={u.id} checked={addUserId === u.id}
                        onChange={() => setAddUserId(u.id)} className="text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件役割</label>
                  <select value={addRole} onChange={e => setAddRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {MEMBER_ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                    キャンセル
                  </button>
                  <button onClick={handleAdd} disabled={!addUserId || saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {saving ? '追加中...' : '追加する'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
