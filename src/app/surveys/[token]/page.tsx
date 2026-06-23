'use client'

import { useState, useEffect } from 'react'
import { Star, CheckCircle } from 'lucide-react'

interface SurveyData {
  id: string
  status: string
  respondedAt: string | null
  project: { name: string }
  customer: { name: string } | null
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              s <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function PublicSurveyPage({ params }: { params: { token: string } }) {
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [overallScore, setOverallScore] = useState(0)
  const [qualityScore, setQualityScore] = useState(0)
  const [scheduleScore, setScheduleScore] = useState(0)
  const [communicationScore, setCommunicationScore] = useState(0)
  const [comments, setComments] = useState('')

  useEffect(() => {
    fetch(`/api/public/surveys/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); setLoading(false); return }
        const data = await res.json()
        setSurvey(data)
        if (data.respondedAt) setSubmitted(true)
        setLoading(false)
      })
  }, [params.token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overallScore || !qualityScore || !scheduleScore || !communicationScore) {
      alert('すべての評価項目を選択してください')
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/public/surveys/${params.token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overallScore, qualityScore, scheduleScore, communicationScore, comments }),
    })
    if (res.ok) {
      setSubmitted(true)
    } else {
      const err = await res.json()
      alert(err.error || '送信に失敗しました')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-700">アンケートが見つかりません</p>
          <p className="text-slate-500 mt-2">URLをご確認ください</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">ご回答ありがとうございました</h2>
          <p className="text-slate-600">
            貴重なご意見をいただき、誠にありがとうございます。
            今後のサービス向上に活かしてまいります。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-blue-600 text-white rounded-t-2xl p-6">
          <h1 className="text-xl font-bold">顧客満足度アンケート</h1>
          <p className="text-blue-100 text-sm mt-1">{survey?.project.name}</p>
        </div>
        <div className="bg-white rounded-b-2xl shadow-lg p-6">
          <p className="text-slate-600 text-sm mb-6">
            {survey?.customer?.name ?? 'お客様'}、このたびはご利用いただきありがとうございました。
            以下の項目についてご評価ください（1〜5の星で評価）。
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">総合満足度</label>
              <StarRating value={overallScore} onChange={setOverallScore} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">品質</label>
              <StarRating value={qualityScore} onChange={setQualityScore} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">工期・スケジュール</label>
              <StarRating value={scheduleScore} onChange={setScheduleScore} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">コミュニケーション</label>
              <StarRating value={communicationScore} onChange={setCommunicationScore} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">コメント・ご意見（任意）</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder="ご意見・ご感想をお聞かせください"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? '送信中...' : '回答を送信する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
