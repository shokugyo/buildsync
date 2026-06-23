import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notify'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  })
  if (!lead) return NextResponse.json({ error: '商談が見つかりません' }, { status: 404 })

  const count = await prisma.project.count({ where: { companyId: session.user.companyId } })
  const projectNumber = `P-${String(count + 1).padStart(3, '0')}`

  const project = await prisma.project.create({
    data: {
      projectNumber,
      name: lead.title,
      customerId: lead.customerId || null,
      contractAmount: lead.estimatedAmount || null,
      salesId: lead.assigneeId || null,
      status: '受注',
      companyId: session.user.companyId,
    },
  })

  await prisma.lead.update({
    where: { id: params.id },
    data: {
      projectId: project.id,
      status: '契約',
    },
  })

  if (lead.assigneeId && lead.assigneeId !== (session.user as any).id) {
    await sendNotification({
      userId: lead.assigneeId,
      title: '商談から案件が作成されました',
      content: `商談「${lead.title}」から案件「${project.name}」（${project.projectNumber}）が作成されました`,
      type: 'project',
      link: `/projects/${project.id}`,
    })
  }

  return NextResponse.json(project, { status: 201 })
}
