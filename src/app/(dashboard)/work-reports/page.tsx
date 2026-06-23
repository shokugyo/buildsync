'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Trash2, ClipboardCheck, Search, Download, FileSpreadsheet, Printer, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface WorkReport {
  id: string
  location?: string | null
  reportDate: string
  content: string
  status: string
  approvedAt?: string | null
  rejectReason?: string | null
  createdAt: string
  workerCount?: number | null
  workHours?: number | null
  weather?: string | null
  materials?: string | null
  equipment?: string | null
  nextDayPlan?: string | null
  comment?: string | null
  project: { id: string; name: string; projectNumber: string }
  reporter: { id: string; name: string; company?: { name: string } | null }
  approver?: { id: string; name: string } | null
}

const defaultForm = {
  projectId: '',
  location: '',
  reportDate: new Date().toISOString().split('T')[0],
  content: '',
  weather: '',
  workerCount: '',
  workHours: '',
  materials: '',
  equipment: '',
  nextDayPlan: '',
  comment: '',
}

function statusBadge(status: string) {
  if (status === '承認済') return 'bg-green-100 text-green-700'
  if (status === '差し戻し') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function statusIcon(status: string) {
  if (status === '承認済') return <CheckCircle className="w-3.5 h-3.5" />
  if (status === '差し戻し') return <XCircle className="w-3.5 h-3.5" />
  return <Clock className="w-3.5 h-3.5" />
}

export default function WorkReportsPage() {
  const [reports, setReports] = useState<WorkReport[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rejectModal, setRejectModal] = useState<{ id: string; label: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/work-reports').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([r, p]) => {
      setReports(Array.isArray(r) ? r : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const filtered = reports.filter(r => {
    if (projectFilter && r.project?.id !== projectFilter) return false
    if (statusFilter && r.status !== statusFilter) return false
    if (search && !r.content.includes(search) && !r.project?.name.includes(search)) return false
    return true
  })

  const openAdd = () => {
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/work-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const report = await res.json()
        setReports(prev => [report, ...prev])
        setShowModal(false)
      } else {
        const err = await res.json()
        setError(err.error || '作成に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この作業報告を削除しますか？')) return
    const res = await fetch(`/api/work-reports/${id}`, { method: 'DELETE' })
    if (res.ok) setReports(prev => prev.filter(r => r.id !== id))
  }

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/work-reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r))
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    const res = await fetch(`/api/work-reports/${rejectModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectReason }),
    })
    if (res.ok) {
      const updated = await res.json()
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r))
      setRejectModal(null)
      setRejectReason('')
    }
  }

  const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500']
  const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div>
      <Header title="作業報告管理" />
      <div className="p-6">
        {/* ページ説明 */}
        <p className="text-sm text-slate-500 mb-4">
          協力会社・職人が提出する作業報告書（F-026）。施工内容・進捗・使用材料を記録します。
        </p>
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="キーワード検索"
              className="px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none bg-white"
          >
            <option value="">すべての案件</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none bg-white"
          >
            <option value="">すべてのステータス</option>
            <option value="提出済">提出済</option>
            <option value="承認済">承認済</option>
            <option value="差し戻し">差し戻し</option>
          </select>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/api/export/work-reports"
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> CSV
            </a>
            <a
              href="/api/export/work-reports/xlsx"
              className="flex items-center gap-1.5 bg-white border border-green-200 hover:bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </a>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 報告を作成
            </button>
          </div>
        </div>

        {!loading && (
          <p className="text-sm text-slate-500 mb-3">全{filtered.length}件</p>
        )}

        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-100">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">作業報告がありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(report => {
              const name = report.reporter?.name || ''
              return (
                <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/projects/${report.project?.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {report.project?.name}
                        </Link>
                        <span className="text-xs text-slate-400">{report.project?.projectNumber}</span>
                        {report.location && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{report.location}</span>
                        )}
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(report.status || '提出済')}`}>
                          {statusIcon(report.status || '提出済')}
                          {report.status || '提出済'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.content}</p>
                      {(report.weather || report.workerCount != null || report.workHours != null) && (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {report.weather && (
                            <span className="text-xs text-slate-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded">
                              {report.weather === '晴' ? '☀️' : report.weather === '曇' ? '☁️' : report.weather === '雨' ? '🌧️' : report.weather === '雪' ? '❄️' : '🌦️'} {report.weather}
                            </span>
                          )}
                          {report.workerCount != null && (
                            <span className="text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                              作業人数: {report.workerCount}人
                            </span>
                          )}
                          {report.workHours != null && (
                            <span className="text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                              作業時間: {report.workHours}h
                            </span>
                          )}
                        </div>
                      )}
                      {(report.materials || report.equipment) && (
                        <div className="flex items-start gap-3 mt-1 flex-wrap">
                          {report.materials && (
                            <span className="text-xs text-slate-500">
                              材料: {report.materials.length > 40 ? report.materials.slice(0, 40) + '…' : report.materials}
                            </span>
                          )}
                          {report.equipment && (
                            <span className="text-xs text-slate-500">
                              機材: {report.equipment.length > 40 ? report.equipment.slice(0, 40) + '…' : report.equipment}
                            </span>
                          )}
                        </div>
                      )}
                      {report.rejectReason && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 rounded px-2 py-1">差し戻し理由: {report.rejectReason}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500">{name}</span>
                        {(report.reporter as any)?.company?.name && (
                          <span className="text-xs text-slate-400">（{(report.reporter as any).company.name}）</span>
                        )}
                        <span className="text-xs text-slate-400">{new Date(report.reportDate).toLocaleDateString('ja-JP')}</span>
                        {report.approver && (
                          <span className="text-xs text-slate-400">確認: {report.approver.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(!report.status || report.status === '提出済' || report.status === '差し戻し') && (
                        <>
                          <button
                            onClick={() => handleApprove(report.id)}
                            className="flex items-center gap-1 text-xs text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-2 py-1 rounded-lg"
                            title="承認"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> 承認
                          </button>
                          <button
                            onClick={() => { setRejectModal({ id: report.id, label: report.project?.name }); setRejectReason('') }}
                            className="flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-2 py-1 rounded-lg"
                            title="差し戻し"
                          >
                            <XCircle className="w-3.5 h-3.5" /> 差し戻し
                          </button>
                        </>
                      )}
                      <Link
                        href={`/work-reports/${report.id}/print`}
                        target="_blank"
                        className="text-slate-300 hover:text-blue-500 p-1"
                        title="印刷"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="text-slate-300 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">作業報告を作成</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select
                    value={form.projectId}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">報告日 *</label>
                  <input
                    type="date"
                    value={form.reportDate}
                    onChange={e => setForm({ ...form, reportDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">場所・現場</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="例: 2F 作業場"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">天候</label>
                  <select
                    value={form.weather}
                    onChange={e => setForm({ ...form, weather: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">選択</option>
                    <option value="晴">☀️ 晴</option>
                    <option value="曇">☁️ 曇</option>
                    <option value="雨">🌧️ 雨</option>
                    <option value="雪">❄️ 雪</option>
                    <option value="雨のち晴">🌦️ 雨のち晴</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作業人数（人）</label>
                  <input
                    type="number"
                    min="0"
                    value={form.workerCount}
                    onChange={e => setForm({ ...form, workerCount: e.target.value })}
                    placeholder="例: 5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作業時間（時間）</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.workHours}
                    onChange={e => setForm({ ...form, workHours: e.target.value })}
                    placeholder="例: 8"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">報告内容 *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  required
                  rows={4}
                  placeholder="作業内容、進捗、問題点などを入力"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">使用材料</label>
                <textarea
                  value={form.materials}
                  onChange={e => setForm({ ...form, materials: e.target.value })}
                  rows={2}
                  placeholder="例: コンクリート 2m³、鉄筋 100kg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">使用機材</label>
                <textarea
                  value={form.equipment}
                  onChange={e => setForm({ ...form, equipment: e.target.value })}
                  rows={2}
                  placeholder="例: クレーン×1、バックホウ×2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">翌日予定</label>
                <textarea
                  value={form.nextDayPlan}
                  onChange={e => setForm({ ...form, nextDayPlan: e.target.value })}
                  rows={2}
                  placeholder="翌日の作業予定を入力"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">コメント</label>
                <textarea
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  rows={2}
                  placeholder="その他コメント・申し送り事項"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">
                  {saving ? '送信中...' : '報告する'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">差し戻し</h2>
              <button onClick={() => setRejectModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-3">「{rejectModal.label}」の報告を差し戻します。理由を入力してください。</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="差し戻し理由（任意）"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                差し戻す
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
