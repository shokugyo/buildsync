import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const template = await prisma.projectTemplate.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    include: {
      scheduleTemplates: { orderBy: { offsetDays: 'asc' } },
      checklistTemplates: true,
    },
  })

  if (!template) return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })
  return NextResponse.json(template)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const template = await prisma.projectTemplate.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
  })
  if (!template) return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })

  const body = await req.json()
  const { name, description, workType, scheduleTemplates, checklistTemplates } = body

  await prisma.projectTemplate.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(workType !== undefined && { workType: workType || null }),
    },
  })

  if (scheduleTemplates !== undefined) {
    await prisma.scheduleTemplate.deleteMany({ where: { templateId: params.id } })
    if (scheduleTemplates.length > 0) {
      await prisma.scheduleTemplate.createMany({
        data: scheduleTemplates.map((s: any) => ({
          templateId: params.id,
          name: s.name,
          offsetDays: s.offsetDays ?? 0,
          durationDays: s.durationDays ?? 1,
          category: s.category || null,
        })),
      })
    }
  }

  if (checklistTemplates !== undefined) {
    await prisma.checklistTemplateItem.deleteMany({ where: { templateId: params.id } })
    if (checklistTemplates.length > 0) {
      await prisma.checklistTemplateItem.createMany({
        data: checklistTemplates.map((c: any) => ({
          templateId: params.id,
          content: c.content,
          category: c.category || null,
        })),
      })
    }
  }

  const updated = await prisma.projectTemplate.findFirst({
    where: { id: params.id },
    include: {
      scheduleTemplates: { orderBy: { offsetDays: 'asc' } },
      checklistTemplates: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const template = await prisma.projectTemplate.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
  })
  if (!template) return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })

  await prisma.projectTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
