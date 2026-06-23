'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Plus, Edit2, X, Trash2, Users, Mail, Lock, Unlock, Send, Ban, FolderOpen } from 'lucide-react'

const ROLES = ['管理者', '現場監督', '事務担当', '一般']

const LEFT_MENU = [
  { label: 'プロフィール情報', href: '/settings' },
  { label: '通知設定', href: '/settings/notifications' },
  { label: 'セキュリティ（2FA）', href: '/settings/security' },
  { label: 'ログイン履歴', href: '/settings/sessions' },
  { label: '自社情報', href: '/settings/company' },
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

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  status: string
  jobType?: string | null
  department?: string | null
  lockedUntil?: string | null
  failedLoginAttempts?: number
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt: string
}

export default function UsersPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === '管理者'

  const [tab, setTab] = useState<'members' | 'invitations'>('members')

  const [users, setUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [editingRole, setEditingRole] = useState<{ id: string; role: string } | null>(null)

  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: '一般' })
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteFormError, setInviteFormError] = useState('')

  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: '一般', department: '' })
  const [userSaving, setUserSaving] = useState(false)
  const [userError, setUserError] = useState('')

  const [assignUser, setAssignUser] = useState<UserRecord | null>(null)
  const [allProjects, setAllProjects] = useState<{ id: string; name: string; projectNumber: string }[]>([])
  const [userProjectIds, setUserProjectIds] = useState<Set<string>>(new Set())
  const [assignLoading, setAssignLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    setUsersLoading(true)
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setUsersLoading(false) })
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin || tab !== 'invitations') return
    setInvitationsLoading(true)
    fetch('/api/invitations')
      .then((r) => r.json())
      .then((data) => { setInvitations(Array.isArray(data) ? data : []); setInvitationsLoading(false) })
  }, [isAdmin, tab])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserSaving(true)
    setUserError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      if (res.ok) {
        const newUser = await res.json()
        setUsers((prev) => [...prev, newUser])
        setShowUserModal(false)
        setUserForm({ name: '', email: '', password: '', role: '一般', department: '' })
      } else {
        const err = await res.json()
        setUserError(err.error || 'ユーザー作成に失敗しました')
      }
    } finally {
      setUserSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`「${userName}」を削除しますか？`)) return
    const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleRoleChange = async (userId: string, role: string) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, role }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
      setEditingRole(null)
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === '有効' ? '停止' : '有効'
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, status: newStatus }),
    })
    if (res.ok) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)))
  }

  const handleUnlockUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}/unlock`, { method: 'POST' })
    if (res.ok) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, failedLoginAttempts: 0, lockedUntil: null } : u)))
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteSaving(true)
    setInviteFormError('')
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      if (res.ok) {
        const created = await res.json()
        setInvitations((prev) => [created, ...prev])
        setShowInviteModal(false)
        setInviteForm({ email: '', role: '一般' })
        setTab('invitations')
      } else {
        const err = await res.json()
        setInviteFormError(err.error || '招待の送信に失敗しました')
      }
    } finally {
      setInviteSaving(false)
    }
  }

  const openAssignProjects = async (u: UserRecord) => {
    setAssignUser(u)
    setAssignLoading(true)
    const [projects, memberships] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch(`/api/users/${u.id}/projects`).then(r => r.json()),
    ])
    setAllProjects(Array.isArray(projects) ? projects : [])
    setUserProjectIds(new Set((Array.isArray(memberships) ? memberships : []).map((m: any) => m.projectId)))
    setAssignLoading(false)
  }

  const handleToggleProject = async (projectId: string) => {
    if (!assignUser) return
    if (userProjectIds.has(projectId)) {
      await fetch(`/api/projects/${projectId}/members?userId=${assignUser.id}`, { method: 'DELETE' })
      setUserProjectIds(prev => { const next = new Set(prev); next.delete(projectId); return next })
    } else {
      await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: assignUser.id, memberRole: '一般' }),
      })
      setUserProjectIds(prev => new Set(Array.from(prev).concat(projectId)))
    }
  }

  const handleResend = async (id: string) => {
    setResendingId(id)
    setInviteError('')
    try {
      const res = await fetch(`/api/invitations/${id}/resend`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setInvitations((prev) => prev.map((inv) => (inv.id === id ? updated : inv)))
      } else {
        const err = await res.json()
        setInviteError(err.error || '再送信に失敗しました')
      }
    } finally {
      setResendingId(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('この招待をキャンセルしますか？')) return
    setCancellingId(id)
    setInviteError('')
    try {
      const res = await fetch(`/api/invitations/${id}/cancel`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setInvitations((prev) => prev.map((inv) => (inv.id === id ? updated : inv)))
      } else {
        const err = await res.json()
        setInviteError(err.error || 'キャンセルに失敗しました')
      }
    } finally {
      setCancellingId(null)
    }
  }

  const statusColor: Record<string, string> = {
    '招待中': 'bg-blue-100 text-blue-700',
    'キャンセル': 'bg-slate-100 text-slate-500',
    '登録済': 'bg-green-100 text-green-700',
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定メニュー</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings/users'
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

        <div className="flex-1 p-6 max-w-4xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">メンバー管理</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowInviteModal(true); setInviteFormError('') }}
                className="flex items-center gap-1.5 border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                <Mail className="w-4 h-4" /> 招待を送る
              </button>
              <button
                onClick={() => { setShowUserModal(true); setUserError('') }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> ユーザーを追加
              </button>
            </div>
          </div>

          <div className="flex gap-1 mb-4 border-b border-slate-200">
            <button
              onClick={() => setTab('members')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'members' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              メンバー一覧
            </button>
            <button
              onClick={() => setTab('invitations')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'invitations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              招待中
            </button>
          </div>

          {tab === 'members' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {usersLoading ? (
                <div className="p-6 text-sm text-slate-500">読み込み中...</div>
              ) : users.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">ユーザーがいません</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        {(u.department || u.jobType) && (
                          <p className="text-xs text-slate-400">{[u.department, u.jobType].filter(Boolean).join(' / ')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingRole?.id === u.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={editingRole.role}
                              onChange={(e) => setEditingRole((prev) => prev ? { ...prev, role: e.target.value } : prev)}
                              className="text-xs border border-slate-300 rounded px-2 py-1"
                            >
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button onClick={() => handleRoleChange(u.id, editingRole.role)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">保存</button>
                            <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <>
                            {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium flex items-center gap-1">
                                <Lock className="w-3 h-3" />ロック中
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded ${u.status === '停止' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{u.status || '有効'}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{u.role}</span>
                            <button onClick={() => setEditingRole({ id: u.id, role: u.role })} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button
                              onClick={() => openAssignProjects(u)}
                              className="text-slate-400 hover:text-indigo-600"
                              title="案件割当"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                            {u.id !== (session?.user as any)?.id && (
                              <>
                                {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                                  <button
                                    onClick={() => handleUnlockUser(u.id)}
                                    className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                                  >
                                    <Unlock className="w-3 h-3" />アンロック
                                  </button>
                                )}
                                <button
                                  onClick={() => handleStatusToggle(u.id, u.status || '有効')}
                                  className={`text-xs px-2 py-0.5 rounded border ${u.status === '停止' ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}`}
                                >
                                  {u.status === '停止' ? '有効化' : '停止'}
                                </button>
                                <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'invitations' && (
            <div>
              {inviteError && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{inviteError}</div>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {invitationsLoading ? (
                  <div className="p-6 text-sm text-slate-500">読み込み中...</div>
                ) : invitations.length === 0 ? (
                  <div className="p-6 text-center">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">招待中のユーザーはいません</p>
                    <button
                      onClick={() => { setShowInviteModal(true); setInviteFormError('') }}
                      className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mx-auto"
                    >
                      <Plus className="w-4 h-4" /> 招待を送る
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-xs font-medium text-slate-500">
                          <th className="px-4 py-3 text-left">メールアドレス</th>
                          <th className="px-4 py-3 text-left">役割</th>
                          <th className="px-4 py-3 text-left">送信日</th>
                          <th className="px-4 py-3 text-left">有効期限</th>
                          <th className="px-4 py-3 text-left">ステータス</th>
                          <th className="px-4 py-3 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invitations.map((inv) => {
                          const isExpired = new Date(inv.expiresAt) < new Date() && inv.status === '招待中'
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-900">{inv.email}</td>
                              <td className="px-4 py-3 text-slate-600">{inv.role}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                {new Date(inv.createdAt).toLocaleDateString('ja-JP')}
                              </td>
                              <td className="px-4 py-3 text-xs whitespace-nowrap">
                                <span className={isExpired ? 'text-red-600 font-medium' : 'text-slate-500'}>
                                  {new Date(inv.expiresAt).toLocaleDateString('ja-JP')}
                                  {isExpired && ' (期限切れ)'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  {inv.status !== 'キャンセル' && (
                                    <>
                                      <button
                                        onClick={() => handleResend(inv.id)}
                                        disabled={resendingId === inv.id}
                                        className="flex items-center gap-1 text-xs px-2 py-1 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                                      >
                                        <Send className="w-3 h-3" />
                                        {resendingId === inv.id ? '送信中...' : '再送信'}
                                      </button>
                                      <button
                                        onClick={() => handleCancel(inv.id)}
                                        disabled={cancellingId === inv.id}
                                        className="flex items-center gap-1 text-xs px-2 py-1 border border-red-200 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                                      >
                                        <Ban className="w-3 h-3" />
                                        {cancellingId === inv.id ? '処理中...' : 'キャンセル'}
                                      </button>
                                    </>
                                  )}
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
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">招待を送る</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {inviteFormError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{inviteFormError}</div>}
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                  placeholder="example@email.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">役割</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <p className="text-xs text-slate-400">招待リンクはメールで送信されます。リンクは7日間有効です。</p>
              <div className="flex gap-3">
                <button type="submit" disabled={inviteSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">
                  {inviteSaving ? '送信中...' : '招待を送る'}
                </button>
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">案件割当 — {assignUser.name}</h2>
              <button onClick={() => setAssignUser(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {assignLoading ? (
              <p className="text-sm text-slate-500 text-center py-8">読み込み中...</p>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {allProjects.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">案件がありません</p>}
                {allProjects.map(p => (
                  <label key={p.id} className="flex items-center gap-3 py-3 px-1 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={userProjectIds.has(p.id)}
                      onChange={() => handleToggleProject(p.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs text-slate-400 font-mono w-20 flex-shrink-0">{p.projectNumber}</span>
                    <span className="text-sm text-slate-800">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setAssignUser(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">ユーザーを追加</h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {userError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{userError}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              {([['名前', 'name', 'text'], ['メールアドレス', 'email', 'email'], ['初期パスワード', 'password', 'password']] as const).map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label} <span className="text-red-500">*</span></label>
                  <input
                    type={type}
                    value={(userForm as any)[key]}
                    onChange={(e) => setUserForm({ ...userForm, [key]: e.target.value })}
                    required
                    placeholder={type === 'password' ? '8文字以上' : ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">役割</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">部門</label>
                <input type="text" value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} placeholder="例：工事部・営業部" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={userSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">{userSaving ? '作成中...' : '作成する'}</button>
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
