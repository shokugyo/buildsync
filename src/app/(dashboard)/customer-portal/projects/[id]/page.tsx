'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, Camera, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface ProjectDetail {
  id: string
  projectNumber: string
  name: string
  status: string
  address?: string | null
  startDate?: string | null
  endDate?: string | null
  workType?: string | null
  schedules: { id: string; name: string; startDate: string; endDate: string; progress: number; status: string }[]
  photos: { id: string; filePath: string; caption?: string | null; takenAt?: string | null; category?: string | null }[]
  inspections: { id: string; name: string; scheduledDate?: string | null; status: string; result?: string | null }[]
}

const STATUS_COLORS: Record<string, string> = {
  '引合': 'bg-gray-100 text-gray-600',
  '受注': 'bg-blue-100 text-blue-700',
  '着工': 'bg-orange-100 text-orange-700',
  '工事中': 'bg-yellow-100 text-yellow-700',
  '完成': 'bg-green-100 text-green-700',
  '引渡済': 'bg-purple-100 text-purple-700',
  '完了': 'bg-slate-100 text-slate-600',
}

export default function CustomerProjectDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'schedule' | 'photos' | 'inspections'>('schedule')

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true)
      try {
        const [projRes, schedulesRes, photosRes, inspRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/schedules?projectId=${id}`),
          fetch(`/api/photos?projectId=${id}&limit=50`),
          fetch(`/api/inspections?projectId=${id}`),
        ])
        const [proj, schedules, photos, inspections] = await Promise.all([
          projRes.json(), schedulesRes.json(), photosRes.json(), inspRes.json(),
        ])
        if (proj && !proj.error) {
          setProject({
            ...proj,
            schedules: Array.isArray(schedules) ? schedules : [],
            photos: Array.isArray(photos) ? photos : [],
            inspections: Array.isArray(inspections) ? inspections : [],
          })
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="p-8 text-center text-slate-500">読み込み中...</div>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="p-8 text-center text-slate-500">工事情報が見つかりません</div>
    </div>
  )

  const avgProgress = project.schedules.length > 0
    ? Math.round(project.schedules.reduce((s, sc) => s + (sc.progress || 0), 0) / project.schedules.length)
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/customer-portal" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Building2 className="w-5 h-5 text-slate-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">{project.name}</h1>
            <p className="text-xs text-slate-500">[{project.projectNumber}] {project.address}</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-600'}`}>
            {project.status}
          </span>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">全体進捗率</span>
            <span className="text-xl font-bold text-blue-600">{avgProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
          </div>
          <div className="flex gap-6 mt-3 text-sm text-slate-500">
            {project.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                着工: {new Date(project.startDate).toLocaleDateString('ja-JP')}
              </div>
            )}
            {project.endDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                竣工予定: {new Date(project.endDate).toLocaleDateString('ja-JP')}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit">
          {[
            { id: 'schedule', label: '工程', icon: Calendar },
            { id: 'photos', label: '写真', icon: Camera },
            { id: 'inspections', label: '検査', icon: CheckCircle2 },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Schedule */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {project.schedules.length === 0 ? (
              <div className="p-12 text-center text-slate-500">工程情報がありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs text-slate-500">
                    <th className="px-4 py-3 text-left">工程名</th>
                    <th className="px-4 py-3 text-left">期間</th>
                    <th className="px-4 py-3 text-left">進捗</th>
                    <th className="px-4 py-3 text-left">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.schedules.map(sc => (
                    <tr key={sc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{sc.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {sc.startDate ? new Date(sc.startDate).toLocaleDateString('ja-JP') : '—'}
                        {' 〜 '}
                        {sc.endDate ? new Date(sc.endDate).toLocaleDateString('ja-JP') : '—'}
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${sc.progress || 0}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 w-8">{sc.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${sc.status === '完了' ? 'bg-green-100 text-green-700' : sc.status === '遅延' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                          {sc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Photos */}
        {activeTab === 'photos' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {project.photos.length === 0 ? (
              <div className="py-12 text-center">
                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">写真がありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {project.photos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={photo.filePath}
                      alt={photo.caption || '現場写真'}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inspections */}
        {activeTab === 'inspections' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {project.inspections.length === 0 ? (
              <div className="p-12 text-center text-slate-500">検査情報がありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs text-slate-500">
                    <th className="px-4 py-3 text-left">検査名</th>
                    <th className="px-4 py-3 text-left">予定日</th>
                    <th className="px-4 py-3 text-left">結果</th>
                    <th className="px-4 py-3 text-left">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.inspections.map(insp => (
                    <tr key={insp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{insp.name}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {insp.scheduledDate ? new Date(insp.scheduledDate).toLocaleDateString('ja-JP') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {insp.result ? (
                          <span className={`px-2 py-0.5 rounded text-xs ${insp.result === '合格' ? 'bg-green-100 text-green-700' : insp.result === '不合格' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {insp.result}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${insp.status === '完了' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {insp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
