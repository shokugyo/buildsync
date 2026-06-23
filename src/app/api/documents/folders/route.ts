import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const parentId = searchParams.get('parentId')
  const hasParentParam = searchParams.has('parentId')

  const folders = await prisma.documentFolder.findMany({
    where: {
      companyId,
      ...(projectId ? { projectId } : {}),
      ...(hasParentParam ? { parentId: parentId ?? null } : {}),
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(folders)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, parentId, projectId } = body

  if (!name) return NextResponse.json({ error: 'フォルダ名は必須です' }, { status: 400 })

  const folder = await prisma.documentFolder.create({
    data: {
      name,
      companyId,
      parentId: parentId ?? null,
      projectId: projectId ?? null,
    },
  })

  return NextResponse.json(folder, { status: 201 })
}
