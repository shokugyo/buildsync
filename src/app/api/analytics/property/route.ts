import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const projects = await prisma.project.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      propertyType: true,
      status: true,
      photos: { select: { id: true } },
    },
  })

  const total = projects.length
  const missingPostalCode = 0
  const missingPrefecture = 0
  const missingAddress = projects.filter(p => !p.address || p.address.trim() === '').length
  const missingLatLng = projects.filter(p => p.lat == null || p.lng == null).length
  const missingPhotos = projects.filter(p => p.photos.length === 0).length

  // Distribution by address status
  const withAddress = projects.filter(p => p.address && p.address.trim() !== '').length
  const distributionData = [
    { name: '住所あり', value: withAddress },
    ...(missingAddress > 0 ? [{ name: '未入力', value: missingAddress }] : []),
  ]

  const projectList = projects.map(p => ({
    id: p.id,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    status: p.status,
  }))

  return NextResponse.json({
    total,
    missingPostalCode,
    missingPrefecture,
    missingAddress,
    missingLatLng,
    missingPhotos,
    distributionData,
    projects: projectList,
  })
}
