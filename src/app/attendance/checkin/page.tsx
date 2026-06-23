'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CheckinForm() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const [workerName, setWorkerName] = useState('')
  const [company, setCompany] = useState('')
  const [action, setAction] = useState<'entry' | 'exit'>('entry')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workerName || !projectId) { setError('名前と案件IDが必要です'); return }
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    const payload = {
      projectId,
      workerName,
      company,
      workDate: now.toISOString().slice(0, 10),
      ...(action === 'entry' ? { entryTime: timeStr } : { exitTime: timeStr }),
    }

    const res = await fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      const err = await res.json()
      setError(err.error || 'エラーが発生しました')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">{action === 'entry' ? '✅' : '👋'}</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{action === 'entry' ? '入場記録完了' : '退場記録完了'}</h2>
          <p className="text-slate-600">{workerName} さんの{action === 'entry' ? '入場' : '退場'}を記録しました。</p>
          <p className="text-sm text-slate-400 mt-2">{new Date().toLocaleTimeString('ja-JP')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-lg">
        <h1 className="text-xl font-bold text-slate-900 mb-6 text-center">現場入退場記録</h1>
        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">お名前 *</label>
            <input type="text" value={workerName} onChange={e => setWorkerName(e.target.value)} required className="w-full px-3 py-3 border border-slate-300 rounded-lg text-base" placeholder="山田 太郎" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">所属会社</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full px-3 py-3 border border-slate-300 rounded-lg text-base" placeholder="株式会社○○" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">区分</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAction('entry')} className={`py-3 rounded-lg font-medium text-sm ${action === 'entry' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>入場</button>
              <button type="button" onClick={() => setAction('exit')} className={`py-3 rounded-lg font-medium text-sm ${action === 'exit' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>退場</button>
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-base">記録する</button>
        </form>
      </div>
    </div>
  )
}

export default function CheckinPage() {
  return <Suspense><CheckinForm /></Suspense>
}
