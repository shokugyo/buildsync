import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const entries = await prisma.constructionLedger.findMany({
    where: { projectId: params.id, companyId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { contractorName, contractorType, workType, contractAmount, startDate, endDate, supervisorName, licenseNumber } = body

  if (!contractorName || !contractorType || !workType) {
    return NextResponse.json({ error: '業者名、業者区分、工事種別は必須です' }, { status: 400 })
  }

  const entry = await prisma.constructionLedger.create({
    data: {
      projectId: params.id,
      contractorName,
      contractorType,
      workType,
      contractAmount: contractAmount ? parseFloat(contractAmount) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      supervisorName: supervisorName || null,
      licenseNumber: licenseNumber || null,
      companyId,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
