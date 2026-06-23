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
  const month = searchParams.get('month') || undefined

  const where: Record<string, unknown> = { companyId }
  if (projectId) where.projectId = projectId
  if (month) {
    const start = new Date(month + '-01')
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)
    where.date = { gte: start, lt: end }
  }

  const diaries = await prisma.siteDiary.findMany({
    where,
    include: {
      project: { select: { name: true, projectNumber: true } },
      author: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  })

  const header = ['案件番号', '案件名', '作業日', '天候', '気温', '作業員数', '作業内容', '課題・問題', '翌日予定', '記録者']
  const rows = diaries.map(d => [
    d.project?.projectNumber ?? '',
    d.project?.name ?? '',
    new Date(d.date).toLocaleDateString('ja-JP'),
    d.weather ?? '',
    d.temperature != null ? String(d.temperature) : '',
    d.workers != null ? String(d.workers) : '',
    d.workContent ?? '',
    d.issues ?? '',
    d.tomorrowPlan ?? '',
    d.author?.name ?? '',
  ])

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="site-diary_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
