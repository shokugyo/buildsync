'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Trophy, Clock, AlertCircle, TrendingDown, Percent, Printer } from 'lucide-react'

interface Bid {
  id: string
  title: string
  projectId: string | null
  project: { id: string; name: string; projectNumber: string } | null
  bidDate: string
  submissionDeadline: string | null
  estimatedAmount: number | null
  bidAmount: number | null
  status: string
  result: string | null
  competitors: number
  notes: string | null
  createdAt: string
}

const BID_STATUSES = ['準備中', '提出済', '落札', '失注', '辞退']

const STATUS_COLORS: Record<string, string> = {
  '準備中': 'bg-slate-100 text-slate-700',
  '提出済': 'bg-blue-100 text-blue-700',
  '落札': 'bg-green-100 text-green-700',
  '失注': 'bg-red-100 text-red-700',
  '辞退': 'bg-orange-100 text-orange-700',
}

const emptyForm = {
  title: '',
  projectId: '',
  bidDate: new Date().toISOString().split('T')[0],
  submissionDeadline: '',
  estimatedAmount: '',
  bidAmount: '',
  status: '準備中',
  result: '',
  competitors: '0',
  notes: '',
}

export default function BidsPage() {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Bid | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const fetchBids = async () => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/bids?${params}`)
    const data = await res.json()
    setBids(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : (data?.projects ?? []))
    })
  }, [])

  useEffect(() => { fetchBids() }, [filterStatus])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  const openEdit = (bid: Bid) => {
    setEditing(bid)
    setForm({
      title: bid.title,
      projectId: bid.project?.id || '',
      bidDate: bid.bidDate.split('T')[0],
      submissionDeadline: bid.submissionDeadline ? bid.submissionDeadline.split('T')[0] : '',
      estimatedAmount: bid.estimatedAmount?.toString() || '',
      bidAmount: bid.bidAmount?.toString() || '',
      status: bid.status,
      result: bid.result || '',
      competitors: bid.competitors.toString(),
      notes: bid.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.bidDate) return
    setSaving(true)
    const method = editing ? 'PATCH' : 'POST'
    const url = editing ? `/api/bids/${editing.id}` : '/api/bids'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowModal(false)
    fetchBids()
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    await fetch(`/api/bids/${id}`, { method: 'DELETE' })
    fetchBids()
  }

  // Stats
  const preparing = bids.filter(b => b.status === '準備中').length
  const submitted = bids.filter(b => b.status === '提出済').length
  const won = bids.filter(b => b.status === '落札').length
  const lost = bids.filter(b => b.status === '失注').length
  const decided = won + lost
  const winRate = decided > 0 ? ((won / decided) * 100).toFixed(1) : '—'

  return (
    <div>
      <Header title="入札管理" />
      <div className="p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-slate-100 rounded-lg p-2"><Clock className="w-5 h-5 text-slate-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{preparing}</span>
            </div>
            <p className="text-sm text-slate-500">準備中</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-100 rounded-lg p-2"><AlertCircle className="w-5 h-5 text-blue-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{submitted}</span>
            </div>
            <p className="text-sm text-slate-500">提出済</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 rounded-lg p-2"><Trophy className="w-5 h-5 text-green-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{won}</span>
            </div>
            <p className="text-sm text-slate-500">落札</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-red-100 rounded-lg p-2"><TrendingDown className="w-5 h-5 text-red-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{lost}</span>
            </div>
            <p className="text-sm text-slate-500">失注</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-100 rounded-lg p-2"><Percent className="w-5 h-5 text-purple-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{winRate}{winRate !== '—' ? '%' : ''}</span>
            </div>
            <p className="text-sm text-slate-500">落札率</p>
          </div>
        </div>

        {/* Filter & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全ステータス</option>
              {BID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 ml-auto"
            >
              <Plus className="w-4 h-4" />
              入札を追加
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 py-8">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">入札一覧 ({bids.length}件)</h2>
            </div>
            {bids.length === 0 ? (
              <div className="p-8 text-center text-slate-500">入札データがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">タイトル</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">入札日</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">提出期限</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">予定金額</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">入札金額</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">競合他社数</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">結果</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bids.map(bid => (
                      <tr key={bid.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[180px] truncate">{bid.title}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{bid.project ? bid.project.name : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(bid.bidDate)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{bid.submissionDeadline ? formatDate(bid.submissionDeadline) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 text-right">{bid.estimatedAmount != null ? formatCurrency(bid.estimatedAmount) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 text-right">{bid.bidAmount != null ? formatCurrency(bid.bidAmount) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center">{bid.competitors > 0 ? bid.competitors : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[bid.status] || 'bg-slate-100 text-slate-700'}`}>
                            {bid.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[120px] truncate">{bid.result || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => window.open(`/bids/${bid.id}/print`, '_blank')}
                              className="text-slate-400 hover:text-blue-600"
                              title="印刷"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(bid)} className="text-slate-400 hover:text-blue-600">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(bid.id, bid.title)} className="text-slate-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editing ? '入札を編集' : '入札を追加'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="〇〇工事 入札"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">関連案件</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">入札日 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.bidDate}
                    onChange={e => setForm(f => ({ ...f, bidDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">提出期限</label>
                  <input
                    type="date"
                    value={form.submissionDeadline}
                    onChange={e => setForm(f => ({ ...f, submissionDeadline: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">予定金額（税抜）</label>
                  <input
                    type="number"
                    value={form.estimatedAmount}
                    onChange={e => setForm(f => ({ ...f, estimatedAmount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">入札金額（税抜）</label>
                  <input
                    type="number"
                    value={form.bidAmount}
                    onChange={e => setForm(f => ({ ...f, bidAmount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">競合他社数</label>
                  <input
                    type="number"
                    min="0"
                    value={form.competitors}
                    onChange={e => setForm(f => ({ ...f, competitors: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">結果・備考</label>
                <input
                  type="text"
                  value={form.result}
                  onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="落札金額、競合他社名など"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メモ</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="入札に関するメモ・特記事項"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.bidDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
