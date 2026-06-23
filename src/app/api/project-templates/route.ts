import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const templates = await prisma.projectTemplate.findMany({
    where: { companyId: (session.user as any).companyId },
    include: {
      scheduleTemplates: { orderBy: { offsetDays: 'asc' } },
      checklistTemplates: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { name, description, workType, scheduleTemplates = [], checklistTemplates = [] } = body

  if (!name) return NextResponse.json({ error: 'テンプレート名は必須です' }, { status: 400 })

  const template = await prisma.projectTemplate.create({
    data: {
      name,
      description: description || null,
      workType: workType || null,
      companyId: (session.user as any).companyId,
      scheduleTemplates: {
        create: scheduleTemplates.map((s: any) => ({
          name: s.name,
          offsetDays: s.offsetDays ?? 0,
          durationDays: s.durationDays ?? 1,
          category: s.category || null,
        })),
      },
      checklistTemplates: {
        create: checklistTemplates.map((c: any) => ({
          content: c.content,
          category: c.category || null,
        })),
      },
    },
    include: {
      scheduleTemplates: { orderBy: { offsetDays: 'asc' } },
      checklistTemplates: true,
    },
  })

  return NextResponse.json(template, { status: 201 })
}
