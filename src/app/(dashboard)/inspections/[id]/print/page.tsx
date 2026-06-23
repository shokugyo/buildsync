'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface InspectionItem {
  id: string
  name: string
  result?: string | null
  comment?: string | null
  photoUrl?: string | null
}

interface Defect {
  id: string
  content: string
  location?: string | null
  status: string
  dueDate?: string | null
  assignee?: { name: string } | null
}

interface Inspection {
  id: string
  name: string
  type: string
  scheduledDate?: string | null
  actualDate?: string | null
  status: string
  notes?: string | null
  approvalStatus?: string | null
  inspectionGroup?: string | null
  hasCorrection?: boolean
  project: { name: string; projectNumber: string; address?: string | null }
  inspector?: { name: string } | null
  items: InspectionItem[]
  defects: Defect[]
}

interface Company {
  name?: string | null
  address?: string | null
  phone?: string | null
}

function resultLabel(result: string | null | undefined): string {
  if (result === '合格') return '○'
  if (result === '不合格') return '×'
  if (result === '指摘') return '△'
  return '－'
}

function resultColor(result: string | null | undefined): string {
  if (result === '合格') return '#166534'
  if (result === '不合格') return '#991b1b'
  if (result === '指摘') return '#854d0e'
  return '#9ca3af'
}

export default function InspectionPrintPage() {
  const params = useParams()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/inspections/${params.id}`).then(r => r.json()),
      fetch('/api/company').then(r => r.json()),
    ]).then(([insp, comp]) => {
      setInspection(insp)
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!inspection) return <div className="p-8 text-center">検査記録が見つかりません</div>

  const passCount = inspection.items?.filter(i => i.result === '合格').length ?? 0
  const failCount = inspection.items?.filter(i => i.result === '不合格').length ?? 0
  const pointCount = inspection.items?.filter(i => i.result === '指摘').length ?? 0
  const totalCount = inspection.items?.length ?? 0

  const defectsWithPhotos = inspection.defects?.filter(
    d => d.status !== '是正完了' && d.status !== '確認済'
  ) ?? []

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="bg-white min-h-screen p-10 max-w-4xl mx-auto font-sans print:p-0">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4 portrait; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
        table { border-collapse: collapse; width: 100%; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Action bar */}
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          印刷 / PDF保存
        </button>
        <button
          onClick={() => window.history.back()}
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          戻る
        </button>
      </div>

      {/* Document */}
      <div className="border border-slate-200 p-10">

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest mb-1">検　査　報　告　書</h1>
          <p className="text-sm text-slate-500">{inspection.type}</p>
        </div>

        {/* Header info table */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm avoid-break">
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['工事件名', inspection.project?.name],
                ['案件番号', inspection.project?.projectNumber],
                ['工事場所', inspection.project?.address || ''],
                ['検査名称', inspection.name],
                ['検査種別', inspection.type],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap', width: '100px' }}>{label}</td>
                  <td style={{ padding: '5px 8px', fontWeight: 600 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['検査予定日', formatDate(inspection.scheduledDate)],
                ['実施日', formatDate(inspection.actualDate) || '　'],
                ['検査担当者', inspection.inspector?.name || '　'],
                ['検査結果', inspection.status],
                ['作成会社', company?.name || '　'],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap', width: '100px' }}>{label}</td>
                  <td style={{ padding: '5px 8px', fontWeight: label === '検査結果' ? 700 : 600,
                    color: label === '検査結果'
                      ? (inspection.status === '合格' ? '#166534' : inspection.status === '不合格' ? '#991b1b' : '#374151')
                      : '#374151'
                  }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Result summary banner */}
        <div
          style={{
            textAlign: 'center',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '24px',
            fontWeight: 700,
            fontSize: '14pt',
            background: inspection.status === '合格' ? '#dcfce7' : inspection.status === '不合格' ? '#fee2e2' : '#f1f5f9',
            color: inspection.status === '合格' ? '#166534' : inspection.status === '不合格' ? '#991b1b' : '#374151',
          }}
        >
          検査結果: {inspection.status}
          {totalCount > 0 && (
            <span style={{ marginLeft: '16px', fontSize: '10pt', fontWeight: 400 }}>
              （合格 {passCount}件 / 指摘 {pointCount}件 / 不合格 {failCount}件 / 計 {totalCount}件）
            </span>
          )}
        </div>

        {/* Checklist table */}
        {inspection.items && inspection.items.length > 0 && (
          <div className="mb-8 avoid-break">
            <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#374151', borderBottom: '2px solid #1e3a5f', paddingBottom: '4px', marginBottom: '8px' }}>
              チェックリスト
            </h2>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt' }}>
              <thead>
                <tr style={{ background: '#1e3a5f', color: 'white' }}>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center', width: '36px' }}>No.</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>チェック項目</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'center', width: '52px' }}>判定</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>指摘内容・コメント</th>
                </tr>
              </thead>
              <tbody>
                {inspection.items.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{item.name}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontWeight: 700, fontSize: '12pt', color: resultColor(item.result) }}>
                      {resultLabel(item.result)}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', color: '#4b5563' }}>{item.comment || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '8pt', color: '#64748b', marginTop: '4px' }}>
              ○: 合格　△: 指摘　×: 不合格　－: 未実施
            </p>
          </div>
        )}

        {/* Defects table */}
        {inspection.defects && inspection.defects.length > 0 && (
          <div className="mb-8 avoid-break">
            <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#374151', borderBottom: '2px solid #dc2626', paddingBottom: '4px', marginBottom: '8px' }}>
              指摘事項一覧（{inspection.defects.length}件）
            </h2>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt' }}>
              <thead>
                <tr style={{ background: '#991b1b', color: 'white' }}>
                  <th style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'center', width: '36px' }}>No.</th>
                  <th style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'left' }}>内容</th>
                  <th style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'left', width: '80px' }}>場所</th>
                  <th style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'center', width: '72px' }}>是正期限</th>
                  <th style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'left', width: '72px' }}>担当者</th>
                  <th style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'center', width: '64px' }}>是正状況</th>
                </tr>
              </thead>
              <tbody>
                {inspection.defects.map((d, idx) => (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fef2f2' }}>
                    <td style={{ border: '1px solid #fca5a5', padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #fca5a5', padding: '5px 8px' }}>{d.content}</td>
                    <td style={{ border: '1px solid #fca5a5', padding: '5px 8px', color: '#4b5563' }}>{d.location || '−'}</td>
                    <td style={{ border: '1px solid #fca5a5', padding: '5px 8px', textAlign: 'center', color: '#4b5563' }}>
                      {d.dueDate ? formatDate(d.dueDate) : '−'}
                    </td>
                    <td style={{ border: '1px solid #fca5a5', padding: '5px 8px', color: '#4b5563' }}>
                      {d.assignee?.name || '−'}
                    </td>
                    <td style={{ border: '1px solid #fca5a5', padding: '5px 8px', textAlign: 'center', fontWeight: 600,
                      color: d.status === '是正完了' || d.status === '確認済' ? '#166534' : d.status === '対応中' ? '#854d0e' : '#991b1b'
                    }}>
                      {d.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Correction photos */}
        {defectsWithPhotos.length > 0 && (
          <div className="mb-8 avoid-break">
            <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#374151', borderBottom: '2px solid #d97706', paddingBottom: '4px', marginBottom: '8px' }}>
              是正写真
            </h2>
            <p style={{ fontSize: '8pt', color: '#64748b', marginBottom: '8px' }}>（是正未完了の指摘事項 {defectsWithPhotos.length}件）</p>
            <p style={{ fontSize: '9pt', color: '#9ca3af' }}>※ 是正後の写真は是正完了時に添付してください。</p>
          </div>
        )}

        {/* Notes */}
        {inspection.notes && (
          <div className="mb-8 avoid-break">
            <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
              備考
            </h2>
            <p style={{ fontSize: '9pt', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{inspection.notes}</p>
          </div>
        )}

        {/* Signature area */}
        <div className="avoid-break" style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '10pt', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '16px' }}>
            確認署名
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '9pt' }}>
            {['確認者', '検査担当者', '施工責任者'].map(role => (
              <div key={role} style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }}>
                <p style={{ color: '#64748b', marginBottom: '4px', fontSize: '8pt' }}>{role}</p>
                <div style={{ height: '64px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }} />
                <p style={{ color: '#9ca3af', fontSize: '7pt' }}>氏名・印</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '7pt', color: '#9ca3af', textAlign: 'center' }}>
          {company?.name} — 検査報告書 / {inspection.project?.name} / 作成日: {today}
        </div>
      </div>
    </div>
  )
}
