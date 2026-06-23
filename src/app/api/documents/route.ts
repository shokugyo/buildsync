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

/** Attach virtual category field to a document record */
function withCategory(doc: any): any {
  const parsedCat = parseCategoryFromMimeType(doc.mimeType)
  return {
    ...doc,
    category: parsedCat || 'その他',
    // Expose a real mimeType only if it's an actual mime type
    mimeType: doc.mimeType?.startsWith('doc-category:') ? null : doc.mimeType,
    isPublic: doc.isPublic ?? false,
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId')
  const projectId = searchParams.get('projectId')
  const hasFolderParam = searchParams.has('folderId')

  const documents = await prisma.document.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(hasFolderParam ? { folderId: folderId ?? null } : {}),
      ...(projectId ? { projectId } : {}),
    },
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(documents.map(withCategory))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const uploadedBy = (session.user as any).id
  const body = await req.json()
  const { name, fileName, fileUrl, fileSize, mimeType, folderId, projectId, category } = body

  if (!name || !fileName || !fileUrl) {
    return NextResponse.json({ error: 'ファイル名とURLは必須です' }, { status: 400 })
  }

  // Store category in mimeType field when category is provided
  const storedMimeType = category
    ? encodeCategoryAsMimeType(category)
    : (mimeType ?? null)

  const document = await prisma.document.create({
    data: {
      name,
      fileName,
      fileUrl,
      fileSize: fileSize ?? null,
      mimeType: storedMimeType,
      folderId: folderId ?? null,
      projectId: projectId ?? null,
      uploadedBy,
      companyId,
    },
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(withCategory(document), { status: 201 })
}
