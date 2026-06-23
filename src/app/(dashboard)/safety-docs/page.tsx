'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import { Plus, X, Download, Filter, ShieldCheck, AlertTriangle, CheckCircle, Clock, FileDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const SAFETY_TYPES = [
  '再下請通知書',
  '作業員名簿',
  '持込機械等使用届',
  '安全衛生計画書',
  '緊急連絡表',
  '安全書類その他',
]

const SAFETY_DOC_CATEGORIES = [
  { id: 'resubcontract', label: '再下請通知書', required: true },
  { id: 'worker_list', label: '作業員名簿', required: true },
  { id: 'safety_plan', label: '安全計画書', required: true },
  { id: 'toolbox_meeting', label: 'KY（危険予知）活動記録', required: false },
  { id: 'near_miss', label: 'ヒヤリハット報告書', required: false },
  { id: 'equipment_check', label: '機械設備点検表', required: false },
  { id: 'health_check', label: '健康診断証明書', required: false },
  { id: 'insurance', label: '労災保険加入証明', required: true },
]

interface SafetyDoc {
  id: string
  name: string
  category: string
  filePath: string
  description?: string | null
  createdAt: string
  project: { id?: string; name: string; projectNumber: string }
  uploader: { name: string }
}

interface Project {
  id: string
  name: string
  projectNumber: string
}

const defaultForm = {
  projectId: '',
  name: '',
  category: SAFETY_TYPES[0],
  version: '1.0',
  notes: '',
}

// カテゴリIDからラベルへのマッピング
const CATEGORY_LABEL_TO_ID: Record<string, string> = {
  '再下請通知書': 'resubcontract',
  '作業員名簿': 'worker_list',
  '安全衛生計画書': 'safety_plan',
  '安全計画書': 'safety_plan',
  '持込機械等使用届': 'equipment_check',
  '緊急連絡表': 'near_miss',
  '安全書類その他': 'near_miss',
}

type DocStatus = 'submitted' | 'expired' | 'missing'

function getDocStatus(doc: SafetyDoc | undefined): DocStatus {
  if (!doc) return 'missing'
  // 90日以上前は期限切れとみなす
  const createdAt = new Date(doc.createdAt)
  const now = new Date()
  const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays > 90) return 'expired'
  return 'submitted'
}

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle className="w-3 h-3" /> 提出済
      </span>
    )
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
        <Clock className="w-3 h-3" /> 期限切れ
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
      <X className="w-3 h-3" /> 未提出
    </span>
  )
}

export default function SafetyDocsPage() {
  const [docs, setDocs] = useState<SafetyDoc[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showCategoryPanel, setShowCategoryPanel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/documents').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([d, p]) => {
      const allDocs: SafetyDoc[] = Array.isArray(d) ? d : []
      setDocs(allDocs.filter((doc) => SAFETY_TYPES.includes(doc.category)))
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const safetyDocs = docs.filter((doc) => {
    if (projectFilter && doc.project?.name !== projectFilter) return false
    if (typeFilter && doc.category !== typeFilter) return false
    return true
  })

  const now = new Date()
  const thisMonthCount = docs.filter((doc) => {
    const d = new Date(doc.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const uniqueProjectCount = Array.from(new Set(docs.map((d) => d.project?.name))).filter(Boolean).length

  // 必須書類の未提出件数を計算（案件ごとにカテゴリの提出状況を確認）
  const requiredCategories = SAFETY_DOC_CATEGORIES.filter((c) => c.required)

  // 案件ごとの必須書類提出状況を集計
  const projectNames = Array.from(new Set(docs.map((d) => d.project?.name).filter(Boolean))) as string[]
  let totalMissingRequired = 0
  for (const projectName of projectNames) {
    const projectDocs = docs.filter((d) => d.project?.name === projectName)
    for (const cat of requiredCategories) {
      const found = projectDocs.find((d) => {
        const docCatId = CATEGORY_LABEL_TO_ID[d.category]
        return docCatId === cat.id
      })
      if (!found) totalMissingRequired++
    }
  }
  // 案件が0件でも全カテゴリ×必須のアラート
  const hasProjectsButMissing = projectNames.length > 0 && totalMissingRequired > 0

  // カテゴリパネル用: 選択案件のドキュメントとカテゴリステータスを集計
  const selectedProjectDocs = projectFilter
    ? docs.filter((d) => d.project?.name === projectFilter)
    : docs

  const getCategoryStatus = (categoryId: string): DocStatus => {
    const found = selectedProjectDocs.find((d) => {
      const docCatId = CATEGORY_LABEL_TO_ID[d.category]
      return docCatId === categoryId
    })
    return getDocStatus(found)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.projectId || !form.name) { setError('案件と書類名は必須です'); return }
    setSaving(true)
    setError('')
    try {
      let filePath = ''
      if (selectedFile) {
        const fd = new FormData()
        fd.append('file', selectedFile)
        const uploadRes = await fetch('/api/upload/safety', { method: 'POST', body: fd })
        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          setError(err.error || 'ファイルアップロードに失敗しました')
          setSaving(false)
          return
        }
        const uploadData = await uploadRes.json()
        filePath = uploadData.filePath
      } else {
        filePath = `/uploads/safety/doc_${Date.now()}.pdf`
      }
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: form.projectId,
          name: form.name,
          category: form.category,
          filePath,
          description: form.notes ? `版数: ${form.version} / ${form.notes}` : `版数: ${form.version}`,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        if (SAFETY_TYPES.includes(created.category)) {
          setDocs((prev) => [created, ...prev])
        }
        setShowModal(false)
        setForm(defaultForm)
        setSelectedFile(null)
      } else {
        const err = await res.json()
        setError(err.error || '登録に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="安全書類管理" />
      <div className="p-6">

        {/* 必須書類未提出アラート */}
        {hasProjectsButMissing && (
          <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                必須書類が未提出の案件があります
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {projectNames.length}件の案件に対し、必須書類の未提出が合計
                <span className="inline-flex items-center justify-center bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 mx-1">
                  {totalMissingRequired}
                </span>
                件あります。
              </p>
            </div>
            <button
              onClick={() => setShowCategoryPanel((v) => !v)}
              className="text-xs text-amber-700 underline whitespace-nowrap hover:text-amber-900"
            >
              {showCategoryPanel ? '閉じる' : '詳細を確認'}
            </button>
          </div>
        )}

        {/* 書類カテゴリパネル */}
        {showCategoryPanel && (
          <div className="mb-5 bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">書類カテゴリ別提出状況</h3>
              <p className="text-xs text-slate-400">
                {projectFilter ? `案件: ${projectFilter}` : 'すべての案件（集計）'}
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {SAFETY_DOC_CATEGORIES.map((cat) => {
                const status = getCategoryStatus(cat.id)
                return (
                  <div key={cat.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-800">{cat.label}</span>
                      {cat.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">必須</span>
                      )}
                    </div>
                    <StatusBadge status={status} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">安全書類総数</p>
                <p className="text-2xl font-bold text-slate-900">{docs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-lg p-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">案件別登録数</p>
                <p className="text-2xl font-bold text-slate-900">{uniqueProjectCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 rounded-lg p-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">今月登録数</p>
                <p className="text-2xl font-bold text-slate-900">{thisMonthCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Add button */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての案件</option>
              {projectNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての種別</option>
            {SAFETY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/api/export/safety?type=roster"
              download
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors font-medium"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              作業員名簿（CSV）
            </a>
            <a
              href="/api/export/safety?type=ky"
              download
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors font-medium"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              KY活動記録（CSV）
            </a>
            <button
              onClick={() => { setShowModal(true); setError('') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> 安全書類を追加
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">{safetyDocs.length}件</p>

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : safetyDocs.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">安全書類がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 text-left">書類種別</th>
                    <th className="px-4 py-3 text-left">書類名</th>
                    <th className="px-4 py-3 text-left">案件名</th>
                    <th className="px-4 py-3 text-left">登録者</th>
                    <th className="px-4 py-3 text-left">版数</th>
                    <th className="px-4 py-3 text-left">ステータス</th>
                    <th className="px-4 py-3 text-left">登録日</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safetyDocs.map((doc) => {
                    const versionMatch = doc.description?.match(/版数: ([^\s/]+)/)
                    const version = versionMatch ? versionMatch[1] : '-'
                    const status = getDocStatus(doc)
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {doc.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{doc.name}</td>
                        <td className="px-4 py-3 text-slate-600">{doc.project?.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{doc.uploader?.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{version}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(doc.createdAt)}</td>
                        <td className="px-4 py-3">
                          <a
                            href={doc.filePath}
                            download
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> DL
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">安全書類を追加</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 <span className="text-red-500">*</span></label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">書類種別</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SAFETY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">書類名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="書類名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">版数</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="備考"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ファイル</label>
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    {selectedFile ? (
                      <p className="text-sm text-slate-700">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm text-slate-500">クリックしてファイルを選択</p>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    {saving ? '登録中...' : '登録する'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
    </div>
  )
}
