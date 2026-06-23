import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { password } = await req.json()

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
