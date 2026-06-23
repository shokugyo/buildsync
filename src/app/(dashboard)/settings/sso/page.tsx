'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, ExternalLink, Copy, Check, Info } from 'lucide-react'

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
  { label: '外部連携', href: '/settings/integrations' },
  { label: 'SSO設定', href: '/settings/sso' },
  { label: 'データエクスポート', href: '/settings/data-export' },
  { label: 'バッチ処理', href: '/settings/batch' },
  { label: '言語設定', href: '/settings/language' },
]

const SSO_PROVIDERS = [
  { id: 'azure-ad', name: 'Microsoft Azure AD', logo: '🔷', docs: 'https://learn.microsoft.com/ja-jp/azure/active-directory/saas-apps/' },
  { id: 'google', name: 'Google Workspace', logo: '🔴', docs: 'https://support.google.com/a/answer/6087519' },
  { id: 'okta', name: 'Okta', logo: '🔵', docs: 'https://developer.okta.com/docs/guides/build-sso-integration/saml2/main/' },
  { id: 'onelogin', name: 'OneLogin', logo: '🟢', docs: 'https://onelogin.com' },
]

export default function SsoPage() {
  const pathname = usePathname()
  const [selectedProvider, setSelectedProvider] = useState('')
  const [form, setForm] = useState({ entityId: '', ssoUrl: '', certificate: '' })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'
  const spEntityId = `${baseUrl}/api/auth/sso`
  const acsUrl = `${baseUrl}/api/auth/sso/callback`
  const metadataUrl = `${baseUrl}/api/auth/sso?action=metadata`

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSave = async () => {
    if (!form.entityId || !form.ssoUrl) { alert('Entity IDとSSO URLは必須です'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'configure', provider: selectedProvider, ...form }),
      })
      const data = await res.json()
      setResult(data.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map(item => (
              <li key={item.href}>
                <Link href={item.href} className={`block px-2 py-1.5 rounded text-sm transition-colors ${pathname === item.href ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'}`}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              SSO / SAML 2.0設定
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">企業のIdP（Identity Provider）と連携してシングルサインオンを実現します</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-800 flex gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">IdPへの登録情報</p>
              <p>以下の情報をIdP管理画面に登録してください。</p>
            </div>
          </div>

          {/* SP情報 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 className="font-semibold text-slate-900 mb-4">サービスプロバイダー（SP）情報</h3>
            {[
              { label: 'Entity ID / Audience URI', value: spEntityId },
              { label: 'ACS URL (Assertion Consumer Service)', value: acsUrl },
              { label: 'SPメタデータURL', value: metadataUrl },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <code className="text-xs font-mono text-slate-800 bg-slate-50 px-2 py-1 rounded block">{value}</code>
                </div>
                <button onClick={() => copyText(value)} className="text-slate-400 hover:text-slate-600 p-1">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>

          {/* IdP設定 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 className="font-semibold text-slate-900 mb-4">IdP（Identity Provider）設定</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">IdPプロバイダー</label>
              <div className="grid grid-cols-2 gap-2">
                {SSO_PROVIDERS.map(p => (
                  <label key={p.id} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors text-sm ${selectedProvider === p.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="provider" value={p.id} checked={selectedProvider === p.id} onChange={() => setSelectedProvider(p.id)} className="sr-only" />
                    <span>{p.logo}</span>
                    <span className="text-slate-700">{p.name}</span>
                    <a href={p.docs} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ml-auto text-slate-400 hover:text-blue-500">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'IdP Entity ID', key: 'entityId', placeholder: 'https://idp.example.com/metadata' },
                { label: 'IdP SSO URL', key: 'ssoUrl', placeholder: 'https://idp.example.com/sso/saml' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={(form as any)[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IdP証明書（X.509）</label>
                <textarea
                  value={form.certificate}
                  onChange={e => setForm({ ...form, certificate: e.target.value })}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {result && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{result}</div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? '保存中...' : 'SSO設定を保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
