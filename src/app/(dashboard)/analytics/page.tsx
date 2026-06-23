'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MapPin, AlertCircle, Building2, Map, CheckSquare } from 'lucide-react'
import Link from 'next/link'

// Dynamically import map with SSR disabled
const ProjectMap = dynamic(() => import('@/components/ProjectMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg">
      <p className="text-slate-500 text-sm">地図を読み込み中...</p>
    </div>
  ),
})

interface AnalyticsData {
  totalProjects: number
  missingAddress: number
  missingWorkType: number
  missingLatLng: number
  regionalDistribution: { region: string; count: number }[]
  projects: {
    id: string
    name: string
    status: string
    address: string | null
    lat: number | null
    lng: number | null
  }[]
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-start gap-4">
      {icon && (
        <div className={`p-2 rounded-lg ${color || 'bg-blue-50'}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="p-6 space-y-6">
        {/* Sub-pages nav */}
        <div className="flex flex-wrap gap-3">
          <Link href="/analytics/inspections" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            検査アナリティクス
          </Link>
          <Link href="/analytics/schedule" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-green-600" />
            日程工程 マイアラート
          </Link>
          <Link href="/analytics/preparation" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-orange-500" />
            着工準備 工程表
          </Link>
          <Link href="/analytics/contracts" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-purple-500" />
            契約推移
          </Link>
          <Link href="/analytics/starts" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-red-500" />
            着工推移
          </Link>
          <Link href="/analytics/completions" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-yellow-500" />
            完成推移
          </Link>
          <Link href="/analytics/deliveries" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-teal-500" />
            引渡推移
          </Link>
          <Link href="/analytics/labels" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-indigo-500" />
            案件ラベル登録
          </Link>
          <Link href="/analytics/roles" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-cyan-500" />
            案件役割登録
          </Link>
          <Link href="/analytics/milestones" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            マイルストーン入力
          </Link>
          <Link href="/analytics/property" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <CheckSquare className="w-4 h-4 text-orange-500" />
            物件情報登録
          </Link>
        </div>
        {/* Top stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="データ更新日"
            value={today}
            icon={<Building2 className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="住所 未入力数"
            value={loading ? '-' : (data?.missingAddress ?? 0)}
            sub="案件の住所が登録されていません"
            icon={<AlertCircle className="w-5 h-5 text-red-500" />}
            color="bg-red-50"
          />
          <StatCard
            label="工種 未入力数"
            value={loading ? '-' : (data?.missingWorkType ?? 0)}
            sub="案件の工種が登録されていません"
            icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
            color="bg-orange-50"
          />
          <StatCard
            label="緯度経度 未設定数"
            value={loading ? '-' : (data?.missingLatLng ?? 0)}
            sub="地図ピンが表示されない案件数"
            icon={<MapPin className="w-5 h-5 text-yellow-600" />}
            color="bg-yellow-50"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">地域分布</h2>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                読み込み中...
              </div>
            ) : !data || data.regionalDistribution.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                データがありません
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.regionalDistribution}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="region"
                    type="category"
                    width={60}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}件`, '案件数']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Summary stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">案件サマリー</h2>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                読み込み中...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                  <span className="text-sm text-slate-600">総案件数</span>
                  <span className="text-lg font-bold text-slate-900">{data?.totalProjects ?? 0}件</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                  <span className="text-sm text-slate-600">住所登録済み</span>
                  <span className="text-lg font-bold text-green-600">
                    {(data?.totalProjects ?? 0) - (data?.missingAddress ?? 0)}件
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                  <span className="text-sm text-slate-600">地図ピン表示可能</span>
                  <span className="text-lg font-bold text-blue-600">
                    {(data?.totalProjects ?? 0) - (data?.missingLatLng ?? 0)}件
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-600">工種登録済み</span>
                  <span className="text-lg font-bold text-slate-900">
                    {(data?.totalProjects ?? 0) - (data?.missingWorkType ?? 0)}件
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Map className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">物件マップ</h2>
            {data && (
              <span className="text-xs text-slate-400 ml-2">
                {data.projects.filter((p) => p.lat != null && p.lng != null).length}件表示
              </span>
            )}
          </div>
          <div style={{ height: '480px' }}>
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg">
                <p className="text-slate-500 text-sm">読み込み中...</p>
              </div>
            ) : (
              <ProjectMap projects={data?.projects ?? []} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
