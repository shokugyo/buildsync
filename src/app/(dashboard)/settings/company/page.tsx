'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
]

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

function RequiredBadge() {
  return <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-medium ml-1.5">必須</span>
}

function FieldRow({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-3 pr-6 text-sm text-slate-600 font-medium whitespace-nowrap align-top pt-3.5 w-52">
        {label}
        {required && <RequiredBadge />}
        {optional && <span className="text-xs text-slate-400 ml-1.5">任意</span>}
      </td>
      <td className="py-3">{children}</td>
    </tr>
  )
}

function ImagePreview({ url, label }: { url: string; label: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={label}
        className="w-20 h-20 object-contain border border-slate-200 rounded bg-slate-50"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div className="w-20 h-20 border border-slate-200 rounded flex flex-col items-center justify-center bg-slate-50">
      <Building2 className="w-8 h-8 text-slate-300" />
      <span className="text-xs text-slate-400 mt-1">NO IMAGE</span>
    </div>
  )
}

export default function CompanySettingsPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === '管理者'

  const [companyId, setCompanyId] = useState('')
  const [form, setForm] = useState({
    name: '', kanaName: '', url: '', postalCode: '', prefecture: '',
    address: '', address1: '', address2: '', representativeName: '', phone: '', email: '',
    registrationNumber: '',
    logoUrl: '', sealUrl: '',
    bankName: '', bankBranch: '', bankAccountType: '', bankAccountNumber: '', bankAccountName: '',
    defaultPaymentTerms: 30,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(data => {
      if (data && !data.error) {
        setCompanyId(data.id || '')
        setForm({
          name: data.name || '',
          kanaName: data.kanaName || '',
          url: data.url || '',
          postalCode: data.postalCode || '',
          prefecture: data.prefecture || '',
          address: data.address || '',
          address1: data.address1 || '',
          address2: data.address2 || '',
          representativeName: data.representativeName || '',
          phone: data.phone || '',
          email: data.email || '',
          registrationNumber: data.registrationNumber || '',
          logoUrl: data.logoUrl || '',
          sealUrl: data.sealUrl || '',
          bankName: data.bankName || '',
          bankBranch: data.bankBranch || '',
          bankAccountType: data.bankAccountType || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankAccountName: data.bankAccountName || '',
          defaultPaymentTerms: data.defaultPaymentTerms ?? 30,
        })
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const err = await res.json()
        setError(err.error || '更新に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const displayId = companyId ? String(200000 + parseInt(companyId.slice(-4), 16) % 100000) : '-'

  const inputCls = (disabled: boolean) =>
    `w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'bg-slate-50' : ''}`

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
                    item.href === '/settings/company' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">自社情報</h2>
          <p className="text-sm text-slate-400 mb-4">#{displayId}</p>

          {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">自社情報を更新しました</div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* 基本情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">基本情報</h3>
              </div>
              <table className="w-full">
                <tbody>
                  <FieldRow label="会社ID">
                    <span className="text-sm text-slate-400">#{displayId}</span>
                  </FieldRow>
                  <FieldRow label="会社名" required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      required
                      disabled={!isAdmin}
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="会社名（ふりがな）" optional>
                    <input
                      type="text"
                      value={form.kanaName}
                      onChange={(e) => set('kanaName', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="かぶしきかいしゃ..."
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="URL" optional>
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => set('url', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="http://example.com/"
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="郵便番号" optional>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(e) => set('postalCode', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="000-0000"
                      className={`${inputCls(!isAdmin)} max-w-[180px]`}
                    />
                  </FieldRow>
                  <FieldRow label="都道府県" required>
                    <select
                      value={form.prefecture}
                      onChange={(e) => set('prefecture', e.target.value)}
                      disabled={!isAdmin}
                      className={`max-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${!isAdmin ? 'bg-slate-50' : ''}`}
                    >
                      <option value="">選択してください</option>
                      {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="住所1" required>
                    <input
                      type="text"
                      value={form.address1 || form.address}
                      onChange={(e) => setForm(prev => ({ ...prev, address1: e.target.value, address: e.target.value }))}
                      disabled={!isAdmin}
                      placeholder="市区町村・番地"
                      className={inputCls(!isAdmin)}
                    />
                  </FieldRow>
                  <FieldRow label="住所2" optional>
                    <input
                      type="text"
                      value={form.address2}
                      onChange={(e) => set('address2', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="マンション名 103"
                      className={inputCls(!isAdmin)}
                    />
                  </FieldRow>
                  <FieldRow label="責任者氏名" optional>
                    <input
                      type="text"
                      value={form.representativeName}
                      onChange={(e) => set('representativeName', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="担当者名"
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="電話番号" required>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="03-0000-0000"
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="メールアドレス" optional>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="name@email.com"
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="適格請求書発行事業者番号" optional>
                    <div>
                      <input
                        type="text"
                        value={form.registrationNumber}
                        onChange={(e) => set('registrationNumber', e.target.value)}
                        disabled={!isAdmin}
                        className={`${inputCls(!isAdmin)} max-w-sm`}
                        placeholder="T1234567890123"
                        maxLength={14}
                      />
                      <p className="text-xs text-slate-400 mt-1">インボイス制度対応：T＋13桁の登録番号</p>
                    </div>
                  </FieldRow>
                </tbody>
              </table>
            </div>

            {/* ロゴ・印鑑 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">ロゴ・印鑑</h3>
              </div>
              <table className="w-full">
                <tbody>
                  <FieldRow label="会社ロゴURL" optional>
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={form.logoUrl}
                        onChange={(e) => set('logoUrl', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="https://example.com/logo.png"
                        className={inputCls(!isAdmin)}
                      />
                      <ImagePreview url={form.logoUrl} label="会社ロゴ" />
                    </div>
                  </FieldRow>
                  <FieldRow label="会社印鑑URL" optional>
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={form.sealUrl}
                        onChange={(e) => set('sealUrl', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="https://example.com/seal.png"
                        className={inputCls(!isAdmin)}
                      />
                      <p className="text-xs text-slate-400">請求書・見積書などに表示される印鑑画像のURL</p>
                      <ImagePreview url={form.sealUrl} label="会社印鑑" />
                    </div>
                  </FieldRow>
                </tbody>
              </table>
            </div>

            {/* 銀行口座情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">銀行口座情報（請求書振込先）</h3>
              </div>
              <table className="w-full">
                <tbody>
                  <FieldRow label="銀行名" optional>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(e) => set('bankName', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="○○銀行"
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="支店名" optional>
                    <input
                      type="text"
                      value={form.bankBranch}
                      onChange={(e) => set('bankBranch', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="○○支店"
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                  <FieldRow label="口座種別" optional>
                    <select
                      value={form.bankAccountType}
                      onChange={(e) => set('bankAccountType', e.target.value)}
                      disabled={!isAdmin}
                      className={`max-w-[180px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${!isAdmin ? 'bg-slate-50' : ''}`}
                    >
                      <option value="">選択</option>
                      <option value="普通">普通</option>
                      <option value="当座">当座</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="口座番号" optional>
                    <input
                      type="text"
                      value={form.bankAccountNumber}
                      onChange={(e) => set('bankAccountNumber', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="1234567"
                      className={`${inputCls(!isAdmin)} max-w-[200px]`}
                    />
                  </FieldRow>
                  <FieldRow label="口座名義" optional>
                    <input
                      type="text"
                      value={form.bankAccountName}
                      onChange={(e) => set('bankAccountName', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="カブシキカイシャ○○"
                      className={`${inputCls(!isAdmin)} max-w-sm`}
                    />
                  </FieldRow>
                </tbody>
              </table>
            </div>

            {/* 請求書設定 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-5">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">請求書設定</h3>
              </div>
              <table className="w-full">
                <tbody>
                  <FieldRow label="支払期限（デフォルト）" optional>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={form.defaultPaymentTerms}
                        onChange={(e) => set('defaultPaymentTerms', Number(e.target.value))}
                        disabled={!isAdmin}
                        className={`${inputCls(!isAdmin)} max-w-[100px]`}
                      />
                      <span className="text-sm text-slate-600">日後</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">請求書作成時に自動で設定される支払期限の日数</p>
                  </FieldRow>
                </tbody>
              </table>
            </div>

            {isAdmin && (
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white px-10 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? '保存中...' : '保存する'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
