'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Link from 'next/link'
import {
  Building2, Calendar, Camera, FileText, CheckCircle2,
  Clock, AlertCircle, ChevronRight, MessageSquare, Send,
  TrendingUp, Image as ImageIcon, Bell, Download, ClipboardList,
  CloudSun, Users, PrinterIcon,
} from 'lucide-react'

interface ReportSummary {
  id: string
  workDate: string
  content: string
  progress: string | null
  weather: string | null
  reporterName: string | null
}

interface PhotoItem {
  id: string
  filePath: string
  caption: string | null
  takenAt: string | null
}

interface ProjectSummary {
  id: string
  projectNumber: string
  name: string
  status: string
  address?: string | null
  startDate?: string | null
  endDate?: string | null
  progress: number
  remainingDays: number | null
  scheduleTotal: number
  scheduleCompleted: number
  photoCount: number
  pendingInspections: number
  openDefects: number
  recentPhotos: PhotoItem[]
  allPhotos: PhotoItem[]
  recentReports: ReportSummary[]
}

interface NotificationItem {
  id: string
  title: string
  content: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
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

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

export default function CustomerPortalPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [inquirySubject, setInquirySubject] = useState('')
  const [inquiryText, setInquiryText] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [sendingInquiry, setSendingInquiry] = useState(false)
  const [inquirySent, setInquirySent] = useState(false)
  const [activeTab, setActiveTab] = useState<'projects' | 'photos' | 'reports' | 'inquiry' | 'notifications'>('projects')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/customer-portal/projects')
        if (res.ok) {
          const data = await res.json()
          setProjects(Array.isArray(data) ? data : [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()

    // Fetch unread notification count
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications?unread=true')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count || 0)
        }
      } catch {
        // ignore
      }
    }
    fetchUnread()
  }, [])

  useEffect(() => {
    if (activeTab === 'notifications') {
      setNotifLoading(true)
      fetch('/api/notifications')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          setNotifications(Array.isArray(data) ? data : [])
          setUnreadCount(0)
          // Mark all as read
          fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAll: true }),
          }).catch(() => {})
        })
        .catch(() => {})
        .finally(() => setNotifLoading(false))
    }
  }, [activeTab])

  const handleSendInquiry = async () => {
    if (!inquiryText.trim() || !inquirySubject.trim()) return
    setSendingInquiry(true)
    try {
      const res = await fetch('/api/customer-portal/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId || null,
          subject: inquirySubject,
          content: inquiryText,
        }),
      })
      if (res.ok) {
        setInquirySent(true)
        setInquiryText('')
        setInquirySubject('')
        setSelectedProjectId('')
        setTimeout(() => setInquirySent(false), 5000)
      }
    } finally {
      setSendingInquiry(false)
    }
  }

  const allPhotos = projects.flatMap(p =>
    p.allPhotos.map(ph => ({ ...ph, projectName: p.name, projectId: p.id }))
  )

  const allReports = projects.flatMap(p =>
    p.recentReports.map(r => ({ ...r, projectName: p.name, projectId: p.id }))
  ).sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime())

  const userName = (session?.user as any)?.name || '施主'

  const tabs = [
    { id: 'projects', label: '工事一覧', icon: Building2 },
    { id: 'photos', label: '現場写真', icon: Camera },
    { id: 'reports', label: '作業報告', icon: ClipboardList },
    { id: 'inquiry', label: 'お問い合わせ', icon: MessageSquare },
    { id: 'notifications', label: '通知', icon: Bell, badge: unreadCount },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-5xl mx-auto p-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">施主ポータル</h1>
          <p className="text-slate-500 text-sm mt-1">{userName} 様、ようこそ。担当工事の進捗状況をご確認いただけます。</p>
        </div>

        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{projects.length}</p>
              <p className="text-xs text-slate-500 mt-1">担当工事</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {projects.filter(p => ['着工', '工事中'].includes(p.status)).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">工事中</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {projects.filter(p => ['完成', '引渡済', '完了'].includes(p.status)).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">完了</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{allPhotos.length}</p>
              <p className="text-xs text-slate-500 mt-1">現場写真</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon
            const badge = 'badge' in tab ? tab.badge : 0
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative flex items-center gap-1.5 px-4 py-2 min-h-12 rounded text-base font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                読み込み中...
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">担当工事が登録されていません</p>
              </div>
            ) : (
              projects.map(project => (
                <div key={project.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-400">[{project.projectNumber}]</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-600'}`}>
                            {project.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">{project.name}</h3>
                        {project.address && (
                          <p className="text-sm text-slate-500 mt-0.5">{project.address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/customer-portal/report?projectId=${project.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 min-h-12 px-3 py-3 text-sm text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <PrinterIcon className="w-4 h-4" />
                          進捗報告書を出力
                        </a>
                        <Link
                          href={`/customer-portal/projects/${project.id}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 whitespace-nowrap"
                        >
                          詳細 <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Progress dashboard */}
                    <div className="mb-4 bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          進捗状況
                        </span>
                        <span className="font-bold text-blue-600 text-lg">{project.progress}%</span>
                      </div>
                      {/* SVG progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min(project.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        {project.scheduleTotal > 0 ? (
                          <span>工程: {project.scheduleCompleted} / {project.scheduleTotal} 完了</span>
                        ) : (
                          <span>工程登録なし</span>
                        )}
                        {project.remainingDays !== null && (
                          <span className={`flex items-center gap-1 ${project.remainingDays < 0 ? 'text-red-500' : project.remainingDays <= 14 ? 'text-orange-500' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3" />
                            {project.remainingDays < 0
                              ? `竣工予定を${Math.abs(project.remainingDays)}日超過`
                              : `残り ${project.remainingDays} 日`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dates + stats */}
                    <div className="flex flex-wrap gap-4 text-sm mb-4">
                      {project.startDate && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>着工: {new Date(project.startDate).toLocaleDateString('ja-JP')}</span>
                        </div>
                      )}
                      {project.endDate && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>竣工予定: {new Date(project.endDate).toLocaleDateString('ja-JP')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Camera className="w-4 h-4" />
                        <span>{project.photoCount}枚の写真</span>
                      </div>
                      {project.pendingInspections > 0 && (
                        <div className="flex items-center gap-1.5 text-orange-500">
                          <Clock className="w-4 h-4" />
                          <span>検査予定 {project.pendingInspections}件</span>
                        </div>
                      )}
                      {project.openDefects > 0 && (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          <span>是正 {project.openDefects}件</span>
                        </div>
                      )}
                    </div>

                    {/* Recent work reports summary */}
                    {project.recentReports.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                          className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mb-2 hover:text-slate-800"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                          直近の作業報告（{project.recentReports.length}件）
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedProject === project.id ? 'rotate-90' : ''}`} />
                        </button>
                        {expandedProject === project.id && (
                          <div className="space-y-2">
                            {project.recentReports.map(r => (
                              <div key={r.id} className="bg-white border border-slate-100 rounded-lg p-3 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-slate-700">
                                    {new Date(r.workDate).toLocaleDateString('ja-JP')}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    {r.weather && (
                                      <span className="flex items-center gap-0.5">
                                        <CloudSun className="w-3 h-3" />
                                        {r.weather}
                                      </span>
                                    )}
                                    {r.reporterName && (
                                      <span className="flex items-center gap-0.5">
                                        <Users className="w-3 h-3" />
                                        {r.reporterName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-slate-600 line-clamp-2">{r.content}</p>
                                {r.progress && (
                                  <p className="text-xs text-blue-600 mt-1">進捗: {r.progress}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recent photos */}
                    {project.recentPhotos.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">最近の現場写真</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {project.recentPhotos.map(photo => (
                            <div key={photo.id} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                              <img
                                src={photo.filePath}
                                alt={photo.caption || '現場写真'}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-slate-500" />
              現場写真一覧
            </h2>
            {allPhotos.length === 0 ? (
              <div className="py-12 text-center">
                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">写真がありません</p>
              </div>
            ) : (
              <div>
                {projects.filter(p => p.allPhotos.length > 0).map(project => (
                  <div key={project.id} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700">{project.name}</p>
                      <span className="text-xs text-slate-400">{project.allPhotos.length}枚</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {project.allPhotos.map(photo => (
                        <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={photo.filePath}
                            alt={photo.caption || '現場写真'}
                            className="w-full max-w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <a
                            href={photo.filePath}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="ダウンロード"
                          >
                            <Download className="w-5 h-5 text-white" />
                          </a>
                          {photo.takenAt && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                              <p className="text-[10px] text-white truncate">{formatDate(photo.takenAt)}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-slate-500" />
              作業報告一覧
            </h2>
            {allReports.length === 0 ? (
              <div className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">作業報告がありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allReports.map(r => (
                  <div key={r.id} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-xs text-slate-400">{r.projectName}</p>
                        <p className="text-sm font-medium text-slate-800">
                          {new Date(r.workDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {r.weather && (
                          <span className="flex items-center gap-0.5">
                            <CloudSun className="w-3 h-3" />
                            {r.weather}
                          </span>
                        )}
                        {r.reporterName && (
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            {r.reporterName}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{r.content}</p>
                    {r.progress && (
                      <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        進捗状況: {r.progress}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inquiry Tab */}
        {activeTab === 'inquiry' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-500" />
              お問い合わせ・ご要望
            </h2>
            <div className="space-y-4">
              {projects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対象工事（任意）</label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">工事を選択してください</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>[{p.projectNumber}] {p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inquirySubject}
                  onChange={e => setInquirySubject(e.target.value)}
                  placeholder="例：工事の進捗について"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  お問い合わせ内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={inquiryText}
                  onChange={e => setInquiryText(e.target.value)}
                  rows={5}
                  placeholder="ご質問・ご要望・お気づきの点などをご記入ください"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {inquirySent && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  お問い合わせを送信しました。担当者よりご連絡いたします。
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleSendInquiry}
                  disabled={!inquiryText.trim() || !inquirySubject.trim() || sendingInquiry}
                  className="flex items-center gap-2 px-5 py-2.5 min-h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-medium disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sendingInquiry ? '送信中...' : '送信する'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-500" />
              通知
            </h2>
            {notifLoading ? (
              <div className="py-12 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">通知はありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3 rounded-lg border transition-colors ${
                      !n.isRead ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${!n.isRead ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.content}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {n.link && (
                      <Link href={n.link} className="text-xs text-blue-600 hover:underline flex-shrink-0 mt-1">
                        確認 <ChevronRight className="w-3 h-3 inline" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
