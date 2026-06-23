'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'

interface LedgerEntry {
  id: string
  contractorName: string
  contractorType: string
  workType: string
  contractAmount: number | null
  startDate: string | null
  endDate: string | null
  supervisorName: string | null
  licenseNumber: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
  projectNumber: string
  address: string | null
  startDate: string | null
  endDate: string | null
  company?: { name: string }
}

const TYPE_ORDER = ['元請', '一次下請', '二次下請', '三次下請', 'その他']

function PrintContent() {
  const params = useParams()
  const projectId = params.id as string

  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}/ledger`).then(r => r.json()),
      fetch(`/api/projects/${projectId}`).then(r => r.json()),
    ]).then(([ledger, proj]) => {
      const list: LedgerEntry[] = Array.isArray(ledger) ? ledger : []
      list.sort((a, b) => {
        const ai = TYPE_ORDER.indexOf(a.contractorType)
        const bi = TYPE_ORDER.indexOf(b.contractorType)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      setEntries(list)
      setProject(proj && proj.id ? proj : null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [projectId])

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ja-JP') : ''

  const fmtCurrency = (n: number | null) =>
    n != null ? n.toLocaleString('ja-JP') + ' 円' : ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        読み込み中...
      </div>
    )
  }

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4 portrait; margin: 15mm 12mm; }
        }
      `}</style>

      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
        <span className="text-sm text-slate-600 font-medium">施工体制台帳 — 印刷プレビュー</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Printer className="w-4 h-4" />
          印刷する
        </button>
      </div>

      <div className="pt-16">
        <div className="max-w-[794px] mx-auto bg-white p-8 print:p-0 print:max-w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-widest mb-1">施　工　体　制　台　帳</h1>
            <p className="text-xs text-slate-500">建設業法第24条の7第1項の規定による</p>
          </div>

          <div className="flex justify-between mb-5 text-sm gap-4">
            <div className="flex-1 space-y-1">
              <div>
                <span className="font-medium">工事名：</span>
                <span className="border-b border-slate-400 inline-block min-w-[220px] pb-0.5">
                  {project?.name || ''}
                </span>
              </div>
              <div>
                <span className="font-medium">工事場所：</span>
                <span className="border-b border-slate-400 inline-block min-w-[200px] pb-0.5">
                  {project?.address || ''}
                </span>
              </div>
              <div>
                <span className="font-medium">工期：</span>
                <span className="border-b border-slate-400 inline-block min-w-[180px] pb-0.5">
                  {project?.startDate ? fmtDate(project.startDate) : ''} 〜 {project?.endDate ? fmtDate(project.endDate) : ''}
                </span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <span className="font-medium">作成日：</span>
                <span>{today}</span>
              </div>
              {project?.company?.name && (
                <div>
                  <span className="font-medium">元請業者：</span>
                  <span>{project.company.name}</span>
                </div>
              )}
            </div>
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold w-6">No.</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">区分</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">業者名</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">工事種別</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">現場代理人</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">建設業許可番号</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">工期</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">請負金額</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-slate-400 px-4 py-8 text-center text-slate-400">
                    登録された業者がありません
                  </td>
                </tr>
              ) : (
                entries.map((entry, i) => {
                  const indentMap: Record<string, number> = { '元請': 0, '一次下請': 1, '二次下請': 2, '三次下請': 3 }
                  const indent = (indentMap[entry.contractorType] ?? 0) * 12
                  return (
                    <tr key={entry.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                      <td className="border border-slate-400 px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center whitespace-nowrap">
                        {entry.contractorType}
                      </td>
                      <td className="border border-slate-400 px-2 py-1.5 font-medium" style={{ paddingLeft: indent + 6 }}>
                        {indent > 0 && (
                          <span className="text-slate-400 mr-1">└</span>
                        )}
                        {entry.contractorName}
                      </td>
                      <td className="border border-slate-400 px-2 py-1.5">{entry.workType}</td>
                      <td className="border border-slate-400 px-2 py-1.5">{entry.supervisorName || ''}</td>
                      <td className="border border-slate-400 px-2 py-1.5">{entry.licenseNumber || ''}</td>
                      <td className="border border-slate-400 px-2 py-1.5 whitespace-nowrap text-center">
                        {entry.startDate ? fmtDate(entry.startDate) : ''}
                        {entry.startDate && entry.endDate ? '〜' : ''}
                        {entry.endDate ? fmtDate(entry.endDate) : ''}
                      </td>
                      <td className="border border-slate-400 px-2 py-1.5 text-right">
                        {fmtCurrency(entry.contractAmount)}
                      </td>
                    </tr>
                  )
                })
              )}
              {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-300">{entries.length + i + 1}</td>
                  <td className="border border-slate-400 px-2 py-3"></td>
                  <td className="border border-slate-400 px-2 py-3"></td>
                  <td className="border border-slate-400 px-2 py-3"></td>
                  <td className="border border-slate-400 px-2 py-3"></td>
                  <td className="border border-slate-400 px-2 py-3"></td>
                  <td className="border border-slate-400 px-2 py-3"></td>
                  <td className="border border-slate-400 px-2 py-3"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 text-xs text-slate-500 border-t border-slate-200 pt-3 space-y-0.5">
            <p>※本台帳は建設業法第24条の7に基づく施工体制台帳として作成・保管してください。</p>
            <p>※特定建設業者が発注者から直接建設工事を請け負った場合に作成が義務付けられています。</p>
            <p>※工事完了後5年間保存する必要があります。</p>
          </div>

          <div className="mt-8 flex justify-between text-xs">
            <div className="text-center">
              <div className="border-b border-slate-400 w-40 mb-1"></div>
              <p className="text-slate-500">確認者</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 w-40 mb-1"></div>
              <p className="text-slate-500">作成者</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LedgerPrintPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">読み込み中...</div>}>
      <PrintContent />
    </Suspense>
  )
}
