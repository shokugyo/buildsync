export const ADMIN_ROLES = ['管理者', '会社管理者'] as const
export const APPROVER_ROLES = ['管理者', '会社管理者', '現場監督', '経理・事務'] as const
export const RESTRICTED_FROM_COST = ['協力会社管理者', '協力会社作業者', '一般'] as const

export function getUserRole(session: any): string {
  return (session?.user as any)?.role || '一般'
}

export function hasRole(session: any, roles: readonly string[]): boolean {
  return roles.includes(getUserRole(session))
}

export function isRestrictedFromCost(session: any): boolean {
  return RESTRICTED_FROM_COST.includes(getUserRole(session) as any)
}

// ──────────────────────────────────────────────
// ABAC: 属性ベースアクセス制御
// ──────────────────────────────────────────────

export type ResourceType = 'project' | 'order' | 'invoice' | 'workReport' | 'photo' | 'schedule' | 'cost'
export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve'

interface AbacContext {
  userRole: string
  userId: string
  companyId: string
  resource?: {
    type: ResourceType
    ownerId?: string       // 作成者ID
    companyId?: string     // リソースの会社ID
    projectMemberIds?: string[]  // プロジェクトメンバーのID一覧
    status?: string
  }
}

const ROLE_PERMISSIONS: Record<string, Record<Action, ResourceType[]>> = {
  '管理者': {
    read:    ['project', 'order', 'invoice', 'workReport', 'photo', 'schedule', 'cost'],
    create:  ['project', 'order', 'invoice', 'workReport', 'photo', 'schedule', 'cost'],
    update:  ['project', 'order', 'invoice', 'workReport', 'photo', 'schedule', 'cost'],
    delete:  ['project', 'order', 'invoice', 'workReport', 'photo', 'schedule', 'cost'],
    approve: ['order', 'invoice', 'workReport'],
  },
  '現場監督': {
    read:    ['project', 'order', 'invoice', 'workReport', 'photo', 'schedule', 'cost'],
    create:  ['order', 'workReport', 'photo', 'schedule'],
    update:  ['order', 'workReport', 'photo', 'schedule', 'project'],
    delete:  ['workReport', 'photo'],
    approve: ['workReport'],
  },
  '事務担当': {
    read:    ['project', 'order', 'invoice', 'workReport', 'photo', 'schedule', 'cost'],
    create:  ['invoice', 'order'],
    update:  ['invoice', 'order'],
    delete:  [],
    approve: ['invoice'],
  },
  '一般': {
    read:    ['project', 'workReport', 'photo', 'schedule'],
    create:  ['workReport', 'photo'],
    update:  ['workReport', 'photo'],
    delete:  [],
    approve: [],
  },
  '協力会社管理者': {
    read:    ['project', 'workReport', 'photo', 'schedule'],
    create:  ['workReport', 'photo'],
    update:  ['workReport'],
    delete:  [],
    approve: [],
  },
  '協力会社作業者': {
    read:    ['schedule', 'photo'],
    create:  ['workReport', 'photo'],
    update:  [],
    delete:  [],
    approve: [],
  },
}

export function canPerform(ctx: AbacContext, action: Action): boolean {
  const { userRole, userId, companyId, resource } = ctx

  // 会社ID不一致は常に拒否
  if (resource?.companyId && resource.companyId !== companyId) return false

  const rolePerm = ROLE_PERMISSIONS[userRole]
  if (!rolePerm) return false

  // ロールベースチェック
  const roleAllows = rolePerm[action]?.includes(resource?.type ?? 'project') ?? false

  if (!roleAllows) return false

  // 属性ベース追加チェック
  if (resource) {
    // 作成者は自分のリソースを編集・削除できる
    if ((action === 'update' || action === 'delete') && resource.ownerId === userId) {
      return true
    }

    // プロジェクトメンバーのみアクセス可（メンバーリストがある場合）
    if (resource.projectMemberIds && resource.projectMemberIds.length > 0) {
      const isMember = resource.projectMemberIds.includes(userId)
      if (!isMember && userRole !== '管理者' && userRole !== '会社管理者') return false
    }

    // 承認済みリソースは削除不可
    if (action === 'delete' && resource.status === '承認済') return false

    // 差し戻し中のリソースは本人のみ編集可
    if (action === 'update' && resource.status === '差し戻し' && resource.ownerId !== userId) {
      if (userRole !== '管理者' && userRole !== '会社管理者') return false
    }
  }

  return roleAllows
}

export function canRead(ctx: Omit<AbacContext, 'resource'> & { resource?: AbacContext['resource'] }): boolean {
  return canPerform(ctx, 'read')
}

export function canCreate(ctx: AbacContext): boolean {
  return canPerform(ctx, 'create')
}

export function canUpdate(ctx: AbacContext): boolean {
  return canPerform(ctx, 'update')
}

export function canDelete(ctx: AbacContext): boolean {
  return canPerform(ctx, 'delete')
}

export function canApprove(ctx: AbacContext): boolean {
  return canPerform(ctx, 'approve')
}
