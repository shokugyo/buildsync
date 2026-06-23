'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'

interface RiskItem {
  risk: string
  measure: string
  level: '低' | '中' | '高'
}

interface KyActivity {
  id: string
  projectId: string
  activityDate: string
  leader?: string | null
  participants?: string | null
  risks: string
  location?: string | null
  notes?: string | null
  companyId: string
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
}

const LEVEL_BORDER: Record<string, string> = {
  '低': '2px solid #16a34a',
  '中': '2px solid #d97706',
  '高': '2px solid #dc2626',
}

const LEVEL_BG: Record<string, string> = {
  '低': '#dcfce7',
  '中': '#fef9c3',
  '高': '#fee2e2',
}

export default function KyActivityPrintPage() {
  const params = useParams()
  const id = params.id as string

  const [activity, setActivity] = useState<KyActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/ky-activities`)
      .then((r) => r.json())
      .then((data: KyActivity[]) => {
        const found = Array.isArray(data) ? data.find((a) => a.id === id) : null
        if (found) {
          setActivity(found)
        } else {
          setError('KY活動記録が見つかりませんでした')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('データの取得に失敗しました')
        setLoading(false)
      })
  }, [id])

  const getRisks = (): RiskItem[] => {
    if (!activity) return []
    try {
      return JSON.parse(activity.risks)
    } catch {
      return []
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error || 'データが見つかりません'}</p>
        <button onClick={() => window.close()} className="text-blue-600 hover:underline text-sm">
          閉じる
        </button>
      </div>
    )
  }

  const risks = getRisks()
  const activityDate = new Date(activity.activityDate).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const printDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

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
        <div className="text-sm font-medium text-slate-700">KY活動記録票 — 帳票プレビュー</div>
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
            borderBottom: '3px double #1e3a5f',
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
                  fontSize: '18pt',
                  fontWeight: 800,
                  color: '#1e3a5f',
                  letterSpacing: '0.12em',
                  margin: 0,
                }}
              >
                KY活動記録票
              </h1>
            </div>
            <div style={{ fontSize: '9pt', color: '#6b7280', textAlign: 'right', minWidth: '100px' }}>
              <div>No. {activity.project.projectNumber}</div>
              <div>作成日: {printDate}</div>
            </div>
          </div>
        </div>

        {/* ===== BASIC INFO TABLE ===== */}
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
                  background: '#f1f5f9',
                  fontWeight: 700,
                  padding: '6px 10px',
                  border: '1px solid #9ca3af',
                  width: '18%',
                  whiteSpace: 'nowrap',
                }}
              >
                実施日
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #9ca3af', width: '32%' }}>
                {activityDate}
              </td>
              <td
                style={{
                  background: '#f1f5f9',
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
                {activity.project.name}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  background: '#f1f5f9',
                  fontWeight: 700,
                  padding: '6px 10px',
                  border: '1px solid #9ca3af',
                  whiteSpace: 'nowrap',
                }}
              >
                作業場所
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #9ca3af' }}>
                {activity.location || '　'}
              </td>
              <td
                style={{
                  background: '#f1f5f9',
                  fontWeight: 700,
                  padding: '6px 10px',
                  border: '1px solid #9ca3af',
                  whiteSpace: 'nowrap',
                }}
              >
                KYリーダー
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #9ca3af' }}>
                {activity.leader || '　'}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  background: '#f1f5f9',
                  fontWeight: 700,
                  padding: '6px 10px',
                  border: '1px solid #9ca3af',
                  whiteSpace: 'nowrap',
                }}
              >
                参加者
              </td>
              <td colSpan={3} style={{ padding: '6px 10px', border: '1px solid #9ca3af' }}>
                {activity.participants || '　'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== WORK CONTENT SECTION ===== */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              background: '#1e3a5f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '4px',
            }}
          >
            本日の作業内容
          </div>
          <div
            style={{
              border: '1px solid #9ca3af',
              minHeight: '40px',
              padding: '8px 10px',
              fontSize: '10pt',
            }}
          >
            {activity.notes || '　'}
          </div>
        </div>

        {/* ===== RISK TABLE ===== */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              background: '#1e3a5f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '4px',
            }}
          >
            危険予知項目・リスクアセスメント
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10pt',
              border: '1px solid #9ca3af',
            }}
          >
            <thead>
              <tr style={{ background: '#e2e8f0' }}>
                <th
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #9ca3af',
                    fontWeight: 700,
                    textAlign: 'left',
                    width: '5%',
                  }}
                >
                  No.
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #9ca3af',
                    fontWeight: 700,
                    textAlign: 'left',
                    width: '38%',
                  }}
                >
                  危険内容（どんな危険があるか）
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #9ca3af',
                    fontWeight: 700,
                    textAlign: 'center',
                    width: '10%',
                  }}
                >
                  リスク
                  <br />
                  レベル
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #9ca3af',
                    fontWeight: 700,
                    textAlign: 'left',
                    width: '47%',
                  }}
                >
                  対策（どうすれば防げるか）
                </th>
              </tr>
            </thead>
            <tbody>
              {risks.length > 0 ? (
                risks.map((r, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        padding: '7px 8px',
                        border: '1px solid #9ca3af',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '9pt',
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: '7px 8px',
                        border: '1px solid #9ca3af',
                        lineHeight: 1.5,
                      }}
                    >
                      {r.risk}
                    </td>
                    <td
                      style={{
                        padding: '7px 8px',
                        border: LEVEL_BORDER[r.level] || '1px solid #9ca3af',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '11pt',
                        background: LEVEL_BG[r.level] || '#f9fafb',
                      }}
                    >
                      {r.level}
                    </td>
                    <td
                      style={{
                        padding: '7px 8px',
                        border: '1px solid #9ca3af',
                        lineHeight: 1.5,
                      }}
                    >
                      {r.measure}
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty rows when no data */
                [1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td
                      style={{
                        padding: '7px 8px',
                        border: '1px solid #9ca3af',
                        textAlign: 'center',
                        color: '#d1d5db',
                      }}
                    >
                      {n}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #9ca3af', height: '32px' }} />
                    <td style={{ padding: '7px 8px', border: '1px solid #9ca3af' }} />
                    <td style={{ padding: '7px 8px', border: '1px solid #9ca3af' }} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Legend */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '4px',
              fontSize: '8pt',
              color: '#6b7280',
            }}
          >
            <span>
              リスクレベル凡例：
            </span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>高 = 重大な危険</span>
            <span style={{ color: '#d97706', fontWeight: 700 }}>中 = 注意が必要</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>低 = 軽微なリスク</span>
          </div>
        </div>

        {/* ===== CONFIRMATION SECTION ===== */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              background: '#1e3a5f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '8px',
            }}
          >
            確認欄（参加者全員サイン）
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['リーダー', '確認者①', '確認者②', '確認者③', '確認者④'].map((label) => (
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
                    background: '#f1f5f9',
                    padding: '3px 4px',
                    fontSize: '8pt',
                    fontWeight: 600,
                    borderBottom: '1px solid #9ca3af',
                  }}
                >
                  {label}
                </div>
                <div style={{ height: '52px' }} />
              </div>
            ))}
          </div>
        </div>

        {/* ===== TODAY'S COMMITMENT ===== */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              background: '#1e3a5f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '10pt',
              padding: '5px 10px',
              marginBottom: '4px',
            }}
          >
            本日の安全目標（チームで唱和）
          </div>
          <div
            style={{
              border: '1px solid #9ca3af',
              minHeight: '36px',
              padding: '8px 10px',
              fontSize: '10pt',
              fontStyle: 'italic',
              color: '#374151',
            }}
          >
            「今日も安全第一で、全員無事に家に帰ります！」
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
            工事番号: {activity.project.projectNumber} ／ {activity.project.name}
          </span>
          <span>実施日: {activityDate}</span>
        </div>
      </div>
    </>
  )
}
