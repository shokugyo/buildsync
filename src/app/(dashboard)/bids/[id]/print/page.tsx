'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'

type Bid = {
  id: string
  title: string
  project: { id: string; name: string; projectNumber: string } | null
  bidDate: string
  submissionDeadline: string | null
  estimatedAmount: number | null
  bidAmount: number | null
  status: string
  result: string | null
  competitors: number
  notes: string | null
  createdAt: string
}

export default function BidPrintPage() {
  const params = useParams()
  const [bid, setBid] = useState<Bid | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [bidRes, sessionRes] = await Promise.all([
          fetch(`/api/bids/${params.id}`),
          fetch('/api/auth/session'),
        ])
        if (!bidRes.ok) { setError('入札情報が見つかりません'); setLoading(false); return }
        const bidData = await bidRes.json()
        const sessionData = await sessionRes.json()
        setBid(bidData)
        setCompanyName(sessionData?.user?.companyName || '')
      } catch {
        setError('読み込みエラー')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-500">読み込み中...</div>
  if (error || !bid) return <div className="flex items-center justify-center min-h-screen text-red-500">{error || '読み込みエラー'}</div>

  const printDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const fmtMoney = (v: number | null) => v != null ? `¥${v.toLocaleString()}` : '—'

  // Generate a simple bid number from createdAt
  const bidNumber = `BID-${new Date(bid.createdAt).getFullYear()}-${bid.id.slice(-6).toUpperCase()}`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4; margin: 20mm 15mm; }
        }
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; }
      `}</style>

      {/* Print button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Printer className="w-4 h-4" />
          印刷する
        </button>
      </div>

      {/* A4 Document */}
      <div className="max-w-[210mm] mx-auto bg-white p-[20mm] min-h-[297mm] text-[10pt] text-gray-900 print:p-0">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-sm text-slate-500 mb-1">{companyName}</p>
          <h1 className="text-3xl font-bold tracking-widest mb-4">入　札　書</h1>
          <div className="flex justify-center gap-10 text-sm">
            <span>入札番号：<strong>{bidNumber}</strong></span>
            <span>作成日：{printDate}</span>
          </div>
        </div>

        {/* Bid details table */}
        <table className="w-full border-collapse mb-8 text-sm">
          <tbody>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium w-1/3 border-r border-slate-300">入札件名</th>
              <td className="px-4 py-2.5 font-medium">{bid.title}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">関連案件</th>
              <td className="px-4 py-2.5">
                {bid.project ? `${bid.project.name}（${bid.project.projectNumber}）` : '—'}
              </td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">入札日</th>
              <td className="px-4 py-2.5">{fmt(bid.bidDate)}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">提出期限</th>
              <td className="px-4 py-2.5">{fmt(bid.submissionDeadline)}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">予定価格（税抜）</th>
              <td className="px-4 py-2.5">{fmtMoney(bid.estimatedAmount)}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">入札金額（税抜）</th>
              <td className="px-4 py-2.5 font-bold text-lg">{fmtMoney(bid.bidAmount)}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">競合他社数</th>
              <td className="px-4 py-2.5">{bid.competitors > 0 ? `${bid.competitors}社` : '—'}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">ステータス</th>
              <td className="px-4 py-2.5">{bid.status}</td>
            </tr>
            {bid.result && (
              <tr className="border border-slate-300">
                <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">結果</th>
                <td className="px-4 py-2.5">{bid.result}</td>
              </tr>
            )}
            {bid.notes && (
              <tr className="border border-slate-300">
                <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300 align-top">備考</th>
                <td className="px-4 py-2.5 whitespace-pre-wrap">{bid.notes}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Validity section */}
        <div className="mb-8 p-4 border border-slate-300 rounded">
          <h2 className="text-sm font-bold mb-3">入札有効期間・特記事項</h2>
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="font-medium w-32 flex-shrink-0">有効期間：</span>
              <div className="flex-1 border-b border-slate-300 pb-1">入札日より　　　日間</div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="font-medium w-32 flex-shrink-0">特記事項：</span>
              <div className="flex-1">
                <div className="border-b border-slate-200 mb-2 pb-3" />
                <div className="border-b border-slate-200 mb-2 pb-3" />
                <div className="border-b border-slate-200 pb-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Signature area */}
        <div className="mt-10">
          <h2 className="text-sm font-bold border-b-2 border-slate-800 pb-1 mb-6">提出者情報</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="w-20 flex-shrink-0 text-slate-500">会社名：</span>
                <span className="font-medium">{companyName}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-20 flex-shrink-0 text-slate-500">住　所：</span>
                <div className="flex-1 border-b border-slate-300 pb-1" />
              </div>
              <div className="flex gap-2">
                <span className="w-20 flex-shrink-0 text-slate-500">担当者：</span>
                <div className="flex-1 border-b border-slate-300 pb-1" />
              </div>
              <div className="flex gap-2">
                <span className="w-20 flex-shrink-0 text-slate-500">連絡先：</span>
                <div className="flex-1 border-b border-slate-300 pb-1" />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="border-2 border-slate-300 w-28 h-28 flex items-center justify-center text-slate-300 text-xs">
                印
              </div>
              <p className="text-xs text-slate-400 mt-2">代表者印</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-slate-400 border-t border-slate-200 pt-4">
          上記金額にて入札いたします。
        </div>
      </div>
    </>
  )
}
