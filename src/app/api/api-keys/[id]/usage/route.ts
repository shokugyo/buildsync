import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { id } = params

  // Verify the API key belongs to this company
  const apiKey = await prisma.apiKey.findFirst({ where: { id, companyId } })
  if (!apiKey) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  // Generate mock usage data based on the key id (deterministic seed)
  const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  const totalRequests = 320 + (seed % 600)

  const now = new Date()
  const dailyData: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const count = Math.floor(20 + ((seed * (7 - i) * 13) % 80))
    dailyData.push({ date: dateStr, count })
  }

  const lastUsed = apiKey.lastUsedAt
    ? apiKey.lastUsedAt.toISOString()
    : new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()

  return NextResponse.json({
    totalRequests,
    dailyData,
    lastUsed,
  })
}
