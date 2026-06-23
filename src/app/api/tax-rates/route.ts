import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const taxRates = await prisma.taxRate.findMany({
    where: { companyId, enabled: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(taxRates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { name, rate, isDefault } = body

  if (!name || rate === undefined) {
    return NextResponse.json({ error: '名称と税率は必須です' }, { status: 400 })
  }

  if (isDefault) {
    await prisma.taxRate.updateMany({
      where: { companyId },
      data: { isDefault: false },
    })
  }

  const taxRate = await prisma.taxRate.create({
    data: {
      name,
      rate: parseFloat(rate),
      isDefault: !!isDefault,
      enabled: true,
      companyId,
    },
  })

  return NextResponse.json(taxRate, { status: 201 })
}
