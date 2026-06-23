import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'
import { dispatchWebhook } from '@/lib/webhook'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  const inspections = await prisma.inspection.findMany({
    where: {
      project: { companyId: session.user.companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: true,
      inspector: true,
      items: true,
      defects: { include: { assignee: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(inspections)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const inspection = await prisma.inspection.create({
    data: {
      projectId: body.projectId,
      name: body.name,
      type: body.type,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      inspectorId: body.inspectorId || null,
      status: body.status || '未実施',
      notes: body.notes || null,
      items: body.items
        ? {
            create: body.items.map((item: { name: string }) => ({
              name: item.name,
            })),
          }
        : undefined,
    },
    include: { project: true, inspector: true, items: true },
  })

  // N-008: 検査予定通知
  await notifyProjectMembers({
    projectId: body.projectId,
    excludeUserId: (session.user as any).id,
    title: '検査が登録されました',
    content: `「${body.name}」(${body.type})が${body.scheduledDate ? new Date(body.scheduledDate).toLocaleDateString('ja-JP') : '日程未定'}に登録されました`,
    type: 'inspection',
    link: `/projects/${body.projectId}`,
  })

  await dispatchWebhook(inspection.project.companyId, 'inspection.created', { id: inspection.id, name: inspection.name, projectId: inspection.projectId })

  return NextResponse.json(inspection, { status: 201 })
}
