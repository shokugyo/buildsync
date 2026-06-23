'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, X, Save, AlertCircle } from 'lucide-react'

interface Risk {
  id: string
  title: string
  description?: string | null
  probability: number
  impact: number
  riskScore: number
  category?: string | null
  status: string
  mitigation?: string | null
  owner?: string | null
}

const STATUSES = ['未対応', '対応中', '解決済', '受容']

const STATUS_COLORS: Record<string, string> = {
  '未対応': 'bg-red-100 text-red-700',
  '対応中': 'bg-yellow-100 text-yellow-700',
  '解決済': 'bg-green-100 text-green-700',
  '受容': 'bg-slate-100 text-slate-600',
}

function getRiskLevel(score: number) {
  if (score >= 10) return { label: '高', color: '#ef4444', bg: 'bg-red-100 text-red-700' }
  if (score >= 4) return { label: '中', color: '#f59e0b', bg: 'bg-yellow-100 text-yellow-700' }
  return { label: '低', color: '#22c55e', bg: 'bg-green-100 text-green-700' }
}

function cellColor(p: number, i: number) {
  const score = p * i
  if (score >= 10) return '#fca5a5' // red-300
  if (score >= 4) return '#fde68a' // yellow-200
  return '#bbf7d0' // green-200
}

function RiskMatrix({ risks }: { risks: Risk[] }) {
  // Build a map of (probability, impact) -> count
  const matrixMap: Record<string, number> = {}
  risks.forEach(r => {
    const key = `${r.probability}-${r.impact}`
    matrixMap[key] = (matrixMap[key] || 0) + 1
  })

  const cellSize = 52
  const labelSize = 28
  const totalW = labelSize + 5 * cellSize
  const totalH = labelSize + 5 * cellSize

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">リスクマトリクス</h3>
      <div className="flex gap-6 flex-wrap">
        <div>
          <svg width={totalW + 20} height={totalH + 20} viewBox={`0 0 ${totalW + 20} ${totalH + 20}`}>
            {/* Y-axis label */}
            <text
              x={8}
              y={(totalH) / 2 + labelSize / 2}
              fontSize={10}
              fill="#64748b"
              textAnchor="middle"
              transform={`rotate(-90, 8, ${(totalH) / 2 + labelSize / 2})`}
            >
              発生確率
            </text>

            {/* X-axis label */}
            <text
              x={labelSize + 20 + 5 * cellSize / 2}
              y={totalH + 16}
              fontSize={10}
              fill="#64748b"
              textAnchor="middle"
            >
              影響度
            </text>

            {/* Y-axis ticks: probability 5 (top) to 1 (bottom) */}
            {[5, 4, 3, 2, 1].map((p, rowIdx) => (
              <text
                key={p}
                x={labelSize + 14}
                y={labelSize + rowIdx * cellSize + cellSize / 2 + 4}
                fontSize={10}
                fill="#64748b"
                textAnchor="end"
              >
                {p}
              </text>
            ))}

            {/* X-axis ticks: impact 1 to 5 */}
            {[1, 2, 3, 4, 5].map((impact, colIdx) => (
              <text
                key={impact}
                x={labelSize + 20 + colIdx * cellSize + cellSize / 2}
                y={labelSize - 4}
                fontSize={10}
                fill="#64748b"
                textAnchor="middle"
              >
                {impact}
              </text>
            ))}

            {/* Grid cells */}
            {[5, 4, 3, 2, 1].map((p, rowIdx) =>
              [1, 2, 3, 4, 5].map((i, colIdx) => {
                const x = labelSize + 20 + colIdx * cellSize
                const y = labelSize + rowIdx * cellSize
                const count = matrixMap[`${p}-${i}`] || 0
                const bg = cellColor(p, i)
                return (
                  <g key={`${p}-${i}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      fill={bg}
                      stroke="#e2e8f0"
                      strokeWidth={1}
                    />
                    {count > 0 && (
                      <>
                        <circle
                          cx={x + cellSize / 2}
                          cy={y + cellSize / 2}
                          r={14}
                          fill="#1e40af"
                          opacity={0.85}
                        />
                        <text
                          x={x + cellSize / 2}
                          y={y + cellSize / 2 + 4}
                          fontSize={11}
                          fontWeight="bold"
                          fill="white"
                          textAnchor="middle"
                        >
                          {count}
                        </text>
                      </>
                    )}
                  </g>
                )
              })
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col justify-center gap-2">
          <p className="text-xs font-medium text-slate-600 mb-1">リスクレベル</p>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ background: '#fca5a5' }} />
            <span className="text-xs text-slate-600">高 (スコア ≥ 10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ background: '#fde68a' }} />
            <span className="text-xs text-slate-600">中 (スコア 4〜9)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ background: '#bbf7d0' }} />
            <span className="text-xs text-slate-600">低 (スコア &lt; 4)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const defaultForm = {
  title: '',
  description: '',
  probability: 3,
  impact: 3,
  category: '',
  status: '未対応',
  mitigation: '',
  owner: '',
}

export default function RisksPage() {
  const params = useParams()
  const projectId = params.id as string

  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Risk | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/risks`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRisks(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId])

  const openAdd = () => {
    setEditing(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEdit = (risk: Risk) => {
    setEditing(risk)
    setForm({
      title: risk.title,
      description: risk.description || '',
      probability: risk.probability,
      impact: risk.impact,
      category: risk.category || '',
      status: risk.status,
      mitigation: risk.mitigation || '',
      owner: risk.owner || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        probability: Number(form.probability),
        impact: Number(form.impact),
      }

      if (editing) {
        const res = await fetch(`/api/projects/${projectId}/risks/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const updated = await res.json()
          setRisks(prev => prev.map(r => r.id === editing.id ? updated : r))
          closeModal()
        }
      } else {
        const res = await fetch(`/api/projects/${projectId}/risks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          setRisks(prev => [created, ...prev])
          closeModal()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (risk: Risk) => {
    if (!confirm(`「${risk.title}」を削除しますか？`)) return
    const res = await fetch(`/api/projects/${projectId}/risks/${risk.id}`, { method: 'DELETE' })
    if (res.ok) setRisks(prev => prev.filter(r => r.id !== risk.id))
  }

  const sortedRisks = [...risks].sort((a, b) => b.riskScore - a.riskScore)

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            案件に戻る
          </Link>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          リスクを追加
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-900">リスク管理</h1>
        {risks.length > 0 && (
          <span className="text-sm text-slate-400 ml-1">{risks.length}件</span>
        )}
      </div>

      {/* Risk Matrix */}
      {risks.length > 0 && (
        <div className="mb-6">
          <RiskMatrix risks={risks} />
        </div>
      )}

      {/* Risk List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
        ) : sortedRisks.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">リスクが登録されていません</p>
            <button
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              最初のリスクを追加する
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">リスク名</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">カテゴリ</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">確率</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">影響度</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">スコア</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">ステータス</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">担当</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRisks.map(risk => {
                const level = getRiskLevel(risk.riskScore)
                return (
                  <tr key={risk.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{risk.title}</p>
                      {risk.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{risk.description}</p>
                      )}
                      {risk.mitigation && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">対策: {risk.mitigation}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{risk.category || '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{risk.probability}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{risk.impact}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${level.bg}`}>
                        {risk.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[risk.status] || 'bg-slate-100 text-slate-600'}`}>
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{risk.owner || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(risk)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(risk)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                {editing ? 'リスクを編集' : 'リスクを追加'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  リスク名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 工期遅延リスク"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="リスクの詳細説明"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    発生確率 (1〜5) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.probability}
                    onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v} - {['非常に低い', '低い', '中程度', '高い', '非常に高い'][v - 1]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    影響度 (1〜5) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.impact}
                    onChange={e => setForm(f => ({ ...f, impact: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v} - {['軽微', '小さい', '中程度', '大きい', '致命的'][v - 1]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Score preview */}
              <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                <span className="text-xs text-slate-500">リスクスコア:</span>
                {(() => {
                  const score = Number(form.probability) * Number(form.impact)
                  const level = getRiskLevel(score)
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-bold ${level.bg}`}>
                      {score}
                      <span className="text-xs font-medium">({level.label}リスク)</span>
                    </span>
                  )
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">カテゴリ</label>
                  <input
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 工期, コスト, 品質"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">対策・軽減策</label>
                <textarea
                  value={form.mitigation}
                  onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="リスクへの対策を入力してください"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">担当者</label>
                <input
                  value={form.owner}
                  onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="担当者名"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : editing ? '更新する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
