'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Schedule {
  id: string
  name: string
  startDate: string
  endDate: string
  actualStart: string | null
  actualEnd: string | null
  progress: number
  status: string
  category: string | null
  assignee: { name: string } | null
}

interface Photo {
  id: string
  filePath: string
  comment: string | null
  location: string | null
  shootingType: string | null
  createdAt: string
}

interface Project {
  id: string
  projectNumber: string
  name: string
  status: string
  address: string | null
  workType: string | null
  contractAmount: number | null
  startDate: string | null
  endDate: string | null
  deliveryDate: string | null
  notes: string | null
  customer: { name: string; phone: string | null; email: string | null } | null
  manager: { name: string; phone: string | null; email: string | null } | null
  schedules: Schedule[]
  photos: Photo[]
  company?: { name: string; phone: string | null; address: string | null }
}

export default function ProgressReportPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('BuildSync 建設株式会社')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [specialNotes, setSpecialNotes] = useState('')
  const [reportDate] = useState(new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }))
  const [editMode, setEditMode] = useState(false)
  const [customerFormat, setCustomerFormat] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then(r => r.json()),
      fetch('/api/company').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([projectData, companyData]) => {
      if (projectData && !projectData.error) {
        setProject(projectData)
        setSpecialNotes(projectData.notes || '')
      }
      if (companyData) {
        setCompanyName(companyData.name || companyName)
        setCompanyPhone(companyData.phone || '')
        setCompanyAddress(
          [companyData.prefecture, companyData.address, companyData.address1, companyData.address2]
            .filter(Boolean).join(' ')
        )
      }
    }).finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">案件が見つかりません</p>
        <Link href="/projects" className="text-blue-600 hover:underline">案件一覧に戻る</Link>
      </div>
    )
  }

  const schedules = project.schedules || []
  const photos = (project.photos || []).slice(0, 8)
  const totalSchedules = schedules.length
  const completedSchedules = schedules.filter(s => s.status === '完了').length
  const delayedSchedules = schedules.filter(s => {
    if (s.status === '完了') return false
    const end = new Date(s.endDate)
    return end < new Date()
  })
  const overallProgress = totalSchedules > 0
    ? Math.round(schedules.reduce((sum, s) => sum + s.progress, 0) / totalSchedules)
    : 0

  const getScheduleStatus = (s: Schedule): { label: string; color: string } => {
    if (s.status === '完了') return { label: '完了', color: '#16a34a' }
    const end = new Date(s.endDate)
    if (end < new Date() && s.status !== '完了') return { label: '遅延', color: '#dc2626' }
    if (s.status === '進行中') return { label: '進行中', color: '#2563eb' }
    return { label: '予定', color: '#64748b' }
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #progress-report-area,
          #progress-report-area * { visibility: visible; }
          #progress-report-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
          }
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print p-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> 案件詳細に戻る
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-semibold text-slate-900">工事進捗報告書</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setCustomerFormat(false)}
              className={`px-3 py-1.5 ${!customerFormat ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              社内用
            </button>
            <button
              onClick={() => setCustomerFormat(true)}
              className={`px-3 py-1.5 ${customerFormat ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              施主用
            </button>
          </div>
          <button
            onClick={() => setEditMode(e => !e)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
          >
            {editMode ? '編集終了' : '特記事項を編集'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" /> 印刷 / PDF保存
          </button>
        </div>
      </div>

      {/* Special notes edit (screen only) */}
      {editMode && (
        <div className="no-print p-4 bg-amber-50 border-b border-amber-200">
          <label className="block text-sm font-medium text-amber-800 mb-2">特記事項を編集</label>
          <textarea
            value={specialNotes}
            onChange={e => setSpecialNotes(e.target.value)}
            rows={4}
            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="施主へ伝える特記事項を入力してください"
          />
        </div>
      )}

      {/* Print area */}
      <div id="progress-report-area" className="bg-white p-8 max-w-4xl mx-auto">

        {/* ===== Page 1: Cover + Overview ===== */}

        {/* Cover Header */}
        <div style={{ borderBottom: '3px solid #1e40af', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                工事進捗報告書
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Construction Progress Report
              </div>
              {customerFormat && (
                <div style={{ display: 'inline-block', marginTop: '6px', padding: '2px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', fontSize: '11px', fontWeight: 600 }}>
                  施主向けフォーマット
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e40af' }}>{companyName}</div>
              {companyPhone && <div style={{ fontSize: '11px', color: '#64748b' }}>TEL: {companyPhone}</div>}
              {companyAddress && <div style={{ fontSize: '10px', color: '#64748b' }}>{companyAddress}</div>}
            </div>
          </div>
        </div>

        {/* Report meta info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', whiteSpace: 'nowrap', verticalAlign: 'top' }}>作成日</td>
                  <td style={{ padding: '4px 0', fontWeight: 600, color: '#0f172a' }}>{reportDate}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', verticalAlign: 'top' }}>案件名</td>
                  <td style={{ padding: '4px 0', fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{project.name}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', verticalAlign: 'top' }}>案件番号</td>
                  <td style={{ padding: '4px 0', color: '#334155' }}>{project.projectNumber}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', verticalAlign: 'top' }}>顧客名</td>
                  <td style={{ padding: '4px 0', fontWeight: 600, color: '#0f172a' }}>{project.customer?.name || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Progress circle */}
          <div style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <div style={{ fontSize: '11px', marginBottom: '8px', opacity: 0.9 }}>総合進捗率</div>
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '8px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '80px', height: '80px', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9155" fill="none"
                  stroke="white" strokeWidth="3"
                  strokeDasharray={`${overallProgress} ${100 - overallProgress}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', fontWeight: 800,
              }}>
                {overallProgress}%
              </div>
            </div>
            <div style={{ fontSize: '10px', opacity: 0.85 }}>
              {completedSchedules}/{totalSchedules} 工程完了
            </div>
          </div>
        </div>

        {/* 工事概要 */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>工事概要</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              {[
                ['工種', project.workType || '-'],
                ['施工場所', project.address || '-'],
                ['着工日', formatDate(project.startDate)],
                ['竣工予定日', formatDate(project.deliveryDate || project.endDate)],
                ['現在のステータス', project.status],
                ...(!customerFormat ? [['契約金額', formatCurrency(project.contractAmount)]] : []),
              ].map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{
                    padding: '7px 12px', background: '#f8fafc',
                    color: '#64748b', fontWeight: 600, width: '140px', fontSize: '11px',
                  }}>
                    {label}
                  </td>
                  <td style={{ padding: '7px 12px', color: '#0f172a' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 進捗バー */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>進捗状況</SectionTitle>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>全体進捗</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>{overallProgress}%</span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: '9999px', height: '12px', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg, #1e40af, #3b82f6)',
                height: '100%',
                width: `${overallProgress}%`,
                borderRadius: '9999px',
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '14px' }}>
              <MiniStat label="完了工程" value={`${completedSchedules}件`} color="#16a34a" />
              <MiniStat label="進行中" value={`${schedules.filter(s => s.status === '進行中').length}件`} color="#2563eb" />
              <MiniStat label="遅延" value={`${delayedSchedules.length}件`} color="#dc2626" />
            </div>
          </div>
        </div>

        {/* 工程表 */}
        {schedules.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionTitle>工程表</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#1e40af', color: 'white' }}>
                  {['工程名', '種別', '予定開始', '予定終了', '進捗', 'ステータス'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, fontSize: '10px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.map((s, i) => {
                  const statusInfo = getScheduleStatus(s)
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{s.category || '-'}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(s.startDate)}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(s.endDate)}</td>
                      <td style={{ padding: '6px 10px', minWidth: '80px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '9999px', height: '5px' }}>
                            <div style={{
                              background: statusInfo.color,
                              height: '100%',
                              width: `${s.progress}%`,
                              borderRadius: '9999px',
                            }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>{s.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          fontSize: '9px',
                          fontWeight: 600,
                          background: `${statusInfo.color}1a`,
                          color: statusInfo.color,
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 写真セクション */}
        {photos.length > 0 && (
          <div style={{ marginBottom: '24px' }} className="page-break">
            <SectionTitle>工事写真</SectionTitle>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}>
              {photos.map((photo) => (
                <div key={photo.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    width: '100%',
                    paddingBottom: '75%',
                    position: 'relative',
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                  }}>
                    <img
                      src={`/uploads/${photo.filePath}`}
                      alt={photo.comment || '工事写真'}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.style.background = '#e2e8f0'
                        }
                      }}
                    />
                  </div>
                  {(photo.comment || photo.location || photo.shootingType) && (
                    <div style={{ padding: '3px 2px' }}>
                      {photo.shootingType && (
                        <div style={{ fontSize: '8px', color: '#1e40af', fontWeight: 600 }}>{photo.shootingType}</div>
                      )}
                      {photo.location && (
                        <div style={{ fontSize: '8px', color: '#64748b' }}>{photo.location}</div>
                      )}
                      {photo.comment && (
                        <div style={{
                          fontSize: '8px', color: '#334155',
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {photo.comment}
                        </div>
                      )}
                      <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: '1px' }}>
                        {new Date(photo.createdAt).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 特記事項 */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>特記事項</SectionTitle>
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            minHeight: '80px',
            fontSize: '12px',
            color: '#0f172a',
            lineHeight: 1.7,
            background: '#fafafa',
            whiteSpace: 'pre-wrap',
          }}>
            {specialNotes || '特記事項はありません'}
          </div>
        </div>

        {/* 担当者 */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>担当者</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <InfoBox
              title="弊社担当"
              lines={[
                { label: '会社名', value: companyName },
                { label: '担当者名', value: project.manager?.name || '-' },
                { label: 'TEL', value: project.manager?.phone || companyPhone || '-' },
                ...(!customerFormat ? [{ label: 'Email', value: project.manager?.email || '-' }] : []),
              ]}
            />
            <InfoBox
              title="施主様"
              lines={[
                { label: '氏名・社名', value: project.customer?.name || '-' },
                { label: 'TEL', value: project.customer?.phone || '-' },
                { label: 'Email', value: project.customer?.email || '-' },
              ]}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '2px solid #1e40af',
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#94a3b8',
        }}>
          <span>{companyName} — 工事進捗報告書</span>
          <span>作成日: {reportDate} | BuildSync</span>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '10px',
    }}>
      <div style={{ width: '4px', height: '18px', background: '#1e40af', borderRadius: '2px', flexShrink: 0 }} />
      <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{children}</h2>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function InfoBox({ title, lines }: { title: string; lines: { label: string; value: string }[] }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#1e40af', color: 'white', padding: '6px 12px', fontSize: '11px', fontWeight: 600 }}>
        {title}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <tbody>
          {lines.map(({ label, value }) => (
            <tr key={label} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '5px 10px', color: '#64748b', width: '90px', background: '#f8fafc' }}>{label}</td>
              <td style={{ padding: '5px 10px', color: '#0f172a' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
