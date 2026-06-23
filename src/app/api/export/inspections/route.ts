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

  const inspections = await prisma.inspection.findMany({
    where: {
      project: { companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
      inspector: { select: { name: true } },
      items: true,
    },
    orderBy: { scheduledDate: 'desc' },
  })

  const header = ['案件番号', '案件名', '検査名', '検査種別', '予定日', '実施日', '担当者', 'ステータス', '結果', '指摘件数', '備考']
  const rows = inspections.map(ins => [
    ins.project?.projectNumber ?? '',
    ins.project?.name ?? '',
    ins.name,
    ins.type ?? '',
    ins.scheduledDate ? new Date(ins.scheduledDate).toLocaleDateString('ja-JP') : '',
    ins.actualDate ? new Date(ins.actualDate).toLocaleDateString('ja-JP') : '',
    ins.inspector?.name ?? '',
    ins.status,
    ins.items?.some(i => i.result === '指摘' || i.result === '不合格') ? '指摘あり' : (ins.status === '完了' ? '合格' : ''),
    String(ins.items?.filter(i => i.result === '指摘' || i.result === '不合格').length ?? 0),
    ins.notes ?? '',
  ])

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="inspections.csv"',
    },
  })
}
