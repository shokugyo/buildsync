import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildNotificationEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const today = new Date()

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { not: '入金済' },
      dueDate: { lt: today },
      reminderCount: { lt: 3 },
    },
    include: {
      customer: { select: { name: true, email: true } },
      project: { select: { name: true, projectNumber: true } },
    },
  })

  let sentCount = 0

  for (const invoice of overdueInvoices) {
    const email = invoice.customer?.email
    if (email) {
      const subject = `【支払リマインダー】請求書 ${invoice.invoiceNumber} のお支払いのご確認`
      const html = buildNotificationEmail(
        '請求書の支払期限が過ぎています',
        `請求書番号: ${invoice.invoiceNumber}<br>案件: ${invoice.project.name}<br>金額: ¥${invoice.totalAmount.toLocaleString('ja-JP')}<br>支払期限: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ja-JP') : '未設定'}<br><br>お支払いのご確認をお願いいたします。`,
        `/invoices`
      )
      await sendEmail({ to: email, subject, html })
      sentCount++
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        reminderSentAt: new Date(),
        reminderCount: { increment: 1 },
      },
    })
  }

  return NextResponse.json({ sent: sentCount, total: overdueInvoices.length })
}
