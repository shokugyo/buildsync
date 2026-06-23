'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Check } from 'lucide-react'
import { getLanguage, setLanguage, translations, type Language, type TranslationKey } from '@/lib/i18n'

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

const LANGUAGES: { value: Language; label: string; nativeLabel: string }[] = [
  { value: 'ja', label: '日本語', nativeLabel: '日本語' },
  { value: 'en', label: 'English', nativeLabel: 'English' },
]

const PREVIEW_KEYS: TranslationKey[] = [
  'nav.dashboard',
  'nav.projects',
  'nav.orders',
  'nav.invoices',
  'common.save',
  'common.cancel',
  'common.delete',
  'common.edit',
  'common.add',
  'common.search',
  'common.loading',
  'common.noData',
]

export default function LanguagePage() {
  const pathname = usePathname()
  const [selectedLang, setSelectedLang] = useState<Language>('ja')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSelectedLang(getLanguage())
  }, [])

  const handleSave = () => {
    setLanguage(selectedLang)
    setSaved(true)
    setTimeout(() => {
      window.location.reload()
    }, 800)
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

        <div className="flex-1 p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              言語設定
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">アプリケーションの表示言語を選択します</p>
          </div>

          {/* Language selection */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 className="font-semibold text-slate-900 mb-4">表示言語</h3>
            <div className="space-y-2">
              {LANGUAGES.map(lang => (
                <label
                  key={lang.value}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedLang === lang.value
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={lang.value}
                    checked={selectedLang === lang.value}
                    onChange={() => setSelectedLang(lang.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedLang === lang.value ? 'border-blue-600' : 'border-slate-300'
                  }`}>
                    {selectedLang === lang.value && (
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <span className="font-medium text-slate-800">{lang.label}</span>
                  {lang.value !== 'ja' && (
                    <span className="text-sm text-slate-500">({lang.nativeLabel})</span>
                  )}
                </label>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saved}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    保存しました（再読み込み中...）
                  </>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>

          {/* Translation preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">翻訳プレビュー</h3>
            <p className="text-sm text-slate-500 mb-3">選択中の言語での表示例です</p>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 text-slate-600 font-medium w-1/3">キー</th>
                    <th className="text-left px-4 py-2 text-slate-600 font-medium w-1/3">日本語</th>
                    <th className="text-left px-4 py-2 text-slate-600 font-medium w-1/3">English</th>
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_KEYS.map((key, i) => (
                    <tr
                      key={key}
                      className={`border-b border-slate-100 last:border-0 ${
                        i % 2 === 0 ? '' : 'bg-slate-50/50'
                      } ${selectedLang === 'ja' ? 'first-col-highlight' : ''}`}
                    >
                      <td className="px-4 py-2 font-mono text-xs text-slate-400">{key}</td>
                      <td className={`px-4 py-2 ${selectedLang === 'ja' ? 'font-semibold text-blue-700' : 'text-slate-700'}`}>
                        {translations.ja[key]}
                      </td>
                      <td className={`px-4 py-2 ${selectedLang === 'en' ? 'font-semibold text-blue-700' : 'text-slate-700'}`}>
                        {translations.en[key]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
