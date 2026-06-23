import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5)

  if (ids.length === 0) return NextResponse.json([])

  const projects = await prisma.project.findMany({
    where: { id: { in: ids }, companyId, deletedAt: null },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      status: true,
      contractAmount: true,
      schedules: { select: { progress: true, status: true } },
      orders: { select: { totalAmount: true } },
      invoices: { select: { totalAmount: true } },
      defects: { select: { id: true } },
    },
  })

  const result = projects.map(p => {
    const totalOrdered = p.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const totalInvoiced = p.invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    const grossProfit = (p.contractAmount || 0) - totalOrdered
    const grossProfitRate =
      p.contractAmount && p.contractAmount > 0
        ? (grossProfit / p.contractAmount) * 100
        : 0

    const totalSchedules = p.schedules.length
    const completedSchedules = p.schedules.filter(s => s.progress === 100 || s.status === '完了').length
    const scheduleCompletionRate =
      totalSchedules > 0 ? (completedSchedules / totalSchedules) * 100 : 0

    return {
      id: p.id,
      name: p.name,
      projectNumber: p.projectNumber,
      status: p.status,
      contractAmount: p.contractAmount || 0,
      totalOrdered,
      totalInvoiced,
      grossProfit,
      grossProfitRate,
      scheduleCompletionRate,
      defectCount: p.defects.length,
    }
  })

  const orderedResult = ids.map(id => result.find(r => r.id === id)).filter(Boolean)

  return NextResponse.json(orderedResult)
}
