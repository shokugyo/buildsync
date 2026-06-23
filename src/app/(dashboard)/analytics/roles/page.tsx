'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Info } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

function InfoIcon() {
  return <Info className="w-3 h-3 text-slate-400 inline ml-0.5 cursor-help" />
}

const ROLE_OPTIONS = ['設業担当', '設計担当', '工事担当', '現場監督', '営業担当']
const COLORS = ['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function RolesAnalyticsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState('設業担当')
  const [period, setPeriod] = useState('直近365日間')
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProjects(data)
    }).catch(() => {})
  }, [])

  // Use members array if available (included in project data)
  const projectsWithMembers = projects.map(p => {
    const members: any[] = Array.isArray(p.members) ? p.members : []
    return { ...p, memberList: members }
  })

  const noMember = projectsWithMembers.filter(p => p.memberList.length === 0).length
  const singleMember = projectsWithMembers.filter(p => p.memberList.length === 1).length
  const multiMember = projectsWithMembers.filter(p => p.memberList.length > 1).length
  const duplicateCount = projectsWithMembers.filter(p => {
    const roles = p.memberList.map((m: any) => m.memberRole || m.role || '')
    return roles.length !== new Set(roles).size
  }).length

  // PieChart: 登録なし / 1人 / 複数
  const memberDistPie = [
    { name: '登録なし', value: noMember },
    { name: '1人', value: singleMember },
    ...(multiMember > 0 ? [{ name: '複数', value: multiMember }] : []),
  ].filter(d => d.value > 0)

  // All months
  const allMonths = Array.from(new Set(
    projectsWithMembers.map(p => {
      const d = new Date(p.createdAt)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  )).sort()

  // 案件ごとの担当者数 月次推移 cross-tab
  const memberCountByMonth: Record<string, Record<number, number>> = {}
  projectsWithMembers.forEach(p => {
    const d = new Date(p.createdAt)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!memberCountByMonth[month]) memberCountByMonth[month] = {}
    const cnt = p.memberList.length
    memberCountByMonth[month][cnt] = (memberCountByMonth[month][cnt] || 0) + 1
  })
  const allMemberCounts = Array.from(new Set(projectsWithMembers.map(p => p.memberList.length))).sort((a, b) => a - b)

  // 担当者別 分布 PieChart
  const roleCounts: Record<string, number> = {}
  projectsWithMembers.forEach(p => {
    p.memberList.forEach((m: any) => {
      const r = m.memberRole || m.role || 'その他'
      roleCounts[r] = (roleCounts[r] || 0) + 1
    })
  })
  const roleDistPie = Object.entries(roleCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))

  // 担当者別 月次推移 cross-tab
  const roleByMonth: Record<string, Record<string, number>> = {}
  projectsWithMembers.forEach(p => {
    const d = new Date(p.createdAt)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    p.memberList.forEach((m: any) => {
      const r = m.memberRole || m.role || 'その他'
      if (!roleByMonth[r]) roleByMonth[r] = {}
      roleByMonth[r][month] = (roleByMonth[r][month] || 0) + 1
    })
  })
  const allRoleKeys = Array.from(new Set(projectsWithMembers.flatMap((p: any) => p.memberList.map((m: any) => m.memberRole || m.role || 'その他'))))
  const totalAssignments = projectsWithMembers.reduce((s, p) => s + p.memberList.length, 0)

  return (
    <div>
      <Header title="アナリティクス" />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">案件役割登録</h2>
        </div>

        <div className="p-6">
          {/* Filter bar row 1 */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-1 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">チェック対象案件役割</span>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
              {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
            <span className="text-xs text-slate-500 ml-1">マイルストーン名</span>
            <div className="flex items-center gap-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs text-slate-600">
              <span>着工日</span>
              <button className="text-slate-400 hover:text-slate-600 ml-1">×</button>
            </div>
            <span className="text-xs text-slate-500 ml-1">期間</span>
            <select value={period} onChange={e => setPeriod(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
              <option>直近365日間</option><option>直近90日間</option><option>直近30日間</option>
            </select>
            {['案件種別', '案件フロー', '新築改築', '自社か外社', 'ユーザー所属会社名', '所属店舗', '案件ラベル1', '案件ラベル2', '案件ラベル3', '案件ラベル4'].map(f => (
              <span key={f} className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">{f}　任意の値 である</span>
            ))}
          </div>
          {/* Filter bar row 2 */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 mb-3 flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700">案件ラベル5　任意の値 である</span>
          </div>

          {/* Date + description */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xl font-bold text-slate-900">{today}</p>
              <p className="text-xs text-slate-400 mt-1">データ更新日 <InfoIcon /></p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-slate-600 space-y-1">
              <p>・案件役割別の担当者登録状況を確認したり、登録漏れのチェックができるダッシュボードです</p>
              <p>・確認を行いたい案件役割を画面上部の「チェック対象案件役割」から選択します</p>
              <p>・「案件ごとの登録数」のグラフ・表で、担当者が登録されていなかったり、複数登録している案件を確認することが可能です（案件数のクリックで一覧が表示されます）</p>
              <p>・「担当者登録数別」のグラフ・表で、各担当者がどのくらい登録されているかも確認することが可能です</p>
            </div>
          </div>

          {/* 案件数 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
            <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
            <p className="text-xs text-slate-400 mt-1">案件数 <InfoIcon /></p>
          </div>

          {/* 4 metric cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{noMember}</p>
              <p className="text-xs text-slate-400 mt-1">未登録案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{singleMember}</p>
              <p className="text-xs text-slate-400 mt-1">単一登録済案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{multiMember}</p>
              <p className="text-xs text-slate-400 mt-1">複数登録済案件数 <InfoIcon /></p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{duplicateCount}</p>
              <p className="text-xs text-slate-400 mt-1">疑い登録数 <InfoIcon /></p>
            </div>
          </div>

          {/* Row 1: 案件ごとの担当者数 分布 (pie) + 月次推移 (table) */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">案件ごとの担当者数 分布 <InfoIcon /></h3>
              {memberDistPie.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={memberDistPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}>
                      {memberDistPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">案件ごとの担当者数 月次推移 <InfoIcon /></h3>
              </div>
              {allMonths.length === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-12 h-12 border border-slate-200 rounded grid grid-cols-2 gap-0.5 p-1 opacity-30">
                    {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-300 rounded-sm" />)}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">期間</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">合計</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right font-semibold text-slate-500">{m}</th>)}
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-3 py-2 text-left text-slate-400 font-normal">入力登録数</th>
                        <th className="px-3 py-2 text-right text-slate-400 font-normal">案件数</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right text-slate-400 font-normal">案件数</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {allMemberCounts.map(cnt => (
                        <tr key={cnt} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{cnt === 0 ? '登録なし' : `${cnt}人`}</td>
                          <td className="px-3 py-2 text-right">{projectsWithMembers.filter(p => p.memberList.length === cnt).length}</td>
                          {allMonths.map(m => <td key={m} className="px-3 py-2 text-right">{memberCountByMonth[m]?.[cnt] || 0}</td>)}
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-700">合計</td>
                        <td className="px-3 py-2 text-right font-semibold">{projects.length}</td>
                        {allMonths.map(m => <td key={m} className="px-3 py-2 text-right font-semibold">{Object.values(memberCountByMonth[m] || {}).reduce((s, v) => s + v, 0)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: 担当者別 分布 (pie) + 月次推移 (table) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">担当者別 分布 <InfoIcon /></h3>
              {roleDistPie.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={roleDistPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}>
                      {roleDistPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">担当者別 月次推移 <InfoIcon /></h3>
              </div>
              {allRoleKeys.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <Info className="w-8 h-8 mb-2" /><p className="text-sm">該当なし</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">期間</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">合計</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right font-semibold text-slate-500">{m}</th>)}
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-3 py-2 text-left text-slate-400 font-normal">担当者</th>
                        <th className="px-3 py-2 text-right text-slate-400 font-normal">登録数</th>
                        {allMonths.map(m => <th key={m} className="px-3 py-2 text-right text-slate-400 font-normal">登録数</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {allRoleKeys.map(r => (
                        <tr key={r} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{r}</td>
                          <td className="px-3 py-2 text-right">{roleCounts[r] || 0}</td>
                          {allMonths.map(m => <td key={m} className="px-3 py-2 text-right">{roleByMonth[r]?.[m] || 0}</td>)}
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-700">合計</td>
                        <td className="px-3 py-2 text-right font-semibold">{totalAssignments}</td>
                        {allMonths.map(m => (
                          <td key={m} className="px-3 py-2 text-right font-semibold">
                            {allRoleKeys.reduce((s, r) => s + (roleByMonth[r]?.[m] || 0), 0)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
