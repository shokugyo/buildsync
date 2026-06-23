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
  const expiringSoon = searchParams.get('expiringSoon')

  const now = new Date()
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const warranties = await prisma.warranty.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
      ...(expiringSoon === 'true' && { endDate: { lte: ninetyDaysLater } }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { endDate: 'asc' },
  })

  return NextResponse.json(warranties)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { projectId, title, category, startDate, endDate, contractor, notes } = body

  if (!projectId || !title || !category || !startDate || !endDate) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const warranty = await prisma.warranty.create({
    data: {
      projectId,
      title,
      category,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      contractor: contractor || null,
      notes: notes || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(warranty, { status: 201 })
}
