'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Camera,
  MessageSquare,
  CheckSquare,
  FileText,
  ShoppingCart,
  Receipt,
  BarChart2,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  FileImage,
  Folder,
  FolderOpen,
  ClipboardList,
  ClipboardCheck,
  UserCheck,
  PhoneCall,
  Database,
  ScrollText,
  Truck,
  AlertTriangle,
  Map,
  ThumbsUp,
  HelpCircle,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  LayoutGrid,
  Zap,
  Megaphone,
  PieChart,
  Package,
  Wrench,
  QrCode,
  SmilePlus,
  Coins,
  BookText,
  CalendarDays,
  GitCompare,
  Award,
  Banknote,
  CalendarClock,
  ClipboardType,
  Car,
  Hammer,
  FileSignature,
  ShieldAlert,
  BookOpen,
  Headphones,
  Shield,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/analytics', label: 'アナリティクス', icon: Map },
  { href: '/board', label: '経営ボード', icon: LayoutGrid },
  { href: '/projects', label: '案件管理', icon: Building2 },
  { href: '/schedule', label: '工程管理', icon: Calendar },
  { href: '/photos', label: '写真管理', icon: Camera },
  { href: '/photos/album', label: '工事写真台帳', icon: BookOpen },
  { href: '/drawings', label: '図面管理', icon: FileImage },
  { href: '/documents', label: 'ドキュメント', icon: FolderOpen },
  { href: '/chat', label: 'チャット', icon: MessageSquare },
  { href: '/inspections', label: '検査・是正', icon: CheckSquare },
  { href: '/defects', label: '是正管理', icon: AlertTriangle },
  { href: '/reports', label: '日報管理', icon: FileText },
  { href: '/site-diary', label: '現場日誌', icon: BookText },
  { href: '/work-reports', label: '作業報告', icon: ClipboardList },
  { href: '/tasks', label: 'タスク', icon: CheckSquare },
  { href: '/work-orders', label: '作業指示書', icon: ClipboardCheck },
  { href: '/safety', label: '安全管理', icon: ShieldCheck },
  { href: '/safety/green-file', label: 'グリーンファイル', icon: FileText },
  { href: '/safety/roster', label: '作業員名簿', icon: Users },
  { href: '/safety/ky', label: 'KY活動記録', icon: ClipboardList },
  { href: '/safety/near-misses', label: 'ヒヤリハット', icon: AlertTriangle },
  { href: '/safety/patrols', label: '安全パトロール', icon: Shield },
  { href: '/safety/education', label: '安全教育', icon: BookOpen },
  { href: '/certifications', label: '資格管理', icon: Award },
  { href: '/safety-docs', label: '安全書類管理', icon: ShieldCheck },
  { href: '/attendance', label: '入退場管理', icon: UserCheck },
  { href: '/attendance/qr-scan', label: 'QRスキャン', icon: QrCode },
  { href: '/attendance/overtime', label: '残業管理', icon: TrendingUp },
  { href: '/orders', label: '受発注管理', icon: ShoppingCart },
  { href: '/orders/confirm', label: '受注確認管理', icon: CheckSquare },
  { href: '/orders/approve', label: '発注承認', icon: ThumbsUp },
  { href: '/suppliers', label: '協力会社管理', icon: Truck },
  { href: '/materials', label: '材料管理', icon: Package },
  { href: '/material-orders', label: '資材発注管理', icon: Package },
  { href: '/equipment', label: '機器管理', icon: Wrench },
  { href: '/vehicles', label: '車両管理', icon: Car },
  { href: '/tools', label: '工具管理', icon: Hammer },
  { href: '/contracts', label: '契約管理', icon: FileSignature },
  { href: '/warranties', label: '保証管理', icon: ShieldAlert },
  { href: '/after-service', label: 'アフターサービス', icon: Headphones },
  { href: '/invoices', label: '請求管理', icon: Receipt },
  { href: '/payments', label: '支払管理', icon: CreditCard },
  { href: '/costs', label: '原価管理', icon: BarChart2 },
  { href: '/gross-profit', label: '粗利管理', icon: TrendingUp },
  { href: '/customers', label: '顧客管理', icon: Users },
  { href: '/surveys', label: '顧客アンケート', icon: SmilePlus },
  { href: '/advance-payments', label: '仮払い管理', icon: Banknote },
  { href: '/leave-requests', label: '休暇管理', icon: CalendarClock },
  { href: '/shifts', label: 'シフト管理', icon: ClipboardType },
  { href: '/expenses', label: '経費精算', icon: Receipt },
  { href: '/labor-costs', label: '労務費', icon: Coins },
  { href: '/announcements', label: '掲示板', icon: Megaphone },
  { href: '/leads', label: '引合管理', icon: PhoneCall },
  { href: '/bids', label: '入札管理', icon: ScrollText },
  { href: '/site', label: '現場管理', icon: Map },
  { href: '/estimates', label: '見積管理', icon: ClipboardList },
  { href: '/monthly-report', label: '月次レポート', icon: PieChart },
  { href: '/reports/executive', label: '経営ダッシュボード', icon: TrendingUp },
  { href: '/reports/profit-loss', label: '収支レポート', icon: BarChart2 },
  { href: '/reports/supplier-evaluation', label: '協力会社評価', icon: Truck },
  { href: '/reports/inspections', label: '検査レポート', icon: CheckSquare },
  { href: '/reports/weekly', label: '週報', icon: CalendarDays },
  { href: '/reports/project-comparison', label: '案件比較', icon: GitCompare },
  { href: '/reports/payment-schedule', label: '支払スケジュール', icon: CreditCard },
  { href: '/reports/customer-pl', label: '顧客別収支', icon: PieChart },
  { href: '/departments', label: '部門管理', icon: Building2 },
  { href: '/departments/budget', label: '部署予算', icon: BarChart2 },
  { href: '/master', label: 'マスタ管理', icon: Database },
  { href: '/audit', label: '操作ログ', icon: ScrollText },
  { href: '/settings', label: '設定', icon: Settings },
  { href: '/settings/webhooks', label: 'Webhook設定', icon: Zap },
  { href: '/insurance', label: '保険管理', icon: ShieldCheck },
  { href: '/inquiries', label: 'お問い合わせ', icon: MessageSquare },
  { href: '/help', label: 'ヘルプ', icon: HelpCircle },
]

const SUPPLIER_ROLES = ['協力会社管理者', '協力会社作業者']
const CUSTOMER_ROLES = ['施主', '顧客']

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const userRole = (session?.user as any)?.role
  const isSupplierUser = SUPPLIER_ROLES.includes(userRole)
  const isCustomerUser = CUSTOMER_ROLES.includes(userRole)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } bg-slate-900 text-white flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1.5">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">BuildSync</span>
          </div>
        )}
        {collapsed && (
          <div className="bg-blue-600 rounded-lg p-1.5 mx-auto">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className={`text-slate-400 hover:text-white transition-colors ${collapsed ? 'mx-auto mt-2' : ''}`}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {isSupplierUser && (() => {
            const isActive = pathname === '/supplier-portal' || pathname.startsWith('/supplier-portal/')
            return (
              <li key="/supplier-portal">
                <Link
                  href="/supplier-portal"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={collapsed ? '協力会社ポータル' : undefined}
                >
                  <Truck className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">協力会社ポータル</span>
                  )}
                </Link>
              </li>
            )
          })()}
          {isCustomerUser && (() => {
            const isActive = pathname === '/customer-portal' || pathname.startsWith('/customer-portal/')
            return (
              <li key="/customer-portal">
                <Link
                  href="/customer-portal"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={collapsed ? '施主ポータル' : undefined}
                >
                  <Building2 className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">施主ポータル</span>
                  )}
                </Link>
              </li>
            )
          })()}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-2 border-t border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full"
          title={collapsed ? 'ログアウト' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">ログアウト</span>}
        </button>
      </div>
    </aside>
  )
}
