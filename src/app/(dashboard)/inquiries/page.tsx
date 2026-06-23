'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, MessageSquare } from 'lucide-react'

type Inquiry = {
  id: string
  name: string
  email?: string
  phone?: string
  subject: string
  message: string
  source: string
  status: string
  assignedTo?: string
  assignee?: { id: string; name: string }
  response?: string
  respondedAt?: string
  customerId?: string
  customer?: { id: string; name: string }
  companyId: string
  createdAt: string
}

type User = { id: string; name: string }

const STATUSES = ['未対応', '対応中', '完了']
const SOURCES = ['問い合わせフォーム', '電話', 'メール', '訪問', 'その他']

const statusColor: Record<string, string> = {
  未対応: 'bg-red-100 text-red-700',
  対応中: 'bg-yellow-100 text-yellow-700',
  完了: 'bg-green-100 text-green-700',
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  source: '問い合わせフォーム',
  status: '未対応',
  assignedTo: '',
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('未対応')
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [responseText, setResponseText] = useState('')
  const [savingResponse, setSavingResponse] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  async function fetchInquiries() {
    const params = new URLSearchParams()
    params.set('status', activeTab)
    const res = await fetch(`/api/inquiries?${params}`)
    if (res.ok) setInquiries(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/users').then(r => r.ok ? r.json() : []).then(setUsers)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchInquiries()
  }, [activeTab])

  function openDetail(item: Inquiry) {
    setSelectedInquiry(item)
    setResponseText(item.response || '')
  }

  async function handleSaveResponse() {
    if (!selectedInquiry) return
    setSavingResponse(true)
    const res = await fetch(`/api/inquiries/${selectedInquiry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: responseText,
        respondedAt: new Date().toISOString(),
        status: '完了',
      }),
    })
    setSavingResponse(false)
    if (res.ok) {
      const updated = await res.json()
      setSelectedInquiry(updated)
      fetchInquiries()
    }
  }

  async function handleCreate() {
    setSaving(true)
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setShowModal(false)
      setForm({ ...emptyForm })
      fetchInquiries()
    }
  }

  async function handleStatusChange(inquiry: Inquiry, status: string) {
    await fetch(`/api/inquiries/${inquiry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchInquiries()
    if (selectedInquiry?.id === inquiry.id) {
      setSelectedInquiry({ ...inquiry, status })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/inquiries/${id}`, { method: 'DELETE' })
    if (selectedInquiry?.id === id) setSelectedInquiry(null)
    fetchInquiries()
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="お問い合わせ管理" />
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex flex-col ${selectedInquiry ? 'flex-1' : 'w-full'} overflow-hidden`}>
          <div className="flex items-center gap-1 px-6 pt-4 border-b bg-white">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === s
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => setShowModal(true)}
              className="ml-auto mb-2 flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              問い合わせを追加
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="text-center py-12 text-slate-400">読み込み中...</div>
            ) : inquiries.length === 0 ? (
              <div className="text-center py-12 text-slate-400">問い合わせがありません</div>
            ) : (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">受信日</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">氏名</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">メール</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">件名</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">ソース</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">担当者</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inquiries.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => openDetail(item)}
                        className={`cursor-pointer hover:bg-slate-50 ${selectedInquiry?.id === item.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-slate-500">{item.email || '-'}</td>
                        <td className="px-4 py-3">{item.subject}</td>
                        <td className="px-4 py-3 text-slate-500">{item.source}</td>
                        <td className="px-4 py-3 text-slate-500">{item.assignee?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[item.status] || 'bg-slate-100 text-slate-600'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selectedInquiry && (
          <div className="w-96 border-l bg-white flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">詳細</h3>
              <button onClick={() => setSelectedInquiry(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">受信日</p>
                <p className="text-sm">{formatDate(selectedInquiry.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">氏名</p>
                <p className="text-sm font-medium">{selectedInquiry.name}</p>
              </div>
              {selectedInquiry.email && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">メール</p>
                  <p className="text-sm">{selectedInquiry.email}</p>
                </div>
              )}
              {selectedInquiry.phone && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">電話</p>
                  <p className="text-sm">{selectedInquiry.phone}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 mb-1">ソース</p>
                <p className="text-sm">{selectedInquiry.source}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">件名</p>
                <p className="text-sm font-medium">{selectedInquiry.subject}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">内容</p>
                <p className="text-sm whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">{selectedInquiry.message}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">ステータス変更</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selectedInquiry, s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedInquiry.status === s
                          ? statusColor[s]
                          : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">返信・対応内容</p>
                <textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="対応内容を入力..."
                />
                <button
                  onClick={handleSaveResponse}
                  disabled={savingResponse || !responseText}
                  className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingResponse ? '保存中...' : '返信を記録'}
                </button>
              </div>
              {selectedInquiry.respondedAt && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">対応日時</p>
                  <p className="text-sm">{new Date(selectedInquiry.respondedAt).toLocaleString('ja-JP')}</p>
                </div>
              )}
              <div className="pt-2 border-t">
                <button
                  onClick={() => handleDelete(selectedInquiry.id)}
                  className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">問い合わせを追加</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">氏名 <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">メール</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">電話</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">件名 <span className="text-red-500">*</span></label>
                <input
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">内容 <span className="text-red-500">*</span></label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">ソース</label>
                  <select
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">担当者</label>
                <select
                  value={form.assignedTo}
                  onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">未割当</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">キャンセル</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name || !form.subject || !form.message}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
