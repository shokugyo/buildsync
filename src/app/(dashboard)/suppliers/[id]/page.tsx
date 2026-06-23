'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { ArrowLeft, Truck, Phone, Mail, User, MapPin, Star, Plus, X, Calendar, ShieldCheck, Banknote, Edit2, Save, Package, Users, BarChart3 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Evaluation {
  id: string
  projectId: string | null
  qualityScore: number
  costScore: number
  scheduleScore: number
  safetyScore: number
  overallScore: number
  comment: string | null
  evaluatedAt: string
  evaluator: { id: string; name: string }
  project: { id: string; name: string } | null
}

interface Supplier {
  id: string
  name: string
  type: string
  address: string | null
  phone: string | null
  email: string | null
  contact: string | null
  notes: string | null
  licenseNumber: string | null
  licenseType: string | null
  licenseExpiry: string | null
  insuranceExpiry: string | null
  bankName: string | null
  bankBranch: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  evaluations: Evaluation[]
  _count: { orders: number; evaluations: number }
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

const SCORE_COLORS: Record<number, string> = {
  5: 'text-green-600',
  4: 'text-blue-600',
  3: 'text-amber-600',
  2: 'text-orange-600',
  1: 'text-red-600',
}

function ScoreBadge({ score }: { score: number }) {
  const color = SCORE_COLORS[score] || 'text-slate-600'
  return <span className={`font-semibold ${color}`}>{score}</span>
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              s <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function AverageScoreCard({ label, score }: { label: string; score: number | null }) {
  const colorClass =
    score === null
      ? 'text-slate-400'
      : score >= 4.5
      ? 'text-green-600'
      : score >= 3.5
      ? 'text-blue-600'
      : score >= 2.5
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>
        {score !== null ? score.toFixed(1) : '-'}
      </p>
      <p className="text-xs text-slate-400">/ 5</p>
      {score !== null && (
        <div className="flex justify-center mt-2">
          <StarRating value={Math.round(score)} />
        </div>
      )}
    </div>
  )
}

type SupplierTab = 'evaluations' | 'orders' | 'workers'

const defaultEvalForm = {
  projectId: '',
  qualityScore: 0,
  costScore: 0,
  scheduleScore: 0,
  safetyScore: 0,
  comment: '',
  evaluatedAt: new Date().toISOString().slice(0, 10),
}

export default function SupplierDetailPage() {
  const params = useParams()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])

  const [activeTab, setActiveTab] = useState<SupplierTab>('evaluations')

  // Edit supplier state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '', type: '', address: '', phone: '', email: '', contact: '', notes: '',
    licenseNumber: '', licenseType: '', licenseExpiry: '', insuranceExpiry: '',
    bankName: '', bankBranch: '', bankAccountNumber: '', bankAccountName: '',
  })
  const [editSaving, setEditSaving] = useState(false)

  // Orders state
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [showEvalModal, setShowEvalModal] = useState(false)
  const [evalForm, setEvalForm] = useState(defaultEvalForm)
  const [evalSaving, setEvalSaving] = useState(false)
  const [evalError, setEvalError] = useState('')

  useEffect(() => {
    fetch(`/api/suppliers/${supplierId}`)
      .then((r) => r.json())
      .then((d) => {
        setSupplier(d)
        setEditForm({
          name: d.name || '',
          type: d.type || '協力会社',
          address: d.address || '',
          phone: d.phone || '',
          email: d.email || '',
          contact: d.contact || '',
          notes: d.notes || '',
          licenseNumber: d.licenseNumber || '',
          licenseType: d.licenseType || '',
          licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
          insuranceExpiry: d.insuranceExpiry ? d.insuranceExpiry.slice(0, 10) : '',
          bankName: d.bankName || '',
          bankBranch: d.bankBranch || '',
          bankAccountNumber: d.bankAccountNumber || '',
          bankAccountName: d.bankAccountName || '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []))
  }, [supplierId])

  useEffect(() => {
    if (activeTab === 'orders') {
      setOrdersLoading(true)
      fetch(`/api/orders?supplierId=${supplierId}`)
        .then((r) => r.json())
        .then((d) => setOrders(Array.isArray(d) ? d : []))
        .finally(() => setOrdersLoading(false))
    }
  }, [activeTab, supplierId])

  const handleOpenEditModal = () => {
    if (supplier) {
      setEditForm({
        name: supplier.name || '',
        type: supplier.type || '協力会社',
        address: supplier.address || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        contact: supplier.contact || '',
        notes: supplier.notes || '',
        licenseNumber: supplier.licenseNumber || '',
        licenseType: supplier.licenseType || '',
        licenseExpiry: supplier.licenseExpiry ? supplier.licenseExpiry.slice(0, 10) : '',
        insuranceExpiry: supplier.insuranceExpiry ? supplier.insuranceExpiry.slice(0, 10) : '',
        bankName: supplier.bankName || '',
        bankBranch: supplier.bankBranch || '',
        bankAccountNumber: supplier.bankAccountNumber || '',
        bankAccountName: supplier.bankAccountName || '',
      })
    }
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSaving(true)
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setSupplier((prev: any) => ({ ...prev, ...updated }))
        setShowEditModal(false)
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleOpenEvalModal = () => {
    setEvalForm(defaultEvalForm)
    setEvalError('')
    setShowEvalModal(true)
  }

  const handleSaveEval = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evalForm.qualityScore || !evalForm.costScore || !evalForm.scheduleScore || !evalForm.safetyScore) {
      setEvalError('全ての評価スコアを入力してください')
      return
    }
    setEvalSaving(true)
    setEvalError('')
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...evalForm,
          projectId: evalForm.projectId || null,
        }),
      })
      if (res.ok) {
        const newEval = await res.json()
        setSupplier((prev) =>
          prev
            ? {
                ...prev,
                evaluations: [newEval, ...prev.evaluations],
                _count: { ...prev._count, evaluations: prev._count.evaluations + 1 },
              }
            : prev
        )
        setShowEvalModal(false)
      } else {
        const d = await res.json()
        setEvalError(d.error || '登録に失敗しました')
      }
    } finally {
      setEvalSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="協力会社詳細" />
        <div className="p-6 text-center text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div>
        <Header title="協力会社詳細" />
        <div className="p-6 text-center text-slate-500">業者が見つかりません</div>
      </div>
    )
  }

  const evals = supplier.evaluations || []
  const avgQuality = evals.length ? evals.reduce((s, e) => s + e.qualityScore, 0) / evals.length : null
  const avgCost = evals.length ? evals.reduce((s, e) => s + e.costScore, 0) / evals.length : null
  const avgSchedule = evals.length ? evals.reduce((s, e) => s + e.scheduleScore, 0) / evals.length : null
  const avgSafety = evals.length ? evals.reduce((s, e) => s + e.safetyScore, 0) / evals.length : null
  const avgOverall = evals.length ? evals.reduce((s, e) => s + e.overallScore, 0) / evals.length : null

  return (
    <div>
      <Header title={supplier.name} />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          協力会社・業者一覧へ戻る
        </Link>

        {/* Supplier info header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{supplier.type}</span>
                  <span className="text-xs text-slate-400">発注 {supplier._count.orders}件 / 評価 {evals.length}件</span>
                </div>
                <button
                  onClick={handleOpenEditModal}
                  className="flex items-center gap-1.5 border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> 編集
                </button>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-3">{supplier.name}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {supplier.contact && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{supplier.contact}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <a href={`tel:${supplier.phone}`} className="hover:text-blue-600">{supplier.phone}</a>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <a href={`mailto:${supplier.email}`} className="hover:text-blue-600 truncate">{supplier.email}</a>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>
              {supplier.notes && (
                <p className="mt-3 text-sm text-slate-500 border-t border-slate-100 pt-3">{supplier.notes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Construction license and bank info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-700">建設業許可</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">許可番号</dt>
                <dd className="text-slate-800 font-medium">{supplier.licenseNumber || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">許可業種</dt>
                <dd className="text-slate-800">{supplier.licenseType || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">許可有効期限</dt>
                <dd className={`font-medium ${
                  supplier.licenseExpiry && new Date(supplier.licenseExpiry) < new Date()
                    ? 'text-red-600'
                    : 'text-slate-800'
                }`}>
                  {supplier.licenseExpiry
                    ? new Date(supplier.licenseExpiry).toLocaleDateString('ja-JP')
                    : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">保険有効期限</dt>
                <dd className={`font-medium ${
                  supplier.insuranceExpiry && new Date(supplier.insuranceExpiry) < new Date()
                    ? 'text-red-600'
                    : 'text-slate-800'
                }`}>
                  {supplier.insuranceExpiry
                    ? new Date(supplier.insuranceExpiry).toLocaleDateString('ja-JP')
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-700">振込先</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">銀行名</dt>
                <dd className="text-slate-800">{supplier.bankName || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">支店名</dt>
                <dd className="text-slate-800">{supplier.bankBranch || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">口座番号</dt>
                <dd className="text-slate-800 font-mono">{supplier.bankAccountNumber || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">口座名義</dt>
                <dd className="text-slate-800">{supplier.bankAccountName || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'evaluations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BarChart3 className="w-4 h-4" />
            評価履歴
            <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{evals.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package className="w-4 h-4" />
            発注一覧
            <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{supplier._count.orders}</span>
          </button>
          <button
            onClick={() => setActiveTab('workers')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'workers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4" />
            作業員名簿
          </button>
        </div>

        {/* Evaluations tab content */}
        {activeTab === 'evaluations' && (<>
        {/* Average score cards */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">評価スコア平均</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <AverageScoreCard label="品質" score={avgQuality} />
            <AverageScoreCard label="コスト" score={avgCost} />
            <AverageScoreCard label="工程" score={avgSchedule} />
            <AverageScoreCard label="安全" score={avgSafety} />
            <AverageScoreCard label="総合" score={avgOverall} />
          </div>
        </div>

        {/* Evaluation history */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">評価履歴（{evals.length}件）</h2>
            <button
              onClick={handleOpenEvalModal}
              className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> 評価を追加
            </button>
          </div>

          {evals.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-10 text-center">
              <Star className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">評価がまだ登録されていません</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">案件名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">評価日</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">品質</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">コスト</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">工程</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">安全</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">総合</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">コメント</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">評価者</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {evals.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          {ev.project ? (
                            <Link href={`/projects/${ev.project.id}`} className="hover:text-blue-600 hover:underline">
                              {ev.project.name}
                            </Link>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {new Date(ev.evaluatedAt).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-3 text-center"><ScoreBadge score={ev.qualityScore} /></td>
                        <td className="px-4 py-3 text-center"><ScoreBadge score={ev.costScore} /></td>
                        <td className="px-4 py-3 text-center"><ScoreBadge score={ev.scheduleScore} /></td>
                        <td className="px-4 py-3 text-center"><ScoreBadge score={ev.safetyScore} /></td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${ev.overallScore >= 4 ? 'text-green-600' : ev.overallScore >= 3 ? 'text-blue-600' : 'text-amber-600'}`}>
                            {ev.overallScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{ev.comment || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{ev.evaluator.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </>)}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">発注一覧</h3>
            </div>
            {ordersLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">発注データがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">発注番号</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">件名</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">案件</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">ステータス</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">発注日</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">{order.orderNumber}</td>
                        <td className="px-5 py-3 text-slate-900">{order.subject}</td>
                        <td className="px-5 py-3">
                          <Link href={`/projects/${order.project?.id}`} className="text-blue-600 hover:underline text-sm">
                            {order.project?.name || '—'}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            order.status === '完了' ? 'bg-green-100 text-green-700' :
                            order.status === '発注済' ? 'bg-blue-100 text-blue-700' :
                            order.status === '下書き' ? 'bg-slate-100 text-slate-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>{order.status}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{order.orderDate ? formatDate(order.orderDate) : '—'}</td>
                        <td className="px-5 py-3 text-right text-slate-800 font-medium">{formatCurrency(order.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Workers tab */}
        {activeTab === 'workers' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">作業員名簿は案件ごとに管理されています。</p>
            <p className="text-sm text-slate-400 mt-1">各案件の作業員名簿タブからご確認ください。</p>
          </div>
        )}
      </div>

      {/* Evaluation Modal */}
      {showEvalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">評価を追加</h2>
              <button onClick={() => setShowEvalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEval} className="space-y-5">
              {/* Project select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件（任意）</label>
                <select
                  value={evalForm.projectId}
                  onChange={(e) => setEvalForm({ ...evalForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件を選択しない</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Score inputs */}
              <div className="space-y-4">
                {[
                  { key: 'qualityScore', label: '品質' },
                  { key: 'costScore', label: 'コスト' },
                  { key: 'scheduleScore', label: '工程' },
                  { key: 'safetyScore', label: '安全' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-4">
                    <label className="text-sm font-medium text-slate-700 w-20 flex-shrink-0">{label}</label>
                    <StarRating
                      value={evalForm[key as keyof typeof evalForm] as number}
                      onChange={(v) => setEvalForm({ ...evalForm, [key]: v })}
                    />
                    <span className="text-sm text-slate-500 w-6">
                      {(evalForm[key as keyof typeof evalForm] as number) > 0
                        ? evalForm[key as keyof typeof evalForm]
                        : '-'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Preview overall */}
              {evalForm.qualityScore > 0 && evalForm.costScore > 0 && evalForm.scheduleScore > 0 && evalForm.safetyScore > 0 && (
                <div className="bg-blue-50 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">総合スコア（自動計算）</span>
                  <span className="text-lg font-bold text-blue-700">
                    {((evalForm.qualityScore + evalForm.costScore + evalForm.scheduleScore + evalForm.safetyScore) / 4).toFixed(1)}
                  </span>
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">コメント（任意）</label>
                <textarea
                  value={evalForm.comment}
                  onChange={(e) => setEvalForm({ ...evalForm, comment: e.target.value })}
                  rows={3}
                  placeholder="評価のコメントを入力してください"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Evaluated at */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">評価日</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={evalForm.evaluatedAt}
                    onChange={(e) => setEvalForm({ ...evalForm, evaluatedAt: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {evalError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{evalError}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEvalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={evalSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {evalSaving ? '保存中...' : '評価を登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">協力会社を編集</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">会社名 *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">種別</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="協力会社">協力会社</option>
                    <option value="専門工事業者">専門工事業者</option>
                    <option value="資材業者">資材業者</option>
                    <option value="設備業者">設備業者</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <input
                    type="text"
                    value={editForm.contact}
                    onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">メール</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">住所</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2 border-t border-slate-100">建設業許可</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">許可番号</label>
                  <input
                    type="text"
                    value={editForm.licenseNumber}
                    onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">許可業種</label>
                  <input
                    type="text"
                    value={editForm.licenseType}
                    onChange={(e) => setEditForm({ ...editForm, licenseType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">許可有効期限</label>
                  <input
                    type="date"
                    value={editForm.licenseExpiry}
                    onChange={(e) => setEditForm({ ...editForm, licenseExpiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保険有効期限</label>
                  <input
                    type="date"
                    value={editForm.insuranceExpiry}
                    onChange={(e) => setEditForm({ ...editForm, insuranceExpiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2 border-t border-slate-100">振込先</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">銀行名</label>
                  <input
                    type="text"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">支店名</label>
                  <input
                    type="text"
                    value={editForm.bankBranch}
                    onChange={(e) => setEditForm({ ...editForm, bankBranch: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">口座番号</label>
                  <input
                    type="text"
                    value={editForm.bankAccountNumber}
                    onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">口座名義</label>
                  <input
                    type="text"
                    value={editForm.bankAccountName}
                    onChange={(e) => setEditForm({ ...editForm, bankAccountName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {editSaving ? '保存中...' : '更新する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
