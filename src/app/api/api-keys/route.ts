import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const apiKeys = await prisma.apiKey.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      key: true,
      lastUsedAt: true,
      expiresAt: true,
      enabled: true,
      createdAt: true,
    },
  })

  // Mask the key: show only last 4 characters
  const masked = apiKeys.map(k => ({
    ...k,
    key: `${'*'.repeat(28)}${k.key.slice(-4)}`,
  }))

  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, expiresAt } = body

  if (!name) return NextResponse.json({ error: '名前は必須です' }, { status: 400 })

  const rawKey = crypto.randomBytes(32).toString('hex')

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key: rawKey,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      companyId,
    },
  })

  // Return the full key only once
  return NextResponse.json({
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey,
    createdAt: apiKey.createdAt,
    expiresAt: apiKey.expiresAt,
    enabled: apiKey.enabled,
  }, { status: 201 })
}
