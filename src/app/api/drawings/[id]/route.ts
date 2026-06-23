import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const drawing = await prisma.drawing.findFirst({
    where: { id: params.id, project: { companyId: (session.user as any).companyId } },
    include: {
      uploader: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
      pins: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!drawing) return NextResponse.json({ error: '図面が見つかりません' }, { status: 404 })
  return NextResponse.json(drawing)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const drawing = await prisma.drawing.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.drawingType !== undefined && { drawingType: body.drawingType }),
      ...(body.drawingNumber !== undefined && { drawingNumber: body.drawingNumber || null }),
      ...(body.description !== undefined && { description: body.description || null }),
    },
    include: { uploader: { select: { name: true } }, project: { select: { name: true, projectNumber: true } } },
  })

  await notifyProjectMembers({
    projectId: drawing.projectId,
    excludeUserId: (session.user as any).id,
    title: '図面が更新されました',
    content: `${drawing.name} が更新されました`,
    type: 'drawing',
    link: `/projects/${drawing.projectId}?tab=drawings`,
  })

  return NextResponse.json(drawing)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const drawing = await prisma.drawing.findUnique({ where: { id: params.id } })
  if (!drawing) return NextResponse.json({ error: '図面が見つかりません' }, { status: 404 })

  await prisma.drawing.delete({ where: { id: params.id } })

  // If deleted was latest and there are other versions, mark the next latest
  if (drawing.isLatest) {
    const prev = await prisma.drawing.findFirst({
      where: { projectId: drawing.projectId, name: drawing.name },
      orderBy: { version: 'desc' },
    })
    if (prev) {
      await prisma.drawing.update({ where: { id: prev.id }, data: { isLatest: true } })
    }
  }

  return NextResponse.json({ success: true })
}
