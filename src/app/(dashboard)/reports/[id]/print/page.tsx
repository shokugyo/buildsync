'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function ReportPrintPage() {
  const params = useParams()
  const [report, setReport] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/reports/${params.id}`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([rep, comp]) => {
      setReport(rep)
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  useEffect(() => {
    if (!loading && report) setTimeout(() => window.print(), 300)
  }, [loading, report])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!report) return <div className="p-8 text-center">日報が見つかりません</div>

  const workDate = new Date(report.workDate).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div className="bg-white min-h-screen p-10 max-w-3xl mx-auto font-sans">
      <style>{`
        @media print { body { margin: 0; } .no-print { display: none !important; } }
      `}</style>

      <div className="no-print mb-6 flex gap-3">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          印刷 / PDF保存
        </button>
        <button onClick={() => window.history.back()} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
          戻る
        </button>
      </div>

      <div className="border border-slate-300 p-8">
        <div className="flex items-start justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-widest">作　業　日　報</h1>
          <div className="text-right text-sm">
            <p className="font-bold text-base">{company?.name || ''}</p>
            {company?.phone && <p className="text-slate-600">TEL: {company.phone}</p>}
          </div>
        </div>

        <table className="w-full border-collapse text-sm mb-6">
          <tbody>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-32">作業日</td>
              <td className="border border-slate-300 px-3 py-2">{workDate}</td>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-24">天候</td>
              <td className="border border-slate-300 px-3 py-2 w-32">{report.weather || '—'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">案件名</td>
              <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                {report.project?.name || ''}（{report.project?.projectNumber || ''}）
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">報告者</td>
              <td className="border border-slate-300 px-3 py-2">{report.reporter?.name || ''}</td>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">作業員数</td>
              <td className="border border-slate-300 px-3 py-2">{report.workers != null ? `${report.workers}名` : '—'}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium w-32 align-top">作業内容</td>
              <td className="border border-slate-300 px-3 py-2 min-h-24 whitespace-pre-wrap">{report.content}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium align-top">進捗状況</td>
              <td className="border border-slate-300 px-3 py-2 whitespace-pre-wrap">{report.progress || '—'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium align-top">問題・課題</td>
              <td className="border border-slate-300 px-3 py-2 whitespace-pre-wrap">{report.issues || 'なし'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium align-top">翌日の予定</td>
              <td className="border border-slate-300 px-3 py-2 whitespace-pre-wrap">{report.nextPlan || '—'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-medium">確認欄</td>
              <td className="border border-slate-300 px-3 py-8"></td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {company?.name} — 作業日報
        </div>
      </div>
    </div>
  )
}
