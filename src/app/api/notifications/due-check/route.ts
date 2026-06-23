import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notify'

// N-014: 支払期限通知 (3日前) + N-015: 予算超過通知
// This endpoint is designed to be called by a cron job (no user session required).
// Protect with CRON_SECRET header or call from /api/cron/daily.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysLater = new Date(today)
  threeDaysLater.setDate(today.getDate() + 3)
  threeDaysLater.setHours(23, 59, 59, 999)

  // ── N-014: Invoices due within 3 days ──────────────────────────────────────
  const dueSoonInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: { gte: today, lte: threeDaysLater },
      status: { notIn: ['入金済', '完了', '取消'] },
    },
    include: {
      project: { select: { name: true, companyId: true, managerId: true, salesId: true } },
    },
  })

  let n014Count = 0
  for (const inv of dueSoonInvoices) {
    const userIds = new Set<string>()
    if (inv.project?.managerId) userIds.add(inv.project.managerId)
    if (inv.project?.salesId) userIds.add(inv.project.salesId)

    // Also notify company admin/manager roles
    if (inv.project?.companyId) {
      const admins = await prisma.user.findMany({
        where: {
          companyId: inv.project.companyId,
          role: { in: ['管理者', 'マネージャー', 'admin', 'manager'] },
        },
        select: { id: true },
      })
      admins.forEach(a => userIds.add(a.id))
    }

    const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ja-JP') : ''
    const daysLeft = inv.dueDate
      ? Math.ceil((new Date(inv.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    for (const userId of Array.from(userIds)) {
      await sendNotification({
        userId,
        title: '支払期限が近づいています',
        content: `「${inv.project?.name}」の請求 ${inv.invoiceNumber} の支払期限（${dueDateStr}）まであと${daysLeft}日です`,
        type: 'payment_due',
        link: '/invoices',
      })
      n014Count++
    }
  }

  // ── N-015: Budget overrun detection ────────────────────────────────────────
  // Compare total budget amounts vs total ordered amounts per project
  const allBudgets = await prisma.budget.findMany({
    where: { amount: { gt: 0 } },
    select: { projectId: true, amount: true, companyId: true },
  })

  // Group budgets by project
  const budgetByProject = new Map<string, number>()
  for (const b of allBudgets) {
    budgetByProject.set(b.projectId, (budgetByProject.get(b.projectId) || 0) + b.amount)
  }

  // Get total orders per project
  const projectOrders = await prisma.order.groupBy({
    by: ['projectId'],
    _sum: { totalAmount: true },
  })

  const overrunBudgets: { projectId: string; budgetAmount: number; orderedAmount: number }[] = []
  for (const po of projectOrders) {
    const budgetAmount = budgetByProject.get(po.projectId) || 0
    const orderedAmount = po._sum.totalAmount || 0
    if (budgetAmount > 0 && orderedAmount > budgetAmount) {
      overrunBudgets.push({ projectId: po.projectId, budgetAmount, orderedAmount })
    }
  }

  // Fetch project info for overrun projects
  const overrunProjectIds = overrunBudgets.map(o => o.projectId)
  const overrunProjects = overrunProjectIds.length > 0
    ? await prisma.project.findMany({
        where: { id: { in: overrunProjectIds } },
        select: { id: true, name: true, managerId: true },
      })
    : []
  const projectInfoMap = new Map(overrunProjects.map(p => [p.id, p]))

  let n015Count = 0
  for (const overrun of overrunBudgets) {
    const project = projectInfoMap.get(overrun.projectId)
    if (!project?.managerId) continue
    const overAmount = overrun.orderedAmount - overrun.budgetAmount
    const overPct = overrun.budgetAmount > 0
      ? Math.round((overAmount / overrun.budgetAmount) * 100)
      : 0
    await sendNotification({
      userId: project.managerId,
      title: '予算超過を検知しました',
      content: `「${project.name}」で予算超過が発生しています（予算: ${overrun.budgetAmount.toLocaleString()}円、発注額: ${overrun.orderedAmount.toLocaleString()}円、超過: ${overAmount.toLocaleString()}円 / ${overPct}%超）`,
      type: 'budget_overrun',
      link: `/projects/${project.id}`,
    })
    n015Count++
  }

  // ── N-016: Schedule delays ─────────────────────────────────────────────────
  const delayedSchedules = await prisma.schedule.findMany({
    where: {
      endDate: { lt: today },
      status: { not: '完了' },
    },
    include: {
      project: { select: { id: true, name: true, managerId: true } },
    },
  })

  let n016Count = 0
  for (const sch of delayedSchedules) {
    if (!sch.project?.managerId) continue
    const daysLate = Math.floor((today.getTime() - new Date(sch.endDate).getTime()) / (1000 * 60 * 60 * 24))
    await sendNotification({
      userId: sch.project.managerId,
      title: '工程が遅延しています',
      content: `「${sch.project.name}」の工程「${sch.name}」が${daysLate}日遅延しています（予定終了: ${new Date(sch.endDate).toLocaleDateString('ja-JP')}、ステータス: ${sch.status}）`,
      type: 'schedule_delay',
      link: `/projects/${sch.project.id}`,
    })
    n016Count++
  }

  // ── N-017: Equipment inspection due within 7 days ──────────────────────────
  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(today.getDate() + 7)
  sevenDaysLater.setHours(23, 59, 59, 999)

  const dueSoonEquipment = await prisma.equipment.findMany({
    where: {
      nextInspectionAt: { gte: today, lte: sevenDaysLater },
    },
    include: {
      company: {
        select: {
          id: true,
          users: { where: { role: { in: ['管理者', 'マネージャー', 'admin', 'manager'] } }, select: { id: true } },
        },
      },
    },
  })

  let n017Count = 0
  for (const eq of dueSoonEquipment) {
    const daysLeft = eq.nextInspectionAt
      ? Math.ceil((new Date(eq.nextInspectionAt).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const inspDateStr = eq.nextInspectionAt ? new Date(eq.nextInspectionAt).toLocaleDateString('ja-JP') : ''
    for (const u of eq.company?.users ?? []) {
      await sendNotification({
        userId: u.id,
        title: '機器点検期限が近づいています',
        content: `機器「${eq.name}」（${eq.type}）の点検期限（${inspDateStr}）まであと${daysLeft}日です`,
        type: 'equipment_inspection',
        link: '/equipment',
      })
      n017Count++
    }
  }

  // ── N-008: Inspection reminders (within 3 days) ────────────────────────────
  const upcomingInspections = await prisma.inspection.findMany({
    where: {
      scheduledDate: { gte: today, lte: threeDaysLater },
      status: { not: '完了' },
    },
    include: {
      project: { select: { name: true, managerId: true } },
    },
  })

  let n008InspectionCount = 0
  let n008Notified = 0
  for (const insp of upcomingInspections) {
    n008InspectionCount++
    const userIds = new Set<string>()
    if (insp.inspectorId) userIds.add(insp.inspectorId)
    if (insp.project?.managerId) userIds.add(insp.project.managerId)

    const scheduledDateStr = insp.scheduledDate
      ? new Date(insp.scheduledDate).toLocaleDateString('ja-JP')
      : ''
    const daysLeft = insp.scheduledDate
      ? Math.ceil((new Date(insp.scheduledDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    for (const userId of Array.from(userIds)) {
      await sendNotification({
        userId,
        title: '検査予定のお知らせ',
        content: `「${insp.project?.name}」の${insp.name}が${scheduledDateStr}に予定されています（あと${daysLeft}日）`,
        type: 'inspection_reminder',
        link: '/inspections',
      })
      n008Notified++
    }
  }

  // ── N-018: After-service records with unresolved follow-up ─────────────────
  const pendingAfterService = await prisma.afterServiceRecord.findMany({
    where: {
      status: '未対応',
    },
    include: {
      project: { select: { id: true, name: true, managerId: true } },
      customer: { select: { name: true } },
    },
  })

  let n018Count = 0
  for (const record of pendingAfterService) {
    if (!record.project?.managerId) continue
    const reportedDateStr = new Date(record.reportedAt).toLocaleDateString('ja-JP')
    await sendNotification({
      userId: record.project.managerId,
      title: 'アフターサービス対応が未完了です',
      content: `「${record.project.name}」（顧客: ${record.customer?.name}）のアフターサービス記録（報告日: ${reportedDateStr}）が未対応のままです`,
      type: 'after_service_pending',
      link: `/projects/${record.project.id}`,
    })
    n018Count++
  }

  return NextResponse.json({
    ok: true,
    n008: { inspectionCount: n008InspectionCount, notified: n008Notified },
    n014: { invoiceCount: dueSoonInvoices.length, notified: n014Count },
    n015: { overrunCount: overrunBudgets.length, notified: n015Count },
    n016: { delayedScheduleCount: delayedSchedules.length, notified: n016Count },
    n017: { equipmentCount: dueSoonEquipment.length, notified: n017Count },
    n018: { pendingAfterServiceCount: pendingAfterService.length, notified: n018Count },
  })
}

// Keep POST for backward compatibility (N-014 only, session-protected)
export async function POST(req: NextRequest) {
  // Legacy endpoint — redirects logic inline for session-based callers
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('@/lib/auth')

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const today = new Date()
  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(today.getDate() + 7)

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { notIn: ['入金済', '取消'] },
      dueDate: { gte: today, lte: sevenDaysLater },
    },
    include: {
      project: { select: { name: true, managerId: true, salesId: true } },
    },
  })

  let notified = 0
  for (const inv of invoices) {
    const userIds = new Set<string>()
    if (inv.project?.managerId) userIds.add(inv.project.managerId)
    if (inv.project?.salesId) userIds.add(inv.project.salesId)

    const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ja-JP') : ''
    const daysLeft = inv.dueDate
      ? Math.ceil((new Date(inv.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    for (const userId of Array.from(userIds)) {
      await sendNotification({
        userId,
        title: '支払期限が近づいています',
        content: `「${inv.project?.name}」の請求 ${inv.invoiceNumber} の支払期限（${dueDateStr}）まであと${daysLeft}日です`,
        type: 'payment_due',
        link: '/invoices',
      })
      notified++
    }
  }

  return NextResponse.json({ notified, invoiceCount: invoices.length })
}
