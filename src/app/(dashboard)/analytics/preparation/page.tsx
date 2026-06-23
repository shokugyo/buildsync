'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Info } from 'lucide-react'

function InfoIcon() {
  return <Info className="w-3 h-3 text-slate-400 inline ml-0.5 cursor-help" />
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">
      {label}
    </span>
  )
}

export default function PreparationPage() {
  const [projects, setProjects] = useState<any[]>([])
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProjects(data)
    }).catch(() => {})
  }, [])

  const total = projects.length
  const withSchedule = projects.filter(p => p.startDate).length
  const withMapPin = projects.filter(p => p.lat && p.lng).length
  const withImage = projects.filter(p => p.propertyName).length

  const scheduleCreationRate = total > 0 ? ((withSchedule / total) * 100).toFixed(1) : '0.0'
  const mapPinRate = total > 0 ? ((withMapPin / total) * 100).toFixed(1) : '0.0'
  const imageRate = total > 0 ? ((withImage / total) * 100).toFixed(1) : '0.0'

  const noSchedule = total - withSchedule
  const noMapPin = total - withMapPin
  const noImage = total - withImage

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">着工準備 工程表</h2>
        </div>

        <div className="p-6">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">着工日</span>
            <FilterChip label="2026/06/02 - 2026/06/29" />
            <span className="text-xs text-slate-500 ml-2">進捗状況</span>
            <FilterChip label="工事" />
            <FilterChip label="案件フロー 契約 または は 注文 である" />
            <FilterChip label="着工前 または 進行中 である" />
            <FilterChip label="案件担当者 任意の値 である" />
            <FilterChip label="設計 任意の値 である" />
            <FilterChip label="工事 任意の値 である" />
            <FilterChip label="工程ラベル 任意の値 である" />
            {[1, 2, 3, 4].map(n => (
              <FilterChip key={n} label={`案件ラベル${n}　任意の値 である`} />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-5 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">案件ラベル5</span>
            <FilterChip label="任意の値 である" />
            <span className="text-xs text-slate-500 ml-2">社外メンバー数</span>
            <FilterChip label="0" />
          </div>

          {/* Description */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5 text-xs text-slate-600 space-y-1">
            <p>・着工を迎える案件の準備状況（工程表公開・マップピン確認・外観画像登録の取り組み）を確認するためのダッシュボードです</p>
            <p>・指定した期間に着工する案件のステータスを表示しています（※期間の初期値は直近2週間です）</p>
            <p>・工程表については、公開処理及び小工程への工程担当者設定 を行うことで工程準備率に反映します</p>
            <p>・営業・設計・工事の役割まで実施する場合は、集計対象ラベルに複数担当者グラフ・表で複数担当分析されます</p>
            <p>・登録担当数数・社外メンバー数数等、標準的な素材・人数を指定することで基準値に過不足に沿った案件の数を確認することが可能です</p>
          </div>

          {/* Data updated date */}
          <div className="mb-5">
            <p className="text-2xl font-bold text-slate-900">{today}</p>
            <p className="text-xs text-slate-400">データ更新日 <InfoIcon /></p>
          </div>

          {/* 案件数 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 inline-block mb-4">
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-400 mt-1">案件数 <InfoIcon /></p>
          </div>

          {/* Metric cards row 1 - red theme */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{scheduleCreationRate}%</p>
              <p className="text-xs text-red-400 mt-1">工程表 準備完了率 <InfoIcon /></p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{noSchedule}</p>
              <p className="text-xs text-red-400 mt-1">工程表 未作成案件数 <InfoIcon /></p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">0</p>
              <p className="text-xs text-red-400 mt-1">工程表 下書き案件数 <InfoIcon /></p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">0</p>
              <p className="text-xs text-red-400 mt-1">担当者登録 未完了案件数 <InfoIcon /></p>
            </div>
          </div>

          {/* Metric cards row 2 - yellow/blue theme */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{mapPinRate}%</p>
              <p className="text-xs text-yellow-500 mt-1">マップピン 確認完了率 <InfoIcon /></p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{noMapPin}</p>
              <p className="text-xs text-yellow-500 mt-1">マップピン 未確認案件数 <InfoIcon /></p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{imageRate}%</p>
              <p className="text-xs text-blue-400 mt-1">外観画像 登録完了率 <InfoIcon /></p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{noImage}</p>
              <p className="text-xs text-blue-400 mt-1">外観画像 未登録案件数 <InfoIcon /></p>
            </div>
          </div>

          {/* 集計区分別 tables */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                集計区分別 工程表準備状況 <InfoIcon />
              </h3>
              {total === 0 ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="w-12 h-12 border border-slate-200 rounded grid grid-cols-2 gap-0.5 p-1 opacity-30">
                    {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-300 rounded-sm" />)}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {['工事一課', '積算担当', 'LCP 担任', '担当 B氏', '担当 一課', '本所 次一', '本所 一部', '未処置'].map((label, i) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 w-20 truncate">{label}</span>
                      <div className="flex-1 bg-slate-100 rounded h-3 overflow-hidden">
                        <div className="h-full bg-blue-400 rounded" style={{ width: `${Math.random() * 80 + 10}%` }} />
                      </div>
                      <span className="text-slate-400 w-4">{total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">集計区分別 準備サマリ <InfoIcon /></h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['工事', '案件数', '工程表未作成完了率', '工程表未作成案件', '工程表下書き完了件数', 'マップピン登録完了率', 'マップピン未確認案件', '外観画像登録完了率', '外観画像未登録案件', '資料接続', '社外メンバー登録未完了'].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {total === 0 ? (
                      <tr><td colSpan={11} className="px-2 py-8 text-center text-slate-300">データがありません</td></tr>
                    ) : (
                      <>
                        {['工事担当一', '山崎 担当', '石田 八朗', '阿波 夏部', '剣城 鈴一', '本所 次一', '合計'].map((name, i) => (
                          <tr key={name} className="border-t border-slate-100">
                            <td className="px-2 py-1 font-medium text-slate-700">{name}</td>
                            <td className="px-2 py-1 text-center">1</td>
                            <td className={`px-2 py-1 text-center ${i < 3 ? 'text-red-500 bg-red-50' : ''}`}>{i === 5 ? '1.0%' : '0.0%'}</td>
                            <td className="px-2 py-1 text-center">{i === 5 ? '1' : '0'}</td>
                            <td className="px-2 py-1 text-center">0</td>
                            <td className={`px-2 py-1 text-center ${i < 2 ? 'text-yellow-500 bg-yellow-50' : ''}`}>100.0%</td>
                            <td className="px-2 py-1 text-center">0</td>
                            <td className={`px-2 py-1 text-center ${i < 3 ? 'text-blue-500 bg-blue-50' : ''}`}>0.0%</td>
                            <td className="px-2 py-1 text-center">1</td>
                            <td className="px-2 py-1 text-center">0</td>
                            <td className="px-2 py-1 text-center">0</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 案件別 準備ステータス */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">案件別 準備ステータス <InfoIcon /></h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {['案件名', '案件フロー', '工程表ステータス', '着工日', 'マップピン 当確認', '外観画像登録 件数', '設計', '工事', '工程表作成日', '工程表締結', '工程表新担日数', '小工程数', '小工程担当者 登録率', '資料接続 未登録件数', '社外メンバー数'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={15} className="px-2 py-8 text-center text-slate-300">データがありません</td></tr>
                  ) : (
                    projects.slice(0, 10).map(p => (
                      <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-2 font-medium text-slate-800 whitespace-nowrap">{p.name}</td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{p.status}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">未作成</span>
                        </td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{p.startDate ? new Date(p.startDate).toLocaleDateString('ja-JP') : '-'}</td>
                        <td className="px-2 py-2 text-center">{p.lat && p.lng ? '✓' : '-'}</td>
                        <td className="px-2 py-2 text-center">0</td>
                        <td className="px-2 py-2 text-slate-600">-</td>
                        <td className="px-2 py-2 text-slate-600">-</td>
                        <td className="px-2 py-2 text-slate-600">-</td>
                        <td className="px-2 py-2 text-slate-600">-</td>
                        <td className="px-2 py-2 text-center">-</td>
                        <td className="px-2 py-2 text-center">0</td>
                        <td className="px-2 py-2 text-center">-</td>
                        <td className="px-2 py-2 text-center">0</td>
                        <td className="px-2 py-2 text-center">0</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
