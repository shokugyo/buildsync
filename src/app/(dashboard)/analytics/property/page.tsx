'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import { Info } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

const ProjectMap = dynamic(() => import('@/components/ProjectMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg">
      <p className="text-slate-500 text-sm">地図を読み込み中...</p>
    </div>
  ),
})

function InfoIcon() {
  return <Info className="w-3 h-3 text-slate-400 inline ml-0.5 cursor-help" />
}

interface PropertyData {
  total: number
  missingPostalCode: number
  missingPrefecture: number
  missingAddress: number
  missingLatLng: number
  missingPhotos: number
  distributionData: { name: string; value: number }[]
  projects: { id: string; name: string; address: string | null; lat: number | null; lng: number | null; status: string }[]
}

export default function PropertyAnalyticsPage() {
  const [data, setData] = useState<PropertyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('直近365日間')
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/analytics/property')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const total = loading ? 0 : (data?.total ?? 0)
  const missingCount = loading ? 0 : (
    (data?.missingPostalCode ?? 0) +
    (data?.missingPrefecture ?? 0) +
    (data?.missingAddress ?? 0) +
    (data?.missingLatLng ?? 0) +
    (data?.missingPhotos ?? 0)
  )

  return (
    <div>
      <Header title="BUILDSYNC Analytics" />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">物件情報登録</h2>
        </div>

        <div className="p-6">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-3">
            {/* Summary stats row */}
            <div className="flex flex-wrap gap-6 mb-2 pb-2 border-b border-slate-100 text-xs text-slate-500">
              <span>物件出荷数 <span className="font-semibold text-slate-700">{String(total).padStart(2, '0')}</span></span>
              <span>物件整理前数 <span className="font-semibold text-slate-700">{String(missingCount).padStart(2, '0')}</span></span>
              <span>物件保管件数 <span className="font-semibold text-slate-700">00</span></span>
              <span>物件数 <span className="font-semibold text-slate-700">{String(total).padStart(2, '0')}</span></span>
            </div>
            {/* Filter chips row */}
            <div className="flex flex-wrap gap-2 items-center">
              <select value={period} onChange={e => setPeriod(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
                <option>直近365日間</option><option>直近90日間</option><option>直近30日間</option>
              </select>
              <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">任意の値 である</span>
              <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">任意の値 である</span>
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-300 rounded text-xs text-blue-700 font-semibold">ありである</span>
              <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">任意の値 である</span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5 text-xs text-slate-600 space-y-1">
            <p>・物件自体に関する入力状況をチェックするダッシュボードです</p>
            <p>・アラート件数をクリックして表示される一覧から、物件情報を確認し必要に応じて修正を行ってください</p>
            <p>・住所の入力が完了したら、ピンの位置登録・外観画像を登録してBUILDSYNCをより活用してください</p>
            <p>・案件フロー が 関連 「着工前」「進行中」 である案件を表示しています</p>
          </div>

          {/* Metrics grid — row 1: date | postal | prefecture */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xl font-bold text-slate-900">{today}</p>
              <p className="text-xs text-slate-400 mt-1">データ更新日 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{loading ? '-' : data?.missingPostalCode ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">郵便番号 未入力数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{loading ? '-' : data?.missingPrefecture ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">都道府県 未入力数 <InfoIcon /></p>
            </div>
          </div>

          {/* Metrics grid — row 2: address | mappin | photos */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{loading ? '-' : data?.missingAddress ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">住所 未入力数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{loading ? '-' : data?.missingLatLng ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">マップピン 未確認数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{loading ? '-' : data?.missingPhotos ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">外観画像 未登録数 <InfoIcon /></p>
            </div>
          </div>

          {/* 物件分布 + 物件マップ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">物件分布 <InfoIcon /></h3>
              {loading ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">読み込み中...</div>
              ) : !data || data.distributionData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, data.distributionData.length * 60)}>
                  <BarChart data={data.distributionData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} label={{ value: '物件数', position: 'insideBottom', offset: -10, fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v) => [`${v}件`, '物件数']} />
                    <Bar dataKey="value" name="物件数" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                物件マップ <InfoIcon />
                {data && (
                  <span className="text-xs text-slate-400 ml-2">
                    {data.projects.filter(p => p.lat != null && p.lng != null).length}件表示
                  </span>
                )}
              </h3>
              <div style={{ height: '380px' }}>
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
      </div>
    </div>
  )
}
