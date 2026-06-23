import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.insurance.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, insurerName, policyNumber, insuredType, projectId, startDate, endDate, premium, coverage, notes } = body

  const insurance = await prisma.insurance.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(insurerName !== undefined && { insurerName }),
      ...(policyNumber !== undefined && { policyNumber: policyNumber || null }),
      ...(insuredType !== undefined && { insuredType }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(premium !== undefined && { premium: premium ? parseFloat(premium) : null }),
      ...(coverage !== undefined && { coverage: coverage ? parseFloat(coverage) : null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(insurance)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.insurance.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.insurance.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
