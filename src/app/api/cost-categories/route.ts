import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const categories = await prisma.costCategory.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { name, code, sortOrder } = body

  if (!name) return NextResponse.json({ error: '科目名は必須です' }, { status: 400 })

  try {
    const category = await prisma.costCategory.create({
      data: {
        name,
        code: code || null,
        sortOrder: sortOrder ?? 0,
        enabled: true,
        companyId,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: '同じ科目名が既に存在します' }, { status: 400 })
  }
}
