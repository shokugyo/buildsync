'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'

interface NearMiss {
  id: string
  projectId: string
  reporterId: string
  occurredAt: string
  location?: string | null
  situation: string
  cause?: string | null
  countermeasure?: string | null
  severity: string
  status: string
  companyId: string
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  reporter: { id: string; name: string }
}

const SEVERITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  '低': { bg: '#dcfce7', color: '#15803d', border: '1px solid #16a34a' },
  '中': { bg: '#fef9c3', color: '#92400e', border: '1px solid #d97706' },
  '高': { bg: '#fee2e2', color: '#b91c1c', border: '1px solid #dc2626' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '報告済': { bg: '#dbeafe', color: '#1d4ed8' },
  '対応中': { bg: '#fef9c3', color: '#92400e' },
  '対応完了': { bg: '#dcfce7', color: '#15803d' },
}

export default function NearMissPrintPage() {
  const params = useParams()
  const id = params.id as string

  const [nearMiss, setNearMiss] = useState<NearMiss | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/near-misses`)
      .then((r) => r.json())
      .then((data: NearMiss[]) => {
        const found = Array.isArray(data) ? data.find((n) => n.id === id) : null
        if (found) {
          setNearMiss(found)
        } else {
          setError('ヒヤリハット報告が見つかりませんでした')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('データの取得に失敗しました')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    )
  }

  if (error || !nearMiss) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error || 'データが見つかりません'}</p>
        <button onClick={() => window.close()} className="text-blue-600 hover:underline text-sm">
          閉じる
        </button>
      </div>
    )
  }

  const occurredDate = new Date(nearMiss.occurredAt).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const reportDate = new Date(nearMiss.createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const printDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const severityStyle = SEVERITY_STYLE[nearMiss.severity] || { bg: '#f9fafb', color: '#374151', border: '1px solid #9ca3af' }
  const statusStyle = STATUS_STYLE[nearMiss.status] || { bg: '#f3f4f6', color: '#374151' }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; font-size: 11pt; }
          .print-page { page-break-after: avoid; }
        }
        @page {
          margin: 15mm;
          size: A4 portrait;
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Action bar (no-print) */}
      <div className="no-print fixed top-4 left-4 right-4 flex items-center justify-between z-50 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
        <div className="text-sm font-medium text-slate-700">ヒヤリハット報告書 — 帳票プレビュー</div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Printer className="w-4 h-4" /> 印刷 / PDF保存
        </button>
      </div>

      {/* Printable content */}
      <div
        className="print-page bg-white mx-auto"
        style={{ maxWidth: '210mm', padding: '20mm 15mm 15mm', marginTop: '72px' }}
      >
        {/* ===== HEADER ===== */}
        <div
          style={{
            borderBottom: '3px double #7f1d1d',
            paddingBottom: '10px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '10pt', color: '#374151' }}>
              <div style={{ fontWeight: 700, fontSize: '11pt' }}>BuildSync 株式会社</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <h1
                style={{
                  fontSize: '17pt',
                  fontWeight: 800,
                  color: '#7f1d1d',
                  letterSpacing: '0.1em',
                  margin: 0,
                }}
              >
                ヒヤリハット報告書
              </h1>
            </div>
            <div style={{ fontSize: '9pt', color: '#6b7280', textAlign: 'right', minWidth: '100px' }}>
              <div>No. {nearMiss.project.projectNumber}</div>
              <div>報告日: {reportDate}</div>
              <div>出力日: {printDate}</div>
            </div>
          </div>
        </div>

        {/* ===== SEVERITY BADGE + STATUS ===== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '4px 16px',
              border: severityStyle.border,
              background: severityStyle.bg,
              color: severityStyle.color,
              fontWeight: 800,
              fontSize: '13pt',
              letterSpacing: '0.05em',
            }}
          >
            重大度: {nearMiss.severity}
          </div>
          <div
            style={{
              padding: '4px 14px',
              background: statusStyle.bg,
              color: statusStyle.color,
              fontWeight: 700,
              fontSize: '10pt',
              border: '1px solid currentColor',
            }}
          >
            {nearMiss.status}
          </div>
          <div style={{ fontSize: '9pt', color: '#6b7280', marginLeft: 'auto' }}>
            報告者: {nearMiss.reporter?.name || '不明'}
          </div>
        </div>

        {/* ===== OCCURRENCE INFO TABLE ===== */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '10pt',
            marginBottom: '16px',
            border: '1px solid #9ca3af',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  background: '#fef2f2',
                  fontWeight: 700,
                  padding: '6px 10px',
                  border: '1px solid #9ca3af',
                  width: '18%',
                  whiteSpace: 'nowrap',
                }}
              >
                発生日時
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #9ca3af', width: '32%' }}>
                {occurredDate}
              </td>
              <td
                style={{
                  background: '#fef2f2',
                  fontWeight: 700,
                  padding: '6px 10px',
                  border: '1px solid #9ca3af',
                  width: '18%',
                  whiteSpace: 'nowrap',
                }}
              >
                工事名
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #9ca3af', width: '32%' }}>
                {nearMiss.project.name}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  background: '#fef2f2',
                  fontWeight: 700,
                  padding: '6px 10px',
                  border: '1px solid #9ca3af',
                  whiteSpace: 'nowrap',
                }}
              >
                発生場所
              </td>
              <td colSpan={3} style={{ padding: '6px 10px', border: '1px solid #9ca3af' }}>
                {nearMiss.location || '（未記入）'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== SITUATION ===== */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              background: '#7f1d1d',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '4px',
            }}
          >
            1. 状況説明（何が起きたか）
          </div>
          <div
            style={{
              border: '1px solid #9ca3af',
              minHeight: '70px',
              padding: '10px',
              fontSize: '10pt',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {nearMiss.situation}
          </div>
        </div>

        {/* ===== CAUSE ===== */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              background: '#7f1d1d',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '4px',
            }}
          >
            2. 原因分析（なぜ起きたか）
          </div>
          {nearMiss.cause ? (
            <div
              style={{
                border: '1px solid #9ca3af',
                minHeight: '60px',
                padding: '10px',
                fontSize: '10pt',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {nearMiss.cause}
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed #d1d5db',
                minHeight: '60px',
                padding: '10px',
                fontSize: '9pt',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '6px' }}>□ 人的要因（不注意・技能不足・疲労）</div>
                <div style={{ marginBottom: '6px' }}>□ 設備・環境要因（不備・劣化・不整頓）</div>
                <div>□ 管理要因（手順不明確・教育不足）</div>
              </div>
            </div>
          )}
        </div>

        {/* ===== COUNTERMEASURE ===== */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              background: '#7f1d1d',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '4px',
            }}
          >
            3. 再発防止対策
          </div>
          {nearMiss.countermeasure ? (
            <div
              style={{
                border: '1px solid #9ca3af',
                minHeight: '60px',
                padding: '10px',
                fontSize: '10pt',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {nearMiss.countermeasure}
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed #d1d5db',
                minHeight: '60px',
                padding: '10px',
                fontSize: '9pt',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              （対策未記入 — 要記入）
            </div>
          )}
        </div>

        {/* ===== SIGNATURE AREA ===== */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              background: '#7f1d1d',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '8px',
            }}
          >
            承認・確認欄
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['報告者', '職長', '現場責任者', '安全管理者'].map((label) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  border: '1px solid #9ca3af',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    background: '#fef2f2',
                    padding: '3px 4px',
                    fontSize: '8pt',
                    fontWeight: 600,
                    borderBottom: '1px solid #9ca3af',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    height: '52px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '4px',
                    fontSize: '8pt',
                    color: '#d1d5db',
                  }}
                >
                  {label === '報告者' ? nearMiss.reporter?.name || '' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div
          style={{
            borderTop: '1px solid #9ca3af',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '8pt',
            color: '#6b7280',
          }}
        >
          <span>BuildSync 安全管理システム</span>
          <span>
            工事番号: {nearMiss.project.projectNumber} ／ {nearMiss.project.name}
          </span>
          <span>報告日: {reportDate}</span>
        </div>
      </div>
    </>
  )
}
