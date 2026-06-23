import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const departments = await prisma.department.findMany({
    where: { companyId: (session.user as any).companyId },
    include: { manager: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(departments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { name, code, managerId } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: '部門名は必須です' }, { status: 400 })
  }

  try {
    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        managerId: managerId || null,
        companyId: (session.user as any).companyId,
      },
      include: { manager: { select: { id: true, name: true } } },
    })
    return NextResponse.json(department, { status: 201 })
  } catch {
    return NextResponse.json({ error: '同じ名前の部門が既に存在します' }, { status: 409 })
  }
}
