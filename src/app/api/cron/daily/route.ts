import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildNotificationEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notify'

function todayMatchesSchedule(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  now: Date
): boolean {
  if (frequency === 'daily') return true
  if (frequency === 'weekly') return dayOfWeek !== null && now.getDay() === dayOfWeek
  if (frequency === 'monthly') return dayOfMonth !== null && now.getDate() === dayOfMonth
  return false
}

function reportTypeLabel(type: string): string {
  if (type === 'profit_loss') return '損益レポート'
  if (type === 'weekly') return '週次レポート'
  if (type === 'project_comparison') return 'プロジェクト比較レポート'
  return type
}

function buildReportEmail(scheduleName: string, reportType: string, companyName: string): string {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const reportPath =
    reportType === 'profit_loss'
      ? '/reports/profit-loss'
      : reportType === 'weekly'
        ? '/reports/weekly'
        : '/reports/project-comparison'

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">BuildSync レポート通知</h2>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <h3 style="color: #1e293b; margin-top: 0;">${scheduleName}</h3>
        <p style="color: #475569;">
          ${companyName} の <strong>${reportTypeLabel(reportType)}</strong> が準備できました。<br>
          下記のボタンからレポートをご確認ください。
        </p>
        <a
          href="${appUrl}${reportPath}"
          style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 16px;"
        >
          レポートを確認する
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
          このメールは BuildSync のスケジュール設定に基づいて自動送信されています。
        </p>
      </div>
    </div>
  `
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  // Vercel Cron Jobs sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  const legacySecret = req.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const bearerValid = authHeader === `Bearer ${cronSecret}`
    const legacyValid = legacySecret === cronSecret
    if (!bearerValid && !legacyValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const results: Record<string, unknown> = { ran: now.toISOString() }

  // ── 1. Due-check (N-014 ~ N-018 in-app notifications) ─────────────────────
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/notifications/due-check`, {
      method: 'GET',
      headers: process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {},
    })
    results.dueCheck = res.ok ? await res.json() : { error: `status ${res.status}` }
  } catch (e) {
    results.dueCheck = { error: String(e) }
  }

  // ── 2. Invoice payment_due reminder (7-day lookahead, reminderSentAt=null) ─
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(today.getDate() + 7)
    sevenDaysLater.setHours(23, 59, 59, 999)

    const invoicesDueSoon = await prisma.invoice.findMany({
      where: {
        dueDate: { gte: today, lte: sevenDaysLater },
        status: { notIn: ['入金済', '完了', '取消'] },
        reminderSentAt: null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            managerId: true,
            salesId: true,
            companyId: true,
          },
        },
      },
    })

    let reminderEmailsSent = 0
    let reminderNotificationsSent = 0

    for (const inv of invoicesDueSoon) {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null
      const dueDateStr = dueDate ? dueDate.toLocaleDateString('ja-JP') : '未設定'
      const daysLeft = dueDate
        ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Send email reminder to customer if available
      if (inv.customer?.email) {
        const subject = `【BuildSync】請求書 ${inv.invoiceNumber} のお支払いのご案内`
        const html = buildNotificationEmail(
          '請求書の支払期限が近づいています',
          `請求書番号: ${inv.invoiceNumber}<br>案件: ${inv.project.name}<br>金額: ¥${inv.totalAmount.toLocaleString('ja-JP')}<br>支払期限: ${dueDateStr}${daysLeft !== null ? `（あと${daysLeft}日）` : ''}<br><br>お支払いのご準備をお願いいたします。`,
          '/invoices'
        )
        await sendEmail({ to: inv.customer.email, subject, html })
        reminderEmailsSent++
      }

      // Send in-app notification to project manager/sales and company admins
      const userIds = new Set<string>()
      if (inv.project?.managerId) userIds.add(inv.project.managerId)
      if (inv.project?.salesId) userIds.add(inv.project.salesId)

      if (inv.project?.companyId) {
        const admins = await prisma.user.findMany({
          where: {
            companyId: inv.project.companyId,
            role: { in: ['管理者', 'マネージャー', 'admin', 'manager'] },
          },
          select: { id: true },
        })
        admins.forEach((a) => userIds.add(a.id))
      }

      for (const userId of Array.from(userIds)) {
        await sendNotification({
          userId,
          title: '支払期限リマインダー',
          content: `「${inv.project?.name}」の請求書 ${inv.invoiceNumber} の支払期限（${dueDateStr}）まであと${daysLeft}日です。お客様へのご確認をお願いします。`,
          type: 'payment_due',
          link: '/invoices',
        })
        reminderNotificationsSent++
      }

      // Mark reminder as sent and increment count
      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          reminderSentAt: now,
          reminderCount: { increment: 1 },
        },
      })
    }

    results.invoiceReminder = {
      invoicesChecked: invoicesDueSoon.length,
      emailsSent: reminderEmailsSent,
      notificationsSent: reminderNotificationsSent,
    }
  } catch (e) {
    results.invoiceReminder = { error: String(e) }
  }

  // ── 3. Overdue schedule notifications ────────────────────────────────────────
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueSchedules = await prisma.schedule.findMany({
      where: {
        endDate: { lt: today },
        status: { notIn: ['完了'] },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            managerId: true,
            salesId: true,
            companyId: true,
          },
        },
      },
    })

    let scheduleNotifCount = 0
    for (const sch of overdueSchedules) {
      const userIds = new Set<string>()
      if (sch.assigneeId) userIds.add(sch.assigneeId)
      if (sch.project?.managerId) userIds.add(sch.project.managerId)
      if (sch.project?.salesId) userIds.add(sch.project.salesId)

      if (sch.project?.companyId) {
        const admins = await prisma.user.findMany({
          where: {
            companyId: sch.project.companyId,
            role: { in: ['管理者', 'マネージャー', 'admin', 'manager'] },
          },
          select: { id: true },
        })
        admins.forEach((a) => userIds.add(a.id))
      }

      const endDateStr = new Date(sch.endDate).toLocaleDateString('ja-JP')
      for (const userId of Array.from(userIds)) {
        await sendNotification({
          userId,
          title: '工程期限超過アラート',
          content: `「${sch.project?.name}」の工程「${sch.name}」（期限: ${endDateStr}）が期限切れです。ステータスをご確認ください。`,
          type: 'schedule',
          link: `/projects/${sch.projectId}/schedules`,
        })
        scheduleNotifCount++
      }
    }

    results.overdueSchedules = {
      overdueCount: overdueSchedules.length,
      notificationsSent: scheduleNotifCount,
    }
  } catch (e) {
    results.overdueSchedules = { error: String(e) }
  }

  // ── 4. Invoice payment overdue alerts (dueDate < today + 3, not 入金済) ──────
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threeDaysLater = new Date(today)
    threeDaysLater.setDate(today.getDate() + 3)
    threeDaysLater.setHours(23, 59, 59, 999)

    const urgentInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: threeDaysLater },
        status: { notIn: ['入金済', '完了', '取消'] },
        reminderSentAt: null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            managerId: true,
            salesId: true,
            companyId: true,
          },
        },
      },
    })

    let urgentNotifCount = 0
    for (const inv of urgentInvoices) {
      const userIds = new Set<string>()
      if (inv.project?.managerId) userIds.add(inv.project.managerId)
      if (inv.project?.salesId) userIds.add(inv.project.salesId)

      if (inv.project?.companyId) {
        const admins = await prisma.user.findMany({
          where: {
            companyId: inv.project.companyId,
            role: { in: ['管理者', 'マネージャー', 'admin', 'manager'] },
          },
          select: { id: true },
        })
        admins.forEach((a) => userIds.add(a.id))
      }

      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null
      const dueDateStr = dueDate ? dueDate.toLocaleDateString('ja-JP') : '未設定'
      const daysLeft = dueDate
        ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null
      const overdue = daysLeft !== null && daysLeft < 0

      for (const userId of Array.from(userIds)) {
        await sendNotification({
          userId,
          title: overdue ? '請求書入金期限超過' : '請求書入金期限直前アラート',
          content: overdue
            ? `「${inv.project?.name}」の請求書 ${inv.invoiceNumber} の入金期限（${dueDateStr}）を${Math.abs(daysLeft!)}日超過しています。`
            : `「${inv.project?.name}」の請求書 ${inv.invoiceNumber} の入金期限（${dueDateStr}）まで${daysLeft}日です。`,
          type: 'payment_due',
          link: '/invoices',
        })
        urgentNotifCount++
      }

      await prisma.invoice.update({
        where: { id: inv.id },
        data: { reminderSentAt: now, reminderCount: { increment: 1 } },
      })
    }

    results.invoiceUrgentAlerts = {
      invoicesChecked: urgentInvoices.length,
      notificationsSent: urgentNotifCount,
    }
  } catch (e) {
    results.invoiceUrgentAlerts = { error: String(e) }
  }

  // ── 5. N-014: 支払期限接近通知（送付済・承認済請求書、3日以内）───────────────
  try {
    const now014 = new Date()
    now014.setHours(0, 0, 0, 0)
    const threeDaysLater014 = new Date(now014)
    threeDaysLater014.setDate(now014.getDate() + 3)
    threeDaysLater014.setHours(23, 59, 59, 999)

    const dueSoonInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['送付済', '承認済'] },
        dueDate: { lte: threeDaysLater014, gte: now014 },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
            managerId: true,
            salesId: true,
          },
        },
        customer: { select: { name: true } },
      },
    })

    let n014NotifCount = 0
    for (const inv of dueSoonInvoices) {
      if (!inv.project?.companyId) continue

      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null
      const dueDateStr = dueDate ? dueDate.toLocaleDateString('ja-JP') : '未設定'
      const daysLeft = dueDate
        ? Math.ceil((dueDate.getTime() - now014.getTime()) / (1000 * 60 * 60 * 24))
        : null

      // 経理・事務担当者と管理者へ通知
      const accountingUsers = await prisma.user.findMany({
        where: {
          companyId: inv.project.companyId,
          role: { in: ['管理者', '事務担当', '経理・事務', 'マネージャー'] },
        },
        select: { id: true },
      })

      const userIds = new Set<string>(accountingUsers.map((u) => u.id))
      if (inv.project.managerId) userIds.add(inv.project.managerId)
      if (inv.project.salesId) userIds.add(inv.project.salesId)

      for (const userId of Array.from(userIds)) {
        await sendNotification({
          userId,
          title: '支払期限接近通知',
          content: `「${inv.project.name}」の請求書 ${inv.invoiceNumber}（${inv.customer?.name ?? '顧客'}）の支払期限（${dueDateStr}）まであと${daysLeft ?? '?'}日です。`,
          type: 'payment_due',
          link: '/invoices',
        })
        n014NotifCount++
      }
    }

    results.n014PaymentDue = {
      invoicesChecked: dueSoonInvoices.length,
      notificationsSent: n014NotifCount,
    }
  } catch (e) {
    results.n014PaymentDue = { error: String(e) }
  }

  // ── 6. N-015: 原価超過警告 ───────────────────────────────────────────────────
  try {
    const budgets = await prisma.budget.findMany({
      where: { amount: { gt: 0 } },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            companyId: true,
            managerId: true,
            salesId: true,
          },
        },
      },
    })

    // Aggregate by project: sum of amount (budget) vs orderedAmount (actual cost)
    const projectMap = new Map<string, { budget: number; ordered: number; project: typeof budgets[0]['project'] }>()
    for (const b of budgets) {
      if (!b.project?.companyId) continue
      const existing = projectMap.get(b.projectId)
      if (existing) {
        existing.budget += b.amount
        existing.ordered += b.orderedAmount
      } else {
        projectMap.set(b.projectId, {
          budget: b.amount,
          ordered: b.orderedAmount,
          project: b.project,
        })
      }
    }

    let n015NotifCount = 0
    for (const { budget, ordered, project } of Array.from(projectMap.values())) {
      if (ordered <= budget) continue
      if (!project?.companyId) continue

      const overAmount = ordered - budget
      const overRate = budget > 0 ? Math.round((overAmount / budget) * 100) : 100

      const adminUsers = await prisma.user.findMany({
        where: {
          companyId: project.companyId,
          role: { in: ['管理者', '現場監督', 'マネージャー'] },
        },
        select: { id: true },
      })

      const userIds = new Set<string>(adminUsers.map((u) => u.id))
      if (project.managerId) userIds.add(project.managerId)
      if (project.salesId) userIds.add(project.salesId)

      for (const userId of Array.from(userIds)) {
        await sendNotification({
          userId,
          title: '原価超過警告',
          content: `案件「${project.name}」（${project.projectNumber}）の実績原価（¥${ordered.toLocaleString('ja-JP')}）が実行予算（¥${budget.toLocaleString('ja-JP')}）を¥${overAmount.toLocaleString('ja-JP')}（${overRate}%）超過しています。`,
          type: 'cost_overrun',
          link: `/projects/${project.id}`,
        })
        n015NotifCount++
      }
    }

    results.n015CostOverrun = {
      projectsChecked: projectMap.size,
      overrunDetected: Array.from(projectMap.values()).filter(({ budget, ordered }) => ordered > budget).length,
      notificationsSent: n015NotifCount,
    }
  } catch (e) {
    results.n015CostOverrun = { error: String(e) }
  }

  // ── 7. Monthly report auto-generation (1st of month only) ─────────────────
  if (now.getDate() === 1) {
    try {
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)

      // Gather companies
      const companies = await prisma.company.findMany({ select: { id: true, name: true } })

      for (const company of companies) {
        const [newProjects, completedProjects, activeProjects, invoices, orders] = await Promise.all([
          prisma.project.count({
            where: {
              companyId: company.id,
              createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
              deletedAt: null,
            },
          }),
          prisma.project.count({
            where: {
              companyId: company.id,
              status: '完了',
              updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
              deletedAt: null,
            },
          }),
          prisma.project.count({
            where: {
              companyId: company.id,
              status: { notIn: ['完了', '失注', 'キャンセル'] },
              deletedAt: null,
            },
          }),
          prisma.invoice.findMany({
            where: {
              companyId: company.id,
              invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd },
            },
            select: { totalAmount: true, status: true },
          }),
          prisma.order.findMany({
            where: {
              companyId: company.id,
              orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
            },
            select: { totalAmount: true },
          }),
        ])

        const invoiceTotal = invoices.reduce((s, i) => s + i.totalAmount, 0)
        const paidTotal = invoices
          .filter((i) => i.status === '入金済')
          .reduce((s, i) => s + i.totalAmount, 0)
        const orderTotal = orders.reduce((s, o) => s + o.totalAmount, 0)
        const grossProfit = invoiceTotal - orderTotal

        const lastMonthLabel = `${lastMonthStart.getFullYear()}年${lastMonthStart.getMonth() + 1}月`
        const reportContent = [
          `${lastMonthLabel}度 月次レポート`,
          `【案件】新規: ${newProjects}件 / 完了: ${completedProjects}件 / 進行中: ${activeProjects}件`,
          `【売上】請求合計: ¥${invoiceTotal.toLocaleString('ja-JP')} / 入金合計: ¥${paidTotal.toLocaleString('ja-JP')}`,
          `【発注】発注合計: ¥${orderTotal.toLocaleString('ja-JP')}`,
          `【粗利】¥${grossProfit.toLocaleString('ja-JP')}`,
        ].join('\n')

        const admins = await prisma.user.findMany({
          where: {
            companyId: company.id,
            role: { in: ['管理者', 'マネージャー', 'admin', 'manager'] },
          },
          select: { id: true },
        })

        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              title: `${lastMonthLabel}度 月次レポート`,
              content: reportContent,
              type: 'info',
              link: '/reports/profit-loss',
            })),
          })
        }
      }

      results.monthlyReport = { generated: companies.length }
    } catch (e) {
      results.monthlyReport = { error: String(e) }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const legacySecret = req.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const bearerValid = authHeader === `Bearer ${cronSecret}`
    const legacyValid = legacySecret === cronSecret
    if (!bearerValid && !legacyValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const sentIds: string[] = []
  const errors: string[] = []

  const schedules = await prisma.reportSchedule.findMany({
    where: { enabled: true },
    include: { company: { select: { name: true } } },
  })

  for (const schedule of schedules) {
    if (!todayMatchesSchedule(schedule.frequency, schedule.dayOfWeek, schedule.dayOfMonth, now)) {
      continue
    }

    let recipients: string[] = []
    try {
      recipients = JSON.parse(schedule.recipients)
    } catch {
      errors.push(`Schedule ${schedule.id}: invalid recipients JSON`)
      continue
    }

    const html = buildReportEmail(schedule.name, schedule.reportType, schedule.company.name)
    const subject = `【BuildSync】${schedule.name} - ${reportTypeLabel(schedule.reportType)}`

    for (const email of recipients) {
      try {
        await sendEmail({ to: email, subject, html })
      } catch (e) {
        errors.push(`Schedule ${schedule.id} -> ${email}: ${String(e)}`)
      }
    }

    await prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: { lastSentAt: now },
    })

    sentIds.push(schedule.id)
  }

  return NextResponse.json({
    ok: true,
    ran: now.toISOString(),
    sent: sentIds.length,
    sentIds,
    errors,
  })
}
