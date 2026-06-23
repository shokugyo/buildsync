'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'

interface WorkerRosterEntry {
  id: string
  projectId: string
  project: { id: string; name: string; projectNumber: string }
  workerName: string
  company: string
  birthDate: string | null
  jobType: string | null
  certifications: string | null
  bloodType: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  insuranceType: string | null
  entryDate: string | null
  createdAt: string
}

function PrintContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [workers, setWorkers] = useState<WorkerRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    const url = projectId
      ? `/api/worker-roster?projectId=${projectId}`
      : '/api/worker-roster'

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const list: WorkerRosterEntry[] = Array.isArray(data) ? data : []
        setWorkers(list)
        if (list.length > 0 && projectId) {
          setProjectName(list[0].project?.name || '')
        }
        setLoading(false)
      })
  }, [projectId])

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ja-JP') : ''

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

      {/* Print button bar */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
        <span className="text-sm text-slate-600 font-medium">作業員名簿 — 印刷プレビュー</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Printer className="w-4 h-4" />
          印刷する
        </button>
      </div>

      {/* A4 Print Content */}
      <div className="pt-16 no-print-padding">
        <div className="max-w-[794px] mx-auto bg-white p-8 print:p-0 print:max-w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-widest mb-1">作　業　員　名　簿</h1>
            <p className="text-sm text-slate-500">（グリーンファイル）</p>
          </div>

          {/* Meta info */}
          <div className="flex justify-between mb-6 text-sm">
            <div>
              <span className="font-medium">工事名：</span>
              <span className="border-b border-slate-400 inline-block min-w-[200px] pb-0.5">
                {projectName || '（全案件）'}
              </span>
            </div>
            <div>
              <span className="font-medium">作成日：</span>
              <span>{today}</span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">No.</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">氏名</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">所属会社</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">職種</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">生年月日</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">血液型</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">入場日</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">保険種別</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">資格・免許</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">緊急連絡先</th>
                <th className="border border-slate-400 px-2 py-2 text-center font-semibold">電話番号</th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="border border-slate-400 px-4 py-8 text-center text-slate-400">
                    登録された作業員がいません
                  </td>
                </tr>
              ) : (
                workers.map((w, i) => (
                  <tr key={w.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{i + 1}</td>
                    <td className="border border-slate-400 px-2 py-1.5 font-medium">{w.workerName}</td>
                    <td className="border border-slate-400 px-2 py-1.5">{w.company}</td>
                    <td className="border border-slate-400 px-2 py-1.5">{w.jobType || ''}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{fmtDate(w.birthDate)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">
                      {w.bloodType ? `${w.bloodType}型` : ''}
                    </td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center">{fmtDate(w.entryDate)}</td>
                    <td className="border border-slate-400 px-2 py-1.5">{w.insuranceType || ''}</td>
                    <td className="border border-slate-400 px-2 py-1.5">{w.certifications || ''}</td>
                    <td className="border border-slate-400 px-2 py-1.5">{w.emergencyContact || ''}</td>
                    <td className="border border-slate-400 px-2 py-1.5">{w.emergencyPhone || ''}</td>
                  </tr>
                ))
              )}
              {/* Blank rows for manual additions */}
              {workers.length < 20 &&
                Array.from({ length: Math.max(0, 5 - workers.length) }).map((_, i) => (
                  <tr key={`blank-${i}`}>
                    <td className="border border-slate-400 px-2 py-1.5 text-center text-slate-300">
                      {workers.length + i + 1}
                    </td>
                    <td className="border border-slate-400 px-2 py-3"></td>
                    <td className="border border-slate-400 px-2 py-3"></td>
                    <td className="border border-slate-400 px-2 py-3"></td>
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

          {/* Footer note */}
          <div className="mt-6 text-xs text-slate-500 border-t border-slate-200 pt-3">
            <p>※本名簿は建設業法に基づく安全書類（グリーンファイル）として保管してください。</p>
            <p>※作業員名簿は工事完了後5年間保存する必要があります。</p>
          </div>

          {/* Signature area */}
          <div className="mt-8 flex justify-end gap-8 text-sm">
            <div className="text-center">
              <div className="border border-slate-400 w-28 h-16 mb-1"></div>
              <p className="text-xs text-slate-500">作成者 印</p>
            </div>
            <div className="text-center">
              <div className="border border-slate-400 w-28 h-16 mb-1"></div>
              <p className="text-xs text-slate-500">確認者 印</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function GreenFilePrintPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">読み込み中...</div>}>
      <PrintContent />
    </Suspense>
  )
}
