'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { Plus, X, Check, XCircle, Trash2 } from 'lucide-react'

interface LeaveRequest {
  id: string
  userId: string
  user: { id: string; name: string }
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string | null
  status: string
  approvedBy: string | null
  approver: { id: string; name: string } | null
  approvedAt: string | null
  createdAt: string
}

const STATUS_BADGE: Record<string, string> = {
  '申請中': 'bg-yellow-100 text-yellow-700',
  '承認': 'bg-green-100 text-green-700',
  '却下': 'bg-red-100 text-red-700',
}

const LEAVE_TYPES = ['有給', '半休', '特別休暇']

export default function LeaveRequestsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'mine' | 'team'>('mine')
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([])
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([])
  const [paidLeaveDays, setPaidLeaveDays] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    leaveType: '有給',
    startDate: '',
    endDate: '',
    days: '',
    reason: '',
  })

  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  const isManager = role === '管理者' || role === 'マネージャー'

  const fetchMyRequests = async () => {
    const res = await fetch('/api/leave-requests?mine=true')
    const data = await res.json()
    setMyRequests(Array.isArray(data) ? data : [])
  }

  const fetchTeamRequests = async () => {
    const res = await fetch('/api/leave-requests')
    const data = await res.json()
    setTeamRequests(Array.isArray(data) ? data : [])
  }

  const fetchUserInfo = async () => {
    const res = await fetch('/api/users?me=true')
    if (res.ok) {
      const data = await res.json()
      if (data.paidLeaveDays !== undefined) setPaidLeaveDays(data.paidLeaveDays)
    }
  }

  useEffect(() => {
    fetchMyRequests()
    fetchUserInfo()
    if (isManager) fetchTeamRequests()
  }, [isManager])

  const usedDays = myRequests
    .filter((r) => r.status === '承認' && r.leaveType === '有給')
    .reduce((sum, r) => sum + r.days, 0)

  const remainingDays = paidLeaveDays - usedDays

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate || !form.days) return
    setSaving(true)
    const res = await fetch('/api/leave-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setShowModal(false)
      setForm({ leaveType: '有給', startDate: '', endDate: '', days: '', reason: '' })
      fetchMyRequests()
    }
  }

  const handleApprove = async (id: string) => {
    await fetch(`/api/leave-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '承認' }),
    })
    fetchTeamRequests()
    fetchMyRequests()
  }

  const handleReject = async (id: string) => {
    await fetch(`/api/leave-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '却下' }),
    })
    fetchTeamRequests()
    fetchMyRequests()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この申請を削除しますか？')) return
    await fetch(`/api/leave-requests/${id}`, { method: 'DELETE' })
    fetchMyRequests()
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('ja-JP')

  const pendingCount = teamRequests.filter((r) => r.status === '申請中').length

  return (
    <div>
      <Header title="休暇管理" />
      <div className="p-6 max-w-5xl">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs text-slate-500 mb-1">付与日数</p>
            <p className="text-2xl font-bold text-slate-800">{paidLeaveDays}<span className="text-sm font-normal text-slate-500 ml-1">日</span></p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs text-slate-500 mb-1">使用日数</p>
            <p className="text-2xl font-bold text-orange-600">{usedDays}<span className="text-sm font-normal text-slate-500 ml-1">日</span></p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs text-slate-500 mb-1">残日数</p>
            <p className={`text-2xl font-bold ${remainingDays < 3 ? 'text-red-600' : 'text-green-600'}`}>{remainingDays}<span className="text-sm font-normal text-slate-500 ml-1">日</span></p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              自分の申請
            </button>
            {isManager && (
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                チームの申請
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">{pendingCount}</span>
                )}
              </button>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            休暇申請
          </button>
        </div>

        {activeTab === 'mine' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {myRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">申請した休暇がありません。</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">種別</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">開始日</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">終了日</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">日数</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">理由</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">ステータス</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 group">
                      <td className="px-4 py-3 text-slate-700">{r.leaveType}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.startDate)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.endDate)}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-800">{r.days}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.reason || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === '申請中' && r.userId === userId && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'team' && isManager && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {teamRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">休暇申請がありません。</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">申請者</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">種別</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">開始日</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">終了日</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">日数</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">理由</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">ステータス</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{r.user.name}</td>
                      <td className="px-4 py-3 text-slate-700">{r.leaveType}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.startDate)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.endDate)}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-800">{r.days}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.reason || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === '申請中' && (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(r.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              承認
                            </button>
                            <button
                              onClick={() => handleReject(r.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              却下
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">休暇申請</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">休暇種別 <span className="text-red-500">*</span></label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始日 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">終了日 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">日数 <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: e.target.value })}
                  placeholder="1"
                  min="0.5"
                  step="0.5"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">理由（任意）</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  placeholder="休暇の理由を入力..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.startDate || !form.endDate || !form.days}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '申請中...' : '申請する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
