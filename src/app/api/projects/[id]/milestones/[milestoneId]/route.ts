import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; milestoneId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { title, description, dueDate, status, completedAt } = body

  const data: any = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description || null
  if (dueDate !== undefined) data.dueDate = new Date(dueDate)
  if (status !== undefined) data.status = status
  if (completedAt !== undefined) data.completedAt = completedAt ? new Date(completedAt) : null

  const milestone = await prisma.milestone.update({
    where: { id: params.milestoneId, companyId },
    data,
  })

  return NextResponse.json(milestone)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; milestoneId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  await prisma.milestone.delete({
    where: { id: params.milestoneId, companyId },
  })

  return NextResponse.json({ success: true })
}
