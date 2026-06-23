import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Printer, Pencil } from 'lucide-react'

export default async function WorkReportDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const companyId = (session.user as any).companyId

  const report = await prisma.workReport.findFirst({
    where: { id: params.id, companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true, address: true } },
      reporter: { select: { id: true, name: true, company: { select: { name: true } } } },
    },
  })

  if (!report) notFound()

  // Parse photoIds if present
  let photoIdList: string[] = []
  if (report.photoIds) {
    try {
      const parsed = JSON.parse(report.photoIds)
      if (Array.isArray(parsed)) photoIdList = parsed
    } catch {
      // ignore
    }
  }

  // Fetch photos if any
  let photos: { id: string; filePath: string; comment?: string | null }[] = []
  if (photoIdList.length > 0) {
    photos = await prisma.photo.findMany({
      where: { id: { in: photoIdList } },
      select: { id: true, filePath: true, comment: true },
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/work-reports"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          作業報告一覧
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/work-reports/${report.id}/print`}
            target="_blank"
            className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> PDF出力
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
        <h1 className="text-xl font-bold text-slate-900">作業報告書</h1>

        {/* Info table */}
        <div className="grid grid-cols-2 gap-4 text-sm border border-slate-100 rounded-lg p-4 bg-slate-50">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">案件名</p>
            <Link href={`/projects/${report.project?.id}`} className="font-medium text-blue-600 hover:text-blue-700">
              {report.project?.name}
            </Link>
            <p className="text-xs text-slate-400">{report.project?.projectNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">報告日</p>
            <p className="font-medium text-slate-900">{formatDate(report.reportDate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">報告者</p>
            <p className="font-medium text-slate-900">{report.reporter?.name}</p>
            {(report.reporter as any)?.company?.name && (
              <p className="text-xs text-slate-400">（{(report.reporter as any).company.name}）</p>
            )}
          </div>
          {report.location && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">場所・現場</p>
              <p className="font-medium text-slate-900">{report.location}</p>
            </div>
          )}
          {report.project?.address && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-0.5">現場住所</p>
              <p className="text-slate-700">{report.project.address}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">報告内容</h2>
          <div className="border border-slate-200 rounded-lg p-4 min-h-32 bg-white">
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{report.content}</p>
          </div>
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">添付写真</h2>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <img
                    src={photo.filePath}
                    alt={photo.comment || '写真'}
                    className="w-full h-32 object-cover"
                  />
                  {photo.comment && (
                    <p className="text-xs text-slate-500 px-2 py-1 truncate">{photo.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          作成日時: {new Date(report.createdAt).toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  )
}
