'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Shield, CheckCircle, XCircle, Copy, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react'

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

interface IpRestriction {
  id: string
  cidr: string
  description: string | null
  enabled: boolean
  createdAt: string
}

export default function SecuritySettingsPage() {
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null)
  const [setupStep, setSetupStep] = useState<0 | 1 | 2>(0)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [otpauthUrl, setOtpauthUrl] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyError, setVerifyError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [disableModal, setDisableModal] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)

  const [ipRestrictions, setIpRestrictions] = useState<IpRestriction[]>([])
  const [ipLoading, setIpLoading] = useState(true)
  const [newCidr, setNewCidr] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    fetch('/api/settings/2fa/status')
      .then((r) => r.json())
      .then((d) => setTotpEnabled(d.totpEnabled ?? false))
      .catch(() => setTotpEnabled(false))
  }, [])

  useEffect(() => {
    fetch('/api/settings/ip-restrictions')
      .then((r) => r.json())
      .then((d) => setIpRestrictions(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setIpLoading(false))
  }, [])

  async function startSetup() {
    const res = await fetch('/api/settings/2fa/setup', { method: 'POST' })
    const data = await res.json()
    setSecret(data.secret)
    setOtpauthUrl(data.otpauthUrl)
    setQrDataUrl(data.qrDataUrl)
    setSetupStep(1)
  }

  async function verifyAndEnable() {
    setVerifyError('')
    setVerifyLoading(true)
    try {
      const res = await fetch('/api/settings/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode, secret }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVerifyError(data.error || 'エラーが発生しました')
        return
      }
      setBackupCodes(data.backupCodes)
      setTotpEnabled(true)
      setSetupStep(2)
    } finally {
      setVerifyLoading(false)
    }
  }

  async function disable2fa() {
    setDisableError('')
    setDisableLoading(true)
    try {
      const res = await fetch('/api/settings/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDisableError(data.error || 'エラーが発生しました')
        return
      }
      setTotpEnabled(false)
      setDisableModal(false)
      setDisablePassword('')
      setSetupStep(0)
    } finally {
      setDisableLoading(false)
    }
  }

  async function addIpRestriction() {
    setAddError('')
    if (!newCidr.trim()) { setAddError('CIDRを入力してください'); return }
    setAddLoading(true)
    try {
      const res = await fetch('/api/settings/ip-restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cidr: newCidr.trim(), description: newDesc.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error || 'エラーが発生しました')
        return
      }
      setIpRestrictions((prev) => [...prev, data])
      setNewCidr('')
      setNewDesc('')
    } finally {
      setAddLoading(false)
    }
  }

  async function toggleIpRestriction(id: string, enabled: boolean) {
    const res = await fetch(`/api/settings/ip-restrictions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    })
    if (res.ok) {
      const updated = await res.json()
      setIpRestrictions((prev) => prev.map((r) => (r.id === id ? updated : r)))
    }
  }

  async function deleteIpRestriction(id: string) {
    if (!confirm('このIPアドレス制限を削除しますか？')) return
    const res = await fetch(`/api/settings/ip-restrictions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setIpRestrictions((prev) => prev.filter((r) => r.id !== id))
    }
  }

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
                    item.href === '/settings/security'
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

        <div className="flex-1 p-6 max-w-2xl space-y-6">
          {/* 2FA Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">二要素認証（TOTP）</h2>
              {totpEnabled === true && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" /> 有効
                </span>
              )}
              {totpEnabled === false && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3.5 h-3.5" /> 無効
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mb-5 pl-12">
              認証アプリ（Google Authenticator等）を使用して、ログイン時に6桁のコードを要求します。
            </p>

            {totpEnabled === false && setupStep === 0 && (
              <div className="pl-12">
                <button
                  onClick={startSetup}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  二要素認証を設定する
                </button>
              </div>
            )}

            {setupStep === 1 && (
              <div className="pl-12 space-y-4">
                <p className="text-sm text-slate-700 font-medium">ステップ1: QRコードをスキャン</p>
                <p className="text-sm text-slate-500">
                  Google AuthenticatorやAuthyなどの認証アプリでQRコードをスキャンしてください。
                </p>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 border border-slate-200 rounded-lg" />
                ) : null}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">QRコードが読み取れない場合は手動入力:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-slate-700 break-all">{secret}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(secret)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 font-medium">ステップ2: 確認コードを入力</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6桁のコード"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center font-mono"
                  />
                  {verifyError && <p className="text-xs text-red-500">{verifyError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={verifyAndEnable}
                      disabled={verifyCode.length !== 6 || verifyLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {verifyLoading ? '確認中...' : '確認して有効化'}
                    </button>
                    <button
                      onClick={() => { setSetupStep(0); setVerifyCode(''); setVerifyError('') }}
                      className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 2 && (
              <div className="pl-12 space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <p className="text-sm font-medium">二要素認証が有効になりました</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">バックアップコード（大切に保管してください）</p>
                  <p className="text-xs text-amber-600 mb-3">
                    認証アプリが使えなくなった場合にこれらのコードでログインできます。各コードは1回のみ使用可能です。
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {backupCodes.map((code) => (
                      <code key={code} className="text-xs font-mono bg-white border border-amber-200 rounded px-2 py-1 text-slate-700">
                        {code}
                      </code>
                    ))}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                    className="mt-2 flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
                  >
                    <Copy className="w-3.5 h-3.5" /> コードをコピー
                  </button>
                </div>
              </div>
            )}

            {totpEnabled === true && setupStep !== 2 && (
              <div className="pl-12">
                <button
                  onClick={() => setDisableModal(true)}
                  className="text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors"
                >
                  二要素認証を無効にする
                </button>
              </div>
            )}
          </div>

          {/* IP Restriction Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">IPアドレス制限</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 pl-12">
              許可するIPアドレス（CIDR形式）を設定します。制限が有効な場合、対象外のIPからのアクセスは拒否されます。
            </p>

            <div className="pl-12 space-y-4">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  IPアドレス制限を設定すると、許可されていないIPからのAPIアクセスが拒否されます。
                  自分のIPを除外しないとロックアウトされる可能性があります。
                  CIDR形式で指定してください（例: 192.168.1.0/24, 203.0.113.5/32）
                </p>
              </div>

              {ipLoading ? (
                <p className="text-sm text-slate-400">読み込み中...</p>
              ) : ipRestrictions.length === 0 ? (
                <p className="text-sm text-slate-400">IPアドレス制限は設定されていません（全てのIPを許可）</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">CIDR</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">説明</th>
                        <th className="px-3 py-2 text-xs font-medium text-slate-500">状態</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ipRestrictions.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs text-slate-800">{r.cidr}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{r.description || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => toggleIpRestriction(r.id, r.enabled)} className="inline-flex items-center">
                              {r.enabled ? (
                                <ToggleRight className="w-5 h-5 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => deleteIpRestriction(r.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-700">IPアドレス制限を追加</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="192.168.1.0/24"
                    value={newCidr}
                    onChange={(e) => setNewCidr(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1.5 text-sm font-mono flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="説明（任意）"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addIpRestriction}
                    disabled={addLoading}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    追加
                  </button>
                </div>
                {addError && <p className="text-xs text-red-500">{addError}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disable 2FA Modal */}
      {disableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-2">二要素認証を無効にする</h3>
            <p className="text-sm text-slate-500 mb-4">
              確認のため、現在のパスワードを入力してください。
            </p>
            <input
              type="password"
              placeholder="パスワード"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {disableError && <p className="text-xs text-red-500 mb-2">{disableError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDisableModal(false); setDisablePassword(''); setDisableError('') }}
                className="text-sm text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={disable2fa}
                disabled={!disablePassword || disableLoading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {disableLoading ? '処理中...' : '無効にする'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
