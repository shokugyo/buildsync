import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const source = await prisma.project.findFirst({
    where: { id: params.id, companyId },
  })
  if (!source) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const count = await prisma.project.count({ where: { companyId } })
  const projectNumber = `P-${String(count + 1).padStart(3, '0')}`

  const newProject = await prisma.project.create({
    data: {
      projectNumber,
      name: `${source.name}（コピー）`,
      status: '引合',
      customerId: source.customerId,
      address: source.address,
      workType: source.workType,
      managerId: source.managerId,
      salesId: source.salesId,
      contractAmount: source.contractAmount,
      estimatedCost: source.estimatedCost,
      notes: source.notes,
      propertyType: source.propertyType,
      propertyName: source.propertyName,
      propertyNameKana: source.propertyNameKana,
      labels: source.labels,
      companyId,
    },
  })

  return NextResponse.json(newProject, { status: 201 })
}
