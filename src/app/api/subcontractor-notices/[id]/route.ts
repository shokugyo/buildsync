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
    contractorName,
    representative,
    address,
    licenseNumber,
    workType,
    workPeriodStart,
    workPeriodEnd,
  } = body

  try {
    const notice = await prisma.subcontractorNotice.update({
      where: { id: params.id },
      data: {
        ...(projectId !== undefined && { projectId }),
        ...(contractorName !== undefined && { contractorName }),
        ...(representative !== undefined && { representative: representative || null }),
        ...(address !== undefined && { address: address || null }),
        ...(licenseNumber !== undefined && { licenseNumber: licenseNumber || null }),
        ...(workType !== undefined && { workType }),
        ...(workPeriodStart !== undefined && { workPeriodStart: workPeriodStart ? new Date(workPeriodStart) : null }),
        ...(workPeriodEnd !== undefined && { workPeriodEnd: workPeriodEnd ? new Date(workPeriodEnd) : null }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    })
    return NextResponse.json(notice)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.subcontractorNotice.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
