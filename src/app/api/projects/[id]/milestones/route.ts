import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const milestones = await prisma.milestone.findMany({
    where: { projectId: params.id, companyId },
    orderBy: { dueDate: 'asc' },
  })

  return NextResponse.json(milestones)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { title, description, dueDate } = body

  if (!title || !dueDate) {
    return NextResponse.json({ error: 'タイトルと期日は必須です' }, { status: 400 })
  }

  const milestone = await prisma.milestone.create({
    data: {
      projectId: params.id,
      title,
      description: description || null,
      dueDate: new Date(dueDate),
      companyId,
    },
  })

  return NextResponse.json(milestone, { status: 201 })
}
