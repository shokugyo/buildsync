import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dispatchWebhook } from '@/lib/webhook'
import { sendNotification } from '@/lib/notify'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const inspection = await prisma.inspection.findFirst({
    where: { id: params.id, project: { companyId: (session.user as any).companyId } },
    include: {
      project: { select: { name: true, projectNumber: true, address: true } },
      inspector: { select: { name: true } },
      items: true,
      defects: { include: { assignee: { select: { name: true } } } },
    },
  })

  if (!inspection) return NextResponse.json({ error: '検査が見つかりません' }, { status: 404 })
  return NextResponse.json(inspection)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { name, type, scheduledDate, actualDate, inspectorId, status, notes, items } = body

  try {
    const inspection = await prisma.inspection.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
        ...(actualDate !== undefined && { actualDate: actualDate ? new Date(actualDate) : null }),
        ...(inspectorId !== undefined && { inspectorId: inspectorId || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    })

    // Update inspection items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id) {
          await prisma.inspectionItem.update({
            where: { id: item.id },
            data: {
              result: item.result,
              comment: item.comment,
              ...(item.photoUrl !== undefined && { photoUrl: item.photoUrl }),
            },
          })
        } else {
          await prisma.inspectionItem.create({
            data: {
              inspectionId: params.id,
              name: item.name,
              result: item.result,
              comment: item.comment,
              photoUrl: item.photoUrl || null,
            },
          })
        }
      }
    }

    const updated = await prisma.inspection.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        defects: { include: { assignee: { select: { id: true, name: true } } } },
        inspector: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, companyId: true, managerId: true } },
      },
    })

    // Fire webhook + notify when inspection is completed
    if (status === '完了' && updated?.project) {
      await dispatchWebhook(updated.project.companyId, 'inspection.completed', {
        id: updated.id,
        name: updated.name,
        projectId: updated.projectId,
        projectName: updated.project.name,
        result: body.result || null,
      })
      if (updated.project.managerId) {
        await sendNotification({
          userId: updated.project.managerId,
          title: '検査が完了しました',
          content: `「${updated.project.name}」の検査「${updated.name}」が完了しました`,
          type: 'inspection_completed',
          link: `/inspections`,
        })
      }
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.inspectionItem.deleteMany({ where: { inspectionId: params.id } })
    await prisma.inspection.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
