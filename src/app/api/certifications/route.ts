import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workerName = searchParams.get('workerName')
  const expiringSoon = searchParams.get('expiringSoon') === 'true'
  const companyId = (session.user as { companyId: string }).companyId

  const now = new Date()
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const certifications = await prisma.workerCertification.findMany({
    where: {
      companyId,
      ...(workerName && {
        workerName: { contains: workerName },
      }),
      ...(expiringSoon && {
        expiresAt: { lte: ninetyDaysLater },
      }),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(certifications)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { workerName, userId, certName, certNumber, issuedAt, expiresAt, issuedBy } = body

  if (!workerName || !certName) {
    return NextResponse.json({ error: '作業員名と資格名は必須です' }, { status: 400 })
  }

  const certification = await prisma.workerCertification.create({
    data: {
      workerName,
      userId: userId || null,
      certName,
      certNumber: certNumber || null,
      issuedAt: issuedAt ? new Date(issuedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      issuedBy: issuedBy || null,
      companyId: (session.user as { companyId: string }).companyId,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(certification, { status: 201 })
}
