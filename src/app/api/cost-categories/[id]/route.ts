import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { name, code, sortOrder, enabled } = body

  try {
    const category = await prisma.costCategory.update({
      where: { id: params.id, companyId },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(enabled !== undefined && { enabled }),
      },
    })
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  try {
    await prisma.costCategory.delete({
      where: { id: params.id, companyId },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
