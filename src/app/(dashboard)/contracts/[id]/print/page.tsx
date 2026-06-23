'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'

type Contract = {
  id: string
  contractNumber: string
  title: string
  contractType: string
  amount?: number
  startDate?: string
  endDate?: string
  signedAt?: string
  status: string
  notes?: string
  project?: { id: string; name: string; projectNumber: string }
  customer?: { id: string; name: string }
  createdAt: string
}

export default function ContractPrintPage() {
  const params = useParams()
  const [contract, setContract] = useState<Contract | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [contractRes, sessionRes] = await Promise.all([
          fetch(`/api/contracts/${params.id}`),
          fetch('/api/auth/session'),
        ])
        if (!contractRes.ok) { setError('契約書が見つかりません'); setLoading(false); return }
        const contractData = await contractRes.json()
        const sessionData = await sessionRes.json()
        setContract(contractData)
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
  if (error || !contract) return <div className="flex items-center justify-center min-h-screen text-red-500">{error || '読み込みエラー'}</div>

  const printDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '　　　　年　　月　　日'

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
          <h1 className="text-3xl font-bold tracking-widest mb-4">契　約　書</h1>
          <div className="flex justify-center gap-10 text-sm">
            <span>契約番号：<strong>{contract.contractNumber}</strong></span>
            <span>作成日：{printDate}</span>
          </div>
        </div>

        {/* Contract details table */}
        <table className="w-full border-collapse mb-8 text-sm">
          <tbody>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium w-1/3 border-r border-slate-300">契約タイトル</th>
              <td className="px-4 py-2.5 font-medium">{contract.title}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">契約種別</th>
              <td className="px-4 py-2.5">{contract.contractType}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">顧客 / 発注者</th>
              <td className="px-4 py-2.5">{contract.customer?.name || '—'}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">関連案件</th>
              <td className="px-4 py-2.5">
                {contract.project ? `${contract.project.name}（${contract.project.projectNumber}）` : '—'}
              </td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">契約金額</th>
              <td className="px-4 py-2.5 font-medium">
                {contract.amount != null
                  ? `¥${contract.amount.toLocaleString()}（税別）`
                  : '—'}
              </td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">契約期間</th>
              <td className="px-4 py-2.5">
                {fmt(contract.startDate)} 〜 {fmt(contract.endDate)}
              </td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">締結日</th>
              <td className="px-4 py-2.5">{fmt(contract.signedAt)}</td>
            </tr>
            <tr className="border border-slate-300">
              <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300">ステータス</th>
              <td className="px-4 py-2.5">{contract.status}</td>
            </tr>
            {contract.notes && (
              <tr className="border border-slate-300">
                <th className="bg-slate-50 px-4 py-2.5 text-left font-medium border-r border-slate-300 align-top">備考</th>
                <td className="px-4 py-2.5 whitespace-pre-wrap">{contract.notes}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Terms section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold border-b-2 border-slate-800 pb-1 mb-3">契約条件</h2>
          <div className="space-y-5">
            {['第１条（目的）', '第２条（業務内容）', '第３条（支払条件）', '第４条（その他）'].map(article => (
              <div key={article}>
                <p className="text-xs font-medium mb-1">{article}</p>
                <div className="border-b border-slate-200 py-3 text-slate-300 text-xs">（内容をご記入ください）</div>
              </div>
            ))}
          </div>
        </div>

        {/* Signature area */}
        <div className="mt-10">
          <h2 className="text-sm font-bold border-b-2 border-slate-800 pb-1 mb-6">署名欄</h2>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="text-xs font-bold text-center mb-3">甲（発注者 / 顧客）</p>
              <div className="border border-slate-300 p-4 min-h-[100px]">
                <p className="text-xs text-slate-500 mb-2">会社名：{contract.customer?.name || '　'}</p>
                <p className="text-xs text-slate-500 mb-8">住　所：</p>
                <div className="border-b border-slate-400 mt-4 mb-1" />
                <p className="text-xs text-center text-slate-400">代表者　印</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-center mb-3">乙（受注者 / 自社）</p>
              <div className="border border-slate-300 p-4 min-h-[100px]">
                <p className="text-xs text-slate-500 mb-2">会社名：{companyName}</p>
                <p className="text-xs text-slate-500 mb-8">住　所：</p>
                <div className="border-b border-slate-400 mt-4 mb-1" />
                <p className="text-xs text-center text-slate-400">代表者　印</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-slate-400 border-t border-slate-200 pt-4">
          本契約書は２通作成し、甲乙各１通を保有するものとする。
        </div>
      </div>
    </>
  )
}
