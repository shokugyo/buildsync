'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface HandoverData {
  project: {
    id: string
    name: string
    projectNumber: string
    address: string | null
    workType: string | null
    contractAmount: number | null
    startDate: string | null
    endDate: string | null
    deliveryDate: string | null
    status: string
  }
  customer: { id: string; name: string; address: string | null; phone: string | null } | null
  manager: { id: string; name: string } | null
  company: {
    id: string
    name: string
    address: string | null
    phone: string | null
    representativeName: string | null
    registrationNumber: string | null
  }
  completion: {
    completedAt: string | null
    finalInspectionDone: boolean
    customerAccepted: boolean
    invoiceIssued: boolean
    documentsArchived: boolean
  } | null
  completionDocSummary: Record<string, number>
}

const DOC_CATEGORIES = ['竣工図面', '検査記録', '保証書', '取扱説明書', 'その他']

export default function HandoverPrintPage() {
  const params = useParams()
  const projectId = params.id as string

  const [data, setData] = useState<HandoverData | null>(null)
  const [loading, setLoading] = useState(true)
  const handoverDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    fetch(`/api/projects/${projectId}/handover`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) setData(d)
      })
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">データが見つかりません</p>
        <Link href={`/projects/${projectId}`} className="text-blue-600 hover:underline">案件詳細に戻る</Link>
      </div>
    )
  }

  const { project, customer, company, completion, completionDocSummary } = data
  const constructionPeriod = [
    formatDate(project.startDate),
    formatDate(project.deliveryDate || project.endDate),
  ].filter(d => d !== '-').join(' 〜 ') || '-'

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #handover-area,
          #handover-area * { visibility: visible; }
          #handover-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
          }
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
        }
      `}</style>

      <div className="no-print p-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> 案件詳細に戻る
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-semibold text-slate-900">工事完了引渡書</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" /> 印刷する
        </button>
      </div>

      <div id="handover-area" className="max-w-[794px] mx-auto p-10 bg-white min-h-screen">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-widest text-slate-900 mb-2">工事完了引渡書</h1>
          <p className="text-sm text-slate-500">引渡日：{handoverDate}</p>
        </div>

        {/* Statement */}
        <div className="text-center mb-8 py-4 border-y border-slate-300">
          <p className="text-base text-slate-800 leading-relaxed">
            下記工事が完成しましたので、ここに引き渡しいたします。
          </p>
        </div>

        {/* 工事概要 */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-700 border-b-2 border-slate-800 pb-1 mb-3">工　事　概　要</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 pr-4 text-slate-500 font-medium w-32 whitespace-nowrap">工　事　名</td>
                <td className="py-2 text-slate-900 font-medium">{project.name}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-500 font-medium whitespace-nowrap">工　事　場　所</td>
                <td className="py-2 text-slate-900">{project.address || '—'}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-500 font-medium whitespace-nowrap">工　事　種　別</td>
                <td className="py-2 text-slate-900">{project.workType || '—'}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-500 font-medium whitespace-nowrap">工　　　　　期</td>
                <td className="py-2 text-slate-900">{constructionPeriod}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-500 font-medium whitespace-nowrap">請　負　金　額</td>
                <td className="py-2 text-slate-900 font-bold text-base">
                  {project.contractAmount != null ? formatCurrency(project.contractAmount) : '—'}
                  <span className="text-xs font-normal text-slate-500 ml-1">（税込）</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 完成図書チェックリスト */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-700 border-b-2 border-slate-800 pb-1 mb-3">完　成　図　書</h2>
          <table className="w-full text-sm border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-300">書類区分</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-300 w-24">部数</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-300 w-24">確認</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DOC_CATEGORIES.map((cat) => (
                <tr key={cat}>
                  <td className="px-3 py-2.5 text-slate-800">{cat}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700">
                    {completionDocSummary[cat] != null ? `${completionDocSummary[cat]} 部` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="w-5 h-5 border border-slate-400 rounded mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 署名欄 */}
        <div className="grid grid-cols-2 gap-10 mt-12">
          {/* 発注者 */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 border-b-2 border-slate-800 pb-1 mb-4">発　注　者</h2>
            <div className="space-y-2 text-sm text-slate-800 mb-6">
              <p className="font-medium">{customer?.name || '—'}</p>
              {customer?.address && <p className="text-slate-600 text-xs">{customer.address}</p>}
              {customer?.phone && <p className="text-slate-600 text-xs">TEL: {customer.phone}</p>}
            </div>
            <div className="border-b border-slate-400 mt-12 mb-1" />
            <p className="text-xs text-slate-500 text-right">発注者　署名・捺印</p>
          </div>

          {/* 施工者 */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 border-b-2 border-slate-800 pb-1 mb-4">施　工　者</h2>
            <div className="space-y-2 text-sm text-slate-800 mb-6">
              <p className="font-medium">{company.name}</p>
              {company.address && <p className="text-slate-600 text-xs">{company.address}</p>}
              {company.phone && <p className="text-slate-600 text-xs">TEL: {company.phone}</p>}
              {company.representativeName && (
                <p className="text-slate-600 text-xs">代表者：{company.representativeName}</p>
              )}
              {company.registrationNumber && (
                <p className="text-slate-600 text-xs">建設業許可：{company.registrationNumber}</p>
              )}
            </div>
            <div className="border-b border-slate-400 mt-12 mb-1" />
            <p className="text-xs text-slate-500 text-right">施工者　署名・捺印</p>
          </div>
        </div>

        {/* 備考 */}
        <div className="mt-10">
          <h2 className="text-sm font-bold text-slate-700 border-b-2 border-slate-800 pb-1 mb-3">備　　　考</h2>
          <div className="h-24 border border-slate-300 rounded" />
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">{project.projectNumber} | {company.name}</p>
        </div>
      </div>
    </>
  )
}
