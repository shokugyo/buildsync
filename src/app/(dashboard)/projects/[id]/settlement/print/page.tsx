'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface SettlementData {
  project: {
    id: string
    name: string
    projectNumber: string
    contractAmount: number | null
    startDate: string | null
    endDate: string | null
    deliveryDate: string | null
    customer: { id: string; name: string } | null
  }
  contractAmount: number
  totalOrdered: number
  totalInvoiced: number
  totalPaid: number
  grossProfit: number
  grossMarginPct: number
  unpaidAmount: number
}

export default function SettlementPrintPage() {
  const params = useParams()
  const projectId = params.id as string

  const [data, setData] = useState<SettlementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('BuildSync 建設株式会社')
  const printDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}/settlement`).then(r => r.json()),
      fetch('/api/company').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([settlementData, companyData]) => {
      if (settlementData && !settlementData.error) setData(settlementData)
      if (companyData?.name) setCompanyName(companyData.name)
    }).finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">データが見つかりません</p>
        <Link href={`/projects/${projectId}`} className="text-blue-600 hover:underline">案件詳細に戻る</Link>
      </div>
    )
  }

  const { project, contractAmount, totalOrdered, totalInvoiced, totalPaid, grossProfit, grossMarginPct, unpaidAmount } = data
  const startDate = formatDate(project.startDate)
  const endDate = formatDate(project.deliveryDate || project.endDate)
  const constructionPeriod = (startDate !== '-' || endDate !== '-') ? `${startDate} 〜 ${endDate}` : '-'

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #settlement-area,
          #settlement-area * { visibility: visible; }
          #settlement-area {
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
        }
      `}</style>

      <div className="no-print p-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> 案件詳細に戻る
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-semibold text-slate-900">精算書</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Printer className="w-4 h-4" /> 印刷 / PDF保存
        </button>
      </div>

      <div id="settlement-area" className="bg-white p-8 max-w-3xl mx-auto">

        {/* Header */}
        <div style={{ borderBottom: '3px solid #1e40af', paddingBottom: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>精算書</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Final Account Document</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af' }}>{companyName}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>作成日: {printDate}</div>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>工事情報</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              {[
                ['工事名', project.name],
                ['工事番号', project.projectNumber],
                ['発注者', project.customer?.name || '-'],
                ['施工期間', constructionPeriod],
              ].map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontWeight: 600,
                    width: '130px',
                    fontSize: '11px',
                  }}>
                    {label}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: label === '工事名' ? 600 : 400 }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contract Amount */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>請負金額</SectionTitle>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>請負金額（税込）</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#1e40af' }}>{formatCurrency(contractAmount)}</span>
            </div>
          </div>
        </div>

        {/* Cost Section */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>原価</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#1e40af', color: 'white' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600 }}>項目</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 600 }}>金額</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#334155' }}>発注合計（外注・材料費等）</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                  {formatCurrency(totalOrdered)}
                </td>
              </tr>
              <tr style={{ background: '#fafafa', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>原価合計</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                  {formatCurrency(totalOrdered)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Gross Profit */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>粗利</SectionTitle>
          <div style={{
            background: grossProfit >= 0 ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${grossProfit >= 0 ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>粗利額（請負 − 原価）</div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: grossProfit >= 0 ? '#16a34a' : '#dc2626',
                }}>
                  {formatCurrency(grossProfit)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>粗利率</div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: grossProfit >= 0 ? '#16a34a' : '#dc2626',
                }}>
                  {grossMarginPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>入金状況</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#475569', color: 'white' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600 }}>区分</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 600 }}>金額</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#334155' }}>請求済合計</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: 500 }}>
                  {formatCurrency(totalInvoiced)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#334155' }}>入金済合計</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                  {formatCurrency(totalPaid)}
                </td>
              </tr>
              <tr style={{ background: unpaidAmount > 0 ? '#fff7ed' : '#f0fdf4', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: unpaidAmount > 0 ? '#ea580c' : '#16a34a' }}>
                  未入金残高
                </td>
                <td style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: unpaidAmount > 0 ? '#ea580c' : '#16a34a',
                }}>
                  {formatCurrency(unpaidAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature Area */}
        <div style={{ marginBottom: '24px' }}>
          <SectionTitle>確認欄</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {['施工会社（甲）', '発注者（乙）'].map((label) => (
              <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{
                  background: '#f8fafc',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  {label}
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>会社名・氏名</div>
                    <div style={{ borderBottom: '1px solid #cbd5e1', height: '24px' }} />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>印</div>
                    <div style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      marginTop: '4px',
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>日付</div>
                    <div style={{ borderBottom: '1px solid #cbd5e1', height: '24px' }} />
                  </div>
                </div>
              </div>
            ))}
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
          <span>{companyName} — 精算書</span>
          <span>作成日: {printDate} | BuildSync</span>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <div style={{ width: '4px', height: '18px', background: '#1e40af', borderRadius: '2px', flexShrink: 0 }} />
      <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{children}</h2>
    </div>
  )
}
