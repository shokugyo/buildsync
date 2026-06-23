'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface ReportSummary {
  id: string
  workDate: string
  content: string
  progress: string | null
  weather: string | null
  reporterName: string | null
}

interface PhotoItem {
  id: string
  filePath: string
  caption: string | null
  takenAt: string | null
}

interface ScheduleItem {
  id: string
  name: string
  progress: number
  status: string
  startDate: string | null
  endDate: string | null
}

interface ProjectSummary {
  id: string
  projectNumber: string
  name: string
  status: string
  address?: string | null
  startDate?: string | null
  endDate?: string | null
  progress: number
  remainingDays: number | null
  scheduleTotal: number
  scheduleCompleted: number
  photoCount: number
  pendingInspections: number
  openDefects: number
  recentPhotos: PhotoItem[]
  allPhotos: PhotoItem[]
  recentReports: ReportSummary[]
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

function ReportContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reportDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/customer-portal/projects')
        if (res.ok) {
          const data: ProjectSummary[] = await res.json()
          const found = projectId ? data.find(p => p.id === projectId) : data[0]
          if (found) {
            setProject(found)
          } else {
            setError('案件が見つかりません')
          }
        } else {
          setError('データの取得に失敗しました')
        }
      } catch {
        setError('エラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error || '案件が見つかりません'}</p>
      </div>
    )
  }

  const photos6 = project.allPhotos.slice(0, 6)

  // Build schedule sections from recentReports for "今月の主な作業"
  const thisMonth = new Date()
  const monthLabel = `${thisMonth.getFullYear()}年${thisMonth.getMonth() + 1}月`
  const recentWorkItems = project.recentReports.slice(0, 5)

  // Next month label for schedule
  const nextMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1)
  const nextMonthLabel = `${nextMonth.getFullYear()}年${nextMonth.getMonth() + 1}月`

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          .report-container {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
        }
      `}</style>

      {/* Print button - hidden on print */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow"
        >
          印刷 / PDF出力
        </button>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium shadow"
        >
          閉じる
        </button>
      </div>

      <div className="report-container max-w-[210mm] mx-auto bg-white p-8 shadow-lg my-6 print:my-0 print:shadow-none">

        {/* ===== HEADER ===== */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900 mb-1">工事進捗報告書</div>
              <div className="text-sm text-slate-500">Progress Report</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-0.5">報告日</div>
              <div className="text-sm font-semibold text-slate-800">{reportDate}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-semibold text-slate-800">{project.name}</div>
            {project.address && (
              <div className="text-sm text-slate-500 mt-0.5">{project.address}</div>
            )}
          </div>
        </div>

        {/* ===== SECTION 1: 工事概要 ===== */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-white bg-slate-700 px-3 py-1.5 rounded mb-3">
            1. 工事概要
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 w-32 border-r border-slate-200">案件番号</td>
                <td className="px-3 py-2 text-slate-800">{project.projectNumber}</td>
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 w-32 border-l border-r border-slate-200">ステータス</td>
                <td className="px-3 py-2 text-slate-800">{project.status}</td>
              </tr>
              <tr className="border border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 border-r border-slate-200">工事名</td>
                <td className="px-3 py-2 text-slate-800" colSpan={3}>{project.name}</td>
              </tr>
              <tr className="border border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 border-r border-slate-200">施工場所</td>
                <td className="px-3 py-2 text-slate-800" colSpan={3}>{project.address || '—'}</td>
              </tr>
              <tr className="border border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 border-r border-slate-200">工期</td>
                <td className="px-3 py-2 text-slate-800">
                  {fmtDate(project.startDate)} 〜 {fmtDate(project.endDate)}
                </td>
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 border-l border-r border-slate-200">進捗率</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(project.progress, 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-blue-600 text-base">{project.progress}%</span>
                  </div>
                </td>
              </tr>
              <tr className="border border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 border-r border-slate-200">工程完了</td>
                <td className="px-3 py-2 text-slate-800">
                  {project.scheduleCompleted} / {project.scheduleTotal} 工程
                </td>
                <td className="bg-slate-50 px-3 py-2 font-medium text-slate-600 border-l border-r border-slate-200">残り日数</td>
                <td className="px-3 py-2 text-slate-800">
                  {project.remainingDays !== null
                    ? project.remainingDays < 0
                      ? `竣工予定を${Math.abs(project.remainingDays)}日超過`
                      : `${project.remainingDays}日`
                    : '—'
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== SECTION 2: 今月の主な作業 ===== */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-white bg-slate-700 px-3 py-1.5 rounded mb-3">
            2. {monthLabel}の主な作業
          </h2>
          {recentWorkItems.length === 0 ? (
            <div className="border border-slate-200 rounded p-3 text-sm text-slate-400 text-center">
              作業報告がありません
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600 w-28">作業日</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600">作業内容</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600 w-20">担当者</th>
                </tr>
              </thead>
              <tbody>
                {recentWorkItems.map(r => (
                  <tr key={r.id}>
                    <td className="border border-slate-200 px-3 py-2 text-slate-700">
                      {new Date(r.workDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-slate-700">{r.content}</td>
                    <td className="border border-slate-200 px-3 py-2 text-slate-500 text-xs">{r.reporterName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== SECTION 3: 写真 ===== */}
        {photos6.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-white bg-slate-700 px-3 py-1.5 rounded mb-3">
              3. 現場写真
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {photos6.map(photo => (
                <div key={photo.id} className="border border-slate-200 rounded overflow-hidden">
                  <img
                    src={photo.filePath}
                    alt={photo.caption || '現場写真'}
                    className="w-full max-w-full object-cover"
                    style={{ height: '120px' }}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  {photo.caption && (
                    <div className="px-2 py-1 bg-slate-50 border-t border-slate-100">
                      <p className="text-[10px] text-slate-500 truncate">{photo.caption}</p>
                    </div>
                  )}
                  {photo.takenAt && (
                    <div className={`px-2 py-1 ${photo.caption ? '' : 'bg-slate-50 border-t border-slate-100'}`}>
                      <p className="text-[10px] text-slate-400">
                        {new Date(photo.takenAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SECTION 4: 工程進捗 ===== */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-white bg-slate-700 px-3 py-1.5 rounded mb-3">
            4. 工程進捗
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-32 text-slate-600 font-medium">全体進捗</div>
              <div className="flex-1 bg-slate-200 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(project.progress, 5)}%` }}
                >
                  <span className="text-[10px] text-white font-bold">{project.progress}%</span>
                </div>
              </div>
            </div>
            {project.scheduleCompleted > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-32 text-slate-600 font-medium">完了工程</div>
                <div className="flex-1 bg-slate-200 rounded-full h-4 relative">
                  <div
                    className="bg-green-500 h-4 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${project.scheduleTotal > 0 ? Math.round((project.scheduleCompleted / project.scheduleTotal) * 100) : 0}%` }}
                  >
                    <span className="text-[10px] text-white font-bold">
                      {project.scheduleTotal > 0 ? Math.round((project.scheduleCompleted / project.scheduleTotal) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 w-20 text-right">
                  {project.scheduleCompleted}/{project.scheduleTotal}
                </div>
              </div>
            )}
            {project.openDefects > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-32 text-slate-600 font-medium">未対応是正</div>
                <div className="text-red-600 font-medium">{project.openDefects}件</div>
              </div>
            )}
            {project.pendingInspections > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-32 text-slate-600 font-medium">予定検査</div>
                <div className="text-orange-600 font-medium">{project.pendingInspections}件</div>
              </div>
            )}
          </div>
        </div>

        {/* ===== SECTION 5: 次月の予定作業 ===== */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-white bg-slate-700 px-3 py-1.5 rounded mb-3">
            5. {nextMonthLabel}の予定作業
          </h2>
          <div className="border border-slate-200 rounded p-4 min-h-16 bg-slate-50">
            <p className="text-sm text-slate-400 italic">（施工担当者より別途ご連絡いたします）</p>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="border-t-2 border-slate-200 pt-4 mt-6">
          <div className="flex items-start justify-between text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700 mb-1">施工会社</p>
              <p>担当者よりご不明な点はお気軽にお問い合わせください。</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700 mb-1">報告日: {reportDate}</p>
              <p>BuildSync 施主ポータルより出力</p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-500">読み込み中...</p></div>}>
      <ReportContent />
    </Suspense>
  )
}
