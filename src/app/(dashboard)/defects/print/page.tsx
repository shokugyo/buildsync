'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface Defect {
  id: string
  content: string
  location?: string | null
  status: string
  dueDate?: string | null
  createdAt: string
  project: { name: string; projectNumber: string }
  assignee?: { name: string } | null
}

export default function DefectsPrintPage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [defects, setDefects] = useState<Defect[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = projectId ? `/api/defects?projectId=${projectId}` : '/api/defects'
    Promise.all([
      fetch(url).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([d, c]) => {
      setDefects(Array.isArray(d) ? d : [])
      setCompany(c)
      setLoading(false)
    })
  }, [projectId])

  useEffect(() => {
    if (!loading && defects.length > 0) {
      setTimeout(() => window.print(), 300)
    }
  }, [loading, defects.length])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>

  const fmtDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'

  const projectName = defects.length > 0 ? defects[0].project?.name : ''

  const statusCounts = ['未対応', '対応中', '是正完了', '確認済'].reduce<Record<string, number>>((acc, s) => {
    acc[s] = defects.filter(d => d.status === s).length
    return acc
  }, {})

  return (
    <div className="bg-white min-h-screen p-8 max-w-5xl mx-auto font-sans print:p-4">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; }
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
        th { background-color: #f1f5f9; font-weight: 600; }
      `}</style>

      <div className="no-print mb-6 flex gap-3">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          印刷 / PDF保存
        </button>
        <button onClick={() => window.history.back()} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
          戻る
        </button>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">是　正　一　覧　表</h1>
            {projectName && <p className="text-slate-600">案件：{projectName}</p>}
          </div>
          <div className="text-right text-sm text-slate-600">
            <p className="font-bold">{company?.name || ''}</p>
            <p>出力日：{new Date().toLocaleDateString('ja-JP')}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 flex gap-6 text-sm">
          <span>総件数：<strong>{defects.length}</strong></span>
          {Object.entries(statusCounts).map(([s, c]) => (
            <span key={s}>{s}：<strong>{c}</strong></span>
          ))}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th className="text-left w-8">No</th>
            <th className="text-left w-28">案件</th>
            <th className="text-left">内容</th>
            <th className="text-left w-24">場所</th>
            <th className="text-left w-20">担当者</th>
            <th className="text-left w-28">期限</th>
            <th className="text-left w-20">状態</th>
            <th className="text-left w-28">登録日</th>
          </tr>
        </thead>
        <tbody>
          {defects.map((d, i) => {
            const isOverdue = d.dueDate && new Date(d.dueDate) < new Date() && !['是正完了', '確認済'].includes(d.status)
            return (
              <tr key={d.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                <td className="text-center text-slate-500">{i + 1}</td>
                <td>
                  <div className="font-medium text-xs">{d.project?.name}</div>
                  <div className="text-xs text-slate-400">{d.project?.projectNumber}</div>
                </td>
                <td className="font-medium">{d.content}</td>
                <td className="text-slate-500">{d.location || '—'}</td>
                <td className="text-slate-500">{d.assignee?.name || '—'}</td>
                <td className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}>
                  {fmtDate(d.dueDate)}
                  {isOverdue && ' ⚠'}
                </td>
                <td>{d.status}</td>
                <td className="text-slate-500">{fmtDate(d.createdAt)}</td>
              </tr>
            )
          })}
          {defects.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center text-slate-400 py-4">是正データがありません</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-8 text-xs text-slate-400 text-right">
        合計 {defects.length} 件 — {company?.name || ''}
      </div>
    </div>
  )
}
