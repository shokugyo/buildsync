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
