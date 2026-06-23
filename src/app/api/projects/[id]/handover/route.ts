import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      manager: { select: { id: true, name: true } },
      company: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          representativeName: true,
          registrationNumber: true,
        },
      },
      completion: true,
      completionDocuments: {
        select: { category: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!project || project.companyId !== companyId) {
    return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })
  }

  const categoryCount: Record<string, number> = {}
  for (const doc of project.completionDocuments) {
    categoryCount[doc.category] = (categoryCount[doc.category] || 0) + 1
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      projectNumber: project.projectNumber,
      address: project.address,
      workType: project.workType,
      contractAmount: project.contractAmount,
      startDate: project.startDate,
      endDate: project.endDate,
      deliveryDate: project.deliveryDate,
      status: project.status,
    },
    customer: project.customer,
    manager: project.manager,
    company: project.company,
    completion: project.completion,
    completionDocSummary: categoryCount,
  })
}
