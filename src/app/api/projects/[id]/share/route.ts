import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { label, expiresAt } = body

  const token = crypto.randomBytes(24).toString('hex')

  const share = await prisma.projectShareToken.create({
    data: {
      projectId: params.id,
      token,
      label: label || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  return NextResponse.json(share, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const shares = await prisma.projectShareToken.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(shares)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('tokenId')
  if (!tokenId) return NextResponse.json({ error: 'tokenIdが必要です' }, { status: 400 })

  await prisma.projectShareToken.deleteMany({ where: { id: tokenId, projectId: params.id } })
  return NextResponse.json({ success: true })
}
