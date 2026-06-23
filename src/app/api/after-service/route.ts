import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')
  const status = searchParams.get('status')

  const records = await prisma.afterServiceRecord.findMany({
    where: {
      companyId: (session.user as any).companyId,
      ...(customerId && { customerId }),
      ...(status && { status }),
    },
    include: {
      customer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { reportedAt: 'desc' },
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { customerId, projectId, reportedAt, content, response, respondedAt, status } = body

  if (!customerId || !reportedAt || !content) {
    return NextResponse.json({ error: '顧客、報告日、内容は必須です' }, { status: 400 })
  }

  const record = await prisma.afterServiceRecord.create({
    data: {
      customerId,
      projectId: projectId || null,
      reportedAt: new Date(reportedAt),
      content,
      response: response || null,
      respondedAt: respondedAt ? new Date(respondedAt) : null,
      status: status || '未対応',
      companyId: (session.user as any).companyId,
    },
    include: {
      customer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(record, { status: 201 })
}
