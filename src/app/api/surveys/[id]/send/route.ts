import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const survey = await prisma.customerSurvey.findFirst({
    where: { id: params.id, companyId },
    include: {
      project: { select: { name: true } },
      customer: { select: { name: true, email: true } },
    },
  })

  if (!survey) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  if (survey.status !== '未送信') return NextResponse.json({ error: 'すでに送信済みです' }, { status: 400 })

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const surveyUrl = `${appUrl}/surveys/${survey.token}`

  const body = await req.json().catch(() => ({}))
  const toEmail = body.email || survey.customer?.email

  if (toEmail) {
    await sendEmail({
      to: toEmail,
      subject: `【BuildSync】工事完了アンケートのご依頼 - ${survey.project.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">顧客満足度アンケート</h2>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #1e293b;">${survey.customer?.name ?? 'お客様'} 様</p>
            <p style="color: #475569;">このたびは「${survey.project.name}」のご依頼をいただき、誠にありがとうございました。</p>
            <p style="color: #475569;">工事に関するご満足度をお聞かせください。以下のリンクよりアンケートにご回答いただけます。</p>
            <a href="${surveyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">アンケートに回答する</a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">${surveyUrl}</p>
          </div>
        </div>
      `,
    })
  }

  const updated = await prisma.customerSurvey.update({
    where: { id: params.id },
    data: { status: '送信済', sentAt: new Date() },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}
