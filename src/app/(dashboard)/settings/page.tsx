'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Save, User, Building2, Lock, Users, Plus, Edit2, X, Trash2, Bell, Shield, Eye, EyeOff, Camera, Unlock } from 'lucide-react'

const ROLES = ['管理者', '現場監督', '事務担当', '一般']
const JOB_TYPES = ['施工', '施工監理', '個人', '設計士', '営業', '積算', '管理職', 'サポート', 'その他']

function RequiredBadge() {
  return <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-medium ml-1.5">必須</span>
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-3 pr-6 text-sm text-slate-600 font-medium whitespace-nowrap align-top pt-3.5 w-48">
        {label}{required && <RequiredBadge />}
      </td>
      <td className="py-3">{children}</td>
    </tr>
  )
}

const LEFT_MENU = [
  { label: 'プロフィール', href: '/settings/profile' },
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

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const isAdmin = (session?.user as any)?.role === '管理者'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profileForm, setProfileForm] = useState({
    name: '', email: '', jobType: '', department: '', phone: '', notifyEmail: '',
  })
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [userRole, setUserRole] = useState('')

  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: '一般', department: '' })
  const [userSaving, setUserSaving] = useState(false)
  const [userError, setUserError] = useState('')
  const [editingRole, setEditingRole] = useState<{ id: string; role: string } | null>(null)

  const [company, setCompany] = useState<any>(null)
  const [companyForm, setCompanyForm] = useState({ name: '', type: '元請', address: '', phone: '', email: '' })
  const [companySaving, setCompanySaving] = useState(false)
  const [companySuccess, setCompanySuccess] = useState(false)
  const [companyError, setCompanyError] = useState('')
  const [showCompanyEdit, setShowCompanyEdit] = useState(false)

  const [language, setLanguage] = useState('ja')
  const [langSaved, setLangSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('buildsync_language')
    if (stored) setLanguage(stored)
  }, [])

  const handleLanguageSave = () => {
    localStorage.setItem('buildsync_language', language)
    setLangSaved(true)
    setTimeout(() => setLangSaved(false), 3000)
  }

  useEffect(() => {
    if (session?.user) {
      setProfileForm((prev) => ({ ...prev, name: session.user.name || '', email: session.user.email || '' }))
      setCurrentUserId((session.user as any).id || '')
      setUserRole((session.user as any).role || '')
    }
  }, [session])

  useEffect(() => {
    fetch('/api/users?me=true').then((r) => r.json()).then((data) => {
      if (data && !data.error) {
        setProfileForm((prev) => ({ ...prev, jobType: data.jobType || '', department: data.department || '', phone: data.phone || '', notifyEmail: data.notifyEmail || '' }))
        setGoogleCalendarUrl(data.googleCalendarUrl || '')
        setCurrentUserId(data.id || '')
      }
    })
    fetch('/api/company').then((r) => r.json()).then((data) => {
      setCompany(data)
      setCompanyName(data?.name || '')
      setCompanyForm({ name: data?.name || '', type: data?.type || '元請', address: data?.address || '', phone: data?.phone || '', email: data?.email || '' })
    })
  }, [])

  useEffect(() => {
    if (isAdmin) {
      setUsersLoading(true)
      fetch('/api/users').then((r) => r.json()).then((data) => {
        setUsers(Array.isArray(data) ? data : [])
        setUsersLoading(false)
      })
    }
  }, [isAdmin])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileForm, googleCalendarUrl }),
      })
      if (res.ok) {
        await update({ name: profileForm.name, email: profileForm.email })
        setProfileSuccess(true)
        setTimeout(() => setProfileSuccess(false), 3000)
      } else {
        const err = await res.json()
        setProfileError(err.error || '更新に失敗しました')
      }
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('パスワードが一致しません'); return }
    if (pwForm.newPassword.length < 7) { setPwError('7文字以上で入力してください'); return }
    setPwSaving(true)
    setPwError('')
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwForm.newPassword, currentPassword: pwForm.newPassword }),
      })
      if (res.ok) {
        setPwSuccess(true)
        setPwForm({ newPassword: '', confirmPassword: '' })
        setTimeout(() => setPwSuccess(false), 3000)
      } else {
        const err = await res.json()
        setPwError(err.error || 'パスワード変更に失敗しました')
      }
    } finally {
      setPwSaving(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserSaving(true)
    setUserError('')
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) })
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

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCompanySaving(true)
    setCompanyError('')
    try {
      const res = await fetch('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(companyForm) })
      if (res.ok) {
        const updated = await res.json()
        setCompany(updated)
        setShowCompanyEdit(false)
        setCompanySuccess(true)
        setTimeout(() => setCompanySuccess(false), 3000)
      } else {
        const err = await res.json()
        setCompanyError(err.error || '更新に失敗しました')
      }
    } finally {
      setCompanySaving(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`「${userName}」を削除しますか？`)) return
    const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleRoleChange = async (userId: string, role: string) => {
    const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: userId, role }) })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
      setEditingRole(null)
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === '有効' ? '停止' : '有効'
    const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: userId, status: newStatus }) })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)))
    }
  }

  const handleUnlockUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}/unlock`, { method: 'POST' })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, failedLoginAttempts: 0, lockedUntil: null } : u)))
    }
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        {/* Left sidebar */}
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">プロフィール情報</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    item.href === '/settings' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {isAdmin && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2 mt-4">管理</p>
              <ul className="space-y-0.5">
                <li><Link href="/settings" className="block px-2 py-1.5 rounded text-sm text-slate-600 hover:bg-slate-200">メンバー管理</Link></li>
                <li><Link href="/settings" className="block px-2 py-1.5 rounded text-sm text-slate-600 hover:bg-slate-200">会社設定</Link></li>
                <li><Link href="/settings/system" className="block px-2 py-1.5 rounded text-sm text-slate-600 hover:bg-slate-200">システム設定</Link></li>
              </ul>
            </>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">プロフィール情報</h2>

          {profileSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">プロフィールを更新しました</div>}
          {profileError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{profileError}</div>}

          <form onSubmit={handleProfileSubmit}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
              <table className="w-full">
                <tbody>
                  <FieldRow label="氏名" required>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                      className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </FieldRow>
                  <FieldRow label="ユーザーID">
                    <span className="text-sm text-slate-600 font-mono">{currentUserId.slice(-8).toUpperCase() || '-'}</span>
                  </FieldRow>
                  <FieldRow label="所属会社">
                    <span className="text-sm text-slate-600">{companyName || '-'}</span>
                  </FieldRow>
                  <FieldRow label="役割">
                    <span className="text-sm text-slate-600">{userRole || '-'}</span>
                  </FieldRow>
                  <FieldRow label="職種" required>
                    <div className="flex flex-wrap gap-3">
                      {JOB_TYPES.map((jt) => (
                        <label key={jt} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="jobType" value={jt} checked={profileForm.jobType === jt} onChange={(e) => setProfileForm({ ...profileForm, jobType: e.target.value })} className="text-blue-600" />
                          <span className="text-sm text-slate-700">{jt}</span>
                        </label>
                      ))}
                    </div>
                  </FieldRow>
                  <FieldRow label="部門">
                    <input
                      type="text"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      placeholder="例：工事部・営業部"
                      className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </FieldRow>
                  <FieldRow label="メールアドレス" required>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </FieldRow>
                  <FieldRow label="メールアドレス（追加用）">
                    <input
                      type="email"
                      value={profileForm.notifyEmail}
                      onChange={(e) => setProfileForm({ ...profileForm, notifyEmail: e.target.value })}
                      placeholder="メールアドレス（追加用）"
                      className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">※設定すると、通知がこのメールアドレスにも届くようになります。</p>
                  </FieldRow>
                  <FieldRow label="電話番号" required>
                    <input type="text" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="090-0000-0000" className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </FieldRow>
                  <FieldRow label="プロフィール画像">
                    <div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded text-sm text-slate-700 mb-2">
                        <Camera className="w-4 h-4" />写真を選択する
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                      <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">※推奨: 100×100px以上のJPG/PNG</p>
                    </div>
                  </FieldRow>
                  <FieldRow label="Googleカレンダー同期URL">
                    <input
                      type="url"
                      value={googleCalendarUrl}
                      onChange={(e) => setGoogleCalendarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">※このURLをGoogleカレンダーに登録すると、案件の着工日・竣工日・30日などを表示します。</p>
                  </FieldRow>
                </tbody>
              </table>
            </div>

            {/* Password section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">パスワード変更</h3>
              </div>
              {pwSuccess && <div className="mx-5 mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">パスワードを変更しました</div>}
              {pwError && <div className="mx-5 mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{pwError}</div>}
              <table className="w-full">
                <tbody>
                  <FieldRow label="新しいパスワードを入力" required>
                    <div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={pwForm.newPassword}
                        onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                        className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="入力してください"
                      />
                      <p className="text-xs text-slate-400 mt-1">※7文字以上「半角数字」が必要なほか、半角以上の半角英数字で入力してください</p>
                    </div>
                  </FieldRow>
                  <FieldRow label="パスワード（確認）" required>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="パスワード（確認）"
                    />
                  </FieldRow>
                </tbody>
              </table>
              <div className="px-5 py-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                  <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="rounded border-slate-300" />
                  パスワードを表示
                </label>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={profileSaving}
                onClick={(e) => {
                  if (pwForm.newPassword || pwForm.confirmPassword) {
                    handlePasswordSubmit(e as any)
                  }
                }}
                className="bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white px-10 py-2 rounded-lg font-medium transition-colors"
              >
                {profileSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          </form>

          {/* Company Info */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">会社情報</h3>
                </div>
                {!showCompanyEdit && (
                  <button onClick={() => setShowCompanyEdit(true)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" /> 編集
                  </button>
                )}
              </div>
              {companySuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">会社情報を更新しました</div>}
              {showCompanyEdit ? (
                <>
                  {companyError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{companyError}</div>}
                  <form onSubmit={handleCompanySubmit} className="space-y-3">
                    {[['会社名', 'name', 'text', true], ['住所', 'address', 'text', false], ['電話番号', 'phone', 'text', false], ['メールアドレス', 'email', 'email', false]].map(([label, key, type, req]) => (
                      <div key={String(key)}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{String(label)}{req && ' *'}</label>
                        <input type={String(type)} value={(companyForm as any)[String(key)]} onChange={(e) => setCompanyForm({ ...companyForm, [String(key)]: e.target.value })} required={Boolean(req)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <button type="submit" disabled={companySaving} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium">{companySaving ? '保存中...' : '保存する'}</button>
                      <button type="button" onClick={() => { setShowCompanyEdit(false); setCompanyError('') }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium">キャンセル</button>
                    </div>
                  </form>
                </>
              ) : (
                <dl className="space-y-2 text-sm">
                  {[['会社名', company?.name], ['種別', company?.type], ['住所', company?.address], ['電話番号', company?.phone], ['メール', company?.email]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={String(k)} className="flex gap-3">
                      <dt className="text-slate-500 w-24">{String(k)}</dt>
                      <dd className="text-slate-900">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {/* Language Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mt-6">
            <h3 className="font-semibold text-slate-900 mb-4">言語設定</h3>
            {langSaved && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">言語設定を保存しました</div>}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700 w-24">表示言語</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
              <button
                onClick={handleLanguageSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">※ 現在は日本語のみ対応しています。英語対応は今後予定しています。</p>
          </div>

          {/* User Management */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">ユーザー管理</h3>
                </div>
                <button onClick={() => setShowUserModal(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                  <Plus className="w-4 h-4" /> ユーザーを追加
                </button>
              </div>
              {usersLoading ? <div className="text-sm text-slate-500">読み込み中...</div> : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
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
                            <select value={editingRole!.role} onChange={(e) => setEditingRole((prev) => prev ? { ...prev, role: e.target.value } : prev)} className="text-xs border border-slate-300 rounded px-2 py-1">
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button onClick={() => handleRoleChange(u.id, editingRole!.role)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">保存</button>
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
                            {u.id !== (session?.user as any)?.id && (
                              <>
                                {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                                  <button
                                    onClick={() => handleUnlockUser(u.id)}
                                    className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                                    title="アカウントのロックを解除"
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
        </div>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">ユーザーを追加</h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {userError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{userError}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              {[['名前', 'name', 'text'], ['メールアドレス', 'email', 'email'], ['初期パスワード', 'password', 'password']].map(([label, key, type]) => (
                <div key={String(key)}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{String(label)} *</label>
                  <input type={String(type)} value={(userForm as any)[String(key)]} onChange={(e) => setUserForm({ ...userForm, [String(key)]: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={String(type) === 'password' ? '8文字以上' : ''} />
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
