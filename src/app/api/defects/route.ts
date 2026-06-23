import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const inspectionId = searchParams.get('inspectionId')

  const defects = await prisma.defect.findMany({
    where: {
      project: { companyId: (session.user as any).companyId },
      ...(projectId && { projectId }),
      ...(inspectionId && { inspectionId }),
    },
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(defects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, inspectionId, content, location, assigneeId, dueDate, status, photoIds } = body

  if (!projectId || !content) {
    return NextResponse.json({ error: 'プロジェクトと内容は必須です' }, { status: 400 })
  }

  const defect = await prisma.defect.create({
    data: {
      projectId,
      inspectionId: inspectionId || null,
      content,
      location: location || null,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status || '未対応',
      photoIds: photoIds || null,
    },
    include: { assignee: { select: { id: true, name: true } } },
  })

  // 担当者に是正依頼通知 (N-009)
  if (defect.assigneeId && defect.assigneeId !== (session.user as any).id) {
    await sendNotification({
      userId: defect.assigneeId,
      title: '是正依頼が届きました',
      content: `${(session.user as any).name || 'ユーザー'}から是正依頼「${content}」が割り当てられました`,
      type: 'defect',
      link: '/inspections',
    })
  }

  return NextResponse.json(defect, { status: 201 })
}
