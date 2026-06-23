import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notifyProjectMembers } from '@/lib/notify'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const latestOnly = searchParams.get('latestOnly') === 'true'

  const drawings = await prisma.drawing.findMany({
    where: {
      project: { companyId: (session.user as any).companyId },
      ...(projectId && { projectId }),
      ...(latestOnly && { isLatest: true }),
    },
    include: { uploader: { select: { name: true } }, project: { select: { name: true, projectNumber: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(drawings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, name, drawingType, drawingNumber, filePath, description } = body

  if (!projectId || !name || !filePath) {
    return NextResponse.json({ error: '案件、図面名、ファイルは必須です' }, { status: 400 })
  }

  // Find existing drawings with same name to determine version
  const existing = await prisma.drawing.findMany({
    where: { projectId, name },
    orderBy: { version: 'desc' },
  })

  const newVersion = existing.length > 0 ? existing[0].version + 1 : 1

  // Mark previous versions as not latest
  if (existing.length > 0) {
    await prisma.drawing.updateMany({
      where: { projectId, name },
      data: { isLatest: false },
    })
  }

  const drawing = await prisma.drawing.create({
    data: {
      projectId,
      uploaderId: (session.user as any).id,
      name,
      drawingType: drawingType || 'その他',
      drawingNumber: drawingNumber || null,
      version: newVersion,
      isLatest: true,
      filePath,
      description: description || null,
    },
    include: { uploader: { select: { name: true } }, project: { select: { name: true, projectNumber: true } } },
  })

  await logAudit({
    userId: (session.user as any).id,
    userName: (session.user as any).name || '',
    action: 'drawing_upload',
    target: '図面',
    targetId: drawing.id,
    detail: `${name} v${newVersion}`,
    companyId: (session.user as any).companyId,
  })

  await notifyProjectMembers({
    projectId: drawing.projectId,
    excludeUserId: (session.user as any).id,
    title: '図面が更新されました',
    content: `${drawing.name} が追加されました`,
    type: 'drawing',
    link: `/projects/${drawing.projectId}?tab=drawings`,
  })

  return NextResponse.json(drawing, { status: 201 })
}
