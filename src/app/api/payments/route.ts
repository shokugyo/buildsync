import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

  try {
    let dueDateFilter: { gte: Date; lt: Date } | undefined

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const start = new Date(year, mon - 1, 1)
      const end = new Date(year, mon, 1)
      dueDateFilter = { gte: start, lt: end }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId: (session.user as any).companyId,
        ...(dueDateFilter && { dueDate: dueDateFilter }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        payments: { select: { id: true, amount: true, paidAt: true, paymentMethod: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0)
    const totalPaid = invoices
      .filter(i => i.status === '入金済')
      .reduce((s, i) => s + i.totalAmount, 0)
    const unpaidAmount = totalAmount - totalPaid

    return NextResponse.json({
      invoices,
      summary: {
        totalAmount,
        totalPaid,
        unpaidAmount,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
}
