import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { verifyTOTP } from './totp'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'メールアドレス', type: 'email' },
        password: { label: 'パスワード', type: 'password' },
        totpCode: { label: '認証コード', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        })

        if (!user) {
          return null
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('ACCOUNT_LOCKED')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          // Increment failed login attempts
          const newFailedAttempts = user.failedLoginAttempts + 1
          const shouldLock = newFailedAttempts >= 5
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              ...(shouldLock && { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }),
            },
          })
          return null
        }

        // Enforce 2FA if enabled
        if (user.totpEnabled) {
          if (!credentials.totpCode) {
            throw new Error('2FA_REQUIRED')
          }

          // Also accept backup codes
          let totpValid = false
          if (user.totpSecret) {
            totpValid = verifyTOTP(user.totpSecret, credentials.totpCode.trim())
          }

          if (!totpValid && user.totpBackupCodes) {
            const backupCodes: string[] = JSON.parse(user.totpBackupCodes)
            const codeIndex = backupCodes.indexOf(credentials.totpCode.trim().toUpperCase())
            if (codeIndex !== -1) {
              // Consume the backup code so it cannot be reused
              backupCodes.splice(codeIndex, 1)
              await prisma.user.update({
                where: { id: user.id },
                data: { totpBackupCodes: JSON.stringify(backupCodes) },
              })
              totpValid = true
            }
          }

          if (!totpValid) {
            throw new Error('INVALID_TOTP')
          }
        }

        // Successful login: reset failed attempts and clear lockout
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.companyId = (user as any).companyId
        token.companyName = (user as any).companyName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string
        session.user.companyName = token.companyName as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
