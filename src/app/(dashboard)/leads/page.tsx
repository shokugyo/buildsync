'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, TrendingUp, Users, DollarSign, Target, List, LayoutGrid, Eye, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  title: string
  companyName: string | null
  contactName: string | null
  contactEmail: string | null
  phone: string | null
  customerName: string | null
  customer: { id: string; name: string } | null
  status: string
  source: string | null
  estimatedAmount: number | null
  assignee: { id: string; name: string } | null
  contactDate: string | null
  nextActionDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const LEAD_STATUSES = ['新規問い合わせ', '初回対応', '現地調査', '見積作成中', '見積提出済', '契約交渉', '契約', '失注']
const LEAD_SOURCES = ['ホームページ', '紹介', '営業', 'チラシ', '既存顧客', 'その他']

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

const emptyForm = {
  title: '',
  companyName: '',
  contactName: '',
  contactEmail: '',
  phone: '',
  customerId: '',
  customerName: '',
  status: '新規問い合わせ',
  source: '',
  estimatedAmount: '',
  assigneeId: '',
  contactDate: new Date().toISOString().split('T')[0],
  nextActionDate: '',
  notes: '',
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  const fetchLeads = async () => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/leads?${params}`)
    const data = await res.json()
    setLeads(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([c, u]) => {
      setCustomers(Array.isArray(c) ? c : [])
      setUsers(Array.isArray(u) ? u : [])
    })
  }, [])

  useEffect(() => { fetchLeads() }, [filterStatus])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  const openEdit = (lead: Lead) => {
    setEditing(lead)
    setForm({
      title: lead.title,
      companyName: lead.companyName || '',
      contactName: lead.contactName || '',
      contactEmail: lead.contactEmail || '',
      phone: lead.phone || '',
      customerId: lead.customer?.id || '',
      customerName: lead.customerName || '',
      status: lead.status,
      source: lead.source || '',
      estimatedAmount: lead.estimatedAmount?.toString() || '',
      assigneeId: lead.assignee?.id || '',
      contactDate: lead.contactDate ? lead.contactDate.split('T')[0] : '',
      nextActionDate: lead.nextActionDate ? lead.nextActionDate.split('T')[0] : '',
      notes: lead.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title) return
    setSaving(true)
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/leads/${editing.id}` : '/api/leads'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setShowModal(false)
    fetchLeads()
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    fetchLeads()
  }

  const handleConvertToProject = (lead: Lead) => {
    const displayName = lead.companyName || lead.customer?.name || lead.customerName || ''
    const params = new URLSearchParams()
    if (displayName) params.set('customerName', displayName)
    if (lead.customer?.id) params.set('customerId', lead.customer.id)
    params.set('leadId', lead.id)
    router.push(`/projects/new?${params.toString()}`)
  }

  const filteredLeads = leads.filter(l =>
    !searchText || l.title.includes(searchText) ||
    (l.companyName || '').includes(searchText) ||
    (l.contactName || '').includes(searchText) ||
    (l.customer?.name || l.customerName || '').includes(searchText)
  )

  const [dragLeadId, setDragLeadId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDragLeadId(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverStatus(null)
    if (!dragLeadId) return
    const lead = leads.find(l => l.id === dragLeadId)
    if (!lead || lead.status === status) { setDragLeadId(null); return }
    setLeads(prev => prev.map(l => l.id === dragLeadId ? { ...l, status } : l))
    await fetch(`/api/leads/${dragLeadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, status }),
    })
    setDragLeadId(null)
  }

  const handleDragEnd = () => {
    setDragLeadId(null)
    setDragOverStatus(null)
  }

  // Stats
  const totalEstimated = leads.reduce((s, l) => s + (l.estimatedAmount || 0), 0)
  const contracted = leads.filter(l => l.status === '契約').length
  const orderRate = leads.length > 0 ? (contracted / leads.length * 100).toFixed(1) : '0.0'
  const active = leads.filter(l => !['契約', '失注'].includes(l.status)).length

  return (
    <div>
      <Header title="引合管理" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-100 rounded-lg p-2"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{leads.length}</span>
            </div>
            <p className="text-sm text-slate-500">総引合件数</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-100 rounded-lg p-2"><Users className="w-5 h-5 text-orange-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{active}</span>
            </div>
            <p className="text-sm text-slate-500">商談中</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 rounded-lg p-2"><Target className="w-5 h-5 text-green-600" /></div>
              <span className="text-2xl font-bold text-slate-900">{orderRate}%</span>
            </div>
            <p className="text-sm text-slate-500">受注率</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-100 rounded-lg p-2"><DollarSign className="w-5 h-5 text-purple-600" /></div>
              <span className="text-xl font-bold text-slate-900">{formatCurrency(totalEstimated)}</span>
            </div>
            <p className="text-sm text-slate-500">見込み金額合計</p>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="案件名・会社名・担当者名で検索"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全ステータス</option>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <List className="w-4 h-4" />
                リスト
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                カンバン
              </button>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 ml-auto"
            >
              <Plus className="w-4 h-4" />
              引合追加
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-8">読み込み中...</div>
        ) : viewMode === 'kanban' ? (
          /* Kanban Board */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {LEAD_STATUSES.map(status => {
              const statusLeads = filteredLeads.filter(l => l.status === status)
              const isDropTarget = dragOverStatus === status
              return (
                <div
                  key={status}
                  className={`flex-shrink-0 w-64 rounded-xl p-3 transition-colors ${isDropTarget ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-slate-50'}`}
                  onDragOver={e => handleDragOver(e, status)}
                  onDrop={e => handleDrop(e, status)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-600">{status}</span>
                    <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{statusLeads.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {statusLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={e => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${dragLeadId === lead.id ? 'opacity-50 ring-2 ring-blue-300' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <Link href={`/leads/${lead.id}`} className="text-xs font-semibold text-slate-800 hover:text-blue-600 line-clamp-2 flex-1">{lead.title}</Link>
                          <button onClick={() => openEdit(lead)} className="text-slate-300 hover:text-blue-500 flex-shrink-0 mt-0.5">
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        {(lead.companyName || lead.customer?.name || lead.customerName) && (
                          <p className="text-xs font-medium text-slate-700 mb-0.5">{lead.companyName || lead.customer?.name || lead.customerName}</p>
                        )}
                        {lead.contactName && (
                          <p className="text-xs text-slate-500 mb-0.5">{lead.contactName}</p>
                        )}
                        {lead.phone && (
                          <p className="text-xs text-slate-400 mb-0.5">{lead.phone}</p>
                        )}
                        {lead.estimatedAmount && (
                          <p className="text-xs font-medium text-blue-600">{formatCurrency(lead.estimatedAmount)}</p>
                        )}
                        {lead.assignee && (
                          <p className="text-xs text-slate-400 mt-1">担当: {lead.assignee.name}</p>
                        )}
                        {lead.nextActionDate && (
                          <p className="text-xs text-orange-500 mt-0.5">次回: {formatDate(lead.nextActionDate)}</p>
                        )}
                        {lead.status === '契約' && (
                          <button
                            onClick={() => handleConvertToProject(lead)}
                            className="mt-2 w-full flex items-center justify-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 hover:bg-green-100"
                          >
                            <ArrowRight className="w-3 h-3" />
                            案件に変換
                          </button>
                        )}
                      </div>
                    ))}
                    {statusLeads.length === 0 && (
                      <div className="bg-white rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                        なし
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">引合一覧 ({filteredLeads.length}件)</h2>
            </div>
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500">引合データがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">会社名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">担当者名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">電話</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">見込金額</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">担当者</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">次回アクション</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{lead.title}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{lead.companyName || lead.customer?.name || lead.customerName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{lead.contactName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{lead.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-700'}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{lead.estimatedAmount ? formatCurrency(lead.estimatedAmount) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{lead.assignee?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{lead.nextActionDate ? formatDate(lead.nextActionDate) : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/leads/${lead.id}`} className="text-slate-400 hover:text-green-600">
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button onClick={() => openEdit(lead)} className="text-slate-400 hover:text-blue-600">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConvertToProject(lead)}
                              className="text-slate-400 hover:text-green-600"
                              title="案件に変換"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(lead.id, lead.title)} className="text-slate-400 hover:text-red-600">
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
              <h3 className="font-semibold text-slate-900">{editing ? '引合を編集' : '引合を追加'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="引合案件名"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">会社名</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="株式会社〇〇"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者名</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="山田 太郎"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="03-0000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">登録顧客</label>
                  <select
                    value={form.customerId}
                    onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未登録</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">流入元</label>
                  <select
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択</option>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <select
                    value={form.assigneeId}
                    onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未割当</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">見込金額（税抜）</label>
                  <input
                    type="number"
                    value={form.estimatedAmount}
                    onChange={e => setForm(f => ({ ...f, estimatedAmount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最終接触日</label>
                  <input
                    type="date"
                    value={form.contactDate}
                    onChange={e => setForm(f => ({ ...f, contactDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">次回アクション日</label>
                <input
                  type="date"
                  value={form.nextActionDate}
                  onChange={e => setForm(f => ({ ...f, nextActionDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メモ・備考</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="商談内容、顧客要望など"
                />
              </div>
            </div>
            <div className="flex justify-between gap-3 p-5 border-t border-slate-100">
              <div>
                {editing && (
                  <button
                    onClick={() => handleConvertToProject(editing)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-green-700 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100"
                  >
                    <ArrowRight className="w-4 h-4" />
                    案件に変換
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
