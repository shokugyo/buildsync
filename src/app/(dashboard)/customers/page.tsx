'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate } from '@/lib/utils'
import { Plus, Search, X, Edit2, Trash2, Upload, Download } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'

interface Customer {
  id: string
  name: string
  type: string
  address?: string | null
  phone?: string | null
  email?: string | null
  createdAt: string
  _count: { projects: number }
}

const defaultForm = { name: '', type: '法人', address: '', phone: '', email: '' }
const PAGE_SIZE = 20
const TYPE_TABS = ['全て', '個人', '法人'] as const

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [typeTab, setTypeTab] = useState<typeof TYPE_TABS[number]>('全て')
  const [keyword, setKeyword] = useState('')
  const [emailSearch, setEmailSearch] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedEmail, setAppliedEmail] = useState('')
  const [appliedPhone, setAppliedPhone] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  const handleImportSuccess = async () => {
    const data = await fetch('/api/customers').then((r) => r.json())
    setCustomers(Array.isArray(data) ? data : [])
    setImportMessage('CSVインポートが完了しました')
    setTimeout(() => setImportMessage(''), 5000)
  }

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((data) => {
        setCustomers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const handleSearch = () => {
    setAppliedKeyword(keyword)
    setAppliedEmail(emailSearch)
    setAppliedPhone(phoneSearch)
    setPage(1)
  }

  const filtered = customers.filter((c) => {
    if (typeTab !== '全て' && c.type !== typeTab) return false
    if (appliedKeyword) {
      const q = appliedKeyword.toLowerCase()
      if (!c.name.toLowerCase().includes(q)) return false
    }
    if (appliedEmail && !c.email?.toLowerCase().includes(appliedEmail.toLowerCase())) return false
    if (appliedPhone && !c.phone?.includes(appliedPhone)) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEdit = (c: Customer) => {
    setEditTarget(c)
    setForm({ name: c.name, type: c.type, address: c.address || '', phone: c.phone || '', email: c.email || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editTarget ? `/api/customers/${editTarget.id}` : '/api/customers'
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editTarget) {
          setCustomers((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)))
        } else {
          setCustomers((prev) => [...prev, { ...saved, _count: { projects: 0 } }])
        }
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この顧客を削除しますか？')) return
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    if (res.ok) setCustomers((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div>
      <Header title="顧客管理" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">□ 顧客一覧</h2>
          <div className="flex items-center gap-2">
            <a
              href="/api/export/templates/customers"
              download
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" /> テンプレート
            </a>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" /> CSVインポート
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 顧客を追加
            </button>
          </div>
        </div>
        {importMessage && (
          <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {importMessage}
          </div>
        )}

        {/* Type filter tabs */}
        <div className="flex gap-0 mb-3">
          <span className="text-sm text-slate-500 mr-3 self-center">種別で絞り込み：</span>
          {TYPE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setTypeTab(tab); setPage(1) }}
              className={`px-4 py-1.5 text-sm border rounded mr-1 transition-colors ${
                typeTab === tab
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-slate-500">キーワード検索</span>
          <input
            type="text"
            placeholder="顧客名・顧客管理ID"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />
          <button onClick={handleSearch} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm">検索</button>
          <input
            type="text"
            placeholder="メールアドレス"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />
          <button onClick={handleSearch} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm">検索</button>
          <input
            type="text"
            placeholder="電話番号"
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
          <button onClick={handleSearch} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm">検索</button>
        </div>

        {/* Count */}
        <p className="text-sm text-slate-500 mb-3">
          全{filtered.length}件中{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}〜{Math.min(page * PAGE_SIZE, filtered.length)}件を表示中
        </p>

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">顧客ID</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">顧客管理ID</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">種別</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">顧客名</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">メールアドレス</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">電話番号</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">登録日時</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">顧客データがありません</td>
                    </tr>
                  ) : paged.map((customer, idx) => {
                    const displayId = String(10000000 + ((page - 1) * PAGE_SIZE + idx))
                    return (
                      <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-500">{displayId}</td>
                        <td className="px-4 py-2.5 text-slate-400">-</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            customer.type === '法人' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {customer.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{customer.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{customer.email || ''}</td>
                        <td className="px-4 py-2.5 text-slate-500">{customer.phone || ''}</td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {new Date(customer.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '/').replace('T', ' ')}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(customer)} className="p-1 text-slate-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(customer.id)} className="p-1 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 py-3 border-t border-slate-100">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&lt;&lt;</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&lt;</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 text-sm rounded ${page === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600'}`}>{p}</button>
                  )
                })}
                {totalPages > 5 && <span className="text-slate-400">...</span>}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&gt;</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&gt;&gt;</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <CsvImportModal
          title="顧客"
          importApiUrl="/api/customers/import"
          templateApiUrl="/api/export/templates/customers"
          expectedColumns={['顧客名', '種別', '住所', '電話番号', 'メールアドレス']}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{editTarget ? '顧客を編集' : '顧客を追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">顧客名 *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">種別</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="法人">法人</option>
                  <option value="個人">個人</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">住所</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">
                  {saving ? '保存中...' : editTarget ? '更新する' : '追加する'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">
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
