import { prisma } from './prisma'
import { sendEmail, buildNotificationEmail } from '@/lib/email'

export async function sendNotification({
  userId,
  title,
  content,
  type,
  link,
}: {
  userId: string
  title: string
  content: string
  type: string
  link?: string
}) {
  try {
    const disabled = await prisma.notificationSetting.findUnique({
      where: { userId_type: { userId, type } },
      select: { enabled: true },
    })
    if (disabled && !disabled.enabled) return

    await prisma.notification.create({
      data: { userId, title, content, type, link: link || null },
    })

    // Send email notification (errors must not affect in-app notification)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notifyEmail: true },
      })
      const emailAddr = user?.notifyEmail
      if (emailAddr) {
        const emailType = `${type}:email`
        const emailSetting = await prisma.notificationSetting.findUnique({
          where: { userId_type: { userId, type: emailType } },
          select: { enabled: true },
        })
        // Default to enabled=true if no record exists
        if (!emailSetting || emailSetting.enabled) {
          await sendEmail({
            to: emailAddr,
            subject: title,
            html: buildNotificationEmail(title, content, link),
          })
        }
      }
    } catch (e) {
      console.error('Email notification failed:', e)
    }
  } catch {
    // 通知失敗は握りつぶす
  }
}

export async function sendNotificationToMany({
  userIds,
  title,
  content,
  type,
  link,
}: {
  userIds: string[]
  title: string
  content: string
  type: string
  link?: string
}) {
  try {
    // Filter out users who have disabled this notification type
    const disabledSettings = await prisma.notificationSetting.findMany({
      where: { userId: { in: userIds }, type, enabled: false },
      select: { userId: true },
    })
    const disabledUserIds = new Set(disabledSettings.map((s) => s.userId))
    const filteredIds = userIds.filter((id) => !disabledUserIds.has(id))
    if (filteredIds.length === 0) return

    await prisma.notification.createMany({
      data: filteredIds.map(userId => ({ userId, title, content, type, link: link || null })),
    })

    // Send email notifications to eligible users (errors must not affect in-app notifications)
    try {
      const emailType = `${type}:email`
      const [users, emailDisabledSettings] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: filteredIds } },
          select: { id: true, notifyEmail: true },
        }),
        prisma.notificationSetting.findMany({
          where: { userId: { in: filteredIds }, type: emailType, enabled: false },
          select: { userId: true },
        }),
      ])
      const emailDisabledIds = new Set(emailDisabledSettings.map((s) => s.userId))
      for (const user of users) {
        if (!user.notifyEmail) continue
        if (emailDisabledIds.has(user.id)) continue
        await sendEmail({
          to: user.notifyEmail,
          subject: title,
          html: buildNotificationEmail(title, content, link),
        })
      }
    } catch (e) {
      console.error('Email notification failed:', e)
    }
  } catch {
    // 通知失敗は握りつぶす
  }
}

export async function notifyProjectMembers({
  projectId,
  excludeUserId,
  title,
  content,
  type,
  link,
}: {
  projectId: string
  excludeUserId?: string
  title: string
  content: string
  type: string
  link?: string
}) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { managerId: true, salesId: true, members: { select: { userId: true } } },
    })
    if (!project) return

    const userIds = new Set<string>()
    if (project.managerId) userIds.add(project.managerId)
    if (project.salesId) userIds.add(project.salesId)
    project.members.forEach(m => userIds.add(m.userId))

    if (excludeUserId) userIds.delete(excludeUserId)

    await sendNotificationToMany({ userIds: Array.from(userIds), title, content, type, link })
  } catch {
    // 通知失敗は握りつぶす
  }
}
