import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const [year, month] = monthParam.split('-').map(Number)
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 1)

  // Projects
  const allProjects = await prisma.project.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, status: true, createdAt: true },
  })
  const totalProjects = allProjects.length
  const newProjects = allProjects.filter(
    (p) => p.createdAt >= startOfMonth && p.createdAt < endOfMonth
  ).length
  const completedProjects = allProjects.filter(
    (p) =>
      p.status === '完了' &&
      p.createdAt >= startOfMonth &&
      p.createdAt < endOfMonth
  ).length

  // Orders
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: startOfMonth, lt: endOfMonth },
    },
    select: { totalAmount: true },
  })
  const orderCount = orders.length
  const orderAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  // Invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      createdAt: { gte: startOfMonth, lt: endOfMonth },
    },
    select: { totalAmount: true, status: true },
  })
  const invoiceCount = invoices.length
  const invoiceAmount = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)
  const invoicePaid = invoices.filter((i) => i.status === '入金済').length

  // Defects
  const allDefects = await prisma.defect.findMany({
    where: {
      project: { companyId },
    },
    select: { status: true, createdAt: true },
  })
  const openDefects = allDefects.filter(
    (d) => d.status !== '是正済' && d.status !== '対応不要'
  ).length
  const resolvedDefects = allDefects.filter(
    (d) =>
      (d.status === '是正済' || d.status === '対応不要') &&
      d.createdAt >= startOfMonth &&
      d.createdAt < endOfMonth
  ).length
  const totalDefectsThisMonth = allDefects.filter(
    (d) => d.createdAt >= startOfMonth && d.createdAt < endOfMonth
  ).length

  // Schedules
  const schedules = await prisma.schedule.findMany({
    where: {
      project: { companyId },
    },
    select: { progress: true, status: true },
  })
  const totalSchedules = schedules.length
  const completedSchedules = schedules.filter((s) => s.progress === 100).length
  const delayedSchedules = schedules.filter((s) => s.status === '遅延').length

  return NextResponse.json({
    month: monthParam,
    projects: {
      total: totalProjects,
      new: newProjects,
      completed: completedProjects,
    },
    orders: {
      count: orderCount,
      amount: orderAmount,
    },
    invoices: {
      count: invoiceCount,
      amount: invoiceAmount,
      paid: invoicePaid,
    },
    defects: {
      openTotal: openDefects,
      resolvedThisMonth: resolvedDefects,
      totalThisMonth: totalDefectsThisMonth,
    },
    schedules: {
      total: totalSchedules,
      completed: completedSchedules,
      delayed: delayedSchedules,
    },
  })
}
