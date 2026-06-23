import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateSecret, verifyTOTP, otpauthURL, generateBackupCodes } from '@/lib/totp'
import QRCode from 'qrcode'

// GET: 現在の2FA状態を返す
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true, totpSecret: true },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    enabled: user.totpEnabled,
    method: user.totpEnabled ? 'totp' : null,
    totpEnabled: user.totpEnabled,
  })
}

// POST action=setup | verify | disable
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const email = session.user?.email ?? ''
  const body = await req.json()
  const { action } = body

  // Setup: TOTPシークレット生成とQRコード発行
  if (action === 'setup') {
    const secret = generateSecret()
    const otpauthUrl = otpauthURL(secret, email, 'BuildSync')
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl)

    return NextResponse.json({ secret, otpauthUrl, qrDataUrl })
  }

  // Verify: 入力トークンを検証してUser.totpSecretに保存
  if (action === 'verify') {
    const { token, secret } = body
    if (!token || !secret) {
      return NextResponse.json({ error: 'token と secret は必須です' }, { status: 400 })
    }

    const isValid = verifyTOTP(secret, String(token))
    if (!isValid) {
      return NextResponse.json({ error: '認証コードが正しくありません' }, { status: 400 })
    }

    // バックアップコード生成
    const backupCodes = generateBackupCodes()

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: secret,
        totpEnabled: true,
        totpBackupCodes: JSON.stringify(backupCodes),
      },
    })

    return NextResponse.json({ success: true, backupCodes })
  }

  // Disable: 2FA無効化（パスワード確認あり）
  if (action === 'disable') {
    const { password } = body
    if (!password) {
      return NextResponse.json({ error: 'パスワードが必要です' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: null,
      },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: '不正なアクション' }, { status: 400 })
}
