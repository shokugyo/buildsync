import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { projectId, content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: '内容を入力してください' }, { status: 400 })

  const userId = (session.user as any).id
  const companyId = (session.user as any).companyId
  const userName = (session.user as any).name || 'お客様'

  // Save as an inquiry record
  const inquiry = await prisma.inquiry.create({
    data: {
      name: userName,
      subject: projectId ? '施主からのお問い合わせ（工事関連）' : '施主からのお問い合わせ',
      message: content.trim(),
      status: '未対応',
      companyId,
      customerId: null,
      ...(projectId ? { projectId } : {}),
    },
  })

  // Notify project manager if project is specified
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { managerId: true, name: true },
    })
    if (project?.managerId) {
      await sendNotification({
        userId: project.managerId,
        title: '施主よりお問い合わせが届きました',
        content: `「${project.name}」について ${userName} 様よりお問い合わせがあります`,
        type: 'customer_inquiry',
        link: '/inquiries',
      })
    }
  } else {
    // Notify company admins
    const admins = await prisma.user.findMany({
      where: { companyId, role: { in: ['管理者', 'admin'] } },
      select: { id: true },
    })
    for (const admin of admins) {
      await sendNotification({
        userId: admin.id,
        title: '施主よりお問い合わせが届きました',
        content: `${userName} 様よりお問い合わせがあります`,
        type: 'customer_inquiry',
        link: '/inquiries',
      })
    }
  }

  return NextResponse.json({ ok: true, id: inquiry.id })
}
