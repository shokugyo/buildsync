import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { hasRole, ADMIN_ROLES } from '@/lib/permissions'
import { sendNotification } from '@/lib/notify'
import { sendEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const me = searchParams.get('me')

  // Return full profile for current user
  if (me === 'true') {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jobType: true,
        department: true,
        phone: true,
        notifyEmail: true,
        avatarPath: true,
        showAvatar: true,
        googleCalendarUrl: true,
        createdAt: true,
        paidLeaveDays: true,
      },
    })
    return NextResponse.json(user)
  }

  const isAdmin = hasRole(session, ADMIN_ROLES)

  const users = await prisma.user.findMany({
    where: { companyId: (session.user as any).companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      department: true,
      jobType: true,
      createdAt: true,
      hourlyRate: true,
      ...(isAdmin && { failedLoginAttempts: true, lockedUntil: true }),
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // Only admins can create users
  if (!hasRole(session, ADMIN_ROLES)) {
    return NextResponse.json({ error: 'ユーザー管理権限がありません' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role, department: newDept, jobType: newJobType } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: '名前、メール、パスワードは必須です' }, { status: 400 })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || '一般',
        companyId: (session.user as any).companyId,
        ...(newDept !== undefined && { department: newDept }),
        ...(newJobType !== undefined && { jobType: newJobType }),
      },
      select: { id: true, name: true, email: true, role: true, department: true, jobType: true, createdAt: true },
    })

    await sendNotification({
      userId: user.id,
      title: 'BuildSyncへようこそ',
      content: `アカウントが作成されました。ユーザー名: ${user.name}`,
      type: 'account',
      link: '/profile',
    })

    if (user.email) {
      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      await sendEmail({
        to: user.email,
        subject: 'BuildSync へのご招待',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">BuildSync へようこそ</h2>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #1e293b;">${user.name} 様</p>
              <p style="color: #475569;">BuildSync にご招待されました。以下のURLからログインしてください。</p>
              <p style="color: #475569;"><strong>メールアドレス:</strong> ${user.email}</p>
              <a href="${appUrl}/login" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 16px;">ログインページへ</a>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">このメールに心当たりのない場合は無視してください。</p>
            </div>
          </div>
        `,
      })
    }

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!hasRole(session, ADMIN_ROLES)) {
    return NextResponse.json({ error: 'ユーザー管理権限がありません' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 })
  if (id === (session.user as any).id) {
    return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    name,
    email,
    currentPassword,
    newPassword,
    targetUserId,
    role,
    jobType,
    department,
    phone,
    notifyEmail,
    avatarPath,
    showAvatar,
    googleCalendarUrl,
  } = body

  // Reject non-admins who try to update another user
  if (targetUserId && !hasRole(session, ADMIN_ROLES)) {
    return NextResponse.json({ error: 'ユーザー管理権限がありません' }, { status: 403 })
  }

  // Admin updating another user's role or status
  if (targetUserId && hasRole(session, ADMIN_ROLES)) {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(role !== undefined && { role }),
        ...(body.status !== undefined && { status: body.status }),
      },
      select: { id: true, name: true, email: true, role: true, status: true },
    })
    return NextResponse.json(updated)
  }

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: '現在のパスワードを入力してください' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } })
    if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 400 })

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const updated = await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { password: hashedPassword },
      select: { id: true, name: true, email: true, role: true },
    })
    return NextResponse.json(updated)
  }

  // Profile update (including extended fields)
  const user = await prisma.user.update({
    where: { id: (session.user as any).id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(jobType !== undefined && { jobType }),
      ...(department !== undefined && { department }),
      ...(phone !== undefined && { phone }),
      ...(notifyEmail !== undefined && { notifyEmail }),
      ...(avatarPath !== undefined && { avatarPath }),
      ...(showAvatar !== undefined && { showAvatar }),
      ...(googleCalendarUrl !== undefined && { googleCalendarUrl }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobType: true,
      department: true,
      phone: true,
      notifyEmail: true,
      avatarPath: true,
      showAvatar: true,
      googleCalendarUrl: true,
    },
  })

  return NextResponse.json(user)
}
