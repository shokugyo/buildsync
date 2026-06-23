import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const companyId = session.user.companyId
  const userId = session.user.id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    projectStats,
    projects,
    notifications,
    defects,
    invoices,
    orders,
    estimates,
    todaySchedules,
    todayInspections,
    pendingOrders,
    pendingInvoices,
    pendingEstimates,
    pendingInspections,
    unreadNotifCount,
    recentAudit,
    profitProjects,
    userPref,
    chatRoomsRaw,
  ] = await Promise.all([
    prisma.project.groupBy({ by: ['status'], where: { companyId }, _count: true }),
    prisma.project.findMany({
      where: { companyId },
      include: { customer: true, manager: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.defect.findMany({
      where: { project: { companyId }, status: { in: ['未対応', '対応中'] } },
      include: { project: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { companyId },
      select: { amount: true, totalAmount: true, status: true },
    }),
    prisma.order.findMany({
      where: { companyId },
      select: { amount: true, totalAmount: true, status: true },
    }),
    prisma.estimate.findMany({
      where: { companyId },
      select: { totalAmount: true, status: true },
    }),
    prisma.schedule.findMany({
      where: {
        project: { companyId },
        startDate: { lte: tomorrow },
        endDate: { gte: today },
        status: { not: '完了' },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    }),
    prisma.inspection.findMany({
      where: {
        project: { companyId },
        scheduledDate: { gte: today, lte: tomorrow },
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        inspector: { select: { name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    }),
    prisma.order.count({ where: { companyId, status: '承認依頼中' } }),
    prisma.invoice.count({ where: { companyId, status: '承認依頼中' } }),
    prisma.estimate.count({ where: { companyId, status: '承認依頼中' } }),
    prisma.inspection.count({ where: { project: { companyId }, status: '未実施' } }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
    prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.project.findMany({
      where: { companyId, status: { in: ['施工中', '完工', '検査中'] } },
      include: {
        invoices: { select: { amount: true } },
        orders: { select: { amount: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.chatRoom.findMany({
      where: { project: { companyId } },
      include: {
        project: { select: { id: true, name: true } },
        messages: {
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const totalProjects = projectStats.reduce((sum, s) => sum + s._count, 0)
  const activeProjects = projectStats.filter(s => s.status === '施工中').reduce((sum, s) => sum + s._count, 0)
  const completedProjects = projectStats.filter(s => s.status === '完工').reduce((sum, s) => sum + s._count, 0)
  const pendingDefects = defects.length

  const invoicedTotal = invoices.reduce((sum, i) => sum + i.amount, 0)
  const paidTotal = invoices.filter(i => i.status === '入金済').reduce((sum, i) => sum + i.amount, 0)
  const orderedTotal = orders.reduce((sum, o) => sum + o.amount, 0)
  const approvedOrders = orders.filter(o => ['発注済', '完了'].includes(o.status)).reduce((sum, o) => sum + o.amount, 0)
  const grossProfit = invoicedTotal - orderedTotal
  const grossProfitRate = invoicedTotal > 0 ? (grossProfit / invoicedTotal) * 100 : 0

  const totalEstimates = estimates.length
  const contractedEstimates = estimates.filter(e => e.status === '承認済').length
  const orderRate = totalEstimates > 0 ? (contractedEstimates / totalEstimates) * 100 : 0

  const projectRows = profitProjects.map(p => {
    const sales = p.invoices.reduce((s, i) => s + i.amount, 0)
    const cost = p.orders.reduce((s, o) => s + o.amount, 0)
    const profit = sales - cost
    const rate = sales > 0 ? (profit / sales) * 100 : 0
    return { id: p.id, projectNumber: p.projectNumber, name: p.name, status: p.status, sales, cost, profit, rate }
  })

  // Compute unread counts for chat rooms
  const readCounts = await Promise.all(
    chatRoomsRaw.map(room =>
      prisma.chatMessageRead.count({ where: { userId, message: { roomId: room.id } } })
    )
  )
  const totalMessageCounts = await Promise.all(
    chatRoomsRaw.map(room =>
      prisma.chatMessage.count({ where: { roomId: room.id } })
    )
  )
  const recentChats = chatRoomsRaw
    .map((room, i) => {
      const unreadCount = Math.max(0, totalMessageCounts[i] - readCounts[i])
      const lastMsg = room.messages[0]
      return {
        id: room.id,
        projectId: room.project?.id ?? '',
        projectName: room.project?.name ?? room.name,
        lastMessage: lastMsg?.content?.slice(0, 60) ?? '',
        lastSenderName: lastMsg?.sender?.name ?? '',
        lastAt: lastMsg?.createdAt?.toISOString() ?? '',
        unreadCount,
      }
    })
    .filter(r => r.unreadCount > 0)
    .slice(0, 5)

  const initialWidgets: string[] = userPref ? JSON.parse(userPref.dashboardWidgets) : []

  return (
    <div>
      <Header title="ダッシュボード" />
      <DashboardClient
        initialWidgets={initialWidgets}
        data={{
          totalProjects,
          activeProjects,
          completedProjects,
          pendingDefects,
          invoicedTotal,
          paidTotal,
          orderedTotal,
          approvedOrders,
          grossProfit,
          grossProfitRate,
          totalEstimates,
          contractedEstimates,
          orderRate,
          todaySchedules,
          todayInspections,
          recentChats,
          pendingOrders,
          pendingInvoices,
          pendingEstimates,
          pendingInspections,
          unreadNotifCount,
          notifications,
          recentAudit,
          projectRows,
          projects,
          defects,
        }}
      />
    </div>
  )
}
