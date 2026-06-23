import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const sessions = await prisma.loginSession.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { lastAccess: 'desc' },
    take: 50,
  })

  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const record = await prisma.loginSession.create({
    data: {
      userId: (session.user as any).id,
      ipAddress: body.ipAddress || null,
      userAgent: body.userAgent || null,
      browser: body.browser || null,
      companyId: (session.user as any).companyId,
    },
  })

  return NextResponse.json(record, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.loginSession.deleteMany({
    where: { userId: (session.user as any).id },
  })

  return NextResponse.json({ ok: true })
}
