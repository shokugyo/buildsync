import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const template = await prisma.estimateTemplate.findFirst({
    where: { id: params.id, companyId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!template) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const template = await prisma.estimateTemplate.findFirst({ where: { id: params.id, companyId } })
  if (!template) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.estimateTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
