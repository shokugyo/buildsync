'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate, getStatusColor } from '@/lib/utils'
import { CheckSquare, Plus, X, AlertTriangle, Printer, Camera, Search, Download } from 'lucide-react'

interface InspectionItem {
  id: string
  name: string
  result?: string | null
  comment?: string | null
}

interface Defect {
  id: string
  content: string
  status: string
  location?: string | null
  assignee?: { name: string } | null
}

interface Inspection {
  id: string
  name: string
  type: string
  scheduledDate?: string | null
  actualDate?: string | null
  status: string
  notes?: string | null
  approvalStatus?: string | null
  inspectionGroup?: string | null
  sentAt?: string | null
  hasCorrection?: boolean
  project: { id: string; name: string; projectNumber: string; status?: string }
  inspector?: { id: string; name: string } | null
  items: InspectionItem[]
  defects: Defect[]
}

const INSPECTION_TYPES = ['社内検査', '行政検査', '顧客立会検査', '第三者検査']
const INSPECTION_STATUSES = ['未実施', '実施中', '合格', '不合格', '保留']
const ITEM_RESULTS = ['合格', '指摘', '不合格']
const DEFECT_STATUSES = ['未対応', '対応中', '是正完了', '確認済']
const PROJECT_FLOW_TABS = ['初期', '着工前', '進行中', '完工（積算前）', '積算完了', '失注']

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({ projectId: '', name: '', type: '社内検査', scheduledDate: '', inspectorId: '', notes: '' })
  const [saving, setSaving] = useState(false)

  // Filters
  const [flowTab, setFlowTab] = useState('初期')
  const [keyword, setKeyword] = useState('')
  const [filterInspector, setFilterInspector] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [showDetail, setShowDetail] = useState<string | null>(null)

  // Item result edits
  const [itemEdits, setItemEdits] = useState<Record<string, { result: string; comment: string }>>({})
  const [savingItem, setSavingItem] = useState<string | null>(null)
  const [addingDefectTo, setAddingDefectTo] = useState<string | null>(null)
  const [defectForm, setDefectForm] = useState({ content: '', location: '', assigneeId: '', dueDate: '' })
  const [savingDefect, setSavingDefect] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/inspections').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([i, p, u]) => {
      setInspections(Array.isArray(i) ? i : [])
      setProjects(Array.isArray(p) ? p : [])
      setUsers(Array.isArray(u) ? u : [])
      setLoading(false)
    })
  }, [])

  const filtered = inspections.filter((insp) => {
    if (flowTab !== '全て') {
      const status = insp.project?.status || ''
      const flowMap: Record<string, string[]> = {
        '着工前': ['引合', '受注前'],
        '工事中': ['進行中'],
        '完了': ['完了'],
        '完工(最終)': ['完了'],
        '着工完了': ['完了', '中止'],
      }
      const allowed = flowMap[flowTab] || []
      if (!allowed.includes(status)) return false
    }
    if (keyword) {
      const q = keyword.toLowerCase()
      if (!insp.name.toLowerCase().includes(q) && !insp.project?.name.toLowerCase().includes(q)) return false
    }
    if (filterInspector && insp.inspector?.id !== filterInspector) return false
    if (filterStatus && insp.status !== filterStatus) return false
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const insp = await res.json()
        setInspections((prev) => [insp, ...prev])
        setShowModal(false)
        setForm({ projectId: '', name: '', type: '社内検査', scheduledDate: '', inspectorId: '', notes: '' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (inspId: string, status: string) => {
    const res = await fetch(`/api/inspections/${inspId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setInspections((prev) => prev.map((i) => (i.id === inspId ? { ...i, status } : i)))
  }

  const saveItemResult = async (inspId: string, itemId: string) => {
    const edit = itemEdits[itemId]
    if (!edit) return
    setSavingItem(itemId)
    try {
      const insp = inspections.find((i) => i.id === inspId)
      if (!insp) return
      const updatedItems = insp.items.map((item) => item.id === itemId ? { ...item, ...edit } : item)
      const res = await fetch(`/api/inspections/${inspId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems }),
      })
      if (res.ok) {
        setInspections((prev) => prev.map((i) => (i.id === inspId ? { ...i, items: updatedItems } : i)))
        setItemEdits((prev) => { const next = { ...prev }; delete next[itemId]; return next })
      }
    } finally {
      setSavingItem(null)
    }
  }

  const handleAddDefect = async (inspId: string, projectId: string) => {
    if (!defectForm.content.trim()) return
    setSavingDefect(true)
    try {
      const res = await fetch('/api/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, inspectionId: inspId, content: defectForm.content, location: defectForm.location || undefined, assigneeId: defectForm.assigneeId || undefined, dueDate: defectForm.dueDate || undefined }),
      })
      if (res.ok) {
        const defect = await res.json()
        setInspections((prev) => prev.map((i) => (i.id === inspId ? { ...i, defects: [...i.defects, defect] } : i)))
        setAddingDefectTo(null)
        setDefectForm({ content: '', location: '', assigneeId: '', dueDate: '' })
      }
    } finally {
      setSavingDefect(false)
    }
  }

  const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500']
  const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div>
      <Header title="BUILDSYNC検査" />
      <div className="p-6">
        {/* Top controls */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">検査一覧</h2>
          <div className="flex items-center gap-2">
            <a
              href="/api/export/inspections"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
            >
              <Download className="w-4 h-4" /> CSV
            </a>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 検査を追加
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-2">
          {/* Row 1: company + favorite */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-xs text-slate-500">案件のお気に入り</span>
            <input
              type="text"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              placeholder="会社名"
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 w-48"
            />
          </div>

          {/* Row 2: flow tabs */}
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-xs text-slate-500 self-center mr-1">案件フロー</span>
            {PROJECT_FLOW_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setFlowTab(tab)}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors border ${
                  flowTab === tab ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Row 3: search fields */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="キーワード検索（案件）"
                className="text-xs outline-none flex-1"
              />
            </div>
            <select
              value={filterInspector}
              onChange={(e) => setFilterInspector(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600"
            >
              <option value="">検査担当者</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600"
            >
              <option value="">検査ステータス</option>
              {INSPECTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => { setKeyword(''); setFilterInspector(''); setFilterStatus('') }}
              className="flex items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg"
            >
              <Search className="w-3.5 h-3.5" /> 検索
            </button>
            <button className="text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg">+ 詳細検索</button>
          </div>
        </div>

        {/* Breadcrumb filter summary */}
        {filterCompany && (
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
            <span>案件の作業会社: <span className="text-slate-700 font-medium">{filterCompany}</span></span>
            <button onClick={() => setFilterCompany('')} className="text-slate-400 hover:text-slate-600">×</button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">検査データがありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 text-left font-medium text-slate-500 w-8">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
                    </th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">検査ステータス</th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">案件名</th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">検査名</th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">検査担当者</th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">検査予定日</th>
                    <th className="py-2 px-3 text-center font-medium text-slate-500 whitespace-nowrap">検査項目数</th>
                    <th className="py-2 px-3 text-center font-medium text-slate-500 whitespace-nowrap">
                      <span className="flex items-center gap-0.5 justify-center"><Camera className="w-3.5 h-3.5" />登録写真枚数</span>
                    </th>
                    <th className="py-2 px-3 text-center font-medium text-slate-500 whitespace-nowrap">検査正件数</th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">承認ステータス</th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">検査グループ</th>
                    <th className="py-2 px-3 text-center font-medium text-slate-500 whitespace-nowrap">是正画所数</th>
                    <th className="py-2 px-3 text-left font-medium text-slate-500 whitespace-nowrap">検査最終更新日</th>
                    <th className="py-2 px-3 text-center font-medium text-slate-500 whitespace-nowrap">検査時の是正依頼</th>
                    <th className="py-2 px-3 text-center font-medium text-slate-500 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((insp) => (
                    <>
                      <tr
                        key={insp.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setShowDetail(showDetail === insp.id ? null : insp.id)}
                      >
                        <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(insp.status)}`}>
                            {insp.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 max-w-[120px]">
                          <p className="text-slate-900 truncate">{insp.project?.name}</p>
                          <p className="text-slate-400 text-[10px]">{insp.project?.projectNumber}</p>
                        </td>
                        <td className="py-2 px-3 max-w-[150px]">
                          <p className="text-slate-900 truncate">{insp.name}</p>
                          <p className="text-slate-400 text-[10px]">{insp.type}</p>
                        </td>
                        <td className="py-2 px-3">
                          {insp.inspector ? (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${getAvatarColor(insp.inspector.name)}`}>
                                {insp.inspector.name[0]}
                              </div>
                              <span className="text-slate-700 truncate max-w-[80px]">{insp.inspector.name}</span>
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">{formatDate(insp.scheduledDate)}</td>
                        <td className="py-2 px-3 text-center text-slate-500">
                          {insp.items.length}/{insp.items.length}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-slate-500 flex items-center gap-0.5 justify-center">
                            <Camera className="w-3 h-3" />0/{insp.items.length}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-slate-400">0件</span>
                        </td>
                        <td className="py-2 px-3">
                          {insp.approvalStatus ? (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded whitespace-nowrap">{insp.approvalStatus}</span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded whitespace-nowrap">未承認(1次)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {insp.inspectionGroup || insp.type || '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-500">
                          {insp.defects.filter((d) => d.status === '是正完了' || d.status === '確認済').length}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {insp.sentAt ? formatDate(insp.sentAt) : insp.scheduledDate ? formatDate(insp.scheduledDate) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${insp.hasCorrection ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {insp.hasCorrection ? '有' : '無'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`/inspections/${insp.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-green-600"
                            title="帳票出力"
                          >
                            <Printer className="w-3.5 h-3.5 inline" />
                          </a>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {showDetail === insp.id && (
                        <tr key={`${insp.id}-detail`}>
                          <td colSpan={15} className="bg-slate-50 px-5 py-4 border-b border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              {/* Status change */}
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs font-medium text-slate-700">検査状態:</span>
                                  <div className="flex gap-1 flex-wrap">
                                    {INSPECTION_STATUSES.map((s) => (
                                      <button key={s} onClick={() => handleStatusChange(insp.id, s)}
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${insp.status === s ? getStatusColor(s) : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                                      >{s}</button>
                                    ))}
                                  </div>
                                </div>
                                <h3 className="text-xs font-medium text-slate-700 mb-2">チェックリスト</h3>
                                {insp.items.length === 0 ? (
                                  <p className="text-xs text-slate-400">項目なし</p>
                                ) : (
                                  <div className="space-y-2">
                                    {insp.items.map((item) => {
                                      const edit = itemEdits[item.id]
                                      const result = edit?.result ?? item.result ?? ''
                                      const comment = edit?.comment ?? item.comment ?? ''
                                      return (
                                        <div key={item.id} className="bg-white rounded p-2 border border-slate-200">
                                          <p className="text-xs text-slate-900 mb-1">{item.name}</p>
                                          <div className="flex gap-1 mb-1">
                                            {ITEM_RESULTS.map((r) => (
                                              <button key={r} onClick={() => setItemEdits((prev) => ({ ...prev, [item.id]: { result: r, comment: edit?.comment ?? item.comment ?? '' } }))}
                                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${result === r ? r === '合格' ? 'bg-green-100 text-green-700' : r === '指摘' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                                              >{r}</button>
                                            ))}
                                          </div>
                                          <input type="text" value={comment} onChange={(e) => setItemEdits((prev) => ({ ...prev, [item.id]: { result: edit?.result ?? item.result ?? '', comment: e.target.value } }))} placeholder="コメント" className="w-full px-2 py-1 text-xs border border-slate-200 rounded" />
                                          {edit && <button onClick={() => saveItemResult(insp.id, item.id)} disabled={savingItem === item.id} className="mt-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">{savingItem === item.id ? '保存中...' : '保存'}</button>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Defects */}
                              <div>
                                <h3 className="text-xs font-medium text-slate-700 mb-2">是正事項</h3>
                                {insp.defects.length === 0 ? <p className="text-xs text-slate-400">是正事項なし</p> : (
                                  <div className="space-y-2">
                                    {insp.defects.map((defect) => (
                                      <div key={defect.id} className="bg-red-50 rounded p-2 border border-red-100">
                                        <p className="text-xs text-red-800 mb-1">{defect.content}</p>
                                        {defect.location && <p className="text-[10px] text-red-600">場所: {defect.location}</p>}
                                        <div className="flex gap-1 mt-1">
                                          {DEFECT_STATUSES.map((s) => (
                                            <button key={s} onClick={() => {
                                              fetch(`/api/defects/${defect.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) })
                                                .then(() => setInspections((prev) => prev.map((i) => i.id === insp.id ? { ...i, defects: i.defects.map((d) => d.id === defect.id ? { ...d, status: s } : d) } : i)))
                                            }}
                                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${defect.status === s ? getStatusColor(s) : 'bg-white border border-slate-200 text-slate-600'}`}
                                            >{s}</button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {addingDefectTo === insp.id ? (
                                  <div className="mt-2 space-y-2 bg-red-50 p-2 rounded border border-red-200">
                                    <input type="text" value={defectForm.content} onChange={(e) => setDefectForm({ ...defectForm, content: e.target.value })} placeholder="是正内容 *" className="w-full px-2 py-1 text-xs border border-red-200 rounded" />
                                    <input type="text" value={defectForm.location} onChange={(e) => setDefectForm({ ...defectForm, location: e.target.value })} placeholder="場所" className="w-full px-2 py-1 text-xs border border-red-200 rounded" />
                                    <div className="flex gap-2">
                                      <button onClick={() => handleAddDefect(insp.id, insp.project.id)} disabled={savingDefect || !defectForm.content.trim()} className="flex-1 text-xs bg-red-600 text-white py-1 rounded">{savingDefect ? '保存中...' : '保存'}</button>
                                      <button onClick={() => setAddingDefectTo(null)} className="flex-1 text-xs bg-white border border-red-200 text-slate-600 py-1 rounded">キャンセル</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => setAddingDefectTo(insp.id)} className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                                    <AlertTriangle className="w-3 h-3" /> 是正事項を追加
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Inspection Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">検査を追加</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">選択してください</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">検査名 *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">検査種別</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {INSPECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">予定日</label>
                  <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <select value={form.inspectorId} onChange={(e) => setForm({ ...form, inspectorId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">選択してください</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">{saving ? '追加中...' : '追加する'}</button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">キャンセル</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
