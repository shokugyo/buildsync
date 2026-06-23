import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: List all ProjectTemplates with their ScheduleTemplate items
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const templates = await prisma.projectTemplate.findMany({
    where: { companyId },
    include: { scheduleTemplates: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}
