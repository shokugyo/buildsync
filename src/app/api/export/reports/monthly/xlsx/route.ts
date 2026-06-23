import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

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
    select: { status: true, createdAt: true },
  })
  const totalProjects = allProjects.length
  const newProjects = allProjects.filter(
    (p) => p.createdAt >= startOfMonth && p.createdAt < endOfMonth
  ).length
  const completedProjects = allProjects.filter(
    (p) => p.status === '完了' && p.createdAt >= startOfMonth && p.createdAt < endOfMonth
  ).length

  // Orders
  const orders = await prisma.order.findMany({
    where: { companyId, createdAt: { gte: startOfMonth, lt: endOfMonth } },
    select: { totalAmount: true },
  })
  const orderCount = orders.length
  const orderAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  // Invoices
  const invoices = await prisma.invoice.findMany({
    where: { companyId, createdAt: { gte: startOfMonth, lt: endOfMonth } },
    select: { totalAmount: true, status: true },
  })
  const invoiceCount = invoices.length
  const invoiceAmount = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)
  const invoicePaid = invoices.filter((i) => i.status === '入金済').length

  // Defects
  const allDefects = await prisma.defect.findMany({
    where: { project: { companyId } },
    select: { status: true, createdAt: true },
  })
  const openDefects = allDefects.filter(
    (d) => d.status !== '是正済' && d.status !== '対応不要'
  ).length
  const totalDefectsThisMonth = allDefects.filter(
    (d) => d.createdAt >= startOfMonth && d.createdAt < endOfMonth
  ).length
  const resolvedDefects = allDefects.filter(
    (d) =>
      (d.status === '是正済' || d.status === '対応不要') &&
      d.createdAt >= startOfMonth &&
      d.createdAt < endOfMonth
  ).length

  // Schedules
  const schedules = await prisma.schedule.findMany({
    where: { project: { companyId } },
    select: { progress: true, status: true },
  })
  const totalSchedules = schedules.length
  const completedSchedules = schedules.filter((s) => s.progress === 100).length
  const delayedSchedules = schedules.filter((s) => s.status === '遅延').length

  const scheduleCompletionRate =
    totalSchedules > 0
      ? ((completedSchedules / totalSchedules) * 100).toFixed(1)
      : '0.0'

  const defectResolutionRate =
    totalDefectsThisMonth > 0
      ? ((resolvedDefects / totalDefectsThisMonth) * 100).toFixed(1)
      : '0.0'

  const rows: (string | number)[][] = [
    ['月次サマリーレポート', monthParam],
    [],
    ['カテゴリ', '項目', '値', '単位'],
    // Projects
    ['案件', '総数', totalProjects, '件'],
    ['案件', '新規（今月）', newProjects, '件'],
    ['案件', '完了（今月）', completedProjects, '件'],
    // Orders
    ['受注（今月）', '発注件数', orderCount, '件'],
    ['受注（今月）', '発注金額', Math.round(orderAmount / 10000), '万円'],
    // Invoices
    ['請求（今月）', '請求件数', invoiceCount, '件'],
    ['請求（今月）', '請求金額', Math.round(invoiceAmount / 10000), '万円'],
    ['請求（今月）', '入金済', invoicePaid, '件'],
    // Schedules
    ['工程', '完了率', Number(scheduleCompletionRate), '%'],
    ['工程', '遅延数', delayedSchedules, '件'],
    ['工程', '完了タスク', completedSchedules, '件'],
    ['工程', '総タスク数', totalSchedules, '件'],
    // Quality
    ['品質（是正）', '未対応指摘', openDefects, '件'],
    ['品質（是正）', '今月指摘', totalDefectsThisMonth, '件'],
    ['品質（是正）', '是正率（今月）', Number(defectResolutionRate), '%'],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Set column widths
  ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 8 }]

  XLSX.utils.book_append_sheet(wb, ws, '月次サマリー')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="monthly_report_${monthParam}.xlsx"`,
    },
  })
}
