'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Truck, Plus, Edit2, Trash2, X, Search, Phone, Mail, User, Download, Upload, Bookmark } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'
import { useSavedFilters } from '@/hooks/useSavedFilters'

const SUPPLIER_TYPES = ['協力会社', '資材業者', '設備業者', '専門工事業者', 'その他']

interface Supplier {
  id: string
  name: string
  type: string
  address?: string | null
  phone?: string | null
  email?: string | null
  contact?: string | null
  notes?: string | null
  licenseNumber?: string | null
  licenseType?: string | null
  licenseExpiry?: string | null
  insuranceExpiry?: string | null
  bankName?: string | null
  bankBranch?: string | null
  bankAccountNumber?: string | null
  bankAccountName?: string | null
  createdAt: string
  _count: { orders: number }
}

const defaultForm = {
  name: '', type: '協力会社', address: '', phone: '', email: '', contact: '', notes: '',
  licenseNumber: '', licenseType: '', licenseExpiry: '', insuranceExpiry: '',
  bankName: '', bankBranch: '', bankAccountNumber: '', bankAccountName: '',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Supplier | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const { presets, savePreset, deletePreset, applyPreset } = useSavedFilters('saved_filters_suppliers')

  const hasActiveFilter = !!(search || typeFilter)

  const handleSaveFilter = () => {
    const name = prompt('フィルタ名を入力してください')
    if (!name) return
    savePreset(name, { search, typeFilter })
  }

  const handleApplyPreset = (filters: Record<string, string>) => {
    setSearch(filters.search || '')
    setTypeFilter(filters.typeFilter || '')
  }

  const handleImportSuccess = async () => {
    const data = await fetch('/api/suppliers').then((r) => r.json())
    setSuppliers(Array.isArray(data) ? data : [])
    setImportMessage('CSVインポートが完了しました')
    setTimeout(() => setImportMessage(''), 5000)
  }

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(d => {
      setSuppliers(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  const filtered = suppliers.filter(s => {
    if (typeFilter && s.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || (s.contact || '').toLowerCase().includes(q)
    }
    return true
  })

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (s: Supplier) => {
    setEditTarget(s)
    setForm({
      name: s.name, type: s.type,
      address: s.address || '', phone: s.phone || '',
      email: s.email || '', contact: s.contact || '', notes: s.notes || '',
      licenseNumber: s.licenseNumber || '', licenseType: s.licenseType || '',
      licenseExpiry: s.licenseExpiry ? s.licenseExpiry.slice(0, 10) : '',
      insuranceExpiry: s.insuranceExpiry ? s.insuranceExpiry.slice(0, 10) : '',
      bankName: s.bankName || '', bankBranch: s.bankBranch || '',
      bankAccountNumber: s.bankAccountNumber || '', bankAccountName: s.bankAccountName || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editTarget) {
        const res = await fetch(`/api/suppliers/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const updated = await res.json()
          setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s))
          setShowModal(false)
        } else {
          const d = await res.json()
          setError(d.error || '更新に失敗しました')
        }
      } else {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const created = await res.json()
          setSuppliers(prev => [created, ...prev])
          setShowModal(false)
        } else {
          const d = await res.json()
          setError(d.error || '登録に失敗しました')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この業者を削除しますか？')) return
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    if (res.ok) setSuppliers(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div>
      <Header title="協力会社・業者管理" />
      <div className="p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">業者総数</p>
            <p className="text-2xl font-bold text-slate-900">{suppliers.length}</p>
          </div>
          {SUPPLIER_TYPES.slice(0, 3).map(type => (
            <div key={type} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs text-slate-500 mb-1">{type}</p>
              <p className="text-2xl font-bold text-slate-900">{suppliers.filter(s => s.type === type).length}</p>
            </div>
          ))}
        </div>

        {presets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-slate-500">保存済フィルタ:</span>
            {presets.map((preset) => (
              <span key={preset.name} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-0.5 text-xs">
                <button onClick={() => handleApplyPreset(applyPreset(preset))} className="hover:underline">{preset.name}</button>
                <button onClick={() => deletePreset(preset.name)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Filters & actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="業者名・担当者で検索"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての種別</option>
            {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {hasActiveFilter && (
            <button
              onClick={handleSaveFilter}
              className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              フィルタを保存
            </button>
          )}
          <a
            href="/api/export?type=suppliers"
            download
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> CSV出力
          </a>
          <a
            href="/api/export/templates/suppliers"
            download
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> テンプレート
          </a>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> CSVインポート
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 業者を追加
          </button>
        </div>
        {importMessage && (
          <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {importMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">業者が登録されていません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
              <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s.type}</span>
                      {s._count.orders > 0 && (
                        <span className="text-xs text-slate-400">発注 {s._count.orders}件</span>
                      )}
                    </div>
                    <Link href={`/suppliers/${s.id}`} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                      {s.name}
                    </Link>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1 text-slate-300 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {s.contact && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.contact}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${s.phone}`} className="hover:text-blue-600">{s.phone}</a>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`mailto:${s.email}`} className="hover:text-blue-600 truncate">{s.email}</a>
                    </div>
                  )}
                  {s.address && (
                    <p className="text-slate-500 text-xs mt-1">{s.address}</p>
                  )}
                  {s.notes && (
                    <p className="text-slate-400 text-xs border-t border-slate-100 pt-1.5 mt-1.5">{s.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <CsvImportModal
          title="協力会社・業者"
          importApiUrl="/api/suppliers/import"
          templateApiUrl="/api/export/templates/suppliers"
          expectedColumns={['業者名', '種別', '住所', '電話番号', 'メールアドレス', '担当者名', '備考']}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{editTarget ? '業者を編集' : '業者を追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">業者名 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="株式会社○○"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">種別</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者名</label>
                  <input
                    type="text"
                    value={form.contact}
                    onChange={e => setForm({ ...form, contact: e.target.value })}
                    placeholder="山田 太郎"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="03-0000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="info@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">住所</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 mt-1">建設業許可</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">許可番号</label>
                  <input
                    type="text"
                    value={form.licenseNumber}
                    onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder="国土交通大臣許可（特-00）第○○○○○号"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">許可業種</label>
                  <input
                    type="text"
                    value={form.licenseType}
                    onChange={e => setForm({ ...form, licenseType: e.target.value })}
                    placeholder="建築工事業・土木工事業など"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">許可有効期限</label>
                  <input
                    type="date"
                    value={form.licenseExpiry}
                    onChange={e => setForm({ ...form, licenseExpiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保険有効期限</label>
                  <input
                    type="date"
                    value={form.insuranceExpiry}
                    onChange={e => setForm({ ...form, insuranceExpiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 mt-1">振込先</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">銀行名</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                    placeholder="○○銀行"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">支店名</label>
                  <input
                    type="text"
                    value={form.bankBranch}
                    onChange={e => setForm({ ...form, bankBranch: e.target.value })}
                    placeholder="○○支店"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">口座番号</label>
                  <input
                    type="text"
                    value={form.bankAccountNumber}
                    onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })}
                    placeholder="1234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">口座名義</label>
                  <input
                    type="text"
                    value={form.bankAccountName}
                    onChange={e => setForm({ ...form, bankAccountName: e.target.value })}
                    placeholder="カブシキガイシャ○○"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  キャンセル
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '保存中...' : editTarget ? '更新する' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
