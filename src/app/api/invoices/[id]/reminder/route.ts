import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildNotificationEmail } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
    include: {
      customer: { select: { name: true, email: true } },
      project: { select: { name: true, projectNumber: true } },
    },
  })

  if (!invoice) return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })

  const email = invoice.customer?.email
  if (email) {
    const subject = `【支払リマインダー】請求書 ${invoice.invoiceNumber} のお支払いのご確認`
    const html = buildNotificationEmail(
      '請求書の支払いをご確認ください',
      `請求書番号: ${invoice.invoiceNumber}<br>案件: ${invoice.project.name}<br>金額: ¥${invoice.totalAmount.toLocaleString('ja-JP')}<br>支払期限: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ja-JP') : '未設定'}<br><br>お支払いのご確認をお願いいたします。`,
      `/invoices`
    )
    await sendEmail({ to: email, subject, html })
  }

  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      reminderSentAt: new Date(),
      reminderCount: { increment: 1 },
    },
  })

  return NextResponse.json({ success: true, reminderCount: updated.reminderCount, emailSent: !!email })
}
