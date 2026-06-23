import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// POST: Generate a new share token (delete existing ones first, then create new)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // Delete any existing tokens for this project
  await prisma.projectShareToken.deleteMany({
    where: { projectId: params.id },
  })

  const token = crypto.randomBytes(24).toString('hex')

  const body = await req.json().catch(() => ({}))
  const { expiresAt } = body

  const share = await prisma.projectShareToken.create({
    data: {
      projectId: params.id,
      token,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  return NextResponse.json(share, { status: 201 })
}

// GET: Get current share token if exists
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const share = await prisma.projectShareToken.findFirst({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(share ?? null)
}

// DELETE: Revoke the share token
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.projectShareToken.deleteMany({
    where: { projectId: params.id },
  })

  return NextResponse.json({ success: true })
}
