import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { name, rate, isDefault } = body

  if (isDefault) {
    await prisma.taxRate.updateMany({
      where: { companyId },
      data: { isDefault: false },
    })
  }

  try {
    const taxRate = await prisma.taxRate.update({
      where: { id: params.id, companyId },
      data: {
        ...(name !== undefined && { name }),
        ...(rate !== undefined && { rate: parseFloat(rate) }),
        ...(isDefault !== undefined && { isDefault: !!isDefault }),
      },
    })
    return NextResponse.json(taxRate)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  try {
    await prisma.taxRate.update({
      where: { id: params.id, companyId },
      data: { enabled: false },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
