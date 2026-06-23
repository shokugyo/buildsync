'use client'

import { useState, useEffect, useMemo } from 'react'
import Header from '@/components/Header'
import { Truck, FileSpreadsheet, Star, Plus, X, ChevronDown, ChevronRight, Award, Package, DollarSign, Clock } from 'lucide-react'

interface SupplierRow {
  supplierId: string
  supplierName: string
  count: number
  avgQualityScore: number
  avgCostScore: number
  avgScheduleScore: number
  avgSafetyScore: number
  avgOverallScore: number
}

interface Evaluation {
  id: string
  qualityScore: number
  costScore: number
  scheduleScore: number
  safetyScore: number
  overallScore: number
  comment?: string | null
  evaluatedAt: string
  evaluator: { id: string; name: string }
  project?: { id: string; name: string } | null
}

interface Supplier {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface Order {
  id: string
  supplierId: string | null
  totalAmount: number
  status: string
  supplier?: { id: string; name: string } | null
}

interface SupplierPerf {
  supplierId: string
  supplierName: string
  totalAmount: number
  orderCount: number
  avgScore: number
  deliveryRate: number
  compositeScore: number
}

function Stars({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-600">{score.toFixed(1)}</span>
    </span>
  )
}

function scoreColor(score: number) {
  if (score >= 4) return 'text-green-600 bg-green-50'
  if (score >= 3) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${scoreColor(score)}`}>
      {score.toFixed(1)}
    </span>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100
  const color = score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-slate-500 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-8 text-right font-medium ${score >= 4 ? 'text-green-700' : score >= 3 ? 'text-yellow-700' : 'text-red-700'}`}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

function PerfCard({
  rank,
  perf,
}: {
  rank: number
  perf: SupplierPerf
}) {
  const rankColor =
    rank === 1
      ? 'bg-yellow-400 text-white'
      : rank === 2
      ? 'bg-slate-400 text-white'
      : rank === 3
      ? 'bg-orange-400 text-white'
      : 'bg-slate-100 text-slate-600'

  const compositeColor =
    perf.compositeScore >= 70
      ? 'text-green-600'
      : perf.compositeScore >= 50
      ? 'text-yellow-600'
      : 'text-red-600'

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${rankColor}`}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{perf.supplierName}</p>
          <p className={`text-2xl font-bold mt-1 ${compositeColor}`}>
            {perf.compositeScore.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </p>
        </div>
        <Award className={`w-5 h-5 shrink-0 ${rank <= 3 ? 'text-yellow-400' : 'text-slate-200'}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
          <DollarSign className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div>
            <p className="text-slate-400">総発注金額</p>
            <p className="font-semibold text-slate-700">
              {perf.totalAmount >= 1_000_000
                ? `${(perf.totalAmount / 1_000_000).toFixed(1)}M`
                : `${(perf.totalAmount / 1_000).toFixed(0)}K`}円
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
          <Package className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <div>
            <p className="text-slate-400">発注件数</p>
            <p className="font-semibold text-slate-700">{perf.orderCount}件</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
          <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-slate-400">平均評価</p>
            <p className="font-semibold text-slate-700">
              {perf.avgScore > 0 ? perf.avgScore.toFixed(1) : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
          <Clock className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <div>
            <p className="text-slate-400">納期遵守率</p>
            <p
              className={`font-semibold ${
                perf.deliveryRate >= 80
                  ? 'text-green-600'
                  : perf.deliveryRate >= 60
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {perf.orderCount > 0 ? `${perf.deliveryRate}%` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const defaultForm = {
  projectId: '',
  qualityScore: 3,
  costScore: 3,
  scheduleScore: 3,
  safetyScore: 3,
  comment: '',
  evaluatedAt: new Date().toISOString().slice(0, 10),
}

export default function SupplierEvaluationReportPage() {
  const [rows, setRows] = useState<SupplierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drillData, setDrillData] = useState<Record<string, Evaluation[]>>({})
  const [drillLoading, setDrillLoading] = useState<Record<string, boolean>>({})

  // Performance analysis state
  const [orders, setOrders] = useState<Order[]>([])
  const [perfLoading, setPerfLoading] = useState(true)

  // Add evaluation modal
  const [modalSupplierId, setModalSupplierId] = useState<string | null>(null)
  const [modalSupplierName, setModalSupplierName] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fetchRows = () => {
    fetch('/api/reports/supplier-evaluations')
      .then((r) => r.json())
      .then((data) => {
        setRows(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchRows()
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})

    // Fetch orders for performance analysis
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : [])
        setPerfLoading(false)
      })
      .catch(() => setPerfLoading(false))
  }, [])

  // Build supplier performance metrics
  const supplierPerfs = useMemo<SupplierPerf[]>(() => {
    if (perfLoading || loading) return []

    // Aggregate orders by supplier
    const orderMap = new Map<string, { totalAmount: number; orderCount: number; completedCount: number; supplierName: string }>()
    for (const order of orders) {
      if (!order.supplierId) continue
      const sName = order.supplier?.name ?? order.supplierId
      if (!orderMap.has(order.supplierId)) {
        orderMap.set(order.supplierId, { totalAmount: 0, orderCount: 0, completedCount: 0, supplierName: sName })
      }
      const agg = orderMap.get(order.supplierId)!
      agg.totalAmount += order.totalAmount
      agg.orderCount++
      if (order.status === '完了') agg.completedCount++
    }

    // Merge: include all suppliers that have either orders or evaluations
    const allIdsArr = Array.from(
      new Set([...Array.from(orderMap.keys()), ...rows.map((r) => r.supplierId)])
    )

    const result: SupplierPerf[] = []
    for (const sid of allIdsArr) {
      const orderAgg = orderMap.get(sid)
      const evalRow = rows.find((r) => r.supplierId === sid)
      const supplierName = evalRow?.supplierName ?? orderAgg?.supplierName ?? sid

      const avgScore = evalRow?.avgOverallScore ?? 0
      const deliveryRate =
        orderAgg && orderAgg.orderCount > 0
          ? Math.round((orderAgg.completedCount / orderAgg.orderCount) * 100)
          : 0

      // compositeScore: evaluation * 0.5 * 20 (normalize to 0-100) + deliveryRate * 0.5
      const compositeScore =
        avgScore > 0
          ? avgScore * 0.5 * 20 + deliveryRate * 0.5
          : deliveryRate * 0.5

      result.push({
        supplierId: sid,
        supplierName,
        totalAmount: orderAgg?.totalAmount ?? 0,
        orderCount: orderAgg?.orderCount ?? 0,
        avgScore,
        deliveryRate,
        compositeScore: Math.round(compositeScore * 10) / 10,
      })
    }

    result.sort((a, b) => b.compositeScore - a.compositeScore)
    return result
  }, [orders, rows, perfLoading, loading])

  const avgOverall =
    rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.avgOverallScore, 0) / rows.length) * 10) / 10
      : null

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/export/supplier-evaluations/xlsx')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `supplier-evaluations_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const toggleExpand = async (supplierId: string) => {
    if (expandedId === supplierId) {
      setExpandedId(null)
      return
    }
    setExpandedId(supplierId)
    if (!drillData[supplierId]) {
      setDrillLoading((prev) => ({ ...prev, [supplierId]: true }))
      try {
        const res = await fetch(`/api/suppliers/${supplierId}/evaluations`)
        const data = await res.json()
        setDrillData((prev) => ({ ...prev, [supplierId]: Array.isArray(data) ? data : [] }))
      } catch {
        setDrillData((prev) => ({ ...prev, [supplierId]: [] }))
      } finally {
        setDrillLoading((prev) => ({ ...prev, [supplierId]: false }))
      }
    }
  }

  const openModal = (supplierId: string, supplierName: string) => {
    setModalSupplierId(supplierId)
    setModalSupplierName(supplierName)
    setForm(defaultForm)
    setSubmitError('')
  }

  const closeModal = () => {
    setModalSupplierId(null)
    setModalSupplierName('')
    setSubmitError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalSupplierId) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/suppliers/${modalSupplierId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          qualityScore: Number(form.qualityScore),
          costScore: Number(form.costScore),
          scheduleScore: Number(form.scheduleScore),
          safetyScore: Number(form.safetyScore),
          projectId: form.projectId || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '登録に失敗しました')
      }
      // Refresh drill data and rows
      setDrillData((prev) => {
        const next = { ...prev }
        delete next[modalSupplierId]
        return next
      })
      if (expandedId === modalSupplierId) {
        setDrillLoading((prev) => ({ ...prev, [modalSupplierId]: true }))
        fetch(`/api/suppliers/${modalSupplierId}/evaluations`)
          .then((r) => r.json())
          .then((data) => {
            setDrillData((prev) => ({ ...prev, [modalSupplierId]: Array.isArray(data) ? data : [] }))
          })
          .finally(() => setDrillLoading((prev) => ({ ...prev, [modalSupplierId]: false })))
      }
      fetchRows()
      closeModal()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const ScoreSlider = ({ field, label }: { field: keyof typeof form; label: string }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold text-blue-600">{form[field]}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={Number(form[field])}
        onChange={(e) => setForm((prev) => ({ ...prev, [field]: Number(e.target.value) }))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>1 (低)</span><span>3</span><span>5 (高)</span>
      </div>
    </div>
  )

  return (
    <div>
      <Header title="協力会社評価レポート" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">協力会社評価レポート</h2>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting ? 'エクスポート中...' : 'Excelエクスポート'}
          </button>
        </div>

        {avgOverall !== null && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <p className="text-xs text-slate-500 mb-1">全協力会社 平均総合スコア</p>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${avgOverall >= 4 ? 'text-green-600' : avgOverall >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                {avgOverall.toFixed(1)}
              </span>
              <Stars score={avgOverall} />
              <span className="text-sm text-slate-400">/ 5点満点 ({rows.length}社)</span>
            </div>
          </div>
        )}

        {/* Performance Ranking Section */}
        {!perfLoading && supplierPerfs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-slate-700">
                協力会社パフォーマンスランキング
              </h3>
              <span className="text-xs text-slate-400">
                総合スコア = 評価×50% + 納期遵守率×50%
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {supplierPerfs.map((perf, idx) => (
                <PerfCard key={perf.supplierId} rank={idx + 1} perf={perf} />
              ))}
            </div>
          </div>
        )}

        {/* Evaluation Detail Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">評価詳細</h3>
          </div>
          {loading ? (
            <p className="text-center text-slate-400 text-sm py-10">読み込み中...</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">評価データがありません</p>
          ) : (
            <div>
              {rows.map((row) => {
                const isOpen = expandedId === row.supplierId
                const evals = drillData[row.supplierId] || []
                const isLoadingDrill = drillLoading[row.supplierId]
                return (
                  <div key={row.supplierId} className="border-b border-slate-100 last:border-0">
                    {/* Summary row */}
                    <div className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 cursor-pointer select-none" onClick={() => toggleExpand(row.supplierId)}>
                      <button className="text-slate-400 hover:text-slate-600 shrink-0">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <span className="font-medium text-slate-800 w-40 truncate">{row.supplierName}</span>
                      <span className="text-xs text-slate-500 w-14 text-center">{row.count}件</span>
                      <div className="flex-1 grid grid-cols-4 gap-3 min-w-0">
                        <ScoreBar label="品質" score={row.avgQualityScore} />
                        <ScoreBar label="コスト" score={row.avgCostScore} />
                        <ScoreBar label="工期" score={row.avgScheduleScore} />
                        <ScoreBar label="安全" score={row.avgSafetyScore} />
                      </div>
                      <div className="ml-3 shrink-0">
                        <Stars score={row.avgOverallScore} />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(row.supplierId, row.supplierName) }}
                        className="ml-2 shrink-0 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1.5 rounded-lg"
                      >
                        <Plus className="w-3 h-3" /> 評価追加
                      </button>
                    </div>

                    {/* Drill-down */}
                    {isOpen && (
                      <div className="bg-slate-50 border-t border-slate-100 px-6 py-3">
                        {isLoadingDrill ? (
                          <p className="text-slate-400 text-xs py-2">読み込み中...</p>
                        ) : evals.length === 0 ? (
                          <p className="text-slate-400 text-xs py-2">評価履歴がありません</p>
                        ) : (
                          <div className="space-y-2">
                            {evals.map((ev) => (
                              <div key={ev.id} className="bg-white rounded-lg border border-slate-200 p-3 text-xs">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="text-slate-500">
                                        {new Date(ev.evaluatedAt).toLocaleDateString('ja-JP')}
                                      </span>
                                      {ev.project && (
                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                          {ev.project.name}
                                        </span>
                                      )}
                                      <span className="text-slate-500">評価者: {ev.evaluator.name}</span>
                                    </div>
                                    {ev.comment && (
                                      <p className="text-slate-600 mt-1">{ev.comment}</p>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 shrink-0 text-right">
                                    <span className="text-slate-400">品質 <ScoreBadge score={ev.qualityScore} /></span>
                                    <span className="text-slate-400">コスト <ScoreBadge score={ev.costScore} /></span>
                                    <span className="text-slate-400">工期 <ScoreBadge score={ev.scheduleScore} /></span>
                                    <span className="text-slate-400">安全 <ScoreBadge score={ev.safetyScore} /></span>
                                  </div>
                                  <div className="shrink-0">
                                    <Stars score={ev.overallScore} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Evaluation Modal */}
      {modalSupplierId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">評価を追加 — {modalSupplierName}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件（任意）</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件を選択...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">評価日</label>
                <input
                  type="date"
                  value={form.evaluatedAt}
                  onChange={(e) => setForm((p) => ({ ...p, evaluatedAt: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3 bg-slate-50 rounded-xl p-4">
                <ScoreSlider field="qualityScore" label="品質スコア" />
                <ScoreSlider field="costScore" label="コストスコア" />
                <ScoreSlider field="scheduleScore" label="工期スコア" />
                <ScoreSlider field="safetyScore" label="安全スコア" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">コメント（任意）</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="評価に関するコメントを入力..."
                />
              </div>

              {submitError && (
                <p className="text-red-600 text-sm">{submitError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? '登録中...' : '評価を登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
