import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const userId = (session.user as any).id

  const pref = await prisma.userPreference.findUnique({ where: { userId } })
  return NextResponse.json({
    dashboardWidgets: pref ? JSON.parse(pref.dashboardWidgets) : [],
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const userId = (session.user as any).id
  const { dashboardWidgets } = await req.json()

  if (!Array.isArray(dashboardWidgets)) {
    return NextResponse.json({ error: 'dashboardWidgets must be an array' }, { status: 400 })
  }

  const pref = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, dashboardWidgets: JSON.stringify(dashboardWidgets) },
    update: { dashboardWidgets: JSON.stringify(dashboardWidgets) },
  })

  return NextResponse.json({ dashboardWidgets: JSON.parse(pref.dashboardWidgets) })
}
