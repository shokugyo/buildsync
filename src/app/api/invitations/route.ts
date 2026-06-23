import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, ADMIN_ROLES } from '@/lib/permissions'
import { sendEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!hasRole(session, ADMIN_ROLES)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const invitations = await prisma.invitation.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invitations)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!hasRole(session, ADMIN_ROLES)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { email, role } = body

  if (!email) return NextResponse.json({ error: 'メールアドレスは必須です' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'このメールアドレスは既に登録済みです' }, { status: 400 })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role: role || '一般',
      token,
      status: '招待中',
      expiresAt,
      companyId,
    },
  })

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  await sendEmail({
    to: email,
    subject: 'BuildSync への招待',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">BuildSync への招待</h2>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #475569;">あなたはBuildSyncに招待されました。以下のリンクからアカウントを作成してください。</p>
          <a href="${appUrl}/register?token=${token}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 16px;">アカウントを作成する</a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">このリンクは7日間有効です。</p>
        </div>
      </div>
    `,
  })

  return NextResponse.json(invitation, { status: 201 })
}
