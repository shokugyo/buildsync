'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { BookOpen, Plus, Trash2, Printer, X, Users } from 'lucide-react'

interface Project {
  id: string
  name: string
  projectNumber: string
}

interface SafetyEducation {
  id: string
  title: string
  educatedAt: string
  instructor: string | null
  attendees: string
  content: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string } | null
}

function parseAttendees(attendees: string): string[] {
  try {
    const parsed = JSON.parse(attendees)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return attendees.split('\n').filter(Boolean)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

export default function SafetyEducationPage() {
  const [records, setRecords] = useState<SafetyEducation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    projectId: '',
    title: '',
    educatedAt: '',
    instructor: '',
    attendees: '',
    content: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/safety-education')
    if (res.ok) setRecords(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRecords()
    fetch('/api/projects?status=all&limit=200')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data)
        else if (data.projects) setProjects(data.projects)
      })
      .catch(() => {})
  }, [fetchRecords])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/safety-education', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: form.projectId || null,
        title: form.title,
        educatedAt: form.educatedAt,
        instructor: form.instructor || null,
        attendees: form.attendees,
        content: form.content || null,
      }),
    })
    if (res.ok) {
      setShowModal(false)
      setForm({ projectId: '', title: '', educatedAt: '', instructor: '', attendees: '', content: '' })
      fetchRecords()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この教育記録を削除しますか？')) return
    setDeleting(id)
    const res = await fetch(`/api/safety-education/${id}`, { method: 'DELETE' })
    if (res.ok) setRecords((prev) => prev.filter((r) => r.id !== id))
    setDeleting(null)
  }

  const handlePrint = (record: SafetyEducation) => {
    const attendeeList = parseAttendees(record.attendees)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <title>安全教育記録 - ${record.title}</title>
        <style>
          body { font-family: sans-serif; padding: 32px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #ccc; padding: 8px 12px; font-size: 14px; text-align: left; }
          th { background: #f0f0f0; width: 30%; }
          .attendees { margin-top: 16px; }
          ul { margin: 0; padding-left: 20px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h1>安全教育記録</h1>
        <table>
          <tr><th>教育タイトル</th><td>${record.title}</td></tr>
          <tr><th>実施日</th><td>${formatDate(record.educatedAt)}</td></tr>
          <tr><th>講師</th><td>${record.instructor || '-'}</td></tr>
          <tr><th>案件</th><td>${record.project ? `${record.project.projectNumber} ${record.project.name}` : '-'}</td></tr>
          <tr><th>参加者数</th><td>${attendeeList.length}名</td></tr>
          <tr><th>内容</th><td>${record.content || '-'}</td></tr>
        </table>
        <div class="attendees">
          <strong>参加者一覧</strong>
          <ul>${attendeeList.map((a) => `<li>${a}</li>`).join('')}</ul>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div>
      <Header title="安全教育記録" />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            教育記録を追加
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">読み込み中...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">安全教育記録がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 text-left">教育日</th>
                    <th className="px-4 py-3 text-left">案件</th>
                    <th className="px-4 py-3 text-left">タイトル</th>
                    <th className="px-4 py-3 text-left">講師</th>
                    <th className="px-4 py-3 text-left">参加者数</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => {
                    const attendeeList = parseAttendees(record.attendees)
                    return (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900 whitespace-nowrap">{formatDate(record.educatedAt)}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {record.project ? (
                            <div>
                              <p className="text-slate-900">{record.project.name}</p>
                              <p className="text-xs text-slate-400">{record.project.projectNumber}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{record.title}</td>
                        <td className="px-4 py-3 text-slate-600">{record.instructor || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {attendeeList.length}名
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePrint(record)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="印刷"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              disabled={deleting === record.id}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">教育記録を追加</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">案件を選択（任意）</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  教育タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  実施日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.educatedAt}
                  onChange={(e) => setForm({ ...form, educatedAt: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">講師</label>
                <input
                  type="text"
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  参加者（1行に1名）
                </label>
                <textarea
                  rows={5}
                  value={form.attendees}
                  onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                  placeholder="山田 太郎&#10;鈴木 花子&#10;佐藤 次郎"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">教育内容</label>
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
