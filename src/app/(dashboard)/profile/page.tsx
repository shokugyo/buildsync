'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Link from 'next/link'
import { User, Lock, Save, CheckCircle, AlertCircle, Bell } from 'lucide-react'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', department: '', showAvatar: false })
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Load full profile including phone and department from API
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfileForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
          showAvatar: data.showAvatar || false,
        })
        setAvatarPath(data.avatarPath || null)
      })
      .catch(() => {
        if (session?.user) {
          const u = session.user as any
          setProfileForm({
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            department: u.department || '',
            showAvatar: u.showAvatar || false,
          })
          setAvatarPath(u.avatarPath || null)
        }
      })
  }, [session])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setAvatarPath(data.avatarPath)
      }
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.name.trim()) {
      setProfileMsg({ type: 'error', text: '氏名を入力してください' })
      return
    }
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
          department: profileForm.department,
          showAvatar: profileForm.showAvatar,
        }),
      })
      if (res.ok) {
        await update({ name: profileForm.name, email: profileForm.email, showAvatar: profileForm.showAvatar })
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

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMsg({ type: 'error', text: '現在のパスワードと新しいパスワードを入力してください' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: '新しいパスワードが一致しません' })
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'パスワードは6文字以上で設定してください' })
      return
    }
    setPasswordSaving(true)
    setPasswordMsg(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      if (res.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setPasswordMsg({ type: 'success', text: 'パスワードを変更しました' })
      } else {
        const data = await res.json()
        setPasswordMsg({ type: 'error', text: data.error === 'Current password is incorrect' ? '現在のパスワードが正しくありません' : (data.error || '変更に失敗しました') })
      }
    } catch {
      setPasswordMsg({ type: 'error', text: '変更に失敗しました' })
    } finally {
      setPasswordSaving(false)
    }
  }

  const user = session?.user as any

  return (
    <div>
      <Header title="個人設定" />
      <div className="p-6 max-w-2xl space-y-6">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex flex-col items-center gap-2">
              {avatarPath && profileForm.showAvatar ? (
                <img src={avatarPath} className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" alt="avatar" />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">{user?.name?.[0] || '?'}</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {avatarUploading ? 'アップロード中...' : 'アバターを変更'}
              </button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{user?.name}</h2>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{user?.role}</span>
            </div>
          </div>

          {/* Profile Form */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <User className="w-4 h-4" /> プロフィール編集
            </h3>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">氏名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="090-1234-5678"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">部署</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={e => setProfileForm(f => ({ ...f, department: e.target.value }))}
                    placeholder="例：工事部"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showAvatar"
                  checked={profileForm.showAvatar}
                  onChange={e => setProfileForm(f => ({ ...f, showAvatar: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="showAvatar" className="text-sm text-slate-700">プロフィール画像を表示する</label>
              </div>
              {profileMsg && (
                <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {profileMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {profileMsg.text}
                </div>
              )}
              <button
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {profileSaving ? '保存中...' : 'プロフィールを保存'}
              </button>
            </form>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
            <Lock className="w-4 h-4" /> パスワード変更
          </h3>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">現在のパスワード</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="現在のパスワード"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">新しいパスワード</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6文字以上"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">新しいパスワード（確認）</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="確認のため再入力"
              />
            </div>
            {passwordMsg && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {passwordMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {passwordMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {passwordSaving ? '変更中...' : 'パスワードを変更'}
            </button>
          </form>
        </div>

        {/* Notification Preferences Quick Link */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">通知設定</p>
                <p className="text-xs text-slate-500">メール通知やアプリ内通知の設定</p>
              </div>
            </div>
            <Link
              href="/settings/notifications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              設定する
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
