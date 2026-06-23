import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const existing = await prisma.tool.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, toolNumber, category, quantity, available, location, projectId, condition, notes } = body

  const tool = await prisma.tool.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(toolNumber !== undefined && { toolNumber: toolNumber || null }),
      ...(category !== undefined && { category }),
      ...(quantity !== undefined && { quantity: parseInt(quantity) }),
      ...(available !== undefined && { available: parseInt(available) }),
      ...(location !== undefined && { location: location || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(condition !== undefined && { condition }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(tool)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.tool.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.tool.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
