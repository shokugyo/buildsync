'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import QRCode from 'qrcode'

interface WorkerInfo {
  workerName: string
  company: string | null
  projectIds: string[]
  totalDays: number
}

export default function WorkerIdCardPage() {
  const searchParams = useSearchParams()
  const workerName = searchParams.get('workerName') || ''
  const company = searchParams.get('company') || ''
  const userId = searchParams.get('userId') || ''
  const projectId = searchParams.get('projectId') || ''

  const [companyName, setCompanyName] = useState<string>('BuildSync 建設')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null)
  const [workerId, setWorkerId] = useState<string>('')
  const [certifications, setCertifications] = useState<string[]>([])
  const [emergencyContact, setEmergencyContact] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (!workerName) {
      setLoading(false)
      return
    }

    // Fetch worker's attendance data to get info
    const fetchData = async () => {
      try {
        const [attendanceRes, companyRes] = await Promise.all([
          fetch(`/api/attendance?workerName=${encodeURIComponent(workerName)}`),
          fetch('/api/company'),
        ])

        if (attendanceRes.ok) {
          const attendances = await attendanceRes.json()
          const filteredAttendances = Array.isArray(attendances)
            ? attendances.filter((a: any) => a.workerName === workerName)
            : []
          const projectIds = Array.from(new Set(filteredAttendances.map((a: any) => a.projectId as string)))
          setWorkerInfo({
            workerName,
            company: company || (filteredAttendances[0]?.company ?? null),
            projectIds: projectIds as string[],
            totalDays: filteredAttendances.length,
          })
          // Generate a worker ID based on name
          const id = 'W' + Date.now().toString(36).toUpperCase().slice(-6)
          setWorkerId(id)
        }

        if (companyRes.ok) {
          const companyData = await companyRes.json()
          setCompanyName(companyData.name || 'BuildSync 建設')
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [workerName, company])

  useEffect(() => {
    if (!workerName) return

    const buildQrContent = async () => {
      // Priority 1: WorkerRoster ID (最もスキャン効率が良い)
      // userId が WorkerRoster の ID として渡されることを想定
      // 形式: BUILDSYNC:<WorkerRosterId>
      if (userId) {
        // userId が WorkerRoster ID かどうかチェック（projectId が空の場合）
        if (!projectId) {
          return `BUILDSYNC:${userId}`
        }
        // 旧来の BUILDSYNC:userId:projectId 形式 (後方互換)
        return `BUILDSYNC:${userId}:${projectId}`
      }
      // フォールバック: Web URL
      const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
      return `${appUrl}/attendance/checkin?workerName=${encodeURIComponent(workerName)}&company=${encodeURIComponent(company)}`
    }

    buildQrContent().then(qrContent => {
      QRCode.toDataURL(qrContent, { width: 200, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } })
        .then(setQrDataUrl)
        .catch(console.error)
    })
  }, [workerName, company, userId, projectId])

  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    }
    return name.charAt(0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!workerName) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">作業員名が指定されていません</p>
        <Link href="/attendance" className="text-blue-600 hover:underline">入退場管理に戻る</Link>
      </div>
    )
  }

  const displayCompany = company || workerInfo?.company || ''
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #id-card-print-area,
          #id-card-print-area * { visibility: visible; }
          #id-card-print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
          }
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

      {/* Screen controls */}
      <div className="no-print p-6 flex items-center justify-between border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/attendance" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> 入退場管理に戻る
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-semibold text-slate-900">作業員IDカード</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditMode(e => !e)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
          >
            {editMode ? '編集終了' : '情報編集'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" /> 印刷
          </button>
        </div>
      </div>

      {/* Edit fields (screen only) */}
      {editMode && (
        <div className="no-print p-6 bg-slate-50 border-b border-slate-200">
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">資格・保有免許</label>
              <input
                type="text"
                value={certifications.join(', ')}
                onChange={e => setCertifications(e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                placeholder="玉掛け技能者, 足場組立作業主任者"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">緊急連絡先</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={e => setEmergencyContact(e.target.value)}
                placeholder="090-xxxx-xxxx"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">作業員番号</label>
              <input
                type="text"
                value={workerId}
                onChange={e => setWorkerId(e.target.value)}
                placeholder="W000001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="備考"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Print area */}
      <div id="id-card-print-area" className="p-8 bg-slate-100 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <p className="no-print text-sm text-slate-500 mb-6 text-center">
            印刷すると A4 用紙に最大4枚のIDカード（85×54mm相当）が並びます
          </p>
          {/* Grid of 4 cards for print */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 85mm)',
              gridTemplateRows: 'repeat(2, 54mm)',
              gap: '8mm',
              justifyContent: 'center',
            }}
            className="id-card-grid"
          >
            {[0, 1, 2, 3].map(i => (
              <IdCard
                key={i}
                companyName={companyName}
                workerName={workerName}
                displayCompany={displayCompany}
                workerId={workerId}
                certifications={certifications}
                emergencyContact={emergencyContact}
                notes={notes}
                qrDataUrl={qrDataUrl}
                getInitials={getInitials}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .id-card-grid {
          display: grid;
          gap: 16px;
        }
        @media (min-width: 600px) {
          .id-card-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media print {
          .id-card-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 85mm) !important;
            grid-template-rows: repeat(2, 54mm) !important;
            gap: 8mm !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </>
  )
}

interface IdCardProps {
  companyName: string
  workerName: string
  displayCompany: string
  workerId: string
  certifications: string[]
  emergencyContact: string
  notes: string
  qrDataUrl: string
  getInitials: (name: string) => string
}

function IdCard({
  companyName,
  workerName,
  displayCompany,
  workerId,
  certifications,
  emergencyContact,
  notes,
  qrDataUrl,
  getInitials,
}: IdCardProps) {
  return (
    <div
      style={{
        width: '85mm',
        height: '54mm',
        background: 'white',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid #e2e8f0',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Header stripe */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: 'white', fontSize: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>
          {companyName}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '7px' }}>作業員証</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', padding: '5px 7px', gap: '7px' }}>
        {/* Left: Avatar + QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* Avatar */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '9px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {getInitials(workerName)}
          </div>
          {/* QR Code */}
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR"
              style={{ width: '28mm', height: '28mm', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '28mm',
                height: '28mm',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '7px',
                color: '#94a3b8',
              }}
            >
              QR
            </div>
          )}
          <span style={{ fontSize: '5px', color: '#94a3b8', textAlign: 'center' }}>入退場スキャン</span>
        </div>

        {/* Right: Info */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontWeight: 700, fontSize: '11px', color: '#0f172a', lineHeight: 1.2 }}>
            {workerName}
          </div>
          {displayCompany && (
            <div style={{ fontSize: '7px', color: '#64748b', lineHeight: 1.2 }}>
              {displayCompany}
            </div>
          )}
          <div style={{ height: '1px', background: '#e2e8f0', margin: '2px 0' }} />

          {workerId && (
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <span style={{ fontSize: '6px', color: '#94a3b8', flexShrink: 0 }}>作業員番号</span>
              <span style={{ fontSize: '7px', color: '#334155', fontFamily: 'monospace' }}>{workerId}</span>
            </div>
          )}

          {certifications.length > 0 && (
            <div>
              <div style={{ fontSize: '6px', color: '#94a3b8', marginBottom: '1px' }}>資格</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                {certifications.slice(0, 3).map((c, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '5.5px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '1px 3px',
                      borderRadius: '2px',
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {emergencyContact && (
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <span style={{ fontSize: '6px', color: '#94a3b8', flexShrink: 0 }}>緊急連絡先</span>
              <span style={{ fontSize: '7px', color: '#334155' }}>{emergencyContact}</span>
            </div>
          )}

          {notes && (
            <div style={{ fontSize: '6px', color: '#64748b', marginTop: '1px' }}>{notes}</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '2px 8px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '6px', color: '#94a3b8' }}>
          発行日: {new Date().toLocaleDateString('ja-JP')}
        </span>
        <span style={{ fontSize: '6px', color: '#94a3b8' }}>BuildSync</span>
      </div>
    </div>
  )
}
