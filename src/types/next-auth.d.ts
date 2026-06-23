import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      companyId: string
      companyName: string
    } & DefaultSession['user']
  }
}
