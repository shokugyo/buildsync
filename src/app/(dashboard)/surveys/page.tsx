'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, Send, Star } from 'lucide-react'

interface Survey {
  id: string
  token: string
  status: string
  sentAt: string | null
  respondedAt: string | null
  overallScore: number | null
  qualityScore: number | null
  scheduleScore: number | null
  communicationScore: number | null
  comments: string | null
  project: { id: string; name: string; projectNumber: string }
  customer: { id: string; name: string } | null
  createdAt: string
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null)
  if (valid.length === 0) return null
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
}

function ScoreStars({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-400 text-sm">-</span>
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= score ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
        />
      ))}
      <span className="text-sm ml-1">{score}</span>
    </div>
  )
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendEmail, setSendEmail] = useState('')
  const [sendTargetId, setSendTargetId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/surveys').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([s, p]) => {
      setSurveys(Array.isArray(s) ? s : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const handleCreate = async () => {
    if (!selectedProjectId) return
    setSaving(true)
    const res = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProjectId }),
    })
    if (res.ok) {
      const created = await res.json()
      setSurveys((prev) => [created, ...prev])
      setShowModal(false)
      setSelectedProjectId('')
    }
    setSaving(false)
  }

  const handleSend = async () => {
    if (!sendTargetId) return
    setSendingId(sendTargetId)
    const res = await fetch(`/api/surveys/${sendTargetId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sendEmail }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSurveys((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    }
    setSendingId(null)
    setSendTargetId(null)
    setSendEmail('')
  }

  const responded = surveys.filter((s) => s.respondedAt)
  const avgOverall = avg(responded.map((s) => s.overallScore))
  const avgQuality = avg(responded.map((s) => s.qualityScore))
  const avgSchedule = avg(responded.map((s) => s.scheduleScore))
  const avgComm = avg(responded.map((s) => s.communicationScore))

  const statusColor = (status: string) => {
    if (status === '回答済') return 'bg-green-100 text-green-800'
    if (status === '送信済') return 'bg-blue-100 text-blue-800'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="顧客アンケート" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '総合満足度', value: avgOverall },
            { label: '品質', value: avgQuality },
            { label: '工期', value: avgSchedule },
            { label: 'コミュニケーション', value: avgComm },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">{card.label}</p>
              <div className="mt-2 flex items-center gap-1">
                <Star className={`w-5 h-5 ${card.value !== null ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                <span className="text-2xl font-bold text-slate-800">{card.value ?? '-'}</span>
                {card.value !== null && <span className="text-slate-500 text-sm">/5</span>}
              </div>
              <p className="text-xs text-slate-400 mt-1">回答数: {responded.length}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">アンケート一覧</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            アンケート作成
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">読み込み中...</div>
          ) : surveys.length === 0 ? (
            <div className="p-8 text-center text-slate-500">アンケートがありません</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">案件</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">顧客</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">ステータス</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">総合評価</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">送信日</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">回答日</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">{s.project.name}</div>
                      <div className="text-xs text-slate-400">{s.project.projectNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.customer?.name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreStars score={s.overallScore} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {s.sentAt ? new Date(s.sentAt).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {s.respondedAt ? new Date(s.respondedAt).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === '未送信' && (
                        <button
                          onClick={() => setSendTargetId(s.id)}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          送信
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">アンケート作成</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件を選択</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setShowModal(false); setSelectedProjectId('') }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedProjectId || saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sendTargetId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">アンケート送信</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">送信先メールアドレス（任意）</label>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">空白の場合、顧客の登録メールに送信します</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setSendTargetId(null); setSendEmail('') }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSend}
                disabled={!!sendingId}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sendingId ? '送信中...' : '送信'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
