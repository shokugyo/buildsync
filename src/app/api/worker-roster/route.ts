import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const companyId = (session.user as any).companyId

  const entries = await prisma.workerRoster.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    projectId,
    workerName,
    company,
    birthDate,
    jobType,
    certifications,
    bloodType,
    emergencyContact,
    emergencyPhone,
    insuranceType,
    entryDate,
    exitDate,
  } = body

  if (!projectId || !workerName || !company) {
    return NextResponse.json({ error: '案件・氏名・所属会社は必須です' }, { status: 400 })
  }

  const entry = await prisma.workerRoster.create({
    data: {
      projectId,
      workerName,
      company,
      birthDate: birthDate ? new Date(birthDate) : null,
      jobType: jobType || null,
      certifications: certifications || null,
      bloodType: bloodType || null,
      emergencyContact: emergencyContact || null,
      emergencyPhone: emergencyPhone || null,
      insuranceType: insuranceType || null,
      entryDate: entryDate ? new Date(entryDate) : null,
      exitDate: exitDate ? new Date(exitDate) : null,
      companyId: (session.user as any).companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
