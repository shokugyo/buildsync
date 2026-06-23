'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'

interface WorkOrder {
  id: string
  orderNumber: string
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: string | null
  completedAt?: string | null
  createdAt: string
  project: { id: string; name: string; projectNumber: string }
  assignee?: { id: string; name: string } | null
}

const PRIORITY_LABEL: Record<string, string> = { 低: '低', 中: '中', 高: '高' }
const STATUS_LABEL: Record<string, string> = { 未着手: '未着手', 進行中: '進行中', 完了: '完了' }

function PrintContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setError('作業指示書IDが指定されていません')
      setLoading(false)
      return
    }
    fetch(`/api/work-orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('取得失敗')
        return r.json()
      })
      .then((data) => {
        setWorkOrder(data)
        setLoading(false)
      })
      .catch(() => {
        setError('作業指示書の取得に失敗しました')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        読み込み中...
      </div>
    )
  }

  if (error || !workOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        {error || '作業指示書が見つかりません'}
      </div>
    )
  }

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md"
        >
          <Printer className="w-4 h-4" />
          印刷
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm"
        >
          閉じる
        </button>
      </div>

      {/* Printable content */}
      <div className="max-w-3xl mx-auto p-10 text-sm font-sans text-slate-900">
        {/* Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">作業指示書</h1>
              <p className="text-slate-500 mt-1">Work Order</p>
            </div>
            <div className="text-right text-slate-600 space-y-0.5">
              <p className="font-mono font-semibold text-base text-slate-800">{workOrder.orderNumber}</p>
              <p>発行日：{today}</p>
            </div>
          </div>
        </div>

        {/* Project info */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">案件情報</h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600 w-32">案件番号</th>
                  <td className="px-4 py-2.5 text-slate-900">{workOrder.project.projectNumber}</td>
                  <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600 w-32">案件名</th>
                  <td className="px-4 py-2.5 text-slate-900">{workOrder.project.name}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Work order details */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">作業内容</h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600 w-32">タイトル</th>
                  <td className="px-4 py-2.5 text-slate-900 font-medium" colSpan={3}>{workOrder.title}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600">担当者</th>
                  <td className="px-4 py-2.5 text-slate-900">{workOrder.assignee?.name || '未割り当て'}</td>
                  <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600 w-24">優先度</th>
                  <td className="px-4 py-2.5 text-slate-900">{PRIORITY_LABEL[workOrder.priority] || workOrder.priority}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600">ステータス</th>
                  <td className="px-4 py-2.5 text-slate-900">{STATUS_LABEL[workOrder.status] || workOrder.status}</td>
                  <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600">期日</th>
                  <td className="px-4 py-2.5 text-slate-900">
                    {workOrder.dueDate
                      ? new Date(workOrder.dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '-'}
                  </td>
                </tr>
                {workOrder.description && (
                  <tr>
                    <th className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600 align-top">説明</th>
                    <td className="px-4 py-2.5 text-slate-900 whitespace-pre-wrap leading-relaxed" colSpan={3}>
                      {workOrder.description}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Instructions/Notes area */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">作業指示・注意事項</h2>
          <div className="border border-slate-200 rounded-lg min-h-32 p-4 text-slate-400 text-sm">
            （作業担当者へのメモ・特記事項をここに記入）
          </div>
        </section>

        {/* Signatures */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">確認欄</h2>
          <div className="grid grid-cols-3 gap-4">
            {['指示者', '確認者', '担当者'].map((label) => (
              <div key={label} className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-6">{label}</p>
                <div className="border-b border-slate-300 mt-10" />
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 text-xs text-slate-400 flex justify-between">
          <span>BuildSync 作業指示書 {workOrder.orderNumber}</span>
          <span>作成日：{new Date(workOrder.createdAt).toLocaleDateString('ja-JP')}</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          @page {
            margin: 10mm 15mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}

export default function WorkOrderPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-slate-500">
          読み込み中...
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  )
}
