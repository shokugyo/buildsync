import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

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

  const header = ['案件番号', '案件名', '検査名', '指摘内容', '場所', '是正担当', '期限', 'ステータス', '登録日']
  const rows = defects.map(d => [
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

  const csv = toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="defects_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
