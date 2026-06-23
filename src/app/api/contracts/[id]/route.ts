import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  if (!contract) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(contract)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const existing = await prisma.contract.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { title, contractType, amount, startDate, endDate, signedAt, fileUrl, fileName, status, notes, projectId, customerId } = body

  const contract = await prisma.contract.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(contractType !== undefined && { contractType }),
      ...(amount !== undefined && { amount: amount !== '' ? parseFloat(amount) : null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(signedAt !== undefined && { signedAt: signedAt ? new Date(signedAt) : null }),
      ...(fileUrl !== undefined && { fileUrl: fileUrl || null }),
      ...(fileName !== undefined && { fileName: fileName || null }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(customerId !== undefined && { customerId: customerId || null }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(contract)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.contract.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.contract.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
