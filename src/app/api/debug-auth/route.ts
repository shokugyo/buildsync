import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const rawUrl = process.env.DATABASE_URL ?? 'NOT SET'
  const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ':***@')

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@buildsync.jp' },
      select: { id: true, email: true, failedLoginAttempts: true, lockedUntil: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ status: 'USER_NOT_FOUND', databaseUrl: maskedUrl })
    }

    const passwordMatch = await bcrypt.compare('admin1234', user.password)

    return NextResponse.json({
      status: 'OK',
      userFound: true,
      failedAttempts: user.failedLoginAttempts,
      locked: user.lockedUntil ? user.lockedUntil > new Date() : false,
      passwordMatch,
      databaseUrl: maskedUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ status: 'ERROR', error: e.message, databaseUrl: maskedUrl }, { status: 500 })
  }
}
