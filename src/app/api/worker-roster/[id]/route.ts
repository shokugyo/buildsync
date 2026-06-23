import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const entry = await prisma.workerRoster.update({
      where: { id: params.id },
      data: {
        ...(projectId !== undefined && { projectId }),
        ...(workerName !== undefined && { workerName }),
        ...(company !== undefined && { company }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(jobType !== undefined && { jobType: jobType || null }),
        ...(certifications !== undefined && { certifications: certifications || null }),
        ...(bloodType !== undefined && { bloodType: bloodType || null }),
        ...(emergencyContact !== undefined && { emergencyContact: emergencyContact || null }),
        ...(emergencyPhone !== undefined && { emergencyPhone: emergencyPhone || null }),
        ...(insuranceType !== undefined && { insuranceType: insuranceType || null }),
        ...(entryDate !== undefined && { entryDate: entryDate ? new Date(entryDate) : null }),
        ...(exitDate !== undefined && { exitDate: exitDate ? new Date(exitDate) : null }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    })
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.workerRoster.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
