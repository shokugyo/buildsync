'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Download, FileText, AlertTriangle, Printer } from 'lucide-react'

type Contract = {
  id: string
  contractNumber: string
  title: string
  contractType: string
  amount?: number
  startDate?: string
  endDate?: string
  signedAt?: string
  fileUrl?: string
  fileName?: string
  status: string
  notes?: string
  projectId?: string
  project?: { id: string; name: string; projectNumber: string }
  customerId?: string
  customer?: { id: string; name: string }
  createdAt: string
}

type Project = { id: string; name: string; projectNumber: string }
type Customer = { id: string; name: string }

const CONTRACT_TYPES = ['工事請負契約', '発注契約', '業務委託', 'その他']
const STATUSES = ['作成中', '締結済', '履行中', '完了', '解約']

const statusColor: Record<string, string> = {
  作成中: 'bg-slate-100 text-slate-700',
  締結済: 'bg-blue-100 text-blue-700',
  履行中: 'bg-green-100 text-green-700',
  完了: 'bg-slate-100 text-slate-500',
  解約: 'bg-red-100 text-red-700',
}

function isExpiringSoon(endDate?: string) {
  if (!endDate) return false
  const diff = new Date(endDate).getTime() - Date.now()
  return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterProject, setFilterProject] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [form, setForm] = useState({
    title: '',
    contractType: '工事請負契約',
    amount: '',
    startDate: '',
    endDate: '',
    signedAt: '',
    fileUrl: '',
    fileName: '',
    status: '作成中',
    notes: '',
    projectId: '',
    customerId: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/contracts').then(r => r.json()),
      fetch('/api/projects?limit=200').then(r => r.json()).catch(() => []),
      fetch('/api/customers').then(r => r.json()).catch(() => []),
    ]).then(([c, p, cu]) => {
      setContracts(Array.isArray(c) ? c : [])
      setProjects(Array.isArray(p) ? p : (p?.projects ?? []))
      setCustomers(Array.isArray(cu) ? cu : [])
      setLoading(false)
    })
  }, [])

  const openAdd = () => {
    setEditingContract(null)
    setForm({ title: '', contractType: '工事請負契約', amount: '', startDate: '', endDate: '', signedAt: '', fileUrl: '', fileName: '', status: '作成中', notes: '', projectId: '', customerId: '' })
    setShowModal(true)
  }

  const openEdit = (c: Contract) => {
    setEditingContract(c)
    setForm({
      title: c.title,
      contractType: c.contractType,
      amount: c.amount != null ? String(c.amount) : '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      signedAt: c.signedAt ? c.signedAt.slice(0, 10) : '',
      fileUrl: c.fileUrl || '',
      fileName: c.fileName || '',
      status: c.status,
      notes: c.notes || '',
      projectId: c.projectId || '',
      customerId: c.customerId || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingContract) {
        const res = await fetch(`/api/contracts/${editingContract.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const updated = await res.json()
          setContracts(prev => prev.map(c => c.id === editingContract.id ? updated : c))
        }
      } else {
        const res = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const created = await res.json()
          setContracts(prev => [created, ...prev])
        }
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Contract) => {
    if (!confirm('この契約書を削除しますか？')) return
    const res = await fetch(`/api/contracts/${c.id}`, { method: 'DELETE' })
    if (res.ok) setContracts(prev => prev.filter(x => x.id !== c.id))
  }

  const filtered = contracts.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false
    if (filterType && c.contractType !== filterType) return false
    if (filterProject && c.projectId !== filterProject) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header title="契約書管理" />
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全種別</option>
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全ステータス</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全案件</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="text-sm text-slate-500 ml-auto">{filtered.length} 件</span>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            契約書を追加
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">契約番号</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">タイトル</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">種別</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">顧客/協力会社</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">金額</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">開始日</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">終了日</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">ファイル</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">契約書がありません</td>
                  </tr>
                ) : (
                  filtered.map(c => {
                    const expiring = isExpiringSoon(c.endDate)
                    return (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-700">{c.contractNumber}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {expiring && (
                              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" aria-label="30日以内に期限切れ" />
                            )}
                            <button
                              onClick={() => openEdit(c)}
                              className="text-slate-800 hover:text-blue-600 font-medium text-left"
                            >
                              {c.title}
                            </button>
                          </div>
                          {c.project && (
                            <p className="text-xs text-slate-400 mt-0.5">{c.project.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.contractType}</td>
                        <td className="px-4 py-3 text-slate-600">{c.customer?.name || '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {c.amount != null ? `¥${c.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.startDate ? new Date(c.startDate).toLocaleDateString('ja-JP') : '—'}
                        </td>
                        <td className={`px-4 py-3 ${expiring ? 'text-orange-600 font-medium' : 'text-slate-600'}`}>
                          {c.endDate ? new Date(c.endDate).toLocaleDateString('ja-JP') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[c.status] || 'bg-slate-100 text-slate-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.fileUrl ? (
                            <a
                              href={c.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {c.fileName || 'ダウンロード'}
                            </a>
                          ) : (
                            <span className="text-slate-300 text-xs flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              なし
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(`/contracts/${c.id}/print`, '_blank')}
                              className="text-slate-400 hover:text-blue-600"
                              title="印刷"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">{editingContract ? '契約書を編集' : '契約書を追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="契約書のタイトル"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">種別 <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={form.contractType}
                    onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">金額</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">終了日</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">締結日</label>
                <input
                  type="date"
                  value={form.signedAt}
                  onChange={e => setForm(f => ({ ...f, signedAt: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">案件</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">顧客</label>
                <select
                  value={form.customerId}
                  onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ファイルURL</label>
                  <input
                    value={form.fileUrl}
                    onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ファイル名</label>
                  <input
                    value={form.fileName}
                    onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contract.pdf"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : (editingContract ? '更新' : '作成')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
