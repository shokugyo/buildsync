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
      status: true,
      address: true,
      workType: true,
      lat: true,
      lng: true,
    },
  })

  const totalProjects = projects.length
  const missingAddress = projects.filter((p) => !p.address || p.address.trim() === '').length
  const missingWorkType = projects.filter((p) => !p.workType || p.workType.trim() === '').length
  const missingLatLng = projects.filter((p) => p.lat == null || p.lng == null).length

  // Regional distribution: group by first 3 chars of address
  const regionMap: Record<string, number> = {}
  for (const p of projects) {
    const region = p.address && p.address.trim().length >= 3
      ? p.address.trim().substring(0, 3)
      : 'その他'
    regionMap[region] = (regionMap[region] || 0) + 1
  }

  const regionalDistribution = Object.entries(regionMap)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const projectList = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
  }))

  return NextResponse.json({
    totalProjects,
    missingAddress,
    missingWorkType,
    missingLatLng,
    regionalDistribution,
    projects: projectList,
  })
}
