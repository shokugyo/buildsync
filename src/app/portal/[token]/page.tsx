'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

function formatDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

const STATUS_COLOR: Record<string, string> = {
  '引合': 'bg-slate-100 text-slate-700',
  '受注': 'bg-blue-100 text-blue-700',
  '施工中': 'bg-yellow-100 text-yellow-700',
  '完了': 'bg-green-100 text-green-700',
  '中止': 'bg-red-100 text-red-700',
}

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'expired' | 'ok'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; caption: string } | null>(null)

  const closeLightbox = useCallback(() => setLightboxPhoto(null), [])

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(async (res) => {
        if (res.status === 410) { setStatus('expired'); return }
        if (!res.ok) { setStatus('error'); setErrorMsg('リンクが無効です'); return }
        const json = await res.json()
        setData(json)
        setStatus('ok')
      })
      .catch(() => { setStatus('error'); setErrorMsg('読み込みに失敗しました') })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')
    setSending(true)
    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      })
      if (!res.ok) {
        const j = await res.json()
        setSendError(j.error || '送信に失敗しました')
      } else {
        setSent(true)
        setSubject('')
        setMessage('')
      }
    } catch {
      setSendError('送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <p className="text-2xl font-bold text-slate-700 mb-2">リンクの有効期限が切れました</p>
          <p className="text-slate-500">担当者にお問い合わせください。</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <p className="text-xl font-bold text-slate-700 mb-2">{errorMsg}</p>
        </div>
      </div>
    )
  }

  const { project: p, progress, schedules, photos, defects } = data

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-slate-900">BuildSync 施主ポータル</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Project Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">{p.projectNumber}</p>
              <h1 className="text-xl font-bold text-slate-900">{p.name}</h1>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[p.status] ?? 'bg-slate-100 text-slate-700'}`}>
              {p.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p className="text-xs text-slate-400">現場住所</p>
              <p className="text-slate-700">{p.address || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">現場監督</p>
              <p className="text-slate-700">{p.manager?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">着工予定</p>
              <p className="text-slate-700">{formatDate(p.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">完工予定</p>
              <p className="text-slate-700">{formatDate(p.endDate)}</p>
            </div>
            {p.deliveryDate && (
              <div>
                <p className="text-xs text-slate-400">引渡予定</p>
                <p className="text-slate-700">{formatDate(p.deliveryDate)}</p>
              </div>
            )}
            {p.updatedAt && (
              <div>
                <p className="text-xs text-slate-400">最終更新</p>
                <p className="text-slate-700">{formatDate(p.updatedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {progress.total > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">工程進捗</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-slate-100 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 w-12 text-right">{progress.percentage}%</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{progress.completed} / {progress.total} 工程完了</p>
            <div className="space-y-2">
              {schedules.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === '完了' ? 'bg-green-500' : s.status === '作業中' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <span className="flex-1 text-slate-700">{s.name}</span>
                  <span className="text-xs text-slate-400">{formatDate(s.startDate)} 〜 {formatDate(s.endDate)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${s.status === '完了' ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">現場写真（最新）</h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((ph: any) => (
                <div key={ph.id} className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                  {ph.filePath ? (
                    <img
                      src={ph.filePath.startsWith('http') ? ph.filePath : `/${ph.filePath}`}
                      alt={ph.comment || '現場写真'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No image</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Defect Summary */}
        {defects && defects.total > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">是正・指摘事項</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-slate-800">{defects.total}</p>
                <p className="text-xs text-slate-500 mt-1">合計</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-600">{defects.open}</p>
                <p className="text-xs text-amber-500 mt-1">対応中</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">{defects.resolved}</p>
                <p className="text-xs text-green-500 mt-1">対応済</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {p.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">備考・特記事項</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.notes}</p>
          </div>
        )}

        {/* Contact Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">お問い合わせ</h2>
          {sent ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">お問い合わせを受け付けました</p>
              <p className="text-xs text-slate-400 mt-1">担当者より折り返しご連絡いたします</p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-xs text-blue-600 hover:underline"
              >
                新しいお問い合わせを送る
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">件名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                  placeholder="例：工事の進捗について"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">メッセージ <span className="text-red-500">*</span></label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="ご質問・ご要望をご記入ください"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {sendError && <p className="text-xs text-red-500">{sendError}</p>}
              <button
                type="submit"
                disabled={sending || !subject || !message}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? '送信中...' : '送信する'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">BuildSync — 建設業向けクラウド管理プラットフォーム</p>
      </main>
    </div>
  )
}
