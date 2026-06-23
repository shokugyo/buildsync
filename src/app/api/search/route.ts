import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''

  if (q.length < 2) return NextResponse.json([])

  const [projects, customers, suppliers, orders, invoices, schedules, photos] = await Promise.all([
    prisma.project.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ name: { contains: q } }, { projectNumber: { contains: q } }],
      },
      select: { id: true, name: true, projectNumber: true },
      take: 5,
    }),
    prisma.customer.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ name: { contains: q } }],
      },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.supplier.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ name: { contains: q } }],
      },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        companyId,
        OR: [{ subject: { contains: q } }],
      },
      select: { id: true, subject: true, orderNumber: true, projectId: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        OR: [{ invoiceNumber: { contains: q } }],
      },
      select: { id: true, invoiceNumber: true, projectId: true },
      take: 5,
    }),
    prisma.schedule.findMany({
      where: {
        project: { companyId },
        OR: [{ name: { contains: q } }],
      },
      select: { id: true, name: true, projectId: true },
      take: 5,
    }),
    prisma.photo.findMany({
      where: {
        project: { companyId },
        OR: [{ comment: { contains: q } }],
      },
      select: { id: true, comment: true, projectId: true },
      take: 5,
    }),
  ])

  const results: { type: string; id: string; label: string; sublabel?: string; url: string }[] = [
    ...projects.map(p => ({ type: 'project', id: p.id, label: p.name, sublabel: p.projectNumber, url: `/projects/${p.id}` })),
    ...customers.map(c => ({ type: 'customer', id: c.id, label: c.name, url: `/customers/${c.id}` })),
    ...suppliers.map(s => ({ type: 'supplier', id: s.id, label: s.name, url: `/suppliers` })),
    ...orders.map(o => ({ type: 'order', id: o.id, label: o.subject, sublabel: o.orderNumber, url: `/projects/${o.projectId}/orders/${o.id}` })),
    ...invoices.map(i => ({ type: 'invoice', id: i.id, label: i.invoiceNumber, url: `/projects/${i.projectId}/invoices/${i.id}` })),
    ...schedules.map(s => ({ type: 'schedule', id: s.id, label: s.name, url: `/projects/${s.projectId}/schedule` })),
    ...photos.map(p => ({ type: 'photo', id: p.id, label: p.comment || '写真', url: `/projects/${p.projectId}/photos` })),
  ]

  return NextResponse.json(results)
}
