import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import PrintButton from './PrintButton'

export default async function WorkReportPrintPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const report = await prisma.workReport.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true, address: true } },
      reporter: { select: { name: true, company: { select: { name: true } } } },
    },
  })

  if (!report) notFound()

  const company = await prisma.company.findUnique({
    where: { id: (session.user as any).companyId },
  })

  const printDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="bg-white min-h-screen p-10 max-w-3xl mx-auto font-sans print:p-0">
      <style>{'@media print { @page { margin: 1cm } body { margin: 0; } .no-print { display: none !important; } }'}</style>

      <div className="no-print mb-6 flex gap-3">
        <PrintButton />
        <a
          href="/work-reports"
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          一覧へ戻る
        </a>
      </div>

      <div className="border border-slate-200 p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-900">作　業　報　告　書</h1>
          </div>
          <div className="text-right text-sm space-y-0.5">
            <p className="font-bold text-base">{company?.name || ''}</p>
            {company?.address && <p className="text-slate-500">{company.address}</p>}
            {company?.phone && <p className="text-slate-500">TEL: {company.phone}</p>}
            {company?.email && <p className="text-slate-500">{company.email}</p>}
            {company?.registrationNumber && (
              <p className="text-slate-500">登録番号: {company.registrationNumber}</p>
            )}
            <p className="text-slate-400 text-xs mt-2">印刷日: {printDate}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-slate-500 text-xs block mb-0.5">案件名</span>
              <span className="font-semibold text-slate-900">{report.project?.name}</span>
            </div>
            <div className="border-b border-slate-200 pb-2">
              <span className="text-slate-500 text-xs block mb-0.5">案件番号</span>
              <span className="text-slate-900 font-mono">{report.project?.projectNumber}</span>
            </div>
            {report.project?.address && (
              <div className="border-b border-slate-200 pb-2">
                <span className="text-slate-500 text-xs block mb-0.5">現場住所</span>
                <span className="text-slate-900">{report.project.address}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-slate-500 text-xs block mb-0.5">報告日</span>
              <span className="font-semibold text-slate-900">{formatDate(report.reportDate)}</span>
            </div>
            <div className="border-b border-slate-200 pb-2">
              <span className="text-slate-500 text-xs block mb-0.5">報告者</span>
              <span className="text-slate-900">{report.reporter?.name}</span>
              {(report.reporter as any)?.company?.name && (
                <span className="text-slate-500 ml-2">（{(report.reporter as any).company.name}）</span>
              )}
            </div>
            {report.location && (
              <div className="border-b border-slate-200 pb-2">
                <span className="text-slate-500 text-xs block mb-0.5">場所・現場</span>
                <span className="text-slate-900">{report.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="border border-slate-200 rounded p-6 min-h-48">
          <p className="text-xs text-slate-500 mb-3 font-medium">報告内容</p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{report.content}</p>
        </div>

        {/* Signature area */}
        <div className="mt-10 flex justify-end gap-8">
          <div className="text-center">
            <div className="w-24 h-16 border border-slate-300 mb-1" />
            <p className="text-xs text-slate-500">確認印</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-16 border border-slate-300 mb-1" />
            <p className="text-xs text-slate-500">担当者印</p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {company?.name}
        </div>
      </div>
    </div>
  )
}
