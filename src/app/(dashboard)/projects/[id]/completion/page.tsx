'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, Circle, ClipboardCheck, Printer,
  Save, AlertTriangle, Calendar, FileText
} from 'lucide-react'

interface CompletionData {
  id: string
  projectId: string
  finalInspectionDone: boolean
  customerAccepted: boolean
  invoiceIssued: boolean
  documentsArchived: boolean
  completedAt: string | null
  notes: string | null
}

interface ProjectInfo {
  id: string
  name: string
  projectNumber: string
  status: string
}

const CHECKLIST_ITEMS = [
  { key: 'finalInspectionDone', label: '最終検査完了', description: '全指摘事項が解決済みであること' },
  { key: 'customerAccepted', label: '施主検収完了', description: '施主様に確認・承認いただいていること' },
  { key: 'invoiceIssued', label: '最終請求書発行済み', description: '完成に伴う最終請求書を発行済みであること' },
  { key: 'documentsArchived', label: '引渡し書類完備', description: '竣工図・保証書など引渡し書類が全て揃っていること' },
] as const

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]['key']

export default function CompletionPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [completion, setCompletion] = useState<CompletionData | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}/completion`).then(r => r.json()),
      fetch(`/api/projects/${projectId}`).then(r => r.json()),
    ]).then(([comp, proj]) => {
      if (comp && !comp.error) {
        setCompletion(comp)
        setNotes(comp.notes || '')
      }
      if (proj && !proj.error) {
        setProject(proj)
      }
    }).finally(() => setLoading(false))
  }, [projectId])

  const handleChecklistToggle = async (key: ChecklistKey) => {
    if (!completion) return
    const newVal = !completion[key]
    const updated = { ...completion, [key]: newVal }
    setCompletion(updated)

    const res = await fetch(`/api/projects/${projectId}/completion`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: newVal }),
    })
    if (!res.ok) {
      setCompletion(completion)
      setError('更新に失敗しました')
    }
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/completion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCompletion(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmComplete = async () => {
    if (!completion) return
    const allDone = CHECKLIST_ITEMS.every(item => completion[item.key])
    if (!allDone) {
      setError('全てのチェック項目を完了してから竣工処理を実行してください')
      return
    }
    if (!confirm('竣工処理を実行しますか？\nプロジェクトのステータスが「竣工」に変更されます。')) return

    setCompleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/completion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmComplete: true, notes }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCompletion(data)

      // Update project status
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: '竣工' }),
      })

      router.push(`/projects/${projectId}`)
    } catch {
      setError('竣工処理に失敗しました')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  const allChecked = completion ? CHECKLIST_ITEMS.every(item => completion[item.key]) : false
  const checkedCount = completion ? CHECKLIST_ITEMS.filter(item => completion[item.key]).length : 0
  const isAlreadyCompleted = !!completion?.completedAt

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              案件詳細に戻る
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-slate-900">竣工処理</h1>
            </div>
          </div>
          <Link
            href={`/projects/${projectId}/handover/print`}
            target="_blank"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            引渡書を印刷
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Project info */}
        {project && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{project.projectNumber}</p>
            <h2 className="text-base font-semibold text-slate-900">{project.name}</h2>
            {project.status && (
              <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {project.status}
              </span>
            )}
          </div>
        )}

        {/* Already completed banner */}
        {isAlreadyCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">竣工処理完了</p>
              <p className="text-xs text-green-700 mt-0.5">
                竣工日：{new Date(completion!.completedAt!).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              完了チェックリスト
            </h3>
            <span className="text-xs text-slate-500">
              {checkedCount} / {CHECKLIST_ITEMS.length} 完了
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
            />
          </div>

          <div className="divide-y divide-slate-100">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = completion?.[item.key] ?? false
              return (
                <button
                  key={item.key}
                  onClick={() => handleChecklistToggle(item.key)}
                  disabled={isAlreadyCompleted}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    checked ? 'bg-green-500' : 'border-2 border-slate-300'
                  }`}>
                    {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${checked ? 'text-slate-700 line-through' : 'text-slate-900'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                  {checked && (
                    <span className="flex-shrink-0 text-xs text-green-600 font-medium">✓ 完了</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              備考・特記事項
            </h3>
          </div>
          <div className="p-5">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isAlreadyCompleted}
              rows={4}
              placeholder="引渡しに関する特記事項、保証内容の補足など..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
            />
            {!isAlreadyCompleted && (
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs transition-opacity ${saved ? 'text-green-600 opacity-100' : 'opacity-0'}`}>
                  保存しました
                </span>
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '備考を保存'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Links to handover docs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            関連ページ
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/handover`}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              引渡し書類一覧
            </Link>
            <Link
              href={`/projects/${projectId}/handover/print`}
              target="_blank"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              工事完了引渡書（印刷）
            </Link>
          </div>
        </div>

        {/* Confirm Complete button */}
        {!isAlreadyCompleted && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className={`rounded-lg p-4 mb-4 ${allChecked ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              {allChecked ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">全ての完了条件が揃いました。竣工処理を実行できます。</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <p className="text-sm text-amber-800">
                    残り {CHECKLIST_ITEMS.length - checkedCount} 項目を完了させてから竣工処理を実行してください。
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleConfirmComplete}
              disabled={!allChecked || completing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              {completing ? '処理中...' : '竣工処理実行'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
