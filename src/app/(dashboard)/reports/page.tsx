'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatDate } from '@/lib/utils'
import { FileText, Plus, X, Edit2, Trash2, Download, Printer, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

interface Report {
  id: string
  workDate: string
  weather?: string | null
  content: string
  workers?: number | null
  progress?: string | null
  issues?: string | null
  nextPlan?: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  reporter: { name: string; company?: { name: string } | null }
}

const WEATHERS = ['晴れ', '曇り', '雨', '雪', '強風']
const REPORT_TABS = ['新規', '完了', '報告', '一括出力'] as const

const BATCH_REPORTS = [
  { id: 'schedules', label: '工程表', url: (pid: string) => `/api/export/schedules?projectId=${pid}` },
  { id: 'photos', label: '写真台帳', url: (pid: string) => `/api/export/photos?projectId=${pid}` },
  { id: 'costs', label: '原価管理表', url: (pid: string) => `/api/export/costs?projectId=${pid}` },
  { id: 'orders', label: '発注一覧', url: (pid: string) => `/api/export/orders?projectId=${pid}` },
  { id: 'invoices', label: '請求一覧', url: (pid: string) => `/api/export/invoices?projectId=${pid}` },
]
const PAGE_SIZE = 20

const defaultForm = {
  projectId: '',
  workDate: new Date().toISOString().split('T')[0],
  weather: '晴れ',
  content: '',
  workers: '',
  progress: '',
  issues: '',
  nextPlan: '',
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
]

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [projectFilter, setProjectFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [checkedWeathers, setCheckedWeathers] = useState<Set<string>>(new Set())
  const [appliedProjectFilter, setAppliedProjectFilter] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')
  const [appliedWeathers, setAppliedWeathers] = useState<Set<string>>(new Set())
  const [reportTab, setReportTab] = useState<typeof REPORT_TABS[number]>('新規')
  const [memberFilter, setMemberFilter] = useState('')
  const [appliedMemberFilter, setAppliedMemberFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Report | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  // 一括出力用状態
  const [batchProjectId, setBatchProjectId] = useState('')
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set())
  const [batchLinks, setBatchLinks] = useState<{ id: string; label: string; url: string }[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([r, p]) => {
      setReports(Array.isArray(r) ? r : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const handleSearch = () => {
    setAppliedProjectFilter(projectFilter)
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
    setAppliedWeathers(new Set(checkedWeathers))
    setAppliedMemberFilter(memberFilter)
    setPage(1)
  }

  const clearFilters = () => {
    setProjectFilter('')
    setDateFrom('')
    setDateTo('')
    setCheckedWeathers(new Set())
    setAppliedProjectFilter('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
    setAppliedWeathers(new Set())
    setMemberFilter('')
    setAppliedMemberFilter('')
    setPage(1)
  }

  const reporterNames = Array.from(new Set(reports.map((r) => r.reporter?.name).filter(Boolean))) as string[]

  const filtered = reports
    .filter((r) => {
      if (appliedProjectFilter && r.project?.id !== appliedProjectFilter) return false
      if (appliedDateFrom && r.workDate.split('T')[0] < appliedDateFrom) return false
      if (appliedDateTo && r.workDate.split('T')[0] > appliedDateTo) return false
      if (appliedWeathers.size > 0 && r.weather && !appliedWeathers.has(r.weather)) return false
      if (appliedMemberFilter && r.reporter?.name !== appliedMemberFilter) return false
      return true
    })
    .sort((a, b) => {
      const aDate = new Date(a.workDate).getTime()
      const bDate = new Date(b.workDate).getTime()
      return sortOrder === 'desc' ? bDate - aDate : aDate - bDate
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openAdd = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEdit = (r: Report) => {
    setEditTarget(r)
    setForm({
      projectId: r.project.id,
      workDate: r.workDate.split('T')[0],
      weather: r.weather || '晴れ',
      content: r.content,
      workers: r.workers != null ? String(r.workers) : '',
      progress: r.progress || '',
      issues: r.issues || '',
      nextPlan: r.nextPlan || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editTarget ? `/api/reports/${editTarget.id}` : '/api/reports'
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const report = await res.json()
        if (editTarget) {
          setReports((prev) => prev.map((r) => (r.id === report.id ? report : r)))
        } else {
          setReports((prev) => [report, ...prev])
        }
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この日報を削除しますか？')) return
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    if (res.ok) setReports((prev) => prev.filter((r) => r.id !== id))
  }

  const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div>
      <Header title="社内報告管理" />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-slate-200 mb-4">
          {REPORT_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setReportTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                reportTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
          <Link
            href="/reports/custom-builder"
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            カスタムレポート
          </Link>
        </div>

        {/* 一括出力タブコンテンツ */}
        {reportTab === '一括出力' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              帳票バッチ出力（プロジェクト別一括）
            </h3>

            {/* 1. 案件選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">案件を選択</label>
              <select
                value={batchProjectId}
                onChange={(e) => { setBatchProjectId(e.target.value); setBatchLinks([]) }}
                className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">案件を選択してください</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* 2. 帳票種別チェックボックス */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">出力する帳票を選択</label>
              <div className="flex flex-wrap gap-3">
                {BATCH_REPORTS.map((r) => (
                  <label key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${batchSelected.has(r.id) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={batchSelected.has(r.id)}
                      onChange={() => {
                        setBatchSelected(prev => {
                          const next = new Set(prev)
                          if (next.has(r.id)) { next.delete(r.id) } else { next.add(r.id) }
                          return next
                        })
                        setBatchLinks([])
                      }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 3. ダウンロードリンク生成ボタン */}
            <button
              disabled={!batchProjectId || batchSelected.size === 0}
              onClick={() => {
                const links = BATCH_REPORTS
                  .filter(r => batchSelected.has(r.id))
                  .map(r => ({ id: r.id, label: r.label, url: r.url(batchProjectId) }))
                setBatchLinks(links)
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors mb-4"
            >
              ダウンロードリンクを生成
            </button>

            {/* 生成されたリンク一覧 */}
            {batchLinks.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">ダウンロードリンク（{batchLinks.length}件）</p>
                <div className="space-y-2">
                  {batchLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-700">{link.label}</span>
                      <a
                        href={link.url}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        ダウンロード
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top right actions */}
        <div className={`flex justify-end gap-2 mb-4 ${reportTab === '一括出力' ? 'hidden' : ''}`}>
          <a
            href="/api/export/daily-reports"
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            CSV
          </a>
          <a
            href="/api/export/daily-reports/xlsx"
            className="flex items-center gap-1.5 bg-white border border-green-200 hover:bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </a>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            報告作成
          </button>
        </div>

        {/* Filter panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
          {/* Row 0: label */}
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-medium text-slate-500">▲ 報告一覧</label>
          </div>

          {/* Row 1: date range + sort order */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">開始日</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none" />
            </div>
            <span className="text-slate-400 text-xs">〜</span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">終了日</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">順序</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')} className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none bg-white">
                <option value="desc">新しい順</option>
                <option value="asc">古い順</option>
              </select>
            </div>
          </div>

          {/* Row 2: project + weather checkboxes */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">案件</label>
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none bg-white">
                <option value="">案件</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">天候</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {WEATHERS.map((w) => (
                <label key={w} className="flex items-center gap-1 cursor-pointer text-xs text-slate-600">
                  <input type="checkbox" checked={checkedWeathers.has(w)} onChange={() => { const next = new Set(checkedWeathers); next.has(w) ? next.delete(w) : next.add(w); setCheckedWeathers(next) }} className="rounded border-slate-300 text-blue-600" />
                  {w}
                </label>
              ))}
            </div>
          </div>

          {/* Row 3: 担当者 */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">担当者</label>
              <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none bg-white">
                <option value="">すべて</option>
                {reporterNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4: search */}
          <div className="flex items-center gap-2">
            <select className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none bg-white">
              <option>検索条件を選択</option>
            </select>
            <button onClick={handleSearch} className="px-5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium">検索する</button>
            <button onClick={clearFilters} className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded text-xs">クリア</button>
          </div>
        </div>

        {/* Count + pagination */}
        {!loading && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">
              全{filtered.length}件中 {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}〜{Math.min(page * PAGE_SIZE, filtered.length)}件を表示中
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&lt;&lt;</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&lt;</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 text-sm rounded ${page === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600'}`}>{p}</button>
                })}
                {totalPages > 5 && <span className="text-slate-400">...</span>}
                {totalPages > 5 && <button onClick={() => setPage(totalPages)} className="px-3 py-1 text-sm text-slate-500 hover:text-blue-600">{totalPages}</button>}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&gt;</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40">&gt;&gt;</button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-100">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">報告がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_2fr_3fr_auto] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
              <div>報告対象</div>
              <div>報告方法</div>
              <div>報告内容</div>
              <div />
            </div>

            {/* Rows */}
            {paged.map((report) => {
              const reporterName = report.reporter?.name || ''
              const companyName = (report.reporter as any)?.company?.name || ''
              const aColor = avatarColor(reporterName)
              const reportDateStr = new Date(report.workDate).toLocaleString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
              })

              return (
                <div key={report.id} className="grid grid-cols-[1fr_2fr_3fr_auto] gap-0 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {/* Column 1: Project name */}
                  <div className="px-4 py-4 border-r border-slate-100">
                    <Link
                      href={`/projects/${report.project?.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 line-clamp-2"
                    >
                      {report.project?.name || ''}
                    </Link>
                  </div>

                  {/* Column 2: Reporter + method + date */}
                  <div className="px-4 py-4 border-r border-slate-100">
                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-full ${aColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5`}>
                        {reporterName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">日報</span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium">{reporterName}</p>
                        {companyName && <p className="text-xs text-slate-400">（{companyName}）</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{reportDateStr}</p>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Content */}
                  <div className="px-4 py-4 border-r border-slate-100">
                    <div className="space-y-1.5">
                      {report.progress && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-slate-400 flex-shrink-0">報告内容</span>
                          <span className="text-slate-600">{report.progress}</span>
                        </div>
                      )}
                      {report.content && (
                        <p className="text-sm text-slate-700 line-clamp-2">{report.content}</p>
                      )}
                      {report.workers != null && (
                        <p className="text-xs text-slate-500">作業員数：{report.workers}名</p>
                      )}
                      {report.issues && (
                        <p className="text-xs text-red-500">課題：{report.issues}</p>
                      )}
                    </div>
                    {/* Photo thumbnails section */}
                    <div className="mt-2">
                      <p className="text-xs text-slate-400 mb-1">報告内の写真</p>
                      <div className="flex gap-1 flex-wrap">
                        {(report as any).photos?.slice(0, 8).map((photo: any, i: number) => (
                          <img key={i} src={photo.url} alt="" className="w-12 h-10 object-cover rounded border border-slate-200" />
                        ))}
                        {(!((report as any).photos?.length) ) && (
                          <span className="text-xs text-slate-300 italic">写真なし</span>
                        )}
                      </div>
                      {(report as any).photos?.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">合計 {(report as any).photos.length}枚</p>
                      )}
                    </div>
                  </div>

                  {/* Column 4: Actions */}
                  <div className="px-3 py-4 flex flex-col items-end gap-2 justify-center">
                    <Link
                      href={`/reports/${report.id}/print`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded whitespace-nowrap"
                    >
                      <Printer className="w-3 h-3" /> PDF出力
                    </Link>
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-xs px-2.5 py-1 border border-blue-200 hover:bg-blue-50 text-blue-600 rounded"
                    >
                      詳細
                    </Link>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{editTarget ? '日報を編集' : '日報を作成'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    required
                    disabled={!!editTarget}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  >
                    <option value="">選択</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作業日 *</label>
                  <input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">天気</label>
                  <select value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {WEATHERS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作業員数</label>
                  <input type="number" value={form.workers} onChange={(e) => setForm({ ...form, workers: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">作業内容 *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">進捗状況</label>
                <input type="text" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="予定通り/遅れ等" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">問題・課題</label>
                <textarea value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">翌日の予定</label>
                <input type="text" value={form.nextPlan} onChange={(e) => setForm({ ...form, nextPlan: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">
                  {saving ? '保存中...' : editTarget ? '更新する' : '作成する'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
