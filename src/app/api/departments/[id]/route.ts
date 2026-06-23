import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { name, code, managerId } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: '部門名は必須です' }, { status: 400 })
  }

  try {
    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        managerId: managerId || null,
      },
      include: { manager: { select: { id: true, name: true } } },
    })
    return NextResponse.json(department)
  } catch {
    return NextResponse.json({ error: '同じ名前の部門が既に存在します' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.department.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
