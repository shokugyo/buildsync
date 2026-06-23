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
  const projectId = searchParams.get('projectId')

  const where: Record<string, unknown> = { companyId: keyRecord.companyId }
  if (status) where.status = status
  if (projectId) where.projectId = projectId

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        projectId: true,
        project: { select: { id: true, name: true, projectNumber: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ])

  return NextResponse.json({ data: tasks, total, page, limit })
}

export async function POST(req: NextRequest) {
  const keyRecord = await validateApiKey(req)
  if (!keyRecord) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { title, description, projectId, assignedTo, dueDate, priority, status } = body as Record<string, string | undefined>

  if (!title || typeof title !== 'string') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'title is required' } },
      { status: 400 }
    )
  }

  // Validate projectId belongs to this company if provided
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: keyRecord.companyId },
    })
    if (!project) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      )
    }
  }

  // Find the first admin user of the company to use as creator
  const creator = await prisma.user.findFirst({
    where: { companyId: keyRecord.companyId, role: { in: ['admin', '管理者', 'ADMIN'] } },
    select: { id: true },
  }) ?? await prisma.user.findFirst({
    where: { companyId: keyRecord.companyId },
    select: { id: true },
  })

  if (!creator) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'No company users found' } },
      { status: 500 }
    )
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? null,
      projectId: projectId ?? null,
      assignedTo: assignedTo ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority ?? '中',
      status: status ?? '未着手',
      companyId: keyRecord.companyId,
      createdBy: creator.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      projectId: true,
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ data: task }, { status: 201 })
}
