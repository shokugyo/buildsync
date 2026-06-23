'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Printer, ArrowLeft, Plus, X, Save, Camera, Image as ImageIcon } from 'lucide-react'

interface InspectionItem {
  id: string
  name: string
  result?: string | null
  comment?: string | null
  photoUrl?: string | null
}

interface Defect {
  id: string
  content: string
  location?: string | null
  status: string
  dueDate?: string | null
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
  hasCorrection?: boolean
  project: { name: string; projectNumber: string; address?: string | null }
  inspector?: { name: string } | null
  items: InspectionItem[]
  defects: Defect[]
}

const ITEM_RESULTS = ['合格', '指摘', '不合格']
const INSPECTION_STATUSES = ['未実施', '実施中', '合格', '不合格', '保留']
const DEFECT_STATUSES = ['未対応', '対応中', '是正完了', '確認済']

const RESULT_ICONS: Record<string, React.ReactNode> = {
  '合格': <CheckCircle className="w-4 h-4 text-green-500" />,
  '指摘': <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  '不合格': <XCircle className="w-4 h-4 text-red-500" />,
}

const RESULT_COLORS: Record<string, string> = {
  '合格': 'bg-green-100 text-green-700 border-green-200',
  '指摘': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '不合格': 'bg-red-100 text-red-700 border-red-200',
}

const DEFECT_STATUS_COLORS: Record<string, string> = {
  '未対応': 'bg-red-100 text-red-700',
  '対応中': 'bg-yellow-100 text-yellow-700',
  '是正完了': 'bg-blue-100 text-blue-700',
  '確認済': 'bg-green-100 text-green-700',
}

export default function InspectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  // Item result editing
  const [itemEdits, setItemEdits] = useState<Record<string, { result: string; comment: string; photoUrl: string }>>({})
  const [savingItems, setSavingItems] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Status edit
  const [statusEdit, setStatusEdit] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  // Defect form
  const [showDefectForm, setShowDefectForm] = useState(false)
  const [defectForm, setDefectForm] = useState({ content: '', location: '', assigneeId: '', dueDate: '' })
  const [savingDefect, setSavingDefect] = useState(false)

  // Defect status update
  const [updatingDefect, setUpdatingDefect] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/inspections/${id}`).then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([insp, u]) => {
      if (insp && !insp.error) {
        setInspection(insp)
        setStatusEdit(insp.status)
        setActualDate(insp.actualDate ? insp.actualDate.slice(0, 10) : '')
        const edits: Record<string, { result: string; comment: string; photoUrl: string }> = {}
        ;(insp.items || []).forEach((it: InspectionItem) => {
          edits[it.id] = { result: it.result || '', comment: it.comment || '', photoUrl: it.photoUrl || '' }
        })
        setItemEdits(edits)
      }
      setUsers(Array.isArray(u) ? u : [])
      setLoading(false)
    })
  }, [id])

  const handleSaveItems = async () => {
    if (!inspection) return
    setSavingItems(true)
    const items = inspection.items.map((it) => ({
      id: it.id,
      name: it.name,
      result: itemEdits[it.id]?.result || null,
      comment: itemEdits[it.id]?.comment || null,
      photoUrl: itemEdits[it.id]?.photoUrl || null,
    }))
    const res = await fetch(`/api/inspections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (res.ok) {
      const updated = await res.json()
      setInspection((prev) => prev ? { ...prev, items: updated.items || prev.items } : prev)
    }
    setSavingItems(false)
  }

  const handleSaveStatus = async () => {
    setSavingStatus(true)
    const res = await fetch(`/api/inspections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusEdit, actualDate: actualDate || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setInspection((prev) => prev ? { ...prev, status: updated.status, actualDate: updated.actualDate } : prev)
    }
    setSavingStatus(false)
  }

  const handleAddDefect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!defectForm.content) return
    setSavingDefect(true)
    const res = await fetch('/api/defects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectionId: id,
        projectId: inspection?.project ? undefined : undefined,
        content: defectForm.content,
        location: defectForm.location || null,
        assigneeId: defectForm.assigneeId || null,
        dueDate: defectForm.dueDate || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setInspection((prev) =>
        prev ? { ...prev, defects: [created, ...prev.defects] } : prev
      )
      setDefectForm({ content: '', location: '', assigneeId: '', dueDate: '' })
      setShowDefectForm(false)
    }
    setSavingDefect(false)
  }

  const handlePhotoUpload = async (itemId: string, file: File) => {
    setUploadingPhoto(itemId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const { filePath } = await res.json()
        setItemEdits((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], photoUrl: filePath },
        }))
      }
    } finally {
      setUploadingPhoto(null)
    }
  }

  const handleDefectStatus = async (defectId: string, status: string) => {
    setUpdatingDefect(defectId)
    const res = await fetch(`/api/defects/${defectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setInspection((prev) =>
        prev
          ? { ...prev, defects: prev.defects.map((d) => d.id === defectId ? { ...d, status } : d) }
          : prev
      )
    }
    setUpdatingDefect(null)
  }

  if (loading) return <div><Header title="検査詳細" /><div className="p-8 text-center text-slate-500">読み込み中...</div></div>
  if (!inspection) return <div><Header title="検査詳細" /><div className="p-8 text-center text-slate-500">検査が見つかりません</div></div>

  const passCount = inspection.items.filter((it) => (itemEdits[it.id]?.result || it.result) === '合格').length
  const pointCount = inspection.items.filter((it) => (itemEdits[it.id]?.result || it.result) === '指摘').length
  const failCount = inspection.items.filter((it) => (itemEdits[it.id]?.result || it.result) === '不合格').length
  const totalCount = inspection.items.length

  return (
    <div>
      <Header title="検査チェック" />
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back + print */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> 戻る
          </button>
          <a
            href={`/inspections/${id}/print`}
            target="_blank"
            className="ml-auto flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm"
          >
            <Printer className="w-4 h-4" /> 印刷
          </a>
        </div>

        {/* Header info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{inspection.type}</span>
                {inspection.inspectionGroup && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{inspection.inspectionGroup}</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">{inspection.name}</h1>
              <p className="text-sm text-slate-500">{inspection.project.projectNumber} {inspection.project.name}</p>
              {inspection.project.address && <p className="text-xs text-slate-400 mt-0.5">{inspection.project.address}</p>}
            </div>
            <div className="text-right text-sm text-slate-500 shrink-0 space-y-1">
              {inspection.scheduledDate && <p>予定日: {formatDate(inspection.scheduledDate)}</p>}
              {inspection.inspector && <p>検査員: {inspection.inspector.name}</p>}
            </div>
          </div>

          {/* Progress summary */}
          {totalCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-slate-700">合格 <strong>{passCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-slate-700">指摘 <strong>{pointCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-slate-700">不合格 <strong>{failCount}</strong></span>
              </div>
              <div className="text-sm text-slate-400">計 {totalCount} 項目</div>
              <div className="ml-auto">
                <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="bg-green-500 h-full" style={{ width: `${(passCount / totalCount) * 100}%` }} />
                  <div className="bg-yellow-400 h-full" style={{ width: `${(pointCount / totalCount) * 100}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${(failCount / totalCount) * 100}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status update */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">検査ステータス</label>
            <select
              value={statusEdit}
              onChange={(e) => setStatusEdit(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INSPECTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">実施日</label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSaveStatus}
            disabled={savingStatus}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium"
          >
            <Save className="w-4 h-4" /> {savingStatus ? '保存中...' : 'ステータスを更新'}
          </button>
        </div>

        {/* Checklist */}
        {inspection.items.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">チェック項目</h2>
              <button
                onClick={handleSaveItems}
                disabled={savingItems}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
              >
                <Save className="w-3.5 h-3.5" /> {savingItems ? '保存中...' : '結果を保存'}
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {inspection.items.map((it, idx) => {
                const edit = itemEdits[it.id] || { result: '', comment: '' }
                return (
                  <div key={it.id} className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      <div className="text-xs text-slate-400 w-6 mt-1 shrink-0">{idx + 1}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 mb-2">{it.name}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {ITEM_RESULTS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() =>
                                setItemEdits((prev) => ({ ...prev, [it.id]: { ...edit, result: edit.result === r ? '' : r } }))
                              }
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                edit.result === r
                                  ? RESULT_COLORS[r]
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {RESULT_ICONS[r]} {r}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={edit.comment}
                          onChange={(e) =>
                            setItemEdits((prev) => ({ ...prev, [it.id]: { ...edit, comment: e.target.value } }))
                          }
                          placeholder="コメント（任意）"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {/* Photo upload */}
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            ref={(el) => { fileInputRefs.current[it.id] = el }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handlePhotoUpload(it.id, file)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[it.id]?.click()}
                            disabled={uploadingPhoto === it.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-200 rounded hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                          >
                            {uploadingPhoto === it.id ? (
                              <span>アップロード中...</span>
                            ) : (
                              <><Camera className="w-3 h-3" /> 写真を添付</>
                            )}
                          </button>
                          {edit.photoUrl && (
                            <div className="flex items-center gap-1">
                              <a href={edit.photoUrl} target="_blank" rel="noopener noreferrer">
                                <img src={edit.photoUrl} alt="添付写真" className="w-10 h-10 object-cover rounded border border-slate-200 hover:opacity-80 transition-opacity" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setItemEdits((prev) => ({ ...prev, [it.id]: { ...edit, photoUrl: '' } }))}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveItems}
                disabled={savingItems}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
              >
                <Save className="w-4 h-4" /> {savingItems ? '保存中...' : '結果を保存'}
              </button>
            </div>
          </div>
        )}

        {/* Defects */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">指摘・不具合 ({inspection.defects.length}件)</h2>
            <button
              onClick={() => setShowDefectForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> 追加
            </button>
          </div>

          {showDefectForm && (
            <form onSubmit={handleAddDefect} className="px-6 py-4 bg-red-50 border-b border-red-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-red-800">指摘事項を追加</p>
                <button type="button" onClick={() => setShowDefectForm(false)} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={defectForm.content}
                onChange={(e) => setDefectForm({ ...defectForm, content: e.target.value })}
                placeholder="指摘内容 *"
                required
                rows={2}
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={defectForm.location}
                  onChange={(e) => setDefectForm({ ...defectForm, location: e.target.value })}
                  placeholder="場所"
                  className="px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={defectForm.assigneeId}
                  onChange={(e) => setDefectForm({ ...defectForm, assigneeId: e.target.value })}
                  className="px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">担当者未定</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input
                  type="date"
                  value={defectForm.dueDate}
                  onChange={(e) => setDefectForm({ ...defectForm, dueDate: e.target.value })}
                  className="px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowDefectForm(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800">キャンセル</button>
                <button type="submit" disabled={savingDefect} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium">
                  {savingDefect ? '追加中...' : '追加する'}
                </button>
              </div>
            </form>
          )}

          {inspection.defects.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">指摘事項はありません</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inspection.defects.map((defect) => (
                <div key={defect.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{defect.content}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      {defect.location && <span>場所: {defect.location}</span>}
                      {defect.assignee && <span>担当: {defect.assignee.name}</span>}
                      {defect.dueDate && <span>期限: {formatDate(defect.dueDate)}</span>}
                    </div>
                  </div>
                  <select
                    value={defect.status}
                    onChange={(e) => handleDefectStatus(defect.id, e.target.value)}
                    disabled={updatingDefect === defect.id}
                    className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:outline-none shrink-0 ${DEFECT_STATUS_COLORS[defect.status] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {DEFECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {inspection.notes && (
          <div className="mt-4 bg-white rounded-xl border border-slate-200 px-6 py-4">
            <p className="text-xs font-medium text-slate-500 mb-1">備考</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{inspection.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
