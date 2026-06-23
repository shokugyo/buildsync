import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId')
  const projectId = searchParams.get('projectId')
  const hasFolderParam = searchParams.has('folderId')

  const documents = await prisma.document.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(hasFolderParam ? { folderId: folderId ?? null } : {}),
      ...(projectId ? { projectId } : {}),
    },
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(documents)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const uploadedBy = (session.user as any).id
  const body = await req.json()
  const { name, fileName, fileUrl, fileSize, mimeType, folderId, projectId } = body

  if (!name || !fileName || !fileUrl) {
    return NextResponse.json({ error: 'ファイル名とURLは必須です' }, { status: 400 })
  }

  const document = await prisma.document.create({
    data: {
      name,
      fileName,
      fileUrl,
      fileSize: fileSize ?? null,
      mimeType: mimeType ?? null,
      folderId: folderId ?? null,
      projectId: projectId ?? null,
      uploadedBy,
      companyId,
    },
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(document, { status: 201 })
}
