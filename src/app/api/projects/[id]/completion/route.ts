import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notify'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  let completion = await prisma.projectCompletion.findUnique({
    where: { projectId: params.id },
  })

  if (!completion) {
    completion = await prisma.projectCompletion.create({
      data: {
        projectId: params.id,
        companyId,
      },
    })
  }

  return NextResponse.json(completion)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const { finalInspectionDone, customerAccepted, invoiceIssued, documentsArchived, notes, confirmComplete } = body

  const data: Record<string, unknown> = {}
  if (finalInspectionDone !== undefined) data.finalInspectionDone = finalInspectionDone
  if (customerAccepted !== undefined) data.customerAccepted = customerAccepted
  if (invoiceIssued !== undefined) data.invoiceIssued = invoiceIssued
  if (documentsArchived !== undefined) data.documentsArchived = documentsArchived
  if (notes !== undefined) data.notes = notes

  if (confirmComplete) {
    data.completedAt = new Date()
  }

  const completion = await prisma.projectCompletion.upsert({
    where: { projectId: params.id },
    create: { projectId: params.id, companyId, ...data },
    update: data,
  })

  if (confirmComplete) {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { name: true, managerId: true },
    })
    if (project?.managerId) {
      await sendNotification({
        userId: project.managerId,
        title: '案件完了確定',
        content: `案件「${project.name}」の完了手続きが完了しました。`,
        type: 'project.completion',
        link: `/projects/${params.id}`,
      })
    }
  }

  return NextResponse.json(completion)
}
