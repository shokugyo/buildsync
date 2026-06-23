'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, MessageSquare, Camera, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/projects', label: '案件', icon: Briefcase },
  { href: '/chat', label: 'チャット', icon: MessageSquare },
  { href: '/photos', label: '写真', icon: Camera },
  { href: '/settings', label: '設定', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs ${active ? 'text-blue-600' : 'text-slate-500'}`}
          >
            <item.icon className="w-5 h-5 mb-0.5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
