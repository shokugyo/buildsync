'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Play, Clock, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react'

const LEFT_MENU = [
  { label: 'プロフィール情報', href: '/settings' },
  { label: '通知設定', href: '/settings/notifications' },
  { label: 'セキュリティ（2FA）', href: '/settings/security' },
  { label: 'ログイン履歴', href: '/settings/sessions' },
  { label: '自社情報', href: '/settings/company' },
  { label: 'インボイス設定', href: '/settings/invoice' },
  { label: '料金プラン', href: '/settings/plan' },
  { label: 'Webhook設定', href: '/settings/webhooks' },
  { label: 'APIキー', href: '/settings/api-keys' },
  { label: '外部連携', href: '/settings/integrations' },
  { label: 'SSO設定', href: '/settings/sso' },
  { label: 'データエクスポート', href: '/settings/data-export' },
  { label: 'バッチ処理', href: '/settings/batch' },
  { label: '言語設定', href: '/settings/language' },
]

const BATCH_JOBS = [
  { id: 'monthly-report', name: '月次レポート生成', description: '全案件の月次サマリーを生成', schedule: '毎月1日 09:00', lastRun: null },
  { id: 'invoice-reminder', name: '請求書リマインダー', description: '未払い請求書のリマインドメール送信', schedule: '毎週月曜 10:00', lastRun: null },
  { id: 'data-cleanup', name: 'データクリーンアップ', description: '90日以上前の一時データを削除', schedule: '毎日 03:00', lastRun: null },
  { id: 'backup', name: 'データバックアップ', description: 'データベースの自動バックアップ', schedule: '毎日 02:00', lastRun: null },
]

interface JobResult {
  success: boolean
  message: string
  processed: number
  duration: number
}

interface JobState {
  enabled: boolean
  running: boolean
  result: JobResult | null
  error: string | null
}

function getNextRun(schedule: string): string {
  const now = new Date()
  if (schedule.startsWith('毎月')) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0)
    return next.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  if (schedule.startsWith('毎週')) {
    const daysUntilMonday = ((1 - now.getDay() + 7) % 7) || 7
    const next = new Date(now)
    next.setDate(now.getDate() + daysUntilMonday)
    next.setHours(10, 0, 0, 0)
    return next.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  // 毎日
  const hour = parseInt(schedule.replace('毎日 ', '').split(':')[0])
  const next = new Date(now)
  next.setDate(now.getDate() + 1)
  next.setHours(hour, 0, 0, 0)
  return next.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BatchPage() {
  const pathname = usePathname()
  const [jobStates, setJobStates] = useState<Record<string, JobState>>(() =>
    Object.fromEntries(
      BATCH_JOBS.map(job => [job.id, { enabled: true, running: false, result: null, error: null }])
    )
  )

  // Load enabled state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    setJobStates(prev => {
      const next = { ...prev }
      BATCH_JOBS.forEach(job => {
        const stored = localStorage.getItem(`batch_enabled_${job.id}`)
        if (stored !== null) {
          next[job.id] = { ...next[job.id], enabled: stored === 'true' }
        }
      })
      return next
    })
  }, [])

  const toggleJob = (jobId: string) => {
    setJobStates(prev => {
      const newEnabled = !prev[jobId].enabled
      if (typeof window !== 'undefined') {
        localStorage.setItem(`batch_enabled_${jobId}`, String(newEnabled))
      }
      return { ...prev, [jobId]: { ...prev[jobId], enabled: newEnabled } }
    })
  }

  const runJob = async (jobId: string) => {
    setJobStates(prev => ({
      ...prev,
      [jobId]: { ...prev[jobId], running: true, result: null, error: null },
    }))

    try {
      const res = await fetch('/api/batch/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setJobStates(prev => ({
          ...prev,
          [jobId]: { ...prev[jobId], running: false, error: data.error || '実行に失敗しました' },
        }))
      } else {
        setJobStates(prev => ({
          ...prev,
          [jobId]: { ...prev[jobId], running: false, result: data },
        }))
      }
    } catch {
      setJobStates(prev => ({
        ...prev,
        [jobId]: { ...prev[jobId], running: false, error: 'ネットワークエラーが発生しました' },
      }))
    }
  }

  return (
    <div>
      <Header title="設定" />
      <div className="flex min-h-screen">
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">設定</p>
          <ul className="space-y-0.5">
            {LEFT_MENU.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    pathname === item.href ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              バッチ処理
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">定期実行ジョブの管理と手動実行ができます</p>
          </div>

          <div className="space-y-4">
            {BATCH_JOBS.map(job => {
              const state = jobStates[job.id]
              return (
                <div key={job.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">{job.name}</h3>
                        <button
                          onClick={() => toggleJob(job.id)}
                          className="flex items-center gap-1 text-xs transition-colors"
                          title={state.enabled ? '無効化する' : '有効化する'}
                        >
                          {state.enabled ? (
                            <ToggleRight className="w-5 h-5 text-blue-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                          <span className={state.enabled ? 'text-blue-600' : 'text-slate-400'}>
                            {state.enabled ? '有効' : '無効'}
                          </span>
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{job.description}</p>
                    </div>
                    <button
                      onClick={() => runJob(job.id)}
                      disabled={state.running || !state.enabled}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors ml-4 flex-shrink-0"
                    >
                      <Play className={`w-3.5 h-3.5 ${state.running ? 'animate-pulse' : ''}`} />
                      {state.running ? '実行中...' : '今すぐ実行'}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      スケジュール: {job.schedule}
                    </span>
                    <span>次回実行予定: {getNextRun(job.schedule)}</span>
                  </div>

                  {state.result && (
                    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${state.result.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                      {state.result.success ? (
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p>{state.result.message}</p>
                        <p className="text-xs mt-0.5 opacity-75">
                          処理件数: {state.result.processed}件 / 実行時間: {state.result.duration}ms
                        </p>
                      </div>
                    </div>
                  )}

                  {state.error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{state.error}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
