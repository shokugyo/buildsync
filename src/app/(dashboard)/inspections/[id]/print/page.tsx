'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default function InspectionPrintPage() {
  const params = useParams()
  const [inspection, setInspection] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/inspections/${params.id}`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([insp, comp]) => {
      setInspection(insp)
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  useEffect(() => {
    if (!loading && inspection) setTimeout(() => window.print(), 300)
  }, [loading, inspection])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!inspection) return <div className="p-8 text-center">検査記録が見つかりません</div>

  const passCount = inspection.items?.filter((i: any) => i.result === '合格').length || 0
  const failCount = inspection.items?.filter((i: any) => i.result === '不合格').length || 0
  const pointCount = inspection.items?.filter((i: any) => i.result === '指摘').length || 0

  return (
    <div className="bg-white min-h-screen p-10 max-w-4xl mx-auto font-sans print:p-0">
      <style>{`
        @media print { body { margin: 0; } .no-print { display: none !important; } }
        table { border-collapse: collapse; }
      `}</style>

      <div className="no-print mb-6 flex gap-3">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          印刷 / PDF保存
        </button>
        <button onClick={() => window.history.back()} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
          戻る
        </button>
      </div>

      <div className="border border-slate-200 p-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest">検　査　記　録　書</h1>
          <p className="text-sm text-slate-500 mt-1">{inspection.type}</p>
        </div>

        {/* Header info */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <table className="w-full">
            <tbody>
              {[
                ['工事件名', inspection.project?.name],
                ['現場住所', inspection.project?.address || ''],
                ['案件番号', inspection.project?.projectNumber],
                ['検査名称', inspection.name],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="py-2 pr-4 text-slate-500 whitespace-nowrap w-28">{label}</td>
                  <td className="py-2 font-medium">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full">
            <tbody>
              {[
                ['検査予定日', formatDate(inspection.scheduledDate)],
                ['実施日', formatDate(inspection.actualDate) || '　'],
                ['検査担当', inspection.inspector?.name || '　'],
                ['作成会社', company?.name || '　'],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="py-2 pr-4 text-slate-500 whitespace-nowrap w-28">{label}</td>
                  <td className="py-2 font-medium">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status banner */}
        <div className={`text-center py-3 rounded-lg mb-6 font-bold text-lg ${
          inspection.status === '合格' ? 'bg-green-100 text-green-800' :
          inspection.status === '不合格' ? 'bg-red-100 text-red-800' :
          'bg-slate-100 text-slate-700'
        }`}>
          検査結果: {inspection.status}
          {inspection.items?.length > 0 && (
            <span className="ml-4 text-sm font-normal">
              （合格 {passCount}件 / 指摘 {pointCount}件 / 不合格 {failCount}件）
            </span>
          )}
        </div>

        {/* Inspection items */}
        {inspection.items?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-700 mb-3 pb-1 border-b border-slate-200">検査項目</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left w-8">No.</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">検査項目</th>
                  <th className="border border-slate-300 px-3 py-2 text-center w-24">結果</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">コメント</th>
                </tr>
              </thead>
              <tbody>
                {inspection.items.map((item: any, i: number) => (
                  <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-3 py-2 text-center text-slate-500">{i + 1}</td>
                    <td className="border border-slate-300 px-3 py-2">{item.name}</td>
                    <td className={`border border-slate-300 px-3 py-2 text-center font-medium ${
                      item.result === '合格' ? 'text-green-700' :
                      item.result === '不合格' ? 'text-red-700' :
                      item.result === '指摘' ? 'text-yellow-700' : 'text-slate-400'
                    }`}>
                      {item.result || '未実施'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-600">{item.comment || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Defects */}
        {inspection.defects?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-700 mb-3 pb-1 border-b border-slate-200">
              指摘・是正事項 ({inspection.defects.length}件)
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left w-8">No.</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">内容</th>
                  <th className="border border-slate-300 px-3 py-2 text-left w-24">場所</th>
                  <th className="border border-slate-300 px-3 py-2 text-left w-24">担当者</th>
                  <th className="border border-slate-300 px-3 py-2 text-center w-20">状態</th>
                </tr>
              </thead>
              <tbody>
                {inspection.defects.map((d: any, i: number) => (
                  <tr key={d.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-3 py-2 text-center text-slate-500">{i + 1}</td>
                    <td className="border border-slate-300 px-3 py-2">{d.content}</td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-600">{d.location || ''}</td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-600">{d.assignee?.name || ''}</td>
                    <td className="border border-slate-300 px-3 py-2 text-center">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {inspection.notes && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200">備考</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{inspection.notes}</p>
          </div>
        )}

        {/* Signature area */}
        <div className="mt-10 grid grid-cols-3 gap-8 text-sm">
          {['確認者', '検査担当者', '施工責任者'].map(role => (
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
