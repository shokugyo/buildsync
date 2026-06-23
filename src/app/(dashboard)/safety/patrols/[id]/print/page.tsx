'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface CheckItem {
  item: string
  result: '良好' | '要改善' | '不適合'
  comment: string
}

interface SafetyPatrol {
  id: string
  patrolDate: string
  overallResult: string
  correctionRequired: boolean
  notes: string | null
  checkItems: string
  project: { id: string; name: string; projectNumber: string }
  patroller: { id: string; name: string }
  createdAt: string
}

function resultSymbol(result: string) {
  if (result === '良好') return '○'
  if (result === '要改善') return '△'
  return '×'
}

export default function SafetyPatrolPrintPage() {
  const params = useParams()
  const [patrol, setPatrol] = useState<SafetyPatrol | null>(null)
  const [company, setCompany] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/safety-patrols/${params.id}`).then((r) => r.json()),
      fetch('/api/company').then((r) => r.json()),
    ]).then(([p, c]) => {
      setPatrol(p)
      setCompany(c)
      setLoading(false)
    })
  }, [params.id])

  useEffect(() => {
    if (!loading && patrol) setTimeout(() => window.print(), 300)
  }, [loading, patrol])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!patrol || (patrol as any).error) return <div className="p-8 text-center">記録が見つかりません</div>

  let checkItems: CheckItem[] = []
  try {
    checkItems = JSON.parse(patrol.checkItems)
  } catch {}

  return (
    <div className="bg-white min-h-screen p-10 max-w-4xl mx-auto font-sans print:p-0">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm; }
        }
        table { border-collapse: collapse; }
      `}</style>

      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          印刷 / PDF保存
        </button>
        <button
          onClick={() => window.history.back()}
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          戻る
        </button>
      </div>

      <div className="border border-slate-300 p-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest">安全巡回点検報告書</h1>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 text-slate-500 whitespace-nowrap w-24">点検日</td>
                <td className="py-2 font-medium">{formatDate(patrol.patrolDate)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">現場名</td>
                <td className="py-2 font-medium">
                  {patrol.project.projectNumber} {patrol.project.name}
                </td>
              </tr>
            </tbody>
          </table>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 text-slate-500 whitespace-nowrap w-24">点検者</td>
                <td className="py-2 font-medium">{patrol.patroller.name}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">作成会社</td>
                <td className="py-2 font-medium">{company?.name || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200">チェック項目</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left w-8">No.</th>
                <th className="border border-slate-300 px-3 py-2 text-left">項目名</th>
                <th className="border border-slate-300 px-3 py-2 text-center w-20">結果</th>
                <th className="border border-slate-300 px-3 py-2 text-left">指摘事項</th>
              </tr>
            </thead>
            <tbody>
              {checkItems.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                  <td className="border border-slate-300 px-3 py-2 text-center text-slate-500">{i + 1}</td>
                  <td className="border border-slate-300 px-3 py-2">{item.item}</td>
                  <td className="border border-slate-300 px-3 py-2 text-center font-bold text-lg">
                    {resultSymbol(item.result)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-slate-600">{item.comment || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-slate-400">凡例: ○ 良好　△ 要改善　× 不適合</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div className="border border-slate-300 rounded p-4">
            <p className="text-slate-500 mb-1 font-medium">総合評価</p>
            <p className={`text-xl font-bold ${
              patrol.overallResult === '良好' ? 'text-green-700' :
              patrol.overallResult === '要改善' ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {patrol.overallResult}
            </p>
          </div>
          <div className="border border-slate-300 rounded p-4">
            <p className="text-slate-500 mb-1 font-medium">是正必要</p>
            <p className={`text-xl font-bold ${patrol.correctionRequired ? 'text-red-700' : 'text-slate-700'}`}>
              {patrol.correctionRequired ? '有' : '無'}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200">所見・特記事項</h2>
          <div className="border border-slate-300 rounded p-3 min-h-[80px] text-sm text-slate-700 whitespace-pre-wrap">
            {patrol.notes || ''}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-8 text-sm">
          {['確認者', '点検担当者', '現場責任者'].map((role) => (
            <div key={role} className="text-center">
              <p className="text-slate-500 mb-2">{role}</p>
              <div className="border border-slate-300 h-20 rounded" />
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {company?.name} — {new Date().toLocaleDateString('ja-JP')} 作成
        </div>
      </div>
    </div>
  )
}
