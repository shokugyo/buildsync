'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Printer, Edit2, Save, X } from 'lucide-react'

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
  reporter: { name: string }
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    workDate: '', weather: '', content: '', workers: '',
    progress: '', issues: '', nextPlan: '',
  })

  useEffect(() => {
    fetch(`/api/reports/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setReport(data)
        setForm({
          workDate: data.workDate?.split('T')[0] || '',
          weather: data.weather || '',
          content: data.content || '',
          workers: data.workers != null ? String(data.workers) : '',
          progress: data.progress || '',
          issues: data.issues || '',
          nextPlan: data.nextPlan || '',
        })
        setLoading(false)
      })
  }, [params.id])

  const handleSave = async () => {
    if (!report) return
    setSaving(true)
    const res = await fetch(`/api/reports/${report.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const updated = await res.json()
      setReport(updated)
      setEditing(false)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!report) return <div className="p-8 text-center">日報が見つかりません</div>

  return (
    <div>
      <Header title="日報詳細" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex gap-2">
            <Link
              href={`/reports/${report.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              印刷
            </Link>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                編集
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 border border-slate-300 px-3 py-1.5 rounded-lg text-sm"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Header info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/projects/${report.project?.id}`} className="text-blue-600 hover:underline font-semibold text-lg">
                {report.project?.name}
              </Link>
              <p className="text-sm text-slate-500 mt-0.5">{report.project?.projectNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-slate-500">作成者</p>
              <p className="font-medium">{report.reporter?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">作業日</p>
              {editing ? (
                <input type="date" value={form.workDate} onChange={e => setForm({ ...form, workDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1 mt-1 text-sm" />
              ) : (
                <p className="font-medium mt-0.5">{formatDate(report.workDate)}</p>
              )}
            </div>
            <div>
              <p className="text-slate-500">天気</p>
              {editing ? (
                <input value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1 mt-1 text-sm" placeholder="晴れ" />
              ) : (
                <p className="font-medium mt-0.5">{report.weather || '—'}</p>
              )}
            </div>
            <div>
              <p className="text-slate-500">作業員数</p>
              {editing ? (
                <input type="number" value={form.workers} onChange={e => setForm({ ...form, workers: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1 mt-1 text-sm" />
              ) : (
                <p className="font-medium mt-0.5">{report.workers != null ? `${report.workers}名` : '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content sections */}
        {[
          { key: 'content', label: '作業内容', value: report.content, formKey: 'content' as const },
          { key: 'progress', label: '進捗状況', value: report.progress, formKey: 'progress' as const },
          { key: 'issues', label: '問題・課題', value: report.issues, formKey: 'issues' as const },
          { key: 'nextPlan', label: '翌日作業予定', value: report.nextPlan, formKey: 'nextPlan' as const },
        ].map(({ key, label, value, formKey }) => (
          <div key={key} className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-3">{label}</h3>
            {editing ? (
              <textarea
                value={form[formKey]}
                onChange={e => setForm({ ...form, [formKey]: e.target.value })}
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{value || '—'}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
