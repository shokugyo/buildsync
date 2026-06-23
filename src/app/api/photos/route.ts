import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'
import { dispatchWebhook } from '@/lib/webhook'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const idsParam = searchParams.get('ids')

  if (idsParam) {
    const ids = idsParam.split(',').filter(Boolean)
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: ids },
        project: { companyId: session.user.companyId },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        uploader: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(photos)
  }

  const photos = await prisma.photo.findMany({
    where: {
      project: { companyId: session.user.companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      uploader: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(photos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const photo = await prisma.photo.create({
    data: {
      projectId: body.projectId,
      uploaderId: session.user.id,
      filePath: body.filePath || `/uploads/photos/${Date.now()}.jpg`,
      comment: body.comment || null,
      tags: body.tags || null,
      location: body.location || null,
      shootingType: body.shootingType || null,
      category: body.category || '一般',
      blackboardData: body.blackboardData || null,
      latitude: body.latitude != null ? Number(body.latitude) : null,
      longitude: body.longitude != null ? Number(body.longitude) : null,
      is360: body.is360 === true || body.is360 === 'true',
    },
    include: {
      uploader: { select: { name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  const projectId = photo.projectId

  await logAudit({
    userId: (session.user as any).id,
    userName: (session.user as any).name || '',
    action: 'photo_upload',
    target: '写真',
    targetId: photo.id,
    detail: photo.project?.name ?? '',
    companyId: (session.user as any).companyId,
  })

  await notifyProjectMembers({
    projectId,
    excludeUserId: (session.user as any).id,
    title: '写真が追加されました',
    content: `${photo.project?.name ?? '案件'} に写真が追加されました`,
    type: 'photo',
    link: `/projects/${projectId}?tab=photos`,
  })

  await dispatchWebhook(session.user.companyId, 'photo.uploaded', {
    id: photo.id,
    projectId,
    filePath: photo.filePath,
    category: photo.category,
    uploadedBy: (session.user as any).name || session.user.email,
  })

  return NextResponse.json(photo, { status: 201 })
}
