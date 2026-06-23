import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const docs = await prisma.completionDocument.findMany({
    where: { projectId: params.id, companyId },
    include: { uploader: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(docs)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()
  const { category, name, fileUrl, fileName, notes } = body

  if (!category || !name || !fileUrl || !fileName) {
    return NextResponse.json({ error: 'カテゴリ、名称、ファイルURLは必須です' }, { status: 400 })
  }

  const doc = await prisma.completionDocument.create({
    data: {
      projectId: params.id,
      category,
      name,
      fileUrl,
      fileName,
      uploadedBy: userId,
      notes: notes || null,
      companyId,
    },
    include: { uploader: { select: { id: true, name: true } } },
  })

  return NextResponse.json(doc, { status: 201 })
}
