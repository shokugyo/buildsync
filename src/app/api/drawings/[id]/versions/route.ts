import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'
import { dispatchWebhook } from '@/lib/webhook'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const drawing = await prisma.drawing.findUnique({ where: { id: params.id } })
  if (!drawing) return NextResponse.json({ error: '図面が見つかりません' }, { status: 404 })

  const versions = await prisma.drawingVersion.findMany({
    where: { drawingId: params.id },
    include: {
      uploader: { select: { id: true, name: true } },
    },
    orderBy: { version: 'desc' },
  })

  return NextResponse.json(versions)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const drawing = await prisma.drawing.findUnique({ where: { id: params.id } })
  if (!drawing) return NextResponse.json({ error: '図面が見つかりません' }, { status: 404 })

  const body = await req.json()
  const { fileUrl, fileName, notes } = body

  if (!fileUrl || !fileName) {
    return NextResponse.json({ error: 'fileUrl と fileName は必須です' }, { status: 400 })
  }

  // Determine next version number
  const lastVersion = await prisma.drawingVersion.findFirst({
    where: { drawingId: params.id },
    orderBy: { version: 'desc' },
  })
  const nextVersion = lastVersion ? lastVersion.version + 1 : 1

  const version = await prisma.drawingVersion.create({
    data: {
      drawingId: params.id,
      version: nextVersion,
      fileUrl,
      fileName,
      uploadedBy: (session.user as any).id,
      notes: notes || null,
    },
    include: {
      uploader: { select: { id: true, name: true } },
    },
  })

  // Update the main drawing's filePath to the new version
  const updatedDrawing = await prisma.drawing.update({
    where: { id: params.id },
    data: { filePath: fileUrl },
    include: { project: { select: { id: true, name: true, companyId: true } } },
  })

  // N-006: 図面更新通知
  if (updatedDrawing.projectId) {
    await notifyProjectMembers({
      projectId: updatedDrawing.projectId,
      excludeUserId: (session.user as any).id,
      title: '図面が更新されました',
      content: `「${drawing.name}」の図面が更新されました（第${nextVersion}版）`,
      type: 'drawing',
      link: `/drawings`,
    })
    if (updatedDrawing.project?.companyId) {
      await dispatchWebhook(updatedDrawing.project.companyId, 'drawing.updated', {
        drawingId: params.id,
        drawingName: drawing.name,
        version: nextVersion,
        projectId: updatedDrawing.projectId,
        projectName: updatedDrawing.project.name,
      })
    }
  }

  return NextResponse.json(version, { status: 201 })
}
