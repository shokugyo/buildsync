import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { projectId, message } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectIdは必須です' }, { status: 400 })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, companyId: true },
  })
  if (!project || project.companyId !== (session.user as any).companyId) {
    return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })
  }

  const upcomingSchedules = await prisma.schedule.findMany({
    where: { projectId, status: { not: '完了' } },
    orderBy: { startDate: 'asc' },
    take: 5,
    select: { name: true, startDate: true, endDate: true, status: true },
  })

  const scheduleLines = upcomingSchedules
    .map(s => `・${s.name}（${s.status}）`)
    .join('\n')

  const content = message
    ? message
    : `【${project.name}】工程のご連絡\n\n${scheduleLines || '工程情報を確認してください。'}`

  await notifyProjectMembers({
    projectId,
    excludeUserId: (session.user as any).id,
    title: '工程変更のお知らせ',
    content: content.slice(0, 200),
    type: 'schedule',
    link: `/schedule?projectId=${projectId}`,
  })

  return NextResponse.json({ ok: true })
}
