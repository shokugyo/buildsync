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
  // Verify cron secret if set
  const secret = req.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  return NextResponse.json({ ok: true, ...results })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
