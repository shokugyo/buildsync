'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface JournalEntry {
  id: string
  date: string
  type: '発注' | '請求' | '入金' | '原価'
  description: string
  amount: number
  balance: number
}

interface Totals {
  ordered: number
  invoiced: number
  paid: number
  costs: number
}

const TYPE_COLORS: Record<string, string> = {
  '発注': 'bg-orange-100 text-orange-700',
  '請求': 'bg-blue-100 text-blue-700',
  '入金': 'bg-green-100 text-green-700',
  '原価': 'bg-red-100 text-red-700',
}

export default function JournalPage() {
  const params = useParams()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${params.id}/journal`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries || [])
        setTotals(data.totals || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/projects/${params.id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          案件に戻る
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          印刷
        </button>
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-6">工事台帳</h1>

      {totals && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">発注合計</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.ordered)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">請求合計</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.invoiced)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">入金合計</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.paid)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">読み込み中...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">データがありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">日付</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">種別</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">内容</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">金額</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">累計</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[entry.type] || 'bg-slate-100 text-slate-700'}`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{entry.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800">{formatCurrency(entry.amount)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${entry.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatCurrency(entry.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
