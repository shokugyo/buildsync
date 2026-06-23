'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, getStatusColor } from '@/lib/utils'
import {
  ArrowLeft, MapPin, Calendar, User, Wrench,
  ClipboardList, AlertTriangle, FileText, StickyNote,
  BarChart2, CheckCircle2, Clock, Phone, ShieldAlert, Edit2, Save, X
} from 'lucide-react'

export default function SiteOverviewPage() {
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [defects, setDefects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSafety, setEditingSafety] = useState(false)
  const [safetyForm, setSafetyForm] = useState({ cautions: '', siteEmergencyContact: '', siteEmergencyPhone: '' })
  const [savingSafety, setSavingSafety] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/schedules?projectId=${id}`).then(r => r.json()),
      fetch(`/api/reports?projectId=${id}`).then(r => r.json()),
      fetch(`/api/defects?projectId=${id}`).then(r => r.json()),
    ]).then(([proj, sched, rep, def]) => {
      const p = proj && !proj.error ? proj : null
      setProject(p)
      setSchedules(Array.isArray(sched) ? sched : [])
      setReports(Array.isArray(rep) ? rep : [])
      setDefects(Array.isArray(def) ? def : [])
      if (p) setSafetyForm({ cautions: p.cautions || '', siteEmergencyContact: p.siteEmergencyContact || '', siteEmergencyPhone: p.siteEmergencyPhone || '' })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div>
        <Header title="現場概要" />
        <div className="p-6 text-center text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        <Header title="現場概要" />
        <div className="p-6 text-center text-slate-500">案件が見つかりません</div>
      </div>
    )
  }

  // Today's schedules
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todaySchedules = schedules.filter(s => {
    const start = new Date(s.startDate)
    const end = new Date(s.endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return start <= today && end >= today
  })

  // Overall progress (average of all schedule progress values)
  const overallProgress = schedules.length > 0
    ? Math.round(schedules.reduce((sum, s) => sum + (s.progress || 0), 0) / schedules.length)
    : 0

  // Pending defects
  const pendingDefects = defects.filter(d => d.status === '未対応')

  const saveSafety = async () => {
    setSavingSafety(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safetyForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setProject((prev: any) => ({ ...prev, ...updated }))
        setEditingSafety(false)
      }
    } finally {
      setSavingSafety(false)
    }
  }

  // Most recent daily report
  const latestReport = reports.length > 0 ? reports[0] : null

  return (
    <div>
      <Header title="現場概要" />
      <div className="p-6 max-w-4xl mx-auto">

        {/* Back link */}
        <div className="mb-4">
          <Link
            href={`/projects/${id}`}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> 案件詳細に戻る
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-slate-500">{project.projectNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
            </div>
          </div>
        </div>

        {/* 基本情報カード */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <MapPin className="w-3.5 h-3.5" /> 現場住所
            </div>
            <p className="text-sm font-medium text-slate-800 leading-snug">{project.address || '-'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <Calendar className="w-3.5 h-3.5" /> 工期
            </div>
            <p className="text-sm font-medium text-slate-800 leading-snug">
              {formatDate(project.startDate)}<br />〜{formatDate(project.endDate)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <User className="w-3.5 h-3.5" /> 担当
            </div>
            <p className="text-sm font-medium text-slate-800">{project.manager?.name || '-'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <Wrench className="w-3.5 h-3.5" /> 工種
            </div>
            <p className="text-sm font-medium text-slate-800">{project.workType || '-'}</p>
          </div>
        </div>

        {/* 今日の作業予定 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-800">今日の作業予定</h3>
            <span className="text-xs text-slate-400 ml-auto">{formatDate(new Date())}</span>
          </div>
          {todaySchedules.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">本日の作業予定はありません</p>
          ) : (
            <ul className="space-y-3">
              {todaySchedules.map(s => (
                <li key={s.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{s.name}</span>
                      {s.assignee && (
                        <span className="text-xs text-slate-400">{s.assignee.name}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{s.progress ?? 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${s.progress ?? 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 工程進捗 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-800">工程進捗</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">全体進捗</span>
                <span className="text-sm font-bold text-blue-600">{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            全{schedules.length}工程の平均進捗
          </p>
        </div>

        {/* 課題・是正 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-slate-800">課題・是正</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-4 flex-1 ${pendingDefects.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
              <p className="text-xs text-slate-500 mb-1">未対応の是正</p>
              <p className={`text-2xl font-bold ${pendingDefects.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {pendingDefects.length}<span className="text-sm font-normal text-slate-400 ml-1">件</span>
              </p>
            </div>
            <Link
              href={`/projects/${id}?tab=defects`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
            >
              是正一覧を見る →
            </Link>
          </div>
        </div>

        {/* 最新日報 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-800">最新日報</h3>
          </div>
          {!latestReport ? (
            <p className="text-sm text-slate-400 py-2">日報はまだ登録されていません</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(latestReport.workDate)}
                </span>
                {latestReport.workers != null && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    作業員 {latestReport.workers}名
                  </span>
                )}
              </div>
              {latestReport.content && (
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 leading-relaxed line-clamp-3">
                  {latestReport.content}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 現場メモ */}
        {project.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-5 h-5 text-yellow-500" />
              <h3 className="text-base font-semibold text-slate-800">現場メモ</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}

        {/* 注意事項・緊急連絡先 (SC-104) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-semibold text-slate-800">注意事項・緊急連絡先</h3>
            <div className="ml-auto flex gap-2">
              {editingSafety ? (
                <>
                  <button onClick={() => setEditingSafety(false)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded-lg">
                    <X className="w-3 h-3" /> キャンセル
                  </button>
                  <button onClick={saveSafety} disabled={savingSafety} className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-lg disabled:opacity-50">
                    <Save className="w-3 h-3" /> {savingSafety ? '保存中...' : '保存'}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditingSafety(true)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded-lg">
                  <Edit2 className="w-3 h-3" /> 編集
                </button>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-500" /> 注意事項
              </p>
              {editingSafety ? (
                <textarea value={safetyForm.cautions} onChange={(e) => setSafetyForm({ ...safetyForm, cautions: e.target.value })}
                  rows={3} placeholder="現場固有の安全注意事項を入力"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-orange-50 rounded-lg p-3 min-h-12">
                  {project.cautions || <span className="text-slate-400">登録されていません</span>}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-red-500" /> 緊急連絡先（氏名・役職）
                </p>
                {editingSafety ? (
                  <input type="text" value={safetyForm.siteEmergencyContact} onChange={(e) => setSafetyForm({ ...safetyForm, siteEmergencyContact: e.target.value })}
                    placeholder="現場責任者 山田 太郎"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <p className="text-sm font-medium text-slate-800">{project.siteEmergencyContact || <span className="text-slate-400">-</span>}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-red-500" /> 緊急連絡先（電話番号）
                </p>
                {editingSafety ? (
                  <input type="tel" value={safetyForm.siteEmergencyPhone} onChange={(e) => setSafetyForm({ ...safetyForm, siteEmergencyPhone: e.target.value })}
                    placeholder="090-0000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <p className="text-sm font-medium text-slate-800">
                    {project.siteEmergencyPhone
                      ? <a href={`tel:${project.siteEmergencyPhone}`} className="text-blue-600 hover:underline">{project.siteEmergencyPhone}</a>
                      : <span className="text-slate-400">-</span>
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
