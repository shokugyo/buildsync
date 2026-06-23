'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Edit2, Save, X, Printer, Trash2 } from 'lucide-react'

interface NearMiss {
  id: string
  projectId: string
  reporterId: string
  occurredAt: string
  location?: string | null
  situation: string
  cause?: string | null
  countermeasure?: string | null
  severity: string
  status: string
  companyId: string
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  reporter: { id: string; name: string }
}

const SEVERITY_COLORS: Record<string, string> = {
  '低': 'bg-green-100 text-green-700 border border-green-300',
  '中': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  '高': 'bg-red-100 text-red-700 border border-red-300',
}

const STATUS_COLORS: Record<string, string> = {
  '報告済': 'bg-blue-100 text-blue-700',
  '対応中': 'bg-yellow-100 text-yellow-700',
  '対応完了': 'bg-green-100 text-green-700',
}

const STATUSES = ['報告済', '対応中', '対応完了']
const SEVERITIES = ['低', '中', '高']

export default function NearMissDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [nearMiss, setNearMiss] = useState<NearMiss | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<Partial<NearMiss>>({})

  useEffect(() => {
    fetch(`/api/near-misses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setNearMiss(data)
        setForm(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const startEdit = () => {
    setForm({ ...nearMiss })
    setEditing(true)
  }

  const cancelEdit = () => {
    setForm({ ...nearMiss })
    setEditing(false)
  }

  const save = async () => {
    if (!nearMiss) return
    setSaving(true)
    try {
      const res = await fetch(`/api/near-misses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occurredAt: form.occurredAt,
          location: form.location,
          situation: form.situation,
          cause: form.cause,
          countermeasure: form.countermeasure,
          severity: form.severity,
          status: form.status,
        }),
      })
      const updated = await res.json()
      setNearMiss(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (newStatus: string) => {
    if (!nearMiss) return
    const res = await fetch(`/api/near-misses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const updated = await res.json()
    setNearMiss(updated)
  }

  const handleDelete = async () => {
    if (!confirm('このヒヤリハット報告を削除しますか？')) return
    setDeleting(true)
    await fetch(`/api/near-misses/${id}`, { method: 'DELETE' })
    router.push('/safety/near-misses')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="p-8 text-center text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!nearMiss) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="p-8 text-center text-slate-500">データが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/safety/near-misses" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h1 className="text-xl font-bold text-slate-800">ヒヤリハット詳細</h1>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/safety/near-misses/${id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              <Printer className="w-4 h-4" /> 印刷
            </Link>
            {!editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                <Edit2 className="w-4 h-4" /> 編集
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" /> キャンセル
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${SEVERITY_COLORS[nearMiss.severity] || 'bg-slate-100 text-slate-700'}`}>
              重大度: {nearMiss.severity}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[nearMiss.status] || 'bg-slate-100 text-slate-700'}`}>
              {nearMiss.status}
            </span>
          </div>

          {!editing && (
            <div className="flex gap-2 flex-wrap">
              {STATUSES.filter((s) => s !== nearMiss.status).map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className="px-3 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  → {s}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-1">案件</p>
              <p className="font-medium text-slate-800">
                [{nearMiss.project.projectNumber}] {nearMiss.project.name}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">報告者</p>
              <p className="font-medium text-slate-800">{nearMiss.reporter.name}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">発生日時</p>
              {editing ? (
                <input
                  type="datetime-local"
                  value={form.occurredAt ? form.occurredAt.slice(0, 16) : ''}
                  onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
                  className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                />
              ) : (
                <p className="font-medium text-slate-800">
                  {new Date(nearMiss.occurredAt).toLocaleString('ja-JP')}
                </p>
              )}
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">発生場所</p>
              {editing ? (
                <input
                  type="text"
                  value={form.location || ''}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                />
              ) : (
                <p className="font-medium text-slate-800">{nearMiss.location || '-'}</p>
              )}
            </div>
            {editing && (
              <>
                <div>
                  <p className="text-slate-500 text-xs mb-1">重大度</p>
                  <select
                    value={form.severity || '低'}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                  >
                    {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">ステータス</p>
                  <select
                    value={form.status || '報告済'}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div>
            <p className="text-slate-500 text-xs mb-1">状況・内容</p>
            {editing ? (
              <textarea
                value={form.situation || ''}
                onChange={(e) => setForm({ ...form, situation: e.target.value })}
                rows={4}
                className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
              />
            ) : (
              <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{nearMiss.situation}</p>
            )}
          </div>

          <div>
            <p className="text-slate-500 text-xs mb-1">原因</p>
            {editing ? (
              <textarea
                value={form.cause || ''}
                onChange={(e) => setForm({ ...form, cause: e.target.value })}
                rows={3}
                className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
              />
            ) : (
              <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                {nearMiss.cause || '-'}
              </p>
            )}
          </div>

          <div>
            <p className="text-slate-500 text-xs mb-1">対策</p>
            {editing ? (
              <textarea
                value={form.countermeasure || ''}
                onChange={(e) => setForm({ ...form, countermeasure: e.target.value })}
                rows={3}
                className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
              />
            ) : (
              <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                {nearMiss.countermeasure || '-'}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
            登録日時: {new Date(nearMiss.createdAt).toLocaleString('ja-JP')}
          </div>
        </div>
      </div>
    </div>
  )
}
