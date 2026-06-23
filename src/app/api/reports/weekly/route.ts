import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const weekStartParam = searchParams.get('weekStart')

  const weekStart = weekStartParam ? new Date(weekStartParam) : (() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  })()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const projects = await prisma.project.findMany({
    where: {
      companyId,
      deletedAt: null,
      updatedAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const workReports = await prisma.workReport.findMany({
    where: {
      companyId,
      reportDate: { gte: weekStart, lt: weekEnd },
    },
    select: {
      id: true,
      reportDate: true,
      location: true,
      project: { select: { id: true, name: true, projectNumber: true } },
      reporter: { select: { name: true } },
    },
    orderBy: { reportDate: 'desc' },
  })

  const schedules = await prisma.schedule.findMany({
    where: {
      project: { companyId },
      endDate: { gte: weekStart, lt: weekEnd },
    },
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
      endDate: true,
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  const completedSchedules = schedules.filter(s => s.progress === 100 || s.status === '完了')
  const delayedSchedules = schedules.filter(s => s.status === '遅延')

  const newDefects = await prisma.defect.findMany({
    where: {
      project: { companyId },
      createdAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const resolvedDefects = await prisma.defect.findMany({
    where: {
      project: { companyId },
      status: { in: ['是正済', '対応不要'] },
      createdAt: { gte: weekStart, lt: weekEnd },
    },
    select: { id: true },
  })

  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      id: true,
      orderNumber: true,
      subject: true,
      totalAmount: true,
      status: true,
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      createdAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      status: true,
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const attendances = await prisma.workerAttendance.findMany({
    where: {
      companyId,
      workDate: { gte: weekStart, lt: weekEnd },
    },
    select: { id: true, workerName: true, workDate: true },
  })

  const workerDays = attendances.length

  const orderTotal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const invoiceTotal = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    projects: {
      count: projects.length,
      list: projects,
    },
    workReports: {
      count: workReports.length,
      list: workReports,
    },
    schedules: {
      completedCount: completedSchedules.length,
      delayedCount: delayedSchedules.length,
      completedList: completedSchedules,
      delayedList: delayedSchedules,
    },
    defects: {
      newCount: newDefects.length,
      resolvedCount: resolvedDefects.length,
      newList: newDefects,
    },
    orders: {
      count: orders.length,
      total: orderTotal,
      list: orders,
    },
    invoices: {
      count: invoices.length,
      total: invoiceTotal,
      list: invoices,
    },
    attendance: {
      workerDays,
    },
  })
}
