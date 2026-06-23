import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function validateApiKey(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key')
  if (!apiKey) return null

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    include: { company: { select: { id: true, name: true } } },
  })

  if (!keyRecord || !keyRecord.enabled) return null
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) return null

  // Update lastUsedAt
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  })

  return keyRecord
}

export async function GET(req: NextRequest) {
  const keyRecord = await validateApiKey(req)
  if (!keyRecord) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const status = searchParams.get('status')

  const where: Record<string, unknown> = { companyId: keyRecord.companyId }
  if (status) where.status = status

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        contractAmount: true,
        startDate: true,
        deliveryDate: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.project.count({ where }),
  ])

  return NextResponse.json({ data: projects, total, page, limit })
}
