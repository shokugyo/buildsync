'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, getStatusColor } from '@/lib/utils'
import {
  MapPin, Search, User, Calendar, Wrench,
  Building2, Filter, ExternalLink, HardHat,
} from 'lucide-react'

interface Project {
  id: string
  projectNumber: string
  name: string
  status: string
  address?: string | null
  workType?: string | null
  startDate?: string | null
  endDate?: string | null
  manager?: { id: string; name: string } | null
  customer?: { name: string } | null
}

const SITE_STATUSES = ['着工前', '施工中', '検査中', '是正中']

const STATUS_ICON_COLOR: Record<string, string> = {
  '着工前': 'bg-slate-100 text-slate-500',
  '施工中': 'bg-blue-100 text-blue-600',
  '検査中': 'bg-yellow-100 text-yellow-600',
  '是正中': 'bg-orange-100 text-orange-600',
  '完工': 'bg-green-100 text-green-600',
}

export default function SitePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [managerFilter, setManagerFilter] = useState('')

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Only show projects that are active construction sites
          setProjects(
            data.filter((p) =>
              SITE_STATUSES.includes(p.status) || p.status === '完工'
            )
          )
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Unique managers for filter
  const managers = Array.from(
    new Map(
      projects
        .filter((p) => p.manager)
        .map((p) => [p.manager!.id, p.manager!.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }))

  const filtered = projects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false
    if (managerFilter && p.manager?.id !== managerFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (
        !p.name.toLowerCase().includes(s) &&
        !p.projectNumber.toLowerCase().includes(s) &&
        !(p.address || '').toLowerCase().includes(s) &&
        !(p.customer?.name || '').toLowerCase().includes(s)
      )
        return false
    }
    return true
  })

  // Summary counts
  const activeCount = projects.filter((p) => p.status === '施工中').length
  const preStartCount = projects.filter((p) => p.status === '着工前').length
  const inspectionCount = projects.filter(
    (p) => p.status === '検査中' || p.status === '是正中'
  ).length
  const completedCount = projects.filter((p) => p.status === '完工').length

  return (
    <div>
      <Header title="現場一覧" />
      <div className="p-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <HardHat className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">施工中</p>
                <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 rounded-lg p-2">
                <Building2 className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">着工前</p>
                <p className="text-2xl font-bold text-slate-900">{preStartCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 rounded-lg p-2">
                <Wrench className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">検査・是正</p>
                <p className="text-2xl font-bold text-slate-900">{inspectionCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-lg p-2">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">完工</p>
                <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="案件名・住所・顧客で検索"
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべてのステータス</option>
              {[...SITE_STATUSES, '完工'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">担当者：すべて</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length}件</p>

        {/* Site list */}
        {loading ? (
          <div className="text-center text-slate-500 p-10">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">現場データがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const iconColor = STATUS_ICON_COLOR[project.status] || 'bg-gray-100 text-gray-500'
              return (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-2 ${iconColor}`}>
                        <HardHat className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/site/${project.id}`}
                        className="text-slate-300 hover:text-blue-500 p-1 transition-colors"
                        title="現場概要"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <Link href={`/site/${project.id}`} className="group">
                    <p className="text-xs text-slate-400 mb-0.5">{project.projectNumber}</p>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-3">
                      {project.name}
                    </h3>
                  </Link>

                  <div className="space-y-1.5 text-sm">
                    {project.address && (
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{project.address}</span>
                      </div>
                    )}
                    {project.manager && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{project.manager.name}</span>
                      </div>
                    )}
                    {project.workType && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Wrench className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{project.workType}</span>
                      </div>
                    )}
                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs">
                          {formatDate(project.startDate)} 〜 {formatDate(project.endDate)}
                        </span>
                      </div>
                    )}
                    {project.customer && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs">{project.customer.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <Link
                      href={`/site/${project.id}`}
                      className="flex-1 text-center text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      現場概要
                    </Link>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex-1 text-center text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      案件詳細
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
