import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== '管理者' && role !== '会社管理者') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const companyId = (session.user as any).companyId

  const [projects, customers, suppliers, orders, invoices, schedules, attendance] = await Promise.all([
    prisma.project.findMany({
      where: { companyId },
      include: {
        customer: { select: { name: true } },
        manager: { select: { name: true } },
        sales: { select: { name: true } },
      },
      orderBy: { projectNumber: 'asc' },
    }),
    prisma.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    }),
    prisma.order.findMany({
      where: { companyId },
      include: {
        project: { select: { projectNumber: true, name: true } },
        supplier: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({
      where: { companyId },
      include: {
        project: { select: { projectNumber: true, name: true } },
        customer: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.schedule.findMany({
      where: { project: { companyId } },
      include: {
        project: { select: { projectNumber: true, name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: [{ project: { projectNumber: 'asc' } }, { startDate: 'asc' }],
    }),
    prisma.workerAttendance.findMany({
      where: { companyId },
      include: { project: { select: { projectNumber: true, name: true } } },
      orderBy: { workDate: 'desc' },
    }),
  ])

  const exportDate = new Date().toISOString().slice(0, 10)
  const payload = {
    exportedAt: new Date().toISOString(),
    companyId,
    projects,
    customers,
    suppliers,
    orders,
    invoices,
    schedules,
    attendance,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="buildsync-export-${exportDate}.json"`,
    },
  })
}
