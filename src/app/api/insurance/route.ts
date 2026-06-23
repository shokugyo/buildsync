import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const expiringOnly = searchParams.get('expiringOnly') === 'true'

  const where: any = { companyId }
  if (projectId) where.projectId = projectId
  if (expiringOnly) {
    const now = new Date()
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    where.endDate = { gte: now, lte: in30 }
  }

  const insurances = await prisma.insurance.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(insurances)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, insurerName, policyNumber, insuredType, projectId, startDate, endDate, premium, coverage, notes } = body

  if (!name) return NextResponse.json({ error: '保険名は必須です' }, { status: 400 })
  if (!insurerName) return NextResponse.json({ error: '保険会社は必須です' }, { status: 400 })
  if (!insuredType) return NextResponse.json({ error: '種別は必須です' }, { status: 400 })

  const insurance = await prisma.insurance.create({
    data: {
      name,
      insurerName,
      policyNumber: policyNumber || null,
      insuredType,
      projectId: projectId || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      premium: premium ? parseFloat(premium) : null,
      coverage: coverage ? parseFloat(coverage) : null,
      notes: notes || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(insurance, { status: 201 })
}
