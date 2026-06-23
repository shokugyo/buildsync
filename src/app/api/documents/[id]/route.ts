import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Parse category from mimeType field. Format: "doc-category:{value}" */
function parseCategoryFromMimeType(mimeType: string | null | undefined): string | null {
  if (!mimeType) return null
  if (mimeType.startsWith('doc-category:')) return mimeType.slice('doc-category:'.length)
  return null
}

/** Serialize category into mimeType field */
function encodeCategoryAsMimeType(category: string): string {
  return `doc-category:${category}`
}

/** Attach virtual category and isPublic fields to a document record */
function withVirtualFields(doc: any): any {
  const parsedCat = parseCategoryFromMimeType(doc.mimeType)
  return {
    ...doc,
    category: parsedCat || 'その他',
    mimeType: doc.mimeType?.startsWith('doc-category:') ? null : doc.mimeType,
    isPublic: doc.isPublic ?? false,
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  // Build update data
  const updateData: Record<string, any> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.folderId !== undefined) updateData.folderId = body.folderId ?? null

  // Handle category: store in mimeType field
  if (body.category !== undefined) {
    updateData.mimeType = encodeCategoryAsMimeType(body.category)
  }

  const document = await prisma.document.update({
    where: { id: params.id },
    data: updateData,
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(withVirtualFields(document))
}

/** PUT handler — used for toggling isPublic (stored as virtual field, echoed back) */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  // isPublic is not a DB column; fetch document and return with toggled value
  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    },
  })

  if (!document) return NextResponse.json({ error: '資料が見つかりません' }, { status: 404 })

  // Return with toggled isPublic (client-side only — no DB storage for isPublic)
  return NextResponse.json({ ...withVirtualFields(document), isPublic: body.isPublic ?? false })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.document.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
