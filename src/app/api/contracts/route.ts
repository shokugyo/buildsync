import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const contractType = searchParams.get('contractType')
  const projectId = searchParams.get('projectId')

  const contracts = await prisma.contract.findMany({
    where: {
      companyId,
      ...(status && { status }),
      ...(contractType && { contractType }),
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contracts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { projectId, customerId, title, contractType, amount, startDate, endDate, signedAt, fileUrl, fileName, status, notes } = body

  if (!title || !contractType) {
    return NextResponse.json({ error: 'タイトルと種別は必須です' }, { status: 400 })
  }

  const count = await prisma.contract.count({ where: { companyId } })
  const contractNumber = `C-${String(count + 1).padStart(3, '0')}`

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      title,
      contractType,
      amount: amount ? parseFloat(amount) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      signedAt: signedAt ? new Date(signedAt) : null,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      status: status || '作成中',
      notes: notes || null,
      projectId: projectId || null,
      customerId: customerId || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(contract, { status: 201 })
}
