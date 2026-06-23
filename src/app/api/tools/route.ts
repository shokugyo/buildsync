import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const projectId = searchParams.get('projectId')

  const where: any = { companyId }
  if (category) where.category = category
  if (projectId) where.projectId = projectId

  const tools = await prisma.tool.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tools)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, toolNumber, category, quantity, available, location, projectId, condition, notes } = body

  if (!name) return NextResponse.json({ error: '工具名は必須です' }, { status: 400 })
  if (!category) return NextResponse.json({ error: 'カテゴリは必須です' }, { status: 400 })

  const qty = quantity ? parseInt(quantity) : 1
  const avail = available !== undefined ? parseInt(available) : qty

  const tool = await prisma.tool.create({
    data: {
      name,
      toolNumber: toolNumber || null,
      category,
      quantity: qty,
      available: avail,
      location: location || null,
      projectId: projectId || null,
      condition: condition || '良好',
      notes: notes || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(tool, { status: 201 })
}
