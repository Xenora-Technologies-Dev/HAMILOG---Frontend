export type AuthRole = {
  id: string
  code: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | string
  name: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  username: string
  role: AuthRole
  permissions: string[]
}

export type AuthMeResponse = {
  user: AuthUser
}
