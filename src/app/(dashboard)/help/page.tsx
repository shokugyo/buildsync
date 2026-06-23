'use client'

import Header from '@/components/Header'
import { ChevronDown, ChevronUp, BookOpen, MessageSquare, Mail, ExternalLink, Keyboard, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'

const FAQ_SECTIONS = [
  {
    title: '案件管理',
    items: [
      {
        q: '案件を新規作成するにはどうすればいいですか？',
        a: 'サイドバーの「受発注管理」または「案件管理」から「案件作成」ボタンをクリックしてください。案件番号は自動採番されます。',
      },
      {
        q: '案件のステータスを変更するには？',
        a: '案件詳細ページを開き、ステータス欄をクリックして変更できます。ステータスは「契約前→着工前→進行中→完工（積算前）→積算完了」の順に進みます。',
      },
      {
        q: '案件を検索するには？',
        a: '案件一覧ページのキーワード検索欄に案件名・担当者・顧客名・案件管理番号・住所などを入力して「この条件で検索」ボタンをクリックしてください。',
      },
    ],
  },
  {
    title: '発注管理',
    items: [
      {
        q: '発注書を作成するには？',
        a: '案件詳細ページの「発注」タブ、または「受発注管理」画面から発注を作成できます。',
      },
      {
        q: '発注承認フローはどのように使いますか？',
        a: '発注担当者が「承認依頼」ボタンをクリックすると、管理者に通知が届きます。管理者は「発注承認」画面で承認・差戻しの操作ができます。',
      },
      {
        q: '発注書を印刷するには？',
        a: '発注一覧または案件詳細の発注タブから「発注書印刷」ボタンをクリックしてください。PDFとして印刷できます。',
      },
    ],
  },
  {
    title: '請求管理',
    items: [
      {
        q: '請求書を作成するには？',
        a: '「請求管理」画面から「請求を追加」ボタンをクリックして、案件・顧客・金額・請求日を入力してください。',
      },
      {
        q: '請求ステータスの種類は？',
        a: '未作成・作成済・確認中・承認済・送付済・入金待ち・入金済・差戻し・取消の9種類があります。',
      },
    ],
  },
  {
    title: '写真・図面管理',
    items: [
      {
        q: '写真をアップロードするには？',
        a: '「写真管理」画面でドラッグ&ドロップまたは「アップロード」ボタンから写真を追加できます。案件・工程・カテゴリで整理されます。',
      },
      {
        q: '図面を登録するには？',
        a: '「図面管理」画面からPDF・DXF・画像ファイルをアップロードできます。バージョン管理もできます。',
      },
    ],
  },
  {
    title: 'アナリティクス',
    items: [
      {
        q: 'アナリティクスで何が確認できますか？',
        a: '案件の進捗状況、物件情報の入力率、検査状況、原価・粗利の管理など、複数の視点からデータを分析できます。',
      },
      {
        q: '物件マップで案件が表示されません',
        a: '案件に緯度・経度（マップピン）が登録されていない場合は地図に表示されません。「物件情報登録」アナリティクスから未登録の案件を確認し、位置情報を登録してください。',
      },
    ],
  },
  {
    title: 'データ出力',
    items: [
      {
        q: 'Excelデータを出力するには？',
        a: '各管理画面の「Excel出力」ボタンからCSV形式でデータをダウンロードできます。Excelで開く場合は文字コードにUTF-8（BOM付き）を指定してください。',
      },
      {
        q: 'CSVインポートはできますか？',
        a: '顧客管理・協力会社管理の画面から「CSV取込」ボタンでデータを一括インポートできます。先頭行はヘッダー行として自動スキップされます。',
      },
    ],
  },
]

const KEYBOARD_SHORTCUTS = [
  { category: '全般', items: [
    { keys: ['Ctrl', 'K'], description: 'クイック検索を開く' },
    { keys: ['Esc'], description: 'モーダル・ダイアログを閉じる' },
    { keys: ['?'], description: 'このキーボードショートカット一覧を開く' },
  ]},
  { category: 'ナビゲーション', items: [
    { keys: ['G', 'D'], description: 'ダッシュボードへ移動' },
    { keys: ['G', 'P'], description: '案件管理へ移動' },
    { keys: ['G', 'S'], description: '工程管理へ移動' },
    { keys: ['G', 'T'], description: 'タスクへ移動' },
    { keys: ['G', 'C'], description: 'チャットへ移動' },
  ]},
  { category: 'リスト操作', items: [
    { keys: ['J'], description: '次の項目へ' },
    { keys: ['K'], description: '前の項目へ' },
    { keys: ['Enter'], description: '選択した項目を開く' },
    { keys: ['Ctrl', 'A'], description: 'すべて選択' },
  ]},
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        className="w-full flex items-start justify-between py-3 text-left gap-3"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-slate-800">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <p className="text-sm text-slate-600 pb-3 pr-4 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-xs font-mono text-slate-700 shadow-sm">
      {children}
    </kbd>
  )
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<'faq' | 'shortcuts' | 'contact'>('faq')
  const [contactForm, setContactForm] = useState({ subject: '', message: '', email: '' })
  const [contactSending, setContactSending] = useState(false)
  const [contactMsg, setContactMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      setContactMsg({ type: 'error', text: '件名と内容を入力してください' })
      return
    }
    setContactSending(true)
    setContactMsg(null)
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'サポート問い合わせ',
          email: contactForm.email || null,
          subject: contactForm.subject,
          message: contactForm.message,
          source: 'ヘルプページ',
          status: '未対応',
        }),
      })
      if (res.ok) {
        setContactMsg({ type: 'success', text: 'お問い合わせを送信しました。担当者より折り返しご連絡いたします。' })
        setContactForm({ subject: '', message: '', email: '' })
      } else {
        setContactMsg({ type: 'error', text: '送信に失敗しました。しばらく経ってから再度お試しください。' })
      }
    } catch {
      setContactMsg({ type: 'error', text: '送信に失敗しました。しばらく経ってから再度お試しください。' })
    } finally {
      setContactSending(false)
    }
  }

  return (
    <div>
      <Header title="ヘルプ" />
      <div className="p-6 max-w-4xl">
        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 flex items-start gap-4">
          <BookOpen className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">BUILDSYNCヘルプセンター</h2>
            <p className="text-sm text-slate-600">
              よくある質問と操作ガイドをご確認ください。解決しない場合はサポートまでお問い合わせください。
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">チャットサポート</p>
              <p className="text-xs text-slate-500 mt-0.5">平日 9:00〜18:00</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
            <Mail className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">メールサポート</p>
              <p className="text-xs text-slate-500 mt-0.5">support@buildsync.jp</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">操作マニュアル</p>
              <p className="text-xs text-slate-500 mt-0.5">PDFでダウンロード</p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'faq'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            よくある質問
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'shortcuts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            キーボードショートカット
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'contact'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            お問い合わせ
          </button>
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            {FAQ_SECTIONS.map(section => (
              <div key={section.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5">
                  <h4 className="text-sm font-semibold text-slate-700">{section.title}</h4>
                </div>
                <div className="px-4">
                  {section.items.map((item, i) => (
                    <FaqItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Keyboard Shortcuts Tab */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">キーボードショートカットを使用すると、より素早く操作できます。</p>
            {KEYBOARD_SHORTCUTS.map(section => (
              <div key={section.category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5">
                  <h4 className="text-sm font-semibold text-slate-700">{section.category}</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-700">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, ki) => (
                          <span key={ki} className="flex items-center gap-1">
                            <Kbd>{key}</Kbd>
                            {ki < item.keys.length - 1 && <span className="text-xs text-slate-400">+</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">サポートへのお問い合わせ</h3>
            <p className="text-sm text-slate-500 mb-6">
              ご不明な点やご要望がございましたら、下記フォームよりお問い合わせください。
              平日1〜2営業日以内にご回答いたします。
            </p>

            {contactMsg && (
              <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-sm ${
                contactMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {contactMsg.type === 'success'
                  ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {contactMsg.text}
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  返信先メールアドレス <span className="text-slate-400 font-normal">（任意）</span>
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="example@company.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={e => setContactForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="例：写真のアップロードができない"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  お問い合わせ内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                  rows={6}
                  placeholder="問題の詳細、発生状況、エラーメッセージなどをご記入ください"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={contactSending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                {contactSending ? '送信中...' : '送信する'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
