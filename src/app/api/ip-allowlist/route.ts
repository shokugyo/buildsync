import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: 会社のIPホワイトリスト取得
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const restrictions = await prisma.ipRestriction.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(restrictions)
}

// POST: IPアドレス追加 (body: { ipAddress: string, label?: string })
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { ipAddress, label } = await req.json()

  if (!ipAddress) {
    return NextResponse.json({ error: 'ipAddressは必須です' }, { status: 400 })
  }

  // CIDRが含まれていない場合は /32 を補完
  const cidr = ipAddress.includes('/') ? ipAddress : `${ipAddress}/32`

  const restriction = await prisma.ipRestriction.create({
    data: {
      cidr,
      description: label ?? null,
      enabled: true,
      companyId,
    },
  })

  return NextResponse.json(restriction, { status: 201 })
}

// DELETE: IP削除 (body: { id: string })
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'idは必須です' }, { status: 400 })
  }

  const existing = await prisma.ipRestriction.findFirst({
    where: { id, companyId },
  })

  if (!existing) {
    return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 })
  }

  await prisma.ipRestriction.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
