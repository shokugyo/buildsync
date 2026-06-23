import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const document = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.folderId !== undefined && { folderId: body.folderId ?? null }),
    },
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(document)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.document.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
