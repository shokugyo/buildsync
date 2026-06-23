import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const companyId = (session.user as any).companyId

  const [
    projects,
    users,
    schedules,
    equipment,
    invoices,
    orders,
    suppliers,
    customers,
    documents,
    inspections,
  ] = await Promise.all([
    prisma.project.count({ where: { companyId, deletedAt: null } }),
    prisma.user.count({ where: { companyId } }),
    prisma.schedule.count({ where: { project: { companyId } } }),
    prisma.equipment.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.order.count({ where: { companyId } }),
    prisma.supplier.count({ where: { companyId } }),
    prisma.customer.count({ where: { companyId } }),
    prisma.document.count({ where: { companyId, deletedAt: null } }),
    prisma.inspection.count({ where: { project: { companyId, deletedAt: null } } }),
  ])

  return NextResponse.json({
    projects,
    users,
    schedules,
    equipment,
    invoices,
    orders,
    suppliers,
    customers,
    documents,
    inspections,
  })
}
