import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId
  const templates = await prisma.inspectionTemplate.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(templates.map(t => ({ ...t, items: JSON.parse(t.items) })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId
  const { name, items } = await req.json()
  if (!name) return NextResponse.json({ error: 'テンプレート名は必須です' }, { status: 400 })
  const template = await prisma.inspectionTemplate.create({
    data: { name, items: JSON.stringify(items || []), companyId },
  })
  return NextResponse.json({ ...template, items: JSON.parse(template.items) })
}
