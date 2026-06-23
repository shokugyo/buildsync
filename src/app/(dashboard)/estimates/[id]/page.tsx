'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Printer, CheckCircle, XCircle, Clock, FileText } from 'lucide-react'

interface EstimateItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

interface Estimate {
  id: string
  estimateNumber: string
  status: string
  totalAmount: number
  estimateDate?: string | null
  validUntil?: string | null
  notes?: string | null
  project: {
    id: string
    name: string
    projectNumber: string
    address?: string | null
    customer?: { name: string } | null
  }
  items: EstimateItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  '作成中': { label: '作成中', color: 'bg-slate-100 text-slate-700', icon: Clock },
  '承認依頼中': { label: '承認依頼中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  '承認済': { label: '承認済', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  '提出済': { label: '提出済', color: 'bg-blue-100 text-blue-700', icon: FileText },
  '受注': { label: '受注', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  '失注': { label: '失注', color: 'bg-red-100 text-red-700', icon: XCircle },
  '差戻し': { label: '差戻し', color: 'bg-orange-100 text-orange-700', icon: XCircle },
}

export default function EstimateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    fetch(`/api/estimates/${params.id}`)
      .then(r => r.json())
      .then(data => { setEstimate(data); setLoading(false) })
  }, [params.id])

  const handleStatusChange = async (newStatus: string) => {
    if (!estimate) return
    setSaving(true)
    const res = await fetch(`/api/estimates/${estimate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEstimate(updated)
    }
    setSaving(false)
  }

  const handleConvertToOrder = async () => {
    if (!estimate) return
    setConverting(true)
    const res = await fetch(`/api/estimates/${estimate.id}/convert-to-order`, {
      method: 'POST',
    })
    if (res.ok) {
      router.push('/orders')
    } else {
      setConverting(false)
    }
  }

  if (loading) return <div className="p-8 text-center">読み込み中...</div>
  if (!estimate) return <div className="p-8 text-center">見積が見つかりません</div>

  const statusCfg = STATUS_CONFIG[estimate.status] || { label: estimate.status, color: 'bg-slate-100 text-slate-700', icon: Clock }
  const StatusIcon = statusCfg.icon

  return (
    <div>
      <Header title="見積詳細" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex gap-2">
            <Link
              href={`/estimates/${estimate.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              見積書印刷
            </Link>
            {estimate.status === '承認済' && (
              <button
                onClick={handleConvertToOrder}
                disabled={converting}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {converting ? '変換中...' : '発注に変換'}
              </button>
            )}
          </div>
        </div>

        {/* Main info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">{estimate.estimateNumber}</p>
              <h2 className="text-xl font-bold mt-1">{estimate.project?.name}</h2>
              {estimate.project?.customer && (
                <p className="text-slate-600 mt-0.5">{estimate.project.customer.name}</p>
              )}
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusCfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusCfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">案件番号</p>
              <Link href={`/projects/${estimate.project?.id}`} className="font-medium text-blue-600 hover:underline">
                {estimate.project?.projectNumber}
              </Link>
            </div>
            {estimate.project?.address && (
              <div>
                <p className="text-slate-500">現場住所</p>
                <p className="font-medium">{estimate.project.address}</p>
              </div>
            )}
            {estimate.estimateDate && (
              <div>
                <p className="text-slate-500">見積日</p>
                <p className="font-medium">{formatDate(estimate.estimateDate)}</p>
              </div>
            )}
            {estimate.validUntil && (
              <div>
                <p className="text-slate-500">有効期限</p>
                <p className="font-medium">{formatDate(estimate.validUntil)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">見積金額</h3>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(estimate.totalAmount)}</p>
        </div>

        {/* Line items */}
        {estimate.items.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-4">明細</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">品目</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-16">数量</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-28">単価</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-28">金額</th>
                </tr>
              </thead>
              <tbody>
                {estimate.items.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {estimate.notes && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-2">備考</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        {/* Status workflow */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">ステータス変更</h3>
          <div className="flex flex-wrap gap-2">
            {['作成中', '承認依頼中', '承認済', '提出済', '受注', '失注', '差戻し'].map(s => (
              <button
                key={s}
                disabled={saving || estimate.status === s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  estimate.status === s
                    ? 'bg-slate-900 text-white border-slate-900 cursor-default'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
