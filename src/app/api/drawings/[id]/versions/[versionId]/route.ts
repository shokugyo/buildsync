import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const version = await prisma.drawingVersion.findFirst({
    where: { id: params.versionId, drawingId: params.id },
  })
  if (!version) return NextResponse.json({ error: 'バージョンが見つかりません' }, { status: 404 })

  await prisma.drawing.update({
    where: { id: params.id },
    data: { filePath: version.fileUrl },
  })

  return NextResponse.json({ success: true, fileUrl: version.fileUrl, version: version.version })
}
