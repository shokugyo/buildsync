'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Building2, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [show2FA, setShow2FA] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        totpCode: show2FA ? totpCode : '',
        redirect: false,
      })

      if (result?.error) {
        if (result.error === 'ACCOUNT_LOCKED') {
          setError('アカウントがロックされています。30分後に再試行してください。')
        } else if (result.error === '2FA_REQUIRED') {
          setShow2FA(true)
          setError('')
        } else if (result.error === 'INVALID_TOTP') {
          setError('認証コードが正しくありません。もう一度お試しください。')
        } else {
          setError('メールアドレスまたはパスワードが正しくありません')
        }
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('ログイン中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 rounded-xl p-3 mb-4">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">BuildSync</h1>
          <p className="text-slate-500 text-sm mt-1">建設業向け工事管理システム</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="admin@buildsync.jp"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {show2FA && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                2段階認証コード
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 tracking-widest"
                  placeholder="000000"
                  maxLength={9}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                認証アプリのコード、またはバックアップコードを入力してください。
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors duration-200 mt-2"
          >
            {loading ? 'ログイン中...' : show2FA ? '確認' : 'ログイン'}
          </button>

          <div className="text-center mt-3">
            <a href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700">
              パスワードをお忘れの方
            </a>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center mb-3">デモ用アカウント</p>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="bg-slate-50 rounded p-2">
              <span className="font-medium">管理者: </span>admin@buildsync.jp / admin1234
            </div>
            <div className="bg-slate-50 rounded p-2">
              <span className="font-medium">現場監督: </span>tanaka@buildsync.jp / pass1234
            </div>
            <div className="bg-slate-50 rounded p-2">
              <span className="font-medium">事務担当: </span>sato@buildsync.jp / pass1234
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
