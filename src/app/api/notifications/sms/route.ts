import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// SMS通知 (Twilio対応 - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER が必要)
// 未設定の場合はモックとして動作

async function sendSMS(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    // モード: 環境変数未設定の場合はコンソールにログ出力してモック成功
    console.log(`[SMS Mock] To: ${to}, Message: ${message}`)
    return { success: true, sid: `mock_${Date.now()}` }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
    })
    const data = await response.json()
    if (!response.ok) return { success: false, error: data.message }
    return { success: true, sid: data.sid }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// POST: SMS送信
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { type, targetUserId, message, phone } = body

  if (type === 'test') {
    // テストSMS送信
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { phone: true, name: true },
    })
    const toPhone = phone || user?.phone
    if (!toPhone) {
      return NextResponse.json({ error: '電話番号が設定されていません' }, { status: 400 })
    }
    const result = await sendSMS(toPhone, `【BuildSync】テストSMSです。${user?.name}さん、SMS通知が正常に動作しています。`)
    return NextResponse.json({ ...result, to: toPhone })
  }

  if (type === 'notification') {
    // 特定ユーザーへの通知SMS
    if (!targetUserId || !message) {
      return NextResponse.json({ error: 'targetUserIdとmessageは必須です' }, { status: 400 })
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { phone: true, name: true },
    })
    if (!targetUser?.phone) {
      return NextResponse.json({ error: '対象ユーザーの電話番号が未設定です' }, { status: 400 })
    }
    const result = await sendSMS(targetUser.phone, `【BuildSync】${message}`)
    return NextResponse.json(result)
  }

  if (type === 'bulk') {
    // 複数ユーザーへの一括SMS
    const companyId = (session.user as any).companyId
    const users = await prisma.user.findMany({
      where: { companyId, phone: { not: null } },
      select: { id: true, phone: true, name: true },
    })
    const results = await Promise.all(
      users.map(u => sendSMS(u.phone!, `【BuildSync】${message}`))
    )
    const succeeded = results.filter(r => r.success).length
    return NextResponse.json({ success: true, total: users.length, succeeded, failed: users.length - succeeded })
  }

  return NextResponse.json({ error: '不正なtype' }, { status: 400 })
}

// GET: SMS設定状態確認
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  return NextResponse.json({
    configured,
    provider: 'Twilio',
    mode: configured ? '本番' : 'モック（TWILIO_ACCOUNT_SID未設定）',
    envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
  })
}
