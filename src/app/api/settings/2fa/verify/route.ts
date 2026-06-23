import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyTOTP, generateBackupCodes } from '@/lib/totp'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { code, secret } = await req.json()

  if (!code || !secret) {
    return NextResponse.json({ error: 'code and secret are required' }, { status: 400 })
  }

  if (!verifyTOTP(secret, String(code))) {
    return NextResponse.json({ error: '認証コードが正しくありません' }, { status: 400 })
  }

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
