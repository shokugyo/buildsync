import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

// POST /api/portal/token
// Body: { customerId, projectId, expiresInDays?, label? }
// Returns: { token, url, expiresAt }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const user = session.user as any
  const companyId: string = user.companyId

  const body = await req.json()
  const { customerId, projectId, expiresInDays, label } = body

  if (!customerId && !projectId) {
    return NextResponse.json({ error: 'customerId または projectId が必要です' }, { status: 400 })
  }

  // Verify customer belongs to this company
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
    })
    if (!customer) {
      return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })
    }
  }

  // Verify project belongs to this company
  let resolvedProjectId = projectId
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId },
    })
    if (!project) {
      return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })
    }
  } else if (customerId) {
    // Find the most recent active project for this customer
    const project = await prisma.project.findFirst({
      where: { customerId, companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!project) {
      return NextResponse.json({ error: 'この顧客に関連する案件が見つかりません。案件を指定してください' }, { status: 400 })
    }
    resolvedProjectId = project.id
  }

  let expiresAt: Date | undefined
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays))
  }

  const shareToken = await prisma.projectShareToken.create({
    data: {
      token: generateToken(),
      projectId: resolvedProjectId,
      customerId: customerId ?? null,
      label: label || null,
      expiresAt: expiresAt ?? null,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get('host')}`
  const url = `${baseUrl}/portal/${shareToken.token}`

  return NextResponse.json({
    id: shareToken.id,
    token: shareToken.token,
    url,
    expiresAt: shareToken.expiresAt,
    createdAt: shareToken.createdAt,
  }, { status: 201 })
}

// GET /api/portal/token?customerId=xxx
// Returns list of share tokens for a customer
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const user = session.user as any
  const companyId: string = user.companyId

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')

  if (!customerId) {
    return NextResponse.json({ error: 'customerId が必要です' }, { status: 400 })
  }

  // Verify customer belongs to this company
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    include: {
      projects: {
        where: { deletedAt: null },
        select: { id: true, name: true, projectNumber: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!customer) {
    return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })
  }

  const tokens = await prisma.projectShareToken.findMany({
    where: { customerId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get('host')}`

  return NextResponse.json({
    customer: { id: customer.id, name: customer.name },
    projects: customer.projects,
    tokens: tokens.map((t) => ({
      id: t.id,
      token: t.token,
      url: `${baseUrl}/portal/${t.token}`,
      label: t.label,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
      project: t.project,
      isExpired: t.expiresAt ? t.expiresAt < new Date() : false,
    })),
  })
}

// DELETE /api/portal/token?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const user = session.user as any
  const companyId: string = user.companyId

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
  }

  // Verify token belongs to this company's project
  const token = await prisma.projectShareToken.findFirst({
    where: { id },
    include: { project: { select: { companyId: true } } },
  })

  if (!token || token.project.companyId !== companyId) {
    return NextResponse.json({ error: 'トークンが見つかりません' }, { status: 404 })
  }

  await prisma.projectShareToken.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
