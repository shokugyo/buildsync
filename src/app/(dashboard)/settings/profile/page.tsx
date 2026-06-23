'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Save, Lock, CheckCircle, AlertCircle } from 'lucide-react'

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

export default function ProfileSettingsPage() {
  const { data: session, update } = useSession()
  const pathname = usePathname()

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', department: '', avatarUrl: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setProfileForm({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            department: data.department || '',
            avatarUrl: data.avatarPath || '',
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.name.trim()) {
      setProfileMsg({ type: 'error', text: '氏名を入力してください' })
      return
    }
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          department: profileForm.department,
          avatarPath: profileForm.avatarUrl || undefined,
        }),
      })
      if (res.ok) {
        await update({ name: profileForm.name })
        setProfileMsg({ type: 'success', text: 'プロフィールを更新しました' })
      } else {
        const data = await res.json()
        setProfileMsg({ type: 'error', text: data.error || '更新に失敗しました' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: '更新に失敗しました' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePwSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwMsg({ type: 'error', text: '現在のパスワードと新しいパスワードを入力してください' })
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: '新しいパスワードが一致しません' })
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'パスワードは6文字以上で設定してください' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      })
      if (res.ok) {
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setPwMsg({ type: 'success', text: 'パスワードを変更しました' })
      } else {
        const data = await res.json()
        setPwMsg({ type: 'error', text: data.error || '変更に失敗しました' })
      }
    } catch {
      setPwMsg({ type: 'error', text: '変更に失敗しました' })
    } finally {
      setPwSaving(false)
    }
  }

  const user = session?.user as any
  const initials = profileForm.name ? profileForm.name[0] : (user?.name?.[0] || '?')

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    pathname === item.href ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">プロフィール設定</h2>

          {/* Avatar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-5">
            <div className="flex items-center gap-5 mb-6">
              {profileForm.avatarUrl ? (
                <img
                  src={profileForm.avatarUrl}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-bold text-white">{initials}</span>
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{profileForm.name || user?.name}</p>
                <p className="text-sm text-slate-500">{profileForm.email || user?.email}</p>
                {user?.role && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{user.role}</span>
                )}
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">氏名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={profileForm.email}
                  readOnly
                  className="w-full max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">メールアドレスはここでは変更できません</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="090-0000-0000"
                  className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">部署</label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="例：工事部・営業部"
                  className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">アバター画像URL</label>
                <input
                  type="url"
                  value={profileForm.avatarUrl}
                  onChange={(e) => setProfileForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">空欄の場合は氏名の頭文字が表示されます</p>
              </div>
              {profileMsg && (
                <div className={`flex items-center gap-2 text-sm p-3 rounded-lg max-w-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {profileMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  {profileMsg.text}
                </div>
              )}
              <button
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {profileSaving ? '保存中...' : '保存する'}
              </button>
            </form>
          </div>

          {/* Password Change */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <Lock className="w-4 h-4" /> パスワード変更
            </h3>
            <form onSubmit={handlePwSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">現在のパスワード</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="現在のパスワード"
                  className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新しいパスワード</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="6文字以上"
                  className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新しいパスワード（確認）</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="確認のため再入力"
                  className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showPw}
                  onChange={(e) => setShowPw(e.target.checked)}
                  className="rounded border-slate-300"
                />
                パスワードを表示
              </label>
              {pwMsg && (
                <div className={`flex items-center gap-2 text-sm p-3 rounded-lg max-w-sm ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {pwMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  {pwMsg.text}
                </div>
              )}
              <button
                type="submit"
                disabled={pwSaving}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Lock className="w-4 h-4" />
                {pwSaving ? '変更中...' : 'パスワードを変更'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
