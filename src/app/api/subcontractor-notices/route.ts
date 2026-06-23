import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const companyId = (session.user as any).companyId

  const notices = await prisma.subcontractorNotice.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(notices)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    projectId,
    contractorName,
    representative,
    address,
    licenseNumber,
    workType,
    workPeriodStart,
    workPeriodEnd,
  } = body

  if (!projectId || !contractorName || !workType) {
    return NextResponse.json({ error: '案件・業者名・工種は必須です' }, { status: 400 })
  }

  const notice = await prisma.subcontractorNotice.create({
    data: {
      projectId,
      contractorName,
      representative: representative || null,
      address: address || null,
      licenseNumber: licenseNumber || null,
      workType,
      workPeriodStart: workPeriodStart ? new Date(workPeriodStart) : null,
      workPeriodEnd: workPeriodEnd ? new Date(workPeriodEnd) : null,
      companyId: (session.user as any).companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(notice, { status: 201 })
}
