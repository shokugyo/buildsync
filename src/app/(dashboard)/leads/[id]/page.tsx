'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Plus, X, Phone, MapPin, Mail, FileText, Edit2, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  title: string
  customerName: string | null
  customer: { id: string; name: string } | null
  status: string
  source: string | null
  estimatedAmount: number | null
  assignee: { id: string; name: string } | null
  contactDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface LeadActivity {
  id: string
  type: string
  content: string
  activityDate: string
  createdAt: string
  user: { id: string; name: string }
}

const LEAD_STATUSES = ['新規問い合わせ', '初回対応', '現地調査', '見積作成中', '見積提出済', '契約交渉', '契約', '失注']

const ACTIVITY_TYPES = ['電話', '訪問', 'メール', '見積提出', 'その他']

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  '電話': 'bg-blue-100 text-blue-700',
  '訪問': 'bg-green-100 text-green-700',
  'メール': 'bg-purple-100 text-purple-700',
  '見積提出': 'bg-orange-100 text-orange-700',
  'その他': 'bg-slate-100 text-slate-600',
}

const ACTIVITY_TYPE_ICONS: Record<string, React.ReactNode> = {
  '電話': <Phone className="w-4 h-4" />,
  '訪問': <MapPin className="w-4 h-4" />,
  'メール': <Mail className="w-4 h-4" />,
  '見積提出': <FileText className="w-4 h-4" />,
  'その他': <Edit2 className="w-4 h-4" />,
}

const STATUS_COLORS: Record<string, string> = {
  '新規問い合わせ': 'bg-slate-100 text-slate-700',
  '初回対応': 'bg-blue-100 text-blue-700',
  '現地調査': 'bg-purple-100 text-purple-700',
  '見積作成中': 'bg-yellow-100 text-yellow-700',
  '見積提出済': 'bg-orange-100 text-orange-700',
  '契約交渉': 'bg-indigo-100 text-indigo-700',
  '契約': 'bg-green-100 text-green-700',
  '失注': 'bg-red-100 text-red-700',
}

const emptyActivityForm = {
  type: '電話',
  content: '',
  activityDate: new Date().toISOString().split('T')[0],
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [converting, setConverting] = useState(false)
  const [activityForm, setActivityForm] = useState({ ...emptyActivityForm })
  const [savingActivity, setSavingActivity] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const fetchLead = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}`)
    if (res.ok) {
      const data = await res.json()
      setLead(data)
      setNewStatus(data.status)
    }
  }, [leadId])

  const fetchActivities = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}/activities`)
    if (res.ok) {
      const data = await res.json()
      setActivities(Array.isArray(data) ? data : [])
    }
  }, [leadId])

  useEffect(() => {
    Promise.all([fetchLead(), fetchActivities()]).finally(() => setLoading(false))
  }, [fetchLead, fetchActivities])

  const handleAddActivity = async () => {
    if (!activityForm.content || !activityForm.activityDate) return
    setSavingActivity(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityForm),
      })
      if (res.ok) {
        await fetchActivities()
        setShowActivityModal(false)
        setActivityForm({ ...emptyActivityForm })
      }
    } finally {
      setSavingActivity(false)
    }
  }

  const handleStatusChange = async () => {
    if (!newStatus || !lead) return
    setSavingStatus(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await fetchLead()
        setShowStatusModal(false)
      }
    } finally {
      setSavingStatus(false)
    }
  }

  const handleConvertToProject = async () => {
    setConverting(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/convert-to-project`, { method: 'POST' })
      if (res.ok) {
        const project = await res.json()
        router.push(`/projects/${project.id}`)
      } else {
        const err = await res.json()
        alert(err.error || '案件への変換に失敗しました')
        setShowConvertModal(false)
      }
    } finally {
      setConverting(false)
    }
  }

  if (loading) return (
    <div>
      <Header title="引合詳細" />
      <div className="p-6 text-center text-slate-500">読み込み中...</div>
    </div>
  )

  if (!lead) return (
    <div>
      <Header title="引合詳細" />
      <div className="p-6 text-center text-slate-500">引合が見つかりません</div>
    </div>
  )

  const customerDisplayName = lead.customer?.name || lead.customerName || '—'

  return (
    <div>
      <Header title="引合詳細" />
      <div className="p-6 space-y-6">

        {/* Back link */}
        <div>
          <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" />
            引合一覧へ戻る
          </Link>
        </div>

        {/* Lead detail card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">{lead.title}</h1>
              <p className="text-sm text-slate-500">顧客: {customerDisplayName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-700'}`}>
                {lead.status}
              </span>
              {['契約交渉', '契約', '見積提出済'].includes(lead.status) && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  案件に変換
                </button>
              )}
              <button
                onClick={() => setShowStatusModal(true)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
              >
                <Edit2 className="w-3.5 h-3.5" />
                ステータス変更
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-1">流入元</p>
              <p className="text-slate-800 font-medium">{lead.source || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">見込金額（税抜）</p>
              <p className="text-slate-800 font-medium">{lead.estimatedAmount ? formatCurrency(lead.estimatedAmount) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">担当者</p>
              <p className="text-slate-800 font-medium">{lead.assignee?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">最終接触日</p>
              <p className="text-slate-800 font-medium">{lead.contactDate ? formatDate(lead.contactDate) : '—'}</p>
            </div>
          </div>

          {lead.notes && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2">メモ・備考</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">活動履歴</h2>
            <button
              onClick={() => {
                setActivityForm({ ...emptyActivityForm })
                setShowActivityModal(true)
              }}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              活動を追加
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">活動履歴がありません</div>
          ) : (
            <div className="p-6">
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />

                <div className="space-y-6">
                  {activities.map((activity) => (
                    <div key={activity.id} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-400" />

                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ACTIVITY_TYPE_COLORS[activity.type] || 'bg-slate-100 text-slate-600'}`}>
                            {ACTIVITY_TYPE_ICONS[activity.type]}
                            {activity.type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(activity.activityDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto">{activity.user.name}</span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{activity.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">活動を追加</h3>
              <button onClick={() => setShowActivityModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">種別 <span className="text-red-500">*</span></label>
                <select
                  value={activityForm.type}
                  onChange={e => setActivityForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">活動日 <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={activityForm.activityDate}
                  onChange={e => setActivityForm(f => ({ ...f, activityDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容 <span className="text-red-500">*</span></label>
                <textarea
                  value={activityForm.content}
                  onChange={e => setActivityForm(f => ({ ...f, content: e.target.value }))}
                  rows={4}
                  placeholder="活動の内容を入力してください"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowActivityModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                キャンセル
              </button>
              <button
                onClick={handleAddActivity}
                disabled={savingActivity || !activityForm.content || !activityForm.activityDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingActivity ? '保存中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Project Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">案件に変換</h3>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-700">この商談から案件を作成しますか？</p>
              <p className="text-xs text-slate-500 mt-2">
                商談「{lead.title}」をもとに新しい案件が作成されます。
              </p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={converting}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                キャンセル
              </button>
              <button
                onClick={handleConvertToProject}
                disabled={converting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {converting ? '作成中...' : '案件を作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">ステータス変更</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-slate-700 mb-3">新しいステータスを選択</label>
              <div className="space-y-2">
                {LEAD_STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => setNewStatus(status)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                      newStatus === status
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mr-2 ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
                      {status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                キャンセル
              </button>
              <button
                onClick={handleStatusChange}
                disabled={savingStatus || newStatus === lead.status}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingStatus ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
