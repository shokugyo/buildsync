import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { contractorName, contractorType, workType, contractAmount, startDate, endDate, supervisorName, licenseNumber } = body

  try {
    const entry = await prisma.constructionLedger.update({
      where: { id: params.entryId, companyId },
      data: {
        ...(contractorName !== undefined && { contractorName }),
        ...(contractorType !== undefined && { contractorType }),
        ...(workType !== undefined && { workType }),
        ...(contractAmount !== undefined && { contractAmount: contractAmount ? parseFloat(contractAmount) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(supervisorName !== undefined && { supervisorName: supervisorName || null }),
        ...(licenseNumber !== undefined && { licenseNumber: licenseNumber || null }),
      },
    })
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  try {
    await prisma.constructionLedger.delete({
      where: { id: params.entryId, companyId },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
