import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined

  const defects = await prisma.defect.findMany({
    where: {
      project: { companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
      assignee: { select: { name: true } },
      inspection: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = [
    ['案件番号', '案件名', '検査名', '指摘内容', '場所', '是正担当', '期限', 'ステータス', '登録日'],
    ...defects.map(d => [
      d.project.projectNumber,
      d.project.name,
      d.inspection?.name ?? '',
      d.content,
      d.location ?? '',
      d.assignee?.name ?? '',
      d.dueDate ? new Date(d.dueDate).toLocaleDateString('ja-JP') : '',
      d.status,
      new Date(d.createdAt).toLocaleDateString('ja-JP'),
    ])
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '指摘一覧')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="defects_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
