'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils'
import { ArrowLeft, Mail, Phone, MapPin, Edit2, Trash2, Building2, X, Save, TrendingUp, Plus, ClipboardList, FileText, MessageSquare, ExternalLink, ScrollText } from 'lucide-react'

interface AfterServiceRecord {
  id: string
  reportedAt: string
  content: string
  response: string | null
  respondedAt: string | null
  status: string
  project: { id: string; name: string; projectNumber: string } | null
}

type CustomerTab = 'projects' | 'leads' | 'after-service' | 'invoices' | 'inquiries' | 'portal' | 'contracts'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', type: '法人', address: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<CustomerTab>('projects')

  // Contracts state
  const [contracts, setContracts] = useState<any[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)

  // Invoices state
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  // Inquiries state
  const [inquiries, setInquiries] = useState<any[]>([])
  const [inquiriesLoading, setInquiriesLoading] = useState(false)

  // After-service state
  const [afterServiceRecords, setAfterServiceRecords] = useState<AfterServiceRecord[]>([])
  const [afterServiceLoading, setAfterServiceLoading] = useState(false)
  const [showAfterServiceModal, setShowAfterServiceModal] = useState(false)
  const [afterServiceForm, setAfterServiceForm] = useState({
    reportedAt: new Date().toISOString().slice(0, 10),
    content: '',
    projectId: '',
  })
  const [afterServiceSaving, setAfterServiceSaving] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AfterServiceRecord | null>(null)
  const [editRecordForm, setEditRecordForm] = useState({
    content: '',
    response: '',
    respondedAt: '',
    status: '未対応',
  })
  const [showEditRecordModal, setShowEditRecordModal] = useState(false)

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data)
        setEditForm({
          name: data.name || '',
          type: data.type || '法人',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (activeTab === 'after-service') {
      fetchAfterServiceRecords()
    } else if (activeTab === 'invoices') {
      fetchInvoices()
    } else if (activeTab === 'inquiries') {
      fetchInquiries()
    } else if (activeTab === 'contracts') {
      fetchContracts()
    }
  }, [activeTab, params.id])

  const fetchContracts = async () => {
    setContractsLoading(true)
    try {
      const res = await fetch(`/api/customers/${params.id}/contracts`)
      const data = await res.json()
      setContracts(Array.isArray(data) ? data : [])
    } finally {
      setContractsLoading(false)
    }
  }

  const fetchInvoices = async () => {
    setInvoicesLoading(true)
    try {
      const res = await fetch(`/api/invoices?customerId=${params.id}`)
      const data = await res.json()
      setInvoices(Array.isArray(data) ? data : [])
    } finally {
      setInvoicesLoading(false)
    }
  }

  const fetchInquiries = async () => {
    setInquiriesLoading(true)
    try {
      const res = await fetch(`/api/inquiries?customerId=${params.id}`)
      const data = await res.json()
      setInquiries(Array.isArray(data) ? data : [])
    } finally {
      setInquiriesLoading(false)
    }
  }

  const fetchAfterServiceRecords = async () => {
    setAfterServiceLoading(true)
    try {
      const res = await fetch(`/api/after-service?customerId=${params.id}`)
      const data = await res.json()
      setAfterServiceRecords(Array.isArray(data) ? data : [])
    } finally {
      setAfterServiceLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setCustomer((prev: any) => ({ ...prev, ...updated }))
        setShowEdit(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`「${customer?.name}」を削除しますか？`)) return
    const res = await fetch(`/api/customers/${params.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/customers')
    } else {
      const err = await res.json()
      alert(err.error || '削除に失敗しました')
    }
  }

  const handleAddAfterService = async (e: React.FormEvent) => {
    e.preventDefault()
    setAfterServiceSaving(true)
    try {
      const res = await fetch('/api/after-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: params.id,
          reportedAt: afterServiceForm.reportedAt,
          content: afterServiceForm.content,
          projectId: afterServiceForm.projectId || null,
        }),
      })
      if (res.ok) {
        setShowAfterServiceModal(false)
        setAfterServiceForm({ reportedAt: new Date().toISOString().slice(0, 10), content: '', projectId: '' })
        fetchAfterServiceRecords()
      }
    } finally {
      setAfterServiceSaving(false)
    }
  }

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord) return
    setAfterServiceSaving(true)
    try {
      const res = await fetch(`/api/after-service/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editRecordForm.content,
          response: editRecordForm.response || null,
          respondedAt: editRecordForm.respondedAt || null,
          status: editRecordForm.status,
        }),
      })
      if (res.ok) {
        setShowEditRecordModal(false)
        setEditingRecord(null)
        fetchAfterServiceRecords()
      }
    } finally {
      setAfterServiceSaving(false)
    }
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('このアフター対応履歴を削除しますか？')) return
    await fetch(`/api/after-service/${id}`, { method: 'DELETE' })
    fetchAfterServiceRecords()
  }

  const openEditRecord = (record: AfterServiceRecord) => {
    setEditingRecord(record)
    setEditRecordForm({
      content: record.content,
      response: record.response || '',
      respondedAt: record.respondedAt ? record.respondedAt.slice(0, 10) : '',
      status: record.status,
    })
    setShowEditRecordModal(true)
  }

  const getAfterServiceStatusColor = (status: string) => {
    switch (status) {
      case '未対応': return 'bg-red-100 text-red-700'
      case '対応中': return 'bg-yellow-100 text-yellow-700'
      case '完了': return 'bg-green-100 text-green-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="顧客詳細" />
        <div className="p-6 text-center text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div>
        <Header title="顧客詳細" />
        <div className="p-6 text-center text-slate-500">顧客が見つかりません</div>
      </div>
    )
  }

  return (
    <div>
      <Header title={customer.name} />
      <div className="p-6 max-w-4xl">
        <div className="mb-4">
          <Link href="/customers" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> 顧客一覧に戻る
          </Link>
        </div>

        {/* Customer info card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  customer.type === '法人' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {customer.type}
                </span>
                <span className="text-xs text-slate-400">
                  登録日: {formatDate(customer.createdAt)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Edit2 className="w-4 h-4" /> 編集
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 border border-slate-300 hover:border-red-400 hover:text-red-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 削除
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">住所</p>
                  <p className="text-sm text-slate-900">{customer.address}</p>
                </div>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">電話番号</p>
                  <p className="text-sm text-slate-900">{customer.phone}</p>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">メール</p>
                  <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building2 className="w-4 h-4" />
            関連案件
            <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{customer.projects?.length || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TrendingUp className="w-4 h-4" />
            引合履歴
            <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{customer.leads?.length || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab('after-service')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'after-service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ClipboardList className="w-4 h-4" />
            アフター対応
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-4 h-4" />
            請求一覧
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'inquiries' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <MessageSquare className="w-4 h-4" />
            問い合わせ
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'contracts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ScrollText className="w-4 h-4" />
            契約履歴
          </button>
          <button
            onClick={() => setActiveTab('portal')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'portal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ExternalLink className="w-4 h-4" />
            ポータル
          </button>
        </div>

        {/* Related projects tab */}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">関連案件</h3>
              <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {customer.projects?.length || 0}件
              </span>
            </div>
            {!customer.projects?.length ? (
              <div className="p-8 text-center text-slate-500 text-sm">案件がありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">番号</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件名</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">状態</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">着工日</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">竣工予定</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.projects.map((project: any) => (
                      <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-500">{project.projectNumber}</td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">{formatDate(project.startDate)}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">{formatDate(project.deliveryDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Leads tab */}
        {activeTab === 'leads' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">引合履歴</h3>
              <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {customer.leads?.length || 0}件
              </span>
            </div>
            {!customer.leads?.length ? (
              <div className="p-8 text-center text-slate-500 text-sm">引合データがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">案件名</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">ステータス</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">見込金額</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">接触日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.leads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm text-slate-900">{lead.title}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{lead.status}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-700">{lead.estimatedAmount ? formatCurrency(lead.estimatedAmount) : '—'}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">{formatDate(lead.contactDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* After service tab */}
        {activeTab === 'after-service' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">アフター対応履歴</h3>
                <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {afterServiceRecords.length}件
                </span>
              </div>
              <button
                onClick={() => {
                  setAfterServiceForm({ reportedAt: new Date().toISOString().slice(0, 10), content: '', projectId: '' })
                  setShowAfterServiceModal(true)
                }}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                新規追加
              </button>
            </div>

            {afterServiceLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : afterServiceRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">アフター対応履歴がありません</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {afterServiceRecords.map((record) => (
                  <div key={record.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAfterServiceStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                          <span className="text-xs text-slate-500">報告日: {formatDate(record.reportedAt)}</span>
                          {record.project && (
                            <Link href={`/projects/${record.project.id}`} className="text-xs text-blue-600 hover:underline">
                              {record.project.projectNumber} {record.project.name}
                            </Link>
                          )}
                        </div>
                        <p className="text-sm text-slate-900 font-medium mb-1">内容</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{record.content}</p>
                        {record.response && (
                          <>
                            <p className="text-sm text-slate-900 font-medium mb-1">対応内容</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap mb-1">{record.response}</p>
                            {record.respondedAt && (
                              <p className="text-xs text-slate-500">対応日: {formatDate(record.respondedAt)}</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEditRecord(record)}
                          className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded border border-slate-200 hover:border-red-300 transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoices tab */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">請求一覧</h3>
              <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{invoices.length}件</span>
            </div>
            {invoicesLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">請求データがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">請求番号</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">案件名</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">ステータス</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">請求日</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3">
                          <Link href={`/projects/${inv.project?.id}`} className="text-blue-600 hover:underline">
                            {inv.project?.name || '—'}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            inv.status === '入金済' ? 'bg-green-100 text-green-700' :
                            inv.status === '送付済' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{inv.status}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{inv.invoiceDate ? formatDate(inv.invoiceDate) : '—'}</td>
                        <td className="px-5 py-3 text-right text-slate-800 font-medium">{formatCurrency(inv.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Inquiries tab */}
        {activeTab === 'inquiries' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">問い合わせ</h3>
              <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{inquiries.length}件</span>
            </div>
            {inquiriesLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : inquiries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">問い合わせがありません</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {inquiries.map((inq: any) => (
                  <div key={inq.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            inq.status === '完了' ? 'bg-green-100 text-green-700' :
                            inq.status === '対応中' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{inq.status}</span>
                          <span className="text-xs text-slate-400">{formatDate(inq.createdAt)}</span>
                          {inq.source && <span className="text-xs text-slate-400">{inq.source}</span>}
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-1">{inq.subject}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{inq.message}</p>
                        {inq.assignee && (
                          <p className="text-xs text-slate-400 mt-1">担当: {inq.assignee.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contracts tab */}
        {activeTab === 'contracts' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">契約履歴</h3>
              <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{contracts.length}件</span>
            </div>
            {contractsLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : contracts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">契約データがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">契約番号</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">件名</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">案件</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">契約金額</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">契約日</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">工期</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contracts.map((contract: any) => (
                      <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">{contract.contractNumber}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{contract.title}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">
                          {contract.project ? (
                            <Link href={`/projects/${contract.project.id}`} className="text-blue-600 hover:underline">
                              {contract.project.projectNumber} {contract.project.name}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-800 font-medium">
                          {contract.amount != null ? formatCurrency(contract.amount) : '—'}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{contract.signedAt ? formatDate(contract.signedAt) : '—'}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">
                          {contract.startDate ? formatDate(contract.startDate) : '—'}
                          {contract.endDate ? ` 〜 ${formatDate(contract.endDate)}` : ''}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            contract.status === '締結済' ? 'bg-green-100 text-green-700' :
                            contract.status === '作成中' ? 'bg-slate-100 text-slate-600' :
                            contract.status === '承認待ち' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {contract.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Portal tab */}
        {activeTab === 'portal' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
            <ExternalLink className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium mb-2">顧客ポータル</p>
            <p className="text-sm text-slate-500 mb-4">共有リンクの管理や顧客アンケートを行います。</p>
            <Link
              href={`/customers/${params.id}/portal`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              ポータルを開く
            </Link>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">顧客を編集</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">顧客名 *</label>
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
                  <option value="法人">法人</option>
                  <option value="個人">個人</option>
                </select>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '更新する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add After Service Modal */}
      {showAfterServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">アフター対応を追加</h2>
              <button onClick={() => setShowAfterServiceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAfterService} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">報告日 *</label>
                <input
                  type="date"
                  value={afterServiceForm.reportedAt}
                  onChange={(e) => setAfterServiceForm({ ...afterServiceForm, reportedAt: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容 *</label>
                <textarea
                  value={afterServiceForm.content}
                  onChange={(e) => setAfterServiceForm({ ...afterServiceForm, content: e.target.value })}
                  required
                  rows={4}
                  placeholder="対応内容を入力..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">関連案件</label>
                <select
                  value={afterServiceForm.projectId}
                  onChange={(e) => setAfterServiceForm({ ...afterServiceForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {customer.projects?.map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={afterServiceSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {afterServiceSaving ? '保存中...' : '追加する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAfterServiceModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit After Service Record Modal */}
      {showEditRecordModal && editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">アフター対応を編集</h2>
              <button onClick={() => setShowEditRecordModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                <select
                  value={editRecordForm.status}
                  onChange={(e) => setEditRecordForm({ ...editRecordForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="未対応">未対応</option>
                  <option value="対応中">対応中</option>
                  <option value="完了">完了</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容 *</label>
                <textarea
                  value={editRecordForm.content}
                  onChange={(e) => setEditRecordForm({ ...editRecordForm, content: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">対応内容</label>
                <textarea
                  value={editRecordForm.response}
                  onChange={(e) => setEditRecordForm({ ...editRecordForm, response: e.target.value })}
                  rows={3}
                  placeholder="対応した内容を入力..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">対応日</label>
                <input
                  type="date"
                  value={editRecordForm.respondedAt}
                  onChange={(e) => setEditRecordForm({ ...editRecordForm, respondedAt: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={afterServiceSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {afterServiceSaving ? '保存中...' : '更新する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditRecordModal(false)}
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
