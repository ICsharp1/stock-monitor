export type UserRole = 'admin' | 'trader' | 'viewer'

export interface UserRoleData {
  id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface StockPermission {
  id: string
  user_id: string
  symbol: string
  can_view: boolean
  created_at: string
}

export interface PermissionCheck {
  canView: boolean
  loading: boolean
}

export interface AllowedSymbols {
  symbols: string[]
  loading: boolean
}

export interface RoleCheck {
  role: UserRole | null
  loading: boolean
}
