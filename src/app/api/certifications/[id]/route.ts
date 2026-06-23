import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { workerName, userId, certName, certNumber, issuedAt, expiresAt, issuedBy } = body

  try {
    const certification = await prisma.workerCertification.update({
      where: { id: params.id },
      data: {
        ...(workerName !== undefined && { workerName }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(certName !== undefined && { certName }),
        ...(certNumber !== undefined && { certNumber: certNumber || null }),
        ...(issuedAt !== undefined && { issuedAt: issuedAt ? new Date(issuedAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(issuedBy !== undefined && { issuedBy: issuedBy || null }),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(certification)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.workerCertification.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
